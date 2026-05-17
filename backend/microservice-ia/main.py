from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import random

app = FastAPI(title="Microservice IA - FTTH Monitor")

class HistoryItem(BaseModel):
    date: str
    type: str
    statut: str
    duree: Optional[float]
    nb_incidents: int

class PredictionRequest(BaseModel):
    zone: str
    historique: List[HistoryItem]

class SentimentRequest(BaseModel):
    text: str

@app.post("/ia/predict-pannes")
async def predict_pannes(request: PredictionRequest):
    # Simulation du modèle Random Forest (scikit-learn)
    # Dans un cas réel, on chargerait le modèle avec joblib : model.predict(data)
    
    # Calcul de probabilité simulé basé sur l'historique (logique Random Forest)
    nb_incidents = sum(item.nb_incidents for item in request.historique)
    prob = min(99, (nb_incidents * 12) + random.randint(0, 10))
    
    risque = "Faible"
    if prob > 70: risque = "Élevé"
    elif prob > 35: risque = "Moyen"
    
    return {
        "zone": request.zone,
        "probabilite": prob,
        "risque": risque
    }

@app.post("/ia/analyze-sentiment")
async def analyze_sentiment(request: SentimentRequest):
    # Simulation du modèle CamemBERT (HuggingFace)
    # Analyse simplifiée pour la démonstration technique
    text = request.text.lower()
    
    if any(word in text for word in ["mauvais", "panne", "lent", "colere", "probleme", "déçu"]):
        return {"sentiment": "Négatif", "score": random.uniform(0.7, 0.99)}
    elif any(word in text for word in ["bon", "super", "merci", "rapide", "parfait", "top"]):
        return {"sentiment": "Positif", "score": random.uniform(0.7, 0.99)}
    else:
        return {"sentiment": "Neutre", "score": random.uniform(0.4, 0.6)}

@app.get("/ia/motivational-message/{role}")
async def get_message(role: str, performance: Optional[float] = 100):
    # Génération de message personnalisé par l'IA (US-36)
    messages = {
        "ADMIN": "Capitaine, le réseau est sous votre contrôle. Excellente journée !",
        "RESPONSABLE": "Les indicateurs sont au vert. Votre gestion fait la différence.",
        "TECHNICIEN": "Chaque soudure compte. Vous êtes le garant de la connectivité !",
        "CLIENT": "Merci de nous faire confiance pour votre connexion fibre."
    }
    return {"message": messages.get(role.upper(), "Bienvenue sur FTTH Monitor.")}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
