import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { RoleType } from '../../core/models/auth.models';
import { DashboardMetricas } from './dashboard-metricas/dashboard-metricas';
import { DashboardFrecuencia } from './dashboard-frecuencia/dashboard-frecuencia';
import { DashboardMetodos } from './dashboard-metodos/dashboard-metodos';
import { ESTADISTICAS_DASHBOARD, SEMANA_DASHBOARD } from '../../testing/dashboard-fixtures';

@Component({
  imports: [DashboardMetricas, DashboardFrecuencia, DashboardMetodos],
  template:
    '<app-dashboard-metricas [rol]="rol()" /><app-dashboard-frecuencia /><app-dashboard-metodos />',
})
class Widgets {
  readonly rol = signal<RoleType>('CONDUCTOR');
}
describe('Shared dashboard resources', () => {
  let fixture: ComponentFixture<Widgets>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Widgets],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Widgets);
    fixture.detectChanges();
  });
  afterEach(() => {
    http.verify();
    fixture.destroy();
  });
  const urls = {
    resumen: '/api/estadisticas',
    semana: '/api/estadisticas/semana',
    metodos: '/api/metodos-compensacion',
  };
  function defaults(except?: keyof typeof urls) {
    if (except !== 'resumen') http.expectOne(urls.resumen).flush(ESTADISTICAS_DASHBOARD);
    if (except !== 'semana') http.expectOne(urls.semana).flush(SEMANA_DASHBOARD);
    if (except !== 'metodos') http.expectOne(urls.metodos).flush([]);
    fixture.detectChanges();
  }
  function text() {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
  function metricas() {
    return fixture.debugElement.query(By.directive(DashboardMetricas))
      .componentInstance as DashboardMetricas;
  }
  function frecuencia() {
    return fixture.debugElement.query(By.directive(DashboardFrecuencia))
      .componentInstance as DashboardFrecuencia;
  }
  function metodos() {
    return fixture.debugElement.query(By.directive(DashboardMetodos))
      .componentInstance as DashboardMetodos;
  }
  it.each(['CONDUCTOR', 'PASAJERO'] as const)(
    'uses real metrics for %s and keeps cancelations separate from penalties',
    (rol) => {
      fixture.componentInstance.rol.set(rol);
      defaults();
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('[data-testid="completados"]').textContent.trim(),
      ).toBe(rol === 'CONDUCTOR' ? '17' : '8');
      expect(
        fixture.nativeElement.querySelector('[data-testid="cancelados"]').textContent.trim(),
      ).toBe('3');
      expect(
        fixture.nativeElement.querySelector('[data-testid="penalidades"]').textContent.trim(),
      ).toBe('2');
    },
  );
  it('renders real zero counters without substitution', () => {
    defaults('resumen');
    http.expectOne(urls.resumen).flush({
      viajesComoConductor: 0,
      viajesComoPasajero: 0,
      viajesCancelados: 0,
      penalidadesAcumuladas: 0,
    });
    fixture.detectChanges();
    expect(
      [...fixture.nativeElement.querySelectorAll('.kpi-number')].map((e: HTMLElement) =>
        e.textContent!.trim(),
      ),
    ).toEqual(['0', '0', '0']);
  });
  it('rejects malformed counters instead of rendering NaN or negative invented statistics', () => {
    defaults('resumen');
    http.expectOne(urls.resumen).flush({ ...ESTADISTICAS_DASHBOARD, viajesComoConductor: -1 });
    fixture.detectChanges();
    expect(text()).toContain('No se pudo cargar tu actividad');
    expect(fixture.nativeElement.querySelector('.kpi-number')).toBeNull();
    metricas().consulta.retry();
    http.expectOne(urls.resumen).flush(ESTADISTICAS_DASHBOARD);
  });
  it.each([0, 400, 401, 403, 500])(
    'handles statistics error %i independently and retries with HTTP',
    (status) => {
      defaults('resumen');
      const r = http.expectOne(urls.resumen);
      if (!status) r.error(new ProgressEvent('error'));
      else r.flush({ mensaje: 'SQL secret' }, { status, statusText: 'Failure' });
      fixture.detectChanges();
      expect(text()).not.toContain('SQL secret');
      expect(text()).toContain('No se pudo cargar tu actividad');
      expect(fixture.nativeElement.querySelectorAll('.weekly-chart li').length).toBe(7);
      metricas().consulta.retry();
      metricas().consulta.retry();
      http.expectOne(urls.resumen).flush(ESTADISTICAS_DASHBOARD);
    },
  );
  it('never plots a fictitious graph when the backend declares insufficient data', () => {
    defaults('semana');
    http
      .expectOne(urls.semana)
      .flush({ ...SEMANA_DASHBOARD, suficientesDatos: false, mensaje: 'Faltan viajes de prueba' });
    fixture.detectChanges();
    expect(text()).toContain('Faltan viajes de prueba');
    expect(fixture.nativeElement.querySelector('.weekly-chart')).toBeNull();
    expect(text()).toContain('Cancelados por ti: 2 · Por terceros: 1');
  });
  it.each([
    { viajesPorDia: [] },
    { viajesPorDia: SEMANA_DASHBOARD.viajesPorDia.map((d) => ({ ...d, cantidad: 0 })) },
  ])('handles sufficient-but-empty frequency safely', ({ viajesPorDia }) => {
    defaults('semana');
    http.expectOne(urls.semana).flush({ ...SEMANA_DASHBOARD, viajesPorDia });
    fixture.detectChanges();
    expect(text()).toContain('No hay viajes registrados');
    expect(fixture.nativeElement.querySelector('.weekly-chart')).toBeNull();
    expect(text()).not.toContain('NaN');
  });
  it('uses all seven returned days with dynamic scale, exact counts and normalized labels', () => {
    defaults();
    expect(frecuencia().maximo()).toBe(7);
    expect(frecuencia().total()).toBe(22);
    expect(text()).toContain('Miércoles');
    expect(text()).toContain('Sábado');
    expect(
      (fixture.nativeElement.querySelectorAll('.bar-fill')[1] as HTMLElement).style.width,
    ).toBe('100%');
    frecuencia().consulta.retry();
    http.expectOne(urls.semana).flush({
      ...SEMANA_DASHBOARD,
      viajesPorDia: SEMANA_DASHBOARD.viajesPorDia.map((d) => ({ ...d, cantidad: 2 })),
    });
    fixture.detectChanges();
    expect(frecuencia().maximo()).toBe(2);
    expect(frecuencia().total()).toBe(14);
    expect(fixture.nativeElement.querySelectorAll('.weekly-chart li').length).toBe(7);
  });
  it.each([0, 403, 500])(
    'retries frequency error %i without reloading other resources',
    (status) => {
      defaults('semana');
      const r = http.expectOne(urls.semana);
      if (!status) r.error(new ProgressEvent('error'));
      else r.flush({}, { status, statusText: 'Failure' });
      fixture.detectChanges();
      expect(text()).toContain('No se pudo cargar la frecuencia');
      expect(fixture.nativeElement.querySelector('.kpi-number')).toBeTruthy();
      frecuencia().consulta.retry();
      http.expectOne(urls.semana).flush(SEMANA_DASHBOARD);
    },
  );
  it('shows configured active/inactive methods as configuration, without a payment distribution', () => {
    defaults('metodos');
    http.expectOne(urls.metodos).flush([
      { id: 41, tipo: 'DINERO', descripcion: 'Transferencia de prueba', activo: true },
      { id: 42, tipo: 'FAVOR', descripcion: 'Favor de prueba', activo: false },
    ]);
    fixture.detectChanges();
    expect(text()).toContain('Transferencia de prueba');
    expect(text()).toContain('Inactivo');
    expect(fixture.nativeElement.querySelector('.donut-svg')).toBeNull();
    expect(text()).not.toContain('Yape');
  });
  it('shows an empty methods panel with a functional configuration link', () => {
    defaults();
    expect(text()).toContain('Todavía no tienes métodos registrados');
    expect(fixture.nativeElement.querySelector('a[href="/compensaciones"]')).toBeTruthy();
  });
  it.each([0, 403, 500])('handles method error %i with a scoped retry', (status) => {
    defaults('metodos');
    const r = http.expectOne(urls.metodos);
    if (!status) r.error(new ProgressEvent('error'));
    else r.flush({ mensaje: 'SQL secret' }, { status, statusText: 'Failure' });
    fixture.detectChanges();
    expect(text()).toContain('No se pudieron cargar los métodos');
    expect(text()).not.toContain('SQL secret');
    metodos().consulta.retry();
    http.expectOne(urls.metodos).flush([]);
  });
  it('cancels every independent HTTP resource on destruction', () => {
    const reads = [
      http.expectOne(urls.resumen),
      http.expectOne(urls.semana),
      http.expectOne(urls.metodos),
    ];
    fixture.destroy();
    expect(reads.every((r) => r.cancelled)).toBe(true);
  });
});
