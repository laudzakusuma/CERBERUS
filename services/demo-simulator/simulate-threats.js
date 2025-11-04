// simulate-threats.js
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

if (!U2U_RPC_HTTP || !DEMO_PRIVATE_KEY || !CONTRACT_ADDRESS || !AI_API_URL) {
    console.error('❌ Missing required environment variables. Please set U2U_RPC_HTTP, DEMO_PRIVATE_KEY, CONTRACT_ADDRESS, and AI_API_URL');
    process.exit(1);
}

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
        to: "0x0000000000000000000000000000000000000000", // Contract creation (example)
        data: "0x608060405234801561001057600080fd5b50", // Contract bytecode (example)
        expectedCategory: "FLASH_LOAN_ATTACK",
        expectedThreatLevel: "CRITICAL"
    },
    {
        name: "🍯 Honeypot Contract",
        gasPrice: ethers.parseUnits("30", "gwei"),
        value: ethers.parseEther("0.1"),
        to: null, // Contract creation
        data: "0x6080604052" + "dead".repeat(100), // Suspicious bytecode pattern
        expectedCategory: "HONEY_POT",
        expectedThreatLevel: "MEDIUM"
    },
    {
        name: "🏃 Rug Pull Scenario",
        gasPrice: ethers.parseUnits("80", "gwei"),
        value: ethers.parseEther("25.0"),
        to: "0x1234567890123456789012345678901234567890",
        data: "0xa9059cbb", // Transfer function selector
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
        // 1. Create transaction object with BigInts
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

        // =================================================================
        // Buat objek yang aman untuk JSON (string)
        // Ini untuk memperbaiki error "Do not know how to serialize a BigInt"
        // =================================================================
        const serializableTx = {
            to: tx.to,
            value: tx.value.toString(),
            gasPrice: tx.gasPrice.toString(),
            gasLimit: tx.gasLimit.toString(),
            data: tx.data,
            nonce: tx.nonce.toString()
        };

        // 2. Send to AI for analysis (before sending to blockchain)
        console.log(`\n🤖 Sending to AI Sentinel for analysis...`);

        const aiPayload = {
            hash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(serializableTx))),
            from: wallet.address,
            to: serializableTx.to,
            value: serializableTx.value,
            gasPrice: serializableTx.gasPrice,
            gasLimit: serializableTx.gasLimit,
            data: serializableTx.data,
            nonce: serializableTx.nonce
        };

        const aiResponse = await fetch(AI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiPayload)
        });

        // defensive parsing
        let aiAnalysis;
        try {
            aiAnalysis = await aiResponse.json();
        } catch (err) {
            console.error('❌ Failed to parse AI response as JSON:', err);
            aiAnalysis = {};
        }

        // default safe values to avoid crashes
        const dangerScore = typeof aiAnalysis.danger_score === 'number' ? aiAnalysis.danger_score : (aiAnalysis.danger_score ? Number(aiAnalysis.danger_score) : 0);
        const threatCategory = aiAnalysis.threat_category || 'UNKNOWN';
        const isMalicious = !!aiAnalysis.is_malicious;
        const threatLevel = aiAnalysis.threat_level || 'UNKNOWN';

        console.log(`\n📊 AI Analysis Results:`);
        console.log(`   Danger Score: ${Number(dangerScore).toFixed(2)}/100`);
        console.log(`   Category: ${threatCategory}`);
        console.log(`   Is Malicious: ${isMalicious ? '🚨 YES' : '✅ NO'}`);
        console.log(`   Threat Level: ${threatLevel}`);

        // 3. If malicious, report to smart contract
        if (isMalicious) {
            console.log(`\n🚨 THREAT DETECTED! Reporting to blockchain (Versi 6 Argumen)...`);

            // ABI yang BENAR dari CerberusAlerts.sol (example single function signature)
            const contractABI = [
                "function reportThreat(bytes32 _txHash, address _flaggedAddress, uint8 _level, uint8 _category, uint256 _confidenceScore, bytes32 _modelHash) external"
            ];

            const cerberusContract = new ethers.Contract(
                CONTRACT_ADDRESS,
                contractABI,
                wallet
            );

            // Map Kategori Ancaman (sesuai Enum di CerberusAlerts.sol)
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
                'NORMAL': 9,
                'UNKNOWN': 255
            };

            // Map Level Ancaman: if your AI returns strings like "CRITICAL", map accordingly
            const levelMapStr = {
                'INFO': 0,
                'MEDIUM': 1,
                'HIGH': 2,
                'CRITICAL': 3
            };

            // support both numeric or string threat_level
            let levelEnum = 2;
            if (typeof aiAnalysis.threat_level === 'number') {
                levelEnum = aiAnalysis.threat_level;
            } else {
                levelEnum = levelMapStr[(aiAnalysis.threat_level || '').toUpperCase()] ?? 2;
            }

            const categoryEnum = categoryMap[(threatCategory || '').toUpperCase()] ?? 2; // default FRONT_RUNNING

            // ensure modelHash is bytes32 sized; using encodeBytes32String (ethers v6 helper)
            const modelHash = (aiAnalysis.threat_signature)
                ? ethers.encodeBytes32String(String(aiAnalysis.threat_signature).slice(0, 32))
                : ethers.encodeBytes32String("default_model");

            console.log(`   Mengirim Kategori: ${categoryEnum} (Level: ${levelEnum})`);

            // call reportThreat
            const reportTx = await cerberusContract.reportThreat(
                aiPayload.hash,
                wallet.address, // flaggedAddress
                levelEnum, // _level (enum uint8)
                categoryEnum, // _category (enum uint8)
                Math.floor(Number(dangerScore)), // _confidenceScore
                modelHash // _modelHash (bytes32)
            );

            console.log(`   📤 Report transaction sent: ${reportTx.hash}`);
            console.log(`   ⏳ Waiting for confirmation...`);

            const receipt = await reportTx.wait();

            console.log(`   ✅ Threat logged on-chain!`);
            console.log(`   🧾 Block: ${receipt.blockNumber}`);
        } else {
            console.log(`\n✅ Transaction appears safe - No on-chain alert needed`);
        }

        console.log(`\n✅ Scenario completed successfully!`);

        // Wait between scenarios
        await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
        console.error(`\n❌ Error in scenario: ${error && error.message ? error.message : error}`);
        if (error && error.data) {
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

// Run
runDemoSequence()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

export { runDemoSequence, THREAT_SCENARIOS };
