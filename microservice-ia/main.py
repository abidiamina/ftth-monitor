from pathlib import Path
from typing import List, Optional
import json
import os
import random

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

try:
    if os.path.exists(MODEL_PATH):
        print(f"Loading CamemBERT model from {MODEL_PATH}...")
        tokenizer = CamembertTokenizer.from_pretrained(MODEL_PATH)
        model = CamembertForSequenceClassification.from_pretrained(MODEL_PATH)
    else:
        print("CamemBERT model not found. Run train_camembert.py first.")
except Exception as exc:
    print(f"Failed to load CamemBERT: {exc}")

try:
    if os.path.exists(GEN_MODEL_PATH):
        print(f"Loading GPT-2 model from {GEN_MODEL_PATH}...")
        gen_tokenizer = GPT2Tokenizer.from_pretrained(GEN_MODEL_PATH)
        gen_model = GPT2LMHeadModel.from_pretrained(GEN_MODEL_PATH)
except Exception as exc:
    print(f"Failed to load GPT-2: {exc}")

try:
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
    if model and tokenizer:
        inputs = tokenizer(
            request.text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=128,
        )
        with torch.no_grad():
            outputs = model(**inputs)
            scores = torch.nn.functional.softmax(outputs.logits, dim=1)
            predicted_class_id = torch.argmax(scores).item()
            score = scores[0][predicted_class_id].item()
            sentiment = model.config.id2label[predicted_class_id]

        return {"sentiment": sentiment, "score": round(score, 2), "ia_used": True}

    text_lower = request.text.lower()
    if "panne" in text_lower or "inadmissible" in text_lower:
        return {"sentiment": "Negatif", "score": 0.9, "ia_used": False}
    if "merci" in text_lower or "propre" in text_lower:
        return {"sentiment": "Positif", "score": 0.9, "ia_used": False}
    return {"sentiment": "Neutre", "score": 0.5, "ia_used": False}


@app.post("/ia/predict-pannes")
async def predict_pannes(request: PredictionRequest):
    if rf_model:
        try:
            if request.historique:
                last_interv = request.historique[-1]
                last_payload = (
                    last_interv.model_dump()
                    if hasattr(last_interv, "model_dump")
                    else last_interv.dict()
                )
                features = build_prediction_features(request.zone, last_payload)
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
    role_upper = role.upper()
    if gen_model and gen_tokenizer:
        prompt = f"Role: {role_upper} | Message: "
        inputs = gen_tokenizer(prompt, return_tensors="pt")
        with torch.no_grad():
            outputs = gen_model.generate(
                **inputs,
                max_new_tokens=30,
                num_return_sequences=1,
                temperature=0.8,
                top_p=0.9,
                do_sample=True,
                pad_token_id=gen_tokenizer.eos_token_id,
            )
        generated_text = gen_tokenizer.decode(outputs[0], skip_special_tokens=True)
        if "Message: " in generated_text:
            final_message = generated_text.split("Message: ")[-1].strip()
        else:
            final_message = generated_text.replace(prompt, "").strip()
        return {"message": final_message, "ia_used": True}

    messages = {
        "ADMIN": ["Le reseau est entre de bonnes mains aujourd'hui.", "Supervision optimale."],
        "TECHNICIEN": [
            "Bon courage sur le terrain, prudence sur les poteaux !",
            "Chaque raccordement compte.",
        ],
        "RESPONSABLE": ["Les indicateurs sont au vert, excellent travail d'equipe."],
        "CLIENT": ["Profitez de la vitesse de la fibre !", "Votre satisfaction est notre priorite."],
    }
    message_list = messages.get(role_upper, ["Bienvenue sur FTTH Monitor !"])
    return {"message": random.choice(message_list), "ia_used": False}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
