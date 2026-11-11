import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AccessProblem, OpenResult, Polls, SubmitResult } from '../../../core/poll/polls';
import { Survey, SurveyAnswers } from '../../../core/poll/survey';
import { Session } from '../../../core/session/session';
import { Topbar } from '../../../shared/topbar/topbar';
import { PollQuestion } from '../poll-question/poll-question';

type View =
  'loading' | 'nickname' | 'password' | 'form' | 'participated' | 'closed' | 'missing' | 'error';

const PASSWORD_MESSAGES: Readonly<Partial<Record<AccessProblem, string>>> = {
  wrong: 'Falsches Passwort.',
  locked: 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.',
  'not-configured': 'Für die Umfragen ist noch kein Passwort hinterlegt.',
};

/**
 * Seite /umfragen/:id. Ablauf: Passwort (einmal pro Sitzung) → Fragen beantworten → zurück zur Liste.
 * Wer mit diesem Nickname schon teilgenommen hat, sieht nur den Hinweis darauf. Ergebnisse sieht nur der Admin.
 */
@Component({
  selector: 'app-poll-survey',
  imports: [FormField, PollQuestion, RouterLink, Topbar],
  templateUrl: './poll-survey.html',
})
export class PollSurvey implements OnInit {
  /** Umfrage-ID aus der Route (`withComponentInputBinding`). */
  readonly id = input.required<string>();

  private readonly polls = inject(Polls);
  private readonly session = inject(Session);
  private readonly router = inject(Router);

  protected readonly nickname = this.session.nickname;
  protected readonly view = signal<View>('loading');
  protected readonly survey = signal<Survey | null>(null);
  protected readonly answers = signal<SurveyAnswers>({});
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly passwordError = signal('');

  private readonly model = signal({ password: '' });
  protected readonly passwordForm = form(this.model, (path) => {
    required(path.password, { message: 'Bitte Passwort eingeben.' });
  });

  protected readonly answeredCount = computed(() => Object.keys(this.answers()).length);
  protected readonly complete = computed(() => {
    const questions = this.survey()?.questions ?? [];
    return questions.length > 0 && questions.every((question) => question.id in this.answers());
  });

  /** Startet den Ablauf: ohne Nickname Hinweis, mit gemerktem Passwort direkt öffnen. */
  ngOnInit(): void {
    if (!this.nickname()) {
      this.view.set('nickname');
    } else if (this.polls.unlocked()) {
      void this.load();
    } else {
      this.view.set('password');
    }
  }

  /** Prüft das eingegebene Passwort (Formular-Submit) und öffnet die Umfrage. */
  protected onUnlock(): void {
    submit(this.passwordForm, async () => {
      await this.load(this.model().password);
      // Erst nach der Antwort leeren (inkl. touched), sonst zeigt `required` während der Prüfung Rot.
      this.passwordForm().reset({ password: '' });
    });
  }

  /**
   * Merkt die gewählte Option einer Frage.
   * @param questionId Schlüssel der Frage
   * @param optionIndex Index der gewählten Option
   */
  protected choose(questionId: string, optionIndex: number): void {
    this.answers.update((answers) => ({ ...answers, [questionId]: optionIndex }));
  }

  /** Sendet die Antworten ab (Formular-Submit), sobald alle Fragen beantwortet sind. */
  protected async onSubmit(): Promise<void> {
    if (!this.complete() || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.failed.set(false);
    try {
      const result = await this.polls.submit(this.id(), this.nickname(), this.answers());
      await this.backToList(result);
    } catch {
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Geht zurück zur Umfrageübersicht, die eine kurze Bestätigung zeigt.
   * @param result Ergebnis von `submit()`
   */
  private async backToList(result: SubmitResult): Promise<void> {
    const hinweis = result === 'saved' ? 'gespeichert' : 'bereits-teilgenommen';
    await this.router.navigate(['/umfragen'], { queryParams: { hinweis } });
  }

  /**
   * Öffnet die Umfrage beim Server (Passwort und Status werden dort geprüft).
   * @param password Eingegebenes Passwort; ohne Angabe gilt das gemerkte
   */
  private async load(password?: string): Promise<void> {
    this.busy.set(true);
    try {
      this.apply(await this.polls.open(this.id(), this.nickname(), password));
    } catch {
      this.view.set('error');
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Zeigt je nach Antwort des Servers Formular, Teilnahme-Hinweis oder den Grund der Ablehnung.
   * @param result Ergebnis von `open()`
   */
  private apply(result: OpenResult): void {
    if (result.status !== 'ok') {
      this.reject(result.status);
      return;
    }
    this.survey.set(result.survey);
    this.view.set(result.participated ? 'participated' : 'form');
  }

  /**
   * Zeigt den Grund an, warum die Umfrage nicht geöffnet werden darf.
   * @param problem Grund der Ablehnung
   */
  private reject(problem: AccessProblem): void {
    if (problem === 'closed' || problem === 'not-found') {
      this.view.set(problem === 'closed' ? 'closed' : 'missing');
      return;
    }
    this.passwordError.set(PASSWORD_MESSAGES[problem] ?? '');
    this.view.set('password');
  }
}
