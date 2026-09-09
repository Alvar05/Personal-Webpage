# Portfolio — Álvaro Hernández Gallardo

Web de una sola pantalla (scrollytelling). El scroll mueve una cámara en primera
persona por una nave industrial; cada estación es un puesto de trabajo con el
material del capítulo correspondiente de la trayectoria.

## Cómo funciona

- **Estática**: no hay build ni backend. `index.html` + `style.css` + `app.js` + `assets/`.
- **3D**: three.js r0.160.1 desde cdnjs. Geometría y texturas generadas por código
  (no hay modelos externos que descargar).
- **Sin WebGL**: la página cae automáticamente a un documento normal, con las
  secciones apiladas y legibles.
- **Formulario**: envía a [FormSubmit](https://formsubmit.co). El primer envío
  llega con un correo de confirmación que hay que aceptar una vez.

Tiene que servirse por `http(s)`. Abriendo `index.html` con doble clic
(`file://`) el navegador bloquea las texturas y la escena sale en negro.

## Probar en local

```bash
python -m http.server 8000
```

Y abrir <http://localhost:8000>.

## Publicar en GitHub Pages

Con estos ficheros en la raíz del repositorio:

`Settings` → `Pages` → *Source*: `Deploy from a branch` → rama `main`, carpeta `/ (root)`.

El fichero `.nojekyll` evita que GitHub procese la carpeta con Jekyll.

## Estructura

```
index.html      narración y formulario (texto real, indexable y accesible)
style.css       interfaz sobre la escena: paneles, raíl de estaciones, HUD
app.js          escena 3D: trazado, texturas, puestos de trabajo, animación
assets/         fotos del robot ACME, del TFG y la imagen de previsualización
```

## Retocar el contenido

- Los textos de cada estación están en `index.html`, en `<section class="station">`.
- Las estaciones del 3D se definen en `app.js`, en el array `ST` (posición de
  scroll, anchura de aparición y lado del pasillo).
- En la estación 05, los pivotes y la trayectoria del robot salen de la misma
  tabla `PILLARS`: si mueves un pivote, el recorrido de esquiva se recalcula solo.
