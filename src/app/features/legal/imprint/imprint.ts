import { Component } from '@angular/core';
import { Topbar } from '../../../shared/topbar/topbar';
import { LEGAL_VERSION, OPERATOR, REPOSITORY_URL } from '../legal-info';

/** Seite /impressum: Offenlegung nach § 25 Mediengesetz, ohne Login erreichbar. */
@Component({
  selector: 'app-imprint',
  imports: [Topbar],
  templateUrl: './imprint.html',
})
export class Imprint {
  protected readonly operator = OPERATOR;
  protected readonly repositoryUrl = REPOSITORY_URL;
  protected readonly version = LEGAL_VERSION;
}
