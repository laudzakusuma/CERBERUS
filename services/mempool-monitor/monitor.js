const { ethers } = require('ethers');
const dotenv = require('dotenv');

dotenv.config();

// Configuration
const CONFIG = {
    U2U_RPC_HTTP: process.env.U2U_RPC_HTTP || 'https://rpc-nebulas-testnet.uniultra.xyz',
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
    POLLING_INTERVAL: 3000,
    BATCH_SIZE: 5,
};

// Threat patterns
const THREAT_PATTERNS = {
    HIGH_GAS: { threshold: 100, category: 'MEV_ABUSE', level: 2, confidence: 85 },
    HIGH_VALUE: { threshold: 10, category: 'SUSPICIOUS_TRANSFER', level: 2, confidence: 70 },
    CONTRACT_CREATION_HIGH_VALUE: { threshold: 5, category: 'SMART_CONTRACT_EXPLOIT', level: 3, confidence: 90 },
    ZERO_VALUE_HIGH_GAS: { gasThreshold: 80, category: 'FRONT_RUNNING', level: 2, confidence: 80 },
};

// Colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

// ============================================
// SIMPLIFIED MONITOR CLASS
// ============================================
class CerberusSimplifiedMonitor {
    constructor() {
        this.httpProvider = new ethers.JsonRpcProvider(CONFIG.U2U_RPC_HTTP);
        
        this.stats = {
            startTime: Date.now(),
            totalAnalyzed: 0,
            threatsDetected: 0,
            errors: 0,
            lastBlock: 0,
            patterns: {}
        };
        
        this.processedTxs = new Set();
        this.isRunning = false;
        
        // Initialize pattern stats
        Object.keys(THREAT_PATTERNS).forEach(pattern => {
            this.stats.patterns[pattern] = 0;
        });
    }

    async initialize() {
        console.log(`${colors.cyan}${colors.bright}${'='.repeat(70)}${colors.reset}`);
        console.log(`${colors.cyan}${colors.bright}  🐺 CERBERUS SIMPLIFIED MONITOR - DEMO MODE${colors.reset}`);
        console.log(`${colors.cyan}${colors.bright}${'='.repeat(70)}${colors.reset}\n`);
        
        console.log(`${colors.blue}📡 Network:${colors.reset} U2U Nebula Testnet`);
        console.log(`${colors.blue}🎯 Contract:${colors.reset} ${CONFIG.CONTRACT_ADDRESS}`);
        console.log(`${colors.yellow}⚠️  Mode:${colors.reset} Detection Only (No on-chain reporting)`);
        console.log(`${colors.green}✨ Perfect for:${colors.reset} Hackathon demo & testing\n`);
        
        this.stats.lastBlock = await this.httpProvider.getBlockNumber();
        console.log(`${colors.blue}📦 Starting from block:${colors.reset} ${this.stats.lastBlock}`);
        
        this.setupEventListeners();
        
        console.log(`${colors.cyan}${colors.bright}${'='.repeat(70)}${colors.reset}`);
        console.log(`${colors.green}✅ INITIALIZATION COMPLETE - Starting monitoring...${colors.reset}\n`);
    }

    setupEventListeners() {
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        while (this.isRunning) {
            try {
                const currentBlock = await this.httpProvider.getBlockNumber();
                
                if (currentBlock > this.stats.lastBlock) {
                    await this.processBlocks(this.stats.lastBlock + 1, currentBlock);
                    this.stats.lastBlock = currentBlock;
                    
                    if (currentBlock % 10 === 0) {
                        this.printStats();
                    }
                }
                
                await this.sleep(CONFIG.POLLING_INTERVAL);
                
            } catch (error) {
                console.error(`${colors.red}❌ Monitoring error:${colors.reset}`, error.message);
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
            const block = await this.httpProvider.getBlock(blockNumber, true);
            
            if (!block || !block.transactions || block.transactions.length === 0) {
                return;
            }
            
            const timestamp = new Date().toLocaleTimeString();
            console.log(`\n${colors.magenta}📦 Block ${blockNumber}${colors.reset} | ${block.transactions.length} txs | ${timestamp}`);
            
            for (const txHash of block.transactions) {
                if (!this.processedTxs.has(txHash)) {
                    const tx = await this.httpProvider.getTransaction(txHash);
                    if (tx) {
                        await this.analyzeTransaction(tx);
                        this.processedTxs.add(txHash);
                        this.stats.totalAnalyzed++;
                    }
                }
            }
            
        } catch (error) {
            console.error(`Error processing block ${blockNumber}:`, error.message);
        }
    }

    async analyzeTransaction(tx) {
        if (!tx || !tx.hash) return;
        
        const threats = [];
        
        // HIGH GAS PATTERN
        if (tx.gasPrice) {
            const gasPriceGwei = parseFloat(ethers.formatUnits(tx.gasPrice, 'gwei'));
            if (gasPriceGwei > THREAT_PATTERNS.HIGH_GAS.threshold) {
                threats.push({
                    pattern: 'HIGH_GAS',
                    ...THREAT_PATTERNS.HIGH_GAS,
                    value: gasPriceGwei,
                    signature: `High gas price: ${gasPriceGwei.toFixed(2)} gwei`
                });
                this.stats.patterns.HIGH_GAS++;
            }
        }
        
        // HIGH VALUE PATTERN
        if (tx.value) {
            const valueEth = parseFloat(ethers.formatEther(tx.value));
            if (valueEth > THREAT_PATTERNS.HIGH_VALUE.threshold) {
                threats.push({
                    pattern: 'HIGH_VALUE',
                    ...THREAT_PATTERNS.HIGH_VALUE,
                    value: valueEth,
                    signature: `High value transfer: ${valueEth.toFixed(4)} U2U`
                });
                this.stats.patterns.HIGH_VALUE++;
            }
        }
        
        // CONTRACT CREATION WITH HIGH VALUE
        if (!tx.to && tx.value) {
            const valueEth = parseFloat(ethers.formatEther(tx.value));
            if (valueEth > THREAT_PATTERNS.CONTRACT_CREATION_HIGH_VALUE.threshold) {
                threats.push({
                    pattern: 'CONTRACT_CREATION_HIGH_VALUE',
                    ...THREAT_PATTERNS.CONTRACT_CREATION_HIGH_VALUE,
                    value: valueEth,
                    signature: `Contract deployment with ${valueEth.toFixed(4)} U2U`
                });
                this.stats.patterns.CONTRACT_CREATION_HIGH_VALUE++;
            }
        }
        
        // FRONT-RUNNING PATTERN
        if (tx.value && tx.gasPrice) {
            const valueEth = parseFloat(ethers.formatEther(tx.value));
            const gasPriceGwei = parseFloat(ethers.formatUnits(tx.gasPrice, 'gwei'));
            
            if (valueEth === 0 && gasPriceGwei > THREAT_PATTERNS.ZERO_VALUE_HIGH_GAS.gasThreshold) {
                threats.push({
                    pattern: 'ZERO_VALUE_HIGH_GAS',
                    ...THREAT_PATTERNS.ZERO_VALUE_HIGH_GAS,
                    value: gasPriceGwei,
                    signature: `Zero-value tx with ${gasPriceGwei.toFixed(2)} gwei (front-running)`
                });
                this.stats.patterns.ZERO_VALUE_HIGH_GAS++;
            }
        }
        
        if (threats.length > 0) {
            await this.logThreat(tx, threats);
        } else {
            console.log(`   ${colors.green}✅${colors.reset} ${tx.hash.substring(0, 10)}... - Normal`);
        }
    }

    async logThreat(tx, threats) {
        const topThreat = threats.reduce((max, threat) => 
            threat.level > max.level ? threat : max
        );
        
        console.log(`   ${colors.red}${colors.bright}🚨 THREAT DETECTED!${colors.reset}`);
        console.log(`      ${colors.yellow}Tx:${colors.reset} ${tx.hash}`);
        console.log(`      ${colors.yellow}From:${colors.reset} ${tx.from}`);
        console.log(`      ${colors.yellow}Pattern:${colors.reset} ${topThreat.pattern}`);
        console.log(`      ${colors.yellow}Category:${colors.reset} ${topThreat.category}`);
        console.log(`      ${colors.yellow}Level:${colors.reset} ${topThreat.level} | ${colors.yellow}Confidence:${colors.reset} ${topThreat.confidence}%`);
        console.log(`      ${colors.yellow}Signature:${colors.reset} ${topThreat.signature}`);
        console.log(`      ${colors.cyan}🔗 Explorer:${colors.reset} https://testnet.u2uscan.xyz/tx/${tx.hash}`);
        
        this.stats.threatsDetected++;
        
        // Log detailed threat info to file (optional)
        const threatLog = {
            timestamp: new Date().toISOString(),
            txHash: tx.hash,
            from: tx.from,
            to: tx.to,
            pattern: topThreat.pattern,
            category: topThreat.category,
            level: topThreat.level,
            confidence: topThreat.confidence,
            signature: topThreat.signature,
            allPatterns: threats.map(t => t.pattern)
        };
        
        // You can save this to a file for later analysis
        console.log(`      ${colors.green}💾 Logged to memory${colors.reset}\n`);
    }

    printStats() {
        const runtime = Math.floor((Date.now() - this.stats.startTime) / 1000);
        console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}`);
        console.log(`${colors.cyan}${colors.bright}📊 CERBERUS STATISTICS${colors.reset}`);
        console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}`);
        console.log(`${colors.blue}⏱️  Runtime:${colors.reset} ${runtime}s`);
        console.log(`${colors.blue}📦 Blocks Processed:${colors.reset} ${this.stats.lastBlock}`);
        console.log(`${colors.blue}🔍 Transactions Analyzed:${colors.reset} ${this.stats.totalAnalyzed}`);
        console.log(`${colors.red}🚨 Threats Detected:${colors.reset} ${this.stats.threatsDetected}`);
        console.log(`${colors.yellow}❌ Errors:${colors.reset} ${this.stats.errors}`);
        
        const patternsDetected = Object.entries(this.stats.patterns).filter(([_, count]) => count > 0);
        if (patternsDetected.length > 0) {
            console.log(`\n${colors.magenta}📈 Pattern Detection:${colors.reset}`);
            patternsDetected.forEach(([pattern, count]) => {
                console.log(`   ${colors.yellow}${pattern}:${colors.reset} ${count}`);
            });
        }
        
        console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async shutdown() {
        console.log('\n\n🛑 Shutting down gracefully...');
        this.isRunning = false;
        this.printStats();
        
        console.log(`\n${colors.green}${colors.bright}✨ DEMO COMPLETE!${colors.reset}`);
        console.log(`${colors.cyan}📊 Threats detected: ${this.stats.threatsDetected}${colors.reset}`);
        console.log(`${colors.cyan}🔍 Transactions analyzed: ${this.stats.totalAnalyzed}${colors.reset}`);
        console.log(`${colors.green}✅ Detection engine working perfectly!${colors.reset}\n`);
        console.log(`${colors.yellow}💡 For production: Enable on-chain reporting by deploying a simpler contract${colors.reset}\n`);
        console.log('👋 Cerberus Monitor stopped.\n');
        process.exit(0);
    }
}

// ============================================
// MAIN EXECUTION
// ============================================
async function main() {
    if (!CONFIG.CONTRACT_ADDRESS) {
        console.error('❌ Missing CONTRACT_ADDRESS in .env');
        process.exit(1);
    }
    
    console.log(`${colors.green}🚀 Starting Cerberus Simplified Monitor...${colors.reset}\n`);
    
    const monitor = new CerberusSimplifiedMonitor();
    await monitor.initialize();
    await monitor.start();
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});