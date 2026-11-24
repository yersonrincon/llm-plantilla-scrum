Caso de uso: CU-05 Pago de matrícula
Proyecto: AulaNexo

Actor principal: Estudiante
Actor secundario: Pasarela de pago (sistema externo)

Objetivo: registrar el pago de una inscripción pendiente y confirmar el cupo.

Precondiciones:
- Existe una inscripción en estado pendiente de pago y dentro del plazo.
- El estudiante está autenticado.

Flujo principal:
1. El estudiante abre la inscripción y elige Pagar.
2. El sistema muestra el valor, el curso y el plazo.
3. El estudiante continúa a la pasarela externa.
4. La pasarela notifica el resultado.
5. Si el pago es aprobado, el sistema marca la inscripción como confirmada y habilita el aula virtual.

Flujos alternos:
- Pago rechazado: la inscripción sigue pendiente y se informa el motivo devuelto por la pasarela.
- Pago duplicado: si la inscripción ya está confirmada, no cobra de nuevo y muestra el comprobante existente.
- Plazo vencido: no abre la pasarela y explica que el cupo fue liberado.
- Notificación tardía de un pago aprobado: si el cupo ya se asignó a otra persona, el sistema deja el pago en revisión para el coordinador y no confirma otra inscripción.

Criterios de aceptación:
- Solo una inscripción pendiente y vigente puede pagarse.
- Un pago aprobado confirma el cupo y abre el aula.
- Un pago rechazado no cambia el cupo.
- El estudiante puede descargar un comprobante con curso, valor, fecha y estado.
- El sistema no almacena el número completo de la tarjeta.

Prioridad de negocio: Alta
Dependencias: requiere CU-04. Habilita el acceso al aula (CU-06, CU-07 y CU-09).
