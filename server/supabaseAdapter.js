function getConfig() {
  return {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    bucket: process.env.SUPABASE_BUCKET || 'gym22',
  };
}

export function supabaseEnabled() {
  const { url, key } = getConfig();
  return Boolean(url && key);
}

export function supabaseDebugInfo() {
  const { url, key, bucket } = getConfig();
  return {
    enabled: Boolean(url && key),
    urlPresent: Boolean(url),
    keyPresent: Boolean(key),
    keyPrefix: key ? key.slice(0, 12) : '',
    bucket,
  };
}

function headers(contentType = 'application/json') {
  const { key } = getConfig();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(contentType ? { 'Content-Type': contentType } : {}),
  };
}

function storageUrl(objectPath) {
  const { url, bucket } = getConfig();
  const clean = String(objectPath || '').replace(/^\/+/, '');
  const encodedPath = clean.split('/').map(part => encodeURIComponent(part)).join('/');
  return `${url}/storage/v1/object/${bucket}/${encodedPath}`;
}

export async function uploadText(path, text, contentType = 'application/json') {
  if (!supabaseEnabled()) {
    console.warn('[SUPABASE] No activo: faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    return false;
  }

  const url = storageUrl(path);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers(contentType),
      'x-upsert': 'true',
      'cache-control': '3600',
    },
    body: text,
  });

  if (!res.ok) {
    const details = await res.text().catch(() => '');
    console.error('[SUPABASE] Error subiendo texto:', res.status, path, details);
    throw new Error(`Supabase upload failed ${res.status}: ${details}`);
  }

  console.log('[SUPABASE] Subido:', path);
  return true;
}

export async function uploadBuffer(path, buffer, contentType = 'application/octet-stream') {
  if (!supabaseEnabled()) {
    console.warn('[SUPABASE] No activo: faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    return false;
  }

  const res = await fetch(storageUrl(path), {
    method: 'POST',
    headers: {
      ...headers(contentType),
      'x-upsert': 'true',
      'cache-control': '3600',
    },
    body: buffer,
  });

  if (!res.ok) {
    const details = await res.text().catch(() => '');
    console.error('[SUPABASE] Error subiendo archivo:', res.status, path, details);
    throw new Error(`Supabase upload failed ${res.status}: ${details}`);
  }

  console.log('[SUPABASE] Subido:', path);
  return true;
}

export async function downloadText(path) {
  if (!supabaseEnabled()) return null;
  const res = await fetch(storageUrl(path), { headers: headers(null) });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) {
    const details = await res.text().catch(() => '');
    console.error('[SUPABASE] Error descargando texto:', res.status, path, details);
    throw new Error(`Supabase download failed ${res.status}: ${details}`);
  }
  return res.text();
}

export async function downloadBuffer(path) {
  if (!supabaseEnabled()) return null;
  const res = await fetch(storageUrl(path), { headers: headers(null) });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) {
    const details = await res.text().catch(() => '');
    console.error('[SUPABASE] Error descargando archivo:', res.status, path, details);
    throw new Error(`Supabase download failed ${res.status}: ${details}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function listFolder(prefix) {
  if (!supabaseEnabled()) return [];
  const { url, bucket } = getConfig();
  const cleanPrefix = String(prefix || '').replace(/^\/+|\/+$/g, '');

  const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: headers('application/json'),
    body: JSON.stringify({
      prefix: cleanPrefix,
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    }),
  });

  if (!res.ok) {
    const details = await res.text().catch(() => '');
    console.warn('[SUPABASE] No se pudo listar:', cleanPrefix, res.status, details);
    return [];
  }

  return res.json();
}
