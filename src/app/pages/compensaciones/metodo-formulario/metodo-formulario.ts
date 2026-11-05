import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
  findDemoMethod,
  FORMULARIO_COMPENSACION_STATES,
  FormularioCompensacionState,
  nonBlankValidator,
  resolveCompensacionesState,
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
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly types = TIPOS_COMPENSACION;
  protected readonly labels = TIPO_COMPENSACION_LABELS;
  protected readonly conflictDismissed = signal(false);
  protected readonly integrationNoticeVisible = signal(false);
  protected readonly methodId = computed(() => {
    const rawId = this.params().get('id');
    return rawId === null ? null : Number(rawId);
  });
  protected readonly isEdit = computed(() => this.methodId() !== null);
  protected readonly demoMethod = computed(() => {
    const id = this.methodId();
    return id === null || !Number.isInteger(id) ? undefined : findDemoMethod(id);
  });
  protected readonly state = computed<FormularioCompensacionState>(() =>
    resolveCompensacionesState(
      this.queryParams().get('estado'),
      FORMULARIO_COMPENSACION_STATES,
      'disponible',
    ),
  );
  protected readonly isNotFound = computed(
    () => this.isEdit() && (this.state() === 'no-encontrado' || this.demoMethod() === undefined),
  );
  protected readonly showDuplicate = computed(
    () => this.state() === 'duplicado' && !this.conflictDismissed(),
  );

  protected readonly form = new FormGroup<MetodoForm>({
    tipo: new FormControl<TipoCompensacion | null>(null, Validators.required),
    descripcion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nonBlankValidator],
    }),
    activo: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.conflictDismissed.set(true);
      this.integrationNoticeVisible.set(false);
    });

    effect(() => this.applyDemonstrationState(this.state(), this.demoMethod()));
  }

  protected submitDemonstration(): void {
    this.integrationNoticeVisible.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.integrationNoticeVisible.set(true);
  }

  protected hasTypeError(): boolean {
    return this.form.controls.tipo.touched && this.form.controls.tipo.invalid;
  }

  protected hasDescriptionError(): boolean {
    return this.form.controls.descripcion.touched && this.form.controls.descripcion.invalid;
  }

  private applyDemonstrationState(
    state: FormularioCompensacionState,
    method: ReturnType<typeof findDemoMethod>,
  ): void {
    this.conflictDismissed.set(false);
    this.integrationNoticeVisible.set(false);

    if (this.isEdit() && method !== undefined) {
      this.form.reset(
        {
          tipo: method.tipo,
          descripcion: method.descripcion,
          activo: method.activo,
        },
        { emitEvent: false },
      );
    } else if (!this.isEdit()) {
      this.form.reset(
        { tipo: null, descripcion: '', activo: true },
        { emitEvent: false },
      );
    }

    switch (state) {
      case 'validacion':
        this.form.reset(
          { tipo: null, descripcion: '   ', activo: this.form.controls.activo.value },
          { emitEvent: false },
        );
        this.form.markAllAsTouched();
        break;
      case 'duplicado':
        this.form.reset(
          { tipo: 'DINERO', descripcion: 'Transferencia o billetera digital', activo: true },
          { emitEvent: false },
        );
        break;
      case 'exito':
        this.form.reset(
          this.isEdit()
            ? {
                tipo: 'GASOLINA',
                descripcion: 'Aporte acordado de combustible',
                activo: false,
              }
            : {
                tipo: 'DINERO',
                descripcion: 'Transferencia o billetera digital',
                activo: true,
              },
          { emitEvent: false },
        );
        break;
    }
  }
}
