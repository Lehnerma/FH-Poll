import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { assertNotLocked, clearFailures, registerFailure } from './attempts';
import { ACCESS_DOC, ARCHIVE_PATH, BOX_NUMBERS, PUBLIC_FIELDS, REGION } from './config';
import { hashPassword, isStoredPassword, verifyPassword } from './password';

initializeApp();
setGlobalOptions({ region: REGION, maxInstances: 5 });

/**
 * Liest ein Textfeld aus den Aufruf-Daten.
 * @param data Daten des Aufrufs
 * @param key Feldname
 * @returns Text (leer, wenn nicht vorhanden)
 */
function readText(data: unknown, key: string): string {
  const value = (data as Record<string, unknown> | null)?.[key];
  return typeof value === 'string' ? value : '';
}

/**
 * Bestimmt die IP des Aufrufers (für die Fehlversuch-Sperre).
 * @param request Aufruf
 * @returns IP oder "unknown"
 */
function callerIp(request: CallableRequest): string {
  return request.rawRequest.ip ?? 'unknown';
}

/**
 * Reduziert einen Archiv-Eintrag auf die Felder, die an User gehen dürfen.
 * @param key Schlüssel des Eintrags
 * @param raw Rohdaten aus der Realtime Database
 * @returns Eintrag mit Schlüssel und freigegebenen Feldern
 */
function toPublicEntry(key: string, raw: Record<string, unknown>): Record<string, unknown> {
  const entry: Record<string, unknown> = { key };
  for (const field of PUBLIC_FIELDS) {
    entry[field] = raw[field] ?? null;
  }
  return entry;
}

/** Nur eingeloggter Admin: setzt das gemeinsame Passwort aller Boxen (Hash wird hier erzeugt). */
export const setBoxPassword = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'admin-only');
  }
  const password = readText(request.data, 'password');
  if (password.length < 8 || password.length > 200) {
    throw new HttpsError('invalid-argument', 'password-length');
  }
  const stored = await hashPassword(password);
  await getFirestore()
    .doc(ACCESS_DOC)
    .set({ ...stored, updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

/**
 * Liest und prüft die Boxnummer aus den Aufruf-Daten.
 * @param data Daten des Aufrufs
 * @returns Boxnummer 1–4
 */
function readBox(data: unknown): number {
  const box = (data as Record<string, unknown> | null)?.['box'];
  if (typeof box !== 'number' || !BOX_NUMBERS.includes(box)) {
    throw new HttpsError('invalid-argument', 'box');
  }
  return box;
}

/**
 * Prüft das Passwort gegen den Hash und führt die Fehlversuch-Sperre.
 * @param request Aufruf mit `password`
 */
async function assertPassword(request: CallableRequest): Promise<void> {
  const ip = callerIp(request);
  await assertNotLocked(ip);

  const stored = (await getFirestore().doc(ACCESS_DOC).get()).data();
  if (!isStoredPassword(stored)) {
    throw new HttpsError('failed-precondition', 'not-configured');
  }
  if (!(await verifyPassword(readText(request.data, 'password'), stored))) {
    await registerFailure(ip);
    throw new HttpsError('permission-denied', 'wrong-password');
  }
  await clearFailures(ip);
}

/**
 * Lädt die Archiv-Einträge einer Box (Filter auf das Feld `box`, Index in den Rules).
 * @param box Boxnummer
 * @returns Einträge mit freigegebenen Feldern
 */
async function loadBoxEntries(box: number): Promise<Record<string, unknown>[]> {
  const ref = getDatabase().ref(ARCHIVE_PATH);
  const snapshot = await ref.orderByChild('box').equalTo(`box${box}`).get();
  const entries: Record<string, unknown>[] = [];
  snapshot.forEach((child) => {
    entries.push(toPublicEntry(child.key, child.val() as Record<string, unknown>));
  });
  return entries;
}

/** Öffentlich: prüft das Passwort und liefert nur die Einträge der gewünschten Box. */
export const unlockBox = onCall(async (request) => {
  const box = readBox(request.data);
  await assertPassword(request);
  return { entries: await loadBoxEntries(box) };
});
