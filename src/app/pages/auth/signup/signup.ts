import { authError, retrySeconds } from '../../../core/services/auth-error';
import { Component, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
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
    nombre: new FormControl('', [Validators.required, Validators.pattern(/\S/)]),
    apellidos: new FormControl('', [Validators.required, Validators.pattern(/\S/)]),
    telefono: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\+?[0-9][0-9 ()-]{6,24}$/)
    ]),
    correo: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.pattern(/^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+edu(?:\.[A-Za-z]{2})?$/)
    ]),
    contrasena: new FormControl('', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/)
    ]),
    rol: new FormControl<'CONDUCTOR' | 'PASAJERO'>('CONDUCTOR', [Validators.required]),
    aceptaTerminos: new FormControl(false, [Validators.requiredTrue])
  });

  constructor() {
    const params = inject(ActivatedRoute).snapshot.queryParamMap;
    const correo = params.get('correo');
    if (params.get('verificar') === 'true' && correo) {
      this.signupForm.controls.correo.setValue(correo);
      this.showOtpModal = true;
    }
  }

  ngOnDestroy(): void {
    this.clearCooldownTimer();
  }

  selectRole(role: 'CONDUCTOR' | 'PASAJERO'): void {
    this.selectedRole = role;
    this.signupForm.patchValue({ rol: role });
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
    if (this.isVerifying || this.isResending) return;
    this.showOtpModal = false;
    this.otpDigits = ['', '', '', '', '', ''];
    this.otpError = '';
    this.resendSuccessMessage = '';
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
        this.signupForm.controls.contrasena.reset();
        this.openOtpModal();
        this.startResendCooldown(60);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.registroError = authError(err, 'No se pudo completar el registro. Verifica los datos ingresados.');
        this.showUnverifiedPrompt = err.status === 409;
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
    if (!/^\d{6}$/.test(codigo) || this.isVerifying || this.isResending) {
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
        this.otpDigits = ['', '', '', '', '', ''];
        this.signupForm.controls.contrasena.reset();
        this.router.navigate(['/auth/login'], { queryParams: { verificado: 'true' } });
      },
      error: (err: HttpErrorResponse) => {
        this.isVerifying = false;
        this.otpError = authError(err, 'Código incorrecto o expirado. Solicita uno nuevo si es necesario.');
        if (err.status === 429) this.startResendCooldown(retrySeconds(err));
        this.cdr.detectChanges();
      }
    });
  }

  reenviarCodigo(): void {
    if (this.resendCooldown > 0 || this.isResending || this.isVerifying) return;

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
        this.otpError = authError(err, 'No se pudo reenviar el código. Intenta nuevamente.');
        if (err.status === 429) this.startResendCooldown(retrySeconds(err));
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
