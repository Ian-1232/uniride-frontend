import { Signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SugerenciaContribucionFixture } from '../contribucion.models';
import { SugerenciaContribucion } from './sugerencia-contribucion';

interface SugerenciaAccess {
  readonly form: FormGroup;
  readonly result: Signal<SugerenciaContribucionFixture | null>;
}

describe('SugerenciaContribucion', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'contribucion/sugerencia/:viajeId',
            component: SugerenciaContribucion,
          },
        ]),
      ],
    });
  });

  async function render(url: string): Promise<{
    harness: RouterTestingHarness;
    access: SugerenciaAccess;
  }> {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl(url, SugerenciaContribucion);
    harness.detectChanges();
    return { harness, access: component as unknown as SugerenciaAccess };
  }

  it('renders the main screen with the selected trip data', async () => {
    const { harness } = await render('/contribucion/sugerencia/35');
    const text = harness.routeNativeElement?.textContent ?? '';

    expect(text).toContain('Sugerencia de contribución');
    expect(text).toContain('San Borja → UPC');
    expect(text).toContain('Viernes 6/11/2026');
    expect(text).toContain('2 pasajeros');
  });

  it('shows S/ 6.00 and 1.11 L for the two-passenger fixture', async () => {
    const { harness } = await render('/contribucion/sugerencia/35?estado=disponible');
    const text = harness.routeNativeElement?.textContent ?? '';

    expect(text).toContain('S/ 6.00');
    expect(text).toContain('1.11 L');
  });

  it('shows S/ 12.00 and 2.22 L for the single-passenger fixture', async () => {
    const { harness } = await render(
      '/contribucion/sugerencia/35?estado=unico-pasajero',
    );
    const text = harness.routeNativeElement?.textContent ?? '';

    expect(text).toContain('S/ 12.00');
    expect(text).toContain('2.22 L');
    expect(text).toContain('Aporte de un único pasajero');
  });

  it('keeps the backend reference note visible in successful states', async () => {
    const { harness } = await render('/contribucion/sugerencia/35');
    const text = harness.routeNativeElement?.textContent ?? '';

    expect(text).toContain('Estimación referencial');
    expect(text).toContain('el monto final puede variar según la ruta');
  });

  it('shows an actionable validation state when information is insufficient', async () => {
    const { harness, access } = await render(
      '/contribucion/sugerencia/35?estado=insuficiente',
    );
    const text = harness.routeNativeElement?.textContent ?? '';

    expect(text).toContain('Falta cantidad');
    expect(access.form.invalid).toBe(true);
    expect(
      harness.routeNativeElement?.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(true);
  });

  it('rejects zero and decimal passenger quantities', async () => {
    const { access } = await render('/contribucion/sugerencia/35?estado=insuficiente');
    const control = access.form.controls['pasajeros'];

    control.setValue(0);
    expect(control.hasError('min')).toBe(true);

    control.setValue(1.5);
    expect(control.hasError('integer')).toBe(true);
  });

  it('selects the explicit one-passenger mock without calculating values', async () => {
    const { harness, access } = await render(
      '/contribucion/sugerencia/35?estado=insuficiente',
    );
    access.form.controls['pasajeros'].setValue(1);
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button[type="submit"]')
      ?.click();
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('S/ 12.00');
    expect(access.result()?.respuesta.pasajeros).toBe(1);
  });

  it('does not invent a result for a passenger count without a fixture', async () => {
    const { harness, access } = await render(
      '/contribucion/sugerencia/35?estado=insuficiente',
    );
    access.form.controls['pasajeros'].setValue(3);
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button[type="submit"]')
      ?.click();
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Sin datos de demostración');
    expect(harness.routeNativeElement?.textContent).not.toContain('S/ 6.00');
  });

  it('shows confirmed passengers as read-only data', async () => {
    const { harness } = await render(
      '/contribucion/sugerencia/35?estado=pasajeros-confirmados',
    );

    expect(harness.routeNativeElement?.textContent).toContain(
      'Cantidad confirmada por el viaje',
    );
    expect(harness.routeNativeElement?.querySelector('input')).toBeNull();
  });

  it('represents a trip that is no longer available without a result', async () => {
    const { harness } = await render(
      '/contribucion/sugerencia/35?estado=viaje-no-disponible',
    );
    const text = harness.routeNativeElement?.textContent ?? '';

    expect(text).toContain('Viaje no disponible');
    expect(text).not.toContain('S/ 6.00');
  });

  it('represents an unknown trip as not found', async () => {
    const { harness } = await render('/contribucion/sugerencia/999');

    expect(harness.routeNativeElement?.textContent).toContain('Viaje no encontrado');
    expect(harness.routeNativeElement?.textContent).not.toContain('S/ 6.00');
  });

  it('keeps the restricted state mutually exclusive from success', async () => {
    const restricted = await render('/contribucion/sugerencia/35?estado=restringido');
    expect(restricted.harness.routeNativeElement?.textContent).toContain('Acceso restringido');
    expect(restricted.harness.routeNativeElement?.textContent).not.toContain('S/ 6.00');
  });

  it('keeps the general error state mutually exclusive from success', async () => {
    const error = await render('/contribucion/sugerencia/35?estado=error');
    expect(error.harness.routeNativeElement?.textContent).toContain('Error de consulta');
    expect(error.harness.routeNativeElement?.textContent).not.toContain('S/ 6.00');
  });

  it('does not show the missing quantity warning when the form is valid', async () => {
    const { harness, access } = await render(
      '/contribucion/sugerencia/35?estado=insuficiente',
    );

    access.form.controls['pasajeros'].setValue(2);
    harness.detectChanges();

    const text = harness.routeNativeElement?.textContent ?? '';

    expect(text).toContain('Datos listos para consultar');
    expect(text).not.toContain('Falta cantidad');
  });
});
