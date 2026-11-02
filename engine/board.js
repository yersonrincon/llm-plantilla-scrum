const { config } = require('./config');

const ROLES = {
  product_owner: 'Product Owner',
  scrum_master: 'Scrum Master',
  analista: 'Analista',
  desarrollador_backend: 'Dev Backend',
  desarrollador_frontend: 'Dev Frontend',
  qa: 'QA / Pruebas',
  devops: 'DevOps',
};

const TASK_TYPES = ['analisis', 'diseno', 'desarrollo', 'base_datos', 'pruebas', 'despliegue', 'documentacion'];
const PHASE_ORDER = ['inicio', 'sprint_0', 'construccion', 'integracion', 'release'];
const PRIORITY_ORDER = { alta: 0, media: 1, baja: 2 };

function normalizeRole(value) {
  const text = String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (ROLES[text]) return text;
  if (/front|interfaz|ui\b|pantalla|vista/.test(text)) return 'desarrollador_frontend';
  if (/qa|prueba|test|calidad|tester/.test(text)) return 'qa';
  if (/devops|despl|infra|servidor|ci\b/.test(text)) return 'devops';
  if (/analis|disen|requisit|ux/.test(text)) return 'analista';
  if (/product|owner|po\b/.test(text)) return 'product_owner';
  if (/scrum|master/.test(text)) return 'scrum_master';
  return 'desarrollador_backend';
}

function normalizeType(value, role) {
  const text = String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
  if (TASK_TYPES.includes(text)) return text;
  if (/prueba|test/.test(text)) return 'pruebas';
  if (/base|datos|bd|sql/.test(text)) return 'base_datos';
  if (/despl|deploy/.test(text)) return 'despliegue';
  if (/doc/.test(text)) return 'documentacion';
  if (/disen|ux|ui/.test(text)) return 'diseno';
  if (/analis|requisit/.test(text)) return 'analisis';
  if (role === 'qa') return 'pruebas';
  if (role === 'analista') return 'analisis';
  return 'desarrollo';
}

function clampHours(value, fallback) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(Math.max(number, 1), 16);
}

function defaultTasks(story) {
  const total = Math.max(4, (Number(story.story_points) || 3) * 5);
  const share = (part) => Math.max(1, Math.round(total * part));
  return [
    { titulo: `Analizar criterios y diseñar solución: ${story.titulo}`, tipo: 'analisis', rol: 'analista', horas: share(0.1) },
    { titulo: `Implementar lógica y API: ${story.titulo}`, tipo: 'desarrollo', rol: 'desarrollador_backend', horas: share(0.35) },
    { titulo: `Construir pantallas: ${story.titulo}`, tipo: 'desarrollo', rol: 'desarrollador_frontend', horas: share(0.3) },
    { titulo: `Probar criterios de aceptación: ${story.titulo}`, tipo: 'pruebas', rol: 'qa', horas: share(0.2) },
    { titulo: `Revisión de código y despliegue en pruebas: ${story.titulo}`, tipo: 'despliegue', rol: 'devops', horas: share(0.05) },
  ];
}

function normalizeTasks(story, proposed) {
  const items = Array.isArray(proposed) ? proposed : [];
  const tasks = items
    .filter((item) => item && typeof item === 'object' && String(item.titulo || '').trim())
    .slice(0, 8)
    .map((item) => {
      const rol = normalizeRole(item.rol);
      return {
        titulo: String(item.titulo).trim().slice(0, 160),
        tipo: normalizeType(item.tipo, rol),
        rol,
        horas: clampHours(item.horas, 4),
      };
    });
  const source = tasks.length >= 2 ? tasks : defaultTasks(story);
  return {
    origen: tasks.length >= 2 ? 'hermes' : 'automatico',
    tareas: source.map((task, index) => ({
      id: `${story.id}-T${index + 1}`,
      ...task,
      rol_nombre: ROLES[task.rol],
      estado: 'Por hacer',
    })),
  };
}

function toBusinessDays(days) {
  const value = Math.round(Number(days));
  if (!Number.isFinite(value) || value <= 0) return config.sprintDays;
  if (value % 7 === 0) return (value / 7) * 5;
  return Math.min(value, 20);
}

function isWeekend(date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function nextBusinessDay(date) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  while (isWeekend(next)) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function addBusinessDays(start, days) {
  let end = new Date(start);
  for (let count = 1; count < days; count += 1) end = nextBusinessDay(end);
  return end;
}

function startDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  let date;
  if (match) {
    date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  } else {
    const now = new Date();
    date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    do date.setUTCDate(date.getUTCDate() + 1); while (date.getUTCDay() !== 1);
  }
  while (isWeekend(date)) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function planSprints(plan, storyIds) {
  const steps = (Array.isArray(plan) ? plan : [])
    .filter((step) => step && typeof step === 'object')
    .sort((a, b) => PHASE_ORDER.indexOf(a.fase) - PHASE_ORDER.indexOf(b.fase));
  const used = new Set();
  const sprints = [];
  for (const step of steps) {
    for (const sprint of Array.isArray(step.sprints) ? step.sprints : []) {
      if (!sprint || typeof sprint !== 'object') continue;
      const historias = (Array.isArray(sprint.historias) ? sprint.historias : [])
        .map(String)
        .filter((id) => storyIds.has(id) && !used.has(id));
      historias.forEach((id) => used.add(id));
      if (!historias.length && step.fase !== 'sprint_0') continue;
      sprints.push({
        fase: PHASE_ORDER.includes(step.fase) ? step.fase : 'construccion',
        objetivo: cleanGoal(sprint.objetivo, step.objetivo),
        dias: toBusinessDays(sprint.duracion_dias),
        historias,
        origen: 'plan',
      });
    }
  }
  return { sprints, used };
}

function cleanGoal(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text && !/^(null|undefined|n\/a|no consta en los manuales)$/i.test(text)) return text;
  }
  return '';
}

function sortByPriority(stories) {
  return [...stories].sort((a, b) => {
    const pa = PRIORITY_ORDER[String(a.prioridad || '').toLowerCase()] ?? 1;
    const pb = PRIORITY_ORDER[String(b.prioridad || '').toLowerCase()] ?? 1;
    return pa - pb;
  });
}

function assignLeftovers(sprints, stories, used) {
  const byId = new Map(stories.map((story) => [story.id, story]));
  const points = (sprint) => sprint.historias.reduce((total, id) => total + (byId.get(id).story_points || 0), 0);
  const automaticos = [];
  for (const story of sortByPriority(stories.filter((item) => !used.has(item.id)))) {
    let target = sprints.find((sprint) => (
      sprint.fase !== 'sprint_0' && points(sprint) + story.story_points <= config.sprintVelocity
    ));
    if (!target) {
      target = { fase: 'construccion', objetivo: '', dias: config.sprintDays, historias: [], origen: 'automatico' };
      sprints.push(target);
    }
    target.historias.push(story.id);
    automaticos.push(story.id);
  }
  return automaticos;
}

function buildBoard(backlog, plan, tasksByStory, { inicio, equipo } = {}) {
  const stories = (Array.isArray(backlog) ? backlog : []).map((story) => ({
    ...story,
    story_points: Number(story.story_points) || 3,
  }));
  const storyIds = new Set(stories.map((story) => story.id));
  const { sprints, used } = planSprints(plan, storyIds);
  const automaticos = assignLeftovers(sprints, stories, used);

  const members = equipo && typeof equipo === 'object' ? equipo : {};
  const avisos = [];
  if (automaticos.length) {
    avisos.push(`Asigné automáticamente a sprints (por prioridad y una velocidad de ${config.sprintVelocity} puntos): ${automaticos.join(', ')}.`);
  }

  let cursor = startDate(inicio);
  const sprintOf = new Map();
  const tablero = sprints.map((sprint, index) => {
    const start = cursor;
    const end = addBusinessDays(start, sprint.dias);
    cursor = nextBusinessDay(end);
    const numero = index + 1;
    sprint.historias.forEach((id) => sprintOf.set(id, numero));
    return {
      numero,
      nombre: sprint.fase === 'sprint_0' ? `Sprint ${numero} (preparación)` : `Sprint ${numero}`,
      fase: sprint.fase,
      objetivo: sprint.objetivo,
      inicio: isoDate(start),
      fin: isoDate(end),
      dias_habiles: sprint.dias,
      historias: sprint.historias,
      origen: sprint.origen,
    };
  });

  const historias = stories.map((story) => {
    const { origen, tareas } = tasksByStory.get(story.id) || normalizeTasks(story, []);
    const sprint = sprintOf.get(story.id) || null;
    return {
      id: story.id,
      titulo: story.titulo,
      historia: story.historia,
      prioridad: story.prioridad,
      story_points: story.story_points,
      fase_proyecto: story.fase_proyecto,
      fuente_documento: story.fuente_documento,
      sprint,
      estado: 'Por hacer',
      origen_tareas: origen,
      horas: tareas.reduce((total, task) => total + task.horas, 0),
      tareas: tareas.map((task) => ({
        ...task,
        sprint,
        responsable: members[task.rol] || task.rol_nombre,
        asignado: members[task.rol] || '',
      })),
    };
  });

  const carga = Object.keys(ROLES).map((rol) => {
    const porSprint = tablero.map((sprint) => {
      const horas = historias
        .filter((story) => story.sprint === sprint.numero)
        .flatMap((story) => story.tareas)
        .filter((task) => task.rol === rol)
        .reduce((total, task) => total + task.horas, 0);
      const capacidad = sprint.dias_habiles * config.hoursPerDay;
      if (horas > capacidad) {
        avisos.push(`${members[rol] || ROLES[rol]} tiene ${horas} h en el ${sprint.nombre} y su capacidad es ${capacidad} h.`);
      }
      return { sprint: sprint.numero, horas, capacidad };
    });
    return {
      rol,
      nombre: ROLES[rol],
      responsable: members[rol] || ROLES[rol],
      horas_total: porSprint.reduce((total, item) => total + item.horas, 0),
      por_sprint: porSprint,
    };
  }).filter((row) => row.horas_total > 0);

  const fin = tablero.length ? tablero[tablero.length - 1].fin : null;
  return {
    inicio_proyecto: tablero.length ? tablero[0].inicio : isoDate(startDate(inicio)),
    fin_proyecto: fin,
    horas_por_dia: config.hoursPerDay,
    velocidad_puntos: config.sprintVelocity,
    columnas: ['Por hacer', 'En progreso', 'En revisión', 'Hecho'],
    sprints: tablero,
    historias,
    carga,
    total_horas: historias.reduce((total, story) => total + story.horas, 0),
    total_puntos: historias.reduce((total, story) => total + story.story_points, 0),
    avisos,
  };
}

module.exports = { ROLES, TASK_TYPES, normalizeTasks, buildBoard };
