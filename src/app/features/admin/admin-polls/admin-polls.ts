import { DOCUMENT } from '@angular/common';
import { Component, Injector, afterNextRender, inject, resource, signal } from '@angular/core';
import { FormField, form, minLength, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { PollAdmin } from '../../../core/poll/poll-admin';
import { Polls } from '../../../core/poll/polls';
import { SurveySummary, moveSurvey } from '../../../core/poll/survey';
import { Topbar } from '../../../shared/topbar/topbar';

/**
 * Admin-Seite /admin/umfragen: Umfragen verwalten (aktiv/inaktiv, bearbeiten, löschen, Reihenfolge)
 * und Passwort setzen. Die hier festgelegte Reihenfolge sehen auch die User.
 */
@Component({
  selector: 'app-admin-polls',
  imports: [FormField, RouterLink, Topbar],
  templateUrl: './admin-polls.html',
})
export class AdminPolls {
  private readonly polls = inject(Polls);
  private readonly admin = inject(PollAdmin);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  protected readonly surveys = resource({ loader: () => this.polls.loadSummaries() });
  protected readonly actionFailed = signal(false);
  /** Ansage für Screenreader nach dem Verschieben (`aria-live`). */
  protected readonly announcement = signal('');

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
   * Verschiebt eine Umfrage um eine Stelle und speichert die neue Reihenfolge sofort.
   * Die Liste zeigt die Änderung gleich an; schlägt das Speichern fehl, wird neu geladen.
   * @param survey Umfrage aus der Liste
   * @param step -1 = nach oben, 1 = nach unten
   */
  protected async move(survey: SurveySummary, step: -1 | 1): Promise<void> {
    const moved = moveSurvey(this.surveys.value() ?? [], survey.id, step);
    if (!moved) {
      return;
    }
    const index = moved.findIndex((entry) => entry.id === survey.id);
    this.actionFailed.set(false);
    this.surveys.set(moved);
    this.announcement.set(`„${survey.title}“ ist jetzt Position ${index + 1} von ${moved.length}.`);
    this.restoreFocus(survey.id, step, index === 0 || index === moved.length - 1);
    try {
      await this.admin.reorder(moved);
    } catch {
      this.actionFailed.set(true);
      this.surveys.reload();
    }
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

  /**
   * Setzt den Fokus nach dem Verschieben zurück auf einen Button der Umfrage (die Karte wandert im
   * DOM, dabei geht der Fokus verloren). Steht sie am Rand, ist dieser Button deaktiviert; dann
   * bekommt der Button der Gegenrichtung den Fokus.
   * @param id Schlüssel der verschobenen Umfrage
   * @param step Richtung des Klicks
   * @param atEdge Steht die Umfrage jetzt ganz oben oder ganz unten?
   */
  private restoreFocus(id: string, step: -1 | 1, atEdge: boolean): void {
    const up = step === -1 ? !atEdge : atEdge;
    afterNextRender(
      () => this.document.getElementById(`move-${up ? 'up' : 'down'}-${id}`)?.focus(),
      { injector: this.injector },
    );
  }
}
