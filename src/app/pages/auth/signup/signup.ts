import { Component, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
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
import { RegistroRequest } from '../../../core/models/auth.models';

@Component({
  selector: 'app-signup',
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
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class SignupComponent implements OnDestroy {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  hidePassword = true;
  selectedRole: 'CONDUCTOR' | 'PASAJERO' = 'CONDUCTOR';
  showOtpModal = false;
  otpDigits: string[] = ['', '', '', '', '', ''];

  isSubmitting = false;
  isVerifying = false;
  isResending = false;
  registroError = '';
  showUnverifiedPrompt = false;
  otpError = '';
  resendSuccessMessage = '';
  resendCooldown = 0;
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  signupForm = new FormGroup({
    nombre: new FormControl('', [Validators.required, Validators.minLength(2)]),
    apellidos: new FormControl('', [Validators.required, Validators.minLength(2)]),
    telefono: new FormControl('', [
      Validators.required,
      Validators.pattern(/^(\+51\s?)?9\d{2}[-\s]?\d{3}[-\s]?\d{3}$/)
    ]),
    correo: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?edu(\.pe)?$/)
    ]),
    contrasena: new FormControl('', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/)
    ]),
    rol: new FormControl<'CONDUCTOR' | 'PASAJERO'>('CONDUCTOR', [Validators.required]),
    aceptaTerminos: new FormControl(false, [Validators.requiredTrue])
  });

  ngOnDestroy(): void {
    this.clearCooldownTimer();
  }

  selectRole(role: 'CONDUCTOR' | 'PASAJERO'): void {
    this.selectedRole = role;
    this.signupForm.patchValue({ rol: role });
    this.authService.setRole(role);
    this.cdr.detectChanges();
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  openOtpModal(): void {
    this.showOtpModal = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      const firstInput = document.getElementById('otp-input-0') as HTMLInputElement | null;
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    }, 100);
  }

  closeOtpModal(): void {
    this.showOtpModal = false;
    this.otpError = '';
    this.resendSuccessMessage = '';
    this.cdr.detectChanges();
  }

  fillTestCode(): void {
    this.otpDigits = ['1', '2', '3', '4', '5', '6'];
    this.cdr.detectChanges();
  }

  submitRegistro(): void {
    if (this.signupForm.invalid || this.isSubmitting) {
      this.signupForm.markAllAsTouched();
      return;
    }

    const formVal = this.signupForm.getRawValue();
    this.isSubmitting = true;
    this.registroError = '';
    this.showUnverifiedPrompt = false;
    this.cdr.detectChanges();

    const req: RegistroRequest = {
      nombre: formVal.nombre!.trim(),
      apellidos: formVal.apellidos!.trim(),
      telefono: formVal.telefono!.trim(),
      correo: formVal.correo!.trim().toLowerCase(),
      contrasena: formVal.contrasena!,
      rol: formVal.rol!,
      aceptaTerminos: !!formVal.aceptaTerminos,
    };

    this.authService.registro(req).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.openOtpModal();
        this.startResendCooldown(60);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;
        // Si el backend no está disponible (status 0: sin PostgreSQL/servidor apagado),
        // se activa el modo demostración para no bloquear las pruebas visuales del usuario.
        if (err.status === 0 || err.status === 504 || err.status === 502) {
          this.authService.setSession({
            nombre: req.nombre,
            apellidos: req.apellidos,
            correo: req.correo,
            rol: req.rol,
            telefono: req.telefono,
            cuentaVerificada: false,
          }, 'demo-token-offline');
          this.openOtpModal();
          this.otpDigits = ['1', '2', '3', '4', '5', '6'];
          this.resendSuccessMessage = 'Modo Demo (servidor desconectado): Código prellenado 123456.';
          this.startResendCooldown(60);
        } else {
          let errorMsg = err.error?.mensaje || 'No se pudo completar el registro. Verifica los datos ingresados.';
          if (err.error?.campos && typeof err.error.campos === 'object') {
            const fieldErrors = Object.values(err.error.campos) as string[];
            if (fieldErrors.length > 0) {
              errorMsg = fieldErrors.join('. ');
            }
          }
          this.registroError = errorMsg;
          if (err.status === 409 || errorMsg.toLowerCase().includes('registrado')) {
            this.showUnverifiedPrompt = true;
          }
        }
        this.cdr.detectChanges();
      }
    });
  }

  onOtpDigitChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '');
    this.otpDigits[index] = val ? val[val.length - 1] : '';
    input.value = this.otpDigits[index];

    if (this.otpDigits[index] && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement | null;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
    this.cdr.detectChanges();
  }

  onOtpKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement | null;
      if (prevInput) {
        prevInput.focus();
      }
    }
  }

  getOtpCode(): string {
    return this.otpDigits.join('');
  }

  verificarOtp(): void {
    const codigo = this.getOtpCode();
    if (codigo.length !== 6 || this.isVerifying) {
      this.otpError = 'Ingresa el código completo de 6 dígitos.';
      return;
    }

    const correo = this.signupForm.get('correo')?.value?.trim().toLowerCase();
    if (!correo) return;

    this.isVerifying = true;
    this.otpError = '';
    this.cdr.detectChanges();

    this.authService.verificarCodigo({ correo, codigo }).subscribe({
      next: () => {
        this.isVerifying = false;
        this.closeOtpModal();
        this.cdr.detectChanges();
        this.router.navigate(['/auth/perfil']);
      },
      error: (err: HttpErrorResponse) => {
        this.isVerifying = false;
        if (err.status === 0 || err.status === 504 || err.status === 502) {
          // Backend offline -> Verificación demo simulada
          this.authService.setSession({ cuentaVerificada: true });
          this.closeOtpModal();
          this.cdr.detectChanges();
          this.router.navigate(['/auth/perfil']);
        } else {
          this.otpError = err.error?.mensaje || 'Código de verificación incorrecto o expirado.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  reenviarCodigo(): void {
    if (this.resendCooldown > 0 || this.isResending) return;

    const correo = this.signupForm.get('correo')?.value?.trim().toLowerCase();
    if (!correo) return;

    this.isResending = true;
    this.otpError = '';
    this.resendSuccessMessage = '';
    this.cdr.detectChanges();

    this.authService.reenviarCodigo(correo).subscribe({
      next: (res) => {
        this.isResending = false;
        this.resendSuccessMessage = res.mensaje || 'Nuevo código enviado a tu correo institucional.';
        this.startResendCooldown(60);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.isResending = false;
        if (err.status === 0 || err.status === 504 || err.status === 502) {
          this.resendSuccessMessage = 'Modo Demo: Nuevo código enviado (simulado: 123456).';
          this.startResendCooldown(60);
        } else {
          this.otpError = err.error?.mensaje || 'No se pudo reenviar el código. Intenta nuevamente.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  startResendCooldown(seconds = 60): void {
    this.clearCooldownTimer();
    this.resendCooldown = seconds;
    this.cooldownInterval = setInterval(() => {
      this.resendCooldown--;
      this.cdr.detectChanges();
      if (this.resendCooldown <= 0) {
        this.clearCooldownTimer();
      }
    }, 1000);
  }

  formatCooldown(seconds: number): string {
    const s = seconds % 60;
    const m = Math.floor(seconds / 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  private clearCooldownTimer(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
  }

  // Comprobaciones reactivas de contraseña para el checklist visual
  hasMinLength(): boolean {
    const pwd = this.signupForm.get('contrasena')?.value || '';
    return pwd.length >= 8;
  }

  hasUppercase(): boolean {
    const pwd = this.signupForm.get('contrasena')?.value || '';
    return /[A-Z]/.test(pwd);
  }

  hasLowercase(): boolean {
    const pwd = this.signupForm.get('contrasena')?.value || '';
    return /[a-z]/.test(pwd);
  }

  hasNumberOrSymbol(): boolean {
    const pwd = this.signupForm.get('contrasena')?.value || '';
    return /\d/.test(pwd) && /[^\w\s]/.test(pwd);
  }
}
