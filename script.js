/* ─────────────────────────────────────────────────────────────
   1. LANGUAGE (EN / PH)
   ───────────────────────────────────────────────────────────── */
const TRANSLATIONS = {
  en: {
    findMeOn: 'Find me on',
    'lang.label': 'EN',
    'loc.city': 'Philippines, Laguna',
    'nav.home': 'Home',
    'nav.projects': 'Projects',
    'nav.experience': 'Experience',
    'nav.skills': 'Skills',
    'nav.contact': 'Contact',
    'hero.name': 'Akio Zaki Salomon',
    'hero.tagline': 'Full-Stack Web Developer.',
    'hero.blurb': 'I work with HTML, CSS, JavaScript, Node.js, Express, NestJS, NoSQL, and PostgreSQL. I build both the frontend and backend of web applications.',
    'hero.viewWork': 'View my work',
    'hero.getInTouch': 'Get in touch',
    'experience.title': 'Experience',
    'experience.period1': '2026 — TODAY',
    'experience.role': 'Full-Stack Web Developer / IT Support',
    'experience.j1': 'Build and maintain company web applications and high-traffic websites, handle IT support tasks, and leverage AI to streamline day-to-day work.',
    'experience.period2': '2014',
    'experience.role2': 'Java Plugin Developer · Team of 4',
    'experience.j2': 'Built and maintained the GTA game mode for RandomCraft (play.randomcraft.org), a public Minecraft server serving ~3,000 daily players. Wrote custom gun mechanics, timed loot spawning, and SQLite-backed player data in Java using the Bukkit API. Players posted gameplay content on YouTube covering the mode.',
    'skills.title': 'Skills',
    'skills.html': 'Structure and markup for web pages',
    'skills.css': 'Styling and layout for the web',
    'skills.js': 'Dynamic behavior and interactivity',
    'skills.node': 'JavaScript runtime for the server',
    'skills.express': 'Minimalist Node.js web framework',
    'skills.nest': 'Progressive Node.js framework for scalable server apps',
    'skills.next': 'React framework for production web apps',
    'skills.nosql': 'Non-relational databases like MongoDB',
    'skills.pg': 'Open-source relational database system',
    'skills.cloudflare': 'CDN, DNS, and edge deployment',
    'skills.render': 'Cloud platform for backend apps',
    'skills.vercel': 'Frontend deployment and edge hosting',
    'skills.supabase': 'Open-source Firebase alternative (DB, auth, storage)',
    'contact.eyebrow': 'Get in touch',
    'contact.headline': "Let's build something together",
    'contact.sub': 'Do you have a project in mind?',
  },
  ph: {
    findMeOn: 'Makikita mo ako sa',
    'lang.label': 'PH',
    'loc.city': 'Pilipinas, Laguna',
    'nav.home': 'Home',
    'nav.projects': 'Mga Proyekto',
    'nav.experience': 'Karanasan',
    'nav.skills': 'Skills',
    'nav.contact': 'Kontak',
    'hero.name': 'Akio Zaki Salomon',
    'hero.tagline': 'Full-Stack Web Developer.',
    'hero.blurb': 'Gumagawa ako gamit ang HTML, CSS, JavaScript, Node.js, Express, NestJS, NoSQL, at PostgreSQL. Binubuo ko ang frontend at backend ng mga web application.',
    'hero.viewWork': 'Tingnan ang mga gawa ko',
    'hero.getInTouch': 'Kontakin ako',
    'experience.title': 'Karanasan',
    'experience.period1': '2026 — NGAYON',
    'experience.role': 'Full-Stack Web Developer / IT Support',
    'experience.j1': 'Gumagawa at nagma-maintain ng mga web application at high-traffic na website, tumutulong sa IT support, at gumagamit ng AI para mapabilis ang pang-araw-araw na trabaho.',
    'experience.period2': '2014',
    'experience.role2': 'Java Plugin Developer · Team of 4',
    'experience.j2': 'Gumawa at nag-maintain ng GTA game mode para sa RandomCraft (play.randomcraft.org), isang public na Minecraft server na may ~3,000 araw-araw na players. Nagsulat ng custom na gun mechanics, timed loot spawning, at SQLite-backed na player data sa Java gamit ang Bukkit API. May mga players na nag-post ng gameplay content sa YouTube tungkol sa mode.',
    'skills.title': 'Skills',
    'skills.html': 'Estruktura at markup ng mga web page',
    'skills.css': 'Estilo at layout para sa web',
    'skills.js': 'Dynamikong behavior at interactivity',
    'skills.node': 'JavaScript runtime para sa server',
    'skills.express': 'Minimalistang Node.js web framework',
    'skills.nest': 'Progressive Node.js framework para sa scalable server apps',
    'skills.next': 'React framework para sa production web apps',
    'skills.nosql': 'Non-relational databases tulad ng MongoDB',
    'skills.pg': 'Open-source relational database system',
    'skills.cloudflare': 'CDN, DNS, at edge deployment',
    'skills.render': 'Cloud platform para sa backend apps',
    'skills.vercel': 'Frontend deployment at edge hosting',
    'skills.supabase': 'Open-source Firebase alternative (DB, auth, storage)',
    'contact.eyebrow': 'Kontakin ako',
    'contact.headline': 'Sabay tayong bumuo',
    'contact.sub': 'May proyekto ka ba sa isip? Bukas ang aking inbox para sa iyo.',
  },
};

const LOCALES = ['en', 'ph'];
let currentLocale = localStorage.getItem('locale') || 'en';
if (!LOCALES.includes(currentLocale)) currentLocale = 'en';

function applyTranslations() {
  document.documentElement.lang = currentLocale;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = TRANSLATIONS[currentLocale][key];
    if (val) el.textContent = val;
  });
}

const langToggle = document.getElementById('lang-toggle');
if (langToggle) {
  langToggle.addEventListener('click', () => {
    const i = LOCALES.indexOf(currentLocale);
    currentLocale = LOCALES[(i + 1) % LOCALES.length];
    localStorage.setItem('locale', currentLocale);
    applyTranslations();
  });
}

applyTranslations();

/* ─────────────────────────────────────────────────────────────
   2. GMT OFFSET — Asia/Manila
   ───────────────────────────────────────────────────────────── */
(function setTimezone() {
  const targets = [
    document.getElementById('loc-tz'),
    document.getElementById('mobile-loc-tz'),
  ].filter(Boolean);
  if (!targets.length) return;

  let text = 'GMT+8';
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      timeZoneName: 'shortOffset',
    });
    const tz = fmt.formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value || 'GMT+8';
    text = tz.replace(/^GMT\+?0?/, 'GMT+').replace(/:00$/, '');
  } catch {}
  targets.forEach((el) => { el.textContent = text; });
})();

/* ─────────────────────────────────────────────────────────────
   3. SCROLL REVEAL
   ───────────────────────────────────────────────────────────── */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObserver.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
);
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

/* ─────────────────────────────────────────────────────────────
   4. PROJECTS CAROUSEL
   ───────────────────────────────────────────────────────────── */
(function initProjects() {
  const viewer = document.querySelector('.project-viewer');
  if (!viewer) return;

  const slides  = Array.from(viewer.querySelectorAll('.project-slide'));
  const dotsEl  = viewer.querySelector('.project-dots');
  const prevBtn = viewer.querySelector('.project-arrow[data-dir="-1"]');
  const nextBtn = viewer.querySelector('.project-arrow[data-dir="1"]');

  viewer.dataset.count = String(slides.length);

  if (slides.length <= 1) return;

  let active = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'project-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Go to project ${i + 1}`);
    dot.addEventListener('click', () => go(i));
    dotsEl.appendChild(dot);
  });

  const dots = Array.from(dotsEl.children);

  function show(i) {
    slides.forEach((s, idx) => {
      s.style.display = idx === i ? '' : 'none';
    });
    dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
    if (prevBtn) prevBtn.disabled = i === 0;
    if (nextBtn) nextBtn.disabled = i === slides.length - 1;
  }

  function go(i) {
    active = Math.max(0, Math.min(slides.length - 1, i));
    show(active);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => go(active - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => go(active + 1));

  // Auto-advance — uncomment to enable
  // setInterval(() => go(active + 1 >= slides.length ? 0 : active + 1), 6000);

  show(0);
})();

/* ─────────────────────────────────────────────────────────────
   5. CURVED WHEEL NAV (desktop)
   ───────────────────────────────────────────────────────────── */
const wheelItems = Array.from(document.querySelectorAll('.wheel-item'));
const sectionIds = wheelItems.map((el) => el.dataset.target);
const sections   = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

const FONT_REM   = 3;
const SPACING    = 1.4;
const CURVE      = 1;
const TILT_DEG   = 6;
const BLUR_PER   = 2;
const FADE_PER   = 0.25;
const MIN_OP     = 0.05;
const SMOOTHING  = 200;
const SIDE       = 'right';

const ROW_H    = FONT_REM * SPACING * 16;
const TILT_RAD = (TILT_DEG * Math.PI) / 180;
const ARC_R    = ROW_H / TILT_RAD;
const DIR      = SIDE === 'right' ? -1 : 1;

let activeIndex  = 0;
let currentIndex = 0;
let rafId        = 0;
let lastTime     = 0;

function layoutWheel() {
  wheelItems.forEach((el, i) => {
    const d = i - currentIndex;
    const absD = Math.abs(d);
    const angle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, d * TILT_RAD));
    const y = ARC_R * Math.sin(angle);
    const x = -DIR * ARC_R * (1 - Math.cos(angle)) * CURVE;
    const rotate = DIR * angle * (180 / Math.PI);

    el.style.transform =
      `translate(${x.toFixed(2)}px, calc(${y.toFixed(2)}px - 50%)) ` +
      `rotate(${rotate.toFixed(2)}deg)`;
    el.style.opacity = Math.max(MIN_OP, 1 - absD * FADE_PER).toFixed(3);
    el.style.filter = absD > 0.01 ? `blur(${(absD * BLUR_PER).toFixed(2)}px)` : 'none';
    el.classList.toggle('active', Math.round(currentIndex) === i);
  });
}

function tick(now) {
  const dt = Math.min((now - (lastTime || now)) / 1000, 0.05);
  lastTime = now;
  const tau = Math.max(SMOOTHING, 1) / 1000;
  const k = 1 - Math.exp(-dt / tau);
  currentIndex += (activeIndex - currentIndex) * k;

  if (Math.abs(activeIndex - currentIndex) < 0.001) {
    currentIndex = activeIndex;
    layoutWheel();
    rafId = 0;
    lastTime = 0;
    return;
  }
  layoutWheel();
  rafId = requestAnimationFrame(tick);
}

function setActive(i) {
  if (i === activeIndex && Math.abs(currentIndex - i) < 0.001) return;
  activeIndex = i;
  if (!rafId) {
    lastTime = 0;
    rafId = requestAnimationFrame(tick);
  }
}

if (wheelItems.length) {
  layoutWheel();
  window.addEventListener('resize', layoutWheel);

  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const idx = sectionIds.indexOf(e.target.id);
        if (idx >= 0) setActive(idx);
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );
  sections.forEach((s) => navObserver.observe(s));
  wheelItems.forEach((el, i) => el.addEventListener('click', () => setActive(i)));
}

/* ─────────────────────────────────────────────────────────────
   6. MOBILE MENU
   ───────────────────────────────────────────────────────────── */
(function initMobileMenu() {
  const btn  = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  const links = menu.querySelectorAll('a[href^="#"]');

  function toggle(force) {
    const isOpen = typeof force === 'boolean'
      ? force
      : !menu.classList.contains('open');

    menu.classList.toggle('open', isOpen);
    btn.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', String(isOpen));
    btn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', String(!isOpen));

    document.documentElement.style.overflow = isOpen ? 'hidden' : '';
  }

  btn.addEventListener('click', () => toggle());

  links.forEach((a) => a.addEventListener('click', () => toggle(false)));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) toggle(false);
  });
})();

/* ─────────────────────────────────────────────────────────────
   7. YEAR
   ───────────────────────────────────────────────────────────── */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ─────────────────────────────────────────────────────────────
   8. COPY TO CLIPBOARD
   ───────────────────────────────────────────────────────────── */
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (_) {}
  document.body.removeChild(ta);
  return ok;
}

const emailBtn = document.getElementById('copy-email');
if (emailBtn) {
  emailBtn.addEventListener('click', async () => {
    const text = emailBtn.dataset.copy || '';
    const ok = await copyToClipboard(text);
    if (ok) {
      emailBtn.classList.add('copied');
      setTimeout(() => emailBtn.classList.remove('copied'), 1600);
    }
  });
}

const phoneBtn   = document.getElementById('phone-btn');
const phonePopup = document.getElementById('phone-popup');
const phoneCopy  = document.getElementById('phone-copy');

if (phoneBtn && phonePopup) {
  phoneBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = phonePopup.hidden;
    phonePopup.hidden = !willOpen;
    phoneBtn.setAttribute('aria-expanded', String(willOpen));
  });

  document.addEventListener('click', (e) => {
    if (!phonePopup.hidden && !phonePopup.contains(e.target) && e.target !== phoneBtn) {
      phonePopup.hidden = true;
      phoneBtn.setAttribute('aria-expanded', 'false');
    }
  });

  phonePopup.addEventListener('click', (e) => e.stopPropagation());
}

if (phoneCopy) {
  phoneCopy.addEventListener('click', async () => {
    const text = phoneCopy.dataset.copy || '';
    const ok = await copyToClipboard(text);
    if (ok) {
      phoneCopy.classList.add('copied');
      setTimeout(() => phoneCopy.classList.remove('copied'), 1200);
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   9. AURORA — WebGL hero background
   ───────────────────────────────────────────────────────────── */
(function initAurora() {
  const canvas = document.getElementById('aurora');
  if (!canvas) return;

  const gl2 = canvas.getContext('webgl2');
  const gl  = gl2 || canvas.getContext('webgl');
  if (!gl) return;
  const isGL2 = !!gl2;

  const vert = isGL2
    ? `#version 300 es
       in vec2 a_pos;
       void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`
    : `attribute vec2 a_pos;
       void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  const frag = (isGL2 ? `#version 300 es
       precision highp float;
       out vec4 fragColor;` : `precision highp float;`) + `
    uniform float uTime;
    uniform float uAmp;
    uniform vec3  uStops[3];
    uniform vec2  uRes;
    uniform float uBlend;

    vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                         -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
      vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                              + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0),
                              dot(x12.xy,x12.xy),
                              dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      vec3 ramp = mix(
        mix(uStops[0], uStops[1], smoothstep(0.0, 0.5, uv.x)),
        uStops[2],
        smoothstep(0.5, 1.0, uv.x)
      );
      float h = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmp;
      h = exp(h);
      float intensity = 0.6 * (uv.y * 2.0 - h + 0.2);
      float alpha = smoothstep(0.20 - uBlend * 0.5, 0.20 + uBlend * 0.5, intensity);
      vec3 col = intensity * ramp;
      fragColor = vec4(col * alpha, alpha);
    }
  `;

  function makeShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s), src);
      return null;
    }
    return s;
  }

  const vs = makeShader(gl.VERTEX_SHADER, vert);
  const fs = makeShader(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uTime  = gl.getUniformLocation(prog, 'uTime');
  const uAmp   = gl.getUniformLocation(prog, 'uAmp');
  const uStops = gl.getUniformLocation(prog, 'uStops');
  const uRes   = gl.getUniformLocation(prog, 'uRes');
  const uBlend = gl.getUniformLocation(prog, 'uBlend');

  const hex = (h) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
    return m ? [parseInt(m[1],16)/255, parseInt(m[2],16)/255, parseInt(m[3],16)/255] : [1,1,1];
  };
  gl.uniform3fv(uStops, [...hex('#5227FF'), ...hex('#7cff67'), ...hex('#5227FF')]);
  gl.uniform1f(uAmp, 1.0);
  gl.uniform1f(uBlend, 0.5);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  const start = performance.now();
  let raf = 0;
  function loop(now) {
    gl.uniform1f(uTime, (now - start) * 0.001);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !document.hidden) {
      if (!raf) raf = requestAnimationFrame(loop);
    } else {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
  }, { threshold: 0 });
  io.observe(canvas);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    } else {
      if (!raf) raf = requestAnimationFrame(loop);
    }
  });
})();

/* ─────────────────────────────────────────────────────────────
   10. PAGE TRANSITION — fade out to morph.html
   ───────────────────────────────────────────────────────────── */
(function initPageTransition() {
  const overlay = document.getElementById('page-fade');
  const links = document.querySelectorAll('a[href="morph.html"]');
  if (!overlay || !links.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();

      if (reduced) {
        window.location.href = 'morph.html';
        return;
      }

      overlay.classList.add('active');
      setTimeout(() => {
        window.location.href = 'morph.html';
      }, 250);
    });
  });
})();

/* ─────────────────────────────────────────────────────────────
   11. ABOUT TOGGLE — cross-fades hero text ↔ about content
   ───────────────────────────────────────────────────────────── */
(function initAboutToggle() {
  const toggle    = document.getElementById('about-toggle');
  const heroView  = document.getElementById('hero-view');
  const aboutView = document.getElementById('about-view');
  if (!toggle || !heroView || !aboutView) return;

  const label = toggle.querySelector('.pill-about-text');
  let isAbout = false;

  function setAbout(next) {
    isAbout = next;
    heroView.classList.toggle('hidden', isAbout);
    aboutView.classList.toggle('active', isAbout);
    toggle.classList.toggle('active', isAbout);
    toggle.setAttribute('aria-expanded', String(isAbout));
    aboutView.setAttribute('aria-hidden', String(!isAbout));
    if (label) label.textContent = isAbout ? 'Back' : 'About';
  }

  toggle.addEventListener('click', () => setAbout(!isAbout));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isAbout) setAbout(false);
  });
})();