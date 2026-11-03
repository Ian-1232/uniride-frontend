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
    MatCardModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  hidePassword = true;
  showErrorBanner = false;
  showUnverifiedBanner = false;

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
  }
}
