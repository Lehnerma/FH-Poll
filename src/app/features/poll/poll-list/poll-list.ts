import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Polls } from '../../../core/poll/polls';
import { Session } from '../../../core/session/session';
import { Topbar } from '../../../shared/topbar/topbar';

/** Seite /umfragen: Liste der aktiven Umfragen. */
@Component({
  selector: 'app-poll-list',
  imports: [RouterLink, Topbar],
  templateUrl: './poll-list.html',
})
export class PollList {
  private readonly polls = inject(Polls);
  private readonly session = inject(Session);

  protected readonly surveys = resource({ loader: () => this.polls.loadActive() });

  /**
   * Hat der aktuelle Nickname bei dieser Umfrage schon teilgenommen?
   * @param surveyId Schlüssel der Umfrage
   * @returns true, wenn die Teilnahme auf diesem Gerät gemerkt ist
   */
  protected isDone(surveyId: string): boolean {
    return this.polls.hasSubmitted(surveyId, this.session.nickname());
  }
}
