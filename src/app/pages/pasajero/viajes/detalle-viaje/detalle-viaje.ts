import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, finalize, map, Observable, Subscription, take } from 'rxjs';
import { SolicitudesPasajeroService } from '../../../../core/services/solicitudes-pasajero.service';
import { ViajePasajeroContextoService } from '../../../../core/services/viaje-pasajero-contexto.service';
import { ReportesStatePanel } from '../../../reportes/shared/reportes-state-panel/reportes-state-panel';
import {
  ContextoViaje,
  desdeSolicitud,
  ETIQUETAS_SOLICITUD,
  salidaTexto,
  SolicitudHistorialRespuesta,
  SolicitudRespuesta,
  ViajeVista,
} from '../../../../core/models/viajes.models';
import { pasajeroError } from '../shared/pasajero-query';
import { segundosParaSalida } from '../../../../core/models/coordinacion.models';
import {
  CancelacionViajeResultado,
  CancelarViajeDialog,
} from './cancelar-viaje-dialog/cancelar-viaje-dialog';
import { UnirseViajeDialog } from './unirse-viaje-dialog/unirse-viaje-dialog';
import {
  CancelacionResultado,
  CancelarSolicitudDialog,
} from './cancelar-solicitud-dialog/cancelar-solicitud-dialog';
interface Recovery {
  solicitudes: readonly SolicitudRespuesta[];
  historicos: readonly SolicitudHistorialRespuesta[];
  totalPages: number;
}
@Component({
  selector: 'app-detalle-viaje',
  imports: [MatDialogModule, RouterLink, ReportesStatePanel],
  templateUrl: './detalle-viaje.html',
  styleUrl: './detalle-viaje.css',
})
export class DetalleViaje {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(SolicitudesPasajeroService);
  private readonly navigation = inject(ViajePasajeroContextoService);
  private readonly dialog = inject(MatDialog);
  private request?: Subscription;
  private closeDialog?: () => void;
  private navigationRevision = 0;
  private readonly context = signal<ContextoViaje | undefined>(undefined);
  private confirmedMutation?: SolicitudRespuesta;
  protected readonly id = signal<number | null>(null);
  protected readonly viaje = signal<ViajeVista | null>(null);
  protected readonly solicitud = signal<SolicitudRespuesta | null>(null);
  protected readonly historico = signal<SolicitudHistorialRespuesta | null>(null);
  protected readonly status = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly verified = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly labels = ETIQUETAS_SOLICITUD;
  protected readonly salida = salidaTexto;
  protected readonly readonlyHistory = computed(
    () => !!this.context()?.consulta?.historial || this.historico() !== null,
  );
  protected readonly canJoin = computed(
    () =>
      this.verified() &&
      !this.readonlyHistory() &&
      this.viaje()?.estado === 'PROGRAMADO' &&
      !['PENDIENTE', 'ACEPTADA'].includes(this.solicitud()?.estado ?? ''),
  );
  protected readonly canCancel = computed(
    () => this.verified() && !this.readonlyHistory() && this.solicitud()?.estado === 'PENDIENTE',
  );
  protected readonly canCancelTrip = computed(
    () =>
      this.verified() &&
      !this.readonlyHistory() &&
      this.solicitud()?.estado === 'ACEPTADA' &&
      (this.viaje()?.estado === null || this.viaje()?.estado === 'PROGRAMADO') &&
      !!this.viaje() &&
      segundosParaSalida(this.viaje()!) >= 0,
  );
  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((raw) => {
        this.navigationRevision++;
        this.closeDialog?.();
        this.request?.unsubscribe();
        const id = raw && /^\d+$/.test(raw) ? Number(raw) : NaN;
        this.id.set(Number.isSafeInteger(id) && id > 0 ? id : null);
        this.context.set(this.id() === null ? undefined : this.navigation.obtener(id));
        this.confirmedMutation = undefined;
        this.notice.set('');
        this.refresh();
      });
  }
  protected refresh(): void {
    this.request?.unsubscribe();
    this.verified.set(false);
    this.solicitud.set(null);
    this.historico.set(null);
    this.error.set('');
    const id = this.id();
    this.viaje.set(this.context()?.viaje ?? null);
    if (id === null) {
      this.status.set('missing');
      return;
    }
    this.status.set('loading');
    const source = this.context()?.consulta;
    const query: Observable<Recovery> = source?.historial
      ? this.service.historial(source.page, source.size).pipe(
          map((r) => ({
            solicitudes: r.solicitudes.content.map((h) => h.solicitud),
            historicos: r.solicitudes.content,
            totalPages: r.solicitudes.totalPages,
          })),
        )
      : this.service.listar(source?.estado, source?.page ?? 0, source?.size ?? 100).pipe(
          map((r) => ({
            solicitudes: r.solicitudes.content,
            historicos: [],
            totalPages: r.solicitudes.totalPages,
          })),
        );
    this.request = query.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const matches = response.solicitudes.filter((s) => s.viajeId === id);
        const found =
          this.context()?.consulta && this.context()!.solicitud
            ? matches.find((s) => s.id === this.context()!.solicitud!.id)
            : (matches.find((s) => s.estado === 'PENDIENTE' || s.estado === 'ACEPTADA') ??
              matches[0]);
        const current = found ?? this.confirmedMutation;
        const history = response.historicos.find((h) => h.solicitud.id === current?.id);
        this.solicitud.set(current ?? null);
        this.historico.set(history ?? null);
        if (current) {
          const old = this.context()?.viaje;
          this.viaje.set(
            old
              ? {
                  ...old,
                  origen: current.origen,
                  destino: current.destino,
                  fecha: current.fecha,
                  hora: current.hora,
                  dia: current.dia,
                  estado: history?.estadoViaje ?? old.estado,
                }
              : desdeSolicitud(current, history?.estadoViaje),
          );
        }
        this.verified.set(
          (!!found && (!!source || ['PENDIENTE', 'ACEPTADA'].includes(found.estado))) ||
            (!source && response.totalPages <= 1),
        );
        if (!this.verified())
          this.error.set(
            'No se pudo verificar la solicitud en esta página. Vuelve a Mis viajes para seleccionar el registro actualizado.',
          );
        this.status.set(this.viaje() ? 'ready' : 'missing');
      },
      error: (error) => {
        this.error.set(pasajeroError(error));
        this.status.set('error');
      },
    });
  }
  protected join(): void {
    if (!this.canJoin() || this.dialogOpen()) return;
    const ref = this.dialog.open<UnirseViajeDialog, { viaje: ViajeVista }, SolicitudRespuesta>(
      UnirseViajeDialog,
      { width: '608px', maxWidth: '96vw', panelClass: 'ur-dialog', data: { viaje: this.viaje()! } },
    );
    this.watch(ref, (result) => {
      if (result) {
        this.notice.set(
          'Solicitud registrada correctamente.' +
            (result.advertencia ? ' ' + result.advertencia : ''),
        );
        this.afterMutation(result);
      }
    });
  }
  protected cancelRequest(): void {
    if (!this.canCancel() || this.dialogOpen()) return;
    const ref = this.dialog.open<CancelarSolicitudDialog, SolicitudRespuesta, CancelacionResultado>(
      CancelarSolicitudDialog,
      { width: '608px', maxWidth: '96vw', data: this.solicitud()! },
    );
    this.watch(ref, (result) => {
      if (result?.solicitud || result?.refrescar) {
        if (result.solicitud) this.notice.set('Solicitud cancelada correctamente.');
        if (result.solicitud) this.afterMutation(result.solicitud);
        else this.refresh();
      }
    });
  }
  protected cancelTrip(): void {
    if (!this.canCancelTrip() || this.dialogOpen()) return;
    const solicitud = this.solicitud()!;
    const trip = this.viaje()!;
    const ref = this.dialog.open<CancelarViajeDialog, ViajeVista, CancelacionViajeResultado>(
      CancelarViajeDialog,
      { width: '608px', maxWidth: '96vw', data: trip },
    );
    this.watch(ref, (result) => {
      if (result?.viaje) {
        // El PUT devuelve el estado del viaje. La solicitud se vuelve a consultar;
        // no se simula su cancelación ni se conserva el filtro ACEPTADA de origen.
        this.context.set({
          viaje: { ...trip, estado: result.viaje.estado },
          solicitud,
          consulta: { historial: false, page: 0, size: 100 },
        });
        this.notice.set(result.viaje.mensaje || 'Viaje cancelado.');
        this.refresh();
      } else if (result?.refrescar) this.refresh();
    });
  }
  private afterMutation(solicitud: SolicitudRespuesta) {
    this.confirmedMutation = solicitud;
    this.context.set({
      viaje: this.viaje()!,
      solicitud,
      consulta: { historial: false, page: 0, size: 100 },
    });
    this.refresh();
  }
  private watch<C, R>(ref: MatDialogRef<C, R>, next: (result: R | undefined) => void) {
    const revision = this.navigationRevision;
    const close = () => ref.close();
    this.closeDialog = close;
    this.dialogOpen.set(true);
    const unregister = this.destroyRef.onDestroy(() => ref.close());
    ref
      .afterClosed()
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          unregister();
          if (this.closeDialog === close) this.closeDialog = undefined;
          this.dialogOpen.set(false);
        }),
      )
      .subscribe((result) => {
        if (revision === this.navigationRevision) next(result);
      });
  }
}
