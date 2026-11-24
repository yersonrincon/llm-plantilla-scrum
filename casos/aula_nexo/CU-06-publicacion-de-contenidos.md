Caso de uso: CU-06 Publicación de contenidos
Proyecto: AulaNexo

Actor principal: Docente
Actor secundario: Estudiante (consulta los materiales publicados)

Objetivo: organizar el curso en módulos y publicar materiales visibles solo para inscritos confirmados.

Precondiciones:
- El docente está autenticado y asignado a ese curso.
- El curso existe en el periodo activo.

Flujo principal:
1. El docente abre su curso y entra a Contenidos.
2. Crea un módulo con título y orden.
3. Agrega materiales: texto, enlace o archivo PDF.
4. El sistema guarda el módulo y lo muestra a los estudiantes con inscripción confirmada.

Flujos alternos:
- Archivo no permitido: rechaza formatos distintos de PDF y archivos de más de 20 MB.
- Módulo sin título: no guarda hasta completar el título.
- Ocultar módulo: el docente puede dejar un módulo en borrador. Los estudiantes no lo ven.
- Docente no asignado: el sistema no muestra la edición de ese curso.

Criterios de aceptación:
- Solo el docente asignado publica o edita contenidos de su curso.
- Un estudiante con inscripción pendiente de pago no ve los materiales.
- Los módulos se listan en el orden definido por el docente.
- Un módulo en borrador no aparece en el aula del estudiante.
- El estudiante puede abrir un PDF publicado desde el aula.

Prioridad de negocio: Media
Dependencias: requiere curso creado y, para el estudiante, CU-05 confirmado.
