import { Component, input, output } from '@angular/core';
import {
  ARCHIVE_BOXES,
  ARCHIVE_COLUMNS,
  ArchiveBox,
  ArchiveEntry,
  isArchiveBox,
} from '../../core/archive/archive-entry';

export interface BoxChange {
  readonly key: string;
  readonly box: ArchiveBox;
}

/** Archiv-Tabelle mit fixiertem Kopf; optional mit Box-Auswahl je Zeile (Admin). */
@Component({
  selector: 'app-archive-table',
  templateUrl: './archive-table.html',
})
export class ArchiveTable {
  readonly entries = input.required<readonly ArchiveEntry[]>();
  readonly caption = input.required<string>();
  readonly editableBox = input(false);
  readonly emptyText = input('Keine Einträge.');
  readonly boxChange = output<BoxChange>();

  protected readonly columns = ARCHIVE_COLUMNS;
  protected readonly boxes = ARCHIVE_BOXES;

  /**
   * Meldet die neue Box-Zuordnung einer Zeile.
   * @param entry Betroffener Eintrag
   * @param event Change-Event des Auswahlfelds
   */
  protected onBoxSelect(entry: ArchiveEntry, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (isArchiveBox(value)) {
      this.boxChange.emit({ key: entry.key, box: value });
    }
  }
}
