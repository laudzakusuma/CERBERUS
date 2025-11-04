const { ethers } = require('ethers');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config();

// ============================================
// KONFIGURASI
// ============================================
const CONFIG = {
    U2U_RPC_HTTP: process.env.U2U_RPC_HTTP || 'https://rpc-nebulas-testnet.uniultra.xyz',
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
    AI_API_URL: process.env.AI_API_URL || 'http://127.0.0.1:5001/predict',
    OWNER_PRIVATE_KEY: process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || process.env.MONITOR_PRIVATE_KEY, // Mencari kunci monitor
    POLLING_INTERVAL: 5000,
    BATCH_SIZE: 3,
    MIN_DANGER_SCORE: 70, // Hanya laporkan ancaman di atas skor ini
    ENABLE_BLOCKCHAIN_REPORTING: true,
};

// ============================================
// ABI KONTRAK (SUDAH DIUPDATE)
// ============================================
const CONTRACT_ABI = [
    // Fungsi untuk melaporkan ancaman
    "function reportThreat(bytes32 _txHash, address _flaggedAddress, uint8 _level, uint8 _category, uint256 _confidenceScore, bytes32 _modelHash) external",
    
    // ============================================
    // !! PERUBAHAN !!: Menambahkan fungsi baru untuk log transaksi aman
    // ============================================
    "function logBenignTransaction(bytes32 _txHash, address _from, address _to) external",

    // Fungsi View
    "function totalAlerts() external view returns (uint256)",
    "function authorizedReporters(address) external view returns (bool)",
    
    // Event
    "event ThreatReported(uint256 indexed alertId, bytes32 indexed txHash, address indexed flaggedAddress, uint8 level, uint8 category, uint256 confidenceScore, address reporter, uint256 timestamp, bytes32 modelHash)"
];

// ============================================
// ENUMS (sesuai kontrak)
// ============================================
const ThreatLevel = {
    INFO: 0,
    MEDIUM: 1,
    HIGH: 2,
    CRITICAL: 3
};

const ThreatCategory = {
    RUG_PULL: 0,
    FLASH_LOAN_ATTACK: 1,
    FRONT_RUNNING: 2,
    SMART_CONTRACT_EXPLOIT: 3,
    PHISHING_CONTRACT: 4,
    PRICE_MANIPULATION: 5,
    HONEY_POT: 6,
    GOVERNANCE_ATTACK: 7,
    MEV_ABUSE: 8
};

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    grey: '\x1b[90m' // Warna baru untuk log aman
};

// ============================================
// KELAS MONITOR UTAMA
// ============================================
class CerberusMonitorFinal {
    constructor() {
        this.stats = {
            startTime: Date.now(),
            totalAnalyzed: 0,
            threatsDetected: 0,
            benignLogged: 0, // Statistik baru
            onChainReports: 0,
            onChainSuccess: 0,
            alreadyReported: 0,
            errors: 0,
            lastBlock: 0,
            aiRequests: 0,
            aiErrors: 0,
        };
        
        this.processedTxs = new Set();
        this.reportedTxs = new Set();
        this.isRunning = false;
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    async initialize() {
        this.log('='.repeat(70), 'cyan');
        this.log('  🐺 CERBERUS MONITOR - VERSI UPDATE (Log Transaksi Aman)', 'bright');
        this.log('  ✅ Fungsi: reportThreat() (6 args) + logBenignTransaction() (3 args)', 'green');
        this.log('='.repeat(70), 'cyan');
        
        if (!CONFIG.CONTRACT_ADDRESS) {
            throw new Error('❌ Missing CONTRACT_ADDRESS in .env');
        }
        if (!CONFIG.OWNER_PRIVATE_KEY || CONFIG.OWNER_PRIVATE_KEY.includes('YOUR_')) {
            throw new Error('❌ Missing PRIVATE_KEY/MONITOR_PRIVATE_KEY in .env');
        }
        
        this.log('\n📡 Connecting to U2U Network...', 'cyan');
        this.provider = new ethers.JsonRpcProvider(CONFIG.U2U_RPC_HTTP);
        this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);
        this.contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, this.wallet);
        
        const [blockNumber, balance, contractCode] = await Promise.all([
            this.provider.getBlockNumber(),
            this.provider.getBalance(this.wallet.address),
            this.provider.getCode(CONFIG.CONTRACT_ADDRESS)
        ]);
        
        if (contractCode === '0x') {
            throw new Error(`❌ Contract not deployed at ${CONFIG.CONTRACT_ADDRESS}. Please deploy V4.`);
        }
        
        this.log('✅ Blockchain Connected', 'green');
        this.log(`📦 Current Block: ${blockNumber}`, 'blue');
        this.log(`💳 Wallet Monitor: ${this.wallet.address}`, 'blue');
        this.log(`💰 Balance: ${ethers.formatEther(balance)} U2U`, 'blue');
        this.log(`📜 Contract (V4): ${CONFIG.CONTRACT_ADDRESS}`, 'blue');
        
        try {
            const totalAlerts = await this.contract.totalAlerts();
            this.log(`📊 Total Alerts: ${totalAlerts}`, 'blue');
            
            const isAuthorized = await this.contract.authorizedReporters(this.wallet.address);
            if (!isAuthorized) {
                this.log(`❌ PERINGATAN: Wallet ${this.wallet.address} TIDAK diotorisasi!`, 'red');
                this.log(`   Jalankan 'node authorize-monitor.js' menggunakan kunci ADMIN Anda.`, 'yellow');
                throw new Error("Monitor wallet not authorized");
            }
            this.log(`🔐 Authorized: YES ✅`, 'green');

        } catch (error) {
            this.log(`❌ Gagal memeriksa kontrak. Pastikan ABI sudah benar dan Anda menggunakan alamat V4.`, 'red');
            throw error;
        }
        
        await this.testAIConnection();
        
        this.stats.lastBlock = blockNumber;
        this.setupEventListeners();
        
        this.log('\n' + '='.repeat(70), 'cyan');
        this.log('✅ INITIALIZATION COMPLETE', 'green');
        this.log('🔧 Using: reportThreat() AND logBenignTransaction()', 'yellow');
        this.log('='.repeat(70) + '\n', 'cyan');
    }

    async testAIConnection() {
        this.log('\n🤖 Testing AI Sentinel...', 'cyan');
        try {
            const response = await fetch(CONFIG.AI_API_URL.replace('/predict', '/'), { timeout: 5000 });
            if (response.ok) {
                this.log('✅ AI Sentinel: Online', 'green');
            } else {
                this.log('⚠️  AI Sentinel: Reachable but error', 'yellow');
            }
        } catch (error) {
            this.log('❌ AI Sentinel: Offline', 'red');
        }
    }

    setupEventListeners() {
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
        
        // (Kita bisa menambahkan listener untuk 'TransactionMonitored' di sini jika perlu)
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.log('🚀 Starting monitoring loop (Mode Log Transaksi Aman AKTIF)...\n', 'green');
        
        while (this.isRunning) {
            try {
                const currentBlock = await this.provider.getBlockNumber();
                
                if (currentBlock > this.stats.lastBlock) {
                    await this.processBlocks(this.stats.lastBlock + 1, currentBlock);
                    this.stats.lastBlock = currentBlock;
                    
                    if (currentBlock % 20 === 0) {
                        this.printStats();
                    }
                }
                
                await this.sleep(CONFIG.POLLING_INTERVAL);
                
            } catch (error) {
                this.log(`❌ Monitoring error: ${error.message}`, 'red');
                this.stats.errors++;
                await this.sleep(CONFIG.POLLING_INTERVAL * 2);
            }
        }
    }

    async processBlocks(startBlock, endBlock) {
        const blockCount = Math.min(endBlock - startBlock + 1, CONFIG.BATCH_SIZE);
        const lastBlockToProcess = startBlock + blockCount - 1;
        
        for (let blockNum = startBlock; blockNum <= lastBlockToProcess; blockNum++) {
            await this.processBlock(blockNum);
        }
    }

    async processBlock(blockNumber) {
        try {
            const block = await this.provider.getBlock(blockNumber, true);
            
            if (!block || !block.transactions || block.transactions.length === 0) {
                return;
            }
            
            const timestamp = new Date().toLocaleTimeString();
            this.log(`\n📦 Block ${blockNumber} | ${block.transactions.length} txs | ${timestamp}`, 'magenta');
            
            for (const txHash of block.transactions) {
                if (!this.processedTxs.has(txHash)) {
                    const tx = await this.provider.getTransaction(txHash);
                    if (tx) {
                        await this.analyzeTransaction(tx);
                        this.processedTxs.add(txHash);
                        this.stats.totalAnalyzed++;
                    }
                }
            }
            
        } catch (error) {
            this.log(`   Error processing block ${blockNumber}: ${error.message}`, 'red');
        }
    }

    async analyzeTransaction(tx) {
        if (!tx || !tx.hash) return;
        
        try {
            this.stats.aiRequests++;
            const analysis = await this.callAI(tx);
            
            if (!analysis) {
                this.log(`   ⚪ ${tx.hash.substring(0, 10)}... - AI unavailable`, 'dim');
                return;
            }
            
            // ============================================
            // !! LOGIKA UTAMA DIPERBARUI !!
            // ============================================
            if (analysis.is_malicious && analysis.danger_score >= CONFIG.MIN_DANGER_SCORE) {
                
                // --- INI LOGIKA ANCAMAN (SAMA SEPERTI SEBELUMNYA) ---
                this.stats.threatsDetected++;
                await this.handleThreat(tx, analysis);

            } else {
                
                // --- INI LOGIKA BARU UNTUK TRANSAKSI AMAN (METAMASK DLL) ---
                this.log(`   ✅ ${tx.hash.substring(0, 10)}... - Normal (Score: ${analysis.danger_score?.toFixed(0) || 'N/A'}). Logging...`, 'grey');
                await this.logBenignToBlockchain(tx);
            }
            
        } catch (error) {
            this.log(`   ❌ Error analyzing ${tx.hash.substring(0, 10)}: ${error.message}`, 'red');
        }
    }

    async callAI(tx) {
        try {
            const response = await fetch(CONFIG.AI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    value: tx.value ? tx.value.toString() : '0',
                    gasPrice: tx.gasPrice ? tx.gasPrice.toString() : '0',
                    gasLimit: tx.gasLimit ? tx.gasLimit.toString() : '0',
                    nonce: tx.nonce,
                    data: tx.data || '0x',
                }),
                timeout: 10000
            });
            
            if (!response.ok) {
                this.stats.aiErrors++;
                return null;
            }
            
            return await response.json();
            
        } catch (error) {
            this.stats.aiErrors++;
            return null;
        }
    }

    async handleThreat(tx, analysis) {
        this.log(`   🚨 THREAT DETECTED!`, 'red');
        this.log(`      Tx: ${tx.hash}`, 'yellow');
        this.log(`      From: ${tx.from}`, 'yellow');
        this.log(`      Danger Score: ${analysis.danger_score?.toFixed(2) || 'N/A'}`, 'yellow');
        this.log(`      Category: ${analysis.threat_category || 'UNKNOWN'}`, 'yellow');
        
        if (CONFIG.ENABLE_BLOCKCHAIN_REPORTING) {
            await this.reportToBlockchain(tx, analysis);
        } else {
            this.log(`      💾 Logged to memory (reporting disabled)`, 'dim');
        }
    }

    async reportToBlockchain(tx, analysis) {
        try {
            if (this.reportedTxs.has(tx.hash)) {
                this.log(`      ℹ️  Already reported this session`, 'dim');
                this.stats.alreadyReported++;
                return;
            }
            
            this.log(`      🔔 Sending on-chain alert...`, 'cyan');
            
            // Map threat level
            let threatLevel = ThreatLevel.MEDIUM;
            if (analysis.danger_score > 90) threatLevel = ThreatLevel.CRITICAL;
            else if (analysis.danger_score > 75) threatLevel = ThreatLevel.HIGH;
            
            // Map threat category
            const categoryMap = {
                'RUG_PULL': ThreatCategory.RUG_PULL,
                'FLASH_LOAN_ATTACK': ThreatCategory.FLASH_LOAN_ATTACK,
                'FRONT_RUNNING': ThreatCategory.FRONT_RUNNING,
                'SMART_CONTRACT_EXPLOIT': ThreatCategory.SMART_CONTRACT_EXPLOIT,
                'PHISHING_CONTRACT': ThreatCategory.PHISHING_CONTRACT,
                'PRICE_MANIPULATION': ThreatCategory.PRICE_MANIPULATION,
                'HONEY_POT': ThreatCategory.HONEY_POT,
                'GOVERNANCE_ATTACK': ThreatCategory.GOVERNANCE_ATTACK,
                'MEV_ABUSE': ThreatCategory.MEV_ABUSE,
            };
            let threatCategory = categoryMap[analysis.threat_category] ?? ThreatCategory.MEV_ABUSE;
            
            // Create model hash (string pendek < 32 byte)
            const modelHash = ethers.utils.formatBytes32String("model_v1.0");
            
            // Confidence score (0-100)
            const confidenceScore = Math.floor(analysis.danger_score || 70);
            
            // Panggil reportThreat dengan 6 argumen
            const alertTx = await this.contract.reportThreat(
                tx.hash,                  // bytes32 _txHash
                tx.from,                  // address _flaggedAddress
                threatLevel,              // uint8 _level (ENUM)
                threatCategory,           // uint8 _category (ENUM)
                confidenceScore,          // uint256 _confidenceScore
                modelHash,                // bytes32 _modelHash
                {
                    gasLimit: 500000,
                    gasPrice: ethers.utils.parseUnits('20', 'gwei')
                }
            );
            
            this.stats.onChainReports++;
            this.log(`      📤 Alert tx sent: ${alertTx.hash}`, 'cyan');
            this.log(`      ⏳ Waiting for confirmation...`, 'dim');
            
            const receipt = await alertTx.wait();
            
            if (receipt.status === 1) {
                this.stats.onChainSuccess++;
                this.reportedTxs.add(tx.hash);
                this.log(`      ✅ Confirmed on-chain! Block: ${receipt.blockNumber}`, 'green');
                this.log(`      🎉 Threat permanently recorded!`, 'green');
            } else {
                this.log(`      ❌ Transaction reverted`, 'red');
            }
            
        } catch (error) {
            this.log(`      ❌ On-chain error (reportThreat): ${error.message}`, 'red');
            if (error.message.includes('Alert exists')) {
                this.reportedTxs.add(tx.hash);
                this.stats.alreadyReported++;
            }
        }
    }

    // ============================================
    // !! FUNGSI BARU !!
    // ============================================
    async logBenignToBlockchain(tx) {
        try {
            if (!CONFIG.ENABLE_BLOCKCHAIN_REPORTING) return;
            if (this.reportedTxs.has(tx.hash)) return; // Jangan log jika sudah dilaporkan

            this.log(`      ✍️  Logging benign tx to contract...`, 'grey');
            
            const logTx = await this.contract.logBenignTransaction(
                tx.hash,
                tx.from,
                tx.to || '0x0000000000000000000000000000000000000000',
                {
                    gasLimit: 150000, // Gas lebih rendah untuk logging
                    gasPrice: ethers.utils.parseUnits('10', 'gwei') // Gas price lebih rendah
                }
            );
            
            this.stats.benignLogged++; // Tambah statistik baru
            this.reportedTxs.add(tx.hash); // Tandai agar tidak diproses ganda
            
            this.log(`      📤 Log tx sent: ${logTx.hash}`, 'grey');
            
            // Kita tidak perlu 'await' konfirmasi agar monitor tidak lambat
            // await logTx.wait(); 
            // this.log(`      ... Log confirmed.`, 'dim');

        } catch (error) {
            this.log(`      ❌ On-chain error (logBenign): ${error.message}`, 'yellow');
        }
    }

    printStats() {
        const runtime = Math.floor((Date.now() - this.stats.startTime) / 1000);
        const runtimeStr = `${Math.floor(runtime / 60)}m ${runtime % 60}s`;
        
        this.log('\n' + '='.repeat(70), 'cyan');
        this.log('📊 CERBERUS STATISTICS', 'bright');
        this.log('='.repeat(70), 'cyan');
        this.log(`⏱️  Runtime: ${runtimeStr}`, 'blue');
        this.log(`📦 Blocks Processed: ${this.stats.lastBlock}`, 'blue');
        this.log(`🔍 Transactions Analyzed: ${this.stats.totalAnalyzed}`, 'blue');
        this.log(`🚨 Threats Detected: ${this.stats.threatsDetected}`, 'red');
        this.log(`✍️  Benign Logged: ${this.stats.benignLogged}`, 'grey'); // Statistik baru
        this.log(`📝 On-Chain Reports: ${this.stats.onChainReports}`, 'yellow');
        this.log(`✅ On-Chain Success: ${this.stats.onChainSuccess}`, 'green');
        this.log(`♻️  Already Reported: ${this.stats.alreadyReported}`, 'dim');
        this.log(`🤖 AI Requests: ${this.stats.aiRequests} (errors: ${this.stats.aiErrors})`, 'blue');
        this.log(`❌ Errors: ${this.stats.errors}`, 'yellow');
        this.log('='.repeat(70) + '\n', 'cyan');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async shutdown() {
        this.log('\n\n🛑 Shutting down gracefully...', 'yellow');
        this.isRunning = false;
        
        // Hapus listener untuk mencegah error
        if (this.contract) {
            this.contract.removeAllListeners();
        }
        
        this.printStats();
        
        this.log('✨ CERBERUS MONITOR STOPPED', 'green');
        this.log(`📊 Final Results:`, 'cyan');
        this.log(`   Threats Detected: ${this.stats.threatsDetected}`, 'cyan');
        this.log(`   On-Chain Success: ${this.stats.onChainSuccess}`, 'cyan');
        this.log(`   Transactions Analyzed: ${this.stats.totalAnalyzed}`, 'cyan');
        this.log('\n👋 Goodbye!\n', 'cyan');
        
        process.exit(0);
    }
}

// ============================================
// EKSEKUSI UTAMA
// ============================================
async function main() {
    console.log(`${colors.green}🚀 Starting Cerberus Monitor (FINAL CORRECT VERSION)...${colors.reset}\n`);
    
    const monitor = new CerberusMonitorFinal();
    
    try {
        await monitor.initialize();
        await monitor.start();
    } catch (error) {
        console.error(`${colors.red}❌ Fatal error: ${error.message}${colors.reset}`);
        console.error(error.stack);
        process.exit(1);
    }
}

// Cek apakah file dijalankan langsung
if (require.main === module) {
    main();
}

module.exports = { CerberusMonitorFinal };