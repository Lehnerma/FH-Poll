const ITERATIONS = 200_000;

export interface PasswordHash {
  readonly salt: string;
  readonly hash: string;
  readonly iterations: number;
}

/**
 * Bytes als Hex-String.
 * @param bytes Rohdaten
 * @returns Hex-Darstellung
 */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hex-String zurück in Bytes.
 * @param hex Hex-Darstellung
 * @returns Rohdaten
 */
function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const pairs = hex.match(/.{2}/g) ?? [];
  return Uint8Array.from(pairs, (pair) => Number.parseInt(pair, 16));
}

/**
 * Leitet aus Passwort + Salt per PBKDF2-SHA256 einen 256-Bit-Schlüssel ab.
 * @param password Klartext-Passwort
 * @param salt Zufälliger Salt
 * @param iterations Anzahl der Iterationen
 * @returns Abgeleiteter Schlüssel als Hex-String
 */
async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<string> {
  const bytes = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey('raw', bytes, 'PBKDF2', false, ['deriveBits']);
  const params = { name: 'PBKDF2', hash: 'SHA-256', salt, iterations };
  return toHex(new Uint8Array(await crypto.subtle.deriveBits(params, key, 256)));
}

/**
 * Erzeugt Salt + Hash (PBKDF2-SHA256) für ein neues Passwort.
 * @param password Klartext-Passwort
 * @returns Salt, Hash und Iterationen zum Speichern
 */
export async function createPasswordHash(password: string): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    salt: toHex(salt),
    hash: await derive(password, salt, ITERATIONS),
    iterations: ITERATIONS,
  };
}

/**
 * Prüft ein eingegebenes Passwort gegen den gespeicherten Hash (zeitkonstanter Vergleich).
 * @param password Eingegebenes Passwort
 * @param stored Gespeicherter Hash
 * @returns true, wenn das Passwort stimmt
 */
export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const candidate = await derive(password, fromHex(stored.salt), stored.iterations);
  if (candidate.length !== stored.hash.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ stored.hash.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Prüft, ob ein unbekannter Wert (z. B. aus Firestore) ein gültiger Hash-Datensatz ist.
 * @param value Zu prüfender Wert
 * @returns true, wenn Salt, Hash und Iterationen vorhanden sind
 */
export function isPasswordHash(value: unknown): value is PasswordHash {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { salt, hash, iterations } = value as Record<string, unknown>;
  return typeof salt === 'string' && typeof hash === 'string' && typeof iterations === 'number';
}
