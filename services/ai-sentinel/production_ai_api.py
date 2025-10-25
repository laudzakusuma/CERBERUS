from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

class CerberusAI:
    """Production AI Engine untuk Threat Detection"""
    
    def __init__(self):
        logger.info("🐺 Initializing Cerberus AI Engine...")
        
        try:
            self.isolation_forest = joblib.load('model_isolation_forest.joblib')
            self.random_forest = joblib.load('model_random_forest.joblib')
            self.gradient_boosting = joblib.load('model_gradient_boosting.joblib')
            self.neural_network = joblib.load('model_neural_network.joblib')
            self.scaler = joblib.load('scaler.joblib')
            
            import json
            with open('model_metadata.json', 'r') as f:
                self.metadata = json.load(f)
            
            self.feature_names = self.metadata['feature_names']
            self.ensemble_weights = self.metadata['ensemble_weights']
            
            logger.info("✅ All models loaded successfully")
            logger.info(f"📊 Feature count: {len(self.feature_names)}")
            
        except FileNotFoundError as e:
            logger.error(f"❌ Model files not found: {e}")
            logger.error("Please run 'python advanced_trainer.py' first to train models")
            raise
    
    def extract_features(self, tx_data: dict) -> np.ndarray:
        """Extract dan engineer features dari transaction data"""
        
        value = float(tx_data.get('value', 0))
        if isinstance(value, str):
            try:
                value = int(value, 16) / 1e18
            except:
                value = 0
        
        gas = int(tx_data.get('gas', 0) or tx_data.get('gasLimit', 0) or 0)
        if isinstance(gas, str):
            gas = int(gas, 16)
        
        gas_price = int(tx_data.get('gasPrice', 0) or 0)
        if isinstance(gas_price, str):
            gas_price = int(gas_price, 16)
        
        nonce = int(tx_data.get('nonce', 0) or 0)
        if isinstance(nonce, str):
            nonce = int(nonce, 16)
        
        is_contract_creation = 1 if tx_data.get('to') is None or tx_data.get('to') == '' else 0
        
        input_data = tx_data.get('input', '0x') or tx_data.get('data', '0x') or '0x'
        input_length = len(input_data)
        has_input = 1 if input_length > 2 else 0
        
        gas_used = int(gas * 0.7)
        logs_count = 0
        gas_efficiency = 0.7
        
        value_density = value / max(gas_used, 1)
        gas_price_gwei = gas_price / 1e9
        
        features = {
            'value': value,
            'gas': gas,
            'gasPrice': gas_price,
            'gasUsed': gas_used,
            'nonce': nonce,
            'isContractCreation': is_contract_creation,
            'inputLength': input_length,
            'hasInput': has_input,
            'logsCount': logs_count,
            'gasEfficiency': gas_efficiency,
            'valueDensity': value_density,
            'gasPrice_gwei': gas_price_gwei
        }
        
        feature_vector = np.array([features[name] for name in self.feature_names]).reshape(1, -1)
        
        return feature_vector, features
    
    def categorize_threat(self, features: dict, danger_score: float) -> tuple:
        """
        Kategorisasi ancaman berdasarkan karakteristik transaksi
        Returns: (category, description, threat_level_enum)
        """
        
        value = features['value']
        gas = features['gas']
        gas_price = features['gasPrice']
        gas_price_gwei = features['gasPrice_gwei']
        is_contract = features['isContractCreation']
        has_input = features['hasInput']
        
        HIGH_VALUE = 1.0
        HIGH_GAS = 500000
        HIGH_GAS_PRICE = 100
        
        category = "UNKNOWN"
        description = "Potentially malicious transaction"
        threat_level = 1
        
        if danger_score < 50:
            category = "NORMAL"
            description = "Normal transaction"
            threat_level = 0
            
        elif gas_price_gwei > HIGH_GAS_PRICE and value > 0.1:
            category = "FRONT_RUNNING"
            description = f"Suspected front-running attack: Abnormally high gas price ({gas_price_gwei:.2f} Gwei) with significant value transfer"
            threat_level = 2
             
        elif gas_price_gwei > HIGH_GAS_PRICE * 0.8 and has_input:
            category = "MEV_ABUSE"
            description = f"Potential MEV abuse: High gas price ({gas_price_gwei:.2f} Gwei) with complex transaction"
            threat_level = 2
            
        elif value > HIGH_VALUE and gas > HIGH_GAS:
            category = "SMART_CONTRACT_EXPLOIT"
            description = f"Suspected contract exploit: Large value transfer ({value:.4f} U2U) with excessive gas ({gas:,})"
            threat_level = 3
            
        elif is_contract and gas < 100000:
            category = "HONEY_POT"
            description = f"Potential honey pot contract: Suspicious contract deployment with minimal gas"
            threat_level = 2
            
        elif is_contract and value > HIGH_VALUE:
            category = "RUG_PULL"
            description = f"Potential rug pull setup: Contract deployment with significant funds ({value:.4f} U2U)"
            threat_level = 3
            
        elif is_contract and has_input and danger_score > 80:
            category = "PHISHING_CONTRACT"
            description = "Suspected phishing contract: Unusual deployment pattern"
            threat_level = 2
            
        elif value > HIGH_VALUE * 10 and gas_price_gwei > HIGH_GAS_PRICE * 0.5:
            category = "PRICE_MANIPULATION"
            description = f"Potential price manipulation: Massive value movement ({value:.4f} U2U)"
            threat_level = 3
            
        elif gas > HIGH_GAS * 2 and has_input and value > 0:
            category = "FLASH_LOAN_ATTACK"
            description = f"Suspected flash loan attack: Complex high-gas transaction with value transfer"
            threat_level = 3
            
        elif gas > HIGH_GAS and not is_contract and has_input:
            category = "GOVERNANCE_ATTACK"
            description = f"Potential governance attack: Unusual voting pattern or governance manipulation"
            threat_level = 2
        
        elif danger_score > 90:
            threat_level = 3
        elif danger_score > 70:
            threat_level = 2
        
        return category, description, threat_level
    
    def predict(self, tx_data: dict) -> dict:
        """Main prediction function dengan ensemble models"""
        
        try:
            feature_vector, features_dict = self.extract_features(tx_data)
            
            predictions = {}
            
            X_scaled = self.scaler.transform(feature_vector)
            iso_pred = self.isolation_forest.predict(X_scaled)[0]
            iso_score = 1 if iso_pred == -1 else 0
            predictions['isolation_forest'] = iso_score
            
            rf_pred = self.random_forest.predict_proba(feature_vector)[0][1]
            predictions['random_forest'] = rf_pred
            
            gb_pred = self.gradient_boosting.predict_proba(feature_vector)[0][1]
            predictions['gradient_boosting'] = gb_pred
            
            nn_pred = self.neural_network.predict_proba(X_scaled)[0][1]
            predictions['neural_network'] = nn_pred
            
            ensemble_score = sum(
                predictions[model] * self.ensemble_weights[model]
                for model in predictions.keys()
            )
            
            danger_score = ensemble_score * 100
            
            threat_category, threat_description, threat_level = self.categorize_threat(
                features_dict, danger_score
            )
            
            is_malicious = danger_score >= 70
            
            result = {
                'is_malicious': bool(is_malicious),
                'danger_score': float(danger_score),
                'confidence_score': float(max(predictions.values()) * 100),
                'threat_category': threat_category,
                'threat_signature': threat_description,
                'threat_level': int(threat_level),
                'model_predictions': {k: float(v) for k, v in predictions.items()},
                'ensemble_score': float(ensemble_score),
                'analyzed_at': datetime.now().isoformat(),
                'tx_hash': tx_data.get('hash', 'unknown')
            }
            
            if is_malicious:
                logger.warning(f"🚨 THREAT DETECTED: {threat_category} (Score: {danger_score:.2f})")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Prediction error: {e}")
            import traceback
            traceback.print_exc()
            
            return {
                'error': str(e),
                'is_malicious': False,
                'danger_score': 0,
                'threat_category': 'ERROR',
                'threat_signature': f'Analysis failed: {str(e)}'
            }

try:
    ai_engine = CerberusAI()
    logger.info("🚀 Cerberus AI API ready for production")
except Exception as e:
    logger.error(f"Failed to initialize AI engine: {e}")
    ai_engine = None

@app.route('/', methods=['GET'])
def index():
    """Health check endpoint"""
    return jsonify({
        'service': 'Cerberus AI Sentinel',
        'status': 'online',
        'version': '2.0-production',
        'models_loaded': ai_engine is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Main prediction endpoint"""
    
    if ai_engine is None:
        return jsonify({
            'error': 'AI engine not initialized. Please train models first.',
            'is_malicious': False
        }), 500
    
    data = request.get_json()
    
    if not data:
        return jsonify({
            'error': 'No data provided',
            'is_malicious': False
        }), 400
    
    try:
        result = ai_engine.predict(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Prediction endpoint error: {e}")
        return jsonify({
            'error': str(e),
            'is_malicious': False
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Detailed health check"""
    return jsonify({
        'status': 'healthy',
        'ai_engine': 'loaded' if ai_engine else 'not loaded',
        'models': list(ai_engine.ensemble_weights.keys()) if ai_engine else [],
        'timestamp': datetime.now().isoformat()
    })

@app.route('/stats', methods=['GET'])
def stats():
    """Model statistics"""
    if not ai_engine:
        return jsonify({'error': 'AI engine not initialized'}), 500
    
    return jsonify({
        'model_info': ai_engine.metadata['models'],
        'ensemble_weights': ai_engine.ensemble_weights,
        'feature_count': len(ai_engine.feature_names),
        'training_date': ai_engine.metadata['training_date']
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)