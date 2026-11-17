Caso de uso: CU-04 Gestión de inventario
Proyecto: REPREGAHER LTDA

Actor principal: Administrador
Actor secundario: Trabajador (consulta y movimientos, según permiso)

Objetivo: registrar, actualizar y eliminar productos, y controlar entradas, salidas y devoluciones en tiempo real.

Precondiciones:
- Usuario autenticado con permiso de inventario.
- Categorías o códigos de producto definidos cuando aplique.

Flujo principal:
1. El administrador entra al módulo de inventario.
2. El sistema lista los productos registrados.
3. El usuario agrega, modifica o elimina un producto, o registra un movimiento (entrada, salida o devolución).
4. El sistema valida cantidades, códigos y fechas, actualiza el stock y guarda el cambio.

Flujos alternos:
- Datos inválidos: no guarda si faltan campos o las cantidades no son coherentes.
- Salida mayor al stock: no descuenta y avisa la cantidad disponible.

Criterios de aceptación:
- Se puede crear, editar y eliminar un producto.
- Entrada aumenta stock; salida lo disminuye; devolución lo reintegra.
- No se registra una salida superior al stock.
- El dashboard refleja el inventario actualizado.

Prioridad de negocio: Alta
Dependencias: requiere CU-02. Relacionado con CU-05 reportes.
