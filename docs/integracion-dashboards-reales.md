# Integración de dashboards reales — UniRide

## Diagnóstico inicial y alcance

Rama de trabajo: `feature/integracion-dashboards-reales`. HEAD inicial: `de2cec2a94a5b3a31eb603c48eff958b085b92d1`. El árbol de Git estaba limpio al iniciar.

Se leyó SPEC.md y se buscaron AGENTS.md en el repositorio y sus ancestros, sin encontrarlos. Se revisaron arquitectura, estilos/tokens globales, ambos layouts y dashboards, rutas/guards de rol y perfil, AuthService, interceptor, environments/proxy, servicios de viajes/solicitudes/coordinación/rutas, reportes, compensaciones y las pruebas existentes.

El alcance es exclusivamente integrar los dashboards y sus componentes compartidos. Se conservan autenticación, selector de rol, onboarding, navegación global y lógica de los módulos ya integrados. No se modificó Figma, backend ni base de datos. Las reglas antiguas de etapa visual de SPEC.md quedan subordinadas a la integración HTTP solicitada expresamente.

### Datos y operaciones ficticias encontrados

Pasajero:

- Viaje con ID fijo, Rodrigo Morales, Nissan Versa, placa B7X-412, carrera/calificación/asiento/horas de llegada inventados.
- Ahorro fijo, CO₂, puntualidad y cantidades de viajes ficticias.
- Comparativa de taxi/UniRide con precios y barras fijas; distribución Yape/Plin sin respaldo.
- Recomendaciones supuestamente basadas en cursos, con nombres, cupos y aportes de ejemplo.
- Buscador con valores prefijados que no enviaba filtros.
- `solicitarCupo()` decrementaba un array y mostraba éxito local; `cancelarViaje()` solo mostraba un aviso.

Conductor:

- Toyota Yaris, ABC-123, viaje ID 1 y pasajeros María/Carlos/Sofía como valores predeterminados.
- Cabina con asientos asignados, cupos derivados de esas personas y tráfico/tiempo de ruta inventados.
- Compensación, CO₂, calificación, tendencias y gráficos sin HTTP.
- Frecuencia con alturas/cantidades fijas y ranking con porcentajes estáticos.
- Porcentajes y montos de Yape/Plin interpretados incorrectamente como cobros reales.

Todo lo anterior se eliminó del comportamiento productivo de ambos dashboards.

## Backend auditado en modo de lectura

Referencia: [master del backend](https://github.com/pollitoconpapass/uniride-spring-backend/tree/master/src/main/java/com/uniride), rama predeterminada vigente al revisar.

Se consultaron BusquedaController/Service/Respuesta, SolicitudController/Service/Respuesta, ViajeController/Service/Respuesta, RutaController/RutaRespuesta, EstadisticasController/Service y sus DTO, MetodoCompensacionController, repositories de viajes y solicitudes, GlobalExceptionHandler, UsuarioController/Respuesta y PerfilController/Respuesta. Se verificó también el inventario de controladores y DTO de respuesta: no hay contrato de vehículo/placa/asignación de asientos que permita conservar esos campos.

Hallazgos determinantes:

1. `SolicitudRespuesta` contiene estado de solicitud y fecha/hora del viaje, pero **no** estado del viaje ni `confirmado`. `acuerdoEstado` pertenece al acuerdo de compensación; no confirma la salida.
2. Una solicitud ACEPTADA puede seguir asociada a un viaje VENCIDO. El historial propio expone `estadoViaje` y permite descartar esos casos.
3. La búsqueda filtra viajes PROGRAMADOS, futuros, de rutas no eliminadas y no llenos antes de paginar. `capacidadMaxima` sigue siendo capacidad total, no cupos libres.
4. No existe GET individual del viaje autorizado para pasajeros ni un GET agregado de próximas salidas del conductor. Se reutilizan las composiciones existentes, sin inventar endpoints.
5. La frecuencia agrupa viajes completados históricos de ambos roles por día de semana; no se limita a los últimos siete días.
6. Los métodos registrados son configuración personal. No representan pagos recibidos ni una distribución de ingresos.

## Solución implementada

### Dashboard del pasajero

- Consulta solicitudes ACEPTADAS propias, con page/size reales. Se recorren todas las páginas porque el backend ordena por creación, no por salida.
- Valida fecha, hora e IDs. Descarta salidas pasadas y estados de solicitud distintos de ACEPTADA, aunque llegaran en una respuesta inesperada.
- Solo cuando hay candidatas futuras consulta las páginas del historial propio y excluye viajes CANCELADOS, COMPLETADOS o VENCIDOS. Si esta comprobación falla, muestra error/reintento; no presenta una candidatura como válida sin esa comprobación.
- Elige la salida más próxima por fecha y hora de Lima, con segundos y desempate por ID. Muestra origen/destino, fecha/hora y **Solicitud aceptada**, indicando que no equivale a confirmación de salida.
- Conserva en memoria la página/filtro de origen y el ID real al navegar a detalle mediante ViajePasajeroContextoService. Esto permite al detalle existente verificar nuevamente la solicitud en su página correcta.
- Viajes disponibles usa ViajesPasajeroService con size=3 y paginación HTTP visible basada en totalElements/number. No se descarga toda la búsqueda ni se afirma personalización.
- Las tarjetas muestran solo origen/destino, fecha/hora, conductor cuando existe y capacidad **total**. No se inventan cupos ni precios.
- **Ver detalle y solicitar** navega al flujo existente de preferencia de compensación, método opcional y POST real. El dashboard no realiza ese POST ni modifica disponibilidad localmente.
- **Ver mi viaje / Gestionar mis solicitudes** reutiliza detalle y Mis viajes para cancelaciones confirmadas. El dashboard no ejecuta PUT ni anuncia cancelación exitosa.
- El buscador visual se reemplaza por un acceso claro al buscador completo. No quedan inputs que aparenten filtrar sin hacerlo.

### Dashboard del conductor

- DashboardViajesService reutiliza RutasService.todas() y todosLosViajes(), recorriendo páginas reales de rutas propias y viajes.
- La composición limita a **dos rutas simultáneas**. No utiliza el forkJoin ilimitado de viajesPropios() ni altera el comportamiento de ese servicio para las otras pantallas.
- Prioriza un viaje EN_PROGRESO; de lo contrario selecciona el PROGRAMADO futuro más cercano. Excluye CANCELADO, COMPLETADO, VENCIDO, programados pasados y fechas/IDs inválidos.
- Muestra origen/destino de la ruta, fecha/hora, estado y confirmación solo si el booleano real está disponible. Capacidad total proviene de la ruta; pasajeros registrados proviene del contador del viaje cuando está presente. No hay esquema de asientos ni nombres atribuidos sin contrato.
- **Gestionar viaje** y **Revisar solicitudes** enlazan al ID real seleccionado.
- CoordinacionService.solicitudes() consulta PENDIENTE con page=0/size=1: el contador usa **totalElements**, no la longitud de la primera página. No hace falta descargar todas las solicitudes para mostrar ese total.
- Cambiar/actualizar el viaje cancela las solicitudes obsoletas; la finalización de una consulta no vuelve a dispararla en un ciclo reactivo.
- Sin próximo viaje, ofrece Mis rutas/Publicar ruta. La generación sigue en la pantalla existente de rutas; no se duplica esa operación.
- Rutas frecuentes consulta ReportesService.rutas(), ordena una copia por cantidad y muestra hasta tres entradas con viajes completados y penalidades reales. El ranking completo sigue accesible en Reportes.

### Componentes reutilizados y nuevos

Servicios existentes sin cambios: SolicitudesPasajeroService, ViajesPasajeroService, ViajePasajeroContextoService, RutasService, CoordinacionService, ReportesService y MetodosCompensacionService.

Los widgets nuevos evitan duplicar tres secciones entre roles:

- **DashboardMetricas:** resumen real, seleccionando viajes completados del rol correspondiente; cancelados y penalidades de la cuenta.
- **DashboardFrecuencia:** gráfico accesible por día, escala/anchos/totales calculados únicamente con viajesPorDia; normalización visual de Miércoles/Sábado, sin alterar conteos. No grafica datos insuficientes ni valores de demostración. Muestra canceladosPorMi/canceladosPorTerceros reales.
- **DashboardMetodos:** tipos, descripciones y estados activos/inactivos recibidos. Muestra hasta tres métodos, indica el total y ofrece gestionar todos. No interpreta configuración como pagos.

Se reutilizan ReportesStatePanel, reportQuery, consultaQuery, pasajeroQuery, todasLasPaginas y crearPaginatorIntl. consultaDashboard solo adapta los mensajes de error de lectura de forma controlada; conserva el ciclo de vida de consultaQuery y no altera utilidades ajenas.

La composición y presentación usan los DTO existentes. Los modelos nuevos SolicitudDashboard/ProximaSolicitud guardan únicamente la selección y su procedencia; no reemplazan contratos REST ni contienen tokens.

## Endpoints realmente utilizados

Todos se construyen por los servicios existentes con `environment.apiUrl = '/api'`. JWT lo adjunta exclusivamente el interceptor actual. No hay parámetros usuarioId ni consultas de otras cuentas.

| Dashboard/recurso                                     | Endpoint y parámetros                                                            |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| Pasajero, próximas solicitudes                        | GET `/api/solicitudes/resumen?estado=ACEPTADA&page=N&size=100`                   |
| Pasajero, exclusión de viajes históricos/terminales   | GET `/api/solicitudes/historial?page=N&size=100`, solo si hay candidatas futuras |
| Pasajero, viajes disponibles                          | GET `/api/viajes/buscar/resumen?page=N&size=3&cercania=false`                    |
| Conductor, rutas propias                              | GET `/api/rutas?page=N&size=100`                                                 |
| Conductor, viajes de cada ruta propia                 | GET `/api/rutas/{rutaId}/viajes?page=N&size=100`                                 |
| Conductor, total de pendientes del viaje seleccionado | GET `/api/viajes/{viajeId}/solicitudes?estado=PENDIENTE&page=0&size=1`           |
| Ambos, estadísticas                                   | GET `/api/estadisticas`                                                          |
| Ambos, frecuencia histórica por día                   | GET `/api/estadisticas/semana`                                                   |
| Conductor, ranking                                    | GET `/api/estadisticas/rutas`                                                    |
| Ambos, métodos configurados                           | GET `/api/metodos-compensacion`                                                  |

El orden textual de query params no cambia su semántica. El dashboard no utiliza POST, PUT o DELETE. Al navegar a módulos existentes, las acciones y sus confirmaciones siguen bajo responsabilidad de esos módulos.

## Métricas disponibles y descartadas

Disponibles: viajesComoConductor, viajesComoPasajero, viajesCancelados, penalidadesAcumuladas; frecuencia histórica, canceladosPorMi/canceladosPorTerceros; cantidad/penalidades por ruta; total de solicitudes pendientes por viaje; capacidad total y pasajeros registrados del viaje.

Cancelaciones son distintas de penalidades. Las tarjetas de cancelación y penalidades explican que se refieren a la cuenta, no exclusivamente al rol activo. Los ceros reales se presentan como cero.

Descartadas por falta de contrato: ahorro frente a taxi, CO₂ evitado, puntualidad, calificación, compensación acumulada, ahorro de combustible, porcentajes de medios de pago, comparativas semanales, tráfico, duración/ETA y asientos asignados. No se sustituyen por cálculos arbitrarios.

## Estados, fechas y seguridad

Cada recurso tiene su propia carga, datos/vacío y error con reintento HTTP. Un fallo de estadísticas no oculta una salida recuperada. Los reintentos en curso no duplican solicitudes. La búsqueda cancela páginas obsoletas y retira las tarjetas previas mientras carga. La próxima salida puede actualizarse explícitamente con **Actualizar viaje**.

Las respuestas 401 siguen el logout del interceptor. 403 conserva la sesión y explica permisos. Red/timeout/4xx/5xx muestran mensajes controlados; no se muestran mensajes internos del servidor como SQL o stack traces. No hay éxitos locales para operaciones de escritura.

Se validan fechas de calendario y cadenas LocalTime, incluidos segundos/fracciones. Se reutiliza instanteSalida con la zona fija de Lima (-05:00) para comparar salidas; no se usa `new Date('YYYY-MM-DD')` para presentar un día. Fecha y hora se muestran directamente sin desplazamientos UTC. Los formatos inválidos tienen texto controlado; no se normaliza un 30 de febrero a otro día ni se muestra NaN/Invalid Date.

La selección requiere revisar todas las páginas pertinentes: el pasajero conserva la procedencia de la solicitud y se rechazan instantáneas de solicitudes/historial con totales inconsistentes. Las lecturas no se cachean globalmente entre cuentas. toSignal/takeUntilDestroyed de las utilidades compartidas cancela suscripciones al abandonar la vista. No hay suscripciones permanentes ni nuevas copias de JWT en storage.

## Diseño y navegación

Se mantiene la organización Bento con próximo viaje y métricas, gráfico, métodos y secciones propias de cada rol. Roboto, colores, radios, espaciados y controles provienen del design system actual. Se compartió únicamente CSS de dashboards y se retiraron estilos muertos de vehículos, cabina, donuts y demostraciones.

Rutas existentes utilizadas, sin incorporar ni modificar rutas:

- `/pasajero/dashboard`, `/pasajero/viajes/buscar`, `/pasajero/viajes/mis-viajes`, `/pasajero/viajes/{id}`.
- `/conductor/dashboard`, `/conductor/rutas`, `/conductor/rutas/publicar`, `/conductor/viajes/{id}`, `/conductor/viajes/{id}/solicitudes` y `/conductor/viajes`.
- `/reportes/resumen`, `/reportes/frecuencia`, `/reportes/rutas` (solo conductor), `/compensaciones`.

No se cambiaron barras laterales, guards, perfilGuard, selector de rol, rutas globales ni proxy. Los módulos previos continúan resolviendo sus propias autorizaciones.

## Archivos modificados

Los ocho archivos de los dashboards:

- `src/app/pages/pasajero/dashboard/pasajero-dashboard.ts`
- `src/app/pages/pasajero/dashboard/pasajero-dashboard.html`
- `src/app/pages/pasajero/dashboard/pasajero-dashboard.css`
- `src/app/pages/pasajero/dashboard/pasajero-dashboard.spec.ts`
- `src/app/pages/conductor/dashboard/conductor-dashboard.ts`
- `src/app/pages/conductor/dashboard/conductor-dashboard.html`
- `src/app/pages/conductor/dashboard/conductor-dashboard.css`
- `src/app/pages/conductor/dashboard/conductor-dashboard.spec.ts`

Ajustes mínimos de pruebas de regresión que navegan a un dashboard ahora conectado:

- `src/app/pages/configuracion/perfil-roles.integration.spec.ts`
- `src/app/pages/reportes/reportes.integration.spec.ts`
- `src/app/pages/pasajero/viajes/viajes.integration.spec.ts`
- `src/app/pages/contribucion/sugerencia-contribucion/sugerencia-contribucion.spec.ts`

En esos cuatro archivos solo se responde con fixtures vacíos a las lecturas nuevas de un dashboard activo y se conserva http.verify y todas las expectativas anteriores. El helper comprueba la ruta activa y falla si encuentra una lectura pendiente fuera del dashboard; únicamente descarta lecturas ya canceladas. En una prueba de perfil se resuelven antes de volver a Compensaciones para distinguir el GET del dashboard del GET del listado. No cambia código de producción de esos módulos.

## Archivos nuevos

- `docs/integracion-dashboards-reales.md`
- `src/app/core/services/dashboard-viajes.service.ts`
- `src/app/core/services/dashboard-viajes.service.spec.ts`
- `src/app/pages/dashboard/dashboard.models.ts`
- `src/app/pages/dashboard/dashboard.models.spec.ts`
- `src/app/pages/dashboard/dashboard-query.ts`
- `src/app/pages/dashboard/dashboard.css`
- `src/app/pages/dashboard/dashboard-widgets.spec.ts`
- `src/app/pages/dashboard/dashboard-metricas/dashboard-metricas.ts`
- `src/app/pages/dashboard/dashboard-metricas/dashboard-metricas.html`
- `src/app/pages/dashboard/dashboard-frecuencia/dashboard-frecuencia.ts`
- `src/app/pages/dashboard/dashboard-frecuencia/dashboard-frecuencia.html`
- `src/app/pages/dashboard/dashboard-metodos/dashboard-metodos.ts`
- `src/app/pages/dashboard/dashboard-metodos/dashboard-metodos.html`
- `src/app/testing/dashboard-fixtures.ts` (solo pruebas)

## Pruebas automatizadas y resultados

Se usa TestBed y HttpTestingController con servicios reales Angular y respuestas HTTP simuladas. Las pruebas de dashboard incluyen el interceptor JWT existente y no crean usuarios, viajes ni registros en Spring/Supabase.

Cobertura del cambio: selección por fecha/hora local, segundos y medianoche, estados terminales/EN_PROGRESO, múltiples páginas de solicitudes/historial/rutas/viajes, lectura concurrente acotada, estado vacío, datos opcionales/inválidos, cancelación de consultas, reintentos, estados 400/401/403/404/500/red, aislamiento de recursos, nombres/IDs reales del fixture HTTP, navegación por contexto al flujo ya implementado, ausencia de POST/PUT locales, métricas cero, cancelaciones/penalidades distintas, siete días y escala dinámica, datos insuficientes, ranking vacío/ordenado y métodos activos/inactivos sin distribuciones ficticias.

Las pruebas de guard, cambio de rol, onboarding y rutas continúan en las suites de regresión existentes, ahora entrando a dashboards que sí hacen HTTP. Se conservan las regresiones de autenticación, perfil, rutas, solicitudes, coordinación, reportes/PDF, compensaciones, horarios y contribución.

### Ejecuciones y correcciones

1. Primera compilación de tests enfocada detectó un tipo demasiado genérico (`unknown`) para flush en el helper de pruebas; se tipó como object, sin any.
2. Pruebas enfocadas iniciales: **62/62 aprobadas**.
3. Primera suite completa con nuevos widgets: **367 aprobadas y 211 fallidas (578)**. El primer fallo de regresión dejó pendientes las nuevas lecturas del dashboard; el http.verify fallido ocasionó errores de TestBed en cascada. También había tres expectativas de widgets mal preparadas.
4. Se añadieron respuestas de prueba a las lecturas nuevas de las cuatro regresiones. No se eliminó http.verify ni se ocultaron errores de otros endpoints. Se corrigió el host de rol para usar signal y se pasaron arrays como objetos en it.each, evitando que Vitest los expandiera como argumentos independientes.
5. La comprobación enfocada intermedia dejó **194 aprobadas y 4 fallidas**; las tres preparaciones de widgets ya se habían corregido para la siguiente ejecución y el caso restante se resolvió atendiendo el GET del dashboard antes de navegar al listado de Compensaciones.
6. **Suite completa final: 578 aprobadas, 0 fallidas, 32 archivos aprobados**, código 0. No se omitieron pruebas ni aumentaron timeouts.

Comando obligatorio ejecutado:

```powershell
$env:VITEST_MAX_WORKERS = '2'
npm.cmd test -- --watch=false
```

La primera suite completa corregida pasó 578/578 a las 16:57:15 (Lima), en 51.06 s. Tras restringir el helper de regresión a dashboards activos, se repitió la suite completa: **578/578 aprobadas, 32 archivos, código 0; inicio 17:04:14 (Lima), duración 52.90 s, 6 de noviembre de 2026**. Los cinco archivos de pruebas de dashboard/composición/fechas/widgets cubren 84 casos; sustituyen 9 expectativas antiguas de los dashboards, dando 75 casos netos adicionales respecto del punto de partida.

Compilación final:

```powershell
npm.cmd run build
```

**Código 0**, producción en `dist/uniride-frontend`, 9.590 s; bundle inicial 451.56 kB, transferencia estimada 120.17 kB. Sin warnings de compilación. La compilación final incluye el ajuste de espaciado CSS; la última suite completa también valida esa versión. Después solo se actualizó esta documentación y el formato de finales de línea.

`git diff --check`: código 0, sin errores de whitespace. Los finales de línea se conservan compatibles con el checkout Windows. No se cambiaron dependencias ni package-lock.json; no fue necesario reinstalar node_modules para esta tarea.

### Verificación visual aislada

Se sirvió el build con un servidor temporal local de respuestas de prueba, sin reenviar a localhost:8080 y rechazando escrituras. Chrome headless verificó ambos roles a 1440 px y 390 px, además de vacío/conductor y error/pasajero. Se revisaron las capturas en un lote y se confirmó un único ajuste de espaciado en una segunda ronda.

Sin desbordamiento horizontal: scrollWidth=390 en móvil y menor que el viewport de 1440 en escritorio (barra vertical). Los gráficos tienen siete filas con datos suficientes y ninguna con vacío/error. El detector mecánico de impeccable devolvió `[]`.

Capturas locales de prueba en `tmp/dashboards-visual/` (ignorado por Git). Los fixtures no se importan desde producción. Esta revisión no constituye una prueba manual con Spring/PostgreSQL.

## Guía de prueba manual pendiente con Spring Boot

Realizar posteriormente con cuentas y registros de un entorno de prueba autorizado. No se ejecutaron estos recorridos sobre datos reales durante la implementación.

### Preparación

1. Iniciar Spring Boot en localhost:8080 con la configuración local existente; no modificar migraciones ni compartir secretos.
2. Ejecutar `npm.cmd start` en la raíz del frontend y abrir http://localhost:4200.
3. Iniciar sesión con cuenta verificada y perfil completo. Abrir DevTools/Network y mantener ocultos tokens/datos personales al capturar evidencias.

### Pasajero

1. Abrir `/pasajero/dashboard`. Comprobar GET de solicitudes ACEPTADAS, búsqueda paginada, estadísticas, frecuencia y métodos personales.
2. Si hay salidas aceptadas futuras, comprobar consulta de historial y que un VENCIDO/COMPLETADO/CANCELADO conocido no sea presentado como próximo. Comparar fecha/hora con la respuesta, incluidos segundos.
3. Verificar que la tarjeta diga Solicitud aceptada y no afirme Viaje confirmado. Confirmar ausencia de vehículo/placa/asiento/tarifa inventados.
4. Sin próximas solicitudes, comprobar el estado vacío y Buscar viajes. Para datos incompletos, comprobar texto de recuperación sin fechas inválidas.
5. En Viajes disponibles, comparar tarjetas y total con la respuesta. Paginar: comprobar page/size=3 y que se retiren tarjetas anteriores mientras carga. No interpretar capacidad total como asientos libres.
6. Abrir Ver detalle y solicitar desde una tarjeta. Confirmar que el ID coincide con viajeId y que el detalle conserva información de la selección. El POST solo debe producirse al completar y confirmar el diálogo existente, con preferencia obligatoria y método compatible opcional.
7. Abrir Ver mi viaje/Gestionar mis solicitudes. Revisar cancelación pendiente y cancelación del viaje aceptado en sus flujos existentes, con confirmación y mensajes reales; no debe haber PUT automático desde el dashboard.
8. Abrir el buscador completo: comprobar filtros reales allí, sin valores de filtro aparentes en el dashboard.

### Conductor

1. Abrir `/conductor/dashboard`. Comprobar GET de rutas propias y viajes por ruta, incluyendo páginas siguientes si existen. No debe haber GET inventado `/api/viajes/{id}`.
2. Comparar próximo viaje con los datos de salida. PROGRAMADO pasado/terminales no se muestran; EN_PROGRESO tiene prioridad para gestionarlo.
3. Comprobar capacidad total de ruta y contador pasajeros del viaje. No debe haber asientos atribuidos a personas ni vehículo inventado.
4. Gestionar viaje debe abrir `/conductor/viajes/{id}` con el ID real; Revisar solicitudes debe abrir `/conductor/viajes/{id}/solicitudes`.
5. Comparar el contador de pendientes con totalElements de la consulta estado=PENDIENTE/size=1. Revisar que aceptar/rechazar permanezca en el módulo de solicitudes existente.
6. Sin rutas/salidas próximas, comprobar Mis rutas y Publicar ruta; generar una salida únicamente desde los flujos existentes.
7. Revisar ranking real, orden por cantidad, penalidades y estado insuficiente/vacío. El pasajero no debe poder consultar ese endpoint ni su página restringida.

### Ambos roles, errores y responsive

1. Comparar viajes completados del rol con estadísticas; cancelaciones y penalidades deben permanecer separadas. Con cuenta sin actividad, esperar ceros reales.
2. Comparar frecuencia con viajesPorDia; revisar los siete días, escala dinámica y cancelaciones. Confirmar que no se describa como semana actual.
3. Con suficientesDatos=false, comprobar el mensaje del backend y ausencia de barras ficticias.
4. Revisar métodos registrados reales y activos/inactivos; abrir Compensaciones. No debe haber porcentajes/montos de cobros supuestos.
5. Simular Offline o bloquear un recurso en DevTools: debe fallar solo su sección, mostrar explicación y reintentar HTTP. Los recursos que respondieron correctamente deben mantenerse visibles.
6. Probar 401/403/500 en un entorno controlado. 401 debe cerrar sesión con la infraestructura existente; 403 no debe cambiar el rol ni fingir éxito. No capturar ni publicar tokens.
7. Salir de la vista durante una consulta y comprobar su cancelación y ausencia de cambios tardíos en la otra pantalla.
8. Cambiar de rol con el selector existente: revisar dashboard/layout correctos y permisos, sin nuevas copias de JWT.
9. Revisar teclado/foco, botones, nombres largos y paginador a 1440, tablet y 390 px. Comprobar que los demás módulos mantienen su navegación.

Evidencias recomendadas: capturas de cada dashboard con datos/vacío/error, Network de lecturas paginadas y Bearer oculto, navegación con ID real, diferencias solicitud/confirmación, gráfico suficiente/insuficiente, métodos reales sin distribución, salidas completas de tests/build/diff check y Git.

## Limitaciones y dependencias

- La confirmación/estado activo del viaje no está en SolicitudRespuesta. El historial solo permite excluir terminales conocidos; la UI no promete una confirmación que el contrato no devuelve. Para mejorar esto, el backend podría incluir esos campos en la respuesta propia de solicitudes; no se implementó tal cambio.
- No hay consulta agregada ordenada de próximas salidas del conductor. En cuentas grandes se requiere recorrer rutas y viajes; se limita concurrencia y se mantiene el timeout de las consultas. Un endpoint agregado propio ordenado reduciría coste, pero no se inventó ni modificó.
- La exclusión de terminales del pasajero requiere recorrer el historial propio cuando hay candidatas. Los datos se leen una vez por carga/reintento, sin cachear entre cuentas. Cambios concurrentes pueden requerir Actualizar viaje; no hay actualizaciones push ni garantía de instantánea transaccional entre endpoints.
- El dashboard muestra una instantánea obtenida por HTTP. Después de cambios en otra pestaña o del paso del tiempo, usar Actualizar viaje o recargar. Las acciones existentes vuelven a validar en Spring.
- El detalle del pasajero conserva su limitación contractual de recuperación directa sin GET individual. Navegar desde estas tarjetas proporciona contexto; una recarga posterior sigue las alternativas de recuperación del módulo existente.
- No hay contrato para vehículo, asignación de asientos, ETA, tráfico, ahorro, CO₂, calificaciones o distribución de pagos. Se omiten, sin cálculos ni ejemplos de reemplazo.
- Los datos y contadores de endpoints diferentes pueden cambiar entre consultas. No se promete sincronización en tiempo real ni se reescribe lógica de negocio.
- Quedan pendientes las pruebas manuales con Spring Boot/PostgreSQL y cuentas de prueba autorizadas. No se afirma haber probado persistencia real.

## Estado de entrega

Rama y HEAD iniciales se conservan. Todos los cambios permanecen sin staging. No se ejecutaron git add, commit, push, PR, merge ni cambio de rama. No se modificaron backend, Supabase ni registros reales. No se añadieron dependencias, IA ni funcionalidades de otras US.
