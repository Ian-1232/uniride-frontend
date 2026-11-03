import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-generar-viaje',
  templateUrl: './generar-viaje.html',
  styleUrl: './generar-viaje.css',
  imports: [RouterLink, ReactiveFormsModule, MatButtonModule, MatCardModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule],
})
export class GenerarViaje {
  private readonly fb = new FormBuilder();

  readonly hoy = new Date();

  readonly form = this.fb.nonNullable.group({
    fecha: [null as Date | null, Validators.required],
    hora: ['07:30', Validators.required],
  });
}
