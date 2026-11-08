import './setup';
import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { assertPassword, storePassword } from './access';
import { POLL_ACCESS_DOC } from './config';
import {
  buildResults,
  hasResponded,
  loadAnswerSets,
  loadSurvey,
  readAnswers,
  readNickname,
  readSurveyId,
  saveResponse,
} from './poll-data';

/** Nur eingeloggter Admin: setzt das gemeinsame Passwort aller Umfragen. */
export const setPollPassword = onCall(async (request) => {
  await storePassword(request, POLL_ACCESS_DOC);
  return { ok: true };
});

/** Öffentlich: prüft das Passwort und liefert Titel, Fragen (mit Foto-Links) und den Teilnahme-Status. */
export const unlockSurvey = onCall(async (request) => {
  const surveyId = readSurveyId(request.data);
  await assertPassword(request, POLL_ACCESS_DOC);
  const survey = await loadSurvey(surveyId, true);
  const participated = await hasResponded(surveyId, readNickname(request.data));
  return { title: survey.title, questions: survey.questions, participated };
});

/** Öffentlich: speichert die Antworten, pro Nickname und Umfrage nur einmal. */
export const submitSurvey = onCall(async (request) => {
  const surveyId = readSurveyId(request.data);
  await assertPassword(request, POLL_ACCESS_DOC);
  const survey = await loadSurvey(surveyId, true);
  const nickname = readNickname(request.data);
  const answers = readAnswers(request.data, survey.questions);
  const saved = await saveResponse(surveyId, nickname, answers);
  return { result: saved ? 'saved' : 'duplicate' };
});

/**
 * User dürfen die Ergebnisse nur mit Passwort und nach eigener Teilnahme sehen.
 * @param request Aufruf mit `password` und `nickname`
 * @param surveyId Umfrage-ID
 */
async function assertParticipant(request: CallableRequest, surveyId: string): Promise<void> {
  await assertPassword(request, POLL_ACCESS_DOC);
  if (!(await hasResponded(surveyId, readNickname(request.data)))) {
    throw new HttpsError('permission-denied', 'not-participated');
  }
}

/** Ergebnisse als Zahlen: Admin immer, User nur mit Passwort und nach Teilnahme (offene Umfrage). */
export const getSurveyResults = onCall(async (request) => {
  const surveyId = readSurveyId(request.data);
  const isAdmin = request.auth !== undefined;
  if (!isAdmin) {
    await assertParticipant(request, surveyId);
  }
  const survey = await loadSurvey(surveyId, !isAdmin);
  return buildResults(survey.questions, await loadAnswerSets(surveyId));
});
