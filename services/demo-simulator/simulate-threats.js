import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const {
    U2U_RPC_HTTP,
    DEMO_PRIVATE_KEY,
    CONTRACT_ADDRESS,
    AI_API_URL
} = process.env;

// Threat scenarios for demo
const THREAT_SCENARIOS = [
    {
        name: "🎯 Front-Running Attack",
        gasPrice: ethers.parseUnits("500", "gwei"), // Abnormally high
        value: ethers.parseEther("1.0"),
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5", // Random address
        data: "0x",
        expectedCategory: "FRONT_RUNNING",
        expectedThreatLevel: "HIGH"
    },
    {
        name: "💣 Flash Loan Attack Simulation",
        gasPrice: ethers.parseUnits("100", "gwei"),
        value: ethers.parseEther("50.0"), // Large value
        to: "0x0000000000000000000000000000000000000000", // Contract creation
        data: "0x608060405234801561001057600080fd5b50", // Contract bytecode
        expectedCategory: "FLASH_LOAN_ATTACK",
        expectedThreatLevel: "CRITICAL"
    },
    {
        name: "🍯 Honeypot Contract",
        gasPrice: ethers.parseUnits("30", "gwei"),
        value: ethers.parseEther("0.1"),
        to: null, // Contract creation
        data: "0x6080604052..." + "dead".repeat(100), // Suspicious bytecode pattern
        expectedCategory: "HONEY_POT",
        expectedThreatLevel: "MEDIUM"
    },
    {
        name: "🏃 Rug Pull Scenario",
        gasPrice: ethers.parseUnits("80", "gwei"),
        value: ethers.parseEther("25.0"),
        to: "0x1234567890123456789012345678901234567890",
        data: "0xa9059cbb", // Transfer function
        expectedCategory: "RUG_PULL",
        expectedThreatLevel: "HIGH"
    },
    {
        name: "✅ Normal Transaction (Control)",
        gasPrice: ethers.parseUnits("15", "gwei"),
        value: ethers.parseEther("0.01"),
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5",
        data: "0x",
        expectedCategory: "NORMAL",
        expectedThreatLevel: "INFO"
    }
];

async function simulateScenario(provider, wallet, scenario, index) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🎬 Scenario ${index + 1}: ${scenario.name}`);
    console.log(`${"=".repeat(60)}`);

    try {
        // 1. Create transaction
        const tx = {
            to: scenario.to,
            value: scenario.value,
            gasPrice: scenario.gasPrice,
            gasLimit: 100000,
            data: scenario.data || "0x",
            nonce: await provider.getTransactionCount(wallet.address)
        };

        console.log(`\n📝 Transaction Details:`);
        console.log(`   From: ${wallet.address}`);
        console.log(`   To: ${tx.to || 'CONTRACT CREATION'}`);
        console.log(`   Value: ${ethers.formatEther(tx.value)} U2U`);
        console.log(`   Gas Price: ${ethers.formatUnits(tx.gasPrice, 'gwei')} Gwei`);

        // 2. Send to AI for analysis (before sending to blockchain)
        console.log(`\n🤖 Sending to AI Sentinel for analysis...`);
        
        const aiPayload = {
            hash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(tx))),
            from: wallet.address,
            to: tx.to,
            value: tx.value.toString(),
            gasPrice: tx.gasPrice.toString(),
            gasLimit: tx.gasLimit.toString(),
            data: tx.data,
            nonce: tx.nonce
        };

        const aiResponse = await fetch(AI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiPayload)
        });

        const aiAnalysis = await aiResponse.json();

        console.log(`\n📊 AI Analysis Results:`);
        console.log(`   Danger Score: ${aiAnalysis.danger_score.toFixed(2)}/100`);
        console.log(`   Category: ${aiAnalysis.threat_category}`);
        console.log(`   Is Malicious: ${aiAnalysis.is_malicious ? '🚨 YES' : '✅ NO'}`);
        console.log(`   Threat Level: ${aiAnalysis.threat_level}`);
        console.log(`   Model Consensus: ${(aiAnalysis.model_consensus * 100).toFixed(1)}%`);

        // 3. If malicious, report to smart contract
        if (aiAnalysis.is_malicious) {
            console.log(`\n🚨 THREAT DETECTED! Reporting to blockchain...`);

            const contractABI = [
                "function reportThreat(bytes32 _txHash, address _flaggedAddress, address[] _relatedAddresses, uint8 _level, uint8 _category, uint256 _confidenceScore, uint256 _severityScore, string _description) returns (uint256)"
            ];

            const cerberusContract = new ethers.Contract(
                CONTRACT_ADDRESS,
                contractABI,
                wallet
            );

            // Map threat category to enum value
            const categoryMap = {
                'RUG_PULL': 0,
                'FLASH_LOAN_ATTACK': 1,
                'FRONT_RUNNING': 2,
                'SMART_CONTRACT_EXPLOIT': 3,
                'PHISHING_CONTRACT': 4,
                'PRICE_MANIPULATION': 5,
                'HONEY_POT': 6,
                'GOVERNANCE_ATTACK': 7,
                'MEV_ABUSE': 8,
                'ANOMALOUS_BEHAVIOR': 9
            };

            const levelMap = {
                0: 'INFO',
                1: 'LOW',
                2: 'MEDIUM',
                3: 'HIGH',
                4: 'CRITICAL'
            };

            const reportTx = await cerberusContract.reportThreat(
                aiPayload.hash,
                wallet.address,
                [], // relatedAddresses
                aiAnalysis.threat_level,
                categoryMap[aiAnalysis.threat_category] || 9,
                Math.floor(aiAnalysis.danger_score),
                Math.floor(aiAnalysis.danger_score * 1.2), // severity slightly higher
                aiAnalysis.threat_signature
            );

            console.log(`   📤 Report transaction sent: ${reportTx.hash}`);
            console.log(`   ⏳ Waiting for confirmation...`);

            const receipt = await reportTx.wait();
            
            console.log(`   ✅ Threat logged on-chain!`);
            console.log(`   🧾 Block: ${receipt.blockNumber}`);
            console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}`);

            // Extract alert ID from event
            const event = receipt.logs[0];
            console.log(`   🆔 Alert ID: ${event.topics[1]}`);
        } else {
            console.log(`\n✅ Transaction appears safe - No on-chain alert needed`);
        }

        // 4. Optionally send actual transaction (for realism)
        // console.log(`\n📡 Broadcasting transaction to U2U Network...`);
        // const sentTx = await wallet.sendTransaction(tx);
        // console.log(`   Transaction sent: ${sentTx.hash}`);

        console.log(`\n✅ Scenario completed successfully!`);

        // Wait between scenarios for dramatic effect
        await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
        console.error(`\n❌ Error in scenario: ${error.message}`);
        if (error.data) {
            console.error(`   Reason: ${error.data}`);
        }
    }
}

async function runDemoSequence() {
    console.log(`\n${"#".repeat(70)}`);
    console.log(`#  🐺 CERBERUS WATCHDOG - DEMO SEQUENCE`);
    console.log(`#  Advanced AI-Powered Blockchain Threat Detection`);
    console.log(`${"#".repeat(70)}\n`);

    const provider = new ethers.JsonRpcProvider(U2U_RPC_HTTP);
    const wallet = new ethers.Wallet(DEMO_PRIVATE_KEY, provider);

    console.log(`🔧 Configuration:`);
    console.log(`   RPC Endpoint: ${U2U_RPC_HTTP}`);
    console.log(`   Wallet Address: ${wallet.address}`);
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    console.log(`   AI API: ${AI_API_URL}`);

    const balance = await provider.getBalance(wallet.address);
    console.log(`   Wallet Balance: ${ethers.formatEther(balance)} U2U`);

    if (balance < ethers.parseEther("0.1")) {
        console.error(`\n❌ Insufficient balance! Need at least 0.1 U2U for demo.`);
        console.log(`   Get testnet tokens: https://faucet.u2u.xyz`);
        return;
    }

    console.log(`\n🎬 Starting demo sequence with ${THREAT_SCENARIOS.length} scenarios...`);

    for (let i = 0; i < THREAT_SCENARIOS.length; i++) {
        await simulateScenario(provider, wallet, THREAT_SCENARIOS[i], i);
    }

    console.log(`\n${"#".repeat(70)}`);
    console.log(`#  ✅ DEMO SEQUENCE COMPLETE!`);
    console.log(`#  Check your frontend dashboard for live alerts`);
    console.log(`${"#".repeat(70)}\n`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runDemoSequence()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export { runDemoSequence, THREAT_SCENARIOS };