# Fix Vercel API

Esta versión añade `api/[...path].js` para que Vercel publique el backend Express como función serverless.

Después de subir esta versión:

```bash
git add .
git commit -m "fix api vercel serverless"
git push
```

En Vercel se redeployará. Después prueba:

```txt
https://TU_DOMINIO.vercel.app/api/debug/supabase
```

Debe devolver JSON.
