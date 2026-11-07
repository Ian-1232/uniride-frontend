import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PerfilComponent } from './perfil';
import { PERFIL_TEST } from '../../../testing/perfil-fixtures';
describe('PerfilComponent real HTTP', () => {
  let fixture: ComponentFixture<PerfilComponent>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PerfilComponent);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());
  it('starts loading without fabricated personal or academic values', () => {
    expect(fixture.componentInstance.loading()).toBe(true);
    expect(fixture.componentInstance.perfilForm.controls.carrera.value).toBe('');
    http.expectOne('/api/perfil').flush(PERFIL_TEST);
  });
  it('retains the existing suggestions and accepts actual server values outside them', () => {
    http.expectOne('/api/perfil').flush(PERFIL_TEST);
    expect(fixture.componentInstance.sedesUpc).toContain('UPC - Campus San Miguel');
    expect(fixture.componentInstance.perfilForm.controls.carrera.value).toBe('Carrera de prueba');
  });
  it('serializes selected day chips in the actual form payload', () => {
    http.expectOne('/api/perfil').flush(PERFIL_TEST);
    const c = fixture.componentInstance;
    c.toggleDia(c.diasSemana[0]);
    expect(c.perfilForm.controls.diasDisponibles.value).toBe('Miércoles');
    c.toggleDia(c.diasSemana[6]);
    expect(c.perfilForm.controls.diasDisponibles.value).toBe('Miércoles, Domingo');
  });
  it('treats the missing-profile 404 as empty and requires real academic values', () => {
    http
      .expectOne('/api/perfil')
      .flush(
        { mensaje: 'Aún no has completado tu perfil' },
        { status: 404, statusText: 'Not Found' },
      );
    expect(fixture.componentInstance.onboarding()).toBe(true);
    expect(fixture.componentInstance.perfilForm.invalid).toBe(true);
    fixture.componentInstance.guardar();
    http.expectNone((r) => r.method === 'PUT');
  });
});
