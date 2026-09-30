/**
 * Spalten der Archiv-Tabelle (Realtime Database `praxis/archive/<pushId>`).
 * `required` = Pflichtfeld in der späteren Add-Form.
 */
export const ARCHIVE_COLUMNS = [
  { key: 'labor', label: 'Labor', required: true },
  { key: 'probenjahr', label: 'Probenabnahme-Jahr', required: true },
  { key: 'idLabor', label: 'ID Labor', required: true },
  { key: 'pap', label: 'PAP', required: true },
  { key: 'bethesda', label: 'Bethesda', required: true },
  { key: 'repraesentation', label: 'Repräsentation', required: true },
  { key: 'anmerkung', label: 'Anmerkung', required: false },
  { key: 'anmerkungObjekttraeger', label: 'Anmerkung Objektträger', required: false },
  { key: 'notiz', label: 'Notiz', required: false },
  { key: 'geburtsjahr', label: 'Geburtsjahr', required: true },
] as const;

export type ArchiveColumnKey = (typeof ARCHIVE_COLUMNS)[number]['key'];
export type ArchiveValue = string | number | null;

/** Zuordnung eines Eintrags: Archiv (Standard) oder eine der vier Boxen. */
export const ARCHIVE_BOXES = [
  { value: 'archiv', label: 'Archiv' },
  { value: 'box1', label: 'Box 1' },
  { value: 'box2', label: 'Box 2' },
  { value: 'box3', label: 'Box 3' },
  { value: 'box4', label: 'Box 4' },
] as const;

export type ArchiveBox = (typeof ARCHIVE_BOXES)[number]['value'];

export interface ArchiveEntry {
  readonly key: string;
  readonly box: ArchiveBox;
  readonly values: Readonly<Record<ArchiveColumnKey, ArchiveValue>>;
}

/**
 * Prüft, ob ein Text eine gültige Box-Zuordnung ist.
 * @param value Zu prüfender Wert
 * @returns true bei `archiv` oder `box1` … `box4`
 */
export function isArchiveBox(value: unknown): value is ArchiveBox {
  return ARCHIVE_BOXES.some((box) => box.value === value);
}

/**
 * Name der Box in der Datenbank zur Boxnummer (1 → `box1`).
 * @param box Boxnummer
 * @returns Wert für das Feld `box`
 */
export function boxName(box: number): ArchiveBox {
  const name = `box${box}`;
  return isArchiveBox(name) ? name : 'archiv';
}

/**
 * Wandelt Rohdaten (Datenbank oder Function-Antwort) in einen Eintrag um.
 * @param key Schlüssel des Eintrags
 * @param raw Rohdaten
 * @param fallbackBox Box, falls die Rohdaten keine enthalten (z. B. Function-Antwort)
 * @returns Eintrag oder null, wenn die Daten ungültig sind
 */
export function toArchiveEntry(
  key: string,
  raw: unknown,
  fallbackBox: ArchiveBox = 'archiv',
): ArchiveEntry | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const source = raw as Record<string, unknown>;
  const values = {} as Record<ArchiveColumnKey, ArchiveValue>;
  for (const { key: column } of ARCHIVE_COLUMNS) {
    const value = source[column];
    values[column] = typeof value === 'string' || typeof value === 'number' ? value : null;
  }
  return { key, box: isArchiveBox(source['box']) ? source['box'] : fallbackBox, values };
}

/**
 * Sortiert Einträge nach ID Labor (natürliche Sortierung, „OT-2“ vor „OT-10“).
 * @param entries Einträge
 * @returns Sortierte Kopie
 */
export function sortByLaborId(entries: readonly ArchiveEntry[]): ArchiveEntry[] {
  return [...entries].sort((a, b) =>
    String(a.values.idLabor ?? '').localeCompare(String(b.values.idLabor ?? ''), 'de', {
      numeric: true,
    }),
  );
}
