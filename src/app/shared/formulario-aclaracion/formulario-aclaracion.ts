import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { FormControl, FormRecord, ReactiveFormsModule } from '@angular/forms';
import {
  CampoAclaracion,
  EspecificacionAclaracion,
  ValorAclaracion,
  ValoresAclaracion,
  esEstructurada,
} from '../../core/models/aclaracion.models';
import { errorCampoAclaracion, tieneValor } from '../../core/models/aclaracion-validacion';
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
  protected readonly intentoCompleto = signal(false);
  protected readonly titulo = computed(() => {
    const esquema = this.especificacion();
    return esEstructurada(esquema) ? esquema.contexto : 'Completa los datos';
  });

  protected readonly formulario = linkedSignal({
    source: this.especificacion,
    computation: (esquema, previo): FormRecord<FormControl<ValorAclaracion>> => {
      const mismo =
        previo &&
        esEstructurada(esquema) &&
        esEstructurada(previo.source) &&
        esquema.id === previo.source.id;
      return new FormRecord(
        Object.fromEntries(
          esquema.campos.map((campo) => {
            const anterior = mismo ? previo.value.controls[campo.id]?.value : undefined;
            const compatible =
              mismo &&
              previo.source.campos.some(({ id, tipo }) => id === campo.id && tipo === campo.tipo) &&
              tieneValor(anterior) &&
              !errorCampoAclaracion(campo, anterior);
            const inicial = compatible ? anterior : campo.inicial;
            return [
              campo.id,
              new FormControl<ValorAclaracion>(
                typeof inicial === 'string' ? inicial.trim() : (inicial ?? null),
                (control) => {
                  const mensaje = errorCampoAclaracion(campo, control.value);
                  return mensaje ? { mensaje } : null;
                },
              ),
            ];
          }),
        ),
        (formulario) =>
          esquema.alMenosUno &&
          !esquema.alMenosUno.some((id) => {
            const control = formulario.get(id);
            return control?.valid && tieneValor(control.value);
          })
            ? { alternativos: true }
            : null,
      );
    },
  });

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
      [
        campo.ayuda ? `${id}-ayuda` : '',
        this.error(campo) ? `${id}-error` : '',
        this.especificacion().alMenosUno?.includes(campo.id)
          ? this.prefijo() + '-alternativos'
          : '',
      ]
        .filter(Boolean)
        .join(' ') || null
    );
  }

  protected anunciarError(campo: CampoAclaracion): void {
    const error = this.error(campo);
    this.anuncioError.set(error ? `${campo.etiqueta}. ${error}` : '');
  }

  protected progreso(): string {
    const { campos, alMenosUno } = this.especificacion();
    const controles = this.formulario().controls;
    const obligatorios = campos.filter(({ obligatorio }) => obligatorio);
    const total = obligatorios.length + (alMenosUno ? 1 : 0);
    const completos =
      obligatorios.filter(({ id }) => controles[id].valid && tieneValor(controles[id].value))
        .length + (alMenosUno && !this.formulario().hasError('alternativos') ? 1 : 0);
    return total > 1
      ? `${completos} de ${total} ${alMenosUno ? 'requisitos' : 'campos'} completados`
      : '';
  }

  protected admiteParcial(): boolean {
    const esquema = this.especificacion();
    const formulario = this.formulario();
    const controles = formulario.controls;
    const faltanDatos =
      formulario.hasError('alternativos') ||
      esquema.campos.some(({ obligatorio, id }) => obligatorio && !tieneValor(controles[id].value));
    return (
      esEstructurada(esquema) &&
      esquema.campos.length > 1 &&
      faltanDatos &&
      Object.values(controles).some((control) => control.valid && tieneValor(control.value))
    );
  }

  protected elegir(campo: CampoAclaracion, valor: string): void {
    if (this.ocupado()) return;
    this.formulario().controls[campo.id].setValue(valor);
    this.enviar();
  }

  protected enviar(parcial = false): void {
    if (this.ocupado()) return;
    if (parcial && !this.admiteParcial()) return;
    this.anuncioError.set('');
    const formulario = this.formulario();
    this.intentoCompleto.set(!parcial);
    if (parcial) {
      for (const control of Object.values(formulario.controls)) {
        if (tieneValor(control.value)) control.markAsTouched();
      }
    } else {
      formulario.markAllAsTouched();
    }
    const invalidos = parcial
      ? Object.values(formulario.controls).some(
          (control) => tieneValor(control.value) && control.invalid,
        )
      : formulario.invalid;
    if (invalidos) {
      if (this.intentoCompleto() && formulario.hasError('alternativos')) {
        this.anuncioError.set('Completa al menos uno de estos campos.');
      }
      afterNextRender(
        () => {
          this.elemento.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
        },
        { injector: this.injector },
      );
      return;
    }
    const valores = formulario.getRawValue();
    this.sinDatos.set(!Object.values(valores).some(tieneValor));
    if (!this.sinDatos()) this.enviarDatos.emit(valores);
  }
}
