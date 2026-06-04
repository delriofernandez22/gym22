import { getCurrentUserEmail, setCurrentUser } from '../pagina-datos-usuario/shared/userProfileService.js';

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data.message || 'Error de conexión');
  return data;
}

export const homeService = {
  async getHome() {
    const email = getCurrentUserEmail();
    if (!email) throw new Error('No hay usuario activo.');
    const result = await postJson('/api/home/current', { email });
    if (result.user) setCurrentUser(result.user);
    return result;
  },


  async updateTargetWeight(pesoObjetivo) {
    const email = getCurrentUserEmail();
    if (!email) throw new Error('No hay usuario activo.');
    return postJson('/api/home/tarjeta-principal/target-weight', { email, pesoObjetivo });
  },

  getMainPhotoUrl() {
    const email = getCurrentUserEmail();
    if (!email) return '';
    return `/api/home/tarjeta-principal/photo?email=${encodeURIComponent(email)}&v=${Date.now()}`;
  },
};
