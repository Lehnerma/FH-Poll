import { getDatabase } from 'firebase-admin/database';
import { HttpsError } from 'firebase-functions/v2/https';
import { readText } from './access';
import { NICKNAME_MAX_LENGTH, OPTION_COUNT, POLL_PATH } from './config';

export interface PollPhoto {
  url: string;
}

export interface PollQuestion {
  id: string;
  text: string;
  options: string[];
  photo: PollPhoto | null;
}

export interface LoadedSurvey {
  title: string;
  questions: PollQuestion[];
}

export interface PollResults {
  participants: number;
  questions: { id: string; text: string; options: { text: string; count: number }[] }[];
}

/** Frage-ID → Index der gewählten Option. */
export type PollAnswers = Record<string, number>;

/**
 * Ist der Wert ein Objekt mit beliebigen Schlüsseln?
 * @param value Zu prüfender Wert
 * @returns true bei einem Objekt (kein Array, kein null)
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Liest und prüft die Umfrage-ID (verhindert Pfad-Tricks wie `/` in der ID).
 * @param data Daten des Aufrufs
 * @returns Gültige Umfrage-ID
 */
export function readSurveyId(data: unknown): string {
  const id = readText(data, 'surveyId');
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) {
    throw new HttpsError('invalid-argument', 'surveyId');
  }
  return id;
}

/**
 * Liest und prüft den Nickname (1 bis 30 Zeichen nach dem Trimmen).
 * @param data Daten des Aufrufs
 * @returns Getrimmter Nickname
 */
export function readNickname(data: unknown): string {
  const nickname = readText(data, 'nickname').trim();
  if (nickname.length === 0 || nickname.length > NICKNAME_MAX_LENGTH) {
    throw new HttpsError('invalid-argument', 'nickname');
  }
  return nickname;
}

/**
 * Schlüssel einer Antwort in der Datenbank (gleiche Regel wie im Browser).
 * Punkte sind in Schlüsseln verboten; Groß-/Kleinschreibung zählt nicht.
 * @param name Nickname
 * @returns Schlüsseltauglicher Name
 */
export function nicknameKey(name: string): string {
  return encodeURIComponent(name.trim().toLowerCase()).replaceAll('.', '%2E');
}

/**
 * Wandelt das Foto einer Frage um; der Speicherpfad geht nie an User.
 * @param raw Rohdaten
 * @returns Foto oder null
 */
function toPhoto(raw: unknown): PollPhoto | null {
  if (!isRecord(raw) || typeof raw['url'] !== 'string') {
    return null;
  }
  return { url: raw['url'] };
}

/**
 * Wandelt Rohdaten einer Frage um.
 * @param raw Rohdaten
 * @returns Frage oder null, wenn Pflichtfelder fehlen
 */
function toQuestion(raw: unknown): PollQuestion | null {
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
function toQuestions(raw: unknown): PollQuestion[] {
  const items = Array.isArray(raw) ? raw : isRecord(raw) ? Object.values(raw) : [];
  return items.map(toQuestion).filter((question): question is PollQuestion => question !== null);
}

/**
 * Lädt Titel und Fragen einer Umfrage.
 * @param surveyId Umfrage-ID
 * @param requireActive true: geschlossene Umfragen werfen `failed-precondition` ("closed")
 * @returns Titel und Fragen
 */
export async function loadSurvey(surveyId: string, requireActive: boolean): Promise<LoadedSurvey> {
  const database = getDatabase();
  const meta: unknown = (await database.ref(`${POLL_PATH}/surveys/${surveyId}`).get()).val();
  if (!isRecord(meta) || typeof meta['title'] !== 'string') {
    throw new HttpsError('not-found', 'survey');
  }
  if (requireActive && meta['active'] !== true) {
    throw new HttpsError('failed-precondition', 'closed');
  }
  const content: unknown = (
    await database.ref(`${POLL_PATH}/content/${surveyId}/questions`).get()
  ).val();
  return { title: meta['title'], questions: toQuestions(content) };
}

/**
 * Ist der Wert ein gültiger Index einer Antwortmöglichkeit (0 bis 3)?
 * @param value Zu prüfender Wert
 * @returns true bei einer ganzen Zahl im erlaubten Bereich
 */
function isOptionIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < OPTION_COUNT;
}

/**
 * Liest die Antworten und prüft, dass jede Frage genau eine gültige Option hat.
 * @param data Daten des Aufrufs mit `answers`
 * @param questions Fragen der Umfrage
 * @returns Frage-ID → Index der gewählten Option
 */
export function readAnswers(data: unknown, questions: readonly PollQuestion[]): PollAnswers {
  const raw = (data as Record<string, unknown> | null)?.['answers'];
  if (!isRecord(raw)) {
    throw new HttpsError('invalid-argument', 'answers');
  }
  const answers: PollAnswers = {};
  for (const { id } of questions) {
    const value = raw[id];
    if (!isOptionIndex(value)) {
      throw new HttpsError('invalid-argument', 'answers');
    }
    answers[id] = value;
  }
  return answers;
}

/**
 * Referenz auf die Antwort eines Nicknames.
 * @param surveyId Umfrage-ID
 * @param nickname Nickname
 * @returns Realtime-Database-Referenz
 */
function responseRef(
  surveyId: string,
  nickname: string,
): ReturnType<ReturnType<typeof getDatabase>['ref']> {
  return getDatabase().ref(`${POLL_PATH}/responses/${surveyId}/${nicknameKey(nickname)}`);
}

/**
 * Speichert die Antwort, aber nur, wenn dieser Nickname noch nicht teilgenommen hat.
 * @param surveyId Umfrage-ID
 * @param nickname Nickname
 * @param answers Geprüfte Antworten
 * @returns true bei gespeichert, false wenn der Nickname schon teilgenommen hat
 */
export async function saveResponse(
  surveyId: string,
  nickname: string,
  answers: PollAnswers,
): Promise<boolean> {
  const payload = { nickname, submittedAt: Date.now(), answers };
  const { committed } = await responseRef(surveyId, nickname).transaction((current: unknown) =>
    current === null ? payload : undefined,
  );
  return committed;
}

/**
 * Hat dieser Nickname die Umfrage schon beantwortet?
 * @param surveyId Umfrage-ID
 * @param nickname Nickname
 * @returns true, wenn eine Antwort existiert
 */
export async function hasResponded(surveyId: string, nickname: string): Promise<boolean> {
  return (await responseRef(surveyId, nickname).get()).exists();
}

/**
 * Lädt die Antworten aller Teilnehmer (ohne Nicknames).
 * @param surveyId Umfrage-ID
 * @returns Eine Antwortliste je Teilnehmer
 */
export async function loadAnswerSets(surveyId: string): Promise<PollAnswers[]> {
  const raw: unknown = (await getDatabase().ref(`${POLL_PATH}/responses/${surveyId}`).get()).val();
  if (!isRecord(raw)) {
    return [];
  }
  return Object.values(raw).map((entry) =>
    isRecord(entry) && isRecord(entry['answers']) ? (entry['answers'] as PollAnswers) : {},
  );
}

/**
 * Zählt je Frage und Option die Stimmen. Antworten auf gelöschte Fragen fallen weg.
 * @param questions Aktuelle Fragen
 * @param answerSets Antworten aller Teilnehmer
 * @returns Teilnehmerzahl und Stimmen je Option
 */
export function buildResults(
  questions: readonly PollQuestion[],
  answerSets: readonly PollAnswers[],
): PollResults {
  return {
    participants: answerSets.length,
    questions: questions.map((question) => ({
      id: question.id,
      text: question.text,
      options: question.options.map((text, index) => ({
        text,
        count: answerSets.filter((answers) => answers[question.id] === index).length,
      })),
    })),
  };
}
