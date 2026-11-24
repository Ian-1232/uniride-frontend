import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TimeoutError, throwError } from 'rxjs';
import { CampoAclaracion } from '../../core/models/aclaracion.models';
import {
  ACLARACION_CORREGIR_RUTA,
  ACLARACION_CUPO,
  ACLARACION_ELIMINAR,
  ACLARACION_HORA_VIAJE,
  ACLARACION_REFERENCIAS,
  ACLARACION_RUTA,
  ACLARACION_RUTAS_SIMILARES,
  ACLARACION_VIAJE,
  CONVERSACION,
  CONVERSACION_VIAJE,
  respuestaV1,
} from '../../core/models/aclaracion.testing';
import {
  ChatRespuesta,
  ConfirmacionResumen,
  EstadoOperacion,
} from '../../core/models/agente.models';
import { AgenteService } from '../../core/services/agente.service';
import { AgenteVozService } from '../../core/services/agente-voz.service';
import { AuthService } from '../../core/services/auth.service';
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
    const entrada = fixture.nativeElement.querySelector(
      '.composer textarea',
    ) as HTMLTextAreaElement;
    entrada.value = texto;
    entrada.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviar(fixture: ComponentFixture<Asistente>): void {
    const form = fixture.nativeElement.querySelector('.composer') as HTMLFormElement;
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
          id: '9acbbffd-fa21-4aa8-8e15-4f67387441d3',
          tipo: 'EDITAR_RUTA',
          estado: 'PENDIENTE',
          resumen: 'Actualizar tu ruta San Juan de Miraflores → UPC: capacidad 3.',
          parametros: { capacidadMaxima: 3 },
          expira: vencimiento(),
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
    expect(fixture.nativeElement.querySelector('app-formulario-aclaracion')).toBeNull();
    expect(fixture.nativeElement.querySelector('.chat-estado').textContent).toContain(
      'Esperando confirmación',
    );
    escribir(fixture, 'Sí, confirmo');
    enviar(fixture);

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
    expect(reintentar).toBeUndefined();
    escribir(fixture, 'Nueva consulta tras expirar');
    enviar(fixture);

    const reintento = http.expectOne('/api/agent/chat');
    expect(reintento.request.body).toEqual({ message: 'Nueva consulta tras expirar' });
    reintento.flush(respuesta());
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

  const textoRuta = 'Quiero crear una ruta';
  const detalleRuta = 'Completa el origen, los puntos de referencia y una capacidad mayor a cero.';
  const rutaCompleta =
    'Quiero crear una ruta con origen Chorrillos, puntos de referencia UPC Villa y capacidad máxima de 3 pasajeros';

  function respuesta(datos: Partial<ChatRespuesta> = {}): ChatRespuesta {
    return {
      message: 'Recibido.',
      conversationId: 'conv-aclaracion',
      operacion: null,
      resultados: [],
      advertencia: null,
      rutas: [],
      viajes: [],
      metodosCompensacion: [],
      ...datos,
    };
  }

  function aclaracion(
    detalle: string,
    tipo?: string,
    estado: EstadoOperacion = 'DATOS_FALTANTES',
  ): ChatRespuesta {
    const operacion = { estado, detalle, id: null, confirmacion: null };
    return respuesta({
      message: tipo ? 'Necesito más datos para continuar.' : detalle,
      operacion,
      resultados: tipo ? [{ tipo, datos: operacion }] : [],
    });
  }

  function preguntar(
    fixture: ComponentFixture<Asistente>,
    texto: string,
    cuerpo: ChatRespuesta,
  ): void {
    escribir(fixture, texto);
    enviar(fixture);
    http.expectOne('/api/agent/chat').flush(cuerpo);
    fixture.detectChanges();
  }

  function formulario(fixture: ComponentFixture<Asistente>): HTMLFormElement {
    return fixture.nativeElement.querySelector('app-formulario-aclaracion form');
  }

  function campo(form: HTMLFormElement, id: string, valor: string): HTMLInputElement {
    const control = form.querySelector<HTMLInputElement>(`[id$="-${id}"]`)!;
    control.value = valor;
    control.dispatchEvent(new Event(control.tagName === 'SELECT' ? 'change' : 'input'));
    return control;
  }

  function llenarRuta(form: HTMLFormElement): void {
    campo(form, 'origen', 'Chorrillos');
    campo(form, 'referencias', 'UPC Villa');
    campo(form, 'capacidad', '3');
  }

  function enviarDatos(form: HTMLFormElement): void {
    form.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  it('construye los tres campos solicitados usando el detalle de la herramienta', () => {
    const fixture = crear();
    preguntar(fixture, textoRuta, aclaracion(detalleRuta, 'crearRuta'));
    const form = formulario(fixture);
    const labels = Array.from(form.querySelectorAll('label'));
    expect(labels.map((label) => label.textContent?.trim())).toEqual([
      'Origen',
      'Puntos de referencia',
      'Capacidad máxima',
    ]);
    expect(labels.every((label) => label.control?.hasAttribute('required'))).toBe(true);
    expect(form.getAttribute('aria-labelledby')).toBe(form.querySelector('legend')?.id);
    expect(form.textContent).toContain('0 de 3 campos completados');
    expect(form.querySelector('textarea')).not.toBeNull();
    expect(form.querySelector('input[type="number"]')?.getAttribute('min')).toBe('1');
    expect(form.querySelector('button')?.textContent).toContain('Enviar datos');
    llenarRuta(form);
    fixture.detectChanges();
    expect(form.textContent).toContain('3 de 3 campos completados');
  });

  it.each(['0', '-1', '2.5'])(
    'bloquea capacidad inválida %s y vincula el error al control',
    async (valor) => {
      const fixture = crear();
      preguntar(fixture, textoRuta, aclaracion(detalleRuta));
      const form = formulario(fixture);
      llenarRuta(form);
      const capacidad = campo(form, 'capacidad', valor);
      fixture.detectChanges();
      expect(capacidad.getAttribute('aria-invalid')).toBe('false');
      enviarDatos(form);
      fixture.detectChanges();
      await fixture.whenStable();
      http.expectNone('/api/agent/chat');
      expect(capacidad.getAttribute('aria-invalid')).toBe('true');
      expect(form.ownerDocument.activeElement).toBe(capacidad);
      expect(capacidad.getAttribute('aria-describedby')).toContain(capacidad.id + '-error');
      expect(form.textContent).toContain('2 de 3 campos completados');
    },
  );

  it('envía una sola vez en la misma conversación y conserva la confirmación posterior', () => {
    const fixture = crear();
    preguntar(fixture, textoRuta, aclaracion(detalleRuta));
    const form = formulario(fixture);
    llenarRuta(form);
    enviarDatos(form);
    enviarDatos(form);
    fixture.detectChanges();
    expect(form.querySelector('fieldset')?.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.chat-estado').textContent).toContain(
      'Enviando datos',
    );
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body).toEqual({ message: rutaCompleta, conversationId: 'conv-aclaracion' });
    req.flush(
      respuesta({
        message: '¿Confirmas la ruta?',
        operacion: {
          estado: 'CONFIRMACION_REQUERIDA',
          id: null,
          detalle: '',
          confirmacion: {
            id: 'aaff49ca-bdfb-4ee7-bcc5-47c6526bf31b',
            tipo: 'CREAR_RUTA',
            estado: 'PENDIENTE',
            resumen: 'Ruta de Chorrillos a UPC.',
            parametros: {},
            expira: vencimiento(),
            resultado: null,
          },
        },
      }),
    );
    fixture.detectChanges();
    expect(formulario(fixture)).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Datos enviados');
    expect(fixture.nativeElement.querySelector('.confirmacion').textContent).toContain('Confirmar');
    expect(
      Array.from(
        fixture.nativeElement.querySelectorAll('.mensaje--usuario p') as NodeListOf<HTMLElement>,
      ).at(-1)?.textContent,
    ).toContain(rutaCompleta);
    http.expectNone('/api/agent/chat');
  });

  it('conserva las entradas tras un fallo de proveedor reconocido y muestra solo los valores aceptados', () => {
    const fixture = crear();
    preguntar(fixture, textoRuta, aclaracion(detalleRuta));
    const form = formulario(fixture);
    llenarRuta(form);
    enviarDatos(form);
    http.expectOne('/api/agent/chat').flush(
      { mensaje: 'Proveedor no disponible.', campos: { codigo: 'PROVIDER_UNAVAILABLE' } },
      {
        status: 503,
        statusText: 'Service Unavailable',
      },
    );
    fixture.detectChanges();
    expect(formulario(fixture)).toBe(form);
    expect(form.querySelector('input')?.value).toBe('Chorrillos');
    expect(form.textContent).toContain('Reintentar envío');
    expect(fixture.nativeElement.querySelector('.error-envio').textContent).toContain(
      'Proveedor no disponible',
    );
    campo(form, 'capacidad', '4');
    enviarDatos(form);
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body).toEqual({
      message: rutaCompleta.replace('3 pasajeros', '4 pasajeros'),
      conversationId: 'conv-aclaracion',
    });
    req.flush(respuesta());
    fixture.detectChanges();
    const usuarios = Array.from(
      fixture.nativeElement.querySelectorAll('.mensaje--usuario p') as NodeListOf<HTMLElement>,
    );
    expect(usuarios.map((item) => item.textContent?.trim())).toEqual([
      textoRuta,
      req.request.body.message,
    ]);
  });

  it('envía fecha y hora nuevas y deja en blanco un dato explícitamente opcional', () => {
    const fixture = crear();
    preguntar(
      fixture,
      'Quiero reprogramar el viaje de Surco',
      aclaracion(
        'Indica la nueva fecha y la hora del viaje. Si quieres, indica una descripción.',
        'reprogramarViaje',
      ),
    );
    const form = formulario(fixture);
    expect(form.querySelector('input[type="date"]')).not.toBeNull();
    expect(form.querySelector('input[type="time"]')).not.toBeNull();
    expect(form.querySelector('textarea')?.required).toBe(false);
    expect(form.textContent).toContain('Descripción (opcional)');
    campo(form, 'nuevaFecha', '2026-02-30');
    campo(form, 'nuevaHora', '26:15');
    enviarDatos(form);
    http.expectNone('/api/agent/chat');
    campo(form, 'nuevaFecha', '2026-12-10');
    campo(form, 'nuevaHora', '07:15');
    enviarDatos(form);
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body).toEqual({
      message: 'Quiero reprogramar el viaje de Surco con nueva fecha 2026-12-10 y nueva hora 07:15',
      conversationId: 'conv-aclaracion',
    });
    req.flush(respuesta());
  });

  it('limita el selector a las opciones que el asistente enumeró', () => {
    const fixture = crear();
    preguntar(
      fixture,
      'Quiero registrar un método',
      aclaracion('Indica el tipo de compensación (DINERO o FAVOR) y una descripción.'),
    );
    const form = formulario(fixture);
    const select = form.querySelector('select')!;
    expect(
      Array.from(select.options)
        .slice(1)
        .map((opcion) => opcion.value),
    ).toEqual(['DINERO', 'FAVOR']);
    const ajena = new Option('Gasolina', 'GASOLINA');
    select.add(ajena);
    campo(form, 'compensacion', 'GASOLINA');
    campo(form, 'descripcion', 'Apuntes');
    enviarDatos(form);
    http.expectNone('/api/agent/chat');
    campo(form, 'compensacion', 'FAVOR');
    enviarDatos(form);
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body.message).toBe(
      'Quiero registrar un método con tipo de compensación FAVOR y descripción Apuntes',
    );
    req.flush(respuesta());
  });

  it('ofrece solo las opciones rápidas explícitas y no envía una confirmación', () => {
    const fixture = crear();
    preguntar(
      fixture,
      'Quiero registrar un método',
      respuesta({
        message: '¿Qué tipo quieres para el nuevo método: DINERO, GASOLINA o FAVOR?',
      }),
    );
    const opciones = fixture.nativeElement.querySelector(
      '[role="group"][aria-label="Tipo de compensación"]',
    );
    const botones = Array.from(
      opciones.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    expect(botones.map((boton) => boton.textContent?.trim())).toEqual([
      'Dinero',
      'Gasolina',
      'Favor',
    ]);
    expect(botones.every((boton) => boton.type === 'button')).toBe(true);
    botones[1].click();
    botones[1].click();
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body).toEqual({ message: 'GASOLINA', conversationId: 'conv-aclaracion' });
    req.flush(
      respuesta({ message: '¿Qué descripción quieres asignar a tu nuevo método GASOLINA?' }),
    );
    fixture.detectChanges();
    expect(formulario(fixture).textContent).toContain('Descripción');
    expect(fixture.nativeElement.textContent).toContain('Datos enviados');
  });

  it('conserva el nombre de las alternativas citadas de un destino ambiguo', () => {
    const fixture = crear();
    preguntar(
      fixture,
      'Quiero buscar un viaje',
      aclaracion('¿Qué destino prefieres: «UPC Villa» o «UPC Monterrico»?', undefined, 'AMBIGUO'),
    );
    const opciones = fixture.nativeElement.querySelectorAll(
      '[role="group"][aria-label="Destino"] button',
    );
    expect(
      Array.from(opciones as NodeListOf<HTMLButtonElement>, (boton) => boton.textContent?.trim()),
    ).toEqual(['UPC Villa', 'UPC Monterrico']);
    opciones[0].click();
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body).toEqual({
      message: 'Quiero buscar un viaje con destino UPC Villa',
      conversationId: 'conv-aclaracion',
    });
    req.flush(respuesta());
  });

  it.each([
    respuesta({ message: '¿Quieres que te ayude con algo más?' }),
    aclaracion('Coinciden varias rutas. Indica cuál.', 'editarRuta', 'AMBIGUO'),
    aclaracion('Indica el origen o el destino actual de la ruta.', 'editarRuta'),
    aclaracion('Indica el origen y un código sin identificar.', 'crearRuta'),
    respuesta({
      message: detalleRuta,
      advertencia: { codigo: 'PROVIDER_UNAVAILABLE', mensaje: 'Servicio ocupado.' },
    }),
    respuesta({
      message: 'Indica la fecha.',
      resultados: [{ tipo: 'consultarMisEstadisticas', datos: { viajes: 8 } }],
    }),
  ])('mantiene la entrada libre para respuestas sin campos confiables (%s)', (cuerpo) => {
    const fixture = crear();
    preguntar(fixture, 'Consulta', cuerpo);
    expect(fixture.nativeElement.querySelector('app-formulario-aclaracion')).toBeNull();
    expect(fixture.nativeElement.querySelector('.composer textarea').disabled).toBe(false);
    if (cuerpo.advertencia)
      expect(fixture.nativeElement.textContent).toContain(cuerpo.advertencia.mensaje);
  });

  it('usa el dato estructurado de US29 para continuar el borrador del viaje', () => {
    const fixture = crear();
    preguntar(
      fixture,
      '¿Cuánto sugieres aportar para mi viaje?',
      respuesta({
        message: 'Precisemos la ocupación del viaje.',
        resultados: [{ tipo: 'sugerirContribucionViaje', datos: { estado: 'FALTAN_PASAJEROS' } }],
      }),
    );
    const form = formulario(fixture);
    campo(form, 'pasajeros', '2');
    enviarDatos(form);
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body).toEqual({ message: '2', conversationId: 'conv-aclaracion' });
    req.flush(respuesta({ message: 'La contribución sugerida es S/ 4.' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('La contribución sugerida es S/ 4.');
  });

  it.each(['Nueva conversación', 'Entrada libre'])(
    'invalida el formulario anterior al usar %s',
    (accion) => {
      const fixture = crear();
      preguntar(fixture, textoRuta, aclaracion(detalleRuta));
      const anterior = formulario(fixture);
      llenarRuta(anterior);
      if (accion === 'Nueva conversación') {
        fixture.nativeElement.querySelector('.chat-header button').click();
        fixture.detectChanges();
        escribir(fixture, 'Hola de nuevo');
      } else {
        escribir(fixture, '¿Cuántos viajes he completado?');
      }
      enviar(fixture);
      const req = http.expectOne('/api/agent/chat');
      expect(req.request.body.conversationId).toBe(
        accion === 'Nueva conversación' ? undefined : 'conv-aclaracion',
      );
      req.flush(respuesta());
      fixture.detectChanges();
      expect(formulario(fixture)).toBeNull();
      enviarDatos(anterior);
      http.expectNone('/api/agent/chat');
    },
  );

  it('descarta el formulario y su envío en curso al cambiar de rol', () => {
    const auth = TestBed.inject(AuthService);
    const usuario = {
      id: 7,
      nombre: 'Ana',
      correo: 'ana@upc.edu.pe',
      rol: 'CONDUCTOR',
      cuentaVerificada: true,
    };
    const token =
      'eyJhbGciOiJIUzI1NiJ9.' +
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 })) +
      '.fixture';
    auth
      .login({ correo: usuario.correo, contrasena: 'fixture', recordarDispositivo: false })
      .subscribe();
    http.expectOne('/api/auth/login').flush({ usuario, token });
    const fixture = crear();
    preguntar(fixture, textoRuta, respuestaV1(ACLARACION_REFERENCIAS));
    const form = formulario(fixture);
    campo(form, 'referencias', 'Parque de Chorrillos');
    enviarDatos(form);
    const anterior = http.expectOne('/api/agent/chat');
    auth.cambiarRol('PASAJERO').subscribe();
    http.expectOne('/api/usuarios/rol').flush({ ...usuario, rol: 'PASAJERO' });
    fixture.detectChanges();
    expect(anterior.cancelled).toBe(true);
    expect(formulario(fixture)).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Chorrillos');
    escribir(fixture, 'Busca viajes');
    enviar(fixture);
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body).toEqual({ message: 'Busca viajes' });
    req.flush(respuesta());
    auth.clearSession();
  });

  it('continúa por formulario una aclaración recibida tras un mensaje de voz', async () => {
    const fixture = crear();
    const voz = TestBed.inject(AgenteVozService);
    vi.spyOn(voz, 'iniciar').mockResolvedValue();
    vi.spyOn(voz, 'detener').mockResolvedValue(
      new Blob([new Uint8Array(2048)], { type: 'audio/webm' }),
    );
    const hablar = vi.spyOn(voz, 'hablar').mockImplementation(() => undefined);
    const micro = fixture.nativeElement.querySelector('.composer-mic') as HTMLButtonElement;
    micro.click();
    await esperar();
    micro.click();
    await esperar();
    http.expectOne('/api/agent/voz').flush({
      transcripcion: textoRuta,
      textoHablado: 'Completa los datos de la ruta.',
      respuesta: aclaracion(detalleRuta, 'crearRuta'),
    });
    fixture.detectChanges();
    expect(hablar).toHaveBeenCalledWith('Completa los datos de la ruta.');
    const form = formulario(fixture);
    llenarRuta(form);
    enviarDatos(form);
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body).toEqual({ message: rutaCompleta, conversationId: 'conv-aclaracion' });
    req.flush(respuesta());
  });

  function vencimiento(): string {
    return new Date(Date.now() + 300_000).toISOString();
  }

  function boton(
    fixture: ComponentFixture<Asistente>,
    texto: string,
  ): HTMLButtonElement | undefined {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent?.trim() === texto);
  }

  function propuesta(id: string, expira = vencimiento()): ConfirmacionResumen {
    return {
      id,
      expira,
      tipo: 'CREAR_RUTA',
      estado: 'PENDIENTE',
      resumen: 'Crear ruta Surco a UPC.',
      parametros: {},
      resultado: null,
    };
  }

  function confirmarPropuesta(
    confirmacion: ConfirmacionResumen,
    conversationId = CONVERSACION,
  ): ChatRespuesta {
    return respuesta({
      conversationId,
      message: 'Revisa la propuesta.',
      operacion: { estado: 'CONFIRMACION_REQUERIDA', detalle: '', id: null, confirmacion },
    });
  }

  async function enviarGrabacion(fixture: ComponentFixture<Asistente>): Promise<void> {
    const voz = TestBed.inject(AgenteVozService);
    vi.spyOn(voz, 'iniciar').mockResolvedValue();
    vi.spyOn(voz, 'detener').mockResolvedValue(
      new Blob([new Uint8Array(2048)], { type: 'audio/webm' }),
    );
    vi.spyOn(voz, 'hablar').mockImplementation(() => undefined);
    const micro = fixture.nativeElement.querySelector('.composer-mic') as HTMLButtonElement;
    micro.click();
    await esperar();
    fixture.detectChanges();
    micro.click();
    await esperar();
    fixture.detectChanges();
  }

  const propuestaViaje = (): ConfirmacionResumen => ({
    ...propuesta('c886e9b6-b416-4676-9f77-34fec2c238d0'),
    tipo: 'CREAR_VIAJE',
    resumen:
      'Programar un viaje desde Surco hacia UPC Monterrico el 2026-12-10 a las 07:00, capacidad 3. Referencias: Parque central.',
    parametros: { fecha: '2026-12-10', hora: '07:00:00' },
  });

  it('envía la referencia exacta y la fecha en el parcial de crear viaje, y luego pide solo la hora', () => {
    const fixture = crear();
    preguntar(fixture, 'Quiero crear un viaje', {
      ...respuestaV1(
        ACLARACION_VIAJE,
        'Selecciona una de tus rutas registradas. Indica la fecha de salida. Indica la hora de salida.',
      ),
      conversationId: CONVERSACION_VIAJE,
    });
    const form = formulario(fixture);
    const opciones = ACLARACION_VIAJE.campos[0].opciones!;
    expect(
      Array.from(form.querySelectorAll('label'), (label) => label.textContent?.trim()),
    ).toEqual(['Ruta registrada', 'Fecha', 'Hora']);
    expect(
      Array.from(form.querySelectorAll('option'), (opcion) => opcion.textContent?.trim()).slice(1),
    ).toEqual(opciones.map(({ etiqueta }) => etiqueta));
    campo(form, 'ruta', opciones[0].valor);
    campo(form, 'fecha', '2026-12-10');
    fixture.detectChanges();
    boton(fixture, 'Enviar datos disponibles')!.click();
    const parcial = http.expectOne('/api/agent/chat');
    expect(parcial.request.body).toEqual({
      conversationId: CONVERSACION_VIAJE,
      message:
        'Datos de aclaración ' +
        ACLARACION_VIAJE.id +
        ': {"ruta":"22e75375-0978-45ea-8535-bb459262cf32","fecha":"2026-12-10"}',
    });
    parcial.flush({
      ...respuestaV1(ACLARACION_HORA_VIAJE, 'Indica hora.'),
      conversationId: CONVERSACION_VIAJE,
    });
    fixture.detectChanges();
    expect(formulario(fixture)).not.toBe(form);
    expect(
      Array.from(formulario(fixture).querySelectorAll('label'), (label) =>
        label.textContent?.trim(),
      ),
    ).toEqual(['Hora']);
    expect(fixture.nativeElement.textContent).toContain('Ruta registrada: ' + opciones[0].etiqueta);
    expect(fixture.nativeElement.textContent).toContain('Fecha: 2026-12-10');
    expect(fixture.nativeElement.textContent).not.toContain(opciones[0].valor);
    expect(fixture.nativeElement.textContent).not.toContain(ACLARACION_VIAJE.id);

    campo(formulario(fixture), 'hora', '07:00');
    enviarDatos(formulario(fixture));
    const hora = http.expectOne('/api/agent/chat');
    expect(hora.request.body).toEqual({
      conversationId: CONVERSACION_VIAJE,
      message: 'Datos de aclaración ' + ACLARACION_HORA_VIAJE.id + ': {"hora":"07:00"}',
    });
    const recibo = propuestaViaje();
    hora.flush(confirmarPropuesta(recibo, CONVERSACION_VIAJE));
    fixture.detectChanges();
    expect(formulario(fixture)).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(recibo.resumen);
    expect(boton(fixture, 'Confirmar')).toBeDefined();
    http.expectNone(
      (req) => req.url.startsWith('/api/rutas') || req.url.includes('/confirmaciones/'),
    );
  });

  it('reemplaza el descriptor al corregir un origen inexistente con fecha y hora ya conocidas', () => {
    const fixture = crear();
    const conversationId = 'b0d0c397-2f78-4814-af53-7ac0cb9e6b19';
    preguntar(fixture, 'Quiero crear un viaje', {
      ...respuestaV1(ACLARACION_VIAJE),
      conversationId,
    });
    const anterior = formulario(fixture);
    escribir(fixture, 'Desde Lurín el 10 de diciembre de 2026 a las 7 de la mañana');
    enviar(fixture);
    const correccion = http.expectOne('/api/agent/chat');
    expect(correccion.request.body.conversationId).toBe(conversationId);
    correccion.flush({
      ...respuestaV1(
        ACLARACION_CORREGIR_RUTA,
        'No encontré una ruta propia con esos datos. Selecciona una de tus rutas registradas.',
      ),
      conversationId,
      operacion: {
        estado: 'NO_ENCONTRADO',
        detalle: 'No encontré una ruta propia.',
        id: null,
        confirmacion: null,
      },
    });
    fixture.detectChanges();
    expect(anterior.isConnected).toBe(false);
    expect(formulario(fixture)).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('app-formulario-aclaracion input')).toHaveLength(
      0,
    );
    const opcion = ACLARACION_CORREGIR_RUTA.campos[0].opciones![0];
    boton(fixture, opcion.etiqueta)!.click();
    const ruta = http.expectOne('/api/agent/chat');
    expect(ruta.request.body).toEqual({
      conversationId,
      message:
        'Datos de aclaración 728a3aad-033c-4c94-ba9b-58538be4d3ed: {"ruta":"19252154-3384-46d4-abce-0d35ef31e4c5"}',
    });
    ruta.flush(confirmarPropuesta(propuestaViaje(), conversationId));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2026-12-10 a las 07:00');
    expect(fixture.nativeElement.textContent).not.toContain(opcion.valor);
    expect(boton(fixture, 'Confirmar')).toBeDefined();
  });

  it('distingue rutas del mismo origen, destino y capacidad mediante las etiquetas de Java', () => {
    const fixture = crear();
    const conversationId = 'acf33180-8e74-4eed-ab8e-0317eb17d2fd';
    preguntar(
      fixture,
      'Crea un viaje desde Surco el 10 de diciembre de 2026 a las 7 de la mañana',
      {
        ...respuestaV1(
          ACLARACION_RUTAS_SIMILARES,
          'Coinciden varias de tus rutas. Selecciona una de tus rutas registradas.',
        ),
        conversationId,
      },
    );
    const opciones = ACLARACION_RUTAS_SIMILARES.campos[0].opciones!;
    const botones = fixture.nativeElement.querySelectorAll(
      'app-formulario-aclaracion button',
    ) as NodeListOf<HTMLButtonElement>;
    expect(Array.from(botones, (boton) => boton.textContent?.trim())).toEqual(
      opciones.map(({ etiqueta }) => etiqueta),
    );
    botones[1].click();
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body).toEqual({
      conversationId,
      message:
        'Datos de aclaración 658ff969-eddf-4083-9acc-39626ed499ad: {"ruta":"944c514d-1969-431b-a286-225abaf9e363"}',
    });
    req.flush(
      confirmarPropuesta(
        {
          ...propuestaViaje(),
          resumen: propuestaViaje().resumen.replace('Parque central', 'Óvalo Higuereta'),
        },
        conversationId,
      ),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ruta registrada: ' + opciones[1].etiqueta);
    expect(fixture.nativeElement.textContent).not.toContain(opciones[1].valor);
  });

  it('envía un parcial, reemplaza el UUID y presenta los datos sin el formato interno', () => {
    const fixture = crear();
    preguntar(
      fixture,
      'Crea una ruta desde Surco',
      respuestaV1(ACLARACION_RUTA, 'Redacción libre.'),
    );
    const anterior = formulario(fixture);
    expect(
      Array.from(anterior.querySelectorAll('label'), (label) => label.textContent?.trim()),
    ).toEqual(['Puntos de referencia', 'Capacidad máxima']);
    campo(anterior, 'capacidad', '3');
    fixture.detectChanges();
    boton(fixture, 'Enviar datos disponibles')!.click();
    boton(fixture, 'Enviar datos disponibles')!.click();
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body).toEqual({
      message: 'Datos de aclaración ' + ACLARACION_RUTA.id + ': {"capacidad":3}',
      conversationId: CONVERSACION,
    });
    expect(fixture.nativeElement.textContent).not.toContain('Datos enviados');
    req.flush(respuestaV1(ACLARACION_REFERENCIAS));
    fixture.detectChanges();
    expect(formulario(fixture)).not.toBe(anterior);
    expect(formulario(fixture).querySelectorAll('label')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Capacidad máxima: 3');
    expect(fixture.nativeElement.textContent).not.toContain(ACLARACION_RUTA.id);
    expect(fixture.nativeElement.textContent).not.toContain('{"capacidad":3}');
    expect(fixture.nativeElement.textContent).toContain('Datos enviados');
    campo(formulario(fixture), 'referencias', 'UPC Villa');
    enviarDatos(formulario(fixture));
    const siguiente = http.expectOne('/api/agent/chat');
    expect(siguiente.request.body).toEqual({
      message: 'Datos de aclaración ' + ACLARACION_REFERENCIAS.id + ': {"referencias":"UPC Villa"}',
      conversationId: CONVERSACION,
    });
    const recibo = propuesta('0407b1ff-2144-46e7-8fc7-e0c5be778fb5');
    siguiente.flush(confirmarPropuesta(recibo));
    fixture.detectChanges();
    expect(formulario(fixture)).toBeNull();
    const confirmar = boton(fixture, 'Confirmar')!;
    http.expectNone('/api/agent/confirmaciones/' + recibo.id + '/confirmar');
    confirmar.click();
    confirmar.click();
    const decision = http.expectOne('/api/agent/confirmaciones/' + recibo.id + '/confirmar');
    expect(decision.request.method).toBe('POST');
    expect(decision.request.body).toBeNull();
    decision.flush({
      ...recibo,
      estado: 'EJECUTADA',
      resultado: { estado: 'EXITO', detalle: 'Ruta creada.', id: 7, confirmacion: null },
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Estado: Ejecutada');
    expect(fixture.nativeElement.textContent).toContain('Ruta creada.');
  });

  it('conserva la instancia durante texto libre y reconcilia el mismo UUID', () => {
    const fixture = crear();
    preguntar(fixture, textoRuta, respuestaV1(ACLARACION_RUTA));
    const form = formulario(fixture);
    campo(form, 'referencias', 'Parque central');
    boton(fixture, 'Ocultar formulario')!.click();
    fixture.detectChanges();
    expect(form.closest('[hidden]')).not.toBeNull();
    boton(fixture, 'Mostrar formulario')!.click();
    fixture.detectChanges();
    expect(form.closest('[hidden]')).toBeNull();
    escribir(fixture, 'Continúa con la solicitud');
    enviar(fixture);
    expect(formulario(fixture)).toBe(form);
    expect(form.querySelector('fieldset')?.disabled).toBe(true);
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body.conversationId).toBe(CONVERSACION);
    req.flush({
      ...respuestaV1(ACLARACION_RUTA, 'Aún hay una aclaración activa.'),
      advertencia: { codigo: 'PROVIDER_RATE_LIMIT', mensaje: 'Límite temporal del proveedor.' },
    });
    fixture.detectChanges();
    expect(formulario(fixture)).toBe(form);
    expect(form.querySelector('fieldset')?.disabled).toBe(false);
    expect(form.querySelector('textarea')?.value).toBe('Parque central');
    expect(fixture.nativeElement.querySelectorAll('app-formulario-aclaracion')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Límite temporal del proveedor.');
  });

  it('conserva la instancia durante voz y la retira si la respuesta no trae aclaración', async () => {
    const fixture = crear();
    preguntar(fixture, textoRuta, respuestaV1(ACLARACION_RUTA));
    const anterior = formulario(fixture);
    await enviarGrabacion(fixture);
    expect(anterior.querySelector('fieldset')?.disabled).toBe(true);
    const req = http.expectOne('/api/agent/voz');
    expect((req.request.body as FormData).get('conversationId')).toBe(CONVERSACION);
    req.flush({
      transcripcion: '¿Cuáles son mis rutas?',
      textoHablado: 'Datos recibidos.',
      respuesta: respuesta({ conversationId: CONVERSACION, message: 'Indica el origen.' }),
    });
    fixture.detectChanges();
    expect(formulario(fixture)).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('¿Cuáles son mis rutas?');
  });

  it('usa respuesta.aclaracion al recibir el descriptor por voz', async () => {
    const fixture = crear();
    await enviarGrabacion(fixture);
    http.expectOne('/api/agent/voz').flush({
      transcripcion: 'Crea una ruta desde Surco con capacidad 3',
      textoHablado: 'Indica las referencias.',
      respuesta: respuestaV1(ACLARACION_REFERENCIAS, 'Todavía falta un dato.'),
    });
    fixture.detectChanges();
    expect(formulario(fixture).querySelectorAll('label')).toHaveLength(1);
    campo(formulario(fixture), 'referencias', 'UPC Villa');
    enviarDatos(formulario(fixture));
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body.message).toBe(
      'Datos de aclaración ' + ACLARACION_REFERENCIAS.id + ': {"referencias":"UPC Villa"}',
    );
    req.flush(respuesta({ conversationId: CONVERSACION }));
  });

  it('envía la opción rápida técnica y muestra su etiqueta', () => {
    const fixture = crear();
    preguntar(fixture, 'Quiero solicitar un cupo', respuestaV1(ACLARACION_CUPO));
    const opcion = boton(fixture, 'Gasolina')!;
    expect(opcion.type).toBe('button');
    opcion.click();
    opcion.click();
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body).toEqual({
      message: 'Datos de aclaración ' + ACLARACION_CUPO.id + ': {"compensacion":"GASOLINA"}',
      conversationId: CONVERSACION,
    });
    req.flush(respuesta({ conversationId: CONVERSACION }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tipo de compensación: Gasolina');
    expect(fixture.nativeElement.textContent).not.toContain('GASOLINA');
  });

  it('valida el tamaño técnico exacto incluyendo el UUID, el prefijo y el escapado', () => {
    const fixture = crear();
    preguntar(fixture, textoRuta, respuestaV1(ACLARACION_REFERENCIAS));
    const form = formulario(fixture);
    const sobreVacio = 'Datos de aclaración ' + ACLARACION_REFERENCIAS.id + ': {"referencias":""}';
    const valor = 'x'.repeat(1000 - sobreVacio.length);
    campo(form, 'referencias', valor + '"');
    enviarDatos(form);
    fixture.detectChanges();
    http.expectNone('/api/agent/chat');
    expect(fixture.nativeElement.textContent).toContain('supera los 1000 caracteres');
    campo(form, 'referencias', valor);
    enviarDatos(form);
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body.message).toHaveLength(1000);
    req.flush(respuesta({ conversationId: CONVERSACION }));
  });

  it('mantiene un formulario editable tras HTTP 400 y lo retira al expirar el UUID', () => {
    const fixture = crear();
    preguntar(fixture, textoRuta, respuestaV1(ACLARACION_REFERENCIAS));
    const form = formulario(fixture);
    campo(form, 'referencias', 'Dato inicial');
    enviarDatos(form);
    http
      .expectOne('/api/agent/chat')
      .flush({ mensaje: 'Revisa la referencia.' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(formulario(fixture)).toBe(form);
    expect(form.querySelector('textarea')?.value).toBe('Dato inicial');
    expect(fixture.nativeElement.textContent).toContain('Revisa la referencia.');
    expect(fixture.nativeElement.textContent).not.toContain('Datos enviados');
    campo(form, 'referencias', 'Referencia corregida');
    enviarDatos(form);
    http
      .expectOne('/api/agent/chat')
      .flush(
        { campos: { codigo: 'CLARIFICATION_EXPIRED' } },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();
    expect(formulario(fixture)).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Este formulario ya no está vigente.');
    expect(boton(fixture, 'Reintentar')).toBeUndefined();
  });

  it('retira una aclaración ante un resultado de preparación incierto', () => {
    const fixture = crear();
    preguntar(fixture, textoRuta, respuestaV1(ACLARACION_REFERENCIAS));
    campo(formulario(fixture), 'referencias', 'Parque central');
    enviarDatos(formulario(fixture));
    http.expectOne('/api/agent/chat').flush({
      ...respuestaV1(ACLARACION_REFERENCIAS),
      advertencia: {
        codigo: 'PREPARATION_RESULT_UNCERTAIN',
        mensaje:
          'No se pudo determinar si la propuesta quedó registrada. Revisa tus confirmaciones antes de solicitarla de nuevo.',
      },
    });
    fixture.detectChanges();
    expect(formulario(fixture)).toBeNull();
    expect(boton(fixture, 'Reintentar')).toBeUndefined();
    expect(boton(fixture, 'Consultar estado')).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Revisa tus confirmaciones');
    expect(fixture.nativeElement.textContent).not.toContain('Datos enviados');
  });

  it('un timeout conserva valores en modo de referencia y bloquea el reenvío', () => {
    const fixture = crear();
    preguntar(fixture, textoRuta, respuestaV1(ACLARACION_REFERENCIAS));
    const form = formulario(fixture);
    campo(form, 'referencias', 'Parque central');
    const chat = vi
      .spyOn(TestBed.inject(AgenteService), 'chat')
      .mockReturnValueOnce(throwError(() => new TimeoutError()));
    enviarDatos(form);
    fixture.detectChanges();
    expect(formulario(fixture)).toBe(form);
    expect(form.querySelector('textarea')?.value).toBe('Parque central');
    expect(form.querySelector('fieldset')?.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('El mensaje pudo llegar al asistente');
    enviarDatos(form);
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it('cancela la escucha del turno anterior al iniciar otra conversación', () => {
    const fixture = crear();
    preguntar(fixture, textoRuta, respuestaV1(ACLARACION_REFERENCIAS));
    campo(formulario(fixture), 'referencias', 'Parque central');
    enviarDatos(formulario(fixture));
    const anterior = http.expectOne('/api/agent/chat');
    fixture.detectChanges();
    boton(fixture, 'Nueva conversación')!.click();
    fixture.detectChanges();
    expect(anterior.cancelled).toBe(true);
    expect(formulario(fixture)).toBeNull();
    escribir(fixture, 'Otro viaje');
    enviar(fixture);
    const actual = http.expectOne('/api/agent/chat');
    expect(actual.request.body).toEqual({ message: 'Otro viaje' });
    actual.flush(respuesta({ message: 'Conversación nueva.' }));
  });

  it('la tarjeta anterior no puede decidir y Cancelar utiliza únicamente el UUID activo', () => {
    const fixture = crear();
    const primera = propuesta('cac843b9-2009-437d-a6d6-10fdf88d44c9');
    const segunda = propuesta('a34ebb41-3996-4911-bbdf-3378b6355cfe');
    preguntar(fixture, 'Prepara una ruta', confirmarPropuesta(primera));
    const botonAnterior = boton(fixture, 'Confirmar')!;
    preguntar(fixture, 'Prepara otra ruta', confirmarPropuesta(segunda));
    botonAnterior.click();
    http.expectNone('/api/agent/confirmaciones/' + primera.id + '/confirmar');
    http.expectNone('/api/agent/confirmaciones/' + segunda.id + '/confirmar');
    expect(fixture.nativeElement.textContent).toContain('Propuesta anterior');
    boton(fixture, 'Cancelar')!.click();
    const req = http.expectOne('/api/agent/confirmaciones/' + segunda.id + '/cancelar');
    expect(req.request.body).toBeNull();
    req.flush({ ...segunda, estado: 'CANCELADA' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Estado: Cancelada');
  });

  it('retira la decisión anterior tras HTTP 429 y permite consultar el recibo sin reactivarla', () => {
    const fixture = crear();
    const recibo = propuesta('58b6621e-a7e6-4de6-8ebf-4a320b87142e');
    preguntar(fixture, 'Prepara una ruta', confirmarPropuesta(recibo));
    const confirmar = boton(fixture, 'Confirmar')!;
    escribir(fixture, '¿Cuántos viajes he completado?');
    enviar(fixture);
    expect(confirmar.disabled).toBe(true);
    const turno = http.expectOne('/api/agent/chat');
    expect(turno.request.body.conversationId).toBe(CONVERSACION);
    turno.flush(
      { mensaje: 'Límite del proveedor.', campos: { codigo: 'PROVIDER_RATE_LIMIT' } },
      { status: 429, statusText: 'Too Many Requests' },
    );
    fixture.detectChanges();
    expect(boton(fixture, 'Confirmar')).toBeUndefined();
    expect(boton(fixture, 'Cancelar')).toBeUndefined();
    expect(boton(fixture, 'Reintentar')).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Propuesta anterior');
    confirmar.click();
    boton(fixture, 'Consultar estado')!.click();
    const consulta = http.expectOne('/api/agent/confirmaciones/' + recibo.id);
    expect(consulta.request.method).toBe('GET');
    consulta.flush(recibo);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Pendiente en el servidor (propuesta anterior)',
    );
    expect(boton(fixture, 'Confirmar')).toBeUndefined();
    expect(boton(fixture, 'Cancelar')).toBeUndefined();
    http.expectNone((req) => req.method === 'POST');
  });

  it.each([
    [429, 'PROVIDER_RATE_LIMIT'],
    [503, 'PROVIDER_UNAVAILABLE'],
  ])('retira las acciones de la propuesta ante un fallo de voz %s (%s)', async (status, codigo) => {
    const fixture = crear();
    const recibo = propuesta('89b870c2-f869-4b32-9c83-b38a91099a5c');
    preguntar(fixture, 'Prepara una ruta', confirmarPropuesta(recibo));
    await enviarGrabacion(fixture);
    expect(boton(fixture, 'Confirmar')?.disabled).toBe(true);
    const voz = http.expectOne('/api/agent/voz');
    expect((voz.request.body as FormData).get('conversationId')).toBe(CONVERSACION);
    voz.flush({ campos: { codigo } }, { status, statusText: 'Provider Error' });
    fixture.detectChanges();
    expect(boton(fixture, 'Confirmar')).toBeUndefined();
    expect(boton(fixture, 'Cancelar')).toBeUndefined();
    boton(fixture, 'Consultar estado')!.click();
    http.expectOne({ method: 'GET', url: '/api/agent/confirmaciones/' + recibo.id }).flush(recibo);
    fixture.detectChanges();
    expect(boton(fixture, 'Confirmar')).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain(
      'Pendiente en el servidor (propuesta anterior)',
    );
  });

  it('conserva la propuesta cuando la transcripción falla antes de abrir un turno', async () => {
    const fixture = crear();
    const recibo = propuesta('370db1cf-76ae-4fdb-bda3-0b69a6b9559b');
    preguntar(fixture, 'Prepara una ruta', confirmarPropuesta(recibo));
    await enviarGrabacion(fixture);
    http
      .expectOne('/api/agent/voz')
      .flush(
        { campos: { codigo: 'VOICE_NOT_UNDERSTOOD' } },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();
    expect(boton(fixture, 'Confirmar')?.disabled).toBe(false);
    boton(fixture, 'Cancelar')!.click();
    http
      .expectOne({ method: 'POST', url: '/api/agent/confirmaciones/' + recibo.id + '/cancelar' })
      .flush({ ...recibo, estado: 'CANCELADA' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Estado: Cancelada');
  });

  it.each(['rol', 'conversación'])(
    'descarta una consulta pendiente de confirmación al cambiar de %s',
    (cambio) => {
      const auth = TestBed.inject(AuthService);
      const usuario = {
        id: 7,
        nombre: 'Ana',
        correo: 'ana@upc.edu.pe',
        rol: 'CONDUCTOR',
        cuentaVerificada: true,
      };
      const token =
        'eyJhbGciOiJIUzI1NiJ9.' +
        btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 })) +
        '.fixture';
      auth
        .login({ correo: usuario.correo, contrasena: 'fixture', recordarDispositivo: false })
        .subscribe();
      http.expectOne('/api/auth/login').flush({ usuario, token });
      const fixture = crear();
      const recibo = propuesta('6282694a-9254-4d65-91ac-ea3e20aabe78');
      preguntar(fixture, 'Prepara una ruta', confirmarPropuesta(recibo));
      preguntar(fixture, 'Consulta mi historial', respuesta());
      boton(fixture, 'Consultar estado')!.click();
      const consulta = http.expectOne({
        method: 'GET',
        url: '/api/agent/confirmaciones/' + recibo.id,
      });
      fixture.detectChanges();
      if (cambio === 'rol') {
        auth.cambiarRol('PASAJERO').subscribe();
        http.expectOne('/api/usuarios/rol').flush({ ...usuario, rol: 'PASAJERO' });
      } else {
        boton(fixture, 'Nueva conversación')!.click();
      }
      fixture.detectChanges();
      expect(consulta.cancelled).toBe(true);
      expect(fixture.nativeElement.querySelectorAll('.confirmacion')).toHaveLength(0);
      auth.clearSession();
    },
  );

  it('reconcilia una confirmación mediante voz con el UUID de su recibo', async () => {
    const fixture = crear();
    const recibo = propuesta('f679bd20-01fa-435f-a0d1-5a728a559168');
    preguntar(fixture, 'Prepara una ruta', confirmarPropuesta(recibo));
    await enviarGrabacion(fixture);
    const voz = http.expectOne('/api/agent/voz');
    expect((voz.request.body as FormData).get('conversationId')).toBe(CONVERSACION);
    voz.flush({
      transcripcion: 'Sí, confirmo',
      textoHablado: 'Ruta creada.',
      respuesta: respuesta({
        conversationId: CONVERSACION,
        message: 'Ruta creada.',
        resolucionConfirmacion: {
          estado: 'EJECUTADA',
          confirmacion: { ...recibo, estado: 'EJECUTADA' },
        },
      }),
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Estado: Ejecutada');
    expect(boton(fixture, 'Confirmar')).toBeUndefined();
  });

  it('deshabilita la propuesta vencida y refleja una expiración del backend', () => {
    const fixture = crear();
    const vencida = propuesta('78101d25-88e4-4cfb-9c88-5e8606cd4dbd', '2000-01-01T12:00:00Z');
    preguntar(fixture, 'Prepara una ruta', confirmarPropuesta(vencida));
    expect(boton(fixture, 'Confirmar')).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Expirada');
    const recibo = propuesta('f03f265b-a5e2-4b4e-b67f-1f7a8cb38397');
    preguntar(fixture, 'Otra ruta', confirmarPropuesta(recibo));
    boton(fixture, 'Confirmar')!.click();
    http
      .expectOne('/api/agent/confirmaciones/' + recibo.id + '/confirmar')
      .flush({ ...recibo, estado: 'EXPIRADA' }, { status: 410, statusText: 'Gone' });
    fixture.detectChanges();
    expect(boton(fixture, 'Confirmar')).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Expirada');
  });

  it('exige consultar el UUID original después de una decisión incierta', () => {
    const fixture = crear();
    const recibo = propuesta('db470653-f74b-4dc9-b3da-bf75552d06ae');
    preguntar(fixture, 'Prepara una ruta', confirmarPropuesta(recibo));
    boton(fixture, 'Confirmar')!.click();
    http
      .expectOne('/api/agent/confirmaciones/' + recibo.id + '/confirmar')
      .flush(
        { campos: { codigo: 'CONFIRMATION_RESULT_UNCERTAIN' } },
        { status: 503, statusText: 'Unavailable' },
      );
    fixture.detectChanges();
    expect(boton(fixture, 'Confirmar')).toBeUndefined();
    boton(fixture, 'Consultar estado')!.click();
    const consulta = http.expectOne('/api/agent/confirmaciones/' + recibo.id);
    expect(consulta.request.method).toBe('GET');
    consulta.flush({ ...recibo, estado: 'EJECUTADA' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Estado: Ejecutada');
  });

  const textoCampo = (
    id: string,
    etiqueta: string,
    tipo: CampoAclaracion['tipo'] = 'text',
  ): CampoAclaracion => ({ id, etiqueta, tipo, obligatorio: true });
  const selectCampo = (
    id: string,
    etiqueta: string,
    valor: string,
    nombre: string,
  ): CampoAclaracion => ({
    ...textoCampo(id, etiqueta, 'select'),
    opciones: [{ valor, etiqueta: nombre }],
  });
  const flujos: [string, string, CampoAclaracion, string, string | number][] = [
    [
      'crearRuta',
      'Crea una ruta desde Surco con capacidad 3',
      textoCampo('referencias', 'Puntos de referencia', 'textarea'),
      'UPC Villa',
      'UPC Villa',
    ],
    [
      'editarRuta',
      'Edita mi ruta de Surco',
      textoCampo('nuevoOrigen', 'Nuevo origen'),
      'Barranco',
      'Barranco',
    ],
    [
      'crearViaje',
      'Crea un viaje',
      textoCampo('fecha', 'Fecha', 'date'),
      '2027-01-23',
      '2027-01-23',
    ],
    [
      'reprogramarViaje',
      'Reprograma el viaje',
      textoCampo('nuevaHora', 'Nueva hora', 'time'),
      '07:30',
      '07:30',
    ],
    ['cancelarSolicitud', 'Cancela mi solicitud', textoCampo('destino', 'Destino'), 'UPC', 'UPC'],
    [
      'registrarMetodoCompensacion',
      'Registra un método',
      textoCampo('descripcion', 'Descripción', 'textarea'),
      'Apuntes',
      'Apuntes',
    ],
    [
      'actualizarMetodoCompensacion',
      'Edita un método',
      selectCampo('nuevoTipo', 'Nuevo tipo', 'DINERO', 'Dinero'),
      'DINERO',
      'DINERO',
    ],
    [
      'cambiarEstadoMetodoCompensacion',
      'Activa un método',
      textoCampo('descripcionActual', 'Descripción actual'),
      'Tarifa',
      'Tarifa',
    ],
    [
      'cambiarEstadoMetodoCompensacion',
      'Desactiva un método',
      selectCampo('tipoActual', 'Tipo actual', 'FAVOR', 'Favor'),
      'FAVOR',
      'FAVOR',
    ],
    [
      'eliminarMetodoCompensacion',
      'Elimina un método',
      textoCampo('descripcionActual', 'Descripción actual'),
      'Apuntes',
      'Apuntes',
    ],
    [
      'sugerirContribucionViaje',
      'Sugiere una contribución',
      textoCampo('pasajeros', 'Pasajeros', 'number'),
      '2',
      2,
    ],
    [
      'prepararDescargaHistorialPdf',
      'Corrige el filtro del PDF',
      textoCampo('anio', 'Año', 'number'),
      '2026',
      2026,
    ],
  ];
  it.each(flujos)(
    'envía los campos del descriptor para %s (%s)',
    (operacion, solicitud, control, entrada, salida) => {
      const fixture = crear();
      const descriptor = {
        ...ACLARACION_REFERENCIAS,
        operacion,
        contexto: solicitud,
        campos: [control],
      };
      preguntar(fixture, solicitud, respuestaV1(descriptor, 'Indica el origen.'));
      const form = formulario(fixture);
      expect(form.querySelectorAll('label')).toHaveLength(1);
      expect(form.querySelector('label')?.textContent?.trim()).toBe(control.etiqueta);
      campo(form, control.id, entrada);
      enviarDatos(form);
      const req = http.expectOne('/api/agent/chat');
      expect(req.request.body.message).toBe(
        'Datos de aclaración ' + descriptor.id + ': ' + JSON.stringify({ [control.id]: salida }),
      );
      req.flush(respuesta({ conversationId: CONVERSACION }));
    },
  );

  it('envía solo el criterio elegido para eliminar una ruta', () => {
    const fixture = crear();
    preguntar(fixture, 'Elimina una ruta', respuestaV1(ACLARACION_ELIMINAR));
    const form = formulario(fixture);
    campo(form, 'origenActual', 'Surco');
    enviarDatos(form);
    const req = http.expectOne('/api/agent/chat');
    expect(req.request.body.message).toBe(
      'Datos de aclaración ' + ACLARACION_ELIMINAR.id + ': {"origenActual":"Surco"}',
    );
    req.flush(respuesta({ conversationId: CONVERSACION }));
  });

  async function esperar(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
  }
});
