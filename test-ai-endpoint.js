/**
 * AI SENTINEL ENDPOINT TESTER
 * ============================
 * Test AI endpoint dengan berbagai input
 */

const fetch = require('node-fetch');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bright: '\x1b[1m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator() {
    log('='.repeat(70), 'cyan');
}

async function testAIEndpoint() {
    console.clear();
    separator();
    log('   🤖 CERBERUS AI ENDPOINT TESTER', 'bright');
    separator();
    
    const baseUrl = 'http://127.0.0.1:5001';
    
    // Test 1: Root endpoint
    log('\n📍 Test 1: Root Endpoint', 'cyan');
    try {
        const response = await fetch(baseUrl, { timeout: 5000 });
        const text = await response.text();
        log(`   Status: ${response.status}`, response.ok ? 'green' : 'red');
        log(`   Response: ${text.substring(0, 100)}...`, 'dim');
    } catch (error) {
        log(`   ❌ Error: ${error.message}`, 'red');
        log('\n💡 Make sure AI Sentinel is running:', 'yellow');
        log('   cd services/ai-sentinel', 'cyan');
        log('   python app.py', 'cyan');
        process.exit(1);
    }
    
    // Test 2: Normal transaction
    log('\n📍 Test 2: Normal Transaction Analysis', 'cyan');
    try {
        const normalTx = {
            gasPrice: '20000000000',  // 20 gwei - string format
            gasLimit: '21000',
            value: '1000000000000000000',  // 1 ETH
            to: '0x742D35cC6634C0532925A3b844bc9E7595f0BEb8',
            from: '0xfe89f390C1cf3D6b83171D41bEEF4A3E3A763fAE',
            nonce: '1',
            hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        };
        
        const response = await fetch(`${baseUrl}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(normalTx),
            timeout: 10000
        });
        
        log(`   Status: ${response.status}`, response.ok ? 'green' : 'red');
        
        if (response.ok) {
            const result = await response.json();
            log('   ✅ Success!', 'green');
            log(`   Danger Score: ${result.danger_score?.toFixed(2) || 'N/A'}`, 'cyan');
            log(`   Is Malicious: ${result.is_malicious ? 'Yes' : 'No'}`, result.is_malicious ? 'red' : 'green');
            log(`   Category: ${result.threat_category || 'N/A'}`, 'cyan');
            log(`   Signature: ${result.threat_signature || 'N/A'}`, 'dim');
        } else {
            const errorText = await response.text();
            log(`   ❌ Error Response: ${errorText}`, 'red');
        }
        
    } catch (error) {
        log(`   ❌ Error: ${error.message}`, 'red');
    }
    
    // Test 3: Suspicious transaction (high gas)
    log('\n📍 Test 3: Suspicious Transaction (High Gas)', 'cyan');
    try {
        const suspiciousTx = {
            gasPrice: '150000000000',  // 150 gwei - HIGH!
            gasLimit: '21000',
            value: '1000000000000000000',
            to: '0x742D35cC6634C0532925A3b844bc9E7595f0BEb8',
            from: '0xfe89f390C1cf3D6b83171D41bEEF4A3E3A763fAE',
            nonce: '2',
            hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        };
        
        const response = await fetch(`${baseUrl}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(suspiciousTx),
            timeout: 10000
        });
        
        log(`   Status: ${response.status}`, response.ok ? 'green' : 'red');
        
        if (response.ok) {
            const result = await response.json();
            log('   ✅ Success!', 'green');
            log(`   Danger Score: ${result.danger_score?.toFixed(2) || 'N/A'}`, result.danger_score > 70 ? 'red' : 'cyan');
            log(`   Is Malicious: ${result.is_malicious ? 'Yes' : 'No'}`, result.is_malicious ? 'red' : 'green');
            log(`   Category: ${result.threat_category || 'N/A'}`, 'cyan');
            log(`   Signature: ${result.threat_signature || 'N/A'}`, 'dim');
            
            if (result.danger_score > 70) {
                log('\n   🎯 Expected: This should be flagged as malicious!', 'green');
            } else {
                log('\n   ⚠️  Warning: Danger score lower than expected', 'yellow');
            }
        } else {
            const errorText = await response.text();
            log(`   ❌ Error Response: ${errorText}`, 'red');
        }
        
    } catch (error) {
        log(`   ❌ Error: ${error.message}`, 'red');
    }
    
    // Test 4: Critical transaction
    log('\n📍 Test 4: Critical Transaction (High Value + Gas)', 'cyan');
    try {
        const criticalTx = {
            gasPrice: '200000000000',  // 200 gwei - EXTREME!
            gasLimit: '21000',
            value: '50000000000000000000',  // 50 ETH - HIGH!
            to: '0x742D35cC6634C0532925A3b844bc9E7595f0BEb8',
            from: '0xfe89f390C1cf3D6b83171D41bEEF4A3E3A763fAE',
            nonce: '3',
            hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321'
        };
        
        const response = await fetch(`${baseUrl}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(criticalTx),
            timeout: 10000
        });
        
        log(`   Status: ${response.status}`, response.ok ? 'green' : 'red');
        
        if (response.ok) {
            const result = await response.json();
            log('   ✅ Success!', 'green');
            log(`   Danger Score: ${result.danger_score?.toFixed(2) || 'N/A'}`, result.danger_score > 90 ? 'red' : 'cyan');
            log(`   Is Malicious: ${result.is_malicious ? 'Yes' : 'No'}`, result.is_malicious ? 'red' : 'green');
            log(`   Category: ${result.threat_category || 'N/A'}`, 'cyan');
            log(`   Signature: ${result.threat_signature || 'N/A'}`, 'dim');
            
            if (result.danger_score > 90) {
                log('\n   🎯 Expected: This should be CRITICAL threat!', 'green');
            } else {
                log('\n   ⚠️  Warning: Danger score lower than expected for critical', 'yellow');
            }
        } else {
            const errorText = await response.text();
            log(`   ❌ Error Response: ${errorText}`, 'red');
        }
        
    } catch (error) {
        log(`   ❌ Error: ${error.message}`, 'red');
    }
    
    // Summary
    separator();
    log('\n📊 SUMMARY', 'bright');
    separator();
    log('\n✅ If all tests passed, your AI endpoint is working correctly!', 'green');
    log('\n📝 Next: Run real transaction tests:', 'bright');
    log('   node send-real-transactions.js', 'cyan');
    log('');
}

testAIEndpoint().catch(console.error);