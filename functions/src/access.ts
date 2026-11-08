import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { assertNotLocked, clearFailures, registerFailure } from './attempts';
import { hashPassword, isStoredPassword, verifyPassword } from './password';

/**
 * Liest ein Textfeld aus den Aufruf-Daten.
 * @param data Daten des Aufrufs
 * @param key Feldname
 * @returns Text (leer, wenn nicht vorhanden)
 */
export function readText(data: unknown, key: string): string {
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
 * Prüft das Passwort gegen den Hash und führt die Fehlversuch-Sperre.
 * @param request Aufruf mit `password`
 * @param docPath Firestore-Dokument mit Salt + Hash des Passworts
 */
export async function assertPassword(request: CallableRequest, docPath: string): Promise<void> {
  const ip = callerIp(request);
  await assertNotLocked(ip);

  const stored = (await getFirestore().doc(docPath).get()).data();
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
 * Nur eingeloggter Admin: speichert den Hash eines neuen Passworts.
 * @param request Aufruf mit `password` (8 bis 200 Zeichen)
 * @param docPath Firestore-Dokument, in das Salt + Hash geschrieben werden
 */
export async function storePassword(request: CallableRequest, docPath: string): Promise<void> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'admin-only');
  }
  const password = readText(request.data, 'password');
  if (password.length < 8 || password.length > 200) {
    throw new HttpsError('invalid-argument', 'password-length');
  }
  const stored = await hashPassword(password);
  await getFirestore()
    .doc(docPath)
    .set({ ...stored, updatedAt: FieldValue.serverTimestamp() });
}
