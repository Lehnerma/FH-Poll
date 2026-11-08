import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { REGION } from './config';

// Muss vor jeder `onCall`-Definition laufen: Region und Admin-SDK gelten für alle Functions.
initializeApp();
setGlobalOptions({ region: REGION, maxInstances: 5 });
