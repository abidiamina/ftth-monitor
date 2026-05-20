from pathlib import Path
import json
import traceback

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from randomforest_utils import (
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    build_randomforest_training_dataset,
)

BASE_DIR = Path(__file__).resolve().parent
DATASET_PANNES_PATH = BASE_DIR / "dataset_pannes.csv"
DATASET_OUVERTES_PATH = BASE_DIR / "dataset_ouvertes.csv"
MODEL_SAVE_PATH = BASE_DIR / "models" / "randomforest-ftth"
MODEL_SAVE_PATH.mkdir(parents=True, exist_ok=True)

print("Starting Random Forest training for outage prediction...")

try:
    print("Loading datasets...")
    df_pannes = pd.read_csv(DATASET_PANNES_PATH, encoding="latin-1", low_memory=False)
    df_ouvertes = pd.read_csv(
        DATASET_OUVERTES_PATH,
        sep=";",
        encoding="latin-1",
        low_memory=False,
    )

    print(f"Dataset pannes rows: {len(df_pannes)}")
    print(f"Dataset ouvertes rows: {len(df_ouvertes)}")

    training_df = build_randomforest_training_dataset(df_pannes, df_ouvertes)
    X = training_df[FEATURE_COLUMNS]
    y = training_df[TARGET_COLUMN]

    print(f"Training rows prepared: {len(training_df)}")
    print(f"Positive class rows: {(y == 1).sum()}")
    print(f"Negative class rows: {(y == 0).sum()}")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y if y.nunique() > 1 else None,
    )

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore"),
                ["zone", "type"],
            ),
            ("numeric", "passthrough", ["nb_incidents", "statut_terminee"]),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocess", preprocessor),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=160,
                    max_depth=12,
                    min_samples_split=5,
                    min_samples_leaf=2,
                    class_weight="balanced",
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )

    print("Training Random Forest...")
    model.fit(X_train, y_train)

    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)

    print("Training scores:")
    print(f"  Train accuracy: {train_score:.2%}")
    print(f"  Test accuracy: {test_score:.2%}")

    metadata = {
        "features": FEATURE_COLUMNS,
        "train_rows": len(X_train),
        "test_rows": len(X_test),
        "positive_rows": int((y == 1).sum()),
        "negative_rows": int((y == 0).sum()),
        "train_accuracy": round(float(train_score), 4),
        "test_accuracy": round(float(test_score), 4),
    }

    print(f"Saving trained model to {MODEL_SAVE_PATH}...")
    joblib.dump(model, MODEL_SAVE_PATH / "model.pkl")
    (MODEL_SAVE_PATH / "metadata.json").write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )

    print("Random Forest training completed successfully.")

except Exception as exc:
    print(f"Training failed: {exc}")
    traceback.print_exc()
