# EventSales

Aplicación web responsiva para vender entradas a eventos.

> Solo **Datos** y **Estructura** son de este proyecto. El resto sirve de punto de partida para cualquier proyecto Angular con Figma.

## Datos
- Figma: https://www.figma.com/design/sJZkyalrrPvGOXf1CupDn8/Uni-Ride---New-Templates?node-id=15-284&t=nA3M1H5uG9Ei7ggM-1
- UI: Angular Material
- Gráficos: ng2-charts

## Cómo trabajar
Haz solo la pantalla que te pida. Léela en el Figma, impleméntala y verifica que compile.
Al terminar, lista los archivos creados y qué quedó pendiente.

## Estructura
Sigue la siguiente estructura:

```
src/app/
├── app.routes.ts                    # "/" carga home; cada grupo con loadChildren
├── home/                            # Landing: una página en "/", sin layout
│   └── home.ts · home.html · home.css
├── layouts/                         # Un layout por grupo
│   ├── auth-layout/
│   ├── participante-layout/
│   └── organizador-layout/
└── pages/
    ├── auth/                        # Grupo de acceso (se nombra por su función)
    │   ├── auth.routes.ts           # /login, /registro
    │   ├── login/
    │   └── signup/
    ├── participante/                # Grupo por tipo de usuario
    │   ├── participante.routes.ts   # /participante/...
    │   ├── events/
    │   ├── event-detail/
    │   ├── checkout/
    │   └── confirmation/
    └── organizador/
        ├── organizador.routes.ts    # /organizador/...
        ├── dashboard/
        ├── my-events/
        └── event-form/
```
Un grupo es un conjunto de pantallas que comparten el mismo layout.

## Alcance
Solo dibuja cada pantalla y conéctala: formularios con sus campos, listas con `@for`,
errores con `@if` y enlaces con `routerLink`. La lógica se programa después, no ahora.

- **Sí:** `FormGroup` con validaciones simples y mensaje de error, botón deshabilitado si el formulario es inválido, listas con `@for` y datos de ejemplo fijos, navegación con `routerLink`.
- **No:** funciones, signals, `computed`, `inject()`, `Router`, servicios, modelos ni interfaces. No calcules, filtres ni busques, ni generes contenido por código (por ejemplo un QR). Usa los valores del Figma, tal cual.
- Contadores, chips y buscadores: déjalos dibujados, sin comportamiento.
- Si dudas, déjalo fijo.

## Reglas
- **Angular:** componentes standalone, un `.ts`, `.html` y `.css` por pantalla, nombres en minúsculas y guiones.
- **Control flow:** usa `@if`, `@for` (siempre con `track`) y `@switch`. Nunca `*ngIf`, `*ngFor` ni `ngSwitch`.
- **UI:** usa los componentes de la librería indicada en Datos en lugar de HTML a mano. No crees componentes ni carpeta `components/`: todo va dentro de cada página.
- **Librerías:** si Datos nombra una que no está instalada, instálala con `npm`. Úsalas en lugar de dibujar a mano: fechas con `mat-datepicker` y listas largas con `mat-paginator` (configúralos en la ruta que los usa). Gráficos: solo instala la librería y deja en la pantalla un bloque con el texto «Aquí irá un gráfico».
- **Formularios:** Reactive Forms (`FormGroup`, `formControlName`). Todo lo que el usuario llena o elige (campos, chips, fechas, cantidades) va dentro de un `FormGroup`, nunca suelto. No uses Signal Forms: debe funcionar en Angular 21 y 22.
- **Validaciones:** simples y según el diseño (`required`, `email`, `minLength`). El mensaje va en el idioma del Figma, debajo del campo, al tocarlo (en Material, con `<mat-error>`). Cada campo con validación lleva su `<mat-error>` en el HTML, y el botón del formulario va con `[disabled]="form.invalid"`.
- **Navegación:** todos los botones y enlaces usan `routerLink`, también el que envía un formulario (va deshabilitado mientras sea inválido).
- **Landing (home):** es una sola página en la ruta `/`, en `src/app/home/` (fuera de `pages/`), sin layout ni rutas hijas. Lleva su propia cabecera y pie, y sus botones salen hacia los demás grupos con `routerLink`. Usa componentes de la librería de UI (en Material: `mat-toolbar` para la cabecera, `mat-form-field`, `mat-chip`, `mat-card`, `mat-button` y `mat-divider`).
- **Diseño:** cada pantalla es una sola página responsiva (escritorio y móvil). Respeta el Figma y usa las variables de `styles.css`.
- **Pantallas alternativas** (error, vacío, rechazo): son estados de la misma pantalla, no rutas. Por ahora solo los errores de formulario.
- Si dudas, pregunta. No inventes pantallas.
