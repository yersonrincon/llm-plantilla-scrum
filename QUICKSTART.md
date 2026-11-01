# 🚀 Inicio Rápido - Scrum LLM Assistant

## ⚠️ Requisito Previo Importante

**Ollama no está instalado en este entorno.** La aplicación necesita Ollama corriendo localmente para funcionar completamente.

## Instalación de Ollama

### En tu máquina local:

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# macOS
brew install ollama

# Windows
# Descargar desde https://ollama.com/download
```

### Descargar modelos necesarios:

```bash
# Modelo principal (OBLIGATORIO)
ollama pull hermes3

# Modelo para embeddings (OBLIGATORIO para RAG)
ollama pull nomic-embed-text
```

### Iniciar servidor:

```bash
ollama serve
```

## Iniciar la Aplicación

```bash
# En otra terminal
cd /workspace
npm run dev
```

La aplicación estará en: **http://localhost:43123**

## Funcionalidades sin Ollama

Sin Ollama instalado, podrás:
- ✅ Ver la interfaz completa
- ✅ Gestionar documentos en la base de datos
- ✅ Ver la estructura del proyecto
- ❌ No podrás usar el chat ni generar plantillas (requiere Ollama)

## Primera Vez

```bash
# Inicializar base de datos con ejemplos
npm run init-db

# Iniciar aplicación
npm run dev
```

## Alternativas de Prueba

Si no puedes instalar Ollama localmente, puedes:

1. **Modificar para usar API remota**: Edita `lib/rag.ts` y `app/api/ollama/route.ts` para usar OpenAI, Anthropic u otro proveedor
2. **Docker**: Ejecuta Ollama en un contenedor Docker
3. **Probar la UI**: La interfaz funciona y puedes ver cómo está estructurada

## Estructura del Proyecto

```
Scrum LLM Assistant
│
├── 💬 Chat con IA
│   └── Conversación con Hermes 3 + contexto RAG
│
├── 📚 Gestión de Documentos (RAG)
│   ├── Casos de uso
│   ├── Manuales
│   ├── Guías
│   └── Indexación automática
│
└── ✨ Generador de Plantillas Scrum
    ├── Product Backlog
    ├── Sprint Planning
    ├── User Stories
    └── Definition of Done
```

## Soporte

Para más detalles, lee:
- `README.md` - Documentación completa
- `docs/AMD_RX_SETUP.md` - Configuración AMD RX
- `.env.example` - Variables de entorno

## Verificación Rápida

```bash
# ¿Ollama instalado?
which ollama

# ¿Ollama corriendo?
curl http://localhost:11434/api/version

# ¿Modelos descargados?
ollama list
```

Debe mostrar:
```
NAME              SIZE
hermes3:latest    4.1 GB
nomic-embed-text  274 MB
```

---

🎯 **¡Cuando tengas Ollama corriendo, recarga la aplicación y todo funcionará!**
