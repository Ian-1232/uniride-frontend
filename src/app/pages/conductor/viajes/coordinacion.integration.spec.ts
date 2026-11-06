import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { routes } from '../../../app.routes';
import { AuthService } from '../../../core/services/auth.service';
import { RutasService } from '../../../core/services/rutas.service';
import { CoordinacionService } from '../../../core/services/coordinacion.service';
import { jwtInterceptor } from '../../../core/interceptors/jwt.interceptor';
import { prepararPerfil } from '../../../testing/perfil-fixtures';
import { Ruta } from '../../../core/models/ruta.model';
import { SolicitudRecibida, ViajeRespuesta } from '../../../core/models/coordinacion.models';
import { solicitudFixture } from '../../pasajero/viajes/viajes.testing';
import { Solicitudes } from './solicitudes/solicitudes';
import { DetalleSolicitud } from './detalle-solicitud/detalle-solicitud';
import { GestionarViaje } from './gestionar-viaje/gestionar-viaje';

const AHORA = Date.parse('2026-11-06T15:00:00Z');
const RUTA: Ruta = {
  id: 9,
  origen: 'Surco real',
  destino: 'Campus real',
  puntosReferencia: 'Puerta 2',
  capacidadMaxima: 3,
  estado: 'ACTIVA',
  notaContribucion: 'Coordinar el aporte',
};
const VIAJE: ViajeRespuesta = {
  id: 74,
  rutaId: 9,
  fecha: '2026-11-08',
  hora: '10:00:00',
  dia: 'Domingo',
  confirmado: false,
  fechaConfirmacion: null,
  estado: 'PROGRAMADO',
  pasajeros: 2,
  mensaje: null,
};
const SOLICITUD: SolicitudRecibida = {
  ...solicitudFixture,
  id: 308,
  viajeId: 74,
  fecha: VIAJE.fecha,
  hora: VIAJE.hora,
  origen: RUTA.origen,
  destino: RUTA.destino,
  pasajeroNombre: 'Ana Torres',
  pasajeroCarrera: 'Derecho',
  pasajeroDistrito: 'Surco',
  preferenciaCompensacion: 'GASOLINA',
};
const pagina = <T>(content: T[], total = content.length, number = 0, size = 100) => ({
  content,
  totalElements: total,
  totalPages: Math.ceil(total / size),
  number,
  size,
});

describe('Módulo 4 con el backend original', () => {
  let http: HttpTestingController;
  let token: string;

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(AHORA);
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    autenticar('CONDUCTOR');
  });

  afterEach(() => {
    try {
      http.expectNone('/api/viajes');
      http.expectNone((req) => req.url.endsWith('/coordinacion'));
      http.verify();
    } finally {
      TestBed.inject(MatDialog).closeAll();
      TestBed.inject(AuthService).clearSession();
      localStorage.clear();
      sessionStorage.clear();
      vi.restoreAllMocks();
    }
  });

  function autenticar(rol: 'CONDUCTOR' | 'PASAJERO') {
    token =
      'eyJhbGciOiJIUzI1NiJ9.' + btoa(JSON.stringify({ exp: AHORA / 1000 + 3600 })) + '.signature';
    TestBed.inject(AuthService)
      .login({ correo: 'integracion@upc.edu.pe', contrasena: 'Password1!' })
      .subscribe();
    http.expectOne('/api/auth/login').flush({
      token,
      usuario: {
        id: 7,
        nombre: 'Ana',
        apellidos: 'Torres',
        correo: 'integracion@upc.edu.pe',
        rol,
        cuentaVerificada: true,
      },
    });
    prepararPerfil();
  }

  function crear<T>(tipo: Type<T>, inputs: Record<string, string> = { viajeId: '74' }) {
    const f = TestBed.createComponent(tipo);
    for (const [key, value] of Object.entries(inputs)) f.componentRef.setInput(key, value);
    f.detectChanges();
    return f;
  }

  function cargarViaje(viaje = VIAJE) {
    const rutas = http.expectOne('/api/rutas?page=0&size=100');
    expect(rutas.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    rutas.flush(pagina([RUTA]));
    http.expectOne('/api/rutas/9/viajes?page=0&size=100').flush(pagina([viaje]));
  }

  function cargar(viaje = VIAJE, solicitudes = [SOLICITUD]) {
    cargarViaje(viaje);
    http
      .expectOne(
        (req) => req.url === '/api/viajes/74/solicitudes' && req.params.get('size') === '10',
      )
      .flush(pagina(solicitudes, solicitudes.length, 0, 10));
  }

  function boton(raiz: HTMLElement, texto: string): HTMLButtonElement {
    const el = Array.from(raiz.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    );
    expect(el, texto).toBeTruthy();
    return el!;
  }
  function pulsar<T>(f: ComponentFixture<T>, texto: string, dialogo = false) {
    f.detectChanges();
    boton(
      dialogo ? f.nativeElement.querySelector('[role="dialog"]') : f.nativeElement,
      texto,
    ).click();
    f.detectChanges();
  }

  it('acepta el último cupo con JWT y vuelve a consultar el contador real', () => {
    const f = crear(Solicitudes);
    cargar();
    f.detectChanges();
    pulsar(f, 'Aceptar');
    pulsar(f, 'Aceptar solicitud', true);
    const put = http.expectOne('/api/solicitudes/308/aceptar');
    expect(put.request.method).toBe('PUT');
    expect(put.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(boton(f.nativeElement.querySelector('[role="dialog"]'), 'Guardando…').disabled).toBe(
      true,
    );
    put.flush({ ...SOLICITUD, estado: 'ACEPTADA', acuerdoEstado: 'BORRADOR' });
    cargar({ ...VIAJE, pasajeros: 3 }, [
      { ...SOLICITUD, estado: 'ACEPTADA' },
      { ...SOLICITUD, id: 309 },
    ]);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.trip-summary').textContent).toContain('0 de 3');
    expect(boton(f.nativeElement, 'Aceptar').disabled).toBe(true);
    expect(f.nativeElement.querySelector('[data-request="308"] .status').textContent).toContain(
      'ACEPTADA',
    );
  });

  it('rechaza varias solicitudes enviando sus IDs y el motivo al endpoint existente', () => {
    const f = crear(Solicitudes);
    cargar(VIAJE, [SOLICITUD, { ...SOLICITUD, id: 399 }]);
    f.detectChanges();
    for (const input of f.nativeElement.querySelectorAll('input[type="checkbox"]')) input.click();
    pulsar(f, 'Rechazar selección');
    const motivo = f.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    motivo.value = '  No pasaré por ese punto  ';
    motivo.dispatchEvent(new Event('input'));
    pulsar(f, 'Rechazar selección', true);
    const put = http.expectOne('/api/solicitudes/rechazar-multiples');
    expect(put.request.body).toEqual({ ids: [308, 399], motivo: 'No pasaré por ese punto' });
    put.flush([]);
    cargar(VIAJE, [
      { ...SOLICITUD, estado: 'RECHAZADA', motivoRechazo: 'No pasaré por ese punto' },
    ]);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Motivo: No pasaré por ese punto');
  });

  it('conserva el motivo y no cambia el estado si falla el rechazo', () => {
    const f = crear(Solicitudes);
    cargar();
    pulsar(f, 'Rechazar');
    const motivo = f.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    motivo.value = 'No puedo';
    motivo.dispatchEvent(new Event('input'));
    pulsar(f, 'Rechazar selección', true);
    http.expectOne('/api/solicitudes/308/rechazar').flush({}, { status: 500, statusText: 'Error' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('textarea').value).toBe('No puedo');
    expect(f.nativeElement.querySelector('[role="dialog"] [role="alert"]')).toBeTruthy();
    expect(f.nativeElement.querySelector('[data-request="308"] .status').textContent).toContain(
      'PENDIENTE',
    );
  });

  it('limita el motivo a los 255 caracteres de la columna existente', () => {
    const f = crear(Solicitudes);
    cargar();
    pulsar(f, 'Rechazar');
    const motivo = f.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    motivo.value = 'x'.repeat(256);
    motivo.dispatchEvent(new Event('input'));
    f.detectChanges();
    expect(
      boton(f.nativeElement.querySelector('[role="dialog"]'), 'Rechazar selección').disabled,
    ).toBe(true);
    http.expectNone('/api/solicitudes/308/rechazar');
  });

  it('compone el detalle de perfil con la preferencia y el acuerdo del listado original', () => {
    const f = crear(DetalleSolicitud, { viajeId: '74', solicitudId: '308' });
    cargarViaje();
    http.expectOne('/api/solicitudes/recibidas/308/detalle').flush({
      solicitudId: 308,
      rutaId: 9,
      viajeId: 74,
      estado: 'ACEPTADA',
      mensajeSolicitud: SOLICITUD.mensaje,
      mensaje: null,
      pasajero: {
        nombre: 'Ana',
        apellidos: 'Torres',
        universidad: 'Universidad real',
        carrera: 'Derecho',
      },
    });
    http
      .expectOne('/api/viajes/74/solicitudes?page=0&size=100')
      .flush(pagina([{ ...SOLICITUD, id: 300 }], 101));
    http
      .expectOne('/api/viajes/74/solicitudes?page=1&size=100')
      .flush(
        pagina(
          [
            {
              ...SOLICITUD,
              estado: 'ACEPTADA',
              acuerdoTerminos: 'Borrador real de gasolina',
              acuerdoEstado: 'BORRADOR',
            },
          ],
          101,
          1,
        ),
      );
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Universidad real');
    expect(f.nativeElement.textContent).toContain('GASOLINA');
    expect(f.nativeElement.textContent).toContain('Borrador real de gasolina');
  });

  it('filtra y pagina en el servidor limpiando la selección anterior', () => {
    const f = crear(Solicitudes);
    cargar();
    f.componentInstance.seleccionar(308, true);
    f.componentInstance.filtrar('RECHAZADA');
    cargarViaje();
    const req = http.expectOne((r) => r.url === '/api/viajes/74/solicitudes');
    expect(req.request.params.get('estado')).toBe('RECHAZADA');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(pagina([], 0, 0, 10));
    f.detectChanges();
    expect(f.componentInstance.seleccion().size).toBe(0);
    expect(f.nativeElement.textContent).toContain('No hay solicitudes para este filtro');
  });

  it('recupera rutas y viajes que están después de la primera página', () => {
    let encontrado: number | undefined;
    TestBed.inject(CoordinacionService)
      .viaje(74)
      .subscribe((datos) => (encontrado = datos.viaje.id));
    http.expectOne('/api/rutas?page=0&size=100').flush(pagina([{ ...RUTA, id: 8 }], 101));
    http.expectOne('/api/rutas?page=1&size=100').flush(pagina([RUTA], 101, 1));
    http.expectOne('/api/rutas/8/viajes?page=0&size=100').flush(pagina([]));
    http
      .expectOne('/api/rutas/9/viajes?page=0&size=100')
      .flush(pagina([{ ...VIAJE, id: 70 }], 101));
    http.expectOne('/api/rutas/9/viajes?page=1&size=100').flush(pagina([VIAJE], 101, 1));
    expect(encontrado).toBe(74);
  });

  it('obtener una ruta también recorre las páginas del contrato existente', () => {
    let encontrado: number | undefined;
    TestBed.inject(RutasService)
      .obtener(9)
      .subscribe((ruta) => (encontrado = ruta.id));
    http.expectOne('/api/rutas?page=0&size=100').flush(pagina([{ ...RUTA, id: 8 }], 101));
    http.expectOne('/api/rutas?page=1&size=100').flush(pagina([RUTA], 101, 1));
    expect(encontrado).toBe(9);
  });

  it('confirma con PUT y consulta nuevamente el estado guardado', () => {
    const f = crear(GestionarViaje);
    cargar();
    pulsar(f, 'Confirmar viaje');
    pulsar(f, 'Confirmar viaje', true);
    const put = http.expectOne('/api/viajes/74/confirmar');
    expect(put.request.method).toBe('PUT');
    put.flush({ ...VIAJE, confirmado: true });
    cargar({ ...VIAJE, confirmado: true });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Tu viaje está confirmado');
  });

  it('muestra VENCIDO y conserva el mensaje cuando confirmar devuelve 409', () => {
    const f = crear(GestionarViaje);
    cargar({ ...VIAJE, fecha: '2026-11-06', hora: '21:00:00' });
    pulsar(f, 'Confirmar viaje');
    pulsar(f, 'Confirmar viaje', true);
    const vencido = {
      ...VIAJE,
      estado: 'VENCIDO' as const,
      mensaje: 'El plazo de confirmación de 12 horas venció',
    };
    http
      .expectOne('/api/viajes/74/confirmar')
      .flush(vencido, { status: 409, statusText: 'Conflict' });
    cargar(vencido);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.route-card').textContent).toContain('VENCIDO');
    expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      '12 horas venció',
    );
    expect(f.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('inicia y completa usando los estados que devuelve el backend', () => {
    const f = crear(GestionarViaje);
    const salida = { ...VIAJE, fecha: '2026-11-06', hora: '10:00:00', confirmado: true };
    cargar(salida);
    pulsar(f, 'Iniciar viaje');
    const iniciado = { ...salida, estado: 'EN_PROGRESO' as const };
    http.expectOne('/api/viajes/74/iniciar').flush(iniciado);
    cargar(iniciado);
    pulsar(f, 'Completar viaje');
    const completado = { ...iniciado, estado: 'COMPLETADO' as const };
    http.expectOne('/api/viajes/74/completar').flush(completado);
    cargar(completado);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.route-card').textContent).toContain('COMPLETADO');
  });

  it.each([
    [25, 'Sin penalidad'],
    [24, 'Penalidad leve'],
    [4, 'Penalidad leve'],
    [3, 'Penalidad grave'],
  ])('muestra la estimación a %s horas y cancela con el resultado real', (horas, etiqueta) => {
    const local = new Date(AHORA + Number(horas) * 3600000 - 5 * 3600000).toISOString();
    const salida = { ...VIAJE, fecha: local.slice(0, 10), hora: local.slice(11, 19) };
    const f = crear(GestionarViaje);
    cargar(salida);
    pulsar(f, 'Cancelar viaje');
    expect(f.nativeElement.querySelector('[role="dialog"]').textContent).toContain(etiqueta);
    pulsar(f, 'Sí, cancelar viaje', true);
    const cancelado = {
      ...salida,
      estado: 'CANCELADO' as const,
      pasajeros: 0,
      mensaje: 'Cancelación registrada',
    };
    http.expectOne('/api/viajes/74/cancelar').flush(cancelado);
    cargar(cancelado, []);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.route-card').textContent).toContain('CANCELADO');
    expect(f.nativeElement.textContent).toContain('Cancelación registrada');
  });

  it('abre URLs directas con IDs reales e ignora estados de demostración', async () => {
    const h = await RouterTestingHarness.create(
      '/conductor/viajes/74?estado=completado&confirmado=true&horas=1',
    );
    cargar();
    h.detectChanges();
    expect(h.routeNativeElement?.querySelector('.route-card')?.textContent).toContain('PROGRAMADO');
    expect(h.routeNativeElement?.textContent).toContain('Sin confirmar');
    const enlace = Array.from(h.routeNativeElement!.querySelectorAll('a')).find(
      (a) => a.textContent?.trim() === 'Ver solicitudes',
    );
    expect(enlace?.getAttribute('href')).toBe('/conductor/viajes/74/solicitudes');
  });

  it('rechaza IDs inválidos antes de consultar la API', () => {
    const f = crear(Solicitudes, { viajeId: 'incorrecto' });
    expect(f.nativeElement.textContent).toContain('El identificador del viaje no es válido');
  });

  it('permite al pasajero aceptado cancelar todo el viaje con su JWT', async () => {
    autenticar('PASAJERO');
    const h = await RouterTestingHarness.create('/pasajero/viajes/74');
    http
      .expectOne((r) => r.url === '/api/solicitudes/resumen')
      .flush({
        solicitudes: pagina([{ ...SOLICITUD, estado: 'ACEPTADA' }]),
        mensaje: null,
      });
    h.detectChanges();
    boton(h.routeNativeElement!, 'Cancelar viaje completo').click();
    await h.fixture.whenStable();
    const dialogo = document.querySelector('mat-dialog-container') as HTMLElement;
    expect(dialogo.textContent).toContain('todos los pasajeros');
    boton(dialogo, 'Sí, cancelar viaje completo').click();
    const put = http.expectOne('/api/viajes/74/cancelar');
    expect(put.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    put.flush({
      ...VIAJE,
      estado: 'CANCELADO',
      pasajeros: 0,
      mensaje: 'Viaje cancelado sin penalidad',
    });
    await h.fixture.whenStable();
    http
      .expectOne((r) => r.url === '/api/solicitudes/resumen')
      .flush({
        solicitudes: pagina([{ ...SOLICITUD, estado: 'CANCELADA' }]),
        mensaje: null,
      });
    h.detectChanges();
    expect(h.routeNativeElement?.textContent).toContain('Viaje cancelado sin penalidad');
    expect(h.routeNativeElement?.textContent).toContain('Cancelada');
    http.expectNone((r) => r.url.startsWith('/api/rutas'));
    http.expectNone('/api/solicitudes/308/cancelar');
  });

  it('conserva el diálogo y muestra el conflicto si el viaje del pasajero ya inició', async () => {
    autenticar('PASAJERO');
    const h = await RouterTestingHarness.create('/pasajero/viajes/74');
    http
      .expectOne((r) => r.url === '/api/solicitudes/resumen')
      .flush({
        solicitudes: pagina([{ ...SOLICITUD, estado: 'ACEPTADA' }]),
        mensaje: null,
      });
    h.detectChanges();
    boton(h.routeNativeElement!, 'Cancelar viaje completo').click();
    await h.fixture.whenStable();
    const dialogo = document.querySelector('mat-dialog-container') as HTMLElement;
    boton(dialogo, 'Sí, cancelar viaje completo').click();
    http
      .expectOne('/api/viajes/74/cancelar')
      .flush(
        { mensaje: 'El viaje no puede cancelarse; estado actual: EN_PROGRESO' },
        { status: 409, statusText: 'Conflict' },
      );
    await h.fixture.whenStable();
    expect(dialogo.querySelector('[role="alert"]')?.textContent).toContain('EN_PROGRESO');
    expect(boton(dialogo, 'Actualizar datos')).toBeTruthy();
    expect(h.routeNativeElement?.textContent).not.toContain('Viaje cancelado sin penalidad');
  });
});
