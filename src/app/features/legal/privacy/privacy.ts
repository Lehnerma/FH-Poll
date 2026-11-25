import { Component } from '@angular/core';
import { Topbar } from '../../../shared/topbar/topbar';
import { LEGAL_VERSION, OPERATOR, REPOSITORY_URL } from '../legal-info';

/**
 * Seite /datenschutz: Informationen nach Art. 13 DSGVO und § 165 Abs. 3 TKG 2021, ohne Login
 * erreichbar. Der Text beschreibt, was der Code tut: Wer an Datenflüssen etwas ändert
 * (Speicher im Browser, Functions, Datenbank, externe Dienste), passt ihn mit an.
 */
@Component({
  selector: 'app-privacy',
  imports: [Topbar],
  templateUrl: './privacy.html',
})
export class Privacy {
  protected readonly operator = OPERATOR;
  protected readonly repositoryUrl = REPOSITORY_URL;
  protected readonly version = LEGAL_VERSION;
}
