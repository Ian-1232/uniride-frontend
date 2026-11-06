import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { PerfilService } from '../../core/services/perfil.service';
import { perfilError } from '../../core/services/perfil-error';
import { ReportesStatePanel } from '../reportes/shared/reportes-state-panel/reportes-state-panel';
import {
  TIPO_COMPENSACION_LABELS,
  TipoCompensacion,
} from '../compensaciones/compensaciones.models';

@Component({
  selector: 'app-configuracion',
  imports: [RouterLink, MatButtonModule, MatCardModule, ReportesStatePanel],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css',
})
export class Configuracion {
  private readonly service = inject(PerfilService);
  private readonly destroyRef = inject(DestroyRef);
  readonly perfil = this.service.perfil;
  readonly loading = signal(false);
  readonly loadError = signal('');

  constructor() {
    this.load();
  }

  load(force = false): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.loadError.set('');
    this.service
      .obtener(force)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({ error: (error) => this.loadError.set(perfilError(error)) });
  }

  labelCompensacion(valor: TipoCompensacion | null): string {
    return valor ? TIPO_COMPENSACION_LABELS[valor] : 'Sin preferencia';
  }
}
