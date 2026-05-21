# FTTH Monitor - Checklist Pret Demo/Prod

## 1. Demarrer le microservice IA reel

```powershell
cd C:\Users\DELL\Desktop\ftth-monitor\microservice-ia
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

Verifier:
- `http://localhost:8001/docs` accessible

## 2. Demarrer le backend avec la bonne URL IA

```powershell
cd C:\Users\DELL\Desktop\ftth-monitor\backend
$env:IA_MICROSERVICE_URL="http://localhost:8001"
npm run dev
```

## 3. Verifications rapides

1. Login OK (Admin/Responsable/Technicien/Client)
2. Prediction pannes visible et variee (pas figee a 99)
3. Changement statut intervention -> impact sur probabilite
4. Sentiment API repond (`ia_used: true`)
5. Message motivation API repond (fallback propre si texte faible)

## 4. SMTP (optionnel en demo locale)

- Si erreur `421 4.3.0`, l'app fait maintenant des retries automatiques.
- En cas d'echec persistant, verifier:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - quota Google Workspace / Gmail

