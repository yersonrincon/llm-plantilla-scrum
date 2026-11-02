const fs = require('fs');
const http = require('http');
const path = require('path');
const { config, assertProject, describeDatabase } = require('./config');
const service = require('./service');
const integraciones = require('./integraciones');

const pagePath = path.join(__dirname, 'public', 'index.html');
const progress = new Map();

function tracker(project) {
  return (message) => {
    console.error(message);
    progress.set(project, String(message).trim());
  };
}

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req, limit = 2_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error(`El cuerpo supera ${Math.round(limit / 1_000_000)} MB`), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('JSON inválido'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    const html = fs.readFileSync(pagePath);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': html.length,
      'Cache-Control': 'no-store',
    });
    res.end(html);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/salud') {
    send(res, 200, await service.salud());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/flujo') {
    send(res, 200, { flujo: service.FLUJO, modelo: config.chatModel });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/init') {
    send(res, 200, await service.initDatabase());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/documentos') {
    send(res, 200, await service.listarDocumentos(url.searchParams.get('proyecto') || ''));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/progreso') {
    send(res, 200, { mensaje: progress.get(url.searchParams.get('proyecto') || '') || '' });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/base') {
    send(res, 200, await service.baseConocimiento());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/integraciones') {
    send(res, 200, integraciones.estado());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/plantillas') {
    send(res, 200, await service.listarPlantillas(
      url.searchParams.get('proyecto') || '',
      url.searchParams.get('id') || ''
    ));
    return;
  }

  if (req.method === 'DELETE' && url.pathname === '/api/documentos') {
    send(res, 200, await service.eliminarDocumento(url.searchParams.get('id')));
    return;
  }

  if (req.method !== 'POST') {
    send(res, 404, { error: 'Ruta no encontrada' });
    return;
  }

  if (url.pathname === '/api/extraer') {
    send(res, 200, await service.extraerArchivo(await readBody(req, 30_000_000)));
    return;
  }

  const body = await readBody(req);

  if (url.pathname === '/api/documentos') {
    send(res, 201, await service.agregarDocumento(body));
    return;
  }

  if (url.pathname === '/api/indexar') {
    const project = assertProject(body.proyecto);
    try {
      send(res, 200, body.solo_pendientes
        ? { proyecto: project, documentos: await service.indexarPendientes(project, tracker(project)) }
        : await service.indexProject(project, tracker(project)));
    } finally {
      progress.delete(project);
    }
    return;
  }

  if (url.pathname === '/api/plantilla') {
    const project = assertProject(body.proyecto);
    try {
      send(res, 201, await service.generarPlantilla(project, body.nombre, tracker(project), {
        inicio: body.inicio,
        equipo: body.equipo,
      }));
    } finally {
      progress.delete(project);
    }
    return;
  }

  if (url.pathname === '/api/exportar') {
    const project = assertProject(body.plantilla && body.plantilla.proyecto);
    try {
      send(res, 201, await integraciones.exportar(body, tracker(project)));
    } finally {
      progress.delete(project);
    }
    return;
  }

  if (url.pathname === '/api/consultar') {
    if (!body.pregunta) {
      send(res, 400, { error: 'Falta la pregunta' });
      return;
    }
    send(res, 200, await service.preguntar(assertProject(body.proyecto), body.pregunta));
    return;
  }

  send(res, 404, { error: 'Ruta no encontrada' });
}

function start() {
  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      if (res.headersSent) return;
      send(res, error.status || 500, { error: error.message || 'Error interno' });
    });
  });
  server.requestTimeout = 0;
  server.headersTimeout = 0;
  server.listen(config.port, '127.0.0.1', () => {
    console.log(`Motor Scrum en http://127.0.0.1:${config.port}`);
    console.log(`Modelo: ${config.chatModel}`);
    console.log(`Base: ${describeDatabase()}`);
  });
  return server;
}

if (require.main === module) start();

module.exports = { start };
