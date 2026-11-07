# Cambios del módulo 4 — integración solo en el frontend

## Resultado y backend

Se integraron las solicitudes recibidas y la coordinación del viaje usando los
últimos archivos adjuntos: `uniride-frontend-develop(1).zip` y
`uniride-spring-backend-development (1)(1).zip`.

**No fue necesario modificar el backend para las funciones conectadas.**
Se comprobaron los hashes SHA-256 de sus **256 archivos** contra la copia original:
no hay archivos alterados, añadidos ni eliminados. No se cambiaron controladores,
servicios, DTO, configuración, dependencias ni migraciones del backend.

El resultado que se entrega es exclusivamente el frontend actualizado. Puedes
seguir ejecutando el mismo backend que adjuntaste.

## Qué se conectó

- US14: solicitudes recibidas por viaje, filtros de estado, paginación y perfil
  del pasajero.
- US15: aceptar una solicitud, reservar el cupo y consultar el borrador de acuerdo
  que genera el backend existente.
- US16: rechazo individual o múltiple con motivo opcional persistido.
- US17: confirmación del viaje; se respeta la respuesta `409` que puede dejarlo
  `VENCIDO` cuando se confirma fuera de plazo.
- Ciclo del viaje: iniciar y completar con las operaciones existentes.
- US18: cancelación por el conductor y por un pasajero con solicitud aceptada,
  con confirmación explícita y aviso de la penalidad estimada.
- Después de una acción exitosa se consultan nuevamente los estados y cupos.
  Ante un error no se simula éxito ni se sustituyen los datos por ejemplos.

El flujo de retirar solo una solicitud pendiente del pasajero se conserva y es
independiente de cancelar el viaje completo. La cancelación del viaje completo
cancela el viaje de todos los involucrados, como ya implementa el backend.

## Cómo se resolvió sin cambiar el backend

La API adjunta no ofrece un `GET /viajes/{id}` de detalle general ni un
`GET /viajes` global para el conductor. El frontend recorre los listados de rutas
propias y los viajes de cada ruta para recuperar el viaje elegido, también
cuando los registros están después de la primera página.

El detalle de solicitud original incluye el perfil pero no la preferencia y el
acuerdo. Esos campos ya vienen en el listado de solicitudes del viaje: se
componen ambas respuestas en el frontend. No se amplió ningún DTO del backend.

Esta composición necesita varias peticiones en cuentas con muchas rutas/viajes.
No depende de un endpoint nuevo ni de los endpoints adicionales de la entrega
anterior. El listado de rutas conserva el filtro de visibilidad del backend;
las rutas eliminadas no se incorporan al listado normal.

## Endpoints existentes utilizados

Todas las rutas tienen el prefijo `/api` y usan el interceptor JWT existente.

| Función | Método y ruta |
| --- | --- |
| Rutas propias | `GET /rutas?page=...&size=100` |
| Viajes de una ruta | `GET /rutas/{rutaId}/viajes?page=...&size=100` |
| Solicitudes de un viaje | `GET /viajes/{viajeId}/solicitudes?estado=...&page=...&size=...` |
| Perfil de la solicitud | `GET /solicitudes/recibidas/{solicitudId}/detalle` |
| Aceptar | `PUT /solicitudes/{solicitudId}/aceptar` |
| Rechazar | `PUT /solicitudes/{solicitudId}/rechazar`, cuerpo `{ "motivo": "..." }` |
| Rechazar varias | `PUT /solicitudes/rechazar-multiples`, cuerpo `{ "ids": [1, 2], "motivo": "..." }` |
| Confirmar | `PUT /viajes/{viajeId}/confirmar` |
| Iniciar | `PUT /viajes/{viajeId}/iniciar` |
| Completar | `PUT /viajes/{viajeId}/completar` |
| Cancelar el viaje | `PUT /viajes/{viajeId}/cancelar` |
| Recargar solicitudes del pasajero | `GET /solicitudes/resumen` |

## Archivos cambiados y ubicación

Las rutas de la siguiente tabla son relativas a la carpeta raíz del frontend.

| Archivo | Cambio |
| --- | --- |
| `README.md` | Modificado. Instrucciones de ejecución y descripción del módulo conectado. |
| `docs/cambios-modulo4.md` | Nuevo. Este informe: archivos, endpoints, validación, ejecución y límites. |
| `src/app/app.spec.ts` | Modificado. Conserva las regresiones de navegación y sustituye los escenarios del módulo 4 que solo simulaban estados en la URL. |
| `src/app/core/models/coordinacion.models.ts` | Nuevo. Modelos del contrato real y de las vistas compuestas; fechas de Lima, errores e interpretación orientativa de la penalidad. |
| `src/app/core/models/ruta.model.ts` | Modificado. Tipa confirmado, fechaConfirmacion, dia y mensaje que la API ya devuelve; añade ViajeConRuta. |
| `src/app/core/services/consulta.ts` | Modificado. Añade la lectura de todas las páginas de un listado, sin truncar en 100 registros. |
| `src/app/core/services/coordinacion.service.ts` | Nuevo. Conecta las acciones PUT y compone las consultas usando los endpoints originales, sin exigir /viajes ni /coordinacion nuevos. |
| `src/app/core/services/paginator-intl.spec.ts` | Nuevo. Comprueba los intervalos completos, parciales y vacíos del paginador. |
| `src/app/core/services/paginator-intl.ts` | Modificado. Corrige el cálculo de las etiquetas según pageIndex, pageSize y total de Angular Material. |
| `src/app/core/services/rutas.service.ts` | Modificado. Reutiliza los listados paginados para recuperar rutas, sus viajes y los viajes propios; obtener ruta recorre todas las páginas. |
| `src/app/pages/conductor/dashboard/conductor-dashboard.html` | Modificado. Dirige la gestión a los viajes reales y reemplaza los botones de solicitudes ficticias por un acceso al módulo conectado. |
| `src/app/pages/conductor/dashboard/conductor-dashboard.spec.ts` | Modificado. Comprueba el acceso a solicitudes reales desde el dashboard. |
| `src/app/pages/conductor/dashboard/conductor-dashboard.ts` | Modificado. Retira la aceptación y el rechazo que solo alteraban arreglos de demostración. |
| `src/app/pages/conductor/rutas/rutas.integration.spec.ts` | Modificado. Añade comprobaciones de que los enlaces usan el ID del viaje y el subrecurso de solicitudes. |
| `src/app/pages/conductor/rutas/viajes-ruta/viajes-ruta.html` | Modificado. Corrige las acciones que usaban rutaId: gestionar usa viaje.id y las solicitudes su URL correspondiente. |
| `src/app/pages/conductor/rutas/viajes-ruta/viajes-ruta.ts` | Modificado. Carga todas las páginas de viajes de la ruta y conserva la paginación de la tabla. |
| `src/app/pages/conductor/viajes/coordinacion.integration.spec.ts` | Nuevo. Pruebas HTTP de solicitudes, cupos, motivo, detalle, páginas adicionales, JWT, estados, conflictos y cancelación de ambos roles. |
| `src/app/pages/conductor/viajes/detalle-solicitud/detalle-solicitud.html` | Modificado. Presenta perfil, mensaje, preferencia, motivo y acuerdo reales, con acciones conectadas. |
| `src/app/pages/conductor/viajes/detalle-solicitud/detalle-solicitud.ts` | Modificado. Recupera el detalle, comprueba el viaje de la solicitud y recarga tras aceptar o rechazar. |
| `src/app/pages/conductor/viajes/gestionar-viaje/gestionar-viaje.html` | Modificado. Muestra el viaje persistido, pasajeros y confirmaciones; incorpora los diálogos y las estimaciones de plazo/penalidad. |
| `src/app/pages/conductor/viajes/gestionar-viaje/gestionar-viaje.ts` | Modificado. Ejecuta confirmar, iniciar, completar y cancelar; procesa 409/VENCIDO y vuelve a consultar el estado. |
| `src/app/pages/conductor/viajes/mis-viajes/mis-viajes.html` | Modificado. Añade accesos a Gestionar viaje y Ver solicitudes con el ID real de cada fila. |
| `src/app/pages/conductor/viajes/mis-viajes/mis-viajes.ts` | Modificado. Reutiliza la consulta de viajes propios sin el límite anterior de 100 rutas/viajes. |
| `src/app/pages/conductor/viajes/solicitud-accion-dialog.ts` | Nuevo. Diálogo común de aceptación y rechazo individual/múltiple: motivo opcional de 255 caracteres, bloqueo de doble envío y errores. |
| `src/app/pages/conductor/viajes/solicitudes/solicitudes.css` | Modificado. Ajusta la presentación del listado conectado y su selección. |
| `src/app/pages/conductor/viajes/solicitudes/solicitudes.html` | Modificado. Renderiza los usuarios, estados y cupos del backend; añade filtros y selección para rechazos múltiples. |
| `src/app/pages/conductor/viajes/solicitudes/solicitudes.ts` | Modificado. Consulta el viaje y las solicitudes por estado/página; recarga al resolver una acción y limpia la selección. |
| `src/app/pages/pasajero/viajes/detalle-viaje/cancelar-viaje-dialog/cancelar-viaje-dialog.ts` | Nuevo. Nuevo diálogo para cancelar el viaje completo por el pasajero aceptado, con estimación y validación del backend al confirmar. |
| `src/app/pages/pasajero/viajes/detalle-viaje/detalle-viaje.html` | Modificado. Añade la acción de cancelación del viaje completo para solicitudes aceptadas fuera del historial. |
| `src/app/pages/pasajero/viajes/detalle-viaje/detalle-viaje.ts` | Modificado. Abre el diálogo de cancelación y vuelve a consultar la solicitud después de la respuesta real. |

## Validación realizada

- Antes de editar: 389 pruebas del frontend aprobadas.
- Resultado final: **399 pruebas aprobadas en 25 archivos de pruebas**.
- `npm run build`: compilación de producción correcta.
- Las pruebas del módulo 4 usan `HttpTestingController` y los contratos del
  backend adjunto: aceptación del último cupo, motivos, rechazo múltiple,
  composición de detalle, lectura de páginas adicionales, JWT, confirmación
  vencida, inicio/finalización y cancelación de ambos roles.
- Se comprueba que no se llamen los endpoints inexistentes `GET /viajes` ni
  `/viajes/{id}/coordinacion`.
- Se conservaron las regresiones de autenticación, perfil, rutas, viajes del
  pasajero, reportes, compensaciones y contribución del frontend recibido.
- La prueba de envío SMTP y una sesión contra tu PostgreSQL local no se han
  ejecutado desde este entorno. Las pruebas HTTP del frontend usan respuestas
  controladas; no se atribuye esa validación a tu base de datos real.

Las pruebas antiguas que verificaban cambios ficticios en parámetros de URL
fueron sustituidas por pruebas de peticiones HTTP y sus respuestas. El resto de
las pruebas de navegación de `app.spec.ts` se conserva.

## Ejecutar y probar

1. Mantén tu backend existente iniciado en `http://localhost:8080/api`.
2. En la carpeta del frontend ejecuta `npm ci` y `npm start`.
3. Abre `http://localhost:4200`. Se mantienen Home, la autenticación y los guards
   de rol/perfil del proyecto recibido.
4. Con una cuenta de conductor verificada y perfil completo, publica una ruta y
   genera un viaje con más de 12 horas de anticipación.
5. En otra sesión, por ejemplo una ventana de incógnito, entra como pasajero,
   busca el viaje y envía una solicitud usando el módulo 3 ya integrado.
6. Como conductor, abre **Viajes → Ver solicitudes**, revisa el perfil y acepta
   o rechaza. Comprueba el cupo actualizado y recarga para comprobar persistencia.
7. Usa **Gestionar viaje** para confirmar, iniciar a partir de la salida,
   completar desde `EN_PROGRESO` o cancelar un viaje programado.
8. Como pasajero aceptado, abre **Mis viajes → Detalle del viaje → Cancelar viaje
   completo**. La ventana explica que afectará a todos los involucrados y muestra
   la penalidad estimada antes de enviar el PUT.

## Límites y reglas del contrato

Los plazos y penalidades definitivos los calcula el backend existente. La vista
orientativa utiliza la hora del equipo y la salida interpretada en
`America/Lima`; por eso se identifica como estimación. Los parámetros de URL
`horas`, `estado`, `confirmado`, `aceptada` y `rechazos` no cambian datos reales.

El listado de solicitudes del pasajero no informa todos los datos del estado
actual del viaje. Su botón de cancelación se ofrece para una solicitud aceptada
fuera del historial; el backend comprueba que el viaje siga programado al
confirmar. Si ya inició, se muestra el conflicto sin simular una cancelación.

El motivo se limita a 255 caracteres para ajustarse a la columna existente.
Los correos y recordatorios dependen del envío SMTP ya implementado en el
backend; las plantillas de `public/emails` siguen siendo muestras. Las métricas y
la tarjeta ilustrativa de viaje del dashboard conservan sus datos de demostración;
las acciones del módulo 4 se abren desde los listados reales.
