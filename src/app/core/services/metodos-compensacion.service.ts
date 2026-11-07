import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EliminacionMetodoResponse,
  MetodoCompensacionRequest,
  MetodoCompensacionResponse,
} from '../models/compensaciones.models';

@Injectable({ providedIn: 'root' })
export class MetodosCompensacionService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/metodos-compensacion`;
  listar() {
    return this.http.get<readonly MetodoCompensacionResponse[]>(this.url).pipe(timeout(15000));
  }
  registrar(request: MetodoCompensacionRequest) {
    return this.http.post<MetodoCompensacionResponse>(this.url, request).pipe(timeout(15000));
  }
  actualizar(id: number, request: MetodoCompensacionRequest) {
    return this.http
      .put<MetodoCompensacionResponse>(`${this.url}/${id}`, request)
      .pipe(timeout(15000));
  }
  eliminar(id: number) {
    return this.http.delete<EliminacionMetodoResponse>(`${this.url}/${id}`).pipe(timeout(15000));
  }
}
