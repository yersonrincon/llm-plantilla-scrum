#!/usr/bin/env node

/**
 * Script de inicialización para el sistema Scrum LLM
 * Carga documentos de ejemplo en la base de datos
 */

const { getPool, documentQueries, close, describeDatabase } = require('../engine/db');

const sampleDocuments = [
  {
    title: "Guía Scrum - Roles y Responsabilidades",
    type: "guia",
    content: `
# Roles en Scrum

## Product Owner
El Product Owner es responsable de maximizar el valor del producto resultante del trabajo del Equipo de Desarrollo. Es el único responsable de gestionar el Product Backlog.

Responsabilidades:
- Expresar claramente los elementos del Product Backlog
- Ordenar los elementos del Product Backlog para alcanzar los objetivos de la mejor manera
- Optimizar el valor del trabajo del Equipo de Desarrollo
- Asegurar que el Product Backlog sea visible, transparente y claro
- Asegurar que el Equipo de Desarrollo entiende los elementos del Product Backlog

## Scrum Master
El Scrum Master es responsable de promover y apoyar Scrum. Ayuda a todos a entender la teoría, prácticas, reglas y valores de Scrum.

Responsabilidades:
- Facilitar eventos Scrum según se requiera
- Entrenar al Equipo de Desarrollo en autogestión y multifuncionalidad
- Ayudar al Equipo de Desarrollo a crear productos de alto valor
- Eliminar impedimentos para el progreso del Equipo de Desarrollo
- Asegurar que todos los eventos Scrum se lleven a cabo

## Development Team
El Development Team consiste en profesionales que realizan el trabajo de entregar un Incremento de producto "Terminado" potencialmente desplegable al final de cada Sprint.

Características:
- Son autoorganizados
- Son multifuncionales
- No tienen títulos individuales
- Tamaño óptimo: 3-9 personas
- Son responsables colectivamente del trabajo
    `
  },
  {
    title: "Guía Scrum - Ceremonias y Eventos",
    type: "guia",
    content: `
# Eventos Scrum

## Sprint
El corazón de Scrum es el Sprint, un time-box de un mes o menos durante el cual se crea un incremento de producto "Terminado" utilizable y potencialmente desplegable.

Características:
- Duración fija: 1-4 semanas (típicamente 2 semanas)
- Objetivo claro del Sprint
- No se hacen cambios que pongan en peligro el objetivo
- El alcance puede clarificarse y renegociarse

## Sprint Planning
El trabajo a realizar durante el Sprint se planifica en el Sprint Planning. El plan se crea mediante el trabajo colaborativo del Equipo Scrum completo.

Time-box: 8 horas para Sprints de un mes
Responde a:
- ¿Qué puede entregarse en el Incremento resultante?
- ¿Cómo se conseguirá hacer el trabajo necesario?

## Daily Scrum (Daily Standup)
El Daily Scrum es una reunión de 15 minutos para el Equipo de Desarrollo.

Estructura:
- ¿Qué hice ayer que ayudó al equipo a cumplir el objetivo del Sprint?
- ¿Qué haré hoy para ayudar al equipo a cumplir el objetivo del Sprint?
- ¿Veo algún impedimento que evite que el equipo o yo cumplamos el objetivo?

## Sprint Review
Se lleva a cabo al final del Sprint para inspeccionar el Incremento y adaptar el Product Backlog si fuera necesario.

Time-box: 4 horas para Sprints de un mes
Actividades:
- Demostración del trabajo "Terminado"
- Revisión del estado del Product Backlog
- Colaboración sobre qué hacer a continuación
- Revisión de la línea de tiempo, presupuesto, capacidades

## Sprint Retrospective
Es una oportunidad para el Equipo Scrum de inspeccionarse a sí mismo y crear un plan de mejoras.

Time-box: 3 horas para Sprints de un mes
Temas:
- ¿Qué salió bien durante el Sprint?
- ¿Qué problemas surgieron?
- ¿Cómo se resolvieron (o no) esos problemas?
- ¿Qué podemos mejorar en el próximo Sprint?
    `
  },
  {
    title: "Caso de Uso - Sistema de Autenticación",
    type: "caso_uso",
    content: `
# Sistema de Autenticación

## Historia de Usuario
Como usuario del sistema
Quiero poder registrarme e iniciar sesión de forma segura
Para acceder a las funcionalidades protegidas de la aplicación

## Descripción Detallada
El sistema debe proporcionar un mecanismo robusto de autenticación que permita a los usuarios crear cuentas, iniciar sesión y mantener sesiones seguras.

## Actores
- Usuario no registrado
- Usuario registrado
- Sistema de autenticación

## Precondiciones
- El sistema está operativo
- La base de datos de usuarios está disponible
- El servicio de email está configurado

## Flujo Principal
1. El usuario accede a la página de registro
2. El usuario completa el formulario con email y contraseña
3. El sistema valida el formato del email
4. El sistema verifica la fortaleza de la contraseña
5. El sistema crea la cuenta y envía email de confirmación
6. El usuario confirma su email mediante el enlace
7. El usuario puede iniciar sesión con sus credenciales

## Flujos Alternativos
- Email ya registrado: mostrar mensaje de error
- Formato de email inválido: validación en tiempo real
- Contraseña débil: mostrar requisitos de contraseña
- Credenciales incorrectas en login: mostrar mensaje genérico

## Criterios de Aceptación
- [x] El usuario puede crear una cuenta con email y contraseña
- [x] Validación de formato de email (regex estándar)
- [x] Contraseña debe tener mínimo 8 caracteres
- [x] Contraseña debe contener al menos una mayúscula, minúscula y número
- [x] Email de confirmación enviado automáticamente
- [x] Link de confirmación válido por 24 horas
- [x] Login exitoso con credenciales correctas
- [x] Mensaje de error genérico para login fallido (seguridad)
- [x] Sesión persistente con tokens JWT
- [x] Opción de "Recordar sesión"

## Requisitos No Funcionales
- Contraseñas hasheadas con bcrypt (costo 12)
- Tokens JWT con expiración de 24 horas
- Rate limiting: máximo 5 intentos de login por IP en 15 minutos
- HTTPS obligatorio en producción
- Registro de intentos fallidos en logs

## Estimación
Story Points: 8
Prioridad: Alta
Sprint: 1
    `
  },
  {
    title: "Caso de Uso - Gestión de Carrito de Compras",
    type: "caso_uso",
    content: `
# Gestión de Carrito de Compras

## Historia de Usuario
Como cliente de la tienda online
Quiero poder agregar productos a un carrito de compras
Para poder revisar y modificar mi pedido antes de finalizar la compra

## Descripción
Sistema de carrito de compras que permita a los usuarios gestionar productos antes del checkout.

## Actores
- Cliente (usuario autenticado o anónimo)
- Sistema de inventario
- Sistema de carrito

## Flujo Principal
1. El cliente navega el catálogo de productos
2. El cliente selecciona un producto
3. El cliente hace click en "Agregar al carrito"
4. El sistema verifica disponibilidad en inventario
5. El sistema agrega el producto al carrito
6. El sistema muestra confirmación visual
7. El cliente puede ver resumen del carrito

## Funcionalidades Requeridas
- Agregar productos al carrito
- Modificar cantidad de productos
- Eliminar productos del carrito
- Ver resumen de precios (subtotal, impuestos, envío)
- Persistencia del carrito (localStorage para anónimos, DB para autenticados)
- Sincronización entre dispositivos (usuarios autenticados)

## Criterios de Aceptación
- [x] Agregar producto incrementa contador del carrito
- [x] Modificar cantidad actualiza precios automáticamente
- [x] Eliminar producto lo remueve completamente
- [x] Carrito persiste entre sesiones
- [x] Carrito anónimo se transfiere al hacer login
- [x] Validación de stock antes de agregar
- [x] Mensaje si producto no tiene stock suficiente
- [x] Cálculo correcto de subtotal e impuestos
- [x] Indicador visual de productos en carrito (badge)

## Requisitos Técnicos
- Estado del carrito en Redux/Zustand
- API endpoints: GET, POST, PUT, DELETE /api/cart
- Validación de stock en tiempo real
- Manejo de productos sin stock
- Rate limiting para prevenir abusos

## Dependencias
- Sistema de autenticación (US-001)
- Catálogo de productos (US-002)
- Sistema de inventario (US-003)

## Estimación
Story Points: 5
Prioridad: Alta
Sprint: 2
    `
  },
  {
    title: "Definition of Done - Estándar del Equipo",
    type: "guia",
    content: `
# Definition of Done (DoD)

## ¿Qué es la Definition of Done?
La Definition of Done es una lista de criterios que debe cumplir una historia de usuario para considerarse completamente terminada y lista para producción.

## DoD para Historias de Usuario

### Desarrollo
- [ ] Código implementado según especificaciones
- [ ] Código revisado por al menos un compañero (code review)
- [ ] Cumple con estándares de código del equipo (linter)
- [ ] Sin warnings ni errores de compilación
- [ ] Refactoring completado si fue necesario
- [ ] Código commiteado en la rama correspondiente

### Testing
- [ ] Unit tests escritos con cobertura mínima del 80%
- [ ] Todos los tests pasan (verde)
- [ ] Integration tests completados si aplica
- [ ] Testing manual realizado en ambiente de desarrollo
- [ ] Casos edge identificados y probados
- [ ] No hay bugs críticos o bloqueantes

### Documentación
- [ ] Código comentado (solo lo no obvio)
- [ ] README actualizado si es necesario
- [ ] Documentación técnica actualizada
- [ ] Documentación de API actualizada (Swagger/OpenAPI)
- [ ] CHANGELOG actualizado

### Calidad
- [ ] Cumple criterios de aceptación definidos
- [ ] UX/UI aprobado por diseño (si aplica)
- [ ] Accesibilidad verificada (WCAG mínimo AA)
- [ ] Performance aceptable (métricas definidas)
- [ ] Sin vulnerabilidades de seguridad conocidas

### Deployment
- [ ] Merged a rama principal (main/develop)
- [ ] Build exitoso en CI/CD
- [ ] Desplegado en ambiente de staging
- [ ] Probado en staging por QA
- [ ] Aprobado por Product Owner
- [ ] Listo para producción

## DoD para Sprints

- [ ] Todos los items del Sprint cumplen el DoD individual
- [ ] Integración entre features completada
- [ ] Documentación de sprint actualizada
- [ ] Demo preparada para Sprint Review
- [ ] Retrospectiva del sprint documentada
- [ ] Product Backlog actualizado

## Notas Importantes

### Flexibilidad
El DoD puede adaptarse según el tipo de proyecto o fase:
- MVP puede tener DoD más ligero
- Productos maduros pueden requerir DoD más estricto

### Responsabilidad
- Es responsabilidad de TODO el equipo, no solo del desarrollador
- Se revisa y actualiza periódicamente en retrospectivas

### Transparencia
- Debe estar visible para todo el equipo
- Todos los stakeholders deben conocerlo
- No se puede "negociar" individualmente por historia
    `
  }
];

async function main() {
  console.log('🚀 Inicializando base de datos Scrum LLM...\n');
  await getPool();
  console.log(`✓ Conectado a ${describeDatabase()}\n`);

  let inserted = 0;
  for (const doc of sampleDocuments) {
    try {
      await documentQueries.create(doc.title, doc.content, doc.type, 'general');
      console.log(`✓ Insertado: ${doc.title}`);
      inserted++;
    } catch (error) {
      console.error(`✗ Error insertando ${doc.title}:`, error.message);
    }
  }

  console.log(`\n✅ Inicialización completada: ${inserted}/${sampleDocuments.length} documentos insertados`);
  console.log('\nEsos manuales quedaron en el proyecto "general".');
  console.log('Indexa el RAG con: node engine/cli.js indexar --proyecto general\n');
}

main()
  .catch((error) => {
    console.error('✗', error.message);
    process.exitCode = 1;
  })
  .finally(() => close());
