import { prepararPerfil } from '../../../testing/perfil-fixtures';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../../../app.routes';
import { jwtInterceptor } from '../../../core/interceptors/jwt.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { EditarRuta } from './editar-ruta/editar-ruta';
import { GenerarViaje } from './generar-viaje/generar-viaje';
import { MisRutas } from './mis-rutas/mis-rutas';
import { PublicarRuta } from './publicar-ruta/publicar-ruta';
import { ViajesRuta } from './viajes-ruta/viajes-ruta';
import { MisViajes } from '../viajes/mis-viajes/mis-viajes';

// Fixtures belong exclusively to tests. All traffic is intercepted by HttpTestingController.
const RUTA = {
  id: 5,
  origen: 'San Borja',
  destino: 'UPC',
  capacidadMaxima: 3,
  puntosReferencia: 'Av. Arequipa 1234',
  zonasSinParada: 'Centro de Lima',
  notaContribucion: 'S/ 10 sugeridos por pasajero',
  estado: 'ACTIVA',
};
const RUTAS_PAGE = {
  content: [RUTA, { ...RUTA, id: 6, origen: 'Surco' }],
  totalElements: 2,
  totalPages: 1,
  number: 0,
};
const VIAJES_PAGE = {
  content: [
    {
      id: 11,
      rutaId: 5,
      fecha: '2026-11-20',
      hora: '07:30:00',
      dia: 'Viernes',
      confirmado: false,
      fechaConfirmacion: null,
      estado: 'PROGRAMADO',
      pasajeros: 2,
      mensaje: null,
    },
    {
      id: 12,
      rutaId: 5,
      fecha: '2026-11-18',
      hora: '07:30:00',
      dia: 'Miércoles',
      confirmado: true,
      fechaConfirmacion: null,
      estado: 'COMPLETADO',
      pasajeros: 3,
      mensaje: null,
    },
    {
      id: 13,
      rutaId: 5,
      fecha: '2026-11-19',
      hora: '07:30:00',
      dia: 'Jueves',
      confirmado: true,
      fechaConfirmacion: null,
      estado: 'EN_PROGRESO',
      pasajeros: 1,
      mensaje: null,
    },
  ],
  totalElements: 3,
  totalPages: 1,
  number: 0,
};

describe('Módulo 2 HTTP integration', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let token: string;
  let confirmarDialogo: boolean;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    confirmarDialogo = true;
    TestBed.configureTestingModule({
      imports: [MisRutas, PublicarRuta, EditarRuta, GenerarViaje, ViajesRuta, MisViajes],
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        provideNativeDateAdapter(),
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(confirmarDialogo) }) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    authenticate();
  });

  afterEach(() => {
    http.verify();
    auth.clearSession();
    localStorage.clear();
    sessionStorage.clear();
  });

  function authenticate() {
    token =
      'eyJhbGciOiJIUzI1NiJ9.' +
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) +
      '.signature';
    auth.login({ correo: 'rutas@upc.edu.pe', contrasena: 'TestPassword1!' }).subscribe();
    http.expectOne('/api/auth/login').flush({
      token,
      mensaje: 'OK',
      usuario: {
        id: 5,
        correo: 'rutas@upc.edu.pe',
        nombre: 'Test',
        apellidos: 'User',
        rol: 'CONDUCTOR',
        cuentaVerificada: true,
      },
    });
    prepararPerfil();
  }

  function expectListadoRutas() {
    const req = http.expectOne('/api/rutas?page=0&size=100');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    return req;
  }

  function create<T>(component: Type<T>): ComponentFixture<T> {
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    return fixture;
  }

  function texto(fixture: ComponentFixture<unknown>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  // El harness expone el componente del outlet raíz (el layout); el componente de
  // la ruta vive debajo.
  function instancia<T>(h: RouterTestingHarness, tipo: Type<T>): T {
    const debug = h.routeDebugElement!.query((nodo) => nodo.componentInstance instanceof tipo);
    expect(debug, `No se encontró ${tipo.name}`).toBeTruthy();
    return debug!.componentInstance as T;
  }

  function botonDe(raiz: Element, etiqueta: string): HTMLButtonElement {
    const boton = Array.from(raiz.querySelectorAll<HTMLButtonElement>('button')).find((elemento) =>
      (elemento.textContent ?? '').includes(etiqueta),
    );
    expect(boton, `No se encontró «${etiqueta}»`).toBeTruthy();
    return boton!;
  }

  async function pulsar(h: RouterTestingHarness, etiqueta: string, selector = ''): Promise<void> {
    const raiz = selector ? h.routeNativeElement!.querySelector(selector)! : h.routeNativeElement!;
    botonDe(raiz, etiqueta).click();
    await h.fixture.whenStable();
    h.detectChanges();
  }

  it('mis rutas carga el listado propio y pagina en pantalla', async () => {
    const h = await RouterTestingHarness.create('/conductor/rutas');
    expectListadoRutas().flush(RUTAS_PAGE);
    await h.fixture.whenStable();
    h.detectChanges();

    expect(h.routeNativeElement?.textContent).toContain('San Borja → UPC');
    expect(h.routeNativeElement?.textContent).toContain('Surco → UPC');
    expect(h.routeNativeElement?.querySelectorAll('mat-card.route-head, .route-head').length).toBe(
      2,
    );
  });

  it('mis rutas muestra el estado vacío del backend sin datos de demostración', () => {
    const fixture = create(MisRutas);
    expect(texto(fixture)).toContain('Cargando tus rutas');
    expectListadoRutas().flush({ content: [], totalElements: 0, totalPages: 0, number: 0 });
    fixture.detectChanges();

    expect(texto(fixture)).toContain('Aún no tienes rutas publicadas');
    expect(fixture.nativeElement.querySelector('mat-card')).toBeNull();
  });

  it('mis rutas informa el error y permite reintentar', () => {
    const fixture = create(MisRutas);
    expectListadoRutas().flush('caído', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(texto(fixture)).toContain('El servicio no está disponible temporalmente');

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expectListadoRutas().flush(RUTAS_PAGE);
    fixture.detectChanges();
    expect(texto(fixture)).toContain('San Borja → UPC');
  });

  it('eliminar ruta confirma en el diálogo y envía DELETE confirmado', () => {
    const fixture = create(MisRutas);
    expectListadoRutas().flush(RUTAS_PAGE);
    fixture.detectChanges();

    botonDe(fixture.nativeElement as Element, 'Eliminar').click();
    fixture.detectChanges();

    const req = http.expectOne('/api/rutas/5?confirmar=true');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expectListadoRutas().flush(RUTAS_PAGE);
    fixture.detectChanges();
    expect(texto(fixture)).toContain('San Borja → UPC');
  });

  it('eliminar ruta cancelado en el diálogo no realiza ninguna petición', () => {
    confirmarDialogo = false;
    const fixture = create(MisRutas);
    expectListadoRutas().flush(RUTAS_PAGE);
    fixture.detectChanges();

    botonDe(fixture.nativeElement as Element, 'Eliminar').click();
    fixture.detectChanges();

    expect(http.match(() => true).length).toBe(0);
  });

  it('eliminar ruta muestra el mensaje de conflicto del backend', () => {
    const fixture = create(MisRutas);
    expectListadoRutas().flush(RUTAS_PAGE);
    fixture.detectChanges();

    botonDe(fixture.nativeElement as Element, 'Eliminar').click();
    fixture.detectChanges();

    http
      .expectOne('/api/rutas/5?confirmar=true')
      .flush(
        { mensaje: 'Quedan salidas a menos de 4 horas' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();
    expect(texto(fixture)).toContain('Quedan salidas a menos de 4 horas');
  });

  it('publicar ruta envía el cuerpo mapeado y vuelve al listado', async () => {
    const h = await RouterTestingHarness.create('/conductor/rutas/publicar');
    const form = instancia(h, PublicarRuta).form;
    form.patchValue({
      origen: 'Chosica',
      capacidad: 4,
      puntos: 'Av. Próceres 100',
      zonas: '',
      nota: 'S/ 12',
    });
    h.detectChanges();

    await pulsar(h, 'Publicar ruta');
    const req = http.expectOne('/api/rutas');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      origen: 'Chosica',
      capacidadMaxima: 4,
      puntosReferencia: 'Av. Próceres 100',
      notaContribucion: 'S/ 12',
    });
    req.flush({ ...RUTA, id: 7, origen: 'Chosica' }, { status: 201, statusText: 'Created' });

    await h.fixture.whenStable();
    expectListadoRutas().flush(RUTAS_PAGE);
    await h.fixture.whenStable();
    expect(h.routeNativeElement?.textContent).toContain('Mis rutas');
  });

  it('editar ruta carga por el listado y envía PUT con los cambios', async () => {
    const h = await RouterTestingHarness.create('/conductor/rutas/editar/5');
    expectListadoRutas().flush(RUTAS_PAGE);
    await h.fixture.whenStable();
    h.detectChanges();

    const componente = instancia(h, EditarRuta);
    expect(componente.form.value.origen).toBe('San Borja');

    componente.form.patchValue({ origen: 'Santa Anita', capacidad: 5 });
    h.detectChanges();
    await pulsar(h, 'Guardar cambios');

    const req = http.expectOne('/api/rutas/5?confirmarImpacto=false');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      origen: 'Santa Anita',
      capacidadMaxima: 5,
      puntosReferencia: 'Av. Arequipa 1234',
      zonasSinParada: 'Centro de Lima',
      notaContribucion: 'S/ 10 sugeridos por pasajero',
    });
    req.flush({ ...RUTA, origen: 'Santa Anita', capacidadMaxima: 5 });

    await h.fixture.whenStable();
    expectListadoRutas().flush(RUTAS_PAGE);
    await h.fixture.whenStable();
    expect(h.routeNativeElement?.textContent).toContain('Mis rutas');
  });

  it('editar ruta confirma el impacto y reintenta con confirmarImpacto=true', async () => {
    const h = await RouterTestingHarness.create('/conductor/rutas/editar/5');
    expectListadoRutas().flush(RUTAS_PAGE);
    await h.fixture.whenStable();
    h.detectChanges();

    const componente = instancia(h, EditarRuta);
    componente.form.patchValue({ origen: 'Santa Anita' });
    h.detectChanges();
    await pulsar(h, 'Guardar cambios');

    http.expectOne('/api/rutas/5?confirmarImpacto=false').flush(
      {
        mensaje:
          'ADVERTENCIA: la edición de la ruta afecta a 1 pasajero(s) aceptado(s). Confirma usando ?confirmarImpacto=true.',
      },
      { status: 409, statusText: 'Conflict' },
    );

    const confirmacion = http.expectOne('/api/rutas/5?confirmarImpacto=true');
    expect(confirmacion.request.method).toBe('PUT');
    confirmacion.flush({ ...RUTA, origen: 'Santa Anita' });

    await h.fixture.whenStable();
    expectListadoRutas().flush(RUTAS_PAGE);
    await h.fixture.whenStable();
    expect(h.routeNativeElement?.textContent).toContain('Mis rutas');
  });

  it('generar viaje envía fecha local y hora al endpoint de la ruta', async () => {
    const h = await RouterTestingHarness.create('/conductor/viajes/5/generar');
    expectListadoRutas().flush(RUTAS_PAGE);
    await h.fixture.whenStable();
    h.detectChanges();

    const componente = instancia(h, GenerarViaje);
    componente.form.patchValue({ fecha: new Date(2026, 10, 20), hora: '07:30' });
    h.detectChanges();
    await pulsar(h, 'Generar viaje');

    const req = http.expectOne('/api/rutas/5/viajes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ fecha: '2026-11-20', hora: '07:30' });
    req.flush(
      {
        id: 21,
        rutaId: 5,
        fecha: '2026-11-20',
        hora: '07:30:00',
        dia: 'Viernes',
        confirmado: false,
        fechaConfirmacion: null,
        estado: 'PROGRAMADO',
        pasajeros: 0,
        mensaje: null,
      },
      { status: 201, statusText: 'Created' },
    );

    await h.fixture.whenStable();
    expectListadoRutas().flush(RUTAS_PAGE);
    http
      .expectOne('/api/rutas/5/viajes?page=0&size=100')
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0 });
    await h.fixture.whenStable();
    h.detectChanges();
    expect(h.routeNativeElement?.textContent).toContain('Viajes de la ruta');
  });

  it('viajes de la ruta consulta la ruta y sus viajes y calcula el resumen', async () => {
    const h = await RouterTestingHarness.create('/conductor/rutas/5/viajes');
    expectListadoRutas().flush(RUTAS_PAGE);
    const viajes = http.expectOne('/api/rutas/5/viajes?page=0&size=100');
    expect(viajes.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    viajes.flush(VIAJES_PAGE);
    await h.fixture.whenStable();
    h.detectChanges();

    expect(h.routeNativeElement?.textContent).toContain('San Borja → UPC');
    expect(h.routeNativeElement?.querySelectorAll('tr[mat-row]').length).toBe(3);
    const resumen = h.routeNativeElement!.querySelectorAll('.stat-value');
    expect([...resumen].map((valor) => valor.textContent?.trim())).toEqual(['1', '1', '1']);
    expect(h.routeNativeElement?.textContent).toContain('2 / 3');
    expect(h.routeNativeElement!.querySelector('tr[mat-row] a')?.getAttribute('href')).toBe(
      '/conductor/viajes/11/solicitudes',
    );
  });

  it('mis viajes agrega los viajes de todas las rutas propias', async () => {
    const h = await RouterTestingHarness.create('/conductor/viajes');
    expectListadoRutas().flush(RUTAS_PAGE);

    const primera = http.expectOne('/api/rutas/5/viajes?page=0&size=100');
    const segunda = http.expectOne('/api/rutas/6/viajes?page=0&size=100');
    primera.flush(VIAJES_PAGE);
    segunda.flush({ ...VIAJES_PAGE, content: [], totalElements: 0, totalPages: 0, number: 0 });
    await h.fixture.whenStable();
    h.detectChanges();

    expect(h.routeNativeElement?.querySelectorAll('tr[mat-row]').length).toBe(3);
    expect(h.routeNativeElement?.textContent).toContain('3 viajes en tus rutas');
    expect(h.routeNativeElement?.textContent).toContain('1 ruta con viajes');
    const enlaces = Array.from(
      h.routeNativeElement!.querySelectorAll('tr[mat-row]')[0].querySelectorAll('a'),
    );
    expect(enlaces.map((enlace) => enlace.getAttribute('href'))).toEqual([
      '/conductor/viajes/11',
      '/conductor/viajes/11/solicitudes',
    ]);
    const resumen = h.routeNativeElement!.querySelectorAll('.stat-value');
    expect([...resumen].map((valor) => valor.textContent?.trim())).toEqual(['1', '1', '1']);
  });

  it('mis viajes no consulta viajes cuando el conductor no tiene rutas', async () => {
    const h = await RouterTestingHarness.create('/conductor/viajes');
    expectListadoRutas().flush({ content: [], totalElements: 0, totalPages: 0, number: 0 });
    await h.fixture.whenStable();
    h.detectChanges();

    expect(h.routeNativeElement?.textContent).toContain('0 viajes en tus rutas');
    expect(h.routeNativeElement?.textContent).toContain('Todavía no tienes viajes');
  });
});
