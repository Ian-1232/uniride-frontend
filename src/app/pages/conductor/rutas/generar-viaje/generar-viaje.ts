import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { authError } from '../../../../core/services/auth-error';
import { consultaQuery } from '../../../../core/services/consulta';
import { RutasService } from '../../../../core/services/rutas.service';

@Component({
  selector: 'app-generar-viaje',
  templateUrl: './generar-viaje.html',
  styleUrl: './generar-viaje.css',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-PE' }],
})
export class GenerarViaje {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(RutasService);

  readonly rutaId = Number(this.route.snapshot.paramMap.get('id'));
  readonly hoy = new Date();
  readonly consulta = consultaQuery(() => this.service.obtener(this.rutaId));
  readonly ruta = computed(() => this.consulta.state().data);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    fecha: new FormControl<Date | null>(null, [Validators.required]),
    hora: new FormControl('07:30', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)],
    }),
  });

  enviar(): void {
    if (this.form.invalid || this.guardando()) {
      return;
    }
    const { fecha, hora } = this.form.getRawValue();
    this.guardando.set(true);
    this.error.set(null);
    this.service
      .crearViaje(this.rutaId, { fecha: this.formatoFecha(fecha!), hora: hora })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/conductor/rutas', this.rutaId, 'viajes']),
        error: (err) => this.error.set(authError(err, 'No se pudo generar el viaje.')),
      });
  }

  /** LocalDate del backend en la zona horaria local, no en UTC. */
  private formatoFecha(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}
