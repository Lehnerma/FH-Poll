import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Polls } from '../../../core/poll/polls';
import { Topbar } from '../../../shared/topbar/topbar';

/** Seite /umfragen: Liste der Umfragen (geschlossene sind ausgegraut und nicht öffenbar). */
@Component({
  selector: 'app-poll-list',
  imports: [RouterLink, Topbar],
  templateUrl: './poll-list.html',
})
export class PollList {
  private readonly polls = inject(Polls);

  protected readonly surveys = resource({ loader: () => this.polls.loadSummaries() });
}
