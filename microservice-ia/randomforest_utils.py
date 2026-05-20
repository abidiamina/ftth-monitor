from __future__ import annotations

import re
from typing import Any

import pandas as pd

FEATURE_COLUMNS = ["zone", "type", "nb_incidents", "statut_terminee"]
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


def build_prediction_features(zone: str, last_intervention: dict[str, Any]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "zone": normalize_zone(zone),
                "type": normalize_ticket_type(last_intervention.get("type")),
                "nb_incidents": parse_incident_count(last_intervention.get("nb_incidents"), default=1),
                "statut_terminee": normalize_status_flag(last_intervention.get("statut")),
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

    dataset = pd.concat([pannes, ouvertes], ignore_index=True)
    dataset = dataset.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN]).copy()
    dataset["nb_incidents"] = dataset["nb_incidents"].astype(int)
    dataset["statut_terminee"] = dataset["statut_terminee"].astype(int)
    dataset[TARGET_COLUMN] = dataset[TARGET_COLUMN].astype(int)

    return dataset
