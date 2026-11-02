# Cómo convertir casos de uso en historias de usuario

## Elementos de un caso de uso

Un caso de uso de software suele tener:

- **Nombre**: acción que realiza el actor, por ejemplo "Registrar usuario".
- **Actores**: quién interactúa con el sistema (usuario, administrador, sistema externo).
- **Precondiciones**: lo que debe cumplirse antes de empezar.
- **Flujo principal (flujo básico)**: los pasos normales cuando todo sale bien.
- **Flujos alternos**: variaciones válidas del flujo principal.
- **Flujos de excepción**: errores y cómo responde el sistema.
- **Postcondiciones**: estado del sistema al terminar.
- **Reglas de negocio**: validaciones y restricciones.

## Reglas de conversión

1. Cada **flujo principal** se convierte en una historia de usuario.
2. Cada **flujo alterno importante** que tenga valor propio para el usuario se convierte en otra historia.
3. Los **flujos de excepción** y las **reglas de negocio** se convierten en criterios de aceptación de la historia correspondiente.
4. El **actor** del caso de uso es el "Como..." de la historia.
5. La **postcondición** ayuda a escribir el "para..." (el beneficio).
6. Las **precondiciones** que dependen de otro caso de uso indican una dependencia entre historias.

## Formato de la historia de usuario

```
Como [actor]
quiero [acción u objetivo]
para [beneficio o valor]
```

## Criterios de aceptación

Se escriben de forma verificable. Formato recomendado (Gherkin):

```
Dado [contexto o precondición]
Cuando [acción del actor]
Entonces [resultado esperado]
```

## Criterios INVEST de una buena historia

- **I**ndependiente: se puede desarrollar sin depender de otra en el mismo sprint.
- **N**egociable: el detalle se conversa con el Product Owner.
- **V**aliosa: aporta valor al usuario o al cliente.
- **E**stimable: el equipo puede estimarla.
- **S**mall (pequeña): cabe en un sprint.
- **T**esteable: se puede comprobar con sus criterios de aceptación.

## Ejemplo

Caso de uso "Iniciar sesión", flujo principal: el usuario ingresa correo y contraseña y el sistema le da acceso. Flujo de excepción: contraseña incorrecta tres veces, la cuenta se bloquea 15 minutos.

Historia resultante:

- **Como** usuario registrado **quiero** iniciar sesión con mi correo y contraseña **para** acceder a mis datos.
- Criterios de aceptación:
  - Dado un usuario registrado, cuando ingresa correo y contraseña correctos, entonces accede a su panel.
  - Dado un usuario, cuando ingresa una contraseña incorrecta, entonces ve el mensaje "Credenciales inválidas".
  - Dado un usuario, cuando falla tres veces seguidas, entonces su cuenta se bloquea 15 minutos.
