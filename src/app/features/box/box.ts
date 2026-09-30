import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { BoxAccess, UnlockResult } from '../../core/box/box-access';
import { PraxisEntries } from '../../core/praxis/praxis-entries';
import { Session } from '../../core/session/session';
import { Topbar } from '../../shared/topbar/topbar';

const UNLOCK_MESSAGES: Readonly<Record<UnlockResult, string>> = {
  ok: '',
  wrong: 'Falsches Passwort.',
  'not-configured': 'Für diese Box ist noch kein Passwort hinterlegt.',
};

/** Box-Ansicht für /box1 … /box4 (Boxnummer kommt aus den Routen-Daten). */
@Component({
  selector: 'app-box',
  imports: [FormField, Topbar],
  templateUrl: './box.html',
})
export class Box {
  readonly box = input.required<number>();

  private readonly session = inject(Session);
  private readonly access = inject(BoxAccess);
  protected readonly praxis = inject(PraxisEntries);

  /** Admin braucht kein Passwort. */
  protected readonly unlocked = computed(
    () => this.session.isAdmin() || this.access.isUnlocked(this.box()),
  );
  protected readonly entries = computed(() => this.praxis.forBox(this.box()));
  protected readonly backLink = computed(() =>
    this.session.isAdmin() ? '/admin/praxis' : '/praxis',
  );

  private readonly model = signal({ password: '' });
  protected readonly unlockForm = form(this.model, (path) => {
    required(path.password, { message: 'Bitte Passwort eingeben.' });
  });
  protected readonly unlockError = signal('');
  protected readonly busy = signal(false);

  /** Startet die Live-Daten erst, wenn die Box entsperrt ist. */
  constructor() {
    effect(() => {
      if (this.unlocked()) {
        this.praxis.start();
      }
    });
  }

  /** Prüft das eingegebene Passwort (Formular-Submit). */
  protected onUnlock(): void {
    submit(this.unlockForm, async () => {
      this.busy.set(true);
      this.unlockError.set(await this.tryUnlock());
      this.busy.set(false);
    });
  }

  /**
   * Versucht die Box zu entsperren.
   * @returns Fehlermeldung oder leerer String bei Erfolg
   */
  private async tryUnlock(): Promise<string> {
    try {
      const result = await this.access.unlock(this.box(), this.model().password);
      if (result === 'ok') {
        this.model.set({ password: '' });
      }
      return UNLOCK_MESSAGES[result];
    } catch {
      return 'Passwort konnte nicht geprüft werden. Bitte später erneut versuchen.';
    }
  }
}
