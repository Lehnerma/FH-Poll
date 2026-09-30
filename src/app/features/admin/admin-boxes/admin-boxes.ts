import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, form, minLength, submit } from '@angular/forms/signals';
import { BOX_NUMBERS } from '../../../../environments/environment';
import { Archive } from '../../../core/archive/archive';
import { boxName } from '../../../core/archive/archive-entry';
import { BoxAccess } from '../../../core/box/box-access';
import { Topbar } from '../../../shared/topbar/topbar';

@Component({
  selector: 'app-admin-boxes',
  imports: [FormField, RouterLink, Topbar],
  templateUrl: './admin-boxes.html',
})
export class AdminBoxes {
  private readonly access = inject(BoxAccess);
  protected readonly archive = inject(Archive);
  protected readonly boxes = BOX_NUMBERS;

  private readonly model = signal({ password: '' });
  protected readonly passwordForm = form(this.model, (path) => {
    minLength(path.password, 8, { message: 'Mindestens 8 Zeichen.' });
  });
  protected readonly passwordMessage = signal('');
  protected readonly passwordFailed = signal(false);

  /** Startet die Live-Daten (für die Zähler). */
  constructor() {
    this.archive.start();
  }

  /**
   * Beschriftung mit der Anzahl der Einträge einer Box.
   * @param box Boxnummer
   * @returns z. B. "3 Einträge"
   */
  protected countLabel(box: number): string {
    return this.label(this.archive.counts().get(boxName(box)) ?? 0);
  }

  /**
   * Beschriftung mit der Anzahl der Einträge im Archiv (noch keiner Box zugeordnet).
   * @returns z. B. "12 Einträge"
   */
  protected archiveLabel(): string {
    return this.label(this.archive.counts().get('archiv') ?? 0);
  }

  /** Setzt das neue Box-Passwort (Formular-Submit). */
  protected onSetPassword(): void {
    submit(this.passwordForm, async () => {
      this.passwordMessage.set('');
      try {
        await this.access.setPassword(this.model().password);
        this.passwordFailed.set(false);
        this.passwordMessage.set('Passwort für alle Boxen gespeichert.');
        this.model.set({ password: '' });
      } catch {
        this.passwordFailed.set(true);
        this.passwordMessage.set('Passwort konnte nicht gespeichert werden.');
      }
    });
  }

  /**
   * Formuliert eine Anzahl mit Singular/Plural.
   * @param count Anzahl
   * @returns "1 Eintrag" oder "n Einträge"
   */
  private label(count: number): string {
    return count === 1 ? '1 Eintrag' : `${count} Einträge`;
  }
}
