import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
    service.clearSession();
  });

  it('debe crearse correctamente con valores por defecto', () => {
    expect(service).toBeTruthy();
    expect(service.currentUser().nombre).toBe('Juan Pérez');
    expect(service.currentRole()).toBe('CONDUCTOR');
    expect(service.panelLabel()).toBe('Panel del conductor');
    expect(service.isConductor()).toBe(true);
    expect(service.isPasajero()).toBe(false);
  });

  it('debe cambiar de rol reactivamente a PASAJERO', () => {
    service.setRole('PASAJERO');
    expect(service.currentRole()).toBe('PASAJERO');
    expect(service.panelLabel()).toBe('Panel del pasajero');
    expect(service.isConductor()).toBe(false);
    expect(service.isPasajero()).toBe(true);
  });

  it('debe actualizar la sesión con nuevo nombre y calcular iniciales', () => {
    service.setSession({ nombre: 'Rodrigo', apellidos: 'Morales', rol: 'CONDUCTOR' }, 'token123');
    expect(service.currentUser().nombre).toBe('Rodrigo');
    expect(service.currentUser().iniciales).toBe('RM');
    expect(service.getToken()).toBe('token123');
  });
});
