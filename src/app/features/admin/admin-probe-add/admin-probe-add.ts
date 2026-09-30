import { Component, inject, signal } from '@angular/core';
import { FormField, form, pattern, required, submit } from '@angular/forms/signals';
import { Archive } from '../../../core/archive/archive';
import { ARCHIVE_COLUMNS, ArchiveColumnKey } from '../../../core/archive/archive-entry';
import { Topbar } from '../../../shared/topbar/topbar';

type ProbeKey = Exclude<ArchiveColumnKey, 'id'>;

/** Felder der Form: alle Spalten außer der automatisch vergebenen ID. */
const PROBE_COLUMNS = ARCHIVE_COLUMNS.filter((column) => !column.auto);

/**
 * Leeres Formularmodell (alle Werte als Text, Jahre werden erst beim Speichern zur Zahl).
 * @returns Modell mit leeren Feldern
 */
function emptyModel(): Record<ProbeKey, string> {
  return Object.fromEntries(PROBE_COLUMNS.map((column) => [column.key, ''])) as Record<
    ProbeKey,
    string
  >;
}

/** Admin-Seite /admin/probe-hinzufuegen: neue Probe im Archiv anlegen. */
@Component({
  selector: 'app-admin-probe-add',
  imports: [FormField, Topbar],
  templateUrl: './admin-probe-add.html',
})
export class AdminProbeAdd {
  private readonly archive = inject(Archive);

  protected readonly columns = PROBE_COLUMNS;
  private readonly model = signal(emptyModel());
  protected readonly probeForm = form(this.model, (path) => {
    for (const column of PROBE_COLUMNS) {
      if (column.required) {
        required(path[column.key], { message: `${column.label} ist ein Pflichtfeld.` });
      }
      if (column.type === 'year') {
        pattern(path[column.key], /^\d{4}$/, { message: 'Bitte eine vierstellige Jahreszahl.' });
      }
    }
  });
  protected readonly savedId = signal('');
  protected readonly failed = signal(false);

  /** Speichert die Probe (Formular-Submit) und leert danach die Form. */
  protected onSubmit(): void {
    submit(this.probeForm, async () => {
      this.savedId.set('');
      this.failed.set(false);
      try {
        this.savedId.set(await this.archive.addEntry(this.toValues()));
        this.model.set(emptyModel());
        this.probeForm().reset();
      } catch {
        this.failed.set(true);
      }
    });
  }

  /**
   * Wandelt das Formularmodell in Datenbankwerte um (Jahre als Zahl, leere Felder entfallen).
   * @returns Werte der ausgefüllten Spalten
   */
  private toValues(): Partial<Record<ProbeKey, string | number>> {
    const values: Partial<Record<ProbeKey, string | number>> = {};
    for (const column of PROBE_COLUMNS) {
      const text = this.model()[column.key].trim();
      if (text) {
        values[column.key] = column.type === 'year' ? Number(text) : text;
      }
    }
    return values;
  }
}
