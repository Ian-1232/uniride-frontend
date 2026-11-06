import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { AuthRespuesta, LoginRequest, RegistroRequest, VerificarCodigoRequest } from '../models/auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
    service.clearSession();
  });

  afterEach(() => {
    httpTesting.verify();
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

  it('debe iniciar sesión vía HTTP y actualizar la sesión con token y usuario', () => {
    const mockRequest: LoginRequest = {
      correo: 'juan.perez@upc.edu.pe',
      contrasena: 'MoviUni2026!',
    };

    const mockResponse: AuthRespuesta = {
      token: 'jwt-mock-token-xyz',
      mensaje: 'Inicio de sesión exitoso',
      usuario: {
        id: 1,
        correo: 'juan.perez@upc.edu.pe',
        nombre: 'Juan',
        apellidos: 'Pérez',
        telefono: '+51987654321',
        rol: 'CONDUCTOR',
        cuentaVerificada: true,
      },
    };

    service.login(mockRequest).subscribe((res) => {
      expect(res.token).toBe('jwt-mock-token-xyz');
      expect(service.getToken()).toBe('jwt-mock-token-xyz');
      expect(service.currentUser().nombre).toBe('Juan');
      expect(service.currentUser().iniciales).toBe('JP');
      expect(service.currentRole()).toBe('CONDUCTOR');
    });

    const req = httpTesting.expectOne((request) => request.url.endsWith('/auth/login'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      correo: 'juan.perez@upc.edu.pe',
      contrasena: 'MoviUni2026!',
    });
    req.flush(mockResponse);
  });

  it('debe registrar un usuario vía HTTP y persistir la sesión retornada', () => {
    const mockRegistro: RegistroRequest = {
      nombre: 'Lucia',
      apellidos: 'Torres',
      telefono: '987654321',
      correo: 'lucia.torres@upc.edu.pe',
      contrasena: 'MoviUni2026!',
      rol: 'PASAJERO',
      aceptaTerminos: true,
    };

    const mockResponse: AuthRespuesta = {
      token: 'jwt-registro-token',
      mensaje: 'Usuario registrado. Ingrese el código de 6 dígitos enviado a su correo.',
      usuario: {
        id: 2,
        correo: 'lucia.torres@upc.edu.pe',
        nombre: 'Lucia',
        apellidos: 'Torres',
        telefono: '+51987654321',
        rol: 'PASAJERO',
        cuentaVerificada: false,
      },
    };

    service.registro(mockRegistro).subscribe((res) => {
      expect(res.token).toBe('jwt-registro-token');
      expect(service.currentRole()).toBe('PASAJERO');
      expect(service.currentUser().iniciales).toBe('LT');
    });

    const req = httpTesting.expectOne((request) => request.url.endsWith('/auth/registro'));
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('debe verificar código OTP vía HTTP y actualizar el estado verificado', () => {
    const mockVerificar: VerificarCodigoRequest = {
      correo: 'lucia.torres@upc.edu.pe',
      codigo: '123456',
    };

    const mockResponse: AuthRespuesta = {
      token: 'jwt-verified-token',
      mensaje: 'Cuenta verificada exitosamente',
      usuario: {
        id: 2,
        correo: 'lucia.torres@upc.edu.pe',
        nombre: 'Lucia',
        apellidos: 'Torres',
        rol: 'PASAJERO',
        cuentaVerificada: true,
      },
    };

    service.verificarCodigo(mockVerificar).subscribe((res) => {
      expect(res.mensaje).toBe('Cuenta verificada exitosamente');
      expect(service.getToken()).toBe('jwt-verified-token');
    });

    const req = httpTesting.expectOne((request) => request.url.endsWith('/auth/verificar'));
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('debe reenviar código OTP vía HTTP', () => {
    const mockResponse: AuthRespuesta = {
      mensaje: 'Código reenviado con éxito',
    };

    service.reenviarCodigo('lucia.torres@upc.edu.pe').subscribe((res) => {
      expect(res.mensaje).toBe('Código reenviado con éxito');
    });

    const req = httpTesting.expectOne((request) => request.url.endsWith('/auth/reenviar-codigo'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ correo: 'lucia.torres@upc.edu.pe' });
    req.flush(mockResponse);
  });
});
