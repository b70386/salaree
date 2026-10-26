from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "demo_data.json"
AKG_FILE = BASE_DIR / "data" / "akg_2019.json"
DB_FILE = Path(os.environ.get("SALAREE_DB", BASE_DIR / "salaree.db"))
app = Flask(__name__)


def load_dataset() -> dict[str, Any]:
    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def calculate(region: dict[str, Any], people: int = 1, wage: float | None = None) -> dict[str, Any]:
    dataset = load_dataset()
    people = max(1, min(int(people), 20))
    monthly_wage = float(wage if wage is not None else region["monthly_wage"])
    items = []
    total = 0.0
    for commodity in dataset["commodities"]:
        price = float(region["prices"].get(commodity["id"], 0))
        quantity = float(commodity["monthly_qty_per_person"]) * people
        cost = price * quantity
        total += cost
        items.append({"id": commodity["id"], "name": commodity["name"], "unit": commodity["unit"], "price": price, "monthly_quantity": quantity, "cost": round(cost)})
    ratio = (total / monthly_wage * 100) if monthly_wage > 0 else None
    return {"monthly_wage": round(monthly_wage), "people": people, "basket_cost": round(total), "remaining": round(monthly_wage - total), "ratio_percent": round(ratio, 1) if ratio is not None else None, "items": items, "is_demo": dataset["metadata"]["is_demo"], "dataset_status": dataset["metadata"]["dataset_status"]}


def init_db() -> None:
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        conn.execute("INSERT OR REPLACE INTO app_meta(key, value) VALUES('dataset_file', ?)", (str(DATA_FILE),))


@app.get("/")
def index():
    return render_template("index.html")


def load_akg_dataset() -> dict[str, Any]:
    with AKG_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


@app.get("/api/akg")
def akg_reference():
    dataset = load_akg_dataset()
    return jsonify({"metadata": dataset["metadata"], "nutrients": dataset["nutrients"], "profiles": dataset["profiles"]})


@app.post("/api/akg/calculate")
def calculate_akg_household():
    payload = request.get_json(silent=True) or {}
    members = payload.get("members", [])
    if not isinstance(members, list) or not members or len(members) > 20:
        return jsonify({"error": "Masukkan 1–20 anggota keluarga."}), 400
    dataset = load_akg_dataset()
    profiles = {profile["id"]: profile for profile in dataset["profiles"]}
    totals = {nutrient["key"]: 0 for nutrient in dataset["nutrients"]}
    breakdown = []
    try:
        for member in members:
            if not isinstance(member, dict):
                raise ValueError
            profile_id = str(member.get("profile_id", ""))
            count = int(member.get("count", 1))
            if profile_id not in profiles or count < 1 or count > 20:
                raise ValueError
            profile = profiles[profile_id]
            for key in totals:
                totals[key] += profile[key] * count
            breakdown.append({"profile_id": profile_id, "label": profile["label"], "count": count, "daily_targets": {key: profile[key] * count for key in totals}})
    except (TypeError, ValueError, KeyError):
        return jsonify({"error": "Profil atau jumlah anggota tidak valid."}), 400
    return jsonify({"metadata": dataset["metadata"], "member_count": sum(row["count"] for row in breakdown), "daily_household_targets": totals, "monthly_household_targets": {key: round(value * 30, 1) for key, value in totals.items()}, "breakdown": breakdown, "warning": "Ini adalah penjumlahan target referensi AKG, bukan bukti bahwa kombinasi komoditas tertentu memenuhi seluruh kebutuhan gizi. Bayi, kehamilan/menyusui, aktivitas, dan kondisi kesehatan memerlukan perhatian khusus."})


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "app": "Salaree", "dataset_status": load_dataset()["metadata"]["dataset_status"], "akg_status": load_akg_dataset()["metadata"]["dataset_status"]})


@app.get("/api/regions")
def regions():
    dataset = load_dataset()
    result = []
    for region in dataset["regions"]:
        metrics = calculate(region)
        result.append({"id": region["id"], "name": region["name"], "province": region["province"], "wage_type": region["wage_type"], "monthly_wage": region["monthly_wage"], "basket_cost": metrics["basket_cost"], "ratio_percent": metrics["ratio_percent"], "remaining": metrics["remaining"], "is_demo": dataset["metadata"]["is_demo"]})
    return jsonify({"metadata": dataset["metadata"], "regions": result})


@app.get("/api/summary")
def summary():
    dataset = load_dataset()
    rows = [{**region, **calculate(region)} for region in dataset["regions"]]
    if not rows:
        return jsonify({"metadata": dataset["metadata"], "region_count": 0, "average_ratio": None})
    ratios = [row["ratio_percent"] for row in rows if row["ratio_percent"] is not None]
    return jsonify({"metadata": dataset["metadata"], "region_count": len(rows), "average_ratio": round(sum(ratios) / len(ratios), 1) if ratios else None, "highest_ratio": max(rows, key=lambda row: row["ratio_percent"]), "lowest_ratio": min(rows, key=lambda row: row["ratio_percent"]), "regions": [{"id": r["id"], "name": r["name"], "ratio_percent": r["ratio_percent"], "basket_cost": r["basket_cost"], "monthly_wage": r["monthly_wage"]} for r in rows]})


@app.get("/api/regions/<region_id>")
def region_detail(region_id: str):
    dataset = load_dataset()
    region = next((r for r in dataset["regions"] if r["id"] == region_id), None)
    if region is None:
        return jsonify({"error": "Wilayah tidak ditemukan"}), 404
    people = request.args.get("people", default=1, type=int)
    return jsonify({"region": region, "calculation": calculate(region, people=people), "metadata": dataset["metadata"]})


@app.post("/api/calculate")
def custom_calculation():
    payload = request.get_json(silent=True) or {}
    dataset = load_dataset()
    region_id = str(payload.get("region_id", ""))
    region = next((r for r in dataset["regions"] if r["id"] == region_id), None)
    if region is None:
        return jsonify({"error": "Wilayah tidak ditemukan"}), 404
    try:
        people = int(payload.get("people", 1))
        wage = float(payload.get("wage", region["monthly_wage"]))
        if wage <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "Masukkan upah positif dan jumlah anggota keluarga yang valid."}), 400
    return jsonify({"region": region, "calculation": calculate(region, people=people, wage=wage), "metadata": dataset["metadata"]})


if __name__ == "__main__":
    init_db()
    # Loopback-only by default; do not expose this development server to the LAN.
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "7777")), debug=False)