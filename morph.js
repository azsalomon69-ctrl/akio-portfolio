/* ─────────────────────────────────────────────────────────────
   MORPH — Flying cards + upside-down ray-marched black hole
   Optimized: BH shader only renders during transition.
   ───────────────────────────────────────────────────────────── */

import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

/* ─── Scene ──────────────────────────────────────────────── */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02030a);

/* ─── Renderer — DPR capped at 1.5 for perf ──────────────── */
const container = document.getElementById('scene-container');

const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

/* ─── CSS3D for cards ────────────────────────────────────── */
const css3d = new CSS3DRenderer();
css3d.setSize(window.innerWidth, window.innerHeight);
css3d.domElement.style.position = 'absolute';
css3d.domElement.style.top = '0';
css3d.domElement.style.left = '0';
css3d.domElement.style.pointerEvents = 'none';
container.appendChild(css3d.domElement);

/* ═══════════════════════════════════════════════════════════
   RAY-MARCHED BLACK HOLE
   ═══════════════════════════════════════════════════════════ */

const BH_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;

const BH_FRAG = `
  precision highp float;

  varying vec2 vUv;

  uniform vec2  uResolution;
  uniform float uTime;
  uniform vec3  uCamPos;
  uniform vec3  uBHPos;
  uniform mat3  uCamBasis;

  const float RS = 1.0;
  const float ISCO = 3.0 * RS;
  const float DISK_OUTER = 16.0 * RS;
  const float SCALE = 0.02;
  const float DISK_TILT = -0.165;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm2(vec2 p) {
    return 0.6 * noise(p) + 0.3 * noise(p * 2.02);
  }

  vec3 starField(vec3 dir) {
    vec3 col = vec3(0.0);
    float theta = atan(dir.z, dir.x);
    float phi   = asin(clamp(dir.y, -1.0, 1.0));
    vec2 uv = vec2(theta * 1.5, phi * 2.0);

    vec2 g = floor(uv * 50.0);
    vec2 f = fract(uv * 50.0);
    float h = hash(g);
    if (h > 0.985) {
      float brightness = (h - 0.985) / 0.015;
      float d = length(f - 0.5);
      float star = smoothstep(0.08, 0.0, d) * brightness;
      col += vec3(1.0) * star * 0.55;
    }
    return col;
  }

  vec3 accretionDisk(float r, float angle, float time) {
    if (r < ISCO || r > DISK_OUTER) return vec3(0.0);

    float t = clamp((r - ISCO) / (DISK_OUTER - ISCO), 0.0, 1.0);
    float radial = pow(1.0 - t, 1.6) * 6.0 + 0.4;

    float omega = pow(r, -1.5);
    float rot = angle + omega * time * 2.8;

    float turb = fbm2(vec2(rot * 2.5, r * 0.8));
    turb = mix(0.65, 1.35, turb);

    float band = 0.92 + 0.08 * sin(r * 9.0 + turb * 3.0);
    float dop = 1.0 + 0.6 * sin(angle);

    vec3 hot  = vec3(1.0, 0.98, 0.92);
    vec3 mid  = vec3(1.0, 0.72, 0.32);
    vec3 cool = vec3(0.7, 0.18, 0.05);
    vec3 col = mix(hot, mid, smoothstep(0.0, 0.28, t));
    col = mix(col, cool, smoothstep(0.38, 1.0, t));

    return col * radial * turb * band * dop;
  }

  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= uResolution.x / uResolution.y;

    vec3 rayWorld = normalize(
      uCamBasis[0] * uv.x * 0.577 +
      uCamBasis[1] * uv.y * 0.577 +
      uCamBasis[2]
    );

    vec3 camRel = (uCamPos - uBHPos) * SCALE;

    float ct = cos(DISK_TILT);
    float st = sin(DISK_TILT);
    mat3 tiltM = mat3(
      1.0, 0.0, 0.0,
      0.0,  ct,  st,
      0.0, -st,  ct
    );

    vec3 pos = tiltM * camRel;
    vec3 vel = tiltM * rayWorld;

    vec3 hVec = cross(pos, vel);
    float h2 = dot(hVec, hVec);

    vec3 accum = vec3(0.0);
    float trans = 1.0;
    float camDist = length(pos);

    const int STEPS = 60;

    for (int i = 0; i < STEPS; i++) {
      float r = length(pos);
      if (r < RS * 1.02) break;
      if (r > camDist + 15.0 && dot(pos, vel) > 0.0) {
        accum += trans * starField(normalize(vel));
        break;
      }

      float dt = clamp(r * 0.09, 0.04, 1.0);

      float y1 = pos.y;
      float y2 = pos.y + vel.y * dt;
      if (y1 * y2 < 0.0) {
        float tCross = y1 / (y1 - y2);
        vec3 hitPos = pos + vel * (tCross * dt);
        float hitR = length(hitPos);

        if (hitR > ISCO && hitR < DISK_OUTER) {
          float angle = atan(hitPos.z, hitPos.x);
          vec3 diskCol = accretionDisk(hitR, angle, uTime);

          float inner = smoothstep(ISCO, ISCO * 1.15, hitR);
          float outer = smoothstep(DISK_OUTER, DISK_OUTER * 0.75, hitR);
          float edgeFade = inner * outer;

          accum += trans * diskCol * edgeFade;
          trans *= (1.0 - 0.7 * edgeFade);
        }
      }

      float r2 = dot(pos, pos);
      float r5 = r2 * r2 * r;
      vec3 accel = -1.5 * RS * h2 * pos / max(r5, 0.0001);
      vel += accel * dt;
      pos += vel * dt;
    }

    accum = accum / (accum + vec3(1.0)) * 1.6;
    gl_FragColor = vec4(accum, 1.0);
  }
`;

const bhUniforms = {
  uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  uTime:       { value: 0 },
  uCamPos:     { value: new THREE.Vector3() },
  uBHPos:      { value: new THREE.Vector3() },
  uCamBasis:   { value: new THREE.Matrix3() },
};

const bhMaterial = new THREE.ShaderMaterial({
  vertexShader: BH_VERT,
  fragmentShader: BH_FRAG,
  uniforms: bhUniforms,
  depthTest: false,
  depthWrite: false,
});

const bhQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bhMaterial);
bhQuad.frustumCulled = false;
bhQuad.renderOrder = -1000;
bhQuad.visible = false;
scene.add(bhQuad);

/* ═══════════════════════════════════════════════════════════
   BLACK HOLE SOUND
   ═══════════════════════════════════════════════════════════ */
const blackholeAudio = new Audio('blackhole.mp3');
blackholeAudio.preload = 'auto';
blackholeAudio.loop    = false;
blackholeAudio.volume  = 0;

// Unmute only after priming
let audioPrimed = false;
let blackholeAudioStarted = false;
let blackholeSoundT = 0;

const BLACKHOLE_TARGET_VOLUME = 0.4;
const BLACKHOLE_FADE_IN = 2.2;   // was 1.4

/* Prime the audio element on the first user gesture.
   This "unlocks" playback so a later .play() is allowed. */
function primeAudio() {
  if (audioPrimed) return;
  audioPrimed = true;

  // Muted play unlocks the element in Chrome/Safari/Firefox
  blackholeAudio.muted = true;
  const p = blackholeAudio.play();
  if (p && typeof p.then === 'function') {
    p.then(() => {
      blackholeAudio.pause();
      blackholeAudio.currentTime = 0;
      blackholeAudio.muted = false;
    }).catch((err) => {
      console.warn('[blackhole] prime failed:', err);
    });
  }
}

window.addEventListener('keydown', primeAudio, { once: true });
window.addEventListener('pointerdown', primeAudio, { once: true });
window.addEventListener('touchstart', primeAudio, { once: true, passive: true });

/* Start the sound (called when the black hole appears) */
function startBlackholeSound() {
  if (blackholeAudioStarted) return;
  blackholeAudioStarted = true;
  blackholeSoundT = 0;
  blackholeAudio.volume = 0;
  blackholeAudio.muted  = false;

  const p = blackholeAudio.play();
  if (p && typeof p.catch === 'function') {
    p.catch((err) => {
      console.warn('[blackhole] play failed:', err);
    });
  }

  // Helpful diagnostics
  blackholeAudio.addEventListener('error', () => {
    console.error('[blackhole] audio error:',
      blackholeAudio.error?.code, blackholeAudio.error?.message);
  });
}

/* ─── Star field ─────────────────────────────────────────── */
(function addStars() {
  const COUNT = 800;
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const color = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    const r = 15000 + Math.random() * 20000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i*3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i*3 + 2] = r * Math.cos(phi);
    const h = Math.random();
    if (h < 0.1) color.setHSL(0.60, 0.5, 0.85);
    else if (h < 0.2) color.setHSL(0.08, 0.6, 0.8);
    else color.setHSL(0.0, 0.0, 0.75 + Math.random() * 0.25);
    colors[i*3] = color.r; colors[i*3 + 1] = color.g; colors[i*3 + 2] = color.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
    size: 26, sizeAttenuation: true, vertexColors: true,
    transparent: true, opacity: 0.7, depthWrite: false, fog: false,
  })));
})();

/* ─── Layout ─────────────────────────────────────────────── */
const FLY_HEIGHT    = 0;
const START_Z       = 400;
const GAP           = 1400;
const CAMERA_Z      = 1600;
const LAST_CARD_Z   = START_Z - GAP * 5;
const BLACK_HOLE_Z  = START_Z - GAP * 6;

const WAYPOINTS = [
  { section: 'name',       z: START_Z - GAP * 0 },
  { section: 'about',      z: START_Z - GAP * 1 },
  { section: 'projects',   z: START_Z - GAP * 2 },
  { section: 'experience', z: START_Z - GAP * 3 },
  { section: 'skills',     z: START_Z - GAP * 4 },
  { section: 'contact',    z: START_Z - GAP * 5 },
];

/* ─── Camera ─────────────────────────────────────────────── */
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 1, 60000);
camera.position.set(0, FLY_HEIGHT, CAMERA_Z);
camera.lookAt(0, FLY_HEIGHT, 0);

/* ─── Cards ──────────────────────────────────────────────── */
const cards = [];
document.querySelectorAll('.card-3d').forEach((el) => {
  const section = el.dataset.section;
  const wp = WAYPOINTS.find((w) => w.section === section);
  if (!wp) return;

  el.style.opacity = '0';
  el.style.transition = 'opacity 0.4s ease';
  el.classList.add('is-in-world');

  const obj = new CSS3DObject(el);
  obj.position.set(0, FLY_HEIGHT, wp.z);
  obj.scale.setScalar(0.9);
  scene.add(obj);
  cards.push({ obj, el, z: wp.z });
});

/* ═══════════════════════════════════════════════════════════
   FLIGHT CONTROLS — W / S only
   ═══════════════════════════════════════════════════════════ */
const keys = {};
const movementSpeed = 550;

window.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

const _fwd = new THREE.Vector3();

function updateFlightControls(delta) {
  let moveZ = 0;
  if (keys['KeyW']) moveZ += 1;
  if (keys['KeyS']) moveZ -= 1;

  if (moveZ !== 0) {
    _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(_fwd, moveZ * movementSpeed * delta);
  }
  return moveZ;
}

/* ═══════════════════════════════════════════════════════════
   WAVY DRIFT
   ═══════════════════════════════════════════════════════════ */
let bumpTime = 0;
let bumpIntensity = 0;

const BUMP_IDLE_TARGET   = 0.15;
const BUMP_MOVING_TARGET = 1.00;
const BUMP_LERP_RATE     = 1.8;

const _bumpBasePos  = new THREE.Vector3();
const _bumpBaseQuat = new THREE.Quaternion();
const _bumpEuler    = new THREE.Euler(0, 0, 0, 'XYZ');
const _bumpQ        = new THREE.Quaternion();

function updateBump(delta, moving) {
  bumpTime += delta;
  const target = moving ? BUMP_MOVING_TARGET : BUMP_IDLE_TARGET;
  bumpIntensity += (target - bumpIntensity) * (1 - Math.exp(-BUMP_LERP_RATE * delta));

  const t = bumpTime;
  const i = bumpIntensity;

  const y = (Math.sin(t * 0.75) * 14.0 + Math.sin(t * 1.15 + 1.3) * 7.0) * i;
  const x = (Math.sin(t * 0.62 + 0.8) * 10.0 + Math.sin(t * 0.98 + 2.4) * 5.0) * i;
  const roll  = (Math.sin(t * 0.62) * 0.018 + Math.sin(t * 0.98 + 1.6) * 0.008) * i;
  const pitch = (Math.sin(t * 0.75 + 0.4) * 0.012 + Math.sin(t * 1.15 + 1.7) * 0.006) * i;

  return { x, y, roll, pitch };
}

/* ═══════════════════════════════════════════════════════════
   CINEMATIC ENDING
   ═══════════════════════════════════════════════════════════ */
let transitionState = 'idle';
let stateT = 0;

const REVEAL_DURATION = 1.4;
const SUCK_DURATION   = 2.2;

const bhWorldPos   = new THREE.Vector3(0, FLY_HEIGHT, BLACK_HOLE_Z);
const camStartPos  = new THREE.Vector3();
const camStartQuat = new THREE.Quaternion();
const _dummy       = new THREE.Object3D();

function triggerFlicker() {
  transitionState = 'flickering';
  const overlay = document.getElementById('blackout');
  if (!overlay) { window.location.href = 'index.html'; return; }
  overlay.classList.add('active', 'flickering');
  setTimeout(() => { window.location.href = 'index.html'; }, 1300);
}

/* ─── Resize ─────────────────────────────────────────────── */
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  css3d.setSize(w, h);
  bhUniforms.uResolution.value.set(w, h);
}
window.addEventListener('resize', onResize);

/* ─── Animation loop ─────────────────────────────────────── */
const clock = new THREE.Clock();
const _basisRight = new THREE.Vector3();
const _basisUp    = new THREE.Vector3();
const _basisFwd   = new THREE.Vector3();
const _basisMat4  = new THREE.Matrix4();

function animate() {
  const delta = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;

  let moveZ = 0;
  if (transitionState === 'idle') {
    moveZ = updateFlightControls(delta);
  }

  // ── State machine ───────────────────────────────────────
  const camZ = camera.position.z;

  if (transitionState === 'idle' && camZ < LAST_CARD_Z) {
    transitionState = 'reveal';
    stateT = 0;
    camStartPos.copy(camera.position);
    camStartQuat.copy(camera.quaternion);
    bhQuad.visible = true;
    startBlackholeSound();
  }

  if (transitionState === 'reveal') {
    stateT += delta;
    const k = Math.min(1, stateT / REVEAL_DURATION);

    _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const driftSpeed = movementSpeed * (1 - k) * 0.4;
    camera.position.addScaledVector(_fwd, driftSpeed * delta);

    if (k >= 1) {
      transitionState = 'sucking';
      stateT = 0;
      camStartPos.copy(camera.position);
      camStartQuat.copy(camera.quaternion);
    }
  }

  if (transitionState === 'sucking') {
    stateT += delta;
    const k = Math.min(1, stateT / SUCK_DURATION);
    const ease = k * k * k;

    camera.position.lerpVectors(camStartPos, bhWorldPos, ease);

    _dummy.position.copy(camera.position);
    _dummy.lookAt(bhWorldPos);
    camera.quaternion.slerpQuaternions(camStartQuat, _dummy.quaternion, Math.min(1, ease * 2));

    camera.fov = 65 + ease * 110;
    camera.updateProjectionMatrix();
    camera.rotateZ(delta * ease * 0.9);

    if (k >= 1) triggerFlicker();
  }

  // ── Black hole uniforms ─────────────────────────────────
  if (bhQuad.visible) {
    bhUniforms.uCamPos.value.copy(camera.position);
    bhUniforms.uBHPos.value.copy(bhWorldPos);

    _basisRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _basisUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    _basisFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    _basisMat4.makeBasis(_basisRight, _basisUp, _basisFwd);
    bhUniforms.uCamBasis.value.setFromMatrix4(_basisMat4);
    bhUniforms.uTime.value = t;
  }

  // ── Black hole sound fade-in ────────────────────────────
  if (blackholeAudioStarted) {
    blackholeSoundT += delta;
    const fadeIn = Math.min(1, blackholeSoundT / BLACKHOLE_FADE_IN);
    blackholeAudio.volume = BLACKHOLE_TARGET_VOLUME * fadeIn;
  }

  // ── Card opacity ────────────────────────────────────────
  if (transitionState === 'idle' || transitionState === 'reveal') {
    cards.forEach(({ el, z }) => {
      const d2 = camZ - z;
      let opacity;
      if (d2 > 2500)      opacity = 0;
      else if (d2 > 500)  opacity = 1 - (d2 - 500) / 2000;
      else if (d2 > 220)  opacity = 1;
      else if (d2 > 0)    opacity = d2 / 220;
      else                opacity = 0;

      if (transitionState === 'reveal') {
        opacity *= 1 - Math.min(1, stateT / REVEAL_DURATION);
      }

      const rounded = Math.round(opacity * 20) / 20;
      if (el.dataset.o !== String(rounded)) {
        el.style.opacity = String(rounded);
        el.dataset.o = String(rounded);
      }
      el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
    });
  } else {
    cards.forEach(({ el }) => {
      if (el.style.opacity !== '0') { el.style.opacity = '0'; el.dataset.o = '0'; }
    });
  }

  // ── Render with bump shake ──────────────────────────────
  const applyBump = transitionState === 'idle' || transitionState === 'reveal';

  if (applyBump) {
    const bump = updateBump(delta, moveZ !== 0);
    _bumpBasePos.copy(camera.position);
    _bumpBaseQuat.copy(camera.quaternion);

    camera.position.x += bump.x;
    camera.position.y += bump.y;
    _bumpEuler.set(bump.pitch, 0, bump.roll, 'XYZ');
    _bumpQ.setFromEuler(_bumpEuler);
    camera.quaternion.multiply(_bumpQ);
    camera.quaternion.normalize();

    renderer.render(scene, camera);
    css3d.render(scene, camera);

    camera.position.copy(_bumpBasePos);
    camera.quaternion.copy(_bumpBaseQuat);
  } else {
    renderer.render(scene, camera);
    css3d.render(scene, camera);
  }

  requestAnimationFrame(animate);
}

/* ─── Fade the hint ──────────────────────────────────────── */
const hint = document.getElementById('fly-hint');
let hintHidden = false;
function hideHint() {
  if (hintHidden || !hint) return;
  hintHidden = true;
  hint.style.opacity = '0';
  setTimeout(() => hint.remove(), 800);
}
window.addEventListener('keydown', hideHint, { once: true });
window.addEventListener('pointerdown', hideHint, { once: true });
setTimeout(hideHint, 12000);

/* ═══════════════════════════════════════════════════════════
   MOBILE FLIGHT BUTTONS
   Forward sets keys['KeyW'], back sets keys['KeyS'] — same
   flags the keyboard uses, so they drive identical flight code.
   ═══════════════════════════════════════════════════════════ */
(function initMobileFlightButtons() {
  function attachButton(id, keyCode) {
    const btn = document.getElementById(id);
    if (!btn) return;

    function press(e) {
      e.preventDefault();
      keys[keyCode] = true;
      btn.classList.add('pressed');
    }
    function release(e) {
      if (e) e.preventDefault();
      keys[keyCode] = false;
      btn.classList.remove('pressed');
    }

    btn.addEventListener('pointerdown', (e) => {
      btn.setPointerCapture(e.pointerId);
      press(e);
    });
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);

    // Safety: don't leave the key stuck if focus leaves the tab
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) release();
    });
  }

  attachButton('mobile-forward', 'KeyW');
  attachButton('mobile-back',    'KeyS');
})();

/* ─── Page fade-in on load ───────────────────────────────── */
(function initPageFadeIn() {
  const overlay = document.getElementById('page-fade');
  if (!overlay) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hold = reduced ? 0 : 550;

  setTimeout(() => {
    overlay.classList.remove('active');
  }, hold);
})();

animate();