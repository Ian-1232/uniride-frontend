import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VozChatRespuesta } from '../models/agente.models';

const CLAVE_PREFERENCIA = 'uniride_voz_alta';
const LIMITE_GRABACION_MS = 30_000;
const FORMATOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

/** Grabación push-to-talk y lectura en voz alta con la Web Speech API. */
@Injectable({ providedIn: 'root' })
export class AgenteVozService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly hablando = signal(false);
  readonly vozAlta = signal(this.leerPreferencia());

  private grabador: MediaRecorder | null = null;
  private trozos: Blob[] = [];
  private flujo: MediaStream | null = null;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private locucion: SpeechSynthesisUtterance | null = null;
  private voces: SpeechSynthesisVoice[] = [];

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cancelar();
      this.detenerVoz();
    });
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.addEventListener?.('voiceschanged', () => this.cargarVoces());
      this.cargarVoces();
    }
  }

  /** Pide permiso y empieza a grabar; el aviso `alCortar` se dispara a los 30 s. */
  async iniciar(alCortar: () => void): Promise<void> {
    if (this.grabador && this.grabador.state !== 'inactive') return;
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('sin-soporte');
    }
    const mime = FORMATOS.find((tipo) => MediaRecorder.isTypeSupported(tipo));
    if (!mime) throw new Error('formato');

    const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
    try {
      const grabador = new MediaRecorder(flujo, { mimeType: mime, audioBitsPerSecond: 32000 });
      this.trozos = [];
      grabador.ondataavailable = (evento) => {
        if (evento.data.size > 0) this.trozos.push(evento.data);
      };
      grabador.start();
      this.grabador = grabador;
      this.flujo = flujo;
      this.temporizador = setTimeout(alCortar, LIMITE_GRABACION_MS);
    } catch (error) {
      flujo.getTracks().forEach((pista) => pista.stop());
      throw error;
    }
  }

  detener(): Promise<Blob | null> {
    this.limpiarTemporizador();
    const grabador = this.grabador;
    if (!grabador || grabador.state === 'inactive') {
      this.limpiar();
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      grabador.onstop = () => {
        const audio = new Blob(this.trozos, { type: grabador.mimeType || 'audio/webm' });
        this.limpiar();
        resolve(audio);
      };
      try {
        grabador.stop();
      } catch {
        this.limpiar();
        resolve(null);
      }
    });
  }

  cancelar(): void {
    this.limpiarTemporizador();
    if (this.grabador && this.grabador.state !== 'inactive') {
      this.grabador.onstop = null;
      try {
        this.grabador.stop();
      } catch {
        // El micrófono se libera igualmente en limpiar().
      }
    }
    this.limpiar();
  }

  enviar(audio: Blob, conversationId?: string | null): Observable<VozChatRespuesta> {
    const formulario = new FormData();
    formulario.append('audio', audio, this.nombreArchivo(audio.type));
    if (conversationId) formulario.append('conversationId', conversationId);
    return this.http
      .post<VozChatRespuesta>(`${environment.apiUrl}/agent/voz`, formulario)
      .pipe(timeout(120000));
  }

  alternarVozAlta(): void {
    const activo = !this.vozAlta();
    this.vozAlta.set(activo);
    try {
      localStorage.setItem(CLAVE_PREFERENCIA, String(activo));
    } catch {
      // Sin almacenamiento, la preferencia solo dura la sesión.
    }
    if (!activo) this.detenerVoz();
  }

  hablar(texto: string): void {
    if (!texto.trim() || !this.vozAlta() || typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const voces = (this.voces.length ? this.voces : speechSynthesis.getVoices()).filter((voz) =>
      voz.lang.toLowerCase().startsWith('es'),
    );
    const locucion = new SpeechSynthesisUtterance(texto);
    locucion.voice =
      voces.find((voz) => voz.lang.toLowerCase() === 'es-pe') ??
      voces.find((voz) => voz.lang.toLowerCase() === 'es-mx') ??
      voces[0] ??
      null;
    locucion.lang = locucion.voice?.lang ?? 'es-PE';
    locucion.rate = 1;
    locucion.onend = () => this.terminarLocucion(locucion);
    locucion.onerror = () => this.terminarLocucion(locucion);
    this.locucion = locucion;
    this.hablando.set(true);
    try {
      speechSynthesis.speak(locucion);
    } catch {
      this.detenerVoz();
    }
  }

  detenerVoz(): void {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    this.locucion = null;
    this.hablando.set(false);
  }

  private terminarLocucion(locucion: SpeechSynthesisUtterance): void {
    if (this.locucion !== locucion) return;
    this.locucion = null;
    this.hablando.set(false);
  }

  private cargarVoces(): void {
    if (typeof speechSynthesis !== 'undefined') this.voces = speechSynthesis.getVoices();
  }

  private limpiar(): void {
    this.grabador?.stream.getTracks().forEach((pista) => pista.stop());
    this.flujo?.getTracks().forEach((pista) => pista.stop());
    this.grabador = null;
    this.flujo = null;
    this.trozos = [];
  }

  private limpiarTemporizador(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
  }

  private nombreArchivo(tipo: string): string {
    if (tipo.includes('mp4') || tipo.includes('m4a')) return 'voz.m4a';
    if (tipo.includes('ogg')) return 'voz.ogg';
    if (tipo.includes('wav')) return 'voz.wav';
    if (tipo.includes('mpeg') || tipo.includes('mp3')) return 'voz.mp3';
    return 'voz.webm';
  }

  private leerPreferencia(): boolean {
    try {
      return localStorage.getItem(CLAVE_PREFERENCIA) !== 'false';
    } catch {
      return true;
    }
  }
}
