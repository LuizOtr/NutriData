# NutriData — SISVAN

Dashboard acadêmico para exploração de dados públicos de estado nutricional do SISVAN, com React/Vite e publicação no GitHub Pages.

## Como os dados chegam ao dashboard

O GitHub Actions executa automaticamente a rotina `scripts/update_sisvan.py`, que:

1. Baixa o arquivo público de Estado Nutricional disponibilizado pelo Ministério da Saúde.
2. Extrai os registros do Paraná (UF = PR).
3. Gera `public/data/sisvan-pr.json.gz`, um JSON compactado para reduzir o tráfego.
4. Gera `public/data/metadata.json` com a fonte, a data da atualização e a quantidade de registros.
5. Compila o React e publica o conteúdo da pasta `dist` no GitHub Pages.

A atualização está agendada semanalmente (segunda-feira, 07:00 UTC) e também pode ser iniciada manualmente em **Actions → Update SISVAN data and deploy NutriData → Run workflow**.

**Fonte oficial:** [Portal de Dados Abertos do SUS — SISVAN Estado Nutricional](https://dadosabertos.saude.gov.br/dataset/sisvan-estado-nutricional).

## Executar localmente

Requisitos: Node.js 22 ou superior e Python 3.12.

```bash
python -m pip install pandas requests
python scripts/update_sisvan.py
npm install
npm run dev
```

O Vite inicia em http://localhost:5173. A base é gerada em `public/data` antes de abrir o dashboard.

Para compilar:

```bash
npm run build
```

## Estrutura

- `scripts/update_sisvan.py`: download, filtragem por UF e geração do JSON compactado.
- `.github/workflows/deploy.yml`: atualização agendada e publicação no GitHub Pages.
- `src/App.jsx`: dashboard, indicadores, gráficos, filtros e paginação.
- `vite.config.mjs`: configuração do Vite e caminho-base do GitHub Pages.
- `public/data/`: dados gerados durante a execução do workflow.

## Cuidados metodológicos

- A base disponibilizada pelo Ministério da Saúde é anonimizada, mas pode conter mais de um acompanhamento para a mesma pessoa. Quantidade de registros não equivale a quantidade de pessoas únicas.
- O conjunto anual disponível deve ser identificado no painel e não deve ser apresentado como cobertura de todos os anos sem processamento dos demais arquivos históricos.
- O dashboard apresenta a amostra do Paraná e não representa automaticamente toda a população do estado.
- Classificações nutricionais de crianças, adolescentes, adultos e idosos seguem critérios diferentes. Valide o dicionário de dados antes de comparar grupos.
- Os dados podem diferir dos relatórios consolidados públicos, pois o SISVAN incorpora acompanhamentos periodicamente.
