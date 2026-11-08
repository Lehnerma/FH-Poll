import './setup';
import { getDatabase } from 'firebase-admin/database';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { assertPassword, storePassword } from './access';
import { ACCESS_DOC, ARCHIVE_PATH, BOX_NUMBERS, PUBLIC_FIELDS } from './config';

export { getSurveyResults, setPollPassword, submitSurvey, unlockSurvey } from './poll';

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
  await storePassword(request, ACCESS_DOC);
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
  await assertPassword(request, ACCESS_DOC);
  return { entries: await loadBoxEntries(box) };
});
