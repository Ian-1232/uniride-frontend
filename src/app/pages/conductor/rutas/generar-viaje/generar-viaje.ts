import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Ruta } from '../../../../models/ruta.model';

// shortcut: datos hardcodeados del Figma M2.5; sustituir por RutasService cuando haya backend
const RUTA: Ruta = {
  id: 1,
  origen: 'San Borja',
  destino: 'UPC',
  capacidadMaxima: 3,
  puntosReferencia: 'Av. Arequipa 1234',
  zonasSinParada: 'Centro de Lima',
  notaContribucion: 'S/ 10 sugeridos por pasajero',
  estado: 'ACTIVA',
};

@Component({
  selector: 'app-generar-viaje',
  templateUrl: './generar-viaje.html',
  styleUrl: './generar-viaje.css',
  imports: [RouterLink, ReactiveFormsModule, MatButtonModule, MatCardModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-PE' }],
})
export class GenerarViaje {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly rutaId = Number(this.route.snapshot.paramMap.get('id'));
  readonly hoy = new Date();
  readonly ruta = signal<Ruta>(RUTA);
  readonly guardando = signal(false);

  readonly form = this.fb.group({
    fecha: new FormControl<Date | null>(null, [Validators.required]),
    hora: new FormControl('07:30', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
      ],
    }),
  });

  enviar(): void {
    if (this.form.invalid) {
      return;
    }
    // shortcut: sin backend, solo navega; crearViaje real pendiente (US06/POST rutas/{id}/viajes)
    void this.router.navigate(['/conductor/viajes', this.rutaId]);
  }
}
