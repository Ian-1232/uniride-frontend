import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SignupComponent } from './signup';

describe('SignupComponent (US01 - Registro & US03 - Selección de Rol)', () => {
  let component: SignupComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    const fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }, 30000);

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cambiar de rol entre CONDUCTOR y PASAJERO (US03)', () => {
    expect(component.selectedRole).toBe('CONDUCTOR');
    expect(component.signupForm.get('rol')?.value).toBe('CONDUCTOR');

    component.selectRole('PASAJERO');
    expect(component.selectedRole).toBe('PASAJERO');
    expect(component.signupForm.get('rol')?.value).toBe('PASAJERO');
  });

  it('debe evaluar correctamente el checklist de fortaleza de contraseña', () => {
    const pwdControl = component.signupForm.controls.contrasena;

    pwdControl.setValue('abc');
    expect(component.hasMinLength()).toBe(false);
    expect(component.hasUppercase()).toBe(false);
    expect(component.hasLowercase()).toBe(true);
    expect(component.hasNumberOrSymbol()).toBe(false);

    pwdControl.setValue('Segura2026!');
    expect(component.hasMinLength()).toBe(true);
    expect(component.hasUppercase()).toBe(true);
    expect(component.hasLowercase()).toBe(true);
    expect(component.hasNumberOrSymbol()).toBe(true);
  });

  it('debe exigir aceptación de términos y condiciones para ser válido', () => {
    component.signupForm.setValue({
      nombre: 'Renzo',
      apellidos: 'Arbulu',
      telefono: '987654321',
      correo: 'u202323115@upc.edu.pe',
      contrasena: 'Segura2026!',
      rol: 'CONDUCTOR',
      aceptaTerminos: false
    });
    expect(component.signupForm.valid).toBe(false);

    component.signupForm.patchValue({ aceptaTerminos: true });
    expect(component.signupForm.valid).toBe(true);
  });

  it('debe abrir y cerrar el modal OTP', () => {
    component.signupForm.setValue({
      nombre: 'Renzo',
      apellidos: 'Arbulu',
      telefono: '987654321',
      correo: 'u202323115@upc.edu.pe',
      contrasena: 'Segura2026!',
      rol: 'CONDUCTOR',
      aceptaTerminos: true
    });
    expect(component.showOtpModal).toBe(false);
    component.openOtpModal();
    expect(component.showOtpModal).toBe(true);

    component.closeOtpModal();
    expect(component.showOtpModal).toBe(false);
  });
});
