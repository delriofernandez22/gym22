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

export function getCurrentUserEmail() {
  return localStorage.getItem('gym22.currentUserEmail') || '';
}

export function getCurrentUserFolder() {
  return localStorage.getItem('gym22.currentUserFolder') || '';
}

export function setCurrentUser(user) {
  if (!user) return;
  if (user.email) localStorage.setItem('gym22.currentUserEmail', user.email);
  if (user.folderName) localStorage.setItem('gym22.currentUserFolder', user.folderName);
  localStorage.setItem('gym22.currentUser', JSON.stringify(user));
}

export function clearCurrentUser() {
  localStorage.removeItem('gym22.currentUserEmail');
  localStorage.removeItem('gym22.currentUserFolder');
  localStorage.removeItem('gym22.currentUser');
}

export const userProfileService = {
  async saveStep(step, data) {
    const email = getCurrentUserEmail();
    if (!email) throw new Error('No hay usuario activo.');
    const result = await postJson('/api/user-profile/step', { email, step, data });
    if (result.user) setCurrentUser(result.user);
    if (result.folderName) localStorage.setItem('gym22.currentUserFolder', result.folderName);
    return result;
  },

  async savePhoto(photoDataUrl) {
    const email = getCurrentUserEmail();
    if (!email) throw new Error('No hay usuario activo.');
    const result = await postJson('/api/user-profile/photo', { email, photoDataUrl });
    if (result.user) setCurrentUser(result.user);
    return result;
  },

  async getCurrentUser() {
    const email = getCurrentUserEmail();
    if (!email) throw new Error('No hay usuario activo.');
    const result = await postJson('/api/auth/current-user', { email });
    if (result.user) setCurrentUser(result.user);
    return result.user;
  },
};
