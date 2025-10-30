/**
 * VERIFY MONITOR -> CONTRACT CONNECTION
 * =====================================
 * Check if monitor can actually write to the contract
 */

const { ethers } = require('ethers');
require('dotenv').config();

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

async function verifyMonitorConnection() {
    console.clear();
    log('='.repeat(70), 'cyan');
    log('   🔍 VERIFY MONITOR -> CONTRACT CONNECTION', 'bright');
    log('='.repeat(70), 'cyan');
    
    try {
        // Setup
        const contractAddress = process.env.CONTRACT_ADDRESS || '0x9Dfb525D1448031ab48c4F404b330d781C0B8854';
        const provider = new ethers.JsonRpcProvider('https://rpc-nebulas-testnet.uniultra.xyz');
        const wallet = new ethers.Wallet(process.env.MONITOR_PRIVATE_KEY, provider);
        
        log('\n📋 Configuration:', 'cyan');
        log(`   Contract: ${contractAddress}`, 'dim');
        log(`   Monitor Wallet: ${wallet.address}`, 'dim');
        
        // Check contract exists
        log('\n1️⃣  Checking if contract exists...', 'cyan');
        const code = await provider.getCode(contractAddress);
        
        if (code === '0x') {
            log('   ❌ Contract not found at this address!', 'red');
            log('   💡 You need to redeploy:', 'yellow');
            log('      cd contracts', 'dim');
            log('      npx hardhat run scripts/deploy.ts --network u2u_testnet', 'dim');
            return;
        }
        
        log('   ✅ Contract exists', 'green');
        
        // Try to read contract (test if ABI matches)
        log('\n2️⃣  Testing contract read (ABI check)...', 'cyan');
        
        // Try simple ABI first
        const simpleABI = [
            "function totalAlerts() view returns (uint256)",
            "function reportThreat(bytes32, address, uint8, uint8, uint256, string, bytes) returns (uint256)"
        ];
        
        let contract = new ethers.Contract(contractAddress, simpleABI, wallet);
        
        try {
            const totalAlerts = await contract.totalAlerts();
            log(`   ✅ Can read contract: ${totalAlerts} total alerts`, 'green');
        } catch (error) {
            log('   ⚠️  Cannot read with simple ABI', 'yellow');
            log(`   Error: ${error.message.substring(0, 100)}`, 'dim');
            
            // This is the issue - wrong ABI!
            log('\n   💡 SOLUTION: Contract uses different function names', 'yellow');
            log('   Monitor code needs to use correct ABI', 'yellow');
        }
        
        // Check balance for gas
        log('\n3️⃣  Checking gas balance...', 'cyan');
        const balance = await provider.getBalance(wallet.address);
        log(`   Balance: ${ethers.formatEther(balance)} U2U`, balance > 0n ? 'green' : 'red');
        
        if (balance === 0n) {
            log('   ❌ No gas for transactions!', 'red');
            log('   💡 Get tokens from faucet', 'yellow');
            return;
        }
        
        // Try to send a test alert
        log('\n4️⃣  Testing alert submission...', 'cyan');
        
        const testTxHash = ethers.randomBytes(32);
        const testAddress = '0x742D35cC6634C0532925A3b844bc9E7595f0BEb8';
        
        try {
            log('   Attempting to call reportThreat...', 'dim');
            
            const tx = await contract.reportThreat(
                testTxHash,
                testAddress,
                2, // level: HIGH
                2, // category: FRONT_RUNNING
                85, // confidence
                'Test threat from verify script',
                '0x',
                { gasLimit: 500000 }
            );
            
            log(`   ✅ Transaction sent: ${tx.hash}`, 'green');
            log('   ⏳ Waiting for confirmation...', 'yellow');
            
            const receipt = await tx.wait();
            log(`   ✅ CONFIRMED! Block: ${receipt.blockNumber}`, 'green');
            log('   🎉 Monitor CAN write to contract!', 'green');
            
        } catch (error) {
            log('   ❌ Cannot send alert to contract', 'red');
            log(`   Error: ${error.message}`, 'dim');
            
            if (error.message.includes('missing revert data') || error.message.includes('CALL_EXCEPTION')) {
                log('\n   🔍 DIAGNOSIS: Wrong function signature!', 'yellow');
                log('   💡 SOLUTION:', 'bright');
                log('   1. Check actual contract ABI', 'cyan');
                log('   2. Update monitor to use correct function name', 'cyan');
                log('   3. Contract might use flagTransaction() not reportThreat()', 'cyan');
            }
        }
        
        log('\n' + '='.repeat(70), 'cyan');
        log('   📊 DIAGNOSIS COMPLETE', 'bright');
        log('='.repeat(70), 'cyan');
        
    } catch (error) {
        log(`\n❌ Fatal error: ${error.message}`, 'red');
        console.error(error);
    }
}

verifyMonitorConnection().catch(console.error);