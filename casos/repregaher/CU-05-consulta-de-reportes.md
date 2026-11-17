Caso de uso: CU-05 Consulta de reportes
Proyecto: REPREGAHER LTDA

Actor principal: Administrador

Objetivo: generar reportes de inventario, ventas y movimientos, con filtros y exportación.

Precondiciones:
- Administrador autenticado.
- Hay datos de inventario o movimientos registrados.

Flujo principal:
1. El administrador abre generación de reportes.
2. Aplica filtros (fechas, productos o categorías).
3. El sistema arma el reporte.
4. El usuario descarga o guarda el archivo (visual o exportable).

Flujos alternos:
- Error de generación: no hay datos para los filtros o falla técnica; se informa y no se descarga un archivo vacío como si fuera válido.

Criterios de aceptación:
- El administrador genera reportes de inventario y movimientos.
- Los filtros de fecha, producto y categoría cambian el resultado.
- El reporte se puede exportar.
- Un trabajador no genera reportes gerenciales.

Prioridad de negocio: Media
Dependencias: requiere CU-04 Gestión de inventario.
