import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AclaracionAgenteV1 } from '../../core/models/aclaracion.models';
import { ACLARACION_ELIMINAR, ACLARACION_RUTA } from '../../core/models/aclaracion.testing';
import { FormularioAclaracionComponent } from './formulario-aclaracion';

describe('FormularioAclaracionComponent', () => {
  function montar(esquema: AclaracionAgenteV1) {
    const fixture = TestBed.createComponent(FormularioAclaracionComponent);
    const salida = vi.fn();
    fixture.componentInstance.enviarDatos.subscribe(salida);
    fixture.componentRef.setInput('especificacion', esquema);
    fixture.componentRef.setInput('prefijo', 'datos');
    fixture.detectChanges();
    return {
      fixture,
      salida,
      formulario: fixture.nativeElement.querySelector('form') as HTMLFormElement,
    };
  }

  function cambiar(
    fixture: ComponentFixture<FormularioAclaracionComponent>,
    id: string,
    valor: string,
  ) {
    const campo = fixture.nativeElement.querySelector('#datos-' + id) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(
      new Event(campo.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }),
    );
    fixture.detectChanges();
  }

  function enviar(formulario: HTMLFormElement) {
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  it('renderiza los seis tipos, iniciales, límites y ayudas', () => {
    const { fixture, salida, formulario } = montar({
      ...ACLARACION_RUTA,
      campos: [
        {
          ...ACLARACION_RUTA.campos[0],
          inicial: 'Parque central',
          longitudMaxima: 30,
          ayuda: 'Indica un punto cercano.',
        },
        { ...ACLARACION_RUTA.campos[1], inicial: 3, maximo: 8 },
        { id: 'origen', etiqueta: 'Origen', tipo: 'text', obligatorio: false },
        { id: 'fecha', etiqueta: 'Fecha', tipo: 'date', obligatorio: true, inicial: '2028-02-29' },
        { id: 'hora', etiqueta: 'Hora', tipo: 'time', obligatorio: true, inicial: '09:30' },
        {
          id: 'compensacion',
          etiqueta: 'Tipo',
          tipo: 'select',
          obligatorio: true,
          inicial: 'FAVOR',
          opciones: [{ valor: 'FAVOR', etiqueta: 'Favor' }],
        },
      ],
    });
    for (const selector of [
      'textarea',
      'input[type="number"]',
      'input[type="text"]',
      'input[type="date"]',
      'input[type="time"]',
      'select',
    ]) {
      expect(formulario.querySelector(selector)).not.toBeNull();
    }
    expect(formulario.querySelector('textarea')?.maxLength).toBe(30);
    expect(formulario.querySelector<HTMLInputElement>('[type="number"]')?.max).toBe('8');
    expect(formulario.querySelector('textarea')?.getAttribute('aria-describedby')).toContain(
      'datos-referencias-ayuda',
    );
    expect(formulario.textContent).toContain('Indica un punto cercano.');
    enviar(formulario);
    expect(salida).toHaveBeenCalledWith({
      referencias: 'Parque central',
      capacidad: 3,
      origen: null,
      fecha: '2028-02-29',
      hora: '09:30',
      compensacion: 'FAVOR',
    });
    cambiar(fixture, 'capacidad', '10');
    cambiar(fixture, 'referencias', 'x'.repeat(31));
    enviar(formulario);
    fixture.detectChanges();
    expect(formulario.textContent).toContain('Ingresa un número hasta 8');
    expect(formulario.textContent).toContain('Usa hasta 30 caracteres');
    expect(salida).toHaveBeenCalledTimes(1);
  });

  it('cuenta el grupo alternativo como un requisito y permite completar solo un campo', () => {
    const { fixture, salida, formulario } = montar(ACLARACION_ELIMINAR);
    enviar(formulario);
    expect(salida).not.toHaveBeenCalled();
    expect(formulario.textContent).toContain('Completa al menos uno de estos campos.');
    expect(formulario.textContent).not.toContain('2 campos completados');
    cambiar(fixture, 'destinoActual', 'UPC');
    enviar(formulario);
    expect(salida).toHaveBeenCalledWith({ origenActual: null, destinoActual: 'UPC' });
  });

  it('emite un parcial válido y bloquea un parcial con otro campo inválido', () => {
    const { fixture, salida, formulario } = montar({
      ...ACLARACION_RUTA,
      campos: [
        ...ACLARACION_RUTA.campos,
        { id: 'origen', etiqueta: 'Origen', tipo: 'text', obligatorio: true },
      ],
    });
    expect(formulario.querySelector('[type="button"]')).toBeNull();
    cambiar(fixture, 'referencias', 'UPC Villa');
    cambiar(fixture, 'capacidad', '2.5');
    formulario.querySelector<HTMLButtonElement>('[type="button"]')!.click();
    expect(salida).not.toHaveBeenCalled();
    cambiar(fixture, 'capacidad', '');
    formulario.querySelector<HTMLButtonElement>('[type="button"]')!.click();
    expect(salida).toHaveBeenCalledWith({
      referencias: 'UPC Villa',
      capacidad: null,
      origen: null,
    });
  });

  it('reconcilia el mismo UUID conservando solo valores compatibles', () => {
    const { fixture, formulario } = montar(ACLARACION_RUTA);
    cambiar(fixture, 'referencias', 'UPC Villa');
    cambiar(fixture, 'capacidad', '4');
    fixture.componentRef.setInput('especificacion', {
      ...ACLARACION_RUTA,
      campos: [ACLARACION_RUTA.campos[0], { ...ACLARACION_RUTA.campos[1], maximo: 3 }],
    });
    fixture.detectChanges();
    expect(formulario.querySelector('textarea')?.value).toBe('UPC Villa');
    expect(formulario.querySelector('input')?.value).toBe('');
  });
});
