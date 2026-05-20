import os

import requests

BASE_URL = os.environ.get("IA_BASE_URL", "http://localhost:8000")

print("FTTH Monitor AI model smoke tests\n")
print("=" * 60)

print("\n1. CamemBERT - Sentiment analysis")
print("-" * 60)

test_texts = [
    "La panne est inadmissible, le service est completement down!",
    "Merci pour votre intervention rapide, tout fonctionne bien maintenant.",
    "Le reseau fonctionne normalement.",
]

for text in test_texts:
    response = requests.post(
        f"{BASE_URL}/ia/analyze-sentiment",
        json={"text": text},
        timeout=30,
    )
    result = response.json()
    print(f'\nText: "{text[:50]}..."')
    print(f"   Sentiment: {result['sentiment']}")
    print(f"   Score: {result['score']}")
    print(f"   IA used: {result.get('ia_used', 'N/A')}")

print("\n\n2. Random Forest - Outage prediction")
print("-" * 60)

test_predictions = [
    {
        "zone": "BEZONS",
        "historique": [
            {"date": "2026-05-10", "type": "URGENTE", "statut": "TERMINEE", "nb_incidents": 5},
            {"date": "2026-05-11", "type": "HAUTE", "statut": "TERMINEE", "nb_incidents": 3},
        ],
    },
    {
        "zone": "ISERE",
        "historique": [
            {"date": "2026-05-15", "type": "NORMAL", "statut": "EN_COURS", "nb_incidents": 1},
        ],
    },
    {
        "zone": "ST BONNET",
        "historique": [],
    },
]

for prediction in test_predictions:
    response = requests.post(
        f"{BASE_URL}/ia/predict-pannes",
        json=prediction,
        timeout=30,
    )
    result = response.json()
    print(f"\nZone: {result['zone']}")
    print(f"   Probability: {result['probabilite']}%")
    print(f"   Risque: {result['risque']}")
    print(f"   Model: {result.get('modele', 'N/A')}")
    print(f"   IA used: {result.get('ia_used', 'N/A')}")

print("\n\n3. GPT-2 - Motivational message generation")
print("-" * 60)

roles = ["ADMIN", "TECHNICIEN", "RESPONSABLE", "CLIENT"]

for role in roles:
    response = requests.get(
        f"{BASE_URL}/ia/motivational-message/{role}",
        timeout=30,
    )
    result = response.json()
    print(f"\nRole: {role}")
    print(f'   Message: "{result["message"]}"')
    print(f"   IA used: {result.get('ia_used', 'N/A')}")

print("\n" + "=" * 60)
print("Tests completed.")
