import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { PerfilService } from '../../../core/services/perfil.service';
import { requeridoSinEspacios } from '../../../core/models/perfil.models';
import { erroresPerfil, perfilError } from '../../../core/services/perfil-error';
import { ReportesStatePanel } from '../../reportes/shared/reportes-state-panel/reportes-state-panel';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-info-adicional',
  standalone: true,
  imports: [
    CommonModule,
    ReportesStatePanel,
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './info-adicional.html',
  styleUrl: './info-adicional.css',
})
export class InfoAdicionalComponent {
  readonly authService = inject(AuthService);
  private readonly service = inject(PerfilService);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(false);
  readonly saving = this.service.saving;
  readonly error = signal('');
  readonly loadError = signal('');
  readonly success = signal('');
  readonly missing = signal(false);

  infoForm = new FormGroup({
    gustos: new FormControl('', { nonNullable: true, validators: [requeridoSinEspacios] }),
    hobbies: new FormControl('', { nonNullable: true, validators: [requeridoSinEspacios] }),
    datosCuriosos: new FormControl('', { nonNullable: true, validators: [requeridoSinEspacios] }),
  });

  musicaChips = ['Rock alternativo', 'Pop / Indie', 'Podcasts', 'Silencio / Estudio'];
  hobbiesChips = ['Videojuegos', 'Gimnasio', 'Lectura', 'Programación'];
  constructor() {
    this.load();
  }
  load(force = false): void {
    if (this.loading() || this.saving()) return;
    this.loading.set(true);
    this.loadError.set('');
    this.infoForm.disable({ emitEvent: false });
    this.service
      .obtener(force)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (perfil) => {
          this.missing.set(!perfil);
          if (perfil) {
            this.infoForm.patchValue({
              gustos: perfil.gustos ?? '',
              hobbies: perfil.hobbies ?? '',
              datosCuriosos: perfil.datosCuriosos ?? '',
            });
            this.infoForm.enable({ emitEvent: false });
          }
        },
        error: (error) => this.loadError.set(perfilError(error)),
      });
  }
  guardar(): void {
    if (this.loading() || this.saving() || this.loadError() || this.missing()) return;
    if (this.infoForm.invalid) {
      this.infoForm.markAllAsTouched();
      return;
    }
    const values = this.infoForm.getRawValue();
    this.error.set('');
    this.success.set('');
    this.infoForm.disable({ emitEvent: false });
    this.service
      .guardarInfoAdicional({
        gustos: values.gustos.trim(),
        hobbies: values.hobbies.trim(),
        datosCuriosos: values.datosCuriosos.trim(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (!this.destroyRef.destroyed && this.infoForm.disabled)
            this.infoForm.enable({ emitEvent: false });
        }),
      )
      .subscribe({
        next: (result) => {
          this.infoForm.patchValue({
            gustos: result.gustos ?? '',
            hobbies: result.hobbies ?? '',
            datosCuriosos: result.datosCuriosos ?? '',
          });
          this.success.set('Tu información adicional se guardó correctamente.');
        },
        error: (error) => {
          this.infoForm.enable({ emitEvent: false });
          this.error.set(perfilError(error));
          erroresPerfil(this.infoForm, error);
        },
      });
  }

  addMusicTag(tag: string): void {
    if (this.infoForm.disabled) return;
    const current = this.infoForm.get('gustos')?.value || '';
    if (!current.includes(tag)) {
      this.infoForm.patchValue({
        gustos: current ? `${current}, ${tag}` : tag,
      });
    }
  }

  addHobbyTag(tag: string): void {
    if (this.infoForm.disabled) return;
    const current = this.infoForm.get('hobbies')?.value || '';
    if (!current.includes(tag)) {
      this.infoForm.patchValue({
        hobbies: current ? `${current}, ${tag}` : tag,
      });
    }
  }
}
