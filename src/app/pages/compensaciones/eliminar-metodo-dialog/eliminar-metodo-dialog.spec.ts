import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { METODOS_COMPENSACION_DEMO } from '../compensaciones.models';
import { EliminarMetodoDialog } from './eliminar-metodo-dialog';

describe('EliminarMetodoDialog', () => {
  const close = vi.fn();
  let fixture: ComponentFixture<EliminarMetodoDialog>;

  beforeEach(async () => {
    close.mockClear();
    await TestBed.configureTestingModule({
      imports: [EliminarMetodoDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: METODOS_COMPENSACION_DEMO[2] },
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

    expect(close).toHaveBeenCalledWith(false);
  });

  it('returns an explicit confirmation without deleting data itself', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[1].click();

    expect(close).toHaveBeenCalledWith(true);
  });
});
