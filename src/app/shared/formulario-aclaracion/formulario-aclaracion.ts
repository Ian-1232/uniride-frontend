import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, FormRecord, ReactiveFormsModule } from '@angular/forms';
import {
  CampoAclaracion,
  EspecificacionAclaracion,
  ValorAclaracion,
  ValoresAclaracion,
} from '../../core/models/aclaracion.models';
import { fechaLocalValida } from '../../core/models/perfil.models';

function validar(campo: CampoAclaracion, valor: ValorAclaracion): string | null {
  const texto = String(valor ?? '').trim();
  if (!texto) return campo.obligatorio ? 'Completa este campo.' : null;

  switch (campo.tipo) {
    case 'number':
      if (typeof valor !== 'number' || !Number.isSafeInteger(valor))
        return 'Ingresa un número entero.';
      if (campo.minimo != null && valor < campo.minimo)
        return `Ingresa un número desde ${campo.minimo}.`;
      if (campo.maximo != null && valor > campo.maximo)
        return `Ingresa un número hasta ${campo.maximo}.`;
      return null;
    case 'date':
      return fechaLocalValida(texto) ? null : 'Ingresa una fecha válida.';
    case 'time':
      return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(texto) ? null : 'Ingresa una hora válida.';
    case 'select':
      return campo.opciones?.some((opcion) => opcion.valor === valor)
        ? null
        : 'Selecciona una opción de la lista.';
    default:
      return campo.longitudMaxima != null && texto.length > campo.longitudMaxima
        ? `Usa hasta ${campo.longitudMaxima} caracteres.`
        : null;
  }
}

@Component({
  selector: 'app-formulario-aclaracion',
  imports: [ReactiveFormsModule],
  templateUrl: './formulario-aclaracion.html',
  styleUrl: './formulario-aclaracion.css',
})
export class FormularioAclaracionComponent {
  readonly especificacion = input.required<EspecificacionAclaracion>();
  readonly prefijo = input.required<string>();
  readonly ocupado = input(false);
  readonly enviando = input(false);
  readonly reintento = input(false);
  readonly enviarDatos = output<ValoresAclaracion>();

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  protected readonly sinDatos = signal(false);
  protected readonly anuncioError = signal('');

  protected readonly formulario = computed(
    () =>
      new FormRecord<FormControl<ValorAclaracion>>(
        Object.fromEntries(
          this.especificacion().campos.map((campo) => [
            campo.id,
            new FormControl<ValorAclaracion>(campo.inicial ?? null, (control) => {
              const mensaje = validar(campo, control.value);
              return mensaje ? { mensaje } : null;
            }),
          ]),
        ),
      ),
  );

  protected readonly campoRapido = computed(() => {
    const { campos, opcionesRapidas } = this.especificacion();
    return opcionesRapidas && campos.length === 1 && campos[0].tipo === 'select' ? campos[0] : null;
  });

  protected id(campo: CampoAclaracion): string {
    return `${this.prefijo()}-${campo.id}`;
  }

  protected error(campo: CampoAclaracion): string | null {
    const control = this.formulario().controls[campo.id];
    return control.touched ? (control.getError('mensaje') ?? null) : null;
  }

  protected descritoPor(campo: CampoAclaracion): string | null {
    const id = this.id(campo);
    return (
      [campo.ayuda ? `${id}-ayuda` : '', this.error(campo) ? `${id}-error` : '']
        .filter(Boolean)
        .join(' ') || null
    );
  }

  protected anunciarError(campo: CampoAclaracion): void {
    const error = this.error(campo);
    this.anuncioError.set(error ? `${campo.etiqueta}. ${error}` : '');
  }

  protected progreso(): string {
    const { campos } = this.especificacion();
    const controles = this.formulario().controls;
    const completos = campos.filter(
      ({ id }) => controles[id].valid && String(controles[id].value ?? '').trim(),
    );
    return `${completos.length} de ${campos.length} campos completados`;
  }

  protected elegir(campo: CampoAclaracion, valor: string): void {
    if (this.ocupado()) return;
    this.formulario().controls[campo.id].setValue(valor);
    this.enviar();
  }

  protected enviar(): void {
    if (this.ocupado()) return;
    this.anuncioError.set('');
    const formulario = this.formulario();
    formulario.markAllAsTouched();
    if (formulario.invalid) {
      afterNextRender(
        () => {
          this.elemento.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
        },
        { injector: this.injector },
      );
      return;
    }
    const valores = formulario.getRawValue();
    this.sinDatos.set(!Object.values(valores).some((valor) => String(valor ?? '').trim()));
    if (!this.sinDatos()) this.enviarDatos.emit(valores);
  }
}
