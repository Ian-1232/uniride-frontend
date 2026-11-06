import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PasajeroDashboard } from './pasajero-dashboard';

describe('PasajeroDashboard', () => {
  let component: PasajeroDashboard;
  let fixture: ComponentFixture<PasajeroDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasajeroDashboard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PasajeroDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente de dashboard de pasajero', () => {
    expect(component).toBeTruthy();
  });

  it('debe mostrar los datos del viaje confirmado y el asiento asignado', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#trip-confirmed-title')?.textContent).toContain('Rodrigo Morales');
    expect(el.querySelector('.seat-assigned')?.textContent).toContain('#2 (Ventana Trasera)');
    expect(el.querySelector('.car-spec')?.textContent).toContain('B7X-412');
  });

  it('debe mostrar el dinero ahorrado acumulado', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.kpi-number.text-accent')?.textContent).toContain('S/ 380.00');
  });

  it('debe permitir solicitar un asiento en una ruta sugerida', () => {
    const ruta = component.rutasSugeridas()[0];
    const cuposIniciales = ruta.cupos;

    component.solicitarCupo(ruta);
    fixture.detectChanges();

    const rutaActualizada = component.rutasSugeridas().find((r) => r.id === ruta.id);
    expect(rutaActualizada?.cupos).toBe(cuposIniciales - 1);
    expect(component.feedbackMensaje()).toContain('Solicitud de cupo enviada a Andrea Paredes');
  });

  it('debe procesar la cancelación de la reserva con mensaje de confirmación', () => {
    component.cancelarViaje();
    fixture.detectChanges();

    expect(component.feedbackMensaje()).toContain('cancelación del viaje con Rodrigo Morales');
  });
});
