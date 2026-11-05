import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MetodosListado } from './metodos-listado';

describe('MetodosListado', () => {
  const open = vi.fn();
  let queryParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(() => {
    open.mockReset();
    open.mockReturnValue({ afterClosed: () => of(false) });
    queryParams = new BehaviorSubject(convertToParamMap({}));
    TestBed.configureTestingModule({
      imports: [MetodosListado],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParams.asObservable(),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        { provide: MatDialog, useValue: { open } },
      ],
    });
  });

  function render(state?: string): ComponentFixture<MetodosListado> {
    if (state) {
      queryParams.next(convertToParamMap({ estado: state }));
    }
    const fixture = TestBed.createComponent(MetodosListado);
    fixture.detectChanges();
    return fixture;
  }

  it('opens a confirmation dialog from the delete action', () => {
    const fixture = render();
    const deleteButton = fixture.nativeElement.querySelector('.delete-action') as HTMLButtonElement;

    deleteButton?.click();
    expect(open).toHaveBeenCalledOnce();
  });

  it('does not show a success result when deletion is cancelled', () => {
    const fixture = render();
    const deleteButton = fixture.nativeElement.querySelector('.delete-action') as HTMLButtonElement;

    deleteButton?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Eliminación preparada');
  });

  it('shows a visual confirmation after an explicit confirmation', () => {
    open.mockReturnValue({ afterClosed: () => of(true) });
    const fixture = render();
    const deleteButton = fixture.nativeElement.querySelector('.delete-action') as HTMLButtonElement;

    deleteButton?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Eliminación preparada');
  });

  it('keeps blocked deletion distinct from method not found', () => {
    const blocked = render('eliminacion-bloqueada');
    expect(blocked.nativeElement.textContent).toContain('solicitudes asociadas');
    expect(blocked.nativeElement.textContent).not.toContain('Método no encontrado');
  });

  it('disables deletion when the demonstration state is blocked', () => {
    const fixture = render('eliminacion-bloqueada');

    const deleteButton = fixture.nativeElement.querySelector(
      '.delete-action'
    ) as HTMLButtonElement;

    expect(deleteButton.disabled).toBe(true);
    expect(open).not.toHaveBeenCalled();
  });

  it('represents a missing method without reporting success', () => {
    const missing = render('no-encontrado-eliminacion');
    expect(missing.nativeElement.textContent).toContain('Método no encontrado');
    expect(missing.nativeElement.textContent).not.toContain('Eliminación preparada');
  });
});
