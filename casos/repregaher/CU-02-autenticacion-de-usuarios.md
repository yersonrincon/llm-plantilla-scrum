Caso de uso: CU-02 Autenticación de usuarios
Proyecto: REPREGAHER LTDA

Actor principal: Administrador o trabajador

Objetivo: validar credenciales y abrir el sistema según el rol.

Precondiciones:
- El usuario ya está registrado (CU-01).

Flujo principal:
1. El usuario ingresa nombre de usuario y contraseña.
2. El sistema comprueba que coincidan con lo almacenado.
3. Si son correctas, concede el acceso y muestra el área de su rol (administrador o trabajador).

Flujos alternos:
- Credenciales incorrectas: niega el acceso y no revela más datos de la cuenta.

Criterios de aceptación:
- Un usuario registrado entra con credenciales válidas.
- Credenciales erróneas no abren el sistema.
- El administrador ve funciones de gestión; el trabajador, las operativas.
- La contraseña no se muestra ni se guarda en texto plano.

Prioridad de negocio: Alta
Dependencias: requiere CU-01 Registro de usuarios.
