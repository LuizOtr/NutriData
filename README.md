# NutriData — SISVAN Paraná

[![Deploy NutriData to GitHub Pages](https://github.com/LuizOtr/NutriData/actions/workflows/deploy.yml/badge.svg)](https://github.com/LuizOtr/NutriData/actions/workflows/deploy.yml)
[![GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-success?style=flat&logo=github)](https://LuizOtr.github.io/NutriData/)

Dashboard analítico de monitoramento do estado nutricional no estado do Paraná com base nos dados públicos abertos do **SISVAN** (Sistema de Vigilância Alimentar e Nutricional — Ministério da Saúde).

---

## 🌐 Demonstração Online

Acesse o painel publicado no GitHub Pages:
👉 **[https://LuizOtr.github.io/NutriData/](https://LuizOtr.github.io/NutriData/)**

---

## 🚀 Funcionalidades

- **Indicadores Chave (KPIs):**
  - Total de acompanhamentos registrados no Paraná.
  - Quantidade de municípios identificados.
  - Volume de classificações nutricionais válidas.
  - Taxa de registros sem especificação de sexo.
- **Visualizações Interativas:**
  - Gráfico Donut de distribuição por Fase da Vida (Crianças, Adolescentes, Adultos, Idosos).
  - Barras proporcionais de Classificação Nutricional (Eutrofia, Sobrepeso, Obesidade, etc.).
  - Distribuição territorial dos municípios com maior volume de acompanhamentos.
  - Caracterização demográfica por sexo.
- **Pipeline de Dados Robusto:**
  - Script Python (`scripts/update_sisvan.py`) para ingestão resiliente via API oficial de Dados Abertos do Ministério da Saúde.
  - Base de dados versionada diretamente no repositório (`public/data/sisvan-pr.json`), permitindo carregamento estático veloz e confiável no GitHub Pages.
- **CI/CD Automatizado:**
  - Workflow GitHub Actions para build estático e publicação contínua no GitHub Pages.
  - Workflow de atualização agendada ou sob demanda dos dados do SISVAN.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, Vite, CSS moderno responsivo.
- **Servidor Local (opcional):** Node.js / Express (`server.cjs`).
- **Pipeline de Dados:** Python 3 (padrão `urllib` / `json` / `collections`).
- **Hospedagem & CI/CD:** GitHub Pages + GitHub Actions.

---

## 💻 Como Executar Localmente

### Pré-requisitos
- Node.js 18+ (recomendado 20+)
- Python 3.10+ (opcional, apenas para atualizar a base de dados)

### 1. Clonar o repositório
```bash
git clone https://github.com/LuizOtr/NutriData.git
cd NutriData
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Rodar em ambiente de desenvolvimento
```bash
npm run dev
```
O Vite iniciará o servidor local em `http://127.0.0.1:5173`.

### 4. Executar com o servidor Express (produção local)
```bash
npm start
```
Acesse `http://localhost:3000`.

---

## 🔄 Como Atualizar a Base de Dados

Para consultar novamente a API oficial do Ministério da Saúde e gerar uma nova versão da base agregada do Paraná:

```bash
python scripts/update_sisvan.py --target 500
```

Os novos dados serão validados e gravados em `public/data/sisvan-pr.json`.

---

## 📋 Nota Metodológica

- **Fonte:** Portal de Dados Abertos do SUS / SISVAN — Ministério da Saúde.
- **Recorte geográfico:** Paraná (`PR`).
- **Unidade:** Registros de acompanhamento (um mesmo indivíduo pode ter mais de um acompanhamento no ano).
- **Finalidade:** Fins acadêmicos e analíticos descritivos; não substitui diagnóstico ou conduta clínica.

---

Desenvolvido para fins acadêmicos.
