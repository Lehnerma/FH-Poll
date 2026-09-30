import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, form, minLength, submit } from '@angular/forms/signals';
import { BOX_NUMBERS } from '../../../../environments/environment';
import { BoxAccess } from '../../../core/box/box-access';
import { PraxisEntries } from '../../../core/praxis/praxis-entries';
import { Topbar } from '../../../shared/topbar/topbar';

@Component({
  selector: 'app-admin-boxes',
  imports: [FormField, RouterLink, Topbar],
  templateUrl: './admin-boxes.html',
})
export class AdminBoxes {
  private readonly access = inject(BoxAccess);
  protected readonly praxis = inject(PraxisEntries);
  protected readonly boxes = BOX_NUMBERS;

  private readonly model = signal({ password: '' });
  protected readonly passwordForm = form(this.model, (path) => {
    minLength(path.password, 8, { message: 'Mindestens 8 Zeichen.' });
  });
  protected readonly passwordMessage = signal('');
  protected readonly passwordFailed = signal(false);

  /** Startet die Live-Daten (für die Zähler je Box). */
  constructor() {
    this.praxis.start();
  }

  /**
   * Beschriftung mit der Anzahl der Einträge einer Box.
   * @param box Boxnummer
   * @returns z. B. "3 Einträge"
   */
  protected countLabel(box: number): string {
    const count = this.praxis.counts().get(box) ?? 0;
    return count === 1 ? '1 Eintrag' : `${count} Einträge`;
  }

  /** Setzt das neue Box-Passwort (Formular-Submit). */
  protected onSetPassword(): void {
    submit(this.passwordForm, async () => {
      this.passwordMessage.set('');
      try {
        await this.access.setPassword(this.boxes, this.model().password);
        this.passwordFailed.set(false);
        this.passwordMessage.set('Passwort für alle Boxen gespeichert.');
        this.model.set({ password: '' });
      } catch {
        this.passwordFailed.set(true);
        this.passwordMessage.set('Passwort konnte nicht gespeichert werden.');
      }
    });
  }
}
