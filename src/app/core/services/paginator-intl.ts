import { MatPaginatorIntl } from '@angular/material/paginator';

export function crearPaginatorIntl(etiqueta: string): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  const sustantivo = etiqueta.toLowerCase();

  intl.itemsPerPageLabel = `${etiqueta} por página:`;
  intl.firstPageLabel = 'Primera página';
  intl.previousPageLabel = 'Página anterior';
  intl.nextPageLabel = 'Página siguiente';
  intl.lastPageLabel = 'Última página';
  intl.getRangeLabel = (from: number, to: number, total: number) =>
    total === 0
      ? `0 – 0 de ${total} ${sustantivo}`
      : `${from + 1} – ${to} de ${total} ${sustantivo}`;

  return intl;
}
