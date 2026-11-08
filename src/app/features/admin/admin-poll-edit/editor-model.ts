import { applyEach, schema, validate } from '@angular/forms/signals';
import { EditableSurvey, QuestionDraft } from '../../../core/poll/poll-admin';
import { OPTION_COUNT, SurveyPhoto } from '../../../core/poll/survey';

/** Formularwerte einer Frage im Editor. `hasPhoto` steuert, ob die Bildbeschreibung Pflicht ist. */
export interface QuestionModel {
  id: string;
  text: string;
  options: string[];
  photoAlt: string;
  hasPhoto: boolean;
}

export interface EditorModel {
  title: string;
  questions: QuestionModel[];
}

/** Foto einer Frage im Editor: gespeichertes Foto, neu gewählte Datei und deren Vorschau. */
export interface PhotoState {
  readonly photo: SurveyPhoto | null;
  readonly file: File | null;
  readonly preview: string | null;
}

export type PhotoStates = Readonly<Record<string, PhotoState>>;

/**
 * Prüfung gegen leere oder nur aus Leerzeichen bestehende Eingaben.
 * @param message Fehlermeldung
 * @returns Prüffunktion für `validate()`
 */
export function notBlank(
  message: string,
): ({ value }: { value: () => string }) => { kind: string; message: string } | undefined {
  return ({ value }) => (value().trim() === '' ? { kind: 'blank', message } : undefined);
}

/**
 * Entfernt den Foto-Zustand einer Frage.
 * @param states Foto-Zustand je Frage-ID
 * @param questionId Schlüssel der Frage
 * @returns Kopie ohne diese Frage
 */
export function withoutPhoto(states: PhotoStates, questionId: string): PhotoStates {
  return Object.fromEntries(Object.entries(states).filter(([id]) => id !== questionId));
}

/** Regeln für jede Frage: Text und alle 4 Antworten sind Pflicht, mit Foto auch die Bildbeschreibung. */
export const QUESTION_SCHEMA = schema<QuestionModel>((question) => {
  validate(question.text, notBlank('Bitte den Fragetext eingeben.'));
  applyEach(question.options, (option) => {
    validate(option, notBlank('Bitte die Antwort eingeben.'));
  });
  validate(question.photoAlt, ({ value, valueOf }) =>
    valueOf(question.hasPhoto) && value().trim() === ''
      ? { kind: 'alt-required', message: 'Bitte eine Bildbeschreibung eingeben.' }
      : undefined,
  );
});

/**
 * Leere Frage mit neuer ID und 4 leeren Antworten.
 * @returns Neue Frage für den Editor
 */
export function emptyQuestion(): QuestionModel {
  const options = Array.from({ length: OPTION_COUNT }, () => '');
  return { id: crypto.randomUUID(), text: '', options, photoAlt: '', hasPhoto: false };
}

/**
 * Formularwerte für den Editor.
 * @param survey Geladene Umfrage oder null bei einer neuen
 * @returns Titel und Fragen (neu: eine leere Frage)
 */
export function toModel(survey: EditableSurvey | null): EditorModel {
  if (!survey) {
    return { title: '', questions: [emptyQuestion()] };
  }
  const questions = survey.questions.map((question) => ({
    id: question.id,
    text: question.text,
    options: [...question.options],
    photoAlt: question.photo?.alt ?? '',
    hasPhoto: question.photo !== null,
  }));
  return { title: survey.title, questions };
}

/**
 * Vorhandene Fotos einer geladenen Umfrage.
 * @param survey Geladene Umfrage oder null bei einer neuen
 * @returns Foto-Zustand je Frage-ID (nur Fragen mit Foto)
 */
export function toPhotoStates(survey: EditableSurvey | null): PhotoStates {
  const states: Record<string, PhotoState> = {};
  for (const question of survey?.questions ?? []) {
    if (question.photo) {
      states[question.id] = { photo: question.photo, file: null, preview: null };
    }
  }
  return states;
}

/**
 * Fügt Formularwerte und Foto-Zustand zu Entwürfen für das Speichern zusammen.
 * @param model Formularwerte
 * @param states Foto-Zustand je Frage-ID
 * @returns Entwürfe in Anzeigereihenfolge
 */
export function toDrafts(model: EditorModel, states: PhotoStates): QuestionDraft[] {
  return model.questions.map((question) => ({
    id: question.id,
    text: question.text,
    options: question.options,
    photoAlt: question.photoAlt,
    photo: states[question.id]?.photo ?? null,
    file: states[question.id]?.file ?? null,
  }));
}
