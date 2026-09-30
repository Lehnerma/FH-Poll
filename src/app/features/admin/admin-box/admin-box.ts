import { Component, computed, inject, input, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { BOX_NUMBERS } from '../../../../environments/environment';
import { EntryBox, PraxisEntries, PraxisEntry } from '../../../core/praxis/praxis-entries';
import { Topbar } from '../../../shared/topbar/topbar';

/** Admin-Ansicht /admin/box1 … /admin/box4: Einträge ansehen und bearbeiten. */
@Component({
  selector: 'app-admin-box',
  imports: [FormField, Topbar],
  styleUrl: './admin-box.scss',
  templateUrl: './admin-box.html',
})
export class AdminBox {
  readonly box = input.required<number>();

  protected readonly praxis = inject(PraxisEntries);
  protected readonly boxOptions = [...BOX_NUMBERS.map(String), 'archiv'];

  protected readonly entries = computed(() => this.praxis.forBox(this.box()));
  protected readonly selected = signal<PraxisEntry | null>(null);

  private readonly model = signal({ value: '', box: '1' });
  protected readonly editForm = form(this.model);
  protected readonly saveError = signal('');

  /** Startet die Live-Daten. */
  constructor() {
    this.praxis.start();
  }

  /**
   * Öffnet das Bearbeiten-Formular für einen Eintrag.
   * @param entry Zu bearbeitender Eintrag
   */
  protected edit(entry: PraxisEntry): void {
    this.saveError.set('');
    this.model.set({ value: entry.value, box: String(entry.box) });
    this.selected.set(entry);
  }

  /** Schließt das Bearbeiten-Formular ohne zu speichern. */
  protected cancel(): void {
    this.selected.set(null);
  }

  /** Speichert den bearbeiteten Eintrag (Formular-Submit). */
  protected onSave(): void {
    const entry = this.selected();
    if (entry) {
      submit(this.editForm, async () => {
        this.saveError.set(await this.persist(entry));
      });
    }
  }

  /**
   * Schreibt die Änderungen in die Datenbank.
   * @param entry Der bearbeitete Eintrag
   * @returns Fehlermeldung oder leerer String bei Erfolg
   */
  private async persist(entry: PraxisEntry): Promise<string> {
    const { value, box } = this.model();
    const target: EntryBox = box === 'archiv' ? 'archiv' : Number(box);
    try {
      await this.praxis.save(entry.key, { value: value.trim(), box: target });
      this.selected.set(null);
      return '';
    } catch {
      return 'Speichern fehlgeschlagen.';
    }
  }
}
