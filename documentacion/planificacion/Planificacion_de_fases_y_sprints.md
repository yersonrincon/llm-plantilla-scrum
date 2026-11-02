# Planificación de fases y sprints de un proyecto de software

## Duración del sprint

- Recomendación: sprints de **2 semanas (10 días hábiles)**.
- Proyectos cortos o con requisitos muy cambiantes: 1 semana.
- Nunca más de 1 mes (4 semanas).
- La duración se mantiene igual durante todo el proyecto.

## Fases del proyecto

### 1. Inicio
- Reunión con el cliente para entender el objetivo del producto.
- Revisión de los manuales de casos de uso.
- Identificación de actores, alcance y fuera de alcance.
- Conformación del equipo Scrum y asignación de roles.
- Resultado: visión del producto y product backlog inicial.

### 2. Sprint 0 (preparación)
- Configuración del repositorio, ramas y flujo de pull requests.
- Ambientes de desarrollo, pruebas y producción.
- Base de datos inicial y arquitectura del sistema.
- Integración continua (compilación y pruebas automáticas).
- Prototipos de las pantallas principales.
- Refinamiento y estimación de las historias de los primeros sprints.
- Duración: 1 sprint como máximo.

### 3. Construcción
- Sprints de desarrollo de historias de usuario.
- Orden recomendado:
  1. Historias base de las que dependen otras (registro, inicio de sesión, roles y permisos).
  2. Historias de mayor valor para el cliente (el flujo principal del negocio).
  3. Flujos alternos y funciones de apoyo (reportes, notificaciones, configuración).
- Cada sprint entrega un incremento funcionando.

### 4. Integración
- Integración con sistemas externos (pasarelas de pago, correo, servicios de terceros).
- Pruebas de integración y de extremo a extremo.
- Corrección de defectos encontrados.
- Pruebas de rendimiento y de seguridad.

### 5. Release (entrega)
- Pruebas de aceptación con el cliente.
- Despliegue en producción.
- Manuales de usuario y de instalación.
- Capacitación a los usuarios.
- Acta de entrega y cierre.

## Cómo asignar historias a los sprints

1. Calcula la capacidad del sprint con la velocidad del equipo (por ejemplo, 25 puntos).
2. Toma las historias en orden de prioridad del product backlog.
3. Respeta las dependencias: una historia no entra antes que aquella de la que depende.
4. No superes la capacidad; deja un margen de 10 a 20 % para imprevistos y defectos.
5. Cada sprint debe tener un objetivo claro que se pueda mostrar en la sprint review.

## Prioridad

- **Alta**: sin esta historia el producto no cumple su objetivo (flujo principal del caso de uso).
- **Media**: importante, pero el producto funciona sin ella al inicio (flujos alternos).
- **Baja**: mejoras deseables que pueden esperar a un release posterior.

También se puede usar MoSCoW: Must (debe), Should (debería), Could (podría), Won't (no por ahora).
