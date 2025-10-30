/**
 * CERBERUS QUICK FIX SCRIPT
 * =========================
 * Script ini memperbaiki masalah-masalah yang terdeteksi
 */

const { ethers } = require('ethers');
require('dotenv').config();

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

async function quickFix() {
    console.clear();
    separator();
    log('   🔧 CERBERUS QUICK FIX UTILITY', 'bright');
    separator();
    
    // Fix 1: Update .env with correct settings
    log('\n📝 Fix 1: Updating .env configuration...', 'cyan');
    
    const correctConfig = `
# U2U Network
U2U_RPC_HTTP=https://rpc-nebulas-testnet.uniultra.xyz
U2U_RPC_WSS=wss://rpc-nebulas-testnet.uniultra.xyz

# Smart Contract - UPDATE THIS WITH YOUR ACTUAL DEPLOYED ADDRESS
CONTRACT_ADDRESS=0x9Dfb525D1448031ab48c4F404b330d781C0B8854

# Wallet
MONITOR_PRIVATE_KEY=${process.env.MONITOR_PRIVATE_KEY || 'YOUR_PRIVATE_KEY_HERE'}
PRIVATE_KEY=${process.env.PRIVATE_KEY || 'YOUR_PRIVATE_KEY_HERE'}

# AI Sentinel API
AI_API_URL=http://127.0.0.1:5001
`;
    
    const fs = require('fs');
    
    // Backup old .env
    if (fs.existsSync('.env')) {
        fs.copyFileSync('.env', '.env.backup');
        log('   ✅ Backed up old .env to .env.backup', 'green');
    }
    
    log('   ℹ️  Please manually update your .env file', 'yellow');
    log('   Sample configuration:', 'cyan');
    console.log(correctConfig);
    
    // Fix 2: Check wallet and get faucet link
    log('\n💰 Fix 2: Wallet Balance Check...', 'cyan');
    
    try {
        const provider = new ethers.JsonRpcProvider('https://rpc-nebulas-testnet.uniultra.xyz');
        const wallet = new ethers.Wallet(process.env.MONITOR_PRIVATE_KEY || process.env.PRIVATE_KEY, provider);
        const balance = await provider.getBalance(wallet.address);
        
        log(`   Wallet: ${wallet.address}`, 'cyan');
        log(`   Balance: ${ethers.formatEther(balance)} U2U`, balance > 0n ? 'green' : 'red');
        
        if (balance === 0n) {
            log('\n   ⚠️  YOU NEED TESTNET TOKENS!', 'yellow');
            log('   Get free tokens from U2U Faucet:', 'yellow');
            log('   🔗 https://faucet.uniultra.xyz/', 'cyan');
            log(`   Send to: ${wallet.address}`, 'cyan');
            log('\n   💡 Request at least 1 U2U for testing', 'yellow');
        }
        
    } catch (error) {
        log('   ❌ Cannot check wallet. Please verify MONITOR_PRIVATE_KEY in .env', 'red');
    }
    
    // Fix 3: Test AI Sentinel
    log('\n🤖 Fix 3: Testing AI Sentinel API...', 'cyan');
    
    try {
        const fetch = require('node-fetch');
        
        // Test root endpoint
        try {
            const rootResponse = await fetch('http://127.0.0.1:5001/', { timeout: 3000 });
            log('   ✅ AI Sentinel is running', 'green');
        } catch {
            log('   ❌ AI Sentinel is NOT running', 'red');
            log('   💡 Start it:', 'yellow');
            log('      cd services/ai-sentinel', 'cyan');
            log('      source venv/bin/activate', 'cyan');
            log('      python app.py', 'cyan');
        }
        
        // Test predict endpoint with simple data
        try {
            const testResponse = await fetch('http://127.0.0.1:5001/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gasPrice: 20000000000,
                    gasLimit: 21000,
                    value: 1000000000000000000,
                    to: ethers.getAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb8')
                }),
                timeout: 5000
            });
            
            if (testResponse.ok) {
                const result = await testResponse.json();
                log('   ✅ AI Prediction endpoint working', 'green');
                log(`   Test danger score: ${result.danger_score?.toFixed(2) || 'N/A'}`, 'cyan');
            } else {
                const errorText = await testResponse.text();
                log('   ❌ AI Prediction endpoint error', 'red');
                log(`   Response: ${errorText}`, 'red');
            }
        } catch (error) {
            log('   ❌ Cannot reach /predict endpoint', 'red');
            log(`   Error: ${error.message}`, 'red');
        }
        
    } catch (error) {
        log(`   ❌ AI Sentinel check failed: ${error.message}`, 'red');
    }
    
    // Fix 4: Provide fixed test addresses
    log('\n📍 Fix 4: Address Checksum Issue...', 'cyan');
    
    const fixedAddresses = {
        testRecipient: ethers.getAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb8'),
        yourWallet: process.env.MONITOR_PRIVATE_KEY ? 
            new ethers.Wallet(process.env.MONITOR_PRIVATE_KEY).address : 
            'NOT_SET'
    };
    
    log('   ✅ Use these properly checksummed addresses:', 'green');
    log(`   Test Recipient: ${fixedAddresses.testRecipient}`, 'cyan');
    log(`   Your Wallet: ${fixedAddresses.yourWallet}`, 'cyan');
    
    // Fix 5: WebSocket alternative
    log('\n🔌 Fix 5: WebSocket Connection...', 'cyan');
    log('   ⚠️  WebSocket URL may not support direct connection', 'yellow');
    log('   💡 Alternative: Use HTTP polling (automatic fallback)', 'green');
    log('   Or try alternative WebSocket URL:', 'yellow');
    log('   wss://rpc-nebulas-testnet.uniultra.xyz/ws', 'cyan');
    
    // Summary and next steps
    separator();
    log('\n📋 SUMMARY & NEXT STEPS', 'bright');
    separator();
    
    log('\n1️⃣  GET TESTNET TOKENS (CRITICAL):', 'yellow');
    log('   → Visit: https://faucet.uniultra.xyz/', 'cyan');
    log(`   → Send to: ${fixedAddresses.yourWallet}`, 'cyan');
    log('   → Amount: At least 1 U2U', 'cyan');
    
    log('\n2️⃣  START AI SENTINEL:', 'yellow');
    log('   cd services/ai-sentinel', 'cyan');
    log('   source venv/bin/activate  # or: .\\venv\\Scripts\\Activate.ps1', 'cyan');
    log('   python app.py', 'cyan');
    
    log('\n3️⃣  VERIFY CONTRACT ADDRESS:', 'yellow');
    log('   Current: 0x9Dfb525D1448031ab48c4F404b330d781C0B8854', 'cyan');
    log('   If this is wrong, redeploy:', 'yellow');
    log('   cd contracts', 'cyan');
    log('   npx hardhat run scripts/deploy.ts --network u2u_testnet', 'cyan');
    
    log('\n4️⃣  RUN TESTS AGAIN:', 'yellow');
    log('   After getting tokens and starting AI:', 'cyan');
    log('   node check-system-status.js', 'cyan');
    
    separator();
    log('\n💡 TIP: If contract read fails, the contract might be using', 'yellow');
    log('    a different ABI. Make sure you deployed the latest version.', 'yellow');
    log('');
}

// Run
quickFix().catch(console.error);