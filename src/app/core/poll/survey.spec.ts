import { photoProblem } from './poll-photos';
import {
  DEFAULT_OPTIONS,
  OPTION_COUNT,
  SurveySummary,
  moveSurvey,
  nicknameKey,
  percent,
  sortSummaries,
  toQuestions,
  toResults,
  toSummary,
  toSurvey,
  withPositions,
} from './survey';

const summary = (id: string, position: number | null, createdAt = 0): SurveySummary => ({
  id,
  title: `Umfrage ${id}`,
  active: true,
  questionCount: 1,
  createdAt,
  position,
});

const ids = (list: readonly SurveySummary[] | null): string[] | undefined =>
  list?.map((survey) => survey.id);

const rawQuestion = (id: string, extra: object = {}): object => ({
  id,
  text: `Frage ${id}`,
  options: ['a', 'b', 'c', 'd'],
  ...extra,
});

describe('survey', () => {
  describe('nicknameKey', () => {
    it('ignoriert Groß-/Kleinschreibung und Leerzeichen am Rand', () => {
      expect(nicknameKey('  Jonas ')).toBe(nicknameKey('jonas'));
    });

    it('ersetzt Punkte, damit der Schlüssel in der Datenbank erlaubt ist', () => {
      expect(nicknameKey('a.b')).toBe('a%2Eb');
    });

    it('kodiert Sonderzeichen und Umlaute ohne verbotene Zeichen', () => {
      expect(nicknameKey('Jörg/#$[]')).not.toMatch(/[.#$[\]/]/);
    });
  });

  describe('toSummary', () => {
    it('liest einen gültigen Listeneintrag', () => {
      const raw = { title: 'T', active: true, questionCount: 5, createdAt: 10 };

      expect(toSummary('s1', raw)).toEqual({
        id: 's1',
        title: 'T',
        active: true,
        questionCount: 5,
        createdAt: 10,
        position: null,
      });
    });

    it('liest die Position, wenn der Admin die Reihenfolge festgelegt hat', () => {
      const raw = { title: 'T', active: true, questionCount: 5, createdAt: 10, position: 2 };

      expect(toSummary('s1', raw)?.position).toBe(2);
    });

    it('lehnt Einträge ohne Titel oder ohne aktiv-Status ab', () => {
      expect(toSummary('s1', { active: true })).toBeNull();
      expect(toSummary('s1', { title: 'T' })).toBeNull();
      expect(toSummary('s1', null)).toBeNull();
    });
  });

  describe('sortSummaries', () => {
    it('sortiert nach Position', () => {
      const list = [summary('c', 2), summary('a', 0), summary('b', 1)];

      expect(ids(sortSummaries(list))).toEqual(['a', 'b', 'c']);
    });

    it('stellt Altbestand ohne Position nach createdAt aufsteigend dar', () => {
      const list = [summary('neu', null, 30), summary('alt', null, 10), summary('mitte', null, 20)];

      expect(ids(sortSummaries(list))).toEqual(['alt', 'mitte', 'neu']);
    });

    it('setzt Umfragen ohne Position hinter die mit Position', () => {
      const list = [summary('ohne', null, 1), summary('mit', 5, 99)];

      expect(ids(sortSummaries(list))).toEqual(['mit', 'ohne']);
    });

    it('entscheidet bei gleicher Position nach createdAt', () => {
      const list = [summary('spaet', 1, 20), summary('frueh', 1, 10)];

      expect(ids(sortSummaries(list))).toEqual(['frueh', 'spaet']);
    });

    it('verändert die übergebene Liste nicht', () => {
      const list = [summary('b', 1), summary('a', 0)];

      sortSummaries(list);

      expect(ids(list)).toEqual(['b', 'a']);
    });
  });

  describe('withPositions', () => {
    it('nummeriert lückenlos von 0 an in der gegebenen Reihenfolge', () => {
      const result = withPositions([summary('x', 7), summary('y', null)]);

      expect(result.map((survey) => survey.position)).toEqual([0, 1]);
    });
  });

  describe('moveSurvey', () => {
    const list = [summary('a', 0), summary('b', 1), summary('c', 2)];

    it('schiebt eine Umfrage nach oben und nummeriert neu', () => {
      const result = moveSurvey(list, 'b', -1);

      expect(ids(result)).toEqual(['b', 'a', 'c']);
      expect(result?.map((survey) => survey.position)).toEqual([0, 1, 2]);
    });

    it('schiebt eine Umfrage nach unten', () => {
      expect(ids(moveSurvey(list, 'b', 1))).toEqual(['a', 'c', 'b']);
    });

    it('verschiebt nichts, wenn die Umfrage schon am Rand steht', () => {
      expect(moveSurvey(list, 'a', -1)).toBeNull();
      expect(moveSurvey(list, 'c', 1)).toBeNull();
    });

    it('verschiebt nichts bei unbekannter Umfrage', () => {
      expect(moveSurvey(list, 'x', 1)).toBeNull();
    });
  });

  describe('toQuestions', () => {
    it('liest Fragen mit und ohne Foto in gespeicherter Reihenfolge', () => {
      const photo = { url: 'https://x/y.jpg', path: 'polls/s1/a.jpg' };
      const questions = toQuestions([rawQuestion('b'), rawQuestion('a', { photo })]);

      expect(questions.map((question) => question.id)).toEqual(['b', 'a']);
      expect(questions[0].photo).toBeNull();
      expect(questions[1].photo).toEqual(photo);
    });

    it('ignoriert eine früher gespeicherte Bildbeschreibung', () => {
      const photo = { url: 'https://x/y.jpg', alt: 'alt' };

      expect(toQuestions([rawQuestion('a', { photo })])[0].photo).toEqual({ url: photo.url });
    });

    it('verwirft Fragen ohne genau 4 Optionen', () => {
      const three = rawQuestion('x', { options: ['a', 'b', 'c'] });

      expect(toQuestions([three, rawQuestion('y')]).map((question) => question.id)).toEqual(['y']);
    });

    it('liest auch ein Objekt statt eines Arrays', () => {
      expect(toQuestions({ 0: rawQuestion('a'), 2: rawQuestion('b') })).toHaveLength(2);
    });

    it('gibt bei ungültigen Rohdaten eine leere Liste zurück', () => {
      expect(toQuestions(null)).toEqual([]);
      expect(toQuestions('text')).toEqual([]);
    });
  });

  describe('toSurvey', () => {
    it('liest die Antwort von unlockSurvey', () => {
      const survey = toSurvey('s1', { title: 'T', questions: [rawQuestion('q1')] });

      expect(survey?.title).toBe('T');
      expect(survey?.questions).toHaveLength(1);
    });

    it('lehnt Umfragen ohne Titel oder ohne Fragen ab', () => {
      expect(toSurvey('s1', { questions: [rawQuestion('q1')] })).toBeNull();
      expect(toSurvey('s1', { title: 'T', questions: [] })).toBeNull();
    });
  });

  describe('toResults und percent', () => {
    it('liest ein gültiges Ergebnis', () => {
      expect(toResults({ participants: 3, questions: [] })).toEqual({
        participants: 3,
        questions: [],
      });
    });

    it('lehnt ungültige Ergebnisse ab', () => {
      expect(toResults({ participants: 'x' })).toBeNull();
      expect(toResults(null)).toBeNull();
    });

    it('rundet Prozent und teilt nicht durch null', () => {
      expect(percent(1, 3)).toBe(33);
      expect(percent(2, 3)).toBe(67);
      expect(percent(0, 0)).toBe(0);
    });
  });

  describe('DEFAULT_OPTIONS', () => {
    it('enthält genau die vier Standardantworten', () => {
      expect(DEFAULT_OPTIONS).toEqual(['NILM', 'LSIL', 'HSIL', 'Karzinom']);
      expect(DEFAULT_OPTIONS).toHaveLength(OPTION_COUNT);
    });
  });

  describe('photoProblem', () => {
    it('akzeptiert JPG, PNG und WebP bis 10 MB', () => {
      expect(photoProblem({ type: 'image/jpeg', size: 1000 })).toBeNull();
      expect(photoProblem({ type: 'image/png', size: 10 * 1024 * 1024 })).toBeNull();
      expect(photoProblem({ type: 'image/webp', size: 1 })).toBeNull();
    });

    it('lehnt andere Formate und zu große Fotos ab', () => {
      expect(photoProblem({ type: 'image/gif', size: 1000 })).not.toBeNull();
      expect(photoProblem({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 })).not.toBeNull();
    });
  });
});
