// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title CerberusAlerts - Advanced Threat Detection System
 * @dev Multi-signature threat validation with staking mechanism
 * @author Cerberus Watchdog Team
 */
contract CerberusAlerts is Ownable, ReentrancyGuard, Pausable {
    
    // Enums for better categorization
    enum ThreatLevel { INFO, LOW, MEDIUM, HIGH, CRITICAL }
    enum AlertStatus { PENDING, CONFIRMED, DISPUTED, RESOLVED }
    enum ThreatCategory { 
        UNKNOWN, RUG_PULL, FLASH_LOAN_ATTACK, FRONT_RUNNING, 
        MEV_ABUSE, PRICE_MANIPULATION, SMART_CONTRACT_EXPLOIT,
        PHISHING_CONTRACT, HONEY_POT, GOVERNANCE_ATTACK 
    }

    // Advanced threat intelligence structure
    struct ThreatAlert {
        uint256 alertId;
        bytes32 txHash;
        address flaggedAddress;
        address reporter;
        uint256 timestamp;
        ThreatLevel level;
        ThreatCategory category;
        AlertStatus status;
        uint256 confidenceScore;
        string threatDescription;
        uint256 stakeAmount;
        uint256 confirmations;
        uint256 disputes;
        address[] validators;
        bytes32 modelHash;
    }

    // Reputation system for AI reporters and validators
    struct ReputationProfile {
        uint256 totalReports;
        uint256 confirmedThreats;
        uint256 falsePositives;
        uint256 accuracyScore;
        uint256 stakingBalance;
        bool isBlacklisted;
        uint256 lastActivity;
        string profileMetadata;
    }

    // ML Model metadata for version control
    struct MLModelInfo {
        bytes32 modelHash;
        string version;
        uint256 accuracy;
        uint256 deployedAt;
        address deployer;
        bool isActive;
        string modelType;
        uint256 trainingDataSize;
    }

    // Advanced analytics structure
    struct ThreatAnalytics {
        uint256 totalThreats;
        uint256 confirmedThreats;
        uint256 falsePositives;
        uint256 averageConfidence;
        uint256 averageResponseTime;
        mapping(ThreatCategory => uint256) categoryBreakdown;
        mapping(uint256 => uint256) dailyThreatCounts; // timestamp => count
    }

    // State variables
    uint256 private _alertCounter;
    uint256 public constant MIN_STAKE = 0.01 ether;
    uint256 public constant MIN_CONFIRMATIONS = 3;
    uint256 public constant DISPUTE_WINDOW = 24 hours;
    uint256 public constant MAX_VALIDATORS_PER_ALERT = 10;

    mapping(uint256 => ThreatAlert) public threatAlerts;
    mapping(address => ReputationProfile) public reputationProfiles;
    mapping(bytes32 => MLModelInfo) public mlModels;
    mapping(bytes32 => bool) public reportedTransactions;
    mapping(ThreatCategory => uint256) public categoryThresholds;
    mapping(uint256 => mapping(address => bool)) public alertValidatorVotes;
    mapping(address => uint256[]) public userAlertHistory;
    mapping(bytes32 => uint256[]) public transactionAlerts; // tx => alert IDs
    
    // Advanced analytics
    ThreatAnalytics public analytics;
    uint256 public totalStaked;
    uint256 public totalRewards;
    mapping(uint256 => mapping(ThreatCategory => uint256)) public dailyThreatCounts;
    mapping(address => mapping(ThreatCategory => uint256)) public userThreatSpecialization;

    // Events with comprehensive logging
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
        uint256 timestamp
    );

    event ThreatDisputed(
        uint256 indexed alertId,
        address indexed disputer,
        string reason,
        uint256 timestamp
    );

    event ReputationUpdated(
        address indexed user,
        uint256 accuracyScore,
        uint256 stakingBalance,
        uint256 totalReports
    );

    event MLModelDeployed(
        bytes32 indexed modelHash,
        string version,
        uint256 accuracy,
        address deployer
    );

    event RewardDistributed(
        uint256 indexed alertId,
        address indexed recipient,
        uint256 amount,
        string rewardType
    );

    event EmergencyAction(
        address indexed executor,
        string action,
        uint256 timestamp
    );

    // Role-based access control
    bytes32 public constant AI_REPORTER_ROLE = keccak256("AI_REPORTER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant ANALYTICS_ROLE = keccak256("ANALYTICS_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    mapping(bytes32 => mapping(address => bool)) private _roles;

    modifier onlyRole(bytes32 role) {
        require(_roles[role][msg.sender] || msg.sender == owner(), "CerberusAlerts: Insufficient permissions");
        _;
    }

    modifier validAlert(uint256 alertId) {
        require(alertId > 0 && alertId <= _alertCounter, "CerberusAlerts: Invalid alert ID");
        _;
    }

    modifier notBlacklisted() {
        require(!reputationProfiles[msg.sender].isBlacklisted, "CerberusAlerts: Address blacklisted");
        _;
    }

    constructor() Ownable() {
        // Initialize roles for deployer
        _roles[AI_REPORTER_ROLE][msg.sender] = true;
        _roles[VALIDATOR_ROLE][msg.sender] = true;
        _roles[ANALYTICS_ROLE][msg.sender] = true;
        _roles[EMERGENCY_ROLE][msg.sender] = true;
        
        // Initialize threat category thresholds (confidence scores)
        categoryThresholds[ThreatCategory.UNKNOWN] = 30;
        categoryThresholds[ThreatCategory.RUG_PULL] = 85;
        categoryThresholds[ThreatCategory.FLASH_LOAN_ATTACK] = 90;
        categoryThresholds[ThreatCategory.FRONT_RUNNING] = 75;
        categoryThresholds[ThreatCategory.MEV_ABUSE] = 70;
        categoryThresholds[ThreatCategory.PRICE_MANIPULATION] = 80;
        categoryThresholds[ThreatCategory.SMART_CONTRACT_EXPLOIT] = 95;
        categoryThresholds[ThreatCategory.PHISHING_CONTRACT] = 85;
        categoryThresholds[ThreatCategory.HONEY_POT] = 80;
        categoryThresholds[ThreatCategory.GOVERNANCE_ATTACK] = 95;
    }

    /**
     * @dev Report a threat with advanced validation and ML model verification
     */
    function reportThreat(
        bytes32 _txHash,
        address _flaggedAddress,
        ThreatLevel _level,
        ThreatCategory _category,
        uint256 _confidenceScore,
        string memory _description,
        bytes32 _modelHash
    ) external payable onlyRole(AI_REPORTER_ROLE) whenNotPaused nonReentrant notBlacklisted {
        require(_confidenceScore <= 100, "CerberusAlerts: Invalid confidence score");
        require(msg.value >= MIN_STAKE, "CerberusAlerts: Insufficient stake");
        require(!reportedTransactions[_txHash], "CerberusAlerts: Transaction already reported");
        require(mlModels[_modelHash].isActive, "CerberusAlerts: Invalid ML model");
        require(_confidenceScore >= categoryThresholds[_category], "CerberusAlerts: Confidence below threshold");
        require(bytes(_description).length > 0, "CerberusAlerts: Description required");

        _alertCounter++;
        uint256 alertId = _alertCounter;

        // Create new threat alert
        ThreatAlert storage alert = threatAlerts[alertId];
        alert.alertId = alertId;
        alert.txHash = _txHash;
        alert.flaggedAddress = _flaggedAddress;
        alert.reporter = msg.sender;
        alert.timestamp = block.timestamp;
        alert.level = _level;
        alert.category = _category;
        alert.status = AlertStatus.PENDING;
        alert.confidenceScore = _confidenceScore;
        alert.threatDescription = _description;
        alert.stakeAmount = msg.value;
        alert.modelHash = _modelHash;

        // Update mappings
        reportedTransactions[_txHash] = true;
        userAlertHistory[msg.sender].push(alertId);
        transactionAlerts[_txHash].push(alertId);
        totalStaked += msg.value;

        // Update reputation profile
        ReputationProfile storage profile = reputationProfiles[msg.sender];
        profile.totalReports++;
        profile.stakingBalance += msg.value;
        profile.lastActivity = block.timestamp;

        // Update specialization tracking
        userThreatSpecialization[msg.sender][_category]++;

        // Update analytics
        uint256 today = block.timestamp / 1 days;
        dailyThreatCounts[today][_category]++;
        analytics.totalThreats++;

        emit ThreatReported(
            alertId, _txHash, _flaggedAddress, _level, _category, 
            _confidenceScore, msg.sender, block.timestamp, _modelHash
        );

        // Auto-confirm critical threats with very high confidence
        if (_level == ThreatLevel.CRITICAL && _confidenceScore >= 98) {
            _autoConfirmThreat(alertId);
        }
    }

    /**
     * @dev Validator confirms a threat report with reasoning
     */
    function confirmThreat(
        uint256 _alertId,
        string memory _reasoning
    ) external payable onlyRole(VALIDATOR_ROLE) validAlert(_alertId) whenNotPaused notBlacklisted {
        ThreatAlert storage alert = threatAlerts[_alertId];
        require(alert.status == AlertStatus.PENDING, "CerberusAlerts: Alert not pending");
        require(!alertValidatorVotes[_alertId][msg.sender], "CerberusAlerts: Already voted");
        require(msg.value >= MIN_STAKE / 2, "CerberusAlerts: Insufficient validator stake");
        require(block.timestamp <= alert.timestamp + DISPUTE_WINDOW, "CerberusAlerts: Validation window closed");
        require(alert.validators.length < MAX_VALIDATORS_PER_ALERT, "CerberusAlerts: Max validators reached");
        require(bytes(_reasoning).length > 0, "CerberusAlerts: Reasoning required");

        alertValidatorVotes[_alertId][msg.sender] = true;
        alert.validators.push(msg.sender);
        alert.confirmations++;

        // Update validator reputation
        ReputationProfile storage validatorProfile = reputationProfiles[msg.sender];
        validatorProfile.lastActivity = block.timestamp;
        validatorProfile.stakingBalance += msg.value;

        if (alert.confirmations >= MIN_CONFIRMATIONS) {
            alert.status = AlertStatus.CONFIRMED;
            analytics.confirmedThreats++;
            
            // Distribute rewards
            _distributeRewards(_alertId);
            
            // Update reputations
            _updateConfirmationReputations(_alertId);
        }

        emit ThreatConfirmed(_alertId, msg.sender, alert.confirmations, block.timestamp);
    }

    /**
     * @dev Dispute a threat report with detailed reasoning
     */
    function disputeThreat(
        uint256 _alertId,
        string memory _reason
    ) external payable validAlert(_alertId) whenNotPaused notBlacklisted {
        require(msg.value >= MIN_STAKE, "CerberusAlerts: Insufficient dispute stake");
        require(bytes(_reason).length > 0, "CerberusAlerts: Dispute reason required");
        
        ThreatAlert storage alert = threatAlerts[_alertId];
        require(alert.status != AlertStatus.RESOLVED, "CerberusAlerts: Alert already resolved");
        require(block.timestamp <= alert.timestamp + DISPUTE_WINDOW, "CerberusAlerts: Dispute window closed");
        
        alert.disputes++;
        alert.status = AlertStatus.DISPUTED;

        // Update disputer reputation
        ReputationProfile storage disputerProfile = reputationProfiles[msg.sender];
        disputerProfile.lastActivity = block.timestamp;
        disputerProfile.stakingBalance += msg.value;

        emit ThreatDisputed(_alertId, msg.sender, _reason, block.timestamp);
    }

    /**
     * @dev Deploy ML model with comprehensive metadata
     */
    function deployMLModel(
        bytes32 _modelHash,
        string memory _version,
        uint256 _accuracy,
        string memory _modelType,
        uint256 _trainingDataSize
    ) external onlyOwner {
        require(_accuracy <= 100, "CerberusAlerts: Invalid accuracy");
        require(bytes(_version).length > 0, "CerberusAlerts: Version required");
        require(bytes(_modelType).length > 0, "CerberusAlerts: Model type required");
        require(_trainingDataSize > 0, "CerberusAlerts: Training data size required");
        
        mlModels[_modelHash] = MLModelInfo({
            modelHash: _modelHash,
            version: _version,
            accuracy: _accuracy,
            deployedAt: block.timestamp,
            deployer: msg.sender,
            isActive: true,
            modelType: _modelType,
            trainingDataSize: _trainingDataSize
        });

        emit MLModelDeployed(_modelHash, _version, _accuracy, msg.sender);
    }

    /**
     * @dev Get comprehensive threat analytics for specified time period
     */
    function getThreatAnalytics(
        uint256 _days
    ) external view returns (
        uint256[] memory dailyCounts,
        uint256[] memory categoryBreakdown,
        uint256 averageConfidence,
        uint256 falsePositiveRate,
        uint256 totalStakeAmount,
        uint256 responseTimeAverage
    ) {
        dailyCounts = new uint256[](_days);
        categoryBreakdown = new uint256[](10); // Number of threat categories
        
        uint256 totalConfidence = 0;
        uint256 totalAlerts = 0;
        uint256 totalResponseTime = 0;
        uint256 confirmedInPeriod = 0;
        
        uint256 cutoffTime = block.timestamp - (_days * 1 days);
        
        // Calculate analytics for the past _days
        for (uint256 i = 1; i <= _alertCounter; i++) {
            ThreatAlert storage alert = threatAlerts[i];
            
            if (alert.timestamp >= cutoffTime) {
                uint256 dayIndex = (block.timestamp - alert.timestamp) / 1 days;
                if (dayIndex < _days) {
                    dailyCounts[dayIndex]++;
                }
                
                categoryBreakdown[uint256(alert.category)]++;
                totalConfidence += alert.confidenceScore;
                totalAlerts++;
                
                if (alert.status == AlertStatus.CONFIRMED) {
                    confirmedInPeriod++;
                    // Calculate response time (time from report to confirmation)
                    if (alert.validators.length > 0) {
                        totalResponseTime += (block.timestamp - alert.timestamp);
                    }
                }
            }
        }
        
        averageConfidence = totalAlerts > 0 ? totalConfidence / totalAlerts : 0;
        falsePositiveRate = totalAlerts > 0 ? 
            ((totalAlerts - confirmedInPeriod) * 100) / totalAlerts : 0;
        totalStakeAmount = totalStaked;
        responseTimeAverage = confirmedInPeriod > 0 ? totalResponseTime / confirmedInPeriod : 0;
    }

    /**
     * @dev Get comprehensive address risk profile with historical analysis
     */
    function getAddressRiskProfile(
        address _address
    ) external view returns (
        uint256 totalIncidents,
        uint256 confirmedIncidents,
        ThreatCategory[] memory categories,
        uint256 lastIncidentTime,
        uint256 riskScore,
        uint256[] memory incidentTimestamps
    ) {
        uint256[] memory tempCategories = new uint256[](10);
        uint256 categoryCount = 0;
        uint256 lastTime = 0;
        uint256[] memory tempTimestamps = new uint256[](_alertCounter);
        uint256 timestampCount = 0;
        
        for (uint256 i = 1; i <= _alertCounter; i++) {
            ThreatAlert storage alert = threatAlerts[i];
            if (alert.flaggedAddress == _address) {
                totalIncidents++;
                tempTimestamps[timestampCount] = alert.timestamp;
                timestampCount++;
                
                if (alert.status == AlertStatus.CONFIRMED) {
                    confirmedIncidents++;
                }
                if (alert.timestamp > lastTime) {
                    lastTime = alert.timestamp;
                }
                
                // Track unique categories
                uint256 catIndex = uint256(alert.category);
                if (tempCategories[catIndex] == 0) {
                    tempCategories[catIndex] = 1;
                    categoryCount++;
                }
            }
        }
        
        // Create properly sized arrays
        categories = new ThreatCategory[](categoryCount);
        incidentTimestamps = new uint256[](timestampCount);
        
        uint256 index = 0;
        for (uint256 i = 0; i < 10; i++) {
            if (tempCategories[i] > 0) {
                categories[index] = ThreatCategory(i);
                index++;
            }
        }
        
        for (uint256 i = 0; i < timestampCount; i++) {
            incidentTimestamps[i] = tempTimestamps[i];
        }
        
        lastIncidentTime = lastTime;
        
        // Calculate risk score (0-100)
        if (totalIncidents == 0) {
            riskScore = 0;
        } else {
            uint256 confirmationRate = (confirmedIncidents * 100) / totalIncidents;
            uint256 recentActivityBonus = (lastTime > block.timestamp - 30 days) ? 20 : 0;
            riskScore = confirmationRate + recentActivityBonus;
            if (riskScore > 100) riskScore = 100;
        }
    }

    /**
     * @dev Get user reputation and performance metrics
     */
    function getUserReputation(address _user) external view returns (
        uint256 totalReports,
        uint256 confirmedThreats,
        uint256 falsePositives,
        uint256 accuracyScore,
        uint256 stakingBalance,
        bool isBlacklisted,
        ThreatCategory bestSpecialization,
        uint256 specializationCount
    ) {
        ReputationProfile storage profile = reputationProfiles[_user];
        
        totalReports = profile.totalReports;
        confirmedThreats = profile.confirmedThreats;
        falsePositives = profile.falsePositives;
        accuracyScore = profile.accuracyScore;
        stakingBalance = profile.stakingBalance;
        isBlacklisted = profile.isBlacklisted;
        
        // Find best specialization
        uint256 maxSpecialization = 0;
        for (uint256 i = 0; i < 10; i++) {
            uint256 count = userThreatSpecialization[_user][ThreatCategory(i)];
            if (count > maxSpecialization) {
                maxSpecialization = count;
                bestSpecialization = ThreatCategory(i);
            }
        }
        specializationCount = maxSpecialization;
    }

    // Internal functions
    function _autoConfirmThreat(uint256 _alertId) private {
        ThreatAlert storage alert = threatAlerts[_alertId];
        alert.status = AlertStatus.CONFIRMED;
        alert.confirmations = MIN_CONFIRMATIONS;
        analytics.confirmedThreats++;
        
        emit ThreatConfirmed(_alertId, address(this), MIN_CONFIRMATIONS, block.timestamp);
    }

    function _distributeRewards(uint256 _alertId) private {
        ThreatAlert storage alert = threatAlerts[_alertId];
        uint256 totalReward = alert.stakeAmount;
        uint256 reporterShare = (totalReward * 60) / 100;
        uint256 validatorShare = (totalReward * 40) / 100;

        // Pay reporter
        (bool success, ) = payable(alert.reporter).call{value: reporterShare}("");
        require(success, "CerberusAlerts: Reporter payment failed");
        
        emit RewardDistributed(_alertId, alert.reporter, reporterShare, "REPORTER_REWARD");

        // Distribute among validators
        if (alert.validators.length > 0) {
            uint256 perValidator = validatorShare / alert.validators.length;
            for (uint256 i = 0; i < alert.validators.length; i++) {
                (bool validatorSuccess, ) = payable(alert.validators[i]).call{value: perValidator}("");
                require(validatorSuccess, "CerberusAlerts: Validator payment failed");
                
                emit RewardDistributed(_alertId, alert.validators[i], perValidator, "VALIDATOR_REWARD");
            }
        }
        
        totalRewards += totalReward;
    }

    function _updateConfirmationReputations(uint256 _alertId) private {
        ThreatAlert storage alert = threatAlerts[_alertId];
        
        // Update reporter reputation
        ReputationProfile storage reporterProfile = reputationProfiles[alert.reporter];
        reporterProfile.confirmedThreats++;
        reporterProfile.accuracyScore = (reporterProfile.confirmedThreats * 100) / reporterProfile.totalReports;
        
        emit ReputationUpdated(
            alert.reporter, 
            reporterProfile.accuracyScore, 
            reporterProfile.stakingBalance,
            reporterProfile.totalReports
        );

        // Update validator reputations
        for (uint256 i = 0; i < alert.validators.length; i++) {
            ReputationProfile storage validatorProfile = reputationProfiles[alert.validators[i]];
            validatorProfile.confirmedThreats++;
            validatorProfile.accuracyScore = (validatorProfile.confirmedThreats * 100) / 
                (validatorProfile.totalReports > 0 ? validatorProfile.totalReports : 1);
                
            emit ReputationUpdated(
                alert.validators[i], 
                validatorProfile.accuracyScore, 
                validatorProfile.stakingBalance,
                validatorProfile.totalReports
            );
        }
    }

    // Role management functions
    function grantRole(bytes32 role, address account) external onlyOwner {
        _roles[role][account] = true;
    }

    function revokeRole(bytes32 role, address account) external onlyOwner {
        _roles[role][account] = false;
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account] || account == owner();
    }

    function blacklistAddress(address _address) external onlyOwner {
        reputationProfiles[_address].isBlacklisted = true;
    }

    function unblacklistAddress(address _address) external onlyOwner {
        reputationProfiles[_address].isBlacklisted = false;
    }

    // Emergency functions
    function pause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
        emit EmergencyAction(msg.sender, "CONTRACT_PAUSED", block.timestamp);
    }

    function unpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
        emit EmergencyAction(msg.sender, "CONTRACT_UNPAUSED", block.timestamp);
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "CerberusAlerts: Emergency withdrawal failed");
        
        emit EmergencyAction(msg.sender, "EMERGENCY_WITHDRAWAL", block.timestamp);
    }

    function deactivateMLModel(bytes32 _modelHash) external onlyOwner {
        mlModels[_modelHash].isActive = false;
    }

    // View functions for frontend integration
    function getAlert(uint256 _alertId) external view validAlert(_alertId) returns (
        uint256 alertId,
        bytes32 txHash,
        address flaggedAddress,
        address reporter,
        uint256 timestamp,
        ThreatLevel level,
        ThreatCategory category,
        AlertStatus status,
        uint256 confidenceScore,
        string memory description,
        uint256 confirmations,
        uint256 disputes
    ) {
        ThreatAlert storage alert = threatAlerts[_alertId];
        return (
            alert.alertId,
            alert.txHash,
            alert.flaggedAddress,
            alert.reporter,
            alert.timestamp,
            alert.level,
            alert.category,
            alert.status,
            alert.confidenceScore,
            alert.threatDescription,
            alert.confirmations,
            alert.disputes
        );
    }

    function getRecentAlerts(uint256 _limit) external view returns (uint256[] memory) {
        uint256 count = _limit > _alertCounter ? _alertCounter : _limit;
        uint256[] memory recentAlerts = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            recentAlerts[i] = _alertCounter - i;
        }
        
        return recentAlerts;
    }

    function getAlertsByCategory(ThreatCategory _category, uint256 _limit) external view returns (uint256[] memory) {
        uint256[] memory tempAlerts = new uint256[](_alertCounter);
        uint256 matchCount = 0;
        
        for (uint256 i = 1; i <= _alertCounter; i++) {
            if (threatAlerts[i].category == _category) {
                tempAlerts[matchCount] = i;
                matchCount++;
                if (matchCount >= _limit) break;
            }
        }
        
        uint256[] memory result = new uint256[](matchCount);
        for (uint256 i = 0; i < matchCount; i++) {
            result[i] = tempAlerts[i];
        }
        
        return result;
    }

    function getTotalAlerts() external view returns (uint256) {
        return _alertCounter;
    }

    function getContractStats() external view returns (
        uint256 totalAlerts,
        uint256 totalConfirmed,
        uint256 totalStakeAmount,
        uint256 totalRewardAmount,
        uint256 activeValidators,
        uint256 activeReporters
    ) {
        totalAlerts = _alertCounter;
        totalConfirmed = analytics.confirmedThreats;
        totalStakeAmount = totalStaked;
        totalRewardAmount = totalRewards;
        
        // Count active users (simplified)
        activeValidators = 0;
        activeReporters = 0;
        // Note: In a real implementation, you'd want to maintain separate mappings
        // for more efficient counting of active users
    }

    // Fallback functions
    receive() external payable {
        // Allow contract to receive Ether for staking
    }

    fallback() external payable {
        revert("CerberusAlerts: Function not found");
    }
}