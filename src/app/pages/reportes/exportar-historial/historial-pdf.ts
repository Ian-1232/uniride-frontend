import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { reportError } from '../shared/report-query';

export const DEFAULT_PDF_NAME = 'historial-viajes.pdf';

export function pdfFilename(disposition: string | null): string {
  const extended = disposition?.match(/(?:^|;)\s*filename\*\s*=\s*UTF-8''([^;]+)/i);
  const regular = disposition?.match(/(?:^|;)\s*filename\s*=\s*(?:"([^"]*)"|([^;]+))/i);
  let name = regular?.[1] ?? regular?.[2]?.trim();
  try { if (extended) name = decodeURIComponent(extended[1].trim()); }
  catch { return DEFAULT_PDF_NAME; }
  // Accept a plain PDF basename only: never paths, control characters or other extensions.
  return name && name.length <= 150 && !/[\x00-\x1f\x7f<>:"/\\|?*]/.test(name) &&
    !name.startsWith('.') && name === name.trim() && /\.pdf$/i.test(name)
    ? name : DEFAULT_PDF_NAME;
}

function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onabort = () => reject(new Error('Lectura cancelada'));
    reader.readAsText(blob);
  });
}

export async function preparePdf(response: HttpResponse<Blob>) {
  const blob = response.body;
  const type = (response.headers.get('Content-Type') ?? blob?.type ?? '').split(';')[0].trim().toLowerCase();
  if (response.status !== 200 || !blob?.size || type !== 'application/pdf' ||
      await blobText(blob.slice(0, 5)) !== '%PDF-') {
    throw new Error('Respuesta PDF inválida');
  }
  return { blob, filename: pdfFilename(response.headers.get('Content-Disposition')) };
}

export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const revoke = URL.revokeObjectURL.bind(URL);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Give the browser time to consume the URL after dispatching the click.
    setTimeout(() => revoke(url), 1000);
  }
}

export async function historyExportError(error: unknown) {
  if (error instanceof HttpErrorResponse) {
    let body: unknown = error.error;
    if (body instanceof Blob) {
      try { body = JSON.parse(await blobText(body.slice(0, 8192))); }
      catch { body = null; }
    }
    // Never echo arbitrary server text. Only recognize the documented business case.
    const noHistory = !!body && typeof body === 'object' && 'mensaje' in body &&
      body.mensaje === 'No hay historial para exportar';
    if (error.status === 409) return {
      state: noHistory ? 'sin-resultados' as const : 'error' as const,
      message: noHistory ? 'No hay historial para exportar. Modifica los filtros o vuelve a intentarlo.'
        : 'No se pudo generar el PDF del historial. Intenta nuevamente.',
    };
    if (error.status === 400) return { state: 'error' as const, message: 'Los filtros no son válidos. Revisa las fechas y el tipo de viaje.' };
  }
  return {
    state: 'error' as const,
    message: error instanceof HttpErrorResponse ? reportError(error)
      : 'No se pudo preparar o descargar el PDF. Intenta nuevamente.',
  };
}
