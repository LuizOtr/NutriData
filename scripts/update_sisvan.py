#!/usr/bin/env python3
"""Gera um resumo agregado e leve da base SISVAN do Paraná (2023)."""
from __future__ import annotations
import csv, json, re, tempfile, unicodedata, zipfile
from collections import Counter
from datetime import datetime, timezone
from itertools import chain
from pathlib import Path
import pandas as pd
import requests

SOURCE_URL = "https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/SISVAN/estado_nutricional/sisvan_estado_nutricional_2023.zip"
OUTPUT = Path("public/data/sisvan-pr.json")
UF_KEYS = ("uf", "sg_uf", "sigla_uf", "estado", "sg_uf_residencia")
FIELD_ALIASES = {
 "municipality": ("municipio", "no_municipio", "nome_municipio", "municipio_residencia"),
 "phase": ("fase_vida", "fase_da_vida", "descricao_fase_vida", "ds_fase_vida", "no_fase_vida"),
 "sex": ("sexo", "ds_sexo", "no_sexo"),
 "classification": ("estado_nutricional", "classificacao_nutricional", "ds_estado_nutricional", "ds_estado_nutricional_adulto", "ds_estado_nutricional_crianca", "ds_estado_nutricional_adolescente", "ds_estado_nutricional_idoso", "codigo_estado_nutricional_adulto", "codigo_estado_nutricional_idoso"),
}
def norm(value):
 value = unicodedata.normalize("NFKD", str(value))
 value = "".join(c for c in value if not unicodedata.combining(c))
 return re.sub(r"[^a-zA-Z0-9]+", "_", value.strip().lower()).strip("_")
def is_pr(value):
 value = norm(value)
 return value in {"pr", "parana", "41"}
def dimension_value(row, keys):
 for key in keys:
  value = row.get(key)
  if value is not None and str(value).strip() and str(value).strip().lower() not in {"nan", "none", "null"}:
   return str(value).strip()
 return "Não informado"
def as_items(counter, limit=10):
 return [{"label": label, "value": count} for label, count in counter.most_common(limit)]
def main():
 OUTPUT.parent.mkdir(parents=True, exist_ok=True)
 with tempfile.TemporaryDirectory() as temp:
  zip_path = Path(temp) / "sisvan.zip"
  with requests.get(SOURCE_URL, stream=True, timeout=(30, 300)) as response:
   response.raise_for_status()
   with zip_path.open("wb") as target:
    for chunk in response.iter_content(1024 * 1024):
     if chunk: target.write(chunk)
  with zipfile.ZipFile(zip_path) as archive:
   candidates = [f for f in archive.infolist() if not f.is_dir() and f.filename.lower().endswith((".csv", ".txt"))]
   if not candidates: raise RuntimeError("O ZIP oficial não contém CSV/TXT.")
   source_info = max(candidates, key=lambda f: f.file_size)
   with archive.open(source_info) as source:
    sample = source.read(256 * 1024); source.seek(0)
    try: encoding = "utf-8-sig"; sample.decode(encoding)
    except UnicodeDecodeError: encoding = "latin-1"
    try: delimiter = csv.Sniffer().sniff(sample.decode(encoding), delimiters=";,\t|").delimiter
    except csv.Error: delimiter = "\t" if sample.count(b"\t") > max(sample.count(b";"), sample.count(b",")) else ";"
    chunks = pd.read_csv(source, sep=delimiter, dtype=str, encoding=encoding, chunksize=50000, keep_default_na=False, on_bad_lines="error")
    first = next(chunks, None)
    if first is None: raise RuntimeError("O CSV oficial está vazio.")
    first.columns = [norm(c) for c in first.columns]
    uf_col = next((k for k in UF_KEYS if k in first.columns), None)
    if not uf_col: raise RuntimeError(f"Coluna UF não encontrada. Colunas: {list(first.columns)[:30]}")
    resolved = {name: next((k for k in aliases if k in first.columns), None) for name, aliases in FIELD_ALIASES.items()}
    counts = {name: Counter() for name in FIELD_ALIASES}
    total = classified = missing_sex = 0
    for frame in chain([first], chunks):
     frame.columns = [norm(c) for c in frame.columns]
     selected = frame[frame[uf_col].map(is_pr)]
     total += len(selected)
     for row in selected.to_dict(orient="records"):
      for name in FIELD_ALIASES:
       value = dimension_value(row, (resolved[name],) if resolved[name] else ())
       if name == "classification" and value != "Não informado": classified += 1
       if name == "sex" and value == "Não informado": missing_sex += 1
       counts[name][value] += 1
  if total == 0: raise RuntimeError("Nenhum registro do Paraná foi encontrado.")
  payload = {
   "schema_version": 1, "source_year": 2023, "generated_at": datetime.now(timezone.utc).isoformat(),
   "file_name": source_info.filename, "source": "SISVAN — Ministério da Saúde / Dados Abertos",
   "summary": {"total_records": total, "municipalities": len([k for k in counts["municipality"] if k != "Não informado"]), "classified_records": classified, "missing_sex_pct": round(missing_sex / total * 100, 2)},
   "dimensions": {"municipality": as_items(counts["municipality"]), "phase": as_items(counts["phase"], 12), "sex": as_items(counts["sex"], 8), "classification": as_items(counts["classification"], 12)},
   "columns": resolved
  }
  temp_file = OUTPUT.with_suffix(".json.tmp")
  temp_file.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
  json.loads(temp_file.read_text(encoding="utf-8"))
  temp_file.replace(OUTPUT)
  print(f"Base validada: {total:,} registros do Paraná; resumo: {OUTPUT} ({OUTPUT.stat().st_size:,} bytes).")
if __name__ == "__main__": main()
