import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login';
import { AuthService } from '../../../core/services/auth.service';
import { AuthRespuesta } from '../../../core/models/auth.models';

describe('LoginComponent (US02 - Iniciar Sesión)', () => {
  let component: LoginComponent;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  }, 30000);

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('el formulario debe ser inválido al inicializarse con campos vacíos', () => {
    expect(component.loginForm.valid).toBe(false);
  });

  it('debe rechazar correos no institucionales (ej. @gmail.com)', () => {
    const correoControl = component.loginForm.controls.correo;
    correoControl.setValue('estudiante@gmail.com');
    expect(correoControl.valid).toBe(false);
    expect(correoControl.hasError('pattern')).toBe(true);
  });

  it('debe aceptar correos con dominio universitario @*.edu.pe', () => {
    const correoControl = component.loginForm.controls.correo;
    correoControl.setValue('u202323115@upc.edu.pe');
    expect(correoControl.valid).toBe(true);
  });

  it('debe alternar la visibilidad de la contraseña', () => {
    expect(component.hidePassword).toBe(true);
    component.togglePasswordVisibility();
    expect(component.hidePassword).toBe(false);
    component.togglePasswordVisibility();
    expect(component.hidePassword).toBe(true);
  });

  it('debe iniciar sesión y redirigir a dashboard de conductor si el rol es CONDUCTOR', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockImplementation(async () => true);
    const mockAuthRespuesta: AuthRespuesta = {
      token: 'mock-jwt-conductor',
      mensaje: 'Inicio de sesión exitoso',
      usuario: {
        id: 1,
        correo: 'conductor@upc.edu.pe',
        nombre: 'Carlos',
        rol: 'CONDUCTOR',
        cuentaVerificada: true,
      },
    };

    vi.spyOn(authService, 'login').mockReturnValue(of(mockAuthRespuesta));

    component.loginForm.setValue({
      correo: 'conductor@upc.edu.pe',
      contrasena: 'MoviUni2026!',
      recordarDispositivo: true,
    });

    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith({
      correo: 'conductor@upc.edu.pe',
      contrasena: 'MoviUni2026!',
      recordarDispositivo: true,
    });
    expect(navigateSpy).toHaveBeenCalledWith(['/conductor/dashboard']);
    expect(component.showErrorBanner).toBe(false);
  });

  it('debe activar banner de cuenta no verificada en error 409', () => {
    vi.spyOn(authService, 'login').mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { mensaje: 'Cuenta no verificada. Ingrese el código enviado por correo.' },
      }))
    );

    component.loginForm.setValue({
      correo: 'no.verificado@upc.edu.pe',
      contrasena: 'MoviUni2026!',
      recordarDispositivo: false,
    });

    component.onSubmit();

    expect(component.showUnverifiedBanner).toBe(true);
    expect(component.unverifiedMessage).toContain('Cuenta no verificada');
    expect(component.showErrorBanner).toBe(false);
  });

  it('debe activar banner de error en credenciales inválidas (401)', () => {
    vi.spyOn(authService, 'login').mockReturnValue(
      throwError(() => ({
        status: 401,
        error: { mensaje: 'Correo o contraseña incorrectos' },
      }))
    );

    component.loginForm.setValue({
      correo: 'alumno@upc.edu.pe',
      contrasena: 'ClaveIncorrecta1!',
      recordarDispositivo: false,
    });

    component.onSubmit();

    expect(component.showErrorBanner).toBe(true);
    expect(component.errorMessage).toContain('Correo o contraseña incorrectos');
  });
});
