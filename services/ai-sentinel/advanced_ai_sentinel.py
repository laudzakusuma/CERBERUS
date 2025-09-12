# advanced_ai_sentinel.py
# Integrated with IsolationForest model logic from final-ai-sentinel.py
# Sources: advanced_ai_sentinel.py (original) :contentReference[oaicite:2]{index=2}
#          final-ai-sentinel.py (model loader & training) :contentReference[oaicite:3]{index=3}

import json
import hashlib
import asyncio
from flask_cors import CORS
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict, deque
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass, asdict
from flask import Flask, request, jsonify, g
import threading

import time
import logging
import sqlite3
from contextlib import contextmanager

# --- Added imports for integrated ML model ---
import os
import traceback
import joblib
import pandas as pd

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Simple rate limiting without external dependencies
request_counts = defaultdict(lambda: {'count': 0, 'reset_time': time.time() + 3600})

def rate_limit(max_requests=100, window=3600):
    def decorator(f):
        def wrapper(*args, **kwargs):
            client_ip = request.environ.get('REMOTE_ADDR', '127.0.0.1')
            current_time = time.time()
            
            # Reset counter if window expired
            if current_time > request_counts[client_ip]['reset_time']:
                request_counts[client_ip] = {'count': 0, 'reset_time': current_time + window}
            
            # Check rate limit
            if request_counts[client_ip]['count'] >= max_requests:
                return jsonify({'error': 'Rate limit exceeded'}), 429
            
            request_counts[client_ip]['count'] += 1
            return f(*args, **kwargs)
        
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator

@dataclass
class ThreatSignature:
    name: str
    confidence: float
    severity: int
    category: str
    indicators: List[str]
    metadata: Dict[str, Any]

@dataclass
class ModelPrediction:
    model_name: str
    confidence: float
    threat_category: str
    threat_level: int
    reasoning: str
    feature_importance: Dict[str, float]

@dataclass
class EnsembleResult:
    final_confidence: float
    threat_category: str
    threat_level: int
    is_malicious: bool
    model_consensus: float
    individual_predictions: List[ModelPrediction]
    meta_features: Dict[str, Any]

class AdvancedFeatureExtractor:
    """Advanced feature extraction with domain expertise"""
    
    def __init__(self):
        self.gas_price_history = deque(maxlen=1000)
        self.value_patterns = defaultdict(list)
        self.address_patterns = defaultdict(dict)
        self.temporal_features = {}
        
    def extract_comprehensive_features(self, tx_data: Dict) -> Dict[str, Any]:
        """Extract comprehensive features for threat detection"""
        
        base_features = self._extract_base_features(tx_data)
        temporal_features = self._extract_temporal_features(tx_data)
        pattern_features = self._extract_pattern_features(tx_data)
        network_features = self._extract_network_features(tx_data)
        behavioral_features = self._extract_behavioral_features(tx_data)
        
        return {
            **base_features,
            **temporal_features,
            **pattern_features,
            **network_features,
            **behavioral_features
        }

    def _extract_base_features(self, tx_data: Dict) -> Dict[str, Any]:
        """Extract basic transaction features"""
        # Sesudah diubah
        gas_price = self._safe_int_conversion(tx_data.get('gasPrice', 0))
        gas_limit = self._safe_int_conversion(tx_data.get('gasLimit', 0))
        value_wei = self._safe_int_conversion(tx_data.get('value', 0))
        value_eth = value_wei / 1e18
        
        return {
            'gas_price_gwei': gas_price / 1e9,
            'gas_limit': gas_limit,
            'value_eth': value_eth,
            'value_wei': value_wei,
            'is_contract_creation': tx_data.get('to') is None,
            'data_size': len(tx_data.get('data', '')),
            'has_data': bool(tx_data.get('data') and tx_data.get('data') != '0x'),
            'nonce': self._safe_int_conversion(tx_data.get('nonce', 0))
        }
    
    def _extract_temporal_features(self, tx_data: Dict) -> Dict[str, Any]:
        """Extract time-based features"""
        current_time = datetime.now()
        
        # Time of day analysis
        hour = current_time.hour
        is_weekend = current_time.weekday() >= 5
        is_night = hour < 6 or hour > 22
        
        # Gas price trend analysis
        gas_price = self._safe_int_conversion(tx_data.get('gasPrice', 0))
        self.gas_price_history.append(gas_price)
        
        gas_price_percentile = 50
        if len(self.gas_price_history) > 10:
            sorted_prices = sorted(self.gas_price_history)
            try:
                gas_price_percentile = (sorted_prices.index(gas_price) / len(sorted_prices)) * 100
            except ValueError:
                gas_price_percentile = 50
        
        return {
            'hour_of_day': hour,
            'is_weekend': is_weekend,
            'is_night_time': is_night,
            'gas_price_percentile': gas_price_percentile,
            'gas_price_deviation': abs(gas_price - np.mean(list(self.gas_price_history))) if self.gas_price_history else 0
        }
    
    def _extract_pattern_features(self, tx_data: Dict) -> Dict[str, Any]:
        """Extract pattern-based features"""
        from_addr = tx_data.get('from', '').lower()
        to_addr = tx_data.get('to', '').lower() if tx_data.get('to') else None
        value_eth = self._safe_int_conversion(tx_data.get('value', 0)) / 1e18
        
        # Track address patterns
        if from_addr:
            if from_addr not in self.address_patterns:
                self.address_patterns[from_addr] = {
                    'tx_count': 0,
                    'total_value': 0,
                    'avg_gas_price': 0,
                    'contract_interactions': 0,
                    'first_seen': datetime.now(),
                    'last_seen': datetime.now()
                }
            
            pattern = self.address_patterns[from_addr]
            pattern['tx_count'] += 1
            pattern['total_value'] += value_eth
            pattern['last_seen'] = datetime.now()
            
            if tx_data.get('to') is None:
                pattern['contract_interactions'] += 1
        
        # Value pattern analysis
        value_bucket = self._get_value_bucket(value_eth)
        self.value_patterns[value_bucket].append(value_eth)
        
        return {
            'from_tx_count': self.address_patterns.get(from_addr, {}).get('tx_count', 0),
            'from_total_value': self.address_patterns.get(from_addr, {}).get('total_value', 0),
            'value_bucket': value_bucket,
            'is_round_number': self._is_round_number(value_eth),
            'address_age_hours': self._get_address_age_hours(from_addr)
        }
    
    def _extract_network_features(self, tx_data: Dict) -> Dict[str, Any]:
        """Extract network-level features"""
        data = tx_data.get('data', '')
        
        # Function signature analysis
        function_signature = ''
        if data and len(data) >= 10:
            function_signature = data[:10]
        
        # Known malicious patterns
        suspicious_patterns = [
            '0xa9059cbb',  # transfer
            '0x095ea7b3',  # approve
            '0x23b872dd',  # transferFrom
        ]
        
        has_suspicious_signature = function_signature in suspicious_patterns
        
        return {
            'function_signature': function_signature,
            'has_suspicious_signature': has_suspicious_signature,
            'data_entropy': self._calculate_entropy(data),
            'has_proxy_pattern': self._detect_proxy_pattern(data)
        }
    
    def _extract_behavioral_features(self, tx_data: Dict) -> Dict[str, Any]:
        """Extract behavioral analysis features"""
        gas_price = int(tx_data.get('gasPrice', 0) or 0)
        gas_limit = int(tx_data.get('gasLimit', 0) or 0)
        value_eth = self._safe_int_conversion(tx_data.get('value', 0)) / 1e18
        
        # Behavioral indicators
        gas_efficiency = gas_price / gas_limit if gas_limit > 0 else 0
        is_zero_value = value_eth == 0
        is_exact_gas_limit = gas_limit in [21000, 51000, 100000, 200000]
        
        return {
            'gas_efficiency': gas_efficiency,
            'is_zero_value': is_zero_value,
            'is_exact_gas_limit': is_exact_gas_limit,
            'value_to_gas_ratio': value_eth / (gas_price / 1e18) if gas_price > 0 else 0
        }
    
    def _safe_int_conversion(self, value: Any) -> int:
        """Safely convert value to int"""
        if not value:
            return 0
        try:
            if isinstance(value, str) and value.startswith('0x'):
                return int(value, 16)
            return int(value)
        except (ValueError, TypeError):
            return 0
    
    def _get_value_bucket(self, value_eth: float) -> str:
        """Categorize transaction value"""
        if value_eth == 0:
            return 'zero'
        elif value_eth < 0.001:
            return 'dust'
        elif value_eth < 0.1:
            return 'small'
        elif value_eth < 1:
            return 'medium'
        elif value_eth < 10:
            return 'large'
        else:
            return 'whale'
    
    def _is_round_number(self, value: float) -> bool:
        """Check if value is a round number"""
        return value in [0.1, 0.5, 1.0, 5.0, 10.0, 50.0, 100.0]
    
    def _get_address_age_hours(self, address: str) -> float:
        """Get address age in hours"""
        if address in self.address_patterns:
            first_seen = self.address_patterns[address]['first_seen']
            return (datetime.now() - first_seen).total_seconds() / 3600
        return 0
    
    def _calculate_entropy(self, data: str) -> float:
        """Calculate Shannon entropy of data"""
        if not data or len(data) < 2:
            return 0
        
        from collections import Counter
        counts = Counter(data)
        length = len(data)
        
        entropy = 0
        for count in counts.values():
            p = count / length
            if p > 0:
                entropy -= p * np.log2(p)
        
        return entropy
    
    def _detect_proxy_pattern(self, data: str) -> bool:
        """Detect proxy contract patterns"""
        proxy_signatures = [
            '0x3659cfe6',  # upgradeTo
            '0x4f1ef286',  # upgradeToAndCall
            '0x52d1902d',  # proxiableUUID
        ]
        
        if data and len(data) >= 10:
            return data[:10] in proxy_signatures
        return False

# ========== Integration: IsolationForest model loader/trainer (from final-ai-sentinel.py) ==========
ISOLATION_MODEL_PATH = 'model.joblib'
isolation_model = None

def create_and_train_isolation_model():
    """Create and train model if missing (IsolationForest)."""
    try:
        from sklearn.ensemble import IsolationForest
    except Exception as e:
        logger.error("scikit-learn not installed or import failed: %s", e)
        raise

    logger.info("Creating new IsolationForest model...")

    np.random.seed(42)
    n_samples = 2000

    # Normal transactions
    normal_gas_price = np.random.normal(20, 5, int(n_samples * 0.95))
    normal_gas_used = np.random.normal(50000, 15000, int(n_samples * 0.95))
    normal_value = np.random.power(0.1, int(n_samples * 0.95)) * 10
    normal_is_contract = np.zeros(int(n_samples * 0.95))

    # Anomalous transactions
    anomalous_gas_price = np.random.normal(100, 20, int(n_samples * 0.05))
    anomalous_gas_used = np.random.normal(500000, 100000, int(n_samples * 0.05))
    anomalous_value = np.random.uniform(50, 200, int(n_samples * 0.05))
    anomalous_is_contract = np.ones(int(n_samples * 0.05))

    # Combine data
    gas_price = np.concatenate([normal_gas_price, anomalous_gas_price])
    gas_used = np.concatenate([normal_gas_used, anomalous_gas_used])
    value = np.concatenate([normal_value, anomalous_value])
    is_contract = np.concatenate([normal_is_contract, anomalous_is_contract])

    df = pd.DataFrame({
        'gasPrice': gas_price,
        'gasUsed': gas_used,
        'value': value,
        'isContractCreation': is_contract
    })

    new_model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    new_model.fit(df)
    joblib.dump(new_model, ISOLATION_MODEL_PATH)
    logger.info("IsolationForest model created and saved at %s", ISOLATION_MODEL_PATH)
    return new_model

def load_or_create_isolation_model():
    global isolation_model
    try:
        if os.path.exists(ISOLATION_MODEL_PATH):
            isolation_model = joblib.load(ISOLATION_MODEL_PATH)
            logger.info("✅ Isolation model loaded successfully")
        else:
            logger.info("⚠️ Isolation model file not found, creating new model...")
            isolation_model = create_and_train_isolation_model()
    except Exception as e:
        logger.error("Error loading or creating isolation model: %s", e)
        try:
            isolation_model = create_and_train_isolation_model()
        except Exception as e2:
            logger.error("Failed to create isolation model: %s", e2)
            isolation_model = None

# Initialize isolation model early
load_or_create_isolation_model()

# ========== Ensemble and detectors (unchanged structure, with AnomalyDetector updated) ==========
class MultiModelEnsemble:
    """Advanced ensemble of multiple threat detection models"""
    
    def __init__(self):
        self.models = {
            'rule_based': RuleBasedDetector(),
            'anomaly_detector': AnomalyDetector(),
            'pattern_matcher': PatternMatcher(),
            'behavioral_analyzer': BehavioralAnalyzer(),
            'meta_learner': MetaLearner()
        }
        self.model_weights = {
            'rule_based': 0.3,
            'anomaly_detector': 0.25,
            'pattern_matcher': 0.2,
            'behavioral_analyzer': 0.15,
            'meta_learner': 0.1
        }
        self.prediction_history = deque(maxlen=1000)
        
    def predict_ensemble(self, features: Dict[str, Any]) -> EnsembleResult:
        """Generate ensemble prediction"""
        individual_predictions = []
        
        for model_name, model in self.models.items():
            try:
                prediction = model.predict(features)
                individual_predictions.append(prediction)
            except Exception as e:
                logger.error(f"Model {model_name} failed: {e}")
                continue
        
        if not individual_predictions:
            return self._default_prediction()
        
        # Weighted ensemble
        weighted_confidence = sum(
            pred.confidence * self.model_weights.get(pred.model_name, 0.1)
            for pred in individual_predictions
        )
        
        # Consensus analysis
        categories = [pred.threat_category for pred in individual_predictions]
        most_common_category = max(set(categories), key=categories.count)
        
        # Model consensus score
        consensus = categories.count(most_common_category) / len(categories)
        
        # Meta-features for final decision
        meta_features = self._extract_meta_features(individual_predictions, features)
        
        # Final threat level determination
        avg_level = sum(pred.threat_level for pred in individual_predictions) / len(individual_predictions)
        final_level = int(round(avg_level))
        
        result = EnsembleResult(
            final_confidence=weighted_confidence,
            threat_category=most_common_category,
            threat_level=final_level,
            is_malicious=weighted_confidence > 30 and consensus > 0.4,
            model_consensus=consensus,
            individual_predictions=individual_predictions,
            meta_features=meta_features
        )
        
        self.prediction_history.append(result)
        return result
    
    def _extract_meta_features(self, predictions: List[ModelPrediction], features: Dict) -> Dict[str, Any]:
        """Extract meta-features from ensemble"""
        confidences = [pred.confidence for pred in predictions]
        
        return {
            'confidence_std': float(np.std(confidences)),
            'confidence_range': max(confidences) - min(confidences),
            'high_confidence_count': sum(1 for c in confidences if c > 80),
            'model_agreement': len(set(pred.threat_category for pred in predictions)) == 1,
            'avg_confidence': float(np.mean(confidences)),
            'feature_complexity_score': self._calculate_feature_complexity(features)
        }
    
    def _calculate_feature_complexity(self, features: Dict) -> float:
        """Calculate complexity score of input features"""
        complexity = 0
        complexity += features.get('data_entropy', 0) * 10
        complexity += features.get('gas_price_percentile', 0) / 10
        complexity += features.get('from_tx_count', 0) / 100
        return min(complexity, 100)
    
    def _default_prediction(self) -> EnsembleResult:
        """Return default prediction when models fail"""
        return EnsembleResult(
            final_confidence=0.0,
            threat_category='UNKNOWN',
            threat_level=0,
            is_malicious=False,
            model_consensus=0.0,
            individual_predictions=[],
            meta_features={}
        )

class RuleBasedDetector:
    """Advanced rule-based threat detector"""
    
    def predict(self, features: Dict[str, Any]) -> ModelPrediction:
        """Rule-based prediction"""
        score = 0
        reasoning = []
        
        # Gas price rules
        gas_price_gwei = features.get('gas_price_gwei', 0)
        if gas_price_gwei > 100:
            score += 30
            reasoning.append(f"Very high gas price: {gas_price_gwei:.1f} gwei")
        elif gas_price_gwei > 50:
            score += 15
            reasoning.append(f"High gas price: {gas_price_gwei:.1f} gwei")
        
        # Value rules
        value_eth = features.get('value_eth', 0)
        if value_eth > 100:
            score += 35
            reasoning.append(f"Very high value: {value_eth:.2f} ETH")
        elif value_eth > 10:
            score += 20
            reasoning.append(f"High value: {value_eth:.2f} ETH")
        
        # Contract creation rules
        if features.get('is_contract_creation', False):
            score += 25
            reasoning.append("Contract creation detected")
        
        # Behavioral rules
        if features.get('is_night_time', False) and value_eth > 5:
            score += 10
            reasoning.append("Large transaction during night hours")
        
        # Pattern rules
        if features.get('has_suspicious_signature', False):
            score += 20
            reasoning.append("Suspicious function signature detected")
        
        # Determine category
        category = self._determine_category(features, score)
        
        return ModelPrediction(
            model_name='rule_based',
            confidence=min(score, 100),
            threat_category=category,
            threat_level=min(score // 20, 5),
            reasoning='; '.join(reasoning) if reasoning else 'Normal transaction',
            feature_importance={
                'gas_price': gas_price_gwei / 100,
                'value': min(value_eth / 100, 1),
                'contract_creation': 1 if features.get('is_contract_creation') else 0
            }
        )
    
    def _determine_category(self, features: Dict, score: int) -> str:
        """Determine threat category based on features"""
        if features.get('is_contract_creation') and score > 60:
            return 'SMART_CONTRACT_EXPLOIT'
        elif features.get('gas_price_gwei', 0) > 80:
            return 'FRONT_RUNNING'
        elif features.get('value_eth', 0) > 50:
            return 'RUG_PULL'
        elif features.get('has_suspicious_signature'):
            return 'PHISHING_CONTRACT'
        else:
            return 'UNKNOWN'

class AnomalyDetector:
    """Statistical anomaly detection enhanced with IsolationForest (if available)"""
    
    def __init__(self):
        self.feature_stats = defaultdict(lambda: {'mean': 0, 'std': 1, 'count': 0})
    
    def predict(self, features: Dict[str, Any]) -> ModelPrediction:
        """Anomaly-based prediction using both statistical z-score and isolation model if present"""
        anomaly_score = 0
        feature_importance = {}
        
        numeric_features = ['gas_price_gwei', 'value_eth', 'gas_limit', 'data_size']
        
        # statistical anomaly contributions
        for feature in numeric_features:
            value = features.get(feature, 0)
            stats = self.feature_stats[feature]
            
            if stats['count'] > 10:
                z_score = abs((value - stats['mean']) / max(stats['std'], 0.1))
                anomaly_contribution = min(z_score * 10, 30)
                anomaly_score += anomaly_contribution
                feature_importance[feature] = anomaly_contribution / 30
            
            # Update statistics (online)
            stats['count'] += 1
            stats['mean'] = (stats['mean'] * (stats['count'] - 1) + value) / stats['count']
            variance = ((stats['std'] ** 2) * (stats['count'] - 1) + (value - stats['mean']) ** 2) / stats['count']
            stats['std'] = np.sqrt(variance)
        
        # isolation forest (ML) integration (if isolation_model loaded)
        ml_confidence = 0.0
        try:
            global isolation_model
            if isolation_model is not None:
                # prepare features dataframe similar to training
                df = pd.DataFrame([{
                    'gasPrice': features.get('gas_price_gwei', 0) * 1e9,
                    'gasUsed': features.get('gas_limit', 0),
                    'value': features.get('value_eth', 0),
                    'isContractCreation': 1 if features.get('is_contract_creation') else 0
                }])
                score = float(isolation_model.decision_function(df)[0])
                # Convert model score to 0-100-ish risk: higher anomaly -> lower decision_function -> higher risk
                ml_confidence = max(0, min(100, (1 - score) * 50))
                feature_importance['isolation_ml'] = ml_confidence / 100
        except Exception as e:
            logger.warning("Isolation model prediction failed: %s", e)
            ml_confidence = 0.0
        
        # Combine contributions: weight ML and statistical
        combined_confidence = min(100, anomaly_score * 0.8 + ml_confidence * 0.9)
        
        return ModelPrediction(
            model_name='anomaly_detector',
            confidence=float(min(combined_confidence, 100)),
            threat_category='ANOMALOUS_BEHAVIOR' if combined_confidence > 30 else 'NORMAL',
            threat_level=min(int(combined_confidence / 20), 5),
            reasoning=f'Stat anomaly: {anomaly_score:.1f}; ML_conf: {ml_confidence:.1f}',
            feature_importance=feature_importance
        )

class PatternMatcher:
    """Pattern-based threat detection"""
    
    def __init__(self):
        self.known_patterns = {
            'honeypot': {
                'signatures': ['0x', 'trap', 'honey'],
                'score': 85,
                'category': 'HONEY_POT'
            },
            'rug_pull': {
                'conditions': lambda f: f.get('value_eth', 0) > 20 and f.get('is_round_number', False),
                'score': 75,
                'category': 'RUG_PULL'
            }
        }
    
    def predict(self, features: Dict[str, Any]) -> ModelPrediction:
        """Pattern matching prediction"""
        max_score = 0
        matched_pattern = 'UNKNOWN'
        reasoning = 'No malicious patterns detected'
        
        for pattern_name, pattern_config in self.known_patterns.items():
            if 'conditions' in pattern_config:
                if pattern_config['conditions'](features):
                    score = pattern_config['score']
                    if score > max_score:
                        max_score = score
                        matched_pattern = pattern_config['category']
                        reasoning = f'Matched pattern: {pattern_name}'
        
        return ModelPrediction(
            model_name='pattern_matcher',
            confidence=max_score,
            threat_category=matched_pattern,
            threat_level=min(max_score // 20, 5),
            reasoning=reasoning,
            feature_importance={'pattern_match': max_score / 100}
        )

class BehavioralAnalyzer:
    """Behavioral analysis detector"""
    
    def predict(self, features: Dict[str, Any]) -> ModelPrediction:
        """Behavioral analysis prediction"""
        behavior_score = 0
        indicators = []
        
        # Suspicious timing
        if features.get('is_night_time') and features.get('value_eth', 0) > 1:
            behavior_score += 15
            indicators.append('Suspicious timing')
        
        # Gas optimization patterns
        gas_efficiency = features.get('gas_efficiency', 0)
        if gas_efficiency > 0.001:  # Very high efficiency might indicate automation
            behavior_score += 10
            indicators.append('Automated gas optimization')
        
        # Address behavior
        tx_count = features.get('from_tx_count', 0)
        if tx_count > 100:  # High activity address
            behavior_score += 5
            indicators.append('High activity address')
        
        return ModelPrediction(
            model_name='behavioral_analyzer',
            confidence=min(behavior_score, 100),
            threat_category='BEHAVIORAL_ANOMALY',
            threat_level=min(behavior_score // 20, 5),
            reasoning='; '.join(indicators) if indicators else 'Normal behavior',
            feature_importance={'behavior_score': behavior_score / 100}
        )

class MetaLearner:
    """Meta-learning model that learns from ensemble performance"""
    
    def __init__(self):
        self.performance_history = deque(maxlen=100)
        
    def predict(self, features: Dict[str, Any]) -> ModelPrediction:
        """Meta-learning prediction"""
        # Simple meta-prediction based on feature complexity
        complexity = features.get('feature_complexity_score', 0)
        confidence = min(complexity * 0.5, 100)
        
        return ModelPrediction(
            model_name='meta_learner',
            confidence=confidence,
            threat_category='META_ANALYSIS',
            threat_level=min(int(confidence / 20), 5),
            reasoning=f'Meta-analysis confidence: {confidence:.1f}',
            feature_importance={'meta_complexity': complexity / 100}
        )

class DatabaseManager:
    """Advanced database management for threat intelligence"""
    
    def __init__(self, db_path: str = 'threat_intelligence.db'):
        self.db_path = db_path
        self._initialize_db()
    
    def _initialize_db(self):
        """Initialize database tables"""
        with self._get_connection() as conn:
            conn.executescript('''
                CREATE TABLE IF NOT EXISTS threat_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tx_hash TEXT UNIQUE,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    confidence REAL,
                    threat_category TEXT,
                    threat_level INTEGER,
                    is_malicious BOOLEAN,
                    features TEXT,
                    model_predictions TEXT
                );
                
                CREATE TABLE IF NOT EXISTS model_performance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model_name TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    accuracy REAL,
                    precision_score REAL,
                    recall REAL,
                    f1_score REAL
                );
                
                CREATE INDEX IF NOT EXISTS idx_tx_hash ON threat_reports(tx_hash);
                CREATE INDEX IF NOT EXISTS idx_timestamp ON threat_reports(timestamp);
            ''')
    
    @contextmanager
    def _get_connection(self):
        """Get database connection with proper handling"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def store_threat_report(self, tx_hash: str, result: EnsembleResult, features: Dict):
        """Store threat report in database"""
        with self._get_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO threat_reports 
                (tx_hash, confidence, threat_category, threat_level, is_malicious, features, model_predictions)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                tx_hash,
                result.final_confidence,
                result.threat_category,
                result.threat_level,
                result.is_malicious,
                json.dumps(features),
                json.dumps([asdict(pred) for pred in result.individual_predictions])
            ))
            conn.commit()

# Initialize components
feature_extractor = AdvancedFeatureExtractor()
ensemble = MultiModelEnsemble()
db_manager = DatabaseManager()

MODEL_VERSION = "v2.0.0-advanced"
MODEL_HASH = hashlib.sha256(f"cerberus-ai-ensemble-{MODEL_VERSION}".encode()).hexdigest()

@app.before_request
def before_request():
    g.start_time = time.time()

@app.after_request
def after_request(response):
    duration = time.time() - g.start_time
    logger.info(f"Request completed in {duration:.3f}s")
    response.headers['X-Response-Time'] = str(duration)
    return response

@app.route('/', methods=['GET'])
def health_check():
    """Advanced health check with system metrics"""
    return jsonify({
        'status': 'active',
        'service': 'Cerberus Advanced AI Sentinel',
        'version': MODEL_VERSION,
        'model_hash': MODEL_HASH,
        'timestamp': datetime.utcnow().isoformat(),
        'uptime_hours': (datetime.now() - datetime.fromtimestamp(0)).total_seconds() / 3600,
        'models_loaded': list(ensemble.models.keys()),
        'prediction_history_size': len(ensemble.prediction_history),
        'feature_stats_count': len(feature_extractor.address_patterns),
        'isolation_model_loaded': isolation_model is not None
    })

@app.route('/predict', methods=['POST'])
@rate_limit(max_requests=100, window=60)
def predict():
    """Advanced prediction endpoint with ensemble modeling"""
    data = request.get_json()
    if not data:
        return jsonify({
            'error': 'No transaction data provided',
            'status': 'invalid_input'
        }), 400

    try:
        tx_hash = data.get('hash', 'unknown')
        
        # Extract comprehensive features
        features = feature_extractor.extract_comprehensive_features(data)
        
        # Generate ensemble prediction
        result = ensemble.predict_ensemble(features)
        
        # Store in database
        db_manager.store_threat_report(tx_hash, result, features)
        
        # Format response
        response = {
            'danger_score': result.final_confidence,
            'threat_category': result.threat_category,
            'threat_level': result.threat_level,
            'is_malicious': result.is_malicious,
            'confidence': result.final_confidence,
            'model_consensus': result.model_consensus,
            'anomaly_score': 1 - (result.final_confidence / 100),
            'model_version': MODEL_VERSION,
            'model_hash': MODEL_HASH,
            'analysis_timestamp': datetime.utcnow().isoformat(),
            'ensemble_details': {
                'individual_predictions': [asdict(pred) for pred in result.individual_predictions],
                'meta_features': result.meta_features,
                'model_weights': ensemble.model_weights
            },
            'features_analyzed': features,
            'threat_signature': f"{result.threat_category}: {'CRITICAL' if result.final_confidence > 90 else 'HIGH' if result.final_confidence > 75 else 'MEDIUM' if result.final_confidence > 50 else 'LOW'} - Advanced ensemble analysis"
        }
        
        logger.info(f"Analysis: {tx_hash} | Danger: {result.final_confidence:.1f} | Category: {result.threat_category} | Consensus: {result.model_consensus:.2f}")
        
        return jsonify(response)

    except Exception as e:
        error_msg = f"Advanced analysis error: {str(e)}"
        logger.error(error_msg)
        return jsonify({
            'error': error_msg,
            'status': 'analysis_failed',
            'timestamp': datetime.utcnow().isoformat()
        }), 500

def analyze_transaction(tx_data: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to analyze a transaction dict (used by /test and for programmatic calls)"""
    try:
        features = feature_extractor.extract_comprehensive_features(tx_data)
        result = ensemble.predict_ensemble(features)
        db_manager.store_threat_report(tx_data.get('hash', 'unknown'), result, features)
        return {
            'danger_score': result.final_confidence,
            'threat_category': result.threat_category,
            'threat_level': result.threat_level,
            'is_malicious': result.is_malicious,
            'analysis_timestamp': datetime.utcnow().isoformat(),
            'ensemble_details': {
                'individual_predictions': [asdict(pred) for pred in result.individual_predictions],
                'meta_features': result.meta_features
            },
            'features_analyzed': features
        }
    except Exception as e:
        logger.error("analyze_transaction failed: %s", e)
        return {'error': str(e)}

@app.route('/analytics', methods=['GET'])
def get_analytics():
    """Get advanced analytics and model performance"""
    try:
        with db_manager._get_connection() as conn:
            recent_stats = conn.execute('''
                SELECT 
                    COUNT(*) as total_reports,
                    AVG(confidence) as avg_confidence,
                    SUM(CASE WHEN is_malicious THEN 1 ELSE 0 END) as malicious_count,
                    threat_category,
                    COUNT(*) as category_count
                FROM threat_reports 
                WHERE timestamp > datetime('now', '-24 hours')
                GROUP BY threat_category
            ''').fetchall()
        
        return jsonify({
            'recent_statistics': [dict(row) for row in recent_stats],
            'model_performance': ensemble.model_weights,
            'system_metrics': {
                'total_predictions': len(ensemble.prediction_history),
                'unique_addresses': len(feature_extractor.address_patterns),
                'gas_price_samples': len(feature_extractor.gas_price_history)
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/test', methods=['POST'])
def test():
    """Test endpoint dengan transaksi berbahaya (uses analyze_transaction)"""
    test_tx = {
        'gasPrice': '0x174876e800',  # 100 gwei (high)
        'gasLimit': '0x7a120',      # 500k gas
        'value': '0xde0b6b3a7640000',  # 1 ETH
        'to': None,  # Contract creation
        'data': '0x608060405234801561001057600080fd5b50',
        'hash': '0x1234567890abcdef'
    }
    
    analysis = analyze_transaction(test_tx)
    return jsonify({
        'test_transaction': test_tx,
        'analysis': analysis
    })

if __name__ == '__main__':
    logger.info("Starting Cerberus Advanced AI Sentinel (integrated with IsolationForest)...")
    logger.info(f"Model Version: {MODEL_VERSION}")
    logger.info(f"Model Hash: {MODEL_HASH}")
    logger.info(f"Ensemble Models: {list(ensemble.models.keys())}")
    logger.info("Server starting on http://127.0.0.1:5001")
    
    app.run(debug=False, host='0.0.0.0', port=5001, threaded=True)
