import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Session } from '../../../core/session/session';
import { Topbar } from '../../../shared/topbar/topbar';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, Topbar],
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard {
  private readonly session = inject(Session);
  private readonly router = inject(Router);

  /** Meldet den Admin ab und geht zurück zum Admin-Login. */
  protected async logout(): Promise<void> {
    await this.session.logoutAdmin();
    await this.router.navigateByUrl('/admin/login');
  }
}
