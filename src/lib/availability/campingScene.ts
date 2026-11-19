/**
 * Stylized Colorado camping backdrop for /meet.
 * Single rAF loop: day cycle + optional mouse parallax.
 * Dev override: ?tod=dawn|day|golden|dusk|night freezes the cycle.
 */

export type CampingHandle = { destroy: () => void };

type TodKey = 'dawn' | 'day' | 'golden' | 'dusk' | 'night';

const CYCLE_MS = 75_000;
const TOD_PHASE: Record<TodKey, number> = {
  dawn: 0.05,
  day: 0.28,
  golden: 0.48,
  dusk: 0.62,
  night: 0.8,
};

type Palette = {
  skyTop: string;
  skyMid: string;
  skyBot: string;
  sun: string;
  sunGlow: string;
  moon: string;
  ridgeFar: string;
  ridgeMid: string;
  ridgeNear: string;
  snow: string;
  trees: string;
  river: string;
  riverShine: string;
  tent: string;
  fire: string;
  fireGlow: number;
  stars: number;
  sunY: number;
  sunX: number;
  moonOpacity: number;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpColor(a: string, b: string, t: number) {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  if (!pa || !pb) return a;
  const r = Math.round(lerp(pa.r, pb.r, t));
  const g = Math.round(lerp(pa.g, pb.g, t));
  const bch = Math.round(lerp(pa.b, pb.b, t));
  return `rgb(${r},${g},${bch})`;
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function mixPalette(a: Palette, b: Palette, t: number): Palette {
  return {
    skyTop: lerpColor(a.skyTop, b.skyTop, t),
    skyMid: lerpColor(a.skyMid, b.skyMid, t),
    skyBot: lerpColor(a.skyBot, b.skyBot, t),
    sun: lerpColor(a.sun, b.sun, t),
    sunGlow: lerpColor(a.sunGlow, b.sunGlow, t),
    moon: lerpColor(a.moon, b.moon, t),
    ridgeFar: lerpColor(a.ridgeFar, b.ridgeFar, t),
    ridgeMid: lerpColor(a.ridgeMid, b.ridgeMid, t),
    ridgeNear: lerpColor(a.ridgeNear, b.ridgeNear, t),
    snow: lerpColor(a.snow, b.snow, t),
    trees: lerpColor(a.trees, b.trees, t),
    river: lerpColor(a.river, b.river, t),
    riverShine: lerpColor(a.riverShine, b.riverShine, t),
    tent: lerpColor(a.tent, b.tent, t),
    fire: lerpColor(a.fire, b.fire, t),
    fireGlow: lerp(a.fireGlow, b.fireGlow, t),
    stars: lerp(a.stars, b.stars, t),
    sunY: lerp(a.sunY, b.sunY, t),
    sunX: lerp(a.sunX, b.sunX, t),
    moonOpacity: lerp(a.moonOpacity, b.moonOpacity, t),
  };
}

const KEYFRAMES: { at: number; p: Palette }[] = [
  {
    at: 0,
    p: {
      skyTop: '#7a9ec4',
      skyMid: '#c9b8a8',
      skyBot: '#e8c9a8',
      sun: '#f4c27a',
      sunGlow: '#f7d9a8',
      moon: '#e8eef5',
      ridgeFar: '#8a9aab',
      ridgeMid: '#6f8496',
      ridgeNear: '#556b7a',
      snow: '#eef3f7',
      trees: '#3f5a4a',
      river: '#7aa0b8',
      riverShine: '#cfe3ef',
      tent: '#6b5a48',
      fire: '#f0a05a',
      fireGlow: 0.25,
      stars: 0.05,
      sunY: 62,
      sunX: 18,
      moonOpacity: 0.15,
    },
  },
  {
    at: 0.18,
    p: {
      skyTop: '#8eb8e0',
      skyMid: '#c5daf0',
      skyBot: '#e8f0f7',
      sun: '#ffe7a8',
      sunGlow: '#fff3cc',
      moon: '#e8eef5',
      ridgeFar: '#9aadc0',
      ridgeMid: '#7d93a6',
      ridgeNear: '#5f7688',
      snow: '#f4f7fa',
      trees: '#456351',
      river: '#6f9cb8',
      riverShine: '#d7ebf5',
      tent: '#6b5a48',
      fire: '#e89850',
      fireGlow: 0.08,
      stars: 0,
      sunY: 28,
      sunX: 42,
      moonOpacity: 0,
    },
  },
  {
    at: 0.42,
    p: {
      skyTop: '#6fa6d8',
      skyMid: '#a8cceb',
      skyBot: '#dceaf5',
      sun: '#fff0b0',
      sunGlow: '#fff8d8',
      moon: '#e8eef5',
      ridgeFar: '#8ea3b6',
      ridgeMid: '#71899c',
      ridgeNear: '#547084',
      snow: '#f2f6f9',
      trees: '#3d5c4c',
      river: '#5f93b2',
      riverShine: '#cfe6f2',
      tent: '#6b5a48',
      fire: '#e09048',
      fireGlow: 0.05,
      stars: 0,
      sunY: 18,
      sunX: 62,
      moonOpacity: 0,
    },
  },
  {
    at: 0.55,
    p: {
      skyTop: '#c48a6a',
      skyMid: '#e2b07a',
      skyBot: '#f0d0a0',
      sun: '#ffb060',
      sunGlow: '#ffd09a',
      moon: '#e8eef5',
      ridgeFar: '#8a7a72',
      ridgeMid: '#6f625c',
      ridgeNear: '#554a46',
      snow: '#efe8e0',
      trees: '#3a4f42',
      river: '#6a8898',
      riverShine: '#e0c9a8',
      tent: '#5f5040',
      fire: '#f0a050',
      fireGlow: 0.35,
      stars: 0.05,
      sunY: 48,
      sunX: 82,
      moonOpacity: 0.1,
    },
  },
  {
    at: 0.7,
    p: {
      skyTop: '#3a4560',
      skyMid: '#6a5a70',
      skyBot: '#9a7080',
      sun: '#e89870',
      sunGlow: '#d08060',
      moon: '#dce6f0',
      ridgeFar: '#4a5568',
      ridgeMid: '#3a4556',
      ridgeNear: '#2c3644',
      snow: '#c8d0d8',
      trees: '#24362c',
      river: '#3a5a6e',
      riverShine: '#6a8090',
      tent: '#3a3228',
      fire: '#ff9a40',
      fireGlow: 0.7,
      stars: 0.45,
      sunY: 78,
      sunX: 92,
      moonOpacity: 0.55,
    },
  },
  {
    at: 0.85,
    p: {
      skyTop: '#1a2238',
      skyMid: '#2a3348',
      skyBot: '#3a4058',
      sun: '#c07050',
      sunGlow: '#804030',
      moon: '#eef3f8',
      ridgeFar: '#2e3648',
      ridgeMid: '#242c3c',
      ridgeNear: '#1a2230',
      snow: '#a8b4c0',
      trees: '#1a2820',
      river: '#2a4558',
      riverShine: '#4a6880',
      tent: '#2a241c',
      fire: '#ff8a30',
      fireGlow: 0.9,
      stars: 0.95,
      sunY: 110,
      sunX: 98,
      moonOpacity: 0.85,
    },
  },
  {
    at: 1,
    p: {
      skyTop: '#7a9ec4',
      skyMid: '#c9b8a8',
      skyBot: '#e8c9a8',
      sun: '#f4c27a',
      sunGlow: '#f7d9a8',
      moon: '#e8eef5',
      ridgeFar: '#8a9aab',
      ridgeMid: '#6f8496',
      ridgeNear: '#556b7a',
      snow: '#eef3f7',
      trees: '#3f5a4a',
      river: '#7aa0b8',
      riverShine: '#cfe3ef',
      tent: '#6b5a48',
      fire: '#f0a05a',
      fireGlow: 0.25,
      stars: 0.05,
      sunY: 62,
      sunX: 18,
      moonOpacity: 0.15,
    },
  },
];

function paletteAt(phase: number): Palette {
  const t = ((phase % 1) + 1) % 1;
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1];
    if (t >= a.at && t <= b.at) {
      const u = (t - a.at) / (b.at - a.at || 1);
      return mixPalette(a.p, b.p, u);
    }
  }
  return KEYFRAMES[0].p;
}

function parseTodOverride(): number | null {
  try {
    const raw = new URLSearchParams(window.location.search).get('tod');
    if (!raw) return null;
    const key = raw.trim().toLowerCase() as TodKey;
    if (key in TOD_PHASE) return TOD_PHASE[key];
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.min(1, Math.max(0, n));
  } catch {
    /* ignore */
  }
  return null;
}

export function createCampingScene(root: HTMLElement, opts: { reducedMotion?: boolean } = {}): CampingHandle {
  const reduced =
    opts.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile =
    window.matchMedia('(max-width: 700px)').matches ||
    window.matchMedia('(pointer: coarse)').matches;
  const saveData =
    typeof navigator !== 'undefined' &&
    'connection' in navigator &&
    Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  const lowPower = reduced || isMobile || saveData;

  const freeze = parseTodOverride();
  const sky = root.querySelector('[data-camp-sky]') as HTMLElement | null;
  const sun = root.querySelector('[data-camp-sun]') as HTMLElement | null;
  const moon = root.querySelector('[data-camp-moon]') as HTMLElement | null;
  const stars = root.querySelector('[data-camp-stars]') as HTMLElement | null;
  const ridgeFar = root.querySelector('[data-camp-ridge-far]') as HTMLElement | null;
  const ridgeMid = root.querySelector('[data-camp-ridge-mid]') as HTMLElement | null;
  const ridgeNear = root.querySelector('[data-camp-ridge-near]') as HTMLElement | null;
  const trees = root.querySelector('[data-camp-trees]') as HTMLElement | null;
  const river = root.querySelector('[data-camp-river]') as HTMLElement | null;
  const riverShine = root.querySelector('[data-camp-river-shine]') as SVGElement | null;
  const camp = root.querySelector('.avail-camp-camp') as HTMLElement | null;
  const fire = root.querySelector('[data-camp-fire]') as HTMLElement | null;
  const fireGlow = root.querySelector('[data-camp-fire-glow]') as HTMLElement | null;

  let raf = 0;
  let running = true;
  let start = performance.now();
  let mx = 0;
  let my = 0;
  let tx = 0;
  let ty = 0;
  let flicker = 0;

  /** Static lighter scene on reduced-motion, low-power, or mobile (unless ?tod=). */
  const staticMode = reduced || (lowPower && freeze == null);
  const animate = !staticMode && freeze == null;
  const parallaxOn = animate && !lowPower;

  const apply = (p: Palette, parallaxX: number, parallaxY: number) => {
    if (sky) {
      sky.style.background = `linear-gradient(180deg, ${p.skyTop} 0%, ${p.skyMid} 46%, ${p.skyBot} 100%)`;
    }
    if (sun) {
      sun.style.left = `${p.sunX}%`;
      sun.style.top = `${p.sunY}%`;
      sun.style.opacity = p.sunY > 95 ? '0' : '1';
      sun.style.background = `radial-gradient(circle, ${p.sun} 0%, ${p.sunGlow} 42%, transparent 70%)`;
      sun.style.transform = `translate3d(${parallaxX * 4}px, ${parallaxY * 2}px, 0)`;
    }
    if (moon) {
      moon.style.opacity = String(p.moonOpacity);
      moon.style.transform = `translate3d(${parallaxX * 3}px, ${parallaxY * 1.5}px, 0)`;
    }
    if (stars) stars.style.opacity = String(p.stars);
    const paintRidge = (el: HTMLElement | null, fill: string, depth: number) => {
      if (!el) return;
      el.style.color = fill;
      el.style.transform = `translate3d(${parallaxX * depth}px, ${parallaxY * depth * 0.35}px, 0)`;
    };
    paintRidge(ridgeFar, p.ridgeFar, 6);
    paintRidge(ridgeMid, p.ridgeMid, 12);
    paintRidge(ridgeNear, p.ridgeNear, 20);
    if (trees) {
      trees.style.color = p.trees;
      trees.style.transform = `translate3d(${parallaxX * 28}px, ${parallaxY * 8}px, 0)`;
    }
    if (river) {
      river.style.color = p.river;
      river.style.transform = `translate3d(${parallaxX * 22}px, ${parallaxY * 6}px, 0)`;
    }
    if (riverShine) {
      riverShine.style.stroke = p.riverShine;
      riverShine.style.opacity = String(0.35 + p.stars * 0.15);
    }
    if (camp) {
      camp.style.color = p.tent;
      camp.style.transform = `translate3d(${parallaxX * 30}px, ${parallaxY * 10}px, 0)`;
    }
    if (fire) fire.style.color = p.fire;
    if (fireGlow) {
      const pulse = animate ? 0.85 + Math.sin(flicker) * 0.15 : 1;
      fireGlow.style.opacity = String(p.fireGlow * pulse);
      fireGlow.style.transform = `scale(${0.95 + p.fireGlow * 0.2})`;
    }
    root.style.setProperty('--camp-snow', p.snow);
    root.dataset.campPhase =
      p.stars > 0.55 ? 'night' : p.sunY > 45 && p.sunX > 70 ? 'golden' : p.sunY < 35 ? 'day' : 'dawn';
  };

  const tick = (now: number) => {
    if (!running) return;
    const elapsed = now - start;
    const phase = (elapsed % CYCLE_MS) / CYCLE_MS;
    if (parallaxOn) {
      tx = lerp(tx, mx, 0.06);
      ty = lerp(ty, my, 0.06);
    } else {
      tx = 0;
      ty = 0;
    }
    flicker = now / 180;
    apply(paletteAt(phase), tx, ty);
    raf = requestAnimationFrame(tick);
  };

  const onMove = (e: PointerEvent) => {
    if (!parallaxOn) return;
    const r = root.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    my = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };

  const onVisibility = () => {
    if (!animate) return;
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else {
      running = true;
      start = performance.now() - ((performance.now() - start) % CYCLE_MS);
      raf = requestAnimationFrame(tick);
    }
  };

  root.classList.add('is-ready');
  if (!animate) {
    apply(paletteAt(freeze ?? TOD_PHASE.golden), 0, 0);
  } else {
    raf = requestAnimationFrame(tick);
  }

  if (parallaxOn) {
    window.addEventListener('pointermove', onMove, { passive: true });
  }
  if (animate) {
    document.addEventListener('visibilitychange', onVisibility);
  }

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
