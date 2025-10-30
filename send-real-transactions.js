/**
 * CERBERUS MINIMAL TEST - BYPASS CONTRACT READ
 * =============================================
 * Script ini fokus untuk MENGIRIM TRANSAKSI REAL dan verify di explorer
 * Tidak perlu baca contract state dulu
 */

const { ethers } = require('ethers');
require('dotenv').config();

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator() {
    log('='.repeat(70), 'cyan');
}

async function sendTestTransaction() {
    console.clear();
    separator();
    log('   🐺 CERBERUS MINIMAL REAL TRANSACTION TEST', 'bright');
    separator();
    
    try {
        // Setup
        log('\n🔧 Setting up...', 'cyan');
        const provider = new ethers.JsonRpcProvider('https://rpc-nebulas-testnet.uniultra.xyz');
        const wallet = new ethers.Wallet(process.env.MONITOR_PRIVATE_KEY, provider);
        const balance = await provider.getBalance(wallet.address);
        
        log(`✅ Wallet: ${wallet.address}`, 'green');
        log(`💰 Balance: ${ethers.formatEther(balance)} U2U`, 'green');
        
        if (balance === 0n) {
            throw new Error('No balance!');
        }
        
        // Get current gas price
        const feeData = await wallet.provider.getFeeData();
        const normalGas = feeData.gasPrice || ethers.parseUnits('10', 'gwei');
        
        // Test recipient (properly checksummed)
        const recipient = ethers.getAddress('0x742D35cC6634C0532925A3b844bc9E7595f0BEb8');
        
        separator();
        log('\n🧪 TEST 1: Normal Transaction', 'bright');
        log('This should NOT be flagged as malicious', 'yellow');
        separator();
        
        // Send normal transaction
        log('\n📤 Sending transaction...', 'cyan');
        const tx1 = await wallet.sendTransaction({
            to: recipient,
            value: ethers.parseEther('0.001'),
            gasLimit: 21000,
            gasPrice: normalGas,
        });
        
        log(`✅ Transaction sent!`, 'green');
        log(`   Hash: ${tx1.hash}`, 'cyan');
        log(`   Value: 0.001 U2U`, 'cyan');
        log(`   Gas: ${ethers.formatUnits(normalGas, 'gwei')} gwei`, 'cyan');
        log(`\n🔗 View on Explorer:`, 'bright');
        log(`   https://testnet.u2uscan.xyz/tx/${tx1.hash}`, 'cyan');
        
        log('\n⏳ Waiting for confirmation...', 'yellow');
        const receipt1 = await tx1.wait();
        log(`✅ CONFIRMED in block ${receipt1.blockNumber}!`, 'green');
        
        // Wait before next test
        log('\n⏸️  Waiting 10 seconds...', 'dim');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        separator();
        log('\n🧪 TEST 2: High Gas Transaction', 'bright');
        log('This SHOULD be flagged as suspicious!', 'yellow');
        separator();
        
        // Send suspicious transaction (high gas)
        const highGas = ethers.parseUnits('150', 'gwei');
        
        log('\n📤 Sending SUSPICIOUS transaction...', 'red');
        const tx2 = await wallet.sendTransaction({
            to: recipient,
            value: ethers.parseEther('0.001'),
            gasLimit: 21000,
            gasPrice: highGas,
        });
        
        log(`🚨 Transaction sent!`, 'red');
        log(`   Hash: ${tx2.hash}`, 'cyan');
        log(`   Value: 0.001 U2U`, 'cyan');
        log(`   Gas: ${ethers.formatUnits(highGas, 'gwei')} gwei (VERY HIGH!)`, 'red');
        log(`\n🔗 View on Explorer:`, 'bright');
        log(`   https://testnet.u2uscan.xyz/tx/${tx2.hash}`, 'cyan');
        
        log('\n⏳ Waiting for confirmation...', 'yellow');
        const receipt2 = await tx2.wait();
        log(`✅ CONFIRMED in block ${receipt2.blockNumber}!`, 'green');
        
        // Wait before next test
        log('\n⏸️  Waiting 10 seconds...', 'dim');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        separator();
        log('\n🧪 TEST 3: CRITICAL Transaction', 'bright');
        log('High value + High gas = CRITICAL threat!', 'yellow');
        separator();
        
        // Send critical transaction
        const criticalGas = ethers.parseUnits('200', 'gwei');
        
        log('\n📤 Sending CRITICAL transaction...', 'red');
        const tx3 = await wallet.sendTransaction({
            to: recipient,
            value: ethers.parseEther('0.05'),
            gasLimit: 21000,
            gasPrice: criticalGas,
        });
        
        log(`💥 Transaction sent!`, 'red');
        log(`   Hash: ${tx3.hash}`, 'cyan');
        log(`   Value: 0.05 U2U (HIGH!)`, 'red');
        log(`   Gas: ${ethers.formatUnits(criticalGas, 'gwei')} gwei (EXTREME!)`, 'red');
        log(`\n🔗 View on Explorer:`, 'bright');
        log(`   https://testnet.u2uscan.xyz/tx/${tx3.hash}`, 'cyan');
        
        log('\n⏳ Waiting for confirmation...', 'yellow');
        const receipt3 = await tx3.wait();
        log(`✅ CONFIRMED in block ${receipt3.blockNumber}!`, 'green');
        
        // Summary
        separator();
        log('\n📊 TEST SUMMARY', 'bright');
        separator();
        
        log('\n✅ All 3 transactions CONFIRMED on U2U Network!', 'green');
        log('\n📋 Transaction Hashes:', 'bright');
        log(`   1. Normal:   ${tx1.hash}`, 'cyan');
        log(`   2. Suspicious: ${tx2.hash}`, 'cyan');
        log(`   3. Critical:   ${tx3.hash}`, 'cyan');
        
        log('\n🔍 VERIFICATION:', 'bright');
        log('   1. Check if Monitor detected these transactions', 'yellow');
        log('   2. Check if AI analyzed them', 'yellow');
        log('   3. Check if alerts were recorded on-chain', 'yellow');
        log('   4. Check frontend for alert display', 'yellow');
        
        log('\n📝 NEXT STEPS:', 'bright');
        log('   1. Check Monitor logs (should show analysis)', 'cyan');
        log('   2. Verify on U2U Explorer (links above)', 'cyan');
        log('   3. Check contract for ThreatReported events:', 'cyan');
        log('      https://testnet.u2uscan.xyz/address/0x9Dfb525D1448031ab48c4F404b330d781C0B8854', 'cyan');
        
        separator();
        log('\n💡 TIP: If Monitor is running, you should see:', 'yellow');
        log('   • Transaction analysis logs', 'yellow');
        log('   • AI danger scores', 'yellow');
        log('   • Alert sent confirmations (for Test 2 & 3)', 'yellow');
        
        log('\n✅ REAL TRANSACTIONS SUCCESSFULLY SENT!', 'green');
        log('   These are 100% REAL transactions on U2U Network!', 'green');
        log('');
        
    } catch (error) {
        log(`\n❌ Error: ${error.message}`, 'red');
        
        if (error.message.includes('insufficient funds')) {
            log('\n💡 Need more U2U tokens', 'yellow');
        } else {
            log(`\n📋 Full error:`, 'dim');
            console.error(error);
        }
        
        process.exit(1);
    }
}

// Run
sendTestTransaction().catch(console.error);