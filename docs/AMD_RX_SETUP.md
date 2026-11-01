# Configuración para Tarjetas AMD RX

Este documento explica cómo configurar y optimizar Ollama para tarjetas gráficas AMD Radeon RX.

## Requisitos

- Tarjeta gráfica AMD Radeon RX (RX 5000, 6000, 7000 series)
- Drivers AMD ROCm instalados
- Ollama 0.1.0 o superior

## Instalación de ROCm (Linux)

### Ubuntu 22.04 / 24.04

```bash
# Agregar repositorio ROCm
wget https://repo.radeon.com/amdgpu-install/latest/ubuntu/jammy/amdgpu-install_latest_all.deb
sudo dpkg -i amdgpu-install_latest_all.deb

# Instalar ROCm
sudo amdgpu-install --usecase=rocm

# Agregar usuario al grupo render y video
sudo usermod -a -G render,video $USER

# Reiniciar para aplicar cambios
sudo reboot
```

### Verificar instalación

```bash
# Verificar que ROCm detecta tu tarjeta
rocm-smi

# Debe mostrar información de tu GPU AMD
# Ejemplo:
# ======================= ROCm System Management Interface =======================
# GPU  Temp   AvgPwr  SCLK     MCLK     Fan     Perf  PwrCap  VRAM%  GPU%
# 0    35.0c  15.0W   800Mhz   96Mhz    0.0%    auto  215.0W    1%   0%
```

## Instalación de Ollama con soporte AMD

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Ollama detectará automáticamente ROCm y tu GPU AMD
```

## Verificación

```bash
# Iniciar Ollama
ollama serve

# En otra terminal, verificar que use GPU
ollama run hermes3 "Hola"

# Mientras corre, en otra terminal:
rocm-smi

# Deberías ver:
# - GPU% aumentando (uso de GPU)
# - Temp subiendo ligeramente
# - VRAM% aumentando (memoria de video usada)
```

## Modelos Recomendados por Tamaño de VRAM

### 4-6 GB VRAM (RX 5500 XT, RX 6500 XT)
```bash
# Modelos pequeños
ollama pull phi3.5
ollama pull llama3.2:3b
ollama pull mistral:7b-instruct-q4_0

# Para embeddings (obligatorio)
ollama pull nomic-embed-text
```

### 8-12 GB VRAM (RX 6700 XT, RX 7600 XT)
```bash
# Modelos medianos (recomendado)
ollama pull hermes3:8b
ollama pull llama3.1:8b
ollama pull mixtral:8x7b-instruct-q4_0

ollama pull nomic-embed-text
```

### 16-24 GB VRAM (RX 6800 XT, RX 7900 XT/XTX)
```bash
# Modelos grandes
ollama pull hermes3:70b-q4_0
ollama pull llama3.1:70b
ollama pull mixtral:8x7b

ollama pull nomic-embed-text
```

## Optimización de Rendimiento

### 1. Variables de Entorno

Crea un archivo `/etc/systemd/system/ollama.service.d/override.conf`:

```ini
[Service]
Environment="HSA_OVERRIDE_GFX_VERSION=10.3.0"  # Ajustar según tu GPU
Environment="OLLAMA_NUM_GPU=1"
Environment="OLLAMA_MAX_LOADED_MODELS=2"
Environment="ROC_ENABLE_PRE_VEGA=1"  # Solo para GPUs pre-RDNA
```

Recargar y reiniciar:
```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

### 2. Configuración según GPU

#### RX 5000 series (RDNA 1)
```bash
export HSA_OVERRIDE_GFX_VERSION=10.1.0
```

#### RX 6000 series (RDNA 2)
```bash
export HSA_OVERRIDE_GFX_VERSION=10.3.0
```

#### RX 7000 series (RDNA 3)
```bash
export HSA_OVERRIDE_GFX_VERSION=11.0.0
```

### 3. Ajustes en la Aplicación

Edita `lib/rag.ts` para optimizar según tu hardware:

```typescript
// Para GPUs con menos VRAM (4-6 GB)
export async function generateScrumTemplate(...) {
  const response = await ollama.chat({
    model: 'hermes3:8b-q4_0',  // Versión cuantizada
    options: {
      num_ctx: 2048,  // Contexto reducido
      num_gpu: 1
    }
  });
}

// Para GPUs con más VRAM (16+ GB)
export async function generateScrumTemplate(...) {
  const response = await ollama.chat({
    model: 'hermes3:8b',  // Versión completa
    options: {
      num_ctx: 4096,  // Más contexto
      num_gpu: 1,
      num_thread: 8
    }
  });
}
```

## Troubleshooting

### Error: "no GPU detected"

```bash
# Verificar que ROCm esté instalado
which rocm-smi

# Verificar permisos
groups | grep -E 'render|video'

# Si no estás en los grupos:
sudo usermod -a -G render,video $USER
# Cerrar sesión y volver a entrar
```

### Error: "unsupported GPU"

Tu GPU puede no estar oficialmente soportada. Prueba forzar la versión:

```bash
export HSA_OVERRIDE_GFX_VERSION=10.3.0
ollama serve
```

Valores comunes:
- `10.1.0` - RX 5000 series
- `10.3.0` - RX 6000 series  
- `11.0.0` - RX 7000 series

### Rendimiento lento

1. **Verificar que use GPU y no CPU:**
```bash
# Durante inferencia, ejecutar:
rocm-smi

# GPU% debe ser > 50%
# Si está en 0%, no está usando GPU
```

2. **Usar modelos cuantizados:**
```bash
# Más rápidos, menos VRAM, pérdida mínima de calidad
ollama pull hermes3:8b-q4_0
```

3. **Reducir tamaño de contexto:**
```typescript
options: {
  num_ctx: 2048  // En lugar de 4096 o 8192
}
```

### VRAM insuficiente

```bash
# Síntomas: Ollama crashea o usa swap
# Solución: Usar modelo más pequeño o cuantizado

# En lugar de:
ollama pull hermes3:8b

# Usar:
ollama pull hermes3:8b-q4_0  # Cuantización 4-bit
# o
ollama pull phi3.5  # Modelo más pequeño
```

## Monitoreo en Tiempo Real

### Usar watch + rocm-smi
```bash
watch -n 1 rocm-smi
```

### Script de monitoreo
```bash
#!/bin/bash
while true; do
  clear
  echo "=== AMD GPU Status ==="
  rocm-smi --showtemp --showmeminfo --showuse
  echo ""
  echo "=== Ollama Process ==="
  ps aux | grep ollama | grep -v grep
  sleep 2
done
```

## Benchmarking

Prueba el rendimiento de tu configuración:

```bash
# Test de velocidad
time ollama run hermes3 "Explica qué es Scrum en 100 palabras"

# Debería completar en:
# - RX 5500 XT: 15-30 segundos
# - RX 6700 XT: 8-15 segundos
# - RX 7900 XTX: 3-8 segundos
```

## Comparación CPU vs GPU

```bash
# Forzar CPU (para comparar)
OLLAMA_NUM_GPU=0 ollama run hermes3 "Test"

# GPU (normal)
ollama run hermes3 "Test"

# La diferencia debería ser de 5-10x más rápido con GPU
```

## Recursos Adicionales

- [ROCm Documentation](https://rocm.docs.amd.com/)
- [Ollama GPU Support](https://github.com/ollama/ollama/blob/main/docs/gpu.md)
- [AMD GPU Matrix](https://github.com/ROCm/ROCm#supported-gpus)

## Soporte de GPUs AMD

| Serie | Arquitectura | ROCm | Ollama | Notas |
|-------|--------------|------|--------|-------|
| RX 5000 | RDNA 1 | ✅ | ✅ | Puede requerir HSA_OVERRIDE |
| RX 6000 | RDNA 2 | ✅ | ✅ | Soporte completo |
| RX 7000 | RDNA 3 | ✅ | ✅ | Soporte completo |
| RX Vega | GCN 5 | ✅ | ⚠️ | Rendimiento limitado |
| RX 500 | GCN 4 | ⚠️ | ❌ | No recomendado |

✅ Soporte completo | ⚠️ Soporte parcial | ❌ No soportado
