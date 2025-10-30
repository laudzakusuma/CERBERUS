/**
 * TEST ACTUAL CONTRACT FUNCTION CALL
 * ===================================
 * This will try different function signatures to find what works
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

async function testContractCalls() {
    log('='.repeat(70), 'cyan');
    log('   🧪 TEST ACTUAL CONTRACT FUNCTION CALLS', 'bright');
    log('='.repeat(70) + '\n', 'cyan');
    
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x9Dfb525D1448031ab48c4F404b330d781C0B8854';
    const OWNER_KEY = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
    
    if (!OWNER_KEY || OWNER_KEY.includes('YOUR_')) {
        log('❌ Need PRIVATE_KEY or DEPLOYER_PRIVATE_KEY in .env', 'red');
        return;
    }
    
    const provider = new ethers.JsonRpcProvider('https://rpc-nebulas-testnet.uniultra.xyz');
    const wallet = new ethers.Wallet(OWNER_KEY, provider);
    
    log('📋 Configuration:', 'cyan');
    log(`   Contract: ${CONTRACT_ADDRESS}`, 'dim');
    log(`   Wallet: ${wallet.address}`, 'dim');
    log(`   Balance: ${ethers.formatEther(await provider.getBalance(wallet.address))} U2U\n`, 'dim');
    
    // Test data
    const testTxHash = ethers.keccak256(ethers.toUtf8Bytes('test_' + Date.now()));
    const testAddress = wallet.address;
    const testSignature = "Test: High gas price attack";
    const testLevel = 2; // HIGH
    
    log('🧪 Test Data:', 'cyan');
    log(`   Tx Hash: ${testTxHash}`, 'dim');
    log(`   Address: ${testAddress}`, 'dim');
    log(`   Signature: ${testSignature}`, 'dim');
    log(`   Level: ${testLevel}\n`, 'dim');
    
    // Try different ABIs
    const testCases = [
        {
            name: 'flagTransaction (4 params)',
            abi: ['function flagTransaction(bytes32 _txHash, address _potentialThreatActor, string memory _threatSignature, uint8 _level)'],
            params: [testTxHash, testAddress, testSignature, testLevel]
        },
        {
            name: 'flagTransaction (no underscore)',
            abi: ['function flagTransaction(bytes32 txHash, address potentialThreatActor, string threatSignature, uint8 level)'],
            params: [testTxHash, testAddress, testSignature, testLevel]
        },
        {
            name: 'recordThreat',
            abi: ['function recordThreat(bytes32 txHash, address actor, string signature, uint8 level)'],
            params: [testTxHash, testAddress, testSignature, testLevel]
        },
        {
            name: 'addAlert',
            abi: ['function addAlert(bytes32 txHash, address actor, string description, uint8 severity)'],
            params: [testTxHash, testAddress, testSignature, testLevel]
        }
    ];
    
    log('🔄 Testing different function signatures...\n', 'cyan');
    
    for (const test of testCases) {
        log(`Testing: ${test.name}`, 'yellow');
        
        try {
            const contract = new ethers.Contract(CONTRACT_ADDRESS, test.abi, wallet);
            
            // Get the function name
            const funcName = test.abi[0].match(/function (\w+)/)[1];
            
            // Try to estimate gas first (this will fail if function doesn't exist)
            log(`   1. Estimating gas...`, 'dim');
            const gasEstimate = await contract[funcName].estimateGas(...test.params);
            log(`   ✅ Gas estimate: ${gasEstimate.toString()}`, 'green');
            
            // If we got here, function exists! Try to call it
            log(`   2. Sending transaction...`, 'dim');
            const tx = await contract[funcName](...test.params, {
                gasLimit: gasEstimate * 120n / 100n,
                gasPrice: ethers.parseUnits('20', 'gwei')
            });
            
            log(`   📤 Tx sent: ${tx.hash}`, 'cyan');
            log(`   ⏳ Waiting for confirmation...`, 'dim');
            
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                log(`   🎉 SUCCESS! This function works!`, 'green');
                log(`   ✅ Block: ${receipt.blockNumber}`, 'green');
                log(`   ✅ Gas used: ${receipt.gasUsed.toString()}`, 'green');
                
                log(`\n${'='.repeat(70)}`, 'cyan');
                log('✅ FOUND WORKING FUNCTION!', 'bright');
                log(`${'='.repeat(70)}`, 'cyan');
                log(`Function: ${test.name}`, 'green');
                log(`ABI: ${test.abi[0]}`, 'cyan');
                log(`\n💡 Use this function in your monitor!\n`, 'yellow');
                
                return { success: true, functionName: funcName, abi: test.abi[0] };
            } else {
                log(`   ❌ Transaction reverted`, 'red');
            }
            
        } catch (error) {
            if (error.message.includes('cannot estimate gas')) {
                log(`   ❌ Function not found or reverts`, 'red');
            } else if (error.message.includes('unknown function')) {
                log(`   ❌ Function signature not recognized`, 'red');
            } else {
                log(`   ❌ Error: ${error.message.substring(0, 100)}`, 'red');
            }
        }
        
        log('');
    }
    
    // If we got here, none worked
    log('='.repeat(70), 'cyan');
    log('❌ NO WORKING FUNCTION FOUND', 'red');
    log('='.repeat(70) + '\n', 'cyan');
    
    log('💡 NEXT STEPS:', 'yellow');
    log('   1. Check your contract source code', 'cyan');
    log('   2. Find the exact function signature for adding alerts', 'cyan');
    log('   3. Contract might use a different function name', 'cyan');
    log('   4. Contract might be view-only (no write functions for monitor)\n', 'cyan');
    
    // Try to check contract code
    log('🔍 Checking contract bytecode...', 'cyan');
    const code = await provider.getCode(CONTRACT_ADDRESS);
    log(`   Contract size: ${code.length} bytes`, 'dim');
    
    // Check for common function selectors
    log('\n🔍 Checking for common function selectors in bytecode...', 'cyan');
    
    const selectors = {
        '0x8c97ad16': 'flagTransaction(bytes32,address,string,uint8)',
        '0x12345678': 'recordThreat(...)',
        '0xabcdef00': 'addAlert(...)',
    };
    
    for (const [selector, func] of Object.entries(selectors)) {
        if (code.includes(selector.substring(2))) {
            log(`   ✅ Found: ${func} (${selector})`, 'green');
        }
    }
    
    return { success: false };
}

testContractCalls().catch(error => {
    console.error('Fatal error:', error);
});