# Estimación con story points y planning poker

## Qué es un story point

Un story point mide el esfuerzo relativo de una historia: complejidad, cantidad de trabajo e incertidumbre. No son horas. Se compara cada historia con una historia de referencia que el equipo conoce.

## Escala

Se usa la serie de Fibonacci modificada: **1, 2, 3, 5, 8, 13, 21**.

| Puntos | Significado | Ejemplo típico |
|---|---|---|
| 1 | Cambio trivial, sin riesgo | Cambiar un texto o un campo de un formulario |
| 2 | Muy simple | Formulario de contacto sin lógica |
| 3 | Simple, con alguna validación | Listado con filtro por un campo |
| 5 | Medio: varias capas (pantalla, servicio, base de datos) | Registro de usuario con validaciones y correo de confirmación |
| 8 | Complejo o con integración | Carrito de compras con cálculo de totales e inventario |
| 13 | Muy complejo, con mucha incertidumbre | Pago con pasarela externa y manejo de rechazos |
| 21 | Demasiado grande: es una épica | Se debe dividir antes de entrar al sprint |

## Planning poker

1. El Product Owner lee la historia y sus criterios de aceptación.
2. El equipo pregunta lo que no esté claro.
3. Cada desarrollador elige una carta en secreto.
4. Todos muestran su carta al mismo tiempo.
5. Si hay mucha diferencia, quienes dieron el valor más alto y el más bajo explican su razón.
6. Se vuelve a votar hasta llegar a un consenso.

## Factores que suben la estimación

- Integración con sistemas externos (pasarelas de pago, correo, APIs).
- Reglas de negocio con muchos casos o flujos de excepción.
- Seguridad: autenticación, roles y permisos, datos personales.
- Tecnología nueva para el equipo.
- Falta de detalle en el caso de uso.

## Velocidad del equipo

- La velocidad es la suma de story points terminados (que cumplen la definition of done) en un sprint.
- Un equipo nuevo de 3 a 5 desarrolladores suele completar entre 20 y 30 puntos en un sprint de dos semanas.
- Para planificar se usa el promedio de los últimos tres sprints.
- No se cuentan puntos de historias a medio terminar.
