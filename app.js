/* =====================================================================
   Álvaro Hernández — recorrido POV por una línea de producción.
   El scroll avanza la cámara por la nave. Cada estación es un puesto
   de trabajo real con el material del capítulo correspondiente.
   ===================================================================== */
(function () {
  'use strict';

  var body = document.body;

  function webglAvailable() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }

  if (!window.THREE || !webglAvailable()) {
    // sin WebGL la pagina se lee como documento normal; los botones saltan por ancla
    body.classList.add('no3d');
    var l0 = document.getElementById('loader');
    if (l0) l0.remove();
    document.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button[data-goto]');
      if (!btn) return;
      var sec = document.getElementById('s' + btn.dataset.goto);
      if (sec) sec.scrollIntoView({ behavior: 'smooth' });
    });
    return;
  }

  body.classList.add('js');
  var T = window.THREE;
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOBILE = innerWidth < 820 || matchMedia('(pointer: coarse)').matches;

  /* ==================================================================
     1. Trazado y estaciones
     ================================================================== */
  var ST = [
    { p: 0.015, w: 0.075, side:  0, code: 'Entrance',           sub: 'From Ibiza to Barcelona' },
    { p: 0.115, w: 0.070, side: -1, code: 'Education',    sub: 'Universitat de Vic' },
    { p: 0.225, w: 0.070, side:  1, code: 'Ibiza, 2016',       sub: 'The assembly bench' },
    { p: 0.335, w: 0.070, side: -1, code: 'Thailand, 2018',   sub: 'The competition table' },
    { p: 0.455, w: 0.072, side:  1, code: 'WRO 2021',          sub: 'Sixth worldwide' },
    { p: 0.575, w: 0.072, side: -1, code: 'Panama, 2023',      sub: 'The test track' },
    { p: 0.695, w: 0.072, side:  1, code: 'Awayter, 2025–26',  sub: 'The dispensing bench' },
    { p: 0.805, w: 0.068, side: -1, code: 'Three disciplines',      sub: 'One mindset' },
    { p: 0.940, w: 0.085, side:  0, code: 'End of the line',      sub: 'Let’s talk' }
  ];

  var WAY = [
    [  0, 24], [  0,  -4], [  0, -32], [  0, -58],
    [  5, -70], [ 18, -75], [ 44, -75], [ 70, -75],
    [ 83, -80], [ 88, -93], [ 88, -119], [ 88, -147], [ 88, -176]
  ].map(function (q) { return new T.Vector3(q[0], 0, q[1]); });

  var CURVE = new T.CatmullRomCurve3(WAY, false, 'centripetal');
  var LEN = CURVE.getLength();

  function pToU(p) { return 0.006 + Math.min(Math.max(p, 0), 1) * 0.958; }

  var _p = new T.Vector3(), _t = new T.Vector3(), _r = new T.Vector3();

  function frame(u) {
    u = Math.min(Math.max(u, 0), 1);
    CURVE.getPointAt(u, _p);
    CURVE.getTangentAt(u, _t);
    _r.set(-_t.z, 0, _t.x).normalize();
    return { pos: _p, tan: _t, right: _r };
  }
  function pointAt(u, lateral, height) {
    var f = frame(u);
    return new T.Vector3(f.pos.x + f.right.x * (lateral || 0), height || 0,
                         f.pos.z + f.right.z * (lateral || 0));
  }
  function yawAt(u) { return Math.atan2(frame(u).tan.x, frame(u).tan.z); }

  // facing: 'along' (mira hacia delante) | 'in' (mira al pasillo) | 'back' (mira a quien llega)
  function place(obj, u, lateral, height, facing, extraYaw) {
    obj.position.copy(pointAt(u, lateral, height));
    var y = yawAt(u);
    if (facing === 'in') y += (lateral > 0 ? Math.PI / 2 : -Math.PI / 2);
    else if (facing === 'back') y += Math.PI;
    obj.rotation.y = y + (extraYaw || 0);
    return obj;
  }

  /* ==================================================================
     2. Texturas procedurales
     ================================================================== */
  function cvs(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function toTex(canvas, rx, ry) {
    var t = new T.CanvasTexture(canvas);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = MOBILE ? 2 : 8;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    if (rx) t.repeat.set(rx, ry || rx);
    return t;
  }
  function toData(canvas, rx, ry) {          // mapas de relieve: sin conversión de color
    var t = new T.CanvasTexture(canvas);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    if (rx) t.repeat.set(rx, ry || rx);
    return t;
  }
  function noise(x, s, n, a, dark) {
    var v = dark ? '0,0,0,' : '255,255,255,';
    for (var i = 0; i < n; i++) {
      x.fillStyle = 'rgba(' + v + (Math.random() * a) + ')';
      x.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5);
    }
  }

  /* hormigón industrial, con juntas, manchas y grano */
  function concreteMaps() {
    var s = 512, c = cvs(s, s), x = c.getContext('2d');
    x.fillStyle = '#2b302b'; x.fillRect(0, 0, s, s);
    for (var i = 0; i < 26; i++) {
      var r = 30 + Math.random() * 90;
      var cx = Math.random() * s, cy = Math.random() * s;
      var g = x.createRadialGradient(cx, cy, 2, cx, cy, r);
      g.addColorStop(0, 'rgba(18,22,18,.34)'); g.addColorStop(1, 'rgba(18,22,18,0)');
      x.fillStyle = g; x.fillRect(0, 0, s, s);
    }
    noise(x, s, 5200, 0.10, false);
    noise(x, s, 4200, 0.16, true);
    x.strokeStyle = 'rgba(10,13,10,.55)'; x.lineWidth = 4; x.strokeRect(0, 0, s, s);
    x.strokeStyle = 'rgba(255,255,255,.045)'; x.lineWidth = 1.4; x.strokeRect(3, 3, s - 6, s - 6);

    var b = cvs(s, s), bx = b.getContext('2d');
    bx.fillStyle = '#808080'; bx.fillRect(0, 0, s, s);
    noise(bx, s, 9000, 0.35, false); noise(bx, s, 9000, 0.35, true);
    bx.strokeStyle = '#1a1a1a'; bx.lineWidth = 5; bx.strokeRect(0, 0, s, s);
    return { map: toTex(c, 42, 42), bump: toData(b, 42, 42) };
  }

  /* chapa industrial nervada con costura y tornillería */
  function panelMaps() {
    var s = 256, c = cvs(s, s), x = c.getContext('2d');
    x.fillStyle = '#39413a'; x.fillRect(0, 0, s, s);
    for (var i = 0; i < s; i += 32) {
      var g = x.createLinearGradient(i, 0, i + 32, 0);
      g.addColorStop(0, 'rgba(255,255,255,.07)');
      g.addColorStop(0.45, 'rgba(0,0,0,.18)');
      g.addColorStop(1, 'rgba(255,255,255,.04)');
      x.fillStyle = g; x.fillRect(i, 0, 32, s);
    }
    x.fillStyle = 'rgba(0,0,0,.42)'; x.fillRect(0, s - 8, s, 8);
    x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(0, s - 10, s, 2);
    for (var k = 16; k < s; k += 64) {
      x.fillStyle = 'rgba(0,0,0,.5)'; x.beginPath(); x.arc(k, s - 4, 3, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,.14)'; x.beginPath(); x.arc(k, s - 5, 2, 0, 7); x.fill();
    }
    noise(x, s, 1500, 0.06, true);

    var b = cvs(s, s), bx = b.getContext('2d');
    bx.fillStyle = '#6e6e6e'; bx.fillRect(0, 0, s, s);
    for (var j = 0; j < s; j += 32) {
      var g2 = bx.createLinearGradient(j, 0, j + 32, 0);
      g2.addColorStop(0, '#d0d0d0'); g2.addColorStop(0.5, '#303030'); g2.addColorStop(1, '#d0d0d0');
      bx.fillStyle = g2; bx.fillRect(j, 0, 32, s);
    }
    bx.fillStyle = '#101010'; bx.fillRect(0, s - 8, s, 8);
    return { map: toTex(c, 3, 2), bump: toData(b, 3, 2) };
  }

  function steelMap() {
    var s = 256, c = cvs(s, s), x = c.getContext('2d');
    x.fillStyle = '#575f58'; x.fillRect(0, 0, s, s);
    for (var i = 0; i < 900; i++) {
      x.strokeStyle = 'rgba(' + (Math.random() > 0.5 ? '255,255,255' : '0,0,0') + ',' + (Math.random() * 0.09) + ')';
      x.lineWidth = Math.random() * 1.6;
      var y = Math.random() * s;
      x.beginPath(); x.moveTo(0, y); x.lineTo(s, y + (Math.random() - 0.5) * 3); x.stroke();
    }
    return toTex(c, 2, 2);
  }

  /* perfil de aluminio ranurado del banco del TFG */
  function extrusionMap() {
    var s = 128, c = cvs(s, s), x = c.getContext('2d');
    x.fillStyle = '#9aa1a4'; x.fillRect(0, 0, s, s);
    x.fillStyle = '#5e6668'; x.fillRect(s * 0.34, 0, s * 0.32, s);
    x.fillStyle = '#33393b'; x.fillRect(s * 0.42, 0, s * 0.16, s);
    x.fillStyle = 'rgba(255,255,255,.35)';
    x.fillRect(s * 0.30, 0, 3, s); x.fillRect(s * 0.66, 0, 3, s);
    for (var i = 0; i < 400; i++) {
      x.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.07) + ')';
      x.fillRect(Math.random() * s, Math.random() * s, 1, 1 + Math.random() * 2);
    }
    return toTex(c, 1, 4);
  }

  function hazardMap() {
    var w = 256, h = 64, c = cvs(w, h), x = c.getContext('2d');
    x.fillStyle = '#0f120f'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#d9b93c';
    for (var i = -h; i < w; i += 44) {
      x.beginPath(); x.moveTo(i, h); x.lineTo(i + 22, h);
      x.lineTo(i + 22 + h, 0); x.lineTo(i + h, 0); x.closePath(); x.fill();
    }
    noise(x, w, 900, 0.12, true);
    return toTex(c, 6, 1);
  }

  /* malla de valla de célula robotizada */
  function meshMap() {
    var s = 128, c = cvs(s, s), x = c.getContext('2d');
    x.clearRect(0, 0, s, s);
    x.strokeStyle = '#8b968c'; x.lineWidth = 5;
    for (var i = 0; i <= s; i += 16) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i, s); x.stroke();
      x.beginPath(); x.moveTo(0, i); x.lineTo(s, i); x.stroke();
    }
    var t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(6, 3);
    return t;
  }

  /* panel perforado con siluetas de herramienta */
  function pegboardMap() {
    var w = 512, h = 256, c = cvs(w, h), x = c.getContext('2d');
    x.fillStyle = '#2f3a33'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(0,0,0,.55)';
    for (var i = 12; i < w; i += 20) for (var j = 12; j < h; j += 20) {
      x.beginPath(); x.arc(i, j, 3, 0, 7); x.fill();
    }
    x.lineCap = 'round';
    x.strokeStyle = '#c8cec4'; x.lineWidth = 6;
    [[60, 40, 60, 150], [92, 44, 92, 140], [124, 40, 124, 158]].forEach(function (l) {
      x.beginPath(); x.moveTo(l[0], l[1]); x.lineTo(l[2], l[3]); x.stroke();
    });
    x.lineWidth = 9;
    [[200, 50, 246, 150], [270, 50, 236, 150]].forEach(function (l) {
      x.beginPath(); x.moveTo(l[0], l[1]); x.lineTo(l[2], l[3]); x.stroke();
    });
    x.strokeStyle = '#9fb894'; x.lineWidth = 7;
    [330, 366, 402, 438].forEach(function (xx) {
      x.beginPath(); x.moveTo(xx, 46); x.lineTo(xx, 132); x.stroke();
    });
    x.fillStyle = 'rgba(208,233,139,.75)';
    x.font = '600 20px Manrope, Arial, sans-serif';
    x.fillText('TOOLS', 60, 205);
    x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(52, 216, 400, 3);
    return toTex(c);
  }

  function crateMap(hex, label) {
    var s = 256, c = cvs(s, s), x = c.getContext('2d');
    x.fillStyle = hex; x.fillRect(0, 0, s, s);
    x.fillStyle = 'rgba(0,0,0,.20)'; x.fillRect(0, 0, s, 22); x.fillRect(0, s - 22, s, 22);
    x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = 6; x.strokeRect(6, 6, s - 12, s - 12);
    x.fillStyle = 'rgba(245,245,238,.92)'; x.fillRect(40, 96, 176, 66);
    x.fillStyle = '#20281f'; x.font = '600 26px Manrope, Arial, sans-serif';
    x.fillText(label, 54, 132, 150);
    for (var i = 0; i < 16; i++) x.fillRect(56 + i * 9, 142, 2 + (i % 3), 12);
    noise(x, s, 1200, 0.08, true);
    return toTex(c);
  }

  function signTexture(title, sub, accent) {
    var w = 1024, h = 256, c = cvs(w, h), x = c.getContext('2d');
    x.fillStyle = '#0d1310'; x.fillRect(0, 0, w, h);
    x.strokeStyle = accent || '#d0e98b'; x.lineWidth = 6; x.strokeRect(9, 9, w - 18, h - 18);
    x.fillStyle = accent || '#d0e98b'; x.fillRect(9, 9, 16, h - 18);
    x.textBaseline = 'middle';
    x.fillStyle = '#eef1e8'; x.font = '600 78px Manrope, Arial, sans-serif';
    x.fillText(title, 56, sub ? 100 : h / 2, w - 100);
    if (sub) {
      x.fillStyle = accent || '#d0e98b'; x.font = '500 36px "JetBrains Mono", monospace';
      x.fillText(sub, 58, 176, w - 100);
    }
    return toTex(c);
  }

  function screenTexture(lines, accent) {
    var w = 512, h = 384, c = cvs(w, h), x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b1a11'); g.addColorStop(1, '#060d09');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(208,233,139,.3)'; x.lineWidth = 2; x.strokeRect(10, 10, w - 20, h - 20);
    x.textBaseline = 'top';
    var y = 32;
    lines.forEach(function (ln) {
      if (ln.big) {
        x.fillStyle = accent || '#d0e98b'; x.font = '600 62px Manrope, Arial, sans-serif';
        x.fillText(ln.big, 34, y); y += 74;
      }
      if (ln.small) {
        x.fillStyle = '#8b9a89'; x.font = '400 21px "JetBrains Mono", monospace';
        x.fillText(ln.small, 34, y, w - 68); y += 34;
      }
      if (ln.rule) {
        x.strokeStyle = 'rgba(208,233,139,.2)';
        x.beginPath(); x.moveTo(34, y + 6); x.lineTo(w - 34, y + 6); x.stroke(); y += 22;
      }
    });
    for (var i = 0; i < h; i += 4) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, i, w, 1); }
    return toTex(c);
  }

  function decalTexture(text, color) {
    var w = 512, h = 256, c = cvs(w, h), x = c.getContext('2d');
    x.fillStyle = color || 'rgba(208,233,139,.9)';
    x.font = '700 190px Manrope, Arial, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, w / 2, h / 2 + 8);
    return toTex(c);
  }

  function iconTexture(kind, label) {
    var w = 384, h = 768, c = cvs(w, h), x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1e3625'); g.addColorStop(1, '#0d1a12');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#d0e98b'; x.fillRect(0, 0, w, 16);
    x.strokeStyle = 'rgba(208,233,139,.55)'; x.lineWidth = 5; x.strokeRect(14, 14, w - 28, h - 28);

    // pictograma: trazo único, 14 px, esquinas redondas
    x.save();
    x.translate(w / 2, h * 0.34);
    x.strokeStyle = '#d8f096'; x.fillStyle = '#d8f096';
    x.lineWidth = 14; x.lineCap = 'round'; x.lineJoin = 'round';
    if (kind === 'gear') {
      var R = 92, r = 62, teeth = 8;
      x.beginPath();
      for (var i = 0; i < teeth; i++) {
        var a0 = (i / teeth) * Math.PI * 2, a1 = a0 + Math.PI / teeth;
        var ae = a1 - Math.PI / (teeth * 4), ab = a0 + Math.PI / (teeth * 4);
        x.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
        x.lineTo(Math.cos(ab) * R, Math.sin(ab) * R);
        x.lineTo(Math.cos(ae) * R, Math.sin(ae) * R);
        x.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
        x.arc(0, 0, r, a1, a0 + Math.PI * 2 / teeth, false);
      }
      x.closePath(); x.stroke();
      x.beginPath(); x.arc(0, 0, 26, 0, Math.PI * 2); x.stroke();
    } else if (kind === 'wave') {
      x.beginPath();
      for (var k = 0; k <= 120; k++) {
        var px = -120 + k * 2, py = Math.sin(k / 120 * Math.PI * 3) * 52;
        if (k === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.stroke();
      x.beginPath(); x.moveTo(-140, 0); x.lineTo(-124, 0); x.moveTo(124, 0); x.lineTo(140, 0); x.stroke();
      x.beginPath(); x.arc(-140, 0, 9, 0, 7); x.fill();
      x.beginPath(); x.arc(140, 0, 9, 0, 7); x.fill();
    } else {
      x.beginPath();
      x.moveTo(-60, -90); x.lineTo(-108, -50); x.lineTo(-108, 50); x.lineTo(-60, 90);
      x.moveTo(60, -90); x.lineTo(108, -50); x.lineTo(108, 50); x.lineTo(60, 90);
      x.moveTo(24, -96); x.lineTo(-24, 96);
      x.stroke();
    }
    x.restore();

    var parts = label.split('\n');
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '600 46px Manrope, Arial, sans-serif'; x.fillStyle = '#f3f7ec';
    x.fillText(parts[0], w / 2, h * 0.62);
    x.font = '500 27px "DM Sans", Arial, sans-serif'; x.fillStyle = '#a6bf9a';
    if (parts[1]) x.fillText(parts[1], w / 2, h * 0.70);
    return toTex(c);
  }

  /* cubierta del ACME con la rotulación calada FE / ACME / 23 */
  function acmeDeckTexture() {
    var w = 512, h = 384, c = cvs(w, h), x = c.getContext('2d');
    x.fillStyle = '#27bd2c'; x.fillRect(0, 0, w, h);
    for (var i = 0; i < h; i += 3) { x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(0, i, w, 1); }
    x.fillStyle = '#0d1a0d';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '700 56px Manrope, Arial, sans-serif'; x.fillText('FE', w / 2, 74);
    x.font = '700 118px Manrope, Arial, sans-serif'; x.fillText('ACME', w / 2, 168);
    x.font = '700 128px Manrope, Arial, sans-serif'; x.fillText('23', w / 2, 296);
    return toTex(c);
  }

  /* ==================================================================
     3. Escena, materiales, luz
     ================================================================== */
  var canvas = document.getElementById('scene');
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: !MOBILE, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, MOBILE ? 1.6 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  var DARK = 0x0b100e;
  var scene = new T.Scene();
  scene.background = new T.Color(DARK);
  scene.fog = new T.FogExp2(DARK, MOBILE ? 0.029 : 0.023);

  var CAM_Y = MOBILE ? 2.0 : 1.62;
  var LOOK_Y = MOBILE ? 0.95 : 1.5;
  var camera = new T.PerspectiveCamera(MOBILE ? 74 : 62, innerWidth / innerHeight, 0.1, 400);
  camera.position.set(0, CAM_Y, 24);

  var manager = new T.LoadingManager();
  var texLoader = new T.TextureLoader(manager);
  function photo(file) {
    var t = texLoader.load('assets/' + file);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = MOBILE ? 2 : 8;
    return t;
  }

  var concrete = concreteMaps(), panelTx = panelMaps();
  var steelTx = steelMap(), extrTx = extrusionMap(), hazardTx = hazardMap(), pegTx = pegboardMap();

  var M = {
    concrete: new T.MeshStandardMaterial({ map: concrete.map, bumpMap: concrete.bump, bumpScale: 0.45,
                                           roughness: 0.93, metalness: 0.06 }),
    wall:   new T.MeshStandardMaterial({ map: panelTx.map, bumpMap: panelTx.bump, bumpScale: 0.6,
                                         roughness: 0.78, metalness: 0.35 }),
    steel:  new T.MeshStandardMaterial({ map: steelTx, roughness: 0.5, metalness: 0.72 }),
    steelD: new T.MeshStandardMaterial({ map: steelTx, color: 0x8a9088, roughness: 0.62, metalness: 0.5 }),
    extr:   new T.MeshStandardMaterial({ map: extrTx, roughness: 0.42, metalness: 0.8 }),
    hazard: new T.MeshStandardMaterial({ map: hazardTx, roughness: 0.7, metalness: 0.2 }),
    peg:    new T.MeshStandardMaterial({ map: pegTx, roughness: 0.9, metalness: 0.05 }),
    fence:  new T.MeshStandardMaterial({ map: meshMap(), alphaTest: 0.5, side: T.DoubleSide,
                                         roughness: 0.8, metalness: 0.5 }),
    dark:   new T.MeshStandardMaterial({ color: 0x252b26, roughness: 0.8, metalness: 0.3 }),
    black:  new T.MeshStandardMaterial({ color: 0x121512, roughness: 0.82, metalness: 0.24 }),
    rubber: new T.MeshStandardMaterial({ color: 0x141614, roughness: 0.98, metalness: 0 }),
    white:  new T.MeshStandardMaterial({ color: 0xdadfd4, roughness: 0.6, metalness: 0.1 }),
    acme:   new T.MeshStandardMaterial({ color: 0x27bd2c, roughness: 0.52, metalness: 0.03 }),
    acmeD:  new T.MeshStandardMaterial({ map: acmeDeckTexture(), roughness: 0.52, metalness: 0.03 }),
    pcb:    new T.MeshStandardMaterial({ color: 0x1c7a3d, roughness: 0.55, metalness: 0.2 }),
    yellow: new T.MeshStandardMaterial({ color: 0xd8bb3c, roughness: 0.6, metalness: 0.2 }),
    orange: new T.MeshStandardMaterial({ color: 0xd9741d, roughness: 0.55, metalness: 0.3 }),
    blueAn: new T.MeshStandardMaterial({ color: 0x2a4fa8, roughness: 0.4, metalness: 0.55 }),
    petg:   new T.MeshStandardMaterial({ color: 0x2c33a0, roughness: 0.42, metalness: 0.06 }),
    flex:   new T.MeshStandardMaterial({ color: 0x18163f, roughness: 0.85, metalness: 0.02, side: T.DoubleSide }),
    lamp:   new T.MeshBasicMaterial({ color: 0xecf7d8 }),
    glow:   new T.MeshBasicMaterial({ color: 0xd0e98b }),
    warn:   new T.MeshBasicMaterial({ color: 0xd8c04a }),
    line:   new T.MeshBasicMaterial({ color: 0xdfe4d8 })
  };
  function lego(hex) { return new T.MeshStandardMaterial({ color: hex, roughness: 0.34, metalness: 0.02 }); }

  var G = {
    box: new T.BoxGeometry(1, 1, 1),
    cyl: new T.CylinderGeometry(0.5, 0.5, 1, 20),
    cyl8: new T.CylinderGeometry(0.5, 0.5, 1, 10),
    plane: new T.PlaneGeometry(1, 1),
    ico: new T.IcosahedronGeometry(0.5, 0),
    sphere: new T.SphereGeometry(0.5, 22, 16)
  };
  function box(w, h, d, mat) { var m = new T.Mesh(G.box, mat); m.scale.set(w, h, d); return m; }
  function cyl(r, h, mat, s8) { var m = new T.Mesh(s8 ? G.cyl8 : G.cyl, mat); m.scale.set(r * 2, h, r * 2); return m; }
  function panel(w, h, mat) { var m = new T.Mesh(G.plane, mat); m.scale.set(w, h, 1); return m; }
  function ball(r, mat) { var m = new T.Mesh(G.sphere, mat); m.scale.setScalar(r * 2); return m; }

  scene.add(new T.HemisphereLight(0x3a4c37, 0x0a0d0a, 1.05));
  scene.add(new T.AmbientLight(0x48583f, 0.4));

  var rollingLights = [];
  for (var li = 0; li < (MOBILE ? 3 : 5); li++) {
    var pl = new T.PointLight(0xdcefc0, 62, 34, 2);
    scene.add(pl); rollingLights.push(pl);
  }
  // foco direccional sobre la estación activa: da relieve al puesto
  var keySpot = new T.SpotLight(0xfff2d4, 0, 32, 0.66, 0.55, 1.6);
  var keyTarget = new T.Object3D();
  scene.add(keySpot); scene.add(keyTarget);
  keySpot.target = keyTarget;
  var fillLight = new T.PointLight(0xbfe0ff, 0, 22, 2);
  scene.add(fillLight);

  /* ==================================================================
     4. Nave
     ================================================================== */
  var ground = new T.Mesh(new T.PlaneGeometry(420, 420), M.concrete);
  ground.rotation.x = -Math.PI / 2; ground.position.set(44, 0, -76);
  scene.add(ground);

  var ceiling = new T.Mesh(new T.PlaneGeometry(420, 420),
    new T.MeshStandardMaterial({ color: 0x10140f, roughness: 1, metalness: 0.12 }));
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(44, 7.2, -76);
  scene.add(ceiling);

  var _m4 = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _sc = new T.Vector3(), _pv = new T.Vector3();
  function instanced(geo, mat, list) {
    var im = new T.InstancedMesh(geo, mat, list.length);
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      _e.set(0, it.yaw || 0, 0); _q.setFromEuler(_e);
      _sc.set(it.sx, it.sy, it.sz); _pv.set(it.x, it.y, it.z);
      _m4.compose(_pv, _q, _sc); im.setMatrixAt(i, _m4);
    }
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    scene.add(im);
    return im;
  }
  function sample(step, fn) {
    var n = Math.floor(LEN / step);
    for (var i = 0; i <= n; i++) fn(i / n, i);
  }
  function nearStation(u, tol) {
    for (var i = 0; i < ST.length; i++) if (Math.abs(pToU(ST[i].p) - u) < (tol || 0.032)) return true;
    return false;
  }

  var dashes = [];
  sample(1.7, function (u) {
    [-2.6, 2.6].forEach(function (lat) {
      var q = pointAt(u, lat, 0.016);
      dashes.push({ x: q.x, y: q.y, z: q.z, sx: 0.16, sy: 0.03, sz: 0.9, yaw: yawAt(u) });
    });
  });
  instanced(G.box, M.warn, dashes);

  var beams = [], lamps = [];
  sample(MOBILE ? 7.5 : 5.5, function (u) {
    var q = pointAt(u, 0, 6.35), y = yawAt(u);
    beams.push({ x: q.x, y: q.y, z: q.z, sx: 0.26, sy: 0.32, sz: 13.4, yaw: y + Math.PI / 2 });
    var lp = pointAt(u, 0, 6.02);
    lamps.push({ x: lp.x, y: lp.y, z: lp.z, sx: 3.9, sy: 0.09, sz: 0.46, yaw: y });
  });
  instanced(G.box, M.dark, beams);
  instanced(G.box, M.lamp, lamps);

  var shaftGeo = new T.ConeGeometry(2.5, 5.4, 18, 1, true);
  var shaftMat = new T.MeshBasicMaterial({ color: 0xdff3c0, transparent: true, opacity: 0.03,
                                           blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  instanced(shaftGeo, shaftMat, lamps.map(function (l) {
    return { x: l.x, y: l.y - 2.72, z: l.z, sx: 1, sy: 1, sz: 1, yaw: l.yaw };
  }));

  var walls = [];
  sample(4.2, function (u) {
    [-12.5, 12.5].forEach(function (lat) {
      var q = pointAt(u, lat, 2.9);
      walls.push({ x: q.x, y: q.y, z: q.z, sx: 0.5, sy: 5.8, sz: 4.4, yaw: yawAt(u) });
    });
  });
  instanced(G.box, M.wall, walls);

  var posts = [], rails = [];
  sample(2.9, function (u) {
    [-4.5, 5.6].forEach(function (lat) {
      var q = pointAt(u, lat, 0.55), y = yawAt(u);
      posts.push({ x: q.x, y: q.y, z: q.z, sx: 0.09, sy: 1.1, sz: 0.09, yaw: y });
      var r1 = pointAt(u, lat, 1.05);
      rails.push({ x: r1.x, y: r1.y, z: r1.z, sx: 0.06, sy: 0.06, sz: 3.0, yaw: y });
      var r2 = pointAt(u, lat, 0.58);
      rails.push({ x: r2.x, y: r2.y, z: r2.z, sx: 0.05, sy: 0.05, sz: 3.0, yaw: y });
    });
  });
  instanced(G.box, M.yellow, posts);
  instanced(G.box, M.steelD, rails);

  var beltTop = [], beltSide = [], beltLegs = [], rollers = [];
  sample(2.2, function (u) {
    var q = pointAt(u, 3.95, 0.88), y = yawAt(u);
    beltTop.push({ x: q.x, y: q.y, z: q.z, sx: 1.45, sy: 0.09, sz: 2.3, yaw: y });
    [-0.78, 0.78].forEach(function (o) {
      var sq = pointAt(u, 3.95 + o, 0.79);
      beltSide.push({ x: sq.x, y: sq.y, z: sq.z, sx: 0.09, sy: 0.32, sz: 2.3, yaw: y });
    });
    var lq = pointAt(u, 3.95, 0.41);
    beltLegs.push({ x: lq.x, y: lq.y, z: lq.z, sx: 0.13, sy: 0.82, sz: 0.13, yaw: y });
  });
  sample(0.55, function (u) {
    var q = pointAt(u, 3.95, 0.95);
    rollers.push({ x: q.x, y: q.y, z: q.z, sx: 1.35, sy: 0.1, sz: 0.1, yaw: yawAt(u) + Math.PI / 2 });
  });
  instanced(G.box, M.black, beltTop);
  instanced(G.box, M.steelD, beltSide);
  instanced(G.box, M.dark, beltLegs);
  instanced(G.cyl8, M.steel, rollers);

  var cabinets = [], cabScreens = [], drums = [];
  var flip = 1;
  sample(MOBILE ? 13 : 9, function (u, i) {
    if (u < 0.02 || u > 0.97 || nearStation(u, 0.03)) return;
    flip *= -1;
    var lat = flip * (8.8 + Math.random() * 1.2), y = yawAt(u), hgt = 2.0 + Math.random() * 1.3;
    var q = pointAt(u, lat, hgt / 2);
    cabinets.push({ x: q.x, y: q.y, z: q.z, sx: 1.5 + Math.random(), sy: hgt, sz: 2.4,
                    yaw: y + (Math.random() - 0.5) * 0.18 });
    var sq = pointAt(u, lat - flip * 1.25, 1.6);
    cabScreens.push({ x: sq.x, y: sq.y, z: sq.z, sx: 0.5, sy: 0.34, sz: 0.05, yaw: y });
    if (i % 3 === 0) {
      var dq = pointAt(u, flip * 7.4, 0.45);
      drums.push({ x: dq.x, y: dq.y, z: dq.z, sx: 1.1, sy: 0.9, sz: 1.1, yaw: y });
    }
  });
  instanced(G.box, M.dark, cabinets);
  instanced(G.box, new T.MeshBasicMaterial({ color: 0x59d7a0 }), cabScreens);
  instanced(G.cyl8, M.orange, drums);

  function offsetCurve(lat, h) {
    var pts = [];
    for (var i = 0; i <= 90; i++) pts.push(pointAt(i / 90, lat, h));
    return new T.CatmullRomCurve3(pts, false, 'centripetal');
  }
  [{ lat: -5.6, h: 6.0, r: 0.13, c: 0x4a524b },
   { lat: -5.2, h: 5.75, r: 0.09, c: 0x7d4a1c },
   { lat: 5.6, h: 6.0, r: 0.13, c: 0x4a524b },
   { lat: 5.2, h: 5.75, r: 0.09, c: 0x27455f }].forEach(function (p) {
    var m = new T.Mesh(new T.TubeGeometry(offsetCurve(p.lat, p.h), MOBILE ? 120 : 220, p.r, 6, false),
      new T.MeshStandardMaterial({ color: p.c, roughness: 0.7, metalness: 0.45 }));
    m.frustumCulled = false;
    scene.add(m);
  });

  /* ==================================================================
     5. Piezas de puesto de trabajo
     ================================================================== */
  var arms = [], spinners = [], drivers = [], dispenserGrains = null;
  // materiales de rótulos, placas y fotos: se iluminan al llegar al puesto
  var glowMats = ST.map(function () { return []; });
  var glowT = ST.map(function () { return 0; });
  function regGlow(idx, mat) { if (glowMats[idx]) glowMats[idx].push(mat); }

  function robotArm(scale, color) {
    var mat = new T.MeshStandardMaterial({ color: color, roughness: 0.4, metalness: 0.48 });
    var g = new T.Group();
    var base = cyl(0.56, 0.3, M.dark); base.position.y = 0.15; g.add(base);
    var bolt = cyl(0.62, 0.06, M.steelD); bolt.position.y = 0.03; g.add(bolt);
    var turret = new T.Group(); turret.position.y = 0.3; g.add(turret);
    var hub = cyl(0.42, 0.5, mat); hub.position.y = 0.25; turret.add(hub);
    var shoulder = new T.Group(); shoulder.position.y = 0.55; turret.add(shoulder);
    var upper = box(0.32, 2.1, 0.32, mat); upper.position.y = 1.05; shoulder.add(upper);
    var sc = cyl(0.24, 0.44, M.steel); sc.rotation.z = Math.PI / 2; shoulder.add(sc);
    var elbow = new T.Group(); elbow.position.y = 2.1; shoulder.add(elbow);
    var ec = cyl(0.2, 0.4, M.steel); ec.rotation.z = Math.PI / 2; elbow.add(ec);
    var fore = box(0.26, 1.65, 0.26, mat); fore.position.y = 0.82; elbow.add(fore);
    var cable = cyl(0.05, 1.5, M.black); cable.position.set(0.2, 0.8, 0.14); elbow.add(cable);
    var wrist = new T.Group(); wrist.position.y = 1.65; elbow.add(wrist);
    var wc = cyl(0.16, 0.32, M.steel); wc.rotation.z = Math.PI / 2; wrist.add(wc);
    var tool = box(0.2, 0.3, 0.2, M.black); tool.position.y = 0.2; wrist.add(tool);
    [0.13, -0.13].forEach(function (o) {
      var fg = box(0.06, 0.34, 0.07, M.steel); fg.position.set(o, 0.5, 0); wrist.add(fg);
    });
    var tip = new T.Mesh(G.ico, M.glow); tip.scale.setScalar(0.11); tip.position.y = 0.66; wrist.add(tip);
    g.scale.setScalar(scale || 1);
    g.userData = { turret: turret, shoulder: shoulder, elbow: elbow, wrist: wrist, tip: tip,
                   phase: Math.random() * 6.28, speed: 0.5 + Math.random() * 0.5 };
    arms.push(g);
    return g;
  }

  function workbench(w, d) {
    var g = new T.Group();
    var top = box(w, 0.09, d, M.steelD); top.position.y = 0.92; g.add(top);
    var edge = box(w + 0.04, 0.05, d + 0.04, M.dark); edge.position.y = 0.86; g.add(edge);
    [[-w / 2 + 0.14, -d / 2 + 0.14], [w / 2 - 0.14, -d / 2 + 0.14],
     [-w / 2 + 0.14, d / 2 - 0.14], [w / 2 - 0.14, d / 2 - 0.14]].forEach(function (q) {
      var leg = box(0.1, 0.88, 0.1, M.steelD); leg.position.set(q[0], 0.44, q[1]); g.add(leg);
    });
    var drawer = box(w * 0.42, 0.6, d - 0.24, M.dark);
    drawer.position.set(-w * 0.24, 0.55, 0); g.add(drawer);
    for (var i = 0; i < 3; i++) {
      var h = box(w * 0.2, 0.03, 0.04, M.steel);
      h.position.set(-w * 0.24, 0.34 + i * 0.19, (d - 0.24) / 2 + 0.02); g.add(h);
    }
    var pegPanel = box(w * 0.92, 1.15, 0.06, M.peg);
    pegPanel.position.set(0, 1.62, -d / 2 + 0.06); g.add(pegPanel);
    [-1, 1].forEach(function (s) {
      var pst = box(0.07, 1.3, 0.07, M.steelD);
      pst.position.set(s * (w * 0.46), 1.55, -d / 2 + 0.06); g.add(pst);
    });
    return g;
  }

  /* valla de célula robotizada: cerrada por detrás y por los lados,
     abierta hacia el pasillo para que se vea el puesto */
  function safetyFence(w, d) {
    var g = new T.Group();
    [{ x: 0, z: -d / 2, len: w, rot: 0 },
     { x: -w / 2, z: 0, len: d, rot: Math.PI / 2 },
     { x: w / 2, z: 0, len: d, rot: Math.PI / 2 }].forEach(function (s) {
      var mesh = panel(s.len, 1.85, M.fence);
      mesh.position.set(s.x, 0.95, s.z); mesh.rotation.y = s.rot; g.add(mesh);
      var top = box(s.rot ? 0.07 : s.len, 0.07, s.rot ? s.len : 0.07, M.yellow);
      top.position.set(s.x, 1.88, s.z); g.add(top);
      var n = Math.max(2, Math.round(s.len / 1.7));
      for (var k = 0; k <= n; k++) {
        var off = -s.len / 2 + (s.len / n) * k;
        var post = box(0.1, 1.95, 0.1, M.yellow);
        post.position.set(s.x + (s.rot ? 0 : off), 0.98, s.z + (s.rot ? off : 0));
        g.add(post);
      }
    });
    return g;
  }

  function controlCabinet(lines, accent) {
    var g = new T.Group();
    var bodyM = box(1.0, 1.95, 0.62, M.dark); bodyM.position.y = 0.98; g.add(bodyM);
    var door = box(0.92, 1.5, 0.04, M.steelD); door.position.set(0, 1.1, 0.32); g.add(door);
    var scr = panel(0.62, 0.44, new T.MeshBasicMaterial({ map: screenTexture(lines, accent) }));
    scr.position.set(0, 1.44, 0.35); g.add(scr);
    [[-0.24, 0xc0392b], [0, 0x2f9e44], [0.24, 0xd8bb3c]].forEach(function (b) {
      var btn = cyl(0.06, 0.05, new T.MeshBasicMaterial({ color: b[1] }), true);
      btn.rotation.x = Math.PI / 2; btn.position.set(b[0], 0.72, 0.35); g.add(btn);
    });
    var lamp = new T.Mesh(G.ico, M.glow); lamp.scale.setScalar(0.07);
    lamp.position.set(0.36, 1.86, 0.28); g.add(lamp);
    var vent = box(0.5, 0.22, 0.03, M.black); vent.position.set(0, 0.42, 0.33); g.add(vent);
    return g;
  }

  function toolTrolley() {
    var g = new T.Group();
    var b = box(0.9, 0.85, 0.55, M.orange); b.position.y = 0.6; g.add(b);
    for (var i = 0; i < 3; i++) {
      var dw = box(0.84, 0.04, 0.03, M.steel); dw.position.set(0, 0.36 + i * 0.22, 0.28); g.add(dw);
    }
    var top = box(0.96, 0.05, 0.6, M.steelD); top.position.y = 1.05; g.add(top);
    [[-0.36, -0.22], [0.36, -0.22], [-0.36, 0.22], [0.36, 0.22]].forEach(function (q) {
      var wl = cyl(0.09, 0.06, M.black, true);
      wl.rotation.z = Math.PI / 2; wl.position.set(q[0], 0.09, q[1]); g.add(wl);
    });
    return g;
  }

  function partsBin(hex) {
    var g = new T.Group();
    var b = box(0.42, 0.2, 0.3, lego(hex)); b.position.y = 0.1; g.add(b);
    var lip = box(0.44, 0.03, 0.32, lego(hex)); lip.position.y = 0.2; g.add(lip);
    return g;
  }

  /* ---------- robot LEGO ---------- */
  function legoRobot(kind) {
    var g = new T.Group();
    var grey = lego(0x8d938c), red = lego(0xc0392b), yellow = lego(0xe6b022),
        blue = lego(0x2f6fb5), black = lego(0x1a1d1a), lime = lego(0x7ab648);
    var studGeo = new T.CylinderGeometry(0.055, 0.055, 0.035, 8);
    function brick(w, d, h, mat, x, y, z) {
      var b = box(w, h, d, mat); b.position.set(x, y + h / 2, z); g.add(b);
      var nx = Math.max(1, Math.round(w / 0.16)), nz = Math.max(1, Math.round(d / 0.16));
      var studs = new T.InstancedMesh(studGeo, mat, nx * nz), k = 0, mm = new T.Matrix4();
      for (var i = 0; i < nx; i++) for (var j = 0; j < nz; j++) {
        mm.makeTranslation(x - w / 2 + 0.08 + i * 0.16, y + h + 0.017, z - d / 2 + 0.08 + j * 0.16);
        studs.setMatrixAt(k++, mm);
      }
      studs.instanceMatrix.needsUpdate = true;
      g.add(studs);
    }
    brick(1.5, 0.85, 0.16, grey, 0, 0.22, 0);
    brick(0.62, 0.55, 0.34, grey, -0.1, 0.38, 0);
    var face = panel(0.42, 0.26, new T.MeshBasicMaterial({ color: 0x9fe86a }));
    face.position.set(-0.1, 0.6, 0.283); g.add(face);
    brick(0.34, 0.5, 0.16, kind === 'farm' ? lime : red, 0.5, 0.38, 0);
    brick(0.3, 0.3, 0.16, kind === 'farm' ? yellow : blue, -0.55, 0.38, 0.2);
    brick(0.3, 0.3, 0.16, kind === 'farm' ? blue : yellow, -0.55, 0.38, -0.2);
    var wheelGeo = new T.CylinderGeometry(0.27, 0.27, 0.17, 16);
    var hubGeo = new T.CylinderGeometry(0.14, 0.14, 0.19, 12);
    var wheels = [];
    [[0.48, 0.47], [0.48, -0.47], [-0.5, 0.47], [-0.5, -0.47]].forEach(function (w) {
      var wh = new T.Mesh(wheelGeo, black);
      wh.rotation.x = Math.PI / 2; wh.position.set(w[0], 0.27, w[1]); g.add(wh); wheels.push(wh);
      var hb = new T.Mesh(hubGeo, yellow);
      hb.rotation.x = Math.PI / 2; hb.position.set(w[0], 0.27, w[1]); g.add(hb);
    });
    var sarm = box(0.12, 0.12, 0.42, grey); sarm.position.set(0.82, 0.42, 0); g.add(sarm);
    var sens = box(0.2, 0.2, 0.14, black); sens.position.set(1.0, 0.42, 0); g.add(sens);
    [0.06, -0.06].forEach(function (z) {
      var eye = cyl(0.055, 0.03, new T.MeshBasicMaterial({ color: 0x63d6ff }));
      eye.rotation.z = Math.PI / 2; eye.position.set(1.07, 0.46, z); g.add(eye);
    });
    if (kind === 'farm') {
      var mast = box(0.1, 0.7, 0.1, yellow); mast.position.set(-0.3, 0.75, 0); g.add(mast);
      var jib = box(0.62, 0.09, 0.09, yellow); jib.position.set(0.02, 1.06, 0); g.add(jib);
      var claw = box(0.14, 0.22, 0.14, red); claw.position.set(0.3, 0.92, 0); g.add(claw);
    }
    g.userData.wheels = wheels;
    return g;
  }

  /* ---------- vehículo ACME (WRO Future Engineers) ----------
     Reconstruido desde las fotos del repositorio: chasis impreso verde,
     cubierta calada FE/ACME/23, alerón trasero, PCB delantera y trasera
     con tiras de pines, dos ultrasonidos y cámara al frente.
     El frente del modelo es +X.                                        */
  function acmeRobot() {
    var g = new T.Group();
    var chassis = box(1.85, 0.06, 0.9, M.acme); chassis.position.y = 0.24; g.add(chassis);

    var pcbF = box(0.34, 0.03, 1.28, M.pcb); pcbF.position.set(0.86, 0.3, 0); g.add(pcbF);
    var pcbR = box(0.34, 0.03, 1.18, M.pcb); pcbR.position.set(-0.82, 0.3, 0); g.add(pcbR);
    [[0.86, 0.58], [0.86, -0.58], [-0.82, 0.53], [-0.82, -0.53]].forEach(function (q) {
      var hdr = box(0.24, 0.06, 0.16, M.black); hdr.position.set(q[0], 0.34, q[1]); g.add(hdr);
    });
    for (var i = 0; i < 10; i++) {
      var chip = box(0.05 + Math.random() * 0.07, 0.03, 0.05 + Math.random() * 0.06, M.black);
      chip.position.set(-0.95 + Math.random() * 1.9, 0.33, -0.32 + Math.random() * 0.64);
      g.add(chip);
    }

    var bodyBox = box(0.95, 0.26, 0.64, M.acme); bodyBox.position.y = 0.42; g.add(bodyBox);
    var batt = box(0.5, 0.14, 0.4, new T.MeshStandardMaterial({ color: 0x2b2f5c, roughness: 0.5 }));
    batt.position.set(-0.12, 0.16, 0); g.add(batt);

    var deck = new T.Mesh(G.box, M.acmeD);
    deck.scale.set(1.0, 0.045, 0.84); deck.position.set(0.06, 0.58, 0); g.add(deck);
    var deckNose = box(0.46, 0.045, 0.44, M.acme); deckNose.position.set(0.7, 0.58, 0); g.add(deckNose);
    var deckSpine = box(0.5, 0.045, 0.3, M.acme); deckSpine.position.set(-0.5, 0.6, 0); g.add(deckSpine);
    var wing = box(0.3, 0.05, 1.06, M.acme); wing.position.set(-0.82, 0.62, 0); g.add(wing);
    var wingLeg = box(0.1, 0.16, 0.44, M.acme); wingLeg.position.set(-0.66, 0.53, 0); g.add(wingLeg);

    var bracket = box(0.2, 0.2, 0.6, M.black); bracket.position.set(0.72, 0.42, 0); g.add(bracket);
    [-0.2, 0.2].forEach(function (z) {
      var ring = cyl(0.115, 0.075, M.white);
      ring.rotation.set(0, 0, Math.PI / 2); ring.position.set(0.94, 0.42, z); g.add(ring);
      var grid = cyl(0.088, 0.08, M.black);
      grid.rotation.set(0, 0, Math.PI / 2); grid.position.set(0.965, 0.42, z); g.add(grid);
    });
    var cap = cyl(0.09, 0.2, new T.MeshStandardMaterial({ color: 0x1b3a1b, roughness: 0.4 }));
    cap.position.set(0.36, 0.52, 0.14); g.add(cap);

    var mast = box(0.09, 0.34, 0.13, M.black); mast.position.set(0.5, 0.76, 0); g.add(mast);
    var camBody = box(0.14, 0.16, 0.24, M.black); camBody.position.set(0.53, 0.99, 0); g.add(camBody);
    var lens = cyl(0.055, 0.08, new T.MeshStandardMaterial({ color: 0x0a1a2a, roughness: 0.14, metalness: 0.65 }));
    lens.rotation.set(0, 0, Math.PI / 2); lens.position.set(0.62, 0.99, 0); g.add(lens);
    var led = new T.Mesh(G.ico, new T.MeshBasicMaterial({ color: 0xff4b4b }));
    led.scale.setScalar(0.035); led.position.set(0.53, 1.08, 0.08); g.add(led);

    var wheelGeo = new T.CylinderGeometry(0.24, 0.24, 0.21, 22);
    var rimGeo = new T.CylinderGeometry(0.1, 0.1, 0.23, 14);
    var wheels = [], steer = [];
    [[0.62, 0.52, 1], [0.62, -0.52, 1], [-0.6, 0.52, 0], [-0.6, -0.52, 0]].forEach(function (w) {
      var hub = new T.Group(); hub.position.set(w[0], 0.24, w[1]); g.add(hub);
      var wh = new T.Mesh(wheelGeo, M.rubber); wh.rotation.x = Math.PI / 2; hub.add(wh); wheels.push(wh);
      var rim = new T.Mesh(rimGeo, M.dark); rim.rotation.x = Math.PI / 2; hub.add(rim);
      if (w[2]) steer.push(hub);
    });
    var motor = cyl(0.11, 0.5, M.dark); motor.rotation.set(Math.PI / 2, 0, 0);
    motor.position.set(-0.6, 0.24, 0); g.add(motor);

    g.userData.wheels = wheels;
    g.userData.steer = steer;
    g.userData.led = led;
    return g;
  }

  /* ---------- dispensador del TFG ----------
     Bastidor de perfil de aluminio, tolva PETG extraíble con cierres
     rápidos, cuerpo esférico con válvula rotativa de cuatro palas
     flexibles movida por motor DC, sensor óptico con ventana
     inclinada 7,5° y trampa de luz enfrente.                          */
  function dispenserRig() {
    var g = new T.Group();

    [[-0.62, -0.4], [0.62, -0.4], [-0.62, 0.4], [0.62, 0.4]].forEach(function (q) {
      var col = box(0.09, 2.5, 0.09, M.extr); col.position.set(q[0], 1.25, q[1]); g.add(col);
    });
    [0.12, 1.28, 2.46].forEach(function (h) {
      var a1 = box(1.33, 0.09, 0.09, M.extr); a1.position.set(0, h, -0.4); g.add(a1);
      var a2 = box(1.33, 0.09, 0.09, M.extr); a2.position.set(0, h, 0.4); g.add(a2);
      var a3 = box(0.09, 0.09, 0.89, M.extr); a3.position.set(-0.62, h, 0); g.add(a3);
      var a4 = box(0.09, 0.09, 0.89, M.extr); a4.position.set(0.62, h, 0); g.add(a4);
    });

    var hopper = new T.Mesh(new T.CylinderGeometry(0.2, 0.56, 0.72, 28, 1, true), M.petg);
    hopper.position.y = 1.86; g.add(hopper);
    var rim = new T.Mesh(new T.TorusGeometry(0.56, 0.03, 6, 28), M.petg);
    rim.rotation.x = Math.PI / 2; rim.position.y = 2.22; g.add(rim);
    var neck = cyl(0.2, 0.16, M.petg); neck.position.y = 1.44; g.add(neck);

    var housing = ball(0.29, M.petg); housing.position.y = 1.24; g.add(housing);
    var oring = new T.Mesh(new T.TorusGeometry(0.29, 0.022, 6, 26), M.black);
    oring.rotation.x = Math.PI / 2; oring.position.y = 1.24; g.add(oring);

    var rotor = new T.Group(); rotor.position.y = 1.24; g.add(rotor);
    var core = cyl(0.075, 0.36, M.petg); core.rotation.z = Math.PI / 2; rotor.add(core);
    for (var v = 0; v < 4; v++) {
      var vane = panel(0.34, 0.21, M.flex);
      vane.rotation.set(0, Math.PI / 2, v * Math.PI / 2);
      vane.position.set(0, Math.sin(v * Math.PI / 2) * 0.115, Math.cos(v * Math.PI / 2) * 0.115);
      rotor.add(vane);
    }
    spinners.push({ obj: rotor, speed: 1.6, axis: 'x' });

    [-1, 1].forEach(function (s) {
      var cb = box(0.07, 0.14, 0.05, M.steel); cb.position.set(s * 0.3, 1.36, 0.18); g.add(cb);
      var lever = box(0.05, 0.2, 0.04, M.steel);
      lever.position.set(s * 0.3, 1.5, 0.2); lever.rotation.x = 0.35; g.add(lever);
    });

    var bracket = box(0.06, 0.5, 0.42, M.blueAn); bracket.position.set(0.62, 1.24, 0); g.add(bracket);
    var motorBody = cyl(0.11, 0.4, M.black); motorBody.rotation.z = Math.PI / 2;
    motorBody.position.set(0.92, 1.24, 0); g.add(motorBody);
    var motorBand = cyl(0.115, 0.09, M.white); motorBand.rotation.z = Math.PI / 2;
    motorBand.position.set(0.86, 1.24, 0); g.add(motorBand);
    var gearbox = cyl(0.09, 0.14, M.steelD); gearbox.rotation.z = Math.PI / 2;
    gearbox.position.set(0.7, 1.24, 0); g.add(gearbox);
    var shaft = cyl(0.025, 0.28, M.steel); shaft.rotation.z = Math.PI / 2;
    shaft.position.set(0.48, 1.24, 0); g.add(shaft);
    var coupling = cyl(0.06, 0.11, M.black); coupling.rotation.z = Math.PI / 2;
    coupling.position.set(0.4, 1.24, 0); g.add(coupling);

    var outlet = new T.Mesh(new T.CylinderGeometry(0.11, 0.24, 0.34, 22, 1, true), M.petg);
    outlet.position.y = 0.94; g.add(outlet);
    var win = box(0.015, 0.16, 0.14, new T.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.5 }));
    win.position.set(0.19, 1.0, 0); win.rotation.z = 7.5 * Math.PI / 180; g.add(win);
    var sensor = box(0.07, 0.11, 0.16, M.pcb); sensor.position.set(0.29, 1.0, 0); g.add(sensor);
    var trap = box(0.05, 0.2, 0.18, M.black); trap.position.set(-0.19, 1.0, 0); g.add(trap);
    var beamM = box(0.42, 0.008, 0.008, new T.MeshBasicMaterial({ color: 0xff8b5a, transparent: true, opacity: 0.7 }));
    beamM.position.set(0.04, 1.0, 0); g.add(beamM);

    var elec = box(0.72, 0.22, 0.46, M.black); elec.position.set(0, 0.34, 0); g.add(elec);
    var scalePlate = box(0.6, 0.07, 0.5, M.steelD); scalePlate.position.set(0, 0.5, 0); g.add(scalePlate);
    var jar = new T.Mesh(new T.CylinderGeometry(0.17, 0.14, 0.3, 20, 1, true),
      new T.MeshStandardMaterial({ color: 0xcfd8cb, roughness: 0.25, metalness: 0.05,
                                   transparent: true, opacity: 0.42, side: T.DoubleSide }));
    jar.position.set(0, 0.68, 0); g.add(jar);
    var fillM = cyl(0.145, 0.12, new T.MeshStandardMaterial({ color: 0xd9b464, roughness: 0.9 }));
    fillM.position.set(0, 0.6, 0); g.add(fillM);

    var grains = new T.InstancedMesh(new T.IcosahedronGeometry(0.026, 0),
      new T.MeshStandardMaterial({ color: 0xd9b464, roughness: 0.9 }), 40);
    grains.frustumCulled = false;
    grains.userData.seed = [];
    for (var k = 0; k < 40; k++) {
      grains.userData.seed.push({ t: Math.random(), dx: (Math.random() - 0.5) * 0.09,
                                  dz: (Math.random() - 0.5) * 0.09 });
    }
    g.add(grains);
    g.userData.grains = grains;
    return g;
  }

  /* despiece de la válvula rotativa, junto al banco */
  function valveExploded() {
    var g = new T.Group();
    var stand = box(0.72, 0.06, 0.52, M.steelD); stand.position.y = 0.03; g.add(stand);
    var post = box(0.05, 0.6, 0.05, M.steelD); post.position.set(0, 0.3, -0.2); g.add(post);
    var half = new T.Mesh(new T.SphereGeometry(0.2, 20, 14, 0, Math.PI), M.petg);
    half.rotation.y = -Math.PI / 2; half.position.set(-0.24, 0.42, 0); g.add(half);
    var core = cyl(0.055, 0.24, M.petg); core.rotation.z = Math.PI / 2;
    core.position.set(0.02, 0.42, 0); g.add(core);
    var spin = new T.Group(); spin.position.set(0.02, 0.42, 0); g.add(spin);
    for (var v = 0; v < 4; v++) {
      var vane = panel(0.22, 0.15, M.flex);
      vane.rotation.set(0, Math.PI / 2, v * Math.PI / 2);
      vane.position.set(0, Math.sin(v * Math.PI / 2) * 0.08, Math.cos(v * Math.PI / 2) * 0.08);
      spin.add(vane);
    }
    spinners.push({ obj: spin, speed: 0.8, axis: 'x' });
    var gear = cyl(0.11, 0.04, M.steel); gear.rotation.z = Math.PI / 2;
    gear.position.set(0.26, 0.42, 0); g.add(gear);
    var lbl = panel(0.68, 0.17, new T.MeshBasicMaterial({ map: signTexture('4 FLEX 93A BLADES', '') }));
    lbl.position.set(0, 0.14, 0.27); lbl.rotation.x = -0.5; g.add(lbl);
    return g;
  }

  /* ==================================================================
     6. Celdas de estación
     ================================================================== */
  function cell(idx, opts) {
    opts = opts || {};
    var st = ST[idx], u = pToU(st.p), side = st.side || 1;
    var lat = side * (opts.lat || 7.4);
    var w = opts.w || 7.2, d = opts.d || 6.4;
    var g = new T.Group();

    var plat = box(w, 0.34, d, M.concrete);
    place(plat, u, lat, 0.17, 'in'); g.add(plat);
    var edge = box(w + 0.22, 0.14, d + 0.22, M.hazard);
    place(edge, u, lat, 0.31, 'in'); g.add(edge);

    var sign = panel(4.4, 1.1, new T.MeshBasicMaterial({
      map: signTexture(opts.signTitle || '', opts.signSub || '', opts.accent) }));
    place(sign, u - 0.012, 0, 4.5, 'back'); g.add(sign);
    regGlow(idx, sign.material);
    [-1.9, 1.9].forEach(function (o) {
      var hang = box(0.05, 1.6, 0.05, M.steelD);
      place(hang, u - 0.012, o, 5.6, 'along'); g.add(hang);
    });

    if (opts.decal) {
      var pl = lat - side * (w / 2 - 0.3);
      var plateBack = box(1.5, 0.86, 0.08, M.dark);
      place(plateBack, u - 0.007, pl, 0.86, 'back'); g.add(plateBack);
      var dnum = panel(1.34, 0.72, new T.MeshBasicMaterial({
        map: decalTexture(opts.decal), transparent: true, depthWrite: false }));
      place(dnum, u - 0.007, pl, 0.86, 'back'); dnum.translateZ(0.05); g.add(dnum);
      regGlow(idx, dnum.material);
      var leg = box(0.1, 0.86, 0.1, M.steelD);
      place(leg, u - 0.007, pl, 0.43, 'along'); g.add(leg);
    }

    var spot = box(2.6, 0.12, 0.7, M.lamp);
    place(spot, u, lat * 0.66, 5.5, 'in'); g.add(spot);
    var beamCone = new T.Mesh(shaftGeo, shaftMat);
    beamCone.position.copy(pointAt(u, lat * 0.66, 2.8));
    beamCone.scale.set(1.5, 1.05, 1.5); g.add(beamCone);

    scene.add(g);
    return { group: g, u: u, lat: lat, side: side, w: w, d: d, idx: idx };
  }

  // coordenadas locales de la celda: along = a lo largo del pasillo,
  // across = hacia el fondo del puesto
  function inCell(c, obj, along, across, height, faceIn, extraYaw) {
    place(obj, c.u + along / LEN, c.lat + c.side * across, height,
          faceIn === false ? 'along' : 'in', extraYaw);
    scene.add(obj);
    return obj;
  }

  function photoPanel(c, file, w, h, along, height) {
    var grp = new T.Group();
    var frm = box(w + 0.16, h + 0.16, 0.08, M.dark); frm.position.z = -0.05; grp.add(frm);
    var picMat = new T.MeshBasicMaterial({ map: photo(file) });
    grp.add(panel(w, h, picMat));
    regGlow(c.idx, picMat);
    var lip = box(w + 0.16, 0.05, 0.14, M.glow);
    lip.position.set(0, -(h / 2) - 0.11, 0.02); grp.add(lip);
    inCell(c, grp, along, c.d / 2 - 0.3, height);
    grp.rotateX(0.07);
    [-0.5, 0.5].forEach(function (o) {
      var post = box(0.09, height - h / 2, 0.09, M.steelD);
      inCell(c, post, along + o, c.d / 2 - 0.3, (height - h / 2) / 2, false);
    });
    return grp;
  }

  var gateLampMat = new T.MeshBasicMaterial({ color: 0x1a2416 });

  /* ---------- 00 · portal de entrada ---------- */
  (function () {
    var u = 0.052;
    [-5.3, 5.3].forEach(function (lat) {
      var col = box(1.1, 6.2, 1.1, M.dark); place(col, u, lat, 3.1, 'along'); scene.add(col);
      var stripe = box(1.18, 0.6, 1.18, M.hazard); place(stripe, u, lat, 0.42, 'along'); scene.add(stripe);
      var lamp = new T.Mesh(G.ico, gateLampMat); lamp.scale.setScalar(0.2);
      lamp.position.copy(pointAt(u, lat, 5.4)); scene.add(lamp);
    });
    var lintel = box(12, 1.3, 0.9, M.dark); place(lintel, u, 0, 6.45, 'along'); scene.add(lintel);
    var gateSign = panel(7.4, 1.5, new T.MeshBasicMaterial({
      map: signTexture('ÁLVARO HERNÁNDEZ', 'PRODUCTION LINE · MECHATRONICS') }));
    place(gateSign, u - 0.004, 0, 4.95, 'back'); scene.add(gateSign);

    var arrowMat = new T.MeshBasicMaterial({
      map: decalTexture('▼', 'rgba(208,233,139,.3)'), transparent: true, depthWrite: false });
    for (var k = 0; k < 6; k++) {
      var uu = 0.012 + k * 0.007;
      var ag = new T.Group();
      ag.position.copy(pointAt(uu, 0, 0.022)); ag.rotation.y = yawAt(uu);
      var ar = panel(1.4, 1.4, arrowMat); ar.rotation.set(-Math.PI / 2, 0, 0);
      ag.add(ar); scene.add(ag);
    }
  })();

  /* ---------- 01 · sala de control ---------- */
  (function () {
    var c = cell(1, { signTitle: 'CONTROL ROOM', signSub: 'ST. 01 · ACADEMIC RECORD', decal: '01' });

    inCell(c, box(4.6, 0.12, 1.2, M.steelD), 0, 0, 1.0);
    inCell(c, box(4.5, 0.68, 0.08, M.dark), 0, -0.55, 0.6);
    [-2.1, 2.1].forEach(function (o) { inCell(c, box(0.1, 0.9, 1.0, M.steelD), o, 0, 0.45); });
    inCell(c, box(0.9, 0.03, 0.3, M.black), -0.5, -0.3, 1.08);
    inCell(c, cyl(0.06, 0.14, M.white, true), 0.9, -0.3, 1.13);

    var chair = new T.Group();
    var seat = box(0.5, 0.08, 0.5, M.black); seat.position.y = 0.5; chair.add(seat);
    var backr = box(0.5, 0.55, 0.08, M.black); backr.position.set(0, 0.8, -0.24); chair.add(backr);
    var stem = cyl(0.05, 0.45, M.steelD); stem.position.y = 0.24; chair.add(stem);
    var foot = cyl(0.3, 0.05, M.dark); foot.position.y = 0.03; chair.add(foot);
    inCell(c, chair, -0.2, -1.5, 0.34);

    [[-1.55, '8.56 / 10', 'DEGREE AVERAGE', 'MECHATRONICS ENGINEERING', 'UNIVERSITAT DE VIC · 2022–2026', null],
     [0, '11', 'COURSE HONOURS', 'CONSISTENT ACHIEVEMENT', 'ACADEMIC RECORD', '#ffb54d'],
     [1.55, '9.5 / 10', 'FINAL-YEAR PROJECT', 'AUTOMATIC DISPENSER', 'AWAYTER · 2025–2026', null]
    ].forEach(function (s) {
      var grp = new T.Group();
      grp.add(box(1.42, 0.98, 0.07, M.dark));
      var scr = panel(1.3, 0.86, new T.MeshBasicMaterial({
        map: screenTexture([{ big: s[1], small: s[2], rule: 1 }, { small: s[3] }, { small: s[4] }], s[5]) }));
      scr.position.z = 0.04; grp.add(scr);
      inCell(c, grp, s[0], 1.05, 2.0);
      grp.rotateX(-0.12);
      inCell(c, box(0.06, 0.95, 0.06, M.steelD), s[0], 1.05, 1.05, false);
    });

    inCell(c, controlCabinet([{ big: 'LINE A', small: 'STATUS: RUNNING', rule: 1 },
                              { small: 'ORIGIN · IBIZA 2016' }]), 3.2, 0.5, 0.34);
    inCell(c, robotArm(0.85, 0xb9c2b7), 2.9, -1.4, 0.34);
  })();

  /* ---------- 02 · Ibiza 2016 · banco de montaje ---------- */
  (function () {
    var c = cell(2, { signTitle: 'IBIZA · 2016', signSub: 'ST. 02 · EDUCATIONAL ROBOTICS CLUB', decal: '02' });

    inCell(c, workbench(4.4, 1.6), 0, 0.9, 0.34);

    var bot = legoRobot('classic'); bot.scale.setScalar(1.1);
    inCell(c, bot, 0.2, 0.9, 1.35, true, -0.5);
    spinners.push({ obj: bot, speed: 0.1, base: bot.rotation.y });

    var colors = [0xc0392b, 0xe6b022, 0x2f6fb5, 0x7ab648, 0xd9ddd4, 0x1a1d1a];
    colors.forEach(function (hex, i) {
      var ax = -1.9 + (i % 3) * 0.5, ac = 0.55 + (i < 3 ? 0 : 0.62);
      inCell(c, partsBin(hex), ax, ac, 1.35);
      for (var j = 0; j < 4; j++) {
        inCell(c, box(0.1, 0.07, 0.15, lego(hex)),
               ax + (Math.random() - 0.5) * 0.3, ac + (Math.random() - 0.5) * 0.2, 1.44,
               true, Math.random() * 3);
      }
    });
    inCell(c, box(0.42, 0.005, 0.3, M.white), 1.5, 0.7, 1.37);

    var stool = new T.Group();
    var st1 = cyl(0.19, 0.06, M.orange); st1.position.y = 0.62; stool.add(st1);
    var st2 = cyl(0.05, 0.6, M.steelD); st2.position.y = 0.3; stool.add(st2);
    var st3 = cyl(0.24, 0.04, M.dark); st3.position.y = 0.02; stool.add(st3);
    inCell(c, stool, 0.3, -0.6, 0.34);

    var shelf = new T.Group();
    [0.4, 0.95, 1.5].forEach(function (h) {
      var sh = box(2.2, 0.06, 0.5, M.steelD); sh.position.y = h; shelf.add(sh);
    });
    [[-1.05, -0.2], [1.05, -0.2], [-1.05, 0.2], [1.05, 0.2]].forEach(function (q) {
      var p2 = box(0.07, 1.8, 0.07, M.steelD); p2.position.set(q[0], 0.9, q[1]); shelf.add(p2);
    });
    for (var k = 0; k < 9; k++) {
      var b2 = box(0.34, 0.2, 0.4, lego(colors[k % 6]));
      b2.position.set(-0.8 + (k % 3) * 0.8, 0.5 + Math.floor(k / 3) * 0.55, 0); shelf.add(b2);
    }
    inCell(c, shelf, -2.4, 2.3, 0.34);

    inCell(c, robotArm(0.8, 0xe6b022), 2.6, 0.7, 0.34);
  })();

  /* ---------- 03 · Tailandia 2018 · mesa de competición ---------- */
  (function () {
    var c = cell(3, { signTitle: 'THAILAND · 2018', signSub: 'ST. 03 · WRO REGULAR JUNIOR · 23RD WORLDWIDE',
                      decal: '03' });

    inCell(c, box(4.8, 0.12, 3.6, M.white), 0, 0.2, 0.72);
    [[-2.2, -1.5], [2.2, -1.5], [-2.2, 1.5], [2.2, 1.5]].forEach(function (q) {
      inCell(c, box(0.1, 0.66, 0.1, M.steelD), q[0], 0.2 + q[1], 0.33);
    });
    inCell(c, box(4.5, 0.03, 3.3, M.line), 0, 0.2, 0.775);
    inCell(c, box(4.4, 0.02, 3.2, new T.MeshStandardMaterial({ color: 0x17210f, roughness: 0.95 })),
           0, 0.2, 0.79);

    var crop = lego(0x4f8f35), soil = new T.MeshStandardMaterial({ color: 0x3a2b1c, roughness: 1 });
    for (var r = 0; r < 4; r++) {
      inCell(c, box(3.4, 0.09, 0.2, soil), 0, -0.85 + r * 0.7, 0.85);
      for (var k = 0; k < 7; k++) {
        inCell(c, box(0.12, 0.22, 0.12, crop), -1.4 + k * 0.47, -0.85 + r * 0.7, 0.96);
      }
    }

    var bot = legoRobot('farm');
    drivers.push({ obj: bot, cell: c, t: Math.random() * 6, radius: 1.1, ellipse: 1.45,
                   speed: 0.5, y: 0.81, across: 0.2 });
    scene.add(bot);

    var board = new T.Group();
    board.add(box(1.6, 1.1, 0.08, M.dark));
    var scr = panel(1.46, 0.96, new T.MeshBasicMaterial({
      map: screenTexture([{ big: '23RD', small: 'WORLD RANKING', rule: 1 },
                          { small: 'REGULAR JUNIOR CATEGORY' },
                          { small: 'AUTONOMOUS CROP MANAGEMENT' },
                          { small: 'INTERNATIONAL FINAL · THAILAND' }], '#ffb54d') }));
    scr.position.z = 0.05; board.add(scr);
    inCell(c, board, 1.0, 2.4, 2.3);
    inCell(c, box(0.09, 2.0, 0.09, M.steelD), 1.0, 2.4, 1.0, false);

    inCell(c, toolTrolley(), -2.6, 2.2, 0.34);
    inCell(c, robotArm(0.85, 0x8a9490), -2.8, -1.0, 0.34);
  })();

  /* ---------- 04 · WRO 2021 · vitrina Future Engineers ---------- */
  (function () {
    var c = cell(4, { signTitle: 'WRO 2021', signSub: 'ST. 04 · FUTURE ENGINEERS · 6TH WORLDWIDE',
                      decal: '04', w: 7.8, d: 6.8 });

    inCell(c, safetyFence(7.4, 6.4), 0, 0, 0.34);

    [[-1.5, 1.0, '5'], [0, 1.45, '6'], [1.5, 0.8, '7']].forEach(function (s, i) {
      var stepM = i === 1 ? new T.MeshStandardMaterial({ color: 0x3f5136, roughness: 0.55, metalness: 0.2 }) : M.dark;
      inCell(c, box(1.3, s[1], 1.3, stepM), s[0], 0.4, 0.34 + s[1] / 2);
      var num = panel(0.7, 0.7, new T.MeshBasicMaterial({
        map: decalTexture(s[2], i === 1 ? 'rgba(208,233,139,.95)' : 'rgba(160,175,155,.55)'),
        transparent: true, depthWrite: false }));
      inCell(c, num, s[0], -0.28, 0.34 + s[1] * 0.55);
    });

    var turn = new T.Group();
    inCell(c, turn, 0, 0.4, 0.34 + 1.45);
    turn.add(cyl(0.85, 0.08, M.steel));
    var bot = acmeRobot(); bot.scale.setScalar(0.6); bot.position.y = 0.04; turn.add(bot);
    spinners.push({ obj: turn, speed: 0.4, base: turn.rotation.y });

    var glass = new T.Mesh(new T.CylinderGeometry(0.95, 0.95, 1.15, 24, 1, true),
      new T.MeshStandardMaterial({ color: 0xcfe3d6, roughness: 0.06, metalness: 0.1,
                                   transparent: true, opacity: 0.12, side: T.DoubleSide }));
    inCell(c, glass, 0, 0.4, 2.4);
    inCell(c, cyl(0.98, 0.05, M.steelD), 0, 0.4, 2.99);

    photoPanel(c, 'robot-side.jpg', 3.0, 2.2, -1.75, 2.75);
    photoPanel(c, 'team.jpg', 1.45, 2.2, 1.95, 2.75);

    inCell(c, controlCabinet([{ big: '6TH', small: 'WORLD RANKING · WRO', rule: 1 },
                              { small: 'FUTURE ENGINEERS CATEGORY' },
                              { small: 'SELF-DRIVING ROBOT' }]), -3.3, -1.4, 0.34);
    inCell(c, robotArm(0.9, 0xd0e98b), 3.4, -0.4, 0.34);
    inCell(c, toolTrolley(), 2.9, -2.1, 0.34);
  })();

  /* ---------- 05 · Panamá 2023 · pista de pruebas ---------- */
  (function () {
    var c = cell(5, { signTitle: 'PANAMA · 2023', signSub: 'ST. 05 · ACME AUTONOMOUS VEHICLE',
                      decal: '05', w: 8.6, d: 7.6, lat: 8.4 });

    inCell(c, safetyFence(8.2, 7.2), 0, 0, 0.34);

    inCell(c, box(6.4, 0.05, 5.2, new T.MeshStandardMaterial({ color: 0x101410, roughness: 0.94 })), 0, 0, 0.37);
    inCell(c, box(2.4, 0.06, 1.9, new T.MeshStandardMaterial({ color: 0x1b211a, roughness: 0.94 })), 0, 0, 0.4);
    [2.6, -2.6].forEach(function (o) { inCell(c, box(6.4, 0.02, 0.09, M.line), 0, o, 0.41); });
    [3.2, -3.2].forEach(function (o) { inCell(c, box(0.09, 0.02, 5.2, M.line), o, 0, 0.41); });

    var redM = new T.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });
    var grnM = new T.MeshStandardMaterial({ color: 0x2f9e44, roughness: 0.5 });

    // side -1: el pivote queda por dentro del óvalo y el coche lo rodea por fuera.
    // side +1: el pivote queda por fuera y el coche pasa por dentro.
    var PILLARS = [
      { theta: 0.55, side: -1, mat: grnM },
      { theta: 2.15, side:  1, mat: redM },
      { theta: 3.65, side: -1, mat: grnM },
      { theta: 5.25, side:  1, mat: redM }
    ];
    var LAP = { radius: 1.8, ellipse: 1.4 };
    var lapX = LAP.ellipse * LAP.radius, lapZ = LAP.radius;
    PILLARS.forEach(function (q) {
      var k = q.side < 0 ? 0.64 : 1.42;
      q.along = lapX * k * Math.cos(q.theta);
      q.across = lapZ * k * Math.sin(q.theta);
      inCell(c, cyl(0.09, 0.42, q.mat, true), q.along, q.across, 0.61);
      inCell(c, cyl(0.13, 0.03, M.line, true), q.along, q.across, 0.42);
    });

    var bot = acmeRobot(); bot.scale.setScalar(0.7);
    drivers.push({ obj: bot, cell: c, t: 0, radius: LAP.radius, ellipse: LAP.ellipse,
                   speed: 0.8, y: 0.4, pillars: PILLARS });
    scene.add(bot);

    photoPanel(c, 'robot-camera.jpg', 2.5, 1.9, -2.35, 2.7);
    photoPanel(c, 'robot-top.jpg', 1.55, 2.05, 2.35, 2.75);

    var cart = new T.Group();
    var t1 = box(1.0, 0.06, 0.7, M.steelD); t1.position.y = 0.9; cart.add(t1);
    var t2 = box(1.0, 0.06, 0.7, M.steelD); t2.position.y = 0.45; cart.add(t2);
    [[-0.44, -0.3], [0.44, -0.3], [-0.44, 0.3], [0.44, 0.3]].forEach(function (q) {
      var p2 = box(0.06, 0.9, 0.06, M.steelD); p2.position.set(q[0], 0.45, q[1]); cart.add(p2);
    });
    var lapBase = box(0.44, 0.03, 0.3, M.dark); lapBase.position.set(0, 0.95, 0.05); cart.add(lapBase);
    var lapLid = new T.Group(); lapLid.position.set(0, 0.95, -0.1); cart.add(lapLid);
    var lidM = box(0.44, 0.3, 0.02, M.dark); lidM.position.y = 0.14; lapLid.add(lidM);
    var lapScr = panel(0.4, 0.26, new T.MeshBasicMaterial({
      map: screenTexture([{ small: '> ACME TELEMETRY' }, { small: 'PID  Kp 1.8  Ki 0.05' },
                          { small: 'US_L 42cm  US_R 39cm' }, { small: 'CAM  ROI ok' }]) }));
    lapScr.position.set(0, 0.14, 0.02); lapLid.add(lapScr);
    lapLid.rotation.x = -1.15;
    inCell(c, cart, -3.75, -1.9, 0.34);

    inCell(c, controlCabinet([{ big: 'C++', small: 'VEHICLE PROGRAMMING', rule: 1 },
                              { small: '3 × ATmega32U4 · BUS I2C' },
                              { small: 'ULTRASONIC · CAMERA · PID' },
                              { small: 'DISTRIBUTED ARCHITECTURE' }]), 3.85, 1.5, 0.34);
    inCell(c, robotArm(0.85, 0x27bd2c), -3.85, 1.3, 0.34);
    inCell(c, toolTrolley(), 3.8, -1.9, 0.34);
  })();

  /* ---------- 06 · Awayter / TFG · banco de dispensación ---------- */
  (function () {
    var c = cell(6, { signTitle: 'AWAYTER · FINAL PROJECT', signSub: 'ST. 06 · BULK FOOD DISPENSING',
                      decal: '06', w: 8.0, d: 6.8 });

    inCell(c, workbench(4.6, 1.7), -0.4, 1.0, 0.34);

    var rig = dispenserRig();
    inCell(c, rig, -0.6, 1.0, 1.35, true, 0.25);
    dispenserGrains = rig.userData.grains;

    inCell(c, valveExploded(), 0.9, 1.05, 1.35, true, -0.3);

    [[-2.0, 0xd9b464], [-1.66, 0xb8875a], [-1.32, 0xe0d3a8]].forEach(function (j) {
      var jar = cyl(0.11, 0.26, new T.MeshStandardMaterial({ color: 0xcfd8cb, roughness: 0.25,
                    transparent: true, opacity: 0.4 }));
      inCell(c, jar, j[0], 0.85, 1.48);
      inCell(c, cyl(0.095, 0.17, new T.MeshStandardMaterial({ color: j[1], roughness: 0.9 })),
             j[0], 0.85, 1.44);
    });

    photoPanel(c, 'prototipos.jpg', 3.3, 1.4, 2.15, 2.75);
    photoPanel(c, 'modular.jpg', 1.6, 1.4, -3.05, 2.75);

    inCell(c, controlCabinet([{ big: '9.5 / 10', small: 'FINAL-YEAR PROJECT', rule: 1 },
                              { small: 'ROTARY VALVE · 4 FLEX 93A BLADES' },
                              { small: 'REMOVABLE PETG HOPPER' },
                              { small: '7.5° OPTICAL WINDOW + LIGHT TRAP' }]), 3.7, 0.2, 0.34);
    inCell(c, toolTrolley(), 2.4, -2.0, 0.34);
    inCell(c, robotArm(0.9, 0x6b4fa8), -3.7, -1.2, 0.34);

    // impresora 3D: de aquí salen las piezas del prototipo
    var printer = new T.Group();
    var pb = box(0.86, 0.12, 0.8, M.dark); pb.position.y = 0.06; printer.add(pb);
    [[-0.4, -0.36], [0.4, -0.36], [-0.4, 0.36], [0.4, 0.36]].forEach(function (q) {
      var p2 = box(0.06, 0.9, 0.06, M.extr); p2.position.set(q[0], 0.5, q[1]); printer.add(p2);
    });
    var ptop = box(0.86, 0.06, 0.06, M.extr); ptop.position.set(0, 0.95, -0.36); printer.add(ptop);
    var gantry = box(0.9, 0.08, 0.08, M.extr); gantry.position.set(0, 0.55, 0); printer.add(gantry);
    var head = box(0.14, 0.16, 0.14, M.black); head.position.set(0.1, 0.5, 0); printer.add(head);
    var bed = box(0.6, 0.03, 0.6, new T.MeshStandardMaterial({ color: 0x2a2f34, roughness: 0.4 }));
    bed.position.y = 0.2; printer.add(bed);
    var printed = box(0.2, 0.12, 0.2, M.petg); printed.position.y = 0.27; printer.add(printed);
    var spool = cyl(0.16, 0.06, M.blueAn); spool.rotation.x = Math.PI / 2;
    spool.position.set(0, 0.95, -0.42); printer.add(spool);
    spinners.push({ obj: gantry, bob: 0.16, base0: 0.55, phase: 1.2 });
    inCell(c, printer, -3.05, 1.5, 0.34);
  })();

  /* ---------- 07 · capacidades, todo a un lado ---------- */
  (function () {
    var c = cell(7, { signTitle: 'SKILLS', signSub: 'ST. 07 · ONE INTEGRATED SYSTEM',
                      decal: '07', w: 9.0, d: 5.0, lat: 7.6 });
    [{ along: -2.9, icon: 'gear', label: 'MECHANICS\nCAD · 3D · TESTING' },
     { along: 0, icon: 'wave', label: 'ELECTRONICS\nSENSORS · CONTROL' },
     { along: 2.9, icon: 'code', label: 'PROGRAMMING\nC++ · PYTHON · ROS' }
    ].forEach(function (it, i) {
      inCell(c, cyl(0.55, 0.18, M.steelD), it.along, 0.2, 0.43);
      inCell(c, box(0.18, 1.0, 0.18, M.steelD), it.along, 0.2, 1.0, false);
      inCell(c, box(1.7, 3.2, 0.1, M.dark), it.along, 0.2, 3.0);
      var face = panel(1.52, 3.02, new T.MeshBasicMaterial({
        map: iconTexture(it.icon, it.label), transparent: true, side: T.DoubleSide }));
      inCell(c, face, it.along, 0.2, 3.0);
      face.translateZ(0.07);
      spinners.push({ obj: face, bob: 0.09, base0: face.position.y, phase: i * 2 });
      var halo = new T.Mesh(shaftGeo, shaftMat);
      halo.position.copy(face.position); halo.scale.set(0.75, 0.9, 0.75);
      scene.add(halo);
    });
  })();

  /* ---------- 08 · fin de línea ---------- */
  (function () {
    var u = pToU(ST[8].p);
    [-5.3, 5.3].forEach(function (lat) {
      var col = box(1.2, 6.4, 1.2, M.dark); place(col, u + 0.028, lat, 3.2, 'along'); scene.add(col);
      var strip = box(1.26, 4.4, 0.1, M.glow);
      place(strip, u + 0.028, lat + (lat > 0 ? -0.62 : 0.62), 3.0, 'along'); scene.add(strip);
      var base = box(1.28, 0.6, 1.28, M.hazard);
      place(base, u + 0.028, lat, 0.42, 'along'); scene.add(base);
    });
    var lintel = box(12, 1.3, 1.0, M.dark); place(lintel, u + 0.028, 0, 6.45, 'along'); scene.add(lintel);
    var endSign = panel(7.0, 1.4, new T.MeshBasicMaterial({
      map: signTexture('END OF THE LINE', 'ST. 08 · LET’S TALK') }));
    place(endSign, u + 0.024, 0, 4.9, 'back'); scene.add(endSign);

    [-1, 1].forEach(function (side) {
      var con = new T.Group();
      place(con, u + 0.004, side * 4.6, 0.34, 'in'); scene.add(con);
      var b = box(1.9, 1.0, 0.9, M.dark); b.position.y = 0.5; con.add(b);
      var deck = box(1.9, 0.1, 0.9, M.steelD); deck.position.y = 1.02; con.add(deck);
      var back = box(1.62, 1.12, 0.1, M.dark); back.position.set(0, 1.55, 0.06);
      back.rotation.x = -0.2; con.add(back);
      var scr = panel(1.5, 1.0, new T.MeshBasicMaterial({
        map: screenTexture([{ big: 'READY', small: 'SYSTEM READY', rule: 1 },
                            { small: 'BARCELONA · SPAIN' },
                            { small: 'alvaroibz2004@gmail.com' }]) }));
      scr.position.set(0, 1.55, 0.16); scr.rotation.x = -0.2; con.add(scr);
    });
    var plat = box(9, 0.3, 5, M.concrete); place(plat, u + 0.04, 0, 0.15, 'along'); scene.add(plat);
  })();

  /* brazos de acompañamiento entre estaciones */
  var af = 1;
  sample(MOBILE ? 20 : 11, function (u) {
    if (u < 0.05 || u > 0.95 || nearStation(u, 0.03)) return;
    af *= -1;
    var a = robotArm(0.8, af > 0 ? 0xd9741d : 0x8a9490);
    place(a, u, af * 6.9, 0.35, 'in'); scene.add(a);
    var ped = box(1.5, 0.35, 1.5, M.dark); place(ped, u, af * 6.9, 0.17, 'along'); scene.add(ped);
    var haz = box(1.6, 0.1, 1.6, M.hazard); place(haz, u, af * 6.9, 0.33, 'along'); scene.add(haz);
  });

  /* cajas de la cinta */
  var crateMats = [
    new T.MeshStandardMaterial({ map: crateMap('#8a6a42', 'LOT A-12'), roughness: 0.9 }),
    new T.MeshStandardMaterial({ map: crateMap('#41566a', '3D PARTS'), roughness: 0.75 }),
    new T.MeshStandardMaterial({ map: crateMap('#5d7043', 'BULK FOOD'), roughness: 0.85 })
  ];
  var crates = [], CRATE_N = MOBILE ? 7 : 11;
  for (var ci = 0; ci < CRATE_N; ci++) {
    var cr = box(0.55 + Math.random() * 0.25, 0.34 + Math.random() * 0.22, 0.5 + Math.random() * 0.22,
                 crateMats[ci % 3]);
    cr.userData.offset = ci / CRATE_N;
    scene.add(cr); crates.push(cr);
  }
  var blockedU = ST.filter(function (x) { return x.side > 0; }).map(function (x) { return pToU(x.p); });

  /* ==================================================================
     7. Interfaz
     ================================================================== */
  var els = Array.prototype.slice.call(document.querySelectorAll('.station'));
  var railItems = Array.prototype.slice.call(document.querySelectorAll('.rail-stops li'));
  var railCam = document.getElementById('rail-cam');

  // plano de planta: el trazado real proyectado en 2D, con una parada por estación
  var MAP = { x0: 0, x1: 88, z0: 24, z1: -176, w: 64, h: 210, pad: 7 };
  function mapXY(v) {
    return {
      x: MAP.pad + (v.x - MAP.x0) / (MAP.x1 - MAP.x0) * (MAP.w - MAP.pad * 2),
      y: MAP.pad + (MAP.z0 - v.z) / (MAP.z0 - MAP.z1) * (MAP.h - MAP.pad * 2)
    };
  }
  (function buildMap() {
    var path = document.getElementById('rail-path');
    if (!path) return;
    var pts = CURVE.getSpacedPoints(90), d = '';
    for (var i = 0; i < pts.length; i++) {
      var m = mapXY(pts[i]);
      d += (i ? ' L' : 'M') + m.x.toFixed(1) + ' ' + m.y.toFixed(1);
    }
    path.setAttribute('d', d);
    railItems.forEach(function (li, i) {
      var btn = li.querySelector('button');
      var m = mapXY(pointAt(pToU(ST[i].p), 0, 0));
      btn.style.left = (m.x / MAP.w * 100) + '%';
      btn.style.top = (m.y / MAP.h * 100) + '%';
    });
    var ticks = document.getElementById('hud-ticks');
    if (ticks) {
      ST.forEach(function (st) {
        var b = document.createElement('b');
        b.style.left = (st.p * 100) + '%';
        ticks.appendChild(b);
      });
    }
  })();
  var hudStation = document.getElementById('hud-station');
  var hudSub = document.getElementById('hud-sub');
  var hudFill = document.getElementById('hud-fill');
  var hudCue = document.getElementById('hud-cue');

  var targetP = 0, smoothP = 0, activeIdx = -1;

  function maxScroll() { return document.documentElement.scrollHeight - innerHeight; }
  function readScroll() {
    var m = maxScroll();
    targetP = m > 0 ? Math.min(Math.max(scrollY / m, 0), 1) : 0;
  }
  addEventListener('scroll', readScroll, { passive: true });

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-goto]');
    if (!btn) return;
    ev.preventDefault();
    var i = parseInt(btn.dataset.goto, 10);
    if (isNaN(i) || !ST[i]) return;
    scrollTo({ top: ST[i].p * maxScroll(), behavior: REDUCED ? 'auto' : 'smooth' });
  });

  function smoothstep(x) { x = Math.min(Math.max(x, 0), 1); return x * x * (3 - 2 * x); }

  function updateOverlay(p) {
    var best = 0, bestA = -1;
    for (var i = 0; i < ST.length; i++) {
      var a = smoothstep(1 - Math.abs(p - ST[i].p) / ST[i].w);
      var el = els[i];
      if (el) {
        el.style.opacity = Math.min(1, a * 2.2);
        el.style.setProperty('--a', a.toFixed(3));
        el.classList.toggle('is-live', a > 0.02);
      }
      if (a > bestA) { bestA = a; best = i; }
    }
    if (best !== activeIdx) {
      activeIdx = best;
      hudStation.textContent = ST[best].code;
      hudSub.textContent = ST[best].sub;
      railItems.forEach(function (li, i) { li.classList.toggle('is-live', i === best); });
    }
    hudFill.style.transform = 'scaleX(' + p + ')';
    hudCue.classList.toggle('is-hidden', p > 0.03);
  }

  /* ==================================================================
     8. Bucle
     ================================================================== */
  var camTarget = new T.Vector3(), tmpA = new T.Vector3(), tmpB = new T.Vector3();
  var pointerX = 0, pointerY = 0, px = 0, py = 0;
  if (!MOBILE && !REDUCED) {
    addEventListener('pointermove', function (e) {
      pointerX = (e.clientX / innerWidth - 0.5) * 2;
      pointerY = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  var clock = new T.Clock();
  var grainM4 = new T.Matrix4();
  var BASE_FOV = MOBILE ? 74 : 62, fovKick = 0, prevP = 0;
  var bootT = REDUCED ? 1 : 0, booted = false;
  var _c1 = new T.Color(), _cDim = new T.Color(0x555b53), _cOn = new T.Color(0xffffff);
  var _lapA = new T.Vector2(), _lapB = new T.Vector2(), _lapC = new T.Vector2();

  // Punto del recorrido en coordenadas locales de la celda. El radio se
  // encoge o se ensancha al acercarse a un pivote, así el coche lo esquiva.
  function lapPoint(dv, t, out) {
    var ex = (dv.ellipse || 1) * dv.radius, ez = dv.radius, r = 1;
    var ps = dv.pillars;
    if (ps) {
      for (var i = 0; i < ps.length; i++) {
        var d = t - ps[i].theta;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        r -= ps[i].side * 0.26 * Math.exp(-(d / 0.55) * (d / 0.55));
      }
    }
    out.set(ex * r * Math.cos(t), ez * r * Math.sin(t));
  }

  function frameLoop() {
    requestAnimationFrame(frameLoop);
    if (document.hidden) return;

    var dt = Math.min(clock.getDelta(), 0.05);
    var time = clock.elapsedTime;

    smoothP += (targetP - smoothP) * (REDUCED ? 1 : Math.min(1, dt * 5.5));
    var p = smoothP, u = pToU(p);
    updateOverlay(p);

    // la nave se enciende una vez: luces, lámparas del portal y titular
    if (booted && bootT < 1) bootT = Math.min(1, bootT + dt / 1.4);
    var bootE = bootT * bootT * (3 - 2 * bootT);
    var flicker = bootT < 1 ? (0.72 + 0.28 * Math.sin(time * 41) * Math.sin(time * 17)) : 1;
    gateLampMat.color.copy(_cDim).lerp(new T.Color(0xd0e98b), bootE * flicker);

    // la lente se abre un punto cuando aceleras: sensación de velocidad
    var vel = Math.abs(p - prevP) / Math.max(dt, 0.001); prevP = p;
    var kickTarget = REDUCED ? 0 : Math.min(7, vel * 60);
    fovKick += (kickTarget - fovKick) * Math.min(1, dt * 5);
    var fov = BASE_FOV + fovKick;
    if (Math.abs(camera.fov - fov) > 0.02) { camera.fov = fov; camera.updateProjectionMatrix(); }

    // el punto de la cámara sobre el plano de planta
    if (railCam) {
      var mc = mapXY(frame(u).pos);
      railCam.style.left = (mc.x / MAP.w * 100) + '%';
      railCam.style.top = (mc.y / MAP.h * 100) + '%';
    }

    // los rótulos, placas y fotos de cada puesto se encienden al llegar
    for (var gi2 = 0; gi2 < ST.length; gi2++) {
      var gTarget = smoothstep(1 - Math.abs(p - ST[gi2].p) / (ST[gi2].w * 1.6));
      glowT[gi2] += (gTarget - glowT[gi2]) * Math.min(1, dt * 4);
      var mats = glowMats[gi2];
      if (!mats.length) continue;
      _c1.copy(_cDim).lerp(_cOn, 0.15 + 0.85 * glowT[gi2]);
      for (var mi = 0; mi < mats.length; mi++) mats[mi].color.copy(_c1);
    }

    var f = frame(u);
    camera.position.set(f.pos.x, CAM_Y, f.pos.z);
    if (!REDUCED) {
      camera.position.y += Math.sin(u * LEN * 1.15) * 0.035;
      camera.position.x += f.right.x * Math.sin(u * LEN * 0.42) * 0.09;
      camera.position.z += f.right.z * Math.sin(u * LEN * 0.42) * 0.09;
    }

    camTarget.copy(pointAt(Math.min(u + 0.015, 0.999), 0, LOOK_Y));

    var st = ST[activeIdx];
    if (st && st.side !== 0) {
      var glance = smoothstep(1 - Math.abs(p - st.p) / (st.w * 1.25));
      if (glance > 0.001) {
        tmpA.copy(pointAt(pToU(st.p) + 0.003, st.side * 6.6, MOBILE ? 1.2 : 1.7));
        camTarget.lerp(tmpA, (MOBILE ? 0.74 : 0.62) * glance);
        camera.position.x -= f.right.x * st.side * 1.5 * glance;
        camera.position.z -= f.right.z * st.side * 1.5 * glance;
      }
    }
    camera.lookAt(camTarget);
    if (!REDUCED) {
      px += (pointerX - px) * 0.05; py += (pointerY - py) * 0.05;
      camera.rotation.y -= px * 0.055;
      camera.rotation.x -= py * 0.035;
      camera.rotation.z += Math.sin(u * LEN * 0.5) * 0.008;
    }

    for (var i = 0; i < rollingLights.length; i++) {
      tmpB.copy(pointAt(Math.min(Math.max(u + (i - 1) * 0.017, 0), 1), 0, 5.4));
      rollingLights[i].position.copy(tmpB);
      rollingLights[i].intensity = 62 * bootE * (bootT < 1 ? flicker : 1);
    }

    if (st) {
      var sIn = smoothstep(1 - Math.abs(p - st.p) / (st.w * 1.7));
      var sl = st.side || 0;
      keySpot.position.copy(pointAt(pToU(st.p), sl * 4.0, 5.8));
      keyTarget.position.copy(pointAt(pToU(st.p), sl * 7.4, 0.9));
      keySpot.intensity = 340 * sIn;
      fillLight.position.copy(pointAt(pToU(st.p) + 0.006, -sl * 2.0, 2.4));
      fillLight.intensity = 26 * sIn;
    }

    for (var a = 0; a < arms.length; a++) {
      var ud = arms[a].userData;
      var d = arms[a].position.distanceTo(camera.position);
      if (d > 46) continue;
      var near = Math.max(0, 1 - d / 26);
      var w = time * ud.speed + ud.phase;
      ud.turret.rotation.y = Math.sin(w * 0.7) * (0.5 + near * 0.5);
      ud.shoulder.rotation.x = -0.35 + Math.sin(w) * (0.3 + near * 0.35);
      ud.elbow.rotation.x = 0.9 + Math.cos(w * 1.3) * (0.35 + near * 0.4);
      ud.wrist.rotation.x = Math.sin(w * 1.7) * 0.4;
      ud.tip.scale.setScalar(0.09 + Math.abs(Math.sin(w * 3)) * 0.05);
    }

    for (var s = 0; s < spinners.length; s++) {
      var sp = spinners[s];
      if (sp.speed) {
        if (sp.axis === 'x') sp.obj.rotation.x = time * sp.speed;
        else sp.obj.rotation.y = (sp.base || 0) + time * sp.speed;
      }
      if (sp.bob) sp.obj.position.y = sp.base0 + Math.sin(time * 0.8 + sp.phase) * sp.bob;
    }

    for (var dvi = 0; dvi < drivers.length; dvi++) {
      var dv = drivers[dvi];
      dv.t += dt * dv.speed;
      lapPoint(dv, dv.t, _lapA);
      lapPoint(dv, dv.t + 0.07, _lapB);
      lapPoint(dv, dv.t + 0.14, _lapC);
      var lx = _lapA.x, lz = _lapA.y;
      var acr = (dv.across || 0) * dv.cell.side;
      var base = pointAt(dv.cell.u, dv.cell.lat + acr, dv.y === undefined ? 0.4 : dv.y);
      var yaw = yawAt(dv.cell.u), cs = Math.cos(yaw), sn = Math.sin(yaw);
      dv.obj.position.set(base.x + lx * cs + lz * sn, base.y, base.z - lx * sn + lz * cs);
      // el frente del robot es +X local: alinear +X con la velocidad real
      var h1 = Math.atan2(-(_lapB.y - _lapA.y), _lapB.x - _lapA.x);
      var h2 = Math.atan2(-(_lapC.y - _lapB.y), _lapC.x - _lapB.x);
      dv.obj.rotation.y = yaw + h1;
      var wh = dv.obj.userData.wheels;
      if (wh) for (var wi = 0; wi < wh.length; wi++) wh[wi].rotation.y -= dt * 7;
      var stw = dv.obj.userData.steer;
      if (stw) {
        var ds = Math.atan2(Math.sin(h2 - h1), Math.cos(h2 - h1)) * 3.0;
        ds = Math.max(-0.42, Math.min(0.42, ds));
        for (var si = 0; si < stw.length; si++) stw[si].rotation.y = ds;
      }
      if (dv.obj.userData.led) dv.obj.userData.led.visible = (time * 3 % 2) > 1;
    }

    if (dispenserGrains) {
      var gd = dispenserGrains.userData.seed;
      for (var gi = 0; gi < gd.length; gi++) {
        gd[gi].t += dt * 0.9;
        if (gd[gi].t > 1) gd[gi].t -= 1;
        var sy = gd[gi].t * gd[gi].t;
        grainM4.makeTranslation(gd[gi].dx * sy, 0.86 - gd[gi].t * 0.24, gd[gi].dz * sy);
        dispenserGrains.setMatrixAt(gi, grainM4);
      }
      dispenserGrains.instanceMatrix.needsUpdate = true;
    }

    for (var k = 0; k < crates.length; k++) {
      var cu = u - 0.02 + ((crates[k].userData.offset + time * 0.0028) % 1) * 0.155;
      cu = Math.min(Math.max(cu, 0.002), 0.998);
      var hide = false;
      for (var bi = 0; bi < blockedU.length; bi++) {
        if (Math.abs(cu - blockedU[bi]) < 0.026) { hide = true; break; }
      }
      crates[k].visible = !hide;
      if (hide) continue;
      crates[k].position.copy(pointAt(cu, 3.95, 0.93 + crates[k].scale.y / 2));
      crates[k].rotation.y = yawAt(cu);
    }

    renderer.render(scene, camera);
  }

  /* ==================================================================
     9. Arranque
     ================================================================== */
  var loaderEl = document.getElementById('loader');
  var fillEl = document.getElementById('loader-fill');

  function setLoad(v) {
    if (fillEl) fillEl.style.transform = 'scaleX(' + v + ')';
  }
  setLoad(0.12);
  manager.onProgress = function (url, loaded, total) { setLoad(0.12 + 0.88 * (loaded / Math.max(total, 1))); };
  manager.onError = function () { /* la escena funciona igual sin una foto */ };

  var started = false;
  function start() {
    if (started) return;
    started = true;
    setLoad(1);
    readScroll();
    smoothP = targetP;
    updateOverlay(targetP);
    setTimeout(function () {
      if (loaderEl) loaderEl.classList.add('is-done');
      booted = true;
      body.classList.add('is-booted');
    }, 260);
    frameLoop();
  }
  manager.onLoad = start;
  setTimeout(start, 5000);

  addEventListener('resize', function () {
    camera.aspect = innerWidth / innerHeight;
    BASE_FOV = innerWidth < 820 ? 74 : 62;
    camera.fov = BASE_FOV + fovKick;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    readScroll();
  });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) scrollTo(0, 0);
  readScroll();
})();
