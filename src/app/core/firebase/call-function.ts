import { Functions, httpsCallable } from 'firebase/functions';

/**
 * Ruft eine Cloud Function (callable) auf.
 * @param functions Functions-Instanz (siehe `FIREBASE_FUNCTIONS`)
 * @param name Name der Function
 * @param payload Daten für die Function
 * @returns Antwortdaten der Function
 */
export async function callFunction<T>(
  functions: Functions,
  name: string,
  payload: object,
): Promise<T> {
  return (await httpsCallable<object, T>(functions, name)(payload)).data;
}
