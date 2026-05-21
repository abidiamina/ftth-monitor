# FTTH Monitor

Plateforme FTTH avec:
- `backend` Node.js/Express (API metier)
- `frontend-web` React/Vite
- `mobile` React Native/Expo
- `microservice-ia` FastAPI (CamemBERT, RandomForest, GPT-2)

## Architecture et ports

- Backend API: `http://localhost:8000`
- Microservice IA: `http://localhost:8001`
- Frontend Web (dev): `http://localhost:5173`

Regle importante:
- Le microservice IA renvoie le score modele.
- Le backend applique les regles metier une seule fois pour le score final affiche.

## Prerequis

- Node.js 20+
- Python 3.10+
- npm
- Base de donnees PostgreSQL (pour le backend)

## Installation rapide

### 1) Backend

```powershell
cd backend
npm install
```

Configurer `.env` (exemples utiles):

```env
PORT=8000
DATABASE_URL=postgresql://...
JWT_SECRET=...
IA_MICROSERVICE_URL=http://localhost:8001
IA_HTTP_TIMEOUT_MS=10000
OPENWEATHER_API_KEY=your_openweather_key
OPENWEATHER_COUNTRY=FR
OPENWEATHER_TIMEOUT_MS=6000
```

### 2) Microservice IA

```powershell
cd microservice-ia
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Variables optionnelles:

```env
IA_PORT=8001
```

### 3) Frontend web

```powershell
cd frontend-web
npm install
npm run dev
```

## Demarrage

### 1) Lancer le microservice IA

```powershell
cd microservice-ia
.venv\Scripts\activate
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

Verifier:
- `http://localhost:8001/docs`

### 2) Lancer le backend

```powershell
cd backend
npm run dev
```

Verifier:
- `http://localhost:8000/api/health`

### 3) Lancer le frontend web

```powershell
cd frontend-web
npm run dev
```

## Entrainement des modeles IA

Lancer depuis `microservice-ia`:

```powershell
python train_camembert.py
python train_randomforest.py
python train_generator.py
```

Sorties attendues:
- `microservice-ia/models/camembert-ftth/*`
- `microservice-ia/models/randomforest-ftth/model.pkl`
- `microservice-ia/models/randomforest-ftth/metadata.json`
- `microservice-ia/models/generator-ftth/*`

## Tests IA rapides

Depuis `microservice-ia`:

```powershell
python test_models.py
```

Le script cible par defaut `http://localhost:8001`.

## Notes qualite ML (a presenter)

- RandomForest peut afficher des scores tres eleves (`1.0/1.0`) si le dataset est desequilibre ou fuit la cible.
- CamemBERT/GPT-2 necessitent une evaluation explicite (jeu validation/test + metriques).
- Nettoyer et uniformiser l'encodage UTF-8 des datasets avant entrainement.
