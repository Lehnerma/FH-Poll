import './setup';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
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

/** Nur eingeloggter Admin: Ergebnisse als Zahlen (auch bei geschlossener Umfrage). */
export const getSurveyResults = onCall(async (request) => {
  if (request.auth === undefined) {
    throw new HttpsError('unauthenticated', 'login');
  }
  const surveyId = readSurveyId(request.data);
  const survey = await loadSurvey(surveyId, false);
  return buildResults(survey.questions, await loadAnswerSets(surveyId));
});
