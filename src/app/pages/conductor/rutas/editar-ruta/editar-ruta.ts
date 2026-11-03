import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-editar-ruta',
  templateUrl: './editar-ruta.html',
  styleUrl: './editar-ruta.css',
  imports: [RouterLink, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
})
export class EditarRuta {
  private readonly fb = new FormBuilder();

  readonly form = this.fb.nonNullable.group({
    origen: ['San Borja', Validators.required],
    capacidad: [3 as number | null, [Validators.required, Validators.min(1)]],
    puntos: ['Av. Arequipa 1234, Jr. Los Pinos', Validators.required],
    zonas: ['Centro de Lima'],
    nota: ['S/ 10 sugeridos por pasajero'],
  });
}
