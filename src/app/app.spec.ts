import { prepararPerfil } from './testing/perfil-fixtures';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './core/services/auth.service';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';

// Pruebas de la aplicación conservadas de develop.
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('debe crear el componente principal', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the application shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('main#main-content.app-root-content')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should provide a skip link to the main content', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const skipLink = compiled.querySelector<HTMLAnchorElement>('a.skip-link');

    expect(skipLink).toBeTruthy();
    expect(skipLink?.getAttribute('href')).toBe('#main-content');
    expect(skipLink?.textContent).toContain('Saltar al contenido principal');
  });
});

// Regresión de navegación de los módulos existentes.
describe('Coordinación de viajes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    localStorage.clear();
    sessionStorage.clear();
    authenticate('CONDUCTOR');
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
    sessionStorage.clear();
  });
  // Vacía las consultas pendientes de reportes y del módulo 2 (mis viajes agrega
  // sus rutas al listado propio).
  function flushPendientes() {
    const http = TestBed.inject(HttpTestingController);
    for (const req of http.match(
      (r) =>
        r.url.startsWith('/api/estadisticas') ||
        r.url === '/api/metodos-compensacion' ||
        r.url.endsWith('/sugerencia-contribucion') ||
        [
          '/api/viajes/buscar/resumen',
          '/api/solicitudes/resumen',
          '/api/solicitudes/historial',
        ].includes(r.url),
    )) {
      if (req.request.url === '/api/viajes/buscar/resumen')
        req.flush({
          viajes: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 },
          mensaje: null,
          sugerencia: null,
        });
      else if (req.request.url.startsWith('/api/solicitudes/'))
        req.flush({
          solicitudes: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 },
          mensaje: null,
        });
      else if (req.request.url.endsWith('/sugerencia-contribucion'))
        req.flush(
          {
            mensaje:
              'El viaje aún no tiene pasajeros aceptados; indica la cantidad de pasajeros para calcular la sugerencia',
          },
          { status: 400, statusText: 'Bad Request' },
        );
      else if (req.request.url === '/api/metodos-compensacion') req.flush([]);
      else if (req.request.url.endsWith('/semana'))
        req.flush({
          suficientesDatos: false,
          mensaje: 'Sin viajes',
          viajesPorDia: [],
          canceladosPorMi: 0,
          canceladosPorTerceros: 0,
        });
      else if (req.request.url.endsWith('/rutas'))
        req.flush({ suficientesDatos: false, mensaje: 'Sin rutas', ranking: [] });
      else
        req.flush({
          viajesComoConductor: 0,
          viajesComoPasajero: 0,
          viajesCancelados: 0,
          penalidadesAcumuladas: 0,
        });
    }
    for (const req of http.match((r) => r.url.startsWith('/api/rutas'))) {
      req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0 });
    }
  }
  function authenticate(rol: 'CONDUCTOR' | 'PASAJERO') {
    const auth = TestBed.inject(AuthService);
    auth.login({ correo: 'test@upc.edu.pe', contrasena: 'TestPassword1!' }).subscribe();
    const token =
      'eyJhbGciOiJIUzI1NiJ9.' +
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) +
      '.signature';
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/login')
      .flush({
        token,
        mensaje: 'OK',
        usuario: {
          id: 1,
          correo: 'test@upc.edu.pe',
          nombre: 'Test',
          apellidos: 'User',
          rol,
          cuentaVerificada: true,
        },
      });
    prepararPerfil();
  }

  it('muestra el sidebar estándar de conductor en reportes y compensaciones', async () => {
    const h = await RouterTestingHarness.create();

    await h.navigateByUrl('/reportes/resumen');
    flushPendientes();
    expect(h.routeNativeElement?.querySelector('.sidebar')).toBeTruthy();
    expect(h.routeNativeElement?.querySelector('.panel-label')?.textContent).toBe(
      'Panel del conductor',
    );
    expect(h.routeNativeElement?.querySelector('.reportes-tabs')).toBeTruthy();

    await h.navigateByUrl('/compensaciones/metodos');
    flushPendientes();
    expect(h.routeNativeElement?.querySelector('.sidebar')).toBeTruthy();
    expect(h.routeNativeElement?.querySelector('.panel-label')?.textContent).toBe(
      'Panel del conductor',
    );
  }, 30000);

  it('conserva las rutas integradas de los otros módulos', async () => {
    const h = await RouterTestingHarness.create();
    for (const path of [
      '/reportes/resumen',
      '/reportes/frecuencia',
      '/reportes/rutas',
      '/compensaciones/metodos',
      '/compensaciones/metodos/nuevo',
      '/contribucion/sugerencia/1',
      '/pasajero/viajes/mis-viajes',
      '/pasajero/viajes/buscar',
      '/pasajero/viajes/1',
      '/conductor/viajes',
    ]) {
      authenticate(
        path.startsWith('/pasajero') || path.startsWith('/contribucion') ? 'PASAJERO' : 'CONDUCTOR',
      );
      await h.navigateByUrl(path);
      flushPendientes();
      expect(h.routeNativeElement?.querySelector('h1'), path).toBeTruthy();
    }
  }, 30000);
});
