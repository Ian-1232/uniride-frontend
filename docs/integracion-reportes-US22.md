# Integración US22: exportación del historial en PDF

## Diagnóstico previo

Rama de trabajo: `feature/integracion-reportes-US22`; HEAD al comenzar: `bcaacb3`. El árbol de trabajo estaba limpio.

La pantalla de exportación ya tenía formulario Material, locale `es-PE`, validador de rango, estilos responsive y paneles compartidos. Sin embargo, `submitDemonstration()` no consultaba el backend. `?estado=` podía simular preparación, descarga y ausencia de resultados, precargando fechas ficticias. El botón quedaba bloqueado después del estado descargado. Las pruebas existentes cubrían únicamente el rango de fechas.

Se consultaron en modo de solo lectura [HistorialController](https://github.com/pollitoconpapass/uniride-spring-backend/blob/development/src/main/java/com/uniride/controllers/HistorialController.java), [EstadisticasService](https://github.com/pollitoconpapass/uniride-spring-backend/blob/development/src/main/java/com/uniride/services/EstadisticasService.java) y [GlobalExceptionHandler](https://github.com/pollitoconpapass/uniride-spring-backend/blob/development/src/main/java/com/uniride/exceptions/GlobalExceptionHandler.java) en `development`. El contrato coincide con la tarea y no requiere cambios del backend.

Una precisión del código consultado: el fallo de generación del PDF también puede lanzar BusinessException y terminar en 409. Por ello se distingue el mensaje documentado «No hay historial para exportar» de otros conflictos, que muestran un error controlado de generación.

## Endpoint y parámetros

`GET /api/historial/pdf`

| Parámetro | Tipo | Comportamiento |
| --- | --- | --- |
| `desde` | `YYYY-MM-DD` | Opcional; se omite si está vacío |
| `hasta` | `YYYY-MM-DD` | Opcional; se omite si está vacío |
| `tipo` | `todos`, `conductor`, `pasajero` | Se envía la selección; inicialmente `todos` |

Se utiliza HttpClient, HttpParams, `responseType: 'blob'` y `observe: 'response'` en `ReportesService.exportarHistorial()`. La URL nace de `environment.apiUrl`, que continúa siendo `/api`. El interceptor existente agrega Bearer; no se agrega Authorization manualmente, no se navega directamente al endpoint y no se envía un identificador de usuario.

Las fechas se construyen con año, mes y día locales mediante `localIsoDate()`. No se usa `toISOString()`, evitando trasladar el día al convertir a UTC. El validador de rango compara días y también rechaza objetos Date inválidos.

El backend genera el historial personal a partir de la identidad autenticada. Puede incluir participaciones como conductor y pasajero, estados y penalidades. Los límites de fechas se aplican al día del viaje; se excluyen viajes programados futuros según el servicio consultado.

## Descarga y estados reales

1. La pantalla inicia con fechas vacías y tipo `todos`. Ignora los parámetros URL de demostración.
2. Al enviar se valida el formulario. Un rango inválido no genera HTTP.
3. Durante la preparación se bloquean filtros y botón, evitando solicitudes duplicadas y cambios de filtros a mitad de la operación. Existe un timeout HTTP de 30 segundos.
4. HTTP 200 se procesa como Blob. Se comprueban tamaño no vacío, MIME `application/pdf` y firma inicial `%PDF-`. Esta es una validación básica de formato, no un análisis completo de la estructura interna del documento.
5. Se utiliza el nombre seguro de Content-Disposition, incluyendo `filename*` UTF-8 cuando corresponde. Se rechazan rutas, caracteres de control, extensiones distintas de PDF y nombres excesivamente largos. El fallback es `historial-viajes.pdf`.
6. Se crea un Object URL y un enlace temporal con `download`, se inicia la descarga y se retira el enlace. El Object URL se revoca después de un segundo para permitir que el navegador consuma el recurso.
7. El panel confirma que se inició la descarga, sin afirmar que el usuario haya guardado el archivo en disco. El formulario vuelve a habilitarse y permite exportaciones adicionales.
8. `takeUntilDestroyed` cancela la suscripción y la petición al abandonar la pantalla. La lectura asíncrona de un Blob no dispara descargas después de destruir el componente.

Se conserva el formulario, locale, datepickers, estructura y CSS de escritorio y móvil. Los resultados usan `ReportesStatePanel` y la región `aria-live` existente del shell de reportes.

| Resultado | Tratamiento |
| --- | --- |
| 200 con PDF válido | Inicia la descarga y permite exportar otra vez |
| 200 vacío o contenido inválido | Error controlado; no se crea una descarga |
| 400 | Mensaje para revisar fechas y tipo; se pueden corregir y reenviar |
| 409 con mensaje de ausencia de historial | Panel de negocio sin resultados, sin descargar; permite reintentar |
| Otros 409 o cuerpo ilegible | Error de generación controlado, sin confundirlo con historial vacío |
| 401 | El interceptor compartido limpia sesión y dirige al login |
| 403 | Acceso no permitido; no se cierra sesión por este estado |
| Red, timeout, 5xx u otros errores | Mensaje controlado y reintento HTTP real |

Los errores Blob se leen de forma asíncrona y acotada a 8192 bytes para interpretar JSON. Los cuerpos vacíos, ilegibles o malformados no rompen el flujo. Solo se reconoce el mensaje de negocio esperado; nunca se muestran stack traces, SQL ni texto arbitrario del servidor.

## Archivos modificados

```text
src/app/core/services/reportes.service.ts
src/app/pages/reportes/exportar-historial/exportar-historial.ts
src/app/pages/reportes/exportar-historial/exportar-historial.html
src/app/pages/reportes/exportar-historial/exportar-historial.models.ts
src/app/pages/reportes/exportar-historial/historial-pdf.ts (nuevo)
src/app/pages/reportes/exportar-historial/exportar-historial.integration.spec.ts (nuevo)
docs/integracion-reportes-US22.md (nuevo)
```

No se modificaron AuthService, guards, interceptor, rutas, HttpClient global, environments, proxy ni pantallas US19–US21. La política `/reportes/**` continúa requiriendo CONDUCTOR. No se agregan dependencias.

## Pruebas automatizadas y validación

Las pruebas usan TestBed, HttpTestingController y el interceptor real, con login simulado exclusivamente dentro del test. Se reemplazan `URL.createObjectURL`, `URL.revokeObjectURL` y el clic del anchor para no descargar archivos reales.

Se comprueban endpoint, Bearer, HttpParams exactos, filtros parciales, serialización local, rango inválido sin HTTP, descarga y nombre seguro/fallback, limpieza del anchor y Object URL, desbloqueo y nueva exportación, supresión de clics simultáneos, 409 JSON Blob, conflictos distintos, 400/401/403/500/red, reintento, errores Blob malformados, respuestas 200 vacías/no PDF, cancelación al salir, parámetros de demostración ignorados y no enviar credenciales a destinos externos. La suite completa incluye las pruebas previas de autenticación y US19–US21.

No se ejecutan peticiones que creen, modifiquen o borren datos reales en Supabase.

### Resultados ejecutados

| Comando | Resultado |
| --- | --- |
| `npm.cmd ci` | Exit 0; 290 paquetes instalados, 291 auditados, cero vulnerabilidades; 51 s |
| `npm.cmd test -- --watch=false` con `VITEST_MAX_WORKERS=2` | Exit 0; **199 pruebas aprobadas en 20 archivos**, incluidas 33 nuevas de US22; 16,19 s |
| `npm.cmd run build` | Exit 0; producción, 16,586 s; bundle inicial 444,86 kB; salida `dist/uniride-frontend` |
| `git diff --check` | Exit 0; sin errores de espacios |
| `git status` | Cuatro archivos modificados y tres nuevos, sin staging ni commits; rama `feature/integracion-reportes-US22` |

HEAD de entrega: `bcaacb3375fe803ce2b5ece1037fd8c6225a3744` (sin cambios respecto al inicio).

La primera compilación de tests detectó un tipo incorrecto en el mock de `URL.createObjectURL`; se corrigió antes de ejecutar las pruebas. Dos ejecuciones completas con el paralelismo por defecto terminaron con timeouts de cinco segundos en pruebas existentes de navegación: primero 198/199 aprobadas y luego 197/199. Las 33 pruebas nuevas pasaron en ambas ejecuciones. La suite afectada de compensaciones se ejecutó aislada con cinco de cinco aprobadas (5,37 s de ejecución total). Al limitar los workers a dos, toda la suite pasó sin aumentar timeouts ni modificar las pruebas existentes.

Para reproducir la validación completa en PowerShell en este equipo:

```powershell
$env:VITEST_MAX_WORKERS = '2'
npm.cmd test -- --watch=false
```

Este ajuste se utilizó solo en el proceso de validación, sin modificar configuración del repositorio. npm informó la deprecación existente de `@angular/animations` y cuatro scripts de instalación pendientes de aprobación; no impidieron instalar, ejecutar tests ni compilar. Git puede advertir conversión LF→CRLF según la configuración local, sin errores de whitespace. Package.json y package-lock.json no tienen cambios.

## Prueba manual

1. En IntelliJ abre el backend en `development`, conserva su configuración local existente y ejecuta Spring Boot en `http://localhost:8080`. No cambies migraciones ni copies secretos al frontend.
2. Desde la raíz del frontend ejecuta `npm.cmd ci` y `npm.cmd start`.
3. Abre `http://localhost:4200`, inicia sesión con una cuenta verificada que pueda acceder a reportes y abre `http://localhost:4200/reportes/exportar`.
4. En DevTools/Network, pulsa Exportar PDF sin fechas. Comprueba GET `/api/historial/pdf?tipo=todos` y Authorization agregado por el interceptor, sin registrar ni compartir el token.
5. Con una cuenta que tenga historial, comprueba HTTP 200, Content-Type `application/pdf`, Content-Disposition y la descarga. Abre el documento con un lector PDF: debe contener tu historial personal, columnas de fecha, día, hora, ruta, rol, estado y penalidad.
6. Selecciona un rango y tipo conductor o pasajero. Comprueba los parámetros `desde` y `hasta` en formato ISO local, que el PDF respete los filtros y que sea posible volver a exportar después del éxito.
7. Usa un filtro sin coincidencias. Debe recibirse HTTP 409 y mostrarse «No hay historial para exportar», sin descargar archivo. Una cuenta nueva sin historial también puede producir este resultado esperado.
8. Selecciona Desde posterior a Hasta. Debe mostrarse el error de rango, deshabilitarse el botón y no emitirse petición HTTP. Corrige el rango y vuelve a enviar.
9. Detén temporalmente Spring Boot y envía el formulario. Debe mostrarse un error de conexión. Reinicia el backend y pulsa Reintentar: debe emitirse otra petición real. Comprueba además que clics repetidos mientras carga no duplican solicitudes.
10. Agrega `?estado=descargado` o `?estado=sin-resultados` a la URL y recarga. La pantalla debe mantener fechas vacías, estado inicial y ninguna descarga automática.
11. Comprueba móvil y escritorio usando el selector de dispositivo de DevTools. Verifica que los campos, botón y paneles conserven el diseño responsive.
12. Cierra sesión e intenta abrir la ruta: debe dirigir al login. Con rol PASAJERO debe conservarse el rechazo por el guard actual. Verifica que resumen, frecuencia, rutas y las demás pantallas sigan navegando correctamente.

## Limitaciones, dependencias y evidencias para el futuro PR

- La prueba real de HTTP 200 necesita una cuenta con historial existente. No se prepararon datos ni se insertaron viajes para esta integración.
- Las pruebas simuladas no acreditan conectividad real con el backend ni el contenido de una cuenta de Supabase. El recorrido manual queda para ejecutarse con las cuentas y el servidor disponibles.
- El navegador permite iniciar una descarga, pero no confirmar desde Angular que el usuario la haya guardado. Por eso el feedback indica «Descarga iniciada».
- La comunicación actual es Angular → `/api` → proxy local → Spring Boot. En producción se necesita el reverse proxy existente para `/api`; no se cambia a una URL absoluta ni se añade CORS.
- Evidencias sugeridas: captura de Network de HTTP 200 y cabeceras sin token visible; PDF abierto con datos personales ocultos; captura del 409 sin historial; rango inválido sin HTTP; error y reintento; vistas móvil/escritorio; salida de tests y build.
- No se implementaron otras historias, cambio de rol ni persistencia del perfil. No se hicieron commits, push, PR o merge, ni cambios en backend o base de datos.
