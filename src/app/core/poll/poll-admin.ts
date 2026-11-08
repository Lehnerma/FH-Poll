import { Service, inject } from '@angular/core';
import { get, ref, update } from 'firebase/database';
import { DB_ROOT } from '../../../environments/environment';
import { callFunction } from '../firebase/call-function';
import { FIREBASE_DATABASE, FIREBASE_FUNCTIONS } from '../firebase/firebase';
import { PollPhotos } from './poll-photos';
import {
  SurveyPhoto,
  SurveyQuestion,
  SurveyResults,
  toQuestions,
  toResults,
  toSummary,
} from './survey';

/** Eine Frage im Editor: Texte, vorhandenes Foto und ein eventuell neu gewähltes Foto. */
export interface QuestionDraft {
  readonly id: string;
  readonly text: string;
  readonly options: readonly string[];
  readonly photo: SurveyPhoto | null;
  readonly file: File | null;
}

/** Eingabe für `save()`; `id` ist null bei einer neuen Umfrage. */
export interface SaveInput {
  readonly id: string | null;
  readonly title: string;
  readonly questions: readonly QuestionDraft[];
  readonly previous: readonly SurveyQuestion[];
}

/** Titel und Fragen einer Umfrage zum Bearbeiten. */
export interface EditableSurvey {
  readonly id: string;
  readonly title: string;
  readonly questions: readonly SurveyQuestion[];
}

/**
 * Verwaltung der Umfragen (nur Admin; die Rules verlangen einen Login).
 * - `poll/surveys/<id>`: Titel, aktiv/inaktiv, Fragenanzahl (öffentlich lesbar)
 * - `poll/content/<id>`: Fragen mit Fotos (nur Admin und Cloud Functions)
 * Die Liste der Umfragen liefert `Polls.loadSummaries()`.
 */
@Service()
export class PollAdmin {
  private readonly database = inject(FIREBASE_DATABASE);
  private readonly functions = inject(FIREBASE_FUNCTIONS);
  private readonly photos = inject(PollPhotos);

  /**
   * Lädt Titel und Fragen zum Bearbeiten.
   * @param id Schlüssel der Umfrage
   * @returns Umfrage oder null, wenn es sie nicht gibt
   */
  async load(id: string): Promise<EditableSurvey | null> {
    const root = DB_ROOT.poll;
    const [meta, content] = await Promise.all([
      get(ref(this.database, `${root}/surveys/${id}`)),
      get(ref(this.database, `${root}/content/${id}/questions`)),
    ]);
    const summary = toSummary(id, meta.val());
    return summary ? { id, title: summary.title, questions: toQuestions(content.val()) } : null;
  }

  /**
   * Speichert eine Umfrage: lädt neue Fotos hoch, schreibt Liste und Fragen gemeinsam und
   * löscht nicht mehr gebrauchte Fotos. Neue Umfragen starten inaktiv.
   * @param input Titel, Fragen und der Stand vor dem Bearbeiten
   * @returns Schlüssel der Umfrage
   */
  async save(input: SaveInput): Promise<string> {
    const id = input.id ?? crypto.randomUUID();
    const questions = await Promise.all(input.questions.map((draft) => this.toStored(id, draft)));
    await update(ref(this.database, DB_ROOT.poll), this.changes(id, input, questions));
    await this.photos.removeUnused(input.previous, questions);
    return id;
  }

  /**
   * Schaltet eine Umfrage aktiv (User können sie öffnen) oder inaktiv (geschlossen).
   * @param id Schlüssel der Umfrage
   * @param active Neuer Status
   */
  async setActive(id: string, active: boolean): Promise<void> {
    await update(ref(this.database, `${DB_ROOT.poll}/surveys/${id}`), { active });
  }

  /**
   * Löscht eine Umfrage samt Fragen, Antworten und Fotos.
   * @param id Schlüssel der Umfrage
   */
  async remove(id: string): Promise<void> {
    await update(ref(this.database, DB_ROOT.poll), {
      [`surveys/${id}`]: null,
      [`content/${id}`]: null,
      [`responses/${id}`]: null,
    });
    await this.photos.removeAll(id);
  }

  /**
   * Setzt das gemeinsame Passwort aller Umfragen (Cloud Function, nur Admin).
   * @param password Neues Passwort (mindestens 8 Zeichen)
   */
  async setPassword(password: string): Promise<void> {
    await callFunction(this.functions, 'setPollPassword', { password });
  }

  /**
   * Lädt die Ergebnisse (als Admin ohne Passwort und ohne Teilnahme).
   * @param id Schlüssel der Umfrage
   * @returns Teilnehmerzahl und Stimmen je Option
   */
  async results(id: string): Promise<SurveyResults> {
    const raw = await callFunction<unknown>(this.functions, 'getSurveyResults', { surveyId: id });
    const results = toResults(raw);
    if (!results) {
      throw new Error('invalid-results');
    }
    return results;
  }

  /**
   * Wandelt eine Frage aus dem Editor in die gespeicherte Form um (lädt ein neues Foto hoch).
   * @param surveyId Schlüssel der Umfrage
   * @param draft Frage aus dem Editor
   * @returns Frage zum Speichern
   */
  private async toStored(surveyId: string, draft: QuestionDraft): Promise<SurveyQuestion> {
    const uploaded = draft.file ? await this.photos.upload(surveyId, draft.file) : null;
    return {
      id: draft.id,
      text: draft.text.trim(),
      options: draft.options.map((option) => option.trim()),
      photo: uploaded ?? draft.photo,
    };
  }

  /**
   * Baut die Änderungen für ein gemeinsames Schreiben (alles oder nichts).
   * @param id Schlüssel der Umfrage
   * @param input Eingabe von `save()`
   * @param questions Zu speichernde Fragen
   * @returns Pfad (relativ zu `poll`) → neuer Wert
   */
  private changes(
    id: string,
    input: SaveInput,
    questions: readonly SurveyQuestion[],
  ): Record<string, unknown> {
    return {
      [`content/${id}`]: { questions },
      ...this.summaryChanges(id, input, questions.length),
    };
  }

  /**
   * Änderungen an der Listen-Seite: neue Umfragen starten inaktiv, bei bestehenden
   * bleiben `active` und `createdAt` unberührt.
   * @param id Schlüssel der Umfrage
   * @param input Eingabe von `save()`
   * @param questionCount Anzahl der Fragen
   * @returns Pfad (relativ zu `poll`) → neuer Wert
   */
  private summaryChanges(
    id: string,
    input: SaveInput,
    questionCount: number,
  ): Record<string, unknown> {
    const title = input.title.trim();
    if (input.id) {
      return { [`surveys/${id}/title`]: title, [`surveys/${id}/questionCount`]: questionCount };
    }
    return { [`surveys/${id}`]: { title, active: false, questionCount, createdAt: Date.now() } };
  }
}
