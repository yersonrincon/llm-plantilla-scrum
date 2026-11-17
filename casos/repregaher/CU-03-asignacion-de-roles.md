Caso de uso: CU-03 Asignación de roles
Proyecto: REPREGAHER LTDA

Actor principal: Administrador

Objetivo: asignar o cambiar el rol de un usuario existente (administrador o trabajador) para ajustar permisos.

Precondiciones:
- El administrador autenticado.
- Existe el usuario al que se le asignará el rol.

Flujo principal:
1. El administrador elige el usuario.
2. Define el rol: administrador o trabajador.
3. El sistema guarda el cambio y ajusta los accesos.

Flujos alternos:
- Usuario no existe: no asigna rol e informa que la cuenta no está registrada.

Criterios de aceptación:
- Solo el administrador cambia roles.
- Un trabajador no accede a reportes estratégicos ni a gestión de usuarios.
- Tras el cambio, el siguiente inicio de sesión aplica el rol nuevo.

Prioridad de negocio: Media
Dependencias: requiere CU-01 y CU-02.
