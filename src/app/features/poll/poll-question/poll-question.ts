import { Component, input, output } from '@angular/core';
import { SurveyQuestion } from '../../../core/poll/survey';
import { PhotoZoom } from '../../../shared/photo-zoom/photo-zoom';

/** Eine Frage: Text, Foto (so groß wie möglich, mit Vollbild) und 4 Optionen mit einer Auswahl. */
@Component({
  selector: 'app-poll-question',
  imports: [PhotoZoom],
  templateUrl: './poll-question.html',
})
export class PollQuestion {
  readonly question = input.required<SurveyQuestion>();
  /** Laufende Nummer der Frage (ab 1). */
  readonly number = input.required<number>();
  /** Index der gewählten Option, solange noch keine gewählt wurde: undefined. */
  readonly selected = input<number>();

  /** Meldet den Index der gewählten Option. */
  readonly chosen = output<number>();
}
