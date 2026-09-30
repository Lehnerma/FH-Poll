import { Component, computed, inject, input, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { BoxAccess, UnlockResult } from '../../core/box/box-access';
import { Session } from '../../core/session/session';
import { ArchiveTable } from '../../shared/archive-table/archive-table';
import { Topbar } from '../../shared/topbar/topbar';

const UNLOCK_MESSAGES: Readonly<Record<UnlockResult, string>> = {
  ok: '',
  wrong: 'Falsches Passwort.',
  locked: 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.',
  'not-configured': 'Für die Boxen ist noch kein Passwort hinterlegt.',
};

/** Box-Ansicht für /box1 … /box4 (Boxnummer kommt aus den Routen-Daten). */
@Component({
  selector: 'app-box',
  imports: [ArchiveTable, FormField, Topbar],
  templateUrl: './box.html',
})
export class Box {
  readonly box = input.required<number>();

  private readonly session = inject(Session);
  private readonly access = inject(BoxAccess);

  protected readonly unlocked = computed(() => this.access.isUnlocked(this.box()));
  protected readonly entries = computed(() => this.access.entries(this.box()));
  protected readonly backLink = computed(() =>
    this.session.isAdmin() ? '/admin/praxis' : '/praxis',
  );

  private readonly model = signal({ password: '' });
  protected readonly unlockForm = form(this.model, (path) => {
    required(path.password, { message: 'Bitte Passwort eingeben.' });
  });
  protected readonly unlockError = signal('');
  protected readonly busy = signal(false);

  /** Prüft das eingegebene Passwort (Formular-Submit). */
  protected onUnlock(): void {
    submit(this.unlockForm, async () => {
      this.busy.set(true);
      this.unlockError.set(
        await this.run(() => this.access.unlock(this.box(), this.model().password)),
      );
      this.model.set({ password: '' });
      this.busy.set(false);
    });
  }

  /** Lädt die Einträge der Box neu (Daten sind eine Momentaufnahme). */
  protected async onRefresh(): Promise<void> {
    this.busy.set(true);
    this.unlockError.set(await this.run(() => this.access.refresh(this.box())));
    this.busy.set(false);
  }

  /**
   * Führt eine Function-Abfrage aus und übersetzt das Ergebnis in eine Meldung.
   * @param action Abfrage (entsperren oder neu laden)
   * @returns Fehlermeldung oder leerer String bei Erfolg
   */
  private async run(action: () => Promise<UnlockResult>): Promise<string> {
    try {
      return UNLOCK_MESSAGES[await action()];
    } catch {
      return 'Passwort konnte nicht geprüft werden. Bitte später erneut versuchen.';
    }
  }
}
