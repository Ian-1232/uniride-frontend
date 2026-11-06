import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';
import { PerfilService } from '../../core/services/perfil.service';
import { RoleType } from '../../core/models/auth.models';
import { perfilError } from '../../core/services/perfil-error';
@Component({
  selector: 'app-role-selector',
  imports: [MatMenuModule, MatButtonModule],
  templateUrl: './role-selector.html',
  styleUrl: './role-selector.css',
})
export class RoleSelector {
  readonly auth = inject(AuthService);
  readonly perfil = inject(PerfilService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly error = signal('');
  cambiar(rol: RoleType): void {
    if (this.auth.changingRole() || this.perfil.saving() || rol === this.auth.currentRole()) return;
    this.error.set('');
    this.auth
      .cambiarRol(rol)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) =>
          void this.router.navigate([
            user.rol === 'CONDUCTOR' ? '/conductor/dashboard' : '/pasajero/dashboard',
          ]),
        error: (error) => this.error.set(perfilError(error)),
      });
  }
}
