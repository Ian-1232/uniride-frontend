# Design System de UniRide

Esta documentación describe la implementación Angular de la página `00 · Design System — UniRide` del [archivo oficial de Figma](https://www.figma.com/design/Y12BnmOuhShBxVckf6J8gg/UniRide-Design?node-id=0-1).

Figma y `SPEC.md` son las fuentes de verdad. `src/styles.css` concentra los tokens y reglas compartidas; `src/material-theme.scss` adapta Angular Material a esos mismos valores. El sistema solo dispone del modo `Light`.

## Equivalencia de colores

| Variable de Figma | Variable CSS | Valor |
|---|---|---:|
| `color/primary` | `--ur-color-primary` | `#4F46E5` |
| `color/ink` | `--ur-color-ink` | `#1E293B` |
| `color/accent` | `--ur-color-accent` | `#10B981` |
| `color/background` | `--ur-color-background` | `#F8FAFC` |
| `color/surface` | `--ur-color-surface` | `#FFFFFF` |
| `color/muted` | `--ur-color-muted` | `#64748B` |
| `color/border` | `--ur-color-border` | `#E2E8F0` |
| `color/primarySoft` | `--ur-color-primary-soft` | `#EEF2FF` |
| `color/successSoft` | `--ur-color-success-soft` | `#ECFDF5` |
| `color/successText` | `--ur-color-success-text` | `#047857` |
| `color/warningSoft` | `--ur-color-warning-soft` | `#FFFBEB` |
| `color/warningText` | `--ur-color-warning-text` | `#92400E` |
| `color/danger` | `--ur-color-danger` | `#DC2626` |
| `color/dangerSoft` | `--ur-color-danger-soft` | `#FEF2F2` |

Los alias semánticos deben usarse antes que las primitivas. No se deben crear colores por módulo para aproximar valores ya existentes.

## Tipografía

La familia global es Roboto. Inter aparece en frames antiguos de autenticación, pero no forma parte de la escala global para implementaciones nuevas.

| Estilo de Figma | Clase o token Angular | Peso | Tamaño / línea |
|---|---|---:|---:|
| `Typography/Display` | `.ur-display` | 700 | 36 / 44 px |
| `Typography/Page title` | `.ur-page-title`, `h1` | 700 | 28 / 39 px |
| `Typography/Section title` | `.ur-section-title`, `h2` | 700 | 22 / 31 px |
| `Typography/Card title` | `.ur-card-title`, `h3` | 700 | 18 / 25 px |
| `Typography/Body` | Estilo base | 400 | 14 / 20 px |
| `Typography/Body strong` | `.ur-body-strong` | 500 | 14 / 20 px |
| `Typography/Body small` | `.ur-body-small` | 400 | 13 / 18 px |
| `Typography/Label` | `.ur-label` | 500 | 12 / 17 px |
| `Typography/Caption` | `.ur-caption` | 400 | 12 / 17 px |

Roboto se distribuye localmente mediante `@fontsource/roboto`. `src/styles.css` importa de forma explícita el subconjunto latino de los pesos 400 (Regular), 500 (Medium) y 700 (Bold); no se carga Roboto desde Google Fonts. El token `--ur-font-family` y la configuración tipográfica de Angular Material usan esta misma familia.

## Espaciado, forma y tamaños

| Figma | CSS |
|---|---|
| `spacing/4…48` | `--ur-space-4…48` |
| `radius/6…24` | `--ur-radius-6…24` |
| `radius/pill` | `--ur-radius-pill` |
| `size/control/compact` | `--ur-control-compact` (40 px) |
| `size/control/default` | `--ur-control-default` (48 px) |
| `size/layout/sidebar` | `--ur-sidebar-width` (240 px) |
| `size/icon/sm` | `--ur-icon-sm` (16 px) |
| `size/icon/md` | `--ur-icon-md` (20 px) |
| `size/icon/lg` | `--ur-icon-lg` (24 px) |

Un tamaño funcional no debe reutilizarse conceptualmente como espaciado aunque coincida su valor numérico.

## Elevación

| Figma | CSS | Uso |
|---|---|---|
| `Elevation/Subtle` | `--ur-shadow-subtle` | Superficie o tarjeta discreta |
| `Elevation/Card` | `--ur-shadow-card` | Tarjeta destacada |
| `Elevation/Modal` | `--ur-shadow-modal` | Diálogo modal |

## Componentes y reglas base

- **Button:** estilos Primary, Secondary y Destructive; estados Default, Hover y Disabled; tamaños 40 y 48 px. Las clases `.ur-button` son una base visual, no una biblioteca Angular nueva.
- **Text Field:** Default, Focus, Error y Disabled. La clase `.ur-field` agrupa etiqueta, control, ayuda y error. El error siempre necesita texto.
- **Badge:** Neutral, Info, Success, Warning y Danger mediante `.ur-status` y sus modificadores. No debe actuar como botón.
- **Card:** `.ur-card` reproduce superficie, borde, radio y elevación sutil. Las variantes de dominio Route y Trip pertenecen a las pantallas que las consuman.
- **Dialog:** Angular Material se alinea con radio 16 y elevación modal. En móvil puede usarse `.ur-dialog` para respetar el margen lateral de 16 px.
- **Navigation:** `.ur-app-shell`, `.ur-sidebar` y `.ur-main` establecen únicamente la geometría compartida. No incorporan enlaces, permisos ni navegación funcional.
- **Tables/messages:** `.ur-table-container` delimita las reglas de tabla de UniRide para no alterar tablas nativas o componentes especializados de otros módulos. Los mensajes usan los estados semánticos sin definir componentes de dominio.

Los componentes aún no consolidados en Figma —selectores, checkbox/radio, tablas completas, paginación, estados vacíos y navegación móvil— deben revisarse antes de crear variantes globales.

## Angular Material

`src/material-theme.scss` genera el tema Material 3 y remapea sus roles de sistema a variables semánticas `--ur-*`, evitando que las paletas base de Angular Material aparezcan en la interfaz. Botones, tarjetas, diálogos, campos y tablas se ajustan mediante los mixins oficiales `*-overrides` de Angular Material.

No se debe crear un segundo tema por pantalla ni sobrescribir indiscriminadamente selectores internos `.mat-mdc-*`. Si un componente requiere una variante, debe preferirse su API de theming o un contenedor/clase propia con alcance explícito. Los valores de color deben proceder de tokens semánticos, no de HEX repetidos en estilos de módulo.

## Responsive

| Rango | Criterio |
|---|---|
| Escritorio, `≥ 1024 px` | Referencia 1440 × 1024; sidebar 240; main 1200; contenido habitual 1136 |
| Tablet, `768–1023 px` | Sidebar colapsable y columnas adaptativas |
| Móvil, `320–767 px` | Referencia 390; padding 16; flujo vertical; controles de al menos 48 px |

No se implementó el comportamiento del sidebar colapsable ni navegación móvil. Las reglas responsive compartidas se limitan al espaciado del contenido y a adaptar botones y diálogos; la navegación se resolverá cuando existan el componente y sus requisitos funcionales.

## Accesibilidad

- Mantener foco visible con `:focus-visible`.
- No comunicar estados exclusivamente mediante color.
- Conservar objetivos táctiles de 48 px en acciones estándar.
- Utilizar el enlace “Saltar al contenido principal” del root.
- Respetar `prefers-reduced-motion`.
- En superficies con el acento `#10B981`, usar `--ur-color-ink` (`#1E293B`) para el texto. El rol Material `on-tertiary` aplica esta combinación, con contraste aproximado de 5.77:1, en lugar de texto blanco insuficiente.
- Verificar contraste y navegación por teclado al desarrollar cada pantalla.

La hoja remota de Material Symbols se conserva temporalmente para mantener la compatibilidad existente. No se instaló ninguna librería de iconos; la definición final de iconografía queda pendiente de coordinación con el equipo.

## Uso por el equipo

1. Consultar primero Figma y `SPEC.md`.
2. Consumir variables `--ur-*`; no copiar valores HEX en componentes.
3. Preferir Angular Material cuando exista un componente apropiado y adaptarlo con el tema global.
4. No agregar rutas o layouts funcionales hasta que existan sus destinos y requisitos.
5. Si un token o componente no existe, documentar la necesidad antes de introducir una decisión global.
