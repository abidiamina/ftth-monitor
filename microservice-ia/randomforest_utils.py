from __future__ import annotations

import re
from typing import Any

import pandas as pd

FEATURE_COLUMNS = [
    "zone",
    "type",
    "nb_incidents",
    "statut_terminee",
    "weather_condition",
    "weather_wind_kmh",
    "weather_precip_mm",
    "weather_storm_flag",
]
TARGET_COLUMN = "target"


def _pick_series(df: pd.DataFrame, candidates: list[str], default: str = "INCONNU") -> pd.Series:
    for candidate in candidates:
        if candidate in df.columns:
            return df[candidate]
    return pd.Series([default] * len(df), index=df.index)


def normalize_text(value: Any, default: str = "INCONNU") -> str:
    if pd.isna(value):
        return default

    text = str(value).strip().upper()
    if not text or text in {"NAN", "NONE", "NULL"}:
        return default

    return text


def normalize_zone(value: Any) -> str:
    text = normalize_text(value)
    text = re.sub(r"\s+", " ", text)
    return text[:80]


def normalize_ticket_type(value: Any) -> str:
    text = normalize_text(value, default="NORMAL")

    if any(token in text for token in ["URG", "CRIT", "ABSENT", "LOSS", "KO", "PANNE", "HS"]):
        return "URGENTE"
    if any(token in text for token in ["HAUT", "ALERTE", "RISQUE", "DEGRADE"]):
        return "HAUTE"
    return "NORMAL"


def normalize_status_flag(value: Any) -> int:
    text = normalize_text(value, default="")

    if text in {"TERMINEE", "RESOLUE", "RESOLU", "CLOTUREE", "CLOSED", "DONE"}:
        return 1

    if text in {"EN_COURS", "EN ATTENTE", "EN_ATTENTE", "OUVERTE", "OPEN"}:
        return 0

    return 0


def _has_meaningful_value(value: Any) -> bool:
    text = normalize_text(value, default="")
    return bool(text and text not in {"00/00/00", "0:00:00"})


def parse_incident_count(value: Any, default: int = 1) -> int:
    if value is None or pd.isna(value):
        return default

    if isinstance(value, (int, float)):
        return max(0, int(value))

    match = re.search(r"\d+", str(value))
    if match:
        return max(0, int(match.group(0)))

    return default


def normalize_weather_condition(value: Any) -> str:
    text = normalize_text(value, default="CLEAR")
    if any(token in text for token in ["ORAGE", "STORM", "THUNDER"]):
        return "STORM"
    if any(token in text for token in ["PLUIE", "RAIN", "AVERS"]):
        return "RAIN"
    if any(token in text for token in ["NEIGE", "SNOW"]):
        return "SNOW"
    if any(token in text for token in ["VENT", "WIND"]):
        return "WINDY"
    return "CLEAR"


def parse_weather_numeric(value: Any, default: float = 0.0) -> float:
    if value is None or pd.isna(value):
        return default
    if isinstance(value, (int, float)):
        return max(0.0, float(value))
    match = re.search(r"\d+(\.\d+)?", str(value))
    if match:
        return max(0.0, float(match.group(0)))
    return default


def weather_condition_to_storm_flag(condition: str) -> int:
    return 1 if condition == "STORM" else 0


def build_prediction_features(
    zone: str, last_intervention: dict[str, Any], weather: dict[str, Any] | None = None
) -> pd.DataFrame:
    weather = weather or {}
    condition = normalize_weather_condition(weather.get("condition"))
    wind_kmh = parse_weather_numeric(weather.get("wind_kmh"), default=10.0)
    precip_mm = parse_weather_numeric(weather.get("precip_mm"), default=0.0)
    return pd.DataFrame(
        [
            {
                "zone": normalize_zone(zone),
                "type": normalize_ticket_type(last_intervention.get("type")),
                "nb_incidents": parse_incident_count(last_intervention.get("nb_incidents"), default=1),
                "statut_terminee": normalize_status_flag(last_intervention.get("statut")),
                "weather_condition": condition,
                "weather_wind_kmh": wind_kmh,
                "weather_precip_mm": precip_mm,
                "weather_storm_flag": weather_condition_to_storm_flag(condition),
            }
        ],
        columns=FEATURE_COLUMNS,
    )


def build_randomforest_training_dataset(
    df_pannes: pd.DataFrame, df_ouvertes: pd.DataFrame
) -> pd.DataFrame:
    pannes = pd.DataFrame(
        {
            "zone": _pick_series(df_pannes, ["Site", "Infrastructure"]).map(normalize_zone),
            "type": _pick_series(df_pannes, ["Symptome", "Objet_type", "Infos_declenchement"]).map(normalize_ticket_type),
            "statut_terminee": _pick_series(df_pannes, ["Date_Cloture"]).map(
                lambda value: 1 if _has_meaningful_value(value) else 0
            ),
            TARGET_COLUMN: 1,
        }
    )
    pannes["nb_incidents"] = (
        pannes.groupby("zone")["zone"].transform("size").clip(lower=1, upper=25).astype(int)
    )
    pannes["weather_condition"] = pannes["type"].map(
        lambda ticket_type: "STORM" if ticket_type == "URGENTE" else ("RAIN" if ticket_type == "HAUTE" else "CLEAR")
    )
    pannes["weather_wind_kmh"] = pannes["type"].map(
        lambda ticket_type: 75.0 if ticket_type == "URGENTE" else (35.0 if ticket_type == "HAUTE" else 12.0)
    )
    pannes["weather_precip_mm"] = pannes["type"].map(
        lambda ticket_type: 22.0 if ticket_type == "URGENTE" else (8.0 if ticket_type == "HAUTE" else 1.0)
    )
    pannes["weather_storm_flag"] = pannes["weather_condition"].map(weather_condition_to_storm_flag)

    ouvertes = pd.DataFrame(
        {
            "zone": _pick_series(df_ouvertes, ["REGION", "SITE"]).map(normalize_zone),
            "type": _pick_series(df_ouvertes, ["QUALIFICATION", "INTERVENTION", "DIAGNOSTIQUE"]).map(normalize_ticket_type),
            "statut_terminee": _pick_series(df_ouvertes, ["RETABLISSEMENT"]).map(
                lambda value: 1 if _has_meaningful_value(value) else 0
            ),
            TARGET_COLUMN: 0,
        }
    )
    ouvertes["nb_incidents"] = (
        ouvertes.groupby("zone")["zone"].transform("size").clip(lower=1, upper=25).astype(int)
    )
    ouvertes["weather_condition"] = "CLEAR"
    ouvertes["weather_wind_kmh"] = 10.0
    ouvertes["weather_precip_mm"] = 0.5
    ouvertes["weather_storm_flag"] = 0

    dataset = pd.concat([pannes, ouvertes], ignore_index=True)
    dataset = dataset.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN]).copy()
    dataset["nb_incidents"] = dataset["nb_incidents"].astype(int)
    dataset["statut_terminee"] = dataset["statut_terminee"].astype(int)
    dataset[TARGET_COLUMN] = dataset[TARGET_COLUMN].astype(int)

    return dataset
