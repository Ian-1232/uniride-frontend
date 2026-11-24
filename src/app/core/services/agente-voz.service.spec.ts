import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AgenteVozService } from './agente-voz.service';

describe('AgenteVozService', () => {
  let http: HttpTestingController;
  let hablar: ReturnType<typeof vi.fn>;
  let cancelar: ReturnType<typeof vi.fn>;
  let voces: SpeechSynthesisVoice[];
  const mediaDevicesOriginal = navigator.mediaDevices;

  beforeEach(() => {
    localStorage.clear();
    hablar = vi.fn();
    cancelar = vi.fn();
    voces = [{ lang: 'es-MX', name: 'México' } as SpeechSynthesisVoice];
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => voces,
      speak: hablar,
      cancel: cancelar,
      addEventListener: vi.fn(),
    });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        lang = 'es-PE';
        voice: SpeechSynthesisVoice | null = null;
        rate = 1;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;

        constructor(readonly text: string) {}
      },
    );
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: mediaDevicesOriginal,
    });
    localStorage.clear();
  });

  it('envía el audio como multipart y conserva el conversationId', () => {
    const servicio = TestBed.inject(AgenteVozService);

    servicio.enviar(new Blob(['audio'], { type: 'audio/webm' }), 'conv-1').subscribe();

    const req = http.expectOne('/api/agent/voz');
    expect(req.request.method).toBe('POST');
    const formulario = req.request.body as FormData;
    expect(formulario.get('audio')).toBeInstanceOf(Blob);
    expect(formulario.get('conversationId')).toBe('conv-1');
    req.flush({
      transcripcion: 'Hola',
      textoHablado: 'Hola',
      respuesta: {
        message: 'Hola',
        viajes: [],
        rutas: [],
        metodosCompensacion: [],
        operacion: null,
        resultados: [],
        advertencia: null,
        conversationId: 'conv-1',
      },
    });
  });

  it('graba, corta y devuelve el audio liberando el micrófono', async () => {
    const detenerPista = vi.fn();
    class GrabadorFalso {
      static isTypeSupported = (tipo: string) => tipo.startsWith('audio/webm');
      state: RecordingState = 'inactive';
      mimeType = 'audio/webm';
      ondataavailable: ((evento: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;
      stream = { getTracks: () => [{ stop: detenerPista }] };

      constructor(
        public streamParam: MediaStream,
        public opciones: MediaRecorderOptions,
      ) {}

      start(): void {
        this.state = 'recording';
        this.ondataavailable?.({
          data: new Blob(['x'.repeat(2048)], { type: this.mimeType }),
        } as BlobEvent);
      }

      stop(): void {
        this.state = 'inactive';
        this.onstop?.();
      }
    }
    vi.stubGlobal('MediaRecorder', GrabadorFalso);
    const flujo = { getTracks: () => [{ stop: detenerPista }] };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(flujo) },
    });
    const servicio = TestBed.inject(AgenteVozService);

    vi.useFakeTimers();
    const alCortar = vi.fn();
    await servicio.iniciar(alCortar);
    vi.advanceTimersByTime(30_000);
    expect(alCortar).toHaveBeenCalled();
    const audio = await servicio.detener();
    vi.useRealTimers();

    expect(audio?.size).toBe(2048);
    expect(audio?.type).toBe('audio/webm');
    expect(detenerPista).toHaveBeenCalled();
  });

  it('libera una autorización de micrófono que llega tras cancelar la grabación', async () => {
    const detenerPista = vi.fn();
    const flujo = { getTracks: () => [{ stop: detenerPista }] };
    let conceder!: (valor: typeof flujo) => void;
    const permiso = new Promise<typeof flujo>((resolve) => {
      conceder = resolve;
    });
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => true });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => permiso },
    });
    const servicio = TestBed.inject(AgenteVozService);
    const iniciando = servicio.iniciar(vi.fn());
    servicio.cancelar();
    conceder(flujo);
    await expect(iniciando).rejects.toThrow('grabacion-cancelada');
    expect(detenerPista).toHaveBeenCalledOnce();
  });

  it('lee con una voz en español y permite detenerla', () => {
    const servicio = TestBed.inject(AgenteVozService);

    servicio.hablar('Tienes dos rutas.');

    expect(servicio.hablando()).toBe(true);
    const locucion = hablar.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(locucion.voice?.lang).toBe('es-MX');
    expect(locucion.lang).toBe('es-MX');

    servicio.detenerVoz();
    expect(cancelar).toHaveBeenCalled();
    expect(servicio.hablando()).toBe(false);
  });

  it('respeta la preferencia guardada de no responder en voz alta', () => {
    localStorage.setItem('uniride_voz_alta', 'false');
    const servicio = TestBed.inject(AgenteVozService);

    servicio.hablar('Hola');

    expect(servicio.vozAlta()).toBe(false);
    expect(hablar).not.toHaveBeenCalled();
  });
});
