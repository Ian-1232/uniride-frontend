import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-detalle-viaje',
  imports: [RouterLink, A11yModule, MatButtonModule, MatCardModule],
  templateUrl: './detalle-viaje.html',
  styleUrl: './detalle-viaje.css',
})
export class DetalleViaje {
  @Input() accion?: string;
  @Input() estado?: string;
  @Input() aviso?: string;
  @Input() horas?: string;
}
