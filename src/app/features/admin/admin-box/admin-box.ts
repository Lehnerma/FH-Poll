import { Component, computed, inject, input, signal } from '@angular/core';
import { Archive } from '../../../core/archive/archive';
import { boxName } from '../../../core/archive/archive-entry';
import { ArchiveTable, BoxChange } from '../../../shared/archive-table/archive-table';
import { Topbar } from '../../../shared/topbar/topbar';

/** Admin-Ansicht /admin/box1 … /admin/box4: Einträge der Box, Zuordnung änderbar. */
@Component({
  selector: 'app-admin-box',
  imports: [ArchiveTable, Topbar],
  templateUrl: './admin-box.html',
})
export class AdminBox {
  readonly box = input.required<number>();

  protected readonly archive = inject(Archive);
  protected readonly entries = computed(() => this.archive.forBox(boxName(this.box())));
  protected readonly saveError = signal('');

  /** Startet die Live-Daten. */
  constructor() {
    this.archive.start();
  }

  /**
   * Ordnet einen Eintrag neu zu (z. B. zurück ins Archiv).
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
