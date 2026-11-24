Caso de uso: CU-03 Catálogo de cursos
Proyecto: AulaNexo

Actor principal: Estudiante
Actor secundario: Coordinador académico (publica y oculta cursos)

Objetivo: consultar la oferta del periodo, con cupo, horario, prerrequisitos y docente.

Precondiciones:
- Hay un periodo académico activo.
- El coordinador publicó al menos un curso, o el catálogo puede mostrarse vacío.

Flujo principal:
1. El estudiante abre el catálogo. Puede hacerlo sin sesión; para inscribirse debe autenticarse.
2. El sistema lista cursos abiertos del periodo: nombre, docente, cupo disponible, horario y prerrequisitos.
3. El estudiante filtra por área o busca por nombre.
4. El estudiante abre el detalle y ve la descripción, los módulos previstos y si cumple los prerrequisitos.

Flujos alternos:
- Sin resultados: el sistema informa que no hay cursos con ese filtro.
- Curso cerrado: se muestra, pero no ofrece el botón de inscripción.
- Prerrequisito pendiente: el detalle indica qué curso falta aprobar.

Criterios de aceptación:
- Solo aparecen cursos del periodo activo marcados como publicados.
- El cupo mostrado coincide con las inscripciones confirmadas.
- La búsqueda no distingue mayúsculas ni tildes.
- Un visitante sin sesión puede ver el catálogo y no puede inscribirse.

Prioridad de negocio: Alta
Dependencias: requiere que el coordinador haya creado el curso. Habilita CU-04.
