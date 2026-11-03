import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-publicar-ruta',
  templateUrl: './publicar-ruta.html',
  styleUrl: './publicar-ruta.css',
  imports: [RouterLink, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
})
export class PublicarRuta {
  private readonly fb = new FormBuilder();

  readonly form = this.fb.nonNullable.group({
    origen: ['', Validators.required],
    capacidad: [null as number | null, [Validators.required, Validators.min(1)]],
    puntos: ['', Validators.required],
    zonas: [''],
    nota: [''],
  });
}
