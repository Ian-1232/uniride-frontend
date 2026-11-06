import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';
import { SignupComponent } from './signup';
import { AuthService } from '../../../core/services/auth.service';
import { AuthRespuesta } from '../../../core/models/auth.models';

describe('SignupComponent (US01 - Registro & US03 - Selección de Rol)', () => {
  let component: SignupComponent;
  let authService: AuthService;
  let router: Router;
  let fixture: ComponentFixture<SignupComponent>;

  afterEach(() => component.ngOnDestroy());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  }, 30000);

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('connects the external submit button to the registration form', () => {
    vi.spyOn(authService, 'registro').mockReturnValue(of({ token: null, mensaje: 'OK' }));
    component.signupForm.setValue({ nombre: 'Ana', apellidos: 'Torres', telefono: '987654321', correo: 'ana@upc.edu.pe', contrasena: 'Password1!', rol: 'PASAJERO', aceptaTerminos: true });
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.form?.id).toBe('signup-form');
    button.click();
    expect(authService.registro).toHaveBeenCalledTimes(1);
    expect(component.showOtpModal).toBe(true);
  });

  it('does not open OTP or grant a session when registration is offline', () => {
    vi.spyOn(authService, 'registro').mockReturnValue(throwError(() => ({ status: 0 })));
    component.signupForm.setValue({ nombre: 'Ana', apellidos: 'Torres', telefono: '987654321', correo: 'ana@upc.edu.pe', contrasena: 'Password1!', rol: 'PASAJERO', aceptaTerminos: true });
    component.submitRegistro();
    expect(component.showOtpModal).toBe(false);
    expect(component.registroError).toContain('conectar');
    expect(authService.isAuthenticated()).toBe(false);
    expect(component.isSubmitting).toBe(false);
  });

  it('keeps OTP open on network failure and never navigates', () => {
    const navigate = vi.spyOn(router, 'navigate');
    vi.spyOn(authService, 'verificarCodigo').mockReturnValue(throwError(() => ({ status: 0 })));
    component.signupForm.controls.correo.setValue('ana@upc.edu.pe');
    component.showOtpModal = true;
    component.otpDigits = ['6', '5', '4', '3', '2', '1'];
    component.verificarOtp();
    expect(component.showOtpModal).toBe(true);
    expect(component.otpError).toContain('conectar');
    expect(navigate).not.toHaveBeenCalled();
    expect(authService.getToken()).toBeNull();
  });

  it('displays validation errors and respects Retry-After on resend', () => {
    component.signupForm.controls.correo.setValue('ana@upc.edu.pe');
    vi.spyOn(authService, 'reenviarCodigo').mockReturnValue(throwError(() => ({ status: 429, headers: { get: () => '900' } })));
    component.reenviarCodigo();
    expect(component.resendCooldown).toBe(900);
    expect(component.resendSuccessMessage).toBe('');
    component.reenviarCodigo();
    expect(authService.reenviarCodigo).toHaveBeenCalledTimes(1);
  });

  it('suppresses simultaneous OTP submissions', () => {
    const pending = new Subject<AuthRespuesta>();
    vi.spyOn(authService, 'verificarCodigo').mockReturnValue(pending);
    component.signupForm.controls.correo.setValue('ana@upc.edu.pe');
    component.otpDigits = ['6', '5', '4', '3', '2', '1'];
    component.verificarOtp(); component.verificarOtp();
    expect(authService.verificarCodigo).toHaveBeenCalledTimes(1);
    pending.error({ status: 400, error: { mensaje: 'Código incorrecto' } });
    expect(component.isVerifying).toBe(false);
    expect(component.otpError).toBe('Código incorrecto');
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

  it('debe enviar registro vía AuthService y abrir modal OTP en éxito', () => {
    const mockAuthRespuesta: AuthRespuesta = {
      token: null,
      mensaje: 'Usuario registrado. Ingrese el código de 6 dígitos enviado a su correo.',
      usuario: {
        id: 10,
        correo: 'renzo@upc.edu.pe',
        nombre: 'Renzo',
        rol: 'CONDUCTOR',
        cuentaVerificada: false,
      },
    };

    const spy = vi.spyOn(authService, 'registro').mockReturnValue(of(mockAuthRespuesta));

    component.signupForm.setValue({
      nombre: 'Renzo',
      apellidos: 'Arbulu',
      telefono: '987654321',
      correo: 'renzo@upc.edu.pe',
      contrasena: 'Segura2026!',
      rol: 'CONDUCTOR',
      aceptaTerminos: true,
    });

    component.submitRegistro();

    expect(spy).toHaveBeenCalled();
    expect(component.showOtpModal).toBe(true);
    expect(component.registroError).toBe('');
  });

  it('debe capturar error si falla el registro', () => {
    vi.spyOn(authService, 'registro').mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { mensaje: 'El correo institucional ya se encuentra registrado' },
      }))
    );

    component.signupForm.setValue({
      nombre: 'Renzo',
      apellidos: 'Arbulu',
      telefono: '987654321',
      correo: 'renzo@upc.edu.pe',
      contrasena: 'Segura2026!',
      rol: 'CONDUCTOR',
      aceptaTerminos: true,
    });

    component.submitRegistro();

    expect(component.showOtpModal).toBe(false);
    expect(component.registroError).toContain('ya se encuentra registrado');
  });

  it('debe verificar código OTP y navegar a /auth/login en éxito', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockImplementation(async () => true);
    const mockAuthRespuesta: AuthRespuesta = {
      token: null,
      mensaje: 'Cuenta verificada exitosamente',
    };

    vi.spyOn(authService, 'verificarCodigo').mockReturnValue(of(mockAuthRespuesta));

    component.signupForm.patchValue({ correo: 'renzo@upc.edu.pe' });
    component.showOtpModal = true;
    component.otpDigits = ['1', '2', '3', '4', '5', '6'];

    component.verificarOtp();

    expect(authService.verificarCodigo).toHaveBeenCalledWith({
      correo: 'renzo@upc.edu.pe',
      codigo: '123456',
    });
    expect(component.showOtpModal).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login'], { queryParams: { verificado: 'true' } });
  });
});
