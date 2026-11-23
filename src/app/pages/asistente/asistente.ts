import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  AdvertenciaAgente,
  ChatRespuesta,
  ConfirmacionResumen,
  ErrorRespuesta,
  EstadoResolucion,
  MetodoCompensacionResumen,
  ResultadoAgente,
  RutaResumen,
  ViajeResumen,
} from '../../core/models/agente.models';
import { AgenteService } from '../../core/services/agente.service';
import { AgenteVozService } from '../../core/services/agente-voz.service';
import { AuthService } from '../../core/services/auth.service';

const MIN_AUDIO_BYTES = 1024;

interface Paginacion {
  readonly pagina: number;
  readonly total: number;
  readonly mostrados: number;
  readonly hayMas: boolean;
}

interface MensajeChat {
  readonly id: number;
  readonly autor: 'usuario' | 'asistente';
  readonly texto: string;
  readonly hora: string;
  readonly advertencia: AdvertenciaAgente | null;
  readonly confirmacion: ConfirmacionResumen | null;
  readonly viajes: readonly ViajeResumen[];
  readonly rutas: readonly RutaResumen[];
  readonly metodos: readonly MetodoCompensacionResumen[];
  readonly detalleOperacion: string | null;
  readonly tonoOperacion: string | null;
  readonly paginacion: Paginacion | null;
  readonly resolucion: EstadoResolucion | null;
  readonly decisionEnviada: boolean;
}

interface OpcionesMensaje {
  readonly advertencia?: AdvertenciaAgente | null;
  readonly confirmacion?: ConfirmacionResumen | null;
  readonly viajes?: readonly ViajeResumen[];
  readonly rutas?: readonly RutaResumen[];
  readonly metodos?: readonly MetodoCompensacionResumen[];
  readonly detalleOperacion?: string | null;
  readonly tonoOperacion?: string | null;
  readonly paginacion?: Paginacion | null;
}

function leerPaginacion(resultados: readonly ResultadoAgente[]): Paginacion | null {
  for (const resultado of resultados) {
    const datos = resultado.datos;
    if (!datos || typeof datos !== 'object') continue;
    const item = datos as { total?: unknown; hayMas?: unknown; pagina?: unknown; items?: unknown };
    if (
      typeof item.total === 'number' &&
      typeof item.hayMas === 'boolean' &&
      Array.isArray(item.items)
    ) {
      return {
        pagina: typeof item.pagina === 'number' ? item.pagina : 0,
        total: item.total,
        mostrados: item.items.length,
        hayMas: item.hayMas,
      };
    }
  }
  return null;
}

@Component({
  selector: 'app-asistente',
  imports: [ReactiveFormsModule],
  templateUrl: './asistente.html',
  styleUrl: './asistente.css',
})
export class Asistente {
  private readonly agente = inject(AgenteService);
  protected readonly voz = inject(AgenteVozService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly mensaje = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(1000)],
  });
  protected readonly mensajes = signal<readonly MensajeChat[]>([]);
  protected readonly conversacionId = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly consultando = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly pendiente = signal<string | null>(null);
  protected readonly grabando = signal(false);
  protected readonly solicitandoPermiso = signal(false);
  protected readonly transcribiendo = signal(false);
  protected readonly duracion = signal(0);
  protected readonly vozError = signal<string | null>(null);
  protected readonly ocupado = computed(() => this.enviando() || this.transcribiendo());
  protected readonly nombre = computed(() => this.auth.currentUser()?.nombre ?? '');
  protected readonly sugerencias = computed(() =>
    this.auth.isConductor()
      ? [
          '¿Cuáles son mis rutas?',
          '¿Cuáles son mis viajes programados?',
          '¿Cuántos viajes he completado?',
          '¿Cómo funciona la compensación?',
        ]
      : [
          'Busca viajes para el lunes',
          '¿Cuáles son mis solicitudes?',
          '¿Cuántos viajes he completado?',
          '¿Cómo funciona la compensación?',
        ],
  );

  private readonly lista = viewChild<ElementRef<HTMLElement>>('lista');
  private readonly entrada = viewChild<ElementRef<HTMLTextAreaElement>>('entrada');
  private secuencia = 0;
  private cronometro: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.detenerCronometro());
  }

  protected enviar(): void {
    const texto = this.mensaje.value.trim();
    if (!texto || this.ocupado() || this.mensaje.invalid) return;
    this.mensaje.setValue('');
    this.intentar(texto, true);
  }

  protected enviarDesdeFormulario(event: Event): void {
    event.preventDefault();
    this.enviar();
  }

  protected sugerir(texto: string): void {
    if (this.ocupado()) return;
    this.intentar(texto, true);
    this.entrada()?.nativeElement.focus();
  }

  protected reintentar(): void {
    const texto = this.pendiente();
    if (texto && !this.ocupado()) this.intentar(texto, false);
  }

  protected nuevaConversacion(): void {
    if (this.ocupado()) return;
    this.cancelarVoz();
    this.voz.detenerVoz();
    this.mensajes.set([]);
    this.conversacionId.set(null);
    this.error.set(null);
    this.pendiente.set(null);
    this.vozError.set(null);
    this.mensaje.setValue('');
    this.entrada()?.nativeElement.focus();
  }

  protected alPresionarEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.enviar();
    }
  }

  protected decidir(mensaje: MensajeChat, confirmar: boolean): void {
    if (this.ocupado() || mensaje.decisionEnviada) return;
    this.intentar(confirmar ? 'Sí, confirmo' : 'No, gracias', true);
  }

  protected alternarMicrofono(): void {
    if (this.ocupado() || this.solicitandoPermiso()) return;
    if (this.grabando()) {
      void this.detenerYEnviarVoz();
      return;
    }
    void this.empezarGrabacion();
  }

  protected cancelarVoz(): void {
    this.voz.cancelar();
    this.grabando.set(false);
    this.duracion.set(0);
    this.detenerCronometro();
  }

  protected alternarVozAlta(): void {
    this.voz.alternarVozAlta();
  }

  protected duracionTexto(): string {
    const segundos = this.duracion();
    return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
  }

  private async empezarGrabacion(): Promise<void> {
    this.voz.detenerVoz();
    this.error.set(null);
    this.vozError.set(null);
    this.solicitandoPermiso.set(true);
    try {
      await this.voz.iniciar(() => void this.detenerYEnviarVoz());
      this.grabando.set(true);
      this.duracion.set(0);
      this.iniciarCronometro();
    } catch (error) {
      this.vozError.set(this.mensajeErrorMicrofono(error));
    } finally {
      this.solicitandoPermiso.set(false);
    }
  }

  private async detenerYEnviarVoz(): Promise<void> {
    if (!this.grabando()) return;
    this.grabando.set(false);
    this.detenerCronometro();
    const audio = await this.voz.detener();
    if (!audio || audio.size < MIN_AUDIO_BYTES) {
      this.vozError.set('No se grabó nada. Intenta de nuevo.');
      return;
    }
    this.enviarVoz(audio);
  }

  private enviarVoz(audio: Blob): void {
    this.transcribiendo.set(true);
    this.error.set(null);
    this.vozError.set(null);
    this.pendiente.set(null);
    this.voz
      .enviar(audio, this.conversacionId())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.transcribiendo.set(false)),
      )
      .subscribe({
        next: (voz) => {
          this.agregar('usuario', voz.transcripcion?.trim() || 'Mensaje de voz');
          this.mostrarRespuesta(voz.respuesta);
          this.voz.hablar(voz.textoHablado?.trim() || voz.respuesta.message);
        },
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 404 || this.codigoError(error) === 'CONVERSATION_ROLE_CHANGED')
          ) {
            this.conversacionId.set(null);
          }
          this.vozError.set(this.mensajeErrorVoz(error));
          this.scroll();
        },
      });
  }

  private iniciarCronometro(): void {
    this.detenerCronometro();
    this.cronometro = setInterval(() => this.duracion.update((segundos) => segundos + 1), 1000);
  }

  private detenerCronometro(): void {
    if (this.cronometro) clearInterval(this.cronometro);
    this.cronometro = null;
  }

  protected consultarEstado(id: string): void {
    if (this.consultando()) return;
    this.consultando.set(id);
    this.agente
      .confirmacion(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.consultando.set(null)),
      )
      .subscribe({
        next: (confirmacion) =>
          this.agregar(
            'asistente',
            `Estado de la confirmación: ${this.etiquetaResolucion(confirmacion.estado)}. ${confirmacion.resumen}`,
          ),
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 410) {
            this.agregar('asistente', 'La confirmación expiró y no se ejecutó.');
            return;
          }
          this.error.set(this.mensajeError(error));
        },
      });
  }

  protected siguientePagina(): void {
    if (!this.ocupado()) this.intentar('Muéstrame la página siguiente', true);
  }

  protected horaCaduca(expira: string): string {
    const fecha = new Date(expira);
    if (Number.isNaN(fecha.getTime())) return 'unos minutos';
    return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(fecha);
  }

  protected horaCorta(hora: string | null): string {
    return hora ? hora.slice(0, 5) : '';
  }

  protected metaViaje(viaje: ViajeResumen): string {
    return [viaje.dia, viaje.fecha, this.horaCorta(viaje.hora)].filter(Boolean).join(' · ');
  }

  private tonoEstadoOperacion(estado: string): string {
    switch (estado) {
      case 'EXITO':
        return 'success';
      case 'ERROR':
        return 'danger';
      case 'DATOS_FALTANTES':
      case 'AMBIGUO':
      case 'NO_ENCONTRADO':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  protected etiquetaRuta(estado: string): string {
    switch (estado) {
      case 'ACTIVA':
        return 'Activa';
      case 'LLENA':
        return 'Llena';
      case 'VENCIDA':
        return 'Vencida';
      case 'ELIMINADA':
        return 'Eliminada';
      default:
        return estado;
    }
  }

  protected tonoRuta(estado: string): string {
    switch (estado) {
      case 'ACTIVA':
        return 'success';
      case 'LLENA':
        return 'info';
      case 'VENCIDA':
        return 'warning';
      case 'ELIMINADA':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  protected estadoVisible(viaje: ViajeResumen): string | null {
    return viaje.estadoSolicitud ?? viaje.estado;
  }

  protected etiquetaViaje(estado: string): string {
    switch (estado) {
      case 'PROGRAMADO':
        return 'Programado';
      case 'EN_PROGRESO':
        return 'En progreso';
      case 'COMPLETADO':
        return 'Completado';
      case 'CANCELADO':
        return 'Cancelado';
      case 'VENCIDO':
        return 'Vencido';
      case 'PENDIENTE':
        return 'Pendiente';
      case 'ACEPTADA':
        return 'Aceptada';
      case 'RECHAZADA':
        return 'Rechazada';
      case 'CANCELADA':
        return 'Cancelada';
      default:
        return estado;
    }
  }

  protected tonoViaje(estado: string): string {
    switch (estado) {
      case 'PROGRAMADO':
      case 'EN_PROGRESO':
        return 'info';
      case 'COMPLETADO':
      case 'ACEPTADA':
        return 'success';
      case 'PENDIENTE':
      case 'VENCIDO':
        return 'warning';
      case 'CANCELADO':
      case 'RECHAZADA':
      case 'CANCELADA':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  protected etiquetaTipo(tipo: string): string {
    switch (tipo) {
      case 'DINERO':
        return 'Dinero';
      case 'GASOLINA':
        return 'Gasolina';
      case 'FAVOR':
        return 'Favor';
      default:
        return tipo;
    }
  }

  protected etiquetaResolucion(estado: string): string {
    switch (estado) {
      case 'EJECUTADA':
        return 'Ejecutada';
      case 'CANCELADA':
        return 'Cancelada';
      case 'EXPIRADA':
        return 'Expirada';
      case 'YA_EJECUTADA':
        return 'Ya ejecutada';
      case 'YA_CANCELADA':
        return 'Ya cancelada';
      case 'RECHAZADA':
        return 'Rechazada';
      case 'SIN_PENDIENTE':
        return 'Sin propuesta pendiente';
      case 'ACLARACION_REQUERIDA':
        return 'Aclaración requerida';
      case 'RESULTADO_INCIERTO':
        return 'Resultado incierto';
      case 'PENDIENTE':
        return 'Pendiente';
      default:
        return estado;
    }
  }

  private intentar(texto: string, mostrarUsuario: boolean): void {
    this.voz.detenerVoz();
    this.enviando.set(true);
    this.error.set(null);
    this.vozError.set(null);
    this.pendiente.set(null);
    if (mostrarUsuario) this.agregar('usuario', texto);

    this.agente
      .chat(texto, this.conversacionId())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: (respuesta) => this.mostrarRespuesta(respuesta),
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 404 || this.codigoError(error) === 'CONVERSATION_ROLE_CHANGED')
          ) {
            this.conversacionId.set(null);
          }
          this.error.set(this.mensajeError(error));
          this.pendiente.set(texto);
          this.scroll();
        },
      });
  }

  private mostrarRespuesta(respuesta: ChatRespuesta): void {
    if (respuesta.conversationId) this.conversacionId.set(respuesta.conversationId);
    this.aplicarResolucion(respuesta);
    const operacion = respuesta.operacion;
    const confirmacion =
      operacion?.estado === 'CONFIRMACION_REQUERIDA' &&
      operacion.confirmacion?.estado === 'PENDIENTE'
        ? operacion.confirmacion
        : null;
    const detalleOperacion =
      operacion?.detalle && !confirmacion && operacion.detalle !== respuesta.message
        ? operacion.detalle
        : null;
    const tonoOperacion =
      detalleOperacion && operacion ? this.tonoEstadoOperacion(operacion.estado) : null;
    this.agregar(
      'asistente',
      respuesta.message?.trim() || 'El asistente no devolvió una respuesta.',
      {
        advertencia: respuesta.advertencia ?? null,
        confirmacion,
        viajes: respuesta.viajes ?? [],
        rutas: respuesta.rutas ?? [],
        metodos: respuesta.metodosCompensacion ?? [],
        detalleOperacion,
        tonoOperacion,
        paginacion: leerPaginacion(respuesta.resultados ?? []),
      },
    );
  }

  private agregar(
    autor: MensajeChat['autor'],
    texto: string,
    opciones: OpcionesMensaje = {},
  ): void {
    const hora = new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
    this.mensajes.update((lista) => [
      ...lista,
      {
        id: ++this.secuencia,
        autor,
        texto,
        hora,
        advertencia: opciones.advertencia ?? null,
        confirmacion: opciones.confirmacion ?? null,
        viajes: opciones.viajes ?? [],
        rutas: opciones.rutas ?? [],
        metodos: opciones.metodos ?? [],
        detalleOperacion: opciones.detalleOperacion ?? null,
        tonoOperacion: opciones.tonoOperacion ?? null,
        paginacion: opciones.paginacion ?? null,
        resolucion: null,
        decisionEnviada: false,
      },
    ]);
    this.scroll();
  }

  /** Una decisión escrita («sí») también actualiza la tarjeta ya mostrada. */
  private aplicarResolucion(respuesta: ChatRespuesta): void {
    const resolucion = respuesta.resolucionConfirmacion;
    if (!resolucion) return;
    this.mensajes.update((lista) => {
      const id = resolucion.confirmacion?.id;
      let objetivo = -1;
      if (id) {
        for (let i = lista.length - 1; i >= 0; i--) {
          if (lista[i].confirmacion?.id === id) {
            objetivo = i;
            break;
          }
        }
      }
      if (objetivo < 0) {
        for (let i = lista.length - 1; i >= 0; i--) {
          if (lista[i].confirmacion && !lista[i].resolucion) {
            objetivo = i;
            break;
          }
        }
      }
      if (objetivo < 0) return lista;
      return lista.map((mensaje, indice) =>
        indice === objetivo
          ? { ...mensaje, decisionEnviada: true, resolucion: resolucion.estado }
          : mensaje,
      );
    });
  }

  private scroll(): void {
    setTimeout(() => {
      const lista = this.lista()?.nativeElement;
      if (lista) lista.scrollTop = lista.scrollHeight;
    });
  }

  private codigoError(error: HttpErrorResponse): string | null {
    const cuerpo =
      error.error && typeof error.error === 'object'
        ? (error.error as Partial<ErrorRespuesta>)
        : null;
    return cuerpo?.campos?.['codigo'] ?? null;
  }

  private detalleError(error: HttpErrorResponse): string | null {
    if (!error.error || typeof error.error !== 'object') return null;
    const cuerpo = error.error as Partial<ErrorRespuesta>;
    return typeof cuerpo.mensaje === 'string' ? cuerpo.mensaje : null;
  }

  private mensajeErrorMicrofono(error: unknown): string {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
        case 'SecurityError':
          return 'Permiso de micrófono denegado. Puedes escribir tu consulta.';
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          return 'No se encontró un micrófono. Usa el chat de texto.';
      }
    }
    if (
      error instanceof Error &&
      (error.message === 'sin-soporte' || error.message === 'formato')
    ) {
      return 'Este navegador no permite grabar audio. Usa el chat de texto.';
    }
    return 'No se pudo iniciar la grabación. Revisa tu micrófono o escribe tu consulta.';
  }

  private mensajeErrorVoz(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo procesar la voz. Intenta de nuevo o escribe tu consulta.';
    }
    const detalle = this.detalleError(error);
    switch (this.codigoError(error)) {
      case 'VOICE_INVALID_AUDIO':
        return 'No se grabó nada. Intenta de nuevo.';
      case 'VOICE_NOT_UNDERSTOOD':
        return 'No te entendí. Repite la pregunta.';
      case 'SENSITIVE_MESSAGE':
        return 'Retira contraseñas o claves de tu consulta.';
      case 'INVALID_MESSAGE':
        return 'Tu pregunta es demasiado larga. Intenta con algo más corto.';
      case 'VOICE_TOO_LARGE':
        return 'La grabación es demasiado larga. Intenta con menos de 30 segundos.';
      case 'VOICE_UNSUPPORTED_FORMAT':
        return 'Este navegador no puede enviar audio válido. Usa el chat de texto.';
      case 'PROVIDER_RATE_LIMIT':
        return 'El servicio de voz recibió demasiadas solicitudes. Espera un momento o escribe.';
      case 'PROVIDER_REJECTED':
        return 'No se pudo transcribir el audio. Intenta de nuevo.';
      case 'PROVIDER_TIMEOUT':
      case 'PROVIDER_UNAVAILABLE':
      case 'VOICE_UNAVAILABLE':
        return 'El servicio de voz no está disponible. Intenta de nuevo o usa el chat de texto.';
      case 'CONVERSATION_NOT_FOUND':
        return 'La conversación expiró. Tu próximo mensaje inicia una nueva.';
      case 'CONVERSATION_BUSY':
        return 'La conversación está procesando otro mensaje. Intenta de nuevo en unos segundos.';
      case 'CONVERSATION_ROLE_CHANGED':
        return 'Cambió tu rol activo. Inicia una nueva conversación.';
      case 'CONVERSATION_LIMIT':
        return 'Alcanzaste el límite de conversaciones. Espera un momento o inicia otra.';
      case 'CONFIRMATION_RESULT_UNCERTAIN':
        return 'No se pudo verificar el resultado. Consulta el estado de la confirmación antes de reintentar.';
    }
    if (error.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    if (error.status === 403) {
      return detalle ?? 'Tu sesión no permite usar la voz. Escribe tu consulta.';
    }
    if (error.status === 0) return 'No se pudo conectar con el asistente. Revisa tu conexión.';
    return detalle ?? 'No se pudo procesar la voz. Intenta de nuevo o escribe tu consulta.';
  }

  private mensajeError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'El asistente tardó demasiado en responder. Intenta de nuevo.';
    }
    const detalle = this.detalleError(error);
    const codigo = this.codigoError(error);
    switch (codigo) {
      case 'CONVERSATION_NOT_FOUND':
        return 'La conversación expiró. Escribe de nuevo para iniciar otra.';
      case 'CONVERSATION_BUSY':
        return 'La conversación está procesando otro mensaje. Intenta de nuevo en unos segundos.';
      case 'CONVERSATION_ROLE_CHANGED':
        return 'Cambió tu rol activo. Inicia una nueva conversación.';
      case 'CONVERSATION_LIMIT':
        return 'Alcanzaste el límite de conversaciones. Espera un momento o inicia otra.';
      case 'CONFIRMATION_RESULT_UNCERTAIN':
        return 'No se pudo verificar el resultado. Consulta el estado de la confirmación antes de reintentar.';
    }
    switch (error.status) {
      case 400:
        return detalle ?? 'El mensaje no es válido.';
      case 401:
        return 'Tu sesión expiró. Vuelve a iniciar sesión.';
      case 403:
        return detalle ?? 'Tu sesión no es válida o tu rol actual no permite esa consulta.';
      case 404:
        return 'La conversación expiró. Escribe de nuevo para iniciar otra.';
      case 409:
        return (
          detalle ??
          'La conversación está ocupada o cambió tu rol. Intenta de nuevo o inicia una nueva conversación.'
        );
      case 429:
        return detalle ?? 'El asistente recibió demasiadas solicitudes. Espera un momento.';
      case 502:
      case 503:
      case 504:
        return detalle ?? 'El asistente no está disponible en este momento. Intenta de nuevo.';
      case 0:
        return 'No se pudo conectar con el asistente. Revisa tu conexión.';
      default:
        return 'No se pudo completar la consulta. Intenta de nuevo.';
    }
  }
}
