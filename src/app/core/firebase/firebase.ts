import { InjectionToken, inject } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { Firestore, getFirestore } from 'firebase/firestore';
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

/** Firestore: nur für die Box-Passwörter (Hash). */
export const FIREBASE_FIRESTORE = new InjectionToken<Firestore>('FIREBASE_FIRESTORE', {
  factory: (): Firestore => getFirestore(inject(FIREBASE_APP)),
});
