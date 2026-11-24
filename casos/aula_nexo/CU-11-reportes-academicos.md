Caso de uso: CU-11 Reportes académicos
Proyecto: AulaNexo

Actor principal: Coordinador académico
Actor secundario: Administrador (consulta los mismos reportes)

Objetivo: consultar cupos, inscritos, aprobados y estudiantes en riesgo de un periodo.

Precondiciones:
- El coordinador o el administrador está autenticado.
- Existe un periodo académico.

Flujo principal:
1. El coordinador abre Reportes y elige el periodo.
2. El sistema muestra por curso: cupo, inscritos confirmados, lista de espera, entregas pendientes y aprobados.
3. El coordinador filtra un curso o un estado.
4. El sistema exporta la vista a un archivo CSV.

Flujos alternos:
- Periodo sin cursos: informa que no hay datos y no genera un archivo vacío con filas falsas.
- Estudiante en riesgo: lista quienes tienen promedio parcial inferior a 3.0 o una actividad vencida sin entrega.
- Exportación grande: genera el CSV con los filtros activos, no con todo el histórico.

Criterios de aceptación:
- Solo coordinador y administrador ven los reportes.
- Un docente no ve estudiantes de cursos que no dicta.
- Las cifras coinciden con inscripciones confirmadas y notas publicadas.
- El CSV respeta el periodo y el filtro elegidos.
- La lista de riesgo no incluye a quien ya aprobó el curso.

Prioridad de negocio: Media
Dependencias: usa datos de CU-04, CU-05, CU-07 y CU-08.
