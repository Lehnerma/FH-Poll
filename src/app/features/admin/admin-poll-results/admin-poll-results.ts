import { Component, inject, input, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PollAdmin } from '../../../core/poll/poll-admin';
import { SurveyResultsView } from '../../../shared/survey-results-view/survey-results-view';
import { Topbar } from '../../../shared/topbar/topbar';

/** Admin-Seite /admin/umfragen/:id/ergebnisse: dieselbe Gesamtansicht wie bei den Usern. */
@Component({
  selector: 'app-admin-poll-results',
  imports: [RouterLink, SurveyResultsView, Topbar],
  templateUrl: './admin-poll-results.html',
})
export class AdminPollResults {
  /** Umfrage-ID aus der Route (`withComponentInputBinding`). */
  readonly id = input.required<string>();

  private readonly admin = inject(PollAdmin);

  protected readonly data = resource({
    params: () => this.id(),
    loader: async ({ params }) => {
      const [survey, results] = await Promise.all([
        this.admin.load(params),
        this.admin.results(params),
      ]);
      return { title: survey?.title ?? '', results };
    },
  });
}
