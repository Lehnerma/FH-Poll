/** Eine Frage mit festen Antwortmöglichkeiten (genau eine Auswahl). */
export interface SurveyQuestion {
  readonly id: string;
  readonly text: string;
  readonly options: readonly string[];
}

/** Eine Umfrage (Realtime Database `poll/surveys/<id>`). */
export interface Survey {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly questions: readonly SurveyQuestion[];
}

/** Gewählte Antworten: Frage-ID → Index der gewählten Option. */
export type SurveyAnswers = Readonly<Record<string, number>>;

/**
 * Macht aus einem Nickname den Schlüssel unter `poll/responses/<umfrage>/<schluessel>`.
 * Realtime-Database-Schlüssel dürfen kein `.` enthalten; Groß-/Kleinschreibung zählt nicht.
 * @param name Nickname
 * @returns Eindeutiger, schlüsseltauglicher Name
 */
export function nicknameKey(name: string): string {
  return encodeURIComponent(name.trim().toLowerCase()).replaceAll('.', '%2E');
}

/**
 * Wandelt Rohdaten einer Frage um.
 * @param id Schlüssel der Frage (z. B. "q1")
 * @param raw Rohdaten
 * @returns Frage oder null, wenn Text oder Optionen fehlen
 */
function toQuestion(id: string, raw: unknown): SurveyQuestion | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const { text, options } = raw as Record<string, unknown>;
  if (typeof text !== 'string' || !Array.isArray(options) || options.length < 2) {
    return null;
  }
  if (!options.every((option) => typeof option === 'string' && option !== '')) {
    return null;
  }
  return { id, text, options: options as string[] };
}

/**
 * Wandelt die Fragen einer Umfrage um.
 * @param raw Rohdaten (Objekt mit Frage-ID als Schlüssel)
 * @returns Fragen nach ID sortiert oder null, wenn keine oder eine ungültige Frage dabei ist
 */
function toQuestions(raw: unknown): SurveyQuestion[] | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const questions = Object.entries(raw).map(([id, value]) => toQuestion(id, value));
  if (questions.length === 0 || questions.includes(null)) {
    return null;
  }
  return (questions as SurveyQuestion[]).sort((a, b) =>
    a.id.localeCompare(b.id, 'de', { numeric: true }),
  );
}

/**
 * Wandelt Rohdaten aus der Datenbank in eine Umfrage um.
 * @param id Schlüssel der Umfrage
 * @param raw Rohdaten
 * @returns Umfrage oder null, wenn sie ungültig oder nicht aktiv ist
 */
export function toSurvey(id: string, raw: unknown): Survey | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const { active, title, description, questions: rawQuestions } = raw as Record<string, unknown>;
  const questions = toQuestions(rawQuestions);
  if (active !== true || typeof title !== 'string' || !questions) {
    return null;
  }
  return { id, title, description: typeof description === 'string' ? description : '', questions };
}
