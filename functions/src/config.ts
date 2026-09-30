/** Region der Functions (passend zur Realtime Database in Europa). */
export const REGION = 'europe-west1';

/** Erlaubte Boxnummern (Routen /box1 … /box4). */
export const BOX_NUMBERS: readonly number[] = [1, 2, 3, 4];

/** Firestore-Dokument mit Salt + Hash des gemeinsamen Box-Passworts (für Clients gesperrt). */
export const ACCESS_DOC = 'config/boxAccess';

/** Pfad der Archiv-Tabelle in der Realtime Database. */
export const ARCHIVE_PATH = 'praxis/archive';

/**
 * Felder, die ein Eintrag an User ausliefert. Neue Felder im Archiv gehen nur nach
 * bewusster Aufnahme hierher an die Box-User (Admin-Notizen o. Ä. bleiben sonst intern).
 */
export const PUBLIC_FIELDS = [
  'labor',
  'probenjahr',
  'idLabor',
  'pap',
  'bethesda',
  'repraesentation',
  'anmerkung',
  'anmerkungObjekttraeger',
  'notiz',
  'geburtsjahr',
] as const;
