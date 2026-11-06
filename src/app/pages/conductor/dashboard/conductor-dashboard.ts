import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-conductor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './conductor-dashboard.html',
  styleUrl: './conductor-dashboard.css',
})
export class ConductorDashboard {
  // Estado reactivo con Signals
  readonly vehiculo = signal({
    modelo: 'Toyota Yaris 2022',
    color: 'Gris Metálico',
    placa: 'ABC-123',
    capacidadMaxima: 4,
  });

  readonly viajeHoy = signal({
    id: 1,
    origen: 'Av. Javier Prado Este (San Borja)',
    destino: 'UPC Campus Monterrico (Puerta 2)',
    horaSalida: '07:15 AM',
    duracionEstimada: '35 min',
    estado: 'PROGRAMADO',
    trafico: 'Fluido',
  });

  readonly pasajerosConfirmados = signal<string[]>([
    'María López',
    'Carlos Gómez',
    'Sofía Morales',
  ]);

  readonly metricas = signal({
    viajesCompletados: 18,
    compensacionTotal: 142.5,
    co2EvitadoKg: 38.4,
    penalidades: 0,
    calificacionPromedio: 4.95,
  });

  readonly frecuenciaSemana = signal([
    { dia: 'Lun', cantidad: 4, alturaPx: 90, esPico: false },
    { dia: 'Mar', cantidad: 2, alturaPx: 45, esPico: false },
    { dia: 'Mié', cantidad: 5, alturaPx: 110, esPico: true },
    { dia: 'Jue', cantidad: 4, alturaPx: 90, esPico: false },
    { dia: 'Vie', cantidad: 3, alturaPx: 70, esPico: false },
  ]);

  // Mensaje de notificación o feedback
  readonly feedbackMensaje = signal<string | null>(null);

  // Computados
  readonly cuposOcupados = computed(() => this.pasajerosConfirmados().length);
  readonly cuposLibres = computed(() => this.vehiculo().capacidadMaxima - this.cuposOcupados());
  readonly tieneCupoLibre = computed(() => this.cuposLibres() > 0);

  cerrarFeedback(): void {
    this.feedbackMensaje.set(null);
  }
}
