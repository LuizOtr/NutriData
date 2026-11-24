# NutriData — SISVAN Paraná (Tempo Real & Larga Escala)

[![Deploy NutriData to GitHub Pages](https://github.com/LuizOtr/NutriData/actions/workflows/deploy.yml/badge.svg)](https://github.com/LuizOtr/NutriData/actions/workflows/deploy.yml)
[![GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-success?style=flat&logo=github)](https://LuizOtr.github.io/NutriData/)

Dashboard analítico de monitoramento do estado nutricional no estado do Paraná com base nos dados públicos abertos do **SISVAN** (Sistema de Vigilância Alimentar e Nutricional — Ministério da Saúde), com **suporte a larga escala (2.500+ registros)** e **monitoramento em tempo real**.

---

## 🌐 Demonstração Online

Acesse o painel publicado no GitHub Pages:
👉 **[https://LuizOtr.github.io/NutriData/](https://LuizOtr.github.io/NutriData/)**

---

## 🚀 Novas Funcionalidades

- **Base de Dados Ampliada (2.500+ acompanhamentos):**
  - Dados consolidados abrangendo dezenas de municípios paranaenses (Curitiba, Londrina, Maringá, Cascavel, Ponta Grossa, Toledo, Foz do Iguaçu, Guarapuava, etc.).
  - Representatividade epidemiológica em todas as faixas etárias (bebês, crianças, adolescentes, adultos e idosos).
- **Monitoramento em Tempo Real (Live Telemetry & Sync):**
  - **Status da API do Ministério da Saúde:** indicador visual com latência e status de conectividade ao vivo.
  - **Sincronização Manual:** botão para consultar e injetar novos registros em tempo real diretamente da API oficial.
  - **Streaming Automático:** toggle para habilitar consulta periódica em tempo real (a cada 15 segundos), atualizando indicadores e gráficos instantaneamente sem recarregar a página.
- **Filtros Interativos Dinâmicos:**
  - Filtragem em tempo real por **Fase da Vida**, **Classificação Nutricional**, **Sexo** e **Busca textual por Município**.
  - Recálculo reativo instantâneo de todos os gráficos (Donut, Barras e KPIs).
- **Explorador Detalhado de Registros:**
  - Tabela completa de acompanhamentos individuais exibindo: ID, Município, Fase, Idade, Sexo, Peso, Altura, IMC, Classificação com tags semânticas e Data.
  - Paginação interativa rápida.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, Vite, CSS moderno responsivo.
- **Servidor Local (Proxy API):** Node.js / Express (`server.cjs`) com suporte a CORS.
- **Pipeline de Dados:** Python 3 (`scripts/update_sisvan.py`) para ingestão e enriquecimento de base.
- **Hospedagem & CI/CD:** GitHub Pages + GitHub Actions.

---

## 💻 Como Executar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/LuizOtr/NutriData.git
cd NutriData
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Rodar em desenvolvimento (Vite)
```bash
npm run dev
```
Acesse `http://127.0.0.1:5173`.

### 4. Executar com servidor Express (Produção com Proxy da API)
```bash
npm start
```
Acesse `http://localhost:3000`. Nesse modo, as requisições em tempo real passam pelo proxy local `/api/sisvan`, consultando a API do Ministério da Saúde diretamente sem restrições de CORS.

---

## 🔄 Como Atualizar ou Expandir a Base de Dados

Para gerar uma base ainda maior ou atualizar os dados da API:

```bash
# Gera base de 2.500 registros
python scripts/update_sisvan.py --target 2500

# Ou gere uma base de 5.000 registros
python scripts/update_sisvan.py --target 5000
```

Os dados são salvos em `public/data/sisvan-pr.json`.

---

## 📋 Nota Metodológica

- **Fonte:** Portal de Dados Abertos do SUS / SISVAN — Ministério da Saúde.
- **Recorte geográfico:** Paraná (`PR`).
- **Unidade:** Registros de acompanhamento (um mesmo indivíduo pode ter mais de um acompanhamento no ano).
- **Finalidade:** Fins acadêmicos e analíticos descritivos; não substitui diagnóstico ou conduta clínica.

---

Desenvolvido para fins acadêmicos.
