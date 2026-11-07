import { Component, computed, input, output } from '@angular/core';
import { salidaTexto, ViajeVista } from '../../../../../core/models/viajes.models';
@Component({
  selector: 'app-viaje-card',
  templateUrl: './viaje-card.html',
  styleUrl: './viaje-card.css',
})
export class ViajeCard {
  readonly viaje = input.required<ViajeVista>();
  readonly etiqueta = input.required<string>();
  readonly tono = input<'info' | 'success' | 'warning' | 'danger'>('info');
  readonly metaExtra = input('');
  readonly accion = input.required<string>();
  readonly seleccion = output<ViajeVista>();
  protected readonly linea1 = computed(
    () => salidaTexto(this.viaje()) + (this.metaExtra() ? ' · ' + this.metaExtra() : ''),
  );
}
