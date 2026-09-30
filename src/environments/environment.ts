export const environment = {
  firebase: {
    apiKey: 'AIzaSyCz1LmPDbNgZmd0Tu-1VB3F1jPK4XzJ1Ls',

    authDomain: 'fh-liane.firebaseapp.com',

    databaseURL: 'https://fh-liane-default-rtdb.europe-west1.firebasedatabase.app',

    projectId: 'fh-liane',

    storageBucket: 'fh-liane.firebasestorage.app',

    messagingSenderId: '446714470384',

    appId: '1:446714470384:web:e1dfee1839110207eb8735',

    measurementId: 'G-BZRK6WTH4L',
  },
} as const;

/** Die beiden getrennten Hauptzweige der Realtime Database. */
export const DB_ROOT = {
  poll: 'poll',
  praxis: 'praxis',
} as const;

/** Praxis-Boxen; jede Box hat eine eigene Route (/box1 … /box4). */
export const BOX_NUMBERS = [1, 2, 3, 4] as const;
