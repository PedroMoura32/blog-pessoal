# Radar

Caderno pessoal de tecnologia e IA. Site estático (HTML, CSS e JS puros, sem build), alimentado por uma tarefa agendada que pesquisa os temas todo dia às 6h e grava as matérias como arquivos JSON.

## Estrutura

```
index.html        capa de jornal (manchete, "em 1 minuto", seções por tema, busca)
tema.html         página de um tema (?t=slug), com filtro por formato e arquivadas
post.html         página de uma matéria (?t=slug&id=...)
css/style.css     todo o visual
js/               app.js (utilitários), capa.js, tema.js, post.js
fonts/            Bricolage Grotesque e Source Serif 4 (licença OFL)
data/
  site.json       título e subtítulo do blog
  temas.json      temas: cor, estilo, formatos, validade, consultas, fontes
  index.json      índice gerado pelo script (não edite à mão)
  posts/<tema>/   uma matéria por arquivo AAAA-MM-DD-slug.json
scripts/rebuild_index.py   valida os posts e gera o índice
CLAUDE.md         contrato do agente que roda todo dia
```

## Ver no computador

```
python3 -m http.server 8000
```

Abra http://localhost:8000. (Abrir o `index.html` direto não funciona: o navegador bloqueia a leitura dos JSON.)

## Publicar no GitHub Pages

1. Crie um repositório e suba estes arquivos na branch `main`.
2. Em Settings, Pages, escolha "Deploy from a branch", branch `main`, pasta `/ (root)`.
3. O endereço sai como `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

O GitHub Pages grátis exige repositório público. As páginas têm `noindex` para não aparecerem em buscadores, mas qualquer pessoa com o link consegue abrir.

## Trocar temas

Edite `data/temas.json`. Para um tema novo, copie um bloco existente, mude `slug`, `nome`, `cor` e `consultas`, e crie a pasta `data/posts/<slug>/`. `"ativo": false` esconde o tema sem apagar o histórico.

## Posts de exemplo

Os três posts marcados com `"exemplo": true` só servem para ver o layout. Apague com:

```
python3 scripts/rebuild_index.py --remover-exemplos
```
