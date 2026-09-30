import { Service, inject, signal } from '@angular/core';
import { FunctionsError, httpsCallable } from 'firebase/functions';
import { FIREBASE_FUNCTIONS } from '../firebase/firebase';
import { ArchiveEntry, boxName, sortByLaborId, toArchiveEntry } from '../archive/archive-entry';

export type UnlockResult = 'ok' | 'wrong' | 'locked' | 'not-configured';

interface UnlockResponse {
  entries: { key: string }[];
}

const ERROR_RESULTS: Readonly<Record<string, UnlockResult>> = {
  'functions/permission-denied': 'wrong',
  'functions/resource-exhausted': 'locked',
  'functions/failed-precondition': 'not-configured',
};

/**
 * Übersetzt einen Function-Fehler in ein Ergebnis; unbekannte Fehler (z. B. Netzwerk) werden weitergereicht.
 * @param error Fehler des Aufrufs
 * @returns Ergebnis der Prüfung
 */
function toUnlockResult(error: unknown): UnlockResult {
  const result = error instanceof FunctionsError ? ERROR_RESULTS[error.code] : undefined;
  if (!result) {
    throw error;
  }
  return result;
}

/**
 * Zugang der User zu den Praxis-Boxen.
 * Das Passwort wird nur von der Cloud Function `unlockBox` geprüft; sie liefert die Einträge
 * der Box zurück. Alles bleibt im Arbeitsspeicher: Seite neu laden = Passwort erneut eingeben.
 * Die Daten sind eine Momentaufnahme (kein Live), `refresh()` lädt sie neu.
 */
@Service()
export class BoxAccess {
  private readonly functions = inject(FIREBASE_FUNCTIONS);
  private readonly passwords = new Map<number, string>();
  private readonly unlocked = signal<ReadonlyMap<number, readonly ArchiveEntry[]>>(new Map());

  /**
   * Ist die Box in dieser Sitzung entsperrt?
   * @param box Boxnummer
   * @returns true, wenn entsperrt
   */
  isUnlocked(box: number): boolean {
    return this.unlocked().has(box);
  }

  /**
   * Einträge einer entsperrten Box.
   * @param box Boxnummer
   * @returns Einträge (leer, solange gesperrt)
   */
  entries(box: number): readonly ArchiveEntry[] {
    return this.unlocked().get(box) ?? [];
  }

  /**
   * Entsperrt die Box mit dem Passwort und lädt ihre Einträge.
   * @param box Boxnummer
   * @param password Eingegebenes Passwort
   * @returns Ergebnis der Prüfung
   */
  async unlock(box: number, password: string): Promise<UnlockResult> {
    try {
      const data = await this.callUnlock(box, password);
      this.passwords.set(box, password);
      this.unlocked.update((map) => new Map(map).set(box, this.toEntries(box, data)));
      return 'ok';
    } catch (error) {
      return toUnlockResult(error);
    }
  }

  /**
   * Lädt eine entsperrte Box neu. Stimmt das Passwort nicht mehr (z. B. vom Admin geändert),
   * wird die Box wieder gesperrt.
   * @param box Boxnummer
   * @returns Ergebnis der erneuten Prüfung
   */
  async refresh(box: number): Promise<UnlockResult> {
    const result = await this.unlock(box, this.passwords.get(box) ?? '');
    if (result !== 'ok') {
      this.passwords.delete(box);
      this.unlocked.update((map) => {
        const next = new Map(map);
        next.delete(box);
        return next;
      });
    }
    return result;
  }

  /**
   * Setzt das gemeinsame Passwort aller Boxen (Cloud Function, nur Admin).
   * @param password Neues Passwort (mindestens 8 Zeichen)
   */
  async setPassword(password: string): Promise<void> {
    await httpsCallable<{ password: string }, { ok: boolean }>(
      this.functions,
      'setBoxPassword',
    )({ password });
  }

  /**
   * Ruft die Cloud Function `unlockBox` auf.
   * @param box Boxnummer
   * @param password Eingegebenes Passwort
   * @returns Antwort der Function
   */
  private async callUnlock(box: number, password: string): Promise<UnlockResponse> {
    const call = httpsCallable<{ box: number; password: string }, UnlockResponse>(
      this.functions,
      'unlockBox',
    );
    return (await call({ box, password })).data;
  }

  /**
   * Wandelt die Function-Antwort in sortierte Einträge um.
   * @param box Boxnummer
   * @param data Antwort von `unlockBox`
   * @returns Sortierte Einträge
   */
  private toEntries(box: number, data: UnlockResponse): ArchiveEntry[] {
    const entries = data.entries
      .map((raw) => toArchiveEntry(raw.key, raw, boxName(box)))
      .filter((entry): entry is ArchiveEntry => entry !== null);
    return sortByLaborId(entries);
  }
}
