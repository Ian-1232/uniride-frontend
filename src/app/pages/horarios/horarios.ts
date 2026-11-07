import { agruparCursos, AvisoConflictos, conflictosImportacion } from './horarios-conflictos';
import { ConflictosHorarioDialog } from './conflictos-horario-dialog/conflictos-horario-dialog';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import {
  catchError,
  defer,
  finalize,
  map,
  of,
  startWith,
  Subject,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { HorariosService } from '../../core/services/horarios.service';
import { requeridoSinEspacios } from '../../core/models/perfil.models';
import { ReportesStatePanel } from '../reportes/shared/reportes-state-panel/reportes-state-panel';
import {
  ArchivoRespuesta,
  CursoRequest,
  CursoRespuesta,
  DIAS_CURSO,
  diaCurso,
  diaCursoValido,
  HORA_CURSO,
  horaCurso,
  dentroDeFranja,
  rangoCurso,
  validarArchivo,
} from '../../core/models/horarios.models';
import { horariosError } from './horarios-error';
import { EliminarCursoDialog } from './eliminar-curso-dialog/eliminar-curso-dialog';

interface ListState {
  status: 'loading' | 'data' | 'error';
  data: readonly CursoRespuesta[] | null;
  message: string;
}
function cursoForm() {
  return new FormGroup(
    {
      nombre: new FormControl('', { nonNullable: true, validators: [requeridoSinEspacios] }),
      dia: new FormControl('', { nonNullable: true, validators: [diaCursoValido] }),
      horaInicio: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(HORA_CURSO)],
      }),
      horaFin: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(HORA_CURSO)],
      }),
    },
    { validators: rangoCurso },
  );
}
@Component({
  selector: 'app-horarios',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatExpansionModule,
    ReportesStatePanel,
  ],
  templateUrl: './horarios.html',
  styleUrl: './horarios.css',
})
export class Horarios {
  private readonly service = inject(HorariosService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly queries = new Subject<'refresh' | readonly CursoRespuesta[]>();
  private loading = false;
  readonly mutation = signal<'registro' | 'archivo' | null>(null);
  readonly dialogOpen = signal(false);
  readonly blocked = computed(() => this.mutation() !== null || this.dialogOpen());
  readonly manualError = signal('');
  readonly notice = signal('');
  readonly archivo = signal<File | null>(null);
  readonly archivoError = signal('');
  readonly archivoValido = computed(() => !!this.archivo() && !validarArchivo(this.archivo()));
  readonly importacion = signal<ArchivoRespuesta | null>(null);
  readonly dias = DIAS_CURSO;
  readonly hora = horaCurso;
  readonly dia = diaCurso;
  readonly cursos = new FormArray([cursoForm()], {
    validators: [Validators.required, Validators.maxLength(500)],
  });
  readonly form = new FormGroup({ cursos: this.cursos });
  readonly lista = toSignal(
    this.queries.pipe(
      switchMap((query) =>
        query !== 'refresh'
          ? of<ListState>({ status: 'data', data: query, message: '' })
          : defer(() => {
              this.loading = true;
              return this.service.listarTodos();
            }).pipe(
              map((data): ListState => ({ status: 'data', data, message: '' })),
              catchError((error) =>
                of<ListState>({ status: 'error', data: null, message: horariosError(error) }),
              ),
              finalize(() => (this.loading = false)),
              startWith<ListState>({ status: 'loading', data: null, message: '' }),
            ),
      ),
    ),
    { initialValue: { status: 'loading', data: null, message: '' } as ListState },
  );
  readonly gruposDia = computed(() => agruparCursos(this.lista().data ?? []));
  constructor() {
    this.load();
  }
  load(force = false): void {
    if (!force && this.loading) return;
    this.queries.next('refresh');
  }
  agregarFila(): void {
    if (!this.blocked() && this.cursos.length < 500) this.cursos.push(cursoForm());
  }
  quitarFila(index: number): void {
    if (!this.blocked() && this.cursos.length > 1) this.cursos.removeAt(index);
  }
  guardar(): void {
    if (this.blocked() || this.lista().status === 'loading') return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const request = this.cursos
      .getRawValue()
      .map((c) => ({ ...c, nombre: c.nombre.trim() })) as readonly CursoRequest[];
    this.mutation.set('registro');
    this.manualError.set('');
    this.notice.set('');
    this.form.disable({ emitEvent: false });
    this.service
      .registrarParcial(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.mutation.set(null);
          if (!this.destroyRef.destroyed) this.form.enable({ emitEvent: false });
        }),
      )
      .subscribe({
        next: (result) => {
          const saved = new Set(result.guardados.map((c) => c.indice));
          this.cursos.clear();
          request.forEach((value, indice) => {
            if (!saved.has(indice)) {
              const row = cursoForm();
              row.setValue(value);
              this.cursos.push(row);
            }
          });
          if (!this.cursos.length) this.cursos.push(cursoForm());
          if (result.guardados.length)
            this.notice.set(result.guardados.length + ' curso(s) agregado(s) correctamente.');
          if (result.fallos.length || result.pendientes.length)
            this.manualError.set(
              (result.fallos[0]?.mensaje ?? '') +
                ' Los cursos sin confirmar permanecen en el formulario.',
            );
          this.load(true);
          if (result.conflictos.length) this.mostrarConflictos({ conflictos: result.conflictos });
        },
        error: (error) => this.manualError.set(horariosError(error)),
      });
  }
  seleccionarArchivo(event: Event): void {
    if (this.blocked()) return;
    const file = (event.target as HTMLInputElement).files?.item(0) ?? null;
    this.archivo.set(file);
    this.archivoError.set(validarArchivo(file));
    this.importacion.set(null);
  }
  importar(): void {
    if (this.blocked()) return;
    const file = this.archivo();
    const error = validarArchivo(file);
    this.archivoError.set(error);
    if (error || !file) return;
    this.mutation.set('archivo');
    this.importacion.set(null);
    this.notice.set('');
    this.service
      .importar(file)
      .pipe(
        switchMap((result) => {
          this.importacion.set(result);
          return this.service.listarTodos().pipe(
            map((actuales) => ({ result, actuales, error: '' })),
            catchError((error) =>
              error instanceof HttpErrorResponse && error.status === 401
                ? throwError(() => error)
                : of({ result, actuales: null, error: horariosError(error) }),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.mutation.set(null)),
      )
      .subscribe({
        next: ({ result, actuales, error }) => {
          if (actuales) this.queries.next(actuales);
          else {
            this.archivoError.set(
              'El archivo se procesó, pero no se pudo actualizar el horario. ' + error,
            );
            this.load(true);
          }
          const aviso = conflictosImportacion(result, actuales);
          const fueraDeFranja = (actuales ?? []).filter((c) => !dentroDeFranja(c));
          if (result.cursosOmitidos || fueraDeFranja.length)
            this.mostrarConflictos({ ...aviso, fueraDeFranja });
        },
        error: (error) => this.archivoError.set(horariosError(error)),
      });
  }
  private mostrarConflictos(data: AvisoConflictos): void {
    this.dialogOpen.set(true);
    const ref = this.dialog.open(ConflictosHorarioDialog, {
      data,
      width: '640px',
      maxWidth: 'calc(100vw - 32px)',
    });
    const unregister = this.destroyRef.onDestroy(() => ref.close());
    ref
      .afterClosed()
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          unregister();
          this.dialogOpen.set(false);
        }),
      )
      .subscribe();
  }
  eliminar(curso: CursoRespuesta): void {
    if (this.blocked() || !this.lista().data?.some((c) => c.id === curso.id)) return;
    this.dialogOpen.set(true);
    const ref = this.dialog.open<EliminarCursoDialog, CursoRespuesta, boolean>(
      EliminarCursoDialog,
      { data: curso, width: '560px', maxWidth: 'calc(100vw - 32px)' },
    );
    const unregister = this.destroyRef.onDestroy(() => ref.close(false));
    ref
      .afterClosed()
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          unregister();
          this.dialogOpen.set(false);
        }),
      )
      .subscribe((deleted) => {
        if (!deleted) return;
        this.notice.set('Curso eliminado correctamente.');
        this.load(true);
      });
  }
}
