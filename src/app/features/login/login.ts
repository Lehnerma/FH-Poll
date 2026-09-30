import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, form, maxLength, submit, validate } from '@angular/forms/signals';
import { Session } from '../../core/session/session';
import { Topbar } from '../../shared/topbar/topbar';

@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink, Topbar],
  templateUrl: './login.html',
})
export class Login {
  private readonly session = inject(Session);
  private readonly router = inject(Router);

  private readonly model = signal({ nickname: this.session.nickname() });
  protected readonly loginForm = form(this.model, (path) => {
    validate(path.nickname, ({ value }) =>
      value().trim() === '' ? { kind: 'blank', message: 'Bitte gib einen Namen ein.' } : undefined,
    );
    maxLength(path.nickname, 30, { message: 'Maximal 30 Zeichen.' });
  });

  /** Speichert den Nickname und öffnet das Dashboard (Formular-Submit). */
  protected onSubmit(): void {
    submit(this.loginForm, async () => {
      this.session.setNickname(this.model().nickname);
      await this.router.navigateByUrl('/dashboard');
    });
  }
}
