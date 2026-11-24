const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || (process.argv.includes("--dev") ? 3001 : 3000);
const API_BASE = "https://apidadosabertos.saude.gov.br/sisvan/estado-nutricional";

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "dist")));

app.get("/api/sisvan", async (req, res) => {
  try {
    const allowed = [
      "codigo_municipio", "uf", "codigo_cnes", "idade_minima", "idade_maxima",
      "codigo_fase_vida", "codigo_povo_comunidade", "codigo_escolaridade",
      "ano_mes_competencia", "gestante"
    ];
    const params = new URLSearchParams();

    for (const key of allowed) {
      const value = req.query[key];
      if (typeof value === "string" && value.trim() !== "") {
        params.set(key, value.trim());
      }
    }

    const limit = Number.parseInt(String(req.query.limit ?? "20"), 10);
    const offset = Number.parseInt(String(req.query.offset ?? "0"), 10);
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      return res.status(400).json({ error: "O parâmetro limit deve estar entre 1 e 20." });
    }
    if (!Number.isInteger(offset) || offset < 0) {
      return res.status(400).json({ error: "O parâmetro offset deve ser maior ou igual a zero." });
    }

    params.set("limit", String(limit));
    params.set("offset", String(offset));
    if (!params.has("uf")) params.set("uf", "PR");

    const upstream = await fetch(`${API_BASE}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        ...(process.env.SISVAN_API_KEY ? { Authorization: `Bearer ${process.env.SISVAN_API_KEY}` } : {})
      },
      signal: AbortSignal.timeout(30000)
    });

    const body = await upstream.text();
    res.status(upstream.status);
    res.set("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    res.send(body);
  } catch (error) {
    console.error("[SISVAN] Falha na consulta:", error.message);
    res.status(502).json({
      error: "Não foi possível consultar a API do SISVAN.",
      detail: error.name === "TimeoutError" ? "A API demorou para responder." : error.message
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "NutriData", node: process.version });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`NutriData disponível em http://localhost:${PORT}`);
});
