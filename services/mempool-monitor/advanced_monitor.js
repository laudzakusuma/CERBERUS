// Temporal correlation rules
            temporalClustering: {
                minClusterSize: 3,
                timeWindow: 180000, // 3 minutes
                severity: 'CRITICAL'
            },
            
            // Gas price correlation rules
            gasPriceManipulation: {
                deviationThreshold: 200, // 200% above average
                frequency: 2,
                window: 120000, // 2 minutes
                severity: 'HIGH'
            }
        };
    }

    analyzeThreat(txData, aiAnalysis) {
        const correlations = this._performCorrelationAnalysis(txData, aiAnalysis);
        const enhancedThreat = this._enhanceThreatData(txData, aiAnalysis, correlations);
        
        // Store in history
        this.threatHistory.set(txData.hash, enhancedThreat);
        
        // Update address patterns
        this._updateAddressPatterns(txData);
        
        // Update temporal clusters
        this._updateTemporalClusters(enhancedThreat);
        
        return enhancedThreat;
    }

    _performCorrelationAnalysis(txData, aiAnalysis) {
        const correlations = {
            addressVelocity: this._checkAddressVelocity(txData.from),
            valuePattern: this._checkValuePattern(txData.value),
            temporalClustering: this._checkTemporalClustering(txData.timestamp),
            gasPriceManipulation: this._checkGasPriceManipulation(txData.gasPrice),
            relatedThreats: this._findRelatedThreats(txData)
        };
        
        return correlations;
    }

    _checkAddressVelocity(address) {
        const now = Date.now();
        const pattern = this.addressPatterns.get(address) || { transactions: [] };
        
        const recentTxs = pattern.transactions.filter(
            tx => now - tx.timestamp < this.correlationRules.addressVelocity.window
        );
        
        const velocity = recentTxs.length;
        const isAnomalous = velocity >= this.correlationRules.addressVelocity.threshold;
        
        return {
            velocity,
            isAnomalous,
            severity: isAnomalous ? this.correlationRules.addressVelocity.severity : 'LOW',
            details: `${velocity} transactions in last minute`
        };
    }

    _checkValuePattern(value) {
        const valueEth = parseFloat(ethers.formatEther(value || 0));
        const roundNumbers = [0.1, 0.5, 1, 5, 10, 50, 100, 500, 1000];
        
        let similarity = 0;
        for (const roundNum of roundNumbers) {
            const diff = Math.abs(valueEth - roundNum) / roundNum;
            if (diff < 0.05) { // Within 5%
                similarity = Math.max(similarity, 1 - diff);
            }
        }
        
        return {
            similarity,
            isRoundNumber: similarity > 0.9,
            valueEth,
            details: `Value similarity to round numbers: ${(similarity * 100).toFixed(1)}%`
        };
    }

    _checkTemporalClustering(timestamp) {
        const now = Date.now();
        const window = this.correlationRules.temporalClustering.timeWindow;
        
        let clusterSize = 0;
        for (const [hash, threat] of this.threatHistory) {
            if (now - threat.timestamp < window && threat.aiAnalysis.is_malicious) {
                clusterSize++;
            }
        }
        
        const isClustered = clusterSize >= this.correlationRules.temporalClustering.minClusterSize;
        
        return {
            clusterSize,
            isClustered,
            severity: isClustered ? this.correlationRules.temporalClustering.severity : 'LOW',
            details: `${clusterSize} threats in temporal cluster`
        };
    }

    _checkGasPriceManipulation(gasPrice) {
        const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice || 0, 'gwei'));
        
        // Calculate average gas price from recent transactions
        const recentGasPrices = Array.from(this.threatHistory.values())
            .filter(threat => Date.now() - threat.timestamp < 300000) // 5 minutes
            .map(threat => parseFloat(ethers.formatUnits(threat.txData.gasPrice || 0, 'gwei')));
        
        const avgGasPrice = recentGasPrices.length > 0 
            ? recentGasPrices.reduce((sum, price) => sum + price, 0) / recentGasPrices.length 
            : 20; // Default 20 gwei
        
        const deviation = gasPriceGwei / avgGasPrice;
        const isManipulated = deviation > this.correlationRules.gasPriceManipulation.deviationThreshold / 100;
        
        return {
            currentGasPrice: gasPriceGwei,
            averageGasPrice: avgGasPrice,
            deviation,
            isManipulated,
            severity: isManipulated ? this.correlationRules.gasPriceManipulation.severity : 'LOW',
            details: `Gas price ${(deviation * 100).toFixed(1)}% of average`
        };
    }

    _findRelatedThreats(txData) {
        const related = [];
        const now = Date.now();
        
        for (const [hash, threat] of this.threatHistory) {
            if (hash === txData.hash) continue;
            
            // Check if within correlation window
            if (now - threat.timestamp > this.CONFIG.CORRELATION_WINDOW) continue;
            
            // Check address relationship
            if (threat.txData.from === txData.from || 
                threat.txData.to === txData.to ||
                threat.txData.from === txData.to ||
                threat.txData.to === txData.from) {
                related.push({
                    hash,
                    relationship: 'address_connection',
                    timestamp: threat.timestamp
                });
            }
            
            // Check value similarity
            const valueDiff = Math.abs(
                parseFloat(ethers.formatEther(threat.txData.value || 0)) -
                parseFloat(ethers.formatEther(txData.value || 0))
            );
            
            if (valueDiff < 0.01) { // Very similar values
                related.push({
                    hash,
                    relationship: 'value_similarity',
                    timestamp: threat.timestamp
                });
            }
        }
        
        return related;
    }

    _enhanceThreatData(txData, aiAnalysis, correlations) {
        const enhancedThreat = {
            txData,
            aiAnalysis,
            correlations,
            timestamp: Date.now(),
            enhancedSeverity: this._calculateEnhancedSeverity(aiAnalysis, correlations),
            riskScore: this._calculateRiskScore(aiAnalysis, correlations),
            economicImpact: this._estimateEconomicImpact(txData, correlations),
            recommendedAction: this._getRecommendedAction(aiAnalysis, correlations)
        };
        
        return enhancedThreat;
    }

    _calculateEnhancedSeverity(aiAnalysis, correlations) {
        let baseSeverity = aiAnalysis.threat_level || 0;
        
        // Apply correlation multipliers
        if (correlations.addressVelocity.isAnomalous) baseSeverity += 1;
        if (correlations.temporalClustering.isClustered) baseSeverity += 2;
        if (correlations.gasPriceManipulation.isManipulated) baseSeverity += 1;
        if (correlations.relatedThreats.length > 2) baseSeverity += 1;
        
        return Math.min(baseSeverity, 5); // Cap at 5
    }

    _calculateRiskScore(aiAnalysis, correlations) {
        let score = aiAnalysis.danger_score || 0;
        
        // Correlation bonuses
        score += correlations.addressVelocity.velocity * 2;
        score += correlations.temporalClustering.clusterSize * 5;
        score += correlations.relatedThreats.length * 3;
        
        if (correlations.valuePattern.isRoundNumber) score += 10;
        if (correlations.gasPriceManipulation.isManipulated) score += 15;
        
        return Math.min(score, 100);
    }

    _estimateEconomicImpact(txData, correlations) {
        const valueEth = parseFloat(ethers.formatEther(txData.value || 0));
        let impact = valueEth;
        
        // Multiply by related threats
        impact *= (1 + correlations.relatedThreats.length * 0.5);
        
        // Multiply by cluster size
        impact *= (1 + correlations.temporalClustering.clusterSize * 0.2);
        
        return Math.floor(impact * 1e18); // Convert back to wei
    }

    _getRecommendedAction(aiAnalysis, correlations) {
        if (correlations.temporalClustering.isClustered && aiAnalysis.danger_score > 80) {
            return 'IMMEDIATE_ESCALATION';
        } else if (correlations.addressVelocity.isAnomalous) {
            return 'ENHANCED_MONITORING';
        } else if (aiAnalysis.is_malicious) {
            return 'STANDARD_ALERT';
        } else {
            return 'LOG_ONLY';
        }
    }

    _updateAddressPatterns(txData) {
        const pattern = this.addressPatterns.get(txData.from) || {
            transactions: [],
            totalValue: 0,
            avgGasPrice: 0,
            firstSeen: Date.now(),
            riskScore: 0
        };
        
        pattern.transactions.push({
            hash: txData.hash,
            timestamp: Date.now(),
            value: txData.value,
            gasPrice: txData.gasPrice
        });
        
        // Keep only recent transactions
        const cutoff = Date.now() - 3600000; // 1 hour
        pattern.transactions = pattern.transactions.filter(tx => tx.timestamp > cutoff);
        
        this.addressPatterns.set(txData.from, pattern);
    }

    _updateTemporalClusters(enhancedThreat) {
        const timeSlot = Math.floor(enhancedThreat.timestamp / 60000) * 60000; // 1-minute slots
        
        if (!this.temporalClusters.has(timeSlot)) {
            this.temporalClusters.set(timeSlot, []);
        }
        
        this.temporalClusters.get(timeSlot).push(enhancedThreat);
        
        // Clean old clusters
        const cutoff = Date.now() - this.CONFIG.CORRELATION_WINDOW;
        for (const [slot, cluster] of this.temporalClusters) {
            if (slot < cutoff) {
                this.temporalClusters.delete(slot);
            }
        }
    }

    shouldAlert(address) {
        const lastAlert = this.alertCooldowns.get(address);
        const now = Date.now();
        
        if (!lastAlert || now - lastAlert > this.CONFIG.ALERT_COOLDOWN) {
            this.alertCooldowns.set(address, now);
            return true;
        }
        
        return false;
    }
}

class AdvancedAnalyticsCollector {
    constructor() {
        this.metrics = {
            totalTransactionsAnalyzed: 0,
            threatsDetected: 0,
            alertsSent: 0,
            consensusReached: 0,
            averageResponseTime: 0,
            modelAccuracy: 0,
            networkRiskScore: 0,
            hourlyStats: new Map(),
            threatCategories: new Map(),
            gasPrice: {
                samples: [],
                average: 0,
                volatility: 0
            }
        };
        
        this.performanceLog = [];
        this.startTime = Date.now();
    }

    recordTransaction(txData, processingTime) {
        this.metrics.totalTransactionsAnalyzed++;
        
        const hour = new Date().getHours();
        const hourlyData = this.metrics.hourlyStats.get(hour) || { count: 0, threats: 0 };
        hourlyData.count++;
        this.metrics.hourlyStats.set(hour, hourlyData);
        
        // Record gas price
        const gasPriceGwei = parseFloat(ethers.formatUnits(txData.gasPrice || 0, 'gwei'));
        this.metrics.gasPrice.samples.push(gasPriceGwei);
        
        if (this.metrics.gasPrice.samples.length > 100) {
            this.metrics.gasPrice.samples.shift();
        }
        
        this._updateGasStats();
        
        // Record performance
        this.performanceLog.push({
            timestamp: Date.now(),
            processingTime,
            txHash: txData.hash
        });
        
        if (this.performanceLog.length > 1000) {
            this.performanceLog.shift();
        }
    }

    recordThreat(enhancedThreat) {
        this.metrics.threatsDetected++;
        
        const hour = new Date().getHours();
        const hourlyData = this.metrics.hourlyStats.get(hour) || { count: 0, threats: 0 };
        hourlyData.threats++;
        this.metrics.hourlyStats.set(hour, hourlyData);
        
        // Record threat category
        const category = enhancedThreat.aiAnalysis.threat_category;
        const categoryCount = this.metrics.threatCategories.get(category) || 0;
        this.metrics.threatCategories.set(category, categoryCount + 1);
        
        // Update network risk score
        this._updateNetworkRiskScore(enhancedThreat);
    }

    recordAlert(alertId, responseTime) {
        this.metrics.alertsSent++;
        
        // Update average response time
        const totalTime = this.metrics.averageResponseTime * (this.metrics.alertsSent - 1) + responseTime;
        this.metrics.averageResponseTime = totalTime / this.metrics.alertsSent;
    }

    _updateGasStats() {
        const samples = this.metrics.gasPrice.samples;
        if (samples.length === 0) return;
        
        this.metrics.gasPrice.average = samples.reduce((sum, price) => sum + price, 0) / samples.length;
        
        const variance = samples.reduce((sum, price) => {
            return sum + Math.pow(price - this.metrics.gasPrice.average, 2);
        }, 0) / samples.length;
        
        this.metrics.gasPrice.volatility = Math.sqrt(variance);
    }

    _updateNetworkRiskScore(enhancedThreat) {
        const riskContribution = enhancedThreat.riskScore / 100;
        const decay = 0.95; // 5% decay per update
        
        this.metrics.networkRiskScore = (this.metrics.networkRiskScore * decay) + (riskContribution * (1 - decay));
    }

    getMetrics() {
        const uptime = (Date.now() - this.startTime) / 1000;
        const avgProcessingTime = this.performanceLog.length > 0 
            ? this.performanceLog.reduce((sum, log) => sum + log.processingTime, 0) / this.performanceLog.length
            : 0;
        
        return {
            ...this.metrics,
            uptime,
            avgProcessingTime,
            detectionRate: this.metrics.totalTransactionsAnalyzed > 0 
                ? (this.metrics.threatsDetected / this.metrics.totalTransactionsAnalyzed * 100).toFixed(2) + '%'
                : '0%',
            alertRate: this.metrics.threatsDetected > 0
                ? (this.metrics.alertsSent / this.metrics.threatsDetected * 100).toFixed(2) + '%'
                : '0%'
        };
    }
}

class AdvancedCerberusMonitor {
    constructor() {
        this.correlator = new AdvancedThreatCorrelator();
        this.analytics = new AdvancedAnalyticsCollector();
        this.isRunning = false;
        this.processedTxs = new Set();
        this.retryQueue = [];
        
        this._setupEventHandlers();
        this._initializeConnections();
    }

    async _initializeConnections() {
        try {
            this.httpProvider = new ethers.JsonRpcProvider(CONFIG.U2U_RPC_HTTP);
            this.wallet = new ethers.Wallet(CONFIG.MONITOR_PRIVATE_KEY, this.httpProvider);
            this.contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, ENHANCED_CONTRACT_ABI, this.wallet);
            
            console.log('🐕 Advanced Cerberus Monitor Initialized');
            console.log('📡 HTTP RPC:', CONFIG.U2U_RPC_HTTP);
            console.log('🤖 AI API:', CONFIG.AI_API_URL);
            console.log('📝 Contract:', CONFIG.CONTRACT_ADDRESS);
            console.log('👤 Monitor wallet:', this.wallet.address);
            
            const balance = await this.wallet.provider.getBalance(this.wallet.address);
            console.log('💰 Balance:', ethers.formatEther(balance), 'U2U');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            throw error;
        }
    }

    _setupEventHandlers() {
        this.correlator.on('threatDetected', (enhancedThreat) => {
            this._handleThreatDetected(enhancedThreat);
        });
        
        this.correlator.on('correlationFound', (correlationData) => {
            console.log('🔗 Threat correlation detected:', correlationData);
        });
        
        // Graceful shutdown
        process.on('SIGINT', () => this._shutdown('SIGINT'));
        process.on('SIGTERM', () => this._shutdown('SIGTERM'));
    }

    async start() {
        if (this.isRunning) {
            console.log('⚠️ Monitor already running');
            return;
        }
        
        console.log('🔄 Starting advanced monitoring...');
        this.isRunning = true;
        
        // Setup contract event listeners
        this._setupContractListeners();
        
        // Start polling loop
        this._startPollingLoop();
        
        // Start analytics reporting
        this._startAnalyticsReporting();
        
        console.log('✅ Advanced Cerberus Monitor is now active!');
    }

    _setupContractListeners() {
        this.contract.on('ThreatReported', (alertId, txHash, flaggedAddress, level, category, confidence, reporter, timestamp, modelHash) => {
            console.log('\n🔔 ADVANCED THREAT ALERT CONFIRMED');
            console.log('=====================================');
            console.log(`Alert ID: ${alertId}`);
            console.log(`Transaction: ${txHash}`);
            console.log(`Flagged Address: ${flaggedAddress}`);
            console.log(`Threat Level: ${level}`);
            console.log(`Category: ${this._getCategoryName(category)}`);
            console.log(`Confidence: ${confidence}%`);
            console.log(`Reporter: ${reporter}`);
            console.log(`Model Hash: ${modelHash}`);
            console.log('=====================================\n');
            
            this.analytics.recordAlert(alertId, Date.now() - timestamp);
        });
        
        this.contract.on('ConsensusReached', (alertId, finalStatus, validatorCount, totalStake) => {
            console.log(`\n✅ CONSENSUS REACHED for Alert ${alertId}`);
            console.log(`Final Status: ${finalStatus}`);
            console.log(`Validators: ${validatorCount}`);
            console.log(`Total Stake: ${ethers.formatEther(totalStake)} U2U\n`);
            
            this.analytics.metrics.consensusReached++;
        });
    }

    async _startPollingLoop() {
        let lastBlockNumber = await this.httpProvider.getBlockNumber();
        console.log(`📊 Starting from block: ${lastBlockNumber}`);
        
        while (this.isRunning) {
            try {
                const currentBlock = await this.httpProvider.getBlockNumber();
                
                if (currentBlock > lastBlockNumber) {
                    await this._processBatchBlocks(lastBlockNumber + 1, currentBlock);
                    lastBlockNumber = currentBlock;
                }
                
                // Process retry queue
                await this._processRetryQueue();
                
                await this._sleep(CONFIG.POLLING_INTERVAL);
                
            } catch (error) {
                console.error('⚠️ Polling error:', error.message);
                await this._sleep(CONFIG.POLLING_INTERVAL * 2); // Backoff on error
            }
        }
    }

    async _processBatchBlocks(startBlock, endBlock) {
        const blocks = Math.min(endBlock - startBlock + 1, CONFIG.BATCH_SIZE);
        const promises = [];
        
        for (let blockNum = startBlock; blockNum < startBlock + blocks; blockNum++) {
            promises.push(this._processBlock(blockNum));
        }
        
        await Promise.allSettled(promises);
    }

    async _processBlock(blockNumber) {
        try {
            const block = await this.httpProvider.getBlock(blockNumber, true);
            
            if (!block || !block.transactions || block.transactions.length === 0) {
                return;
            }
            
            console.log(`📦 Processing block ${blockNumber} with ${block.transactions.length} transactions`);
            
            const processingPromises = block.transactions.map(tx => 
                this._processTransaction(tx).catch(error => {
                    console.error(`Transaction processing failed for ${tx.hash}:`, error.message);
                    this.retryQueue.push(tx);
                })
            );
            
            await Promise.allSettled(processingPromises);
            
        } catch (error) {
            console.error(`Block ${blockNumber} processing failed:`, error.message);
        }
    }

    async _processTransaction(tx) {
        if (!tx || !tx.hash || this.processedTxs.has(tx.hash)) {
            return;
        }
        
        const startTime = Date.now();
        
        try {
            // Extract transaction data
            const txData = this._extractTransactionData(tx);
            
            // Skip low-value transactions
            if (this._shouldSkipTransaction(txData)) {
                return;
            }
            
            console.log(`🔍 Advanced analysis: ${tx.hash.substring(0, 10)}... | Value: ${parseFloat(ethers.formatEther(tx.value || 0)).toFixed(4)} U2U`);
            
            // Get AI analysis
            const aiAnalysis = await this._getAIAnalysis(txData);
            
            // Perform correlation analysis
            const enhancedThreat = this.correlator.analyzeThreat(txData, aiAnalysis);
            
            // Record metrics
            const processingTime = Date.now() - startTime;
            this.analytics.recordTransaction(txData, processingTime);
            
            console.log(`📊 Enhanced Analysis: Danger=${enhancedThreat.riskScore} | Category=${aiAnalysis.threat_category} | Correlations=${Object.keys(enhancedThreat.correlations).filter(k => enhancedThreat.correlations[k].isAnomalous || enhancedThreat.correlations[k].isClustered || enhancedThreat.correlations[k].isManipulated).length}`);
            
            // Check if should alert
            if (this._shouldCreateAlert(enhancedThreat)) {
                await this._createAdvancedAlert(enhancedThreat);
            }
            
            this.processedTxs.add(tx.hash);
            
        } catch (error) {
            console.error(`❌ Transaction analysis failed for ${tx.hash}:`, error.message);
            throw error;
        }
    }

    _extractTransactionData(tx) {
        return {
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value ? tx.value.toString() : '0',
            gasPrice: tx.gasPrice ? tx.gasPrice.toString() : '0',
            gasLimit: tx.gasLimit ? tx.gasLimit.toString() : '0',
            data: tx.data || '0x',
            nonce: tx.nonce || 0,
            timestamp: Date.now()
        };
    }

    _shouldSkipTransaction(txData) {
        const valueEth = parseFloat(ethers.formatEther(txData.value || 0));
        return valueEth < 0.01 && txData.to; // Skip small non-contract creation transactions
    }

    async _getAIAnalysis(txData) {
        try {
            const response = await fetch(CONFIG.AI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(txData),
                timeout: 15000
            });
            
            if (!response.ok) {
                throw new Error(`AI API responded with status: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('❌ AI analysis failed:', error.message);
            // Return default analysis
            return {
                danger_score: 0,
                threat_category: 'UNKNOWN',
                threat_level: 0,
                is_malicious: false,
                confidence: 0
            };
        }
    }

    _shouldCreateAlert(enhancedThreat) {
        const { aiAnalysis, correlations, recommendedAction, riskScore } = enhancedThreat;
        
        // Don't alert if in cooldown
        if (!this.correlator.shouldAlert(enhancedThreat.txData.from)) {
            return false;
        }
        
        // Alert criteria
        return (
            recommendedAction === 'IMMEDIATE_ESCALATION' ||
            (aiAnalysis.is_malicious && aiAnalysis.confidence > 70) ||
            (riskScore > 80) ||
            (correlations.temporalClustering.isClustered && aiAnalysis.danger_score > 60)
        );
    }

    async _createAdvancedAlert(enhancedThreat) {
        try {
            console.log('🚨 ADVANCED THREAT DETECTED - Creating on-chain alert...');
            
            this.analytics.recordThreat(enhancedThreat);
            
            const { txData, aiAnalysis, correlations, economicImpact } = enhancedThreat;
            
            // Prepare advanced alert parameters
            const alertParams = this._prepareAdvancedAlertParams(enhancedThreat);
            
            console.log('🔧 Alert parameters prepared:', {
                hash: txData.hash,
                category: aiAnalysis.threat_category,
                severity: enhancedThreat.enhancedSeverity,
                riskScore: enhancedThreat.riskScore,
                correlations: Object.keys(correlations).filter(k => 
                    correlations[k].isAnomalous || correlations[k].isClustered || correlations[k].isManipulated
                ).length
            });
            
            // Estimate gas
            const gasEstimate = await this.contract.reportAdvancedThreat.estimateGas(
                ...alertParams.params,
                { value: alertParams.stakeAmount }
            );
            
            console.log(`⛽ Gas estimate: ${gasEstimate.toString()}`);
            
            // Send transaction
            const reportTx = await this.contract.reportAdvancedThreat(
                ...alertParams.params,
                {
                    value: alertParams.stakeAmount,
                    gasLimit: gasEstimate * 120n / 100n,
                    gasPrice: ethers.parseUnits("15", "gwei")
                }
            );
            
            console.log(`📤 Advanced alert sent! Tx: ${reportTx.hash}`);
            
            const receipt = await reportTx.wait();
            console.log(`✅ Alert confirmed on block: ${receipt.blockNumber} | Gas used: ${receipt.gasUsed.toString()}`);
            
        } catch (error) {
            console.error('❌ Advanced alert failed:', error.message);
            
            if (error.message.includes('already reported')) {
                console.log('⚠️ Transaction already reported');
            } else {
                // Add to retry queue for non-duplicate errors
                this.retryQueue.push({
                    type: 'alert',
                    enhancedThreat,
                    attempts: 0
                });
            }
        }
    }

    _prepareAdvancedAlertParams(enhancedThreat) {
        const { txData, aiAnalysis, correlations, economicImpact } = enhancedThreat;
        
        // Convert threat category to number
        const categoryMap = {
            'UNKNOWN': 0, 'RUG_PULL': 1, 'FLASH_LOAN_ATTACK': 2,
            'FRONT_RUNNING': 3, 'MEV_ABUSE': 4, 'PRICE_MANIPULATION': 5,
            'SMART_CONTRACT_EXPLOIT': 6, 'PHISHING_CONTRACT': 7,
            'HONEY_POT': 8, 'GOVERNANCE_ATTACK': 9, 'ORACLE_MANIPULATION': 10,
            'BRIDGE_EXPLOIT': 11, 'PRIVATE_KEY_COMPROMISE': 12,
            'SOCIAL_ENGINEERING': 13, 'ZERO_DAY_EXPLOIT': 14, 'PROTOCOL_DRAIN': 15
        };
        
        const categoryValue = categoryMap[aiAnalysis.threat_category] || 0;
        const modelHash = ethers.keccak256(ethers.toUtf8Bytes("cerberus-ai-ensemble-v2.0.0-advanced"));
        const stakeAmount = ethers.parseEther("0.01");
        
        // Prepare related addresses
        const relatedAddresses = correlations.relatedThreats
            .map(threat => threat.relationship === 'address_connection' ? threat.address : null)
            .filter(addr => addr !== null)
            .slice(0, 5); // Max 5 related addresses
        
        // Prepare related alerts (threat hashes)
        const relatedAlerts = correlations.relatedThreats
            .map(threat => ethers.keccak256(ethers.toUtf8Bytes(threat.hash)))
            .slice(0, 10); // Max 10 related alerts
        
        // Additional data as bytes
        const additionalData = ethers.toUtf8Bytes(JSON.stringify({
            correlations: {
                addressVelocity: correlations.addressVelocity.isAnomalous,
                temporalClustering: correlations.temporalClustering.isClustered,
                gasPriceManipulation: correlations.gasPriceManipulation.isManipulated,
                relatedThreatsCount: correlations.relatedThreats.length
            },
            recommendedAction: enhancedThreat.recommendedAction,
            processingTimestamp: enhancedThreat.timestamp
        }));
        
        const params = [
            txData.hash,                                    // _txHash
            txData.from,                                   // _flaggedAddress
            relatedAddresses,                              // _relatedAddresses
            enhancedThreat.enhancedSeverity,              // _level
            categoryValue,                                 // _category
            Math.floor(aiAnalysis.confidence),            // _confidenceScore
            enhancedThreat.riskScore,                     // _severityScore
            aiAnalysis.threat_signature.substring(0, 100), // _description
            additionalData,                               // _additionalData
            modelHash,                                    // _modelHash
            economicImpact,                               // _economicImpact
            relatedAlerts                                 // _relatedAlerts
        ];
        
        return { params, stakeAmount };
    }

    async _processRetryQueue() {
        if (this.retryQueue.length === 0) return;
        
        const itemsToRetry = this.retryQueue.splice(0, 5); // Process max 5 items
        
        for (const item of itemsToRetry) {
            if (item.attempts >= CONFIG.MAX_RETRIES) {
                console.log(`⚠️ Max retries reached for item: ${item.type}`);
                continue;
            }
            
            try {
                item.attempts++;
                
                if (item.type === 'alert') {
                    await this._createAdvancedAlert(item.enhancedThreat);
                } else if (item.type === 'transaction') {
                    await this._processTransaction(item);
                }
                
            } catch (error) {
                console.error(`Retry failed for ${item.type}:`, error.message);
                this.retryQueue.push(item); // Re-queue for next retry
            }
        }
    }

    _startAnalyticsReporting() {
        setInterval(() => {
            this._logAnalytics();
        }, 300000); // Every 5 minutes
        
        setInterval(() => {
            this._logDetailedAnalytics();
        }, 1800000); // Every 30 minutes
    }

    _logAnalytics() {
        const metrics = this.analytics.getMetrics();
        
        console.log('\n📈 ADVANCED ANALYTICS REPORT');
        console.log('================================');
        console.log(`⏱️  Uptime: ${Math.floor(metrics.uptime / 3600)}h ${Math.floor((metrics.uptime % 3600) / 60)}m`);
        console.log(`🔍 Transactions Analyzed: ${metrics.totalTransactionsAnalyzed}`);
        console.log(`🚨 Threats Detected: ${metrics.threatsDetected}`);
        console.log(`📤 Alerts Sent: ${metrics.alertsSent}`);
        console.log(`✅ Consensus Reached: ${metrics.consensusReached}`);
        console.log(`📊 Detection Rate: ${metrics.detectionRate}`);
        console.log(`⚡ Alert Rate: ${metrics.alertRate}`);
        console.log(`🌐 Network Risk Score: ${metrics.networkRiskScore.toFixed(2)}`);
        console.log(`⛽ Avg Gas Price: ${metrics.gasPrice.average.toFixed(2)} gwei`);
        console.log(`📈 Gas Volatility: ${metrics.gasPrice.volatility.toFixed(2)}`);
        console.log(`⏱️  Avg Processing Time: ${metrics.avgProcessingTime.toFixed(2)}ms`);
        console.log('================================\n');
    }

    _logDetailedAnalytics() {
        const metrics = this.analytics.getMetrics();
        
        console.log('\n📊 DETAILED THREAT ANALYTICS');
        console.log('========================================');
        
        // Hourly distribution
        console.log('📅 Hourly Activity Distribution:');
        for (const [hour, data] of metrics.hourlyStats) {
            const threatRate = data.count > 0 ? (data.threats / data.count * 100).toFixed(1) : '0.0';
            console.log(`   ${hour.toString().padStart(2, '0')}:00 - Txs: ${data.count}, Threats: ${data.threats} (${threatRate}%)`);
        }
        
        // Threat categories
        console.log('\n🏷️  Threat Category Distribution:');
        for (const [category, count] of metrics.threatCategories) {
            const percentage = (count / metrics.threatsDetected * 100).toFixed(1);
            console.log(`   ${category}: ${count} (${percentage}%)`);
        }
        
        // Correlation insights
        const correlationStats = this.correlator.getCorrelationStats();
        console.log('\n🔗 Correlation Analysis:');
        console.log(`   Address Velocity Alerts: ${correlationStats.addressVelocityAlerts}`);
        console.log(`   Temporal Clusters: ${correlationStats.temporalClusters}`);
        console.log(`   Gas Price Manipulations: ${correlationStats.gasPriceManipulations}`);
        console.log(`   Related Threat Networks: ${correlationStats.relatedThreatNetworks}`);
        
        console.log('========================================\n');
    }

    _getCategoryName(categoryId) {
        const categories = [
            'UNKNOWN', 'RUG_PULL', 'FLASH_LOAN_ATTACK', 'FRONT_RUNNING',
            'MEV_ABUSE', 'PRICE_MANIPULATION', 'SMART_CONTRACT_EXPLOIT',
            'PHISHING_CONTRACT', 'HONEY_POT', 'GOVERNANCE_ATTACK',
            'ORACLE_MANIPULATION', 'BRIDGE_EXPLOIT', 'PRIVATE_KEY_COMPROMISE',
            'SOCIAL_ENGINEERING', 'ZERO_DAY_EXPLOIT', 'PROTOCOL_DRAIN'
        ];
        
        return categories[categoryId] || 'UNKNOWN';
    }

    async _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async _shutdown(signal) {
        console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
        
        this.isRunning = false;
        
        // Log final analytics
        this._logDetailedAnalytics();
        
        // Save state if needed
        await this._saveState();
        
        console.log('✅ Advanced Cerberus Monitor shutdown complete');
        process.exit(0);
    }

    async _saveState() {
        try {
            const state = {
                threatHistory: Array.from(this.correlator.threatHistory.entries()),
                addressPatterns: Array.from(this.correlator.addressPatterns.entries()),
                metrics: this.analytics.getMetrics(),
                timestamp: Date.now()
            };
            
            await fs.writeFile(
                path.join(__dirname, 'monitor_state.json'),
                JSON.stringify(state, null, 2)
            );
            
            console.log('💾 Monitor state saved');
            
        } catch (error) {
            console.error('❌ Failed to save state:', error.message);
        }
    }

    async loadState() {
        try {
            const statePath = path.join(__dirname, 'monitor_state.json');
            const stateData = await fs.readFile(statePath, 'utf8');
            const state = JSON.parse(stateData);
            
            // Restore correlator state
            this.correlator.threatHistory = new Map(state.threatHistory);
            this.correlator.addressPatterns = new Map(state.addressPatterns);
            
            console.log(`💾 Monitor state loaded (${state.threatHistory.length} threats, ${state.addressPatterns.length} addresses)`);
            
        } catch (error) {
            console.log('ℹ️ No previous state found, starting fresh');
        }
    }
}

// Add correlation stats method to ThreatCorrelator
AdvancedThreatCorrelator.prototype.getCorrelationStats = function() {
    let addressVelocityAlerts = 0;
    let temporalClusters = 0;
    let gasPriceManipulations = 0;
    let relatedThreatNetworks = 0;
    
    for (const [hash, threat] of this.threatHistory) {
        if (threat.correlations.addressVelocity.isAnomalous) addressVelocityAlerts++;
        if (threat.correlations.temporalClustering.isClustered) temporalClusters++;
        if (threat.correlations.gasPriceManipulation.isManipulated) gasPriceManipulations++;
        if (threat.correlations.relatedThreats.length > 0) relatedThreatNetworks++;
    }
    
    return {
        addressVelocityAlerts,
        temporalClusters,
        gasPriceManipulations,
        relatedThreatNetworks
    };
};

// Main execution
async function main() {
    try {
        console.log('🚀 Initializing Advanced Cerberus Monitoring System...');
        
        const monitor = new AdvancedCerberusMonitor();
        
        // Load previous state if available
        await monitor.loadState();
        
        // Test AI connection
        console.log('🧪 Testing AI Sentinel connection...');
        const testResponse = await fetch(CONFIG.AI_API_URL.replace('/predict', '/'));
        if (testResponse.ok) {
            const aiHealth = await testResponse.json();
            console.log(`✅ AI Sentinel: ${aiHealth.status} | Version: ${aiHealth.version}`);
        } else {
            throw new Error('AI Sentinel not responding');
        }
        
        // Start monitoring
        await monitor.start();
        
    } catch (error) {
        console.error('❌ Advanced Monitor startup failed:', error.message);
        process.exit(1);
    }
}

// Export for testing
module.exports = {
    AdvancedCerberusMonitor,
    AdvancedThreatCorrelator,
    AdvancedAnalyticsCollector,
    CONFIG
};

// Run if this is the main module
if (require.main === module) {
    main();
}/**
 * Advanced Cerberus Monitor with Event Correlation and Real-time Analytics
 */

const { ethers } = require('ethers');
const fetch = require('node-fetch');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
    U2U_RPC_WSS: 'wss://rpc-nebulas-testnet.uniultra.xyz',
    U2U_RPC_HTTP: 'https://rpc-nebulas-testnet.uniultra.xyz',
    AI_API_URL: 'http://127.0.0.1:5001/predict',
    MONITOR_PRIVATE_KEY: 'a29a6848264f0ae2e5c34ad0858cb6b4aae9355190919b765622b566c7fa808b',
    CONTRACT_ADDRESS: '0xC65f3ec1e0a6853d2e6267CB918E683BA7E4f36c',
    POLLING_INTERVAL: 3000, // 3 seconds
    MAX_RETRIES: 3,
    BATCH_SIZE: 10,
    ALERT_COOLDOWN: 30000, // 30 seconds
    CORRELATION_WINDOW: 300000 // 5 minutes
};

// Enhanced contract ABI
const ENHANCED_CONTRACT_ABI = [
    "function reportAdvancedThreat(bytes32 _txHash, address _flaggedAddress, address[] memory _relatedAddresses, uint8 _level, uint8 _category, uint256 _confidenceScore, uint256 _severityScore, string memory _description, bytes memory _additionalData, bytes32 _modelHash, uint256 _economicImpact, bytes32[] memory _relatedAlerts) payable",
    "function validateThreatWithConsensus(uint256 _alertId, bool _isConfirming, uint256 _confidence, string memory _reasoning, bytes memory _evidence) payable",
    "function getAdvancedThreatAnalytics(uint256 _days) view returns (uint256[] memory, uint256[] memory, uint256[] memory, uint256, uint256, uint256)",
    "event ThreatReported(uint256 indexed alertId, bytes32 indexed txHash, address indexed flaggedAddress, uint8 level, uint8 category, uint256 confidenceScore, address reporter, uint256 timestamp, bytes32 modelHash)",
    "event ThreatConfirmed(uint256 indexed alertId, address indexed validator, uint256 confirmations, uint256 timestamp, uint256 consensusReached)",
    "event ConsensusReached(uint256 indexed alertId, uint8 finalStatus, uint256 validatorCount, uint256 totalStake)"
];

class AdvancedThreatCorrelator extends EventEmitter {
    constructor() {
        super();
        this.threatHistory = new Map(); // txHash -> threat data
        this.addressPatterns = new Map(); // address -> pattern data
        this.temporalClusters = new Map(); // timeWindow -> threats
        this.alertCooldowns = new Map(); // address -> lastAlertTime
        this.correlationRules = this._initializeCorrelationRules();
    }

    _initializeCorrelationRules() {
        return {
            // Address correlation rules
            addressVelocity: {
                threshold: 5, // transactions per minute
                window: 60000, // 1 minute
                severity: 'HIGH'
            },
            
            // Value correlation rules
            valuePattern: {
                roundNumberThreshold: 0.95, // 95% similar to round numbers
                frequency: 3, // 3 similar values in window
                window: 300000, // 5 minutes
                severity: 'MEDIUM'
            },
            
            // Temporal correlation rules
            temporalClustering: {
                minClusterSize: 3,
                timeWindow: 180000, // 3 minutes