# advanced_trainer.py
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest, RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import classification_report
from sklearn.utils import resample
import joblib
import json
from datetime import datetime
import logging
import warnings

warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CerberusAdvancedTrainer:
    """Advanced Multi-Model Trainer"""

    def __init__(self, data_path: str = 'cerberus_training_data.csv'):
        logger.info("🐺 Cerberus Advanced Trainer")
        self.data_path = data_path
        self.models = {}
        self.scaler = StandardScaler()
        self.feature_names = []

    def load_and_prepare_data(self):
        """Load and prepare data"""
        logger.info(f"📂 Loading {self.data_path}...")

        df = pd.read_csv(self.data_path)
        logger.info(f"✅ Loaded {len(df)} transactions")

        df = self.engineer_features(df)

        feature_columns = [
            'value', 'gas', 'gasPrice', 'gasUsed', 'nonce',
            'isContractCreation', 'inputLength', 'hasInput',
            'logsCount', 'gasEfficiency', 'valueDensity', 'gasPrice_gwei'
        ]

        # Ensure any missing feature columns are created with zeros if absent
        for col in feature_columns:
            if col not in df.columns:
                df[col] = 0
            else:
                df[col] = df[col].fillna(0)

        # If label column missing, create dummy (all zeros) — but ideally your CSV has 'is_malicious'
        if 'is_malicious' not in df.columns:
            logger.warning("⚠️ 'is_malicious' column not found in CSV. Creating default (all 0).")
            df['is_malicious'] = 0

        X = df[feature_columns].values
        y = df['is_malicious'].values

        # ensure integer labels (0/1)
        y = y.astype(int)

        self.feature_names = feature_columns

        logger.info(f"📊 Features: {len(feature_columns)}")
        logger.info(f"🎯 Samples: {len(X)}")
        logger.info(f"🚨 Malicious: {int(y.sum())} ({y.sum()/len(y)*100:.2f}%)")

        return X, y

    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Feature engineering"""
        # Defensive: ensure numeric columns exist
        for col in ['value', 'gas', 'gasPrice', 'gasUsed', 'nonce', 'logsCount']:
            if col not in df.columns:
                df[col] = 0
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        # Basic engineered features
        df['value_to_gas_ratio'] = df['value'] / (df['gas'] + 1)
        df['gasUsed_to_gas_ratio'] = df['gasUsed'] / (df['gas'] + 1)

        df['log_value'] = np.log1p(df['value'])
        df['log_gas'] = np.log1p(df['gas'])
        df['log_gasPrice'] = np.log1p(df.get('gasPrice', pd.Series(0)))

        median_gas = df['gasPrice'].median() if 'gasPrice' in df.columns else 0
        df['gasPrice_deviation'] = np.abs(df.get('gasPrice', 0) - median_gas) / (median_gas + 1)

        mean_value = df['value'].mean()
        df['value_deviation'] = np.abs(df['value'] - mean_value) / (mean_value + 1)

        df['gas_value_interaction'] = df['gas'] * df['value']
        df['gasPrice_value_interaction'] = df.get('gasPrice', 0) * df['value']

        # Some optional derived columns used in feature list — create safe defaults
        df['isContractCreation'] = df.get('isContractCreation', 0)
        df['inputLength'] = df.get('inputLength', 0)
        df['hasInput'] = df.get('hasInput', 0)
        df['logsCount'] = df.get('logsCount', 0)
        # Normalize or compute gasEfficiency, valueDensity, gasPrice_gwei if not present
        df['gasEfficiency'] = df.get('gasEfficiency', df['value_to_gas_ratio'])
        df['valueDensity'] = df.get('valueDensity', df['value'] / (df['value'] + df['gas'] + 1))
        df['gasPrice_gwei'] = df.get('gasPrice_gwei', df.get('gasPrice', 0) / (10 ** 9 + 1))

        return df

    def train_isolation_forest(self, X_train, X_test, y_test):
        """Train Isolation Forest"""
        logger.info("\n🌲 Training Isolation Forest...")

        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        iso_forest = IsolationForest(
            n_estimators=200,
            contamination=0.1,
            random_state=42,
            n_jobs=-1
        )

        iso_forest.fit(X_train_scaled)

        y_pred = iso_forest.predict(X_test_scaled)
        y_pred_binary = np.where(y_pred == -1, 1, 0)

        accuracy = float((y_pred_binary == y_test).mean())
        logger.info(f"   Accuracy: {accuracy:.4f}")

        self.models['isolation_forest'] = {
            'model': iso_forest,
            'scaler': self.scaler,
            'accuracy': accuracy,
            'type': 'anomaly_detection'
        }

        return iso_forest

    def train_random_forest(self, X_train, y_train, X_test, y_test):
        """Train Random Forest"""
        logger.info("\n🌳 Training Random Forest...")

        rf = RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            min_samples_split=10,
            min_samples_leaf=4,
            random_state=42,
            n_jobs=-1
        )

        rf.fit(X_train, y_train)

        y_pred = rf.predict(X_test)
        accuracy = float((y_pred == y_test).mean())

        # Feature importance
        importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': rf.feature_importances_
        }).sort_values('importance', ascending=False)

        logger.info(f"   Accuracy: {accuracy:.4f}")
        logger.info(f"   Top 5 Features:")
        for idx, row in importance.head(5).iterrows():
            logger.info(f"      {row['feature']}: {row['importance']:.4f}")

        self.models['random_forest'] = {
            'model': rf,
            'accuracy': accuracy,
            'feature_importance': importance,
            'type': 'classification'
        }

        return rf

    def train_gradient_boosting(self, X_train, y_train, X_test, y_test):
        """Train Gradient Boosting"""
        logger.info("\n🚀 Training Gradient Boosting...")

        gb = GradientBoostingClassifier(
            n_estimators=150,
            learning_rate=0.1,
            max_depth=7,
            min_samples_split=10,
            random_state=42
        )

        gb.fit(X_train, y_train)

        y_pred = gb.predict(X_test)
        accuracy = float((y_pred == y_test).mean())

        logger.info(f"   Accuracy: {accuracy:.4f}")

        self.models['gradient_boosting'] = {
            'model': gb,
            'accuracy': accuracy,
            'type': 'classification'
        }

        return gb

    def train_neural_network(self, X_train, y_train, X_test, y_test):
        """Train Neural Network"""
        logger.info("\n🧠 Training Neural Network...")

        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        mlp = MLPClassifier(
            hidden_layer_sizes=(128, 64, 32),
            activation='relu',
            solver='adam',
            alpha=0.001,
            batch_size=64,
            learning_rate='adaptive',
            max_iter=300,
            random_state=42
        )

        mlp.fit(X_train_scaled, y_train)

        y_pred = mlp.predict(X_test_scaled)
        accuracy = float((y_pred == y_test).mean())

        logger.info(f"   Accuracy: {accuracy:.4f}")
        logger.info(f"   Iterations: {mlp.n_iter_}")

        self.models['neural_network'] = {
            'model': mlp,
            'scaler': self.scaler,
            'accuracy': accuracy,
            'type': 'classification'
        }

        return mlp

    def create_ensemble(self):
        """Create ensemble"""
        logger.info("\n🎯 Creating Ensemble...")

        weights = {
            'isolation_forest': 0.20,
            'random_forest': 0.30,
            'gradient_boosting': 0.30,
            'neural_network': 0.20
        }

        for name, weight in weights.items():
            logger.info(f"   {name}: {weight:.2f}")

        self.models['ensemble'] = {
            'weights': weights,
            'type': 'ensemble'
        }

    def evaluate_ensemble(self, X_test, y_test):
        """Evaluate ensemble"""
        logger.info("\n📊 Evaluating Ensemble...")

        predictions = {}

        if 'isolation_forest' in self.models:
            X_scaled = self.models['isolation_forest']['scaler'].transform(X_test)
            pred = self.models['isolation_forest']['model'].predict(X_scaled)
            predictions['isolation_forest'] = np.where(pred == -1, 1, 0)

        if 'random_forest' in self.models:
            predictions['random_forest'] = self.models['random_forest']['model'].predict(X_test)

        if 'gradient_boosting' in self.models:
            predictions['gradient_boosting'] = self.models['gradient_boosting']['model'].predict(X_test)

        if 'neural_network' in self.models:
            X_scaled = self.models['neural_network']['scaler'].transform(X_test)
            predictions['neural_network'] = self.models['neural_network']['model'].predict(X_scaled)

        weights = self.models.get('ensemble', {}).get('weights', {})
        ensemble_pred = np.zeros(len(X_test), dtype=float)

        for name, pred in predictions.items():
            ensemble_pred += pred * weights.get(name, 0.0)

        ensemble_pred_binary = (ensemble_pred >= 0.5).astype(int)

        accuracy = float((ensemble_pred_binary == y_test).mean())

        logger.info(f"   Ensemble Accuracy: {accuracy:.4f}")
        logger.info(f"\n   Classification Report:")

        # Always include both labels 0 and 1
        labels = [0, 1]
        target_names = ['Normal', 'Malicious']

        unique_test_labels = np.unique(y_test)
        logger.info(f"   Labels present in y_test: {unique_test_labels.tolist()}")
        if len(unique_test_labels) < len(labels):
            logger.warning("   Some classes missing in test set — metrics for missing classes will be zeros.")

        print(classification_report(
            y_test,
            ensemble_pred_binary,
            labels=labels,
            target_names=target_names,
            zero_division=0
        ))

        return accuracy

    def save_models(self):
        """Save models"""
        logger.info("\n💾 Saving models...")

        for name, info in self.models.items():
            if name == 'ensemble':
                continue

            filename = f'model_{name}.joblib'
            try:
                joblib.dump(info['model'], filename)
                logger.info(f"   ✅ {filename}")
            except Exception as e:
                logger.warning(f"   Failed to save {filename}: {e}")

        # Save scaler separately
        try:
            joblib.dump(self.scaler, 'scaler.joblib')
            logger.info(f"   ✅ scaler.joblib")
        except Exception as e:
            logger.warning(f"   Failed to save scaler: {e}")

        metadata = {
            'training_date': datetime.now().isoformat(),
            'feature_names': self.feature_names,
            'models': {
                name: {
                    'accuracy': float(info.get('accuracy', 0)),
                    'type': info.get('type', 'unknown')
                }
                for name, info in self.models.items()
            },
            'ensemble_weights': self.models.get('ensemble', {}).get('weights', {})
        }

        try:
            with open('model_metadata.json', 'w') as f:
                json.dump(metadata, f, indent=2)
            logger.info(f"   ✅ model_metadata.json")
        except Exception as e:
            logger.warning(f"   Failed to write metadata: {e}")

    def train_all(self):
        """Train all models"""
        print("=" * 80)
        print("🐺 CERBERUS ADVANCED TRAINER")
        print("=" * 80)

        X, y = self.load_and_prepare_data()

        # If dataset has only one class, add synthetic malicious samples (fallback)
        if len(np.unique(y)) < 2:
            logger.warning("⚠️ Only one class in dataset. Adding synthetic malicious samples...")
            n_synthetic = max(2, int(len(X) * 0.1))  # ensure at least 2 synthetic
            synthetic_X = X[-n_synthetic:].copy()
            # Slight perturbations to avoid exact duplicates
            synthetic_X = synthetic_X + np.random.normal(0, 1e-6, size=synthetic_X.shape)
            synthetic_X[:, 0] *= 10
            synthetic_X[:, 2] *= 5
            synthetic_y = np.ones(n_synthetic, dtype=int)

            X = np.vstack([X, synthetic_X])
            y = np.concatenate([y, synthetic_y])

        # Ensure every class has at least 2 samples so stratify works.
        unique_labels, counts = np.unique(y, return_counts=True)
        label_counts = dict(zip(unique_labels.astype(int), counts.astype(int)))
        min_count = min(label_counts.values()) if label_counts else 0

        if min_count < 2:
            logger.warning("⚠️ Some classes have fewer than 2 samples. Upsampling minority classes to >=2.")
            for label, cnt in list(label_counts.items()):
                if cnt < 2:
                    # indices of the minority class
                    idx = np.where(y == label)[0]
                    n_needed = 2 - cnt
                    # resample existing minority rows with replacement
                    sampled_X = resample(X[idx], replace=True, n_samples=n_needed, random_state=42)
                    sampled_y = np.array([label] * n_needed, dtype=int)

                    X = np.vstack([X, sampled_X])
                    y = np.concatenate([y, sampled_y])
                    logger.info(f"   Upsampled label {label}: +{n_needed} samples")

            # recalc label counts for logging
            unique_labels, counts = np.unique(y, return_counts=True)
            label_counts = dict(zip(unique_labels.astype(int), counts.astype(int)))
            logger.info(f"   New class distribution: {label_counts}")

        # Now safe to stratify
        try:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
        except ValueError as e:
            # Last-resort fallback: if stratify still fails, proceed without it
            logger.warning("⚠️ Stratified split failed despite upsampling — falling back to non-stratified split.")
            logger.warning(str(e))
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=None
            )

        logger.info(f"\n📊 Data Split:")
        logger.info(f"   Training: {len(X_train)}")
        logger.info(f"   Testing: {len(X_test)}")

        # Train models
        self.train_isolation_forest(X_train, X_test, y_test)
        self.train_random_forest(X_train, y_train, X_test, y_test)
        self.train_gradient_boosting(X_train, y_train, X_test, y_test)
        self.train_neural_network(X_train, y_train, X_test, y_test)

        # Build & evaluate ensemble
        self.create_ensemble()
        accuracy = self.evaluate_ensemble(X_test, y_test)

        # Save models and metadata
        self.save_models()

        print("\n" + "=" * 80)
        print("✅ TRAINING COMPLETE!")
        print("=" * 80)
        print(f"\n🎯 Ensemble Accuracy: {accuracy:.4f}")
        print(f"\n📁 Models saved successfully")
        print(f"\n🚀 Next: Update AI API")


def main():
    trainer = CerberusAdvancedTrainer()
    trainer.train_all()


if __name__ == "__main__":
    main()