// OCM Filmes — abertura: "O Cronista Mentiroso"
// Fantasia épica + console: toque para começar, túnel de luz, anel de runas, título dourado e a crônica do dia.
// A trilha é original e sintetizada aqui mesmo (Web Audio), sem arquivo de áudio.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- runas desenhadas à mão (caixa 8×14) ---------- */
const RUNAS = {
  O: [[[4, 0], [7.5, 4], [1, 14]], [[4, 0], [0.5, 4], [7, 14]]],
  C: [[[7, 2], [1, 7], [7, 12]]],
  M: [[[1, 0], [1, 14]], [[7, 0], [7, 14]], [[1, 0], [7, 6]], [[7, 0], [1, 6]]],
  F: [[[2, 0], [2, 14]], [[2, 4], [7, 0]], [[2, 8], [7, 4]]],
  I: [[[4, 0], [4, 14]]],
  L: [[[2, 0], [2, 14]], [[2, 0], [7, 4]]],
  E: [[[1, 0], [1, 14]], [[7, 0], [7, 14]], [[1, 0], [4, 5], [7, 0]]],
  S: [[[6, 0], [2, 5], [6, 9], [2, 14]]],
  R: [[[2, 0], [2, 14]], [[2, 0], [7, 3.5], [2, 7], [7, 14]]],
  N: [[[4, 0], [4, 14]], [[1, 5], [7, 9]]],
  T: [[[4, 0], [4, 14]], [[0.5, 4], [4, 0], [7.5, 4]]],
  A: [[[2, 0], [2, 14]], [[2, 0], [7, 4]], [[2, 4], [7, 8]]],
  '✦': [[[4, 5], [6, 7], [4, 9], [2, 7], [4, 5]]],
};
function anelSVG() {
  const frase = 'OCM FILMES ✦ O CRONISTA MENTIROSO ✦ ';
  const passo = 360 / frase.length;
  let runas = '';
  [...frase].forEach((ch, i) => {
    const r = RUNAS[ch];
    if (!r) return;
    const linhas = r.map((p) => `<polyline points="${p.map((q) => q.join(',')).join(' ')}"/>`).join('');
    runas += `<g class="runa" style="--i:${i}" transform="rotate(${(i * passo).toFixed(2)} 200 200) translate(194.8 13) scale(1.3)">${linhas}</g>`;
  });
  const marcas = [0, 90, 180, 270].map((a) => `<path class="m" transform="rotate(${a} 200 200)" d="M200 32 l4 6 -4 6 -4 -6z"/>`).join('');
  return `<svg class="ab-anel" viewBox="0 0 400 400" aria-hidden="true">
    <g class="ab-giro">
      <circle class="c" cx="200" cy="200" r="162" pathLength="1"/>
      <circle class="c c2" cx="200" cy="200" r="150" pathLength="1"/>
      ${marcas}
      ${runas}
    </g>
  </svg>`;
}

/* ---------- trilha (Web Audio) ---------- */
function trilha() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.4;
  master.connect(comp).connect(ctx.destination);

  // salão de pedra: reverb gerado
  const rev = ctx.createConvolver();
  const n = Math.floor(ctx.sampleRate * 4.6), imp = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.4); }
  rev.buffer = imp;
  const revG = ctx.createGain(); revG.gain.value = 0.62; rev.connect(revG).connect(master);
  const seco = ctx.createGain(); seco.gain.value = 0.85; seco.connect(master);
  const bus = (molhado = 0.5) => { const g = ctx.createGain(), w = ctx.createGain(); w.gain.value = molhado; g.connect(seco); g.connect(w); w.connect(rev); return g; };

  const ruido = (() => { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
  const env = (g, t, a, pico, sus, fim, rel) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + a);
    g.gain.setValueAtTime(pico, Math.max(t + a, fim - 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, fim + rel);
  };

  function cordas(freqs, t, dur, vol = 0.05, brilho = 1500) {
    const out = bus(0.55);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.7;
    f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(brilho, t + dur * 0.7);
    f.connect(out);
    for (const fr of freqs) for (const det of [-9, 7]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = det;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 4.6 + Math.random(); lg.gain.value = 4; lfo.connect(lg).connect(o.detune);
      env(g, t, 0.7, vol, vol, t + dur, 1.6);
      o.connect(g).connect(f); o.start(t); lfo.start(t); o.stop(t + dur + 1.8); lfo.stop(t + dur + 1.8);
    }
  }
  function coro(freqs, t, dur, vol = 0.05) {
    const out = bus(0.75);
    const formantes = [[730, 1], [1090, 0.5], [2440, 0.18]];
    const soma = ctx.createGain(); soma.gain.value = 1;
    for (const [fq, gq] of formantes) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = 7; const gg = ctx.createGain(); gg.gain.value = gq * 3; soma.connect(bp).connect(gg).connect(out); }
    for (const fr of freqs) for (const det of [-12, 0, 11]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = det;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.2; lg.gain.value = 7; lfo.connect(lg).connect(o.detune);
      env(g, t, 1.1, vol, vol, t + dur, 2);
      o.connect(g).connect(soma); o.start(t); lfo.start(t); o.stop(t + dur + 2.2); lfo.stop(t + dur + 2.2);
    }
  }
  function tambor(t, vol = 0.9) {
    const out = bus(0.5);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(96, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(g).connect(out); o.start(t); o.stop(t + 2.5);
    const r = ctx.createBufferSource(), rf = ctx.createBiquadFilter(), rg = ctx.createGain();
    r.buffer = ruido; rf.type = 'lowpass'; rf.frequency.value = 500;
    rg.gain.setValueAtTime(vol * 0.5, t); rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    r.connect(rf).connect(rg).connect(out); r.start(t); r.stop(t + 0.4);
  }
  function sino(fr, t, vol = 0.06) {
    const out = bus(0.85);
    [[1, 3.2, 1], [2.76, 1.6, 0.45], [5.4, 0.9, 0.25], [8.93, 0.45, 0.12]].forEach(([m, d, a]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = fr * m;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * a, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.05);
    });
  }
  function vento(t, dur, vol = 0.18) {
    const out = bus(0.6);
    const r = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    r.buffer = ruido; r.loop = true; f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(180, t); f.frequency.exponentialRampToValueAtTime(3800, t + dur * 0.55); f.frequency.exponentialRampToValueAtTime(400, t + dur);
    env(g, t, dur * 0.5, vol, vol, t + dur * 0.55, dur * 0.45);
    r.connect(f).connect(g).connect(out); r.start(t); r.stop(t + dur + 0.1);
  }
  function grave(t, dur) {
    const out = bus(0.3);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; f.connect(out);
    for (const fr of [36.71, 73.42, 110]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = fr;
      env(g, t, 1.5, fr < 50 ? 0.12 : 0.06, 0, t + dur, 2.5);
      o.connect(g).connect(f); o.start(t); o.stop(t + dur + 2.6);
    }
  }
  // flauta: uma voz, legato, vibrato que entra depois
  function flauta(notas, t) {
    const out = bus(0.7);
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
    o.type = 'sine'; o2.type = 'triangle'; g2.gain.value = 0.18;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.4; lg.gain.value = 0; lfo.connect(lg); lg.connect(o.detune); lg.connect(o2.detune);
    o.connect(g); o2.connect(g2).connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t);
    let tt = t;
    for (const [fr, d] of notas) {
      o.frequency.setTargetAtTime(fr, tt, 0.018); o2.frequency.setTargetAtTime(fr, tt, 0.018);
      g.gain.setTargetAtTime(0.11, tt, 0.04);
      lg.gain.setValueAtTime(0, tt); lg.gain.linearRampToValueAtTime(d > 0.5 ? 16 : 6, tt + Math.min(d, 0.6));
      g.gain.setTargetAtTime(0.085, tt + d * 0.6, 0.08);
      tt += d;
    }
    g.gain.setTargetAtTime(0.0001, tt - 0.2, 0.35);
    o.start(t); o2.start(t); lfo.start(t); o.stop(tt + 2); o2.stop(tt + 2); lfo.stop(tt + 2);
  }

  const N = { D2: 73.42, Bb2: 116.54, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, Bb3: 233.08, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, A5: 880, D6: 1174.66, E6: 1318.51, F6: 1396.91, A6: 1760, D7: 2349.32 };

  function tocar() {
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + 0.05;
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.9, t + 0.5);
    // 1. abertura: vento e brilho de console
    vento(t, 2.2);
    grave(t + 0.1, 11);
    [N.D5, N.A5, N.D6, N.E6, N.F6, N.A6].forEach((f, i) => sino(f, t + 0.25 + i * 0.085, 0.07));
    sino(N.D7, t + 0.85, 0.03);
    // 2. cordas sobem: Rém → Si♭
    cordas([N.D3, N.F3, N.A3, N.D4], t + 1.2, 1.4, 0.035, 1100);
    cordas([N.Bb2, N.D3, N.F3, N.Bb3, N.D4], t + 2.6, 1.2, 0.042, 1700);
    tambor(t + 3.45, 0.25); tambor(t + 3.62, 0.35);
    // 3. título: Fá maior, tambor, coro
    tambor(t + 3.8, 1);
    cordas([N.F3 / 2, N.C3, N.F3, N.A3, N.C4], t + 3.8, 2.2, 0.05, 2400);
    coro([N.F4, N.A4, N.C5], t + 3.8, 2.2, 0.03);
    // tema na flauta (original, modo dórico)
    flauta([[N.A4, 0.35], [N.D5, 0.35], [N.E5, 0.35], [N.F5, 1.25], [N.E5, 0.3], [N.D5, 0.3], [N.C5, 0.35], [N.E5, 0.3], [N.D5, 2.6]], t + 4.4);
    // 4. Dó maior → Rém final
    cordas([N.C3, N.E3, N.G3, N.C4, N.E4], t + 6.0, 1.6, 0.045, 2000);
    coro([N.G4, N.C5, N.E5 / 2 * 2], t + 6.0, 1.6, 0.026);
    tambor(t + 7.6, 0.6);
    cordas([N.D3, N.A3, N.D4, N.F4, N.A4], t + 7.6, 4.2, 0.045, 1600);
    coro([N.D5 / 2, N.F4, N.A4], t + 7.6, 4.2, 0.03);
    sino(N.D6, t + 7.6, 0.035); sino(N.A6, t + 7.75, 0.02);
    master.gain.setValueAtTime(0.9, t + 11);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 14);
  }
  function parar() {
    try {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
      master.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      setTimeout(() => ctx.close().catch(() => {}), 1500);
    } catch { /* já fechado */ }
  }
  return { tocar, parar, ctx };
}

/* ---------- cena (canvas): túnel de luz, cacos de vidro e brasas ---------- */
function cena(cv) {
  const c = cv.getContext('2d');
  let w = 0, h = 0;
  const caber = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  caber(); addEventListener('resize', caber);
  const sp = document.createElement('canvas'); sp.width = sp.height = 64;
  const s = sp.getContext('2d'), g = s.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,244,220,1)'); g.addColorStop(0.22, 'rgba(255,196,120,.85)'); g.addColorStop(1, 'rgba(255,130,50,0)');
  s.fillStyle = g; s.fillRect(0, 0, 64, 64);

  const rnd = Math.random;
  const novaBrasa = (meio) => ({ x: rnd(), y: meio ? rnd() : 1.05, v: 0.0005 + rnd() * 0.0016, s: 1 + rnd() * 3.4, f: rnd() * 6.28, a: 0.3 + rnd() * 0.7, dx: (rnd() - 0.5) * 0.0004 });
  const brasas = Array.from({ length: 60 }, () => novaBrasa(true));
  const estrelas = Array.from({ length: 150 }, () => ({ x: (rnd() - 0.5) * 2, y: (rnd() - 0.5) * 2, z: rnd() + 0.05, q: rnd() }));
  const cacos = Array.from({ length: 7 }, (_, i) => ({ x: (rnd() - 0.5) * 1.8, y: (rnd() - 0.5) * 1.5, z: 0.6 + rnd() * 1.2, r: rnd() * 6.28, vr: (rnd() - 0.5) * 0.005, n: 3 + (i % 2), tam: 50 + rnd() * 90 }));
  let raf = 0, ativo = false, t0 = 0, ult = performance.now();

  function quadro(agora) {
    const dt = Math.min(50, agora - ult) / 16.67; ult = agora;
    const t = ativo ? (agora - t0) / 1000 : 0;
    c.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, f = Math.min(w, h) * 0.55;
    const vel = !ativo ? 0.0012 : t < 2 ? 0.05 * Math.pow(1 - t / 2, 2) + 0.0022 : 0.0022;
    c.globalCompositeOperation = 'lighter';
    for (const e of estrelas) {
      const pz = e.z; e.z -= vel * dt;
      if (e.z <= 0.04) { e.z = 1.05; e.x = (rnd() - 0.5) * 2; e.y = (rnd() - 0.5) * 2; continue; }
      const x = cx + (e.x / e.z) * f, y = cy + (e.y / e.z) * f, px = cx + (e.x / pz) * f, py = cy + (e.y / pz) * f;
      const al = Math.min(1, 1.05 - e.z) * 0.85;
      c.strokeStyle = e.q > 0.7 ? `rgba(170,200,255,${al})` : `rgba(255,214,160,${al})`;
      c.lineWidth = Math.max(0.5, 1.8 * (1 - e.z));
      c.beginPath(); c.moveTo(px, py); c.lineTo(x + 0.01, y); c.stroke();
    }
    for (const k of cacos) {
      k.r += k.vr * dt; k.z -= vel * 0.3 * dt; if (k.z < 0.35) k.z = 1.9;
      const x = cx + (k.x / k.z) * f * 0.6, y = cy + (k.y / k.z) * f * 0.6, R = (k.tam / k.z) * 0.5;
      c.beginPath();
      for (let i = 0; i < k.n; i++) { const a = k.r + (i * 6.283) / k.n; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * R, y + Math.sin(a) * R * 0.85); }
      c.closePath(); c.fillStyle = 'rgba(110,140,210,.03)'; c.fill(); c.strokeStyle = 'rgba(190,210,255,.09)'; c.lineWidth = 1; c.stroke();
    }
    for (const b of brasas) {
      b.y -= b.v * dt * (ativo ? 1.5 : 1); b.x += b.dx * dt + Math.sin(agora / 900 + b.f) * 0.0003;
      if (b.y < -0.05) Object.assign(b, novaBrasa(false));
      const fl = 0.6 + 0.4 * Math.sin(agora / 170 + b.f * 3), S = b.s * 4;
      c.globalAlpha = b.a * fl * (ativo ? 1 : 0.45);
      c.drawImage(sp, b.x * w - S / 2, b.y * h - S / 2, S, S);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(quadro);
  }
  raf = requestAnimationFrame(quadro);
  return {
    comecar() { ativo = true; t0 = performance.now(); },
    parar() { cancelAnimationFrame(raf); removeEventListener('resize', caber); },
  };
}

/* ---------- montagem ---------- */
export function abertura({ dt, ola, linhas }) {
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let som = true;
  try { som = localStorage.getItem('ocm-som') !== '0'; } catch { /* sem storage */ }

  const el = document.createElement('div');
  el.className = 'ab' + (calmo ? ' on fim pulou' : '');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Abertura e resumo do dia');
  el.innerHTML = `
    <div class="ab-nevoa"></div>
    <canvas></canvas>
    <div class="ab-flare"></div>
    <div class="ab-palco">
      ${anelSVG()}
      <div class="ab-titulo">
        <h1>OCM</h1>
        <div class="ab-filmes">Filmes</div>
        <div class="ab-sub">O Cronista Mentiroso</div>
      </div>
    </div>
    <div class="ab-luz"></div>
    <div class="ab-veu"></div>
    <div class="ab-grao"></div>
    <div class="ab-porta">
      <div class="ab-brasa"></div>
      <div class="ab-press">Toque para começar</div>
      <button type="button" class="ab-som">${som ? '♪ som ligado' : '♪ som desligado'}</button>
    </div>
    <div class="ab-cronica">
      <div class="ab-cab l" style="--d:0"><b>Crônica do dia</b><span>${esc(ola)} · ${esc(dt)}</span></div>
      ${linhas.map(([a, b], i) => `<div class="ab-it l" style="--d:${i + 1}"><b>${esc(a)}</b>${b ? `<small>${esc(b)}</small>` : ''}</div>`).join('')}
      <div class="ab-entrar l" style="--d:${linhas.length + 2}">Toque para entrar</div>
    </div>
    <button type="button" class="ab-pular">pular</button>`;
  document.body.appendChild(el);

  const cv = calmo ? null : cena(el.querySelector('canvas'));
  let musica = null, fase = calmo ? 2 : 0, saiu = false;
  const timers = [];

  const sair = () => {
    if (saiu) return; saiu = true;
    timers.forEach(clearTimeout);
    musica?.parar();
    el.classList.add('saindo');
    setTimeout(() => { cv?.parar(); el.remove(); }, 950);
  };
  const cronica = (pulou) => {
    if (fase >= 2) return; fase = 2;
    el.classList.add('fim'); if (pulou) el.classList.add('pulou');
    timers.push(setTimeout(sair, 9000 + linhas.length * 600));
  };
  const comecar = () => {
    fase = 1;
    if (som) { try { musica = trilha(); musica?.tocar(); } catch { musica = null; } }
    cv?.comecar();
    el.classList.add('on');
    timers.push(setTimeout(() => cronica(false), 7400));
  };

  el.querySelector('.ab-som').addEventListener('click', (e) => {
    e.stopPropagation();
    som = !som;
    try { localStorage.setItem('ocm-som', som ? '1' : '0'); } catch { /* ok */ }
    e.currentTarget.textContent = som ? '♪ som ligado' : '♪ som desligado';
  });
  el.querySelector('.ab-pular').addEventListener('click', (e) => { e.stopPropagation(); sair(); });
  el.addEventListener('click', () => {
    if (fase === 0) comecar();
    else if (fase === 1) cronica(true);
    else sair();
  });
}
