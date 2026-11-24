Caso de uso: CU-09 Foro del curso
Proyecto: AulaNexo

Actor principal: Estudiante
Actor secundario: Docente (responde y modera)

Objetivo: permitir preguntas y respuestas dentro del curso, visibles para los inscritos confirmados.

Precondiciones:
- El usuario está autenticado.
- El estudiante tiene inscripción confirmada, o el docente está asignado al curso.

Flujo principal:
1. El estudiante abre el foro del curso.
2. Publica un tema con título y mensaje.
3. El docente u otro estudiante inscrito responde en ese tema.
4. El sistema muestra los temas del más reciente al más antiguo y guarda autor y fecha.

Flujos alternos:
- Mensaje vacío: no publica.
- Tema cerrado: el docente cierra un tema y ya no admite respuestas.
- Retirar mensaje: el autor o el docente puede ocultar un mensaje. Queda constancia de que fue retirado, sin mostrar el texto.
- Usuario sin cupo confirmado: no entra al foro.

Criterios de aceptación:
- Solo inscritos confirmados y el docente del curso leen y escriben.
- Cada mensaje muestra autor y fecha.
- Un tema cerrado no acepta respuestas nuevas.
- Un mensaje retirado no se muestra a los estudiantes.
- El foro de un curso no es visible desde otro curso.

Prioridad de negocio: Baja
Dependencias: requiere CU-05 para el estudiante y asignación del docente.
