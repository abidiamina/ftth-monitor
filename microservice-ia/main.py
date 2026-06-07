from pathlib import Path
from typing import List, Optional
import json
import os
import random
import re
import unicodedata

from fastapi import FastAPI
import joblib
from pydantic import BaseModel
import torch
from transformers import (
    CamembertForSequenceClassification,
    CamembertTokenizer,
    GPT2LMHeadModel,
    GPT2Tokenizer,
)

from randomforest_utils import build_prediction_features

# Initialisation de l'application FastAPI pour le microservice IA
app = FastAPI(title="FTTH Monitor - IA Microservice")


class SentimentRequest(BaseModel):
    text: str
    rating: Optional[int] = None


class InterventionData(BaseModel):
    date: str
    type: str
    statut: str
    nb_incidents: int


class PredictionRequest(BaseModel):
    zone: str
    historique: List[InterventionData]
    weather: Optional[dict] = None


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "camembert-ftth"
GEN_MODEL_PATH = BASE_DIR / "models" / "generator-ftth"
RF_MODEL_PATH = BASE_DIR / "models" / "randomforest-ftth"

tokenizer = None
model = None
gen_tokenizer = None
gen_model = None
rf_model = None
rf_metadata = {}


def _rule_based_sentiment(text: str):
    text_lower = (
        unicodedata.normalize("NFD", text.lower())
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    if any(token in text_lower for token in ["panne", "inadmissible", "lent", "probleme", "colere", "decu", "inacceptable", "catastrophe"]):
        return {"sentiment": "Negatif", "score": 0.9, "ia_used": False}
    if any(token in text_lower for token in ["merci", "propre", "rapide", "excellent", "super", "parfait", "satisfait"]):
        return {"sentiment": "Positif", "score": 0.9, "ia_used": False}
    return {"sentiment": "Neutre", "score": 0.5, "ia_used": False}


def _has_very_negative_cue(text: str) -> bool:
    text_lower = (
        unicodedata.normalize("NFD", (text or "").lower())
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    return any(token in text_lower for token in [
        "catastrophe", "inadmissible", "inacceptable", "honteux", "nul", "scandale"
    ])


def _looks_valid_message(message: str) -> bool:
    if not message or len(message.strip()) < 5:
        return False
    if re.fullmatch(r"[\W_]+", message):
        return False
    letters = sum(1 for ch in message if ch.isalpha())
    return letters >= max(3, int(len(message) * 0.2))

# ---------------------------------------------------------
# CHARGEMENT DES MODÈLES D'INTELLIGENCE ARTIFICIELLE
# ---------------------------------------------------------

try:
    # 1. Modèle CamemBERT (Analyse de Sentiment)
    # Utilisé pour classer les feedbacks des utilisateurs (Positif, Négatif, Neutre)
    if os.path.exists(MODEL_PATH):
        print(f"Loading CamemBERT model from {MODEL_PATH}...")
        tokenizer = CamembertTokenizer.from_pretrained(MODEL_PATH)
        model = CamembertForSequenceClassification.from_pretrained(MODEL_PATH)
    else:
        print("CamemBERT model not found. Run train_camembert.py first.")
except Exception as exc:
    print(f"Failed to load CamemBERT: {exc}")

try:
    # 2. Modèle GPT-2 (Génération de Texte)
    # Utilisé pour générer dynamiquement des messages de motivation personnalisés
    if os.path.exists(GEN_MODEL_PATH):
        print(f"Loading GPT-2 model from {GEN_MODEL_PATH}...")
        gen_tokenizer = GPT2Tokenizer.from_pretrained(GEN_MODEL_PATH)
        gen_model = GPT2LMHeadModel.from_pretrained(GEN_MODEL_PATH)
except Exception as exc:
    print(f"Failed to load GPT-2: {exc}")

try:
    # 3. Modèle Random Forest (Prédiction des Pannes)
    # Utilisé pour évaluer le risque de panne d'une zone selon l'historique et la météo
    if os.path.exists(RF_MODEL_PATH):
        print(f"Loading Random Forest model from {RF_MODEL_PATH}...")
        rf_model = joblib.load(RF_MODEL_PATH / "model.pkl")
        metadata_path = RF_MODEL_PATH / "metadata.json"
        if metadata_path.exists():
            rf_metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
except Exception as exc:
    print(f"Failed to load Random Forest: {exc}")


@app.post("/ia/analyze-sentiment")
async def analyze_sentiment(request: SentimentRequest):
    """
    Endpoint pour analyser le sentiment d'un texte.
    Combine une approche basée sur des règles (mots-clés) et le modèle CamemBERT.
    """
    rule = _rule_based_sentiment(request.text)

    # Strong business guardrail: 4-5 stars should be positive unless comment is clearly very negative.
    if request.rating is not None:
        if request.rating >= 4 and not _has_very_negative_cue(request.text):
            return {"sentiment": "Positif", "score": 0.95, "ia_used": True}
        if request.rating <= 2:
            return {"sentiment": "Negatif", "score": 0.95, "ia_used": True}

    if model and tokenizer:
        # Tokenisation du texte pour le modèle CamemBERT
        inputs = tokenizer(
            request.text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=128,
        )
        with torch.no_grad():
            # Prédiction du modèle
            outputs = model(**inputs)
            scores = torch.nn.functional.softmax(outputs.logits, dim=1)
            predicted_class_id = torch.argmax(scores).item()
            score = scores[0][predicted_class_id].item()
            raw_sentiment = str(model.config.id2label[predicted_class_id])

        raw_lower = raw_sentiment.lower()
        if raw_lower.startswith("pos"):
            sentiment = "Positif"
        elif raw_lower.startswith("neg"):
            sentiment = "Negatif"
        elif raw_lower.startswith("neu"):
            sentiment = "Neutre"
        else:
            sentiment = rule["sentiment"]

        # Guardrail: if the model is unsure or predicts neutral while lexical cues are strong,
        # prefer the deterministic label to avoid "all neutral" behavior.
        if score < 0.55:
            return rule
        if sentiment.lower().startswith("neut") and rule["sentiment"] in {"Negatif", "Positif"}:
            return {**rule, "ia_used": True}
        return {"sentiment": sentiment, "score": round(score, 2), "ia_used": True}

    return rule


@app.post("/ia/predict-pannes")
async def predict_pannes(request: PredictionRequest):
    if rf_model:
        try:
            if request.historique:
                sorted_history = sorted(request.historique, key=lambda item: item.date)
                last_interv = sorted_history[-1]
                last_payload = (
                    last_interv.model_dump()
                    if hasattr(last_interv, "model_dump")
                    else last_interv.dict()
                )
                features = build_prediction_features(request.zone, last_payload, request.weather)
                probability = rf_model.predict_proba(features)[0]
                positive_index = 1 if len(probability) > 1 else 0
                final_prob = int(round(float(probability[positive_index]) * 100))
            else:
                final_prob = 15

            risque = "Faible"
            if final_prob >= 70:
                risque = "Eleve"
            elif final_prob >= 40:
                risque = "Moyen"

            return {
                "zone": request.zone,
                "probabilite": final_prob,
                "risque": risque,
                "modele": "RandomForest_Entraine",
                "ia_used": True,
                "metadata": rf_metadata,
            }
        except Exception as exc:
            print(f"Random Forest prediction failed: {exc}")

    base_probability = 15
    for interv in request.historique:
        if interv.type == "URGENTE":
            base_probability += 30
        elif interv.type == "HAUTE":
            base_probability += 15

        if interv.statut == "TERMINEE":
            base_probability -= 5

    final_prob = min(max(base_probability, 0), 99)

    risque = "Faible"
    if final_prob >= 70:
        risque = "Eleve"
    elif final_prob >= 40:
        risque = "Moyen"

    return {
        "zone": request.zone,
        "probabilite": final_prob,
        "risque": risque,
        "modele": "RandomForest_Simule",
        "ia_used": False,
    }


@app.get("/ia/motivational-message/{role}")
async def motivational_message(role: str):
    """
    Endpoint pour générer un message de motivation personnalisé selon le rôle.
    Utilise GPT-2 pour la génération dynamique, avec un système de secours (fallback).
    """
    role_upper = role.upper()
    
    # 1. Tentative de génération avec le modèle GPT-2
    if gen_model and gen_tokenizer:
        prompt = f"Role: {role_upper} | Message: "
        inputs = gen_tokenizer(prompt, return_tensors="pt")
        with torch.no_grad():
            # Paramètres de génération (température, top_p) pour de la diversité
            outputs = gen_model.generate(
                **inputs,
                max_new_tokens=30,
                num_return_sequences=1,
                temperature=0.8,
                top_p=0.9,
                do_sample=True,
                pad_token_id=gen_tokenizer.eos_token_id,
            )
        # Décodage du texte généré
        generated_text = gen_tokenizer.decode(outputs[0], skip_special_tokens=True)
        if "Message: " in generated_text:
            final_message = generated_text.split("Message: ")[-1].strip()
        else:
            final_message = generated_text.replace(prompt, "").strip()
        
        final_message = final_message.replace("\ufffd", "").strip()
        
        if _looks_valid_message(final_message):
            return {"message": final_message, "ia_used": True}

    messages = {
        "ADMIN": [
            "Le reseau est entre de bonnes mains aujourd'hui.",
            "Supervision optimale — chaque zone est sous controle.",
            "Votre vigilance garantit la continuite du service.",
            "Tableau de bord impeccable, continuez sur cette lancee !",
            "La qualite du reseau reflete votre expertise.",
            "Excellente maitrise de l'infrastructure FTTH.",
            "Les metriques sont au beau fixe grace a votre gestion.",
            "Un admin attentif, c'est un reseau fiable.",
        ],
        "TECHNICIEN": [
            "Bon courage sur le terrain, prudence sur les poteaux !",
            "Chaque raccordement compte — merci pour votre engagement.",
            "Votre travail connecte des familles entières. Continuez !",
            "Un technicien sur le terrain, c'est la promesse d'un service rétabli.",
            "La fibre que vous posez aujourd'hui, c'est le futur de demain.",
            "Merci pour votre dedication et votre professionnalisme.",
            "Chaque intervention terminée, c'est un client satisfait de plus.",
            "Votre expertise technique fait la difference au quotidien.",
        ],
        "RESPONSABLE": [
            "Les indicateurs sont au vert, excellent travail d'equipe.",
            "Votre coordination fait la force de l'equipe FTTH.",
            "Les delais d'intervention s'ameliorent grace a votre pilotage.",
            "Excellent suivi des KPIs ce mois-ci, bravo !",
            "Votre leadership inspire toute l'equipe technique.",
            "La satisfaction client progresse sous votre supervision.",
            "Continuez ce travail remarquable de coordination terrain.",
            "Votre management agile fait avancer les chantiers efficacement.",
        ],
        "CLIENT": [
            "Profitez de la vitesse de la fibre !",
            "Votre satisfaction est notre priorite absolue.",
            "La fibre FTTH, c'est l'internet de la nouvelle generation.",
            "Merci de nous faire confiance pour votre connexion.",
            "Nous veillons sur la qualite de votre service 24h/24.",
            "Votre connexion ultra-rapide est entre de bonnes mains.",
            "Naviguez, streamez, travaillez sans limites !",
            "Bienvenue dans l'univers de la fibre optique haute performance.",
        ],
    }
    message_list = messages.get(role_upper, [
        "Bienvenue sur FTTH Monitor !",
        "Merci d'utiliser notre plateforme.",
        "Une journee productive vous attend.",
    ])
    return {"message": random.choice(message_list), "ia_used": False}


if __name__ == "__main__":
    import uvicorn

    ia_port = int(os.environ.get("IA_PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=ia_port)
