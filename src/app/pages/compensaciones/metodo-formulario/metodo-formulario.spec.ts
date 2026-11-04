import { Signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MetodoFormulario } from './metodo-formulario';

interface MetodoFormularioAccess {
  readonly form: FormGroup;
  readonly isNotFound: Signal<boolean>;
  readonly showDuplicate: Signal<boolean>;
}

describe('MetodoFormulario', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'compensaciones/metodos/nuevo', component: MetodoFormulario },
          { path: 'compensaciones/metodos/:id/editar', component: MetodoFormulario },
          { path: 'compensaciones/metodos', component: MetodoFormulario },
        ]),
      ],
    });
  });

  async function navigate(url: string): Promise<{
    fixture: ComponentFixture<MetodoFormulario>;
    access: MetodoFormularioAccess;
  }> {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl(url, MetodoFormulario);
    harness.detectChanges();

    return {
      fixture: harness.fixture as unknown as ComponentFixture<MetodoFormulario>,
      access: component as unknown as MetodoFormularioAccess,
    };
  }

  it('requires type and description when registering', async () => {
    const { access } = await navigate('/compensaciones/metodos/nuevo');

    expect(access.form.controls['tipo'].hasError('required')).toBe(true);
    expect(access.form.controls['descripcion'].invalid).toBe(true);
    expect(access.form.invalid).toBe(true);
  });

  it('shows and clears the duplicate conflict when fields change', async () => {
    const { access, fixture } = await navigate(
      '/compensaciones/metodos/nuevo?estado=duplicado',
    );

    expect(access.showDuplicate()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Método duplicado');

    access.form.controls['descripcion'].setValue('Otra descripción');
    fixture.detectChanges();

    expect(access.showDuplicate()).toBe(false);
  });

  it('preloads method 12 and allows the active state to change', async () => {
    const { access } = await navigate('/compensaciones/metodos/12/editar');

    expect(access.form.getRawValue()).toEqual({
      tipo: 'GASOLINA',
      descripcion: 'Aporte de combustible',
      activo: true,
    });
    expect(access.form.valid).toBe(true);

    access.form.controls['activo'].setValue(false);
    expect(access.form.controls['activo'].value).toBe(false);
  });

  it('marks an edit form invalid when the description contains only spaces', async () => {
    const { access } = await navigate('/compensaciones/metodos/12/editar');

    access.form.controls['descripcion'].setValue('   ');

    expect(access.form.controls['descripcion'].hasError('blank')).toBe(true);
    expect(access.form.invalid).toBe(true);
  });

  it('represents an unknown method as not found', async () => {
    const { access, fixture } = await navigate('/compensaciones/metodos/999/editar');

    expect(access.isNotFound()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Método no encontrado');
  });
});
