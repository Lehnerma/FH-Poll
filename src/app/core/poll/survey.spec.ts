import { nicknameKey, toSurvey } from './survey';

const validRaw = {
  title: 'Test',
  active: true,
  questions: {
    q2: { text: 'Zweite?', options: ['a', 'b', 'c', 'd'] },
    q10: { text: 'Zehnte?', options: ['a', 'b', 'c', 'd'] },
    q1: { text: 'Erste?', options: ['a', 'b', 'c', 'd'] },
  },
};

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

  describe('toSurvey', () => {
    it('liest eine gültige Umfrage und sortiert die Fragen natürlich', () => {
      const survey = toSurvey('s1', validRaw);

      expect(survey?.title).toBe('Test');
      expect(survey?.questions.map((question) => question.id)).toEqual(['q1', 'q2', 'q10']);
      expect(survey?.questions[0].options).toHaveLength(4);
    });

    it('lehnt inaktive Umfragen ab', () => {
      expect(toSurvey('s1', { ...validRaw, active: false })).toBeNull();
    });

    it('lehnt Umfragen mit ungültiger Frage ab', () => {
      const raw = { ...validRaw, questions: { q1: { text: 'x', options: ['nur eine'] } } };

      expect(toSurvey('s1', raw)).toBeNull();
    });

    it('lehnt Umfragen ohne Fragen oder ohne Titel ab', () => {
      expect(toSurvey('s1', { ...validRaw, questions: {} })).toBeNull();
      expect(toSurvey('s1', { ...validRaw, title: undefined })).toBeNull();
    });

    it('lehnt ungültige Rohdaten ab', () => {
      expect(toSurvey('s1', null)).toBeNull();
      expect(toSurvey('s1', 'text')).toBeNull();
    });
  });
});
