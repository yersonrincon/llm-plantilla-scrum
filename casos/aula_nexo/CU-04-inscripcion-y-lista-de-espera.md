Caso de uso: CU-04 Inscripción y lista de espera
Proyecto: AulaNexo

Actor principal: Estudiante
Actor secundario: Coordinador académico (puede anular una inscripción)

Objetivo: reservar un cupo en un curso o entrar a la lista de espera si el cupo se agotó.

Precondiciones:
- El estudiante está autenticado y con el correo verificado.
- El curso está publicado y dentro de las fechas de matrícula.
- El estudiante cumple los prerrequisitos.

Flujo principal:
1. El estudiante elige Inscribirme en el detalle del curso.
2. El sistema comprueba prerrequisitos, que no esté ya inscrito y que haya cupo.
3. El sistema crea la inscripción en estado pendiente de pago y descuenta un cupo de forma provisional.
4. El estudiante ve la inscripción en Mis cursos, con la fecha límite para pagar.

Flujos alternos:
- Sin cupo: ofrece entrar a la lista de espera. Si acepta, guarda el turno sin descontar cupo.
- Ya inscrito: informa que la inscripción existe y no crea otra.
- Prerrequisito no cumplido: rechaza la inscripción e indica el curso faltante.
- Pago no realizado antes del límite: libera el cupo y pasa al primero de la lista de espera, si lo hay.
- Anulación: el estudiante o el coordinador cancela. El cupo vuelve a estar disponible.

Criterios de aceptación:
- No se inscribe dos veces al mismo curso en el mismo periodo.
- No se inscribe quien no cumple prerrequisitos.
- El cupo provisional no lo puede tomar otro estudiante.
- La lista de espera conserva el orden de llegada.
- Al liberarse un cupo, solo se notifica a la primera persona de la lista.

Prioridad de negocio: Alta
Dependencias: requiere CU-02 y CU-03. Habilita CU-05.
