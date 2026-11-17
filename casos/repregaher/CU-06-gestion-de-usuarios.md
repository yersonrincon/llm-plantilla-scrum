Caso de uso: CU-06 Gestión de usuarios
Proyecto: REPREGAHER LTDA

Actor principal: Administrador

Objetivo: administrar cuentas existentes: crear, modificar o eliminar usuarios del equipo operativo.

Precondiciones:
- Sesión con rol administrador.

Flujo principal:
1. El administrador entra a gestión de usuarios.
2. Crea, modifica o elimina una cuenta.
3. El sistema registra el cambio y actualiza la lista.

Flujos alternos:
- Error en la operación: si falla crear, modificar o eliminar, no deja la cuenta a medias e informa el error.

Criterios de aceptación:
- El administrador ve, edita y da de baja cuentas.
- Un trabajador no entra a este módulo.
- Eliminar o suspender una cuenta impide un nuevo inicio de sesión.
- Los cambios quedan reflejados en la lista de usuarios.

Prioridad de negocio: Alta
Dependencias: requiere CU-01, CU-02 y CU-03.
