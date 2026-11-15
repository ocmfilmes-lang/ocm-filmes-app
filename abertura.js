// OCM Filmes — abertura: "O Cronista Mentiroso"
// Fantasia épica: fumaça, runas em brasa, título dourado e a crônica do dia.
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

/* ---------- trilha orquestral (Web Audio) ----------
   Composição original no espírito das trilhas épicas de fantasia:
   cordas graves em ostinato, trompas, coro masculino, tímpanos e tutti final em Ré maior. */
function trilha() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 3.5; comp.attack.value = 0.02; comp.release.value = 0.5;
  master.connect(comp).connect(ctx.destination);

  // salão grande: reverb longo gerado
  const rev = ctx.createConvolver();
  const n = Math.floor(ctx.sampleRate * 5.5), imp = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.8) * (i < 300 ? i / 300 : 1); }
  rev.buffer = imp;
  const revG = ctx.createGain(); revG.gain.value = 0.7; rev.connect(revG).connect(master);
  const seco = ctx.createGain(); seco.gain.value = 0.8; seco.connect(master);
  const bus = (molhado = 0.5) => { const g = ctx.createGain(), w = ctx.createGain(); w.gain.value = molhado; g.connect(seco); g.connect(w); w.connect(rev); return g; };
  const ruido = (() => { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
  const env = (g, t, a, pico, fim, rel) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + a);
    g.gain.setValueAtTime(pico, Math.max(t + a, fim - 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, fim + rel);
  };
  const voz = (tipo, fr, det, t, fim, alvo) => {
    const o = ctx.createOscillator(); o.type = tipo; o.frequency.value = fr; o.detune.value = det;
    o.connect(alvo); o.start(t); o.stop(fim); return o;
  };

  // cordas sustentadas (naipe)
  function cordas(freqs, t, dur, vol = 0.04, brilho = 1400, ataque = 0.8) {
    const out = bus(0.6);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.6;
    f.frequency.setValueAtTime(450, t); f.frequency.linearRampToValueAtTime(brilho, t + dur * 0.6); f.connect(out);
    for (const fr of freqs) for (const det of [-11, -3, 8]) {
      const g = ctx.createGain(); g.connect(f);
      const o = voz('sawtooth', fr, det, t, t + dur + 2, g);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 4.8 + Math.random() * 0.8; lg.gain.value = 5; lfo.connect(lg).connect(o.detune); lfo.start(t); lfo.stop(t + dur + 2);
      env(g, t, ataque, vol / 1.6, t + dur, 1.8);
    }
  }
  // violoncelos e contrabaixos em ostinato (colcheias com acento)
  function ostinato(notas, t, passo, vezes, v0, v1) {
    const out = bus(0.45);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1100; f.Q.value = 0.8; f.connect(out);
    for (let i = 0; i < vezes; i++) {
      const fr = notas[i % notas.length], tt = t + i * passo, v = (v0 + (v1 - v0) * (i / vezes)) * (i % 4 === 0 ? 1.35 : 1);
      for (const [mult, det] of [[1, -6], [1, 7], [0.5, 0]]) {
        const g = ctx.createGain(); g.connect(f);
        voz('sawtooth', fr * mult, det, tt, tt + passo + 0.3, g);
        g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(v, tt + 0.025);
        g.gain.exponentialRampToValueAtTime(v * 0.5, tt + passo * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, tt + passo + 0.25);
      }
    }
  }
  // trompas: linha melódica legato, som de metal que abre
  function trompas(notas, t, vol = 0.07, oitava = true) {
    const out = bus(0.7);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.2; f.connect(out);
    const g = ctx.createGain(); g.connect(f); g.gain.setValueAtTime(0.0001, t);
    const vozes = [voz('sawtooth', notas[0][0], -7, t, t + 30, g), voz('sawtooth', notas[0][0], 6, t, t + 30, g)];
    if (oitava) { const g2 = ctx.createGain(); g2.gain.value = 0.5; g2.connect(g); vozes.push(voz('triangle', notas[0][0] / 2, 0, t, t + 30, g2)); }
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5; lg.gain.value = 3; lfo.connect(lg); vozes.forEach((o) => lg.connect(o.detune)); lfo.start(t);
    let tt = t;
    for (const [fr, d, forte = 1] of notas) {
      vozes.forEach((o, i) => o.frequency.setTargetAtTime(i === 2 ? fr / 2 : fr, tt, 0.03));
      g.gain.setTargetAtTime(vol * forte, tt, 0.07);
      f.frequency.setTargetAtTime(700, tt, 0.01); f.frequency.setTargetAtTime(1500 + 700 * forte, tt + 0.03, 0.12);
      f.frequency.setTargetAtTime(1000, tt + d * 0.6, 0.3);
      tt += d;
    }
    g.gain.setTargetAtTime(0.0001, tt - 0.15, 0.4);
    vozes.forEach((o) => o.stop(tt + 2.5)); lfo.stop(tt + 2.5);
  }
  // metais graves (trombones/tubas) em acorde
  function metais(freqs, t, dur, vol = 0.05) {
    const out = bus(0.6);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.5; f.connect(out);
    f.frequency.setValueAtTime(350, t); f.frequency.exponentialRampToValueAtTime(1700, t + 0.35); f.frequency.exponentialRampToValueAtTime(900, t + dur);
    for (const fr of freqs) for (const det of [-5, 5]) { const g = ctx.createGain(); g.connect(f); voz('sawtooth', fr, det, t, t + dur + 2, g); env(g, t, 0.18, vol / 1.4, t + dur, 1.4); }
  }
  // coro: vogal "a" (graves) ou "o" (agudas)
  function coro(freqs, t, dur, vol = 0.04, agudo = false) {
    const out = bus(0.8);
    const forms = agudo ? [[500, 1], [900, 0.4], [2800, 0.1]] : [[620, 1], [1050, 0.45], [2500, 0.14]];
    const soma = ctx.createGain();
    for (const [fq, gq] of forms) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = 6; const gg = ctx.createGain(); gg.gain.value = gq * 3.2; soma.connect(bp).connect(gg).connect(out); }
    for (const fr of freqs) for (const det of [-14, -4, 5, 13]) {
      const g = ctx.createGain(); g.connect(soma);
      const o = voz('sawtooth', fr, det, t, t + dur + 2.6, g);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 4.5 + Math.random(); lg.gain.value = 9; lfo.connect(lg).connect(o.detune); lfo.start(t); lfo.stop(t + dur + 2.6);
      env(g, t, Math.min(1.4, dur * 0.4), vol / 2, t + dur, 2.2);
    }
  }
  function timpano(t, vol = 0.9, fr = 73.4) {
    const out = bus(0.55);
    const g = ctx.createGain(); g.connect(out);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(fr * 1.5, t); o.frequency.exponentialRampToValueAtTime(fr, t + 0.12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    o.connect(g); o.start(t); o.stop(t + 2.3);
    const r = ctx.createBufferSource(), rf = ctx.createBiquadFilter(), rg = ctx.createGain();
    r.buffer = ruido; rf.type = 'lowpass'; rf.frequency.value = 700;
    rg.gain.setValueAtTime(vol * 0.45, t); rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    r.connect(rf).connect(rg).connect(out); r.start(t); r.stop(t + 0.3);
  }
  function rufo(t0, t1, v0 = 0.04, v1 = 0.4) {
    for (let tt = t0, i = 0; tt < t1; tt += 0.065, i++) timpano(tt, v0 + (v1 - v0) * ((tt - t0) / (t1 - t0)), i % 2 ? 73.4 : 72.6);
  }
  function prato(t, sobe, vol = 0.12) {
    const out = bus(0.7);
    const r = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    r.buffer = ruido; r.loop = true; f.type = 'highpass'; f.frequency.value = 5000;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * 0.6, t + sobe);
    g.gain.exponentialRampToValueAtTime(vol, t + sobe + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + sobe + 3.5);
    r.connect(f).connect(g).connect(out); r.start(t); r.stop(t + sobe + 3.6);
  }
  function grave(t, dur, fr = 36.71) {
    const out = bus(0.35);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220; f.connect(out);
    for (const m of [1, 2]) { const g = ctx.createGain(); g.connect(f); voz('sawtooth', fr * m, m === 1 ? 0 : 4, t, t + dur + 3, g); env(g, t, 2, m === 1 ? 0.13 : 0.07, t + dur, 2.5); }
  }

  const N = { D2: 73.42, F2: 87.31, A2: 110, Bb1: 58.27, Bb2: 116.54, C2: 65.41, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, Fs3: 185, G3: 196, A3: 220, Bb3: 233.08, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392, A4: 440, Bb4: 466.16, C5: 523.25, D5: 587.33, E5: 659.25, Fs5: 739.99, A5: 880 };

  function tocar() {
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + 0.05;
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.95, t + 1.2);
    // 1. escuridão: pedal grave, rufo distante, ostinato que nasce
    grave(t, 7);
    rufo(t + 0.1, t + 1.6, 0.02, 0.12);
    ostinato([N.D3, N.A2, N.F3 / 2 * 2, N.A2, N.D3, N.A2, N.E3, N.A2], t + 0.6, 0.24, 27, 0.03, 0.075);
    cordas([N.D3, N.A3], t + 0.4, 6.6, 0.03, 900, 2);
    // 2. tema nas trompas (original)
    trompas([[N.D4, 0.95], [N.F4, 0.48], [N.E4, 0.48], [N.D4, 0.48], [N.A3, 1.2, 1.15], [N.C4, 0.48], [N.Bb3, 0.48], [N.A3, 0.48], [N.D4, 1.1, 1.2]], t + 1.3, 0.06);
    coro([N.D3, N.A3], t + 2.8, 4.2, 0.035);
    cordas([N.Bb2, N.F3, N.Bb3, N.D4], t + 4.9, 2.2, 0.035, 1600, 1);
    coro([N.Bb2 * 2, N.D3 * 2 / 2 * 1, N.F3], t + 4.9, 2.2, 0.03);
    // 3. subida ao título
    rufo(t + 5.7, t + 7.15, 0.06, 0.55);
    prato(t + 5.6, 1.6, 0.1);
    trompas([[N.A3, 0.5], [N.Bb3, 0.5], [N.C4, 0.45, 1.2]], t + 5.7, 0.06, true);
    // 4. TUTTI no título (Ré menor)
    const T = t + 7.2;
    timpano(T, 1); timpano(T, 0.7, 36.7);
    metais([N.D2, N.A2, N.D3, N.F3], T, 1.7, 0.06);
    cordas([N.D3, N.F3, N.A3, N.D4, N.F4, N.A4], T, 1.7, 0.045, 2600, 0.08);
    coro([N.D3, N.F3, N.A3, N.D4], T, 1.7, 0.045);
    coro([N.A4, N.D5], T, 1.7, 0.03, true);
    trompas([[N.A4, 0.38, 1.3], [N.D5, 0.38, 1.3], [N.C5, 0.38, 1.2], [N.A4, 0.9, 1.25]], T, 0.055, false);
    // 5. Si♭ → Dó → Ré maior (fim luminoso)
    timpano(T + 2.0, 0.55);
    metais([N.Bb1 * 2, N.F2, N.Bb2, N.D3], T + 2.0, 1.3, 0.05);
    cordas([N.Bb2, N.F3, N.Bb3, N.D4, N.F4], T + 2.0, 1.3, 0.04, 2200, 0.15);
    coro([N.F3, N.Bb3, N.D4], T + 2.0, 1.3, 0.04);
    timpano(T + 3.3, 0.6, 65.4);
    metais([N.C2 * 2, N.G3 / 2, N.C3, N.E3], T + 3.3, 1.3, 0.05);
    cordas([N.C3, N.G3, N.C4, N.E4, N.G4], T + 3.3, 1.3, 0.04, 2400, 0.15);
    coro([N.E3, N.G3, N.C4], T + 3.3, 1.3, 0.04);
    trompas([[N.G4, 0.65, 1.1], [N.E4, 0.65, 1.1]], T + 3.3, 0.05, false);
    const F = T + 4.6;
    timpano(F, 0.95); timpano(F, 0.6, 36.7); prato(F - 0.6, 0.6, 0.09);
    grave(F, 4.2);
    metais([N.D2, N.A2, N.D3, N.Fs3, N.A3], F, 4.2, 0.05);
    cordas([N.D3, N.A3, N.D4, N.Fs4, N.A4, N.D5], F, 4.5, 0.045, 2200, 0.2);
    coro([N.D3, N.Fs3, N.A3, N.D4], F, 4.5, 0.045);
    coro([N.Fs4, N.A4, N.D5], F + 0.3, 4.2, 0.03, true);
    trompas([[N.D4, 0.5, 1.2], [N.Fs4, 0.5, 1.2], [N.A4, 2.6, 1.3]], F, 0.055);
    master.gain.setValueAtTime(0.95, F + 4.2);
    master.gain.exponentialRampToValueAtTime(0.0001, F + 7.5);
  }
  function parar() {
    try {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
      master.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      setTimeout(() => ctx.close().catch(() => {}), 1700);
    } catch { /* já fechado */ }
  }
  return { tocar, parar, ctx };
}

/* ---------- cena (canvas): fumaça que escorre e brasas ---------- */
function cena(cv) {
  const c = cv.getContext('2d');
  let w = 0, h = 0;
  const caber = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  caber(); addEventListener('resize', caber);
  const sprite = (cores) => { const k = document.createElement('canvas'); k.width = k.height = 128; const s = k.getContext('2d'), g = s.createRadialGradient(64, 64, 0, 64, 64, 64); cores.forEach(([p, col]) => g.addColorStop(p, col)); s.fillStyle = g; s.fillRect(0, 0, 128, 128); return k; };
  const fumo = sprite([[0, 'rgba(150,135,115,.55)'], [0.45, 'rgba(110,98,85,.22)'], [1, 'rgba(80,70,60,0)']]);
  const brilho = sprite([[0, 'rgba(255,240,210,1)'], [0.2, 'rgba(255,150,60,.85)'], [1, 'rgba(200,60,10,0)']]);
  const rnd = Math.random;
  const nuvens = Array.from({ length: 16 }, () => ({ x: rnd(), y: 0.25 + rnd() * 0.9, r: 0.35 + rnd() * 0.55, vx: (rnd() - 0.5) * 0.00018, vy: -0.00004 - rnd() * 0.00008, a: 0.25 + rnd() * 0.45, rot: rnd() * 6.28 }));
  const novaBrasa = (meio) => ({ x: 0.15 + rnd() * 0.7, y: meio ? rnd() : 1.05, v: 0.0004 + rnd() * 0.0009, s: 1 + rnd() * 2.6, f: rnd() * 6.28, a: 0.35 + rnd() * 0.65 });
  const brasas = Array.from({ length: 34 }, () => novaBrasa(true));
  let raf = 0, ativo = false, t0 = 0, ult = performance.now();
  function quadro(agora) {
    const dt = Math.min(50, agora - ult) / 16.67; ult = agora;
    const t = ativo ? (agora - t0) / 1000 : 0;
    c.clearRect(0, 0, w, h);
    const m = Math.max(w, h);
    const forca = !ativo ? 0.35 : Math.min(1, 0.35 + t / 4) * (t > 7.2 && t < 9 ? 1 + 0.5 * (1 - (t - 7.2) / 1.8) : 1);
    for (const n of nuvens) {
      n.x += n.vx * dt; n.y += n.vy * dt; n.rot += 0.0004 * dt;
      if (n.y < -0.3) { n.y = 1.3; n.x = rnd(); }
      if (n.x < -0.4) n.x = 1.4; if (n.x > 1.4) n.x = -0.4;
      const R = n.r * m;
      c.globalAlpha = n.a * 0.34 * forca;
      c.save(); c.translate(n.x * w, n.y * h); c.rotate(n.rot); c.scale(1.6, 1); c.drawImage(fumo, -R / 2, -R / 2, R, R); c.restore();
    }
    c.globalCompositeOperation = 'lighter';
    for (const b of brasas) {
      b.y -= b.v * dt; b.x += Math.sin(agora / 1100 + b.f) * 0.00035;
      if (b.y < -0.05) Object.assign(b, novaBrasa(false));
      const fl = 0.55 + 0.45 * Math.sin(agora / 150 + b.f * 3), S = b.s * 5;
      c.globalAlpha = b.a * fl * (ativo ? 0.9 : 0.4);
      c.drawImage(brilho, b.x * w - S / 2, b.y * h - S / 2, S, S);
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
    <canvas></canvas>
    <div class="ab-palco">
      <div class="ab-zoom">
        ${anelSVG()}
        <div class="ab-titulo">
          <h1>OCM</h1>
          <div class="ab-filmes">Filmes</div>
          <div class="ab-orn"><i></i><span>✦</span><i></i></div>
          <div class="ab-sub">O Cronista Mentiroso</div>
        </div>
      </div>
    </div>
    <div class="ab-luz"></div>
    <div class="ab-veu"></div>
    <div class="ab-grao"></div>
    <div class="ab-porta">
      <div class="ab-chama"><span></span></div>
      <div class="ab-press">Toque para abrir a crônica</div>
      <button type="button" class="ab-som">${som ? 'com som' : 'sem som'}</button>
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
    setTimeout(() => { cv?.parar(); el.remove(); }, 1100);
  };
  const cronica = (pulou) => {
    if (fase >= 2) return; fase = 2;
    el.classList.add('fim'); if (pulou) el.classList.add('pulou');
    timers.push(setTimeout(sair, 10000 + linhas.length * 600));
  };
  const comecar = () => {
    fase = 1;
    if (som) { try { musica = trilha(); musica?.tocar(); } catch { musica = null; } }
    cv?.comecar();
    el.classList.add('on');
    timers.push(setTimeout(() => cronica(false), 12600));
  };
  el.querySelector('.ab-som').addEventListener('click', (e) => {
    e.stopPropagation();
    som = !som;
    try { localStorage.setItem('ocm-som', som ? '1' : '0'); } catch { /* ok */ }
    e.currentTarget.textContent = som ? 'com som' : 'sem som';
  });
  el.querySelector('.ab-pular').addEventListener('click', (e) => { e.stopPropagation(); sair(); });
  el.addEventListener('click', () => {
    if (fase === 0) comecar();
    else if (fase === 1) cronica(true);
    else sair();
  });
}
