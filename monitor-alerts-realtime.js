/**
 * CERBERUS REAL-TIME ALERT MONITOR
 * =================================
 * Monitor ini mendengarkan event ThreatReported dari smart contract
 * dan menampilkan alert secara real-time dengan format yang indah
 */

const { ethers } = require('ethers');
require('dotenv').config();

// Konfigurasi
const CONFIG = {
    rpcWss: process.env.U2U_RPC_WSS || 'wss://rpc-nebulas-testnet.uniultra.xyz',
    rpcHttp: process.env.U2U_RPC_HTTP || 'https://rpc-nebulas-testnet.uniultra.xyz',
    contractAddress: process.env.CONTRACT_ADDRESS || '0xC65f3ec1e0a6853d2e6267CB918E683BA7E4f36c',
};

// Colors
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
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgYellow: '\x1b[43m',
    bgGreen: '\x1b[42m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator(char = '=', color = 'cyan') {
    log(char.repeat(70), color);
}

// Threat level mapping
const THREAT_LEVELS = {
    0: { name: 'INFO', color: 'blue', emoji: 'ℹ️', bg: '' },
    1: { name: 'MEDIUM', color: 'yellow', emoji: '⚠️', bg: '' },
    2: { name: 'HIGH', color: 'yellow', emoji: '🔥', bg: 'bgYellow' },
    3: { name: 'CRITICAL', color: 'red', emoji: '🚨', bg: 'bgRed' },
};

// Threat category mapping
const THREAT_CATEGORIES = {
    0: 'RUG_PULL',
    1: 'FLASH_LOAN_ATTACK',
    2: 'FRONT_RUNNING',
    3: 'SMART_CONTRACT_EXPLOIT',
    4: 'PHISHING_CONTRACT',
    5: 'PRICE_MANIPULATION',
    6: 'HONEY_POT',
    7: 'GOVERNANCE_ATTACK',
    8: 'MEV_ABUSE',
    9: 'SUSPICIOUS_ACTIVITY',
};

// Display alert in beautiful format
function displayAlert(alertData) {
    const level = THREAT_LEVELS[Number(alertData.level)] || THREAT_LEVELS[1];
    const category = THREAT_CATEGORIES[Number(alertData.category)] || 'UNKNOWN';
    
    separator('━', level.color);
    log(`\n${level.emoji}  NEW THREAT DETECTED - ${level.name}  ${level.emoji}`, 'bright');
    separator('━', level.color);
    
    // Main details
    log(`\n📍 Alert ID: ${alertData.alertId.toString()}`, 'cyan');
    log(`🔗 Transaction Hash:`, 'dim');
    log(`   ${alertData.txHash}`, 'white');
    log(`👤 Flagged Address:`, 'dim');
    log(`   ${alertData.flaggedAddress}`, 'white');
    
    // Threat info
    log(`\n🎯 Threat Category: ${category}`, level.color);
    log(`📊 Confidence Score: ${alertData.confidenceScore}%`, 'cyan');
    log(`⚡ Severity: ${level.name}`, level.color);
    
    // Reporter and time
    log(`\n👮 Reported By:`, 'dim');
    log(`   ${alertData.reporter}`, 'white');
    
    const timestamp = new Date(Number(alertData.timestamp) * 1000);
    log(`⏰ Time: ${timestamp.toLocaleString()}`, 'dim');
    
    // Block info
    log(`📦 Block: ${alertData.blockNumber || 'Pending'}`, 'dim');
    
    // Links
    log(`\n🔍 View Details:`, 'bright');
    log(`   Explorer: https://testnet.u2uscan.xyz/tx/${alertData.txHash}`, 'cyan');
    log(`   Contract: https://testnet.u2uscan.xyz/address/${CONFIG.contractAddress}`, 'cyan');
    
    separator('━', level.color);
    log(''); // Empty line
}

// Stats tracker
let stats = {
    totalAlertsReceived: 0,
    byLevel: { INFO: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
    byCategory: {},
    startTime: Date.now(),
};

function updateStats(alertData) {
    stats.totalAlertsReceived++;
    
    const level = THREAT_LEVELS[Number(alertData.level)] || THREAT_LEVELS[1];
    stats.byLevel[level.name]++;
    
    const category = THREAT_CATEGORIES[Number(alertData.category)] || 'UNKNOWN';
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
}

function displayStats() {
    const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    
    separator('═', 'magenta');
    log(`   📊 CERBERUS STATISTICS`, 'bright');
    separator('═', 'magenta');
    
    log(`\n⏱️  Uptime: ${hours}h ${minutes}m ${seconds}s`, 'cyan');
    log(`📈 Total Alerts: ${stats.totalAlertsReceived}`, 'green');
    
    if (stats.totalAlertsReceived > 0) {
        log(`\n📊 By Severity:`, 'bright');
        Object.entries(stats.byLevel).forEach(([level, count]) => {
            if (count > 0) {
                const levelInfo = THREAT_LEVELS[Object.keys(THREAT_LEVELS).find(k => THREAT_LEVELS[k].name === level)];
                log(`   ${levelInfo.emoji} ${level}: ${count}`, levelInfo.color);
            }
        });
        
        log(`\n🎯 By Category:`, 'bright');
        Object.entries(stats.byCategory).forEach(([category, count]) => {
            log(`   • ${category}: ${count}`, 'cyan');
        });
    }
    
    separator('═', 'magenta');
    log('');
}

// Fetch past alerts
async function fetchPastAlerts(contract, provider) {
    try {
        log('\n📜 Fetching recent alerts...', 'yellow');
        
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 5000); // Last 5000 blocks
        
        const filter = contract.filters.ThreatReported();
        const events = await contract.queryFilter(filter, fromBlock, currentBlock);
        
        if (events.length > 0) {
            log(`   Found ${events.length} recent alerts`, 'green');
            
            // Display last 3 alerts
            const recentAlerts = events.slice(-3);
            log('\n🔙 Last 3 Alerts:', 'bright');
            
            for (const event of recentAlerts) {
                const alertData = {
                    alertId: event.args[0],
                    txHash: event.args[1],
                    flaggedAddress: event.args[2],
                    level: event.args[3],
                    category: event.args[4],
                    confidenceScore: event.args[5],
                    reporter: event.args[6],
                    timestamp: event.args[7],
                    blockNumber: event.blockNumber,
                };
                
                updateStats(alertData);
            }
            
            displayStats();
        } else {
            log('   No recent alerts found', 'dim');
        }
        
    } catch (error) {
        log(`   ⚠️  Could not fetch past alerts: ${error.message}`, 'yellow');
    }
}

// Main monitor function
async function startMonitor() {
    console.clear();
    separator('█', 'cyan');
    log('   🐺 CERBERUS REAL-TIME ALERT MONITOR', 'bright');
    log('   Listening for threats on U2U Network...', 'cyan');
    separator('█', 'cyan');
    
    log(`\n🔗 Contract: ${CONFIG.contractAddress}`, 'dim');
    log(`🌐 Network: U2U Nebula Testnet`, 'dim');
    
    const contractABI = [
        "event ThreatReported(uint256 indexed alertId, bytes32 indexed txHash, address indexed flaggedAddress, uint8 level, uint8 category, uint256 confidenceScore, address reporter, uint256 timestamp)"
    ];
    
    try {
        // Try WebSocket first
        let provider;
        let usingWebSocket = true;
        
        try {
            log(`\n⚡ Connecting via WebSocket...`, 'yellow');
            provider = new ethers.WebSocketProvider(CONFIG.rpcWss);
            await provider.getBlockNumber(); // Test connection
            log(`   ✅ WebSocket connected`, 'green');
        } catch (wsError) {
            log(`   ⚠️  WebSocket failed, falling back to HTTP polling...`, 'yellow');
            provider = new ethers.JsonRpcProvider(CONFIG.rpcHttp);
            usingWebSocket = false;
            log(`   ✅ HTTP connected`, 'green');
        }
        
        const contract = new ethers.Contract(CONFIG.contractAddress, contractABI, provider);
        
        // Fetch past alerts first
        await fetchPastAlerts(contract, provider);
        
        separator('─', 'green');
        log(`\n👂 LISTENING FOR NEW ALERTS...`, 'bright');
        log(`   ${usingWebSocket ? 'Real-time WebSocket' : 'HTTP Polling (5s interval)'}`, 'dim');
        log(`   Press Ctrl+C to stop\n`, 'dim');
        separator('─', 'green');
        
        stats.startTime = Date.now(); // Reset start time after fetching past alerts
        
        if (usingWebSocket) {
            // WebSocket mode - real-time events
            contract.on('ThreatReported', async (alertId, txHash, flaggedAddress, level, category, confidenceScore, reporter, timestamp, event) => {
                const alertData = {
                    alertId,
                    txHash,
                    flaggedAddress,
                    level,
                    category,
                    confidenceScore,
                    reporter,
                    timestamp,
                    blockNumber: event.blockNumber,
                };
                
                updateStats(alertData);
                displayAlert(alertData);
                
                // Show stats every 5 alerts
                if (stats.totalAlertsReceived % 5 === 0 && stats.totalAlertsReceived > 0) {
                    displayStats();
                }
            });
            
            // Keep connection alive
            provider.on('error', (error) => {
                log(`\n❌ WebSocket error: ${error.message}`, 'red');
                log('   Attempting to reconnect...', 'yellow');
            });
            
        } else {
            // HTTP polling mode
            let lastBlock = await provider.getBlockNumber();
            
            setInterval(async () => {
                try {
                    const currentBlock = await provider.getBlockNumber();
                    
                    if (currentBlock > lastBlock) {
                        const filter = contract.filters.ThreatReported();
                        const events = await contract.queryFilter(filter, lastBlock + 1, currentBlock);
                        
                        for (const event of events) {
                            const alertData = {
                                alertId: event.args[0],
                                txHash: event.args[1],
                                flaggedAddress: event.args[2],
                                level: event.args[3],
                                category: event.args[4],
                                confidenceScore: event.args[5],
                                reporter: event.args[6],
                                timestamp: event.args[7],
                                blockNumber: event.blockNumber,
                            };
                            
                            updateStats(alertData);
                            displayAlert(alertData);
                        }
                        
                        lastBlock = currentBlock;
                    }
                } catch (error) {
                    log(`\n⚠️  Polling error: ${error.message}`, 'yellow');
                }
            }, 5000); // Poll every 5 seconds
        }
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            log('\n\n🛑 Shutting down monitor...', 'yellow');
            displayStats();
            log('\n👋 Monitor stopped. Goodbye!', 'cyan');
            process.exit(0);
        });
        
        // Display stats every 60 seconds
        setInterval(() => {
            if (stats.totalAlertsReceived > 0) {
                displayStats();
            }
        }, 60000);
        
    } catch (error) {
        log(`\n❌ Fatal error: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    startMonitor().catch(console.error);
}

module.exports = { startMonitor };