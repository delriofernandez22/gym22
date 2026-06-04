# Comprobar Supabase

1. Arranca:

```bash
npm run dev
```

2. Abre en el navegador:

```txt
http://localhost:3001/api/debug/supabase
```

Tiene que salir:

```json
{
  "supabase": {
    "enabled": true,
    "urlPresent": true,
    "keyPresent": true,
    "bucket": "gym22"
  }
}
```

Si `enabled` sale `false`, el `.env` no está bien leído.

3. Sube un JSON desde el panel entrenador.

En terminal debe aparecer:

```txt
[SUPABASE] Subido: usuarios/...
```

4. Mira en Supabase Storage > gym22.
