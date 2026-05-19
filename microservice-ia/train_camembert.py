import pandas as pd
from transformers import CamembertTokenizer, CamembertForSequenceClassification, Trainer, TrainingArguments
import torch
from datasets import Dataset
import os

# 1. Configuration
DATASET_PATH = "../dataset_camembert.csv"
MODEL_SAVE_PATH = "./models/camembert-ftth"
MODEL_NAME = "camembert-base"

# Mapping des labels
label2id = {"Négatif": 0, "Neutre": 1, "Positif": 2}
id2label = {0: "Négatif", 1: "Neutre", 2: "Positif"}

print("Demarrage de l'entrainement de CamemBERT pour FTTH Monitor...")

# 2. Charger les données
if not os.path.exists(DATASET_PATH):
    print(f"Erreur : Le fichier {DATASET_PATH} est introuvable.")
    exit(1)

df = pd.read_csv(DATASET_PATH)
df['label'] = df['label'].map(label2id)

print(f"Dataset charge : {len(df)} exemples.")

# Convertir en format Dataset HuggingFace
hf_dataset = Dataset.from_pandas(df)

# 3. Charger le Tokenizer et le Modèle pré-entraîné
print("Chargement du modele de base (cela peut prendre quelques minutes pour le telechargement)...")
tokenizer = CamembertTokenizer.from_pretrained(MODEL_NAME)
model = CamembertForSequenceClassification.from_pretrained(
    MODEL_NAME, 
    num_labels=3, 
    id2label=id2label, 
    label2id=label2id
)

# 4. Fonction de tokenization
def tokenize_function(examples):
    return tokenizer(examples["texte"], padding="max_length", truncation=True, max_length=128)

tokenized_datasets = hf_dataset.map(tokenize_function, batched=True)

# 5. Paramètres d'entraînement
# Pour un vrai projet, on utiliserait plus d'epochs et un jeu de validation.
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=3,              # Nombre de passages sur le dataset
    per_device_train_batch_size=4,   # Petits lots vu la taille de notre dataset
    save_steps=10_000,
    save_total_limit=2,
    learning_rate=2e-5,
    logging_steps=10,
    report_to="none" # Désactive les logs vers wandb
)

# 6. Entraîneur (Trainer)
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets,
)

# 7. Lancer l'entraînement
print("Debut de l'entrainement (Fine-Tuning)...")
trainer.train()

# 8. Sauvegarder le modèle entraîné
print(f"Sauvegarde du modele dans {MODEL_SAVE_PATH}...")
model.save_pretrained(MODEL_SAVE_PATH)
tokenizer.save_pretrained(MODEL_SAVE_PATH)

print("Entrainement termine avec succes ! Le microservice pourra maintenant l'utiliser.")
