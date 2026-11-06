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

  it('enlaza la coordinación a la lista de viajes reales', () => {
    const enlace = (fixture.nativeElement as HTMLElement).querySelector('.requests-card a');
    expect(enlace?.getAttribute('href')).toBe('/conductor/viajes');
    expect(fixture.nativeElement.querySelector('.req-actions')).toBeNull();
  });
});
