import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Ruta } from '../../../../models/ruta.model';

// shortcut: datos hardcodeados del Figma M2.3; sustituir por RutasService.obtenerRuta cuando haya backend
const RUTA: Ruta = {
  id: 1,
  origen: 'San Borja',
  destino: 'UPC',
  capacidadMaxima: 3,
  puntosReferencia: 'Av. Arequipa 1234, Jr. Los Pinos',
  zonasSinParada: 'Centro de Lima',
  notaContribucion: 'S/ 10 sugeridos por pasajero',
  estado: 'ACTIVA',
};

@Component({
  selector: 'app-editar-ruta',
  templateUrl: './editar-ruta.html',
  styleUrl: './editar-ruta.css',
  imports: [RouterLink, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
})
export class EditarRuta {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly ruta = signal<Ruta>(RUTA);
  readonly guardando = signal(false);

  readonly form = this.fb.group({
    origen: new FormControl(RUTA.origen, { nonNullable: true, validators: [Validators.required] }),
    capacidad: new FormControl<number | null>(RUTA.capacidadMaxima, [Validators.required, Validators.min(1)]),
    puntos: new FormControl(RUTA.puntosReferencia, { nonNullable: true, validators: [Validators.required] }),
    zonas: new FormControl(RUTA.zonasSinParada ?? '', { nonNullable: true }),
    nota: new FormControl(RUTA.notaContribucion ?? '', { nonNullable: true }),
  });

  guardar(): void {
    if (this.form.invalid) {
      return;
    }
    // shortcut: sin backend, solo navega de vuelta; actualizarRuta real pendiente (US07)
    void this.router.navigate(['/conductor/rutas']);
  }
}
