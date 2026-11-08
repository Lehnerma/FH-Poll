import { Component, computed, input } from '@angular/core';
import { SurveyResults, percent } from '../../core/poll/survey';

interface OptionRow {
  readonly text: string;
  readonly count: number;
  readonly percent: number;
}

interface QuestionRow {
  readonly id: string;
  readonly text: string;
  readonly options: readonly OptionRow[];
}

/**
 * Rechnet die Stimmen je Frage in Prozent um (Basis: alle Stimmen dieser Frage).
 * @param results Ergebnis von der Cloud Function
 * @returns Zeilen für die Anzeige
 */
function toRows(results: SurveyResults): QuestionRow[] {
  return results.questions.map((question) => {
    const total = question.options.reduce((sum, option) => sum + option.count, 0);
    const options = question.options.map((option) => ({
      ...option,
      percent: percent(option.count, total),
    }));
    return { id: question.id, text: question.text, options };
  });
}

/** Gesamtansicht der Ergebnisse (für User und Admin): Teilnehmerzahl, je Frage Balken in Prozent. */
@Component({
  selector: 'app-survey-results-view',
  templateUrl: './survey-results-view.html',
})
export class SurveyResultsView {
  readonly results = input.required<SurveyResults>();

  protected readonly rows = computed(() => toRows(this.results()));
}
