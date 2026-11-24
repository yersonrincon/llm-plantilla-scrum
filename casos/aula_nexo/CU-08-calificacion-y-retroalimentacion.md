Caso de uso: CU-08 Calificación y retroalimentación
Proyecto: AulaNexo

Actor principal: Docente
Actor secundario: Estudiante (consulta nota y comentario)

Objetivo: registrar la nota de una entrega y un comentario visible para el estudiante.

Precondiciones:
- El docente está asignado al curso.
- Existe al menos una entrega, o el docente puede marcar como no presentada.

Flujo principal:
1. El docente abre la actividad y la lista de estudiantes.
2. Elige una entrega, escribe la nota y un comentario.
3. El sistema valida que la nota esté entre 0 y el puntaje máximo.
4. El sistema guarda la calificación y la muestra al estudiante en la actividad.

Flujos alternos:
- Nota fuera de rango: no guarda e indica el máximo permitido.
- Sin entrega: el docente puede registrar 0 con el motivo no presentada.
- Corregir nota: el docente puede actualizar nota y comentario. Queda la última versión y la fecha del cambio.
- Publicar más tarde: puede guardar la nota como borrador. El estudiante no la ve hasta que se publique.

Criterios de aceptación:
- Solo el docente del curso califica esas entregas.
- La nota no supera el puntaje máximo ni es negativa.
- El estudiante ve nota y comentario solo cuando están publicados.
- El promedio del curso se recalcula con las notas publicadas.
- Una actividad sin nota no cuenta en el promedio.

Prioridad de negocio: Alta
Dependencias: requiere CU-07. Habilita CU-10 cuando el promedio aprueba el curso.
