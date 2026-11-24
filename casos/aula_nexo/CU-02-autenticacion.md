Caso de uso: CU-02 Autenticación
Proyecto: AulaNexo

Actor principal: Estudiante, docente, coordinador o administrador
Actor secundario: ninguno

Objetivo: permitir el ingreso con correo y contraseña y recuperar el acceso si la contraseña se olvida.

Precondiciones:
- La cuenta existe y, en el caso del estudiante, está verificada.
- El usuario no tiene la sesión iniciada.

Flujo principal:
1. El usuario abre Iniciar sesión.
2. Escribe correo y contraseña.
3. El sistema comprueba las credenciales y el estado de la cuenta.
4. El sistema crea la sesión y muestra el inicio según el rol.

Flujos alternos:
- Credenciales incorrectas: no abre sesión e informa el error sin revelar si el correo existe.
- Cuenta sin verificar: indica que debe confirmar el correo.
- Olvidé mi contraseña: el usuario pide un enlace, define una contraseña nueva y la anterior deja de servir.
- Cinco intentos fallidos seguidos: bloquea el ingreso 15 minutos.

Criterios de aceptación:
- Solo entran credenciales correctas de una cuenta activa.
- Cada rol ve únicamente su menú.
- El enlace de recuperación caduca y es de un solo uso.
- Tras cerrar sesión, las pantallas privadas piden autenticarse de nuevo.

Prioridad de negocio: Alta
Dependencias: requiere CU-01 para estudiantes. Habilita el resto de casos de uso.
