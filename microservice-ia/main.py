from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import os
import torch
from transformers import CamembertTokenizer, CamembertForSequenceClassification, GPT2Tokenizer, GPT2LMHeadModel
import random

app = FastAPI(title="FTTH Monitor - IA Microservice")

# --- Modèles Pydantic (Structures de données) ---
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

# --- Chargement de CamemBERT (s'il a été entraîné) ---
MODEL_PATH = "./models/camembert-ftth"
tokenizer = None
model = None

try:
    if os.path.exists(MODEL_PATH):
        print(f"✅ Chargement du modèle CamemBERT depuis {MODEL_PATH}...")
        tokenizer = CamembertTokenizer.from_pretrained(MODEL_PATH)
        model = CamembertForSequenceClassification.from_pretrained(MODEL_PATH)
    else:
        print("⚠️ Modèle CamemBERT introuvable. Veuillez exécuter train_camembert.py d'abord.")
except Exception as e:
    print(f"❌ Erreur lors du chargement de CamemBERT: {e}")

# --- Chargement de GPT-2 (s'il a été entraîné) ---
GEN_MODEL_PATH = "./models/generator-ftth"
gen_tokenizer = None
gen_model = None

try:
    if os.path.exists(GEN_MODEL_PATH):
        print(f"✅ Chargement du modèle GPT-2 depuis {GEN_MODEL_PATH}...")
        gen_tokenizer = GPT2Tokenizer.from_pretrained(GEN_MODEL_PATH)
        gen_model = GPT2LMHeadModel.from_pretrained(GEN_MODEL_PATH)
except Exception as e:
    print(f"❌ Erreur lors du chargement de GPT-2: {e}")

# --- Routes API ---

@app.post("/ia/analyze-sentiment")
async def analyze_sentiment(request: SentimentRequest):
    if model and tokenizer:
        # Utilisation de la vraie IA
        inputs = tokenizer(request.text, return_tensors="pt", padding=True, truncation=True, max_length=128)
        with torch.no_grad():
            outputs = model(**inputs)
            scores = torch.nn.functional.softmax(outputs.logits, dim=1)
            predicted_class_id = torch.argmax(scores).item()
            score = scores[0][predicted_class_id].item()
            sentiment = model.config.id2label[predicted_class_id]
            
        return {"sentiment": sentiment, "score": round(score, 2), "ia_used": True}
    else:
        # Fallback très basique en Python si le modèle n'est pas prêt
        text_lower = request.text.lower()
        if "panne" in text_lower or "inadmissible" in text_lower:
            return {"sentiment": "Négatif", "score": 0.9, "ia_used": False}
        elif "merci" in text_lower or "propre" in text_lower:
            return {"sentiment": "Positif", "score": 0.9, "ia_used": False}
        return {"sentiment": "Neutre", "score": 0.5, "ia_used": False}

@app.post("/ia/predict-pannes")
async def predict_pannes(request: PredictionRequest):
    # Logique simplifiée pour Random Forest (à remplacer par un vrai modèle entraîné avec Scikit-Learn)
    # Pour l'instant, simule une prédiction basée sur l'historique
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
        risque = "Élevé"
    elif final_prob >= 40:
        risque = "Moyen"
        
    return {
        "zone": request.zone,
        "probabilite": final_prob,
        "risque": risque,
        "modele": "RandomForest_Simulé"
    }

@app.get("/ia/motivational-message/{role}")
async def motivational_message(role: str):
    role_upper = role.upper()
    if gen_model and gen_tokenizer:
        prompt = f"Rôle: {role_upper} | Message: "
        inputs = gen_tokenizer(prompt, return_tensors="pt")
        with torch.no_grad():
            outputs = gen_model.generate(
                **inputs, 
                max_new_tokens=30, 
                num_return_sequences=1,
                temperature=0.8,
                top_p=0.9,
                do_sample=True,
                pad_token_id=gen_tokenizer.eos_token_id
            )
        generated_text = gen_tokenizer.decode(outputs[0], skip_special_tokens=True)
        if "Message: " in generated_text:
            final_message = generated_text.split("Message: ")[-1].strip()
        else:
            final_message = generated_text.replace(prompt, "").strip()
        return {"message": final_message, "ia_used": True}
    else:
        messages = {
            "ADMIN": ["Le réseau est entre de bonnes mains aujourd'hui.", "Supervision optimale."],
            "TECHNICIEN": ["Bon courage sur le terrain, prudence sur les poteaux !", "Chaque raccordement compte."],
            "RESPONSABLE": ["Les indicateurs sont au vert, excellent travail d'équipe."],
            "CLIENT": ["Profitez de la vitesse de la fibre !", "Votre satisfaction est notre priorité."]
        }
        message_list = messages.get(role_upper, ["Bienvenue sur FTTH Monitor !"])
        return {"message": random.choice(message_list), "ia_used": False}

if __name__ == "__main__":
    import uvicorn
    # Lancement du serveur sur le port 8000 (attendu par aiService.js)
    uvicorn.run(app, host="0.0.0.0", port=8000)
