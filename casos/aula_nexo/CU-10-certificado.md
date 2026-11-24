Caso de uso: CU-10 Certificado de aprobación
Proyecto: AulaNexo

Actor principal: Estudiante
Actor secundario: Coordinador académico (puede anular un certificado emitido por error)

Objetivo: generar un certificado descargable cuando el estudiante aprueba el curso.

Precondiciones:
- La inscripción está confirmada.
- El docente publicó las notas de todas las actividades que cuentan para el promedio.
- El periodo del curso está cerrado o el docente marcó el curso como listo para certificar.

Flujo principal:
1. El sistema calcula el promedio con las notas publicadas.
2. Si el promedio es mayor o igual a 3.0 sobre 5.0, marca el curso como aprobado.
3. El estudiante abre Certificado en ese curso.
4. El sistema genera un PDF con nombre del estudiante, curso, periodo, promedio y un código de verificación.
5. El estudiante descarga el archivo.

Flujos alternos:
- Promedio menor a 3.0: no genera certificado e informa que el curso no está aprobado.
- Notas pendientes: no genera certificado e indica que faltan calificaciones.
- Consulta pública del código: cualquier persona puede validar el código y ver nombre, curso y periodo, sin otras notas.
- Anulación: el coordinador anula el certificado. El código deja de validar.

Criterios de aceptación:
- No se emite certificado con promedio inferior a 3.0.
- No se emite si falta alguna nota que cuenta para el promedio.
- El código de verificación es único.
- La consulta pública no muestra documento, correo ni notas parciales.
- Un certificado anulado no se descarga de nuevo.

Prioridad de negocio: Media
Dependencias: requiere CU-05 y CU-08.
