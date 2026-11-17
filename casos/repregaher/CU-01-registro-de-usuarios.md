Caso de uso: CU-01 Registro de usuarios
Proyecto: REPREGAHER LTDA

Actor principal: Administrador
Actor secundario: Trabajador (queda registrado)

Objetivo: crear cuentas con datos personales y credenciales para que el equipo entre al sistema.

Precondiciones:
- Quien registra tiene rol de administrador.
- El módulo de usuarios está disponible.

Flujo principal:
1. El administrador abre Registrar usuario.
2. Diligencia datos personales y credenciales del nuevo usuario.
3. El sistema valida campos obligatorios y que el correo o usuario no existan.
4. El sistema guarda la cuenta y confirma el registro.

Flujos alternos:
- Datos incompletos: no registra hasta completar los obligatorios.
- Usuario duplicado: informa que el correo o usuario ya existe y no crea otra cuenta.

Criterios de aceptación:
- Solo un administrador puede crear usuarios.
- No se aceptan registros con campos obligatorios vacíos.
- No se duplica un correo o nombre de usuario.
- Tras un registro correcto, la cuenta queda lista para autenticarse.

Prioridad de negocio: Alta
Dependencias: ninguna. Habilita autenticación y asignación de roles.
