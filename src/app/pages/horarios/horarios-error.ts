import { HttpErrorResponse } from '@angular/common/http';

export function horariosError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0)
      return 'No se pudo conectar con el servicio. Comprueba tu conexión y vuelve a intentar.';
    if (error.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
    if (error.status === 403) return 'No tienes permiso para realizar esta operación.';
    if (error.status === 404)
      return 'El curso o recurso ya no está disponible. Actualiza la lista antes de continuar.';
    if (error.status === 429)
      return 'El servicio está ocupado o se hicieron demasiados intentos. Espera antes de reintentar.';
    const mensaje: unknown = error.error?.mensaje;
    if (error.status === 400 || error.status === 409) {
      if (typeof mensaje === 'string') {
        if (mensaje.startsWith('Conflicto de horario: '))
          return 'Hay un solapamiento con otro curso. Revisa el día y las horas; puedes eliminar el curso existente antes de volver a guardar.';
        if (mensaje === 'El archivo TXT está vacío')
          return 'El archivo TXT está vacío. Selecciona otro archivo.';
        if (
          mensaje.includes('OCR') ||
          mensaje.startsWith('No se pudo leer el PDF') ||
          mensaje.startsWith('No se pudo procesar el PDF')
        )
          return 'No se pudo reconocer el contenido del PDF. Prueba un PDF legible o importa un TXT; si persiste, consulta con soporte.';
        if (
          mensaje.startsWith('El PDF') ||
          mensaje === 'El contenido no es un PDF válido de hasta 1 MB' ||
          mensaje === 'No se pudo leer el archivo PDF adjuntado'
        )
          return 'El PDF no es válido o supera los límites de procesamiento. Usa un PDF sin cifrado de hasta 10 páginas y 1 MB, o un TXT.';
        if (
          mensaje === 'El TXT debe contener texto UTF-8 válido' ||
          mensaje === 'No se pudo leer el archivo TXT adjuntado'
        )
          return 'No se pudo leer el TXT. Guarda el archivo como texto UTF-8 y vuelve a seleccionarlo.';
      }
      if (error.status === 409)
        return 'Hay un conflicto que impide completar la operación. Actualiza la lista y revisa los horarios antes de reintentar.';
      return 'Revisa los datos del curso o el archivo: nombre, día, horas válidas y PDF/TXT de hasta 1 MB.';
    }
    if (error.status === 413)
      return 'El archivo supera el tamaño permitido. Selecciona un PDF o TXT de hasta 1 MB.';
    if (error.status >= 500)
      return 'El servidor no pudo completar la operación. Intenta nuevamente más tarde.';
  }
  return 'No se pudo confirmar la operación. Actualiza la lista antes de volver a intentarlo.';
}
