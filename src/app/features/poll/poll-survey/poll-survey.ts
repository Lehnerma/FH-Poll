import { Component, computed, inject, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Polls, SubmitResult } from '../../../core/poll/polls';
import { SurveyAnswers } from '../../../core/poll/survey';
import { Session } from '../../../core/session/session';
import { Topbar } from '../../../shared/topbar/topbar';

/** Seite /umfragen/:id: Fragen beantworten (je Frage genau eine Auswahl) und absenden. */
@Component({
  selector: 'app-poll-survey',
  imports: [RouterLink, Topbar],
  templateUrl: './poll-survey.html',
})
export class PollSurvey {
  /** Umfrage-ID aus der Route (`withComponentInputBinding`). */
  readonly id = input.required<string>();

  private readonly polls = inject(Polls);
  private readonly session = inject(Session);

  protected readonly survey = resource({
    params: () => this.id(),
    loader: ({ params }) => this.polls.load(params),
  });
  protected readonly nickname = this.session.nickname;

  protected readonly answers = signal<SurveyAnswers>({});
  protected readonly result = signal<SubmitResult | null>(null);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  private readonly previouslySubmitted = computed(() =>
    this.polls.hasSubmitted(this.id(), this.nickname()),
  );
  protected readonly participated = computed(
    () => this.result() !== null || this.previouslySubmitted(),
  );

  protected readonly answeredCount = computed(() => Object.keys(this.answers()).length);
  protected readonly complete = computed(() => {
    const questions = this.survey.value()?.questions ?? [];
    return questions.length > 0 && questions.every((question) => question.id in this.answers());
  });

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
      this.result.set(await this.polls.submit(this.id(), this.nickname(), this.answers()));
    } catch {
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
