import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-topbar',
  imports: [RouterLink],
  styleUrl: './topbar.scss',
  template: `
    <header class="topbar">
      <span class="topbar__brand">{{ title() }}</span>
      @if (backLink(); as link) {
        <a class="topbar__link" [routerLink]="link">← {{ backLabel() }}</a>
      }
      <ng-content />
    </header>
  `,
})
export class Topbar {
  readonly title = input.required<string>();
  readonly backLink = input<string>();
  readonly backLabel = input('Zurück');
}
