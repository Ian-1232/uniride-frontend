# Integración de perfil, roles y onboarding — US03, US04 y US05

## Diagnóstico y alcance

Rama inicial y final: `feature/perfil-roles-onboarding-US03-US04-US05`. HEAD de partida: `2653f0a11347d25c0ca655fc7022ed05feb75c77`. El árbol de trabajo estaba limpio. Se leyó SPEC.md y se buscó AGENTS.md en el repositorio y sus ancestros, sin encontrarlo. Las restricciones históricas de la primera etapa visual quedan superadas por la petición explícita de integración HTTP.

Se revisaron rutas, guards, inicializador, interceptor, AuthService/modelos, layouts, login/registro/OTP, perfil, información adicional, estilos globales y servicios/pruebas de rutas del conductor, viajes del pasajero, reportes, PDF, compensaciones y US29. Se reutilizan sus pantallas y lógica; no se implementan US23, US24, US30, US31 ni IA.

Problemas encontrados:

- Perfil e información adicional tenían datos personales/académicos de demostración. No consultaban ni guardaban en Spring Boot.
- El perfil no enviaba nombre, apellidos ni días seleccionados. El favorito incluía YAPE_PLIN/EFECTIVO, ajenos al enum real.
- Guardar/continuar y saltar eran enlaces que no garantizaban persistencia ni validación de campos obligatorios.
- Los controles de aire acondicionado y charla no tienen propiedades independientes en el backend.
- No existían cambio de rol por HTTP, Configuración accesible ni comprobación de perfil al entrar a funcionalidades privadas.
- Reportes y compensaciones estaban bloqueados para pasajeros y usaban el layout del conductor.
- La suite existente tenía una referencia preexistente a `flushReports()` en app.spec.ts, aunque el helper había sido renombrado `flushPendientes()`. Impedía compilar la suite completa; se corrigió la invocación, conservando sus assertions.

## Referencias verificadas

Backend consultado solo en lectura en [development](https://github.com/pollitoconpapass/uniride-spring-backend/tree/development/src/main/java/com/uniride): PerfilController/PerfilService, PerfilRequest, InfoAdicionalRequest, PerfilRespuesta y PerfilMapper; UsuarioController/UsuarioService, CambiarRolRequest y UsuarioRespuesta; JwtService, JwtAuthFilter y UsuarioDetailsService; GlobalExceptionHandler; EstadisticasController, HistorialController y MetodoCompensacionController.

El JWT identifica al usuario por correo; JwtAuthFilter carga sus autoridades actuales con UsuarioDetailsService. Por ello el rol persistido entra en vigor con el mismo token: no se genera ni altera un JWT en Angular.

Se consultaron metadata, contexto y capturas de [US04 en Figma](https://www.figma.com/design/Y12BnmOuhShBxVckf6J8gg/UniRide-Design?node-id=102-513) y [US05](https://www.figma.com/design/Y12BnmOuhShBxVckf6J8gg/UniRide-Design?node-id=102-1045), usando la skill figma-design-to-code. Se conserva la implementación Angular existente y sus tarjetas, iconos Material, chips, columnas y tokens globales. Las referencias visuales contienen datos de ejemplo, tipos de pago incompatibles y preferencias sin contrato; no se copian como datos personales ni se inventa persistencia para conservarlos. No se reconstruyen las pantallas con el código React generado por Figma ni se introducen assets temporales.

## Contratos HTTP

La URL base continúa siendo `environment.apiUrl = '/api'`, con el proxy de desarrollo a `http://localhost:8080`. Se reutiliza el interceptor JWT existente, sin headers Bearer manuales, copias adicionales del token o usuarioId arbitrario.

| Endpoint | Petición | Respuesta |
| --- | --- | --- |
| PUT `/api/usuarios/rol` | `{rol: 'CONDUCTOR' \| 'PASAJERO'}` | HTTP 200, UsuarioRespuesta actualizado |
| GET `/api/perfil` | Sin parámetros | HTTP 200, PerfilRespuesta; 404 específico si falta perfil |
| PUT `/api/perfil` | PerfilRequest | HTTP 200, PerfilRespuesta guardado |
| PUT `/api/perfil/info-adicional` | InfoAdicionalRequest | HTTP 200, PerfilRespuesta actualizado |
| GET `/api/usuarios/me` | Infraestructura de restauración existente | UsuarioRespuesta real |

PerfilRequest tiene exactamente los siguientes campos:

```ts
interface PerfilRequest {
  nombre: string;
  apellidos: string;
  carrera: string;
  distrito: string;
  universidad: string;
  diasDisponibles: string;
  horariosDisponibles: string;
  fechaInicioClases: string;
  fechaFinClases: string;
  metodoCompensacionFavorito: 'DINERO' | 'GASOLINA' | 'FAVOR' | null;
}
```

Los textos obligatorios rechazan cadenas vacías y espacios. Las fechas son LocalDate en formato `yyyy-MM-dd`; se valida que existan en el calendario y que fin no sea anterior a inicio. Se mantienen como cadenas locales del input date, sin toISOString ni conversiones UTC.

Los días se guardan como texto, según el contrato. Los chips escriben directamente en diasDisponibles y permiten los siete días, incluidos domingos. Un campo editable conserva disponibilidades personalizadas existentes; no se descarta texto desconocido al usar chips. Carrera, distrito y universidad admiten texto libre con las sugerencias anteriores mediante Material Autocomplete: el backend no los restringe a un catálogo cerrado.

Para CONDUCTOR, metodoCompensacionFavorito es obligatorio. Para PASAJERO, null es válido, y si se elige un valor debe pertenecer al enum real. Un tipo no representa una descripción de pago, cuenta bancaria ni método personal de compensación.

PerfilRespuesta añade id, gustos/hobbies/datosCuriosos nullable y fechaActualizacion. InfoAdicionalRequest envía únicamente gustos, hobbies y datosCuriosos como texto. Aunque el DTO del backend admite omisiones, PerfilService exige que el resultado conserve los tres campos no vacíos. La pantalla requiere completarlos al guardar, sin obligar a guardar esta etapa para entrar al dashboard.

## Solución y flujo

### Perfil y datos adicionales

PerfilService centraliza GET/PUT, estado y caché en memoria por sesión. Comparte un GET en curso entre guards/pantallas, lo cancela al no quedar suscriptores y permite forzar una nueva consulta con Reintentar. La caché no se persiste en localStorage/sessionStorage. Un contador de sesión, sin datos sensibles, impide reutilizar perfiles o aplicar respuestas tardías de otra sesión.

Los formularios empiezan vacíos. Cuando falta el perfil, nombre/apellidos pueden tomarse de la respuesta autenticada real del login. No se rellenan carrera, distrito, fechas ni preferencias con ejemplos.

Las escrituras se bloquean mientras otra está en curso y las suscripciones se limpian al destruir la pantalla. En caso de error se conservan los valores y se habilita su edición. Los errores por campo se aplican solo a controles conocidos y muestran mensajes controlados. Se confirma el guardado tras una respuesta válida; no se considera una respuesta de escritura incoherente como éxito. El nombre/apellidos e iniciales de la sesión se actualizan únicamente después del PUT personal exitoso. Esto no permite cambiar el rol localmente.

En US05 se conservan los chips como sugerencias editables, sin datos personales precargados. Se retiran los checkboxes sin contrato y se invita a describir esas pautas en datosCuriosos. No se envían aireAcondicionado ni charlaAmistosa ni se crea almacenamiento alternativo. Se retiran también avatares y contadores de comunidad ficticios de esa pantalla.

### Onboarding

1. Registro y OTP conservan el contrato existente: no crean una sesión. La verificación dirige al login.
2. El login real obtiene el JWT y navega al dashboard del rol.
3. perfilGuard restaura/valida primero la sesión y después consulta el perfil. Se aplica a dashboards, funcionalidades por rol y compartidas, tanto al entrar como al navegar a sus hijas.
4. Solo el 404 con el mensaje contractual `Aún no has completado tu perfil` se interpreta como perfil pendiente. Una ruta API inexistente u otro 404 se presenta como error recuperable.
5. Si el perfil falta o está incompleto para el rol actual, se dirige a `/configuracion/perfil`. Es imposible avanzar a funciones protegidas saltando campos o escribiendo otra URL.
6. El editor de perfil exige autenticación pero excluye perfilGuard, evitando ciclos. Los errores de lectura no habilitan un formulario vacío que pueda sobrescribir datos existentes.
7. Después del primer PUT correcto se ofrece `/configuracion/info-adicional`. Se puede guardar esa información o continuar al dashboard y editarla después.
8. Un perfil completo no repite el onboarding. La recarga del navegador vuelve a obtener sesión y perfil desde los endpoints reales.

Configuración puede abrirse con autenticación para llegar al editor incluso si falta perfil. Sus enlaces no permiten entrar a operaciones privadas sin completar el paso obligatorio. Las URL antiguas de auth se mantienen como redirecciones, sin páginas duplicadas por rol.

### Cambio de rol

Ambos layouts incorporan RoleSelector en escritorio y móvil. Muestra el rol activo, deshabilita la opción actual y utiliza un único bloqueo reactivo en AuthService para impedir PUT simultáneos incluso desde dos instancias del selector. Durante un guardado de perfil también se deshabilita el cambio.

Se envía PUT /usuarios/rol. Mientras espera se conserva el rol anterior; un error mantiene ese estado y muestra feedback. Una respuesta válida debe corresponder a la misma cuenta y al rol solicitado. Las respuestas tardías de otra sesión no se aceptan.

Tras HTTP 200 se actualiza el usuario reactivo sin cambiar token, storage ni expiración y se navega al dashboard correspondiente. Los guards, nombres, menús y layouts reconocen el nuevo estado. Un pasajero con favorito null que cambie a conductor debe completar ese campo obligatorio antes de usar el panel; perfilGuard lo conduce al editor y no deshace el cambio de rol persistido.

### Funcionalidades compartidas

SharedLayout compone el layout existente del rol activo, sin duplicar pantallas ni lógica HTTP. La misma ruta utiliza el sidebar y menú móvil del pasajero o conductor según la sesión.

| Funcionalidad | Acceso frontend |
| --- | --- |
| US19 resumen, US20 frecuencia, US22 PDF | authGuard + perfilGuard, ambos roles |
| US21 ranking | Conserva conductorGuard adicional y pestaña visible solo al conductor |
| US26-US28 métodos | authGuard + perfilGuard, ambos roles |
| US29 sugerencia | Continúa exclusiva de pasajero, con comprobación de perfil |
| Rutas/viajes del conductor y viajes del pasajero | Conservan sus guards de rol y lógica, con comprobación de perfil |

No se modifican ReportesService, exportación PDF, servicios/componentes CRUD de compensaciones, contribución, rutas o viajes. Las adaptaciones de sus specs solo preparan el perfil real simulado que ahora necesita la navegación. La prueba antigua que prohibía compensaciones al pasajero se actualiza a la nueva política solicitada, conservando el caso anónimo.

## Rutas

- Nuevas: `/configuracion`, `/configuracion/perfil`, `/configuracion/info-adicional`.
- `/auth/perfil` redirige a `/configuracion/perfil`.
- `/auth/info-adicional` redirige a `/configuracion/info-adicional`.
- `/reportes` y `/compensaciones` usan SharedLayout y autenticación compartida.
- `/reportes/rutas` conserva conductorGuard.
- `/pasajero`, `/conductor` y `/contribucion` añaden perfilGuard sin reemplazar sus guards de rol.
- Horarios continúa deshabilitado. No existen rutas nuevas de cursos, importación o IA.

## Errores y seguridad

| Caso | Resultado |
| --- | --- |
| GET perfil 404 contractual | Perfil pendiente, formulario obligatorio; sesión conservada |
| Otros 404 | Error de consulta, formulario protegido y Reintentar |
| 400 | Validaciones locales y por campos, conservación de valores |
| 401 | Interceptor existente cierra sesión y lleva al login |
| 403 | Error de permisos; conserva sesión, rol y datos previos |
| 409 | Conflicto controlado, sin éxito ni cambio local ficticio |
| Red, timeout, 5xx | Mensaje controlado y reintento explícito |

No se muestran stack traces ni mensajes internos arbitrarios. Los campos se renderizan con interpolación Angular. Los guards son una protección de navegación; Spring Boot sigue siendo la autoridad de autorización. No se reintentan automáticamente escrituras. No se consultan perfiles de otros usuarios, no se envía usuarioId y no se almacenan copias del JWT. No se usan credenciales de Supabase ni consultas directas a PostgreSQL.

## Pruebas y resultados

Las pruebas usan TestBed, RouterTestingHarness, HttpTestingController y respuestas simuladas exclusivamente dentro de tests. Se ejecutan con el interceptor y guards reales. No se inicia sesión contra el backend local ni se crea/edita un registro real.

La suite nueva cubre perfil cargado/faltante, obligatorios y espacios, fechas inválidas/locales, favoritos por rol, payload completo y días, actualización del nombre tras éxito, errores y preservación de formularios; gustos/hobbies/datosCuriosos resultantes; cambio en ambos sentidos con el mismo JWT, bloqueo de duplicados, sesión obsoleta/otra cuenta y errores; login/restauración con onboarding, URL directa sin saltos, compatibilidad de alias; ambos layouts y roles en reportes/compensaciones, ranking restringido y cambio de rol desde páginas compartidas. Se conservan las regresiones de US01-US02, US06-US13, US19-US22 y US26-US29.

Ejecuciones intermedias, sin ocultar fallos:

- La primera suite completa no compiló por el helper preexistente `flushReports()`; se corrigió a `flushPendientes()`.
- La primera ejecución enfocada tuvo 12 aprobadas y 47 fallidas: faltaba conectar la ruta de Configuración y el guard individual de ranking en el árbol real. Se corrigieron las rutas. La segunda enfocada terminó con 59 aprobadas, 0 fallidas.
- Después, la suite completa terminó con 386 aprobadas en 23 archivos. Se añadieron tres casos de login real simulado y cambios de rol desde ranking/compensaciones; la suite enfocada de integración terminó con 55 aprobadas.
- No se omitieron pruebas ni se aumentaron timeouts para conseguir estos resultados.

Comandos finales:

```powershell
$env:VITEST_MAX_WORKERS = '2'
npm.cmd test -- --watch=false
npm.cmd run build
git diff --check
git status --short --untracked-files=all
git branch --show-current
git rev-parse HEAD
```

Última suite completa, 6 de noviembre de 2026, inicio 14:00:17 (Lima): **23 archivos aprobados; 389 pruebas aprobadas, 0 fallidas; código 0; 35.91 s**. El módulo nuevo tiene 55 pruebas de integración y 7 pruebas de componentes adaptadas.

Build: código 0, producción generada en dist/uniride-frontend, 11.633 s; bundle inicial 450.84 kB (119.90 kB de transferencia estimada), sin warnings de compilación.

Git diff --check: código 0, sin errores de whitespace. Los avisos intermedios de normalización LF/CRLF se resuelven conservando CRLF en los archivos de trabajo. Git status: 24 modificados y 14 nuevos; ninguno en stage. Rama y HEAD conservados.

No se reinstalaron dependencias ni se cambió package.json/package-lock.json. No se declara npm ci como ejecutado.

## Guía manual (pendiente de ejecución por el usuario)

Utilizar cuentas controladas y un entorno de pruebas sin registros de producción. La implementación no ejecutó estas operaciones contra usuarios reales. Si solo se dispone de una base productiva, los casos de escritura deben esperar a un entorno autorizado de pruebas; las pruebas automatizadas son independientes de Supabase.

1. Levantar Spring Boot desde IntelliJ en localhost:8080 con su configuración local existente. No modificar migraciones ni compartir secretos.
2. Ejecutar `npm.cmd start` en frontend. Abrir localhost:4200 y DevTools/Network.
3. Con una cuenta controlada sin perfil: completar registro, OTP y login. Comprobar que registro/OTP no crean sesión y que después de login se consulta GET /perfil.
4. Ante el 404 contractual, comprobar la redirección a Configuración > Mi perfil, conservando la sesión. Intentar dashboards, rutas, viajes y reportes por URL directa: deben regresar al editor hasta completar el perfil.
5. Verificar que carrera, distrito, fechas y días no tienen datos inventados. Nombre y apellidos pueden provenir del login real.
6. Probar campos vacíos/espacios, fechas ausentes o fin anterior a inicio; no debe enviarse PUT. Probar los chips de días y el texto libre de disponibilidad.
7. Como conductor, comprobar que el favorito es obligatorio y ofrece solo DINERO/GASOLINA/FAVOR. Como pasajero, probar null y un favorito válido.
8. Guardar perfil y comprobar PUT /api/perfil con los once campos, días reales y fechas yyyy-MM-dd sin desfase. Verificar HTTP 200, nombre/iniciales actualizados y navegación a información adicional en el primer guardado.
9. En información adicional, comprobar el GET/caché de perfil, gustos reales, chips y textos editables. Vaciar cada campo: no debe enviarse PUT. No deben existir propiedades independientes de aire acondicionado/charla.
10. Guardar gustos, hobbies y datosCuriosos. Comprobar PUT /perfil/info-adicional con solo esas tres propiedades, respuesta y confirmación. Probar Continuar al dashboard sin guardar este paso: el perfil personal completo debe permitirlo.
11. Volver a Configuración desde ambos roles; editar perfil y datos adicionales. Recargar después de guardar y comprobar que Spring devuelve los datos persistidos y que no se exige onboarding a un perfil completo.
12. Usar el selector de rol en escritorio y móvil. Comprobar PUT /usuarios/rol con un único campo rol, sin token nuevo ni logout. Verificar dashboard, menú, sidebar y rol activo. Repetir en ambos sentidos y hacer clics rápidos: no debe haber dos PUT simultáneos.
13. Si se cambia de pasajero con favorito null a conductor, completar el favorito cuando lo pida el editor. No es un fallo del cambio de rol: es la validación obligatoria del perfil para conductor.
14. Desde cada rol abrir /reportes/resumen, /reportes/frecuencia y /reportes/exportar, verificando su layout. El pasajero no debe ver la pestaña Rutas frecuentes y la URL /reportes/rutas debe impedir su acceso; el conductor debe conservarlo.
15. Abrir /compensaciones/metodos desde ambos roles. Comprobar navegación a nuevo/editar y las operaciones CRUD existentes exclusivamente con datos autorizados de prueba. Repetir después de cambiar de rol desde esa pantalla.
16. Revisar rutas/viajes del conductor, viajes/solicitudes del pasajero y US29 con el rol correspondiente. Confirmar que sus endpoints y comportamiento no cambiaron. Horarios sigue deshabilitado.
17. Usar DevTools Offline durante GET o PUT: comprobar carga, error, reintento y conservación del formulario. Probar 400/403/500 en un entorno controlado; un error no debe mostrar éxito ni cambiar el rol local. El 401 debe llevar al login.
18. Probar 404 de perfil faltante y 404 de recurso no encontrado por separado; solo el primero debe interpretarse como onboarding. Revisar que no haya redirecciones infinitas ni consultas duplicadas.
19. Comprobar vista de escritorio, 390 px y 320 px: columnas, chips, acciones, selector y menú móvil, teclado/foco, mensajes y ausencia de desbordamiento. No se afirma que esta comprobación visual manual se haya ejecutado durante la implementación.

## Evidencias académicas sugeridas

- Capturas de Figma US04/US05 y formularios Angular en escritorio/móvil.
- Network de GET perfil 404, PUT personal y PUT adicional, con datos de prueba y sin cabeceras/token visibles.
- Formulario rechazando fechas/rango y favoritos distintos por rol; payload con días seleccionados.
- Perfil guardado y nombre actualizado; nueva consulta tras recarga.
- PUT de cambio de rol, dashboard y menú antes/después sin logout.
- Reportes y compensaciones con sidebar de cada rol; ranking bloqueado para pasajero.
- Error de conexión con valores conservados y Reintentar.
- Salidas de suite completa, build, diff check y estado de Git. Ocultar datos personales al compartirlas.

## Límites

- No se realizaron pruebas manuales ni escrituras contra backend/Supabase reales; la conectividad y presentación visual real quedan pendientes de la guía anterior.
- La caché es de la sesión actual. Cambios realizados en otra pestaña/dispositivo se reflejan al recargar; no se implementa sincronización entre dispositivos.
- Los catálogos locales son sugerencias, no validaciones oficiales del backend. La disponibilidad de días/horarios continúa siendo texto, sin gestión de cursos US23-US24.
- Las preferencias de cabina no tienen campos propios. Se describen como texto en datosCuriosos; no se simula persistencia independiente.
- Las correcciones de Figma se limitan a adaptar controles incompatibles al contrato y mantener la UI existente. No se rediseñan otras pantallas ni se introduce un sistema visual paralelo.

## Inventario y Git

Modificados (24):

- `src/app/app.routes.ts`
- `src/app/app.spec.ts`
- `src/app/core/services/auth.service.ts`
- `src/app/layouts/conductor-layout/conductor-layout.html`
- `src/app/layouts/conductor-layout/conductor-layout.ts`
- `src/app/layouts/pasajero-layout/pasajero-layout.html`
- `src/app/layouts/pasajero-layout/pasajero-layout.ts`
- `src/app/pages/auth/auth.routes.ts`
- `src/app/pages/auth/info-adicional/info-adicional.css`
- `src/app/pages/auth/info-adicional/info-adicional.html`
- `src/app/pages/auth/info-adicional/info-adicional.spec.ts`
- `src/app/pages/auth/info-adicional/info-adicional.ts`
- `src/app/pages/auth/perfil/perfil.css`
- `src/app/pages/auth/perfil/perfil.html`
- `src/app/pages/auth/perfil/perfil.spec.ts`
- `src/app/pages/auth/perfil/perfil.ts`
- `src/app/pages/compensaciones/metodos-listado/metodos-listado.spec.ts`
- `src/app/pages/conductor/rutas/rutas.integration.spec.ts`
- `src/app/pages/contribucion/sugerencia-contribucion/sugerencia-contribucion.spec.ts`
- `src/app/pages/pasajero/viajes/viajes.integration.spec.ts`
- `src/app/pages/reportes/exportar-historial/exportar-historial.integration.spec.ts`
- `src/app/pages/reportes/reportes-shell/reportes-shell.html`
- `src/app/pages/reportes/reportes-shell/reportes-shell.ts`
- `src/app/pages/reportes/reportes.integration.spec.ts`

Nuevos (14):

- `docs/integracion-perfil-roles-US03-US04-US05.md`
- `src/app/core/guards/perfil.guard.ts`
- `src/app/core/models/perfil.models.ts`
- `src/app/core/services/perfil-error.ts`
- `src/app/core/services/perfil.service.ts`
- `src/app/layouts/shared-layout/shared-layout.ts`
- `src/app/pages/configuracion/configuracion.css`
- `src/app/pages/configuracion/configuracion.html`
- `src/app/pages/configuracion/configuracion.ts`
- `src/app/pages/configuracion/perfil-roles.integration.spec.ts`
- `src/app/shared/role-selector/role-selector.css`
- `src/app/shared/role-selector/role-selector.html`
- `src/app/shared/role-selector/role-selector.ts`
- `src/app/testing/perfil-fixtures.ts`

Todos los cambios quedan sin staging para revisión. Se mantiene la rama y HEAD de partida. No se crean commits, push, PR o merges y no se cambia de rama. El backend fue exclusivamente de consulta; no se modificaron Supabase, registros reales, migraciones ni secretos.
