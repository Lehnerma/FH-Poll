import { Routes } from '@angular/router';
import { BOX_NUMBERS } from '../environments/environment';
import { adminGuard, homeGuard, userGuard } from './core/session/session-guards';

/** Je Box eine feste Route (/box1 … /box4); die Nummer kommt als Route-Data ins Component-Input. */
const boxRoutes: Routes = BOX_NUMBERS.map((box) => ({
  path: `box${box}`,
  canActivate: [userGuard],
  data: { box },
  loadComponent: () => import('./features/box/box').then((m) => m.Box),
}));

const adminBoxRoutes: Routes = BOX_NUMBERS.map((box) => ({
  path: `box${box}`,
  data: { box },
  loadComponent: () => import('./features/admin/admin-box/admin-box').then((m) => m.AdminBox),
}));

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [homeGuard], children: [] },

  // User
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'dashboard',
    canActivate: [userGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'praxis',
    canActivate: [userGuard],
    loadComponent: () => import('./features/praxis/praxis-boxes').then((m) => m.PraxisBoxes),
  },
  ...boxRoutes,

  // Admin
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/admin-login/admin-login').then((m) => m.AdminLogin),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/admin/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
      },
      {
        path: 'praxis',
        loadComponent: () =>
          import('./features/admin/admin-boxes/admin-boxes').then((m) => m.AdminBoxes),
      },
      {
        path: 'archiv',
        loadComponent: () =>
          import('./features/admin/admin-archive/admin-archive').then((m) => m.AdminArchive),
      },
      ...adminBoxRoutes,
    ],
  },

  { path: '**', redirectTo: '' },
];
