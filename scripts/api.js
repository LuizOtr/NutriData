const API_URL = "https://apidadosabertos.saude.gov.br/sisvan/estado-nutricional";

function extractRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.estados_nutricionais)) return payload.estados_nutricionais;
  return Object.values(payload).find(Array.isArray) || [];
}

async function consultarSISVAN({ uf = "PR", limit = 20, offset = 0, signal } = {}) {
  const pageSize = Number(limit);
  const pageOffset = Number(offset);

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 20) {
    throw new RangeError("O limite da API SISVAN deve ficar entre 1 e 20.");
  }
  if (!Number.isInteger(pageOffset) || pageOffset < 0) {
    throw new RangeError("O offset deve ser um inteiro maior ou igual a zero.");
  }

  const params = new URLSearchParams({
    uf: String(uf).toUpperCase(),
    limit: String(pageSize),
    offset: String(pageOffset)
  });
  const response = await fetch(`${API_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    signal
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`API SISVAN HTTP ${response.status}: ${detail.slice(0, 240)}`);
  }

  const payload = await response.json();
  const records = extractRecords(payload);
  return {
    records,
    offset: pageOffset,
    limit: pageSize,
    hasMore: records.length === pageSize,
    source: API_URL
  };
}

module.exports = { consultarSISVAN, extractRecords };
