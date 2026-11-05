import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-detalle-solicitud',
  imports: [RouterLink, ReactiveFormsModule, A11yModule, MatButtonModule, MatCardModule, MatDividerModule, MatFormFieldModule, MatInputModule],
  templateUrl: './detalle-solicitud.html',
  styleUrl: './detalle-solicitud.css',
})
export class DetalleSolicitud {
  @Input() solicitudId?: 'maria' | 'diego' | 'valeria';
  @Input() aceptada?: string;
  @Input() rechazos?: string;
  @Input() accion?: string;
  @Input() aviso?: string;
  @Input() estado?: string;
  readonly motivo = new FormGroup({ motivo: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(300)] }) });
  readonly solicitudes = {
    maria: { nombre: 'María Torres', corto: 'María', iniciales: 'MT', carrera: 'Ingeniería Industrial', distrito: 'Surco', intereses: 'Música, lectura y viajes', mensaje: 'Puedo llegar al punto de encuentro a las 07:20.', compensacion: 'Dinero' },
    diego: { nombre: 'Diego Ramírez', corto: 'Diego', iniciales: 'DR', carrera: 'Ingeniería de Sistemas', distrito: 'San Borja', intereses: 'Música, lectura y viajes', mensaje: 'Mi clase empieza a las 08:00. ¡Gracias!', compensacion: 'Dinero' },
    valeria: { nombre: 'Valeria Rojas', corto: 'Valeria', iniciales: 'VR', carrera: 'Derecho', distrito: 'Miraflores', intereses: 'Música, lectura y viajes', mensaje: 'Prefiero contribuir con gasolina para el viaje.', compensacion: 'Gasolina' },
  };
}
