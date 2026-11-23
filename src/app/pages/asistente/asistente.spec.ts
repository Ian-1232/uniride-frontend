import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AgenteVozService } from '../../core/services/agente-voz.service';
import { Asistente } from './asistente';

describe('Asistente', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Asistente],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function crear(): ComponentFixture<Asistente> {
    const fixture = TestBed.createComponent(Asistente);
    fixture.detectChanges();
    return fixture;
  }

  function escribir(fixture: ComponentFixture<Asistente>, texto: string): void {
    const entrada = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    entrada.value = texto;
    entrada.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviar(fixture: ComponentFixture<Asistente>): void {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('muestra el estado inicial con sugerencias', () => {
    const fixture = crear();
    expect(fixture.nativeElement.textContent).toContain('¿En qué puedo ayudarte');
    expect(fixture.nativeElement.querySelectorAll('.sugerencia').length).toBeGreaterThan(0);
  });

  it('envía el primer mensaje y reutiliza el conversationId en el siguiente', () => {
    const fixture = crear();

    escribir(fixture, 'Hola!!');
    enviar(fixture);
    const primero = http.expectOne('/api/agent/chat');
    expect(primero.request.body).toEqual({ message: 'Hola!!' });
    primero.flush({
      message: '¡Hola! ¿En qué te ayudo?',
      conversationId: 'conv-1',
      advertencia: null,
      operacion: null,
      resolucionConfirmacion: null,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('¡Hola! ¿En qué te ayudo?');

    escribir(fixture, '¿Cuáles son mis rutas?');
    enviar(fixture);
    const segundo = http.expectOne('/api/agent/chat');
    expect(segundo.request.body).toEqual({
      message: '¿Cuáles son mis rutas?',
      conversationId: 'conv-1',
    });
    segundo.flush({
      message: 'Tienes 1 ruta activa.',
      conversationId: 'conv-1',
      advertencia: null,
      operacion: null,
      resolucionConfirmacion: null,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tienes 1 ruta activa.');
  });

  it('muestra las rutas estructuradas de la respuesta', () => {
    const fixture = crear();

    escribir(fixture, 'Lista todas mis rutas');
    enviar(fixture);
    const req = http.expectOne('/api/agent/chat');
    req.flush({
      message: 'Se encontraron 2 resultados en las páginas consultadas.',
      rutas: [
        {
          rutaId: 4,
          origen: 'San Juan de Miraflores',
          destino: 'UPC',
          puntosReferencia: 'Estacion Atocongo, Mall del Sur, Puente Primavera',
          zonasSinParada: null,
          capacidadMaxima: 3,
          estado: 'ACTIVA',
        },
        {
          rutaId: 1,
          origen: 'San borja',
          destino: 'UPC',
          puntosReferencia: 'Real Plaza Primavera, Wong Chacarilla',
          zonasSinParada: 'Puente Primavera, Encalada',
          capacidadMaxima: 4,
          estado: 'VENCIDA',
        },
      ],
      conversationId: 'conv-1',
      advertencia: null,
      operacion: null,
      resolucionConfirmacion: null,
    });
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('San Juan de Miraflores → UPC');
    expect(texto).toContain('Activa');
    expect(texto).toContain('Vencida');
    expect(fixture.nativeElement.querySelectorAll('.tarjeta').length).toBe(2);
  });

  it('muestra viajes y métodos de compensación', () => {
    const fixture = crear();
    escribir(fixture, 'Mis viajes y métodos');
    enviar(fixture);
    const req = http.expectOne('/api/agent/chat');
    req.flush({
      message: 'Encontré 1 viaje y 1 método.',
      viajes: [
        {
          viajeId: 42,
          rutaId: 7,
          origen: 'Surco',
          destino: 'UPC',
          dia: 'Lunes',
          fecha: '2026-12-01',
          hora: '07:00:00',
          puntosReferencia: 'Parque',
          conductorNombre: 'Ana',
          capacidadMaxima: 4,
          estado: 'PROGRAMADO',
          estadoSolicitud: null,
        },
      ],
      rutas: [],
      metodosCompensacion: [{ id: 3, tipo: 'FAVOR', descripcion: 'Apuntes', activo: true }],
      operacion: null,
      resultados: [],
      advertencia: null,
      conversationId: 'conv-1',
    });
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Surco → UPC');
    expect(texto).toContain('Programado');
    expect(texto).toContain('07:00');
    expect(texto).toContain('Favor');
    expect(texto).toContain('Apuntes');
    expect(texto).toContain('Activo');
  });

  it('muestra el detalle de una operación rechazada', () => {
    const fixture = crear();
    escribir(fixture, 'Edita mi ruta');
    enviar(fixture);
    const req = http.expectOne('/api/agent/chat');
    req.flush({
      message: 'No pude preparar la edición.',
      viajes: [],
      rutas: [],
      metodosCompensacion: [],
      operacion: {
        estado: 'AMBIGUO',
        id: null,
        detalle: 'Hay 2 rutas que coinciden. Indica cuál quieres editar.',
        confirmacion: null,
      },
      resultados: [],
      advertencia: null,
      conversationId: 'conv-1',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Hay 2 rutas que coinciden. Indica cuál quieres editar.',
    );
  });

  it('actualiza la propuesta cuando el backend resuelve la confirmación', () => {
    const fixture = crear();
    escribir(fixture, 'Edita mi ruta');
    enviar(fixture);
    const preparacion = http.expectOne('/api/agent/chat');
    preparacion.flush({
      message: '¿Confirmas la actualización?',
      viajes: [],
      rutas: [],
      metodosCompensacion: [],
      operacion: {
        estado: 'CONFIRMACION_REQUERIDA',
        id: null,
        detalle: 'Actualizar la ruta.',
        confirmacion: {
          id: 'conf-1',
          tipo: 'EDITAR_RUTA',
          estado: 'PENDIENTE',
          resumen: 'Actualizar tu ruta San Juan de Miraflores → UPC: capacidad 3.',
          parametros: { capacidadMaxima: 3 },
          expira: '2026-11-22T23:59:00Z',
          resultado: null,
        },
      },
      resultados: [],
      advertencia: null,
      conversationId: 'conv-1',
    });
    fixture.detectChanges();

    const confirmar = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent?.trim() === 'Confirmar');
    expect(confirmar).toBeTruthy();
    confirmar!.click();
    fixture.detectChanges();

    const decision = http.expectOne('/api/agent/chat');
    expect(decision.request.body).toEqual({
      message: 'Sí, confirmo',
      conversationId: 'conv-1',
    });
    decision.flush({
      message: 'Ruta actualizada.',
      viajes: [],
      rutas: [],
      metodosCompensacion: [],
      operacion: { estado: 'EXITO', id: 4, detalle: 'Ruta actualizada.', confirmacion: null },
      resultados: [],
      advertencia: null,
      conversationId: 'conv-1',
      resolucionConfirmacion: { estado: 'EJECUTADA', confirmacion: null },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Estado: Ejecutada');
    const sigueConfirmar = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).some((boton) => boton.textContent?.trim() === 'Confirmar');
    expect(sigueConfirmar).toBe(false);
  });

  it('reinicia la conversación cuando el backend devuelve 404', () => {
    const fixture = crear();
    escribir(fixture, 'Hola!!');
    enviar(fixture);
    http.expectOne('/api/agent/chat').flush({
      message: 'Hola',
      viajes: [],
      rutas: [],
      metodosCompensacion: [],
      operacion: null,
      resultados: [],
      advertencia: null,
      conversationId: 'conv-1',
    });
    fixture.detectChanges();

    escribir(fixture, 'Sigue la conversación');
    enviar(fixture);
    http
      .expectOne('/api/agent/chat')
      .flush(
        { mensaje: 'La conversación expiró', campos: { codigo: 'CONVERSATION_NOT_FOUND' } },
        { status: 404, statusText: 'Not Found' },
      );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('La conversación expiró');

    const reintentar = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent?.trim() === 'Reintentar');
    expect(reintentar).toBeTruthy();
    reintentar!.click();
    fixture.detectChanges();

    const reintento = http.expectOne('/api/agent/chat');
    expect(reintento.request.body).toEqual({ message: 'Sigue la conversación' });
  });

  it('envía la voz, muestra la transcripción y reproduce el texto hablado', async () => {
    const fixture = crear();
    const voz = TestBed.inject(AgenteVozService);
    vi.spyOn(voz, 'iniciar').mockResolvedValue();
    vi.spyOn(voz, 'detener').mockResolvedValue(
      new Blob([new Uint8Array(2048)], { type: 'audio/webm' }),
    );
    const reproducir = vi.spyOn(voz, 'hablar').mockImplementation(() => undefined);
    const micro = fixture.nativeElement.querySelector('.composer-mic') as HTMLButtonElement;

    micro.click();
    await esperar();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Escuchando');

    micro.click();
    await esperar();
    const req = http.expectOne('/api/agent/voz');
    const formulario = req.request.body as FormData;
    expect(formulario.get('audio')).toBeTruthy();
    expect(formulario.get('conversationId')).toBeNull();
    req.flush({
      transcripcion: '¿Cuáles son mis rutas?',
      textoHablado: 'Tienes dos rutas.',
      respuesta: {
        message: 'Tienes 2 rutas.',
        viajes: [],
        rutas: [],
        metodosCompensacion: [],
        operacion: null,
        resultados: [],
        advertencia: null,
        conversationId: 'conv-voz',
      },
    });
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('¿Cuáles son mis rutas?');
    expect(texto).toContain('Tienes 2 rutas.');
    expect(reproducir).toHaveBeenCalledWith('Tienes dos rutas.');
  });

  it('muestra el error de voz cuando no se entiende el audio', async () => {
    const fixture = crear();
    const voz = TestBed.inject(AgenteVozService);
    vi.spyOn(voz, 'iniciar').mockResolvedValue();
    vi.spyOn(voz, 'detener').mockResolvedValue(
      new Blob([new Uint8Array(2048)], { type: 'audio/webm' }),
    );
    const micro = fixture.nativeElement.querySelector('.composer-mic') as HTMLButtonElement;

    micro.click();
    await esperar();
    micro.click();
    await esperar();
    http
      .expectOne('/api/agent/voz')
      .flush(
        { mensaje: 'No se entendió el audio.', campos: { codigo: 'VOICE_NOT_UNDERSTOOD' } },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No te entendí');
  });

  async function esperar(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
  }
});
