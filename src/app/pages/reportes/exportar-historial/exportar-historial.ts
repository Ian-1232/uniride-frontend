import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, defer, finalize, from, map, switchMap, tap, timeout } from 'rxjs';
import { ReportesService } from '../../../core/services/reportes.service';
import { downloadPdf, historyExportError, preparePdf } from './historial-pdf';
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
import { ReportesStatePanel } from '../shared/reportes-state-panel/reportes-state-panel';
import {
  dateRangeValidator,
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
  private readonly service = inject(ReportesService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = new FormGroup<HistoryExportForm>(
    {
      desde: new FormControl<Date | null>(null),
      hasta: new FormControl<Date | null>(null),
      tipo: new FormControl<HistoryTripType>('todos', { nonNullable: true }),
    },
    { validators: dateRangeValidator },
  );
  protected readonly rangeErrorStateMatcher = new DateRangeErrorStateMatcher();
  protected readonly state = signal<HistoryExportState>('disponible');
  protected readonly message = signal('');
  protected readonly isPreparing = computed(() => this.state() === 'preparando');

  protected hasDateRangeError(): boolean {
    return this.form.hasError('dateRange');
  }

  protected exportPdf(): void {
    if (this.isPreparing()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const filters = this.form.getRawValue();
    this.state.set('preparando');
    this.message.set('');
    this.form.disable({ emitEvent: false });
    defer(() => this.service.exportarHistorial(filters)).pipe(
      timeout(30000),
      switchMap(response => from(preparePdf(response))),
      tap(file => downloadPdf(file.blob, file.filename)),
      map(file => ({ state: 'descargado' as const, message: 'Descarga iniciada: ' + file.filename + '. Revisa las descargas de tu navegador.' })),
      catchError(error => from(historyExportError(error))),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        if (!this.destroyRef.destroyed) this.form.enable({ emitEvent: false });
      }),
    ).subscribe(result => {
      this.state.set(result.state);
      this.message.set(result.message);
    });
  }
}
