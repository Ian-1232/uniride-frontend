# UniRide Frontend

Implementación Angular del módulo de Sebastián Córdova sobre la base original del repositorio `Ian-1232/uniride-frontend`.

## Ejecutar

Requiere una versión de Node compatible con Angular 22 y npm. El proyecto conserva las versiones y dependencias del ZIP recibido.

```bash
npm ci
npm start
```

Abrir `http://localhost:4200`. La entrada redirige temporalmente a las solicitudes del conductor; cuando se integre la landing del equipo, reemplazar solo esa redirección en `app.routes.ts`.

```bash
npm run build
npm test -- --watch=false
```

## Alcance

- **Coordinación, US14–US18:** solicitudes recibidas, filtros y paginación; perfil de María, Diego y Valeria; aceptación con reserva del último cupo; rechazo individual o múltiple con motivo opcional; confirmación; inicio y finalización; cancelación desde conductor o pasajero con aviso de penalidad.
- **Notificaciones, US25:** cuatro plantillas HTML de correo según Figma: aceptación, confirmación, recordatorio y cancelación. El recordatorio automático y el envío real corresponden al backend.
- Vistas responsivas con Angular Material, Reactive Forms, `@if`, `@for` y `routerLink`. Componentes standalone separados en `.ts`, `.html` y `.css`; layouts por rol y grupos de rutas con `loadChildren`.

Los datos son ejemplos fijos del diseño. Las transiciones se conservan en parámetros de URL para poder recorrer y recargar la demostración, sin servicios, modelos ni estado global. El motivo del rechazo se valida en el formulario; aún no se almacena ni se envía. No hay autenticación ni llamadas al API. Cambiar la URL o usar Atrás cambia el escenario de demostración; no constituye un registro real de operaciones.

El viaje de ejemplo sale el viernes 6 de noviembre de 2026 a las 07:30. Tiene 3 cupos, 2 ocupados inicialmente. La antelación predeterminada es 30 horas para reproducir las variantes de Figma sin depender del reloj del equipo.

## Rutas y escenarios

| Pantalla o estado | URL local |
| --- | --- |
| Solicitudes del conductor | `/conductor/viajes/1/solicitudes` |
| Detalle de María | `/conductor/viajes/1/solicitudes/maria` |
| Detalle de Diego | `/conductor/viajes/1/solicitudes/diego` |
| Detalle de Valeria | `/conductor/viajes/1/solicitudes/valeria` |
| Gestionar viaje | `/conductor/viajes/1` |
| Viaje confirmado | `/conductor/viajes/1?confirmado=true` |
| Confirmación en el límite permitido | `/conductor/viajes/1?horas=12` |
| Confirmación vencida | `/conductor/viajes/1?horas=11` |
| Sin cupos | `/conductor/viajes/1/solicitudes?aceptada=maria` |
| Sin solicitudes pendientes | `/conductor/viajes/1/solicitudes?rechazos=maria,diego,valeria&filtro=pendientes` |
| Viaje del pasajero | `/pasajero/viajes/1` |
| Cancelación sin penalidad | `/pasajero/viajes/1?horas=25&accion=cancelar` |
| Cancelación con penalidad leve | `/pasajero/viajes/1?horas=24&accion=cancelar` |
| Cancelación con penalidad grave | `/pasajero/viajes/1?horas=3&accion=cancelar` |

Los diálogos y resultados son estados de la misma pantalla. La cancelación no tiene penalidad con más de 24 horas; es leve entre 4 y 24 horas, y grave con menos de 4. Confirmar requiere al menos 12 horas. Solo se inicia un viaje programado y confirmado, y solo se completa un viaje en progreso. Para reiniciar la demostración, abrir la ruta sin parámetros.

## Archivos creados

Cada nombre de pantalla o layout de esta lista tiene sus tres archivos `.ts`, `.html` y `.css`:

- `src/app/layouts/conductor-layout/conductor-layout`
- `src/app/layouts/pasajero-layout/pasajero-layout`
- `src/app/pages/conductor/conductor.routes.ts`
- `src/app/pages/conductor/viajes/solicitudes/solicitudes`
- `src/app/pages/conductor/viajes/detalle-solicitud/detalle-solicitud`
- `src/app/pages/conductor/viajes/gestionar-viaje/gestionar-viaje`
- `src/app/pages/pasajero/pasajero.routes.ts`
- `src/app/pages/pasajero/viajes/detalle-viaje/detalle-viaje`
- `public/assets/uniride/`: ocho SVG originales exportados desde Figma: `brand-dot`, `dashboard`, `rutas`, `viajes`, `compensaciones`, `reportes`, `horarios` y `configuracion`.
- `public/assets/fonts/`: Roboto 400, 500 y 700 con su licencia, para cargar la tipografía sin depender de Google Fonts.
- `public/emails/solicitud-aceptada.html`
- `public/emails/viaje-confirmado.html`
- `public/emails/recordatorio-confirmacion.html`
- `public/emails/viaje-cancelado.html`

Archivos base actualizados: `src/app/app.ts`, `app.html`, `app.config.ts`, `app.routes.ts`, `app.spec.ts`, `src/styles.css`, `src/index.html` y este README. Las pruebas verifican navegación, aceptación y cupos, rechazo múltiple, confirmación, ciclo del viaje y los límites de penalidad.

## Integración pendiente

Conectar los endpoints de solicitudes y viajes del SPEC, guardar el motivo, recuperar usuarios y cupos reales y validar permisos con el servidor. El backend debe calcular los plazos con la fecha real, aplicar penalidades e idempotencia y enviar los correos; el recordatorio se envía una sola vez entre 12 y 20 horas antes de la salida. Las plantillas contienen ejemplos fijos y enlaces locales; para correo real, parametrizar los datos y usar la URL absoluta de producción.

Los demás módulos del equipo se muestran deshabilitados en el menú para no inventar sus pantallas. La landing y el acceso son trabajo de los módulos correspondientes. No se han cambiado elementos de Figma ni el contenido original de `spec.md`. No se han publicado cambios en GitHub.

Diseño de referencia: https://www.figma.com/design/Y12BnmOuhShBxVckf6J8gg/UniRide-Design?node-id=103-1866

SPEC original de referencia: https://pastes.dev/fz4274swn9
