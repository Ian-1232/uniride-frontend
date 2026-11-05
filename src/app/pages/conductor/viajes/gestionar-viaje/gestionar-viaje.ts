import { booleanAttribute, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-gestionar-viaje',
  imports: [RouterLink, A11yModule, MatButtonModule, MatCardModule],
  templateUrl: './gestionar-viaje.html',
  styleUrl: './gestionar-viaje.css',
})
export class GestionarViaje {
  @Input({ transform: booleanAttribute }) confirmado = false;
  @Input() aceptada?: 'maria' | 'diego' | 'valeria';
  @Input() estado?: string;
  @Input() accion?: string;
  @Input() aviso?: string;
  @Input() horas?: string;
  readonly pasajeros = [
    { iniciales: 'LM', nombre: 'Lucía Medina', carrera: 'Arquitectura' },
    { iniciales: 'AV', nombre: 'Andrés Vega', carrera: 'Administración' },
  ];
  readonly nuevosPasajeros = {
    maria: { iniciales: 'MT', nombre: 'María Torres', carrera: 'Ingeniería Industrial' },
    diego: { iniciales: 'DR', nombre: 'Diego Ramírez', carrera: 'Ingeniería de Sistemas' },
    valeria: { iniciales: 'VR', nombre: 'Valeria Rojas', carrera: 'Derecho' },
  };
}
