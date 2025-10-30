/**
 * GRANT AI_ORACLE_ROLE - ROBUST VERSION
 * ======================================
 * This script grants AI_ORACLE_ROLE to monitor wallet
 * Works with deployer/admin wallet
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

async function grantRole() {
    log('='.repeat(70), 'cyan');
    log('   🔐 GRANT AI_ORACLE_ROLE TO MONITOR', 'bright');
    log('='.repeat(70) + '\n', 'cyan');
    
    try {
        // Get configuration
        const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
        const MONITOR_ADDRESS = '0xfe89f390C1cf3D6b83171D41bEEF4A3E3A763fAE';
        
        // Try deployer key first, fallback to monitor key
        const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || process.env.MONITOR_PRIVATE_KEY;
        
        if (!CONTRACT_ADDRESS) {
            throw new Error('CONTRACT_ADDRESS not set in .env');
        }
        if (!PRIVATE_KEY || PRIVATE_KEY.includes('YOUR_')) {
            throw new Error('PRIVATE_KEY not set in .env');
        }
        
        log('📋 Configuration:', 'cyan');
        log(`   Contract: ${CONTRACT_ADDRESS}`, 'dim');
        log(`   Monitor Address: ${MONITOR_ADDRESS}`, 'dim');
        
        // Setup provider and wallet
        const provider = new ethers.JsonRpcProvider('https://rpc-nebulas-testnet.uniultra.xyz');
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        log(`   Admin Wallet: ${wallet.address}`, 'dim');
        log(`   Balance: ${ethers.formatEther(await provider.getBalance(wallet.address))} U2U\n`, 'dim');
        
        // Check contract exists
        log('1️⃣  Checking contract...', 'cyan');
        const code = await provider.getCode(CONTRACT_ADDRESS);
        if (code === '0x') {
            throw new Error('Contract not found at specified address');
        }
        log('   ✅ Contract exists\n', 'green');
        
        // Try to determine contract type
        log('2️⃣  Detecting contract type...', 'cyan');
        
        // Try CerberusAdvanced first
        const advancedABI = [
            "function AI_ORACLE_ROLE() view returns (bytes32)",
            "function grantRole(bytes32 role, address account)",
            "function hasRole(bytes32 role, address account) view returns (bool)",
            "function DEFAULT_ADMIN_ROLE() view returns (bytes32)"
        ];
        
        let contract = new ethers.Contract(CONTRACT_ADDRESS, advancedABI, wallet);
        let AI_ORACLE_ROLE;
        let isAdvanced = false;
        
        try {
            AI_ORACLE_ROLE = await contract.AI_ORACLE_ROLE();
            isAdvanced = true;
            log('   ✅ Detected: CerberusAdvanced contract\n', 'green');
        } catch (error) {
            // Try simpler contract
            log('   ℹ️  Not CerberusAdvanced, trying simple contract...', 'yellow');
            
            const simpleABI = [
                "function flagTransaction(bytes32 _txHash, address _potentialThreatActor, string memory _threatSignature, uint8 _level)",
                "function totalAlerts() view returns (uint256)",
                "function owner() view returns (address)"
            ];
            
            contract = new ethers.Contract(CONTRACT_ADDRESS, simpleABI, wallet);
            
            try {
                await contract.totalAlerts();
                log('   ✅ Detected: Simple Cerberus contract (no roles needed!)\n', 'green');
                
                // For simple contract, just check ownership
                try {
                    const owner = await contract.owner();
                    if (owner.toLowerCase() === wallet.address.toLowerCase()) {
                        log('✅ SUCCESS! You are the owner.', 'green');
                        log('   Simple contract doesn\'t need role grants.\n', 'dim');
                        log('💡 NEXT STEPS:', 'bright');
                        log('   1. Your monitor can now report threats!', 'cyan');
                        log('   2. Start monitor: node monitor-complete.js', 'cyan');
                        log('   3. Send test: node send-real-transactions.js\n', 'cyan');
                        return;
                    } else {
                        log(`⚠️  Warning: Contract owner is ${owner}`, 'yellow');
                        log(`   Your wallet: ${wallet.address}`, 'yellow');
                        log('   You may need owner wallet to interact\n', 'yellow');
                        return;
                    }
                } catch {
                    // No owner function
                    log('✅ Simple contract detected\n', 'green');
                    log('💡 NEXT STEPS:', 'bright');
                    log('   1. Your monitor can report threats!', 'cyan');
                    log('   2. Start monitor: node monitor-complete.js', 'cyan');
                    log('   3. Send test: node send-real-transactions.js\n', 'cyan');
                    return;
                }
            } catch {
                throw new Error('Cannot detect contract type. Check CONTRACT_ADDRESS');
            }
        }
        
        // If we're here, it's CerberusAdvanced - proceed with role grant
        log('3️⃣  Checking current role status...', 'cyan');
        const hasRole = await contract.hasRole(AI_ORACLE_ROLE, MONITOR_ADDRESS);
        
        if (hasRole) {
            log('   ✅ Monitor already has AI_ORACLE_ROLE!\n', 'green');
            log('🎉 SUCCESS! No action needed.\n', 'green');
            log('💡 NEXT STEPS:', 'bright');
            log('   1. Monitor is ready to report threats!', 'cyan');
            log('   2. Start monitor: node monitor-complete.js', 'cyan');
            log('   3. Send test: node send-real-transactions.js\n', 'cyan');
            return;
        }
        
        log('   ℹ️  Monitor does not have role yet\n', 'yellow');
        
        // Check if wallet has admin rights
        log('4️⃣  Checking admin permissions...', 'cyan');
        const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
        const isAdmin = await contract.hasRole(DEFAULT_ADMIN_ROLE, wallet.address);
        
        if (!isAdmin) {
            log('   ❌ Current wallet is not admin!\n', 'red');
            log('💡 SOLUTION:', 'yellow');
            log('   You need to use the deployer wallet (contract owner)', 'yellow');
            log('   Update .env:', 'yellow');
            log('   PRIVATE_KEY=<deployer_wallet_private_key>\n', 'cyan');
            return;
        }
        
        log('   ✅ You have admin rights\n', 'green');
        
        // Grant role
        log('5️⃣  Granting AI_ORACLE_ROLE...', 'cyan');
        log(`   To: ${MONITOR_ADDRESS}`, 'dim');
        
        const tx = await contract.grantRole(AI_ORACLE_ROLE, MONITOR_ADDRESS, {
            gasLimit: 200000,
            gasPrice: ethers.parseUnits('20', 'gwei')
        });
        
        log(`   📤 Transaction sent: ${tx.hash}`, 'cyan');
        log('   ⏳ Waiting for confirmation...', 'dim');
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            log('   ✅ Transaction confirmed!\n', 'green');
            
            // Verify
            log('6️⃣  Verifying...', 'cyan');
            const hasRoleNow = await contract.hasRole(AI_ORACLE_ROLE, MONITOR_ADDRESS);
            
            if (hasRoleNow) {
                log('   ✅ Role successfully granted!\n', 'green');
                log('🎉 SUCCESS! Monitor can now report threats!\n', 'bright');
                log('💡 NEXT STEPS:', 'bright');
                log('   1. Restart your monitor', 'cyan');
                log('   2. cd services/mempool-monitor', 'dim');
                log('   3. node monitor-complete.js', 'cyan');
                log('   4. Send test transaction', 'cyan');
                log('   5. Watch for "✅ Confirmed on-chain!" message\n', 'cyan');
            } else {
                log('   ⚠️  Role grant may have failed, please verify manually\n', 'yellow');
            }
        } else {
            log('   ❌ Transaction failed!\n', 'red');
        }
        
    } catch (error) {
        log('\n❌ Error: ' + error.message, 'red');
        
        if (error.message.includes('not set')) {
            log('\n💡 SOLUTION:', 'yellow');
            log('   1. Check your .env file', 'cyan');
            log('   2. Make sure CONTRACT_ADDRESS is set', 'cyan');
            log('   3. Make sure PRIVATE_KEY is set (deployer wallet)\n', 'cyan');
        } else if (error.message.includes('insufficient funds')) {
            log('\n💡 SOLUTION:', 'yellow');
            log('   Get more U2U tokens from faucet:', 'cyan');
            log('   https://faucet.uniultra.xyz/\n', 'cyan');
        } else {
            log('\n📋 Full error:', 'dim');
            console.error(error);
        }
    }
}

grantRole().catch(console.error);