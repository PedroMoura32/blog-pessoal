/* Utilidades compartilhadas. Sem build, sem dependências.
   Todo conteúdo vindo dos JSON é inserido como texto (nunca innerHTML). */

const TZ = "America/Sao_Paulo";
const FORMATOS = { "reportagem": "Reportagem", "em-1-minuto": "Em 1 minuto", "mini-aula": "Mini aula", "radar": "Radar" };
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const RE_SLUG = /^[a-z0-9][a-z0-9-]*$/;
const RE_COR = /^#[0-9a-fA-F]{6}$/;

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
    const s = m[0];
    if (s.startsWith("**")) saida.push(h("strong", {}, s.slice(2, -2)));
    else if (s.startsWith("`")) saida.push(h("code", {}, s.slice(1, -1)));
    else {
      const [, rotulo, url] = s.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const seguro = urlSegura(url);
      saida.push(seguro ? h("a", { href: seguro, target: "_blank", rel: "noopener noreferrer" }, rotulo) : rotulo);
    }
    i = m.index + s.length;
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

function linha(p, tema, arquivada) {
  return h("a", { class: "linha" + (arquivada ? " arquivada" : ""), href: linkPost(p), style: estiloTema(tema) },
    h("span", { class: "linha-data" }, dataCurta(p.data)),
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
      h("a", { href: "index.html", "aria-current": ativo === "capa" ? "page" : null }, "Capa"),
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
