import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ViajeCard } from '../shared/viaje-card/viaje-card';
import { SOLICITUDES, viajesDeSolicitud, Viaje, VIAJES } from '../viajes.models';

@Component({
  selector: 'app-mis-viajes',
  imports: [RouterLink, ViajeCard],
  templateUrl: './mis-viajes.html',
  styleUrl: './mis-viajes.css',
})
export class MisViajes {
  private readonly router = inject(Router);

  protected readonly confirmados = computed(() =>
    viajesDeSolicitud(SOLICITUDES(), VIAJES(), 'ACEPTADA'),
  );
  protected readonly pendientes = computed(() =>
    viajesDeSolicitud(SOLICITUDES(), VIAJES(), 'PENDIENTE'),
  );

  protected verDetalle(viaje: Viaje): void {
    void this.router.navigate(['/viajes', viaje.id]);
  }
}
