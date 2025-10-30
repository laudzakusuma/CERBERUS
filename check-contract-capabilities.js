/**
 * CHECK ACTUAL CONTRACT CAPABILITIES
 * ==================================
 * This will tell us exactly what functions your contract has
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

async function checkContract() {
    log('='.repeat(70), 'cyan');
    log('   🔍 CONTRACT CAPABILITIES CHECK', 'bright');
    log('='.repeat(70) + '\n', 'cyan');
    
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x9Dfb525D1448031ab48c4F404b330d781C0B8854';
    const MONITOR_WALLET = '0xfe89f390C1cf3D6b83171D41bEEF4A3E3A763fAE';
    
    const provider = new ethers.JsonRpcProvider('https://rpc-nebulas-testnet.uniultra.xyz');
    
    log('📋 Configuration:', 'cyan');
    log(`   Contract: ${CONTRACT_ADDRESS}`, 'dim');
    log(`   Monitor: ${MONITOR_WALLET}\n`, 'dim');
    
    // Get contract code
    log('1️⃣  Getting contract bytecode...', 'cyan');
    const code = await provider.getCode(CONTRACT_ADDRESS);
    
    if (code === '0x') {
        log('   ❌ Contract not found!\n', 'red');
        return;
    }
    log('   ✅ Contract exists\n', 'green');
    
    // Try different function signatures
    log('2️⃣  Testing function signatures...', 'cyan');
    
    const testFunctions = [
        {
            name: 'totalAlerts()',
            sig: 'totalAlerts()',
            abi: ['function totalAlerts() view returns (uint256)']
        },
        {
            name: 'flagTransaction(...)',
            sig: 'flagTransaction(bytes32,address,string,uint8)',
            abi: ['function flagTransaction(bytes32 _txHash, address _potentialThreatActor, string memory _threatSignature, uint8 _level)']
        },
        {
            name: 'reportAdvancedThreat(...)',
            sig: 'reportAdvancedThreat(bytes32,address,address[],uint8,uint8,uint256,uint256,string,bytes,bytes32,uint256,bytes32[])',
            abi: ['function reportAdvancedThreat(bytes32,address,address[],uint8,uint8,uint256,uint256,string,bytes,bytes32,uint256,bytes32[]) payable']
        },
        {
            name: 'reportedTransactions(bytes32)',
            sig: 'reportedTransactions(bytes32)',
            abi: ['function reportedTransactions(bytes32) view returns (bool)']
        },
        {
            name: 'owner()',
            sig: 'owner()',
            abi: ['function owner() view returns (address)']
        }
    ];
    
    const workingFunctions = [];
    
    for (const func of testFunctions) {
        try {
            const contract = new ethers.Contract(CONTRACT_ADDRESS, func.abi, provider);
            
            if (func.sig === 'totalAlerts()') {
                const result = await contract.totalAlerts();
                log(`   ✅ ${func.name} - Works! (Total: ${result})`, 'green');
                workingFunctions.push(func);
            } else if (func.sig === 'reportedTransactions(bytes32)') {
                const testHash = '0x' + '0'.repeat(64);
                const result = await contract.reportedTransactions(testHash);
                log(`   ✅ ${func.name} - Works! (Returns: ${result})`, 'green');
                workingFunctions.push(func);
            } else if (func.sig === 'owner()') {
                const result = await contract.owner();
                log(`   ✅ ${func.name} - Works! (Owner: ${result})`, 'green');
                workingFunctions.push(func);
            } else {
                // For write functions, just check if they exist (don't call them)
                log(`   ⚠️  ${func.name} - Cannot test (write function)`, 'yellow');
            }
        } catch (error) {
            log(`   ❌ ${func.name} - Not found or error`, 'red');
        }
    }
    
    log('\n3️⃣  Determining contract type...', 'cyan');
    
    if (workingFunctions.some(f => f.name === 'flagTransaction(...)')) {
        log('   📝 Contract Type: SIMPLE (CerberusAlerts)', 'green');
        log('   ✅ Use: flagTransaction()', 'green');
        log('\n💡 SOLUTION:', 'bright');
        log('   Your contract uses the SIMPLE function signature.', 'cyan');
        log('   Need to update monitor to use flagTransaction()', 'cyan');
    } else if (workingFunctions.some(f => f.name === 'reportAdvancedThreat(...)')) {
        log('   📝 Contract Type: ADVANCED (CerberusAdvanced)', 'green');
        log('   ✅ Use: reportAdvancedThreat()', 'green');
        log('\n💡 SOLUTION:', 'bright');
        log('   Your contract uses ADVANCED function.', 'cyan');
        log('   Monitor code is correct, but might need role grant.', 'cyan');
    } else {
        log('   ⚠️  Contract Type: UNKNOWN', 'yellow');
        log('   Cannot determine which function to use.', 'yellow');
    }
    
    // Check if owner
    log('\n4️⃣  Checking ownership...', 'cyan');
    try {
        const ownerABI = ['function owner() view returns (address)'];
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ownerABI, provider);
        const owner = await contract.owner();
        
        log(`   Contract Owner: ${owner}`, 'dim');
        log(`   Monitor Wallet: ${MONITOR_WALLET}`, 'dim');
        
        if (owner.toLowerCase() === MONITOR_WALLET.toLowerCase()) {
            log('   ✅ Monitor IS the owner!', 'green');
            log('   You should be able to report threats.', 'green');
        } else {
            log('   ⚠️  Monitor is NOT the owner', 'yellow');
            log('   May need owner permissions or role grant.', 'yellow');
        }
    } catch (error) {
        log('   ℹ️  Cannot determine ownership', 'dim');
    }
    
    // Try to get actual transaction that failed
    log('\n5️⃣  Checking failed transaction...', 'cyan');
    const failedTx = '0x00c12129181fd40cf89a3888e3810a39877b227b925b4b1aa20938bb80138cc9';
    
    try {
        const tx = await provider.getTransaction(failedTx);
        if (tx) {
            log(`   Transaction found:`, 'dim');
            log(`   - To: ${tx.to}`, 'dim');
            log(`   - Data: ${tx.data.substring(0, 20)}...`, 'dim');
            log(`   - Value: ${ethers.formatEther(tx.value)} U2U`, 'dim');
            
            // Check function selector
            const selector = tx.data.substring(0, 10);
            log(`   - Function Selector: ${selector}`, 'dim');
            
            // Common selectors
            const selectors = {
                '0x8c97ad16': 'flagTransaction(bytes32,address,string,uint8)',
                '0xa1b8c3d2': 'reportAdvancedThreat(...)', // example
            };
            
            if (selectors[selector]) {
                log(`   ✅ Calling: ${selectors[selector]}`, 'green');
            } else {
                log(`   ⚠️  Unknown function selector`, 'yellow');
            }
            
            // Check receipt
            const receipt = await provider.getTransactionReceipt(failedTx);
            if (receipt) {
                if (receipt.status === 0) {
                    log(`   ❌ Transaction FAILED (reverted)`, 'red');
                } else {
                    log(`   ✅ Transaction SUCCESS`, 'green');
                }
            }
        }
    } catch (error) {
        log(`   ⚠️  Cannot fetch transaction`, 'yellow');
    }
    
    log('\n' + '='.repeat(70), 'cyan');
    log('📊 DIAGNOSIS COMPLETE', 'bright');
    log('='.repeat(70) + '\n', 'cyan');
}

checkContract().catch(error => {
    console.error('Error:', error);
});