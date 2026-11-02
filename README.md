# 🚀 Scrum LLM Assistant

Sistema inteligente basado en **Hermes 3 + Ollama** para la generación automática de plantillas Scrum basadas en casos de uso. Incluye sistema RAG (Retrieval-Augmented Generation) con base de datos local para contextualizar respuestas con manuales y documentación del proyecto.

## ✨ Características

- **Chat con IA**: Asistente conversacional experto en metodología Scrum
- **Sistema RAG**: Almacenamiento y búsqueda semántica de documentos en SQLite local
- **Generación de Plantillas**: Creación automática de:
  - Product Backlog con historias de usuario
  - Planificación de Sprints
  - Estimaciones (Story Points)
  - Definition of Done
  - Roles y Ceremonias Scrum
  - Análisis de dependencias
- **Compatible con AMD RX**: Optimizado para tarjetas gráficas AMD
- **JavaScript/TypeScript**: Stack completo en Node.js + Next.js

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

```bash
# Modelo principal: Hermes 3
ollama pull hermes3

# Modelo para embeddings (RAG)
ollama pull nomic-embed-text
```

### 3. Verificar instalación

```bash
ollama list
# Debe mostrar hermes3 y nomic-embed-text
```

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Iniciar Ollama (si no está corriendo)
ollama serve

# En otra terminal, iniciar la aplicación
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

## 📚 Uso

### 1. Gestión de Documentos (RAG)

1. Ve a la pestaña **"📚 Documentos (RAG)"**
2. Click en **"+ Nuevo Documento"**
3. Agrega casos de uso, manuales o guías:
   - **Título**: Nombre descriptivo
   - **Tipo**: Caso de uso, Manual, Guía u Otro
   - **Contenido**: Texto completo del documento
4. El sistema automáticamente:
   - Divide el documento en chunks
   - Genera embeddings con Ollama
   - Indexa en la base de datos SQLite

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

### 2. Chat con IA

1. Ve a la pestaña **"💬 Chat con IA"**
2. Activa **"Usar RAG"** para que use contexto de los documentos
3. Haz preguntas sobre metodología Scrum:
   - "¿Cómo organizo mi primer sprint?"
   - "Explica las ceremonias Scrum"
   - "¿Qué es un Definition of Done?"
4. El sistema responderá usando:
   - Conocimiento del modelo Hermes 3
   - Contexto relevante de tus documentos (RAG)

### 3. Generador de Plantillas Scrum

1. Ve a la pestaña **"✨ Plantillas Scrum"**
2. Completa el formulario:
   - **Nombre del Proyecto**: Ej. "Sistema E-commerce"
   - **Descripción**: Resumen del proyecto
   - **Casos de Uso**: Agrega múltiples casos de uso
3. Click en **"✨ Generar Plantilla Scrum"**
4. El sistema generará automáticamente:
   - **Product Backlog**: Historias de usuario con IDs, prioridades y story points
   - **Sprints Sugeridos**: Planificación con objetivos y duración
   - **Definition of Done**: Criterios de finalización
   - **Dependencias**: Relaciones entre historias

**Ejemplo de entrada:**

```
Nombre: Plataforma de Reservas
Descripción: Sistema online para reservar servicios profesionales

Casos de uso:
1. Como usuario quiero registrarme en la plataforma
2. Como cliente quiero buscar profesionales por categoría
3. Como cliente quiero reservar una cita
4. Como profesional quiero gestionar mi agenda
5. Como profesional quiero recibir notificaciones de reservas
```

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐   │
│  │   Chat   │  │Documents │  │Template Generator  │   │
│  └──────────┘  └──────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   API Routes (Next.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ /api/ollama  │  │/api/documents│  │/api/templates│ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────────┐         ┌─────────────────┐
│   Ollama Server     │         │  SQLite DB      │
│  ┌───────────────┐  │         │  ┌────────────┐ │
│  │   Hermes 3    │  │         │  │ Documents  │ │
│  │  (LLM Chat)   │  │         │  │ Embeddings │ │
│  └───────────────┘  │         │  │ Templates  │ │
│  ┌───────────────┐  │         │  └────────────┘ │
│  │ nomic-embed   │  │         └─────────────────┘
│  │  (Embeddings) │  │
│  └───────────────┘  │
└─────────────────────┘
```

## 📁 Estructura del Proyecto

```
/workspace
├── app/
│   ├── api/
│   │   ├── ollama/route.ts      # Endpoint chat con LLM
│   │   ├── documents/route.ts   # CRUD documentos + indexación
│   │   └── templates/route.ts   # Generación plantillas Scrum
│   ├── layout.tsx
│   └── page.tsx                 # Página principal
├── components/
│   ├── ChatInterface.tsx        # Interfaz de chat
│   ├── DocumentManager.tsx      # Gestión de documentos
│   └── TemplateGenerator.tsx    # Generador de plantillas
├── lib/
│   ├── db.ts                    # Configuración SQLite + queries
│   └── rag.ts                   # Sistema RAG (embeddings + búsqueda)
├── data/
│   └── scrum-llm.db            # Base de datos SQLite (auto-generada)
└── package.json
```

## 🔧 Configuración Avanzada

### Variables de Entorno

Crea un archivo `.env.local`:

```env
# URL de Ollama (por defecto: http://127.0.0.1:11434)
OLLAMA_HOST=http://localhost:11434

# Puerto de la aplicación
PORT=3000
```

### Cambiar modelos

Edita `lib/rag.ts` para usar otros modelos:

```typescript
// Cambiar modelo de chat
const response = await ollama.chat({
  model: 'llama2',  // o 'mixtral', 'gemma', etc.
  // ...
});

// Cambiar modelo de embeddings
const response = await ollama.embeddings({
  model: 'all-minilm',  // o 'mxbai-embed-large'
  // ...
});
```

### Optimización para AMD RX

Ollama detecta automáticamente tarjetas AMD RX y usa ROCm. Verifica:

```bash
# Ver información del dispositivo
rocm-smi

# Verificar que Ollama use GPU
ollama run hermes3 "test"
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

### Error: "Model not found"

```bash
# Descargar los modelos necesarios
ollama pull hermes3
ollama pull nomic-embed-text

# Verificar
ollama list
```

### Base de datos bloqueada

```bash
# Detener la aplicación
# Eliminar archivo de base de datos
rm data/scrum-llm.db

# Reiniciar aplicación (se creará automáticamente)
npm run dev
```

### Rendimiento lento

- Usa chunks más pequeños en `lib/rag.ts` (reduce `chunkSize`)
- Reduce `topK` en búsquedas RAG (menos contexto)
- Usa modelos más pequeños (llama2 en vez de hermes3)

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
- [Next.js](https://nextjs.org/)
- [Scrum Guide](https://scrumguides.org/)

---

**Desarrollado con ❤️ usando Hermes 3, Ollama y Next.js**
#   l l m - p l a n t i l l a - s c r u m  
 