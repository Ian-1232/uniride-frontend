import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Ruta } from '../../../../models/ruta.model';
import { RutasService, mensajeError } from '../../../../services/rutas.service';

@Component({
  selector: 'app-editar-ruta',
  templateUrl: './editar-ruta.html',
  styleUrl: './editar-ruta.css',
  imports: [RouterLink, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
})
export class EditarRuta {
  private readonly fb = inject(FormBuilder);
  private readonly rutasService = inject(RutasService);
  private readonly router = inject(Router);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  readonly ruta = signal<Ruta | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    origen: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    capacidad: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    puntos: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    zonas: new FormControl('', { nonNullable: true }),
    nota: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    const rutaNavegada = history.state?.ruta as Ruta | undefined;

    if (rutaNavegada && rutaNavegada.id === this.id) {
      this.aplicar(rutaNavegada);
    } else if (!Number.isFinite(this.id)) {
      this.error.set('No se indicó la ruta que deseas editar.');
      this.cargando.set(false);
    } else {
      this.cargar();
    }
  }

  cargar(): void {
    this.rutasService.obtenerRuta(this.id).subscribe({
      next: (ruta) => this.aplicar(ruta),
      error: (error: unknown) => {
        this.error.set(mensajeError(error));
        this.cargando.set(false);
      },
    });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      return;
    }

    const valores = this.form.getRawValue();
    this.guardando.set(true);
    this.error.set(null);

    this.rutasService
      .actualizarRuta(this.id, {
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

  private aplicar(ruta: Ruta): void {
    this.ruta.set(ruta);
    this.form.patchValue({
      origen: ruta.origen,
      capacidad: ruta.capacidadMaxima,
      puntos: ruta.puntosReferencia,
      zonas: ruta.zonasSinParada ?? '',
      nota: ruta.notaContribucion ?? '',
    });
    this.cargando.set(false);
  }
}
