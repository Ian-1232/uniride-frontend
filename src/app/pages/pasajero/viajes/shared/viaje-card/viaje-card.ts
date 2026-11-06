import { Component, computed, input, output } from '@angular/core';
import { salidaTexto, Viaje } from '../../viajes.models';
@Component({
  selector: 'app-viaje-card',
  templateUrl: './viaje-card.html',
  styleUrl: './viaje-card.css',
})
export class ViajeCard {
  readonly viaje = input.required<Viaje>();
  readonly etiqueta = input.required<string>();
  readonly tono = input<'info' | 'success' | 'warning' | 'danger'>('info');
  readonly metaExtra = input('');
  readonly accion = input.required<string>();
  readonly seleccion = output<Viaje>();
  protected readonly linea1 = computed(
    () => salidaTexto(this.viaje()) + (this.metaExtra() ? ' · ' + this.metaExtra() : ''),
  );
}
