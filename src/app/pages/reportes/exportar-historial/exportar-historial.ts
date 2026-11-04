import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  NgForm,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  ErrorStateMatcher,
  MAT_DATE_LOCALE,
  MatDateFormats,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { resolveViewState } from '../reportes.models';
import { ReportesStatePanel } from '../shared/reportes-state-panel/reportes-state-panel';
import {
  dateRangeValidator,
  HISTORY_EXPORT_STATES,
  HistoryExportState,
  HistoryTripType,
} from './exportar-historial.models';

class DateRangeErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: FormControl | null,
    form: FormGroupDirective | NgForm | null,
  ): boolean {
    const interacted = Boolean(control?.touched || control?.dirty || form?.submitted);
    return interacted && Boolean(control?.invalid || control?.parent?.hasError('dateRange'));
  }
}

interface HistoryExportForm {
  desde: FormControl<Date | null>;
  hasta: FormControl<Date | null>;
  tipo: FormControl<HistoryTripType>;
}

const UNIRIDE_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: null },
  display: {
    dateInput: { year: 'numeric', month: '2-digit', day: '2-digit' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};

@Component({
  selector: 'app-exportar-historial',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    ReportesStatePanel,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-PE' },
    provideNativeDateAdapter(UNIRIDE_DATE_FORMATS),
  ],
  templateUrl: './exportar-historial.html',
  styleUrl: './exportar-historial.css',
})
export class ExportarHistorial {
  private readonly route = inject(ActivatedRoute);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly form = new FormGroup<HistoryExportForm>(
    {
      desde: new FormControl<Date | null>(null),
      hasta: new FormControl<Date | null>(null),
      tipo: new FormControl<HistoryTripType>('todos', { nonNullable: true }),
    },
    { validators: dateRangeValidator },
  );
  protected readonly rangeErrorStateMatcher = new DateRangeErrorStateMatcher();
  protected readonly integrationNoticeVisible = signal(false);
  protected readonly state = computed(() =>
    resolveViewState(
      this.queryParams().get('estado'),
      HISTORY_EXPORT_STATES,
      'disponible',
    ),
  );
  protected readonly isPreparing = computed(() => this.state() === 'preparando');

  constructor() {
    effect(() => this.applyDemonstrationState(this.state()));
  }

  protected hasDateRangeError(): boolean {
    return this.form.hasError('dateRange');
  }

  protected submitDemonstration(): void {
    this.integrationNoticeVisible.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.integrationNoticeVisible.set(true);
  }

  private applyDemonstrationState(state: HistoryExportState): void {
    this.integrationNoticeVisible.set(false);

    switch (state) {
      case 'filtrado':
        this.setFormValues(new Date(2026, 9, 1), new Date(2026, 9, 31), 'conductor');
        break;
      case 'fechas-invalidas':
        this.setFormValues(new Date(2026, 10, 30), new Date(2026, 10, 1), 'todos');
        this.form.markAllAsTouched();
        break;
      case 'sin-resultados':
        this.setFormValues(new Date(2026, 9, 1), new Date(2026, 9, 31), 'pasajero');
        break;
      default:
        this.setFormValues(null, null, 'todos');
    }
  }

  private setFormValues(
    desde: Date | null,
    hasta: Date | null,
    tipo: HistoryTripType,
  ): void {
    this.form.reset({ desde, hasta, tipo });
  }
}
