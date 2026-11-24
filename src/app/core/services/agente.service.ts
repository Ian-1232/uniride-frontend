import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatRespuesta, ChatSolicitud, ConfirmacionResumen } from '../models/agente.models';

@Injectable({ providedIn: 'root' })
export class AgenteService {
  private readonly http = inject(HttpClient);

  chat(message: string, conversationId?: string | null): Observable<ChatRespuesta> {
    const body: ChatSolicitud = conversationId ? { message, conversationId } : { message };
    return this.http
      .post<ChatRespuesta>(`${environment.apiUrl}/agent/chat`, body)
      .pipe(timeout(90000));
  }

  confirmacion(id: string): Observable<ConfirmacionResumen> {
    return this.http
      .get<ConfirmacionResumen>(
        `${environment.apiUrl}/agent/confirmaciones/${encodeURIComponent(id)}`,
      )
      .pipe(timeout(15000));
  }

  decidir(id: string, confirmar: boolean): Observable<ConfirmacionResumen> {
    const accion = confirmar ? 'confirmar' : 'cancelar';
    return this.http
      .post<ConfirmacionResumen>(
        `${environment.apiUrl}/agent/confirmaciones/${encodeURIComponent(id)}/${accion}`,
        null,
      )
      .pipe(timeout(15000));
  }
}
