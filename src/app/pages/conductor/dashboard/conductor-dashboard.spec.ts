import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConductorDashboard } from './conductor-dashboard';

describe('ConductorDashboard', () => {
  let component: ConductorDashboard;
  let fixture: ComponentFixture<ConductorDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConductorDashboard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ConductorDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente de dashboard de conductor', () => {
    expect(component).toBeTruthy();
  });

  it('debe mostrar la información del próximo viaje y vehículo', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.trip-title')?.textContent).toContain('San Borja');
    expect(el.querySelector('.car-spec')?.textContent).toContain('ABC-123');
  });

  it('debe calcular correctamente los cupos ocupados y libres', () => {
    expect(component.cuposOcupados()).toBe(3);
    expect(component.cuposLibres()).toBe(1);
    expect(component.tieneCupoLibre()).toBe(true);
  });

  it('debe aceptar una solicitud y ocupar el cupo restante', () => {
    const solicitud = component.solicitudes()[0];
    component.aceptarSolicitud(solicitud);
    fixture.detectChanges();

    expect(component.cuposOcupados()).toBe(4);
    expect(component.tieneCupoLibre()).toBe(false);
    expect(component.pasajerosConfirmados()).toContain('Mateo Valdivia');
    expect(component.feedbackMensaje()).toContain('aceptada');
  });

  it('debe rechazar una solicitud y mantener el cupo', () => {
    const solicitud = component.solicitudes()[0];
    component.rechazarSolicitud(solicitud);
    fixture.detectChanges();

    expect(component.solicitudes().some((s) => s.id === solicitud.id)).toBe(false);
    expect(component.cuposOcupados()).toBe(3);
  });
});
