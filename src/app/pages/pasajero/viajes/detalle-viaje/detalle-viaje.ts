import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { UnirseViajeDialog } from './unirse-viaje-dialog/unirse-viaje-dialog';
import {
  accionViaje,
  asientosDetalle,
  badgeDetalle,
  salidaTexto,
  solicitudDe,
  SOLICITUDES,
  TipoCompensacion,
  Viaje,
  VIAJES,
} from '../viajes.models';

@Component({
  selector: 'app-detalle-viaje',
  imports: [MatDialogModule],
  templateUrl: './detalle-viaje.html',
  styleUrl: './detalle-viaje.css',
})
export class DetalleViaje {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly viaje = computed(() => {
    const id = Number(this.params().get('id'));
    return VIAJES().find((viaje) => viaje.id === id);
  });
  protected readonly solicitud = computed(() => solicitudDe(SOLICITUDES(), this.viaje()?.id ?? -1));
  protected readonly accion = computed(() => {
    const viaje = this.viaje();
    return viaje ? accionViaje(viaje, this.solicitud()) : null;
  });
  protected readonly subtitulo = computed(() => {
    switch (this.accion()) {
      case 'cancelar-solicitud':
        return 'Gestiona tu solicitud para este viaje.';
      case 'cancelar-viaje':
        return 'Consulta los detalles de tu viaje confirmado y gestiona cualquier imprevisto.';
      default:
        return 'Revisa la información del viaje antes de solicitar unirte.';
    }
  });
  protected readonly seccion = computed(() =>
    this.accion() === 'unirse' ? 'Buscar viaje' : 'Mis viajes',
  );

  // Helpers expuestos para usarlos en la plantilla.
  protected readonly accionViaje = accionViaje;
  protected readonly asientosDetalle = asientosDetalle;
  protected readonly badgeDetalle = badgeDetalle;
  protected readonly salidaTexto = salidaTexto;

  protected abrirDialogo(viaje: Viaje): void {
    this.dialog
      .open(UnirseViajeDialog, {
        width: '608px',
        maxWidth: '96vw',
        panelClass: 'ur-dialog',
        data: { viaje },
      })
      .afterClosed()
      .subscribe((resultado: { preferencia: TipoCompensacion } | undefined) => {
        if (resultado) {
          SOLICITUDES.update((solicitudes) => [
            ...solicitudes.filter((solicitud) => solicitud.viajeId !== viaje.id),
            { viajeId: viaje.id, estado: 'PENDIENTE' },
          ]);
        }
      });
  }

  protected cancelarSolicitud(viaje: Viaje): void {
    SOLICITUDES.update((solicitudes) =>
      solicitudes.map((solicitud) =>
        solicitud.viajeId === viaje.id ? { ...solicitud, estado: 'CANCELADA' as const } : solicitud,
      ),
    );
  }

  protected cancelarViaje(viaje: Viaje): void {
    VIAJES.update((viajes) =>
      viajes.map((item) =>
        item.id === viaje.id ? { ...item, estado: 'CANCELADO' as const } : item,
      ),
    );
  }

  protected volver(): void {
    void this.router.navigate(['/viajes']);
  }
}
