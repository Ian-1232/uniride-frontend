import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-solicitudes',
  imports: [RouterLink, ReactiveFormsModule, A11yModule, MatButtonModule, MatCardModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatPaginatorModule],
  providers: [{ provide: MatPaginatorIntl, useValue: Object.assign(new MatPaginatorIntl(), {
    itemsPerPageLabel: 'Solicitudes por página', nextPageLabel: 'Siguiente', previousPageLabel: 'Anterior',
  }) }],
  templateUrl: './solicitudes.html',
  styleUrl: './solicitudes.css',
})
export class Solicitudes {
  // Estado de demostración en la URL: se conserva al navegar y recargar.
  @Input() aceptada?: string;
  @Input() rechazos?: string;
  @Input() filtro?: string;
  @Input() accion?: string;
  @Input() objetivo?: string;
  @Input() aviso?: string;
  @Input() estado?: string;
  pagina = 0;
  readonly seleccion = new FormGroup({
    maria: new FormControl(false, { nonNullable: true }),
    diego: new FormControl(false, { nonNullable: true }),
    valeria: new FormControl(false, { nonNullable: true }),
  });
  readonly motivo = new FormGroup({ motivo: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(300)] }) });
  readonly solicitudes = [
    { id: 'maria', iniciales: 'MT', nombre: 'María Torres', descripcion: 'Ing. Industrial · Surco', mensaje: 'Puedo llegar al punto de encuentro a las 07:20.' },
    { id: 'diego', iniciales: 'DR', nombre: 'Diego Ramírez', descripcion: 'Ing. de Sistemas · San Borja', mensaje: 'Mi clase empieza a las 08:00. ¡Gracias!' },
    { id: 'valeria', iniciales: 'VR', nombre: 'Valeria Rojas', descripcion: 'Derecho · Miraflores', mensaje: 'Prefiero contribuir con gasolina para el viaje.' },
    { id: 'lucia', iniciales: 'LM', nombre: 'Lucía Medina', descripcion: 'Arquitectura', mensaje: 'Nos vemos en el punto de encuentro.' },
    { id: 'andres', iniciales: 'AV', nombre: 'Andrés Vega', descripcion: 'Administración', mensaje: '¡Gracias por compartir el viaje!' },
  ];
}
