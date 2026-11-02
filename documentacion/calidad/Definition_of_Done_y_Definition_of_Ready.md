# Definition of Done y Definition of Ready

## Definition of Ready (DoR)

Una historia de usuario está lista para entrar a un sprint cuando:

- Está escrita con el formato "Como [actor] quiero [acción] para [beneficio]".
- Tiene criterios de aceptación claros y verificables.
- Está relacionada con un caso de uso o requisito del cliente.
- Está estimada en story points por el equipo con planning poker.
- Tiene 13 puntos o menos; si es más grande, se divide antes de entrar al sprint.
- Sus dependencias están resueltas o planificadas en un sprint anterior.
- El equipo entiende qué hay que construir y cómo probarlo.
- Cuenta con los diseños o prototipos de pantalla si la historia tiene interfaz.

## Definition of Done (DoD)

Una historia de usuario está terminada cuando:

### Código
- El código está en el repositorio, en la rama principal o integrado mediante pull request.
- El código fue revisado por al menos otro desarrollador (revisión de código).
- Sigue las convenciones de codificación del equipo y no tiene advertencias críticas del analizador estático.

### Pruebas
- Tiene pruebas unitarias para la lógica de negocio, con una cobertura mínima recomendada del 70 al 80 %.
- Se cumplen todos los criterios de aceptación de la historia.
- Se probaron los flujos alternos y de error descritos en el caso de uso.
- Pasaron las pruebas de integración con los módulos relacionados.
- No quedan defectos críticos ni altos abiertos.

### Despliegue
- Está desplegada en el ambiente de pruebas o preproducción.
- La base de datos y las migraciones necesarias están aplicadas.

### Documentación y aceptación
- La documentación técnica o de usuario necesaria está actualizada.
- El Product Owner revisó la historia y la aceptó en la sprint review.

## Definition of Done del incremento (release)

- Todas las historias del release cumplen la DoD de historia.
- Pasaron las pruebas de regresión completas.
- Se hicieron pruebas de seguridad básicas: autenticación, autorización y validación de datos de entrada.
- Se validó el rendimiento con la carga esperada.
- Está el manual de usuario y el manual de instalación o despliegue.
- El cliente firmó el acta de aceptación del release.
