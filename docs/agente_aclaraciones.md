# Formularios de aclaración del asistente

El chat y la voz comparten el contrato v1. Angular lee `aclaracion` en la respuesta de chat o `respuesta.aclaracion` en voz. El formulario genérico usa los campos del descriptor, incluidos sus límites, valores iniciales y opciones. Ante un descriptor presente que no supera la validación, queda disponible la entrada libre. El reconocimiento textual se conserva para respuestas antiguas sin descriptor.

## Envíos

Ejemplo de petición al chat con el UUID vigente y el mismo `conversationId`.

```json
{
  "conversationId": "ee2a58bc-82e1-46cf-86c3-e286316a87d1",
  "message": "Datos de aclaración cead719a-918b-4555-8d27-2fbdf6421720: {\"referencias\":\"UPC Villa\",\"capacidad\":3}"
}
```

Después de la aceptación, la conversación muestra el contexto y el resumen legible.

```text
Crear una ruta
Puntos de referencia: UPC Villa
Capacidad máxima: 3
```

La interfaz valida hasta 1 000 caracteres del mensaje serializado y conserva los valores si hace falta acortarlos. Los selectores envían el valor de la opción y muestran su etiqueta. Las opciones rápidas siguen el mismo formato.

**Enviar datos disponibles** aparece en formularios v1 de varios campos con valores parciales y requisitos pendientes. Los campos vacíos se omiten. El grupo `alMenosUno` cuenta como un requisito y se satisface con un valor válido del grupo. Si Java devuelve otro UUID, la interfaz monta los campos restantes. Si devuelve el mismo, mantiene la instancia y los valores compatibles. **Ocultar formulario** solo cambia su visibilidad local.

## Errores y confirmaciones

- Ante HTTP 400 se conserva el formulario para corregir los valores. `CLARIFICATION_EXPIRED` retira el UUID y pide iniciar de nuevo la solicitud.
- `PROVIDER_RATE_LIMIT` puede acompañar un descriptor válido. Un timeout del cliente o una desconexión conserva los valores en modo de consulta y bloquea el reenvío del formulario. `PREPARATION_RESULT_UNCERTAIN` retira el formulario e indica que se revise el resultado.
- La propuesta activa se identifica por el UUID que devuelve Java. **Confirmar** y **Cancelar** envían un POST sin cuerpo a `/api/agent/confirmaciones/{id}/confirmar` y `/api/agent/confirmaciones/{id}/cancelar`, respectivamente. Las decisiones por texto o voz se reconcilian con el recibo del chat.
- **Consultar estado** usa `GET /api/agent/confirmaciones/{id}` cuando existe un recibo identificable. Una nueva conversación o un cambio de sesión o rol desconecta las respuestas del contexto anterior.

## Prueba local

Con el backend local en el puerto 8080, ejecuta `npm.cmd start`, inicia sesión con una cuenta de pruebas y abre `/asistente`. Como conductor, prueba «Crea una ruta», «Crea una ruta desde Surco» y «Crea una ruta desde Surco con capacidad 3» en conversaciones distintas. Envía primero solo la capacidad cuando esté disponible y comprueba que el siguiente formulario solo pide los datos pendientes. Repite una aclaración por voz usando la misma conversación.

Revisa en la pestaña Red que el POST al chat contenga el UUID del formulario vigente y que solo **Confirmar** o **Cancelar** en la tarjeta hagan el POST dedicado. Verifica también el comportamiento con teclado y un ancho aproximado de 390 px.

La fuente de verdad para los fixtures, los DTO y las reglas de negocio es [la documentación del backend](https://github.com/pollitoconpapass/uniride-spring-backend/blob/eb5c7577f332b64db372902e74136d29f8467f07/docs/agente_aclaraciones.md).
