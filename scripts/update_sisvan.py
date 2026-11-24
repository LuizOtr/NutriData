#!/usr/bin/env python3
"""Baixa a base pública anual do SISVAN e publica somente registros do Paraná.

A base é anonimizada pelo Ministério da Saúde. O arquivo resultante é gzip JSON
para reduzir o tamanho transferido pelo GitHub Pages.
"""
from __future__ import annotations

import csv
import gzip
import json
import os
import re
import sys
import tempfile
import unicodedata
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

SOURCE_URL = (
    "https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/SISVAN/"
    "estado_nutricional/sisvan_estado_nutricional_2023.zip"
)
OUTPUT_DIR = Path("public/data")
OUTPUT_FILE = OUTPUT_DIR / "sisvan-pr.json.gz"
METADATA_FILE = OUTPUT_DIR / "metadata.json"


def normalize_column(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = re.sub(r"[^a-zA-Z0-9]+", "_", text.strip().lower())
    return text.strip("_")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as temporary:
        archive_path = Path(temporary) / "sisvan.zip"
        print(f"Baixando base oficial: {SOURCE_URL}", flush=True)
        with requests.get(SOURCE_URL, stream=True, timeout=(30, 300)) as response:
            response.raise_for_status()
            with archive_path.open("wb") as output:
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        output.write(chunk)

        with zipfile.ZipFile(archive_path) as archive:
            candidates = [
                item for item in archive.infolist()
                if not item.is_dir() and item.filename.lower().endswith((".csv", ".txt"))
            ]
            if not candidates:
                raise RuntimeError("O ZIP oficial não contém arquivo CSV/TXT.")
            member = max(candidates, key=lambda item: item.file_size)
            print(f"Processando {member.filename} ({member.file_size:,} bytes)", flush=True)

            with archive.open(member) as csv_file:
                sample = csv_file.read(128 * 1024)
                csv_file.seek(0)
                try:
                    delimiter = csv.Sniffer().sniff(
                        sample.decode("utf-8-sig", errors="replace"),
                        delimiters=";,\t|"
                    ).delimiter
                except csv.Error:
                    delimiter = ";"

                # O arquivo do Ministério pode usar UTF-8 ou Windows-1252.
                try:
                    reader = pd.read_csv(
                        csv_file, sep=delimiter, dtype=str, encoding="utf-8-sig",
                        chunksize=50000, keep_default_na=False, on_bad_lines="error"
                    )
                    first_chunk = next(reader, None)
                except UnicodeDecodeError:
                    csv_file.seek(0)
                    reader = pd.read_csv(
                        csv_file, sep=delimiter, dtype=str, encoding="latin-1",
                        chunksize=50000, keep_default_na=False, on_bad_lines="error"
                    )
                    first_chunk = next(reader, None)

                if first_chunk is None:
                    raise RuntimeError("O CSV oficial está vazio.")

                first_chunk.columns = [normalize_column(c) for c in first_chunk.columns]
                uf_candidates = ("sg_uf", "uf", "sigla_uf", "estado", "sg_uf_residencia")
                uf_column = next((name for name in uf_candidates if name in first_chunk.columns), None)
                if not uf_column:
                    raise RuntimeError(
                        "Não encontrei a coluna de UF no CSV. Colunas: "
                        + ", ".join(first_chunk.columns[:40])
                    )

                count = 0
                with gzip.open(OUTPUT_FILE, "wt", encoding="utf-8", newline="") as output:
                    output.write("[")
                    first_record = True

                    def write_chunk(frame: pd.DataFrame) -> None:
                        nonlocal count, first_record
                        frame.columns = [normalize_column(c) for c in frame.columns]
                        selected = frame[
                            frame[uf_column].astype(str).str.strip().str.upper().eq("PR")
                        ]
                        for record in selected.to_dict(orient="records"):
                            clean = {
                                key: (None if pd.isna(value) or value == "" else str(value).strip())
                                for key, value in record.items()
                            }
                            if not first_record:
                                output.write(",")
                            json.dump(clean, output, ensure_ascii=False, separators=(",", ":"))
                            first_record = False
                            count += 1

                    write_chunk(first_chunk)
                    for chunk in reader:
                        write_chunk(chunk)

                    output.write("]")

    metadata = {
        "source": SOURCE_URL,
        "dataset": "SISVAN - Estado Nutricional",
        "year": 2023,
        "uf": "PR",
        "records": count,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "format": "gzip-json",
    }
    METADATA_FILE.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )
    print(f"Concluído: {count:,} registros do Paraná.", flush=True)
    print(f"Arquivo: {OUTPUT_FILE} ({OUTPUT_FILE.stat().st_size:,} bytes)", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERRO ao atualizar SISVAN: {error}", file=sys.stderr)
        raise
