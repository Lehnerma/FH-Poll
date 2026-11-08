import { Component, computed, inject, input, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Polls } from '../../../core/poll/polls';
import { Topbar } from '../../../shared/topbar/topbar';

const NOTICES: Readonly<Record<string, string>> = {
  gespeichert: 'Danke, deine Antworten wurden gespeichert.',
  'bereits-teilgenommen': 'Du hast bereits teilgenommen.',
};

/**
 * Seite /umfragen: Liste der Umfragen (geschlossene sind ausgegraut und nicht öffenbar).
 * Nach dem Absenden zeigt sie über den Query-Parameter `hinweis` eine kurze Bestätigung.
 */
@Component({
  selector: 'app-poll-list',
  imports: [RouterLink, Topbar],
  templateUrl: './poll-list.html',
})
export class PollList {
  /** Hinweis nach dem Absenden aus dem Query-Parameter `hinweis` (`withComponentInputBinding`). */
  readonly hinweis = input<string>();

  private readonly polls = inject(Polls);

  protected readonly notice = computed(() => NOTICES[this.hinweis() ?? ''] ?? '');

  protected readonly surveys = resource({ loader: () => this.polls.loadSummaries() });
}
