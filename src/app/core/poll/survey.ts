/** Jede Frage hat genau diese Anzahl Antwortmöglichkeiten (eine Auswahl). */
export const OPTION_COUNT = 4;

/** Vorausgefüllte Antworten einer neuen Frage (im Editor änderbar). */
export const DEFAULT_OPTIONS: readonly string[] = ['NILM', 'LSIL', 'HSIL', 'Karzinom'];

/** Foto einer Frage. `path` (Speicherort in Storage) kennt nur der Admin. */
export interface SurveyPhoto {
  readonly url: string;
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
  /** Platz in der vom Admin festgelegten Reihenfolge (0 = ganz oben); null bei Altbestand. */
  readonly position: number | null;
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
  const { title, active, questionCount, createdAt, position } = raw;
  if (typeof title !== 'string' || typeof active !== 'boolean') {
    return null;
  }
  return {
    id,
    title,
    active,
    questionCount: typeof questionCount === 'number' ? questionCount : 0,
    createdAt: typeof createdAt === 'number' ? createdAt : 0,
    position: typeof position === 'number' ? position : null,
  };
}

/**
 * Vergleicht zwei Umfragen nach `position`; Umfragen ohne `position` (Altbestand) kommen danach.
 * @param a Erste Umfrage
 * @param b Zweite Umfrage
 * @returns Negativ, wenn `a` vor `b` steht, positiv im umgekehrten Fall, sonst 0
 */
function comparePosition(a: SurveySummary, b: SurveySummary): number {
  if (a.position === b.position) {
    return 0;
  }
  if (a.position === null) {
    return 1;
  }
  if (b.position === null) {
    return -1;
  }
  return a.position - b.position;
}

/**
 * Bringt die Umfragen in die Reihenfolge der Listen: nach `position`, bei Gleichstand oder ohne
 * `position` nach `createdAt` (älteste zuerst), zuletzt nach `id`, damit die Reihenfolge stabil bleibt.
 * @param list Umfragen in beliebiger Reihenfolge
 * @returns Sortierte Kopie
 */
export function sortSummaries(list: readonly SurveySummary[]): SurveySummary[] {
  return [...list].sort(
    (a, b) => comparePosition(a, b) || a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  );
}

/**
 * Nummeriert die Umfragen in der gegebenen Reihenfolge von 0 an durch.
 * @param list Umfragen in der gewünschten Reihenfolge
 * @returns Kopie mit lückenlosem `position`
 */
export function withPositions(list: readonly SurveySummary[]): SurveySummary[] {
  return list.map((survey, position) => ({ ...survey, position }));
}

/**
 * Tauscht eine Umfrage mit ihrem Nachbarn.
 * @param list Umfragen in der aktuellen Reihenfolge
 * @param id Schlüssel der Umfrage, die verschoben wird
 * @param step -1 = eine Stelle nach oben, 1 = eine Stelle nach unten
 * @returns Neue, lückenlos nummerierte Reihenfolge oder null, wenn die Umfrage am Rand steht
 */
export function moveSurvey(
  list: readonly SurveySummary[],
  id: string,
  step: -1 | 1,
): SurveySummary[] | null {
  const from = list.findIndex((survey) => survey.id === id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= list.length) {
    return null;
  }
  const reordered = [...list];
  reordered.splice(to, 0, ...reordered.splice(from, 1));
  return withPositions(reordered);
}

/**
 * Wandelt das Foto einer Frage um.
 * @param raw Rohdaten
 * @returns Foto oder null, wenn keins (oder ein ungültiges) da ist
 */
function toPhoto(raw: unknown): SurveyPhoto | null {
  if (!isRecord(raw) || typeof raw['url'] !== 'string') {
    return null;
  }
  const path = typeof raw['path'] === 'string' ? { path: raw['path'] } : {};
  return { url: raw['url'], ...path };
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
