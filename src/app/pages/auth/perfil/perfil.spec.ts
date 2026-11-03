import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PerfilComponent } from './perfil';

describe('PerfilComponent (US04 - Completar Perfil Académico)', () => {
  let component: PerfilComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    const fixture = TestBed.createComponent(PerfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }, 30000);

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe tener las listas de sedes UPC, carreras y distritos de Lima', () => {
    expect(component.sedesUpc.length).toBeGreaterThan(0);
    expect(component.sedesUpc).toContain('UPC - Campus San Miguel');
    expect(component.sedesUpc).toContain('UPC - Campus Monterrico (Surco)');
    expect(component.carreras).toContain('Ingeniería de Software');
  });

  it('debe permitir seleccionar y deseleccionar chips de días de semana', () => {
    const diaLunes = component.diasSemana.find(d => d.label === 'Lun');
    expect(diaLunes).toBeDefined();
    const estadoInicial = diaLunes!.selected;

    component.toggleDia(diaLunes!);
    expect(diaLunes!.selected).toBe(!estadoInicial);
  });

  it('el formulario debe ser válido con la información académica por defecto', () => {
    expect(component.perfilForm.valid).toBe(true);
  });
});
