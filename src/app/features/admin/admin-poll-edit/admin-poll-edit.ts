import {
  Component,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { FormField, applyEach, form, maxLength, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { PollAdmin } from '../../../core/poll/poll-admin';
import { photoProblem } from '../../../core/poll/poll-photos';
import { Topbar } from '../../../shared/topbar/topbar';
import {
  EditorModel,
  PhotoStates,
  QUESTION_SCHEMA,
  emptyQuestion,
  notBlank,
  toDrafts,
  toModel,
  toPhotoStates,
  withoutPhoto,
} from './editor-model';

/** Admin-Seite /admin/umfragen/neu und /admin/umfragen/:id: Umfrage anlegen oder bearbeiten. */
@Component({
  selector: 'app-admin-poll-edit',
  imports: [FormField, RouterLink, Topbar],
  templateUrl: './admin-poll-edit.html',
})
export class AdminPollEdit {
  /** Umfrage-ID aus der Route; ohne ID wird eine neue Umfrage angelegt. */
  readonly id = input<string>();

  private readonly admin = inject(PollAdmin);
  private readonly router = inject(Router);

  protected readonly loaded = resource({
    params: () => this.id() ?? null,
    loader: ({ params }) => (params ? this.admin.load(params) : Promise.resolve(null)),
  });

  private readonly model = linkedSignal<EditorModel>(() => toModel(this.loaded.value() ?? null));
  protected readonly photoStates = linkedSignal<PhotoStates>(() =>
    toPhotoStates(this.loaded.value() ?? null),
  );

  protected readonly editForm = form(this.model, (path) => {
    validate(path.title, notBlank('Bitte einen Titel eingeben.'));
    maxLength(path.title, 80, { message: 'Maximal 80 Zeichen.' });
    applyEach(path.questions, QUESTION_SCHEMA);
  });

  protected readonly photoErrors = signal<Readonly<Record<string, string>>>({});
  protected readonly failed = signal(false);

  /** Gibt die Vorschau-Links frei, wenn die Seite verlassen wird. */
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const state of Object.values(this.photoStates())) {
        this.revoke(state.preview);
      }
    });
  }

  /**
   * Adresse des Fotos einer Frage (neue Vorschau oder gespeichertes Foto).
   * @param questionId Schlüssel der Frage
   * @returns Adresse oder null, wenn die Frage kein Foto hat
   */
  protected photoUrl(questionId: string): string | null {
    const state = this.photoStates()[questionId];
    return state?.preview ?? state?.photo?.url ?? null;
  }

  /** Hängt am Ende eine leere Frage an. */
  protected addQuestion(): void {
    this.model.update((model) => ({ ...model, questions: [...model.questions, emptyQuestion()] }));
  }

  /**
   * Entfernt eine Frage samt Foto (mindestens eine Frage bleibt).
   * @param questionId Schlüssel der Frage
   */
  protected removeQuestion(questionId: string): void {
    this.removePhoto(questionId);
    this.model.update((model) => ({
      ...model,
      questions: model.questions.filter((question) => question.id !== questionId),
    }));
  }

  /**
   * Übernimmt ein gewähltes Foto, wenn Format und Größe passen.
   * @param questionId Schlüssel der Frage
   * @param event Änderungs-Ereignis des Datei-Felds
   */
  protected onPhotoSelected(questionId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    const problem = file ? photoProblem(file) : null;
    this.photoErrors.update((errors) => ({ ...errors, [questionId]: problem ?? '' }));
    if (file && !problem) {
      this.setFile(questionId, file);
    }
    input.value = '';
  }

  /**
   * Entfernt das Foto einer Frage (gespeichert wird erst mit „Speichern“).
   * @param questionId Schlüssel der Frage
   */
  protected removePhoto(questionId: string): void {
    this.revoke(this.photoStates()[questionId]?.preview ?? null);
    this.photoStates.update((states) => withoutPhoto(states, questionId));
    this.setHasPhoto(questionId, false);
  }

  /** Speichert die Umfrage (Formular-Submit) und geht zurück zur Liste. */
  protected onSubmit(): void {
    submit(this.editForm, async () => {
      this.failed.set(false);
      try {
        await this.admin.save({
          id: this.id() ?? null,
          title: this.model().title,
          questions: toDrafts(this.model(), this.photoStates()),
          previous: this.loaded.value()?.questions ?? [],
        });
        await this.router.navigateByUrl('/admin/umfragen');
      } catch {
        this.failed.set(true);
      }
    });
  }

  /**
   * Merkt die gewählte Datei samt Vorschau für eine Frage.
   * @param questionId Schlüssel der Frage
   * @param file Gewähltes Foto
   */
  private setFile(questionId: string, file: File): void {
    const previous = this.photoStates()[questionId];
    this.revoke(previous?.preview ?? null);
    const preview = URL.createObjectURL(file);
    this.photoStates.update((states) => ({
      ...states,
      [questionId]: { photo: previous?.photo ?? null, file, preview },
    }));
    this.setHasPhoto(questionId, true);
  }

  /**
   * Merkt im Formular, ob die Frage ein Foto hat (dann ist die Bildbeschreibung Pflicht).
   * @param questionId Schlüssel der Frage
   * @param hasPhoto Hat die Frage ein Foto?
   */
  private setHasPhoto(questionId: string, hasPhoto: boolean): void {
    this.model.update((model) => ({
      ...model,
      questions: model.questions.map((question) =>
        question.id === questionId
          ? { ...question, hasPhoto, photoAlt: hasPhoto ? question.photoAlt : '' }
          : question,
      ),
    }));
  }

  /**
   * Gibt einen Vorschau-Link frei.
   * @param preview Vorschau-Link oder null
   */
  private revoke(preview: string | null): void {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  }
}
