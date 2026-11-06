# Integración de reprogramación de viajes — US07

## Diagnóstico inicial

Rama preparada: `feature/reprogramacion-viajes-US07`. HEAD inicial: `48e1615da4ab60d92d1a3dd387e0561c1a263ee0`. Git estaba limpio.

Se leyó SPEC.md, se buscaron AGENTS.md en el repositorio y sus ancestros sin encontrarlos, y se revisaron rutas/guards, configuración HTTP, interceptor, environment/proxy, RutasService, CoordinacionService, modelos y pruebas. Se inspeccionaron GenerarViaje, ViajesRuta, MisViajes, GestionarViaje y el diálogo de impacto existente de edición de rutas.

No existían pantalla, ruta Angular ni método HTTP para reprogramar un viaje. La edición de rutas ya tenía confirmación de impacto, pero cambia otros campos y no sustituye PUT /viajes/{id}. La recuperación propia de CoordinacionService.viaje(id) ya resolvía la ausencia de GET individual y se reutiliza intacta.

Backend consultado exclusivamente en [master](https://github.com/pollitoconpapass/uniride-spring-backend/tree/master/src/main/java/com/uniride): ViajeController, ViajeService, ViajeRequest, ViajeRespuesta y GlobalExceptionHandler. El código actual confirma las reglas solicitadas. No se modificaron Spring Boot, migraciones ni registros reales.

## Contrato utilizado

### PUT /api/viajes/{id}?confirmarImpacto=false

Rol CONDUCTOR. El ID corresponde al **viaje**, no a la ruta ni a la solicitud. Identidad obtenida por JWT existente. No se envían usuarioId ni headers Bearer manuales.

```json
{
  "fecha": "YYYY-MM-DD",
  "hora": "HH:mm"
}
```

Se reutiliza SalidaViaje, que representa ViajeRequest: únicamente fecha y hora. LocalTime admite también segundos/fracciones; se conservan cuando existen. El servicio extrae expresamente esos dos campos aunque un objeto de entrada tenga propiedades adicionales.

HTTP 200 devuelve ViajeRespuesta con id, rutaId, fecha, hora, dia, confirmado, fechaConfirmacion, estado, pasajeros y mensaje. Se valida status 200, ID y coherencia del horario/estado/confirmación antes de anunciar éxito. Un 201/204, otro ID o datos incoherentes no se convierten en éxito.

confirmarImpacto es false por defecto. true se envía únicamente después de cerrar afirmativamente el diálogo de impacto y comprobar de nuevo los datos.

### Lecturas existentes

- GET `/api/rutas?page=N&size=100` y GET `/api/rutas/{rutaId}/viajes?page=N&size=100`: CoordinacionService.viaje(id) recupera el viaje dentro de rutas propias mediante los servicios y paginación existentes. Permite abrir/recargar directamente `/conductor/viajes/{id}/editar`.
- GET `/api/viajes/{viajeId}/solicitudes?estado=ACEPTADA&page=0&size=1`: se utiliza totalElements para conocer los pasajeros afectados; no se descargan todas las solicitudes ni sus perfiles.

No se creó GET `/api/viajes/{id}`, ningún endpoint adicional ni DELETE de viajes. Se conserva environment.apiUrl='/api', proxy a localhost:8080, HttpClient e interceptor JWT.

## Reglas del backend respetadas

1. Solo se reprograma un viaje propio en PROGRAMADO. Estados EN_PROGRESO, COMPLETADO, CANCELADO y VENCIDO bloquean el formulario y no muestran acción de edición en listados.
2. Una ruta eliminada tampoco admite reprogramación; se respeta el rechazo del servidor.
3. Fecha y hora obligatorias, salida futura y al menos 12 horas de anticipación. El backend determina el plazo definitivo con su reloj de Lima.
4. No cambian origen, destino, capacidad, ruta, pasajeros ni estado arbitrariamente.
5. Con solicitudes ACEPTADAS, Spring exige confirmarImpacto=true.
6. Cambiar un horario confirmado deja confirmado=false y fechaConfirmacion=null. Spring reinicia su recordatorio; Angular informa de la necesidad de confirmar nuevamente, sin ejecutar la confirmación.
7. Spring conserva solicitudes y notifica a los aceptados. Angular no elimina/recrea viajes o solicitudes, no modifica acuerdos y no simula correos/notificaciones.
8. Un horario equivalente no requiere escritura. El backend también devuelve un mensaje sin cambios si recibe el mismo horario; la UI evita esa petición normalmente.

## Funcionamiento de la pantalla

Nueva ruta **`/conductor/viajes/:id/editar`**, dentro del árbol de conductor existente y con sus guards de conductor/perfil, sin modificar esos guards.

La pantalla carga simultáneamente el viaje propio y el total de aceptados. Muestra origen/destino de solo lectura, horario actual, estado y confirmación reales. El formulario reactivo solo contiene fecha y hora, inicialmente prellenadas con la respuesta.

Las fechas se mantienen como yyyy-MM-dd, sin toISOString ni Date aplicado a una fecha de calendario para serializarla. La validación de calendario reutiliza fechaLocalValida. La comparación de salidas utiliza instanteSalida con -05:00 (Lima); la presentación conserva el día y los segundos sin desplazamientos UTC. HH:mm, HH:mm:ss y fracciones válidas se comparan canónicamente para no inventar cambios por segundos cero.

Guardar vuelve a validar campos y plazo, bloquea controles/envíos concurrentes y consulta nuevamente los datos antes de escribir. Cancelar edición no envía PUT; se deshabilita mientras existe una operación en curso. Los enlaces de regreso permiten consultar listados/gestión existentes.

Tras un HTTP 200 coherente se muestra el nuevo horario devuelto y se vuelve a consultar el servidor. El formulario se reinicia con los valores persistidos. Los listados y la gestión consultan sus fuentes al regresar; no hay caché local que sustituya esos GET.

Si el PUT se confirmó pero falla la lectura posterior, se conservan los datos nuevos de esa respuesta y la confirmación de guardado, junto a un error independiente de consulta. El formulario queda bloqueado hasta recuperar una consulta válida. No se vuelve a escribir automáticamente.

## Confirmación de impacto y concurrencia

### Pasajeros ya conocidos

1. Se consulta totalElements de ACEPTADA con size=1.
2. Al guardar se refresca viaje/total. Si cambió el horario, estado, confirmación, datos de ruta mostrados o total de aceptados respecto de la consulta previa, se actualiza el resumen, se conserva el borrador y se requiere otra acción explícita de guardar.
3. Si hay aceptados y no cambió esa información, el diálogo existente ConfirmarImpactoDialog muestra número de pasajeros, horario anterior y nuevo, origen/destino y pérdida de confirmación si corresponde.
4. Cancelar, Escape o cerrar no envía PUT y mantiene el horario persistido y el borrador.
5. Confirmar provoca otra lectura. Si cambia la información durante el diálogo, se invalida el consentimiento y se requiere volver a revisar/guardar; no se envía true con la revisión antigua.
6. Si sigue vigente, se comprueba otra vez el plazo de 12 horas —el tiempo en el diálogo puede invalidarlo— y se envía un único PUT con confirmarImpacto=true.

### Pasajeros aceptados concurrentemente y HTTP 409

La advertencia vigente de Spring tiene esta forma:

```text
ADVERTENCIA: el cambio de horario afecta a N pasajero(s) aceptado(s). Confirma usando ?confirmarImpacto=true.
```

Solo se reconoce como advertencia de pasajeros si coincide con ese formato y HTTP 409. Otros 409 nunca se interpretan como consentimiento.

**Ningún 409 reenvía una escritura automáticamente.** Se vuelve a consultar el viaje/total, se conserva el borrador y se explica el conflicto. Para la advertencia de pasajeros, el usuario debe pulsar guardar nuevamente y confirmar el diálogo actualizado. Si ahora el viaje es terminal, queda bloqueado.

### Límite contractual

El endpoint no recibe una versión/horario anterior ni documenta una precondición If-Match/ETag. Las lecturas preventivas reducen el riesgo, pero no ofrecen una garantía atómica entre la última lectura y el PUT. Otro cambio puede ocurrir en ese intervalo y el servidor aplica sus reglas a la versión vigente. Tampoco se detecta un reemplazo de participantes que conserve el mismo total, porque se consulta el contador y no la lista completa.

Para garantizar detección de ediciones concurrentes se necesitaría una versión esperada o precondición equivalente validada dentro de la transacción del backend. No se añadió un campo o endpoint supuesto ni se modificó Spring. Esta limitación no bloquea el contrato actual, pero debe considerarse al probar dos sesiones.

## Errores y ciclo de vida

| Caso                  | Comportamiento                                                                       |
| --------------------- | ------------------------------------------------------------------------------------ |
| 400                   | Mensaje de campos/plazo; conservar fecha y hora                                      |
| 401                   | Logout/login mediante interceptor existente; sin recargas protegidas automáticas     |
| 403                   | Mensaje de permisos, sin cambiar rol ni simular guardado                             |
| 404                   | Viaje inexistente/inaccesible; formulario bloqueado y regreso al listado             |
| 409                   | Mensaje controlado, consulta nueva y otra acción explícita; nunca reenvío automático |
| 429                   | Esperar antes de reintentar                                                          |
| Red, timeout, 5xx     | Mensaje controlado y borrador conservado; cada nuevo guardar consulta primero        |
| Respuesta incoherente | No anunciar éxito; indicar consulta antes de reintentar                              |

Se usan mensajes controlados y una lista de conflictos conocidos, sin mostrar SQL, stack traces ni errores internos. Las escrituras y lecturas tienen timeout de 15 s. No se cambiaron timeouts de pruebas.

Las suscripciones se limpian con takeUntilDestroyed. Cambiar el ID cancela la consulta/operación anterior y cierra su diálogo; los callbacks anteriores no actualizan el nuevo viaje. Salir durante un PUT cancela la petición del navegador y los efectos de UI, pero **no garantiza revertir un procesamiento ya recibido por Spring**. Al volver se consulta siempre el servidor.

## Integración con pantallas existentes y diseño

Se añadió Reprogramar con el viaje.id real y solo para PROGRAMADO en:

- Mis viajes del conductor.
- Viajes de una ruta.
- Gestionar viaje; se oculta además mientras la gestión está cargando/enviando.

Se mantienen Gestionar, Ver solicitudes, Confirmar, Iniciar, Completar y Cancelar. No se reemplazan los flujos de US14–US18.

ConfirmarImpactoDialog se amplió con campos opcionales de presentación; la edición de rutas conserva su contenido anterior. Los ajustes de espaciado del diálogo se aplican únicamente a su variante de reprogramación. El formulario usa Material, Roboto, tokens y patrones de las pantallas existentes. Funciona con dos columnas en escritorio y acciones/campos apilados en móvil.

## Archivos modificados (9)

- `src/app/core/services/rutas.service.ts`
- `src/app/pages/conductor/conductor.routes.ts`
- `src/app/pages/conductor/rutas/confirmar-impacto-dialog/confirmar-impacto-dialog.ts`
- `src/app/pages/conductor/rutas/confirmar-impacto-dialog/confirmar-impacto-dialog.html`
- `src/app/pages/conductor/rutas/confirmar-impacto-dialog/confirmar-impacto-dialog.css`
- `src/app/pages/conductor/rutas/viajes-ruta/viajes-ruta.html`
- `src/app/pages/conductor/viajes/mis-viajes/mis-viajes.html`
- `src/app/pages/conductor/viajes/gestionar-viaje/gestionar-viaje.html`
- `src/app/pages/conductor/rutas/rutas.integration.spec.ts`

La última prueba solo se ajusta para identificar Ver solicitudes por su destino, y para incluir el nuevo enlace junto a los existentes; no se eliminan expectativas de las acciones anteriores.

## Archivos creados (9)

- `docs/integracion-reprogramacion-viajes-US07.md`
- `src/app/core/services/rutas-reprogramacion.service.spec.ts`
- `src/app/pages/conductor/viajes/reprogramar-viaje/reprogramar-viaje.ts`
- `src/app/pages/conductor/viajes/reprogramar-viaje/reprogramar-viaje.html`
- `src/app/pages/conductor/viajes/reprogramar-viaje/reprogramar-viaje.css`
- `src/app/pages/conductor/viajes/reprogramar-viaje/reprogramar-viaje.models.ts`
- `src/app/pages/conductor/viajes/reprogramar-viaje/reprogramar-viaje.models.spec.ts`
- `src/app/pages/conductor/viajes/reprogramar-viaje/reprogramar-viaje.integration.spec.ts`
- `src/app/pages/conductor/viajes/reprogramar-viaje/reprogramar-viaje.testing.ts` (solo tests)

No se modificaron CoordinacionService, AuthService, guards, interceptor, barras laterales, dashboards, reportes, compensaciones, horarios ni dependencias/lockfile. No se implementó eliminación física ni IA.

## Pruebas automatizadas

TestBed, RouterTestingHarness y HttpTestingController, con JWT de prueba e interceptor real. Ninguna petición se dirige a Spring/Supabase.

Cobertura: carga y recarga directa, prellenado desde DTO, payload exacto/ID real, query false/true, campos vacíos/calendario/hora inválida, fecha pasada y límite de 12 horas, equivalencia de segundos cero, guardado sin aceptados, diálogo confirmado/cancelado, bloqueo de duplicados, 409 de impacto y conflictos distintos sin reenvío, actualización concurrente antes/durante el diálogo, confirmación reiniciada, estado real de lectura posterior, viaje terminal, HTTP 400/401/403/404/429/500/red/timeout, respuesta incoherente, borrador conservado, lectura posterior fallida, IDs inválidos, cancelación de lecturas/PUT obsoletos, permisos de pasajero/anónimo y enlaces elegibles en las tres pantallas.

Resultados de ejecución:

1. Primer conjunto nuevo: **64/64 aprobadas**.
2. Tras añadir navegación y casos adicionales: **99 aprobadas, 2 fallidas (101)**. Ambas fallidas eran expectativas antiguas que dependían del primer enlace o de la lista anterior de enlaces. Se actualizaron legítimamente para incluir Reprogramar y verificar los destinos anteriores, sin omitir tests.
3. Primera suite completa corregida con dos workers: **647 aprobadas, 0 fallidas; 35 archivos**, código 0. Inicio 18:29:36 (Lima), duración 57.05 s, 6 de noviembre de 2026.
4. Se repite la suite completa tras ajustar exclusivamente la presentación del diálogo y la ayuda del formulario. El resultado final queda registrado debajo.

Se añadieron **69 casos**: 7 de servicio, 13 de validaciones y 49 de integración. La suite completa mantiene las regresiones previas de autenticación, perfil/roles, rutas, viajes, coordinación, dashboards, reportes/PDF, compensaciones, horarios y contribución.

```powershell
$env:VITEST_MAX_WORKERS = '2'
npm.cmd test -- --watch=false
npm.cmd run build
git diff --check
git status --short --untracked-files=all
```

Resultados finales del 6 de noviembre de 2026:

| Comprobación                            | Resultado exacto                                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Suite completa con VITEST_MAX_WORKERS=2 | **647 aprobadas, 0 fallidas; 35 archivos aprobados**, código 0. Inicio 18:32:36 (Lima), duración 58.45 s                                             |
| npm.cmd run build                       | **Código 0**, 14.083 s, producción en dist/uniride-frontend; bundle inicial 451.84 kB, transferencia estimada 120.16 kB. Sin warnings de compilación |
| git diff --check                        | Código 0, sin errores de whitespace                                                                                                                  |
| Dependencias                            | Sin cambios en package.json/package-lock.json; no se instalaron dependencias                                                                         |

Verificación visual acotada de la pantalla y su diálogo en Chrome headless, a 1440 y 390 px. Se comprobaron valores precargados, avisos, campos, comparación de horarios y acciones; no hubo desbordamiento horizontal. Se corrigió el espaciado del diálogo únicamente para la variante de reprogramación y la altura dinámica de la ayuda del campo de hora, confirmándolo en una segunda ronda. El detector de impeccable devolvió `[]`.

Se utilizó el build de producción con un servidor temporal **de prueba aislado** que solo responde GET y rechaza escrituras, sin reenviar tráfico a localhost:8080. Las capturas y el harness están en `tmp/reprogramacion-visual/` y `tmp/reprogramacion-visual.cjs`, ignorados por Git. Los fixtures no se importan en producción. Esta comprobación no acredita persistencia, correos ni conectividad con Spring/PostgreSQL y no constituye la auditoría E2E global pospuesta.

## Guía de prueba manual pendiente

Ejecutar posteriormente con cuentas/registros de un entorno autorizado de pruebas. Estos recorridos con Spring/PostgreSQL no se realizaron durante la implementación.

1. Levantar Spring Boot en localhost:8080 con la configuración existente y Angular con `npm.cmd start`. Iniciar sesión como CONDUCTOR con perfil completo.
2. Abrir Mis viajes y Viajes de una ruta. Comprobar que Reprogramar aparece solo para PROGRAMADO y usa viajeId, sin confundirlo con rutaId. Confirmar que permanecen las demás acciones.
3. Abrir Gestionar viaje y su enlace Reprogramar. Recargar directamente `/conductor/viajes/{id}/editar` y comprobar los GET de rutas/viajes propios, sin GET individual inventado.
4. Comparar origen/destino, horario actual, estado y confirmación con Network. Verificar GET de ACEPTADA con size=1 y que se muestre totalElements, aunque existan muchos pasajeros.
5. No modificar el horario: Guardar permanece deshabilitado/no emite PUT. Verificar que HH:mm y HH:mm:00 no produzcan un cambio artificial.
6. Probar campos vacíos, fecha inválida/pasada y una salida con menos de 12 h. No debe enviarse PUT. Probar una salida futura con margen suficiente y segundos cuando corresponda; no debe cambiar el día al serializar.
7. Con un viaje sin aceptados, guardar una salida válida. Verificar lectura preventiva y PUT `/api/viajes/{id}?confirmarImpacto=false`, body solo fecha/hora, HTTP 200 y nueva consulta. Comparar el nuevo horario visible con el servidor.
8. Con aceptados, modificar el horario y pulsar Guardar. Revisar el diálogo con ambos horarios y contador real. Cancelarlo: no debe haber PUT y el borrador se mantiene.
9. Reabrir y confirmar. Verificar otra lectura y un único PUT con confirmarImpacto=true. Comprobar que se conservan pasajeros/solicitudes y aparece la fecha/hora real nueva. La entrega de correos debe comprobarse por separado en el entorno del backend; Angular no simula ni acredita envío.
10. Con viaje previamente confirmado, revisar la advertencia antes de guardar. Tras reprogramar, comprobar confirmado=false y fechaConfirmacion=null en la respuesta. Abrir Gestionar viaje para confirmar nuevamente de forma explícita; no debe existir un PUT automático de confirmación.
11. En dos sesiones de prueba, cambiar horario/estado o aceptar otro pasajero mientras la primera pantalla está abierta. Al guardar/confirmar debe actualizar la información y exigir revisión nueva cuando detecte diferencias. Considerar la ventana de concurrencia sin versión descrita arriba.
12. Provocar de forma controlada un 409 de impacto después de la consulta inicial: comprobar que solo hay lectura posterior y que true requiere otro Guardar y consentimiento. Probar también un 409 de negocio distinto: nunca debe repetirse el PUT por contener un texto parecido.
13. Probar URL de EN_PROGRESO/COMPLETADO/CANCELADO/VENCIDO: formulario bloqueado y sin PUT. Probar viaje inexistente/ajeno con una cuenta autorizada de prueba: 404, sin datos de otra cuenta.
14. Simular Offline/fallo HTTP con DevTools o herramientas del entorno de prueba. Verificar borrador conservado, mensajes controlados, reintentos explícitos y ningún éxito falso. Para un timeout de escritura, consultar antes de repetir, porque el servidor pudo procesarla.
15. Navegar a otro ID o salir con lecturas/diálogo/PUT en curso. No deben aparecer resultados tardíos del viaje anterior. Volver y comprobar el estado consultado del servidor.
16. Volver a Mis viajes, Viajes de la ruta y Gestionar después de guardar: verificar datos nuevos y acciones existentes de coordinación. No ejecutar eliminación física.
17. Revisar escritorio 1440 px y móvil 390 px, teclado/foco, lectura de mensajes, diálogo y botones. Esta revisión se limita a reprogramación; la auditoría E2E integral de UniRide queda pospuesta.

### Evidencias sugeridas

- Tres enlaces Reprogramar con ID real y ausencia en estados terminales.
- Formulario precargado, validaciones y payload/200 con lectura posterior.
- Diálogo de impacto con ambos horarios; cancelación sin PUT y confirmación con true.
- Pérdida de confirmación reflejada y posterior acceso al flujo existente.
- Conflicto concurrente/409 sin escritura automática y borrador conservado.
- Vistas móvil/escritorio; salidas completas de tests/build/diff check/Git, sin tokens ni datos sensibles.

## Limitaciones y entrega

La recuperación recorre rutas/viajes propios por ausencia de GET individual; en cuentas grandes puede aumentar coste y alcanzar timeout. Se conserva el mecanismo existente sin refactorizar otros módulos. Las lecturas no equivalen a una transacción con el PUT; falta una versión/precondición en el contrato para garantizar detección de ediciones concurrentes. El total de aceptados no identifica cambios de composición con el mismo número. El reloj del equipo solo ofrece validación preventiva; Spring conserva la autoridad final.

Todos los cambios quedan sin staging, en la rama y HEAD de inicio. No se ejecutaron git add, commit, push, PR, merge ni cambio de rama. No se modificaron backend, Supabase ni registros reales. No se afirma una validación manual real ni una auditoría global E2E de UniRide.
