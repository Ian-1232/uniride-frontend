import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EliminarMetodoDialog } from './eliminar-metodo-dialog';

describe('EliminarMetodoDialog', () => {
  const close = vi.fn();
  let fixture: ComponentFixture<EliminarMetodoDialog>;

  beforeEach(async () => {
    close.mockClear();
    await TestBed.configureTestingModule({
      imports: [EliminarMetodoDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MAT_DIALOG_DATA,
          useValue: { id: 87, tipo: 'FAVOR', descripcion: 'Ayuda con apuntes', activo: false },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EliminarMetodoDialog);
    fixture.detectChanges();
  });

  it('identifies the selected method in the confirmation', () => {
    expect(fixture.nativeElement.textContent).toContain('Favor');
    expect(fixture.nativeElement.textContent).toContain('Ayuda con apuntes');
  });

  it('closes without confirming when the user cancels', () => {
    const cancelButton = fixture.nativeElement.querySelector('button');
    cancelButton.click();

    expect(close).toHaveBeenCalledWith();
    TestBed.inject(HttpTestingController).expectNone((req) => req.method === 'DELETE');
  });

  it('deletes only after confirmation and waits for HTTP success', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[1].click();

    expect(close).not.toHaveBeenCalled();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/metodos-compensacion/87')
      .flush({ mensaje: 'OK' });
    expect(close).toHaveBeenCalledWith({ action: 'deleted' });
  });
});
