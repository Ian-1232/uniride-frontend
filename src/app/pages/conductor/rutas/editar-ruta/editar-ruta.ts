import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { catchError, filter, finalize, Observable, switchMap, throwError } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Ruta, RutaRequest } from '../../../../core/models/ruta.model';
import { authError } from '../../../../core/services/auth-error';
import { consultaQuery } from '../../../../core/services/consulta';
import { RutasService } from '../../../../core/services/rutas.service';
import { ConfirmarImpactoDialog } from '../confirmar-impacto-dialog/confirmar-impacto-dialog';

@Component({
  selector: 'app-editar-ruta',
  templateUrl: './editar-ruta.html',
  styleUrl: './editar-ruta.css',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
})
export class EditarRuta {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(RutasService);
  private readonly dialog = inject(MatDialog);

  readonly rutaId = Number(this.route.snapshot.paramMap.get('id'));
  readonly consulta = consultaQuery(() => this.service.obtener(this.rutaId));
  readonly ruta = computed(() => this.consulta.state().data);
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
    effect(() => {
      const ruta = this.ruta();
      if (ruta) {
        this.form.patchValue({
          origen: ruta.origen,
          capacidad: ruta.capacidadMaxima,
          puntos: ruta.puntosReferencia,
          zonas: ruta.zonasSinParada ?? '',
          nota: ruta.notaContribucion ?? '',
        });
      }
    });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      return;
    }
    const valor = this.form.getRawValue();
    const cambios: RutaRequest = {
      origen: valor.origen.trim(),
      capacidadMaxima: valor.capacidad ?? 0,
      puntosReferencia: valor.puntos.trim(),
      zonasSinParada: valor.zonas.trim() || undefined,
      notaContribucion: valor.nota.trim() || undefined,
    };
    this.guardando.set(true);
    this.error.set(null);
    this.service
      .actualizar(this.rutaId, cambios)
      .pipe(
        catchError((err) =>
          this.requiereConfirmacion(err)
            ? this.confirmarImpacto(cambios)
            : throwError(() => err),
        ),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => void this.router.navigate(['/conductor/rutas']),
        error: (err) => this.error.set(authError(err, 'No se pudo guardar la ruta.')),
      });
  }

  /** US07: el backend pide confirmar el impacto cuando hay pasajeros aceptados. */
  private requiereConfirmacion(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse) || error.status !== 409) {
      return false;
    }
    const mensaje = error.error?.mensaje;
    return typeof mensaje === 'string' && mensaje.includes('confirmarImpacto=true');
  }

  private confirmarImpacto(cambios: RutaRequest): Observable<Ruta> {
    return this.dialog
      .open(ConfirmarImpactoDialog, {
        data: { origen: cambios.origen, destino: this.ruta()?.destino ?? '' },
        width: '28rem',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .pipe(
        filter((confirmado) => confirmado === true),
        switchMap(() => this.service.actualizar(this.rutaId, cambios, true)),
      );
  }
}
