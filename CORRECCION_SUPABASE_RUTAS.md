# Corrección Supabase rutas

Supabase estaba rechazando rutas con caracteres como `@` en nombres de carpeta:

`usuarios/test@gym22_com/datos-usuario/perfil.json`

Esta versión convierte las rutas de Storage a segmentos seguros:

`usuarios/test_gym22_com/datos_usuario/perfil_json`

El sistema local puede seguir funcionando igual, pero la nube ya no rompe por ruta inválida.
