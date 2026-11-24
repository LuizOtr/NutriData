import { useEffect, useMemo, useRef, useState } from "react";

const fields = {
  municipality: ["municipio", "nome_municipio", "no_municipio"],
  uf: ["uf", "sigla_uf", "sg_uf"],
  age: ["idade", "nu_idade", "idade_anos"],
  phase: ["fase_vida", "fase_da_vida", "descricao_fase_vida", "ds_fase_vida"],
  sex: ["sexo", "ds_sexo"],
  date: ["data_acompanhamento", "competencia", "data", "dt_acompanhamento"],
  imc: ["imc", "valor_imc"],
  classification: [
    "codigo_estado_nutricional_adulto", "adulto_imc",
    "crianca_imc_x_idade", "adolescente_imc_x_idade",
    "codigo_estado_nutricional_idoso", "estado_nutricional",
    "classificacao_nutricional", "ds_estado_nutricional", "estado_nutricional_adulto", "imc_adulto"
  ]
};

function getValue(row, candidates) {
  for (const key of candidates) {
    if (row?.[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return "";
}

function normalizeText(value) {
  return String(value ?? "").trim().toLocaleLowerCase("pt-BR");
}

function extractRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  return Object.values(payload).find(Array.isArray) || [];
}

function classifyLabel(row) {
  const raw = getValue(row, fields.classification);
  if (typeof raw === "object") return JSON.stringify(raw);
  return String(raw || "Não informado").replaceAll("_", " ");
}

function countBy(records, getter) {
  const counts = new Map();
  for (const row of records) {
    const label = String(getter(row) || "Não informado").trim();
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function escapeError(error) {
  return error instanceof Error ? error.message : String(error);
}

function ExecutiveInsights({ records }) {
  const phaseCounts = countBy(records, row => getValue(row, fields.phase));
  const classCounts = countBy(records, classifyLabel).filter(([label]) => label !== "Não informado");
  const cityCounts = countBy(records, row => getValue(row, fields.municipality));
  const insights = [
    { label: "Fase mais frequente", item: phaseCounts[0], detail: "Maior grupo na amostra consultada" },
    { label: "Município em destaque", item: cityCounts[0], detail: "Maior volume de acompanhamentos" },
    { label: "Classificação mais comum", item: classCounts[0], detail: "Entre os registros com classificação" }
  ];

  return (
    <section className="insights-section" id="analysis">
      <div className="section-heading"><div><span className="eyebrow">LEITURA RÁPIDA</span><h3>Principais insights</h3></div><span>Base atual: {records.length.toLocaleString("pt-BR")} registros</span></div>
      <div className="insight-grid">
        {insights.map(({ label, item, detail }, index) => (
          <article className={`insight-card insight-${index + 1}`} key={label}>
            <span className="insight-label">{label}</span>
            <strong>{item?.[0] || "Aguardando dados"}</strong>
            <span className="insight-detail">{item ? `${item[1].toLocaleString("pt-BR")} registros · ${detail}` : "Consulte a API para gerar esta leitura."}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function DashboardCharts({ records }) {
  const phaseRef = useRef(null);
  const nutritionRef = useRef(null);
  const municipalityRef = useRef(null);
  const chartsRef = useRef([]);
  const phaseCounts = countBy(records, row => getValue(row, fields.phase));
  const phaseChartCounts = [...phaseCounts].sort((first, second) => second[1] - first[1]);
  const phaseColors = phaseChartCounts.map((_, index) => ["#00695C", "#26A69A", "#80CBC4", "#FF8A50", "#FFB078"][Math.min(index, 4)]);
  const classCounts = countBy(records, classifyLabel).filter(([label]) => label !== "Não informado");
  const cityCounts = countBy(records, row => getValue(row, fields.municipality)).slice(0, 10);

  useEffect(() => {
    if (!window.Chart) return undefined;

    chartsRef.current.forEach(chart => chart.destroy());
    const common = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { usePointStyle: true, boxWidth: 7, color: "#455a54", font: { size: 10 } }
        }
      }
    };

    chartsRef.current = [
      new window.Chart(phaseRef.current, {
        type: "bar",
        data: {
          labels: phaseChartCounts.map(([label]) => label),
          datasets: [{
            label: "Registros",
            data: phaseChartCounts.map(([, count]) => count),
            backgroundColor: phaseColors,
            borderRadius: 5,
            borderSkipped: false,
            barPercentage: 0.72,
            categoryPercentage: 0.76
          }]
        },
        options: {
          ...common,
          indexAxis: "y",
          layout: { padding: { right: 34 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#FFFFFF",
              titleColor: "#263238",
              bodyColor: "#263238",
              borderColor: "#DCE5E3",
              borderWidth: 1,
              callbacks: {
                label(context) {
                  const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                  const count = context.parsed.x;
                  const percentage = total ? (100 * count / total).toFixed(1).replace(".", ",") : "0,0";
                  return `${count.toLocaleString("pt-BR")} registros (${percentage}%)`;
                },
                labelColor(context) {
                  const color = phaseColors[context.dataIndex];
                  return { backgroundColor: color, borderColor: color };
                }
              }
            }
          },
          scales: {
            x: { beginAtZero: true, grace: "12%", grid: { color: "#E3ECEA" }, ticks: { color: "#455A54", precision: 0 } },
            y: { grid: { display: false }, ticks: { color: "#263238", autoSkip: false } }
          }
        },
        plugins: [{
          id: "phaseCountLabels",
          afterDatasetsDraw(chart) {
            const context = chart.ctx;
            const dataset = chart.data.datasets[0];
            const meta = chart.getDatasetMeta(0);
            context.save();
            context.fillStyle = "#263238";
            context.font = '600 11px "DM Sans", sans-serif';
            context.textAlign = "left";
            context.textBaseline = "middle";
            meta.data.forEach((bar, index) => {
              context.fillText(Number(dataset.data[index]).toLocaleString("pt-BR"), bar.x + 8, bar.y);
            });
            context.restore();
          }
        }]
      }),
      new window.Chart(nutritionRef.current, {
        type: "bar",
        data: {
          labels: classCounts.map(([label]) => label),
          datasets: [{ label: "Registros", data: classCounts.map(([, count]) => count), backgroundColor: "#26A69A", borderRadius: 4 }]
        },
        options: { ...common, indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, grid: { color: "#E3ECEA" }, ticks: { color: "#596a65" } }, y: { grid: { display: false }, ticks: { color: "#455a54" } } } }
      }),
      new window.Chart(municipalityRef.current, {
        type: "bar",
        data: {
          labels: cityCounts.map(([label]) => label),
          datasets: [{ label: "Registros", data: cityCounts.map(([, count]) => count), backgroundColor: "#80CBC4", borderRadius: 4 }]
        },
        options: { ...common, indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, grid: { color: "#E3ECEA" }, ticks: { color: "#596a65" } }, y: { grid: { display: false }, ticks: { color: "#455a54" } } } }
      })
    ];

    return () => {
      chartsRef.current.forEach(chart => chart.destroy());
      chartsRef.current = [];
    };
  }, [records]);

  return (
    <section className="content-grid" aria-label="Gráficos de análise">
      <article className="panel chart-panel">
        <div className="panel-heading"><div><span className="eyebrow">DISTRIBUIÇÃO</span><h3>Registros por fase da vida</h3></div><span className="panel-tag">Dados carregados</span></div>
        <div className="chart-wrap"><canvas ref={phaseRef} /><div className="empty-chart" style={{ display: phaseCounts.length ? "none" : "grid" }}>Aguardando dados da API</div></div>
      </article>
      <article className="panel chart-panel">
        <div className="panel-heading"><div><span className="eyebrow">CLASSIFICAÇÃO</span><h3>Classificações nutricionais</h3></div></div>
        <div className="chart-wrap"><canvas ref={nutritionRef} /><div className="empty-chart" style={{ display: classCounts.length ? "none" : "grid" }}>Aguardando dados da API</div></div>
      </article>
      <article className="panel full-panel">
        <div className="panel-heading"><div><span className="eyebrow">TERRITÓRIO</span><h3>Municípios com mais registros</h3></div></div>
        <div className="chart-wrap horizontal"><canvas ref={municipalityRef} /><div className="empty-chart" style={{ display: cityCounts.length ? "none" : "grid" }}>Aguardando dados da API</div></div>
      </article>
    </section>
  );
}

function RecordsTable({ records }) {
  if (!records.length) {
    return <tbody><tr><td colSpan="8" className="table-empty">Nenhum registro para os filtros selecionados.</td></tr></tbody>;
  }

  return (
    <tbody>
      {records.slice(0, 100).map((row, index) => {
        const values = [
          getValue(row, fields.municipality) || "—",
          getValue(row, fields.uf) || "—",
          getValue(row, fields.age) || "—",
          getValue(row, fields.phase) || "—",
          getValue(row, fields.sex) || "—",
          getValue(row, fields.date) || "—",
          getValue(row, fields.imc) || "—",
          classifyLabel(row)
        ];
        return <tr key={`${getValue(row, fields.municipality)}-${getValue(row, fields.date)}-${index}`}>{values.map((value, cell) => <td key={cell}>{String(value)}</td>)}</tr>;
      })}
    </tbody>
  );
}

export default function App() {
  const [records, setRecords] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uf, setUf] = useState("PR");
  const [limit, setLimit] = useState(20);
  const [municipalityFilter, setMunicipalityFilter] = useState("");
  const [status, setStatus] = useState({ text: "Não consultado", type: "neutral" });
  const [notice, setNotice] = useState({
    title: "Dados não carregados",
    message: "Consulte a API para obter os registros do SISVAN."
  });
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const dataCache = useRef(null);

  function showToast(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  }

  useEffect(() => {
    setStatus({ text: "Base pública disponível", type: "neutral" });
    return () => clearTimeout(toastTimer.current);
  }, []);

  async function fetchPage(reset = false, overrides = {}) {
    if (loading) return;
    if (!reset && !hasMore) return;

    const pageOffset = reset ? 0 : offset;
    const existing = reset ? [] : records;
    setLoading(true);
    if (reset) {
      setRecords([]);
      setOffset(0);
      setHasMore(true);
    }
    setStatus({ text: "Consultando API", type: "neutral" });

    const requestUf = overrides.uf ?? uf;
    const requestLimit = overrides.limit ?? limit;
    const params = new URLSearchParams({ uf: requestUf, limit: String(requestLimit), offset: String(pageOffset) });
    try {
      let allRecords = dataCache.current;
      if (!allRecords) {
        const response = await fetch(`${import.meta.env.BASE_URL}data/sisvan-pr.json.gz`);
        if (!response.ok) throw new Error(`Não foi possível carregar a base pública (HTTP ${response.status}).`);
        if (typeof DecompressionStream === "undefined") {
          throw new Error("Este navegador não oferece suporte à descompressão gzip necessária para a base SISVAN.");
        }
        const compressed = await response.arrayBuffer();
        const decompressed = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
        const payload = JSON.parse(await new Response(decompressed).text());
        allRecords = extractRecords(payload);
        if (!allRecords.length) {
          throw new Error("A base publicada não contém registros. Execute novamente a atualização do SISVAN no GitHub Actions.");
        }
        dataCache.current = allRecords;
      }
      const pageRecords = allRecords.slice(pageOffset, pageOffset + requestLimit);
      if (pageOffset >= allRecords.length) {
        setHasMore(false);
        setStatus({ text: "Base carregada", type: "ok" });
        return;
      }

      const keys = new Set(existing.map(row => JSON.stringify(row)));
      const uniquePage = pageRecords.filter(row => {
        const key = JSON.stringify(row);
        if (keys.has(key)) return false;
        keys.add(key);
        return true;
      });
      const updatedRecords = [...existing, ...uniquePage];
      setRecords(updatedRecords);
      setOffset(pageOffset + pageRecords.length);
      setHasMore(pageRecords.length === requestLimit);
      setStatus({ text: "Dados oficiais carregados", type: "ok" });
      setNotice({
        title: "Consulta concluída",
        message: `${pageRecords.length} registros exibidos nesta página. ${updatedRecords.length} registros carregados nesta sessão, de uma base oficial do SISVAN filtrada para o Paraná.`
      });
      showToast(`${pageRecords.length} registros recebidos.`);
    } catch (error) {
      console.error("Falha na consulta SISVAN:", error);
      const message = escapeError(error);
      setStatus({ text: "Falha na consulta", type: "error" });
      setNotice({ title: "Não foi possível concluir", message: `${message}. Verifique o terminal do servidor para detalhes.` });
      showToast(message);
    } finally {
      setLoading(false);
    }
  }

  const filteredRecords = useMemo(() => records.filter(row => !normalizeText(municipalityFilter)
    || normalizeText(getValue(row, fields.municipality)).includes(normalizeText(municipalityFilter))), [records, municipalityFilter]);
  const municipalities = new Set(filteredRecords.map(row => getValue(row, fields.municipality)).filter(Boolean));
  const adults = filteredRecords.filter(row => normalizeText(getValue(row, fields.phase)).includes("adult")).length;
  const eligible = filteredRecords.map(classifyLabel).map(normalizeText).filter(label => label !== "não informado");
  const excess = eligible.filter(label => label.includes("sobrepeso") || label.includes("obesidade")).length;

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <a className="brand" href="#overview"><span className="brand-mark">N</span><span>NutriData<small>SISVAN • PARANÁ</small></span></a>
          <div className="side-label">PAINEL</div>
          <a className="nav-link active" href="#overview"><span>▦</span> Visão geral</a>
          <a className="nav-link" href="#analysis"><span>◫</span> Análises</a>
          <a className="nav-link" href="#records"><span>☷</span> Registros</a>
          <div className="sidebar-note"><strong>Fonte de dados</strong><p>API de Dados Abertos do Ministério da Saúde.</p><span className="source-status"><i /> Consulta sob demanda</span></div>
          <div className="side-footer">Projeto acadêmico • 2026</div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div><span className="eyebrow">INTELIGÊNCIA EM SAÚDE PÚBLICA</span><h1>Monitoramento nutricional</h1></div>
            <div className="top-actions"><span className={`status-badge ${status.type}`}>{status.text}</span><button className="button primary" onClick={() => fetchPage(true)} disabled={loading}>↻ Atualizar dados</button></div>
          </header>

          <section className="intro" id="overview">
            <div><h2>Estado nutricional da população</h2><p>Acompanhamentos do SISVAN para o Paraná.</p></div>
            <div className="filters">
              <label>UF<select value={uf} onChange={event => { const value = event.target.value; setUf(value); fetchPage(true, { uf: value }); }}><option value="PR">Paraná (PR)</option></select></label>
              <label>Registros por consulta<select value={limit} onChange={event => { const value = Number(event.target.value); setLimit(value); fetchPage(true, { limit: value }); }}><option value="20">20</option><option value="10">10</option><option value="5">5</option></select></label>
              <label>Município<input type="search" placeholder="Filtrar município" value={municipalityFilter} onChange={event => setMunicipalityFilter(event.target.value)} /></label>
              <button className="button dark" onClick={() => fetchPage(true)} disabled={loading}>{loading ? "Consultando..." : "Consultar API"}</button>
            </div>
          </section>

          <section className={`notice ${status.type}`} role="status"><strong>{notice.title}</strong><span>{records.length ? `${records.length.toLocaleString("pt-BR")} registros disponíveis para análise.` : notice.message}</span></section>

          <section className="kpi-grid" aria-label="Indicadores">
            <article className="kpi-card"><div className="kpi-top"><span>Registros carregados</span><span className="kpi-icon blue">▤</span></div><strong>{filteredRecords.length.toLocaleString("pt-BR")}</strong><small>Na sessão atual</small></article>
            <article className="kpi-card"><div className="kpi-top"><span>Municípios</span><span className="kpi-icon violet">⌖</span></div><strong>{municipalities.size.toLocaleString("pt-BR")}</strong><small>Municípios distintos</small></article>
            <article className="kpi-card"><div className="kpi-top"><span>Adultos</span><span className="kpi-icon green">♙</span></div><strong>{adults.toLocaleString("pt-BR")}</strong><small>Fase da vida identificada</small></article>
            <article className="kpi-card"><div className="kpi-top"><span>Excesso de peso*</span><span className="kpi-icon orange">⌁</span></div><strong>{eligible.length ? `${(100 * excess / eligible.length).toFixed(1).replace(".", ",")}%` : "—"}</strong><small>Sobrepeso + obesidade, quando classificável</small></article>
          </section>

          <ExecutiveInsights records={filteredRecords} />
          <DashboardCharts records={filteredRecords} />

          <section className="panel records-panel" id="records">
            <div className="panel-heading records-heading"><div><span className="eyebrow">BASE EXPLORADA</span><h3>Registros retornados pela API</h3><p>{filteredRecords.length.toLocaleString("pt-BR")} registros exibidos de {records.length.toLocaleString("pt-BR")} carregados.</p></div><button className="button outline" onClick={() => fetchPage(false)} disabled={loading || !hasMore || records.length === 0}>Carregar mais</button></div>
            <div className="table-scroll"><table><thead><tr><th>Município</th><th>UF</th><th>Idade</th><th>Fase da vida</th><th>Sexo</th><th>Data</th><th>IMC</th><th>Classificação</th></tr></thead><RecordsTable records={filteredRecords} /></table></div>
          </section>

          <footer className="footer"><span>NutriData • Projeto acadêmico de análise de dados</span><span>*Indicador exploratório. Não substitui avaliação clínica nem representa toda a população do Paraná.</span></footer>
        </main>
      </div>
      <div className={`toast ${toast ? "show" : ""}`} aria-live="polite">{toast}</div>
    </>
  );
}