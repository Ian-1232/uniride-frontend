import { authError } from '../../../core/services/auth-error';
import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly verified = inject(ActivatedRoute).snapshot.queryParamMap.get('verificado') === 'true';
  hidePassword = true;
  isLoading = false;
  showErrorBanner = false;
  showUnverifiedBanner = false;
  errorMessage = '';
  unverifiedMessage = '';

  loginForm = new FormGroup({
    correo: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.pattern(/^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+edu(?:\.[A-Za-z]{2})?$/)
    ]),
    contrasena: new FormControl('', [
      Validators.required,
      Validators.minLength(8)
    ]),
    recordarDispositivo: new FormControl(false)
  });

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  dismissAlert(type: 'error' | 'unverified'): void {
    if (type === 'error') {
      this.showErrorBanner = false;
    } else {
      this.showUnverifiedBanner = false;
    }
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { correo, contrasena, recordarDispositivo } = this.loginForm.getRawValue();
    if (!correo || !contrasena) return;

    this.isLoading = true;
    this.showErrorBanner = false;
    this.showUnverifiedBanner = false;
    this.cdr.detectChanges();

    this.authService.login({ correo: correo.trim().toLowerCase(), contrasena, recordarDispositivo: !!recordarDispositivo }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.cdr.detectChanges();
        const targetRole = res.usuario!.rol;
        if (targetRole === 'CONDUCTOR') {
          this.router.navigate(['/conductor/dashboard']);
        } else {
          this.router.navigate(['/pasajero/dashboard']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.status === 409) {
          this.showUnverifiedBanner = true;
          this.unverifiedMessage = authError(err, 'Verifica tu correo antes de iniciar sesión.');
        } else {
          this.showErrorBanner = true;
          this.errorMessage = authError(err, 'No se pudo iniciar sesión. Verifica tus credenciales.');
        }
        this.cdr.detectChanges();
      }
    });
  }
}
