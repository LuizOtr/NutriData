# NutriData — SISVAN Paraná

Dashboard de análise exploratória dos registros públicos do Sistema de Vigilância Alimentar e Nutricional (SISVAN), com recorte para o Paraná.

## Arquitetura

- **Frontend:** React + Vite, sem dependência de API em tempo de execução.
- **Dados:** pipeline Python executado no GitHub Actions; a base oficial é agregada em um JSON compacto.
- **Publicação:** GitHub Pages via GitHub Actions.
- **Atualização:** semanal (segunda-feira) e sob demanda pelo workflow.

A dashboard não consulta a API DEMAS no navegador. Isso elimina dependência de CORS, disponibilidade do endpoint e limites de paginação durante a visualização. A publicação utiliza um resumo agregado derivado da base oficial do SISVAN.

## Fonte e metodologia

- Fonte: Portal de Dados Abertos do SUS / SISVAN.
- Dataset: estado nutricional, ano de referência 2023.
- Recorte: UF Paraná.
- Unidade de contagem: registro de acompanhamento; não representa necessariamente pessoas únicas.
- As dimensões são agregadas conforme os campos disponíveis no arquivo de origem. Valores ausentes permanecem como “Não informado”.

## Executar localmente

Requisitos: Node.js 22 ou superior.

```bash
npm ci
npm run dev
```

Para gerar ou atualizar o resumo localmente (Python 3.12+):

```bash
python -m pip install pandas requests
python scripts/update_sisvan.py
npm run build
```

## Publicação

O workflow **NutriData — atualizar dados e publicar**:
1. Em execução agendada ou manual, baixa o arquivo oficial.
2. Valida e agrega os registros do Paraná em um JSON pequeno.
3. Salva o resumo atualizado no repositório.
4. Executa `npm ci` e `npm run build`.
5. Confere os arquivos finais em `dist`.
6. Envia um único artefato e publica no GitHub Pages.

Em eventos de push, utiliza o dataset já versionado e não baixa novamente o arquivo bruto.

## Limitações

A série atualmente configurada é 2023. O painel não deve ser interpretado como retrato em tempo real nem como série histórica completa. Indicadores são descritivos e não substituem avaliação clínica.
