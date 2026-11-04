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
import { RutasService, mensajeError } from '../../../../services/rutas.service';

@Component({
  selector: 'app-generar-viaje',
  templateUrl: './generar-viaje.html',
  styleUrl: './generar-viaje.css',
  imports: [RouterLink, ReactiveFormsModule, MatButtonModule, MatCardModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-PE' }],
})
export class GenerarViaje {
  private readonly fb = inject(FormBuilder);
  private readonly rutasService = inject(RutasService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly rutaId = Number(this.route.snapshot.paramMap.get('id'));
  readonly hoy = new Date();
  readonly ruta = signal<Ruta | null>(null);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

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

  constructor() {
    if (!Number.isFinite(this.rutaId)) {
      this.error.set('No se indicó la ruta para la que deseas generar el viaje.');
      return;
    }

    const rutaNavegada = history.state?.ruta as Ruta | undefined;
    if (rutaNavegada && rutaNavegada.id === this.rutaId) {
      this.ruta.set(rutaNavegada);
    } else {
      this.rutasService.obtenerRuta(this.rutaId).subscribe({
        next: (ruta) => this.ruta.set(ruta),
        error: (error: unknown) => this.error.set(mensajeError(error)),
      });
    }
  }

  enviar(): void {
    if (this.form.invalid || this.guardando() || !Number.isFinite(this.rutaId)) {
      return;
    }

    const { fecha, hora } = this.form.getRawValue();
    if (!fecha) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    this.rutasService
      .crearViaje(this.rutaId, { fecha: this.formatearFecha(fecha), hora })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          void this.router.navigate(['/conductor/rutas', this.rutaId, 'viajes']);
        },
        error: (error: unknown) => {
          this.guardando.set(false);
          this.error.set(mensajeError(error));
        },
      });
  }

  private formatearFecha(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
