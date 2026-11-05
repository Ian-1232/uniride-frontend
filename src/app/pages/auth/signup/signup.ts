import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';

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
    MatCardModule
  ],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class SignupComponent {
  hidePassword = true;
  selectedRole: 'CONDUCTOR' | 'PASAJERO' = 'CONDUCTOR';
  showOtpModal = false;
  otpDigits = ['', '', '', '', '', ''];

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
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,}$/)
    ]),
    rol: new FormControl<'CONDUCTOR' | 'PASAJERO'>('CONDUCTOR', [Validators.required]),
    aceptaTerminos: new FormControl(false, [Validators.requiredTrue])
  });

  selectRole(role: 'CONDUCTOR' | 'PASAJERO'): void {
    this.selectedRole = role;
    this.signupForm.patchValue({ rol: role });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  openOtpModal(): void {
    if (this.signupForm.valid) {
      this.showOtpModal = true;
    }
  }

  closeOtpModal(): void {
    this.showOtpModal = false;
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
    return /[\d\W]/.test(pwd);
  }
}
