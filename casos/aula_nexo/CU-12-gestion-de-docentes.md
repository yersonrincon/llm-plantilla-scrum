Caso de uso: CU-12 Gestión de docentes y cursos
Proyecto: AulaNexo

Actor principal: Administrador
Actor secundario: Docente (queda asignado a un curso)

Objetivo: crear la cuenta de un docente, abrir un curso en un periodo y asignar quién lo dicta.

Precondiciones:
- El administrador está autenticado.
- Existe un periodo académico.

Flujo principal:
1. El administrador abre Docentes y registra nombre, correo y documento.
2. El sistema crea la cuenta de docente y envía un enlace para definir la contraseña.
3. El administrador abre Cursos, crea el curso con nombre, cupo, horario, prerrequisitos y periodo.
4. Asigna un docente al curso.
5. El sistema publica el curso en el catálogo cuando el administrador lo marca como publicado.

Flujos alternos:
- Docente duplicado: no crea otra cuenta si el correo o el documento ya existen.
- Curso sin docente: se puede guardar en borrador, pero no se publica en el catálogo.
- Cupo menor que los ya inscritos: no permite bajar el cupo por debajo de las inscripciones confirmadas.
- Quitar asignación: si el curso ya tiene contenidos o entregas, pide confirmación y no borra esos datos.

Criterios de aceptación:
- Solo el administrador crea docentes y cursos.
- Un curso publicado tiene exactamente un docente asignado.
- El cupo es un entero mayor que cero.
- Un curso en borrador no aparece en el catálogo del estudiante.
- El docente asignado ve el curso en su lista al iniciar sesión.

Prioridad de negocio: Alta
Dependencias: requiere CU-02 del administrador. Habilita CU-03 y CU-06.
