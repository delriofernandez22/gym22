import './loadEnv.js';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { supabaseEnabled, supabaseDebugInfo, uploadText, uploadBuffer, downloadText, downloadBuffer, listFolder } from './supabaseAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const usersDir = path.join(projectRoot, 'usuarios');
const indexPath = path.join(usersDir, '_index.json');
const app = express();
const port = Number(process.env.API_PORT || 3001);
const SALT_ROUNDS = 10;
const TRAINER_USERNAME = 'Delrio';
const TRAINER_PASSWORD = '@@2200';


function normalizeEnergyInfo(value) {
  const n = typeof value === 'object' && value !== null ? Number(value.valor || 0) : Number(value || 0);
  if (n <= 2) return { valor: n, estado: 'muy_mal_agotado', descripcion: 'Muy mal / agotado' };
  if (n <= 4) return { valor: n, estado: 'muy_bajo', descripcion: 'Muy bajo' };
  if (n <= 6) return { valor: n, estado: 'normal', descripcion: 'Normal' };
  if (n <= 8) return { valor: n, estado: 'bien_fuerte', descripcion: 'Bien / fuerte' };
  return { valor: n, estado: 'me_siento_brutal', descripcion: 'Me siento brutal' };
}


function publicTrainer() {
  return {
    id: 'trainer-delrio',
    username: TRAINER_USERNAME,
    nombre: 'Del Río',
    role: 'trainer',
  };
}

function isTrainerCredentials(email, password) {
  return String(email || '').trim().toLowerCase() === TRAINER_USERNAME.toLowerCase()
    && String(password || '') === TRAINER_PASSWORD;
}


app.use(express.json({ limit: '15mb' }));


function cloudSafeSegment(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function supabasePath(...parts) {
  return ['usuarios', ...parts]
    .filter(Boolean)
    .map(cloudSafeSegment)
    .join('/')
    .replace(/\/+/g, '/');
}

async function writeTextAndSync(filePath, text, cloudPath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, 'utf8');
  if (cloudPath && supabaseEnabled()) {
    await uploadText(cloudPath, text, 'application/json');
  }
}

async function writeJsonAndSync(filePath, data, cloudPath) {
  await writeTextAndSync(filePath, JSON.stringify(data, null, 2), cloudPath);
}

async function hydrateFileFromSupabase(localPath, cloudPath) {
  if (!supabaseEnabled()) return false;
  try {
    await fs.access(localPath);
    return true;
  } catch {}
  const text = await downloadText(cloudPath);
  if (!text) return false;
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, text, 'utf8');
  return true;
}

async function hydrateBufferFromSupabase(localPath, cloudPath) {
  if (!supabaseEnabled()) return false;
  try {
    await fs.access(localPath);
    return true;
  } catch {}
  const buffer = await downloadBuffer(cloudPath);
  if (!buffer) return false;
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, buffer);
  return true;
}

async function hydrateIndexFromSupabase() {
  if (!supabaseEnabled()) return;
  await hydrateFileFromSupabase(indexPath, supabasePath('_index.json'));
}

async function hydrateUserFromSupabase(folderName) {
  if (!supabaseEnabled() || !folderName) return;
  await hydrateFileFromSupabase(profilePath(folderName), supabasePath(folderName, 'datos-usuario', 'perfil.json'));

  const trainingDir = path.join(userFolder(folderName), 'entrenamientos');
  await fs.mkdir(trainingDir, { recursive: true });
  const objects = await listFolder(supabasePath(folderName, 'entrenamientos'));
  for (const object of objects || []) {
    const name = object?.name || '';
    if (!name.endsWith('.json')) continue;
    await hydrateFileFromSupabase(
      path.join(trainingDir, name),
      supabasePath(folderName, 'entrenamientos', name)
    );
  }

  const photosDir = path.join(userDataFolder(folderName), 'fotos');
  await Promise.all([
    hydrateBufferFromSupabase(path.join(photosDir, 'tu-version-mas-fuerte.jpg'), supabasePath(folderName, 'datos-usuario', 'fotos', 'tu-version-mas-fuerte.jpg')),
    hydrateBufferFromSupabase(path.join(photosDir, 'tu-version-mas-fuerte.png'), supabasePath(folderName, 'datos-usuario', 'fotos', 'tu-version-mas-fuerte.png')),
    hydrateBufferFromSupabase(path.join(photosDir, 'perfil.jpg'), supabasePath(folderName, 'datos-usuario', 'fotos', 'perfil.jpg')),
  ]);
}

async function syncTrainingFileToSupabase(folderName, fileName, data) {
  if (!supabaseEnabled() || !folderName || !fileName) return false;
  await uploadText(
    supabasePath(folderName, 'entrenamientos', fileName),
    JSON.stringify(data, null, 2),
    'application/json'
  );
  return true;
}


function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function sanitizeFolderName(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function userFolderNameFromEmail(email) {
  return sanitizeFolderName(normalizeEmail(email));
}

function userFolder(folderName) {
  return path.join(usersDir, folderName);
}

function userDataFolder(folderName) {
  return path.join(userFolder(folderName), 'datos-usuario');
}

function profilePath(folderName) {
  return path.join(userDataFolder(folderName), 'perfil.json');
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    folderName: user.folderName,
    nombre: user.nombre || '',
    apellidos: user.apellidos || '',
    perfilCompleto: Boolean(user.perfilCompleto),
    onboardingStep: user.onboardingStep || 0,
    datosFisicos: user.datosFisicos || {},
    objetivo: user.objetivo || {},
    practicas: user.practicas || {},
    experiencia: user.experiencia || {},
    fotoPerfil: user.fotoPerfil || '',
    role: user.role || 'user',
  };
}

async function ensureUsersDir() {
  await fs.mkdir(usersDir, { recursive: true });
}

async function readIndex() {
  await ensureUsersDir();
  await hydrateIndexFromSupabase();
  try {
    return JSON.parse(await fs.readFile(indexPath, 'utf8'));
  } catch {
    return { usersByEmail: {} };
  }
}

async function writeIndex(index) {
  await writeJsonAndSync(indexPath, index, supabasePath('_index.json'));
}

async function getFolderNameByEmail(email) {
  const index = await readIndex();
  const folderName = index.usersByEmail[normalizeEmail(email)];
  if (!folderName) throw new Error('Usuario no encontrado');
  await hydrateUserFromSupabase(folderName);
  return folderName;
}

async function readUserByEmail(email) {
  const folderName = await getFolderNameByEmail(email);
  return JSON.parse(await fs.readFile(profilePath(folderName), 'utf8'));
}

async function writeUser(folderName, user) {
  await fs.mkdir(userDataFolder(folderName), { recursive: true });
  const nextUser = { ...user, folderName, updatedAt: new Date().toISOString() };
  await writeJsonAndSync(profilePath(folderName), nextUser, supabasePath(folderName, 'datos-usuario', 'perfil.json'));
  return nextUser;
}

async function ensureUserBaseFolders(folderPath) {
  await fs.mkdir(path.join(folderPath, 'datos-usuario', 'fotos'), { recursive: true });
  await Promise.all([
    fs.mkdir(path.join(folderPath, 'entrenamientos'), { recursive: true }),
    fs.mkdir(path.join(folderPath, 'progreso'), { recursive: true }),
    fs.mkdir(path.join(folderPath, 'configuracion'), { recursive: true }),
    fs.mkdir(path.join(folderPath, 'home', 'tarjeta-principal'), { recursive: true }),
    fs.mkdir(path.join(folderPath, 'home', 'tarjeta-entrenamiento-hoy'), { recursive: true }),
    fs.mkdir(path.join(folderPath, 'home', 'calendario-entrenamientos'), { recursive: true }),
    fs.mkdir(path.join(folderPath, 'home', 'entrenamientos'), { recursive: true }),
    fs.mkdir(path.join(folderPath, 'home', 'progreso'), { recursive: true }),
    fs.mkdir(path.join(folderPath, 'home', 'nutricion'), { recursive: true }),
  ]);
  await ensureHomeConfigs(folderPath);
}

async function writeJsonIfMissing(filePath, data) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
}

async function ensureHomeConfigs(folderPath) {
  const homePath = path.join(folderPath, 'home');
  await writeJsonIfMissing(path.join(homePath, 'tarjeta-principal', 'config.json'), {
    id: 'tarjeta-principal',
    title: 'MÁS FUERTE QUE AYER',
    subtitle: 'Tu versión más fuerte',
    enabled: true,
    order: 1,
    photoFile: 'tu-version-mas-fuerte.jpg',
    pesoObjetivo: '',
  });
  await writeJsonIfMissing(path.join(homePath, 'tarjeta-entrenamiento-hoy', 'config.json'), {
    id: 'tarjeta-entrenamiento-hoy',
    title: 'ENTRENAMIENTO DE HOY',
    enabled: true,
    order: 2,
  });
  await writeJsonIfMissing(path.join(homePath, 'calendario-entrenamientos', 'config.json'), { id: 'calendario-entrenamientos', title: 'CALENDARIO DE ENTRENAMIENTOS', enabled: true, order: 3 });
  await writeJsonIfMissing(path.join(homePath, 'entrenamientos', 'config.json'), { id: 'entrenamientos', enabled: true, order: 4 });
  await writeJsonIfMissing(path.join(homePath, 'progreso', 'config.json'), { id: 'progreso', enabled: true, order: 4 });
  await writeJsonIfMissing(path.join(homePath, 'nutricion', 'config.json'), { id: 'nutricion', enabled: false, order: 5 });
}

async function readJsonIfExists(filePath, fallback = {}) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function getSpanishDayName(date) {
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  return days[date.getDay()];
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function getTodayTrainingFileName(date = new Date()) {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  return `${day}${month}${year}-${getSpanishDayName(date)}.json`;
}


function normalizeTrainingDate(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getDateFilePrefix(date = new Date()) {
  return `${pad2(date.getDate())}${pad2(date.getMonth() + 1)}${date.getFullYear()}`;
}

function normalizeTrainingFromData(data, source = {}) {
  const dia = data.dia || data;
  const ejercicios = Array.isArray(data.ejercicios) ? data.ejercicios : (Array.isArray(data.listaEjercicios) ? data.listaEjercicios : []);
  const totalEjercicios = data.resumen?.totalEjercicios ?? ejercicios.length ?? data.totalEjercicios ?? 0;
  const ejerciciosCompletados = data.resumen?.ejerciciosCompletados ?? ejercicios.filter((e) => (e.estadoEjercicio || e.registro?.estado) === 'completado').length;
  const porcentajeCompletado = data.resumen?.porcentaje ?? data.porcentajeCompletado ?? (totalEjercicios ? Math.round((ejerciciosCompletados / totalEjercicios) * 100) : 0);
  return {
    exists: true,
    idEntrenamiento: source.idEntrenamiento || data.idEntrenamiento || dia.idEntrenamiento || source.fileName || '',
    fileName: source.fileName || '',
    path: source.path || '',
    estado: source.estado || data.estadoDia || data.estado || dia.estado || 'pendiente',
    grupo: dia.titulo || data.grupo || data.grupoMuscular || data.titulo || '',
    grupoMuscular: dia.grupoMuscular || data.grupoMuscular || data.grupo || '',
    titulo: dia.titulo || data.titulo || data.grupo || '',
    duracion: data.duracion || data.tiempo || data.minutos || '',
    ejercicios: totalEjercicios || data.ejercicios || '',
    totalEjercicios,
    ejerciciosCompletados,
    porcentajeCompletado,
    resumen: data.resumen || { totalEjercicios, ejerciciosCompletados, porcentaje: porcentajeCompletado },
    imagen: data.imagen || data.grupoImagen || '',
    frase: dia.fraseDia || data.frase || data.fraseDia || '',
    data,
    ejerciciosLista: ejercicios,
    finisher: data.finisher || null,
  };
}

async function readWeeklyTraining(folderName, date = new Date()) {
  await hydrateUserFromSupabase(folderName);
  const folderPath = userFolder(folderName);
  const trainingDir = path.join(folderPath, 'entrenamientos');
  const todayIso = normalizeTrainingDate(date);
  let entries = [];
  try { entries = await fs.readdir(trainingDir, { withFileTypes: true }); } catch { return null; }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const filePath = path.join(trainingDir, entry.name);
    try {
      const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
      if (!data?.entrenamientos || !Array.isArray(data?.calendario)) continue;
      const day = data.calendario.find((item) => item.fecha === todayIso);
      if (!day?.idEntrenamiento) continue;
      const training = data.entrenamientos[day.idEntrenamiento];
      if (!training || training.tipo === 'rest_day') {
        return normalizeTrainingFromData({
          idEntrenamiento: day.idEntrenamiento,
          estadoDia: day?.estado || 'descanso',
          dia: { fecha: todayIso, titulo: day?.titulo || 'DESCANSO', grupoMuscular: 'descanso' },
          ejercicios: [],
        }, { fileName: entry.name, path: `entrenamientos/${entry.name}`, idEntrenamiento: day.idEntrenamiento, estado: day.estado || 'descanso' });
      }
      return normalizeTrainingFromData(training, { fileName: entry.name, path: `entrenamientos/${entry.name}`, idEntrenamiento: day.idEntrenamiento, estado: day.estado || training.estadoDia || 'pendiente' });
    } catch {}
  }
  return null;
}

async function readCompletionOverride(folderName, date = new Date()) {
  const filePath = path.join(userFolder(folderName), 'entrenamientos', 'completados', `${getDateFilePrefix(date)}.json`);
  return readJsonIfExists(filePath, null);
}

async function readTodayTraining(folderName, date = new Date()) {
  const folderPath = userFolder(folderName);
  const year = String(date.getFullYear());
  const month = pad2(date.getMonth() + 1);
  const fileName = getTodayTrainingFileName(date);
  const candidates = [
    path.join(folderPath, 'entrenamientos', year, month, fileName),
    path.join(folderPath, 'entrenamientos', fileName),
  ];

  for (const candidate of candidates) {
    try {
      const data = JSON.parse(await fs.readFile(candidate, 'utf8'));
      return normalizeTrainingFromData(data, { fileName, path: candidate.replace(folderPath + path.sep, '') });
    } catch {}
  }

  const weekly = await readWeeklyTraining(folderName, date);
  if (weekly) return weekly;

  return {
    exists: false,
    fileName,
    estado: 'no_cargado',
    message: 'Tu entrenamiento de hoy todavía no está listo. Jonatan está trabajando en ello.',
  };
}


function getMonthNameSpanish(monthIndex) {
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return months[monthIndex] || '';
}

function getShortDayTitle(dateIso) {
  const d = new Date(`${dateIso}T12:00:00`);
  const days = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  return days[d.getDay()] || '';
}

function normalizeCalendarStatus(status, tipo) {
  if (tipo === 'rest' || status === 'descanso') return 'descanso';
  if (status === 'completado') return 'completado';
  if (status === 'no_realizado') return 'no_realizado';
  if (status === 'en_progreso') return 'en_progreso';
  if (status === 'pendiente') return 'cargado';
  return 'sin_entreno';
}

async function readTrainingCalendarMonth(folderName, date = new Date()) {
  await hydrateUserFromSupabase(folderName);
  const folderPath = userFolder(folderName);
  const trainingDir = path.join(folderPath, 'entrenamientos');
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const calendarMap = new Map();

  let entries = [];
  try { entries = await fs.readdir(trainingDir, { withFileTypes: true }); } catch { entries = []; }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const filePath = path.join(trainingDir, entry.name);
    try {
      const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
      if (!Array.isArray(data.calendario)) continue;
      data.calendario.forEach((item) => {
        if (!item?.fecha) return;
        const d = new Date(`${item.fecha}T12:00:00`);
        if (d.getFullYear() !== year || d.getMonth() !== month) return;
        const entrenamiento = data.entrenamientos?.[item.idEntrenamiento] || {};
        const totalEjercicios = entrenamiento.resumen?.totalEjercicios ?? (Array.isArray(entrenamiento.ejercicios) ? entrenamiento.ejercicios.length : 0);
        const ejerciciosCompletados = entrenamiento.resumen?.ejerciciosCompletados ?? (Array.isArray(entrenamiento.ejercicios) ? entrenamiento.ejercicios.filter((e)=> (e.estadoEjercicio || e.registro?.estado) === 'completado').length : 0);
        const porcentaje = entrenamiento.resumen?.porcentaje ?? entrenamiento.porcentajeCompletado ?? (totalEjercicios ? Math.round((ejerciciosCompletados / totalEjercicios) * 100) : 0);
        calendarMap.set(item.fecha, {
          fecha: item.fecha,
          dia: d.getDate(),
          diaSemana: item.diaSemana || getShortDayTitle(item.fecha),
          titulo: item.titulo || entrenamiento.dia?.titulo || 'Entrenamiento',
          grupo: item.grupo || entrenamiento.dia?.grupoMuscular || entrenamiento.grupoMuscular || '',
          tipo: item.tipo || entrenamiento.tipo || 'gym',
          estado: normalizeCalendarStatus(item.estado || entrenamiento.estadoDia, item.tipo),
          estadoOriginal: item.estado || entrenamiento.estadoDia || 'pendiente',
          idEntrenamiento: item.idEntrenamiento || '',
          totalEjercicios,
          ejerciciosCompletados,
          porcentaje,
        });
      });
    } catch {}
  }

  const daysInMonth = last.getDate();
  const dias = [];
  for (let day=1; day<=daysInMonth; day++) {
    const d = new Date(year, month, day);
    const iso = `${year}-${pad2(month+1)}-${pad2(day)}`;
    const existing = calendarMap.get(iso);
    dias.push(existing || {
      fecha: iso,
      dia: day,
      diaSemana: getShortDayTitle(iso),
      titulo: 'Sin entreno',
      grupo: '',
      tipo: 'none',
      estado: 'sin_entreno',
      estadoOriginal: 'sin_entreno',
      idEntrenamiento: '',
      totalEjercicios: 0,
      ejerciciosCompletados: 0,
      porcentaje: 0,
    });
  }

  const totalEntrenos = dias.filter((d) => !['descanso','sin_entreno'].includes(d.estado)).length;
  const completados = dias.filter((d) => d.estado === 'completado').length;
  const porcentajeAdherencia = totalEntrenos ? Math.round((completados / totalEntrenos) * 100) : 0;
  const todayIso = normalizeTrainingDate(date);
  const hoy = dias.find((d) => d.fecha === todayIso) || null;

  return {
    mes: month + 1,
    year,
    mesNombre: `${getMonthNameSpanish(month)} ${year}`,
    dias,
    hoy,
    resumen: {
      totalEntrenos,
      completados,
      pendientes: dias.filter((d) => d.estado === 'cargado' || d.estado === 'en_progreso').length,
      noRealizados: dias.filter((d) => d.estado === 'no_realizado').length,
      descansos: dias.filter((d) => d.estado === 'descanso' || d.estado === 'sin_entreno').length,
      porcentajeAdherencia,
    },
  };
}

async function countJsonFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json')).length;
  } catch {
    return 0;
  }
}

async function findHomePhotoPath(folderName) {
  const photosDir = path.join(userDataFolder(folderName), 'fotos');
  const candidates = [
    'tu-version-mas-fuerte.jpg',
    'tu-version-mas-fuerte.jpeg',
    'tu-version-mas-fuerte.png',
    'perfil-home.jpg',
    'perfil-home.png',
    'perfil-tarjeta.jpg',
    'perfil-tarjeta.png',
    'perfil.jpg',
  ];
  for (const file of candidates) {
    const candidatePath = path.join(photosDir, file);
    try {
      await fs.access(candidatePath);
      return candidatePath;
    } catch {}
  }
  return null;
}

async function uniqueFolderName(base) {
  const safeBase = base || `usuario_${Date.now()}`;
  let candidate = safeBase;
  let n = 2;
  while (true) {
    try {
      await fs.access(userFolder(candidate));
      candidate = `${safeBase}_${n++}`;
    } catch {
      return candidate;
    }
  }
}

app.post('/api/auth/register', async (req, res) => {
  await ensureUsersDir();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const repeatPassword = req.body.repeatPassword ? String(req.body.repeatPassword) : password;

  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Correo no válido.' });
  if (password.length < 6) return res.status(400).json({ message: 'La contraseña debe tener mínimo 6 caracteres.' });
  if (password !== repeatPassword) return res.status(400).json({ message: 'Las contraseñas no coinciden.' });

  const index = await readIndex();
  if (index.usersByEmail[email]) return res.status(409).json({ message: 'Este correo ya está registrado.' });

  const folderName = await uniqueFolderName(userFolderNameFromEmail(email));
  const folderPath = userFolder(folderName);
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = {
    id: crypto.randomUUID(),
    email,
    folderName,
    nombre: '',
    apellidos: '',
    perfilCompleto: false,
    onboardingStep: 0,
    datosFisicos: {},
    objetivo: {},
    practicas: {},
    experiencia: {},
    fotoPerfil: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash,
    role: 'user',
  };

  await ensureUserBaseFolders(folderPath);
  await writeUser(folderName, user);
  index.usersByEmail[email] = folderName;
  await writeIndex(index);

  return res.status(201).json({ ok: true, user: publicUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const rawLogin = String(req.body.email || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (isTrainerCredentials(rawLogin, password)) {
    return res.json({ ok: true, user: publicTrainer() });
  }

  try {
    const user = await readUserByEmail(email);
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
    return res.json({ ok: true, user: publicUser(user) });
  } catch {
    return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
  }
});

app.post('/api/auth/current-user', async (req, res) => {
  try {
    const user = await readUserByEmail(req.body.email);
    return res.json({ ok: true, user: publicUser(user) });
  } catch {
    return res.status(404).json({ message: 'Usuario no encontrado.' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    await readUserByEmail(req.body.email);
  } catch {
    return res.status(404).json({ message: 'No existe ningún usuario con ese correo.' });
  }
  return res.json({ ok: true, message: 'Usuario encontrado. Recuperación pendiente de configurar.' });
});

app.post('/api/user-profile/photo', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const dataUrl = String(req.body.photoDataUrl || '');
  if (!dataUrl.startsWith('data:image/')) return res.status(400).json({ message: 'Foto no válida.' });

  try {
    const folderName = await getFolderNameByEmail(email);
    const base64 = dataUrl.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');
    await fs.mkdir(path.join(userDataFolder(folderName), 'fotos'), { recursive: true });
    await fs.writeFile(path.join(userDataFolder(folderName), 'fotos', 'perfil.jpg'), buffer);
    if (supabaseEnabled()) await uploadBuffer(supabasePath(folderName, 'datos-usuario', 'fotos', 'perfil.jpg'), buffer, 'image/jpeg');

    const user = JSON.parse(await fs.readFile(profilePath(folderName), 'utf8'));
    user.fotoPerfil = 'datos-usuario/fotos/perfil.jpg';
    const saved = await writeUser(folderName, user);
    return res.json({ ok: true, path: saved.fotoPerfil, user: publicUser(saved) });
  } catch {
    return res.status(404).json({ message: 'Usuario no encontrado.' });
  }
});

async function renameFolderOnComplete(user, currentFolderName) {
  const nameBase = user.nombre || user.datosFisicos?.nombre || 'usuario';
  const surnameBase = user.apellidos || user.datosFisicos?.apellidos || '';
  const fullNameBase = sanitizeFolderName(`${nameBase} ${surnameBase}`.trim());
  const newFolderName = await uniqueFolderName(fullNameBase || currentFolderName);

  if (newFolderName === currentFolderName) return currentFolderName;

  await fs.rename(userFolder(currentFolderName), userFolder(newFolderName));

  const index = await readIndex();
  index.usersByEmail[user.email] = newFolderName;
  await writeIndex(index);

  user.folderName = newFolderName;
  await writeUser(newFolderName, user);
  return newFolderName;
}

app.post('/api/user-profile/step', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const step = Number(req.body.step);
  const data = req.body.data || {};

  if (![1, 2, 3, 4].includes(step)) return res.status(400).json({ message: 'Paso no válido.' });

  try {
    let folderName = await getFolderNameByEmail(email);
    const user = JSON.parse(await fs.readFile(profilePath(folderName), 'utf8'));

    if (step === 1) {
      user.datosFisicos = data;
      user.nombre = data.nombre || user.nombre || '';
      user.apellidos = data.apellidos || user.apellidos || '';
      user.onboardingStep = Math.max(user.onboardingStep || 0, 1);
    }

    if (step === 2) {
      user.objetivo = data;
      user.onboardingStep = Math.max(user.onboardingStep || 0, 2);
    }

    if (step === 3) {
      user.practicas = data;
      user.onboardingStep = Math.max(user.onboardingStep || 0, 3);
    }

    if (step === 4) {
      user.experiencia = data;
      user.onboardingStep = 4;
      user.perfilCompleto = true;
      await writeUser(folderName, user);
      folderName = await renameFolderOnComplete(user, folderName);
      const saved = JSON.parse(await fs.readFile(profilePath(folderName), 'utf8'));
      return res.json({ ok: true, folderName, perfilCompleto: true, user: publicUser(saved) });
    }

    const saved = await writeUser(folderName, user);
    return res.json({ ok: true, folderName, onboardingStep: saved.onboardingStep, user: publicUser(saved) });
  } catch (error) {
    return res.status(404).json({ message: 'Usuario no encontrado.' });
  }
});


app.post('/api/home/current', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  try {
    const folderName = await getFolderNameByEmail(email);
    const folderPath = userFolder(folderName);
    await ensureUserBaseFolders(folderPath);
    const user = JSON.parse(await fs.readFile(profilePath(folderName), 'utf8'));
    const tarjetaConfig = await readJsonIfExists(path.join(folderPath, 'home', 'tarjeta-principal', 'config.json'), {});
    const entrenamientoHoyConfig = await readJsonIfExists(path.join(folderPath, 'home', 'tarjeta-entrenamiento-hoy', 'config.json'), {});
    const calendarioConfig = await readJsonIfExists(path.join(folderPath, 'home', 'calendario-entrenamientos', 'config.json'), {});
    const entrenamientoHoy = await readTodayTraining(folderName);
    const calendarioEntrenamientos = await readTrainingCalendarMonth(folderName);
    const entrenosTotales = await countJsonFiles(path.join(folderPath, 'entrenamientos'));

    return res.json({
      ok: true,
      user: publicUser(user),
      home: {
        tarjetaPrincipal: tarjetaConfig,
        entrenamientoHoy: {
          ...entrenamientoHoy,
          config: entrenamientoHoyConfig,
        },
        calendarioEntrenamientos: {
          ...calendarioEntrenamientos,
          config: calendarioConfig,
        },
      },
      stats: {
        rachaDias: 0,
        entrenosTotales,
      },
    });
  } catch {
    return res.status(404).json({ message: 'Usuario no encontrado.' });
  }
});


app.post('/api/home/tarjeta-principal/target-weight', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const rawWeight = String(req.body.pesoObjetivo || '').replace(/kg/gi, '').trim();
  if (!rawWeight) return res.status(400).json({ message: 'Peso objetivo no válido.' });

  try {
    const folderName = await getFolderNameByEmail(email);
    const folderPath = userFolder(folderName);
    await ensureUserBaseFolders(folderPath);

    const configPath = path.join(folderPath, 'home', 'tarjeta-principal', 'config.json');
    const currentConfig = await readJsonIfExists(configPath, {});
    const nextConfig = {
      ...currentConfig,
      pesoObjetivo: rawWeight,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(configPath, JSON.stringify(nextConfig, null, 2), 'utf8');
    return res.json({ ok: true, config: nextConfig });
  } catch {
    return res.status(404).json({ message: 'Usuario no encontrado.' });
  }
});

app.get('/api/home/tarjeta-principal/photo', async (req, res) => {
  const email = normalizeEmail(req.query.email);
  try {
    const folderName = await getFolderNameByEmail(email);
    const photoPath = await findHomePhotoPath(folderName);
    if (!photoPath) return res.status(404).end();
    return res.sendFile(photoPath);
  } catch {
    return res.status(404).end();
  }
});






async function findWeeklyTrainingFileForDate(folderName, date = new Date()) {
  await hydrateUserFromSupabase(folderName);
  const folderPath = userFolder(folderName);
  const trainingDir = path.join(folderPath, 'entrenamientos');
  const todayIso = typeof date === 'string' ? date : normalizeTrainingDate(date);
  let entries = [];
  try { entries = await fs.readdir(trainingDir, { withFileTypes: true }); } catch { return null; }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const filePath = path.join(trainingDir, entry.name);
    try {
      const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
      if (!data?.entrenamientos || !Array.isArray(data?.calendario)) continue;
      const calendarDay = data.calendario.find((item) => item.fecha === todayIso);
      if (!calendarDay?.idEntrenamiento) continue;
      const entrenamiento = data.entrenamientos[calendarDay.idEntrenamiento];
      if (!entrenamiento) continue;
      return { filePath, fileName: entry.name, data, calendarDay, entrenamiento, idEntrenamiento: calendarDay.idEntrenamiento, fecha: todayIso };
    } catch {}
  }
  return null;
}

async function findWeeklyTrainingFileForToday(folderName) {
  return findWeeklyTrainingFileForDate(folderName, new Date());
}

function ensureWorkoutRegistro(entrenamiento) {
  if (!entrenamiento.registro) {
    entrenamiento.registro = {
      estado: entrenamiento.estadoDia || 'pendiente',
      iniciadoEn: null,
      finalizadoEn: null,
      duracionRealSegundos: null,
      comentariosGenerales: '',
    };
  }

  const ejercicios = Array.isArray(entrenamiento.ejercicios) ? entrenamiento.ejercicios : [];
  ejercicios.forEach((ejercicio) => {
    if (!ejercicio.registro) {
      ejercicio.registro = {
        estado: ejercicio.estadoEjercicio || 'pendiente',
        comentario: ejercicio.notas || '',
        descansoSegundosUsados: [],
      };
    }

    const series = Array.isArray(ejercicio.objetivo) ? ejercicio.objetivo : [];
    series.forEach((serie) => {
      if (!serie.registro) {
        serie.registro = {
          estado: serie.estadoSerie || 'pendiente',
          conseguido: null,
          objetivoKg: serie.objetivoKg ?? null,
          objetivoReps: serie.objetivoReps ?? null,
          resultadoKg: serie.resultadoKg ?? null,
          resultadoReps: serie.resultadoReps ?? null,
          motivoNoConseguido: '',
          comentario: serie.notas || '',
          actualizadoEn: null,
        };
      }
    });
  });

  return entrenamiento;
}

function isSerieDecidida(serie) {
  const estado = serie?.registro?.estado || serie?.estadoSerie;
  return estado === 'completada' || estado === 'no_conseguida';
}

function recalculateTrainingState(data, idEntrenamiento) {
  const entrenamiento = data?.entrenamientos?.[idEntrenamiento];
  if (!entrenamiento) return null;
  ensureWorkoutRegistro(entrenamiento);

  const ejercicios = Array.isArray(entrenamiento.ejercicios) ? entrenamiento.ejercicios : [];
  let totalSeries = 0;
  let seriesDecididas = 0;
  let ejerciciosCompletados = 0;

  ejercicios.forEach((ejercicio) => {
    const series = Array.isArray(ejercicio.objetivo) ? ejercicio.objetivo : [];
    totalSeries += series.length;
    const decididasEjercicio = series.filter(isSerieDecidida).length;
    seriesDecididas += decididasEjercicio;

    ejercicio.registro = ejercicio.registro || {};
    if (series.length > 0 && decididasEjercicio === series.length) {
      ejercicio.estadoEjercicio = 'completado';
      ejercicio.registro.estado = 'completado';
      ejerciciosCompletados += 1;
    } else if (decididasEjercicio > 0) {
      ejercicio.estadoEjercicio = 'en_progreso';
      ejercicio.registro.estado = 'en_progreso';
    } else {
      ejercicio.estadoEjercicio = ejercicio.estadoEjercicio === 'completado' ? 'pendiente' : (ejercicio.estadoEjercicio || 'pendiente');
      ejercicio.registro.estado = ejercicio.estadoEjercicio;
    }
  });

  const totalEjercicios = ejercicios.length;
  const porcentaje = totalEjercicios ? Math.round((ejerciciosCompletados / totalEjercicios) * 100) : 0;
  entrenamiento.porcentajeCompletado = porcentaje;
  entrenamiento.resumen = {
    totalEjercicios,
    ejerciciosCompletados,
    totalSeries,
    seriesRegistradas: seriesDecididas,
    porcentaje,
    actualizadoEn: new Date().toISOString(),
  };

  if (totalEjercicios > 0 && ejerciciosCompletados === totalEjercicios) {
    entrenamiento.estadoDia = 'completado';
    entrenamiento.registro.estado = 'completado';
  } else if (ejerciciosCompletados > 0 || seriesDecididas > 0 || entrenamiento.registro?.estado === 'en_progreso') {
    entrenamiento.estadoDia = 'en_progreso';
    entrenamiento.registro.estado = 'en_progreso';
  } else {
    entrenamiento.estadoDia = 'pendiente';
    entrenamiento.registro.estado = 'pendiente';
  }

  const finalEstado = entrenamiento.estadoDia || 'pendiente';
  if (Array.isArray(data.calendario)) {
    const item = data.calendario.find((d) => d.idEntrenamiento === idEntrenamiento);
    if (item) item.estado = finalEstado;
  }
  if (Array.isArray(data.semanas)) {
    data.semanas.forEach((semana) => {
      if (Array.isArray(semana.dias)) {
        const dia = semana.dias.find((d) => d.idEntrenamiento === idEntrenamiento);
        if (dia) dia.estado = finalEstado;
      }
      updateWeeklyProgress(semana, data.calendario || []);
    });
  }
  return entrenamiento;
}

function updateWeeklyProgress(semana, calendario = []) {
  if (!semana || !Array.isArray(semana.dias)) return;
  const diasEntrenamiento = semana.dias.filter((d) => !String(d.idEntrenamiento || '').startsWith('rest-'));
  const diasDescanso = semana.dias.length - diasEntrenamiento.length;
  const diasCompletados = diasEntrenamiento.filter((d) => d.estado === 'completado').length;
  const diasPendientes = diasEntrenamiento.filter((d) => d.estado !== 'completado').length;
  const porcentaje = diasEntrenamiento.length ? Math.round((diasCompletados / diasEntrenamiento.length) * 100) : 0;
  const filled = Math.round(porcentaje / 10);
  semana.progresoSemana = {
    diasEntrenamiento: diasEntrenamiento.length,
    diasCompletados,
    diasPendientes,
    diasDescanso,
    porcentaje,
    estadoVisual: `${'█'.repeat(filled)}${'░'.repeat(10-filled)} ${porcentaje}%`,
    actualizadoEn: new Date().toISOString(),
  };
}

function applyWorkoutAction(entrenamiento, action = {}) {
  ensureWorkoutRegistro(entrenamiento);
  const ejercicios = Array.isArray(entrenamiento.ejercicios) ? entrenamiento.ejercicios : [];
  const ejercicioIndex = Number(action.ejercicioIndex);
  const serieIndex = Number(action.serieIndex);
  const ejercicio = ejercicios[ejercicioIndex];

  if (action.type === 'start_workout') {
    const now = new Date();
    entrenamiento.registro.estado = 'en_progreso';
    entrenamiento.estadoDia = 'en_progreso';
    entrenamiento.registro.iniciadoEn = entrenamiento.registro.iniciadoEn || now.toISOString();

    entrenamiento.datosUsuario = {
      ...(entrenamiento.datosUsuario || {}),
      pesoCorporalKg: action.pesoCorporalKg ?? entrenamiento.datosUsuario?.pesoCorporalKg ?? null,
      energia: action.energia ? normalizeEnergyInfo(action.energia) : (entrenamiento.datosUsuario?.energia ?? null),
      horasSueno: action.horasSueno ?? entrenamiento.datosUsuario?.horasSueno ?? null,
      horaInicio: action.horaInicio || entrenamiento.datosUsuario?.horaInicio || now.toTimeString().slice(0,5),
      fechaInicio: action.fechaInicio || entrenamiento.datosUsuario?.fechaInicio || now.toISOString(),
      actualizadoEn: now.toISOString(),
    };

    entrenamiento.registro.preparacionDia = entrenamiento.datosUsuario;
    return;
  }

  if (!ejercicio) return;
  ejercicio.registro = ejercicio.registro || { estado: ejercicio.estadoEjercicio || 'pendiente', comentario: '', descansoSegundosUsados: [] };

  if (action.type === 'exercise_comment') {
    ejercicio.registro.comentario = String(action.comentario || '');
    ejercicio.notas = ejercicio.registro.comentario;
    return;
  }

  if (action.type === 'rest_start' || action.type === 'rest_finish') {
    ejercicio.registro.descansoSegundosUsados = Array.isArray(ejercicio.registro.descansoSegundosUsados) ? ejercicio.registro.descansoSegundosUsados : [];
    ejercicio.registro.descansoSegundosUsados.push({
      tipo: action.type,
      segundos: Number(action.segundos || 0),
      fecha: new Date().toISOString(),
    });
    return;
  }

  const series = Array.isArray(ejercicio.objetivo) ? ejercicio.objetivo : [];
  const serie = series[serieIndex];
  if (!serie) return;
  serie.registro = serie.registro || {
    estado: serie.estadoSerie || 'pendiente',
    conseguido: null,
    objetivoKg: serie.objetivoKg ?? null,
    objetivoReps: serie.objetivoReps ?? null,
    resultadoKg: serie.resultadoKg ?? null,
    resultadoReps: serie.resultadoReps ?? null,
    motivoNoConseguido: '',
    comentario: serie.notas || '',
    actualizadoEn: null,
  };

  if (action.type === 'serie_ok') {
    serie.registro.estado = 'completada';
    serie.registro.conseguido = true;
    serie.registro.resultadoKg = action.kg ?? serie.objetivoKg ?? serie.resultadoKg ?? null;
    serie.registro.resultadoReps = action.reps ?? serie.objetivoReps ?? serie.resultadoReps ?? null;
    if (action.segundos !== undefined && action.segundos !== '') {
      serie.registro.resultadoTiempoSeg = action.segundos;
      serie.resultadoTiempoSeg = action.segundos;
    }
    serie.registro.actualizadoEn = new Date().toISOString();
    serie.estadoSerie = 'completada';
    serie.resultadoKg = serie.registro.resultadoKg;
    serie.resultadoReps = serie.registro.resultadoReps;
    return;
  }

  if (action.type === 'serie_fail') {
    serie.registro.estado = 'no_conseguida';
    serie.registro.conseguido = false;
    serie.registro.resultadoKg = action.kg ?? null;
    serie.registro.resultadoReps = action.reps ?? null;
    serie.registro.motivoNoConseguido = String(action.motivo || '');
    serie.registro.actualizadoEn = new Date().toISOString();
    serie.estadoSerie = 'no_conseguida';
    serie.resultadoKg = serie.registro.resultadoKg;
    serie.resultadoReps = serie.registro.resultadoReps;
    serie.notas = serie.registro.motivoNoConseguido;
    return;
  }

  if (action.type === 'serie_comment') {
    serie.registro.comentario = String(action.comentario || '');
    serie.notas = serie.registro.comentario;
  }
}


app.post('/api/entrenamiento-activo/today', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const fecha = String(req.body.fecha || '').trim();
  try {
    const folderName = await getFolderNameByEmail(email);
    let entrenamiento = null;
    if (fecha) {
      const found = await findWeeklyTrainingFileForDate(folderName, fecha);
      if (found) {
        entrenamiento = normalizeTrainingFromData(found.entrenamiento, {
          fileName: found.fileName,
          path: `entrenamientos/${found.fileName}`,
          idEntrenamiento: found.idEntrenamiento,
          estado: found.calendarDay.estado || found.entrenamiento.estadoDia || 'pendiente'
        });
      }
    } else {
      entrenamiento = await readTodayTraining(folderName);
    }
    if (!entrenamiento?.exists) return res.status(404).json({ message: 'Entrenamiento no cargado.' });

    // Para la página de Entrenamiento Activo necesitamos el array real de ejercicios.
    // En Home `ejercicios` se normaliza como contador, así que aquí reconstruimos
    // el objeto con `ejercicios` como lista para que se pinten todos en scroll.
    const ejerciciosLista = Array.isArray(entrenamiento.ejerciciosLista)
      ? entrenamiento.ejerciciosLista
      : (Array.isArray(entrenamiento.data?.ejercicios) ? entrenamiento.data.ejercicios : []);

    return res.json({
      ok: true,
      entrenamiento: {
        ...entrenamiento,
        ejercicios: ejerciciosLista,
        totalEjercicios: ejerciciosLista.length,
      },
    });
  } catch {
    return res.status(404).json({ message: 'No se pudo cargar el entrenamiento activo.' });
  }
});

app.post('/api/entrenamiento-activo/finish', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const idEntrenamiento = String(req.body.idEntrenamiento || '');
  const fecha = String(req.body.fecha || '').trim();
  try {
    const folderName = await getFolderNameByEmail(email);
    const found = fecha ? await findWeeklyTrainingFileForDate(folderName, fecha) : await findWeeklyTrainingFileForToday(folderName);
    if (!found) return res.status(404).json({ message: 'No se encontró el JSON semanal del entrenamiento.' });

    const { data, calendarDay, entrenamiento } = found;
    if (idEntrenamiento && found.idEntrenamiento !== idEntrenamiento) {
      return res.status(409).json({ message: 'El entrenamiento activo no coincide con el JSON del día.' });
    }

    ensureWorkoutRegistro(entrenamiento);
    entrenamiento.registro.ultimoCierreEn = new Date().toISOString();

    const recalculated = recalculateTrainingState(data, found.idEntrenamiento);
    if (recalculated?.estadoDia === 'completado') {
      recalculated.registro.finalizadoEn = recalculated.registro.finalizadoEn || new Date().toISOString();
    }

    await fs.writeFile(found.filePath, JSON.stringify(data, null, 2), 'utf8');
    await syncTrainingFileToSupabase(folderName, found.fileName, data);
    return res.json({ ok: true, completado: recalculated?.estadoDia === 'completado', entrenamiento: recalculated });
  } catch (err) {
    return res.status(404).json({ message: err.message || 'No se pudo finalizar el entrenamiento.' });
  }
});

app.post('/api/entrenamiento-activo/action', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const action = req.body.action || {};
  const fecha = String(req.body.fecha || '').trim();
  try {
    const folderName = await getFolderNameByEmail(email);
    const found = fecha ? await findWeeklyTrainingFileForDate(folderName, fecha) : await findWeeklyTrainingFileForToday(folderName);
    if (!found) return res.status(404).json({ message: 'No se encontró el JSON semanal del entrenamiento.' });

    applyWorkoutAction(found.entrenamiento, action);
    const recalculated = recalculateTrainingState(found.data, found.idEntrenamiento);
    await fs.writeFile(found.filePath, JSON.stringify(found.data, null, 2), 'utf8');
    await syncTrainingFileToSupabase(folderName, found.fileName, found.data);

    return res.json({ ok: true, entrenamiento: recalculated || found.entrenamiento });
  } catch (err) {
    return res.status(404).json({ message: err.message || 'No se pudo guardar la acción.' });
  }
});


async function listClientUsersForTrainer() {
  const index = await readIndex();
  for (const folderName of Object.values(index.usersByEmail || {})) {
    await hydrateUserFromSupabase(folderName);
  }
  const entries = Object.entries(index.usersByEmail || {});
  const clients = [];

  for (const [email, folderName] of entries) {
    try {
      const user = JSON.parse(await fs.readFile(profilePath(folderName), 'utf8'));
      if ((user.role || 'user') === 'trainer') continue;
      const entrenamientoHoy = await readTodayTraining(folderName);
      const calendario = await readTrainingCalendarMonth(folderName);
      const fotoPath = await findHomePhotoPath(folderName);

      clients.push({
        id: user.id,
        email,
        folderName,
        nombre: user.nombre || user.datosFisicos?.nombre || folderName,
        apellidos: user.apellidos || user.datosFisicos?.apellidos || '',
        objetivo: user.objetivo || {},
        datosFisicos: user.datosFisicos || {},
        experiencia: user.experiencia || {},
        entrenamientoHoy,
        calendarioResumen: calendario.resumen || {},
        fotoUrl: fotoPath ? `/api/trainer/client-photo?folderName=${encodeURIComponent(folderName)}&v=${Date.now()}` : '',
      });
    } catch {}
  }

  return clients;
}

app.post('/api/trainer/home', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!isTrainerCredentials(username, password)) return res.status(401).json({ message: 'Acceso entrenador no autorizado.' });

  const clients = await listClientUsersForTrainer();
  return res.json({ ok: true, trainer: publicTrainer(), clients });
});

app.post('/api/trainer/client-detail', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const folderName = sanitizeFolderName(req.body.folderName || '');
  if (!isTrainerCredentials(username, password)) return res.status(401).json({ message: 'Acceso entrenador no autorizado.' });

  try {
    const user = JSON.parse(await fs.readFile(profilePath(folderName), 'utf8'));
    const calendario = await readTrainingCalendarMonth(folderName);
    const entrenamientoHoy = await readTodayTraining(folderName);
    return res.json({
      ok: true,
      client: {
        ...publicUser(user),
        entrenamientoHoy,
        calendarioEntrenamientos: calendario,
        fotoUrl: `/api/trainer/client-photo?folderName=${encodeURIComponent(folderName)}&v=${Date.now()}`,
      },
    });
  } catch {
    return res.status(404).json({ message: 'Cliente no encontrado.' });
  }
});

app.get('/api/trainer/client-photo', async (req, res) => {
  const folderName = sanitizeFolderName(req.query.folderName || '');
  try {
    const photoPath = await findHomePhotoPath(folderName);
    if (!photoPath) return res.status(404).end();
    return res.sendFile(photoPath);
  } catch {
    return res.status(404).end();
  }
});

async function findLatestTrainingJson(folderName) {
  const trainingDir = path.join(userFolder(folderName), 'entrenamientos');
  let entries = [];
  try { entries = await fs.readdir(trainingDir, { withFileTypes: true }); } catch { return null; }
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const filePath = path.join(trainingDir, entry.name);
    try {
      const stat = await fs.stat(filePath);
      files.push({ filePath, name: entry.name, mtimeMs: stat.mtimeMs });
    } catch {}
  }
  files.sort((a,b)=>b.mtimeMs-a.mtimeMs);
  return files[0] || null;
}

app.post('/api/trainer/upload-json', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const folderName = sanitizeFolderName(req.body.folderName || '');
  const fileName = sanitizeFolderName(req.body.fileName || `entrenamiento-${Date.now()}`) + '.json';
  const content = req.body.content;

  if (!isTrainerCredentials(username, password)) return res.status(401).json({ message: 'Acceso entrenador no autorizado.' });

  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    const trainingDir = path.join(userFolder(folderName), 'entrenamientos');
    await fs.mkdir(trainingDir, { recursive: true });
    const safeName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    const filePath = path.join(trainingDir, safeName);
    await fs.writeFile(filePath, JSON.stringify(parsed, null, 2), 'utf8');
    await syncTrainingFileToSupabase(folderName, safeName, parsed);
    return res.json({ ok: true, fileName: safeName, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[TRAINER upload-json]', err);
    return res.status(400).json({ message: err.message || 'JSON no válido o cliente no encontrado.' });
  }
});

app.post('/api/trainer/download-json', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const folderName = sanitizeFolderName(req.body.folderName || '');

  if (!isTrainerCredentials(username, password)) return res.status(401).json({ message: 'Acceso entrenador no autorizado.' });

  const latest = await findLatestTrainingJson(folderName);
  if (!latest) return res.status(404).json({ message: 'Este cliente no tiene JSON de entrenamiento.' });

  try {
    const content = JSON.parse(await fs.readFile(latest.filePath, 'utf8'));
    return res.json({ ok: true, fileName: latest.name, content });
  } catch {
    return res.status(404).json({ message: 'No se pudo leer el JSON.' });
  }
});

app.post('/api/trainer/upload-strong-photo', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const folderName = sanitizeFolderName(req.body.folderName || '');
  const dataUrl = String(req.body.photoDataUrl || '');

  if (!isTrainerCredentials(username, password)) return res.status(401).json({ message: 'Acceso entrenador no autorizado.' });
  if (!dataUrl.startsWith('data:image/')) return res.status(400).json({ message: 'Imagen no válida.' });

  try {
    const base64 = dataUrl.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');
    const photosDir = path.join(userDataFolder(folderName), 'fotos');
    await fs.mkdir(photosDir, { recursive: true });
    await fs.writeFile(path.join(photosDir, 'tu-version-mas-fuerte.jpg'), buffer);
    if (supabaseEnabled()) await uploadBuffer(supabasePath(folderName, 'datos-usuario', 'fotos', 'tu-version-mas-fuerte.jpg'), buffer, 'image/jpeg');
    return res.json({ ok: true, path: 'datos-usuario/fotos/tu-version-mas-fuerte.jpg', updatedAt: new Date().toISOString() });
  } catch {
    return res.status(404).json({ message: 'Cliente no encontrado.' });
  }
});



app.post('/api/trainer/download-profile', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const folderName = sanitizeFolderName(req.body.folderName || '');

  if (!isTrainerCredentials(username, password)) return res.status(401).json({ message: 'Acceso entrenador no autorizado.' });

  try {
    const content = JSON.parse(await fs.readFile(profilePath(folderName), 'utf8'));
    return res.json({ ok: true, fileName: `${folderName}-perfil-inicial.json`, content });
  } catch {
    return res.status(404).json({ message: 'No se pudo leer el perfil inicial.' });
  }
});



app.get('/api/debug/supabase', (req, res) => {
  res.json({
    ok: true,
    supabase: supabaseDebugInfo(),
    runtimeDataDir: usersDir,
  });
});

if (!process.env.VERCEL) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`API GYM22 escuchando en http://localhost:${port}`);
    const dbg = supabaseDebugInfo();
    console.log(`[SUPABASE] enabled=${dbg.enabled} bucket=${dbg.bucket} key=${dbg.keyPrefix ? dbg.keyPrefix + '...' : 'NO_KEY'}`);
  });
}

export default app;
