import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { PerfilRespuesta } from '../core/models/perfil.models';
import { PerfilService } from '../core/services/perfil.service';
// Test-only profile for regression suites whose subject is a different integrated module.
export const PERFIL_TEST: PerfilRespuesta = {
  id: 71,
  nombre: 'Nombre de prueba',
  apellidos: 'Apellido de prueba',
  carrera: 'Carrera de prueba',
  distrito: 'Distrito de prueba',
  universidad: 'Campus de prueba',
  diasDisponibles: 'Lunes, Miércoles',
  horariosDisponibles: '07:00 - 09:00',
  fechaInicioClases: '2026-08-04',
  fechaFinClases: '2026-12-19',
  metodoCompensacionFavorito: 'GASOLINA',
  gustos: 'Música de prueba',
  hobbies: 'Lectura de prueba',
  datosCuriosos: 'Información de prueba',
  fechaActualizacion: '2026-11-06T10:00:00',
};
export function prepararPerfil(): void {
  TestBed.inject(PerfilService).obtener(true).subscribe();
  TestBed.inject(HttpTestingController).expectOne('/api/perfil').flush(PERFIL_TEST);
}
