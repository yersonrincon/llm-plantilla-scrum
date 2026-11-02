#!/usr/bin/env node

const { config, FLUJO } = require('./config');
const { selfCheck } = require('./rag');
const service = require('./service');

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const eq = token.indexOf('=');
    if (eq !== -1) {
      args[token.slice(2, eq)] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next == null || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function help() {
  console.log(`
Motor Scrum en JavaScript puro
Hermes 3 Llama 3.2 en Ollama, RAG guardado en SQLite.

Flujo
${FLUJO.map((step, index) => `  ${index + 1}. ${step}`).join('\n')}

Comandos
  node engine/cli.js init
  node engine/cli.js agregar --proyecto tienda --tipo caso_uso --titulo "Login" --archivo .\\casos\\login.txt
  node engine/cli.js indexar --proyecto tienda
  node engine/cli.js plantilla --proyecto tienda --nombre "Scrum tienda"
  node engine/cli.js consultar --proyecto tienda --pregunta "¿Qué valida el registro?"
  node engine/cli.js documentos --proyecto tienda
  node engine/cli.js plantillas --proyecto tienda
  node engine/cli.js salud
  node engine/cli.js verificar-rag
  node engine/cli.js servir

Tipos de documento: caso_uso, manual, guia, otro
Modelo de chat: ${config.chatModel}
Embeddings: ${config.embedModel}
Perfil RX: ${config.rxVram} GB de VRAM, contexto ${config.numCtx}, capas GPU ${config.numGpu}
Base: ${config.dbPath}

Tarjetas RX con poca memoria pueden bajar el perfil:
  PowerShell: $env:RX_VRAM="4"
  Si Hermes 3.2 no entra en la VRAM, cierra otras aplicaciones antes de reintentar.
  Para una RX de 8 GB o más que quiera el Hermes 8B: $env:OLLAMA_CHAT_MODEL="hermes3"
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  if (!command || command === 'help' || args.help) {
    help();
    return;
  }

  if (command === 'init') {
    console.log(JSON.stringify(service.initDatabase(), null, 2));
    return;
  }

  if (command === 'verificar-rag') {
    console.log(JSON.stringify(selfCheck(), null, 2));
    return;
  }

  if (command === 'salud') {
    const status = await service.salud();
    console.log(JSON.stringify(status, null, 2));
    if (!status.ok) process.exitCode = 1;
    return;
  }

  if (command === 'servir') {
    require('./server').start();
    return;
  }

  if (command === 'documentos') {
    console.log(JSON.stringify(service.listarDocumentos(args.proyecto), null, 2));
    return;
  }

  if (command === 'plantillas') {
    console.log(JSON.stringify(service.listarPlantillas(args.proyecto, args.id), null, 2));
    return;
  }

  if (command === 'agregar') {
    const contenido = args.archivo
      ? service.leerArchivo(args.archivo)
      : args.contenido;
    const created = service.agregarDocumento({
      proyecto: args.proyecto,
      titulo: args.titulo,
      tipo: args.tipo,
      contenido,
    });
    console.log(JSON.stringify(created, null, 2));
    if (args.indexar) {
      const indexed = await service.indexProject(created.proyecto, (message) => console.error(message));
      console.log(JSON.stringify(indexed, null, 2));
    }
    return;
  }

  if (command === 'indexar') {
    const indexed = await service.indexProject(args.proyecto, (message) => console.error(message));
    console.log(JSON.stringify(indexed, null, 2));
    return;
  }

  if (command === 'plantilla') {
    const result = await service.generarPlantilla(
      args.proyecto,
      args.nombre,
      (message) => console.error(message)
    );
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'consultar') {
    if (!args.pregunta) {
      throw new Error('Falta --pregunta');
    }
    const result = await service.preguntar(args.proyecto, args.pregunta);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  throw new Error(`Comando desconocido: ${command}. Usa node engine/cli.js help`);
}

main().catch((error) => {
  console.error(error.message || error);
  if (process.env.DEBUG) console.error(error.stack);
  process.exit(1);
});
