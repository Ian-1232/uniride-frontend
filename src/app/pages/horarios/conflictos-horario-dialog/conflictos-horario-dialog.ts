import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AvisoConflictos } from '../horarios-conflictos';
import { diaCurso, horaCurso } from '../horarios.models';
@Component({
  selector: 'app-conflictos-horario-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './conflictos-horario-dialog.html',
  styleUrl: './conflictos-horario-dialog.css',
})
export class ConflictosHorarioDialog {
  readonly data = inject<AvisoConflictos>(MAT_DIALOG_DATA);
  readonly dia = diaCurso;
  readonly hora = horaCurso;
}
