# GYM22 — Despliegue gratis con Vercel + Supabase

## 1. Supabase
1. Crea un proyecto en Supabase.
2. Crea un bucket privado llamado `gym22`.
3. Copia:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. En Vercel, añade esas variables de entorno.

## 2. Variables de entorno

```env
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
SUPABASE_BUCKET=gym22
RUNTIME_DATA_DIR=/tmp/gym22-usuarios
```

## 3. Cómo funciona esta versión

La app mantiene la estructura actual de carpetas para no romper nada, pero cuando existen variables de Supabase:

- usa `/tmp/gym22-usuarios` como carpeta temporal;
- sincroniza perfiles, JSONs e imágenes con Supabase Storage;
- cada subida de JSON se guarda también en Supabase;
- cada actualización del entrenamiento se sincroniza a Supabase;
- las imágenes de `tu-version-mas-fuerte.jpg` se guardan en Supabase.

Esto permite desplegar sin pagar disco persistente.

## 4. Importante

No pongas `SUPABASE_SERVICE_ROLE_KEY` en el frontend. Solo en el backend/servidor.
