#!/usr/bin/env python3
"""Baixa e gera a base SISVAN do Paraná em JSON para publicação estática."""
from __future__ import annotations

import csv
import json
import re
import tempfile
import unicodedata
import zipfile
from itertools import chain
from pathlib import Path

import pandas as pd
import requests

SOURCE_URL = (
    "https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/SISVAN/"
    "estado_nutricional/sisvan_estado_nutricional_2023.zip"
)
OUTPUT_FILE = Path("public/dados/sisvan.json")


def normalize_column(value: object) -> str:
    value = unicodedata.normalize("NFKD", str(value))
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[^a-zA-Z0-9]+", "_", value.strip().lower()).strip("_")


def is_parana(value: object) -> bool:
    return str(value or "").strip().upper() in {"PR", "PARANA", "PARANÁ", "41"}


def main() -> None:
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as temporary:
        zip_path = Path(temporary) / "sisvan.zip"
        with requests.get(SOURCE_URL, stream=True, timeout=(30, 300)) as response:
            response.raise_for_status()
            with zip_path.open("wb") as output:
                for chunk in response.iter_content(1024 * 1024):
                    if chunk:
                        output.write(chunk)

        with zipfile.ZipFile(zip_path) as archive:
            files = [
                item for item in archive.infolist()
                if not item.is_dir() and item.filename.lower().endswith((".csv", ".txt"))
            ]
            if not files:
                raise RuntimeError("O ZIP oficial não contém CSV/TXT.")

            with archive.open(max(files, key=lambda item: item.file_size)) as source:
                sample = source.read(256 * 1024)
                source.seek(0)
                try:
                    sample.decode("utf-8-sig")
                    encoding = "utf-8-sig"
                except UnicodeDecodeError:
                    encoding = "latin-1"
                try:
                    delimiter = csv.Sniffer().sniff(
                        sample.decode(encoding), delimiters=";,\t|"
                    ).delimiter
                except csv.Error:
                    delimiter = ";"

                chunks = pd.read_csv(
                    source, sep=delimiter, dtype=str, encoding=encoding,
                    chunksize=50000, keep_default_na=False, on_bad_lines="error"
                )
                first = next(chunks, None)
                if first is None:
                    raise RuntimeError("O CSV oficial está vazio.")
                first.columns = [normalize_column(column) for column in first.columns]
                uf_candidates = ("uf", "sg_uf", "sigla_uf", "estado", "sg_uf_residencia")
                uf_column = next((name for name in uf_candidates if name in first.columns), None)
                if not uf_column:
                    raise RuntimeError("Coluna de UF não encontrada no arquivo oficial.")

                count = 0
                with tempfile.NamedTemporaryFile(
                    mode="w", encoding="utf-8", dir=OUTPUT_FILE.parent,
                    prefix="sisvan-", suffix=".json.tmp", delete=False
                ) as output:
                    temp_path = Path(output.name)
                    output.write("[")
                    first_record = True
                    for frame in chain([first], chunks):
                        frame.columns = [normalize_column(column) for column in frame.columns]
                        selected = frame[frame[uf_column].map(is_parana)]
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
                    output.write("]")

    try:
        if count == 0:
            raise RuntimeError("Nenhum registro do Paraná foi encontrado.")
        with temp_path.open(encoding="utf-8") as check:
            records = json.load(check)
        if not isinstance(records, list) or len(records) != count or not all(
            isinstance(record, dict) for record in records
        ):
            raise RuntimeError("A validação do JSON gerado falhou.")
        temp_path.replace(OUTPUT_FILE)
    finally:
        if temp_path.exists():
            temp_path.unlink()

    print(f"Base validada: {count} registros em {OUTPUT_FILE}.")


if __name__ == "__main__":
    main()
