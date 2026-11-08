/** Jede Frage hat genau diese Anzahl Antwortmöglichkeiten (eine Auswahl). */
export const OPTION_COUNT = 4;

/** Foto einer Frage. `path` (Speicherort in Storage) kennt nur der Admin. */
export interface SurveyPhoto {
  readonly url: string;
  readonly alt: string;
  readonly path?: string;
}

/** Eine Frage mit genau 4 Antwortmöglichkeiten (eine Auswahl) und optionalem Foto. */
export interface SurveyQuestion {
  readonly id: string;
  readonly text: string;
  readonly options: readonly string[];
  readonly photo: SurveyPhoto | null;
}

/** Eintrag der Umfragenliste (Realtime Database `poll/surveys/<id>`, für alle lesbar). */
export interface SurveySummary {
  readonly id: string;
  readonly title: string;
  readonly active: boolean;
  readonly questionCount: number;
  readonly createdAt: number;
}

/** Eine entsperrte Umfrage mit Fragen (kommt über die Cloud Function `unlockSurvey`). */
export interface Survey {
  readonly id: string;
  readonly title: string;
  readonly questions: readonly SurveyQuestion[];
}

/** Gewählte Antworten: Frage-ID → Index der gewählten Option. */
export type SurveyAnswers = Readonly<Record<string, number>>;

export interface OptionResult {
  readonly text: string;
  readonly count: number;
}

export interface QuestionResult {
  readonly id: string;
  readonly text: string;
  readonly options: readonly OptionResult[];
}

/** Ergebnis einer Umfrage: Teilnehmerzahl und Stimmen je Option. */
export interface SurveyResults {
  readonly participants: number;
  readonly questions: readonly QuestionResult[];
}

/**
 * Ist der Wert ein Objekt mit beliebigen Schlüsseln?
 * @param value Zu prüfender Wert
 * @returns true bei einem Objekt (kein Array, kein null)
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
 * Wandelt Rohdaten der Umfragenliste um.
 * @param id Schlüssel der Umfrage
 * @param raw Rohdaten
 * @returns Eintrag oder null, wenn Pflichtfelder fehlen
 */
export function toSummary(id: string, raw: unknown): SurveySummary | null {
  if (!isRecord(raw)) {
    return null;
  }
  const { title, active, questionCount, createdAt } = raw;
  if (typeof title !== 'string' || typeof active !== 'boolean') {
    return null;
  }
  return {
    id,
    title,
    active,
    questionCount: typeof questionCount === 'number' ? questionCount : 0,
    createdAt: typeof createdAt === 'number' ? createdAt : 0,
  };
}

/**
 * Wandelt das Foto einer Frage um.
 * @param raw Rohdaten
 * @returns Foto oder null, wenn keins (oder ein ungültiges) da ist
 */
function toPhoto(raw: unknown): SurveyPhoto | null {
  if (!isRecord(raw) || typeof raw['url'] !== 'string' || typeof raw['alt'] !== 'string') {
    return null;
  }
  const path = typeof raw['path'] === 'string' ? { path: raw['path'] } : {};
  return { url: raw['url'], alt: raw['alt'], ...path };
}

/**
 * Wandelt Rohdaten einer Frage um.
 * @param raw Rohdaten
 * @returns Frage oder null, wenn Text oder genau 4 Optionen fehlen
 */
export function toQuestion(raw: unknown): SurveyQuestion | null {
  if (!isRecord(raw)) {
    return null;
  }
  const { id, text, options, photo } = raw;
  const validOptions =
    Array.isArray(options) &&
    options.length === OPTION_COUNT &&
    options.every((option) => typeof option === 'string');
  if (typeof id !== 'string' || typeof text !== 'string' || !validOptions) {
    return null;
  }
  return { id, text, options: options as string[], photo: toPhoto(photo) };
}

/**
 * Wandelt die Fragenliste um (Array oder Objekt, je nachdem wie die Datenbank sie liefert).
 * @param raw Rohdaten
 * @returns Gültige Fragen in gespeicherter Reihenfolge
 */
export function toQuestions(raw: unknown): SurveyQuestion[] {
  const items = Array.isArray(raw) ? raw : isRecord(raw) ? Object.values(raw) : [];
  return items.map(toQuestion).filter((question): question is SurveyQuestion => question !== null);
}

/**
 * Wandelt die Antwort von `unlockSurvey` in eine Umfrage um.
 * @param id Schlüssel der Umfrage
 * @param raw Rohdaten (Titel und Fragen)
 * @returns Umfrage oder null, wenn Titel oder Fragen fehlen
 */
export function toSurvey(id: string, raw: unknown): Survey | null {
  if (!isRecord(raw) || typeof raw['title'] !== 'string') {
    return null;
  }
  const questions = toQuestions(raw['questions']);
  return questions.length === 0 ? null : { id, title: raw['title'], questions };
}

/**
 * Wandelt die Antwort von `getSurveyResults` um.
 * @param raw Rohdaten
 * @returns Ergebnis oder null, wenn die Daten ungültig sind
 */
export function toResults(raw: unknown): SurveyResults | null {
  if (
    !isRecord(raw) ||
    typeof raw['participants'] !== 'number' ||
    !Array.isArray(raw['questions'])
  ) {
    return null;
  }
  return { participants: raw['participants'], questions: raw['questions'] as QuestionResult[] };
}

/**
 * Anteil einer Option in Prozent (gerundet).
 * @param count Stimmen für die Option
 * @param total Stimmen aller Optionen der Frage
 * @returns 0 bis 100 (0, wenn es keine Stimmen gibt)
 */
export function percent(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}
