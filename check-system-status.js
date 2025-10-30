/**
 * CERBERUS SYSTEM STATUS CHECKER
 * ==============================
 * Memeriksa apakah semua komponen sistem berjalan dengan benar
 */

const { ethers } = require('ethers');
const fetch = require('node-fetch');
require('dotenv').config();

// Konfigurasi
const CONFIG = {
    u2uRpc: process.env.U2U_RPC_HTTP || 'https://rpc-nebulas-testnet.uniultra.xyz',
    u2uWss: process.env.U2U_RPC_WSS || 'wss://rpc-nebulas-testnet.uniultra.xyz',
    aiApiUrl: process.env.AI_API_URL || 'http://127.0.0.1:5001',
    contractAddress: process.env.CONTRACT_ADDRESS || '0xC65f3ec1e0a6853d2e6267CB918E683BA7E4f36c',
    privateKey: process.env.MONITOR_PRIVATE_KEY || process.env.PRIVATE_KEY,
};

// Colors
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

// Check 1: U2U Network RPC
async function checkU2UNetwork() {
    log('\n🌐 Checking U2U Network...', 'cyan');
    
    try {
        const provider = new ethers.JsonRpcProvider(CONFIG.u2uRpc);
        const blockNumber = await provider.getBlockNumber();
        const network = await provider.getNetwork();
        
        log('   ✅ U2U RPC: Connected', 'green');
        log(`   📦 Current Block: ${blockNumber}`, 'cyan');
        log(`   🔗 Chain ID: ${network.chainId}`, 'cyan');
        
        return { status: 'OK', blockNumber, chainId: network.chainId.toString() };
    } catch (error) {
        log('   ❌ U2U RPC: Failed to connect', 'red');
        log(`   Error: ${error.message}`, 'red');
        return { status: 'ERROR', error: error.message };
    }
}

// Check 2: Smart Contract
async function checkSmartContract() {
    log('\n📜 Checking Smart Contract...', 'cyan');
    
    try {
        const provider = new ethers.JsonRpcProvider(CONFIG.u2uRpc);
        
        // Check if contract exists
        const code = await provider.getCode(CONFIG.contractAddress);
        
        if (code === '0x') {
            log('   ❌ Contract: Not deployed or wrong address', 'red');
            return { status: 'ERROR', error: 'No contract code found' };
        }
        
        log('   ✅ Contract: Deployed', 'green');
        log(`   📍 Address: ${CONFIG.contractAddress}`, 'cyan');
        
        // Try to read contract state
        const contractABI = [
            "function totalAlerts() view returns (uint256)",
            "function getContractStats() view returns (uint256, uint256, uint256, uint256)"
        ];
        
        const contract = new ethers.Contract(CONFIG.contractAddress, contractABI, provider);
        
        try {
            const totalAlerts = await contract.totalAlerts();
            const stats = await contract.getContractStats();
            
            log(`   📊 Total Alerts: ${totalAlerts.toString()}`, 'cyan');
            log(`   ✓ Confirmed: ${stats[1].toString()}`, 'cyan');
            log(`   💰 Total Staked: ${ethers.formatEther(stats[2])} U2U`, 'cyan');
            
            return {
                status: 'OK',
                address: CONFIG.contractAddress,
                totalAlerts: totalAlerts.toString(),
                stats: {
                    total: stats[0].toString(),
                    confirmed: stats[1].toString(),
                    staked: ethers.formatEther(stats[2]),
                }
            };
        } catch (error) {
            log('   ⚠️  Contract: Deployed but unable to read state', 'yellow');
            log(`   Error: ${error.message}`, 'yellow');
            return { status: 'PARTIAL', error: error.message };
        }
        
    } catch (error) {
        log('   ❌ Contract: Check failed', 'red');
        log(`   Error: ${error.message}`, 'red');
        return { status: 'ERROR', error: error.message };
    }
}

// Check 3: AI Sentinel API
async function checkAISentinel() {
    log('\n🤖 Checking AI Sentinel API...', 'cyan');
    
    try {
        // Check if service is running
        const healthResponse = await fetch(CONFIG.aiApiUrl, {
            method: 'GET',
            timeout: 5000,
        });
        
        if (healthResponse.ok) {
            log('   ✅ AI Sentinel: Online', 'green');
            log(`   🔗 URL: ${CONFIG.aiApiUrl}`, 'cyan');
        } else {
            log('   ⚠️  AI Sentinel: Responding but with error', 'yellow');
        }
        
        // Test prediction endpoint
        const testData = {
            gasPrice: 100000000000,
            gasLimit: 100000,
            value: 1000000000000000000,
            to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8'
        };
        
        const predictResponse = await fetch(`${CONFIG.aiApiUrl}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData),
            timeout: 10000,
        });
        
        if (predictResponse.ok) {
            const result = await predictResponse.json();
            log('   ✅ AI Prediction: Working', 'green');
            log(`   📊 Test Score: ${result.danger_score?.toFixed(2) || 'N/A'}`, 'cyan');
            log(`   🎯 Is Malicious: ${result.is_malicious ? 'Yes' : 'No'}`, 'cyan');
            
            return {
                status: 'OK',
                url: CONFIG.aiApiUrl,
                testScore: result.danger_score,
                working: true
            };
        } else {
            log('   ❌ AI Prediction: Endpoint error', 'red');
            return { status: 'ERROR', error: 'Prediction endpoint failed' };
        }
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            log('   ❌ AI Sentinel: NOT RUNNING', 'red');
            log('   💡 Start it with: cd services/ai-sentinel && python app.py', 'yellow');
        } else {
            log('   ❌ AI Sentinel: Connection failed', 'red');
            log(`   Error: ${error.message}`, 'red');
        }
        return { status: 'ERROR', error: error.message };
    }
}

// Check 4: Wallet Configuration
async function checkWalletConfig() {
    log('\n👛 Checking Wallet Configuration...', 'cyan');
    
    try {
        if (!CONFIG.privateKey || CONFIG.privateKey === '0x') {
            log('   ❌ Wallet: Private key not configured', 'red');
            log('   💡 Set MONITOR_PRIVATE_KEY in .env file', 'yellow');
            return { status: 'ERROR', error: 'Private key not set' };
        }
        
        const provider = new ethers.JsonRpcProvider(CONFIG.u2uRpc);
        const wallet = new ethers.Wallet(CONFIG.privateKey, provider);
        const balance = await provider.getBalance(wallet.address);
        
        log('   ✅ Wallet: Configured', 'green');
        log(`   📍 Address: ${wallet.address}`, 'cyan');
        log(`   💰 Balance: ${ethers.formatEther(balance)} U2U`, 'cyan');
        
        if (balance < ethers.parseEther('0.01')) {
            log('   ⚠️  WARNING: Low balance!', 'yellow');
            log('   💡 Get more tokens from U2U faucet', 'yellow');
        }
        
        return {
            status: balance >= ethers.parseEther('0.01') ? 'OK' : 'WARNING',
            address: wallet.address,
            balance: ethers.formatEther(balance)
        };
        
    } catch (error) {
        log('   ❌ Wallet: Configuration error', 'red');
        log(`   Error: ${error.message}`, 'red');
        return { status: 'ERROR', error: error.message };
    }
}

// Check 5: Monitor Process
async function checkMonitorProcess() {
    log('\n📡 Checking Monitor Process...', 'cyan');
    
    // This is a simple check - in production you'd want more sophisticated process monitoring
    log('   ℹ️  Monitor status cannot be checked automatically', 'yellow');
    log('   💡 Please verify manually that monitor is running', 'yellow');
    log('   💡 You should see: "Cerberus Watchdog Activated" in logs', 'yellow');
    
    return { status: 'MANUAL_CHECK', message: 'Please verify manually' };
}

// Main status check
async function checkSystemStatus() {
    console.clear();
    separator();
    log('   🐺 CERBERUS SYSTEM STATUS CHECKER', 'bright');
    separator();
    
    const results = {
        timestamp: new Date().toISOString(),
        checks: {}
    };
    
    try {
        // Run all checks
        results.checks.network = await checkU2UNetwork();
        results.checks.contract = await checkSmartContract();
        results.checks.aiSentinel = await checkAISentinel();
        results.checks.wallet = await checkWalletConfig();
        results.checks.monitor = await checkMonitorProcess();
        
        // Summary
        separator();
        log('\n📊 SUMMARY', 'bright');
        separator();
        
        const statuses = Object.values(results.checks).map(c => c.status);
        const okCount = statuses.filter(s => s === 'OK').length;
        const errorCount = statuses.filter(s => s === 'ERROR').length;
        const warningCount = statuses.filter(s => s === 'WARNING' || s === 'PARTIAL').length;
        
        log(`\n✅ OK: ${okCount}`, 'green');
        if (warningCount > 0) log(`⚠️  Warnings: ${warningCount}`, 'yellow');
        if (errorCount > 0) log(`❌ Errors: ${errorCount}`, 'red');
        
        // Overall status
        let overallStatus = 'OK';
        if (errorCount > 0) {
            overallStatus = 'CRITICAL';
            log('\n🚨 SYSTEM STATUS: CRITICAL', 'red');
            log('   Some components are not working. Fix errors before testing.', 'red');
        } else if (warningCount > 0) {
            overallStatus = 'WARNING';
            log('\n⚠️  SYSTEM STATUS: WARNINGS', 'yellow');
            log('   System may work but some issues detected.', 'yellow');
        } else {
            overallStatus = 'HEALTHY';
            log('\n✅ SYSTEM STATUS: ALL SYSTEMS GO!', 'green');
            log('   Ready for testing!', 'green');
        }
        
        results.overallStatus = overallStatus;
        
        // Next steps
        log('\n📝 NEXT STEPS:', 'bright');
        
        if (results.checks.aiSentinel.status === 'ERROR') {
            log('   1. ⚠️  Start AI Sentinel: cd services/ai-sentinel && python app.py', 'yellow');
        }
        
        if (results.checks.wallet.status === 'ERROR' || results.checks.wallet.status === 'WARNING') {
            log('   2. ⚠️  Fund your wallet with U2U testnet tokens', 'yellow');
        }
        
        if (overallStatus === 'HEALTHY') {
            log('   1. ✅ Start monitor: cd services/mempool-monitor && node index.js', 'green');
            log('   2. ✅ Run tests: node test-real-transactions.js', 'green');
            log('   3. ✅ Check frontend: Open http://localhost:3000', 'green');
        }
        
        separator();
        
        // Save results
        const fs = require('fs');
        fs.writeFileSync(
            'system-status.json',
            JSON.stringify(results, null, 2)
        );
        log('\n💾 Status saved to system-status.json\n', 'cyan');
        
        return results;
        
    } catch (error) {
        log(`\n❌ Fatal error during status check: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    checkSystemStatus().catch(console.error);
}

module.exports = { checkSystemStatus };