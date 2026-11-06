import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InfoAdicionalComponent } from './info-adicional';
import { PERFIL_TEST } from '../../../testing/perfil-fixtures';
describe('InfoAdicionalComponent real HTTP', () => {
  let fixture: ComponentFixture<InfoAdicionalComponent>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InfoAdicionalComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(InfoAdicionalComponent);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());
  it('loads actual values and has no unsupported cabin properties', () => {
    http.expectOne('/api/perfil').flush(PERFIL_TEST);
    expect(fixture.componentInstance.infoForm.controls.gustos.value).toBe(PERFIL_TEST.gustos);
    expect(Object.keys(fixture.componentInstance.infoForm.controls)).toEqual([
      'gustos',
      'hobbies',
      'datosCuriosos',
    ]);
  });
  it('adds music suggestions without duplication', () => {
    http.expectOne('/api/perfil').flush(PERFIL_TEST);
    const c = fixture.componentInstance;
    c.infoForm.controls.gustos.setValue('');
    c.addMusicTag('Podcasts');
    c.addMusicTag('Podcasts');
    expect(c.infoForm.controls.gustos.value).toBe('Podcasts');
  });
  it('adds hobby suggestions to editable text', () => {
    http.expectOne('/api/perfil').flush(PERFIL_TEST);
    const c = fixture.componentInstance;
    c.infoForm.controls.hobbies.setValue('');
    c.addHobbyTag('Lectura');
    expect(c.infoForm.controls.hobbies.value).toBe('Lectura');
  });
});
