module.exports = [
  {
    title: 'Caso de uso — Registro e inicio de sesión',
    type: 'caso_uso',
    content: `
Caso de uso: Registro e inicio de sesión
Proyecto: Tienda de ejemplo

Actor principal: Cliente
Actor secundario: Sistema de correo

Objetivo: permitir que una persona cree una cuenta e ingrese para usar el catálogo y el carrito.

Precondiciones:
- El sitio está disponible.
- El correo de confirmación puede enviarse.

Flujo principal:
1. El cliente abre el registro e informa email, nombre y contraseña.
2. El sistema valida el email y exige una contraseña de al menos 8 caracteres, con una mayúscula y un número.
3. El sistema guarda la cuenta y envía un enlace de confirmación válido por 24 horas.
4. El cliente confirma el correo e inicia sesión.
5. El sistema abre una sesión de 24 horas.

Flujos alternos:
- Email ya registrado: se informa que la cuenta existe y se ofrece recuperar el acceso.
- Credenciales incorrectas: mensaje genérico, sin revelar si el email existe.
- Quinto intento fallido en 15 minutos: bloqueo temporal de esa IP.

Criterios de aceptación:
- Se puede crear una cuenta con email y contraseña válidos.
- No se acepta un email con formato inválido.
- La contraseña se almacena con hash, nunca en texto plano.
- El inicio de sesión correcto entra al catálogo.
- El cliente puede cerrar sesión.

Prioridad de negocio: Alta
Dependencias: ninguna. Este caso habilita el carrito autenticado.
    `,
  },
  {
    title: 'Caso de uso — Carrito y checkout',
    type: 'caso_uso',
    content: `
Caso de uso: Carrito y checkout
Proyecto: Tienda de ejemplo

Actor principal: Cliente autenticado
Actores secundarios: Inventario, pasarela de pago

Objetivo: armar un pedido y pagarlo sin perder los productos elegidos.

Precondiciones:
- El cliente inició sesión.
- El catálogo muestra productos con precio y stock.

Flujo principal:
1. El cliente agrega un producto al carrito.
2. El sistema comprueba el stock y reserva la cantidad solo al confirmar el pedido.
3. El cliente cambia cantidades o quita productos.
4. El sistema recalcula subtotal, impuesto del 19 por ciento y envío.
5. El cliente confirma la dirección de entrega y paga.
6. El sistema registra el pedido, descuenta stock y muestra el número de pedido.

Flujos alternos:
- Stock insuficiente: no agrega la unidad que falta y muestra la cantidad disponible.
- Pago rechazado: el pedido queda pendiente de pago y el stock no se descuenta.
- Carrito vacío: el checkout no se habilita.

Criterios de aceptación:
- Agregar, cambiar cantidad y eliminar se reflejan en el total.
- El carrito sobrevive al cerrar el navegador si hay sesión.
- No se puede pagar un producto sin stock.
- El número de pedido se muestra después de un pago aceptado.
- Un pago rechazado no genera una venta cerrada.

Prioridad de negocio: Alta
Dependencias: requiere el caso de uso de registro e inicio de sesión.
Estimación sugerida por el negocio: más grande que el registro, porque incluye inventario y pago.
    `,
  },
  {
    title: 'Manual — Definition of Done del equipo',
    type: 'guia',
    content: `
Manual de calidad del equipo de ejemplo

Una historia se considera terminada solo si cumple todo esto:

Desarrollo:
- El código hace lo que dicen los criterios de aceptación del caso de uso.
- Otro integrante revisó el cambio.
- El linter no reporta errores.

Pruebas:
- Hay pruebas automáticas del flujo principal y del alterno más importante.
- Esas pruebas pasan.
- Se probó a mano el caso feliz y un caso de error.

Cierre:
- La historia está integrada en la rama principal.
- El Product Owner vio el incremento y lo aceptó.
- No quedan defectos críticos abiertos de esa historia.

El sprint dura 10 días hábiles. El equipo hace planificación al inicio, daily de 15 minutos, review con demostración y retrospectiva al cerrar.
No se suma trabajo nuevo a un sprint ya planificado si eso rompe el objetivo del sprint.
    `,
  },
];
