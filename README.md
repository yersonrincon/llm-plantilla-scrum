# 🚀 Scrum LLM Assistant

Sistema inteligente basado en **Hermes 3 + Ollama** para la generación automática de plantillas Scrum basadas en casos de uso. Incluye sistema RAG (Retrieval-Augmented Generation) con base de datos local para contextualizar respuestas con manuales y documentación del proyecto.

## ✨ Características

- **Chat con IA**: Asistente conversacional experto en metodología Scrum
- **Sistema RAG**: Documentos, embeddings y plantillas guardados en PostgreSQL local; la búsqueda semántica (similitud coseno) la hace PostgreSQL
- **Generación de Plantillas**: Creación automática de:
  - Product Backlog con historias de usuario
  - Planificación de Sprints
  - Estimaciones (Story Points)
  - Definition of Done
  - Roles y Ceremonias Scrum
  - Análisis de dependencias
- **Compatible con AMD RX**: Optimizado para tarjetas gráficas AMD
- **JavaScript puro**: Node.js con `http` y `fetch` nativos; dependencias en JavaScript puro, sin compilación: `pg` (PostgreSQL) y `unpdf` (leer PDF)

## 🛠️ Requisitos

### 1. Ollama

Instalar Ollama para tu sistema operativo:

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# macOS
brew install ollama

# Windows
# Descargar desde https://ollama.com/download
```

### 2. Modelos necesarios

Los modelos son gratuitos y abiertos. Se descargan una sola vez (unos 2,3 GB en total) y después funcionan sin internet, en tu propio equipo.

```bash
# Modelo de chat: Hermes 3 (3B, cuantizado q4_K_M, ~2 GB)
ollama pull hermes3:3b-llama3.2-q4_K_M

# Modelo para embeddings (RAG, ~274 MB)
ollama pull nomic-embed-text
```

Si prefieres no descargar Hermes y ya tienes `llama3.2`, puedes usarlo poniendo en `.env`:

```env
OLLAMA_CHAT_MODEL=llama3.2
```

### 3. Verificar instalación

```bash
ollama list
# Debe mostrar hermes3:3b-llama3.2-q4_K_M (o el modelo de OLLAMA_CHAT_MODEL) y nomic-embed-text
```

### 4. PostgreSQL

Instala [PostgreSQL](https://www.postgresql.org/download/) (probado con la versión 18). No necesita extensiones como pgvector: la similitud coseno se calcula con una función SQL que el proyecto crea solo.

## 🚀 Instalación

Requiere **Node.js 22.13 o superior** y **PostgreSQL** (probado con 18). No hay paquetes nativos que compilar, así que no hace falta Visual Studio ni Python, y PostgreSQL no necesita extensiones.

1. Copia `.env.example` a `.env` y pon los datos de tu PostgreSQL (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`). La base (`scrum_rag` por defecto) y sus tablas se crean solas al arrancar.
2. Si tenías datos de la versión con SQLite, cópialos con `node engine/cli.js migrar-sqlite` (no duplica si lo ejecutas dos veces).

```bash
npm install

# Iniciar Ollama (si no está corriendo)
ollama serve

# En otra terminal
npm start
```

La aplicación estará disponible en: **http://127.0.0.1:43124**

Todo lo que hace la interfaz web también se puede hacer por consola con `node engine/cli.js help`.

## 📚 Uso

La interfaz es un chat con el asistente (Hermes). A la izquierda están el proyecto, sus manuales y las plantillas generadas.

### 1. Cargar los manuales del proyecto

1. Escribe el nombre del proyecto en la barra lateral (o pulsa **"Usar casos de ejemplo"** en el chat)
2. Pulsa **📎** o arrastra los archivos al chat. Formatos: **PDF, Word (.docx), TXT y Markdown**
3. Cada archivo aparece como adjunto en la caja de mensaje; ahí puedes cambiar su tipo (Caso de uso, Manual, Guía Scrum u Otro)
4. Envía el mensaje: el asistente guarda los documentos y te muestra el texto que leyó

También puedes **pegar el texto** de un caso de uso directamente en el chat (300 caracteres o más) y se guarda como documento. Los PDF escaneados (imágenes sin texto seleccionable) no se pueden leer; en ese caso pega el texto.

**Ejemplo de caso de uso:**

```
Título: Sistema de Autenticación
Tipo: Caso de uso
Contenido:
Como usuario del sistema
Quiero poder registrarme e iniciar sesión
Para acceder a las funcionalidades protegidas

Criterios de aceptación:
- El usuario puede crear una cuenta con email y contraseña
- Validación de formato de email
- Contraseña con mínimo 8 caracteres
- Confirmación por email
- Login con credenciales correctas
- Manejo de errores para credenciales inválidas
```

### 2. Base de conocimiento (documentación compartida)

Además de los manuales de cada proyecto, puedes guardar en PostgreSQL **toda la documentación de apoyo que quieras**: guías Scrum, estándares de calidad, ejemplos de plantillas, manuales de buenas prácticas. Va a un proyecto especial llamado `base_conocimiento` que comparten todos los proyectos.

Cuando un usuario carga su manual de casos de uso y pide la plantilla, Hermes combina las dos fuentes:

| Parte de la plantilla | De dónde sale |
|---|---|
| Visión, actores, alcance e historias de usuario | Solo del manual de casos de uso del proyecto |
| Plan de sprints, definition of done/ready, ceremonias, roles y riesgos | Del manual del proyecto y de la base de conocimiento (si el proyecto dice algo, manda el proyecto) |

En la plantilla aparece la lista **"📚 Base de conocimiento consultada"** con los documentos que se usaron.

**Cargar documentación a la base:**

- **Desde el chat:** en la barra lateral, sección **Base de conocimiento**, pulsa **Cargar**, adjunta los archivos con 📎 y envía. Se guardan e indexan en el momento. Pulsa **Salir** para volver a tu proyecto.
- **Una carpeta completa por consola** (recomendado para mucha documentación; recorre subcarpetas, se salta los archivos repetidos y sigue aunque alguno falle):

```powershell
node engine/cli.js cargar-carpeta --carpeta .\documentacion
node engine/cli.js base     # cuántos documentos y fragmentos tiene la base
```

Opciones: `--tipo manual|guia|otro` (por defecto `guia`), `--proyecto otro_nombre` para cargar la carpeta en un proyecto normal, `--sin-indexar` para indexar después.

El sistema no guarda dos veces un documento con el mismo contenido en el mismo proyecto.

### Depuración de los archivos

Los archivos no se guardan tal cual. Antes de guardar, el texto pasa por una depuración (`engine/clean.js`) que se aplica a todo lo que entra, ya sea por el chat, por `agregar` o por `cargar-carpeta`:

| Qué se quita o corrige | Ejemplo |
|---|---|
| Encabezados y pies de página repetidos en cada página | "SGAP \| Diagrama de clases" en las 23 páginas |
| Números de página | "2", "Página 3 de 10" |
| Índices / tablas de contenido | "Teoría de Scrum ........ 3" |
| Avisos de licencia y copyright | "© 2020 … Creative Commons" |
| Párrafos duplicados y líneas sin texto | |
| Líneas cortadas a mitad de frase y palabras partidas con guion | "desa-\nrrollo" → "desarrollo" |
| Caracteres raros de los PDF | ligaduras (ﬁ), espacios invisibles, viñetas convertidas en letras |

En PostgreSQL solo se guarda el **texto limpio**, no el PDF. Al indexar, los fragmentos respetan los párrafos y se descartan los que no tienen texto útil, así Ollama calcula menos embeddings y Hermes recibe un contexto más limpio. En el chat, cada archivo adjunto muestra con 🧹 lo que se depuró.

Mantenimiento de lo que ya está guardado:

```powershell
node engine/cli.js depurar      # vuelve a limpiar los documentos guardados y reindexa solo los que cambiaron
node engine/cli.js limpiar      # borra duplicados, documentos vacíos y embeddings de modelos viejos; compacta la base (VACUUM FULL)
```

### 3. Preguntas sobre la base

Escribe una pregunta en el chat (por ejemplo *«¿Qué pasa si el pago es rechazado?»*). Hermes responde usando los documentos del proyecto y la base de conocimiento, y cita las fuentes.

Por consola: `node engine/cli.js consultar --proyecto tienda --pregunta "¿Qué valida el registro?"`

### 4. Generador de Plantillas Scrum

1. Pulsa **"✨ Generar plantilla Scrum"** o escribe *«Genera la plantilla Scrum»*. Primero se indexan los documentos nuevos (chunks + embeddings con Ollama guardados en PostgreSQL) y luego Hermes analiza los manuales por fases; el asistente muestra en el chat la fase en curso
2. El sistema generará automáticamente:
   - **Product Backlog**: Historias de usuario con IDs, prioridades y story points
   - **Sprints Sugeridos**: Planificación con objetivos y duración
   - **Definition of Done**: Criterios de finalización
   - **Dependencias**: Relaciones entre historias

3. **Tablero estilo Jira / Trello**: cada historia se divide en tareas (análisis, base de datos, backend, frontend, pruebas, despliegue) con su **responsable** y sus **horas**. Las tareas las propone Hermes; las fechas, la capacidad y el reparto los calcula el sistema:
   - Fechas de inicio y fin de cada sprint en días hábiles (por defecto empieza el próximo lunes).
   - Historias que el plan no asignó: se reparten por prioridad sin pasar de `VELOCIDAD_SPRINT` puntos por sprint.
   - **Distribución del trabajo por persona**: horas por sprint frente a su capacidad (`HORAS_POR_DIA` × días hábiles), con aviso si alguien queda sobrecargado.
   - En la barra lateral, **Equipo y fechas** permite poner el nombre de cada persona por rol y la fecha de inicio.
   - Botones **📤 Crear en Trello** y **📤 Crear en Jira**: crean el tablero directamente por la API (gratuita). Ver [Exportar a Trello y Jira](#5-exportar-a-trello-y-jira).
   - Botón **🗂️ Tablero independiente (HTML)**: descarga un solo archivo `.html` que se abre con doble clic en cualquier navegador, sin Jira, Trello ni internet. Tiene columnas *Por hacer → En progreso → En revisión → Hecho*, tarjetas que se arrastran, filtro por sprint y por persona, avance en horas, tabla de historias y carga por persona. El avance se guarda en el navegador y se puede exportar con **Guardar avance (JSON)**.
   - Botón **⬇ CSV para Jira / Trello**: historias como *Story* y tareas como *Sub-task* con sprint, estimación, responsable y fechas. En Jira: *Configuración del sistema → Importación externa → CSV*. En Trello necesitas un Power-Up de importación CSV.

   Por consola: `node engine/cli.js plantilla --proyecto tienda --inicio 2026-11-09 --equipo.qa "Luis" --equipo.desarrollador_backend "Ana"`
4. La plantilla se guarda en PostgreSQL (columna JSONB), aparece como respuesta del asistente y se puede **descargar en Markdown o JSON**. Las anteriores quedan en **"Plantillas generadas"** de la barra lateral

Por consola: `node engine/cli.js plantilla --proyecto tienda --nombre "Scrum tienda"`

**Ejemplo de casos de uso para cargar como documentos:**

```
1. Como usuario quiero registrarme en la plataforma
2. Como cliente quiero buscar profesionales por categoría
3. Como cliente quiero reservar una cita
4. Como profesional quiero gestionar mi agenda
5. Como profesional quiero recibir notificaciones de reservas
```

### 5. Exportar a Trello y Jira

Las dos APIs son gratuitas. Escribe los datos en la barra lateral, sección **Trello y Jira** (se guardan solo en tu navegador), o ponlos en `.env` para no escribirlos cada vez.

**Trello** (cualquier cuenta gratuita):

1. Entra a <https://trello.com/power-ups/admin>, crea un Power-Up (cualquier nombre y workspace) y abre la pestaña **API key**. Copia la key.
2. Pégala en el panel; aparece el enlace **Generar el token de Trello**. Acepta el permiso y copia el token.
3. Pulsa **📤 Crear en Trello**. Se crea un tablero nuevo con:
   - Listas *Product backlog → Por hacer → En progreso → En revisión → Hecho*.
   - Una tarjeta por historia, con descripción, criterios de aceptación, etiqueta de prioridad (roja, amarilla o verde), etiqueta de sprint y fechas de inicio y fin del sprint.
   - Un checklist por tarjeta con las tareas, su responsable y sus horas.
   - Las historias del primer sprint en *Por hacer*; las demás en *Product backlog*.

**Jira Cloud** (plan Free, hasta 10 usuarios):

1. Crea un proyecto **Scrum** en Jira (por ejemplo con clave `SCRUM`).
2. Crea un API token en <https://id.atlassian.com/manage-profile/security/api-tokens>.
3. Escribe el sitio (`tu-empresa.atlassian.net`), tu correo, el token y la clave del proyecto. Pulsa **📤 Crear en Jira**. Se crean:
   - Una *Historia* por historia, con descripción, criterios, prioridad, story points, etiquetas y fecha de vencimiento.
   - Una *Subtarea* por tarea con su estimación en horas. Si el nombre del responsable coincide con un usuario de Jira, se le asigna.
   - Un sprint de Jira por cada sprint del plan, con sus fechas y su objetivo, y sus historias dentro.
   - Si el proyecto no tiene algún campo (por ejemplo, el seguimiento de tiempo), lo omite y te avisa.

```env
TRELLO_API_KEY=tu_key
TRELLO_TOKEN=tu_token
JIRA_SITIO=tu-empresa.atlassian.net
JIRA_EMAIL=tu@correo.com
JIRA_API_TOKEN=tu_token
JIRA_PROYECTO=SCRUM
```

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│        Frontend (engine/public/index.html, JS puro)      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│          Servidor HTTP de Node (engine/server.js)        │
│  /api/documentos  /api/indexar  /api/plantilla           │
│  /api/consultar   /api/plantillas  /api/salud            │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────────┐         ┌───────────────────────┐
│   Ollama Server     │         │  PostgreSQL scrum_rag │
│  ┌───────────────┐  │         │  ┌─────────────────┐  │
│  │   Hermes 3    │  │         │  │ documents       │  │
│  │  (LLM Chat)   │  │         │  │ embeddings      │  │
│  └───────────────┘  │         │  │   (REAL[])      │  │
│  ┌───────────────┐  │         │  │ templates       │  │
│  │ nomic-embed   │  │         │  │   (JSONB)       │  │
│  │  (Embeddings) │  │         │  │ cosine_similarity│ │
│  └───────────────┘  │         │  └─────────────────┘  │
└─────────────────────┘         └───────────────────────┘
```

## 📁 Estructura del Proyecto

```
.
├── engine/
│   ├── cli.js                   # Comandos de consola
│   ├── server.js                # Servidor HTTP + API
│   ├── public/index.html        # Interfaz web
│   ├── config.js                # Variables de entorno y perfiles RX
│   ├── db.js                    # PostgreSQL: esquema, consultas y búsqueda por similitud
│   ├── migrate-sqlite.js        # Copia la base SQLite antigua a PostgreSQL
│   ├── ollama.js                # Cliente REST de Ollama con fetch
│   ├── extract.js               # Texto de PDF, DOCX, TXT y MD
│   ├── clean.js                 # Depuración del texto antes de guardarlo
│   ├── rag.js                   # Chunks, embeddings y búsqueda
│   ├── workflow.js              # Generación de plantillas por fases
│   ├── board.js                 # Tablero: tareas, responsables, horas, fechas y carga por persona
│   ├── integraciones.js         # Exportar el tablero a Trello y Jira Cloud por su API
│   ├── service.js               # Lógica compartida CLI/servidor y carga de carpetas
│   └── samples.js               # Casos de uso de ejemplo
├── scripts/init-db.js           # Carga guías Scrum de ejemplo
└── package.json
```

## 🔧 Configuración Avanzada

### Variables de Entorno

Copia `.env.example` a `.env` y ajusta lo que necesites:

```env
# URL de Ollama (por defecto: http://127.0.0.1:11434)
OLLAMA_HOST=http://127.0.0.1:11434

# Puerto de la aplicación
LLM_PORT=43124

# PostgreSQL (la base se crea sola si no existe)
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=postgres
PGPASSWORD=tu_contraseña
PGDATABASE=scrum_rag

# Base de conocimiento compartida
RAG_BASE_PROYECTO=base_conocimiento   # nombre del proyecto que actúa como base
RAG_BASE_PORCION=0.35                 # parte del contexto reservada para la base (0 a 1)
RAG_BASE_FRAGMENTOS=12                # fragmentos máximos que se traen de la base
RAG_BASE_MIN_SIMILITUD=0.4            # descarta fragmentos de la base poco parecidos
```

### Cambiar modelos

Por defecto se usan `hermes3:3b-llama3.2-q4_K_M` para el chat y `nomic-embed-text` para los embeddings. Para cambiarlos, defínelos en `.env`:

```env
OLLAMA_CHAT_MODEL=llama3.2
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

Si cambias el modelo de embeddings, los documentos se vuelven a indexar con el nuevo modelo la próxima vez que generes una plantilla o hagas una pregunta.

### Ver las tablas en PostgreSQL

Con **pgAdmin**: `Servers → PostgreSQL 18 → Databases → scrum_rag → Schemas → public → Tables`, clic derecho en una tabla → **View/Edit Data → All Rows**.

Con **psql** (en Windows PowerShell):

```powershell
chcp 1252
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -U postgres -d scrum_rag
```

Ya dentro de psql (indicador `scrum_rag=#`):

```sql
\dt                                               -- lista las tablas (barra invertida \, no /)
\d documents                                      -- columnas de una tabla
SELECT id, project, title FROM documents;         -- las consultas SQL terminan en ;
SELECT document_id, COUNT(*) FROM embeddings GROUP BY document_id;
SELECT id, project, name, created_at FROM templates;
\q                                                -- salir
```

Si el indicador cambia a `scrum_rag-#`, hay una consulta sin terminar: escribe `\r` para limpiarla.

| Tabla | Contenido |
|---|---|
| `documents` | Manuales y casos de uso cargados (texto completo) |
| `embeddings` | Fragmentos (chunks) de cada documento con su vector `REAL[]` |
| `templates` | Plantillas Scrum generadas (JSONB) |

### Optimización para AMD RX

Ollama detecta automáticamente tarjetas AMD RX y usa ROCm. Verifica:

```bash
# Ver información del dispositivo
rocm-smi

# Verificar que Ollama use GPU
ollama run hermes3:3b-llama3.2-q4_K_M "test"
# Durante la ejecución, en otra terminal:
rocm-smi
# Debe mostrar uso de GPU
```

## 🧪 Troubleshooting

### Error: "No se pudo conectar a Ollama"

```bash
# Verificar que Ollama esté corriendo
ollama list

# Si no está corriendo, iniciar:
ollama serve

# Verificar puerto
curl http://localhost:11434/api/version
```

### Error: "Faltan modelos en Ollama"

```bash
# Descargar los modelos necesarios
ollama pull hermes3:3b-llama3.2-q4_K_M
ollama pull nomic-embed-text

# Verificar
ollama list
```

O usa un modelo que ya tengas con `OLLAMA_CHAT_MODEL` en `.env`. Después reinicia el servidor (Ctrl+C y `npm start`).

### Error: "Estos documentos todavía no tienen RAG"

Ese mensaje es de una versión anterior del servidor. Detén el `npm start` que esté corriendo (Ctrl+C) y vuelve a iniciarlo: la versión actual indexa sola los documentos pendientes.

### Error de conexión a PostgreSQL

- **ECONNREFUSED**: el servicio de PostgreSQL no está iniciado (en Windows: `services.msc` → `postgresql-x64-18` → Iniciar).
- **Autenticación fallida (28P01)**: revisa `PGUSER` y `PGPASSWORD` en `.env`. El usuario que crea el instalador es `postgres`.

### Error: "token repeat limit reached"

El modelo entró en un bucle repitiendo texto. El sistema lo reintenta solo hasta tres veces con parámetros que lo evitan. Si sigue pasando, prueba con un modelo más grande (`OLLAMA_CHAT_MODEL=hermes3` si tu GPU tiene 8 GB o más).

### Rendimiento lento

- Usa chunks más pequeños (`RAG_CHUNK_SIZE` en `.env`)
- Baja el perfil de VRAM (`RX_VRAM=4` o `6`) para enviar menos contexto
- Usa modelos más pequeños (`OLLAMA_CHAT_MODEL`)

## 📝 Ejemplos de Casos de Uso

### E-commerce

```
1. Como visitante quiero ver el catálogo de productos
2. Como usuario quiero agregar productos al carrito
3. Como usuario quiero realizar el checkout y pago
4. Como usuario quiero ver el historial de mis pedidos
5. Como administrador quiero gestionar el inventario
```

### Sistema de Gestión de Proyectos

```
1. Como usuario quiero crear un nuevo proyecto
2. Como miembro quiero crear y asignar tareas
3. Como líder quiero ver el progreso del equipo
4. Como miembro quiero actualizar el estado de mis tareas
5. Como usuario quiero recibir notificaciones de cambios
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📄 Licencia

MIT

## 🔗 Enlaces Útiles

- [Ollama](https://ollama.com/)
- [Hermes 3](https://ollama.com/library/hermes3)
- [Node.js](https://nodejs.org/)
- [Scrum Guide](https://scrumguides.org/)

---

**Desarrollado con ❤️ usando Hermes 3, Ollama, PostgreSQL y Node.js**
