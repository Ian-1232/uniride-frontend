import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AgenteService } from './agente.service';

describe('AgenteService', () => {
  let service: AgenteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AgenteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('inicia una conversación enviando solo message', () => {
    service.chat('Hola!!').subscribe();
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ message: 'Hola!!' });
    req.flush({
      message: 'Hola',
      conversationId: 'conv-1',
      advertencia: null,
      operacion: null,
      resolucionConfirmacion: null,
    });
  });

  it('continúa el hilo con el conversationId recibido', () => {
    service.chat('Cámbialo al lunes a las 3', 'conv-1').subscribe();
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body).toEqual({
      message: 'Cámbialo al lunes a las 3',
      conversationId: 'conv-1',
    });
    req.flush({
      message: 'Preparé el cambio',
      conversationId: 'conv-1',
      advertencia: null,
      operacion: null,
      resolucionConfirmacion: null,
    });
  });

  it('consulta el estado de una confirmación por su id', () => {
    service.confirmacion('conf-1').subscribe();
    const req = http.expectOne('/api/agent/confirmaciones/conf-1');
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 'conf-1',
      tipo: 'EDITAR_RUTA',
      estado: 'PENDIENTE',
      resumen: 'Actualizar la ruta',
      parametros: {},
      expira: '2026-11-22T23:59:00Z',
      resultado: null,
    });
  });
});
