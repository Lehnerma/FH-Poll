import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Fußzeile auf jeder Seite, damit Impressum und Datenschutz immer leicht auffindbar sind. */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <footer class="site-footer">
      <nav aria-label="Rechtliches">
        <ul class="site-footer__list">
          <li>
            <a
              class="site-footer__link"
              routerLink="/impressum"
              routerLinkActive="site-footer__link--active"
              ariaCurrentWhenActive="page"
              >Impressum</a
            >
          </li>
          <li>
            <a
              class="site-footer__link"
              routerLink="/datenschutz"
              routerLinkActive="site-footer__link--active"
              ariaCurrentWhenActive="page"
              >Datenschutz</a
            >
          </li>
        </ul>
      </nav>
    </footer>
  `,
})
export class SiteFooter {}
