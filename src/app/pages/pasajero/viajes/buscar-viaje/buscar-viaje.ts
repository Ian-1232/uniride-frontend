import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { of, switchMap, timer } from 'rxjs';
import { ViajesPasajeroService } from '../../../../core/services/viajes-pasajero.service';
import { ViajePasajeroContextoService } from '../../../../core/services/viaje-pasajero-contexto.service';
import { ReportesStatePanel } from '../../../reportes/shared/reportes-state-panel/reportes-state-panel';
import { ViajeCard } from '../shared/viaje-card/viaje-card';
import { pasajeroQuery } from '../shared/pasajero-query';
import {
  BusquedaResumenRespuesta,
  desdeBusqueda,
  DIAS_SEMANA,
  FiltroBusqueda,
  ViajeVista,
} from '../../../../core/models/viajes.models';
interface SearchQuery {
  filtros: FiltroBusqueda;
  page: number;
  size: number;
  delay: boolean;
}
@Component({
  selector: 'app-buscar-viaje',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatPaginatorModule,
    ReactiveFormsModule,
    ViajeCard,
    ReportesStatePanel,
  ],
  templateUrl: './buscar-viaje.html',
  styleUrl: './buscar-viaje.css',
})
export class BuscarViaje {
  private readonly service = inject(ViajesPasajeroService);
  private readonly navigation = inject(ViajePasajeroContextoService);
  private readonly router = inject(Router);
  protected readonly dias = DIAS_SEMANA;
  protected readonly form = new FormGroup({
    origen: new FormControl(''),
    destino: new FormControl(''),
    dia: new FormControl(''),
    hora: new FormControl('', Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)),
    cercania: new FormControl(false),
  });
  protected readonly query = pasajeroQuery<SearchQuery, BusquedaResumenRespuesta>((q) =>
    (q.delay ? timer(250) : of(0)).pipe(
      switchMap(() => this.service.buscar(q.filtros, q.page, q.size)),
    ),
  );
  protected readonly data = computed(() => this.query.state().data);
  protected readonly viajes = computed(() => this.data()?.viajes.content.map(desdeBusqueda) ?? []);
  private lastPageSize = 10;
  private lastQuery?: SearchQuery;
  constructor() {
    this.search();
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.search(0, this.lastPageSize, true));
  }
  protected search(page = 0, size = this.lastPageSize, delay = false): void {
    if (this.form.invalid) {
      this.query.cancel();
      return;
    }
    this.lastPageSize = size;
    this.lastQuery = { filtros: this.form.getRawValue(), page, size, delay };
    this.query.run(this.lastQuery);
  }
  protected retry(): void {
    if (this.lastQuery && this.form.valid) this.query.run({ ...this.lastQuery, delay: false });
  }
  protected page(event: PageEvent): void {
    this.search(event.pageIndex, event.pageSize);
  }
  protected verDetalle(viaje: ViajeVista): void {
    this.navigation.seleccionar({ viaje });
    void this.router.navigate(['/pasajero/viajes', viaje.id]);
  }
}
