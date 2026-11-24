#!/usr/bin/env python3
"""
scripts/update_sisvan.py
Gera resumo agregado oficial do SISVAN para o Paraná (PR).
Utiliza a API de Dados Abertos do Ministério da Saúde com fallback resiliente.
"""

from __future__ import annotations
import argparse
import json
import logging
import re
import sys
import time
import unicodedata
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

API_BASE = "https://apidadosabertos.saude.gov.br/sisvan/estado-nutricional"
OUTPUT_FILE = Path("public/data/sisvan-pr.json")
BACKUP_DATA_FILE = Path("data/sisvan-pr.json")

CLASSIFICATION_FIELDS = (
    "codigo_estado_nutricional_adulto",
    "codigo_estado_nutricional_idoso",
    "crianca_imc_x_idade",
    "adolescente_imc_x_idade",
    "codigo_estado_nutricional_imc_gestante",
    "peso_x_idade",
    "peso_x_altura",
    "estado_nutricional",
    "classificacao_nutricional",
)

def norm_str(v: any) -> str:
    if v is None:
        return ""
    s = str(v).strip()
    if s.lower() in {"nan", "none", "null", "undefined", ""}:
        return ""
    return s

def extract_classification(record: dict) -> str:
    for field in CLASSIFICATION_FIELDS:
        val = norm_str(record.get(field))
        if val:
            # Capitaliza adequadamente
            return val
    return "Não informado"

def format_municipality(name: str) -> str:
    name = norm_str(name)
    if not name:
        return "Não informado"
    # Converter título limpo mantendo acentuação
    return name.upper()

def format_sex(s: str) -> str:
    s = norm_str(s).upper()
    if s in {"F", "FEMININO"}:
        return "Feminino"
    if s in {"M", "MASCULINO"}:
        return "Masculino"
    return "Não informado"

def format_phase(p: str) -> str:
    p = norm_str(p)
    if not p:
        return "Não informado"
    return p.upper()

def fetch_records_from_api(uf: str = "PR", target_count: int = 500, max_retries: int = 3) -> list[dict]:
    records: list[dict] = []
    offset = 0
    page_size = 20

    logging.info(f"Iniciando coleta via API de Dados Abertos (UF={uf}, alvo={target_count} registros)...")

    while len(records) < target_count:
        url = f"{API_BASE}?uf={uf}&limit={page_size}&offset={offset}"
        req = urllib.request.Request(
            url,
            headers={
                "Accept": "application/json",
                "User-Agent": "NutriData-Monitor/1.0 (+https://github.com/LuizOtr/NutriData)",
            },
        )

        success = False
        for attempt in range(1, max_retries + 1):
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        batch = data.get("estados_nutricionais") or []
                        if not batch and isinstance(data, list):
                            batch = data
                        if not batch:
                            logging.info(f"Sem mais registros retornados na página {offset}.")
                            return records
                        records.extend(batch)
                        success = True
                        break
            except Exception as e:
                logging.warning(f"Tentativa {attempt}/{max_retries} falhou para offset {offset}: {e}")
                time.sleep(1.5 * attempt)

        if not success:
            logging.error(f"Não foi possível obter dados a partir do offset {offset}.")
            break

        offset += page_size
        if offset % 100 == 0:
            logging.info(f"Progresso: {len(records)}/{target_count} registros coletados...")

    return records

def build_dataset(records: list[dict]) -> dict:
    if not records:
        raise ValueError("Nenhum registro para construir o dataset.")

    class_counts: Counter[str] = Counter()
    phase_counts: Counter[str] = Counter()
    muni_counts: Counter[str] = Counter()
    sex_counts: Counter[str] = Counter()

    total = len(records)
    classified = 0
    missing_sex = 0

    for rec in records:
        # Classificação
        c = extract_classification(rec)
        if c != "Não informado":
            classified += 1
        class_counts[c] += 1

        # Fase da vida
        ph = format_phase(rec.get("fase_vida") or rec.get("descricao_fase_vida"))
        phase_counts[ph] += 1

        # Município
        m = format_municipality(rec.get("municipio") or rec.get("no_municipio"))
        muni_counts[m] += 1

        # Sexo
        sx = format_sex(rec.get("sexo"))
        if sx == "Não informado":
            missing_sex += 1
        sex_counts[sx] += 1

    def to_items(counter: Counter, limit: int = 10) -> list[dict]:
        return [{"label": label, "value": count} for label, count in counter.most_common(limit)]

    active_municipalities = len([k for k in muni_counts if k != "Não informado"])

    payload = {
        "schema_version": 1,
        "source_year": 2023,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "file_name": "sisvan_estado_nutricional_pr.json",
        "source": "SISVAN — Ministério da Saúde / Dados Abertos",
        "summary": {
            "total_records": total,
            "municipalities": active_municipalities,
            "classified_records": classified,
            "missing_sex_pct": round((missing_sex / total) * 100, 2) if total else 0.0,
        },
        "dimensions": {
            "municipality": to_items(muni_counts, 10),
            "phase": to_items(phase_counts, 10),
            "sex": to_items(sex_counts, 5),
            "classification": to_items(class_counts, 10),
        },
        "columns": {
            "municipality": "municipio",
            "phase": "fase_vida",
            "sex": "sexo",
            "classification": "codigo_estado_nutricional",
        },
    }
    return payload

def main():
    parser = argparse.ArgumentParser(description="Atualiza dataset agregado SISVAN Paraná")
    parser.add_argument("--target", type=int, default=500, help="Quantidade de registros a coletar")
    parser.add_argument("--output", type=str, default=str(OUTPUT_FILE), help="Caminho do arquivo de saída")
    args = parser.parse_args()

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    BACKUP_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

    try:
        records = fetch_records_from_api("PR", target_count=args.target)
        if len(records) < 10:
            raise RuntimeError(f"Quantidade insuficiente de registros obtidos ({len(records)}).")

        dataset = build_dataset(records)
        content = json.dumps(dataset, ensure_ascii=False, indent=2)

        out_path.write_text(content, encoding="utf-8")
        BACKUP_DATA_FILE.write_text(content, encoding="utf-8")

        logging.info(
            f"Dataset gerado com sucesso em '{out_path}' "
            f"({dataset['summary']['total_records']} registros, "
            f"{dataset['summary']['municipalities']} municípios, "
            f"{dataset['summary']['classified_records']} classificados)."
        )
    except Exception as e:
        logging.error(f"Erro na extração da API: {e}")
        # Se já existir um arquivo com dados válidos, preserva
        if out_path.is_file():
            try:
                existing = json.loads(out_path.read_text(encoding="utf-8"))
                if int(existing.get("summary", {}).get("total_records", 0)) > 0:
                    logging.info("Arquivo de dataset existente preservado com dados válidos.")
                    return
            except Exception:
                pass
        sys.exit(1)

if __name__ == "__main__":
    main()
