from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
from zipfile import ZipFile
import csv
import gzip
import json
import re
import xml.etree.ElementTree as ET


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = PROJECT_ROOT.parent / "dadoscreche"
XLSX = DATA_ROOT / "OferecimentosEvagas" / "Unidades_Unificadas_com_Localizacao.xlsx"
NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"


def rows_xlsx(path: Path, sheet_target: str = "xl/worksheets/sheet1.xml"):
    with ZipFile(path) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared_strings = [
                "".join(text.text or "" for text in item.iter(f"{{{NS}}}t"))
                for item in root
            ]

        root = ET.fromstring(archive.read(sheet_target))
        for row in root.findall(f".//{{{NS}}}sheetData/{{{NS}}}row"):
            output: list[str] = []
            for cell in row.findall(f"{{{NS}}}c"):
                value = cell.find(f"{{{NS}}}v")
                current = "" if value is None else value.text or ""
                if cell.attrib.get("t") == "s" and current:
                    current = shared_strings[int(current)]
                output.append(current)
            yield output


def normalize_code(code: str) -> str:
    return str(code).strip().lstrip("0") or "0"


def build_snapshot() -> list[dict[str, object]]:
    geocoded: dict[str, dict[str, object]] = {}
    for index, row in enumerate(rows_xlsx(XLSX)):
        if index == 0 or len(row) < 9:
            continue
        try:
            latitude = float(row[6])
            longitude = float(row[7])
        except ValueError:
            continue
        geocoded[normalize_code(row[0])] = {
            "cre": row[1],
            "microarea": row[2],
            "name": row[3],
            "address": row[4],
            "bairro": row[5],
            "lat": latitude,
            "lon": longitude,
            "type": row[8],
        }

    aggregate: defaultdict[str, Counter[str]] = defaultdict(Counter)
    original_codes: dict[str, str] = {}
    inscriptions = (
        DATA_ROOT
        / "Bases IC_ ClassificadoseFila"
        / "01_QueryA_InscricoesPorAno.csv.gz"
    )
    with gzip.open(inscriptions, "rt", encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source, delimiter=";"):
            if row["ano"] != "2025":
                continue
            normalized_code = normalize_code(row["unidade"])
            original_codes.setdefault(normalized_code, str(row["unidade"]).strip())
            unit = aggregate[normalized_code]
            unit["options"] += 1
            unit[row["situacao"]] += 1
            if int(row["opcao"]) == 1:
                unit["first"] += 1

    cep_by_code: dict[str, str] = {}
    units_file = (
        DATA_ROOT
        / "Bases IC_ ClassificadoseFila"
        / "04_UnidadesEscolaresComEndereco.csv"
    )
    with units_file.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.reader(source, delimiter=";"):
            if len(row) >= 9:
                cep_by_code[normalize_code(row[1])] = re.sub(r"\D", "", row[8])

    snapshot: list[dict[str, object]] = []
    for code, counts in aggregate.items():
        location = geocoded.get(code)
        if not location:
            continue
        snapshot.append(
            {
                "code": original_codes.get(code, code),
                "name": location["name"],
                "address": location["address"],
                "bairro": location["bairro"],
                "cep": cep_by_code.get(code, ""),
                "lat": location["lat"],
                "lon": location["lon"],
                "type": location["type"],
                "cre": location["cre"],
                "options": counts["options"],
                "first": counts["first"],
                "wait": counts["Lista de espera"],
                "confirmed": counts["Confirmado"],
            }
        )

    snapshot.sort(key=lambda unit: (-int(unit["wait"]), -int(unit["options"])))
    return snapshot


def main() -> None:
    snapshot = build_snapshot()
    destination = PROJECT_ROOT / "public" / "data" / "creches-2025.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "units": len(snapshot),
                "with_cep": sum(bool(unit["cep"]) for unit in snapshot),
                "wait": sum(int(unit["wait"]) for unit in snapshot),
                "output": str(destination),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
