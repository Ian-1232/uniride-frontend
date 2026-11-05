import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';

async function pulsar(
  harness: RouterTestingHarness,
  texto: string,
  selector = '',
) {
  const raiz = selector
    ? harness.routeNativeElement!.querySelector(selector)!
    : harness.routeNativeElement!;

  const boton = Array.from(
    raiz.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>('button, a'),
  ).find((elemento) => elemento.textContent?.trim() === texto);

  expect(boton, `No se encontró «${texto}»`).toBeTruthy();

  boton!.click();
  await harness.fixture.whenStable();
  harness.detectChanges();
}

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

    expect(
      compiled.querySelector('main#main-content.app-root-content'),
    ).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should provide a skip link to the main content', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const skipLink =
      compiled.querySelector<HTMLAnchorElement>('a.skip-link');

    expect(skipLink).toBeTruthy();
    expect(skipLink?.getAttribute('href')).toBe('#main-content');
    expect(skipLink?.textContent).toContain('Saltar al contenido principal');
  });
});

// Pruebas del módulo 4.
describe('Coordinación de viajes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
      ],
    });
  });

  it('conserva las rutas integradas de los otros módulos', async () => {
    const h = await RouterTestingHarness.create();
    for (const path of [
      '/reportes/resumen',
      '/reportes/frecuencia',
      '/reportes/rutas',
      '/compensaciones/metodos',
      '/compensaciones/metodos/nuevo',
      '/contribucion/sugerencia/1',
    ]) {
      await h.navigateByUrl(path);
      expect(h.routeNativeElement?.querySelector('h1'), path).toBeTruthy();
    }
  }, 15000);

  it('navega y carga correctamente las rutas de autenticación y home', async () => {
    const h = await RouterTestingHarness.create();
    for (const path of [
      '/home',
      '/login',
      '/registro',
      '/auth/login',
      '/auth/registro',
      '/auth/perfil',
      '/auth/info-adicional',
    ]) {
      await h.navigateByUrl(path);
      expect(h.routeNativeElement?.querySelector('h1'), path).toBeTruthy();
    }
  }, 15000);

  it('abre las solicitudes y permite consultar cada perfil', async () => {
    const h = await RouterTestingHarness.create(
      '/conductor/viajes/1/solicitudes',
    );

    expect(
      h.routeNativeElement?.querySelector('h1')?.textContent,
    ).toBe('Solicitudes recibidas');

    expect(
      h.routeNativeElement?.querySelectorAll('.request-card').length,
    ).toBe(3);

    await pulsar(h, 'Ver detalle', '[data-request="valeria"]');

    expect(h.routeNativeElement?.textContent).toContain('Valeria Rojas');
    expect(h.routeNativeElement?.textContent).toContain('Gasolina');

    await pulsar(h, 'Volver a solicitudes');

    expect(
      h.routeNativeElement?.querySelectorAll('.request-card').length,
    ).toBe(3);
  }, 15000);

  it('reserva el último cupo y conserva el pasajero al gestionar el viaje', async () => {
    const h = await RouterTestingHarness.create(
      '/conductor/viajes/1/solicitudes',
    );

    await pulsar(h, 'Aceptar', '[data-request="maria"]');
    await pulsar(h, 'Aceptar solicitud', '[role="dialog"]');

    expect(
      h.routeNativeElement?.querySelector('.trip-summary')?.textContent,
    ).toContain('0 de 3');

    expect(
      h.routeNativeElement?.querySelector(
        '[data-request="maria"] .status',
      )?.textContent,
    ).toBe('Aceptada');

    const boton = Array.from(
      h.routeNativeElement!.querySelectorAll<HTMLButtonElement>(
        '[data-request="diego"] button',
      ),
    ).find((elemento) => elemento.textContent?.trim() === 'Aceptar');

    expect(boton?.disabled).toBe(true);

    await pulsar(h, 'Gestionar viaje');

    expect(
      h.routeNativeElement?.querySelectorAll('.passenger-row').length,
    ).toBe(3);

    expect(h.routeNativeElement?.textContent).toContain('María Torres');
  });

  it('rechaza varias solicitudes sin consumir cupos', async () => {
    const h = await RouterTestingHarness.create(
      '/conductor/viajes/1/solicitudes',
    );

    for (const id of ['maria', 'diego']) {
      h.routeNativeElement!
        .querySelector<HTMLInputElement>(
          `[data-request="${id}"] input[type="checkbox"]`,
        )!
        .click();
    }

    await h.fixture.whenStable();
    h.detectChanges();

    await pulsar(h, 'Rechazar selección');
    await pulsar(h, 'Rechazar selección', '[role="dialog"]');

    expect(
      h.routeNativeElement?.querySelector(
        '[data-request="maria"] .status',
      )?.textContent,
    ).toBe('Rechazada');

    expect(
      h.routeNativeElement?.querySelector(
        '[data-request="diego"] .status',
      )?.textContent,
    ).toBe('Rechazada');

    expect(
      h.routeNativeElement?.querySelector('.trip-summary')?.textContent,
    ).toContain('1 de 3');
  });

  it('confirma a las 12 horas y recorre inicio y finalización', async () => {
    const h = await RouterTestingHarness.create(
      '/conductor/viajes/1?horas=12',
    );

    await pulsar(h, 'Confirmar viaje');
    await pulsar(h, 'Confirmar viaje', '[role="dialog"]');

    expect(h.routeNativeElement?.textContent).toContain(
      'Tu viaje está confirmado',
    );

    await pulsar(h, 'Iniciar viaje');

    expect(
      h.routeNativeElement?.querySelector('.route-card')?.textContent,
    ).toContain('EN PROGRESO');

    await pulsar(h, 'Completar viaje');

    expect(
      h.routeNativeElement?.querySelector('.route-card')?.textContent,
    ).toContain('COMPLETADO');
  });

  it('impide confirmar fuera del plazo mínimo', async () => {
    const h = await RouterTestingHarness.create(
      '/conductor/viajes/1?horas=11',
    );

    await pulsar(h, 'Confirmar viaje');

    expect(
      h.routeNativeElement?.querySelector('[role="dialog"]')?.textContent,
    ).toContain('Plazo de confirmación vencido');

    await pulsar(h, 'Entendido', '[role="dialog"]');

    expect(
      h.routeNativeElement?.querySelector('.route-card')?.textContent,
    ).toContain('VENCIDO');

    expect(
      h.routeNativeElement?.querySelector('button')?.textContent,
    ).not.toBe('Iniciar viaje');
  });

  it.each([
    [25, 'Sin penalidad'],
    [24, 'Penalidad leve'],
    [4, 'Penalidad leve'],
    [3, 'Penalidad grave'],
  ])(
    'muestra la penalidad correcta a %s horas',
    async (horas, penalidad) => {
      const h = await RouterTestingHarness.create(
        `/pasajero/viajes/1?horas=${horas}`,
      );

      await pulsar(h, 'Cancelar viaje');

      expect(
        h.routeNativeElement?.querySelector(
          '[role="dialog"] .notice strong',
        )?.textContent,
      ).toBe(penalidad);

      await pulsar(h, 'Sí, cancelar viaje', '[role="dialog"]');

      expect(
        h.routeNativeElement?.querySelector('.route-card')?.textContent,
      ).toContain('CANCELADO');
    },
  );
});
