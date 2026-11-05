import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InfoAdicionalComponent } from './info-adicional';

describe('InfoAdicionalComponent (US05 - Completar Información Adicional)', () => {
  let component: InfoAdicionalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoAdicionalComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    const fixture = TestBed.createComponent(InfoAdicionalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }, 30000);

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe permitir añadir tags de música sugeridos al formulario sin duplicados', () => {
    component.infoForm.controls.gustos.setValue('');
    component.addMusicTag('Silencio / Estudio');
    expect(component.infoForm.controls.gustos.value).toBe('Silencio / Estudio');

    // Al volver a hacer click en el mismo tag no lo duplica
    component.addMusicTag('Silencio / Estudio');
    expect(component.infoForm.controls.gustos.value).toBe('Silencio / Estudio');

    component.addMusicTag('Podcasts');
    expect(component.infoForm.controls.gustos.value).toBe('Silencio / Estudio, Podcasts');
  });

  it('debe permitir añadir tags de hobbies sugeridos', () => {
    component.infoForm.controls.hobbies.setValue('');
    component.addHobbyTag('Programación');
    expect(component.infoForm.controls.hobbies.value).toBe('Programación');
  });
});
