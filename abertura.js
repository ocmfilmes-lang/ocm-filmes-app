// OCM Filmes — abertura: "O Cronista Mentiroso"
// Fantasia épica em 3D: anel de ouro com inscrição em Tengwar, OCM em ouro e a crônica do dia.
// Trilha orquestral original (trilha-abertura.mp3). Se o 3D não carregar, fica a versão 2D (SVG).

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- escrita élfica (traços originais, caixa 9×14; y=0 é a borda de fora) ---------- */
const H = { a: 'M1.5 0.6 V10', d: 'M1.5 4 V13.6', s: 'M1.5 4 V10' };
const B1 = ' M1.5 4.7 C6.8 3.4 7.2 9.8 1.5 9.5';
const B2 = ' M1.5 4.7 C4.6 3.9 4.9 9.4 1.5 9.5 M4.1 5.2 C8.6 4.3 8.8 9.9 3.6 9.5';
const T = {
  ponto: ' M4.4 1.7 l.01 0', acento: ' M3.2 2.9 C4.3 2.2 5 1.4 5.9 0.4', curva: ' M2.4 1.2 C3.4 3.1 6.2 2.8 6.4 0.6',
  til: ' M1.8 2 C3 0.4 4.4 3 6.6 1.1', tres: ' M2.6 2.3 l.01 0 M4.5 0.9 l.01 0 M6.4 2.3 l.01 0',
};
const ELFICO = {
  O: H.s + B1 + T.curva, C: H.d + B1, M: H.s + B2 + T.til, F: H.a + B1 + T.acento,
  I: 'M3.2 5.6 C2.6 7.4 2.6 8.8 3.6 9.8' + T.ponto, L: 'M1 10 C0.8 3.6 7.6 3.4 7.6 7.4 C7.6 9.6 6 10.2 5 9.6',
  E: 'M3.4 5.4 C2.6 7.4 2.8 9 4 9.8' + T.acento, S: 'M6.6 4.6 C2.2 3.6 1.4 7.4 4.2 7.4 C7.6 7.4 7.4 11.6 1.4 10.4',
  R: 'M1.5 10 V6 C1.5 3.6 6.8 3.4 6.6 6.4', N: H.s + B2, T: H.a + B2 + T.ponto,
  A: 'M3.2 5.6 C2.6 7.4 2.6 8.8 3.6 9.8' + T.tres,
  '✦': 'M4.5 4.6 C5.6 6 5.6 8 4.5 9.4 C3.4 8 3.4 6 4.5 4.6 M1 7 l.01 0 M8 7 l.01 0',
};
export function anelSVG() {
  const frase = 'OCM FILMES ✦ O CRONISTA MENTIROSO ✦ '.repeat(2);
  const passo = 360 / frase.length;
  let letras = '';
  [...frase].forEach((ch, i) => {
    const d = ELFICO[ch];
    if (!d) return;
    letras += `<path class="runa" style="--i:${i}" transform="rotate(${(i * passo).toFixed(2)} 200 200) translate(194.4 14) scale(1.25)" d="${d}"/>`;
  });
  return `<svg class="ab-anel" viewBox="0 0 400 400" aria-hidden="true">
    <g class="ab-giro">
      <circle class="c" cx="200" cy="200" r="164" pathLength="1"/>
      <circle class="c c2" cx="200" cy="200" r="150" pathLength="1"/>
      ${letras}
    </g>
  </svg>`;
}

/* ---------- trilha (mp3 original, tocada pelo Web Audio para poder fazer fade no iPhone) ---------- */
function trilha() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const ganho = ctx.createGain(); ganho.gain.value = 0.9; ganho.connect(ctx.destination);
  let buf = null, fonte = null, inicio = 0, tocando = false, parado = false;
  const pronto = fetch('trilha-abertura.mp3').then((r) => r.arrayBuffer())
    .then((a) => new Promise((ok, erro) => ctx.decodeAudioData(a, ok, erro))).then((b) => { buf = b; }).catch(() => {});
  function soltar(desde) {
    if (tocando || parado || !buf || ctx.state !== 'running') return false;
    const off = Math.max(0, desde || 0);
    if (off > buf.duration - 3) { tocando = true; return true; } // já passou: fica em silêncio
    fonte = ctx.createBufferSource(); fonte.buffer = buf; fonte.connect(ganho);
    fonte.start(0, off); tocando = true; inicio = ctx.currentTime - off;
    return true;
  }
  return {
    pronto,
    // tenta tocar a partir de "desde" segundos; devolve true se o som saiu (ou não precisa mais)
    async tocar(desde) {
      await pronto;
      try { if (ctx.state !== 'running') await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 250))]); } catch { /* bloqueado */ }
      return soltar(desde);
    },
    get tocando() { return tocando; },
    acordar() { try { if (ctx.state !== 'running') ctx.resume(); } catch { /* ok */ } },
    mudo(sim) { ganho.gain.setTargetAtTime(sim ? 0 : 0.9, ctx.currentTime, 0.15); },
    parar() {
      parado = true;
      try {
        const t = ctx.currentTime;
        ganho.gain.cancelScheduledValues(t); ganho.gain.setValueAtTime(ganho.gain.value, t); ganho.gain.linearRampToValueAtTime(0, t + 1.3);
        setTimeout(() => ctx.close().catch(() => {}), 1600);
      } catch { /* já fechado */ }
    },
    get tempo() { return tocando ? ctx.currentTime - inicio : 0; },
  };
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
    <button type="button" class="ab-som">${som ? 'com som' : 'sem som'}</button>
    <div class="ab-cronica">
      <div class="ab-cab l" style="--d:0"><b>Crônica do dia</b><span>${esc(ola)} · ${esc(dt)}</span></div>
      ${linhas.map(([a, b], i) => `<div class="ab-it l" style="--d:${i + 1}"><b>${esc(a)}</b>${b ? `<small>${esc(b)}</small>` : ''}</div>`).join('')}
      <div class="ab-entrar l" style="--d:${linhas.length + 2}">Toque para entrar</div>
    </div>
    <button type="button" class="ab-pular">pular</button>`;
  document.body.appendChild(el);

  const cv = calmo ? null : cena(el.querySelector('canvas'));
  const musica = calmo ? null : trilha();
  let tres = null, fase = calmo ? 2 : 0, saiu = false, t0 = 0;
  const timers = [];
  const sair = () => {
    if (saiu) return; saiu = true;
    timers.forEach(clearTimeout);
    musica?.parar();
    el.classList.add('saindo');
    setTimeout(() => { cv?.parar(); tres?.parar(); el.remove(); }, 1100);
  };
  const cronica = (pulou) => {
    if (fase >= 2) return; fase = 2;
    el.classList.add('fim'); if (pulou) { el.classList.add('pulou'); tres?.pular(); }
    setTimeout(() => tres?.medir(), 1700);
    timers.push(setTimeout(sair, 10000 + linhas.length * 600));
  };
  // começa sozinha: o 3D tem até 3,5 s para carregar (enquanto isso, só brasas no escuro)
  const comecar = () => {
    if (fase !== 0 || saiu) return;
    fase = 1; t0 = performance.now();
    if (tres) el.classList.add('tres');
    if (som) musica?.tocar(0);
    cv?.comecar(); tres?.comecar();
    el.classList.add('on');
    timers.push(setTimeout(() => cronica(false), 12600));
  };
  if (!calmo) {
    const limite = setTimeout(comecar, 3500);
    Promise.all([
      import('./abertura3d.js?v=22').then((m) => m.montar3D(el.querySelector('.ab-zoom'))).then((c) => { if (fase === 0 && !saiu) tres = c; else c.parar(); }).catch(() => {}),
      musica?.pronto,
    ]).then(() => { clearTimeout(limite); comecar(); });
  }
  // o iPhone só deixa tocar som depois de um toque: o primeiro toque liga a música no ponto certo
  const destravar = async () => {
    if (!som || !musica || musica.tocando || fase !== 1) return false;
    return musica.tocar((performance.now() - t0) / 1000);
  };
  el.querySelector('.ab-som').addEventListener('click', (e) => {
    e.stopPropagation();
    som = !som;
    try { localStorage.setItem('ocm-som', som ? '1' : '0'); } catch { /* ok */ }
    e.currentTarget.textContent = som ? 'com som' : 'sem som';
    if (som) { musica?.acordar(); musica?.mudo(false); destravar(); } else musica?.mudo(true);
  });
  el.querySelector('.ab-pular').addEventListener('click', (e) => { e.stopPropagation(); sair(); });
  el.addEventListener('click', async () => {
    musica?.acordar(); // precisa ser dentro do toque (iPhone)
    if (fase === 0) return;
    if (fase === 1 && som && musica && !musica.tocando && await destravar()) return; // esse toque só ligou o som
    if (fase === 1) cronica(true);
    else sair();
  });
}
