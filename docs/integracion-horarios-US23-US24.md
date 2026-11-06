# Integración de horarios académicos — US23 y US24

## Diagnóstico y alcance

Rama: `feature/horarios-academicos-US23-US24`. HEAD inicial: `6271678f78448ec7d20b597307db0de35b544cee`.

Se leyó SPEC.md y se buscaron instrucciones AGENTS.md en el repositorio y sus ancestros, sin encontrarlas. Se revisaron rutas, guards, AuthService, PerfilService, interceptor JWT, estilos, layouts, componentes compartidos y pruebas. Inicialmente no existía el módulo HTTP de cursos y los dos menús tenían Horarios deshabilitado. La disponibilidad textual del perfil se conserva independiente de los cursos.

La primera versión integró el CRUD permitido y la importación. A petición posterior del usuario, se sustituyó el listado plano por desplegables por día, se incorporó guardado parcial manual y un diálogo con los conflictos reales. Se eligió **06:00–23:00**, incluyendo ambos límites, como franja de clases.

Backend consultado exclusivamente en [master](https://github.com/pollitoconpapass/uniride-spring-backend/tree/master/src/main/java/com/uniride): HorarioAcademicoController, HorarioAcademicoService, CursoRequest, CursoRespuesta, ArchivoRespuesta, CursoRepository, Paginacion y GlobalExceptionHandler. Se comprobó nuevamente la lógica de conflictos para esta revisión. No se modificó Spring Boot ni se hicieron escrituras reales.

El diseño conserva Material, Roboto, tokens globales, layouts compartidos, responsive y ReportesStatePanel. La revisión inicial de Figma no encontró un frame específico para el módulo completo. La skill impeccable se aplicó al ajuste del panel, manteniendo el sistema existente.

## Endpoints y modelos

Todos usan HttpClient, `environment.apiUrl = '/api'`, el proxy existente a localhost:8080 y el interceptor JWT. No se envía userId ni se copian tokens/cursos en storage.

| Operación                               | Contrato real                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| GET `/api/perfil/cursos?page=0&size=10` | 200, Page de CursoRespuesta; size permitido: 1–100                             |
| POST `/api/perfil/cursos`               | Array de CursoRequest; 201, array persistido                                   |
| DELETE `/api/perfil/cursos/{id}`        | ID real, sin body; 204 sin contenido                                           |
| POST `/api/perfil/horarios/archivo`     | FormData, campo `archivo` File PDF/TXT ≤ 1 048 576 bytes; 201 ArchivoRespuesta |

```ts
interface CursoRequest {
  nombre: string;
  dia: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  horaInicio: string; // HH:mm o HH:mm:ss, LocalTime
  horaFin: string;
}
interface CursoRespuesta {
  id: number;
  nombre: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
}
interface CursosPagina {
  content: readonly CursoRespuesta[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
interface ArchivoRespuesta {
  mensaje: string;
  cursosImportados: number;
  cursosOmitidos: number;
  nombreArchivo: string;
}
```

No hay PUT ni GET individual: no se implementan edición ni endpoints ficticios.

## Listado semanal y paginación real

El backend ordena por texto de día, no por orden de semana/hora. Para presentar una semana completa, `listarTodos()` consulta página 0 con size=100 y después las páginas restantes indicadas por totalPages, secuencialmente. No se muestra una semana parcial mientras faltan páginas.

Se comprueban número de página, estabilidad de totales, cantidad recuperada e IDs únicos. Si el horario cambia durante la lectura y deja una instantánea inconsistente, se muestra error y reintento, en lugar de ocultar cursos o consultar indefinidamente. No hay paginación local fingiendo totales del servidor.

Los siete desplegables Material aparecen de lunes a domingo, inicialmente cerrados, con contador real por día. Dentro se ordena por inicio, fin e ID como desempate. Miercoles/Sabado y variantes de mayúsculas/tildes se normalizan solo para presentación y detección preventiva. Un día desconocido se conserva como grupo adicional, sin ocultar registros.

Las horas se comparan en segundos locales, sin Date/UTC; se muestran los segundos no nulos. El grupo vacío permite desplegar el mensaje sin cursos. El listado global vacío también tiene una explicación visible.

## Registro manual parcial y superposiciones

El formulario reactivo valida nombre después de trim, día español, formato de hora, inicio anterior al fin y **inicio ≥ 06:00 / fin ≤ 23:00**. Se aceptan HH:mm y HH:mm:ss. 05:59:59 y 23:00:01 quedan fuera; 06:00:00 y 23:00:00 están permitidos. Una fila con campos inválidos impide enviar el formulario hasta corregirla.

**Verificación del backend:** el POST de un array es transaccional y un conflicto revierte todo ese array. Por eso, para cumplir el guardado parcial solicitado sin modificar Spring, el frontend:

1. Consulta nuevamente el horario completo al pulsar Guardar.
2. Revisa cada curso contra los existentes y los ya confirmados en esta operación.
3. Omite los conflictos locales y envía cada curso compatible en un POST independiente de un elemento: `[curso]`.
4. Confirma cada curso únicamente después de 201 y una respuesta coherente.
5. Continúa con los demás cursos compatibles. Entre dos filas nuevas que se cruzan, prevalece la primera confirmada según el orden del formulario.
6. Conserva en el formulario únicamente las filas rechazadas o sin confirmar; nunca reenvía automáticamente escrituras.
7. Vuelve a consultar GET y presenta el número de cursos efectivamente confirmados.

Se permiten horarios contiguos (el fin de uno igual al inicio del otro) y la misma hora en días diferentes. Las filas idénticas también se consideran conflicto y no se duplican. El diálogo identifica nombre, día y horario del curso intentado y de **todos** los cursos existentes con los que se cruza. Indica que no puede haber superposiciones y que los cursos confirmados se conservaron.

Spring sigue siendo la autoridad final. Si hay un 409 por una escritura concurrente, se consulta de nuevo el horario y se reconstruye el conflicto con datos reales; después se continúa con cursos independientes. Si no se puede recuperar el detalle, se conserva el mensaje real de conflicto sin inventar el curso existente y se detiene el resto de la operación.

Ante red, 5xx, respuesta incoherente o permisos se detienen los envíos restantes y se conservan los borradores. Los confirmados previamente permanecen confirmados. Un 401 se propaga al interceptor y no inicia recargas/diálogos tardíos después del logout.

## Importación y avisos reales

El input file admite PDF/TXT, valida extensión, ausencia/vacío y tamaño exacto de 1 MiB. Se envía FormData con `archivo` sin fijar Content-Type/boundary manualmente. El contenido se interpreta exclusivamente en Spring: no hay OCR ni parser alternativo de PDF/TXT en Angular.

El backend ya realiza importación parcial: guarda cursos compatibles y omite los que se superponen. Los duplicados ignorados no necesariamente incrementan cursosOmitidos, por lo que no se inventa un total detectado sumando contadores. Un 201 con cero importados se anuncia como **Archivo procesado sin cursos nuevos**, no como cursos añadidos.

Tras 201, la UI muestra mensaje, nombreArchivo y ambos contadores, y vuelve a obtener el horario completo. ArchivoRespuesta no trae un array estructurado de conflictos. El mensaje vigente incluye los cursos entrantes omitidos con esta gramática:

```text
N omitidos por conflicto de horario: «Nombre» (Lunes de 08:00 a 10:00) | «Otro» (Martes de 09:00 a 11:00). Elimina o edita el curso existente y vuelve a subir el archivo.
```

El frontend reconoce estrictamente esa sección, valida cantidad/horas y cruza los cursos omitidos con el horario real recuperado para mostrar el diálogo solicitado. No utiliza el archivo original para inventar datos. Si cambia el formato, faltan cursos existentes o falla la recarga, muestra el mensaje real del servidor e indica detalle incompleto. Todo se interpola como texto escapado, nunca innerHTML.

**Límite pendiente del backend:** actualmente ni el POST manual ni el importador de Spring exigen 06:00–23:00. Angular lo bloquea en el formulario manual, pero no puede impedir que Spring persista un curso fuera de franja al subir un PDF/TXT, porque el endpoint procesa y guarda antes de responder y no ofrece previsualización. Se avisa antes de subir y, después del GET, se identifican los cursos reales del horario fuera de franja en un diálogo. No se borran automáticamente ni se afirma que fueron rechazados.

Para garantizar la franja también en archivos, el cambio mínimo pendiente en HorarioAcademicoService es comprobar inicio ≥ 06:00 y fin ≤ 23:00 antes de guardar cada curso en **ambos** flujos, conservando los compatibles y devolviendo las omisiones con motivo. Para detalles fiables de conflictos convendría ampliar ArchivoRespuesta con datos estructurados de curso entrante y cursos existentes. Estas propuestas no se implementaron en el backend.

TXT UTF-8 compatible:

```text
Lunes
Nombre del curso 08:00 - 10:00
Miércoles
Otro curso 14:00 - 16:00
```

PDF depende de extracción/OCR, legibilidad y configuración de Spring (incluido Tesseract cuando se necesite). Master limita ejecución OCR a 60 s; el cliente permite hasta 120 s para la importación y 15 s para las demás peticiones. No se cambiaron timeouts de tests.

## Eliminación, estados y seguridad

Solo se envía DELETE tras confirmación en el diálogo con nombre/día/horario e ID real. Cancelar/cerrar no borra. Mientras se elimina se bloquean clics duplicados y cierre. Solo un 204 cierra como éxito y recarga toda la semana; errores mantienen el curso y permiten reintentar. No hay eliminación optimista ni por índice.

| Estado            | Tratamiento                                                               |
| ----------------- | ------------------------------------------------------------------------- |
| 200 GET           | Horario completo, grupos por día o vacío real                             |
| 201 manual        | Confirmación individual, borradores pendientes y recarga                  |
| 201 archivo       | Resultado real, cero importados/omisiones diferenciados, recarga y avisos |
| 204 DELETE        | Confirmación y recarga                                                    |
| 400               | Validación/archivo inválido; conservar datos                              |
| 401               | Logout/login por interceptor existente; sin efectos posteriores           |
| 403               | Permisos, sin éxito ni cambio artificial de sesión                        |
| 404               | Recurso no disponible; actualizar explícitamente                          |
| 409               | Cruce: diálogo; otros conflictos/OCR: mensaje controlado                  |
| 413               | Tamaño rechazado por infraestructura; Spring normalmente informa 400      |
| 429               | Esperar y reintentar explícitamente                                       |
| Red, timeout, 5xx | Error controlado, sin detalles internos ni reenvíos automáticos           |

SwitchMap cancela lecturas obsoletas; takeUntilDestroyed cancela también las consultas posteriores a importaciones al salir de la pantalla. Las operaciones se bloquean para evitar concurrencia desde esta UI. Cancelar una escritura HTTP en el navegador no garantiza revertir un guardado ya recibido por Spring; una nueva visita siempre consulta el servidor.

## Navegación y archivos

Ruta única **`/horarios`**, SharedLayout, authGuard y perfilGuard, para CONDUCTOR/PASAJERO con perfil completo. Enlaces funcionales en menú desktop/móvil de ambos. El resto de políticas de navegación se conserva; no se habilitan botones ajenos reservados para auditoría UX.

Modificados (3):

- `src/app/app.routes.ts`
- `src/app/layouts/conductor-layout/conductor-layout.ts`
- `src/app/layouts/pasajero-layout/pasajero-layout.ts`

Nuevos (19):

- `docs/integracion-horarios-US23-US24.md`
- `src/app/core/services/horarios.service.ts`
- `src/app/core/services/horarios.service.spec.ts`
- `src/app/pages/horarios/horarios.ts`
- `src/app/pages/horarios/horarios.html`
- `src/app/pages/horarios/horarios.css`
- `src/app/pages/horarios/horarios.models.ts`
- `src/app/pages/horarios/horarios.models.spec.ts`
- `src/app/pages/horarios/horarios-conflictos.ts`
- `src/app/pages/horarios/horarios-conflictos.spec.ts`
- `src/app/pages/horarios/horarios-error.ts`
- `src/app/pages/horarios/horarios.testing.ts` (solo tests)
- `src/app/pages/horarios/horarios.integration.spec.ts`
- `src/app/pages/horarios/eliminar-curso-dialog/eliminar-curso-dialog.ts`
- `src/app/pages/horarios/eliminar-curso-dialog/eliminar-curso-dialog.html`
- `src/app/pages/horarios/eliminar-curso-dialog/eliminar-curso-dialog.css`
- `src/app/pages/horarios/conflictos-horario-dialog/conflictos-horario-dialog.ts`
- `src/app/pages/horarios/conflictos-horario-dialog/conflictos-horario-dialog.html`
- `src/app/pages/horarios/conflictos-horario-dialog/conflictos-horario-dialog.css`

No cambian AuthService, PerfilService, interceptor, guards, dependencias, lockfile ni módulos de otras US. No hay almacenamiento simulado en producción.

## Pruebas y resultados

TestBed, HttpTestingController y RouterTestingHarness cubren páginas completas/vacías/inconsistentes, agrupación y orden, horario local y límites 06:00–23:00, guardado parcial, duplicados/cruces existentes e internos, concurrencia 409, fallos parciales, formularios conservados, carga y reintentos, PDF/TXT/FormData/tamaño, importación parcial y ventana de conflictos, mensajes incompletos, advertencia de franja importada, DELETE confirmado/cancelado, JWT, ambos roles/menús, perfil pendiente y limpieza al salir.

Los fixtures se usan exclusivamente en tests. Ninguna prueba utiliza Supabase ni modifica registros reales. La suite conserva las pruebas previas de autenticación, perfil, rutas, viajes, reportes/PDF, compensaciones y US29.

Durante la adaptación del listado y la secuencia HTTP, las primeras ejecuciones enfocadas fallaron por expectativas de la versión anterior (contenido diferido del acordeón, GET previo al POST y paginación sustituida). Se actualizaron para comprobar el comportamiento nuevo; no se omitieron casos ni aumentaron timeouts. La ejecución enfocada posterior pasó **102/102** y la suite completa pasó **491/491**. Después se añadieron dos casos de 401 durante las recargas para evitar efectos tras logout; el resultado final se registra a continuación.

```powershell
$env:VITEST_MAX_WORKERS = '2'
npm.cmd test -- --watch=false
npm.cmd run build
git diff --check
git status --short --untracked-files=all
```

Resultados finales del 6 de noviembre de 2026:

| Comprobación                         | Resultado exacto                                                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Suite completa, VITEST_MAX_WORKERS=2 | **493 aprobadas, 0 fallidas; 27 archivos aprobados**, código 0. Inicio 15:42:12 (Lima), duración 44.96 s                                 |
| Pruebas del módulo                   | 104 casos: servicio, validadores/formato, agrupación/conflictos y componentes/rutas                                                      |
| npm.cmd run build                    | Código 0, 7.979 s, salida dist/uniride-frontend; bundle inicial 451.62 kB, transferencia estimada 120.11 kB. Sin warnings de compilación |
| git diff --check                     | Código 0, sin errores de whitespace                                                                                                      |
| Dependencias                         | Sin cambios en package.json/package-lock.json; no se reinstalaron para esta revisión                                                     |

La última compilación incluye el ajuste CSS de los contadores para mantenerlos en una línea. Después de las 493 pruebas solo se modificaron ese estilo y esta documentación.

Revisión visual en Chrome headless del build de producción: 1440 px con CONDUCTOR y 390 px con PASAJERO, siete días, orden temprano/tarde, desplegables abiertos y diálogo de conflictos legible, sin desbordamiento horizontal. Se corrigió en un pase el salto de línea de los contadores y se confirmó en una segunda ronda. El detector mecánico de impeccable devolvió `[]`.

Esta revisión usó un servidor temporal local aislado con respuestas de prueba de usuario/perfil/cursos e importación; nunca reenvía tráfico a Spring ni escribe en la base de datos. Capturas en `tmp/horarios-visual/`, ignorado por Git. Estos fixtures no pertenecen al código productivo. No acredita OCR, archivos reales ni persistencia con Spring/Supabase.

## Prueba manual pendiente

Estos pasos deben ejecutarse posteriormente por el usuario con cuentas/registros de prueba autorizados; no se realizaron escrituras reales durante la implementación.

1. Levantar Spring Boot master en localhost:8080; Angular con `npm.cmd start`. Iniciar sesión con perfil completo y abrir `/horarios`. Repetir con CONDUCTOR y PASAJERO.
2. En Network comprobar GET con page=0/size=100 y páginas siguientes si existen, sin userId. Comparar los contadores semanales con totalElements. Probar cuenta sin cursos.
3. Desplegar lunes, miércoles y otro día vacío. Verificar cursos ordenados por inicio y segundo, días con tildes normalizadas y ausencia de cambios de hora. Probar teclado y móvil.
4. Agregar filas sin guardar: no debe haber POST. Probar nombre vacío, día faltante, hora inválida, fin anterior/igual, 05:59:59 y fin 23:00:01: bloqueados. Probar inicio 06:00 y fin 23:00 válidos.
5. Guardar varios cursos compatibles. Comprobar GET preventivo y POST secuenciales con arrays de un elemento, 201 de cada uno y GET final. Solo se limpian filas confirmadas.
6. Combinar un curso compatible y otro que cruce un curso existente. Debe guardarse el compatible y abrirse el diálogo con ambos nombres/días/horas del conflicto. El rechazado permanece editable. Corregirlo y volver a guardar.
7. Probar dos filas nuevas que se cruzan y una tercera compatible: la primera confirmada y la tercera se conservan, la conflictiva permanece. Probar duplicados, clases contiguas y la misma hora en días distintos.
8. Con dos pestañas en un entorno de prueba, provocar conflicto concurrente: un 409 debe recuperar la información real y nunca simular guardado del curso rechazado.
9. Importar PDF/TXT legible ≤1 MiB con un curso compatible y uno superpuesto. Comprobar FormData archivo, 201, contadores reales, GET y diálogo con el curso intentado y el existente. Los compatibles siguen en el listado.
10. Probar un archivo sin cursos y otro con todos los cursos omitidos: mostrar procesado sin cursos nuevos. Si el servidor cambia el mensaje, mostrar mensaje real/detalle incompleto sin inventar cursos.
11. Para comprobar el límite pendiente del servidor, usar solo un archivo y entorno de prueba autorizados con un curso fuera de 06:00–23:00. El backend actual puede persistirlo: la UI lo advierte después y lo mantiene visible. No confundir esta advertencia con validación preventiva del importador.
12. Probar archivo vacío/extensión incorrecta/>1 MiB (sin POST), PDF inválido, OCR fallido y 429 controlado. Conservar selección y permitir reintento real, sin POST duplicado.
13. Cancelar un diálogo de eliminación (sin DELETE). Confirmar después: ID real, 204 y GET completo. Probar 404/409/red: no ocultar el curso sin éxito.
14. DevTools Offline: carga/error/reintento GET y borrador conservado tras fallo de escritura. Restaurar red y volver a consultar antes de repetir si pudo llegar el POST.
15. Probar 401 y 403 en entorno controlado; 401 lleva al login sin abrir diálogos tardíos. Cambiar de pantalla con GET/importación en curso y verificar que no hay efectos UI posteriores.
16. Revisar desktop y móvil, menú por rol, foco y scroll del diálogo, nombres largos y ausencia de desbordamiento. Comprobar navegación de las funcionalidades previas.

### Evidencias sugeridas

- Semana plegada/desplegada, orden cronológico y respuesta paginada completa.
- Validaciones de franja, payload real, 201 y GET posterior.
- Guardado parcial con diálogo (nombres y horas de ambos cursos) y borrador rechazado conservado.
- Importación parcial/omisiones y cero cursos nuevos; límite pendiente de franja explicado.
- Cancelación sin DELETE; confirmación con ID, 204 y recarga.
- Errores/reintentos, ambos roles y vistas móvil/escritorio.
- Salidas completas de tests/build/diff check/Git, ocultando tokens y datos personales.

## Limitaciones y entrega

- Spring compara días sin distinguir mayúsculas pero **no normaliza tildes**. El flujo manual de Angular compensa esta diferencia al comparar el horario completo; el importador puede todavía admitir cruces entre Miercoles y Miércoles. La mínima corrección pendiente es normalización canónica del día en ambos flujos del servidor y revisión controlada de registros previos. Angular no modifica registros existentes para repararlos.
- La franja de importación requiere validación previa a persistencia en Spring; el aviso posterior no la sustituye.
- Los detalles de conflictos importados dependen del texto del mensaje mientras no exista DTO estructurado; ante cambios se degrada al mensaje real.
- No existe edición de curso, aunque algunos mensajes del backend la sugieren. Solo eliminar con confirmación y volver a registrar/importar.
- Reconocimiento de PDF y concurrencia entre pestañas dependen del backend. Si cambia una colección durante la lectura paginada, se pide reintentar para evitar una semana incompleta.
- Las pruebas manuales con Spring/Supabase y archivos reales quedan pendientes del usuario.

Rama y HEAD se conservan. Todos los cambios quedan sin staging. No se hizo commit, push, PR, merge ni cambio de rama. No se modificaron backend, Supabase, migraciones ni registros reales. No se implementaron US30/US31 ni nuevas funciones de IA.
