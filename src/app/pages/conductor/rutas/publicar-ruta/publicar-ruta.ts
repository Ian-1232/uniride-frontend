import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RutasService, mensajeError } from '../../../../services/rutas.service';

@Component({
  selector: 'app-publicar-ruta',
  templateUrl: './publicar-ruta.html',
  styleUrl: './publicar-ruta.css',
  imports: [RouterLink, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
})
export class PublicarRuta {
  private readonly fb = inject(FormBuilder);
  private readonly rutasService = inject(RutasService);
  private readonly router = inject(Router);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    origen: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    capacidad: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    puntos: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    zonas: new FormControl('', { nonNullable: true }),
    nota: new FormControl('', { nonNullable: true }),
  });

  enviar(): void {
    if (this.form.invalid || this.guardando()) {
      return;
    }

    const valores = this.form.getRawValue();
    this.guardando.set(true);
    this.error.set(null);

    this.rutasService
      .crearRuta({
        origen: valores.origen.trim(),
        capacidadMaxima: valores.capacidad ?? 0,
        puntosReferencia: valores.puntos.trim(),
        ...(valores.zonas.trim() ? { zonasSinParada: valores.zonas.trim() } : {}),
        ...(valores.nota.trim() ? { notaContribucion: valores.nota.trim() } : {}),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          void this.router.navigate(['/conductor/rutas']);
        },
        error: (error: unknown) => {
          this.guardando.set(false);
          this.error.set(mensajeError(error));
        },
      });
  }
}
