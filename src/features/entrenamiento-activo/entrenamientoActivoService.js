
import { getCurrentUserEmail } from '../pagina-datos-usuario/shared/userProfileService.js';

async function postJson(url, body){
  const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  let data={};
  try{ data = await res.json(); }catch{}
  if(!res.ok) throw new Error(data.message || 'Error de conexión');
  return data;
}

export const entrenamientoActivoService = {
  getToday(fecha){
    const email = getCurrentUserEmail();
    if(!email) throw new Error('No hay usuario activo.');
    return postJson('/api/entrenamiento-activo/today', { email, fecha });
  },
  finish(idEntrenamiento){
    const email = getCurrentUserEmail();
    if(!email) throw new Error('No hay usuario activo.');
    const fecha = new URLSearchParams(window.location.search).get('fecha') || '';
    return postJson('/api/entrenamiento-activo/finish', { email, idEntrenamiento, fecha });
  },
  saveAction(action){
    const email = getCurrentUserEmail();
    if(!email) throw new Error('No hay usuario activo.');
    const fecha = new URLSearchParams(window.location.search).get('fecha') || '';
    return postJson('/api/entrenamiento-activo/action', { email, action, fecha });
  }
};
