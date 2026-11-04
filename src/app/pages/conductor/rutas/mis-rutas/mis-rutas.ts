import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Ruta } from '../../../../models/ruta.model';
import { crearPaginatorIntl } from '../../../../services/paginator-intl';
import { RutasService, mensajeError } from '../../../../services/rutas.service';

@Component({
  selector: 'app-mis-rutas',
  templateUrl: './mis-rutas.html',
  styleUrl: './mis-rutas.css',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule, MatPaginatorModule],
  providers: [{ provide: MatPaginatorIntl, useValue: crearPaginatorIntl('rutas') }],
})
export class MisRutas {
  private readonly rutasService = inject(RutasService);

  readonly rutas = signal<Ruta[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly pageSize = 4;
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly eliminandoId = signal<number | null>(null);

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.rutasService.listarRutas(this.pagina(), this.pageSize).subscribe({
      next: (respuesta) => {
        this.rutas.set(respuesta.content);
        this.total.set(respuesta.totalElements);
        this.cargando.set(false);
        if (respuesta.content.length === 0 && this.pagina() > 0) {
          this.pagina.set(Math.max(respuesta.totalPages - 1, 0));
          this.cargar();
        }
      },
      error: (error: unknown) => {
        this.error.set(mensajeError(error));
        this.cargando.set(false);
      },
    });
  }

  cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.cargar();
  }

  eliminar(id: number): void {
    this.eliminandoId.set(id);
    this.error.set(null);
    this.rutasService.eliminarRuta(id).subscribe({
      next: () => {
        this.eliminandoId.set(null);
        this.cargar();
      },
      error: (error: unknown) => {
        this.eliminandoId.set(null);
        this.error.set(mensajeError(error));
      },
    });
  }
}
