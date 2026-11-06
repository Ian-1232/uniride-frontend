import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { filter, switchMap } from 'rxjs';
import { Ruta } from '../../../../core/models/ruta.model';
import { authError } from '../../../../core/services/auth-error';
import { consultaQuery } from '../../../../core/services/consulta';
import { crearPaginatorIntl } from '../../../../core/services/paginator-intl';
import { RutasService } from '../../../../core/services/rutas.service';
import { EliminarRutaDialog } from '../eliminar-ruta-dialog/eliminar-ruta-dialog';

@Component({
  selector: 'app-mis-rutas',
  templateUrl: './mis-rutas.html',
  styleUrl: './mis-rutas.css',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatPaginatorModule,
  ],
  providers: [{ provide: MatPaginatorIntl, useValue: crearPaginatorIntl('rutas') }],
})
export class MisRutas {
  private readonly service = inject(RutasService);
  private readonly dialog = inject(MatDialog);

  // shortcut: se cargan hasta 100 rutas y se pagina en pantalla; subir a paginación
  // del servidor cuando un conductor pueda superar ese volumen.
  readonly consulta = consultaQuery(() => this.service.listar(0, 100));
  readonly pagina = signal(0);
  readonly pageSize = 4;
  readonly errorAccion = signal<string | null>(null);

  readonly rutas = computed(() => this.consulta.state().data?.content ?? []);
  readonly visibles = computed(() => {
    const inicio = this.pagina() * this.pageSize;
    return this.rutas().slice(inicio, inicio + this.pageSize);
  });

  cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
  }

  eliminar(ruta: Ruta): void {
    this.errorAccion.set(null);
    this.dialog
      .open(EliminarRutaDialog, {
        data: ruta,
        width: '28rem',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .pipe(
        filter((confirmado) => confirmado === true),
        switchMap(() => this.service.eliminar(ruta.id)),
      )
      .subscribe({
        next: () => {
          this.pagina.set(0);
          this.consulta.retry();
        },
        error: (error) => this.errorAccion.set(authError(error, 'No se pudo eliminar la ruta.')),
      });
  }
}
