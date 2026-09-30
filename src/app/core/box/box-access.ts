import { Service, inject, signal } from '@angular/core';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from '../firebase/firebase';
import { createPasswordHash, isPasswordHash, verifyPassword } from './password-hash';

const UNLOCKED_KEY = 'poll.unlockedBoxes';

export type UnlockResult = 'ok' | 'wrong' | 'not-configured';

/**
 * Liest die in dieser Browser-Sitzung entsperrten Boxen.
 * @returns Liste der Boxnummern
 */
function readUnlocked(): readonly number[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(UNLOCKED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

/**
 * Passwortschutz der Praxis-Boxen.
 * Firestore `boxes/box<n>` enthält nur Salt + Hash (PBKDF2). Entsperrte Boxen
 * merkt sich die Browser-Sitzung (sessionStorage) – Tab zu = wieder gesperrt.
 *
 * Hinweis: Das ist ein Komfortschutz, kein echter Zugriffsschutz – die Prüfung läuft im Client.
 */
@Service()
export class BoxAccess {
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  private readonly unlocked = signal<readonly number[]>(readUnlocked());

  /**
   * Ist die Box in dieser Sitzung bereits entsperrt?
   * @param box Boxnummer
   * @returns true, wenn entsperrt
   */
  isUnlocked(box: number): boolean {
    return this.unlocked().includes(box);
  }

  /**
   * Vergleicht das Passwort mit dem Hash aus Firestore und entsperrt bei Erfolg.
   * @param box Boxnummer
   * @param password Eingegebenes Passwort
   * @returns 'ok', 'wrong' oder 'not-configured' (kein Hash hinterlegt)
   */
  async unlock(box: number, password: string): Promise<UnlockResult> {
    const snapshot = await getDoc(doc(this.firestore, 'boxes', `box${box}`));
    const stored: unknown = snapshot.data();
    if (!isPasswordHash(stored)) {
      return 'not-configured';
    }
    if (!(await verifyPassword(password, stored))) {
      return 'wrong';
    }

    this.unlocked.update((boxes) => [...boxes, box]);
    try {
      sessionStorage.setItem(UNLOCKED_KEY, JSON.stringify(this.unlocked()));
    } catch {
      // Speicher blockiert: bleibt nur für diese Seitenladung entsperrt.
    }
    return 'ok';
  }

  /** Nur Admin (Firestore Rules): setzt dasselbe Passwort für die übergebenen Boxen. */
  async setPassword(boxes: readonly number[], password: string): Promise<void> {
    const hash = await createPasswordHash(password);
    await Promise.all(
      boxes.map((box) => setDoc(doc(this.firestore, 'boxes', `box${box}`), { ...hash })),
    );
  }
}
