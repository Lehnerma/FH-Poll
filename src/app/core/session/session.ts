import { Service, computed, inject, signal } from '@angular/core';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { FIREBASE_AUTH } from '../firebase/firebase';

const NICKNAME_KEY = 'poll.nickname';

/**
 * Liest den gespeicherten Nickname vom Gerät.
 * @returns Nickname oder leerer String
 */
function readNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * Wer ist gerade da?
 * - Admin: Firebase Auth (E-Mail + Passwort)
 * - User: nur ein Nickname, lokal auf dem Gerät gespeichert
 */
@Service()
export class Session {
  private readonly auth = inject(FIREBASE_AUTH);

  private readonly adminEmail = signal<string | null>(null);
  private readonly storedNickname = signal(readNickname());

  /** Resolved, sobald Firebase den ersten Auth-Zustand gemeldet hat (für Guards). */
  readonly ready = new Promise<void>((resolve) => {
    onAuthStateChanged(this.auth, (user) => {
      this.adminEmail.set(user ? (user.email ?? user.uid) : null);
      resolve();
    });
  });

  readonly isAdmin = computed(() => this.adminEmail() !== null);
  readonly nickname = this.storedNickname.asReadonly();
  readonly hasNickname = computed(() => this.storedNickname() !== '');

  /**
   * Speichert den Nickname im Signal und auf dem Gerät.
   * @param name Eingegebener Name (wird getrimmt, leer = abgemeldet)
   */
  setNickname(name: string): void {
    const trimmed = name.trim();
    this.storedNickname.set(trimmed);
    try {
      localStorage.setItem(NICKNAME_KEY, trimmed);
    } catch {
      // Speicher blockiert (z. B. privater Modus): Nickname gilt nur für diese Sitzung.
    }
  }

  /**
   * Meldet einen Admin über Firebase Auth an.
   * @param email E-Mail-Adresse
   * @param password Passwort
   */
  async loginAdmin(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email.trim(), password);
  }

  /** Meldet den Admin ab. */
  async logoutAdmin(): Promise<void> {
    await signOut(this.auth);
  }
}
