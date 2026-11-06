import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { authError, retrySeconds } from './auth-error';

describe('Authentication error messages', () => {
  it('displays backend field validation without losing the field messages', () => {
    const error = new HttpErrorResponse({ status: 400, error: { campos: { telefono: 'Teléfono inválido' } } });
    expect(authError(error, 'Error')).toBe('Teléfono inválido');
  });
  it('does not reveal internal server errors or network details', () => {
    for (const status of [0, 500, 502, 504]) {
      const error = new HttpErrorResponse({ status, error: { mensaje: 'private SQL database details' } });
      expect(authError(error, 'Error')).not.toContain('SQL');
    }
  });
  it('keeps useful conflict and expired-code messages', () => {
    const error = new HttpErrorResponse({ status: 409, error: { mensaje: 'Código expirado. Solicita otro.' } });
    expect(authError(error, 'Error')).toContain('expirado');
  });
  it('uses the server cooldown and a safe fallback', () => {
    expect(retrySeconds(new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '900' }) }))).toBe(900);
    expect(retrySeconds(new HttpErrorResponse({ status: 429 }))).toBe(60);
  });
});
