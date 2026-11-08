import { photoProblem } from './poll-photos';
import { nicknameKey, percent, toQuestions, toResults, toSummary, toSurvey } from './survey';

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
      });
    });

    it('lehnt Einträge ohne Titel oder ohne aktiv-Status ab', () => {
      expect(toSummary('s1', { active: true })).toBeNull();
      expect(toSummary('s1', { title: 'T' })).toBeNull();
      expect(toSummary('s1', null)).toBeNull();
    });
  });

  describe('toQuestions', () => {
    it('liest Fragen mit und ohne Foto in gespeicherter Reihenfolge', () => {
      const photo = { url: 'https://x/y.jpg', alt: 'Bild', path: 'polls/s1/a.jpg' };
      const questions = toQuestions([rawQuestion('b'), rawQuestion('a', { photo })]);

      expect(questions.map((question) => question.id)).toEqual(['b', 'a']);
      expect(questions[0].photo).toBeNull();
      expect(questions[1].photo).toEqual(photo);
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
