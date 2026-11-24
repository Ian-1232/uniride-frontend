import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';
import {
  EnvioAclaracion,
  EspecificacionAclaracion,
  ValoresAclaracion,
  esEstructurada,
} from '../../core/models/aclaracion.models';
import { esUuidAgente } from '../../core/models/aclaracion-validacion';
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
import {
  AclaracionFormularioService,
  LIMITE_MENSAJE_AGENTE,
} from '../../core/services/aclaracion-formulario.service';
import { FormularioAclaracionComponent } from '../../shared/formulario-aclaracion/formulario-aclaracion';

const MIN_AUDIO_BYTES = 1024;

type ResolucionTarjeta = EstadoResolucion | 'PENDIENTE_ANTERIOR';

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
  readonly resolucion: ResolucionTarjeta | null;
  readonly datosEnviados: boolean;
}

interface AclaracionActiva {
  readonly mensajeId: number;
  readonly conversacionId: string;
  readonly especificacion: EspecificacionAclaracion;
  readonly sesion: string;
  readonly incierta?: boolean;
  readonly oculta?: boolean;
  readonly corregir?: boolean;
}

interface ConfirmacionActiva {
  readonly id: string;
  readonly mensajeId: number;
  readonly conversacionId: string;
  readonly expira: string;
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
  imports: [ReactiveFormsModule, FormularioAclaracionComponent],
  templateUrl: './asistente.html',
  styleUrl: './asistente.css',
})
export class Asistente {
  private readonly agente = inject(AgenteService);
  protected readonly voz = inject(AgenteVozService);
  private readonly auth = inject(AuthService);
  private readonly formularios = inject(AclaracionFormularioService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly mensaje = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(LIMITE_MENSAJE_AGENTE)],
  });
  protected readonly mensajes = signal<readonly MensajeChat[]>([]);
  protected readonly conversacionId = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly enviandoDatos = signal(false);
  protected readonly aclaracionActiva = signal<AclaracionActiva | null>(null);
  protected readonly consultando = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly pendiente = signal<EnvioAclaracion | null>(null);
  private readonly confirmacionActiva = signal<ConfirmacionActiva | null>(null);
  private readonly caducadaLocalmente = signal<string | null>(null);
  protected readonly decidiendo = signal(false);
  protected readonly grabando = signal(false);
  protected readonly solicitandoPermiso = signal(false);
  protected readonly transcribiendo = signal(false);
  protected readonly duracion = signal(0);
  protected readonly vozError = signal<string | null>(null);
  protected readonly chatProcesando = computed(
    () => this.enviando() || this.transcribiendo() || this.decidiendo() || !!this.consultando(),
  );
  protected readonly ocupado = computed(
    () =>
      this.chatProcesando() ||
      this.auth.changingRole() ||
      this.solicitandoPermiso() ||
      this.grabando(),
  );
  protected readonly estadoAsistente = computed(() => {
    if (this.enviandoDatos()) return 'Enviando datos…';
    if (this.decidiendo()) return 'Resolviendo confirmación…';
    if (this.consultando()) return 'Consultando confirmación…';
    if (this.transcribiendo()) return 'Procesando mensaje de voz…';
    if (this.enviando()) return 'Preparando respuesta…';
    if (this.error() || this.vozError()) return 'Necesita atención';
    const ultimo = this.mensajes()
      .filter(({ autor }) => autor === 'asistente')
      .at(-1);
    if (ultimo && this.estadoTarjeta(ultimo) === 'PENDIENTE') return 'Esperando confirmación';
    if (this.aclaracionActiva() && !this.aclaracionActiva()?.incierta) return 'Esperando datos';
    if (ultimo?.advertencia || ultimo?.tonoOperacion === 'danger') return 'Necesita atención';
    return 'En línea';
  });
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
  private readonly contextoSesion = computed(
    () =>
      `${this.auth.sessionVersion()}:${this.auth.currentUser()?.id ?? ''}:${this.auth.currentRole() ?? ''}`,
  );
  private contextoActual = this.contextoSesion();
  private readonly cambioContexto = new Subject<void>();
  private secuencia = 0;
  private generacion = 0;
  private usaAclaracionesV1 = false;
  private cronometro: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cancelarVoz();
      this.voz.detenerVoz();
    });
    effect(() => {
      const actual = this.contextoSesion();
      untracked(() => this.actualizarContexto(actual));
    });
    effect((limpiar) => {
      const activa = this.confirmacionActiva();
      this.caducadaLocalmente.set(null);
      if (!activa) return;
      const restante = Date.parse(activa.expira) - Date.now();
      if (!Number.isFinite(restante) || restante <= 0) {
        this.caducadaLocalmente.set(activa.id);
        return;
      }
      const reloj = setTimeout(() => this.caducadaLocalmente.set(activa.id), restante);
      limpiar(() => clearTimeout(reloj));
    });
  }

  protected enviar(): void {
    if (!this.puedeEnviar()) return;
    const texto = this.mensaje.value.trim();
    if (!texto || this.mensaje.invalid) return;
    this.mensaje.setValue('');
    this.intentar(texto, true);
  }

  protected enviarDesdeFormulario(event: Event): void {
    event.preventDefault();
    this.enviar();
  }

  protected sugerir(texto: string): void {
    if (!this.puedeEnviar()) return;
    this.intentar(texto, true);
    this.entrada()?.nativeElement.focus();
  }

  protected reintentar(): void {
    if (!this.puedeEnviar()) return;
    const envio = this.pendiente();
    if (envio) this.intentar(envio, false);
  }

  protected enviarAclaracion(mensajeId: number, valores: ValoresAclaracion): void {
    if (!this.puedeEnviar()) return;
    const aclaracion = this.aclaracionActiva();
    if (
      aclaracion?.mensajeId !== mensajeId ||
      aclaracion.conversacionId !== this.conversacionId() ||
      aclaracion.sesion !== this.contextoActual ||
      aclaracion.incierta ||
      aclaracion.oculta
    )
      return;
    const envio = this.formularios.prepararEnvio(aclaracion.especificacion, valores);
    if (!envio) return;
    if (envio.tecnico.length > LIMITE_MENSAJE_AGENTE) {
      this.error.set(
        'El mensaje supera los 1000 caracteres. Acorta algún valor o deja un campo vacío para enviar los datos disponibles.',
      );
      return;
    }
    this.intentar(envio, false, aclaracion);
  }

  protected alternarAclaracion(mensajeId: number): void {
    const aclaracion = this.aclaracionActiva();
    if (this.puedeEnviar() && aclaracion?.mensajeId === mensajeId) {
      this.aclaracionActiva.set({ ...aclaracion, oculta: !aclaracion.oculta });
      if (aclaracion.oculta) this.scroll(true);
    }
  }

  protected nuevaConversacion(): void {
    if (this.solicitandoPermiso()) return;
    this.reiniciarChat();
    this.entrada()?.nativeElement.focus();
  }

  private puedeEnviar(): boolean {
    return this.actualizarContexto(this.contextoSesion()) && !this.ocupado();
  }

  private actualizarContexto(actual: string): boolean {
    if (actual === this.contextoActual) return true;
    this.contextoActual = actual;
    this.reiniciarChat();
    return false;
  }

  private reiniciarChat(): void {
    this.generacion++;
    this.usaAclaracionesV1 = false;
    this.cambioContexto.next();
    this.cancelarVoz();
    this.voz.detenerVoz();
    this.transcribiendo.set(false);
    this.aclaracionActiva.set(null);
    this.confirmacionActiva.set(null);
    this.mensajes.set([]);
    this.conversacionId.set(null);
    this.error.set(null);
    this.pendiente.set(null);
    this.vozError.set(null);
    this.mensaje.setValue('');
  }

  protected alPresionarEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.enviar();
    }
  }

  protected decidir(mensaje: MensajeChat, confirmar: boolean): void {
    if (!this.puedeEnviar()) return;
    const actual = this.mensajes().find(({ id }) => id === mensaje.id);
    if (!actual || this.estadoTarjeta(actual) !== 'PENDIENTE') return;
    const activa = this.confirmacionActiva();
    if (!activa || !(Date.parse(activa.expira) > Date.now())) return;
    this.error.set(null);
    this.pendiente.set(null);
    this.decidiendo.set(true);
    this.agente
      .decidir(activa.id, confirmar)
      .pipe(
        takeUntil(this.cambioContexto),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.decidiendo.set(false)),
      )
      .subscribe({
        next: (recibo) => {
          if (this.actualizarContexto(this.contextoSesion()))
            this.actualizarRecibo(activa.id, recibo);
        },
        error: (error: unknown) => {
          if (!this.actualizarContexto(this.contextoSesion())) return;
          if (error instanceof HttpErrorResponse && error.status === 410) {
            this.marcarConfirmacion(activa.id, 'EXPIRADA');
            this.confirmacionActiva.set(null);
          } else if (this.esIncierto(error)) {
            this.marcarConfirmacion(activa.id, 'RESULTADO_INCIERTO');
            this.error.set('Consulta el estado de esta confirmación antes de volver a decidir.');
          } else {
            this.marcarConfirmacion(activa.id, 'RECHAZADA');
            this.confirmacionActiva.set(null);
            this.error.set(this.mensajeError(error));
          }
        },
      });
  }

  protected estadoTarjeta(chat: MensajeChat): ResolucionTarjeta | 'PENDIENTE' | 'ANTERIOR' | null {
    if (!chat.confirmacion) return null;
    if (chat.resolucion) return chat.resolucion;
    const activa = this.confirmacionActiva();
    if (
      activa?.mensajeId !== chat.id ||
      activa.id !== chat.confirmacion.id ||
      activa.conversacionId !== this.conversacionId()
    )
      return 'ANTERIOR';
    return this.caducadaLocalmente() === activa.id ? 'EXPIRADA' : 'PENDIENTE';
  }

  protected alternarMicrofono(): void {
    if (
      !this.actualizarContexto(this.contextoSesion()) ||
      this.auth.changingRole() ||
      this.chatProcesando() ||
      this.solicitandoPermiso()
    )
      return;
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
    const contexto = this.contextoActual;
    this.voz.detenerVoz();
    this.error.set(null);
    this.vozError.set(null);
    this.solicitandoPermiso.set(true);
    try {
      await this.voz.iniciar(() => void this.detenerYEnviarVoz());
      if (this.destroyRef.destroyed || contexto !== this.contextoSesion()) {
        this.voz.cancelar();
        return;
      }
      this.grabando.set(true);
      this.duracion.set(0);
      this.iniciarCronometro();
    } catch (error) {
      if (!this.destroyRef.destroyed && contexto === this.contextoSesion()) {
        this.vozError.set(this.mensajeErrorMicrofono(error));
      }
    } finally {
      this.solicitandoPermiso.set(false);
    }
  }

  private async detenerYEnviarVoz(): Promise<void> {
    if (!this.grabando()) return;
    const contexto = this.contextoActual;
    const generacion = this.generacion;
    this.transcribiendo.set(true);
    this.grabando.set(false);
    this.detenerCronometro();
    const audio = await this.voz.detener();
    if (
      this.destroyRef.destroyed ||
      contexto !== this.contextoSesion() ||
      generacion !== this.generacion
    )
      return;
    if (!audio || audio.size < MIN_AUDIO_BYTES) {
      this.transcribiendo.set(false);
      this.vozError.set('No se grabó nada. Intenta de nuevo.');
      return;
    }
    this.enviarVoz(audio);
  }

  private enviarVoz(audio: Blob): void {
    if (!this.actualizarContexto(this.contextoSesion()) || this.auth.changingRole()) {
      this.transcribiendo.set(false);
      return;
    }
    this.error.set(null);
    this.vozError.set(null);
    this.pendiente.set(null);
    this.voz
      .enviar(audio, this.conversacionId())
      .pipe(
        takeUntil(this.cambioContexto),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.transcribiendo.set(false)),
      )
      .subscribe({
        next: (voz) => {
          if (!this.actualizarContexto(this.contextoSesion())) return;
          const transcripcion = voz.transcripcion?.trim() ?? '';
          this.agregar('usuario', transcripcion || 'Mensaje de voz');
          this.mostrarRespuesta(voz.respuesta, transcripcion);
          this.voz.hablar(voz.textoHablado?.trim() || voz.respuesta.message);
        },
        error: (error: unknown) => {
          if (!this.actualizarContexto(this.contextoSesion())) return;
          this.reconciliarFallo(error, 'voz');
          this.vozError.set(
            this.esIncierto(error)
              ? 'El mensaje de voz pudo llegar al asistente. Revisa el resultado antes de repetirlo.'
              : this.mensajeErrorVoz(error),
          );
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
    if (
      !this.actualizarContexto(this.contextoSesion()) ||
      this.auth.changingRole() ||
      this.consultando() ||
      this.chatProcesando() ||
      !esUuidAgente(id) ||
      !this.mensajes().some((mensaje) => mensaje.confirmacion?.id === id)
    )
      return;
    this.consultando.set(id);
    this.agente
      .confirmacion(id)
      .pipe(
        takeUntil(this.cambioContexto),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.consultando.set(null)),
      )
      .subscribe({
        next: (confirmacion) => {
          if (!this.actualizarContexto(this.contextoSesion())) return;
          this.actualizarRecibo(id, confirmacion);
        },
        error: (error: unknown) => {
          if (!this.actualizarContexto(this.contextoSesion())) return;
          if (error instanceof HttpErrorResponse && error.status === 410) {
            this.marcarConfirmacion(id, 'EXPIRADA');
            if (this.confirmacionActiva()?.id === id) this.confirmacionActiva.set(null);
            return;
          }
          this.error.set(this.mensajeError(error));
        },
      });
  }

  private actualizarRecibo(id: string, recibo: ConfirmacionResumen): void {
    if (
      !recibo ||
      recibo.id !== id ||
      !['PENDIENTE', 'EJECUTADA', 'CANCELADA', 'EXPIRADA'].includes(recibo.estado)
    ) {
      this.marcarConfirmacion(id, 'RESULTADO_INCIERTO');
      this.error.set('No se pudo verificar el recibo. Consulta el estado de la confirmación.');
      return;
    }
    const esActiva = this.confirmacionActiva()?.id === id;
    if (recibo.estado !== 'PENDIENTE' && esActiva) this.confirmacionActiva.set(null);
    this.error.set(null);
    const estado =
      recibo.estado === 'PENDIENTE' ? (esActiva ? null : 'PENDIENTE_ANTERIOR') : recibo.estado;
    this.marcarConfirmacion(id, estado, recibo);
  }

  private marcarConfirmacion(
    id: string,
    estado: ResolucionTarjeta | null,
    recibo?: ConfirmacionResumen,
  ): void {
    this.mensajes.update((lista) =>
      lista.map((mensaje) =>
        mensaje.confirmacion?.id === id
          ? { ...mensaje, resolucion: estado, confirmacion: recibo ?? mensaje.confirmacion }
          : mensaje,
      ),
    );
  }

  protected siguientePagina(): void {
    if (this.puedeEnviar()) this.intentar('Muéstrame la página siguiente', true);
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
      case 'ANTERIOR':
        return 'Propuesta anterior';
      case 'PENDIENTE_ANTERIOR':
        return 'Pendiente en el servidor (propuesta anterior)';
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

  private intentar(
    solicitud: string | EnvioAclaracion,
    mostrarUsuario: boolean,
    aclaracion?: AclaracionActiva,
  ): void {
    const envio =
      typeof solicitud === 'string' ? { visible: solicitud, tecnico: solicitud } : solicitud;
    const { visible, tecnico } = envio;
    this.voz.detenerVoz();
    this.enviando.set(true);
    this.enviandoDatos.set(!!aclaracion);
    this.error.set(null);
    this.vozError.set(null);
    this.pendiente.set(null);
    if (mostrarUsuario) this.agregar('usuario', visible);
    this.scroll();

    this.agente
      .chat(tecnico, this.conversacionId())
      .pipe(
        takeUntil(this.cambioContexto),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.enviando.set(false);
          this.enviandoDatos.set(false);
        }),
      )
      .subscribe({
        next: (respuesta) => {
          if (!this.actualizarContexto(this.contextoSesion())) return;
          const siguiente = this.leerAclaracion(respuesta, visible);
          if (
            aclaracion &&
            !this.mismaAclaracion(aclaracion, siguiente, respuesta.conversationId) &&
            !this.esRespuestaIncierta(respuesta) &&
            respuesta.operacion?.estado !== 'ERROR' &&
            (!respuesta.advertencia || siguiente || respuesta.operacion?.confirmacion)
          ) {
            this.agregar('usuario', visible);
            this.marcarDatosEnviados(aclaracion.mensajeId);
          }
          this.mostrarRespuesta(respuesta, visible, siguiente);
        },
        error: (error: unknown) => {
          if (!this.actualizarContexto(this.contextoSesion())) return;
          const incierto = this.esIncierto(error);
          const aptoParaReintento =
            !aclaracion &&
            !this.aclaracionActiva() &&
            !this.confirmacionActiva() &&
            error instanceof HttpErrorResponse &&
            ['CONVERSATION_BUSY', 'PROVIDER_RATE_LIMIT'].includes(this.codigoError(error) ?? '');
          this.reconciliarFallo(error);
          if (aptoParaReintento) this.pendiente.set(envio);
          if (aclaracion && !incierto) {
            this.aclaracionActiva.update((actual) => actual && { ...actual, corregir: true });
          }
          this.error.set(
            incierto
              ? 'El mensaje pudo llegar al asistente. Revisa el resultado antes de repetir la solicitud.'
              : this.mensajeError(error),
          );
          this.scroll();
        },
      });
  }

  private esIncierto(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) return true;
    const codigo = this.codigoError(error);
    return (
      codigo === 'CONFIRMATION_RESULT_UNCERTAIN' ||
      codigo === 'PREPARATION_RESULT_UNCERTAIN' ||
      error.status === 0 ||
      (error.status >= 500 &&
        !['PROVIDER_TIMEOUT', 'PROVIDER_UNAVAILABLE', 'VOICE_UNAVAILABLE'].includes(codigo ?? ''))
    );
  }

  private esRespuestaIncierta(respuesta: ChatRespuesta): boolean {
    return (
      ['PREPARATION_RESULT_UNCERTAIN', 'CONFIRMATION_RESULT_UNCERTAIN'].includes(
        respuesta.advertencia?.codigo ?? '',
      ) || respuesta.resolucionConfirmacion?.estado === 'RESULTADO_INCIERTO'
    );
  }

  private reconciliarFallo(error: unknown, canal: 'texto' | 'voz' = 'texto'): void {
    if (error instanceof HttpErrorResponse) {
      const codigo = this.codigoError(error);
      // Estos errores de transcripción se producen antes de abrir la conversación.
      if (
        canal === 'voz' &&
        [
          'VOICE_INVALID_AUDIO',
          'VOICE_NOT_UNDERSTOOD',
          'VOICE_TOO_LARGE',
          'VOICE_UNSUPPORTED_FORMAT',
          'VOICE_UNAVAILABLE',
        ].includes(codigo ?? '')
      )
        return;
      if (
        [401, 403, 404].includes(error.status) ||
        codigo === 'CONVERSATION_ROLE_CHANGED' ||
        codigo === 'CONVERSATION_NOT_FOUND'
      ) {
        this.conversacionId.set(null);
        this.aclaracionActiva.set(null);
        this.confirmacionActiva.set(null);
        this.usaAclaracionesV1 = false;
        return;
      }
      if (codigo === 'CLARIFICATION_EXPIRED') {
        this.aclaracionActiva.set(null);
      }
    }
    if (this.esIncierto(error)) {
      this.aclaracionActiva.update((actual) => actual && { ...actual, incierta: true });
      const confirmacion = this.confirmacionActiva();
      if (confirmacion) {
        this.marcarConfirmacion(confirmacion.id, 'RESULTADO_INCIERTO');
      }
    }
    // Un error controlado del proveedor tampoco garantiza que el turno conservó la propuesta anterior.
    this.confirmacionActiva.set(null);
  }

  private marcarDatosEnviados(id: number): void {
    this.mensajes.update((lista) =>
      lista.map((mensaje) => (mensaje.id === id ? { ...mensaje, datosEnviados: true } : mensaje)),
    );
  }

  private leerAclaracion(
    respuesta: ChatRespuesta,
    solicitud: string,
  ): EspecificacionAclaracion | null {
    const tieneDescriptor = Object.hasOwn(respuesta, 'aclaracion');
    if (
      this.usaAclaracionesV1 &&
      !tieneDescriptor &&
      respuesta.conversationId === this.conversacionId()
    )
      return null;
    return this.formularios.crear(respuesta, solicitud);
  }

  private mismaAclaracion(
    anterior: AclaracionActiva,
    siguiente: EspecificacionAclaracion | null,
    conversacionId: string,
  ): boolean {
    return (
      !!siguiente &&
      conversacionId === anterior.conversacionId &&
      esEstructurada(anterior.especificacion) &&
      esEstructurada(siguiente) &&
      anterior.especificacion.id === siguiente.id
    );
  }

  private mostrarRespuesta(
    respuesta: ChatRespuesta,
    solicitud: string,
    especificacion = this.leerAclaracion(respuesta, solicitud),
  ): void {
    if (respuesta.conversationId && respuesta.conversationId !== this.conversacionId()) {
      this.confirmacionActiva.set(null);
      this.usaAclaracionesV1 = false;
      this.conversacionId.set(respuesta.conversationId);
    }
    this.usaAclaracionesV1 ||= Object.hasOwn(respuesta, 'aclaracion');
    this.aplicarResolucion(respuesta);
    const operacion = respuesta.operacion;
    const confirmacion =
      operacion?.estado === 'CONFIRMACION_REQUERIDA' &&
      operacion.confirmacion?.estado === 'PENDIENTE' &&
      esUuidAgente(operacion.confirmacion.id)
        ? operacion.confirmacion
        : null;
    const detalleOperacion =
      operacion?.detalle && !confirmacion && operacion.detalle !== respuesta.message
        ? operacion.detalle
        : null;
    const tonoOperacion =
      detalleOperacion && operacion ? this.tonoEstadoOperacion(operacion.estado) : null;
    const advertencia =
      respuesta.advertencia?.codigo === 'CONFIRMATION_RESULT_UNCERTAIN'
        ? {
            ...respuesta.advertencia,
            mensaje: 'Consulta el estado de la propuesta antes de volver a decidir.',
          }
        : respuesta.advertencia;
    this.agregar(
      'asistente',
      (respuesta.advertencia?.codigo === 'CONFIRMATION_RESULT_UNCERTAIN'
        ? advertencia?.mensaje
        : respuesta.message
      )?.trim() ||
        advertencia?.mensaje ||
        'El asistente no devolvió una respuesta.',
      {
        advertencia: advertencia ?? null,
        confirmacion,
        viajes: respuesta.viajes ?? [],
        rutas: respuesta.rutas ?? [],
        metodos: respuesta.metodosCompensacion ?? [],
        detalleOperacion,
        tonoOperacion,
        paginacion: leerPaginacion(respuesta.resultados ?? []),
      },
    );
    if (confirmacion && respuesta.conversationId) {
      this.confirmacionActiva.set({
        id: confirmacion.id,
        mensajeId: this.secuencia,
        conversacionId: respuesta.conversationId,
        expira: confirmacion.expira,
      });
      if (this.esRespuestaIncierta(respuesta))
        this.marcarConfirmacion(confirmacion.id, 'RESULTADO_INCIERTO');
    } else if (respuesta.resolucionConfirmacion?.estado !== 'RESULTADO_INCIERTO') {
      this.confirmacionActiva.set(null);
    }
    const anterior = this.aclaracionActiva();
    if (
      especificacion &&
      anterior &&
      this.mismaAclaracion(anterior, especificacion, respuesta.conversationId)
    ) {
      const iguales = JSON.stringify(anterior.especificacion) === JSON.stringify(especificacion);
      this.aclaracionActiva.set({
        ...anterior,
        especificacion: iguales ? anterior.especificacion : especificacion,
        incierta: false,
        corregir: false,
      });
    } else {
      this.aclaracionActiva.set(
        especificacion
          ? {
              mensajeId: this.secuencia,
              conversacionId: respuesta.conversationId,
              especificacion,
              sesion: this.contextoActual,
            }
          : null,
      );
    }
    if (especificacion) this.scroll(true);
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
        datosEnviados: false,
      },
    ]);
    this.scroll();
  }

  /** Una decisión escrita («sí») también actualiza la tarjeta ya mostrada. */
  private aplicarResolucion(respuesta: ChatRespuesta): void {
    const resolucion = respuesta.resolucionConfirmacion;
    if (!resolucion) return;
    const id = resolucion.confirmacion?.id ?? this.confirmacionActiva()?.id;
    if (id) this.marcarConfirmacion(id, resolucion.estado, resolucion.confirmacion ?? undefined);
  }

  private scroll(haciaFormulario = false): void {
    setTimeout(() => {
      const lista = this.lista()?.nativeElement;
      if (!lista) return;
      if (haciaFormulario && this.aclaracionActiva() && !this.aclaracionActiva()?.oculta) {
        const mensaje = lista.querySelector('app-formulario-aclaracion')?.closest('.mensaje');
        if (mensaje) {
          lista.scrollTop +=
            mensaje.getBoundingClientRect().top - lista.getBoundingClientRect().top;
          return;
        }
      }
      lista.scrollTop = lista.scrollHeight;
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
      case 'CLARIFICATION_EXPIRED':
        return 'Este formulario ya no está vigente. Vuelve a indicar qué deseas hacer.';
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
