import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { ViajeCard } from '../shared/viaje-card/viaje-card';
import {
  cuposDisponibles,
  cuposTexto,
  DIAS_SEMANA,
  filtrarViajes,
  ORIGENES,
  solicitudDe,
  SOLICITUDES,
  Viaje,
  VIAJES,
} from '../viajes.models';

const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

@Component({
  selector: 'app-buscar-viaje',
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule, ViajeCard],
  templateUrl: './buscar-viaje.html',
  styleUrl: './buscar-viaje.css',
})
export class BuscarViaje {
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    origen: new FormControl(''),
    dia: new FormControl(''),
    hora: new FormControl('', Validators.pattern(FORMATO_HORA)),
  });
  private readonly valores = toSignal(this.form.valueChanges, {
    initialValue: this.form.value,
  });

  protected readonly origenes = ORIGENES;
  protected readonly dias = DIAS_SEMANA;
  protected readonly viajes = computed(() => filtrarViajes(VIAJES(), this.valores()));
  protected readonly total = computed(() => filtrarViajes(VIAJES(), {}).length);

  protected metaExtra(viaje: Viaje): string {
    return cuposTexto(cuposDisponibles(viaje, solicitudDe(SOLICITUDES(), viaje.id)));
  }

  protected verDetalle(viaje: Viaje): void {
    void this.router.navigate(['/viajes', viaje.id]);
  }
}
