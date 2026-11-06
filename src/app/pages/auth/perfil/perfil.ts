import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { AuthService } from '../../../core/services/auth.service';
import { PerfilService } from '../../../core/services/perfil.service';
import {
  PerfilRequest,
  PerfilRespuesta,
  fechaValida,
  perfilCompleto,
  rangoAcademico,
  requeridoSinEspacios,
} from '../../../core/models/perfil.models';
import { erroresPerfil, perfilError } from '../../../core/services/perfil-error';
import { ReportesStatePanel } from '../../reportes/shared/reportes-state-panel/reportes-state-panel';
import { TipoCompensacion } from '../../compensaciones/compensaciones.models';
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
    MatAutocompleteModule,
    ReportesStatePanel,
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCardModule,
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class PerfilComponent {
  readonly auth = inject(AuthService);
  private readonly service = inject(PerfilService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(false);
  readonly saving = this.service.saving;
  readonly loadError = signal('');
  readonly error = signal('');
  readonly success = signal('');
  readonly onboarding = signal(false);
  carreras: string[] = [
    'Ingeniería de Software',
    'Ingeniería de Sistemas de Información',
    'Ciencias de la Computación',
    'Administración y Negocios Internacionales',
    'Diseño Profesional Gráfico',
    'Medicina',
    'Comunicaciones',
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
    'Chorrillos',
  ];

  sedesUpc: string[] = [
    'UPC - Campus Monterrico (Surco)',
    'UPC - Campus San Isidro',
    'UPC - Campus San Miguel',
    'UPC - Campus Villa (Chorrillos)',
  ];

  diasSemana = [
    { label: 'Lun', valor: 'Lunes' },
    { label: 'Mar', valor: 'Martes' },
    { label: 'Mié', valor: 'Miércoles' },
    { label: 'Jue', valor: 'Jueves' },
    { label: 'Vie', valor: 'Viernes' },
    { label: 'Sáb', valor: 'Sábado' },
    { label: 'Dom', valor: 'Domingo' },
  ];

  metodosCompensacion = [
    { value: 'DINERO', label: 'Dinero' },
    { value: 'GASOLINA', label: 'Gasolina' },
    { value: 'FAVOR', label: 'Favor' },
  ];

  perfilForm = new FormGroup(
    {
      nombre: new FormControl('', { nonNullable: true, validators: [requeridoSinEspacios] }),
      apellidos: new FormControl('', { nonNullable: true, validators: [requeridoSinEspacios] }),
      carrera: new FormControl('', { nonNullable: true, validators: [requeridoSinEspacios] }),
      distrito: new FormControl('', { nonNullable: true, validators: [requeridoSinEspacios] }),
      universidad: new FormControl('', { nonNullable: true, validators: [requeridoSinEspacios] }),
      diasDisponibles: new FormControl('', {
        nonNullable: true,
        validators: [requeridoSinEspacios],
      }),
      horariosDisponibles: new FormControl('', {
        nonNullable: true,
        validators: [requeridoSinEspacios],
      }),
      fechaInicioClases: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, fechaValida],
      }),
      fechaFinClases: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, fechaValida],
      }),
      metodoCompensacionFavorito: new FormControl<TipoCompensacion | null>(
        null,
        Validators.pattern(/^(DINERO|GASOLINA|FAVOR)$/),
      ),
    },
    { validators: rangoAcademico },
  );

  constructor() {
    effect(() => {
      const control = this.perfilForm.controls.metodoCompensacionFavorito;
      control.setValidators(
        this.auth.isConductor()
          ? [Validators.required, Validators.pattern(/^(DINERO|GASOLINA|FAVOR)$/)]
          : [Validators.pattern(/^(DINERO|GASOLINA|FAVOR)$/)],
      );
      control.updateValueAndValidity({ emitEvent: false });
    });
    this.load();
  }
  load(force = false): void {
    if (this.loading() || this.saving()) return;
    this.loading.set(true);
    this.loadError.set('');
    this.perfilForm.disable({ emitEvent: false });
    this.service
      .obtener(force)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (perfil) => {
          this.onboarding.set(!perfilCompleto(perfil, this.auth.currentRole()));
          if (perfil) this.fill(perfil);
          else
            this.perfilForm.patchValue({
              nombre: this.auth.currentUser()?.nombre ?? '',
              apellidos: this.auth.currentUser()?.apellidos ?? '',
            });
          this.perfilForm.enable({ emitEvent: false });
        },
        error: (error) => this.loadError.set(perfilError(error)),
      });
  }
  private fill(perfil: PerfilRespuesta): void {
    const {
      nombre,
      apellidos,
      carrera,
      distrito,
      universidad,
      diasDisponibles,
      horariosDisponibles,
      fechaInicioClases,
      fechaFinClases,
      metodoCompensacionFavorito,
    } = perfil;
    this.perfilForm.patchValue({
      nombre,
      apellidos,
      carrera,
      distrito,
      universidad,
      diasDisponibles,
      horariosDisponibles,
      fechaInicioClases,
      fechaFinClases,
      metodoCompensacionFavorito,
    });
  }
  diaSeleccionado(dia: { label: string; valor: string }): boolean {
    return this.dayTokens().some((token) => this.sameDay(token, dia));
  }
  private dayTokens(): string[] {
    return this.perfilForm.controls.diasDisponibles.value
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  private sameDay(token: string, dia: { label: string; valor: string }): boolean {
    const normalize = (v: string) =>
      v
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    return [dia.valor, dia.label].some((value) => normalize(value) === normalize(token));
  }
  toggleDia(dia: { label: string; valor: string }): void {
    if (this.saving() || this.loading() || this.loadError()) return;
    const tokens = this.dayTokens();
    this.perfilForm.controls.diasDisponibles.setValue(
      this.diaSeleccionado(dia)
        ? tokens.filter((token) => !this.sameDay(token, dia)).join(', ')
        : [...tokens, dia.valor].join(', '),
    );
  }
  guardar(): void {
    if (this.saving() || this.loading() || this.loadError()) return;
    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      return;
    }
    const value = this.perfilForm.getRawValue();
    const request: PerfilRequest = {
      ...value,
      nombre: value.nombre.trim(),
      apellidos: value.apellidos.trim(),
      carrera: value.carrera.trim(),
      distrito: value.distrito.trim(),
      universidad: value.universidad.trim(),
      diasDisponibles: value.diasDisponibles.trim(),
      horariosDisponibles: value.horariosDisponibles.trim(),
    };
    this.error.set('');
    this.success.set('');
    this.perfilForm.disable({ emitEvent: false });
    this.service
      .guardar(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (!this.destroyRef.destroyed && this.perfilForm.disabled)
            this.perfilForm.enable({ emitEvent: false });
        }),
      )
      .subscribe({
        next: (perfil) => {
          this.fill(perfil);
          this.success.set('Tu perfil se guardó correctamente.');
          if (this.onboarding()) void this.router.navigate(['/configuracion/info-adicional']);
        },
        error: (error) => {
          this.perfilForm.enable({ emitEvent: false });
          this.error.set(perfilError(error));
          erroresPerfil(this.perfilForm, error);
        },
      });
  }
}
