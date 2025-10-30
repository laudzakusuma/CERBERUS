"""
Cerberus Production AI API
Real-time threat detection dengan ensemble models
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

class CerberusAI:
    """Production AI Engine"""
    
    def __init__(self):
        logger.info("🐺 Initializing Cerberus AI Engine...")
        
        try:
            # Load models
            self.isolation_forest = joblib.load('model_isolation_forest.joblib')
            self.random_forest = joblib.load('model_random_forest.joblib')
            self.gradient_boosting = joblib.load('model_gradient_boosting.joblib')
            self.neural_network = joblib.load('model_neural_network.joblib')
            self.scaler = joblib.load('scaler.joblib')
            
            # Load metadata
            import json
            with open('model_metadata.json', 'r') as f:
                self.metadata = json.load(f)
            
            self.feature_names = self.metadata['feature_names']
            self.ensemble_weights = self.metadata['ensemble_weights']
            
            logger.info("✅ All models loaded successfully")
            logger.info(f"📊 Feature count: {len(self.feature_names)}")
            
        except Exception as e:
            logger.error(f"❌ Failed to load models: {e}")
            raise
    
    def extract_features(self, tx_data):
        """Extract features from transaction"""
        
        # Parse values
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
        
        # Features
        is_contract = 1 if not tx_data.get('to') else 0
        input_data = tx_data.get('input', '0x') or '0x'
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
            'isContractCreation': is_contract,
            'inputLength': input_length,
            'hasInput': has_input,
            'logsCount': logs_count,
            'gasEfficiency': gas_efficiency,
            'valueDensity': value_density,
            'gasPrice_gwei': gas_price_gwei
        }
        
        feature_vector = np.array([features[name] for name in self.feature_names]).reshape(1, -1)
        return feature_vector, features
    
    def categorize_threat(self, features, danger_score):
        """Categorize threat type"""
        
        value = features['value']
        gas = features['gas']
        gas_price_gwei = features['gasPrice_gwei']
        is_contract = features['isContractCreation']
        has_input = features['hasInput']
        
        category = "UNKNOWN"
        description = "Potentially malicious transaction"
        threat_level = 1
        
        if danger_score < 50:
            category = "NORMAL"
            description = "Normal transaction"
            threat_level = 0
        elif gas_price_gwei > 100 and value > 0.1:
            category = "FRONT_RUNNING"
            description = f"Suspected front-running: High gas ({gas_price_gwei:.2f} Gwei)"
            threat_level = 2
        elif gas_price_gwei > 80 and has_input:
            category = "MEV_ABUSE"
            description = f"Potential MEV abuse: High gas ({gas_price_gwei:.2f} Gwei)"
            threat_level = 2
        elif value > 1.0 and gas > 500000:
            category = "SMART_CONTRACT_EXPLOIT"
            description = f"Suspected exploit: Large value ({value:.4f} U2U) + high gas"
            threat_level = 3
        elif is_contract and gas < 100000:
            category = "HONEY_POT"
            description = "Potential honey pot: Low gas contract deployment"
            threat_level = 2
        elif is_contract and value > 1.0:
            category = "RUG_PULL"
            description = f"Potential rug pull: Contract with funds ({value:.4f} U2U)"
            threat_level = 3
        elif is_contract and has_input and danger_score > 80:
            category = "PHISHING_CONTRACT"
            description = "Suspected phishing contract"
            threat_level = 2
        elif value > 10 and gas_price_gwei > 50:
            category = "PRICE_MANIPULATION"
            description = f"Potential price manipulation: Massive value ({value:.4f} U2U)"
            threat_level = 3
        elif gas > 1000000 and has_input and value > 0:
            category = "FLASH_LOAN_ATTACK"
            description = "Suspected flash loan attack: High gas + value"
            threat_level = 3
        elif gas > 500000 and not is_contract and has_input:
            category = "GOVERNANCE_ATTACK"
            description = "Potential governance attack"
            threat_level = 2
        
        if danger_score > 90:
            threat_level = 3
        elif danger_score > 70:
            threat_level = 2
        
        return category, description, threat_level
    
    def predict(self, tx_data):
        """Main prediction"""
        
        try:
            feature_vector, features_dict = self.extract_features(tx_data)
            
            # Get predictions
            predictions = {}
            
            X_scaled = self.scaler.transform(feature_vector)
            iso_pred = self.isolation_forest.predict(X_scaled)[0]
            predictions['isolation_forest'] = 1 if iso_pred == -1 else 0
            
            predictions['random_forest'] = self.random_forest.predict_proba(feature_vector)[0][1]
            predictions['gradient_boosting'] = self.gradient_boosting.predict_proba(feature_vector)[0][1]
            predictions['neural_network'] = self.neural_network.predict_proba(X_scaled)[0][1]
            
            # Ensemble
            ensemble_score = sum(
                predictions[model] * self.ensemble_weights[model]
                for model in predictions.keys()
            )
            
            danger_score = ensemble_score * 100
            threat_category, threat_description, threat_level = self.categorize_threat(features_dict, danger_score)
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
                logger.warning(f"🚨 THREAT: {threat_category} (Score: {danger_score:.2f})")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Prediction error: {e}")
            return {
                'error': str(e),
                'is_malicious': False,
                'danger_score': 0,
                'threat_category': 'ERROR',
                'threat_signature': f'Analysis failed: {str(e)}'
            }

# Initialize
try:
    ai_engine = CerberusAI()
    logger.info("🚀 Cerberus AI API ready for production")
except Exception as e:
    logger.error(f"Failed to initialize: {e}")
    ai_engine = None

@app.route('/', methods=['GET'])
def index():
    """Health check"""
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
            'error': 'AI engine not initialized',
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
        logger.error(f"Endpoint error: {e}")
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