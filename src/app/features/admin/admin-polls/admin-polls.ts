import { Component, inject, resource, signal } from '@angular/core';
import { FormField, form, minLength, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { PollAdmin } from '../../../core/poll/poll-admin';
import { Polls } from '../../../core/poll/polls';
import { SurveySummary } from '../../../core/poll/survey';
import { Topbar } from '../../../shared/topbar/topbar';

/** Admin-Seite /admin/umfragen: Umfragen verwalten (aktiv/inaktiv, bearbeiten, löschen) und Passwort setzen. */
@Component({
  selector: 'app-admin-polls',
  imports: [FormField, RouterLink, Topbar],
  templateUrl: './admin-polls.html',
})
export class AdminPolls {
  private readonly polls = inject(Polls);
  private readonly admin = inject(PollAdmin);

  protected readonly surveys = resource({ loader: () => this.polls.loadSummaries() });
  protected readonly actionFailed = signal(false);

  private readonly model = signal({ password: '' });
  protected readonly passwordForm = form(this.model, (path) => {
    minLength(path.password, 8, { message: 'Mindestens 8 Zeichen.' });
  });
  protected readonly passwordMessage = signal('');
  protected readonly passwordFailed = signal(false);

  /**
   * Schaltet eine Umfrage aktiv oder inaktiv (geschlossen).
   * @param survey Umfrage aus der Liste
   */
  protected async toggleActive(survey: SurveySummary): Promise<void> {
    await this.run(() => this.admin.setActive(survey.id, !survey.active));
  }

  /**
   * Löscht eine Umfrage nach Rückfrage (samt Antworten und Fotos).
   * @param survey Umfrage aus der Liste
   */
  protected async remove(survey: SurveySummary): Promise<void> {
    const question = `Umfrage „${survey.title}“ mit allen Antworten und Fotos löschen?`;
    if (globalThis.confirm(question)) {
      await this.run(() => this.admin.remove(survey.id));
    }
  }

  /** Setzt das neue Umfrage-Passwort (Formular-Submit). */
  protected onSetPassword(): void {
    submit(this.passwordForm, async () => {
      this.passwordMessage.set('');
      try {
        await this.admin.setPassword(this.model().password);
        this.passwordFailed.set(false);
        this.passwordMessage.set('Passwort für alle Umfragen gespeichert.');
        this.model.set({ password: '' });
      } catch {
        this.passwordFailed.set(true);
        this.passwordMessage.set('Passwort konnte nicht gespeichert werden.');
      }
    });
  }

  /**
   * Führt eine Änderung aus und lädt danach die Liste neu.
   * @param action Änderung (z. B. aktiv schalten oder löschen)
   */
  private async run(action: () => Promise<void>): Promise<void> {
    this.actionFailed.set(false);
    try {
      await action();
      this.surveys.reload();
    } catch {
      this.actionFailed.set(true);
    }
  }
}
