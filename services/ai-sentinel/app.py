from flask import Flask, request, jsonify
import hashlib
from datetime import datetime

app = Flask(__name__)

MODEL_VERSION = "v1.0.0"
MODEL_HASH = hashlib.sha256(f"cerberus-ai-{MODEL_VERSION}".encode()).hexdigest()

def safe_int_conversion(value, default=0):
    """Safely convert hex or decimal string to int"""
    if not value:
        return default
    
    try:
        if isinstance(value, str):
            if value.startswith('0x'):
                return int(value, 16)  # Hex conversion
            else:
                return int(value)  # Decimal conversion
        return int(value)
    except (ValueError, TypeError):
        return default

def analyze_transaction(tx_data):
    """Simple rule-based threat analysis"""
    
    # Extract features with safe conversion
    gas_price = safe_int_conversion(tx_data.get('gasPrice'))
    gas_limit = safe_int_conversion(tx_data.get('gasLimit'))
    
    # Handle value conversion from Wei to ETH
    value_raw = tx_data.get('value', 0) or 0
    value_wei = safe_int_conversion(value_raw)
    value = value_wei / 1e18  # Convert to ETH
    
    is_contract_creation = 1 if tx_data.get('to') is None else 0
    data_size = len(tx_data.get('data', '')) if tx_data.get('data') else 0

    print(f"🧠 Debug: gas_price={gas_price/1e9:.1f} gwei, value={value:.4f} ETH, contract={bool(is_contract_creation)}")
    
    # Calculate danger score (0-100)
    danger_score = 0
    
    # Rule 1: High gas price
    if gas_price > 10000000000:  # > 10 gwei
        danger_score += 20
        print(f"   +20 for gas price > 10 gwei")
    if gas_price > 20000000000:  # > 20 gwei  
        danger_score += 30
        print(f"   +30 for gas price > 20 gwei")
        
    # Rule 2: Value transactions
    if value > 0.05:  # > 0.05 ETH
        danger_score += 25
        print(f"   +25 for value > 0.05 ETH")
    if value > 0.1:   # > 0.1 ETH
        danger_score += 30
        print(f"   +30 for value > 0.1 ETH")

    print(f"🎯 Final danger_score: {danger_score}, is_malicious: {danger_score > 50}")
        
    # Rule 3: Contract creation (lebih tinggi)
    if is_contract_creation:
        danger_score += 30
        
    # Rule 4: High gas limit
    if gas_limit > 500000:
        danger_score += 20
        
    # Rule 5: Large data payload
    if data_size > 1000:
        danger_score += 10
    
    # Cap at 100
    danger_score = min(100, danger_score)
    
    # Determine threat category
    if is_contract_creation and danger_score > 60:  # Threshold lebih rendah
        threat_category = "SMART_CONTRACT_EXPLOIT"
    elif gas_price > 20000000000 and danger_score > 50:
        threat_category = "FRONT_RUNNING"
    elif value > 0.1 and danger_score > 60:
        threat_category = "RUG_PULL"
    elif gas_limit > 1000000:
        threat_category = "FLASH_LOAN_ATTACK"
    else:
        threat_category = "UNKNOWN"
    
    # Threat level (0-4)
    if danger_score >= 80:
        threat_level = 4  # CRITICAL
    elif danger_score >= 65:
        threat_level = 3  # HIGH
    elif danger_score >= 50:
        threat_level = 2  # MEDIUM
    elif danger_score >= 35:
        threat_level = 1  # LOW
    else:
        threat_level = 0  # INFO
    
    # Generate threat signature
    if danger_score > 80:
        threat_signature = f"{threat_category}: CRITICAL - Immediate investigation required"
    elif danger_score > 65:
        threat_signature = f"{threat_category}: HIGH - Suspicious activity detected"
    elif danger_score > 50:
        threat_signature = f"{threat_category}: MEDIUM - Unusual transaction pattern"
    else:
        threat_signature = "Normal Transaction"
    
    return {
        'danger_score': float(danger_score),
        'threat_category': threat_category,
        'threat_level': threat_level,
        'threat_signature': threat_signature,
        'confidence': min(95.0, max(60.0, danger_score + 20)),
        'is_malicious': danger_score > 50,  # Threshold lebih rendah dari 70
        'anomaly_score': 1 - (danger_score / 100),
        'model_version': MODEL_VERSION,
        'model_hash': MODEL_HASH,
        'analysis_timestamp': datetime.utcnow().isoformat(),
        'parsed_values': {
            'gas_price_gwei': gas_price / 1e9,
            'gas_limit': gas_limit,
            'value_eth': value,
            'is_contract_creation': bool(is_contract_creation)
        }
    }

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'active',
        'service': 'Cerberus AI Sentinel',
        'version': MODEL_VERSION,
        'model_hash': MODEL_HASH,
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        analysis = analyze_transaction(data)
        print(f"🔍 Analysis: {data.get('hash', 'unknown')} | Danger: {analysis['danger_score']:.1f} | Category: {analysis['threat_category']}")
        return jsonify(analysis)
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/test', methods=['POST'])
def test():
    """Test dengan transaksi berbahaya"""
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
    print("🚀 Starting Cerberus AI Sentinel...")
    print(f"📊 Model Version: {MODEL_VERSION}")
    print(f"🔑 Model Hash: {MODEL_HASH}")
    print("🌐 Server: http://127.0.0.1:5001")
    
    app.run(debug=True, host='0.0.0.0', port=5001)