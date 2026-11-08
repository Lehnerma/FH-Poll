import { Service, computed, inject, signal } from '@angular/core';
import { get, ref } from 'firebase/database';
import { FunctionsError } from 'firebase/functions';
import { DB_ROOT } from '../../../environments/environment';
import { callFunction } from '../firebase/call-function';
import { FIREBASE_DATABASE, FIREBASE_FUNCTIONS } from '../firebase/firebase';
import { Survey, SurveyAnswers, SurveySummary, toSummary, toSurvey } from './survey';

/** Warum eine Umfrage nicht geöffnet werden konnte. */
export type AccessProblem = 'wrong' | 'locked' | 'closed' | 'not-configured' | 'not-found';

/** Ergebnis von `open()`: Umfrage samt Teilnahme-Status oder der Grund für die Ablehnung. */
export type OpenResult =
  | { readonly status: 'ok'; readonly survey: Survey; readonly participated: boolean }
  | { readonly status: AccessProblem };

export type SubmitResult = 'saved' | 'duplicate';

const PROBLEMS: Readonly<Record<string, AccessProblem>> = {
  'functions/permission-denied': 'wrong',
  'functions/resource-exhausted': 'locked',
  'functions/not-found': 'not-found',
};

/**
 * Übersetzt einen Function-Fehler in einen Grund; unbekannte Fehler (z. B. Netzwerk) werden weitergereicht.
 * @param error Fehler des Aufrufs
 * @returns Grund der Ablehnung
 */
function toProblem(error: unknown): AccessProblem {
  if (error instanceof FunctionsError) {
    if (error.code === 'functions/failed-precondition') {
      return error.message === 'closed' ? 'closed' : 'not-configured';
    }
    const problem = PROBLEMS[error.code];
    if (problem) {
      return problem;
    }
  }
  throw error;
}

/**
 * Umfragen für User (Realtime Database `poll/surveys` plus Cloud Functions).
 * Titel und Status sind öffentlich lesbar. Fragen, Fotos und Antworten laufen nur über die
 * Functions nach richtigem Passwort; Ergebnisse sieht nur der Admin. Das Passwort (eins für alle Umfragen) bleibt im Arbeitsspeicher:
 * Seite neu laden = Passwort erneut eingeben.
 */
@Service()
export class Polls {
  private readonly database = inject(FIREBASE_DATABASE);
  private readonly functions = inject(FIREBASE_FUNCTIONS);
  private readonly password = signal('');

  /** Ist in dieser Sitzung schon ein gültiges Passwort eingegeben worden? */
  readonly unlocked = computed(() => this.password() !== '');

  /**
   * Lädt alle Umfragen (auch geschlossene) für die Liste.
   * @returns Umfragen, neueste zuerst
   */
  async loadSummaries(): Promise<SurveySummary[]> {
    const snapshot = await get(ref(this.database, `${DB_ROOT.poll}/surveys`));
    const surveys: SurveySummary[] = [];
    snapshot.forEach((child) => {
      const summary = toSummary(child.key, child.val());
      if (summary) {
        surveys.push(summary);
      }
    });
    return surveys.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Öffnet eine Umfrage (prüft Passwort und Status serverseitig).
   * @param surveyId Schlüssel der Umfrage
   * @param nickname Nickname des Teilnehmers
   * @param password Eingegebenes Passwort (Standard: das in dieser Sitzung gemerkte)
   * @returns Die Umfrage oder der Grund, warum sie nicht geöffnet werden darf
   */
  async open(surveyId: string, nickname: string, password = this.password()): Promise<OpenResult> {
    try {
      const result = await this.unlock(surveyId, nickname, password);
      if (result.status === 'ok') {
        this.password.set(password);
      }
      return result;
    } catch (error) {
      return this.reject(error);
    }
  }

  /**
   * Speichert die Antworten (die Function sperrt eine zweite Abgabe mit demselben Nickname).
   * @param surveyId Schlüssel der Umfrage
   * @param nickname Nickname des Teilnehmers
   * @param answers Frage-ID → Index der gewählten Option
   * @returns `saved` oder `duplicate`, wenn der Nickname schon teilgenommen hat
   */
  async submit(surveyId: string, nickname: string, answers: SurveyAnswers): Promise<SubmitResult> {
    const data = await callFunction<{ result: string }>(this.functions, 'submitSurvey', {
      surveyId,
      nickname,
      answers,
      password: this.password(),
    });
    return data.result === 'saved' ? 'saved' : 'duplicate';
  }

  /**
   * Ruft die Cloud Function `unlockSurvey` auf und wandelt die Antwort um.
   * @param surveyId Schlüssel der Umfrage
   * @param nickname Nickname des Teilnehmers
   * @param password Passwort, das der Server prüft
   * @returns Umfrage mit Teilnahme-Status (oder `not-found`, wenn die Antwort ungültig ist)
   */
  private async unlock(surveyId: string, nickname: string, password: string): Promise<OpenResult> {
    const payload = { surveyId, nickname, password };
    const data = await callFunction<Record<string, unknown>>(
      this.functions,
      'unlockSurvey',
      payload,
    );
    const survey = toSurvey(surveyId, data);
    return survey
      ? { status: 'ok', survey, participated: data['participated'] === true }
      : { status: 'not-found' };
  }

  /**
   * Wandelt einen Fehler in einen Grund um und vergisst ein nicht mehr passendes Passwort.
   * @param error Fehler von `unlockSurvey`
   * @returns Ergebnis mit dem Grund
   */
  private reject(error: unknown): OpenResult {
    const status = toProblem(error);
    if (status === 'wrong' || status === 'not-configured') {
      this.password.set('');
    }
    return { status };
  }
}
