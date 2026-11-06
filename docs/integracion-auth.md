# Integración de autenticación

## Auditoría inicial

- `AuthService` arrancaba con un conductor ficticio y reconstruía usuarios y roles desde almacenamiento sin validación del servidor.
- Registro y verificación OTP establecían sesión aunque esos endpoints devuelven `token: null`.
- Los fallos de conexión simulaban registro, verificación y reenvío exitosos. Existía un token de demostración y un código OTP prellenado.
- La selección de rol del registro modificaba también el rol de la sesión.
- Los guards comprobaban el usuario ficticio y no estaban conectados a las rutas privadas. Sus redirecciones imperativas podían producir navegación inconsistente.
- El interceptor adjuntaba el JWT sin comprobar el destino.
- Producción apuntaba directamente a localhost; desarrollo utilizaba `/api` con proxy.
- Los layouts suponían que siempre existía un usuario y no ofrecían cierre de sesión.
- Las pruebas asumían una sesión por defecto y tokens emitidos durante registro/OTP.

Se consultaron en modo de solo lectura los DTO, AuthService, UsuarioController, SecurityConfig, GlobalExceptionHandler y ValidacionUtil del backend en `development` (referencia consultada: `aec54ffafc582bf8d1fb732494696a7f79421921`). Coinciden con los contratos de la tarea. No se detectó un bloqueo que requiera modificar el backend.

## Flujo final

1. Registro envía los datos y aceptación de términos a `POST /api/auth/registro`. Un HTTP 201 abre OTP y limpia la contraseña del formulario. No guarda sesión.
2. Verificación envía correo y seis dígitos a `POST /api/auth/verificar`. Un HTTP 200 conduce al login con confirmación visual; no interpreta la verificación como autenticación.
3. Reenvío usa `POST /api/auth/reenviar-codigo`. El contador local facilita la espera; el servidor sigue siendo la autoridad. Un 429 respeta `Retry-After`, o usa 60 segundos si no está disponible. Los errores no producen éxito visual.
4. Login acepta únicamente una respuesta del servidor con JWT de estructura válida y sin expirar, usuario verificado, identificador válido, correo coincidente y rol CONDUCTOR o PASAJERO. El chequeo local del JWT no verifica su firma; esa responsabilidad corresponde al backend.
5. Solo se guarda el token: `sessionStorage` por defecto, `localStorage` cuando se marca recordar dispositivo. No se guardan usuario, rol, contraseña ni OTP. Se eliminan las antiguas claves de usuario y rol.
6. Al arrancar, el inicializador espera `GET /api/usuarios/me` antes de admitir una sesión recuperada. Los guards comparten la validación en curso; no se muestra el usuario almacenado como prueba de autenticación. Un fallo de validación limpia la sesión; una ruta privada conduce al login. Las páginas públicas siguen disponibles.
7. El JWT tiene un temporizador de expiración mientras la aplicación está abierta. Logout limpia el estado y ambos almacenamientos y navega al login. Una respuesta tardía de recuperación o login no puede restaurar una sesión cerrada.
8. El interceptor envía Bearer solo a la API del mismo origen y excluye `/auth/*`. Un 401 de una petición privada invalida la sesión. Un 403 conserva la sesión y propaga el error a quien inició la operación, sin redirección global ni ciclos.

### Rutas

| Área | Acceso |
| --- | --- |
| `/home`, login y registro | Público |
| `/conductor/**`, `/reportes/**`, `/compensaciones/**` | CONDUCTOR |
| `/pasajero/**`, `/contribucion/**` | PASAJERO |
| `/auth/perfil`, `/auth/info-adicional` | Autenticado; formularios existentes sin persistencia nueva |

Reportes y métodos de compensación usan el layout del conductor. Sus entradas en el menú del pasajero permanecen deshabilitadas. Los padres y sus rutas hijas aplican guards; un rol incorrecto vuelve a su propio dashboard. Una ruta desconocida conduce a home.

La conexión permanece `Angular → /api → proxy local → http://localhost:8080`. Ambos environments usan `/api`. En un despliegue de producción se necesita un reverse proxy equivalente; `proxy.conf.json` solo se aplica al servidor de desarrollo.

## Prueba manual con IntelliJ y Angular

Las siguientes operaciones son manuales y el registro sí crea una cuenta real. No fueron ejecutadas durante la validación automatizada.

1. Abre el backend en IntelliJ en su rama `development`, con la configuración local de base de datos y correo ya existente. Ejecuta su clase Spring Boot principal y confirma que escucha en el puerto 8080. No cambies migraciones ni copies credenciales al frontend.
2. En la raíz del frontend ejecuta `npm ci` y `npm start`. Abre `http://localhost:4200` y las pestañas Network y Application de DevTools.
3. Sin sesión, abre `/conductor/dashboard`, `/pasajero/dashboard`, `/reportes/resumen` y `/compensaciones/metodos`. Deben llevar al login.
4. Abre `/auth/registro`, usa un correo institucional al que tengas acceso y un teléfono válido no registrado, elige el rol y acepta términos. Comprueba POST `/api/auth/registro`, HTTP 201 y `token: null`. No debe aparecer token en los almacenamientos.
5. Introduce el código recibido en el correo. Comprueba POST `/api/auth/verificar`, HTTP 200 y `token: null`. Debes llegar al login con confirmación; seguirás sin sesión.
6. Para comprobar reenvío, usa una cuenta pendiente de verificación, espera el contador y pulsa reenviar. El código que debes usar es el último recibido. También puedes llegar al modal desde el aviso de cuenta no verificada del login o desde un conflicto de registro. Un código incorrecto/caducado muestra error y mantiene el modal abierto. Respeta el bloqueo del servidor: no fuerces intentos repetidos.
7. Inicia sesión con credenciales reales. Confirma JWT y usuario verificado en la respuesta, redirección al dashboard del rol y token exclusivamente en sessionStorage. Repite con recordar dispositivo para comprobar localStorage. No deben guardarse contraseñas ni códigos.
8. Recarga en una URL privada. Debe aparecer GET `/api/usuarios/me` con Bearer, y la navegación debe conservarse después de validar al usuario. Modificar la antigua clave `uniride_rol` no debe cambiar el acceso.
9. Con una cuenta PASAJERO intenta `/conductor/dashboard`, `/reportes/resumen` y `/compensaciones/metodos`; debe volver a su dashboard. Con una cuenta CONDUCTOR intenta `/pasajero/dashboard` y `/contribucion/sugerencia/1`; debe volver al suyo.
10. Pulsa Cerrar sesión en el menú de escritorio o móvil. Verifica ambos almacenamientos vacíos y que las URLs privadas vuelven a exigir login.
11. Para comprobar una recuperación inválida, modifica el token almacenado y recarga. No debe concederse acceso. Con el backend detenido, registro/login/OTP/reenvío deben mostrar errores y nunca éxito ni acceso simulado. Reinicia el backend antes de continuar.

## Validación y alcance

- `npm.cmd ci`: exit 0; 290 paquetes instalados. Avisos de deprecación de `@angular/animations` y cuatro scripts de instalación pendientes de aprobación de npm. No se modificaron package.json ni package-lock.json.
- `npm.cmd test -- --watch=false`: exit 0; 18 archivos, 139 pruebas aprobadas; duración final 62,93 s. La primera ejecución en el sandbox falló por acceso denegado al resolver archivos; la ejecución autorizada fuera del sandbox permitió comprobar la suite. Los fallos iniciales de las pruebas de viajes se corrigieron autenticando explícitamente sus fixtures.
- `npm.cmd run build`: exit 0; compilación de producción terminada en 45,528 s, bundle inicial 444,44 kB, salida `dist/uniride-frontend`. Se corrigió un error inicial de tipado en el manejo de TimeoutError antes de esta compilación.
- `git diff --check`: sin errores de espacios. La búsqueda de accesos simulados en código de producción no encuentra usuario por defecto, setters locales de sesión/rol ni tokens demo.
- Las pruebas Angular usan `HttpTestingController` o dobles del servicio. No envían peticiones a Supabase ni crean o borran datos reales.
- Se conservan los escenarios de viajes, reportes y compensaciones; sus pruebas ahora autentican explícitamente el rol con HTTP simulado.
- No se integraron US22, US26, US27 o US28, ni persistencia de perfil, gustos o hobbies.
- SSO permanece deshabilitado; no existe un contrato de SSO en este alcance. El enlace existente de recuperación de contraseña tampoco incorpora una API nueva.
- Logout es local: no hay endpoint de revocación proporcionado. Un JWT emitido conserva su validez en el servidor hasta expirar.
- El almacenamiento del token es accesible al JavaScript del mismo origen; no se agregaron credenciales de Supabase ni secretos.
- Queda pendiente ejecutar el recorrido manual con el correo y backend locales. La compilación y las pruebas simuladas no prueban entrega de correo ni conectividad real.

No se creó commit, no se hizo push, no se abrió PR, no se realizó merge y no se modificaron backend ni Supabase.

## Archivos modificados

```text
README.md
docs/integracion-auth.md (nuevo)
src/app/app.config.ts
src/app/app.routes.ts
src/app/app.spec.ts
src/app/core/guards/auth.guard.ts
src/app/core/interceptors/jwt.interceptor.ts
src/app/core/models/auth.models.ts
src/app/core/services/auth.service.ts
src/app/core/services/auth.service.spec.ts
src/app/core/services/auth-error.ts (nuevo)
src/app/core/services/auth-error.spec.ts (nuevo)
src/app/layouts/conductor-layout/conductor-layout.html
src/app/layouts/pasajero-layout/pasajero-layout.html
src/app/layouts/pasajero-layout/pasajero-layout.ts
src/app/pages/auth/auth.routes.ts
src/app/pages/auth/info-adicional/info-adicional.spec.ts
src/app/pages/auth/login/login.ts
src/app/pages/auth/login/login.html
src/app/pages/auth/login/login.spec.ts
src/app/pages/auth/signup/signup.ts
src/app/pages/auth/signup/signup.html
src/app/pages/auth/signup/signup.spec.ts
src/environments/environment.ts
```

Estado de entrega: rama `feature/integracion-auth`, HEAD previo `e072066`, 21 archivos rastreados modificados y tres archivos nuevos sin seguimiento. No se creó commit local.
