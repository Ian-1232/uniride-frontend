import { crearPaginatorIntl } from './paginator-intl';

it('calcula los intervalos reales de las páginas completas, parciales y vacías', () => {
  const intl = crearPaginatorIntl('Solicitudes');
  expect(intl.getRangeLabel(0, 10, 23)).toBe('1 – 10 de 23 solicitudes');
  expect(intl.getRangeLabel(1, 10, 23)).toBe('11 – 20 de 23 solicitudes');
  expect(intl.getRangeLabel(2, 10, 23)).toBe('21 – 23 de 23 solicitudes');
  expect(intl.getRangeLabel(0, 10, 0)).toBe('0 – 0 de 0 solicitudes');
});
