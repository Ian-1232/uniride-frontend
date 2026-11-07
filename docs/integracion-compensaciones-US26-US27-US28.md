# Integración de métodos de compensación: US26, US27 y US28

## Diagnóstico inicial

Rama: `feature/integracion-compensaciones-US26-US27-US28`. HEAD inicial: `4d86ac5`. El árbol de trabajo estaba limpio.

El listado utilizaba `METODOS_COMPENSACION_DEMO`; la edición buscaba registros con `findDemoMethod()`. Los parámetros `?estado=` mostraban resultados, errores, conflictos e incluso abrían un diálogo automáticamente. El formulario no enviaba HTTP; el diálogo devolvía una confirmación local que se representaba como éxito sin persistencia. La opción de desactivación apuntaba a un ID fijo. Varias pruebas verificaban estos estados ficticios.

Se revisaron los componentes, modelos, estilos, shell, panel compartido, servicios, autenticación, interceptor, guards, rutas, environments y proxy. Se conservaron la estructura visual, CSS responsive, Angular Material y política CONDUCTOR de `/compensaciones/**`.

Se contrastaron en modo de solo lectura, en [backend/development](https://github.com/pollitoconpapass/uniride-spring-backend/tree/development), `MetodoCompensacionController`, `MetodoCompensacionService`, los DTO request/response, `TipoCompensacion` y `GlobalExceptionHandler`. Coinciden con los contratos de la tarea. No se identificó un bloqueo que requiera modificar el backend.

## Contratos REST y modelos

Base: `/api/metodos-compensacion`. Todas las operaciones usan la identidad autenticada del backend; no reciben userId.

| Operación | Endpoint | Respuesta |
| --- | --- | --- |
| Listar | GET `/api/metodos-compensacion` | 200; array de métodos personales, incluidos inactivos |
| Registrar | POST `/api/metodos-compensacion` | 201; método persistido |
| Actualizar | PUT `/api/metodos-compensacion/{id}` | 200; método persistido |
| Eliminar | DELETE `/api/metodos-compensacion/{id}` | 200; objeto `{ mensaje: string }` |

No existe GET por ID. La edición consulta la colección y busca el identificador en los resultados del usuario actual. Un ID ausente no habilita el formulario de edición. IDs inválidos o fuera del rango seguro de JavaScript no generan consultas de edición.

Se conservan los modelos tipados existentes en `compensaciones.models.ts`:

```typescript
type TipoCompensacion = 'DINERO' | 'GASOLINA' | 'FAVOR';
interface MetodoCompensacionRequest {
  readonly tipo: TipoCompensacion;
  readonly descripcion: string;
  readonly activo?: boolean | null;
}
interface MetodoCompensacionResponse {
  readonly id: number;
  readonly tipo: TipoCompensacion;
  readonly descripcion: string;
  readonly activo: boolean;
}
interface EliminacionMetodoResponse { readonly mensaje: string; }
```

El registro del formulario envía tipo y descripción recortada, omitiendo activo: el servidor siempre crea métodos activos. PUT envía además activo, permitiendo desactivar y reactivar sin borrar. La descripción se valida como obligatoria y no vacía después de trim. El backend conserva la autoridad sobre duplicados por tipo y descripción sin distinguir mayúsculas/minúsculas y sobre la propiedad del recurso.

## Solución implementada

### Servicio y estado

`MetodosCompensacionService` concentra las cuatro operaciones usando HttpClient, `environment.apiUrl` y los DTO. No agrega Authorization manualmente, no almacena métodos en localStorage y no conserva cachés entre usuarios. Usa un timeout de 15 segundos, sin reintentos automáticos de operaciones de escritura.

Las pantallas representan estados reales mediante signals. Se eliminan los datos, resolutores de estados y búsquedas de demostración. Los parámetros URL no generan resultados ni mutaciones. `CompensacionStatePanel` presenta feedback accesible y el shell mantiene su región aria-live.

### US26: listado y registro

- El listado realiza GET al abrirse y al reintentar. Presenta carga, error, vacío o datos reales, contador y distinción Activo/Inactivo.
- No elimina elementos de forma optimista ni sustituye errores por datos de ejemplo.
- El formulario nuevo valida tipo y descripción; bloquea controles mientras envía un único POST.
- Después de la respuesta exitosa muestra confirmación real y un enlace para volver al listado. Al volver se realiza un nuevo GET para mostrar lo persistido.
- Un duplicado conserva los campos. Al corregirlos desaparece el aviso y se puede volver a enviar. Los demás errores tampoco borran la entrada.

### US27: edición

- GET a la colección y búsqueda del ID de la ruta. No se inventa un endpoint adicional ni se utiliza un ID fijo.
- Precarga tipo, descripción y activo. El estado de carga o un método no encontrado no permite guardar.
- PUT modifica los tres campos y confirma éxito solo tras la respuesta del servidor.
- El formulario conserva valores después de errores recuperables. Un 404 durante PUT muestra método no encontrado.
- Volver al listado consulta otra vez al backend: un método desactivado continúa visible y se puede reactivar mediante otra edición.
- Cambiar el ID dentro de la misma ruta cancela la carga o escritura anterior antes de cargar el siguiente método.

### US28: eliminación

- El botón abre el diálogo con tipo y descripción reales. Abrirlo, cancelarlo o cerrarlo no emite DELETE.
- Confirmar realiza DELETE. El diálogo permanece abierto y bloquea confirmaciones duplicadas y cierre por Escape/backdrop mientras se espera la respuesta.
- Un 200 cierra el diálogo, muestra confirmación y consulta nuevamente el listado. La lista final procede de ese GET.
- Un 404 mantiene feedback sin simular un borrado. Actualizar listado cierra el diálogo y realiza GET.
- Un 409 por solicitudes asociadas conserva el elemento y muestra la explicación del backend. Desactivar método lleva al ID seleccionado, sin ejecutar otra eliminación ni desactivar automáticamente. El usuario puede poner Activo en falso y guardar mediante PUT.
- Un conflicto 409 diferente se presenta como conflicto genérico, sin atribuirlo falsamente a solicitudes asociadas.
- Al salir del listado se cierra su diálogo y se cancelan sus suscripciones. Las respuestas tardías no representan éxitos en una pantalla abandonada.

### Errores HTTP

| Estado | Comportamiento |
| --- | --- |
| 400 | Mensaje de validación; se utilizan los mensajes de campos conocidos cuando están disponibles |
| 401 | El interceptor existente cierra sesión y navega al login |
| 403 | Permiso denegado; conserva sesión, sin redirección global |
| 404 | Método inexistente/no disponible para la cuenta; permite regresar o refrescar |
| 409 duplicado | Conserva formulario y permite corregirlo |
| 409 con solicitudes asociadas | Conserva listado y ofrece edición para desactivar |
| Otros 409 | Conflicto controlado, sin éxito local |
| Red, timeout o 5xx | Mensaje controlado; reintento manual, sin confirmar persistencia |

No se muestran mensajes arbitrarios de errores internos, SQL, tokens ni stack traces. Los mensajes de negocio reconocidos corresponden a los contratos verificados. Se cancelan suscripciones con `takeUntilDestroyed`; no se cambió AuthService, interceptor ni guards.

## Archivos modificados y creados

```text
src/app/core/services/metodos-compensacion.service.ts (nuevo)
src/app/pages/compensaciones/shared/compensacion-error.ts (nuevo)
src/app/pages/compensaciones/compensaciones.models.ts
src/app/pages/compensaciones/compensaciones.models.spec.ts
src/app/pages/compensaciones/metodos-listado/metodos-listado.ts
src/app/pages/compensaciones/metodos-listado/metodos-listado.html
src/app/pages/compensaciones/metodos-listado/metodos-listado.spec.ts
src/app/pages/compensaciones/metodo-formulario/metodo-formulario.ts
src/app/pages/compensaciones/metodo-formulario/metodo-formulario.html
src/app/pages/compensaciones/metodo-formulario/metodo-formulario.spec.ts
src/app/pages/compensaciones/eliminar-metodo-dialog/eliminar-metodo-dialog.ts
src/app/pages/compensaciones/eliminar-metodo-dialog/eliminar-metodo-dialog.html
src/app/pages/compensaciones/eliminar-metodo-dialog/eliminar-metodo-dialog.spec.ts
src/app/app.spec.ts
docs/integracion-compensaciones-US26-US27-US28.md (nuevo)
```

En `app.spec.ts` se responden ahora las consultas reales del listado con HttpTestingController para conservar las pruebas de navegación de todos los módulos. No se cambiaron sus funcionalidades ni se ampliaron timeouts.

## Pruebas automatizadas

Se utilizan TestBed, HttpTestingController, interceptor real, sesiones obtenidas con login HTTP simulado, RouterTestingHarness y el diálogo Material real con animaciones deshabilitadas en sus pruebas. Los fixtures viven exclusivamente en tests; ninguna petición de CRUD sale hacia Spring Boot o Supabase.

Cobertura: listado con activos/inactivos y vacío, errores y reintento; POST con payload exacto y 201; duplicado y recuperación; validación de tipo/descripción; edición cargada desde la colección e ID ausente o inválido; PUT de cambios, desactivación y reactivación; listado reconsultado con datos persistidos simulados; confirmación/cancelación del diálogo; DELETE 200/404/409, errores y reintento; ID dinámico para desactivar; peticiones duplicadas suprimidas; 400/401/403/500/red; JWT y rutas; parámetros de demostración ignorados; cancelación de cargas, guardados y eliminación al salir.

La suite completa conserva las pruebas de autenticación, US19, US20, US21 y US22.

### Resultados ejecutados

| Comando | Resultado |
| --- | --- |
| `npm.cmd ci` | Exit 0; 290 paquetes instalados, 291 auditados, cero vulnerabilidades; 42 s |
| `npm.cmd test -- --watch=false` con `VITEST_MAX_WORKERS=2` | Exit 0; **230 pruebas aprobadas en 20 archivos**; 16,26 s |
| `npm.cmd run build` | Exit 0; producción, 9,721 s; bundle inicial 444,85 kB; salida `dist/uniride-frontend` |
| `git diff --check` | Exit 0; sin errores de espacios |
| `git status` | Doce archivos modificados y tres nuevos; sin staging ni commits |

Rama final: `feature/integracion-compensaciones-US26-US27-US28`. HEAD final: `4d86ac567f4619158dc92fa29e945dded94a0360`, sin cambios respecto al inicio.

Una primera ejecución completa antes de añadir los últimos casos de ciclo de vida pasó con 226/226 pruebas (49,57 s). Tras añadirlos, el comando con paralelismo predeterminado registró 229/230 aprobadas (41,12 s): la primera carga del formulario excedió el timeout de cinco segundos. Se reprodujo el patrón de contención observado en integraciones anteriores y se realizó la validación adicional solicitada con dos workers. No se aumentaron timeouts ni se omitieron pruebas.

Reproducción en PowerShell para este equipo:

```powershell
$env:VITEST_MAX_WORKERS = '2'
npm.cmd test -- --watch=false
```

El ajuste se aplicó únicamente al proceso de validación; no se cambió la configuración del runner del repositorio. npm informa la deprecación existente de `@angular/animations` y cuatro scripts de instalación pendientes de aprobación. Git advierte conversiones LF→CRLF según la configuración local; no hay errores de whitespace. Package.json y package-lock.json permanecen sin cambios.

## Pruebas manuales posteriores, a cargo del usuario

Estas operaciones sí crean, actualizan o eliminan registros de la cuenta utilizada. No se ejecutaron durante esta implementación. Utiliza una cuenta y un entorno autorizados; no es necesario insertar datos directamente en Supabase.

1. Inicia el backend Spring Boot desde IntelliJ en `localhost:8080`, conservando su configuración local. No cambies migraciones.
2. Desde la raíz del frontend ejecuta `npm.cmd ci` y `npm.cmd start`.
3. Inicia sesión con una cuenta CONDUCTOR verificada. Abre `http://localhost:4200/compensaciones/metodos` y DevTools/Network.
4. Verifica GET `/api/metodos-compensacion`, Bearer agregado por el interceptor, contador y estado real de cada método. Una respuesta [] debe producir el estado vacío.
5. Abre Agregar método. Comprueba que tipo y descripción sean obligatorios, y que una descripción de espacios no permita enviar.
6. Registra un método con una descripción elegida para esta prueba. Comprueba POST, payload sin userId y HTTP 201. Debe crearse activo. Vuelve al listado y verifica un nuevo GET y el método recibido.
7. Edita ese método desde su enlace. Comprueba que se consulte la colección, sin GET por ID. Modifica su descripción y guarda. Verifica PUT al ID real, HTTP 200 y los nuevos valores tras volver al listado.
8. Edita y cambia Activo a falso. Guarda y vuelve al listado: el método debe seguir presente como Inactivo. Repite la edición para ponerlo en Activo y comprueba la reactivación por PUT.
9. Intenta registrar el mismo tipo y descripción, incluyendo una variación de mayúsculas/minúsculas. Comprueba 409, conservación de campos y posibilidad de corregir y reenviar.
10. Abre `/compensaciones/metodos/ID_INEXISTENTE/editar` usando un número positivo que no corresponda a un método de la cuenta. Debe mostrarse no encontrado después de GET, sin PUT. También deben rechazarse IDs inválidos.
11. Para un método sin solicitudes asociadas, abre Eliminar y pulsa Cancelar: no debe emitirse DELETE. Vuelve a abrir y confirma: comprueba DELETE al ID real, 200, cierre del diálogo, GET posterior y desaparición según la respuesta recibida.
12. Si existe un método con alguna solicitud asociada, intenta eliminarlo. Debe recibirse 409 y conservarse el elemento. La opción Desactivar método debe abrir el ID seleccionado; apagar Activo y guardar debe realizar PUT, nunca DELETE. No se necesita crear solicitudes durante la prueba para demostrar este caso: utiliza datos existentes apropiados.
13. Si un método deja de existir entre la consulta y la eliminación, comprueba 404 y Actualizar listado, sin mensaje de eliminación exitosa.
14. Detén temporalmente Spring Boot para comprobar error de carga y Reintentar. En formularios, un fallo debe conservar lo escrito; reinicia el servicio y vuelve a enviar. Revisa Network para confirmar una sola solicitud durante clics repetidos.
15. Agrega `?estado=exito`, `?estado=eliminado` o `?estado=confirmar-eliminacion` a las URLs: no deben mostrar éxito, precargar datos ni ejecutar operaciones por sí solos.
16. Revisa escritorio y móvil con DevTools: tarjetas, botones, campos, toggle, diálogo y mensajes deben conservar la presentación responsive.
17. Cierra sesión e intenta abrir una URL privada; debe dirigir al login. Con rol PASAJERO debe mantenerse la redirección de los guards actuales. Verifica también navegación de reportes y exportación PDF.

## Limitaciones y dependencias

- La prueba manual real queda a cargo del usuario. No se crearon, editaron ni eliminaron métodos reales durante el trabajo.
- Las pruebas HTTP simuladas no verifican datos concretos de Supabase ni la conectividad local del backend.
- Un timeout o la cancelación HTTP al abandonar la pantalla no garantizan revertir una transacción que el servidor ya hubiera recibido. Al volver se consulta el listado para resolver el estado real; no se muestran éxitos locales por ese motivo.
- La prohibición de DELETE por cualquier solicitud asociada, incluso histórica, pertenece al backend. El frontend no intenta deducirla a partir de solicitudes activas.
- Continúa `environment.apiUrl='/api'` y el proxy hacia `localhost:8080`. En producción se requiere el reverse proxy existente.
- No se implementaron US29, cambio de rol, perfil ni otros módulos. No se modificaron backend, Supabase, autenticación, reportes ni exportación PDF.

## Evidencias sugeridas para el futuro PR

- Network de GET, POST 201, PUT 200 y DELETE 200, ocultando el token.
- Listado después de registrar/editar; estado Inactivo y posterior reactivación.
- Cancelación del diálogo sin DELETE y bloqueo 409 con opción de desactivar al ID real.
- Duplicado conservando campos; ID inexistente; error de red y reintento.
- Capturas móvil/escritorio sin información personal y resultados de tests, build y Git.

No se crearon commits, ni se hizo push, PR o merge. No se cambió de rama.
