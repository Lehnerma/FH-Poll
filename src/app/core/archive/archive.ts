import { Service, computed, inject, signal } from '@angular/core';
import { DataSnapshot, onValue, ref, update } from 'firebase/database';
import { DB_ROOT } from '../../../environments/environment';
import { FIREBASE_DATABASE } from '../firebase/firebase';
import { ArchiveBox, ArchiveEntry, sortByLaborId, toArchiveEntry } from './archive-entry';

/**
 * Archiv-Tabelle für den Admin (live, nur mit Login lesbar).
 * Realtime Database: `praxis/archive/<key> = { labor, probenjahr, …, box }`.
 * User sehen Boxen nie hierüber, sondern über die Cloud Function `unlockBox`.
 */
@Service()
export class Archive {
  private readonly database = inject(FIREBASE_DATABASE);
  private readonly archiveRef = ref(this.database, `${DB_ROOT.praxis}/archive`);

  private readonly all = signal<readonly ArchiveEntry[]>([]);
  private readonly loadedState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private started = false;

  readonly entries = computed(() => sortByLaborId(this.all()));
  readonly loaded = this.loadedState.asReadonly();
  readonly error = this.errorState.asReadonly();

  /** Anzahl Einträge je Zuordnung (`archiv`, `box1` …). */
  readonly counts = computed(() => {
    const counts = new Map<ArchiveBox, number>();
    for (const entry of this.all()) {
      counts.set(entry.box, (counts.get(entry.box) ?? 0) + 1);
    }
    return counts;
  });

  /** Startet die Live-Verbindung (einmalig). */
  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    onValue(
      this.archiveRef,
      (snapshot) => this.applySnapshot(snapshot),
      () => this.applyError(),
    );
  }

  /**
   * Einträge einer Zuordnung, nach ID Labor sortiert.
   * @param box `archiv` oder `box1` … `box4`
   * @returns Passende Einträge
   */
  forBox(box: ArchiveBox): ArchiveEntry[] {
    return this.entries().filter((entry) => entry.box === box);
  }

  /**
   * Ordnet einen Eintrag einer Box (oder dem Archiv) zu.
   * @param key Schlüssel des Eintrags
   * @param box Neue Zuordnung
   */
  async setBox(key: string, box: ArchiveBox): Promise<void> {
    await update(ref(this.database, `${DB_ROOT.praxis}/archive/${key}`), { box });
  }

  /**
   * Übernimmt die Live-Daten aus der Realtime Database.
   * @param snapshot Aktueller Stand von `praxis/archive`
   */
  private applySnapshot(snapshot: DataSnapshot): void {
    const entries: ArchiveEntry[] = [];
    snapshot.forEach((child) => {
      const entry = toArchiveEntry(child.key, child.val());
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
    this.errorState.set('Archiv konnte nicht geladen werden.');
    this.loadedState.set(true);
  }
}
