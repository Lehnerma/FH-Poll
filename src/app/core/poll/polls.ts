import { Service, inject } from '@angular/core';
import { get, ref, serverTimestamp, set } from 'firebase/database';
import { DB_ROOT } from '../../../environments/environment';
import { FIREBASE_DATABASE } from '../firebase/firebase';
import { Survey, SurveyAnswers, nicknameKey, toSurvey } from './survey';

const SUBMITTED_KEY = 'poll.submitted';

/** Ergebnis beim Absenden: gespeichert oder dieser Nickname hat schon teilgenommen. */
export type SubmitResult = 'saved' | 'duplicate';

/**
 * Prüft, ob ein Datenbankfehler eine abgelehnte Berechtigung ist.
 * @param error Gefangener Fehler
 * @returns true bei PERMISSION_DENIED
 */
function isPermissionDenied(error: unknown): boolean {
  const { code, message } = (error ?? {}) as Record<string, unknown>;
  return code === 'PERMISSION_DENIED' || String(message).includes('PERMISSION_DENIED');
}

/**
 * Liest die auf diesem Gerät gemerkten Teilnahmen.
 * @returns Einträge der Form `<umfrage>/<nicknameKey>`
 */
function readSubmitted(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SUBMITTED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Umfragen für User (Realtime Database, Zweig `poll`).
 * - `poll/surveys/<id>`: Umfrage, für alle lesbar, nur der Admin schreibt.
 * - `poll/responses/<id>/<nicknameKey>`: Antwort, User dürfen sie nur neu anlegen (nie ändern
 *   oder lesen). So kann pro Nickname nur einmal abgegeben werden; der Admin kann den Eintrag
 *   später löschen, um die Teilnahme wieder freizugeben.
 */
@Service()
export class Polls {
  private readonly database = inject(FIREBASE_DATABASE);

  /**
   * Lädt alle aktiven Umfragen.
   * @returns Aktive Umfragen, nach Titel sortiert
   */
  async loadActive(): Promise<Survey[]> {
    const snapshot = await get(ref(this.database, `${DB_ROOT.poll}/surveys`));
    const surveys: Survey[] = [];
    snapshot.forEach((child) => {
      const survey = toSurvey(child.key, child.val());
      if (survey) {
        surveys.push(survey);
      }
    });
    return surveys.sort((a, b) => a.title.localeCompare(b.title, 'de'));
  }

  /**
   * Lädt eine einzelne aktive Umfrage.
   * @param id Schlüssel der Umfrage
   * @returns Umfrage oder null, wenn sie fehlt oder nicht aktiv ist
   */
  async load(id: string): Promise<Survey | null> {
    const snapshot = await get(ref(this.database, `${DB_ROOT.poll}/surveys/${id}`));
    return toSurvey(id, snapshot.val());
  }

  /**
   * Hat dieser Nickname auf diesem Gerät schon an der Umfrage teilgenommen?
   * (User dürfen Antworten nicht lesen; die endgültige Sperre prüft die Datenbank beim Absenden.)
   * @param surveyId Schlüssel der Umfrage
   * @param nickname Nickname
   * @returns true, wenn die Teilnahme gemerkt ist
   */
  hasSubmitted(surveyId: string, nickname: string): boolean {
    return readSubmitted().includes(`${surveyId}/${nicknameKey(nickname)}`);
  }

  /**
   * Speichert die Antworten. Die Rules lehnen ein zweites Absenden mit demselben Nickname ab.
   * @param surveyId Schlüssel der Umfrage
   * @param nickname Nickname des Teilnehmers
   * @param answers Frage-ID → Index der gewählten Option
   * @returns `saved` oder `duplicate`, wenn der Nickname schon teilgenommen hat
   */
  async submit(surveyId: string, nickname: string, answers: SurveyAnswers): Promise<SubmitResult> {
    const entry = `${surveyId}/${nicknameKey(nickname)}`;
    try {
      await this.save(entry, nickname, answers);
    } catch (error) {
      if (!isPermissionDenied(error)) {
        throw error;
      }
      this.remember(entry);
      return 'duplicate';
    }
    this.remember(entry);
    return 'saved';
  }

  /**
   * Schreibt die Antwort nach `poll/responses/<umfrage>/<nicknameKey>`.
   * @param entry Eintrag der Form `<umfrage>/<nicknameKey>`
   * @param nickname Nickname des Teilnehmers
   * @param answers Frage-ID → Index der gewählten Option
   */
  private save(entry: string, nickname: string, answers: SurveyAnswers): Promise<void> {
    return set(ref(this.database, `${DB_ROOT.poll}/responses/${entry}`), {
      nickname: nickname.trim(),
      submittedAt: serverTimestamp(),
      answers,
    });
  }

  /**
   * Merkt die Teilnahme auf dem Gerät, damit der Hinweis ohne Datenbank-Abfrage erscheint.
   * @param entry Eintrag der Form `<umfrage>/<nicknameKey>`
   */
  private remember(entry: string): void {
    try {
      localStorage.setItem(
        SUBMITTED_KEY,
        JSON.stringify([...new Set([...readSubmitted(), entry])]),
      );
    } catch {
      // Speicher blockiert: die Datenbank sperrt Doppelabgaben trotzdem.
    }
  }
}
