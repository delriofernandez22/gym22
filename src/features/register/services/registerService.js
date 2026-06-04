async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let data = {};
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    throw new Error(data.message || 'Error de conexión');
  }

  return data;
}

export const registerService = {
  createUser({ email, password }) {
    const url = import.meta.env.VITE_AUTH_REGISTER_URL || '/api/auth/register';
    return postJson(url, { email, password });
  },
};
