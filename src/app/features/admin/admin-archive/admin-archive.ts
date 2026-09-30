import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { Archive } from '../../../core/archive/archive';
import { ARCHIVE_BOXES, ArchiveEntry } from '../../../core/archive/archive-entry';
import { ArchiveTable, BoxChange } from '../../../shared/archive-table/archive-table';
import { Topbar } from '../../../shared/topbar/topbar';

/**
 * Prüft, ob ein Eintrag den Suchbegriff enthält (in einem Wert oder in der Box-Bezeichnung).
 * @param entry Eintrag
 * @param term Suchbegriff in Kleinschreibung
 * @returns true bei Treffer
 */
function matches(entry: ArchiveEntry, term: string): boolean {
  const boxLabel = ARCHIVE_BOXES.find((box) => box.value === entry.box)?.label ?? '';
  return [...Object.values(entry.values), boxLabel].some((value) =>
    String(value ?? '')
      .toLowerCase()
      .includes(term),
  );
}

/** Admin-Archiv /admin/archiv: alle Einträge, durchsuchbar, Box-Zuordnung je Zeile. */
@Component({
  selector: 'app-admin-archive',
  imports: [ArchiveTable, FormField, Topbar],
  templateUrl: './admin-archive.html',
})
export class AdminArchive {
  protected readonly archive = inject(Archive);

  private readonly model = signal({ query: '' });
  protected readonly searchForm = form(this.model);
  protected readonly filtered = computed(() => {
    const term = this.model().query.trim().toLowerCase();
    return term
      ? this.archive.entries().filter((entry) => matches(entry, term))
      : this.archive.entries();
  });
  protected readonly saveError = signal('');

  /** Startet die Live-Daten. */
  constructor() {
    this.archive.start();
  }

  /**
   * Ordnet einen Eintrag einer Box zu (oder zurück ins Archiv).
   * @param change Eintrag und neue Zuordnung
   */
  protected async onBoxChange(change: BoxChange): Promise<void> {
    this.saveError.set('');
    try {
      await this.archive.setBox(change.key, change.box);
    } catch {
      this.saveError.set('Zuordnung konnte nicht gespeichert werden.');
    }
  }
}
