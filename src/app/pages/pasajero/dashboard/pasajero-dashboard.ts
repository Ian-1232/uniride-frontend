import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

export interface RutaSugerida {
  id: number;
  conductor: string;
  calificacion: number;
  origen: string;
  destino: string;
  hora: string;
  cupos: number;
  precio: number;
}

@Component({
  selector: 'app-pasajero-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './pasajero-dashboard.html',
  styleUrl: './pasajero-dashboard.css',
})
export class PasajeroDashboard {
  readonly viajeConfirmado = signal({
    id: 1,
    conductor: 'Rodrigo Morales',
    carrera: 'Ing. Civil (8vo ciclo)',
    calificacion: 4.9,
    viajesConductor: 42,
    auto: 'Nissan Versa Azul Marino',
    placa: 'B7X-412',
    origen: 'Óvalo Higuereta (Frente a Metro)',
    destino: 'UPC Campus Monterrico (Puerta 2)',
    horaSalida: '07:20 AM',
    horaLlegada: '07:55 AM',
    minutosParaSalida: 35,
    asientoAsignado: '#2 (Ventana Trasera)',
    contribucion: 5.0,
    metodoPago: 'Yape',
    estado: 'CONFIRMADO',
  });

  readonly metricas = signal({
    ahorroTotal: 380.0,
    viajesRealizados: 24,
    co2EvitadoKg: 42.6,
    puntualidadPorcentaje: 100,
  });

  readonly rutasSugeridas = signal<RutaSugerida[]>([
    {
      id: 201,
      conductor: 'Andrea Paredes',
      calificacion: 4.9,
      origen: 'Miraflores',
      destino: 'UPC Monterrico',
      hora: '07:15 AM',
      cupos: 2,
      precio: 6.0,
    },
    {
      id: 202,
      conductor: 'Diego Alarcón',
      calificacion: 4.8,
      origen: 'San Borja Sur',
      destino: 'UPC Monterrico',
      hora: '07:25 AM',
      cupos: 1,
      precio: 4.5,
    },
    {
      id: 203,
      conductor: 'Valeria Castro',
      calificacion: 5.0,
      origen: 'Surquillo',
      destino: 'UPC Monterrico',
      hora: '07:30 AM',
      cupos: 3,
      precio: 5.0,
    },
  ]);

  readonly feedbackMensaje = signal<string | null>(null);

  solicitarCupo(ruta: RutaSugerida): void {
    this.rutasSugeridas.update((rutas) =>
      rutas.map((r) => (r.id === ruta.id ? { ...r, cupos: r.cupos - 1 } : r)),
    );
    this.feedbackMensaje.set(
      `✓ Solicitud de cupo enviada a ${ruta.conductor}. Recibirás notificación cuando acepte.`,
    );
  }

  cancelarViaje(): void {
    this.feedbackMensaje.set(
      'Has solicitado la cancelación del viaje con Rodrigo Morales sin penalidad (> 24 h).',
    );
  }

  cerrarFeedback(): void {
    this.feedbackMensaje.set(null);
  }
}
