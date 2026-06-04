# Server + Supabase

Esta versión mantiene compatibilidad con la estructura local, pero si existen `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`:

- `usuarios/_index.json` se sincroniza con Supabase Storage.
- `datos-usuario/perfil.json` se sincroniza con Supabase Storage.
- `entrenamientos/*.json` se sincronizan con Supabase Storage.
- `datos-usuario/fotos/tu-version-mas-fuerte.jpg` se sincroniza con Supabase Storage.
- En nube usa `RUNTIME_DATA_DIR=/tmp/gym22-usuarios`.

Bucket recomendado: `gym22`.
