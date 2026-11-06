# Integración de viajes y solicitudes del pasajero

## Diagnóstico contractual previo

Rama `feature/integracion-viajes-pasajero`, HEAD inicial `6d9b02b7a397caab1f67ca97e306849eadcf115a`; árbol limpio al comenzar. Se leyeron SPEC.md y las instrucciones disponibles. No se encontró AGENTS.md. Las restricciones históricas de primera etapa visual de SPEC.md quedan superadas por esta solicitud explícita de integración.

Las pantallas usaban VIAJES/MUESTRAS, SOLICITUDES y métodos de compensación estáticos. La búsqueda era local, las solicitudes no persistían y una aceptación habilitaba una cancelación local del viaje completo. El módulo no soportaba RECHAZADA ni historial real.

Se revisaron en `development` del backend los controladores, servicios y DTO de búsqueda, solicitudes, historial y viajes, los enums, el mapper de solicitudes, métodos de compensación y GlobalExceptionHandler. Se inspeccionaron además los mappings de todos los controladores para verificar el detalle individual.

### Límites confirmados antes de implementar

1. **No existe GET individual de viaje para pasajeros.** ViajeController ofrece listado de viajes por ruta y solicitudes recibidas para CONDUCTOR, y sugerencia de contribución para PASAJERO; ninguno equivale a un detalle completo por ID. SolicitudRespuesta permite recuperar origen, destino, fecha, hora y estado de la solicitud, pero no conductor, ocupación ni estado actual del viaje. No se inventará GET `/api/viajes/{id}` ni se recorrerán indefinidamente páginas para simularlo. Se usará contexto temporal proveniente de respuestas reales y recuperación paginada acotada de solicitudes propias, con alternativa de búsqueda cuando falte detalle.
2. **Capacidad no equivale a cupos libres.** BusquedaRespuesta.capacidadMaxima es capacidad total. No se conoce la ocupación. `puntosReferencia` tampoco garantiza un punto de encuentro exacto: se etiquetará como referencias de ruta.
3. **Cancelar solicitud no cancela viaje.** Solo se conectará PUT `/api/solicitudes/{solicitudId}/cancelar` después de confirmación. PUT `/api/viajes/{viajeId}/cancelar` puede cancelar el viaje completo y generar penalidades; queda fuera hasta confirmación funcional específica.
4. **Método de compensación opcional.** GET `/api/metodos-compensacion` obtiene los de la sesión sin una restricción de rol en ese controlador. El POST de solicitud admite método null; se reutilizará ese GET aun cuando la pantalla de gestión de métodos esté reservada al conductor por los guards actuales.

Mínima mejora recomendada al backend, sin implementarla: GET de detalle por ID para PASAJERO con datos autorizados del viaje, estado actual, ocupación/cupos disponibles y estado/ID de la solicitud propia. Evitaría contexto temporal y búsquedas acotadas en solicitudes para las recargas directas.

## Referencias consultadas

Se consultó el código remoto de [development del backend](https://github.com/pollitoconpapass/uniride-spring-backend/tree/development/src/main/java/com/uniride), exclusivamente en lectura:

- BusquedaController, BusquedaService, BusquedaRespuesta y BusquedaResumenRespuesta.
- SolicitudController, SolicitudService, SolicitudRequest, SolicitudRespuesta y SolicitudMapper.
- SolicitudesResumenRespuesta, SolicitudesHistorialResumenRespuesta, SolicitudHistorialRespuesta y PenalidadHistorialRespuesta.
- ViajeController, ViajeService, ViajeRespuesta y los mappings del resto de controladores, para descartar un detalle individual autorizado para pasajeros.
- MetodoCompensacionController; enums EstadoViaje, EstadoSolicitud, EstadoAcuerdo y TipoCompensacion; GlobalExceptionHandler.

En frontend se revisaron SPEC.md, rutas, inicializador y configuración HTTP, AuthService, guards, interceptor, environments, proxy, servicios existentes y pruebas. Se reutiliza la infraestructura sin modificarla. Las secciones antiguas de SPEC.md no siempre describen los endpoints resumen e historial actuales; el código de development tiene prioridad contractual en esta integración.

## Contratos utilizados

Todas las URL se construyen desde `environment.apiUrl = '/api'`. El proxy de desarrollo conserva `http://localhost:8080`. El interceptor existente agrega Bearer; estos servicios no copian ni almacenan el JWT ni envían un usuarioId.

| Operación | Endpoint | Parámetros / cuerpo | Resultado |
| --- | --- | --- | --- |
| Buscar | GET `/api/viajes/buscar/resumen` | origen, destino, dia, hora opcionales; cercania, page, size | `{viajes: Pagina<BusquedaRespuesta>, mensaje, sugerencia}` |
| Solicitudes propias | GET `/api/solicitudes/resumen` | estado opcional; page, size | `{solicitudes: Pagina<SolicitudRespuesta>, mensaje}` |
| Historial propio | GET `/api/solicitudes/historial` | page, size | `{solicitudes: Pagina<SolicitudHistorialRespuesta>, mensaje}` |
| Métodos propios | GET `/api/metodos-compensacion` | Sin usuarioId | Array de métodos, incluidos inactivos |
| Solicitar | POST `/api/solicitudes/viajes/{viajeId}` | SolicitudRequest | HTTP 201, SolicitudRespuesta |
| Cancelar solicitud | PUT `/api/solicitudes/{solicitudId}/cancelar` | `{}` | HTTP 200, SolicitudRespuesta |
| Sugerencia existente US29 | GET `/api/viajes/{viajeId}/sugerencia-contribucion` | pasajeros opcional, gestionado por el módulo existente | Se accede mediante `/contribucion/sugerencia/{viajeId}` |

`page` comienza en cero; el backend admite `size` entre 1 y 100. Los paginadores ofrecen 5, 10 y 20 filas. Se usan `totalElements`, `totalPages`, `number` y `size` de la respuesta; los grupos de estados cuentan solamente las filas de la página visible.

SolicitudRequest:

```ts
interface SolicitudRequest {
  mensaje?: string;
  preferenciaCompensacion: 'DINERO' | 'GASOLINA' | 'FAVOR';
  metodoCompensacionId: number | null;
}
```

Se omite el mensaje si queda vacío después de trim. El método personal es opcional, sin bloquear a un pasajero que no tenga métodos. Cuando se elige uno, se valida contra el GET propio: activo y de la preferencia seleccionada. Al cambiar la preferencia se restablece la selección del método. El backend vuelve a validar propiedad, tipo y estado. No se habilita la gestión de métodos para pasajeros ni se cambia su política de rutas.

### DTO y presentación

Los modelos están en `viajes.models.ts`:

- `Pagina<T>`: content, totalElements, totalPages, number y size.
- `BusquedaRespuesta`: viajeId, rutaId, fecha, hora, dia, origen, destino, puntosReferencia, zonasSinParada, notaContribucion, capacidadMaxima, conductorId, conductorNombre y contribucionSugerida nullable.
- `BusquedaResumenRespuesta`: página de viajes, mensaje y sugerencia nullable.
- `SolicitudRespuesta`: id de solicitud separado de viajeId; ruta, fecha/hora/día, origen/destino, mensaje, preferencia, estado, motivoRechazo, fechaCreacion, advertencia, datos del pasajero, acuerdo y método personal. Los campos opcionales del servidor admiten null.
- `SolicitudesResumenRespuesta`, `SolicitudesHistorialResumenRespuesta` y `SolicitudHistorialRespuesta`: esta última contiene solicitud, estadoViaje, soloLectura y penalidades propias.
- `PenalidadHistorialRespuesta`: id, tipo LEVE/GRAVE, motivo y fecha.
- Estados de solicitud: PENDIENTE, ACEPTADA, RECHAZADA y CANCELADA. Estado de viaje: PROGRAMADO, EN_PROGRESO, COMPLETADO, CANCELADO y VENCIDO.
- `Viaje` es un modelo de presentación, con campos nullable que la fuente no proporciona. `desdeBusqueda` y `desdeSolicitud` no completan campos usando fixtures. La búsqueda ofrece solo viajes PROGRAMADO; ese estado es una instantánea, no una confirmación actual de disponibilidad.

Las fechas LocalDate se formatean separando año, mes y día, sin conversión UTC. La hora del filtro se valida como HH:mm (compatible con LocalTime); se envía sin cambios de zona horaria. No se calculan importes, ocupación ni penalidades en el frontend. La sugerencia se consulta en US29 mediante el ID real.

## Funcionamiento y decisiones

### Búsqueda

Se consulta al entrar. Origen y destino son entradas libres, porque no hay catálogo de orígenes en el contrato; se elimina el select alimentado por MUESTRAS. Día usa los valores del backend y etiquetas acentuadas. Cercanía utiliza el distrito del perfil resuelto en servidor, sin enviar otra identidad.

Los cambios de filtros invalidan inmediatamente la respuesta anterior, cancelan la petición previa mediante switchMap y esperan 250 ms antes del nuevo GET. Un filtro inválido cancela la consulta y deja de mostrar resultados antiguos. Paginación y reintento ejecutan GET reales; el reintento conserva la página y filtros que fallaron. Se evitan consultas iguales mientras están en curso. Al abandonar la pantalla se destruye la suscripción.

Se muestran mensaje/sugerencia del backend, resultados vacíos, carga y error con reintento mediante ReportesStatePanel. Las tarjetas conservan estructura y CSS y muestran capacidad **total**, conductor y referencias solamente si existen. No se presenta una cantidad inventada de asientos libres.

### Detalle sin GET individual

`ViajePasajeroContextoService` conserva exclusivamente la selección real en memoria, asociada al objeto de sesión actual. No persiste viajes ni solicitudes en storage y descarta el contexto al cambiar la sesión. No se usa como autoridad de autorización o disponibilidad.

1. Desde búsqueda: conserva el DTO real seleccionado y consulta solicitudes propias, una sola página de hasta 100 registros, para comprobar una solicitud previa.
2. Desde Mis viajes: conserva el ID de solicitud y la consulta de origen y vuelve a consultar esa misma página/filtro (o página de historial).
3. En recarga o URL directa: intenta recuperar información desde la primera página de hasta 100 solicitudes propias. No recorre todas las páginas. Si no hay detalle recuperable, ofrece volver a búsqueda o Mis viajes. El mensaje no afirma falsamente que el viaje no exista.
4. Si hay varias páginas y no se puede verificar la solicitud, bloquea las acciones y pide seleccionar el registro en Mis viajes. Si una selección propia salió de la página al actualizar, también exige volver a seleccionarla.
5. Un historial seleccionado conserva su condición de solo lectura. El DTO de solicitudes no permite reconstruir conductor, capacidad ni estado actual del viaje: esos campos no se inventan.
6. Los IDs se validan como enteros positivos seguros. Cambiar de ID cancela la consulta anterior, cierra un diálogo obsoleto e ignora sus resultados tardíos. Salir de la pantalla destruye consultas y diálogos.

El registro de una solicitud y su cancelación se confirman solamente después de HTTP exitoso. Después se vuelve a consultar el servidor. Si la relectura falla, se informa el error sin afirmar que esa relectura tuvo éxito; una respuesta de escritura confirmada puede conservarse como tal. Al volver a Mis viajes se crea una nueva consulta real, sin depender de un array local.

### Solicitar y cancelar

El diálogo existente conserva campos y diseño. Carga métodos propios con el servicio ya integrado. La preferencia es obligatoria y el método es opcional. Si falla el GET de métodos, se ofrece reintentarlo y sigue siendo posible enviar con null. Ante error de POST se mantiene abierto y conserva los valores. Mientras escribe deshabilita el formulario, botones y cierre por escape/backdrop; no hay POST simultáneos.

Solo una solicitud PENDIENTE puede ofrecer cancelación. El nuevo diálogo pide confirmación explícita, explica que cancela la solicitud y utiliza su ID. Cerrar o pulsar Conservar solicitud no emite PUT. Mientras opera impide repeticiones. Ante 409/error mantiene el registro y permite reintento; ante 404 ofrece actualizar datos. La disponibilidad temporal y la propiedad se verifican nuevamente en Spring Boot.

Una solicitud ACEPTADA no habilita cancelación del viaje completo. Esa acción afectaría a participantes y penalidades y queda pendiente de definición funcional. Nunca se llama PUT `/api/viajes/{id}/cancelar` desde este módulo.

El historial usa el endpoint específico; puede solaparse con el resumen, ya que este último no filtra automáticamente todos los registros antiguos. La vista Historial siempre es de solo lectura y muestra únicamente las penalidades devueltas para la cuenta autenticada.

### Errores y seguridad

| Estado | Comportamiento |
| --- | --- |
| 0 / red | Mensaje controlado y reintento explícito; sin éxito ficticio |
| 400 | Revisar filtros/datos; para cercanía se necesita distrito en el perfil |
| 401 | El interceptor existente cierra sesión y redirige al login; se destruyen diálogos/consultas |
| 403 | Mensaje de permisos; no se destruye una sesión válida |
| 404 | Recurso no disponible; en cancelación ofrece actualizar; en cercanía puede faltar perfil |
| 409 | Conflicto de negocio; mensajes conocidos como solicitud duplicada o ruta sin cupos, sin modificar registros localmente |
| 5xx / otros | Mensaje genérico sin detalles internos; permite reintento |

No hay reintentos automáticos de escrituras. Se muestran solo mensajes de conflicto conocidos y textos controlados para errores inesperados, sin stack traces ni SQL. Los guards y la autorización final del backend permanecen intactos. Se usan interpolaciones Angular; no HTML recibido del servidor. No se registran tokens, credenciales ni datos de Supabase. No se implementa cambio de rol ni lógica de otras historias.

## Archivos

Modificados (13):

- `src/app/app.spec.ts`: respuestas HTTP de navegación general para el módulo ahora integrado; no se cambian sus assertions de otros módulos.
- `src/app/pages/pasajero/viajes/viajes.models.ts`
- `src/app/pages/pasajero/viajes/viajes.models.spec.ts`
- `src/app/pages/pasajero/viajes/buscar-viaje/buscar-viaje.ts`
- `src/app/pages/pasajero/viajes/buscar-viaje/buscar-viaje.html`
- `src/app/pages/pasajero/viajes/mis-viajes/mis-viajes.ts`
- `src/app/pages/pasajero/viajes/mis-viajes/mis-viajes.html`
- `src/app/pages/pasajero/viajes/detalle-viaje/detalle-viaje.ts`
- `src/app/pages/pasajero/viajes/detalle-viaje/detalle-viaje.html`
- `src/app/pages/pasajero/viajes/detalle-viaje/unirse-viaje-dialog/unirse-viaje-dialog.ts`
- `src/app/pages/pasajero/viajes/detalle-viaje/unirse-viaje-dialog/unirse-viaje-dialog.html`
- `src/app/pages/pasajero/viajes/shared/viaje-card/viaje-card.ts`
- `src/app/pages/pasajero/viajes/shared/viaje-card/viaje-card.html`

Nuevos (10):

- `src/app/core/services/viajes-pasajero.service.ts`
- `src/app/core/services/solicitudes-pasajero.service.ts`
- `src/app/core/services/viaje-pasajero-contexto.service.ts`
- `src/app/pages/pasajero/viajes/shared/pasajero-query.ts`
- `src/app/pages/pasajero/viajes/detalle-viaje/cancelar-solicitud-dialog/cancelar-solicitud-dialog.ts`
- `src/app/pages/pasajero/viajes/detalle-viaje/cancelar-solicitud-dialog/cancelar-solicitud-dialog.html`
- `src/app/pages/pasajero/viajes/detalle-viaje/cancelar-solicitud-dialog/cancelar-solicitud-dialog.css`
- `src/app/pages/pasajero/viajes/viajes.integration.spec.ts`
- `src/app/pages/pasajero/viajes/viajes.testing.ts`: fixtures importados únicamente por specs, sin referencias desde código productivo.
- `docs/integracion-viajes-pasajero.md`

Los CSS existentes, layouts, rutas, guards, interceptor, AuthService, environments, proxy, package.json y package-lock.json se conservan.

## Pruebas automatizadas y validación

Se usa TestBed, HttpTestingController, RouterTestingHarness, diálogos Material y el interceptor/guards reales. Todos los datos y respuestas de las pruebas son simulados dentro de la infraestructura de testing; no se llama al backend real ni a Supabase.

Cobertura del módulo: 51 casos de integración y 4 casos de mapeo/formato. Incluye GET con Bearer, filtros/local time, paginación, mensajes vacíos, errores 0/400/401/403/404/409/500, reintentos, cancelación de consultas obsoletas y eliminación inmediata de resultados anteriores; detalle desde selección/solicitudes/URL directa, IDs inválidos y recuperación acotada; enlace US29; cuatro estados e historial de solo lectura con penalidades; POST con preferencia y método null o válido, validación de método inactivo/incompatible, bloqueo de duplicados, conservación del formulario y confirmación solo después de 201; cancelación explícita con ID distinto al del viaje, cierre sin PUT, errores y relectura; aislamiento del contexto de sesión y protección por rol.

Comandos de validación en PowerShell:

```powershell
$env:VITEST_MAX_WORKERS = '2'
npm.cmd test -- --watch=false
npm.cmd run build
git diff --check
git status
```

Resultados registrados el 6 de noviembre de 2026:

| Comando | Resultado |
| --- | --- |
| npm.cmd ls --depth=0 | Código 0, dependencias instaladas sin errores |
| VITEST_MAX_WORKERS=2; npm.cmd test -- --watch=false | Código 0; **21 archivos, 321 pruebas aprobadas, 0 fallidas**; última ejecución: inicio 13:21:37 (Lima), 26.55 s |
| npm.cmd run build | Código 0; producción generada en dist/uniride-frontend; 9.004 s; bundle inicial 444.48 kB (118.33 kB de transferencia estimada); sin warnings de compilación |
| git diff --check | Código 0, sin errores de whitespace; salida final sin warnings |
| git status | Rama de trabajo conservada; 13 archivos modificados y 10 nuevos, sin stage |

La suite incluye las pruebas existentes de autenticación, reportes US19-US21, PDF US22, compensaciones US26-US28, US29 y navegación general. No se aumentaron timeouts ni se agregaron dependencias. Las ejecuciones completas con dos workers no registraron fallos ni timeouts.

`npm.cmd ci` no fue necesario: node_modules ya estaba instalado, `npm.cmd ls --depth=0` terminó con código 0 y no se modificaron dependencias ni el lockfile. No se declara una instalación limpia como ejecutada. Si se reproduce desde un checkout nuevo, ejecutar `npm.cmd ci` antes de los comandos anteriores.

## Prueba manual pendiente, a realizar por el usuario

No se ejecutaron pruebas manuales contra datos reales. Los siguientes pasos pueden crear o cancelar solicitudes y deben hacerse después, con cuentas/datos destinados a validación.

1. En IntelliJ, abrir el backend existente y levantar Spring Boot en `localhost:8080` con su configuración local ya válida. No cambiar migraciones ni exponer secretos.
2. En la raíz del frontend, ejecutar `npm.cmd start`. Abrir `http://localhost:4200` e iniciar sesión con una cuenta PASAJERO verificada.
3. Abrir `/pasajero/viajes/buscar`. En Network verificar GET `/api/viajes/buscar/resumen?page=0&size=10&cercania=false`, Bearer y respuesta paginada. No compartir capturas del valor del token.
4. Probar origen, destino, día y hora HH:mm. Confirmar que los filtros llegan a Spring y que el cambio rápido de filtros no deja visibles resultados anteriores. Probar hora inválida: debe invalidar el formulario y no consultar.
5. Probar cercanía con un perfil que ya tenga distrito. Si no existe ese dato, verificar el error controlado 400/404; esta integración no guarda ni modifica el perfil.
6. Probar siguiente página y tamaño cuando existan suficientes viajes. Comparar totales de UI con totalElements/totalPages del backend. Probar búsqueda sin coincidencias y sus mensaje/sugerencia.
7. Abrir Ver más sobre un resultado. Comprobar ID real, fecha/hora local, conductor real, capacidad total y referencias de ruta. No debe indicar cupos libres ni un punto de encuentro exacto inventado.
8. Abrir Consultar sugerencia de contribución y confirmar la navegación a `/contribucion/sugerencia/{idReal}` y la consulta US29 existente. Volver a seleccionar el viaje desde búsqueda si falta contexto al regresar.
9. Pulsar Unirse al viaje. Verificar GET `/api/metodos-compensacion` con la sesión pasajero. Comprobar que solo aparecen métodos activos compatibles con la preferencia. Si no hay métodos, debe permitirse Sin método personal.
10. Elegir DINERO/GASOLINA/FAVOR y, opcionalmente, mensaje y método propio. Enviar y revisar POST `/api/solicitudes/viajes/{viajeId}`, sin userId. El método puede ser null. Confirmar 201 y luego GET de actualización antes de examinar el estado persistido.
11. Abrir `/pasajero/viajes/mis-viajes` y comprobar GET resumen y la solicitud creada. Probar filtros de estado y paginación con datos existentes; se distinguen PENDIENTE, ACEPTADA, RECHAZADA y CANCELADA.
12. En detalle de una PENDIENTE, abrir Cancelar solicitud y primero elegir Conservar solicitud: no debe haber PUT. Después confirmar explícitamente y comprobar PUT `/api/solicitudes/{solicitudId}/cancelar`, HTTP 200 y relectura. El ID debe ser el de la solicitud, aunque difiera del viaje.
13. Una ACEPTADA no debe ofrecer cancelar el viaje completo. No se invoca `/api/viajes/{id}/cancelar`. Un rechazo/cancelación se representa conforme a su estado real.
14. Probar un duplicado si el backend permite reproducirlo (otra pestaña/datos de validación): ante 409, no hay éxito falso y se conservan valores del diálogo. Probar un recurso inexistente y errores 400/403 controlados.
15. Cambiar a Historial. Revisar GET `/api/solicitudes/historial`, paginación, estado real del viaje y penalidades propias. Sus detalles no permiten escribir.
16. Recargar `/pasajero/viajes/{idReal}`. Si una solicitud propia permite recuperar el registro en la primera página, comprobar campos reales y ausencia de conductor/cupos inventados. Si no hay registro recuperable, comprobar las alternativas de búsqueda/Mis viajes. No debe aparecer un GET individual inexistente.
17. Desconectar la red con DevTools y probar carga/error/Reintentar. Restaurar la red y verificar un nuevo GET real. Un POST/PUT fallido no debe mostrarse como persistido. Con sesión inválida, un 401 debe redirigir al login mediante la infraestructura existente.
18. Verificar escritorio y móvil: filtros, tarjetas, páginas, diálogos, foco/teclado y mensajes accesibles. Revisar también navegación a reportes, PDF, compensaciones y US29 con el rol correspondiente, sin cambiar sus políticas.

### Evidencias sugeridas para revisión

- Network de búsqueda con filtros y página; comparar respuesta y tarjetas sin datos ficticios.
- Detalle desde búsqueda y alternativa de recarga directa, mostrando la limitación contractual.
- GET de métodos propios y POST con método null/compatible; estado final tras relectura.
- Diálogo de confirmación y PUT usando ID de solicitud; ausencia de PUT al conservarla.
- Mis viajes con los cuatro estados, totales/paginación e historial de solo lectura y penalidades propias.
- Error de red con reintento, 409 conservando formulario y vista móvil/escritorio.
- Salidas de suite completa, build y diff check. Ocultar cabeceras de autorización, correos y datos personales al compartir capturas.

## Límites y pendientes

- El detalle completo por URL directa sigue limitado por la falta de un GET autorizado de detalle. La consulta acotada de solicitudes no garantiza recuperar registros fuera de la primera página de 100. El fallback evita búsquedas indefinidas y errores semánticos; no completa ese contrato faltante.
- No hay ocupación real/cupos libres en BusquedaRespuesta. El backend sigue comprobando cupos al registrar la solicitud.
- SolicitudRespuesta no incluye estado actual del viaje ni conductor. Las solicitudes antiguas pueden rechazar una cancelación pendiente con 409; no se duplican todas esas reglas temporales en frontend.
- El pasajero puede seleccionar métodos propios existentes, pero su pantalla de gestión sigue protegida por conductorGuard. No se cambian roles ni guards para sortearlo. Null es válido en el POST.
- La cancelación de viaje aceptado queda pendiente de confirmación funcional por su impacto global y penalidades.
- Las pruebas automatizadas prueban el contrato con HTTP simulado. No acreditan conectividad local ni comportamiento visual en un navegador real; esas pruebas manuales quedan pendientes.

## Estado de entrega

Se mantiene `feature/integracion-viajes-pasajero` y HEAD `6d9b02b7a397caab1f67ca97e306849eadcf115a`. Los cambios quedan sin stage para revisión. No se creó commit, push, PR o merge, no se cambió de rama y no se modificaron backend, Supabase ni registros reales.
