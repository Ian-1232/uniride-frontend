# UniRide Frontend

Módulo 4 integrado con el backend adjunto, sin modificar su código ni sus
contratos. Esta versión parte de `uniride-frontend-develop(1).zip` y utiliza
el backend de `uniride-spring-backend-development (1)(1).zip`.

## Ejecutar

Mantén tu backend local en `http://localhost:8080/api`. En una terminal dentro
de esta carpeta ejecuta:

```powershell
npm ci
npm start
```

Abre `http://localhost:4200` e inicia sesión con una cuenta verificada y el perfil
completo. El proxy existente envía `/api` al backend de `localhost:8080` y el
interceptor existente adjunta el JWT. No se añadieron dependencias.

## Usar el módulo 4

- Conductor: **Viajes → Ver solicitudes** para revisar perfiles, aceptar, rechazar
  o rechazar varias solicitudes con motivo.
- Conductor: **Viajes → Gestionar viaje** para confirmar, iniciar, completar o
  cancelar el viaje. También se accede desde **Mis rutas → Viajes de la ruta**.
- Pasajero: **Mis viajes → Detalle del viaje → Cancelar viaje completo**, cuando
  su solicitud está aceptada y la vista no es de historial. Cancelar solo una
  solicitud pendiente conserva el flujo existente del módulo 3.

Los estados, pasajeros, cupos, motivos y acuerdos se obtienen de respuestas reales.
Los parámetros antiguos de demostración (`horas`, `estado`, `confirmado`,
`aceptada`, `rechazos`) ya no cambian los estados del módulo 4.

La confirmación requiere al menos 12 horas de anticipación. Se inicia a partir
de la hora de salida y se completa desde `EN_PROGRESO`. La estimación visible de
penalidad usa la hora del equipo y la fecha de salida en Lima; la validación y la
penalidad definitiva pertenecen al backend existente.

## Qué cambió y dónde

Consulta [el informe completo](docs/cambios-modulo4.md), que incluye el listado
exacto de archivos, los endpoints usados, la comprobación manual y los límites.

## Verificar

```powershell
npm test -- --watch=false
npm run build
```

También están disponibles las guías existentes de [autenticación](docs/integracion-auth.md),
[perfil y roles](docs/integracion-perfil-roles-US03-US04-US05.md),
[viajes del pasajero](docs/integracion-viajes-pasajero.md), reportes,
compensaciones y contribución. La especificación general se encuentra en `SPEC.md`.
