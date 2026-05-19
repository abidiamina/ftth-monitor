import pandas as pd
from transformers import GPT2Tokenizer, GPT2LMHeadModel, Trainer, TrainingArguments, DataCollatorForLanguageModeling
from datasets import Dataset
import os
import torch

# 1. Configuration
DATASET_PATH = "../dataset_messages.csv"
MODEL_SAVE_PATH = "./models/generator-ftth"
MODEL_NAME = "gpt2" # Modèle de base léger pour la génération

print("🚀 Démarrage de l'entraînement du Générateur de Messages (GPT-2)...")

if not os.path.exists(DATASET_PATH):
    print(f"❌ Erreur : Le fichier {DATASET_PATH} est introuvable.")
    exit(1)

# 2. Préparation des données (Format Causal Language Modeling)
# On donne à l'IA des phrases sous la forme : "Rôle: TECHNICIEN | Message: Bon courage !"
df = pd.read_csv(DATASET_PATH)
df['text'] = "Rôle: " + df['role'] + " | Message: " + df['message'] + " <|endoftext|>"

hf_dataset = Dataset.from_pandas(df[['text']])

print(f"✅ Dataset chargé : {len(df)} exemples.")

# 3. Chargement du Tokenizer et du Modèle GPT-2
print("⏳ Chargement du modèle GPT-2 de base...")
tokenizer = GPT2Tokenizer.from_pretrained(MODEL_NAME)
# GPT-2 n'a pas de padding token par défaut, on utilise eos_token
tokenizer.pad_token = tokenizer.eos_token 

model = GPT2LMHeadModel.from_pretrained(MODEL_NAME)

# 4. Tokenization
def tokenize_function(examples):
    return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=64)

tokenized_datasets = hf_dataset.map(tokenize_function, batched=True)

# 5. Data Collator pour le Language Modeling (prépare les labels pour prédire le mot suivant)
data_collator = DataCollatorForLanguageModeling(
    tokenizer=tokenizer, 
    mlm=False # mlm=False car c'est un modèle Causal (de gauche à droite)
)

# 6. Paramètres d'entraînement
training_args = TrainingArguments(
    output_dir="./results_gen",
    num_train_epochs=10, # Plus d'epochs car le dataset est tout petit et GPT-2 ne parle pas bien français de base
    per_device_train_batch_size=4,
    save_steps=10_000,
    save_total_limit=2,
    learning_rate=5e-5,
    logging_steps=10,
    report_to="none"
)

# 7. Lancement de l'entraînement
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets,
    data_collator=data_collator,
)

print("🔥 Début de l'entraînement (Fine-Tuning Génératif)...")
trainer.train()

# 8. Sauvegarde
print(f"💾 Sauvegarde du modèle dans {MODEL_SAVE_PATH}...")
model.save_pretrained(MODEL_SAVE_PATH)
tokenizer.save_pretrained(MODEL_SAVE_PATH)

print("🎉 Entraînement génératif terminé avec succès !")
