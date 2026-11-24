import { useEffect, useMemo, useState } from "react";

const DATA_URL = `${import.meta.env.BASE_URL}data/sisvan-pr.json`;

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
}

function BarList({ title, subtitle, items = [], accent = "green" }) {
  const max = Math.max(1, ...items.map((item) => Number(item.value || 0)));
  return (
    <section className="panel">
      <div className="panel-heading">
        <div><span className="eyebrow">{subtitle}</span><h2>{title}</h2></div>
        <span className="panel-count">{items.length} categorias</span>
      </div>
      {items.length ? <div className="bar-list">
        {items.slice(0, 10).map((item) => (
          <div className="bar-row" key={item.label}>
            <div className="bar-meta"><span title={item.label}>{item.label || "Não informado"}</span><strong>{formatNumber(item.value)}</strong></div>
            <div className="bar-track"><span className={accent} style={{ width: `${Math.max(1, Number(item.value || 0) / max * 100)}%` }} /></div>
          </div>
        ))}
      </div> : <p className="empty">Sem dados disponíveis para esta dimensão.</p>}
    </section>
  );
}

function Donut({ items = [] }) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const colors = ["#176b57", "#2c9b7c", "#79bda7", "#e4a34f", "#d66d4f", "#8a9b92"];
  let cursor = 0;
  const segments = items.slice(0, 6).map((item, index) => {
    const share = total ? Number(item.value || 0) / total * 100 : 0;
    const segment = { ...item, share, color: colors[index % colors.length], offset: cursor };
    cursor += share;
    return segment;
  });
  return <div className="donut-layout">
    <svg className="donut" viewBox="0 0 120 120" role="img" aria-label="Distribuição por fase da vida">
      <circle cx="60" cy="60" r="43" fill="none" stroke="#edf1ed" strokeWidth="15" />
      {segments.map((item) => <circle key={item.label} cx="60" cy="60" r="43" fill="none" stroke={item.color} strokeWidth="15" pathLength="100" strokeDasharray={`${item.share} ${100-item.share}`} strokeDashoffset={-item.offset} transform="rotate(-90 60 60)" />)}
      <text x="60" y="57" textAnchor="middle" className="donut-total">{formatNumber(total)}</text>
      <text x="60" y="70" textAnchor="middle" className="donut-caption">registros</text>
    </svg>
    <div className="legend">{segments.map(item => <div key={item.label}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{item.share.toLocaleString("pt-BR",{maximumFractionDigits:1})}%</strong></div>)}</div>
  </div>;
}

export default function App() {
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Arquivo de dados indisponível (HTTP ${response.status}).`);
      const payload = await response.json();
      if (!payload || typeof payload !== "object" || !payload.summary) throw new Error("O arquivo de dados possui formato inválido.");
      setDataset(payload);
      setUpdatedAt(new Date(payload.generated_at || Date.now()).toLocaleString("pt-BR"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar os dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const summary = dataset?.summary || {};
  const phases = useMemo(() => dataset?.dimensions?.phase || [], [dataset]);
  const classes = useMemo(() => dataset?.dimensions?.classification || [], [dataset]);
  const municipalities = useMemo(() => dataset?.dimensions?.municipality || [], [dataset]);
  const sexes = useMemo(() => dataset?.dimensions?.sex || [], [dataset]);

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#inicio"><span className="brand-mark">N</span><span>NutriData<small>SISVAN • PARANÁ</small></span></a>
      <div className="side-label">PAINEL ANALÍTICO</div>
      <a className="nav-link active" href="#inicio">Visão geral</a>
      <a className="nav-link" href="#distribuicao">Distribuições</a>
      <a className="nav-link" href="#municipios">Municípios</a>
      <div className="sidebar-note"><strong>Fonte oficial</strong><p>Sistema de Vigilância Alimentar e Nutricional — Ministério da Saúde.</p><span>Recorte: Paraná (PR)</span></div>
      <div className="side-footer">Projeto acadêmico • NutriData</div>
    </aside>
    <main className="main-content" id="inicio">
      <header className="topbar">
        <div><span className="eyebrow">INTELIGÊNCIA EM SAÚDE PÚBLICA</span><h1>Monitoramento nutricional</h1><p>Panorama dos acompanhamentos registrados no SISVAN para o Paraná.</p></div>
        <button className="button primary" onClick={loadData} disabled={loading}>{loading ? "Carregando…" : "↻ Atualizar painel"}</button>
      </header>

      {error && <div className="notice error" role="alert"><strong>Não foi possível carregar a base.</strong><span>{error} A publicação pode ser reconstruída pelo workflow de atualização do SISVAN.</span></div>}
      {loading && !dataset && <div className="loading-panel"><span className="loader" />Carregando indicadores publicados…</div>}
      {!loading && (!dataset || Number(dataset.summary?.total_records || 0) === 0) && <div className="empty-state"><h2>Base de dados ainda não publicada</h2><p>Execute o workflow “NutriData — atualizar dados e publicar” no GitHub Actions para gerar a primeira versão.</p><a href="https://github.com/Gustav0c-DEV/NutriData/actions">Abrir GitHub Actions</a></div>}

      {dataset && Number(summary.total_records) > 0 && <>
        <section className="intro">
          <div><span className="eyebrow">RECORTE EPIDEMIOLÓGICO</span><h2>Estado nutricional da população acompanhada</h2><p>Indicadores agregados a partir da base pública do SISVAN. Os resultados representam registros de acompanhamento, não indivíduos únicos.</p></div>
          <div className="data-chip"><span className="status-dot" />Base validada<strong>{dataset.source_year || "2023"}</strong><small>Atualizada em {updatedAt}</small></div>
        </section>
        <section className="kpi-grid" aria-label="Indicadores principais">
          <article className="kpi-card"><span>Registros analisados</span><strong>{formatNumber(summary.total_records)}</strong><small>Linhas válidas no Paraná</small></article>
          <article className="kpi-card"><span>Municípios identificados</span><strong>{formatNumber(summary.municipalities)}</strong><small>Municípios com registros</small></article>
          <article className="kpi-card"><span>Classificações válidas</span><strong>{formatNumber(summary.classified_records)}</strong><small>Registros com classificação informada</small></article>
          <article className="kpi-card"><span>Sexo não informado</span><strong>{summary.missing_sex_pct == null ? "—" : `${Number(summary.missing_sex_pct).toLocaleString("pt-BR",{maximumFractionDigits:1})}%`}</strong><small>Percentual dos registros</small></article>
        </section>
        <section className="analysis-grid" id="distribuicao">
          <section className="panel"><div className="panel-heading"><div><span className="eyebrow">PERFIL DOS ACOMPANHAMENTOS</span><h2>Fase da vida</h2></div></div><Donut items={phases} /></section>
          <BarList title="Classificação nutricional" subtitle="DISTRIBUIÇÃO" items={classes} accent="orange" />
          <div id="municipios"><BarList title="Municípios com mais registros" subtitle="DISTRIBUIÇÃO TERRITORIAL" items={municipalities} /></div>
          <BarList title="Distribuição por sexo" subtitle="CARACTERIZAÇÃO" items={sexes} accent="orange" />
        </section>
        <footer className="methodology">
          <strong>Nota metodológica</strong>
          <p>Fonte: SISVAN / Ministério da Saúde. Ano de referência: {dataset.source_year || "2023"}. A contagem considera registros de acompanhamento; uma mesma pessoa pode possuir mais de um registro. Categorias e classificações dependem do preenchimento e do dicionário de dados da fonte. Este painel é exploratório e não substitui avaliação clínica.</p>
          <span>Arquivo processado: {dataset.file_name || "base pública SISVAN"} · {formatNumber(summary.total_records)} registros validados.</span>
        </footer>
      </>}
    </main>
  </div>;
}
