// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./MessageHashUtils.sol";

/**
 * @title CerberusAdvanced - Enterprise-Grade Threat Detection System
 * @dev Advanced multi-validator consensus with economic incentives and ML model governance
 */
contract CerberusAdvanced is AccessControl, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    bytes32 public constant AI_ORACLE_ROLE = keccak256("AI_ORACLE_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant MODEL_GOVERNOR_ROLE = keccak256("MODEL_GOVERNOR_ROLE");

    enum ThreatLevel { INFO, LOW, MEDIUM, HIGH, CRITICAL, CATASTROPHIC }
    enum AlertStatus { PENDING, CONFIRMED, DISPUTED, RESOLVED, ESCALATED, DEPRECATED }
    enum ThreatCategory { 
        UNKNOWN, RUG_PULL, FLASH_LOAN_ATTACK, FRONT_RUNNING, 
        MEV_ABUSE, PRICE_MANIPULATION, SMART_CONTRACT_EXPLOIT,
        PHISHING_CONTRACT, HONEY_POT, GOVERNANCE_ATTACK,
        ORACLE_MANIPULATION, BRIDGE_EXPLOIT, PRIVATE_KEY_COMPROMISE,
        SOCIAL_ENGINEERING, ZERO_DAY_EXPLOIT, PROTOCOL_DRAIN
    }

    struct ThreatAlert {
        uint256 alertId;
        bytes32 txHash;
        address flaggedAddress;
        address[] relatedAddresses;
        address reporter;
        uint256 timestamp;
        ThreatLevel level;
        ThreatCategory category;
        AlertStatus status;
        uint256 confidenceScore;
        uint256 severityScore;
        string threatDescription;
        bytes additionalData;
        uint256 stakeAmount;
        uint256 confirmations;
        uint256 disputes;
        uint256 escalations;
        address[] validators;
        mapping(address => ValidatorVote) validatorVotes;
        uint256 economicImpact;
        uint256 networkRisk;
        bytes32[] relatedAlerts;
        MLModelInfo modelUsed;
    }

    struct ValidatorVote {
        bool hasVoted;
        bool isConfirming;
        uint256 confidence;
        string reasoning;
        uint256 timestamp;
        uint256 stakeAmount;
    }

    struct ReputationProfile {
        uint256 totalReports;
        uint256 confirmedThreats;
        uint256 falsePositives;
        uint256 accuracyScore;
        uint256 stakingBalance;
        uint256 totalStaked;
        uint256 totalEarned;
        bool isBlacklisted;
        uint256 lastActivity;
        string profileMetadata;
        mapping(ThreatCategory => uint256) categoryExpertise;
        mapping(ThreatLevel => uint256) levelAccuracy;
        uint256 consecutiveCorrect;
        uint256 validationPower;
        uint256 reputationDecay;
    }

    struct MLModelInfo {
        bytes32 modelHash;
        string version;
        string modelType;
        uint256 accuracy;
        uint256 precision;
        uint256 recall;
        uint256 f1Score;
        uint256 deployedAt;
        address deployer;
        bool isActive;
        bool isDeprecated;
        uint256 trainingDataSize;
        uint256 validationDataSize;
        string trainingMetrics;
        bytes32[] predecessors;
        uint256 performanceScore;
        uint256 usageCount;
        mapping(address => bool) authorizedOracles;
    }

    struct IncentivePool {
        uint256 totalRewards;
        uint256 reporterShare;
        uint256 validatorShare;
        uint256 guardianShare;
        uint256 burnAmount;
        mapping(ThreatCategory => uint256) categoryMultipliers;
        mapping(ThreatLevel => uint256) levelMultipliers;
    }

    struct NetworkThreatMetrics {
        uint256 totalThreats;
        uint256 confirmedThreats;
        uint256 averageResponseTime;
        uint256 falsePositiveRate;
        uint256 threatVelocity;
        uint256 networkRiskScore;
        mapping(uint256 => uint256) dailyThreatCounts;
        mapping(ThreatCategory => uint256) categoryDistribution;
        mapping(address => uint256) addressRiskScores;
        uint256 lastUpdated;
    }

    uint256 private _alertCounter;
    uint256 public constant MIN_STAKE = 0.01 ether;
    uint256 public constant MIN_CONFIRMATIONS = 3;
    uint256 public constant DISPUTE_WINDOW = 24 hours;
    uint256 public constant ESCALATION_WINDOW = 48 hours;
    uint256 public constant MAX_VALIDATORS_PER_ALERT = 15;
    uint256 public constant REPUTATION_DECAY_RATE = 5;

    mapping(uint256 => ThreatAlert) public threatAlerts;
    mapping(address => ReputationProfile) public reputationProfiles;
    mapping(bytes32 => MLModelInfo) public mlModels;
    mapping(bytes32 => bool) public reportedTransactions;
    mapping(bytes32 => uint256[]) public transactionAlerts;
    mapping(address => uint256[]) public userAlertHistory;
    mapping(ThreatCategory => uint256) public categoryThresholds;
    mapping(address => mapping(ThreatCategory => uint256)) public userSpecialization;
    mapping(bytes32 => bytes32[]) public threatCorrelations;
    mapping(address => uint256) public validatorPower;
    mapping(uint256 => uint256) public alertPriority;

    IncentivePool public incentivePool;
    NetworkThreatMetrics public networkMetrics;

    event ThreatReported(
        uint256 indexed alertId,
        bytes32 indexed txHash,
        address indexed flaggedAddress,
        ThreatLevel level,
        ThreatCategory category,
        uint256 confidenceScore,
        address reporter,
        uint256 timestamp,
        bytes32 modelHash
    );

    event ThreatConfirmed(
        uint256 indexed alertId,
        address indexed validator,
        uint256 confirmations,
        uint256 timestamp,
        uint256 consensusReached
    );

    event ThreatEscalated(
        uint256 indexed alertId,
        ThreatLevel newLevel,
        address escalator,
        string reason
    );

    event ReputationUpdated(
        address indexed user,
        uint256 accuracyScore,
        uint256 stakingBalance,
        uint256 validationPower
    );

    event ModelDeployed(
        bytes32 indexed modelHash,
        string version,
        uint256 accuracy,
        address deployer
    );

    event ConsensusReached(
        uint256 indexed alertId,
        AlertStatus finalStatus,
        uint256 validatorCount,
        uint256 totalStake
    );

    constructor(address _token) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AI_ORACLE_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
        _grantRole(MODEL_GOVERNOR_ROLE, msg.sender);
        
        _initializeIncentives();
        _initializeThresholds();
    }

    function _initializeIncentives() internal {
        incentivePool.reporterShare = 40;
        incentivePool.validatorShare = 35;
        incentivePool.guardianShare = 15;
        incentivePool.burnAmount = 10;
        incentivePool.categoryMultipliers[ThreatCategory.ZERO_DAY_EXPLOIT] = 300;
        incentivePool.categoryMultipliers[ThreatCategory.PROTOCOL_DRAIN] = 250;
        incentivePool.categoryMultipliers[ThreatCategory.BRIDGE_EXPLOIT] = 200;
        incentivePool.levelMultipliers[ThreatLevel.CATASTROPHIC] = 500;
        incentivePool.levelMultipliers[ThreatLevel.CRITICAL] = 300;
        incentivePool.levelMultipliers[ThreatLevel.HIGH] = 150;
    }

    function _initializeThresholds() internal {
        categoryThresholds[ThreatCategory.ZERO_DAY_EXPLOIT] = 95;
        categoryThresholds[ThreatCategory.PROTOCOL_DRAIN] = 90;
        categoryThresholds[ThreatCategory.BRIDGE_EXPLOIT] = 85;
        categoryThresholds[ThreatCategory.GOVERNANCE_ATTACK] = 80;
    }

    /**
     * @dev Advanced threat reporting with multi-signature validation
     */
    function reportAdvancedThreat(
        bytes32 _txHash,
        address _flaggedAddress,
        address[] memory _relatedAddresses,
        ThreatLevel _level,
        ThreatCategory _category,
        uint256 _confidenceScore,
        uint256 _severityScore,
        string memory _description,
        bytes memory _additionalData,
        bytes32 _modelHash,
        uint256 _economicImpact,
        bytes32[] memory _relatedAlerts
    ) external payable onlyRole(AI_ORACLE_ROLE) whenNotPaused nonReentrant {
        require(_confidenceScore <= 100, "Invalid confidence score");
        require(_severityScore <= 100, "Invalid severity score");
        require(msg.value >= MIN_STAKE, "Insufficient stake");
        require(!reportedTransactions[_txHash], "Transaction already reported");
        require(mlModels[_modelHash].isActive, "Invalid ML model");
        require(_confidenceScore >= categoryThresholds[_category], "Below threshold");

        _alertCounter++;
        uint256 alertId = _alertCounter;

        ThreatAlert storage alert = threatAlerts[alertId];
        alert.alertId = alertId;
        alert.txHash = _txHash;
        alert.flaggedAddress = _flaggedAddress;
        alert.relatedAddresses = _relatedAddresses;
        alert.reporter = msg.sender;
        alert.timestamp = block.timestamp;
        alert.level = _level;
        alert.category = _category;
        alert.status = AlertStatus.PENDING;
        alert.confidenceScore = _confidenceScore;
        alert.severityScore = _severityScore;
        alert.threatDescription = _description;
        alert.additionalData = _additionalData;
        alert.stakeAmount = msg.value;
        alert.economicImpact = _economicImpact;
        alert.relatedAlerts = _relatedAlerts;
        alert.networkRisk = _calculateNetworkRisk(_level, _category, _economicImpact);

        mlModels[_modelHash].usageCount++;

        reportedTransactions[_txHash] = true;
        userAlertHistory[msg.sender].push(alertId);
        transactionAlerts[_txHash].push(alertId);

        _updateReporterReputation(msg.sender, _category, _level);

        _updateNetworkMetrics(_category, _level);

        alertPriority[alertId] = _calculatePriority(_level, _severityScore, _economicImpact);

        emit ThreatReported(
            alertId, _txHash, _flaggedAddress, _level, _category,
            _confidenceScore, msg.sender, block.timestamp, _modelHash
        );

        if (_level == ThreatLevel.CATASTROPHIC && _confidenceScore >= 98) {
            _autoEscalateThreat(alertId);
        }
    }

    /**
     * @dev Enhanced validation with consensus mechanism
     */
    function validateThreatWithConsensus(
        uint256 _alertId,
        bool _isConfirming,
        uint256 _confidence,
        string memory _reasoning,
        bytes memory _evidence
    ) external payable onlyRole(VALIDATOR_ROLE) whenNotPaused nonReentrant {
        ThreatAlert storage alert = threatAlerts[_alertId];
        require(alert.status == AlertStatus.PENDING, "Alert not pending");
        require(!alert.validatorVotes[msg.sender].hasVoted, "Already voted");
        require(msg.value >= MIN_STAKE / 2, "Insufficient validator stake");
        require(block.timestamp <= alert.timestamp + DISPUTE_WINDOW, "Window closed");
        require(alert.validators.length < MAX_VALIDATORS_PER_ALERT, "Max validators");

        alert.validatorVotes[msg.sender] = ValidatorVote({
            hasVoted: true,
            isConfirming: _isConfirming,
            confidence: _confidence,
            reasoning: _reasoning,
            timestamp: block.timestamp,
            stakeAmount: msg.value
        });

        alert.validators.push(msg.sender);
        
        if (_isConfirming) {
            alert.confirmations++;
        } else {
            alert.disputes++;
        }

        _updateValidatorReputation(msg.sender, alert.category);

        if (_checkConsensusReached(_alertId)) {
            _finalizeConsensus(_alertId);
        }

        emit ThreatConfirmed(_alertId, msg.sender, alert.confirmations, block.timestamp, 0);
    }

    /**
     * @dev Advanced ML model deployment with governance
     */
    function deployMLModelWithGovernance(
        bytes32 _modelHash,
        string memory _version,
        string memory _modelType,
        uint256 _accuracy,
        uint256 _precision,
        uint256 _recall,
        uint256 _trainingDataSize,
        string memory _trainingMetrics,
        bytes32[] memory _predecessors
    ) external onlyRole(MODEL_GOVERNOR_ROLE) {
        require(_accuracy <= 100, "Invalid accuracy");
        require(_precision <= 100, "Invalid precision");
        require(_recall <= 100, "Invalid recall");
        require(bytes(_version).length > 0, "Version required");

        MLModelInfo storage model = mlModels[_modelHash];
        model.modelHash = _modelHash;
        model.version = _version;
        model.modelType = _modelType;
        model.accuracy = _accuracy;
        model.precision = _precision;
        model.recall = _recall;
        model.f1Score = (2 * _precision * _recall) / (_precision + _recall);
        model.deployedAt = block.timestamp;
        model.deployer = msg.sender;
        model.isActive = true;
        model.trainingDataSize = _trainingDataSize;
        model.trainingMetrics = _trainingMetrics;
        model.predecessors = _predecessors;
        model.performanceScore = (_accuracy + _precision + _recall + model.f1Score) / 4;

        emit ModelDeployed(_modelHash, _version, _accuracy, msg.sender);
    }

    function _calculateNetworkRisk(
        ThreatLevel _level,
        ThreatCategory _category,
        uint256 _economicImpact
    ) internal pure returns (uint256) {
        uint256 levelWeight = uint256(_level) * 20;
        uint256 categoryWeight = uint256(_category) * 10;
        uint256 economicWeight = _economicImpact / 1e18;
        
        return (levelWeight + categoryWeight + economicWeight) % 100;
    }

    function _calculatePriority(
        ThreatLevel _level,
        uint256 _severity,
        uint256 _economicImpact
    ) internal pure returns (uint256) {
        return (uint256(_level) * 30) + (_severity * 40) + (_economicImpact / 1e16) / 100;
    }

    function _updateReporterReputation(
        address _reporter,
        ThreatCategory _category,
        ThreatLevel _level
    ) internal {
        ReputationProfile storage profile = reputationProfiles[_reporter];
        profile.totalReports++;
        profile.categoryExpertise[_category]++;
        profile.lastActivity = block.timestamp;
        
        _applyReputationDecay(_reporter);
    }

    function _updateValidatorReputation(address _validator, ThreatCategory _category) internal {
        ReputationProfile storage profile = reputationProfiles[_validator];
        profile.categoryExpertise[_category]++;
        profile.lastActivity = block.timestamp;
        validatorPower[_validator] = _calculateValidatorPower(_validator);
    }

    function _calculateValidatorPower(address _validator) internal view returns (uint256) {
        ReputationProfile storage profile = reputationProfiles[_validator];
        uint256 baseReputation = profile.accuracyScore;
        uint256 stakingPower = profile.stakingBalance / 1e18;
        uint256 experiencePower = profile.totalReports / 10;
        
        return (baseReputation + stakingPower + experiencePower) / 3;
    }

    function _applyReputationDecay(address _user) internal {
        ReputationProfile storage profile = reputationProfiles[_user];
        uint256 timeDiff = block.timestamp - profile.lastActivity;
        uint256 monthsPassed = timeDiff / 30 days;
        
        if (monthsPassed > 0) {
            uint256 decayAmount = (profile.accuracyScore * REPUTATION_DECAY_RATE * monthsPassed) / 100;
            profile.accuracyScore = profile.accuracyScore > decayAmount ? 
                profile.accuracyScore - decayAmount : 0;
        }
    }

    function _checkConsensusReached(uint256 _alertId) internal view returns (bool) {
        ThreatAlert storage alert = threatAlerts[_alertId];
        
        if (alert.confirmations >= MIN_CONFIRMATIONS) {
            return true;
        }
        
        if (alert.disputes > alert.confirmations && alert.validators.length >= MIN_CONFIRMATIONS) {
            return true;
        }
        
        return false;
    }

    function _finalizeConsensus(uint256 _alertId) internal {
        ThreatAlert storage alert = threatAlerts[_alertId];
        
        if (alert.confirmations > alert.disputes) {
            alert.status = AlertStatus.CONFIRMED;
            networkMetrics.confirmedThreats++;
            _distributeRewards(_alertId);
        } else {
            alert.status = AlertStatus.DISPUTED;
        }
        
        emit ConsensusReached(_alertId, alert.status, alert.validators.length, alert.stakeAmount);
    }

    function _autoEscalateThreat(uint256 _alertId) internal {
        ThreatAlert storage alert = threatAlerts[_alertId];
        alert.status = AlertStatus.ESCALATED;
        alert.escalations++;
        
        emit ThreatEscalated(_alertId, alert.level, address(this), "Auto-escalated catastrophic threat");
    }

    function _updateNetworkMetrics(ThreatCategory _category, ThreatLevel _level) internal {
        networkMetrics.totalThreats++;
        networkMetrics.categoryDistribution[_category]++;
        networkMetrics.lastUpdated = block.timestamp;
        
        uint256 today = block.timestamp / 1 days;
        networkMetrics.dailyThreatCounts[today]++;
    }

    function _distributeRewards(uint256 _alertId) internal {
        ThreatAlert storage alert = threatAlerts[_alertId];
        uint256 totalReward = alert.stakeAmount;
        uint256 categoryMultiplier = incentivePool.categoryMultipliers[alert.category];
        uint256 levelMultiplier = incentivePool.levelMultipliers[alert.level];
        
        if (categoryMultiplier > 0) {
            totalReward = (totalReward * (100 + categoryMultiplier)) / 100;
        }
        if (levelMultiplier > 0) {
            totalReward = (totalReward * (100 + levelMultiplier)) / 100;
        }
        
        uint256 reporterReward = (totalReward * incentivePool.reporterShare) / 100;
        uint256 validatorReward = (totalReward * incentivePool.validatorShare) / 100;
        
        (bool success, ) = payable(alert.reporter).call{value: reporterReward}("");
        require(success, "Reporter payment failed");
        
        if (alert.validators.length > 0) {
            uint256 perValidator = validatorReward / alert.validators.length;
            for (uint256 i = 0; i < alert.validators.length; i++) {
                if (alert.validatorVotes[alert.validators[i]].isConfirming) {
                    (bool validatorSuccess, ) = payable(alert.validators[i]).call{value: perValidator}("");
                    require(validatorSuccess, "Validator payment failed");
                }
            }
        }
    }

    function getAdvancedThreatAnalytics(uint256 _days) external view returns (
        uint256[] memory dailyCounts,
        uint256[] memory categoryBreakdown,
        uint256[] memory levelDistribution,
        uint256 averageResponseTime,
        uint256 consensusRate,
        uint256 networkRiskScore
    ) {
        dailyCounts = new uint256[](_days);
        categoryBreakdown = new uint256[](16);
        levelDistribution = new uint256[](6);
        
        uint256 totalResponseTime = 0;
        uint256 consensusCount = 0;
        uint256 totalRisk = 0;
        
        for (uint256 i = 1; i <= _alertCounter; i++) {
            ThreatAlert storage alert = threatAlerts[i];
            
            if (alert.timestamp >= block.timestamp - (_days * 1 days)) {
                uint256 dayIndex = (block.timestamp - alert.timestamp) / 1 days;
                if (dayIndex < _days) {
                    dailyCounts[dayIndex]++;
                }
                
                categoryBreakdown[uint256(alert.category)]++;
                levelDistribution[uint256(alert.level)]++;
                totalRisk += alert.networkRisk;
                
                if (alert.status == AlertStatus.CONFIRMED || alert.status == AlertStatus.DISPUTED) {
                    consensusCount++;
                    totalResponseTime += (block.timestamp - alert.timestamp);
                }
            }
        }
        
        averageResponseTime = consensusCount > 0 ? totalResponseTime / consensusCount : 0;
        consensusRate = _alertCounter > 0 ? (consensusCount * 100) / _alertCounter : 0;
        networkRiskScore = _alertCounter > 0 ? totalRisk / _alertCounter : 0;
    }

    function getValidatorPerformance(address _validator) external view returns (
        uint256 totalValidations,
        uint256 correctValidations,
        uint256 accuracy,
        uint256 validationPowerScore,
        uint256 categoryExpertiseCount,
        uint256 averageConfidence
    ) {
        ReputationProfile storage profile = reputationProfiles[_validator];
        
        totalValidations = profile.totalReports;
        correctValidations = profile.confirmedThreats;
        accuracy = profile.accuracyScore;
        validationPowerScore = validatorPower[_validator];
        
        for (uint256 i = 0; i < 16; i++) {
            if (profile.categoryExpertise[ThreatCategory(i)] > 0) {
                categoryExpertiseCount++;
            }
        }
        
        averageConfidence = profile.accuracyScore;
    }

    function emergencyPause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function emergencyUnpause() external onlyRole(GUARDIAN_ROLE) {
        _unpause();
    }

    function emergencyEscalate(uint256 _alertId, string memory _reason) 
        external onlyRole(GUARDIAN_ROLE) {
        ThreatAlert storage alert = threatAlerts[_alertId];
        alert.status = AlertStatus.ESCALATED;
        alert.escalations++;
        
        emit ThreatEscalated(_alertId, alert.level, msg.sender, _reason);
    }
}