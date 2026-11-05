# UniRide — Especificación del Frontend

Aplicación web responsiva de viajes compartidos universitarios, desarrollada como parte del proyecto UniRide para el curso de Ingeniería de Software de la Universidad Peruana de Ciencias Aplicadas (UPC).

UniRide permite que estudiantes universitarios con vehículo publiquen rutas y viajes, mientras que estudiantes sin vehículo pueden buscar viajes disponibles, solicitar cupos y coordinar contribuciones.

Este documento establece las reglas compartidas para desarrollar las interfaces utilizando Angular, Angular Material, Figma y un agente de inteligencia artificial.

## 1. Datos del proyecto

- Nombre del producto: UniRide
- Nombre del startup: MoviUni
- Repositorio: https://github.com/Ian-1232/uniride-frontend
- Figma oficial: https://www.figma.com/design/Y12BnmOuhShBxVckf6J8gg/UniRide-Design?node-id=0-1
- Framework: Angular 22
- Lenguaje: TypeScript
- UI: Angular Material
- Estilos: CSS y SCSS
- Gestor de paquetes: npm
- Control de versiones: Git y GitHub
- Rama principal: main
- Rama de integración: develop
- Agente de desarrollo: Codex CLI
- Conexión con Figma: MCP

El backend de UniRide se encuentra en un repositorio independiente y está desarrollado con Spring Boot y PostgreSQL.

La integración con el backend se realizará después de completar y verificar las interfaces correspondientes.

## 2. Fuentes de referencia

Las fuentes principales para el desarrollo son:

1. Este archivo SPEC.md.
2. El Figma oficial de UniRide.
3. La guía global de estilos del proyecto.
4. El informe del proyecto y sus User Stories.
5. La estructura existente del repositorio Angular.

No utilizar diseños, rutas, componentes o nombres procedentes del proyecto de ejemplo EventSales.

Cuando existan diferencias entre una pantalla de Figma y las reglas globales de diseño, se debe comunicar la inconsistencia antes de implementar cambios.

No modificar pantallas de otros integrantes sin coordinación.

## 3. Organización del equipo

Las funcionalidades se encuentran distribuidas de la siguiente manera:

### Renzo Arbulú

- US01–US05: Autenticación, registro, roles y perfiles.
- US23–US24: Gestión de cursos y horarios académicos.
- US30: Búsqueda de viajes mediante lenguaje natural.

### José Quispe

- US06–US09: Publicación y administración de rutas.
- US10–US13: Búsqueda y solicitudes de viajes.
- US31: Gestión de viajes y solicitudes mediante lenguaje natural.

### Sebastián Córdova

- US14–US16: Solicitudes recibidas, aceptación y rechazo.
- US17–US18: Confirmación y cancelación de viajes.
- US25: Notificaciones por correo.

### Ian Landauro

- US19: Número total de viajes realizados.
- US20: Frecuencia de viajes por día de la semana.
- US21: Rutas más utilizadas.
- US22: Exportación de historial personal en PDF.
- US26: Registro de métodos de compensación.
- US27: Actualización de métodos de compensación.
- US28: Eliminación de métodos de compensación.
- US29: Sugerencia de contribución estimada.

Las User Stories son la referencia funcional.

Varias historias pueden representarse mediante una misma pantalla cuando forman parte de un flujo común.

No crear una pantalla independiente por cada User Story si la funcionalidad corresponde a una sección, diálogo o estado de otra pantalla.

## 4. Organización de las pantallas

El frontend contempla los siguientes grupos principales:

### Autenticación

Registro, inicio de sesión, verificación de cuenta y administración del perfil.

### Conductor

Publicación de rutas, gestión de viajes, solicitudes recibidas, estadísticas y otras funcionalidades relacionadas con el conductor.

### Pasajero

Búsqueda de viajes, solicitudes, información de viajes, estadísticas y contribuciones.

### Funcionalidades compartidas

Aquellas que pueden utilizar tanto conductores como pasajeros deben diseñarse evitando duplicaciones innecesarias.

Por ejemplo, la gestión de métodos de compensación y las estadísticas personales deben contemplar los permisos y necesidades de ambos roles.

La ubicación definitiva de estas pantallas en Angular se establecerá al preparar la base compartida del frontend.

## 5. Estructura del proyecto

Mantener una estructura organizada por funcionalidades y roles.

Estructura general:

```text
src/
├── app/
│   ├── app.routes.ts
│   ├── home/
│   ├── layouts/
│   │   ├── auth-layout/
│   │   ├── conductor-layout/
│   │   └── pasajero-layout/
│   └── pages/
│       ├── auth/
│       ├── conductor/
│       │   ├── rutas/
│       │   └── viajes/
│       └── pasajero/
│           └── viajes/
├── styles.css
└── material-theme.scss
```

Esta estructura representa la organización general y los módulos que ya se están desarrollando.

Las carpetas adicionales para estadísticas, historial y compensaciones se definirán después de aprobar el Design System y revisar las rutas compartidas.

Reglas de estructura:

- Mantener componentes standalone.
- Organizar las pantallas por funcionalidad.
- Utilizar nombres en minúsculas y separados por guiones.
- Cada pantalla debe tener sus archivos TypeScript, HTML y CSS.
- Utilizar rutas hijas cuando corresponda.
- Reutilizar los layouts existentes.
- No crear layouts duplicados para el mismo rol.
- No crear rutas que entren en conflicto con las de otros módulos.
- No sobrescribir archivos de otros integrantes sin revisión.
- No reorganizar carpetas existentes sin coordinación previa.

## 6. Design System global

UniRide debe utilizar una guía de estilos compartida para asegurar la consistencia visual de todas las pantallas.

La guía global está documentada en la página `00 · Design System — UniRide` del archivo oficial de Figma.

También deberá tener una implementación equivalente en los archivos globales de Angular.

Figma es la fuente de verdad para los valores visuales. La implementación en Angular debe reproducir sus variables, estilos, variantes y criterios responsivos sin crear una paleta o escala paralela.

### 6.1. Colección de variables

La colección local utilizada por el Design System es `Sebastián / Coordinación UI` y actualmente contiene un único modo: `Light`.

No existe todavía un modo oscuro. No simularlo ni implementarlo hasta que se defina en Figma.

La colección contiene variables primitivas y alias semánticos. En la implementación deben utilizarse los nombres semánticos siempre que sea posible.

### 6.2. Colores

| Variable semántica | Valor | Aplicación principal |
|---|---:|---|
| `color/primary` | `#4F46E5` | Acciones principales, selección y foco |
| `color/ink` | `#1E293B` | Texto y contenido principal |
| `color/accent` | `#10B981` | Acentos positivos |
| `color/background` | `#F8FAFC` | Fondo general de la aplicación |
| `color/surface` | `#FFFFFF` | Tarjetas, campos y superficies elevadas |
| `color/muted` | `#64748B` | Texto secundario |
| `color/border` | `#E2E8F0` | Bordes y divisores |
| `color/primarySoft` | `#EEF2FF` | Fondos seleccionados o informativos |
| `color/successSoft` | `#ECFDF5` | Fondo de estado exitoso |
| `color/successText` | `#047857` | Texto de estado exitoso |
| `color/warningSoft` | `#FFFBEB` | Fondo de advertencia |
| `color/warningText` | `#92400E` | Texto de advertencia |
| `color/danger` | `#DC2626` | Error y acciones destructivas |
| `color/dangerSoft` | `#FEF2F2` | Fondo de error |

Estos colores constituyen la base visual existente.

No cambiar, duplicar ni ampliar la paleta arbitrariamente. Valores cercanos presentes en frames anteriores deben mapearse al token semántico correspondiente al implementar pantallas nuevas.

### 6.3. Tipografía

La familia tipográfica global definida en el Design System es `Roboto`.

Los frames antiguos de autenticación que todavía utilizan Inter se consideran una diferencia heredada del archivo y no una segunda escala global. No se deben modificar esos frames sin coordinación, pero las implementaciones nuevas deben emplear la escala global de Roboto.

| Estilo de Figma | Fuente | Tamaño | Interlineado |
|---|---|---:|---:|
| `Typography/Display` | Roboto Bold | 36 px | 44 px |
| `Typography/Page title` | Roboto Bold | 28 px | 39 px |
| `Typography/Section title` | Roboto Bold | 22 px | 31 px |
| `Typography/Card title` | Roboto Bold | 18 px | 25 px |
| `Typography/Body` | Roboto Regular | 14 px | 20 px |
| `Typography/Body strong` | Roboto Medium | 14 px | 20 px |
| `Typography/Body small` | Roboto Regular | 13 px | 18 px |
| `Typography/Label` | Roboto Medium | 12 px | 17 px |
| `Typography/Caption` | Roboto Regular | 12 px | 17 px |

No introducir nuevas familias ni combinaciones tipográficas sin incorporarlas primero al Design System de Figma.

### 6.4. Espaciados, radios y tamaños

Escala de espaciado:

- `spacing/4`: 4 px.
- `spacing/8`: 8 px.
- `spacing/12`: 12 px.
- `spacing/16`: 16 px.
- `spacing/20`: 20 px.
- `spacing/24`: 24 px.
- `spacing/32`: 32 px.
- `spacing/48`: 48 px.

Escala de radios:

- `radius/6`: 6 px.
- `radius/8`: 8 px.
- `radius/12`: 12 px.
- `radius/16`: 16 px.
- `radius/24`: 24 px.
- `radius/pill`: 9999 px.

Tamaños funcionales:

- `size/control/compact`: 40 px.
- `size/control/default`: 48 px.
- `size/layout/sidebar`: 240 px.
- `size/icon/sm`: 16 px.
- `size/icon/md`: 20 px.
- `size/icon/lg`: 24 px.

Los valores de altura de control, iconografía y layout no deben reutilizarse como espaciados por el solo hecho de compartir el mismo valor numérico.

### 6.5. Elevaciones

Los estilos de efecto definidos en Figma son:

- `Elevation/Subtle`: separación ligera para superficies y tarjetas discretas.
- `Elevation/Card`: elevación estándar de tarjetas destacadas.
- `Elevation/Modal`: elevación de diálogos sobre contenido bloqueado.

No crear sombras diferentes por pantalla. Se debe utilizar el nivel semántico que corresponda.

### 6.6. Componentes globales existentes

#### Button

Variantes:

- Style: `Primary`, `Secondary`, `Destructive`.
- State: `Default`, `Hover`, `Disabled`.
- Size: `Compact` de 40 px y `Default` de 48 px.

Debe existir como máximo una acción primaria por región. `Destructive` se reserva para acciones con consecuencias reales.

#### Text Field

Estados:

- `Default`.
- `Focus`.
- `Error`.
- `Disabled`.

La etiqueta debe permanecer visible. Los errores deben incluir un mensaje textual y no depender únicamente del color.

#### Badge

Tonos:

- `Neutral`.
- `Info`.
- `Success`.
- `Warning`.
- `Danger`.

Los badges comunican estado; no deben utilizarse como botones o enlaces.

#### Card

Variantes:

- `Standard`: contenido general.
- `Route`: rutas publicadas.
- `Trip`: coordinación y resumen de viajes.

#### Dialog

Variantes:

- `Confirmation`.
- `Success`.
- `Destructive`.

En móvil, el diálogo debe ocupar el ancho disponible dejando un margen lateral de 16 px.

#### Navegación

El componente existente `Layout/Sidebar Conductor` se conserva y no debe duplicarse. El ancho de referencia del sidebar es 240 px.

Los componentes globales se deben reutilizar antes de crear estructuras manuales equivalentes. Card y Dialog reutilizan Button y Badge internamente.

### 6.7. Elementos todavía no consolidados como componentes

Los siguientes patrones aparecen en las pantallas, pero todavía no forman parte de la biblioteca global creada:

- Selectores.
- Checkbox y radio.
- Tablas y listas completas.
- Paginación.
- Estados vacíos.
- Navegación móvil.
- Sidebar de pasajero como componente local documentado.

Cuando una tarea necesite uno de estos elementos, se debe revisar primero el frame correspondiente y coordinar su incorporación al Design System. No asumir que ya existe una variante global.

### 6.8. Implementación en Angular

Los estilos globales deberán centralizarse principalmente en:

- src/styles.css
- src/material-theme.scss

No crear sistemas de colores independientes por pantalla.

No sobrescribir el tema global para resolver necesidades particulares de un módulo.

Los nombres de tokens implementados en CSS o SCSS deben mantener una correspondencia explícita con las variables semánticas de Figma. Angular Material puede adaptarse mediante el tema global, pero no debe introducir colores, tipografías, radios o elevaciones incompatibles con esta especificación.

La implementación de la base visual se realizará mediante un Pull Request específico hacia develop.

Durante la primera etapa se seguirán las restricciones del laboratorio: no crear una biblioteca adicional de componentes Angular sin aprobación. Los layouts y estilos compartidos sí forman parte de la base del proyecto.

## 7. Alcance de la primera etapa del frontend

La primera etapa consiste en desarrollar y validar las interfaces siguiendo Figma.

### Permitido

- Componentes standalone.
- Angular Material.
- HTML y CSS.
- Reactive Forms.
- Validaciones simples.
- Mensajes de error.
- Navegación mediante routerLink.
- Listas con datos de ejemplo.
- Contadores con valores fijos.
- Estados visuales.
- Diseño responsivo.

### No implementar todavía

- Peticiones HTTP al backend.
- Servicios de integración.
- Autenticación real con JWT.
- Persistencia de datos.
- Lógica de negocio.
- Cálculos de contribuciones.
- Filtros reales.
- Búsquedas reales.
- Descargas reales de PDF.
- Generación de contenido dinámico mediante código.

Las funcionalidades anteriores se integrarán en una etapa posterior.

### Gráficos

Las pantallas de estadísticas deben representar visualmente los gráficos definidos en Figma.

Durante esta primera etapa se pueden utilizar marcadores visuales o datos estáticos, según las indicaciones del laboratorio.

La elección e integración de una librería de gráficos se confirmará cuando corresponda implementar la funcionalidad.

## 8. Reglas de Angular

- Utilizar componentes standalone.
- Mantener archivos .ts, .html y .css por pantalla.
- Usar nombres en minúsculas y separados por guiones.
- Utilizar @if, @for y @switch.
- En @for, incluir siempre track.
- No utilizar *ngIf, *ngFor ni ngSwitch.
- Utilizar Angular Material cuando exista un componente apropiado.
- No reemplazar componentes de Material por implementaciones manuales sin justificación.

### Formularios

Utilizar Reactive Forms:

- FormGroup.
- FormControl.
- formControlName.
- Validators.

Aplicar validaciones como:

- required.
- email.
- minLength.
- Otras validaciones simples necesarias según la pantalla.

Mostrar errores debajo del campo correspondiente.

Utilizar mat-error cuando se empleen formularios de Angular Material.

Deshabilitar acciones de confirmación cuando el formulario sea inválido.

### Navegación

Utilizar routerLink para las conexiones entre pantallas.

No implementar lógica de navegación mediante servicios durante la primera etapa.

### Estados alternativos

Los estados de error, vacío, confirmación o rechazo deben corresponder a los escenarios definidos en las User Stories.

No convertir automáticamente cada estado en una ruta independiente.

Representarlos como variantes o estados de la pantalla correspondiente cuando sea apropiado.

## 9. Diseño responsivo

Los criterios definidos en la página del Design System son:

### Escritorio

- Breakpoint de referencia: 1024 px o más.
- Frame de referencia: 1440 × 1024 px.
- Sidebar: 240 px.
- Área principal: 1200 px.
- Contenido interior habitual: 1136 px.

### Tablet

- Rango de referencia: 768–1023 px.
- Sidebar colapsable.
- Columnas adaptativas.
- Formularios de una o dos columnas según el espacio disponible.

### Móvil

- Rango de referencia: 320–767 px.
- Frame utilizado en Figma: 390 px de ancho.
- Padding lateral habitual: 16 px.
- Flujo principal vertical.
- Controles táctiles de al menos 48 px.
- Acciones principales de ancho completo cuando corresponda.

Cada pantalla debe verificarse al menos en:

- Escritorio.
- Dispositivos móviles.

El diseño debe conservar:

- Jerarquía visual.
- Legibilidad.
- Espaciados consistentes.
- Navegación accesible.
- Formularios utilizables.
- Correcta distribución de tarjetas y listas.

No asumir que una pantalla de escritorio es responsiva sin comprobarla.

Cuando no exista una versión móvil en Figma, solicitar orientación antes de inventar una composición definitiva.

## 10. Flujo de trabajo con Codex

Antes de implementar cualquier pantalla:

1. Leer SPEC.md.
2. Identificar la User Story correspondiente.
3. Localizar el frame exacto en Figma.
4. Revisar el Design System global.
5. Comprobar los componentes, layouts y rutas existentes.
6. Verificar que la rama de trabajo parte de develop.

El agente debe trabajar únicamente en las funcionalidades solicitadas.

Al finalizar deberá informar:

- Archivos creados.
- Archivos modificados.
- Rutas incorporadas.
- Componentes reutilizados.
- Validaciones realizadas.
- Resultado de la compilación.
- Funcionalidades pendientes.

No modificar archivos ajenos a la tarea sin justificación y autorización.

## 11. Flujo de Git y GitHub

Ramas:

- main: versión principal estable.
- develop: integración del trabajo del equipo.
- feature/*: desarrollo de pantallas y funcionalidades.
- chore/*: configuración y tareas técnicas compartidas.

Proceso:

1. Actualizar develop.
2. Crear una rama de trabajo desde develop.
3. Implementar una pantalla o conjunto funcional.
4. Revisar el resultado.
5. Ejecutar la compilación.
6. Crear un commit descriptivo.
7. Subir la rama a GitHub.
8. Crear un Pull Request hacia develop.
9. Solicitar revisión.
10. Fusionar después de aprobar los cambios.

No realizar implementaciones de pantallas directamente en main.

No sobrescribir cambios de otros integrantes.

### Commits

Utilizar mensajes descriptivos:

- feat(reportes): agrega pantalla de estadísticas
- feat(compensaciones): agrega gestión de métodos
- fix(rutas): corrige diseño móvil
- style(auth): ajusta estilos del formulario
- chore(ui): configura tema global
- docs(spec): actualiza especificación del frontend

## 12. Validación

Antes de crear un Pull Request:

- Comprobar que la pantalla corresponde al frame de Figma.
- Revisar la presentación en escritorio y móvil.
- Comprobar los mensajes de error de formularios.
- Verificar la navegación.
- Comprobar que no se modificaron otros módulos innecesariamente.
- Ejecutar npm run build.
- Corregir los errores de compilación.

La implementación del agente debe ser revisada por el integrante responsable.

## 13. Evidencias

Cada integrante deberá conservar evidencias de su trabajo:

- Identificador de la User Story.
- Enlace al frame de Figma.
- Capturas del diseño.
- Capturas de la pantalla Angular.
- Resultado de la compilación.
- Commits relevantes.
- Enlace al Pull Request.
- Observaciones y correcciones realizadas.

Estas evidencias se utilizarán en el informe del proyecto, especialmente en el apartado correspondiente al Sprint 2 — Frontend.

## 14. Reglas finales

- Respetar el Figma oficial.
- Seguir el Design System global.
- No inventar nuevas pantallas.
- No duplicar funcionalidades.
- No introducir estilos independientes sin justificación.
- No implementar servicios del backend durante la primera etapa visual.
- Mantener la organización de carpetas.
- Trabajar mediante ramas y Pull Requests.
- Consultar antes de modificar elementos compartidos.

Ante cualquier duda, revisar primero SPEC.md, Figma y las User Stories.

---

## Referencia de Endpoints

El API URL base es el siguiente: `http://localhost:8080/api`

## Módulo 1 — Usuarios, sesión, perfil y horarios

### Autorización por rol

UniRide utiliza una única cuenta por usuario con un rol activo que puede
alternarse entre `CONDUCTOR` y `PASAJERO`.

El cambio de rol no crea una segunda cuenta ni elimina rutas, solicitudes
o historial anteriores.

El rol activo puede modificarse mediante:

`PUT /api/usuarios/rol`

#### CONDUCTOR

Puede gestionar rutas y viajes propios, revisar solicitudes recibidas,
confirmar, iniciar y completar viajes.

#### PASAJERO

Puede buscar viajes disponibles, crear y gestionar solicitudes y consultar
sugerencias de contribución.

#### Funcionalidades compartidas

Perfil, horarios académicos, métodos de compensación, historial,
estadísticas generales y cancelación de viajes según participación.

Los endpoints restringidos responden `403 Forbidden` cuando el usuario
autenticado no posee el rol requerido.

### Autenticación (público)

#### `POST /api/auth/registro`

Crea una cuenta nueva y envía el código de verificación por correo (US01).

**Body (JSON)**

```json
{
  "correo": "juan.perez@upc.edu.pe",
  "contrasena": "MoviUni2026!",
  "nombre": "Juan",
  "apellidos": "Pérez",
  "telefono": "987 654 321",
  "rol": "CONDUCTOR",
  "aceptaTerminos": true
}
```

| Campo            | Tipo       | Obligatorio | Detalle                                                               |
| ---------------- | ---------- | ----------- | --------------------------------------------------------------------- |
| `correo`         | string     | ✅          | Debe ser institucional con `.edu` después del `@`                     |
| `contrasena`     | string     | ✅          | Mín. 8 caracteres, una mayúscula, una minúscula y un número o símbolo |
| `nombre`         | string     | ✅          |                                                                       |
| `apellidos`      | string     | ✅          |                                                                       |
| `telefono`       | string     | ✅          | Formato `+`, dígitos, espacios o guiones (6–15 caracteres)            |
| `rol`            | enum `Rol` | ✅          | `CONDUCTOR` o `PASAJERO`                                              |
| `aceptaTerminos` | boolean    | ✅          | Debe ser `true`                                                       |

**Respuestas:** `201` ✅ `{token, mensaje, usuario}` · `400` campos inválidos · `409` correo o teléfono ya registrado

#### `POST /api/auth/login`

Inicia sesión y devuelve el token JWT (US02).

**Body (JSON)**

```json
{
  "correo": "juan.perez@upc.edu.pe",
  "contrasena": "MoviUni2026!"
}
```

| Campo        | Tipo   | Obligatorio |
| ------------ | ------ | ----------- |
| `correo`     | string | ✅          |
| `contrasena` | string | ✅          |

**Respuestas:** `200` ✅ `{token, mensaje, usuario}` · `400` campos vacíos · `401` "Correo o contraseña incorrectos" · `409` cuenta no verificada o sin rol principal

#### `POST /api/auth/verificar`

Confirma el código de verificación enviado al correo (US02 / US01).

**Body (JSON)**

```json
{ "correo": "juan.perez@upc.edu.pe", "codigo": "123456" }
```

| Campo    | Tipo   | Obligatorio |
| -------- | ------ | ----------- |
| `correo` | string | ✅          |
| `codigo` | string | ✅          |

**Respuestas:** `200` ✅ cuenta verificada · `400` código incorrecto · `404` no existe ninguna cuenta con ese correo · `409` cuenta ya verificada o código expirado

#### `POST /api/auth/reenviar-codigo`

Reenvía el código de verificación al correo.

**Body (JSON)**

```json
{ "correo": "juan.perez@upc.edu.pe" }
```

**Respuestas:** `200` ✅ código reenviado · `404` no existe ninguna cuenta con ese correo · `409` cuenta ya verificada

### Usuario

#### `GET /api/usuarios/me`

Devuelve el usuario autenticado (US03).

**Parámetros:** ninguno.

**Respuestas:** `200` ✅ `{id, correo, nombre, apellidos, telefono, rol, cuentaVerificada}` · `403` sin token

#### `PUT /api/usuarios/rol`

Cambia el rol activo de la cuenta entre `CONDUCTOR` y `PASAJERO`
sin crear una cuenta adicional.

**Body**

```json
{
  "rol": "PASAJERO"
}
```

| Campo | Tipo       | Obligatorio |
| ----- | ---------- | ----------- |
| `rol` | enum `Rol` | ✅          |

**Respuestas:** `200` ✅ usuario actualizado · `400` rol ausente · `403` sin token

### Perfil

#### `GET /api/perfil`

Devuelve el perfil del usuario autenticado (US04).

**Parámetros:** ninguno.

**Respuestas:** `200` ✅ perfil · `404` "Aún no has completado tu perfil" · `403` sin token

#### `GET /api/perfil/usuario/{usuarioId}`

Devuelve el perfil de otro usuario (para evaluar solicitudes recibidas — US14).

| Path        | Tipo |
| ----------- | ---- |
| `usuarioId` | long |

**Respuestas:** `200` ✅ perfil · `404` perfil no encontrado · `403` sin token

#### `PUT /api/perfil`

Guarda los datos personales del perfil (US04).

**Body (JSON)**

```json
{
  "nombre": "Juan",
  "apellidos": "Pérez",
  "carrera": "Ingeniería de Software",
  "distrito": "San Borja",
  "universidad": "UPC",
  "diasDisponibles": "Lunes, Miércoles, Viernes",
  "horariosDisponibles": "07:00 - 09:00",
  "fechaInicioClases": "2026-08-04",
  "fechaFinClases": "2026-12-19",
  "metodoCompensacionFavorito": "GASOLINA"
}
```

| Campo                        | Tipo                    | Obligatorio      | Detalle                                         |
| ---------------------------- | ----------------------- | ---------------- | ----------------------------------------------- |
| `nombre`                     | string                  | ✅               |                                                 |
| `apellidos`                  | string                  | ✅               |                                                 |
| `carrera`                    | string                  | ✅               |                                                 |
| `distrito`                   | string                  | ✅               |                                                 |
| `universidad`                | string                  | ✅               | Se usa como **destino** automático de las rutas |
| `diasDisponibles`            | string                  | ✅               | Texto libre                                     |
| `horariosDisponibles`        | string                  | ✅               | Texto libre                                     |
| `fechaInicioClases`          | date (`yyyy-MM-dd`)     | ✅               |                                                 |
| `fechaFinClases`             | date (`yyyy-MM-dd`)     | ✅               |                                                 |
| `metodoCompensacionFavorito` | enum `TipoCompensacion` | Solo conductores | Obligatorio si el rol principal es `CONDUCTOR`  |

**Respuestas:** `200` ✅ perfil actualizado · `400` campos faltantes o método favorito ausente en conductor · `403` sin token

#### `PUT /api/perfil/info-adicional`

Guarda gustos, hobbies y datos curiosos (US05).

**Body (JSON)**

```json
{
  "gustos": "Música rock, series de ciencia ficción",
  "hobbies": "Tocar guitarra, videojuegos",
  "datosCuriosos": "Hice un intercambio en Chile"
}
```

| Campo           | Tipo   | Obligatorio |
| --------------- | ------ | ----------- |
| `gustos`        | string | ❌          |
| `hobbies`       | string | ❌          |
| `datosCuriosos` | string | ❌          |

**Respuestas:** `200` ✅ perfil actualizado · `404` "Primero completa tu perfil personal" · `403` sin token

### Cursos y horarios

#### `POST /api/perfil/cursos`

Agrega cursos y horarios manualmente, en lote (US24).

**Body (JSON):** **array** de cursos

```json
[
  {
    "nombre": "Ingeniería de Software",
    "dia": "Lunes",
    "horaInicio": "08:00:00",
    "horaFin": "10:00:00"
  },
  {
    "nombre": "Bases de Datos",
    "dia": "Miércoles",
    "horaInicio": "10:00:00",
    "horaFin": "12:00:00"
  }
]
```

| Campo        | Tipo                        | Obligatorio | Detalle                           |
| ------------ | --------------------------- | ----------- | --------------------------------- |
| `nombre`     | string                      | ✅          |                                   |
| `dia`        | string                      | ✅          |                                   |
| `horaInicio` | time (`HH:mm:ss` o `HH:mm`) | ✅          |                                   |
| `horaFin`    | time (`HH:mm:ss` o `HH:mm`) | ✅          | Debe ser posterior a `horaInicio` |

**Respuestas:** `201` ✅ lista de cursos creados · `400` lista vacía o campo de algún curso incompleto/inválido · `403` sin token

#### `GET /api/perfil/cursos`

Lista los cursos del usuario con paginación.

| Query  | Tipo | Defecto |
| ------ | ---- | ------- |
| `page` | int  | `0`     |
| `size` | int  | `10`    |

**Respuestas:** `200` ✅ `Page<CursoRespuesta>` (ordenado por día) · `403` sin token

#### `DELETE /api/perfil/cursos/{id}`

Elimina un curso (US24).

| Path | Tipo |
| ---- | ---- |
| `id` | long |

**Respuestas:** `204` ✅ · `404` curso no encontrado · `403` sin token

#### `POST /api/perfil/horarios/archivo`

Sube masivamente cursos y horarios desde un archivo PDF o TXT (US23).

**Body:** `multipart/form-data` con el campo `archivo`

| Regla       | Detalle         |
| ----------- | --------------- |
| Formatos    | `.pdf` o `.txt` |
| Tamaño máx. | 1 MB            |

**Respuestas:** `201` ✅ `{mensaje, cursosImportados, cursosOmitidos, nombreArchivo}` · `400` sin archivo, formato no permitido o tamaño mayor a 1 MB · `403` sin token

---

## Módulo 2 — Rutas y viajes publicados

#### `POST /api/rutas`

Publica una ruta como conductor (US06). El **destino** se toma automáticamente de la `universidad` del perfil.

**Body (JSON)**

```json
{
  "origen": "San Borja",
  "capacidadMaxima": 3,
  "puntosReferencia": "Av. Arequipa 1234",
  "zonasSinParada": "Centro de Lima",
  "notaContribucion": "S/ 10 sugeridos por pasajero"
}
```

| Campo              | Tipo   | Obligatorio | Detalle                                       |
| ------------------ | ------ | ----------- | --------------------------------------------- |
| `origen`           | string | ✅          | Punto de salida                               |
| `capacidadMaxima`  | int    | ✅          | Mínimo `1`                                    |
| `puntosReferencia` | string | ✅          |                                               |
| `zonasSinParada`   | string | ❌          |                                               |
| `notaContribucion` | string | ❌          | Referencia no obligatoria (US06, alternativo) |

**Respuestas:** `201` ✅ ruta creada (estado `ACTIVA`) · `400` campos faltantes o perfil sin universidad · `403` rol distinto de `CONDUCTOR` · `404` perfil inexistente

#### `GET /api/rutas`

Lista **mis rutas** publicadas con filtros (US09).

| Query    | Tipo              | Defecto | Detalle                                        |
| -------- | ----------------- | ------- | ---------------------------------------------- |
| `estado` | enum `EstadoRuta` | –       | Filtro opcional (`ACTIVA`, `LLENA`, `VENCIDA`) |
| `page`   | int               | `0`     |                                                |
| `size`   | int               | `10`    |                                                |

**Respuestas:** `200` ✅ `Page<RutaRespuesta>` (vacío si no hay rutas) · `400` enum inválido · `403` sin token

#### `PUT /api/rutas/{id}`

Edita una ruta propia (US07).

| Path | Tipo |
| ---- | ---- |
| `id` | long |

**Body (JSON):** mismo esquema que `POST /api/rutas`.

**Respuestas:** `200` ✅ ruta actualizada · `400` campos inválidos · `404` ruta inexistente o ajena · `403` sin token

#### `DELETE /api/rutas/{id}`

Elimina una ruta propia (US08).

| Path | Tipo |
| ---- | ---- |
| `id` | long |

**Respuestas:** `204` ✅ · `404` ruta inexistente o ajena · `403` sin token

#### `POST /api/rutas/{rutaId}/viajes`

Genera un viaje programado a partir de una ruta propia (el día se calcula de la fecha).

**Body (JSON)**

```json
{
  "fecha": "2026-10-12",
  "hora": "07:30:00"
}
```

| Campo   | Tipo                        | Obligatorio                    |
| ------- | --------------------------- | ------------------------------ |
| `fecha` | date (`yyyy-MM-dd`)         | ✅ — no puede ser en el pasado |
| `hora`  | time (`HH:mm:ss` o `HH:mm`) | ✅                             |

**Respuestas:** `201` ✅ viaje creado en estado `PROGRAMADO` · `400` campos faltantes o fecha en el pasado · `404` ruta inexistente o ajena · `403` sin token

#### `GET /api/rutas/{rutaId}/viajes`

Lista los viajes de una ruta propia.

| Path     | Tipo |
| -------- | ---- |
| `rutaId` | long |

| Query  | Tipo | Defecto |
| ------ | ---- | ------- |
| `page` | int  | `0`     |
| `size` | int  | `10`    |

**Respuestas:** `200` ✅ `Page<ViajeRespuesta>` · `404` ruta inexistente o ajena · `403` sin token

---

## Módulo 3 — Búsqueda y solicitudes (pasajero)

#### `GET /api/viajes/buscar`

Busca viajes disponibles filtrando por origen, destino, día, hora y cercanía (US10). Solo viajes en estado `PROGRAMADO`.

| Query      | Tipo                        | Defecto | Detalle                                                     |
| ---------- | --------------------------- | ------- | ----------------------------------------------------------- |
| `origen`   | string                      | –       | Opcional, sin distinción de mayúsculas                      |
| `destino`  | string                      | –       | Opcional                                                    |
| `dia`      | string                      | –       | Opcional (ej. `Lunes`)                                      |
| `hora`     | time (`HH:mm` o `HH:mm:ss`) | –       | Opcional                                                    |
| `cercania` | boolean                     | `false` | `true` = por distrito del perfil (requiere perfil completo) |
| `page`     | int                         | `0`     |                                                             |
| `size`     | int                         | `10`    |                                                             |

**Respuestas:** `200` ✅ `Page<BusquedaRespuesta>` (con `notaContribucion` de la ruta) · `400` `hora` con formato inválido · `404` perfil incompleto al usar `cercania=true` · `403` sin token

#### `POST /api/solicitudes/viajes/{viajeId}`

Envía una solicitud para unirse a un viaje, con preferencia de compensación y método opcional (US11).

| Path      | Tipo |
| --------- | ---- |
| `viajeId` | long |

**Body (JSON)**

```json
{
  "mensaje": "¡Hola! Me interesa unirme a tu viaje.",
  "preferenciaCompensacion": "DINERO",
  "metodoCompensacionId": 1
}
```

| Campo                     | Tipo                    | Obligatorio | Detalle                                                                            |
| ------------------------- | ----------------------- | ----------- | ---------------------------------------------------------------------------------- |
| `mensaje`                 | string                  | ❌          |                                                                                    |
| `preferenciaCompensacion` | enum `TipoCompensacion` | ✅          |                                                                                    |
| `metodoCompensacionId`    | long                    | ❌          | Método propio; si se envía, su `tipo` debe coincidir con `preferenciaCompensacion` |

**Respuestas**

- `201` ✅ solicitud en estado `PENDIENTE` (incluye `advertencia` si la preferencia difiere de la del conductor)
- `400` campos inválidos
- `404` viaje no encontrado, o método de compensación inexistente/ajeno
- `409` viaje propio · viaje ya ocurrido · viaje no `PROGRAMADO` · solicitud duplicada · sin cupos · método desactivado · método que no coincide con la preferencia

#### `GET /api/solicitudes`

Lista mis solicitudes enviadas con su estado (US13).

| Query    | Tipo                   | Defecto | Detalle         |
| -------- | ---------------------- | ------- | --------------- |
| `estado` | enum `EstadoSolicitud` | –       | Filtro opcional |
| `page`   | int                    | `0`     |                 |
| `size`   | int                    | `10`    |                 |

**Respuestas:** `200` ✅ `Page<SolicitudRespuesta>` · `400` enum inválido · `403` sin token

#### `PUT /api/solicitudes/{id}/cancelar`

Cancela una solicitud propia pendiente (US12).

| Path | Tipo |
| ---- | ---- |
| `id` | long |

**Respuestas:** `200` ✅ solicitud `CANCELADA` + notificación al conductor · `404` solicitud inexistente o ajena · `409` solicitud no pendiente · viaje no `PROGRAMADO` · viaje ya ocurrió

#### `PUT /api/solicitudes/{id}/aceptar`

Acepta una solicitud (conductor) y genera el borrador de acuerdo de compensación (US15).

| Path | Tipo |
| ---- | ---- |
| `id` | long |

**Respuestas:** `200` ✅ solicitud `ACEPTADA` con `acuerdoTerminos` y `acuerdoEstado=BORRADOR`; consume un cupo · `404` solicitud inexistente o ajena · `409` solicitud ya procesada · viaje no activo · ruta sin cupos

#### `PUT /api/solicitudes/{id}/rechazar`

Rechaza una solicitud con motivo opcional (US16).

| Path | Tipo |
| ---- | ---- |
| `id` | long |

**Body (JSON)** — **opcional**

```json
{ "motivo": "No puedo hacer el paro ese día" }
```

| Campo    | Tipo   | Obligatorio |
| -------- | ------ | ----------- |
| `motivo` | string | ❌          |

**Respuestas:** `200` ✅ solicitud `RECHAZADA` (notifica al pasajero) · `404` solicitud inexistente o ajena · `409` solicitud ya procesada o viaje no activo

#### `PUT /api/solicitudes/rechazar-multiples`

Rechaza varias solicitudes en lote con el mismo motivo (US16, alternativo).

**Body (JSON)**

```json
{
  "ids": [15, 16, 17],
  "motivo": "La ruta ya está completa"
}
```

| Campo    | Tipo          | Obligatorio       |
| -------- | ------------- | ----------------- |
| `ids`    | array de long | ✅ — al menos uno |
| `motivo` | string        | ❌                |

**Respuestas:** `200` ✅ lista de solicitudes rechazadas · `400` `ids` vacío · `404` alguna solicitud inexistente o ajena · `409` alguna solicitud ya procesada

---

## Módulo 4 — Coordinación del viaje (conductor)

#### `GET /api/viajes/{viajeId}/solicitudes`

Lista las solicitudes recibidas de un viaje propio, con el perfil del pasajero (US14).

| Path      | Tipo |
| --------- | ---- |
| `viajeId` | long |

| Query    | Tipo                   | Defecto | Detalle         |
| -------- | ---------------------- | ------- | --------------- |
| `estado` | enum `EstadoSolicitud` | –       | Filtro opcional |
| `page`   | int                    | `0`     |                 |
| `size`   | int                    | `10`    |                 |

**Respuestas:** `200` ✅ `Page<SolicitudRespuesta>` (incluye `pasajeroCarrera`, `pasajeroDistrito`, `metodoCompensacion*`) · `404` viaje inexistente o ajeno · `400` enum inválido · `403` sin token

#### `PUT /api/viajes/{id}/confirmar`

Confirma un viaje con al menos 12 horas de anticipación respecto a la salida (US17).

| Path | Tipo |
| ---- | ---- |
| `id` | long |

**Respuestas**

- `200` ✅ viaje confirmado y pasajeros aceptados notificados; si ya estaba confirmado, responde `200` indicando que el viaje ya había sido confirmado.
- `409` si quedan menos de 12 horas para la salida y el viaje continúa sin confirmar: el viaje pasa a `VENCIDO` y se registra una penalidad `LEVE`.
- `409` viaje no `PROGRAMADO` o viaje ya ocurrido.
- `404` viaje inexistente o ajeno.

> El backend ejecuta automáticamente una revisión periódica de los
> viajes pendientes de confirmación. Cuando un viaje se encuentra
> entre 12 y 20 horas de su salida y aún no ha sido confirmado,
> el sistema genera una única notificación de recordatorio para
> el conductor.

#### `PUT /api/viajes/{id}/iniciar`

Pasa el viaje a `EN_PROGRESO` (ciclo de vida: `PROGRAMADO → EN_PROGRESO`).

| Path | Tipo |
| ---- | ---- |
| `id` | long |

**Respuestas:** `200` ✅ estado `EN_PROGRESO` (notifica a conductor y pasajeros aceptados); si ya estaba iniciado, `200` con `mensaje` · `409` viaje no `PROGRAMADO` o no confirmado · `404` viaje inexistente o ajeno

#### `PUT /api/viajes/{id}/completar`

Pasa el viaje a `COMPLETADO` (`EN_PROGRESO → COMPLETADO`).

| Path | Tipo |
| ---- | ---- |
| `id` | long |

**Respuestas:** `200` ✅ estado `COMPLETADO` (notifica a todos); si ya estaba completado, `200` con `mensaje` · `409` viaje no está en `EN_PROGRESO` · `404` viaje inexistente o ajeno

#### `PUT /api/viajes/{id}/cancelar`

Cancela un viaje, con penalidad según la anticipación (US18).

| Path | Tipo |
| ---- | ---- |
| `id` | long |

**Respuestas**

- `200` ✅ viaje `CANCELADO` con notificación a todos los involucrados; si ya estaba cancelado, `200` con `mensaje: "El viaje ya estaba cancelado"`
- `403` si no es el conductor ni un pasajero con solicitud aceptada
- `409` viaje no `PROGRAMADO` o ya ocurrió · `404` viaje inexistente o ajeno

> Penalidad aplicada por el servicio según anticipación: **> 24 h** sin penalidad · **4–24 h** `LEVE` · **< 4 h** `GRAVE`.

#### `DELETE /api/viajes/{id}`

Elimina un viaje propio.

| Path | Tipo |
| ---- | ---- |
| `id` | long |

**Respuestas:** `204` ✅ (notifica al conductor) · `404` viaje inexistente o ajeno · `403` sin token

---

## Módulo 5 — Historial y estadísticas

#### `GET /api/estadisticas`

Totales de actividad del usuario autenticado (US19).

**Parámetros:** ninguno.

**Respuestas:** `200` ✅ `{viajesComoConductor, viajesComoPasajero, viajesCancelados, penalidadesAcumuladas}` · `403` sin token

#### `GET /api/estadisticas/semana`

Frecuencia de viajes por día de la semana (US20).

**Parámetros:** ninguno.

**Respuestas:** `200` ✅ `{suficientesDatos, mensaje, viajesPorDia[{dia, cantidad}], canceladosPorMi, canceladosPorTerceros}` — con menos de 5 viajes completados, `suficientesDatos: false` y el `mensaje` de "necesitas más datos" · `403` sin token

#### `GET /api/estadisticas/rutas`

Ranking de combinaciones origen–destino más usadas, con penalidades por ruta (US21, solo conductores).

**Parámetros:** ninguno.

**Respuestas:** `200` ✅ `{suficientesDatos, mensaje, ranking[{origen, destino, cantidad, penalidades}]}` · `403` sin token

#### `GET /api/historial/pdf`

Exporta el historial personal de viajes en PDF (US22).

| Query   | Tipo                | Defecto | Detalle                                                             |
| ------- | ------------------- | ------- | ------------------------------------------------------------------- |
| `desde` | date (`yyyy-MM-dd`) | –       | Filtro opcional                                                     |
| `hasta` | date (`yyyy-MM-dd`) | –       | Filtro opcional                                                     |
| `tipo`  | string              | `todos` | `todos` \| `conductor` \| `pasajero` (sin distinción de mayúsculas) |

**Respuestas:** `200` ✅ archivo PDF (`application/pdf`, `Content-Disposition: attachment`) · `400` `desde` posterior a `hasta` · `409` sin historial que exportar o `tipo` inválido · `403` sin token

---

## Módulo 6 — Notificaciones

**Sin endpoints REST.** Las notificaciones se generan internamente cuando el sistema procesa acciones (éxito/error/recordatorios) y se guardan en la tabla `notificaciones` junto con el envío de correo. No existe un controlador para consultarlas por API.

---

## Módulo 7 — Pagos y compensación

#### `GET /api/metodos-compensacion`

Lista mis métodos de compensación registrados (US26).

**Parámetros:** ninguno.

**Respuestas:** `200` ✅ lista `[{id, tipo, descripcion, activo}]` (no paginada) · `403` sin token

#### `POST /api/metodos-compensacion`

Registra un método de compensación (US26).

**Body (JSON)**

```json
{
  "tipo": "DINERO",
  "descripcion": "Yape - Juan Pérez",
  "activo": true
}
```

| Campo         | Tipo                    | Obligatorio | Detalle                                |
| ------------- | ----------------------- | ----------- | -------------------------------------- |
| `tipo`        | enum `TipoCompensacion` | ✅          |                                        |
| `descripcion` | string                  | ✅          | Ej. "Yape - Juan", "Visa \*\*\*\*1234" |
| `activo`      | boolean                 | ❌          | En el registro se fuerza `true`        |

**Respuestas:** `201` ✅ método creado (notificación de éxito) · `400` campos faltantes · `409` ya existe un método con el mismo `tipo` y `descripcion` (ignorando mayúsculas) · `403` sin token

#### `PUT /api/metodos-compensacion/{id}`

Actualiza un método propio (US27).

| Path | Tipo |
| ---- | ---- |
| `id` | long |

**Body (JSON):** mismo esquema que el registro (`tipo` y `descripcion` obligatorios).

**Respuestas:** `200` ✅ método actualizado · `400` campos incompletos (no modifica los datos anteriores) · `404` método inexistente o ajeno · `409` duplicado con otro método propio

#### `DELETE /api/metodos-compensacion/{id}`

Elimina un método propio (US28).

| Path | Tipo |
| ---- | ---- |
| `id` | long |

**Respuestas**

- `200` ✅ `{"mensaje": "Método de compensación eliminado correctamente"}` (nota: responde `200` con cuerpo, no `204`)
- `404` método inexistente o ajeno
- `409` "No puedes eliminar este método: está asociado a un viaje confirmado" (cuando una solicitud `ACEPTADA` con ese método pertenece a un viaje confirmado)

#### `GET /api/viajes/{id}/sugerencia-contribucion`

Sugerencia de contribución estimada para un viaje (US29).

| Path | Tipo                                |
| ---- | ----------------------------------- |
| `id` | long — viaje en estado `PROGRAMADO` |

| Query       | Tipo | Defecto | Detalle                                   |
| ----------- | ---- | ------- | ----------------------------------------- |
| `pasajeros` | int  | –       | **Obligatorio en la práctica** (mínimo 1) |

**Fórmula:** `total = S/8.00 × 1.5` si es hora pico (06:00–10:00 o 17:00–21:00), si no `× 1.0`; `aporte = total / pasajeros`.

**Respuestas**

- `200` ✅ `{viajeId, origen, destino, dia, fecha, hora, pasajeros, esHoraPico, costoTotalEstimado, aporteEstimado, litrosGasolinaAprox, sugerenciaFavor, nota}`
- `400` `pasajeros` ausente ("Debes indicar la cantidad de pasajeros para calcular la sugerencia") o menor a 1
- `404` viaje no encontrado
- `409` viaje no `PROGRAMADO`
- `403` sin token

---
