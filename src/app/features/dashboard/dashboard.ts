import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Session } from '../../core/session/session';
import { Topbar } from '../../shared/topbar/topbar';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Topbar],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly session = inject(Session);
  private readonly router = inject(Router);

  /** Löscht den Nickname und geht zurück zum Login. */
  protected async changeName(): Promise<void> {
    this.session.setNickname('');
    await this.router.navigateByUrl('/login');
  }
}
