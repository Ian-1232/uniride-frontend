import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-info-adicional',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatCardModule
  ],
  templateUrl: './info-adicional.html',
  styleUrl: './info-adicional.css'
})
export class InfoAdicionalComponent {
  infoForm = new FormGroup({
    gustos: new FormControl('Rock alternativo, Indie, Podcasts de tecnología'),
    hobbies: new FormControl('Programación, Videojuegos, Gimnasio'),
    datosCuriosos: new FormControl('Hice un intercambio académico en Santiago de Chile y no me gusta comer dentro del auto.'),
    aireAcondicionado: new FormControl(true),
    charlaAmistosa: new FormControl(true)
  });

  musicaChips = ['Rock alternativo', 'Pop / Indie', 'Podcasts', 'Silencio / Estudio'];
  hobbiesChips = ['Videojuegos', 'Gimnasio', 'Lectura', 'Programación'];

  addMusicTag(tag: string): void {
    const current = this.infoForm.get('gustos')?.value || '';
    if (!current.includes(tag)) {
      this.infoForm.patchValue({
        gustos: current ? `${current}, ${tag}` : tag
      });
    }
  }

  addHobbyTag(tag: string): void {
    const current = this.infoForm.get('hobbies')?.value || '';
    if (!current.includes(tag)) {
      this.infoForm.patchValue({
        hobbies: current ? `${current}, ${tag}` : tag
      });
    }
  }
}
