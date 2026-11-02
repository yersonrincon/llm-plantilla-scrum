#!/usr/bin/env node

const { config, FLUJO, describeDatabase } = require('./config');
const { close } = require('./db');
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
Hermes 3 Llama 3.2 en Ollama, RAG guardado en PostgreSQL.

Flujo
${FLUJO.map((step, index) => `  ${index + 1}. ${step}`).join('\n')}

Comandos
  node engine/cli.js init
  node engine/cli.js agregar --proyecto tienda --tipo caso_uso --titulo "Login" --archivo .\\casos\\login.pdf
    (--archivo acepta .pdf, .docx, .txt y .md)
  node engine/cli.js indexar --proyecto tienda
  node engine/cli.js plantilla --proyecto tienda --nombre "Scrum tienda" [--inicio 2026-11-09]
    [--equipo.desarrollador_backend "Ana" --equipo.qa "Luis" ...]
    (roles: product_owner, scrum_master, analista, desarrollador_backend, desarrollador_frontend, qa, devops)
  node engine/cli.js consultar --proyecto tienda --pregunta "¿Qué valida el registro?"
  node engine/cli.js documentos --proyecto tienda
  node engine/cli.js plantillas --proyecto tienda
  node engine/cli.js cargar-carpeta --carpeta .\\documentacion [--tipo guia] [--proyecto ${config.knowledgeProject}]
    (carga e indexa todos los .pdf, .docx, .txt y .md de la carpeta y subcarpetas;
     por defecto van a la base de conocimiento compartida por todos los proyectos)
  node engine/cli.js base               (estado de la base de conocimiento)
  node engine/cli.js depurar [--proyecto tienda]
    (vuelve a limpiar el texto ya guardado: encabezados, números de página, índices,
     licencias y duplicados; reindexa solo los documentos que cambiaron)
  node engine/cli.js limpiar            (borra duplicados, vacíos y embeddings de otros modelos; compacta la base)
  node engine/cli.js salud
  node engine/cli.js verificar-rag
  node engine/cli.js migrar-sqlite      (copia a PostgreSQL lo guardado en ${config.sqlitePath})
  node engine/cli.js servir

Tipos de documento: caso_uso, manual, guia, otro
Modelo de chat: ${config.chatModel}
Embeddings: ${config.embedModel}
Perfil RX: ${config.rxVram} GB de VRAM, contexto ${config.numCtx}, capas GPU ${config.numGpu}
Base: ${describeDatabase()} (PostgreSQL)

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
    console.log(JSON.stringify(await service.initDatabase(), null, 2));
    return;
  }

  if (command === 'verificar-rag') {
    console.log(JSON.stringify(await selfCheck(), null, 2));
    return;
  }

  if (command === 'migrar-sqlite') {
    const { migrateFromSqlite } = require('./migrate-sqlite');
    console.log(JSON.stringify(await migrateFromSqlite(args.archivo), null, 2));
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
    return 'servir';
  }

  if (command === 'cargar-carpeta') {
    const result = await service.cargarCarpeta({
      carpeta: args.carpeta,
      proyecto: args.proyecto,
      tipo: args.tipo,
      indexar: !args['sin-indexar'],
    }, (message) => console.error(message));
    console.log(JSON.stringify(result, null, 2));
    if (result.errores.length) process.exitCode = 1;
    return;
  }

  if (command === 'depurar') {
    const result = await service.depurarDocumentos(args.proyecto, (message) => console.error(message));
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'limpiar') {
    console.log(JSON.stringify(await service.limpiarBase(), null, 2));
    return;
  }

  if (command === 'base') {
    console.log(JSON.stringify(await service.baseConocimiento(), null, 2));
    return;
  }

  if (command === 'documentos') {
    console.log(JSON.stringify(await service.listarDocumentos(args.proyecto), null, 2));
    return;
  }

  if (command === 'plantillas') {
    console.log(JSON.stringify(await service.listarPlantillas(args.proyecto, args.id), null, 2));
    return;
  }

  if (command === 'agregar') {
    const contenido = args.archivo
      ? await service.leerArchivo(args.archivo)
      : args.contenido;
    const created = await service.agregarDocumento({
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
    const equipo = {};
    for (const [key, value] of Object.entries(args)) {
      if (key.startsWith('equipo.')) equipo[key.slice(7)] = value;
    }
    const result = await service.generarPlantilla(
      args.proyecto,
      args.nombre,
      (message) => console.error(message),
      { inicio: args.inicio, equipo }
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

main()
  .then(async (mode) => {
    if (mode !== 'servir') await close();
  })
  .catch(async (error) => {
    console.error(error.message || error);
    if (process.env.DEBUG) console.error(error.stack);
    await close().catch(() => {});
    process.exit(1);
  });
