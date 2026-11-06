import { MatPaginatorIntl } from '@angular/material/paginator';

export function crearPaginatorIntl(etiqueta: string): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  const sustantivo = etiqueta.toLowerCase();

  intl.itemsPerPageLabel = `${etiqueta} por página:`;
  intl.firstPageLabel = 'Primera página';
  intl.previousPageLabel = 'Página anterior';
  intl.nextPageLabel = 'Página siguiente';
  intl.lastPageLabel = 'Última página';
  intl.getRangeLabel = (page: number, pageSize: number, total: number) =>
    total === 0
      ? `0 – 0 de ${total} ${sustantivo}`
      : `${page * pageSize + 1} – ${Math.min((page + 1) * pageSize, total)} de ${total} ${sustantivo}`;

  return intl;
}
