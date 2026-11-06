import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RutasService } from './rutas.service';
import {
  NUEVA_SALIDA,
  VIAJE_REPROGRAMADO,
} from '../../pages/conductor/viajes/reprogramar-viaje/reprogramar-viaje.testing';
describe('RutasService rescheduling REST contract', () => {
  let http: HttpTestingController;
  let service: RutasService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(RutasService);
  });
  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });
  it.each([false, true])(
    'PUTs only departure fields and confirmarImpacto=%s using the actual trip ID',
    (confirmar) => {
      const next = vi.fn();
      const payload = { ...NUEVA_SALIDA, origen: 'Never sent' };
      service.actualizarHorario(74, payload, confirmar).subscribe(next);
      const r = http.expectOne('/api/viajes/74?confirmarImpacto=' + confirmar);
      expect(r.request.method).toBe('PUT');
      expect(r.request.body).toEqual(NUEVA_SALIDA);
      expect(r.request.headers.has('Authorization')).toBe(false);
      r.flush(VIAJE_REPROGRAMADO);
      expect(next).toHaveBeenCalledWith(VIAJE_REPROGRAMADO);
    },
  );
  it('defaults impact to false, never silently confirms', () => {
    service.actualizarHorario(74, NUEVA_SALIDA).subscribe();
    http.expectOne('/api/viajes/74?confirmarImpacto=false').flush(VIAJE_REPROGRAMADO);
  });
  it.each([201, 204])('rejects unexpected status %s instead of claiming success', (status) => {
    const error = vi.fn();
    service.actualizarHorario(74, NUEVA_SALIDA).subscribe({ error });
    http
      .expectOne('/api/viajes/74?confirmarImpacto=false')
      .flush(status === 204 ? null : VIAJE_REPROGRAMADO, { status, statusText: 'Unexpected' });
    expect(error).toHaveBeenCalled();
  });
  it('rejects a response for another trip', () => {
    const error = vi.fn();
    service.actualizarHorario(74, NUEVA_SALIDA).subscribe({ error });
    http
      .expectOne('/api/viajes/74?confirmarImpacto=false')
      .flush({ ...VIAJE_REPROGRAMADO, id: 75 });
    expect(error).toHaveBeenCalled();
  });
  it('times out without automatically repeating the PUT', () => {
    vi.useFakeTimers();
    const error = vi.fn();
    service.actualizarHorario(74, NUEVA_SALIDA).subscribe({ error });
    const r = http.expectOne('/api/viajes/74?confirmarImpacto=false');
    vi.advanceTimersByTime(15001);
    expect(error).toHaveBeenCalled();
    expect(r.cancelled).toBe(true);
    http.expectNone((req) => req.method === 'PUT');
  });
});
