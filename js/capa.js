(async () => {
  const app = document.getElementById("app");
  try {
    const { site, temas, posts } = await carregar();
    document.title = `${site.titulo}: ${site.subtitulo}`;
    montarTopo(site, temas, "capa");
    montarRodape(site);

    const ativos = temas.filter((t) => t.ativo);
    const porSlug = new Map(ativos.map((t) => [t.slug, t]));
    const vivos = posts.filter((p) => porSlug.has(p.tema) && !expirado(p, porSlug.get(p.tema)));

    app.replaceChildren();
    if (!vivos.length) {
      app.append(mensagem("Ainda não há matérias", "A primeira edição aparece aqui depois da próxima rodada da automação, às 6h."));
      return;
    }

    const busca = h("input", {
      type: "search", class: "busca", autocomplete: "off",
      placeholder: "Buscar nas matérias", "aria-label": "Buscar nas matérias",
    });
    const palco = h("div", { id: "palco" });
    app.append(h("div", { class: "busca-wrap" }, busca), palco);

    const diaTopo = vivos[0].data;
    const doDia = vivos.filter((p) => p.data === diaTopo);
    const manchete = doDia.find((p) => p.destaque) || doDia[0];

    const normalizar = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const casa = (p, q) => normalizar([p.titulo, p.resumo, ...(p.tags || [])].join(" ")).includes(normalizar(q));

    function blocoManchete() {
      const t = porSlug.get(manchete.tema);
      return h("a", { class: "manchete", href: linkPost(manchete), style: estiloTema(t) },
        h("div", { class: "manchete-topo" },
          h("span", {}, t.nome),
          h("span", { class: "selo" }, FORMATOS[manchete.formato]),
          manchete.exemplo ? h("span", { class: "selo" }, "Exemplo") : null),
        h("div", {},
          h("h2", { class: "manchete-titulo" }, manchete.titulo),
          h("p", { class: "manchete-resumo" }, manchete.resumo),
          h("span", { class: "meta" },
            h("span", {}, dataRelativa(manchete.data)),
            h("span", {}, `${manchete.tempo_leitura_min} min de leitura`))));
    }

    // A coluna lateral usa "Em 1 minuto"; se não houver, mostra os mais recentes.
    let minutoItens = vivos.filter((p) => p.formato === "em-1-minuto" && p !== manchete).slice(0, 6);
    let minutoTitulo = "Em 1 minuto";
    if (!minutoItens.length) {
      minutoItens = vivos.filter((p) => p !== manchete).slice(0, 4);
      minutoTitulo = "Mais recentes";
    }
    const jaNaCapa = new Set([manchete, ...minutoItens]);

    function blocoMinuto() {
      const itens = minutoItens;
      const titulo = minutoTitulo;
      if (!itens.length) return null;
      return h("aside", { class: "minuto", "aria-labelledby": "titulo-minuto" },
        h("h2", { class: "rotulo", id: "titulo-minuto" }, titulo),
        h("ul", { class: "minuto-lista" }, itens.map((p) => {
          const t = porSlug.get(p.tema);
          return h("li", { style: estiloTema(t) },
            h("a", { class: "minuto-item", href: linkPost(p) },
              etiquetaTema(t),
              h("strong", {}, p.titulo),
              h("span", { class: "meta" }, h("span", {}, dataRelativa(p.data)), h("span", {}, `${p.tempo_leitura_min} min de leitura`))));
        })));
    }

    function materia(p, lead) {
      return h("a", { class: "materia" + (lead ? " lead" : ""), href: linkPost(p) },
        h("h3", {}, p.titulo), h("p", {}, p.resumo), meta(p));
    }

    function secao(t) {
      const todos = vivos.filter((p) => p.tema === t.slug);
      const lista = todos.filter((p) => !jaNaCapa.has(p)).slice(0, 3);
      if (!lista.length) return null;
      return h("section", { class: "secao", style: estiloTema(t) },
        h("div", { class: "secao-topo" },
          h("h2", { class: "etiqueta" }, t.nome),
          h("a", { class: "ver-tudo", href: `tema.html?t=${t.slug}` }, `Ver tudo (${todos.length})`)),
        h("div", { class: "secao-corpo" }, lista.map((p, i) => materia(p, i === 0))));
    }

    function desenharCapa() {
      const minuto = blocoMinuto();
      palco.replaceChildren(
        h("div", { class: "mosaico" + (minuto ? " duplo" : "") }, blocoManchete(), minuto),
        ...ativos.map(secao).filter(Boolean));
    }

    function desenharBusca(q) {
      const achados = vivos.filter((p) => casa(p, q));
      palco.replaceChildren(...[
        h("p", { class: "contagem", role: "status" },
          achados.length ? `${achados.length} ${achados.length === 1 ? "matéria" : "matérias"} para “${q}”` : `Nada encontrado para “${q}”. Tente outra palavra.`),
        achados.length ? h("div", { class: "lista" }, achados.map((p) => linha(p, porSlug.get(p.tema)))) : null,
      ].filter(Boolean));
    }

    busca.addEventListener("input", () => {
      const q = busca.value.trim();
      if (q) desenharBusca(q); else desenharCapa();
    });
    desenharCapa();
  } catch (e) {
    falha(app, e);
  }
})();
