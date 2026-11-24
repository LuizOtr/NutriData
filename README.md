# NutriData — SISVAN

Dashboard acadêmico para explorar acompanhamentos de estado nutricional do SISVAN no Paraná.

## Fontes de dados

1. **Fonte primária:** API DEMAS do Ministério da Saúde, endpoint `/sisvan/estado-nutricional`.
2. **Contingência:** arquivo público anual do SISVAN (2023), baixado do Portal de Dados Abertos do SUS, filtrado para o Paraná e compactado em JSON.

A API é consultada no navegador com `uf=PR`, `limit` de até 20 registros e `offset` para paginação. Se a API falhar, o painel tenta carregar a base pública de contingência. A API e o arquivo anual são fontes diferentes e o painel identifica qual delas está sendo usada.

**Documentação da API:** https://apidadosabertos.saude.gov.br/v1/#/SISVAN  
**Portal oficial:** https://dadosabertos.saude.gov.br/dataset/sisvan-estado-nutricional

## Atualização da base de contingência

O workflow `.github/workflows/deploy.yml` publica o dashboard a cada alteração em `main`. O download e processamento do arquivo SISVAN são executados somente na atualização semanal ou quando o workflow é iniciado manualmente. A base validada fica em cache para as publicações normais não precisarem baixar novamente o ZIP.

## Executar localmente

Requisitos: Node.js 22 ou superior, Python 3.12.

```bash
npm install
npm run dev
```

O dashboard tenta consultar a API DEMAS. Para gerar/atualizar a base de contingência:

```bash
python -m pip install pandas requests
python scripts/update_sisvan.py
```

Para compilar:

```bash
npm run build
```

## Estrutura

- `src/App.jsx`: dashboard, indicadores, gráficos, filtros, paginação e fallback.
- `scripts/api.js`: cliente de diagnóstico da API DEMAS com validação dos parâmetros.
- `scripts/update_sisvan.py`: geração da base pública compactada de contingência.
- `server.cjs`: proxy opcional para desenvolvimento local.
- `.github/workflows/deploy.yml`: publicação e atualização agendada.
- `vite.config.mjs`: base URL do GitHub Pages.

## Limitações metodológicas

- A base de contingência deste repositório corresponde ao ano de 2023; não deve ser apresentada como série histórica completa.
- Pode haver mais de um acompanhamento por pessoa. Número de registros não equivale a número de indivíduos únicos.
- Os relatórios públicos podem divergir da base individualizada porque consolidam o último acompanhamento e recebem atualizações periódicas.
- Critérios de classificação nutricional variam por fase da vida; não compare categorias sem validar o dicionário de dados.
