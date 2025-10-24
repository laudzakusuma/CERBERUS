const { ethers } = require('ethers');
require('dotenv').config();

const provider = new ethers.JsonRpcProvider('https://rpc-nebulas-testnet.uniultra.xyz');

const SCENARIOS = {
    1: {
        name: '🔥 HIGH GAS ATTACK',
        description: 'Transaction dengan gas price sangat tinggi (MEV abuse)',
        trigger: async (wallet) => {
            return await wallet.sendTransaction({
                to: wallet.address,
                value: ethers.parseEther('0.01'),
                gasPrice: ethers.parseUnits('150', 'gwei'),
                gasLimit: 21000
            });
        },
        expectedPattern: 'HIGH_GAS',
        expectedLevel: 'HIGH'
    },
    
    2: {
        name: '💰 HIGH VALUE TRANSFER',
        description: 'Transfer dengan nilai sangat besar',
        trigger: async (wallet) => {
            const balance = await provider.getBalance(wallet.address);
            const valueToSend = parseFloat(ethers.formatEther(balance)) * 0.8;
            
            if (valueToSend < 10) {
                console.log('⚠️  Balance too low for HIGH VALUE test (need >12 U2U)');
                console.log('   Sending 0.5 U2U instead for demonstration...');
                return await wallet.sendTransaction({
                    to: wallet.address,
                    value: ethers.parseEther('0.5'),
                    gasPrice: ethers.parseUnits('20', 'gwei')
                });
            }
            
            return await wallet.sendTransaction({
                to: wallet.address,
                value: ethers.parseEther(valueToSend.toString()),
                gasPrice: ethers.parseUnits('20', 'gwei')
            });
        },
        expectedPattern: 'HIGH_VALUE',
        expectedLevel: 'HIGH'
    },
    
    3: {
        name: '⚡ FRONT-RUNNING PATTERN',
        description: 'Zero value + high gas (front-running indicator)',
        trigger: async (wallet) => {
            return await wallet.sendTransaction({
                to: '0x0000000000000000000000000000000000000000',
                value: ethers.parseEther('0'),
                gasPrice: ethers.parseUnits('120', 'gwei'),
                gasLimit: 21000
            });
        },
        expectedPattern: 'ZERO_VALUE_HIGH_GAS',
        expectedLevel: 'HIGH'
    },
    
    4: {
        name: '🤖 BOT ATTACK SIMULATION',
        description: 'Multiple rapid transactions (bot pattern)',
        trigger: async (wallet) => {
            console.log('   Sending 5 transactions rapidly...');
            const txs = [];
            
            for (let i = 0; i < 5; i++) {
                console.log(`   📤 Transaction ${i + 1}/5...`);
                const tx = await wallet.sendTransaction({
                    to: wallet.address,
                    value: ethers.parseEther('0.001'),
                    gasPrice: ethers.parseUnits('25', 'gwei'),
                    nonce: await provider.getTransactionCount(wallet.address) + i
                });
                txs.push(tx);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.log('   ⏳ Waiting for confirmations...');
            for (const tx of txs) {
                await tx.wait();
            }
            
            return txs[0];
        },
        expectedPattern: 'MULTI_CALL_PATTERN',
        expectedLevel: 'HIGH'
    },
    
    5: {
        name: '🎯 COMBINED THREAT',
        description: 'High gas + High value (multiple patterns)',
        trigger: async (wallet) => {
            return await wallet.sendTransaction({
                to: wallet.address,
                value: ethers.parseEther('1.0'),
                gasPrice: ethers.parseUnits('130', 'gwei'),
                gasLimit: 21000
            });
        },
        expectedPattern: 'HIGH_GAS + HIGH_VALUE',
        expectedLevel: 'HIGH'
    }
};

async function runThreatTest(scenarioNum) {
    console.log('🚨 CERBERUS REAL THREAT TESTER');
    console.log('=' .repeat(70));
    console.log('⚠️  WARNING: This will send REAL transactions to U2U Testnet');
    console.log('=' .repeat(70) + '\n');
    
    const wallet = new ethers.Wallet(process.env.MONITOR_PRIVATE_KEY, provider);
    
    console.log(`👤 Wallet Address: ${wallet.address}`);
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Current Balance: ${ethers.formatEther(balance)} U2U\n`);
    
    if (parseFloat(ethers.formatEther(balance)) < 0.1) {
        console.error('❌ Insufficient balance!');
        console.log('   Get testnet tokens from: https://faucet-testnet.uniultra.xyz');
        process.exit(1);
    }
    
    const scenario = SCENARIOS[scenarioNum];
    if (!scenario) {
        console.error(`❌ Invalid scenario number: ${scenarioNum}`);
        console.log('\nAvailable scenarios:');
        Object.entries(SCENARIOS).forEach(([num, s]) => {
            console.log(`   ${num}. ${s.name}`);
            console.log(`      ${s.description}`);
        });
        process.exit(1);
    }
    
    console.log('📋 TEST SCENARIO:');
    console.log(`   ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    console.log(`   Expected Pattern: ${scenario.expectedPattern}`);
    console.log(`   Expected Level: ${scenario.expectedLevel}\n`);
    
    console.log('🔥 EXECUTING TEST...\n');
    
    try {
        const startTime = Date.now();
        
        const tx = await scenario.trigger(wallet);
        
        console.log('\n✅ TRANSACTION SENT!');
        console.log('=' .repeat(70));
        console.log(`📝 Transaction Hash: ${tx.hash}`);
        console.log(`🔗 Explorer: https://testnet.u2uscan.xyz/tx/${tx.hash}`);
        console.log('=' .repeat(70) + '\n');
        
        console.log('⏳ Waiting for confirmation...');
        const receipt = await tx.wait();
        
        const executionTime = Date.now() - startTime;
        
        console.log('\n⚡ TRANSACTION CONFIRMED!');
        console.log('=' .repeat(70));
        console.log(`📦 Block Number: ${receipt.blockNumber}`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
        console.log(`⏱️  Execution Time: ${(executionTime / 1000).toFixed(2)}s`);
        console.log('=' .repeat(70) + '\n');
        
        console.log('🎯 WHAT HAPPENS NEXT:');
        console.log('   1. Cerberus Monitor detects this transaction');
        console.log('   2. AI/Rules analyze the threat pattern');
        console.log(`   3. Pattern "${scenario.expectedPattern}" should be triggered`);
        console.log('   4. Alert is sent to smart contract on-chain');
        console.log('   5. Frontend dashboard shows the threat in real-time\n');
        
        console.log('⏰ EXPECTED TIMELINE:');
        console.log('   - Monitor detection: ~3-10 seconds');
        console.log('   - AI analysis: ~100-500ms');
        console.log('   - On-chain alert: ~10-30 seconds');
        console.log('   - Frontend update: Immediate after on-chain\n');
        
        console.log('👀 WHERE TO CHECK:');
        console.log(`   - Monitor logs: Look for "THREAT DETECTED" message`);
        console.log(`   - Smart contract: Check ThreatReported event`);
        console.log(`   - Frontend: Should appear in dashboard within 1 minute\n`);
        
        console.log('✨ TEST COMPLETE!');
        console.log(`   This was a REAL blockchain transaction that should trigger Cerberus!`);
        console.log(`   Keep your monitor running and watch the magic happen! 🐺\n`);
        
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        
        if (error.message.includes('insufficient funds')) {
            console.log('\n💡 TIP: Get more testnet tokens from faucet');
        } else if (error.message.includes('nonce')) {
            console.log('\n💡 TIP: Wait a moment and try again');
        }
        
        process.exit(1);
    }
}

function printUsage() {
    console.log('\n🚨 CERBERUS REAL THREAT TESTER\n');
    console.log('Usage: node real_threat_tester.js [scenario_number]\n');
    console.log('Available Scenarios:');
    Object.entries(SCENARIOS).forEach(([num, s]) => {
        console.log(`\n  ${num}. ${s.name}`);
        console.log(`     ${s.description}`);
        console.log(`     Pattern: ${s.expectedPattern} | Level: ${s.expectedLevel}`);
    });
    console.log('\nExample:');
    console.log('  node real_threat_tester.js 1    # Run HIGH GAS test');
    console.log('  node real_threat_tester.js 4    # Run BOT ATTACK test\n');
}

const scenarioArg = process.argv[2];

if (!scenarioArg) {
    printUsage();
    process.exit(0);
}

const scenarioNum = parseInt(scenarioArg);

runThreatTest(scenarioNum).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});