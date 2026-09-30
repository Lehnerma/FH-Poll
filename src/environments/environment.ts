// Firebase-Projektdaten aus der Firebase-Konsole eintragen
// (Projekteinstellungen → Allgemein → Meine Apps → SDK-Konfiguration).
// Diese Werte sind öffentlich (Web-Config) – der Schutz läuft über die Security Rules.
export const environment = {
  firebase: {
    apiKey: 'REPLACE_ME',
    authDomain: 'REPLACE_ME.firebaseapp.com',
    databaseURL: 'https://REPLACE_ME-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'REPLACE_ME',
    storageBucket: 'REPLACE_ME.firebasestorage.app',
    messagingSenderId: 'REPLACE_ME',
    appId: 'REPLACE_ME',
  },
} as const;

/** Die beiden getrennten Hauptzweige der Realtime Database. */
export const DB_ROOT = {
  poll: 'poll',
  praxis: 'praxis',
} as const;

/** Praxis-Boxen; jede Box hat eine eigene Route (/box1 … /box4). */
export const BOX_NUMBERS = [1, 2, 3, 4] as const;
