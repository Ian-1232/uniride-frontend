import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ChatRespuesta, EstadoOperacion } from '../../core/models/agente.models';
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
    expect(fixture.nativeElement.querySelector('app-formulario-aclaracion')).toBeNull();
    expect(fixture.nativeElement.querySelector('.chat-estado').textContent).toContain(
      'Esperando confirmación',
    );
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
            id: 'conf-ruta',
            tipo: 'CREAR_RUTA',
            estado: 'PENDIENTE',
            resumen: 'Ruta de Chorrillos a UPC.',
            parametros: {},
            expira: '2026-12-01T07:00:00Z',
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

  it('conserva las entradas tras HTTP 503 y reutiliza la burbuja al editar y reintentar', () => {
    const fixture = crear();
    preguntar(fixture, textoRuta, aclaracion(detalleRuta));
    const form = formulario(fixture);
    llenarRuta(form);
    enviarDatos(form);
    http.expectOne('/api/agent/chat').flush(
      { mensaje: 'Proveedor no disponible.' },
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
    preguntar(fixture, textoRuta, aclaracion(detalleRuta));
    const form = formulario(fixture);
    llenarRuta(form);
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

  async function esperar(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
  }
});
