# Integración de reportes US19, US20 y US21

## Auditoría y referencia

Rama de trabajo: `feature/integracion-reportes-US19-US20-US21`, base `develop`.
Se inició con el árbol de trabajo limpio.

Las tres pantallas estaban implementadas visualmente, pero consumían `ACTIVITY_SUMMARY`, `WEEKLY_TRIPS` y `FREQUENT_ROUTES`. Las cancelaciones semanales, escala y etiqueta accesible del gráfico contenían números fijos. El parámetro `estado` decidía si mostrar datos, errores o restricciones y los reintentos solo limpiaban ese parámetro. No había comunicación HTTP de estadísticas ni pruebas de sus respuestas.

Se revisaron en modo de solo lectura `EstadisticasController`, `EstadisticasService`, los cinco DTO y `ViajeRepository` de [backend/development](https://github.com/pollitoconpapass/uniride-spring-backend/tree/development), referencia `aec54ffafc582bf8d1fb732494696a7f79421921`.

El backend obtiene la identidad mediante `usuarioActual()`; las consultas están filtradas por esa identidad. El análisis por día de la semana combina viajes completados como conductor y pasajero. No contiene un filtro de fechas para la semana actual. El ranking requiere rol CONDUCTOR y cinco viajes completados como conductor; sus penalidades se consultan por separado.

No se detectó incompatibilidad de los contratos que bloquee la integración. No se modificaron backend, base de datos, autenticación, guards, interceptor, configuración HTTP, environments ni proxy.

## Contratos utilizados

Todas las solicitudes son GET y requieren `Authorization: Bearer <JWT>`, agregado por el interceptor existente. No se envían parámetros de identidad, cuerpos, claves de Supabase ni consultas a PostgreSQL.

| Endpoint | DTO | Campos |
| --- | --- | --- |
| `/api/estadisticas` | `EstadisticasRespuesta` | `viajesComoConductor`, `viajesComoPasajero`, `viajesCancelados`, `penalidadesAcumuladas`: number |
| `/api/estadisticas/semana` | `AnalisisSemanalRespuesta` | `suficientesDatos`: boolean; `mensaje`: string o null; `viajesPorDia`: DiaCantidadRespuesta[]; `canceladosPorMi`, `canceladosPorTerceros`: number |
| `/api/estadisticas/rutas` | `RankingRutasRespuesta` | `suficientesDatos`: boolean; `mensaje`: string o null; `ranking`: RutaFrecuenteRespuesta[] |

`DiaCantidadRespuesta` contiene `dia: string` y `cantidad: number`. `RutaFrecuenteRespuesta` contiene `origen`, `destino`: string; `cantidad`, `penalidades`: number. Las interfaces usan propiedades readonly y viven en `reportes.models.ts`, junto con los modelos de presentación existentes.

## Arquitectura y decisiones

- `ReportesService`, compartido y sin caché, concentra las tres llamadas mediante HttpClient y `environment.apiUrl`. No copia ni almacena el JWT y no conserva datos de otro usuario entre sesiones.
- Cada pantalla crea una consulta mediante `reportQuery`. El helper ofrece una señal con estados `cargando`, `disponible` y `error`, y una acción de reintento. `exhaustMap` descarta reintentos mientras existe una petición activa; `toSignal` se suscribe una sola vez y cancela la petición al destruir la pantalla. El timeout de 15 segundos evita una carga indefinida.
- La insuficiencia es un resultado válido, separado del error HTTP. Se muestra el mensaje del backend cuando `suficientesDatos=false`. No se reconstruyen datos de demostración.
- US19 calcula completados como conductor + pasajero. Cancelaciones y penalidades se muestran en tarjetas independientes. Un usuario sin viajes ve ceros auténticos.
- US20 usa todos los conteos recibidos. Solo normaliza las tildes de Miércoles y Sábado en la presentación. La escala tiene cinco intervalos y su máximo se redondea hacia arriba al múltiplo de cinco más próximo, con mínimo cinco para evitar división por cero. Las barras usan porcentajes respecto a ese máximo. Total, escala y etiqueta accesible se calculan dinámicamente.
- El gráfico se describe como distribución del historial por día de la semana y no como últimos siete días. El endpoint garantiza los siete días. Las cancelaciones reales se muestran también cuando faltan viajes para generar el gráfico.
- US21 ordena una copia del ranking por `cantidad` descendente y calcula posiciones desde uno. No modifica los conteos ni ordena por penalidades. Un ranking vacío tiene un panel vacío, incluso si `suficientesDatos=true`. Se conservan la tabla de escritorio y las tarjetas móviles.
- Las pantallas reutilizan `ReportesStatePanel`. Los errores de conexión, 401, 403, servidor y genéricos tienen mensajes controlados; no se presentan detalles internos del servidor. El botón Reintentar realiza un nuevo GET y oculta cualquier resultado anterior durante la carga.
- El 401 mantiene el comportamiento del interceptor: cerrar sesión y dirigir al login. El 403 muestra acceso denegado sin cerrar sesión ni iniciar ciclos de navegación.
- Se mantiene la política de rutas existente: el área `/reportes/**` requiere CONDUCTOR. Aunque resumen y frecuencia permiten ambos roles en el backend, no se amplió aquí el acceso del área del frontend. El ranking permanece protegido en ambos lados.
- `resolveViewState` se conserva porque lo utiliza la pantalla existente de exportación. US22 no se conecta ni se modifica; sus estados visuales quedan fuera de este alcance. Los parámetros de demostración ya no afectan US19–US21.
- No se añadieron dependencias ni se modificaron package.json o package-lock.json.

## Pruebas automatizadas

`reportes.integration.spec.ts` usa TestBed, HttpTestingController, el interceptor real y sesiones iniciadas mediante una respuesta de login simulada. Las cifras de prueba existen exclusivamente en fixtures de tests.

Cobertura:

- US19: carga, endpoint, Bearer, total completado, ceros y separación de cancelaciones/penalidades.
- US20: siete días, cantidades distintas, tildes, escala y alturas porcentuales, total y accesibilidad dinámicos, semántica histórica, cancelaciones e insuficiencia con mensaje del servidor, barras en cero.
- US21: varias rutas, orden, posiciones, penalidades y ambos layouts; insuficiencia y ranking vacío.
- Las tres pantallas: conexión fallida, 403 y 500, ausencia de datos durante error, botón de reintento funcional y recuperación exitosa; cancelación HTTP al destruir el componente.
- General: supresión de solicitudes duplicadas durante la carga; 401 con logout, 403 sin logout, endpoints GET sin identificadores arbitrarios, no enviar Bearer a un origen externo, acceso directo sin sesión o con rol PASAJERO y parámetros de demostración ignorados.
- Las pruebas existentes de navegación de la aplicación responden ahora explícitamente a las consultas de reportes mediante fixtures HTTP; se conservan sus aserciones de viajes, layouts y otros módulos.

Las pruebas no se conectan a Supabase ni crean, modifican o borran datos reales.

### Resultados ejecutados

| Comando | Resultado |
| --- | --- |
| `npm.cmd ci` | Exit 0; 290 paquetes instalados, 291 auditados, cero vulnerabilidades; 44 s |
| `npm.cmd test -- --watch=false` | Exit 0; 166 pruebas aprobadas en 19 archivos, incluidas 27 pruebas nuevas de reportes; 41,79 s |
| `npm.cmd run build` | Exit 0; producción, 43,497 s; bundle inicial 444,78 kB; salida `dist/uniride-frontend` |
| `git diff --check` | Exit 0; sin errores de espacios |

La primera compilación de tests detectó un tipo demasiado restrictivo en el helper de creación de componentes. Se corrigió usando `Type<T>` de Angular antes de la ejecución aprobada. npm informó la deprecación existente de `@angular/animations` y cuatro scripts de instalación pendientes de aprobación; no impidieron instalar, ejecutar tests ni compilar. Git informa conversión LF→CRLF según su configuración local; no hay errores de whitespace. Package.json y package-lock.json permanecen sin cambios.

### Archivos de esta integración

```text
src/app/core/services/reportes.service.ts (nuevo)
src/app/pages/reportes/reportes.models.ts
src/app/pages/reportes/shared/report-query.ts (nuevo)
src/app/pages/reportes/resumen-actividad/resumen-actividad.ts
src/app/pages/reportes/resumen-actividad/resumen-actividad.html
src/app/pages/reportes/frecuencia-semanal/frecuencia-semanal.ts
src/app/pages/reportes/frecuencia-semanal/frecuencia-semanal.html
src/app/pages/reportes/frecuencia-semanal/frecuencia-semanal.css
src/app/pages/reportes/rutas-frecuentes/rutas-frecuentes.ts
src/app/pages/reportes/rutas-frecuentes/rutas-frecuentes.html
src/app/pages/reportes/reportes.integration.spec.ts (nuevo)
src/app/app.spec.ts
docs/integracion-reportes-US19-US20-US21.md (nuevo)
```

## Validación manual con IntelliJ y Angular

1. Abre el backend en IntelliJ, rama `development`, y ejecuta su aplicación Spring Boot con la configuración local existente. Confirma el puerto 8080. No modifiques migraciones ni copies secretos al frontend.
2. En la raíz del frontend ejecuta `npm.cmd ci` y `npm.cmd start`. Abre `http://localhost:4200`. La comunicación es Angular → `/api` → proxy de desarrollo → `http://localhost:8080`.
3. Inicia sesión con una cuenta CONDUCTOR verificada. En DevTools/Network comprueba los GET y el encabezado Authorization. No compartas ni registres el valor del JWT.
4. Abre `/reportes/resumen`. Compara cada tarjeta con la respuesta de `/api/estadisticas`. El total debe sumar únicamente conductor y pasajero. Si la cuenta no tiene viajes, todos los ceros recibidos deben permanecer en pantalla.
5. Abre `/reportes/frecuencia`. Con menos de cinco viajes completados debe aparecer el mensaje exacto del backend sin gráfico, conservando las cancelaciones recibidas. Con suficientes datos, comprueba siete barras y que cada valor coincida con `viajesPorDia`. El total debe coincidir con su suma; no representa exclusivamente la semana actual.
6. Abre `/reportes/rutas`. Con menos de cinco viajes completados como conductor debe mostrarse la insuficiencia recibida. Con suficientes datos, compara origen, destino, cantidad y penalidades de cada ruta. Verifica orden descendente y posiciones consecutivas. Reduce el viewport a menos de 768 px para comprobar las tarjetas móviles; vuelve a escritorio para la tabla.
7. Detén temporalmente el backend y vuelve a entrar a cada pantalla. Debe mostrarse un error sin cifras antiguas. Reinícialo y pulsa Reintentar; debe realizarse un nuevo GET y mostrarse el resultado real.
8. Usa DevTools para bloquear temporalmente las peticiones y observar la carga, sin introducir estados ficticios mediante URL. Agregar `?estado=incidencias`, `?estado=cancelaciones` o `?estado=penalidades` no debe inventar datos.
9. Cierra sesión e intenta las URLs privadas: deben dirigir al login. Con una cuenta PASAJERO intenta `/reportes/rutas`: el guard debe volver al dashboard del pasajero sin consultar el ranking. Un rechazo 403 del backend debe mostrar falta de permisos; un 401 debe seguir el logout del interceptor.
10. Comprueba que viajes, dashboards y compensaciones conservan su navegación. La pantalla Exportar historial sigue en su estado previo y no realiza integración US22.

Para revisar estados suficientes e insuficientes utiliza cuentas con historial ya existente. Esta integración no incluye crear viajes, insertar registros SQL ni preparar datos en Supabase. Si faltan cuentas con cinco completados, esa parte de la prueba manual quedará pendiente; los casos están cubiertos mediante HTTP simulado.

## Límites

La compilación y los mocks no verifican conectividad local real ni exactitud de los registros existentes de Supabase. El recorrido manual anterior queda para ejecutarse con el backend y cuentas disponibles. En producción debe existir un reverse proxy para `/api`; el proxy de Angular solo opera durante desarrollo.

No se implementaron US22, US26–US29, persistencia de perfil, gustos o hobbies. No se crearon commits, ni se hizo push, PR o merge. La rama no se cambió.
