import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export interface StoredPassword {
  salt: string;
  hash: string;
}

const KEY_LENGTH = 32;

/**
 * Leitet aus Passwort + Salt per scrypt einen Schlüssel ab.
 * @param password Klartext-Passwort
 * @param salt Zufälliger Salt
 * @returns Abgeleiteter Schlüssel
 */
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/**
 * Erzeugt Salt + Hash für ein neues Passwort.
 * @param password Klartext-Passwort
 * @returns Salt und Hash (hex) zum Speichern
 */
export async function hashPassword(password: string): Promise<StoredPassword> {
  const salt = randomBytes(16);
  return { salt: salt.toString('hex'), hash: (await derive(password, salt)).toString('hex') };
}

/**
 * Prüft ein Passwort gegen den gespeicherten Hash (zeitkonstanter Vergleich).
 * @param password Eingegebenes Passwort
 * @param stored Gespeicherter Salt + Hash
 * @returns true, wenn das Passwort stimmt
 */
export async function verifyPassword(password: string, stored: StoredPassword): Promise<boolean> {
  const expected = Buffer.from(stored.hash, 'hex');
  const actual = await derive(password, Buffer.from(stored.salt, 'hex'));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Prüft, ob ein Firestore-Wert ein gültiger Passwort-Datensatz ist.
 * @param value Zu prüfender Wert
 * @returns true, wenn Salt und Hash vorhanden sind
 */
export function isStoredPassword(value: unknown): value is StoredPassword {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { salt, hash } = value as Record<string, unknown>;
  return typeof salt === 'string' && typeof hash === 'string';
}
