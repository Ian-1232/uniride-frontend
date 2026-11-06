import { HttpErrorResponse } from '@angular/common/http';
import { finalize, Subscription } from 'rxjs';
import { MetodosCompensacionService } from '../../../core/services/metodos-compensacion.service';
import { compensationError, DUPLICATE_METHOD } from '../shared/compensacion-error';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  nonBlankValidator,
  TIPO_COMPENSACION_LABELS,
  TIPOS_COMPENSACION,
  TipoCompensacion,
} from '../compensaciones.models';
import { CompensacionStatePanel } from '../shared/compensacion-state-panel/compensacion-state-panel';

interface MetodoForm {
  tipo: FormControl<TipoCompensacion | null>;
  descripcion: FormControl<string>;
  activo: FormControl<boolean>;
}

@Component({
  selector: 'app-metodo-formulario',
  imports: [
    CompensacionStatePanel,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './metodo-formulario.html',
  styleUrl: './metodo-formulario.css',
})
export class MetodoFormulario {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(MetodosCompensacionService);
  private loadSubscription?: Subscription;
  private saveSubscription?: Subscription;
  protected readonly types = TIPOS_COMPENSACION;
  protected readonly labels = TIPO_COMPENSACION_LABELS;
  protected readonly methodId = signal<number | null>(null);
  protected readonly isEdit = computed(() => this.methodId() !== null);
  protected readonly state = signal<
    'disponible' | 'cargando' | 'guardando' | 'error' | 'duplicado' | 'no-encontrado' | 'exito'
  >('disponible');
  protected readonly message = signal('');
  protected readonly loaded = signal(false);
  protected readonly isNotFound = computed(() => this.state() === 'no-encontrado');
  protected readonly busy = computed(
    () => this.state() === 'cargando' || this.state() === 'guardando',
  );
  protected readonly form = new FormGroup<MetodoForm>({
    tipo: new FormControl<TipoCompensacion | null>(null, [
      Validators.required,
      Validators.pattern(/^(DINERO|GASOLINA|FAVOR)$/),
    ]),
    descripcion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nonBlankValidator],
    }),
    activo: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.loadSubscription?.unsubscribe();
      this.saveSubscription?.unsubscribe();
      const raw = params.get('id');
      this.methodId.set(raw === null ? null : /^\d+$/.test(raw) ? Number(raw) : NaN);
      this.load();
    });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (!this.busy() && this.loaded()) {
        this.state.set('disponible');
        this.message.set('');
      }
    });
  }
  protected load(): void {
    this.loadSubscription?.unsubscribe();
    const id = this.methodId();
    this.loaded.set(false);
    this.message.set('');
    this.form.reset({ tipo: null, descripcion: '', activo: true }, { emitEvent: false });
    if (id === null) {
      this.loaded.set(true);
      this.state.set('disponible');
      this.form.enable({ emitEvent: false });
      return;
    }
    if (!Number.isSafeInteger(id) || id <= 0) {
      this.state.set('no-encontrado');
      return;
    }
    this.state.set('cargando');
    this.form.disable({ emitEvent: false });
    this.loadSubscription = this.service
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (methods) => {
          const method = methods.find((value) => value.id === id);
          if (!method) {
            this.state.set('no-encontrado');
            return;
          }
          this.form.reset(
            { tipo: method.tipo, descripcion: method.descripcion, activo: method.activo },
            { emitEvent: false },
          );
          this.form.enable({ emitEvent: false });
          this.loaded.set(true);
          this.state.set('disponible');
        },
        error: (error) => {
          this.message.set(compensationError(error));
          this.state.set('error');
        },
      });
  }
  protected submit(): void {
    if (this.busy() || !this.loaded() || this.state() === 'exito') return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const values = this.form.getRawValue();
    const id = this.methodId();
    const request = {
      tipo: values.tipo!,
      descripcion: values.descripcion.trim(),
      ...(id === null ? {} : { activo: values.activo }),
    };
    this.state.set('guardando');
    this.message.set('');
    this.form.disable({ emitEvent: false });
    const operation =
      id === null ? this.service.registrar(request) : this.service.actualizar(id, request);
    this.saveSubscription = operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (!this.destroyRef.destroyed) this.form.enable({ emitEvent: false });
        }),
      )
      .subscribe({
        next: (method) => {
          this.form.reset(
            { tipo: method.tipo, descripcion: method.descripcion, activo: method.activo },
            { emitEvent: false },
          );
          this.state.set('exito');
          this.message.set(
            id === null
              ? 'Método registrado correctamente. Vuelve al listado para consultarlo.'
              : 'Método actualizado correctamente. Vuelve al listado para consultarlo.',
          );
        },
        error: (error: HttpErrorResponse) => {
          this.state.set(
            id !== null && error.status === 404
              ? 'no-encontrado'
              : error.status === 409 && error.error?.mensaje === DUPLICATE_METHOD
                ? 'duplicado'
                : 'error',
          );
          this.message.set(compensationError(error));
        },
      });
  }
  protected hasTypeError(): boolean {
    return this.form.controls.tipo.touched && this.form.controls.tipo.invalid;
  }
  protected hasDescriptionError(): boolean {
    return this.form.controls.descripcion.touched && this.form.controls.descripcion.invalid;
  }
}
