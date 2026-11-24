Caso de uso: CU-01 Registro de estudiantes
Proyecto: AulaNexo

Actor principal: Estudiante
Actor secundario: Administrador (puede crear la cuenta si el estudiante no puede autorregistrarse)

Objetivo: crear una cuenta con datos personales y credenciales para que el estudiante entre a la plataforma.

Precondiciones:
- El periodo de admisiones está abierto.
- El formulario de registro está disponible sin sesión.

Flujo principal:
1. El estudiante abre Registrarme.
2. Diligencia nombre, documento, correo, teléfono y contraseña.
3. El sistema valida campos obligatorios, formato de correo y que el documento o el correo no existan.
4. El sistema guarda la cuenta en estado pendiente de verificación y envía un enlace al correo.
5. El estudiante abre el enlace y la cuenta queda activa.

Flujos alternos:
- Datos incompletos: no registra hasta completar los obligatorios.
- Documento o correo duplicado: informa que ya existe una cuenta y no crea otra.
- Enlace vencido: permite reenviar la verificación sin crear una cuenta nueva.

Criterios de aceptación:
- No se aceptan registros con campos obligatorios vacíos.
- No se duplica un documento ni un correo.
- La contraseña tiene mínimo 8 caracteres.
- Sin verificar el correo, el estudiante no puede inscribirse a cursos.
- Tras verificar, la cuenta queda lista para autenticarse.

Prioridad de negocio: Alta
Dependencias: ninguna. Habilita autenticación e inscripción.
