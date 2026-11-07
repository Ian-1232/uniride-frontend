import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import {
  catchError,
  concatMap,
  defer,
  from,
  map,
  of,
  range,
  switchMap,
  tap,
  throwError,
  timeout,
  toArray,
} from 'rxjs';
import {
  ConflictoHorario,
  cursosSuperpuestos,
  RegistroParcial,
} from '../../pages/horarios/horarios-conflictos';
import { horariosError } from '../../pages/horarios/horarios-error';
import { environment } from '../../../environments/environment';
import {
  ArchivoRespuesta,
  CursoRequest,
  CursoRespuesta,
  CursosPagina,
} from '../models/horarios.models';

@Injectable({ providedIn: 'root' })
export class HorariosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/perfil`;
  listar(page = 0, size = 10) {
    return this.http
      .get<CursosPagina>(`${this.url}/cursos`, {
        params: new HttpParams().set('page', page).set('size', size),
      })
      .pipe(timeout(15000));
  }
  listarTodos() {
    return this.listar(0, 100).pipe(
      switchMap((first) => {
        if (!Number.isSafeInteger(first.totalPages) || first.totalPages < 0 || first.number !== 0)
          throw new Error('Página inválida');
        return range(1, Math.max(0, first.totalPages - 1)).pipe(
          concatMap((page) =>
            this.listar(page, 100).pipe(
              tap((next) => {
                if (
                  next.number !== page ||
                  next.totalPages !== first.totalPages ||
                  next.totalElements !== first.totalElements
                )
                  throw new Error('El horario cambió durante la consulta.');
              }),
            ),
          ),
          toArray(),
          map((pages) => {
            const cursos = [first, ...pages].flatMap((p) => p.content);
            if (
              cursos.length !== first.totalElements ||
              new Set(cursos.map((c) => c.id)).size !== cursos.length
            )
              throw new Error('No se pudo recuperar el horario completo');
            return cursos;
          }),
        );
      }),
    );
  }
  /** Each confirmed one-row POST is independent: a 409 must not roll back unrelated courses. */
  registrarParcial(cursos: readonly CursoRequest[]) {
    return defer(() => {
      const guardados: { indice: number; curso: CursoRespuesta }[] = [];
      const conflictos: (ConflictoHorario & { indice: number })[] = [];
      const fallos: { indice: number; mensaje: string }[] = [];
      const pendientes: number[] = [];
      let detener = false;
      return this.listarTodos().pipe(
        switchMap((actuales) => {
          let disponibles = [...actuales];
          return from(cursos.map((curso, indice) => ({ curso, indice }))).pipe(
            concatMap(({ curso, indice }) => {
              if (detener) {
                pendientes.push(indice);
                return of(null);
              }
              const existentes = cursosSuperpuestos(curso, disponibles);
              if (existentes.length) {
                conflictos.push({ indice, nuevo: curso, existentes });
                return of(null);
              }
              return this.registrar([curso]).pipe(
                tap((rows) => {
                  guardados.push({ indice, curso: rows[0] });
                  disponibles.push(...rows);
                }),
                map(() => null),
                catchError((error) => {
                  if (error instanceof HttpErrorResponse && error.status === 401)
                    return throwError(() => error);
                  if (
                    error instanceof HttpErrorResponse &&
                    error.status === 409 &&
                    typeof error.error?.mensaje === 'string' &&
                    error.error.mensaje.startsWith('Conflicto de horario: ')
                  ) {
                    const mensajeServidor: string = error.error.mensaje;
                    return this.listarTodos().pipe(
                      tap((fresh) => {
                        disponibles = [...fresh];
                        conflictos.push({
                          indice,
                          nuevo: curso,
                          existentes: cursosSuperpuestos(curso, fresh),
                          mensajeServidor,
                        });
                      }),
                      map(() => null),
                      catchError((error) => {
                        if (error instanceof HttpErrorResponse && error.status === 401)
                          return throwError(() => error);
                        conflictos.push({ indice, nuevo: curso, existentes: [], mensajeServidor });
                        detener = true;
                        return of(null);
                      }),
                    );
                  }
                  fallos.push({ indice, mensaje: horariosError(error) });
                  detener =
                    !(error instanceof HttpErrorResponse) ||
                    error.status === 0 ||
                    error.status === 401 ||
                    error.status === 403 ||
                    error.status >= 500;
                  return of(null);
                }),
              );
            }),
            toArray(),
            map((): RegistroParcial => ({ guardados, conflictos, fallos, pendientes })),
          );
        }),
      );
    });
  }
  registrar(cursos: readonly CursoRequest[]) {
    return this.http
      .post<readonly CursoRespuesta[]>(`${this.url}/cursos`, cursos, { observe: 'response' })
      .pipe(
        timeout(15000),
        map((response) => {
          if (
            response.status !== 201 ||
            !Array.isArray(response.body) ||
            response.body.length !== cursos.length ||
            !response.body.every((c) => Number.isSafeInteger(c.id) && c.id > 0)
          )
            throw new Error('No se pudo confirmar el registro');
          return response.body as readonly CursoRespuesta[];
        }),
      );
  }
  eliminar(id: number) {
    return this.http.delete<void>(`${this.url}/cursos/${id}`, { observe: 'response' }).pipe(
      timeout(15000),
      map((response) => {
        if (response.status !== 204) throw new Error('No se pudo confirmar la eliminación');
      }),
    );
  }
  importar(archivo: File) {
    const body = new FormData();
    body.append('archivo', archivo, archivo.name);
    // PDF extraction/OCR has a server-side 60 s processing limit. Allow its response to arrive.
    return this.http
      .post<ArchivoRespuesta>(`${this.url}/horarios/archivo`, body, { observe: 'response' })
      .pipe(
        timeout(120000),
        map((response) => {
          const result = response.body;
          if (
            response.status !== 201 ||
            !result ||
            typeof result.mensaje !== 'string' ||
            typeof result.nombreArchivo !== 'string' ||
            ![result.cursosImportados, result.cursosOmitidos].every(
              (n) => Number.isSafeInteger(n) && n >= 0,
            )
          )
            throw new Error('No se pudo confirmar la importación');
          return result;
        }),
      );
  }
}
