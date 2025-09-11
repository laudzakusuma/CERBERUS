const { ethers } = require('ethers');
const fetch = require('node-fetch');

// Configuration
const U2U_RPC_WSS = 'wss://rpc-nebulas-testnet.uniultra.xyz';
const U2U_RPC_HTTP = 'https://rpc-nebulas-testnet.uniultra.xyz';
const AI_API_URL = 'http://127.0.0.1:5001/predict';
const MONITOR_PRIVATE_KEY = 'a29a6848264f0ae2e5c34ad0858cb6b4aae9355190919b765622b566c7fa808b';
const CONTRACT_ADDRESS = '0xC65f3ec1e0a6853d2e6267CB918E683BA7E4f36c';

console.log('🐕 Cerberus Watchdog Starting...');
console.log('📡 HTTP RPC:', U2U_RPC_HTTP);
console.log('🤖 AI API:', AI_API_URL);
console.log('📝 Contract:', CONTRACT_ADDRESS);

// Contract ABI
const contractABI = [
    "function reportThreat(bytes32 _txHash, address _flaggedAddress, uint8 _level, uint8 _category, uint256 _confidenceScore, string memory _description, bytes32 _modelHash) payable",
    "event ThreatReported(uint256 indexed alertId, bytes32 indexed txHash, address indexed flaggedAddress, uint8 level, uint8 category, uint256 confidenceScore, address reporter, uint256 timestamp, bytes32 modelHash)"
];

let processedTxs = new Set();

async function testAIConnection() {
    try {
        console.log('🧪 Testing AI service...');
        const response = await fetch(AI_API_URL.replace('/predict', '/'));
        const data = await response.json();
        console.log('✅ AI Service:', data.status, '| Version:', data.version);
        return true;
    } catch (error) {
        console.error('❌ AI Service connection failed:', error.message);
        return false;
    }
}

async function pollForNewTransactions(provider, contract) {
    console.log('🔄 Starting HTTP polling for new transactions...');
    
    let lastBlockNumber = await provider.getBlockNumber();
    console.log('📊 Starting from block:', lastBlockNumber);

    setInterval(async () => {
        try {
            const currentBlock = await provider.getBlockNumber();
            
            if (currentBlock > lastBlockNumber) {
                console.log(`🆕 New block detected: ${currentBlock}`);
                
                // Get transactions from recent blocks
                for (let blockNum = lastBlockNumber + 1; blockNum <= currentBlock; blockNum++) {
                    console.log(`📦 Fetching block ${blockNum}...`);
                    
                    try {
                        // Method 1: Get block with transaction objects
                        const block = await provider.getBlock(blockNum, true);
                        
                        if (block && block.transactions && block.transactions.length > 0) {
                            console.log(`   Found ${block.transactions.length} transactions in block ${blockNum}`);
                            
                            for (const tx of block.transactions) {
                                // Check if tx is a hash string or transaction object
                                let fullTx;
                                if (typeof tx === 'string') {
                                    console.log(`   Fetching full tx data for hash: ${tx}`);
                                    fullTx = await provider.getTransaction(tx);
                                } else {
                                    fullTx = tx;
                                }
                                
                                if (fullTx && fullTx.hash && !processedTxs.has(fullTx.hash)) {
                                    console.log(`   Processing tx: ${fullTx.hash}`);
                                    await analyzeTransaction(fullTx, contract);
                                    processedTxs.add(fullTx.hash);
                                } else if (fullTx && fullTx.hash) {
                                    console.log(`   Skipping already processed tx: ${fullTx.hash}`);
                                } else {
                                    console.log(`   Invalid tx data:`, fullTx);
                                }
                            }
                        } else {
                            console.log(`   Block ${blockNum} has no transactions`);
                        }
                    } catch (blockError) {
                        console.error(`   Error fetching block ${blockNum}:`, blockError.message);
                    }
                }
                
                lastBlockNumber = currentBlock;
            }
        } catch (error) {
            console.error('⚠️ Polling error:', error.message);
        }
    }, 5000);
}

async function analyzeTransaction(tx, contract) {
    try {
        // Check if tx is valid
        if (!tx || !tx.hash) {
            return;
        }

        // Skip very small transactions
        const valueEth = parseFloat(ethers.formatEther(tx.value || 0));

        console.log(`🔍 Analyzing: ${tx.hash.substring(0, 10)}... | Value: ${valueEth.toFixed(4)} U2U`);

        // Prepare transaction data for AI
        const txData = {
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value ? tx.value.toString() : '0',
            gasPrice: tx.gasPrice ? tx.gasPrice.toString() : '0',
            gasLimit: tx.gasLimit ? tx.gasLimit.toString() : '0',
            data: tx.data || '0x'
        };

        // Send to AI for analysis
        const aiResponse = await fetch(AI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(txData),
            timeout: 10000
        });

        const analysis = await aiResponse.json();
        
        console.log(`📊 Danger: ${analysis.danger_score?.toFixed(1)} | Category: ${analysis.threat_category} | Malicious: ${analysis.is_malicious}`);

        // Report if malicious
        if (analysis.is_malicious && analysis.confidence > 60) {
            console.log('🚨 THREAT DETECTED! Reporting to blockchain...');
            
            const categoryMap = {
                'UNKNOWN': 0, 'RUG_PULL': 1, 'FLASH_LOAN_ATTACK': 2,
                'FRONT_RUNNING': 3, 'MEV_ABUSE': 4, 'PRICE_MANIPULATION': 5,
                'SMART_CONTRACT_EXPLOIT': 6, 'PHISHING_CONTRACT': 7,
                'HONEY_POT': 8, 'GOVERNANCE_ATTACK': 9
            };

            const categoryValue = categoryMap[analysis.threat_category] || 0;
            const modelHash = ethers.keccak256(ethers.toUtf8Bytes("cerberus-ai-v1.0.0"));
            const stakeAmount = ethers.parseEther("0.01");

            // Debug parameter values
            console.log('🔧 Debug parameters:');
            console.log('   Threat Level:', Math.min(analysis.threat_level || 1, 4));
            console.log('   Category:', categoryValue);
            console.log('   Confidence:', Math.min(Math.floor(analysis.confidence), 100));
            console.log('   Signature length:', analysis.threat_signature.length);

            try {
                // Estimate gas first
                const gasEstimate = await contract.reportThreat.estimateGas(
                    tx.hash,
                    tx.from,
                    Math.min(analysis.threat_level || 1, 4),
                    categoryValue,
                    Math.min(Math.floor(analysis.confidence), 100),
                    analysis.threat_signature.substring(0, 50), // Shortened description
                    modelHash,
                    { value: stakeAmount }
                );

                console.log('⛽ Gas estimate:', gasEstimate.toString());

                const reportTx = await contract.reportThreat(
                    tx.hash,
                    tx.from,
                    Math.min(analysis.threat_level || 1, 4),
                    categoryValue,
                    Math.min(Math.floor(analysis.confidence), 100),
                    analysis.threat_signature.substring(0, 50),
                    modelHash,
                    { 
                        value: stakeAmount, 
                        gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
                        gasPrice: ethers.parseUnits("10", "gwei") // Lower gas price
                    }
                );

                console.log(`📤 Report sent! Tx: ${reportTx.hash}`);
                
                const receipt = await reportTx.wait();
                console.log(`✅ Confirmed on block: ${receipt.blockNumber}`);

            } catch (error) {
                if (error.message.includes('already reported') || error.message.includes('already exists')) {
                    console.log('⚠️ Already reported');
                } else if (error.message.includes('revert')) {
                    console.error('❌ Contract revert. Possible causes:');
                    console.error('   - Transaction already flagged');
                    console.error('   - Invalid parameters');
                    console.error('   - Model hash mismatch');
                    console.error('   Full error:', error.message);
                } else {
                    console.error('❌ Report failed:', error.message);
                }
            }
        }
        
    } catch (error) {
        console.error(`⚠️ Analysis error:`, error.message);
    }
}

async function main() {
    // Test AI connection
    const aiOk = await testAIConnection();
    if (!aiOk) {
        console.log('💡 Make sure AI service is running: python app.py');
        process.exit(1);
    }

    // Setup providers and wallet (HTTP only)
    const httpProvider = new ethers.JsonRpcProvider(U2U_RPC_HTTP);
    const wallet = new ethers.Wallet(MONITOR_PRIVATE_KEY, httpProvider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

    console.log('👤 Monitor wallet:', wallet.address);
    
    // Check balance
    const balance = await wallet.provider.getBalance(wallet.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'U2U');

    if (balance < ethers.parseEther("0.01")) {
        console.warn('⚠️ Low balance! Need at least 0.01 U2U for staking');
    }

    // Listen for contract events
    contract.on('ThreatReported', (alertId, txHash, flaggedAddress, level, category) => {
        console.log(`\n🔔 ALERT CONFIRMED ON-CHAIN`);
        console.log(`Alert ID: ${alertId}`);
        console.log(`Tx: ${txHash}`);
        console.log(`Address: ${flaggedAddress}`);
        console.log(`Level: ${level}\n`);
    });

    // Start polling for transactions
    await pollForNewTransactions(httpProvider, contract);
}

main().catch(console.error);