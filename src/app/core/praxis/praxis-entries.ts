import { Service, computed, inject, signal } from '@angular/core';
import { DataSnapshot, onValue, ref, update } from 'firebase/database';
import { DB_ROOT } from '../../../environments/environment';
import { FIREBASE_DATABASE } from '../firebase/firebase';

export type EntryBox = number | 'archiv';

export interface PraxisEntry {
  readonly key: string;
  /** Anzeige-ID, z. B. "OT-0144" */
  readonly code: string;
  readonly value: string;
  readonly box: EntryBox;
}

export interface PraxisEntryChanges {
  readonly value: string;
  readonly box: EntryBox;
}

/**
 * Wandelt einen Datenbank-Knoten in einen Eintrag um.
 * @param key Schlüssel des Knotens
 * @param raw Rohdaten aus der Realtime Database
 * @returns Eintrag oder null, wenn die Daten ungültig sind
 */
function toEntry(key: string, raw: unknown): PraxisEntry | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const { code, value, box } = raw as Record<string, unknown>;
  if (typeof code !== 'string' || (typeof box !== 'number' && box !== 'archiv')) {
    return null;
  }
  return { key, code, value: typeof value === 'string' ? value : '', box };
}

/**
 * Einträge der Praxis-Boxen.
 * Realtime Database: `praxis/entries/<key> = { code, value, box }` (box = 1–4 oder "archiv").
 * Der Zweig `poll/` bleibt davon getrennt.
 */
@Service()
export class PraxisEntries {
  private readonly database = inject(FIREBASE_DATABASE);
  private readonly entriesRef = ref(this.database, `${DB_ROOT.praxis}/entries`);

  private readonly all = signal<readonly PraxisEntry[]>([]);
  private readonly loadedState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private started = false;

  readonly loaded = this.loadedState.asReadonly();
  readonly error = this.errorState.asReadonly();

  /** Anzahl Einträge je Box (Schlüssel = Boxnummer). */
  readonly counts = computed(() => {
    const counts = new Map<number, number>();
    for (const entry of this.all()) {
      if (typeof entry.box === 'number') {
        counts.set(entry.box, (counts.get(entry.box) ?? 0) + 1);
      }
    }
    return counts;
  });

  /** Startet die Live-Verbindung (einmalig, erst wenn ein Bereich sie braucht). */
  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    onValue(
      this.entriesRef,
      (snapshot) => this.applySnapshot(snapshot),
      () => this.applyError(),
    );
  }

  /**
   * Einträge einer Box, nach ID sortiert; die Nummerierung (#) ergibt sich aus der Position.
   * @param box Boxnummer
   * @returns Sortierte Einträge der Box
   */
  forBox(box: number): PraxisEntry[] {
    return this.all()
      .filter((entry) => entry.box === box)
      .sort((a, b) => a.code.localeCompare(b.code, 'de', { numeric: true }));
  }

  /**
   * Speichert Änderungen an einem Eintrag (nur Admin, per Security Rules).
   * @param key Schlüssel des Eintrags
   * @param changes Neuer Wert und neue Box-Zuordnung
   */
  async save(key: string, changes: PraxisEntryChanges): Promise<void> {
    await update(ref(this.database, `${DB_ROOT.praxis}/entries/${key}`), { ...changes });
  }

  /**
   * Übernimmt die Live-Daten aus der Realtime Database.
   * @param snapshot Aktueller Stand von `praxis/entries`
   */
  private applySnapshot(snapshot: DataSnapshot): void {
    const entries: PraxisEntry[] = [];
    snapshot.forEach((child) => {
      const entry = toEntry(child.key, child.val());
      if (entry) {
        entries.push(entry);
      }
    });
    this.all.set(entries);
    this.errorState.set(null);
    this.loadedState.set(true);
  }

  /** Merkt einen Ladefehler; ein späterer `start()` darf es erneut versuchen. */
  private applyError(): void {
    this.started = false;
    this.errorState.set('Einträge konnten nicht geladen werden.');
    this.loadedState.set(true);
  }
}
