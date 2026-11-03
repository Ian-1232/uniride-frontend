import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './login';

describe('LoginComponent (US02 - Iniciar Sesión)', () => {
  let component: LoginComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
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

  it('debe activar y cerrar los banners de feedback (simulación de Figma)', () => {
    component.triggerDemoState('error');
    expect(component.showErrorBanner).toBe(true);
    expect(component.showUnverifiedBanner).toBe(false);

    component.dismissAlert('error');
    expect(component.showErrorBanner).toBe(false);

    component.triggerDemoState('unverified');
    expect(component.showUnverifiedBanner).toBe(true);
  });
});
