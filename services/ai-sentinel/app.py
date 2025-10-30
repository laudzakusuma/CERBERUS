"""
Cerberus Production AI API - ENHANCED HIGH GAS DETECTION
Real-time threat detection dengan ensemble models
FIXED: Aggressive detection for hackathon demo
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
    """Production AI Engine - Enhanced Version"""
    
    def __init__(self):
        logger.info("🐺 Initializing Cerberus AI Engine...")
        
        self.models_loaded = False
        
        try:
            # Try to load ensemble models
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
            
            self.models_loaded = True
            logger.info("✅ All ensemble models loaded successfully")
            logger.info(f"📊 Feature count: {len(self.feature_names)}")
            
        except Exception as e:
            logger.warning(f"⚠️  Ensemble models not found: {e}")
            logger.info("🎯 Using ENHANCED RULE-BASED detection (perfect for demo!)")
            self.models_loaded = False
    
    def extract_features(self, tx_data):
        """Extract features from transaction"""
        
        # Parse values safely
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
        
        # Core features
        is_contract = 1 if not tx_data.get('to') else 0
        input_data = tx_data.get('input', '0x') or tx_data.get('data', '0x') or '0x'
        input_length = len(input_data)
        has_input = 1 if input_length > 2 else 0
        
        gas_used = int(gas * 0.7)
        logs_count = 0
        gas_efficiency = 0.7
        value_density = value / max(gas_used, 1) if gas_used > 0 else 0
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
        
        if self.models_loaded:
            feature_vector = np.array([features[name] for name in self.feature_names]).reshape(1, -1)
            return feature_vector, features
        else:
            return None, features
    
    def enhanced_rule_based_detection(self, features):
        """
        ENHANCED RULE-BASED DETECTION
        Optimized for hackathon demo - aggressive high gas detection
        """
        
        value = features['value']
        gas = features['gas']
        gas_price_gwei = features['gasPrice_gwei']
        is_contract = features['isContractCreation']
        has_input = features['hasInput']
        
        danger_score = 0
        threat_factors = []
        category = "NORMAL"
        description = "Normal transaction"
        threat_level = 0
        
        # ===================================================
        # CRITICAL: AGGRESSIVE HIGH GAS DETECTION
        # ===================================================
        if gas_price_gwei > 180:
            danger_score = 98
            threat_factors.append(f"EXTREME gas: {gas_price_gwei:.2f} gwei")
            category = "FRONT_RUNNING"
            description = f"CRITICAL: Extremely high gas price ({gas_price_gwei:.2f} gwei) - Front-running attack"
            threat_level = 3
            
        elif gas_price_gwei > 150:
            danger_score = 95
            threat_factors.append(f"CRITICAL gas: {gas_price_gwei:.2f} gwei")
            category = "FRONT_RUNNING"
            description = f"CRITICAL: Very high gas price ({gas_price_gwei:.2f} gwei) - Suspected front-running"
            threat_level = 3
            
        elif gas_price_gwei > 120:
            danger_score = 90
            threat_factors.append(f"Very high gas: {gas_price_gwei:.2f} gwei")
            category = "MEV_ABUSE"
            description = f"HIGH: Very high gas price ({gas_price_gwei:.2f} gwei) - MEV abuse suspected"
            threat_level = 2
            
        elif gas_price_gwei > 100:
            danger_score = 85
            threat_factors.append(f"High gas: {gas_price_gwei:.2f} gwei")
            category = "MEV_ABUSE"
            description = f"HIGH: High gas price ({gas_price_gwei:.2f} gwei) - MEV abuse detected"
            threat_level = 2
            
        elif gas_price_gwei > 80:
            danger_score = 78
            threat_factors.append(f"Elevated gas: {gas_price_gwei:.2f} gwei")
            category = "MEV_ABUSE"
            description = f"MEDIUM: Elevated gas price ({gas_price_gwei:.2f} gwei)"
            threat_level = 2
            
        elif gas_price_gwei > 50:
            danger_score = 70
            threat_factors.append(f"Suspicious gas: {gas_price_gwei:.2f} gwei")
            category = "MEV_ABUSE"
            description = f"MEDIUM: Suspicious gas price ({gas_price_gwei:.2f} gwei)"
            threat_level = 1
        
        # ===================================================
        # HIGH VALUE DETECTION (with boosting)
        # ===================================================
        if value > 100:
            boost = 35
            danger_score = min(danger_score + boost, 100)
            threat_factors.append(f"Massive value: {value:.4f} U2U")
            if category == "NORMAL":
                category = "RUG_PULL"
                description = f"Potential rug pull: Massive value transfer ({value:.4f} U2U)"
                threat_level = 3
            else:
                description += f" + Massive value ({value:.4f} U2U)"
                
        elif value > 50:
            boost = 28
            danger_score = min(danger_score + boost, 100)
            threat_factors.append(f"Very high value: {value:.4f} U2U")
            if category == "NORMAL":
                category = "SUSPICIOUS_ACTIVITY"
                description = f"Very high value transfer: {value:.4f} U2U"
                threat_level = 2
            else:
                description += f" + Very high value ({value:.4f} U2U)"
                
        elif value > 10:
            boost = 20
            danger_score = min(danger_score + boost, 100)
            threat_factors.append(f"High value: {value:.4f} U2U")
            if category == "NORMAL":
                category = "SUSPICIOUS_ACTIVITY"
            else:
                description += f" + High value ({value:.4f} U2U)"
                
        elif value > 1:
            boost = 12
            danger_score = min(danger_score + boost, 100)
            threat_factors.append(f"Notable value: {value:.4f} U2U")
        
        # ===================================================
        # CONTRACT CREATION DETECTION
        # ===================================================
        if is_contract:
            if value > 5:
                boost = 30
                danger_score = min(danger_score + boost, 100)
                category = "SMART_CONTRACT_EXPLOIT"
                description = f"HIGH RISK: Contract deployment with {value:.4f} U2U"
                threat_level = 3
                threat_factors.append("Contract with large funds")
                
            elif value > 1:
                boost = 20
                danger_score = min(danger_score + boost, 100)
                category = "RUG_PULL"
                description = f"Potential rug pull: Contract with {value:.4f} U2U"
                threat_level = 2
                threat_factors.append("Contract with funds")
                
            elif gas < 100000:
                boost = 15
                danger_score = min(danger_score + boost, 100)
                category = "HONEY_POT"
                description = "Potential honey pot: Low gas contract"
                threat_level = 2
                threat_factors.append("Suspicious contract gas")
        
        # ===================================================
        # COMPLEX TRANSACTION DETECTION
        # ===================================================
        if has_input and not is_contract:
            if gas > 500000:
                boost = 18
                danger_score = min(danger_score + boost, 100)
                threat_factors.append("Complex transaction (high gas)")
                if value > 1:
                    category = "FLASH_LOAN_ATTACK"
                    description = "Suspected flash loan attack"
                    threat_level = 3
            elif gas > 200000:
                boost = 10
                danger_score = min(danger_score + boost, 100)
                threat_factors.append("Complex transaction")
        
        # ===================================================
        # FINAL ADJUSTMENTS
        # ===================================================
        
        # Update threat level based on final score
        if danger_score >= 95:
            threat_level = 3  # CRITICAL
        elif danger_score >= 80:
            threat_level = 2  # HIGH
        elif danger_score >= 70:
            threat_level = 1  # MEDIUM
        else:
            threat_level = 0  # NORMAL/LOW
        
        is_malicious = danger_score >= 70
        
        # Build comprehensive signature
        if threat_factors:
            signature = description + " [" + ", ".join(threat_factors) + "]"
        else:
            signature = description
        
        return {
            'danger_score': float(danger_score),
            'is_malicious': bool(is_malicious),
            'threat_category': category,
            'threat_signature': signature,
            'threat_level': int(threat_level),
            'threat_factors': threat_factors,
            'confidence_score': float(min(danger_score + 5, 100))  # High confidence in rules
        }
    
    def categorize_threat_ml(self, features, ml_score):
        """Original ML-based categorization (when models loaded)"""
        
        value = features['value']
        gas = features['gas']
        gas_price_gwei = features['gasPrice_gwei']
        is_contract = features['isContractCreation']
        has_input = features['hasInput']
        
        danger_score = ml_score * 100
        category = "UNKNOWN"
        description = "Potentially malicious transaction"
        threat_level = 1
        
        # Enhanced categorization with aggressive gas detection
        if danger_score < 50:
            category = "NORMAL"
            description = "Normal transaction"
            threat_level = 0
            
        elif gas_price_gwei > 150:
            category = "FRONT_RUNNING"
            description = f"CRITICAL: Front-running attack ({gas_price_gwei:.2f} gwei)"
            threat_level = 3
            danger_score = max(danger_score, 95)
            
        elif gas_price_gwei > 100:
            category = "MEV_ABUSE"
            description = f"HIGH: MEV abuse ({gas_price_gwei:.2f} gwei)"
            threat_level = 2
            danger_score = max(danger_score, 85)
            
        elif gas_price_gwei > 80 and has_input:
            category = "MEV_ABUSE"
            description = f"Potential MEV abuse ({gas_price_gwei:.2f} gwei)"
            threat_level = 2
            danger_score = max(danger_score, 78)
            
        elif value > 10 and gas_price_gwei > 50:
            category = "PRICE_MANIPULATION"
            description = f"Potential price manipulation ({value:.4f} U2U + {gas_price_gwei:.2f} gwei)"
            threat_level = 3
            
        elif value > 1.0 and gas > 500000:
            category = "SMART_CONTRACT_EXPLOIT"
            description = f"Suspected exploit: Large value ({value:.4f} U2U) + high gas"
            threat_level = 3
            
        elif is_contract and value > 1.0:
            category = "RUG_PULL"
            description = f"Potential rug pull: Contract with {value:.4f} U2U"
            threat_level = 3
            
        elif is_contract and gas < 100000:
            category = "HONEY_POT"
            description = "Potential honey pot"
            threat_level = 2
            
        elif gas > 1000000 and has_input and value > 0:
            category = "FLASH_LOAN_ATTACK"
            description = "Suspected flash loan attack"
            threat_level = 3
        
        if danger_score > 90:
            threat_level = 3
        elif danger_score > 70:
            threat_level = 2
        
        return category, description, threat_level, danger_score
    
    def predict(self, tx_data):
        """Main prediction with fallback to enhanced rules"""
        
        try:
            feature_vector, features_dict = self.extract_features(tx_data)
            
            # Log for debugging
            gas_gwei = features_dict['gasPrice_gwei']
            value_eth = features_dict['value']
            logger.info(f"📥 Analyzing: {tx_data.get('hash', 'unknown')[:10]}... | Gas: {gas_gwei:.2f} gwei | Value: {value_eth:.4f} U2U")
            
            # Try ML ensemble if models loaded
            if self.models_loaded and feature_vector is not None:
                try:
                    predictions = {}
                    
                    X_scaled = self.scaler.transform(feature_vector)
                    iso_pred = self.isolation_forest.predict(X_scaled)[0]
                    predictions['isolation_forest'] = 1 if iso_pred == -1 else 0
                    
                    predictions['random_forest'] = self.random_forest.predict_proba(feature_vector)[0][1]
                    predictions['gradient_boosting'] = self.gradient_boosting.predict_proba(feature_vector)[0][1]
                    predictions['neural_network'] = self.neural_network.predict_proba(X_scaled)[0][1]
                    
                    ensemble_score = sum(
                        predictions[model] * self.ensemble_weights[model]
                        for model in predictions.keys()
                    )
                    
                    # Use enhanced categorization
                    threat_category, threat_description, threat_level, danger_score = self.categorize_threat_ml(
                        features_dict, ensemble_score
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
                        'tx_hash': tx_data.get('hash', 'unknown'),
                        'analysis_method': 'ensemble_ml_enhanced'
                    }
                    
                    if is_malicious:
                        logger.warning(f"🚨 ML THREAT: {threat_category} (Score: {danger_score:.2f})")
                    else:
                        logger.info(f"✅ Normal (Score: {danger_score:.2f})")
                    
                    return result
                    
                except Exception as ml_error:
                    logger.warning(f"ML prediction failed: {ml_error}, falling back to rules")
            
            # Use enhanced rule-based detection (fallback or primary)
            result = self.enhanced_rule_based_detection(features_dict)
            result.update({
                'analyzed_at': datetime.now().isoformat(),
                'tx_hash': tx_data.get('hash', 'unknown'),
                'analysis_method': 'rule_based_enhanced',
                'gas_price_gwei': float(features_dict['gasPrice_gwei']),
                'value_eth': float(features_dict['value'])
            })
            
            if result['is_malicious']:
                logger.warning(f"🚨 RULE THREAT: {result['threat_category']} (Score: {result['danger_score']:.2f})")
            else:
                logger.info(f"✅ Normal (Score: {result['danger_score']:.2f})")
            
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
                'threat_signature': f'Analysis failed: {str(e)}',
                'analyzed_at': datetime.now().isoformat()
            }

# Initialize
try:
    ai_engine = CerberusAI()
    logger.info("🚀 Cerberus AI API ready!")
    logger.info("🎯 Enhanced high-gas detection active")
except Exception as e:
    logger.error(f"Failed to initialize: {e}")
    ai_engine = None

@app.route('/', methods=['GET'])
def index():
    """Health check"""
    return jsonify({
        'service': 'Cerberus AI Sentinel',
        'status': 'online',
        'version': '2.0-enhanced',
        'models_loaded': ai_engine.models_loaded if ai_engine else False,
        'detection_mode': 'ensemble_ml' if (ai_engine and ai_engine.models_loaded) else 'rule_based_enhanced',
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
            'is_malicious': False,
            'danger_score': 0
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Detailed health check"""
    return jsonify({
        'status': 'healthy',
        'ai_engine': 'loaded' if ai_engine else 'not loaded',
        'models_loaded': ai_engine.models_loaded if ai_engine else False,
        'detection_mode': 'ensemble_ml' if (ai_engine and ai_engine.models_loaded) else 'rule_based_enhanced',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/stats', methods=['GET'])
def stats():
    """Model statistics"""
    if not ai_engine:
        return jsonify({'error': 'AI engine not initialized'}), 500
    
    if ai_engine.models_loaded:
        return jsonify({
            'model_info': ai_engine.metadata['models'],
            'ensemble_weights': ai_engine.ensemble_weights,
            'feature_count': len(ai_engine.feature_names),
            'training_date': ai_engine.metadata['training_date'],
            'detection_mode': 'ensemble_ml'
        })
    else:
        return jsonify({
            'detection_mode': 'rule_based_enhanced',
            'features': 'Enhanced high-gas detection',
            'thresholds': {
                'critical': '>150 gwei',
                'high': '>100 gwei',
                'medium': '>50 gwei'
            }
        })

if __name__ == '__main__':
    print("""
═══════════════════════════════════════════════════════════
  🐺 CERBERUS AI SENTINEL - ENHANCED VERSION
═══════════════════════════════════════════════════════════
  Detection Mode: ML Ensemble + Enhanced Rules
  Optimization: Aggressive high-gas detection
  Perfect for: Hackathon demos & real-world deployment
═══════════════════════════════════════════════════════════
    """)
    
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)