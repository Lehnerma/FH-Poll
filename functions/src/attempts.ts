import { createHash } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

/**
 * Dokument für die Fehlversuche eines Absenders (IP wird nur gehasht gespeichert).
 * @param ip IP-Adresse des Aufrufers
 * @returns Firestore-Dokumentreferenz
 */
function attemptsDoc(ip: string): FirebaseFirestore.DocumentReference {
  const id = createHash('sha256').update(ip).digest('hex');
  return getFirestore().collection('attempts').doc(id);
}

/**
 * Wirft `resource-exhausted`, solange der Absender nach zu vielen Fehlversuchen gesperrt ist.
 * @param ip IP-Adresse des Aufrufers
 */
export async function assertNotLocked(ip: string): Promise<void> {
  const data = (await attemptsDoc(ip).get()).data();
  if (typeof data?.['lockedUntil'] === 'number' && data['lockedUntil'] > Date.now()) {
    throw new HttpsError('resource-exhausted', 'too-many-attempts');
  }
}

/**
 * Zählt einen Fehlversuch und sperrt bei Überschreitung des Limits für 15 Minuten.
 * @param ip IP-Adresse des Aufrufers
 */
export async function registerFailure(ip: string): Promise<void> {
  const doc = attemptsDoc(ip);
  await getFirestore().runTransaction(async (transaction) => {
    const fails = ((await transaction.get(doc)).data()?.['fails'] ?? 0) + 1;
    const locked = fails >= MAX_FAILS;
    transaction.set(doc, {
      fails: locked ? 0 : fails,
      lockedUntil: locked ? Date.now() + LOCK_MS : 0,
    });
  });
}

/**
 * Setzt den Fehlversuch-Zähler nach erfolgreichem Entsperren zurück.
 * @param ip IP-Adresse des Aufrufers
 */
export async function clearFailures(ip: string): Promise<void> {
  await attemptsDoc(ip).delete();
}
