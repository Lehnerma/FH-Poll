import { InjectionToken, inject } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { Functions, getFunctions } from 'firebase/functions';
import { environment } from '../../../environments/environment';

const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP', {
  factory: (): FirebaseApp => initializeApp(environment.firebase),
});

export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH', {
  factory: (): Auth => getAuth(inject(FIREBASE_APP)),
});

/** Realtime Database: Hauptzweige `poll` und `praxis` (siehe DB_ROOT). */
export const FIREBASE_DATABASE = new InjectionToken<Database>('FIREBASE_DATABASE', {
  factory: (): Database => getDatabase(inject(FIREBASE_APP)),
});

/** Cloud Functions (Box-Passwort setzen und Box entsperren), Region wie im Functions-Projekt. */
export const FIREBASE_FUNCTIONS = new InjectionToken<Functions>('FIREBASE_FUNCTIONS', {
  factory: (): Functions => getFunctions(inject(FIREBASE_APP), 'europe-west1'),
});
