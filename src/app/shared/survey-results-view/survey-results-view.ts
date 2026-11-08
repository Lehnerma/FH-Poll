import { Component, computed, input } from '@angular/core';
import { SurveyResults, percent } from '../../core/poll/survey';
import { PhotoZoom } from '../photo-zoom/photo-zoom';

/** Foto-Adresse je Frage-ID. */
export type PhotoUrls = Readonly<Record<string, string>>;

interface OptionRow {
  readonly text: string;
  readonly count: number;
  readonly percent: number;
}

interface QuestionRow {
  readonly id: string;
  readonly text: string;
  readonly photoUrl: string | null;
  readonly options: readonly OptionRow[];
}

/**
 * Rechnet die Stimmen je Frage in Prozent um (Basis: alle Stimmen dieser Frage).
 * @param results Ergebnis von der Cloud Function
 * @param photos Foto-Adresse je Frage-ID (Fragen ohne Foto fehlen)
 * @returns Zeilen für die Anzeige
 */
function toRows(results: SurveyResults, photos: PhotoUrls): QuestionRow[] {
  return results.questions.map((question) => {
    const total = question.options.reduce((sum, option) => sum + option.count, 0);
    const options = question.options.map((option) => ({
      ...option,
      percent: percent(option.count, total),
    }));
    return { id: question.id, text: question.text, photoUrl: photos[question.id] ?? null, options };
  });
}

/** Gesamtansicht der Ergebnisse (nur Admin): Teilnehmerzahl, je Frage Foto und Balken in Prozent. */
@Component({
  selector: 'app-survey-results-view',
  imports: [PhotoZoom],
  templateUrl: './survey-results-view.html',
})
export class SurveyResultsView {
  readonly results = input.required<SurveyResults>();
  readonly photos = input<PhotoUrls>({});

  protected readonly rows = computed(() => toRows(this.results(), this.photos()));
}
