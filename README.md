# GYM22

Proyecto React + Node para login, registro, datos de usuario y Home modular.

## Arrancar

```bash
npm install
npm run dev
```

## Rutas

- `/` Login
- `/register` Registro
- `/datos-usuario` Datos del usuario con fondo fijo y scroll
- `/home` Home del usuario logueado

## Estructura de usuario

Al registrarse se crea:

```txt
usuarios/
  correo@gmail_com/
    datos-usuario/
      perfil.json
      fotos/
        perfil.jpg
    home/
      tarjeta-principal/
        config.json
      entrenamientos/
        config.json
      progreso/
        config.json
      nutricion/
        config.json
    entrenamientos/
    progreso/
    configuracion/
```

Al completar datos de usuario, la carpeta se renombra con el nombre del usuario.

## Tarjeta principal Home

La tarjeta visual está en:

```txt
src/features/home/tarjeta-principal/
```

Carga datos del usuario logueado desde `perfil.json` y busca la foto en este orden:

```txt
datos-usuario/fotos/tu-version-mas-fuerte.jpg
datos-usuario/fotos/tu-version-mas-fuerte.png
datos-usuario/fotos/perfil-home.jpg
datos-usuario/fotos/perfil-tarjeta.jpg
datos-usuario/fotos/perfil.jpg
```
