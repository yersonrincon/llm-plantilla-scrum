Caso de uso: CU-07 Entrega de actividades
Proyecto: AulaNexo

Actor principal: Estudiante
Actor secundario: Docente (define la actividad y consulta las entregas)

Objetivo: permitir que el estudiante envíe una actividad antes de la fecha límite.

Precondiciones:
- El estudiante tiene la inscripción confirmada.
- El docente publicó una actividad con enunciado y fecha límite.

Flujo principal:
1. El docente crea la actividad con enunciado, puntaje máximo y fecha límite.
2. El estudiante abre la actividad en el aula.
3. Escribe un texto o adjunta un archivo y envía.
4. El sistema guarda la entrega con fecha y hora, y confirma el recibo.

Flujos alternos:
- Fuera de plazo: no acepta la entrega e indica que la fecha venció.
- Segunda entrega antes del plazo: reemplaza la anterior y conserva la última como vigente.
- Archivo demasiado grande o de un tipo no permitido: no guarda y explica el límite.
- Estudiante sin inscripción confirmada: no puede abrir la actividad.

Criterios de aceptación:
- Cada estudiante tiene como máximo una entrega vigente por actividad.
- La entrega registra fecha y hora del servidor.
- Después de la fecha límite no se puede enviar ni reemplazar.
- El docente ve la lista de entregas y quién no envió.
- El estudiante ve el estado: enviada, pendiente o fuera de plazo.

Prioridad de negocio: Alta
Dependencias: requiere CU-05 y CU-06. Habilita CU-08.
