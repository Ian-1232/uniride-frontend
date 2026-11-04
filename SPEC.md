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

La guía global se documentará dentro del archivo oficial de Figma.

También deberá tener una implementación equivalente en los archivos globales de Angular.

### 6.1. Colores existentes

La paleta identificada actualmente en Figma incluye:

- Primario: #4F46E5
- Secundario: #1E293B
- Acento: #10B981
- Fondo general: #F8FAFC
- Superficie: #FFFFFF
- Bordes: #E2E8F0

Estos colores constituyen la base visual existente.

No cambiar ni ampliar la paleta arbitrariamente.

Los colores adicionales, sus nombres definitivos y sus aplicaciones se documentarán durante la consolidación del Design System.

### 6.2. Tipografía

Las pantallas existentes utilizan principalmente Roboto e Inter.

La tipografía global definitiva todavía debe ser acordada por el equipo y documentada en Figma.

Hasta entonces, no introducir nuevas familias tipográficas.

No sustituir masivamente las fuentes existentes sin aprobación.

### 6.3. Componentes visuales

La guía global deberá documentar:

- Botones y sus estados.
- Campos de formulario.
- Selectores.
- Tarjetas.
- Tablas y listas.
- Chips e indicadores.
- Modales y diálogos.
- Mensajes de error y confirmación.
- Barras de navegación.
- Sidebars.
- Estados vacíos.
- Espaciados.
- Bordes redondeados.
- Sombras.
- Adaptaciones responsivas.

Reutilizar los componentes y variables existentes en Figma antes de crear nuevos.

### 6.4. Implementación en Angular

Los estilos globales deberán centralizarse principalmente en:

- src/styles.css
- src/material-theme.scss

No crear sistemas de colores independientes por pantalla.

No sobrescribir el tema global para resolver necesidades particulares de un módulo.

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

Cada pantalla debe verificarse en:

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
