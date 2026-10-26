/* Utilidades compartilhadas. Sem build, sem dependências.
   Todo conteúdo vindo dos JSON é inserido como texto (nunca innerHTML). */

const TZ = "America/Sao_Paulo";
const FORMATOS = { "reportagem": "Reportagem", "em-1-minuto": "Em 1 minuto", "mini-aula": "Mini aula", "radar": "Radar" };
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const RE_SLUG = /^[a-z0-9][a-z0-9-]*$/;
const RE_COR = /^#[0-9a-fA-F]{6}$/;
const NS_SVG = "http://www.w3.org/2000/svg";

function h(tag, attrs, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style") el.style.cssText = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const f of filhos.flat()) {
    if (f == null || f === false) continue;
    el.append(f.nodeType ? f : document.createTextNode(String(f)));
  }
  return el;
}

function s(tag, attrs, ...filhos) {
  const el = document.createElementNS(NS_SVG, tag);
  for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
  el.append(...filhos.flat().filter(Boolean));
  return el;
}

async function getJSON(caminho) {
  const r = await fetch(caminho, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${caminho} respondeu ${r.status}`);
  return r.json();
}

async function carregar() {
  const [site, temas, posts] = await Promise.all([
    getJSON("data/site.json"), getJSON("data/temas.json"), getJSON("data/index.json"),
  ]);
  posts.sort((a, b) => (a.data === b.data ? b.id.localeCompare(a.id) : b.data.localeCompare(a.data)));
  return { site, temas, posts };
}

function params() { return Object.fromEntries(new URLSearchParams(location.search)); }

/* ---------- datas (sempre no fuso de Brasília) ---------- */

function hojeISO() { return new Date().toLocaleDateString("en-CA", { timeZone: TZ }); }

function diasEntre(a, b) {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 864e5);
}

function dataLonga(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("pt-BR", {
    timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function dataCurta(iso) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

function dataRelativa(iso) {
  const n = diasEntre(iso, hojeISO());
  if (n <= 0) return "hoje";
  if (n === 1) return "ontem";
  if (n < 7) return `há ${n} dias`;
  return dataCurta(iso);
}

function expirado(post, tema) { return diasEntre(post.data, hojeISO()) > tema.validade_dias; }

/* ---------- cor do tema ---------- */

function corTexto(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.35 ? "#0e1a24" : "#ffffff";
}

function estiloTema(tema) {
  const cor = RE_COR.test(tema.cor || "") ? tema.cor : "#6b46ff";
  return `--tema:${cor};--tema-ink:${corTexto(cor)}`;
}

/* ---------- capas geradas: SVG determinístico a partir do id ----------
   O mesmo id sempre gera o mesmo desenho. As cores vêm do tema (variáveis CSS),
   então a arte acompanha o bloco onde estiver. */

function aleatorio(texto) {
  let a1 = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i++) {
    a1 = Math.imul(a1 ^ texto.charCodeAt(i), 3432918353);
    a1 = (a1 << 13) | (a1 >>> 19);
  }
  let a = (Math.imul(a1 ^ (a1 >>> 16), 2246822507) ^ Math.imul(a1 ^ (a1 >>> 13), 3266489909)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TINTA = "var(--tema-ink)";
const MEIO = "color-mix(in srgb, var(--tema-ink) 38%, var(--tema))";
const SUAVE = "color-mix(in srgb, var(--tema-ink) 16%, var(--tema))";
const CLARO = "color-mix(in srgb, #ffffff 60%, var(--tema))";
const preenche = (cor) => `fill:${cor}`;
const traco = (cor, w) => `fill:none;stroke:${cor};stroke-width:${w}`;

const MOTIVOS = [
  function orbitas(r) {
    const cx = 220 + r() * 180, cy = r() * 200;
    const els = [
      s("circle", { cx, cy, r: 170, style: traco(TINTA, 3) }),
      s("circle", { cx, cy, r: 125, style: preenche(SUAVE) }),
      s("circle", { cx, cy, r: 82, style: traco(TINTA, 3) }),
      s("circle", { cx, cy, r: 40, style: preenche(TINTA) }),
    ];
    for (let i = 0; i < 6; i++) els.push(s("circle", { cx: r() * 400, cy: r() * 300, r: 4 + r() * 6, style: preenche(CLARO) }));
    return els;
  },
  function blocos(r) {
    const cores = [TINTA, MEIO, SUAVE, CLARO], els = [];
    for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) {
      if (r() < 0.4) els.push(s("rect", { x: x * 50, y: y * 50, width: 50, height: 50, style: preenche(cores[Math.floor(r() * 4)]) }));
    }
    for (let i = 0; i < 3; i++) els.push(s("circle", { cx: 25 + Math.floor(r() * 8) * 50, cy: 25 + Math.floor(r() * 6) * 50, r: 25, style: preenche(TINTA) }));
    return els;
  },
  function ondas(r) {
    const els = [];
    for (let i = 0; i < 6; i++) {
      const y = 30 + i * 50, a = 15 + r() * 35, p = r() * 60;
      els.push(s("path", {
        d: `M0 ${y} C 90 ${y - a} 150 ${y + a} 220 ${y + p / 3} S 340 ${y - a} 400 ${y}`,
        style: traco(i === 2 ? MEIO : TINTA, i === 2 ? 14 : 3) + ";stroke-linecap:round",
      }));
    }
    els.push(s("circle", { cx: 60 + r() * 280, cy: 60 + r() * 180, r: 34 + r() * 26, style: preenche(CLARO) }));
    return els;
  },
  function quartos(r) {
    const cores = [TINTA, MEIO, SUAVE, CLARO], els = [];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) {
      const x = i * 100, y = j * 100, cor = cores[Math.floor(r() * 4)], k = Math.floor(r() * 5);
      const caminhos = [
        `M${x} ${y}h100a100 100 0 0 1-100 100z`,
        `M${x + 100} ${y}v100a100 100 0 0 1-100-100z`,
        `M${x + 100} ${y + 100}h-100a100 100 0 0 1 100-100z`,
        `M${x} ${y + 100}v-100a100 100 0 0 1 100 100z`,
      ];
      els.push(k < 4 ? s("path", { d: caminhos[k], style: preenche(cor) }) : s("circle", { cx: x + 50, cy: y + 50, r: 50, style: preenche(cor) }));
    }
    return els;
  },
  function raios(r) {
    const ox = r() < 0.5 ? 0 : 400, oy = r() < 0.5 ? 0 : 300, els = [];
    const base = Math.atan2(150 - oy, 200 - ox);
    for (let i = -7; i <= 7; i++) {
      const ang = base + i * 0.09, forte = i % 3 === 0;
      els.push(s("line", { x1: ox, y1: oy, x2: ox + Math.cos(ang) * 600, y2: oy + Math.sin(ang) * 600, style: `stroke:${forte ? TINTA : MEIO};stroke-width:${forte ? 3 : 2}` }));
    }
    els.push(s("circle", { cx: ox, cy: oy, r: 70 + r() * 40, style: preenche(CLARO) }), s("circle", { cx: ox, cy: oy, r: 34, style: preenche(TINTA) }));
    return els;
  },
];

function arte(id) {
  const r = aleatorio(id);
  const motivo = MOTIVOS[Math.floor(r() * MOTIVOS.length)];
  return s("svg", { class: "arte", viewBox: "0 0 400 300", preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true", focusable: "false" }, ...motivo(r));
}

/* ---------- texto seguro ---------- */

function urlSegura(u) {
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:" ? x.href : null;
  } catch { return null; }
}

function inline(txt) {
  const saida = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let i = 0, m;
  while ((m = re.exec(txt))) {
    if (m.index > i) saida.push(txt.slice(i, m.index));
    const t = m[0];
    if (t.startsWith("**")) saida.push(h("strong", {}, t.slice(2, -2)));
    else if (t.startsWith("`")) saida.push(h("code", {}, t.slice(1, -1)));
    else {
      const [, rotulo, url] = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const seguro = urlSegura(url);
      saida.push(seguro ? h("a", { href: seguro, target: "_blank", rel: "noopener noreferrer" }, rotulo) : rotulo);
    }
    i = m.index + t.length;
  }
  if (i < txt.length) saida.push(txt.slice(i));
  return saida;
}

function renderBlocos(corpo) {
  return corpo.map((b) => {
    switch (b.tipo) {
      case "p": return h("p", {}, inline(b.texto));
      case "h2": return h("h2", {}, b.texto);
      case "h3": return h("h3", {}, b.texto);
      case "ul": return h("ul", {}, b.itens.map((t) => h("li", {}, inline(t))));
      case "ol": return h("ol", {}, b.itens.map((t) => h("li", {}, inline(t))));
      case "code": return h("pre", {}, h("code", {}, b.texto));
      case "callout":
        return h("aside", { class: "callout" },
          b.titulo ? h("strong", { class: "callout-titulo" }, b.titulo) : null,
          h("p", {}, inline(b.texto)));
      default: return null;
    }
  });
}

/* ---------- peças de interface ---------- */

function linkPost(p) { return `post.html?t=${p.tema}&id=${p.id}`; }

function meta(p) {
  return h("span", { class: "meta" },
    h("span", { class: "selo" }, FORMATOS[p.formato] || p.formato),
    p.exemplo ? h("span", { class: "selo" }, "Exemplo") : null,
    h("span", {}, dataRelativa(p.data)),
    h("span", {}, `${p.tempo_leitura_min} min de leitura`));
}

function etiquetaTema(tema) {
  return h("span", { class: "tema-tag" }, h("i", { class: "quadrado" }), tema.nome);
}

function miniatura(p) { return h("span", { class: "miniatura" }, arte(p.id)); }

function linha(p, tema, arquivada) {
  return h("a", { class: "linha" + (arquivada ? " arquivada" : ""), href: linkPost(p), style: estiloTema(tema) },
    miniatura(p),
    h("span", { class: "linha-corpo" },
      etiquetaTema(tema),
      h("strong", { class: "linha-titulo" }, p.titulo),
      h("span", { class: "linha-resumo" }, p.resumo),
      meta(p)));
}

function montarTopo(site, temas, ativo) {
  const destino = document.querySelector("#topo .wrap");
  const hoje = hojeISO();
  let atualizado = "";
  if (site.atualizado_em) {
    atualizado = `Atualizado em ${dataCurta(site.atualizado_em.slice(0, 10))} às ${site.atualizado_em.slice(11, 16)}`;
  }
  destino.replaceChildren(
    h("div", { class: "topo-linha" }, h("span", {}, dataLonga(hoje)), h("span", {}, atualizado)),
    h("div", { class: "marca-linha" },
      h("a", { class: "marca", href: "index.html", "aria-label": `${site.titulo}, página inicial` }, site.titulo),
      h("p", { class: "marca-sub" }, site.subtitulo)),
    h("nav", { class: "nav", "aria-label": "Temas" },
      h("a", { href: "index.html", "aria-current": ativo === "capa" ? "page" : null }, h("i", { class: "quadrado capa-quadrado" }), "Capa"),
      temas.filter((t) => t.ativo).map((t) =>
        h("a", { href: `tema.html?t=${t.slug}`, style: estiloTema(t), "aria-current": ativo === t.slug ? "page" : null },
          h("i", { class: "quadrado" }), t.nome))));
}

function montarRodape(site) {
  document.querySelector("#rodape .wrap").replaceChildren(
    h("p", {}, "Edição preparada por IA a partir de fontes públicas, reescrita com palavras próprias. Cada matéria lista as fontes; confira nelas antes de decidir algo importante."),
    h("p", {}, `${site.titulo}, caderno pessoal de ${site.autor}.`));
}

function mensagem(titulo, ...texto) {
  return h("div", { class: "mensagem" }, h("h1", {}, titulo), texto.map((t) => (typeof t === "string" ? h("p", {}, t) : t)));
}

function falha(app, erro) {
  app.replaceChildren(mensagem(
    "Não consegui carregar esta edição",
    erro.message,
    location.protocol === "file:"
      ? h("p", {}, "Você abriu o arquivo direto do computador. O navegador bloqueia a leitura dos dados nesse modo. Na pasta do projeto, rode ", h("code", {}, "python3 -m http.server 8000"), " e abra http://localhost:8000.")
      : "Atualize a página. Se continuar, confira se data/index.json existe no repositório."));
}
