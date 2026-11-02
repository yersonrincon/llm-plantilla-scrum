const { config } = require('./config');

const TRELLO_API = 'https://api.trello.com/1';
const TRELLO_PAUSE_MS = 120;
const JIRA_SPRINT_BATCH = 50;
const PRIORIDAD_TRELLO = { alta: 'red', media: 'yellow', baja: 'green' };
const PRIORIDAD_JIRA = {
  alta: [/^(high|alta)$/i, /high|alta/i],
  media: [/^(medium|media)$/i, /medium|media/i],
  baja: [/^(low|baja)$/i, /low|baja/i],
};
const SPRINT_COLORS = ['blue', 'purple', 'sky', 'orange', 'pink', 'lime', 'black'];

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function texto(value, max = 0) {
  const text = String(value ?? '').trim();
  return max && text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function fechaHora(fecha, hora) {
  return fecha ? new Date(`${fecha}T${hora}`).toISOString() : undefined;
}

function prioridad(historia) {
  return String(historia.prioridad || '').toLowerCase();
}

function credenciales(destino, recibidas = {}) {
  const valor = (campo, env) => texto(recibidas[campo]) || texto(env);
  if (destino === 'trello') {
    return { key: valor('key', config.trello.key), token: valor('token', config.trello.token) };
  }
  return {
    sitio: valor('sitio', config.jira.site),
    email: valor('email', config.jira.email),
    token: valor('token', config.jira.token),
    proyecto: valor('proyecto', config.jira.project).toUpperCase(),
  };
}

function estado() {
  return {
    trello: Boolean(config.trello.key && config.trello.token),
    jira: Boolean(config.jira.site && config.jira.email && config.jira.token && config.jira.project),
    jira_sitio: config.jira.site,
    jira_proyecto: config.jira.project,
  };
}

function validarPlantilla(plantilla) {
  const tablero = plantilla && plantilla.tablero;
  if (!tablero || !Array.isArray(tablero.historias) || !tablero.historias.length) {
    throw httpError('La plantilla no tiene tablero de tareas. Genera una plantilla nueva antes de exportarla.');
  }
  return tablero;
}

function sprintDe(tablero, historia) {
  return (tablero.sprints || []).find((sprint) => sprint.numero === historia.sprint) || null;
}

async function leerError(response, servicio) {
  const raw = await response.text().catch(() => '');
  let detalle = raw;
  try {
    const data = JSON.parse(raw);
    detalle = [
      ...(data.errorMessages || []),
      ...Object.entries(data.errors || {}).map(([campo, mensaje]) => `${campo}: ${mensaje}`),
      data.message || data.errorMessage || data.error || '',
    ].filter(Boolean).join('; ') || raw;
  } catch {}
  if (response.status === 401) return httpError(`${servicio} rechazó las credenciales (401). Revisa la API key / token.`, 401);
  if (response.status === 403) return httpError(`${servicio} no permite esta acción con tu usuario (403): ${texto(detalle, 300)}`, 403);
  if (response.status === 404) return httpError(`${servicio} no encontró el recurso (404): ${texto(detalle, 300)}`, 404);
  if (response.status === 429) return httpError(`${servicio} pidió esperar por exceso de solicitudes (429). Inténtalo en un minuto.`, 429);
  const error = httpError(`${servicio} respondió ${response.status}: ${texto(detalle, 400)}`, 502);
  try {
    error.campos = JSON.parse(raw).errors || {};
  } catch {
    error.campos = {};
  }
  error.httpStatus = response.status;
  return error;
}

async function peticion(servicio, url, { method = 'GET', headers = {}, body } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    throw httpError(`No pude conectar con ${servicio}: ${error.message}. Revisa tu conexión a internet.`, 502);
  }
  if (!response.ok) throw await leerError(response, servicio);
  if (response.status === 204) return null;
  const raw = await response.text();
  return raw ? JSON.parse(raw) : null;
}

// ---------- Trello ----------

function trelloCliente({ key, token }) {
  if (!key || !token) {
    throw httpError('Faltan la API key y el token de Trello. Escríbelos en «Trello y Jira» o ponlos en .env (TRELLO_API_KEY, TRELLO_TOKEN).');
  }
  return async (method, ruta, body) => {
    const url = new URL(`${TRELLO_API}${ruta}`);
    url.searchParams.set('key', key);
    url.searchParams.set('token', token);
    const data = await peticion('Trello', url, { method, body });
    await sleep(TRELLO_PAUSE_MS);
    return data;
  };
}

function descripcionTrello(historia, sprint, tablero) {
  const criterios = (historia.criterios_aceptacion || []).filter(Boolean);
  return texto([
    historia.historia || '',
    '',
    `**Prioridad:** ${historia.prioridad || '-'} · **Story points:** ${historia.story_points ?? '-'} · **Horas estimadas:** ${historia.horas ?? 0} h`,
    sprint ? `**${sprint.nombre}:** ${sprint.inicio} → ${sprint.fin}${sprint.objetivo ? ` — ${sprint.objetivo}` : ''}` : '**Sprint:** sin asignar (product backlog)',
    ...(criterios.length ? ['', '**Criterios de aceptación**', ...criterios.map((item) => `- ${typeof item === 'string' ? item : item.texto || JSON.stringify(item)}`)] : []),
    ...(historia.fuente_documento ? ['', `_Fuente: ${historia.fuente_documento}_`] : []),
    '',
    `_Columnas del flujo: ${(tablero.columnas || []).join(' → ')}_`,
  ].join('\n'), 16000);
}

async function exportarTrello(plantilla, recibidas, onProgress = () => {}) {
  const tablero = validarPlantilla(plantilla);
  const trello = trelloCliente(credenciales('trello', recibidas));
  const historias = tablero.historias;
  const columnas = tablero.columnas && tablero.columnas.length ? tablero.columnas : ['Por hacer', 'En progreso', 'En revisión', 'Hecho'];
  const sprintActual = (tablero.sprints || []).find((sprint) => historias.some((historia) => historia.sprint === sprint.numero));

  onProgress('Trello: creando el tablero');
  const board = await trello('POST', '/boards/', {
    name: texto(`Scrum ${plantilla.proyecto || ''} · ${new Date().toLocaleDateString('es')}`, 120),
    desc: texto(`Plantilla Scrum generada con ${plantilla.modelo || 'Hermes'}. ${tablero.inicio_proyecto} → ${tablero.fin_proyecto} · ${tablero.total_puntos} story points · ${tablero.total_horas} h.`, 16000),
    defaultLists: false,
    defaultLabels: false,
    prefs_background: 'green',
  });

  const listas = {};
  for (const nombre of ['Product backlog', ...columnas]) {
    listas[nombre] = await trello('POST', '/lists', { name: nombre, idBoard: board.id, pos: 'bottom' });
  }

  onProgress('Trello: creando etiquetas de prioridad y sprint');
  const etiquetas = {};
  for (const [nivel, color] of Object.entries(PRIORIDAD_TRELLO)) {
    etiquetas[`prioridad:${nivel}`] = await trello('POST', '/labels', { idBoard: board.id, name: `Prioridad ${nivel}`, color });
  }
  for (const [index, sprint] of (tablero.sprints || []).entries()) {
    etiquetas[`sprint:${sprint.numero}`] = await trello('POST', '/labels', {
      idBoard: board.id,
      name: texto(sprint.nombre, 60),
      color: SPRINT_COLORS[index % SPRINT_COLORS.length],
    });
  }

  let tareas = 0;
  for (const [index, historia] of historias.entries()) {
    onProgress(`Trello: tarjeta ${index + 1}/${historias.length} (${historia.id})`);
    const sprint = sprintDe(tablero, historia);
    const enCurso = sprint && sprintActual && sprint.numero === sprintActual.numero;
    const idLabels = [etiquetas[`prioridad:${prioridad(historia)}`], sprint && etiquetas[`sprint:${sprint.numero}`]]
      .filter(Boolean).map((label) => label.id);
    const card = await trello('POST', '/cards', {
      idList: listas[enCurso ? columnas[0] : 'Product backlog'].id,
      name: texto(`${historia.id} · ${historia.titulo} (${historia.story_points ?? '?'} pts)`, 250),
      desc: descripcionTrello(historia, sprint, tablero),
      pos: 'bottom',
      ...(idLabels.length ? { idLabels: idLabels.join(',') } : {}),
      ...(sprint ? { start: fechaHora(sprint.inicio, '08:00:00'), due: fechaHora(sprint.fin, '18:00:00') } : {}),
    });
    if (!(historia.tareas || []).length) continue;
    const checklist = await trello('POST', `/cards/${card.id}/checklists`, { name: `Tareas (${historia.horas ?? 0} h)` });
    for (const tarea of historia.tareas) {
      await trello('POST', `/checklists/${checklist.id}/checkItems`, {
        name: texto(`${tarea.titulo} — ${tarea.responsable || tarea.rol_nombre || tarea.rol} · ${tarea.horas} h`, 500),
        pos: 'bottom',
        ...(sprint ? { due: fechaHora(sprint.fin, '18:00:00') } : {}),
      });
      tareas += 1;
    }
  }

  return {
    destino: 'trello',
    url: board.shortUrl || board.url,
    nombre: board.name,
    creadas: { historias: historias.length, tareas, listas: Object.keys(listas).length },
    avisos: [],
  };
}

// ---------- Jira Cloud ----------

function jiraBase(sitio) {
  const value = texto(sitio).replace(/\/+$/, '');
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.includes('.') ? value : `${value}.atlassian.net`}`;
}

function jiraCliente({ sitio, email, token, proyecto }) {
  const faltan = [
    !sitio && 'sitio',
    !email && 'correo',
    !token && 'API token',
    !proyecto && 'clave del proyecto',
  ].filter(Boolean);
  if (faltan.length) {
    throw httpError(`Faltan datos de Jira: ${faltan.join(', ')}. Escríbelos en «Trello y Jira» o ponlos en .env (JIRA_SITIO, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROYECTO).`);
  }
  const base = jiraBase(sitio);
  const auth = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
  const jira = (method, ruta, body) => peticion('Jira', `${base}${ruta}`, { method, body, headers: { Authorization: auth } });
  jira.base = base;
  return jira;
}

function adfParrafo(text) {
  return { type: 'paragraph', content: [{ type: 'text', text: texto(text, 3000) || '-' }] };
}

function adf(bloques) {
  const content = [];
  for (const bloque of bloques) {
    if (!bloque) continue;
    if (typeof bloque === 'string') {
      content.push(adfParrafo(bloque));
    } else if (bloque.titulo) {
      content.push({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: bloque.titulo }] });
    } else if (bloque.lista && bloque.lista.length) {
      content.push({
        type: 'bulletList',
        content: bloque.lista.map((item) => ({ type: 'listItem', content: [adfParrafo(item)] })),
      });
    }
  }
  return { type: 'doc', version: 1, content: content.length ? content : [adfParrafo('-')] };
}

function lista(response, ...claves) {
  for (const clave of claves) if (Array.isArray(response && response[clave])) return response[clave];
  return [];
}

function elegirTipos(tipos) {
  const normales = tipos.filter((tipo) => !tipo.subtask);
  const buscar = (items, patrones) => {
    for (const patron of patrones) {
      const tipo = items.find((item) => patron.test(item.name));
      if (tipo) return tipo;
    }
    return null;
  };
  return {
    historia: buscar(normales, [/^(story|historia)$/i, /story|historia/i, /^(task|tarea)$/i])
      || normales.find((tipo) => !/epic|épica/i.test(tipo.name)) || null,
    subtarea: tipos.find((tipo) => tipo.subtask) || null,
  };
}

async function camposDe(jira, proyecto, tipo) {
  if (!tipo) return {};
  const data = await jira('GET', `/rest/api/3/issue/createmeta/${encodeURIComponent(proyecto)}/issuetypes/${tipo.id}?maxResults=200`);
  return Object.fromEntries(lista(data, 'fields', 'values').map((campo) => [campo.fieldId || campo.key, campo]));
}

function campoStoryPoints(campos) {
  return Object.values(campos).find((campo) => (
    /story ?point|puntos de (la )?historia|estimaci[oó]n de puntos/i.test(campo.name || '')
    && (!campo.schema || campo.schema.type === 'number')
  )) || null;
}

function prioridadJira(campos, historia) {
  const permitidas = (campos.priority && campos.priority.allowedValues) || [];
  for (const patron of PRIORIDAD_JIRA[prioridad(historia)] || []) {
    const valor = permitidas.find((item) => patron.test(item.name || ''));
    if (valor) return { id: valor.id };
  }
  return null;
}

function etiqueta(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60);
}

async function crearIssue(jira, fields, opcionales, { avisos, omitidos }) {
  const tipo = fields.issuetype.id;
  const enviar = { ...fields };
  for (const campo of opcionales.keys()) if (omitidos.has(`${tipo}:${campo}`)) delete enviar[campo];
  for (let intento = 0; intento < 4; intento += 1) {
    try {
      return await jira('POST', '/rest/api/3/issue', { fields: enviar });
    } catch (error) {
      const rechazados = Object.keys(error.campos || {}).filter((campo) => opcionales.has(campo) && campo in enviar);
      if (error.httpStatus !== 400 || !rechazados.length) throw error;
      for (const campo of rechazados) {
        avisos.add(`Jira no aceptó el campo «${opcionales.get(campo)}» (${error.campos[campo]}); lo omití.`);
        omitidos.add(`${tipo}:${campo}`);
        delete enviar[campo];
      }
    }
  }
  throw httpError('Jira rechazó la incidencia después de varios intentos.', 502);
}

async function exportarJira(plantilla, recibidas, onProgress = () => {}) {
  const tablero = validarPlantilla(plantilla);
  const datos = credenciales('jira', recibidas);
  const jira = jiraCliente(datos);
  const clave = datos.proyecto;
  const avisos = new Set();
  const contexto = { avisos, omitidos: new Set() };

  onProgress('Jira: comprobando el proyecto');
  const proyecto = await jira('GET', `/rest/api/3/project/${encodeURIComponent(clave)}`).catch((error) => {
    if (error.status !== 404) throw error;
    throw httpError(`No encontré el sitio ${jira.base} o el proyecto ${clave} (o tu usuario no tiene acceso). Revisa el sitio y la clave del proyecto.`, 404);
  });
  const tipos = elegirTipos(lista(await jira('GET', `/rest/api/3/issue/createmeta/${encodeURIComponent(clave)}/issuetypes?maxResults=100`), 'issueTypes', 'values'));
  if (!tipos.historia) throw httpError(`El proyecto ${clave} no tiene un tipo de incidencia para historias.`);
  const camposHistoria = await camposDe(jira, clave, tipos.historia);
  const camposSubtarea = await camposDe(jira, clave, tipos.subtarea);
  const puntos = campoStoryPoints(camposHistoria);
  if (!tipos.subtarea) avisos.add('El proyecto no tiene tipo «Subtarea»: puse las tareas en la descripción de cada historia.');
  if (!puntos) avisos.add('El proyecto no muestra el campo de story points al crear historias; los puse en la descripción.');

  const usuarios = new Map();
  const cuentaDe = async (nombre) => {
    if (!nombre || !camposSubtarea.assignee) return null;
    if (!usuarios.has(nombre)) {
      const encontrados = await jira('GET', `/rest/api/3/user/assignable/search?project=${encodeURIComponent(clave)}&query=${encodeURIComponent(nombre)}&maxResults=5`).catch(() => []);
      const exacto = encontrados.find((user) => String(user.displayName || '').toLowerCase() === nombre.toLowerCase());
      const elegido = exacto || (encontrados.length === 1 ? encontrados[0] : null);
      if (!elegido) avisos.add(`No encontré en Jira un usuario llamado «${nombre}»; sus tareas quedaron sin asignar.`);
      usuarios.set(nombre, elegido ? elegido.accountId : null);
    }
    return usuarios.get(nombre);
  };

  const historiasCreadas = [];
  let tareas = 0;
  for (const [index, historia] of tablero.historias.entries()) {
    onProgress(`Jira: historia ${index + 1}/${tablero.historias.length} (${historia.id})`);
    const sprint = sprintDe(tablero, historia);
    const criterios = (historia.criterios_aceptacion || []).filter(Boolean).map((item) => (typeof item === 'string' ? item : item.texto || JSON.stringify(item)));
    const fields = {
      project: { id: proyecto.id },
      issuetype: { id: tipos.historia.id },
      summary: texto(`${historia.id} ${historia.titulo}`, 250),
      description: adf([
        historia.historia,
        `Prioridad: ${historia.prioridad || '-'} · Story points: ${historia.story_points ?? '-'} · Horas estimadas: ${historia.horas ?? 0} h`,
        sprint ? `${sprint.nombre}: ${sprint.inicio} → ${sprint.fin}` : 'Sin sprint asignado (product backlog)',
        criterios.length && { titulo: 'Criterios de aceptación' },
        { lista: criterios },
        !tipos.subtarea && (historia.tareas || []).length && { titulo: 'Tareas' },
        !tipos.subtarea && { lista: (historia.tareas || []).map((tarea) => `${tarea.titulo} — ${tarea.responsable || tarea.rol_nombre} · ${tarea.horas} h`) },
        historia.fuente_documento && `Fuente: ${historia.fuente_documento}`,
      ]),
    };
    const opcionales = new Map();
    const opcional = (campo, nombre, valor) => {
      if (valor == null || !camposHistoria[campo]) return;
      fields[campo] = valor;
      opcionales.set(campo, nombre);
    };
    opcional('labels', 'Etiquetas', ['plantilla-scrum', sprint ? etiqueta(sprint.nombre) : 'product-backlog']);
    opcional('priority', 'Prioridad', prioridadJira(camposHistoria, historia));
    opcional('duedate', 'Fecha de vencimiento', sprint ? sprint.fin : null);
    if (puntos && Number.isFinite(Number(historia.story_points))) opcional(puntos.fieldId || puntos.key, puntos.name, Number(historia.story_points));
    if (!tipos.subtarea) opcional('timetracking', 'Estimación original', { originalEstimate: `${historia.horas || 0}h` });

    const creada = await crearIssue(jira, fields, opcionales, contexto);
    historiasCreadas.push({ key: creada.key, sprint: historia.sprint });
    if (!tipos.subtarea) continue;

    for (const tarea of historia.tareas || []) {
      const sub = {
        project: { id: proyecto.id },
        issuetype: { id: tipos.subtarea.id },
        parent: { key: creada.key },
        summary: texto(tarea.titulo, 250),
        description: adf([`${tarea.rol_nombre || tarea.rol} · ${tarea.horas} h · ${tarea.tipo || ''}`]),
      };
      const opcionalesSub = new Map();
      const opcionalSub = (campo, nombre, valor) => {
        if (valor == null || !camposSubtarea[campo]) return;
        sub[campo] = valor;
        opcionalesSub.set(campo, nombre);
      };
      opcionalSub('labels', 'Etiquetas', [etiqueta(tarea.rol)]);
      opcionalSub('timetracking', 'Estimación original', { originalEstimate: `${tarea.horas || 0}h` });
      opcionalSub('duedate', 'Fecha de vencimiento', sprint ? sprint.fin : null);
      const cuenta = await cuentaDe(texto(tarea.asignado));
      opcionalSub('assignee', 'Responsable', cuenta ? { accountId: cuenta } : null);
      await crearIssue(jira, sub, opcionalesSub, contexto);
      tareas += 1;
    }
  }

  let url = `${jira.base}/browse/${clave}`;
  let sprintsCreados = 0;
  onProgress('Jira: creando los sprints');
  const tableros = lista(await jira('GET', `/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(clave)}`).catch(() => null), 'values');
  const scrum = tableros.find((item) => item.type === 'scrum');
  if (!scrum) {
    avisos.add(tableros.length
      ? 'El tablero del proyecto es Kanban: Jira solo tiene sprints en proyectos Scrum. Las historias quedaron en el backlog con la etiqueta de su sprint.'
      : 'No encontré un tablero Scrum en el proyecto; las historias quedaron en el backlog con la etiqueta de su sprint.');
  } else {
    url = `${jira.base}/jira/software/projects/${clave}/boards/${scrum.id}/backlog`;
    for (const sprint of tablero.sprints || []) {
      const keys = historiasCreadas.filter((item) => item.sprint === sprint.numero).map((item) => item.key);
      if (!keys.length) continue;
      try {
        const creado = await jira('POST', '/rest/agile/1.0/sprint', {
          name: texto(sprint.nombre, 30),
          originBoardId: scrum.id,
          startDate: fechaHora(sprint.inicio, '08:00:00'),
          endDate: fechaHora(sprint.fin, '18:00:00'),
          ...(sprint.objetivo ? { goal: texto(sprint.objetivo, 900) } : {}),
        });
        for (let i = 0; i < keys.length; i += JIRA_SPRINT_BATCH) {
          await jira('POST', `/rest/agile/1.0/sprint/${creado.id}/issue`, { issues: keys.slice(i, i + JIRA_SPRINT_BATCH) });
        }
        sprintsCreados += 1;
      } catch (error) {
        avisos.add(`No pude crear «${sprint.nombre}» en Jira: ${error.message}`);
      }
    }
  }

  return {
    destino: 'jira',
    url,
    nombre: `${proyecto.name} (${clave})`,
    creadas: { historias: historiasCreadas.length, tareas, sprints: sprintsCreados },
    avisos: [...avisos],
  };
}

async function exportar({ destino, plantilla, credenciales: recibidas }, onProgress) {
  if (destino === 'trello') return exportarTrello(plantilla, recibidas || {}, onProgress);
  if (destino === 'jira') return exportarJira(plantilla, recibidas || {}, onProgress);
  throw httpError('Destino desconocido. Usa «trello» o «jira».');
}

module.exports = { exportar, estado, jiraBase };
