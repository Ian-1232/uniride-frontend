# Integración US29: sugerencia de contribución estimada

## Diagnóstico

Rama de trabajo: `feature/integracion-contribucion-US29`. HEAD inicial: `8b413d1b08a9c466d0fe9a050438fb79376f0f59`. El árbol de trabajo estaba limpio al comenzar.

Se leyó SPEC.md y se buscó AGENTS.md en el repositorio y sus directorios ascendentes: no se encontró ese archivo. Las restricciones de SPEC.md sobre una primera etapa exclusivamente visual son históricas; la solicitud actual autoriza expresamente integrar US29 con HTTP. Se conservaron sus reglas de Angular standalone, Material, formularios, tokens visuales y responsive.

La pantalla aceptaba exclusivamente el viaje 35 y elegía entre fixtures de uno o dos pasajeros. `?estado=` simulaba carga, permisos, errores y resultados. Los reintentos cambiaban la URL sin consultar ningún servicio. El estado de cantidad faltante mostraba origen y fecha inventados. El shell también enlazaba al viaje 35 y mostraba un usuario ficticio.

Se revisaron rutas, environment, proxy, interceptor y guards. El área `/contribucion/**` continúa protegida por `pasajeroGuard`, con la sesión e interceptor existentes.

Se consultaron en modo de solo lectura [ViajeController](https://github.com/pollitoconpapass/uniride-spring-backend/blob/development/src/main/java/com/uniride/controllers/ViajeController.java), [ContribucionService](https://github.com/pollitoconpapass/uniride-spring-backend/blob/development/src/main/java/com/uniride/services/ContribucionService.java), [SugerenciaContribucionRespuesta](https://github.com/pollitoconpapass/uniride-spring-backend/blob/development/src/main/java/com/uniride/dto/responses/SugerenciaContribucionRespuesta.java) y [GlobalExceptionHandler](https://github.com/pollitoconpapass/uniride-spring-backend/blob/development/src/main/java/com/uniride/exceptions/GlobalExceptionHandler.java) de `development`. No se identificó un bloqueo contractual para esta integración.

## Contrato vigente

`GET /api/viajes/{id}/sugerencia-contribucion`

- Requiere JWT y rol PASAJERO.
- `{id}` es el identificador real del viaje. No se agrega userId.
- `pasajeros` es opcional en la primera consulta. Cuando el viaje ya tiene pasajeros registrados, el servidor utiliza su cantidad y puede ignorar la enviada. Si no los tiene, exige un entero positivo.
- El parámetro de Spring es `Integer`: los valores que excedan su rango pueden devolver 400. El frontend no limita la cantidad a uno o dos ni impone un máximo ficticio de asientos.

Respuesta 200, representada por `SugerenciaContribucionRespuesta`:

| Campos | Tipo TypeScript |
| --- | --- |
| viajeId, pasajeros | number |
| origen, destino, dia | string |
| fecha | string LocalDate `YYYY-MM-DD` |
| hora | string LocalTime, por ejemplo `HH:mm:ss` |
| esHoraPico | boolean |
| costoTotalEstimado, aporteEstimado, litrosGasolinaAprox | number |
| sugerenciaFavor, nota | string |

Se mantienen los nombres del DTO. No se reproducen en Angular las fórmulas, tarifas, recargos ni equivalencias de gasolina del backend. Solo se formatean los valores recibidos.

## Implementación

### Servicio y consultas

`ContribucionService.sugerencia(viajeId, pasajeros?)` utiliza HttpClient, HttpParams y `environment.apiUrl`, que sigue siendo `/api`. El proxy de desarrollo continúa apuntando a `localhost:8080`. El servicio tiene timeout de 15 segundos y no agrega Bearer manualmente ni guarda resultados en almacenamiento del navegador.

Al abrir `/contribucion/sugerencia/:viajeId` se valida un ID entero positivo y seguro para JavaScript. La primera consulta no envía pasajeros. Se cancelan peticiones anteriores cuando cambia el ID o se abandona la pantalla; clics repetidos durante una petición no generan otra solicitud. Los cambios de query params de demostración no eligen estados ni importes.

### Cantidad de pasajeros

Un HTTP 200 inicial permite inferir que el servidor ya conoce la cantidad; se muestra como solo lectura. Solo el 400 con el mensaje de negocio verificado abre el formulario:

> El viaje aún no tiene pasajeros aceptados; indica la cantidad de pasajeros para calcular la sugerencia

Ese estado no muestra una ficha de viaje inventada: el error no incluye los datos necesarios para construirla. El formulario valida cantidad obligatoria, entera y mayor o igual a uno. Al enviar, realiza un nuevo GET con `pasajeros=N`.

Un 400 diferente se trata como validación, sin confundirlo automáticamente con pasajeros faltantes. Si ya se estaba usando el formulario, conserva la entrada y permite corregirla. Un fallo transitorio permite reintentar la consulta con los mismos parámetros.

Todos los resultados usan la cantidad devuelta por el servidor, incluso si difiere de la enviada. El DTO no contiene un indicador explícito de origen de esa cantidad; por eso los resultados son de solo lectura y no se afirma que el número manual prevalezca sobre el viaje. El aviso «Cantidad confirmada por el viaje» se usa en la respuesta obtenida sin parámetro.

### Presentación y errores

- Se conservan clases, tarjetas y estilos responsive. Dinero, gasolina y favor siguen siendo alternativas referenciales, no pagos simultáneos u obligaciones automáticas.
- Origen, destino, día, fecha, hora, cantidad, hora pico, importes, favor y nota proceden de la respuesta. No hay importes de respaldo.
- Los importes y litros se presentan con dos decimales mediante DecimalPipe, conservando el formato existente. LocalDate se separa en componentes de calendario y LocalTime se presenta como HH:mm; no se construye un instante UTC ni se utiliza toISOString.
- Se rechazan resultados con viajeId incoherente, cantidades inválidas o estimaciones numéricas no válidas, sin mostrar un cálculo alternativo inventado.
- Se reutiliza `ContribucionStatePanel`, sus roles alert/status y sus indicadores de carga. La pantalla expone aria-busy durante la consulta.

| Resultado | Comportamiento |
| --- | --- |
| 200 | Muestra la sugerencia recibida |
| 400 específico de pasajeros faltantes | Muestra formulario sin importes |
| Otros 400 | Validación controlada; permite corregir la entrada manual cuando corresponde |
| 401 | El interceptor existente limpia la sesión y dirige al login |
| 403 | Acceso restringido, sin invalidar la sesión por este estado |
| 404 | Viaje no encontrado, sin resultados |
| 409 | Viaje no disponible para estimación, sin resultados |
| Red, timeout, 5xx u otros errores | Mensaje controlado y reintento HTTP real |

No se muestran stack traces, SQL o mensajes arbitrarios del servidor. El reintento no cambia `?estado=`: ejecuta otro GET.

### Shell y navegación de regreso

El shell muestra el usuario de AuthService y reutiliza su logout, sin modificar autenticación. Marca como no disponibles los accesos de reportes/compensaciones que los guards actuales reservan al conductor; no se cambiaron esas políticas.

Se eliminan los enlaces al viaje 35. La marca conduce al dashboard y la navegación de viajes conduce a `/pasajero/viajes/mis-viajes`.

La ruta `/pasajero/viajes/:id` sí existe, pero su implementación actual utiliza fixtures y acciones locales. Enviar allí un ID real podría mostrar un viaje ficticio coincidente o no encontrarlo. Por eso el regreso de US29 dice «Volver a Mis viajes» y no promete abrir el detalle real. Este trabajo no integra ni modifica ese módulo.

## Archivos modificados y creados

```text
src/app/core/services/contribucion.service.ts (nuevo)
src/app/pages/contribucion/contribucion.models.ts
src/app/pages/contribucion/contribucion.models.spec.ts
src/app/pages/contribucion/sugerencia-contribucion/sugerencia-contribucion.ts
src/app/pages/contribucion/sugerencia-contribucion/sugerencia-contribucion.html
src/app/pages/contribucion/sugerencia-contribucion/sugerencia-contribucion.spec.ts
src/app/pages/contribucion/contribucion-shell/contribucion-shell.ts
src/app/pages/contribucion/contribucion-shell/contribucion-shell.html
src/app/app.spec.ts
docs/integracion-contribucion-US29.md (nuevo)
```

`app.spec.ts` se adapta para responder mediante HttpTestingController a la nueva consulta real durante sus pruebas de navegación. No cambia las funcionalidades de los demás módulos. CSS, dependencias, lockfile, rutas, guards, interceptor, AuthService, reportes y compensaciones permanecen sin cambios.

## Pruebas automatizadas

TestBed, HttpTestingController, RouterTestingHarness y el interceptor real verifican la integración sin llamadas al backend local o Supabase. Los fixtures viven solo en tests y usan cantidades e importes distintos para detectar cualquier cálculo local o respaldo ficticio.

Se cubren: GET y filtros exactos; Bearer; carga inicial y cantidad existente de solo lectura; falta de pasajeros y formulario; números positivos mayores que dos; nulos, negativos, cero y fraccionarios; cantidad devuelta distinta de la solicitada; 400, 401, 403, 404, 409, 500 y red; reintento con y sin parámetro; clics duplicados; cancelación por cambio de ID y salida de pantalla; IDs inválidos; estados URL ignorados; respuesta incoherente; fecha local, hora, dinero, gasolina, favor y nota; usuario real del shell; regreso seguro y restricciones de rol.

La suite completa se ejecuta con `VITEST_MAX_WORKERS=2`, incluyendo autenticación, reportes, PDF y compensaciones.

### Resultados ejecutados

| Comando | Resultado |
| --- | --- |
| `$env:VITEST_MAX_WORKERS = '2'; npm.cmd test -- --watch=false` | Exit 0; **273 pruebas aprobadas en 20 archivos**; 20,47 s |
| `npm.cmd run build` | Exit 0; producción, 8,684 s; bundle inicial 444,83 kB; salida `dist/uniride-frontend` |
| `git diff --check` | Exit 0; sin errores de espacios |
| `git status` | Ocho archivos modificados y dos nuevos; sin staging ni commits |

Rama final: `feature/integracion-contribucion-US29`. HEAD final: `8b413d1b08a9c466d0fe9a050438fb79376f0f59`, sin cambios respecto al inicio.

En la primera ejecución hubo 271/273 aprobadas: dos expectativas de texto de los tests contenían signos de interrogación en lugar de tildes por la codificación del script de escritura. Se corrigieron las expectativas y el fixture de navegación, y se volvió a ejecutar toda la suite. No se aumentaron timeouts ni se omitieron pruebas. Los fixtures y mocks no generan peticiones al backend local ni a Supabase.

No se modificaron dependencias ni package-lock.json. Se utilizaron las dependencias ya instaladas; esta tarea no requería ejecutar nuevamente npm ci. Git puede advertir conversión LF→CRLF según la configuración local, sin errores de whitespace.

## Guía manual

No se crearon ni modificaron registros reales durante este trabajo. Utiliza viajes existentes y una cuenta autorizada para la comprobación posterior.

1. En IntelliJ inicia Spring Boot de `development` en `http://localhost:8080`, conservando su configuración local de correo y base de datos.
2. En el frontend ejecuta `npm.cmd start` y abre `http://localhost:4200`.
3. Inicia sesión con una cuenta PASAJERO verificada. Usa el ID de un viaje real existente; no presupongas que los IDs de las pantallas de viajes de demostración correspondan al backend.
4. Abre `/contribucion/sugerencia/ID_REAL` y DevTools/Network. Comprueba GET `/api/viajes/ID_REAL/sugerencia-contribucion` sin query de pasajeros y con Bearer del interceptor. No compartas ni registres su valor.
5. Si el viaje tiene pasajeros registrados, verifica HTTP 200 y la cantidad de solo lectura. Compara cada dato visible con la respuesta JSON: origen, destino, día, fecha, hora, hora pico, costo total, aporte, litros, favor y nota.
6. Para un viaje existente sin pasajeros registrados, verifica el 400 de negocio y la aparición del formulario, sin ficha ni importes ficticios. Introduce un entero positivo mayor que dos y envía. Comprueba el parámetro `pasajeros=N` y la respuesta 200.
7. Prueba vacío, cero, negativo y decimal: no debe enviarse otra consulta válida desde el formulario. Si Spring rechaza un entero fuera de su rango, debe verse el error de validación y poder corregirse.
8. Si el servidor responde con otra cantidad, comprueba que la pantalla utilice la recibida, junto con sus importes, sin calcularlos desde la entrada manual.
9. Usa un ID inexistente para comprobar 404. Si dispones de un viaje no PROGRAMADO, comprueba 409. No cambies el estado de viajes para preparar esta prueba.
10. Detén temporalmente el backend y vuelve a consultar: debe mostrarse error sin importes. Reinícialo y pulsa Reintentar; verifica una nueva solicitud real, conservando pasajeros cuando se estaba consultando manualmente.
11. Con throttling de DevTools cambia de ID o navega fuera antes de completarse la consulta. La petición obsoleta debe cancelarse y no mostrar resultados en la nueva pantalla. Clics repetidos no deben duplicar peticiones.
12. Agrega `?estado=disponible`, `?estado=insuficiente` o `?estado=error`: no deben elegir los resultados ni sustituir HTTP.
13. Comprueba fechas cercanas a medianoche y cambio de mes. Debe mostrarse el mismo día de la respuesta ISO, sin restarle un día por la zona horaria. Importes y gasolina se presentan con dos decimales.
14. Comprueba escritorio y móvil con DevTools: tarjetas de importe y alternativas, formulario, mensajes, navegación y sidebar/menú existentes. Captura la vista con resultados y la de cantidad faltante.
15. Pulsa Volver a Mis viajes. Debe abrir el listado del pasajero y no el detalle ficticio de un ID real. Ese listado continúa pendiente de su propia integración.
16. Cierra sesión y abre la URL privada: debe dirigir al login. Con una cuenta CONDUCTOR debe mantenerse la redirección a su dashboard. Confirma que reportes, exportación PDF y compensaciones conservan su navegación con los roles permitidos.

## Evidencias sugeridas

- Network del GET inicial sin pasajeros y del GET manual con parámetro, ocultando Authorization.
- JSON y pantalla correspondientes con datos personales ocultos: cantidad, importes, gasolina, favor y nota.
- 400 específico y formulario; 404 y 409 sin importes; error de conexión y reintento.
- Petición obsoleta cancelada al cambiar de viaje; ausencia de duplicados.
- Capturas móvil/escritorio y comprobación de fechas locales.
- Salida de suite completa, build, diff-check, rama y HEAD.

## Limitaciones

- Las pruebas simuladas no acreditan conectividad ni el contenido de viajes reales. La comprobación manual y visual queda pendiente de ejecutarse con las cuentas y servidor disponibles.
- La búsqueda, el listado y el detalle de viajes siguen usando datos de demostración en su propio módulo. La integración completa de ese recorrido pertenece a otras US; US29 puede comprobarse por URL con un ID real conocido.
- El DTO no identifica explícitamente si la cantidad proviene del viaje o del parámetro. La API siempre es la autoridad; no se intenta superar su cantidad con datos locales.
- La detección de pasajeros faltantes depende del mensaje de negocio vigente porque el contrato de errores no incluye un código estable específico. Si cambia ese mensaje, debe actualizarse la constante y su prueba.
- Se conserva `/api` y el proxy de desarrollo. En producción se necesita el reverse proxy existente para `/api`.
- No se modificaron backend, Supabase ni registros reales. No se implementaron otras US, cambios de rol o perfil. No se hicieron commits, push, PR, merge ni cambio de rama.
