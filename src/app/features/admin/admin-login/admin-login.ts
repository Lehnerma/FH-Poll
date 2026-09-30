import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { FirebaseError } from 'firebase/app';
import { Session } from '../../../core/session/session';
import { Topbar } from '../../../shared/topbar/topbar';

const AUTH_ERRORS: Readonly<Record<string, string>> = {
  'auth/invalid-credential': 'E-Mail oder Passwort ist falsch.',
  'auth/invalid-email': 'Bitte eine gültige E-Mail-Adresse eingeben.',
  'auth/too-many-requests': 'Zu viele Versuche. Bitte später erneut probieren.',
  'auth/network-request-failed': 'Keine Verbindung. Bitte Internet prüfen.',
};

@Component({
  selector: 'app-admin-login',
  imports: [FormField, Topbar],
  templateUrl: './admin-login.html',
})
export class AdminLogin {
  private readonly session = inject(Session);
  private readonly router = inject(Router);

  private readonly model = signal({ email: '', password: '' });
  protected readonly loginForm = form(this.model, (path) => {
    required(path.email, { message: 'Bitte E-Mail eingeben.' });
    email(path.email, { message: 'Bitte eine gültige E-Mail-Adresse eingeben.' });
    required(path.password, { message: 'Bitte Passwort eingeben.' });
  });

  protected readonly authError = signal('');
  protected readonly busy = signal(false);

  /** Meldet den Admin an (Formular-Submit). */
  protected onSubmit(): void {
    submit(this.loginForm, async () => {
      this.authError.set('');
      this.busy.set(true);
      try {
        const { email, password } = this.model();
        await this.session.loginAdmin(email, password);
        await this.router.navigateByUrl('/admin');
      } catch (error) {
        const code = error instanceof FirebaseError ? error.code : '';
        this.authError.set(AUTH_ERRORS[code] ?? 'Anmeldung fehlgeschlagen.');
      } finally {
        this.busy.set(false);
      }
    });
  }
}
