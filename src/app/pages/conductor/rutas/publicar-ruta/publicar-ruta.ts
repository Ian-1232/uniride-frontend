import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { authError } from '../../../../core/services/auth-error';
import { RutasService } from '../../../../core/services/rutas.service';

@Component({
  selector: 'app-publicar-ruta',
  templateUrl: './publicar-ruta.html',
  styleUrl: './publicar-ruta.css',
  imports: [RouterLink, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
})
export class PublicarRuta {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(RutasService);

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
    const valor = this.form.getRawValue();
    this.guardando.set(true);
    this.error.set(null);
    this.service
      .crear({
        origen: valor.origen.trim(),
        capacidadMaxima: valor.capacidad ?? 0,
        puntosReferencia: valor.puntos.trim(),
        zonasSinParada: valor.zonas.trim() || undefined,
        notaContribucion: valor.nota.trim() || undefined,
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/conductor/rutas']),
        error: (err) => this.error.set(authError(err, 'No se pudo publicar la ruta.')),
      });
  }
}
