import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCardModule
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class PerfilComponent {
  carreras: string[] = [
    'Ingeniería de Software',
    'Ingeniería de Sistemas de Información',
    'Ciencias de la Computación',
    'Administración y Negocios Internacionales',
    'Diseño Profesional Gráfico',
    'Medicina',
    'Comunicaciones'
  ];

  distritos: string[] = [
    'San Borja',
    'Santiago de Surco',
    'La Molina',
    'San Miguel',
    'Miraflores',
    'San Isidro',
    'Jesús María',
    'Pueblo Libre',
    'Chorrillos'
  ];

  sedesUpc: string[] = [
    'UPC - Campus Monterrico (Surco)',
    'UPC - Campus San Isidro',
    'UPC - Campus San Miguel',
    'UPC - Campus Villa (Chorrillos)'
  ];

  diasSemana = [
    { label: 'Lun', selected: true },
    { label: 'Mar', selected: true },
    { label: 'Mié', selected: true },
    { label: 'Jue', selected: false },
    { label: 'Vie', selected: true },
    { label: 'Sáb', selected: false }
  ];

  metodosCompensacion = [
    { value: 'GASOLINA', label: 'Gasolina compartida (Sugerido por app)' },
    { value: 'YAPE_PLIN', label: 'Transferencia móvil (Yape / Plin)' },
    { value: 'EFECTIVO', label: 'Efectivo exacto' }
  ];

  perfilForm = new FormGroup({
    carrera: new FormControl('Ingeniería de Software', [Validators.required]),
    distrito: new FormControl('San Borja', [Validators.required]),
    universidad: new FormControl('UPC - Campus Monterrico (Surco)', [Validators.required]),
    horariosDisponibles: new FormControl('07:00 - 13:00', [Validators.required]),
    fechaInicioClases: new FormControl('2026-08-04', [Validators.required]),
    fechaFinClases: new FormControl('2026-12-19', [Validators.required]),
    metodoCompensacionFavorito: new FormControl('GASOLINA', [Validators.required])
  });

  toggleDia(dia: { label: string; selected: boolean }): void {
    dia.selected = !dia.selected;
  }
}
