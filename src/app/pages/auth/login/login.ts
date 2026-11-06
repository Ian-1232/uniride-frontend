import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?edu(\.pe)?$/)
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

  // Permite simular los estados visuales del Figma
  triggerDemoState(state: 'error' | 'unverified'): void {
    if (state === 'error') {
      this.showErrorBanner = true;
      this.showUnverifiedBanner = false;
    } else {
      this.showUnverifiedBanner = true;
      this.showErrorBanner = false;
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

    this.authService.login({ correo, contrasena, recordarDispositivo: !!recordarDispositivo }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.cdr.detectChanges();
        const targetRole = res.usuario?.rol || this.authService.currentRole();
        if (targetRole === 'CONDUCTOR') {
          this.router.navigate(['/conductor/dashboard']);
        } else {
          this.router.navigate(['/pasajero/dashboard']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        const msg = err.error?.mensaje;
        if (err.status === 0 || err.status === 504 || err.status === 502) {
          this.showErrorBanner = true;
          this.errorMessage = 'No se detecta conexión con el backend en localhost:8080 (PostgreSQL desconectado). Puedes usar los accesos directos de demostración.';
        } else if (err.status === 409) {
          this.showUnverifiedBanner = true;
          this.unverifiedMessage = msg || 'Tu cuenta aún no ha sido verificada. Revisa tu bandeja institucional o ingresa tu código de confirmación enviado a tu correo.';
        } else {
          this.showErrorBanner = true;
          this.errorMessage = msg || 'Correo o contraseña incorrectos. Verifica tus credenciales o solicita restablecer tu acceso institucional.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}
