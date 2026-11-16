// OCM Filmes — abertura em 3D (Three.js): anel de ouro com inscrição em Tengwar e o OCM em ouro maciço.
// Carregado sob demanda do jsDelivr. Se falhar, a abertura volta para a versão 2D (SVG).

const V = '0.160.0';
const CDN = `https://cdn.jsdelivr.net/npm/three@${V}`;
const FONTE_OCM = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sortsmillgoudy/SortsMillGoudy-Regular.ttf';
const FONTE_TENGWAR = 'https://cdn.jsdelivr.net/gh/Tosche/Alcarin-Tengwar@main/Fonts%20Static/AlcarinTengwar-Bold.woff2';

/* "o cronista mentiroso · filmes" escrito em Tengwar (modo geral: a vogal vai sobre a consoante anterior).
   Fonte Alcarin Tengwar (OFL), mapeamento Free Tengwar (área de uso privado U+E000…). */
const L = { tinco: 0xE000, quesse: 0xE003, formen: 0xE009, numen: 0xE010, malta: 0xE011, romen: 0xE020, lambe: 0xE022, silme: 0xE024, silmeNuq: 0xE025, portador: 0xE02E };
const M = { a: 0xE040, i: 0xE044, e: 0xE046, o: 0xE04A, nasal: 0xE050 };
const P = { pusta: 0xE060, dupla: 0xE061 };
const g = (...cps) => String.fromCodePoint(...cps);
// cada item é um "grupo": letra base + sinais por cima/baixo (desenhados juntos)
const PALAVRAS = [
  [g(L.portador, M.o)],                                                                     // o
  [g(L.quesse), g(L.romen, M.o), g(L.numen, M.i), g(L.silme), g(L.tinco, M.a)],             // c-ro-ni-s-ta
  [g(L.malta, M.e), g(L.tinco, M.nasal, M.i), g(L.romen, M.o), g(L.silmeNuq, M.o)],         // me-nti-ro-so
  [g(P.pusta)],
  [g(L.formen, M.i), g(L.lambe), g(L.malta, M.e), g(L.silme)],                              // fi-l-me-s
  [g(P.dupla)],
];

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const faixa = (t, a, b) => ease((t - a) / (b - a));
const mix = (a, b, k) => a + (b - a) * k;

async function inscricao(T) {
  const ff = new FontFace('OCMTengwar', `url(${FONTE_TENGWAR})`);
  await ff.load(); document.fonts.add(ff);
  const S = 2048, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  const K = S / 4.8; // px por unidade do mundo (o anel vai de -2.4 a 2.4)
  x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
  x.translate(S / 2, S / 2);
  x.strokeStyle = '#fff';
  // filetes finos dentro e fora da faixa escrita
  [[2.02, 4], [2.055, 2], [2.27, 2], [2.305, 4]].forEach(([r, w]) => { x.lineWidth = w; x.beginPath(); x.arc(0, 0, r * K, 0, Math.PI * 2); x.stroke(); });
  const rBase = 2.095 * K, tam = 0.15 * K;
  x.font = `${tam}px OCMTengwar`; x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
  const espaco = tam * 0.55;
  const grupos = [];
  PALAVRAS.forEach((p) => { p.forEach((s) => grupos.push({ s, w: x.measureText(String.fromCodePoint(s.codePointAt(0))).width + tam * 0.06 })); grupos.push({ s: '', w: espaco }); });
  const um = grupos.reduce((a, b) => a + b.w, 0);
  const voltas = Math.max(1, Math.round((Math.PI * 2 * rBase) / um));
  const escala = (Math.PI * 2 * rBase) / (um * voltas);
  let ang = 0;
  for (let v = 0; v < voltas; v++) for (const gr of grupos) {
    const w = gr.w * escala, meio = ang + w / 2 / rBase;
    if (gr.s) {
      x.save(); x.rotate(meio); x.translate(0, -rBase);
      const base = x.measureText(String.fromCodePoint(gr.s.codePointAt(0))).width;
      x.fillText(gr.s, -base / 2, 0);
      x.restore();
    }
    ang += w / rBase;
  }
  const tx = new T.CanvasTexture(c);
  tx.colorSpace = T.SRGBColorSpace;
  tx.anisotropy = 8;
  // as faces do ExtrudeGeometry usam coordenadas do mundo como UV
  tx.repeat.set(1 / 4.8, 1 / 4.8); tx.offset.set(0.5, 0.5);
  // halo: a mesma escrita desfocada, somada por cima (brilho de metal em brasa)
  const hc = document.createElement('canvas'); hc.width = hc.height = 1024;
  const hx = hc.getContext('2d'); hx.filter = 'blur(9px)'; hx.drawImage(c, 0, 0, 1024, 1024); hx.filter = 'blur(3px)'; hx.globalCompositeOperation = 'lighter'; hx.drawImage(c, 0, 0, 1024, 1024);
  const halo = new T.CanvasTexture(hc); halo.colorSpace = T.SRGBColorSpace;
  return { tx, halo };
}

export async function montar3D(host) {
  const T = await import(`${CDN}/+esm`);
  const [{ TTFLoader }, { Font }, { TextGeometry }, { RoomEnvironment }] = await Promise.all([
    import(`${CDN}/examples/jsm/loaders/TTFLoader.js/+esm`),
    import(`${CDN}/examples/jsm/loaders/FontLoader.js/+esm`),
    import(`${CDN}/examples/jsm/geometries/TextGeometry.js/+esm`),
    import(`${CDN}/examples/jsm/environments/RoomEnvironment.js/+esm`),
  ]);
  const [json, { tx: mapaTexto, halo: mapaHalo }] = await Promise.all([
    new Promise((ok, erro) => new TTFLoader().load(FONTE_OCM, ok, undefined, erro)),
    inscricao(T),
  ]);
  const fonte = new Font(json);

  const cv = document.createElement('canvas');
  cv.className = 'ab-3d';
  host.prepend(cv);
  const r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  r.outputColorSpace = T.SRGBColorSpace;
  r.toneMapping = T.ACESFilmicToneMapping;
  r.toneMappingExposure = 0;

  const cena = new T.Scene();
  const pm = new T.PMREMGenerator(r);
  cena.environment = pm.fromScene(new RoomEnvironment(r), 0.04).texture;
  const cam = new T.PerspectiveCamera(30, 1, 0.1, 100);
  const D = 19.25; // distância final: o anel fica do mesmo tamanho do anel 2D

  // ---- anel: coroa de ouro com bisel ----
  const forma = new T.Shape(); forma.absarc(0, 0, 2.35, 0, Math.PI * 2, false);
  const furo = new T.Path(); furo.absarc(0, 0, 1.98, 0, Math.PI * 2, true); forma.holes.push(furo);
  const geoAnel = new T.ExtrudeGeometry(forma, { depth: 0.16, curveSegments: 160, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 6 });
  geoAnel.translate(0, 0, -0.08);
  const ouro = { color: 0xf0c27a, metalness: 1, roughness: 0.3 };
  const uRevela = { value: 0 };
  const face = new T.MeshStandardMaterial({ ...ouro, emissive: 0xffd3a0, emissiveMap: mapaTexto, emissiveIntensity: 0 });
  // a escrita "acende" em volta do anel, com a ponta mais quente
  const revela = (uv) => `vec2 pc = ${uv} - 0.5;
      float ang = atan(pc.x, pc.y) / 6.2831853 + 0.5;
      float fio = 1.0 - smoothstep(uRevela - 0.035, uRevela, ang);
      float ponta = smoothstep(uRevela - 0.07, uRevela, ang) * fio;`;
  face.onBeforeCompile = (sh) => {
    sh.uniforms.uRevela = uRevela;
    sh.fragmentShader = 'uniform float uRevela;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      ${revela('vEmissiveMapUv')}
      totalEmissiveRadiance *= fio * (1.0 + ponta * 2.5);
      diffuseColor.rgb *= 1.0 - texture2D(emissiveMap, vEmissiveMapUv).r * 0.6;`);
  };
  const brilho = new T.MeshBasicMaterial({ map: mapaHalo, color: 0xff8a3a, transparent: true, opacity: 0, depthWrite: false,
    blending: T.CustomBlending, blendSrc: T.SrcAlphaFactor, blendDst: T.OneFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor });
  brilho.onBeforeCompile = (sh) => {
    sh.uniforms.uRevela = uRevela;
    sh.fragmentShader = 'uniform float uRevela;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      ${revela('vMapUv')}
      diffuseColor.rgb *= fio * (1.0 + ponta * 3.0);`);
  };
  const lado = new T.MeshStandardMaterial({ ...ouro, roughness: 0.24 });
  const anel = new T.Mesh(geoAnel, [face, lado]);
  const veu = new T.Mesh(new T.PlaneGeometry(4.8, 4.8), brilho); veu.position.z = 0.16;
  const grupo = new T.Group(); grupo.add(anel, veu); cena.add(grupo);

  // ---- OCM em ouro maciço (letra a letra, com o mesmo espaçamento do título) ----
  const metal = new T.MeshStandardMaterial({ ...ouro, roughness: 0.26, emissive: 0xff7a2a, emissiveIntensity: 0, transparent: true, opacity: 0 });
  const letras = new T.Group();
  let xL = 0;
  for (const ch of 'OCM') {
    const geo = new TextGeometry(ch, { font: fonte, size: 1, height: 0.22, curveSegments: 14, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.022, bevelSegments: 4 });
    geo.computeBoundingBox();
    const b = geo.boundingBox, m = new T.Mesh(geo, metal);
    m.position.x = xL - b.min.x; xL += b.max.x - b.min.x + 0.11;
    letras.add(m);
  }
  xL -= 0.11;
  letras.children.forEach((m) => { m.position.x -= xL / 2; m.position.z = -0.11; });
  const bbY = new T.Box3().setFromObject(letras);
  letras.children.forEach((m) => { m.position.y -= (bbY.min.y + bbY.max.y) / 2; });
  const ocm = new T.Group(); ocm.add(letras); cena.add(ocm);

  // ---- luzes ----
  cena.add(new T.AmbientLight(0x2a1a0e, 0.6));
  const chave = new T.DirectionalLight(0xffe2b8, 1.6); chave.position.set(-3, 5, 6); cena.add(chave);
  const brasa = new T.PointLight(0xff7a2a, 0, 14, 1.6); cena.add(brasa);
  const varre = new T.PointLight(0xfff1d6, 0, 8, 1.4); cena.add(varre);

  // posição do título HTML (h1 invisível) para o OCM 3D cair exatamente no lugar dele
  const alvo = { y: 0, w: 2.6 };
  const medir = () => {
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    const h1 = host.querySelector('.ab-titulo h1');
    if (!h1) return;
    const uPx = (2 * D * Math.tan((cam.fov * Math.PI) / 360)) / h;
    const cvR = cv.getBoundingClientRect(), hR = h1.getBoundingClientRect();
    const k = cvR.height / h; // escala visual atual (palco pode estar transformado)
    const cy = (hR.top + hR.height / 2 - cvR.top) / k;
    alvo.y = (h / 2 - cy) * uPx;
    alvo.w = (hR.width / k) * 0.78 * uPx;
  };
  medir(); addEventListener('resize', medir);

  let t0 = 0, rodando = false, raf = 0, salto = 0, fixo = null;
  const cor = new T.Color(), quente = new T.Color(0xffd9a0), laranja = new T.Color(0xff6a1e), dourado = new T.Color(0xe0a24c);
  function quadro(agora) {
    raf = requestAnimationFrame(quadro);
    const t = fixo != null ? fixo : rodando ? (agora - t0) / 1000 + salto : 0;
    // luz do mundo: sai do escuro
    r.toneMappingExposure = mix(0, 1.05, faixa(t, 0.4, 3.6));
    // câmera: começa colada na borda do anel, de lado, e recua até ficar de frente
    const k = faixa(t, 0.8, 8.6);
    cam.position.set(mix(2.6, 0, k), mix(-0.9, 0, k), mix(6.2, D, Math.pow(k, 0.85)));
    cam.lookAt(mix(1.6, 0, k), 0, 0);
    // anel: deitado e girando, endireita até o clímax; depois só respira
    const pos = t > 8.6 ? Math.sin((t - 8.6) * 0.45) : 0;
    grupo.rotation.set(mix(1.15, 0, k) + pos * 0.025, mix(-0.55, 0, k) + pos * 0.04, mix(-1.4, 0, ease((t - 0.8) / 9)));
    // brasa que circula o anel
    const a = t * 0.9;
    brasa.position.set(Math.cos(a) * 3.4, Math.sin(a) * 2.2, 2.4);
    brasa.intensity = mix(0, 40, faixa(t, 0.5, 3)) * mix(1, 0.35, faixa(t, 9, 12));
    // inscrição: acende letra a letra em brasa e esfria para ouro
    uRevela.value = mix(0, 1.04, faixa(t, 2.4, 7.4));
    const esfria = faixa(t, 8.8, 12);
    cor.copy(quente).lerp(laranja, faixa(t, 6.5, 9)).lerp(dourado, esfria);
    face.emissive.copy(cor);
    face.emissiveIntensity = mix(mix(0, 4, faixa(t, 2.2, 3)), 0.7, esfria);
    brilho.color.copy(cor); brilho.opacity = mix(mix(0, 1, faixa(t, 2.2, 3)), 0.22, esfria);
    // o ouro fica escuro na forja e ganha todo o reflexo no clímax
    const env = mix(0.22, 1, faixa(t, 8.2, 10.5));
    face.envMapIntensity = lado.envMapIntensity = metal.envMapIntensity = env;
    // OCM: nasce no clarão do clímax
    const n = faixa(t, 8.35, 10.2);
    metal.opacity = faixa(t, 8.35, 9.1);
    metal.transparent = metal.opacity < 1;
    metal.emissiveIntensity = mix(2.4, 0, faixa(t, 8.6, 11.2)) * (t > 8.35 ? 1 : 0);
    const s = (alvo.w / xL) * mix(1.22, 1, n);
    ocm.scale.setScalar(s);
    ocm.position.set(0, alvo.y, mix(-2.4, 0, n));
    ocm.rotation.x = mix(-0.35, 0, n);
    // reflexo que atravessa as letras
    const v = faixa(t, 9.6, 11.8);
    varre.position.set(mix(-4, 4, v), alvo.y + 0.6, 1.8);
    varre.intensity = v > 0 && v < 1 ? Math.sin(v * Math.PI) * 30 : 0;
    r.render(cena, cam);
  }
  raf = requestAnimationFrame(quadro);
  return {
    comecar() { rodando = true; t0 = performance.now(); medir(); },
    pular() { if (!t0) t0 = performance.now(); rodando = true; salto = Math.max(salto, 14 - (performance.now() - t0) / 1000); },
    medir,
    quadroEm(seg) { fixo = seg; }, // só para conferir quadros
    parar() { cancelAnimationFrame(raf); removeEventListener('resize', medir); r.dispose(); pm.dispose(); },
  };
}
