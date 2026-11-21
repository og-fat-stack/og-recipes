"""Wandelt den Bundeslebensmittelschlüssel (BLS 4.0, Max Rubner-Institut,
CC BY 4.0) in die kompakte JSON-Datei lib/bls/foods.json um.

Download: https://blsdb.de/download → BLS_4_0_2025_DE.zip entpacken, dann
    python3 -I scripts/buildBls.py <pfad>/BLS_4_0_Daten_2025_DE.xlsx

Nur Standardbibliothek (xlsx = zip + XML). Ausgabe pro Lebensmittel:
[code, name, kcal, protein, kohlenhydrate (verfügbar), fett, ballaststoffe]
jeweils pro 100 g.
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
FIELDS = ["ENERCC", "PROT625", "CHO", "FAT", "FIBT"]


def col_idx(ref: str) -> int:
    n = 0
    for c in re.match(r"[A-Z]+", ref).group(0):
        n = n * 26 + ord(c) - 64
    return n - 1


def rows(path: str):
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall(f"{NS}si"):
            shared.append("".join(t.text or "" for t in si.iter(f"{NS}t")))
    with z.open("xl/worksheets/sheet1.xml") as f:
        for _, el in ET.iterparse(f, events=("end",)):
            if el.tag != f"{NS}row":
                continue
            out = {}
            for c in el.findall(f"{NS}c"):
                t = c.get("t")
                if t == "inlineStr":
                    val = "".join(x.text or "" for x in c.iter(f"{NS}t"))
                else:
                    v = c.find(f"{NS}v")
                    if v is None:
                        continue
                    val = shared[int(v.text)] if t == "s" else v.text
                out[col_idx(c.get("r"))] = val
            if out:
                yield [out.get(i) for i in range(max(out) + 1)]
            el.clear()


def num(v) -> float:
    # "<LOQ"/"<LOD" = unter Bestimmungsgrenze → 0; "-" = nicht erfasst → 0
    try:
        return round(float(v), 2)
    except (TypeError, ValueError):
        return 0


def main(src: str) -> None:
    it = rows(src)
    header = next(it)
    idx = {}
    for i, h in enumerate(header):
        code = (h or "").split(" ")[0]
        if code in FIELDS and "[" in (h or ""):
            idx[code] = i
    missing = [f for f in FIELDS if f not in idx]
    if missing:
        sys.exit(f"Spalten fehlen: {missing}")

    foods = []
    for r in it:
        if not r or not r[0]:
            continue
        foods.append([r[0], (r[1] or "").strip()] + [num(r[idx[f]] if idx[f] < len(r) else None) for f in FIELDS])
        if len(foods) % 1000 == 0:
            print(f"{len(foods)} Lebensmittel …", flush=True)

    out = Path(__file__).resolve().parent.parent / "lib" / "bls" / "foods.json"
    out.write_text(
        "[\n" + ",\n".join(json.dumps(f, ensure_ascii=False) for f in foods) + "\n]\n",
        encoding="utf-8",
    )
    print(f"{len(foods)} Lebensmittel → {out}")


if __name__ == "__main__":
    main(sys.argv[1])
