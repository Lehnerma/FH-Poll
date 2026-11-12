import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Session } from './session';

/** Startseite: leitet je nach Rolle weiter. */
export const homeGuard: CanActivateFn = async () => {
  const session = inject(Session);
  const router = inject(Router);
  await session.ready;

  if (session.isAdmin()) {
    return router.createUrlTree(['/admin']);
  }
  return router.createUrlTree([session.hasNickname() ? '/dashboard' : '/login']);
};

/** User-Bereich: Nickname gesetzt oder Admin eingeloggt. */
export const userGuard: CanActivateFn = async () => {
  const session = inject(Session);
  await session.ready;
  return session.isAdmin() || session.hasNickname() || inject(Router).createUrlTree(['/login']);
};

/** Praxis/Objektträger (/praxis, /box1 … /box4): für User gesperrt, nur Admin. User gehen zum Dashboard. */
export const praxisGuard: CanActivateFn = async () => {
  const session = inject(Session);
  await session.ready;
  return session.isAdmin() || inject(Router).createUrlTree(['/dashboard']);
};

/** Admin-Bereich: nur mit Firebase-Login. */
export const adminGuard: CanActivateFn = async () => {
  const session = inject(Session);
  await session.ready;
  return session.isAdmin() || inject(Router).createUrlTree(['/admin/login']);
};
