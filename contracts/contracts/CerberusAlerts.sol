// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title CerberusAlerts
 * @dev Advanced threat detection system for U2U Network
 * 
 *
 *
 */

// CORRECT imports for Solidity 0.8.28 + OpenZeppelin v5.x
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract CerberusAlerts is Ownable, ReentrancyGuard, Pausable {

    enum ThreatLevel {
        INFO,
        MEDIUM,
        HIGH,
        CRITICAL
    }
    
    enum ThreatCategory {
        RUG_PULL,
        FLASH_LOAN_ATTACK,
        FRONT_RUNNING,
        SMART_CONTRACT_EXPLOIT,
        PHISHING_CONTRACT,
        PRICE_MANIPULATION,
        HONEY_POT,
        GOVERNANCE_ATTACK,
        MEV_ABUSE
    }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct Alert {
        uint256 id;
        bytes32 txHash;
        address flaggedAddress;
        ThreatLevel level;
        ThreatCategory category;
        uint256 confidenceScore;
        address reporter;
        uint256 timestamp;
        bytes32 modelHash;
        bool isActive;
    }
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    uint256 public totalAlerts;
    mapping(uint256 => Alert) public alerts;
    mapping(bytes32 => uint256) public txHashToAlertId;
    mapping(address => uint256[]) public alertsByAddress;
    mapping(address => bool) public authorizedReporters;
    
    uint256 public criticalAlertsCount;
    uint256 public highAlertsCount;
    uint256 public mediumAlertsCount;
    
    // ============================================
    // EVENTS
    // ============================================
    
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
    
    event AlertDeactivated(
        uint256 indexed alertId,
        address deactivatedBy,
        uint256 timestamp
    );
    
    event ReporterAuthorized(address indexed reporter, bool authorized);
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier onlyAuthorized() {
        require(
            authorizedReporters[msg.sender] || msg.sender == owner(),
            "Not authorized to report threats"
        );
        _;
    }
    
    // ============================================
    // CONSTRUCTOR - FOR SOLIDITY 0.8.28
    // ============================================
    
    constructor(address initialOwner) Ownable(initialOwner) {
        authorizedReporters[initialOwner] = true;
        emit ReporterAuthorized(initialOwner, true);
    }
    
    // ============================================
    // MAIN FUNCTIONS
    // ============================================
    
    function reportThreat(
        bytes32 _txHash,
        address _flaggedAddress,
        ThreatLevel _level,
        ThreatCategory _category,
        uint256 _confidenceScore,
        bytes32 _modelHash
    ) external onlyAuthorized whenNotPaused nonReentrant {
        require(_txHash != bytes32(0), "Invalid tx hash");
        require(_flaggedAddress != address(0), "Invalid address");
        require(_confidenceScore <= 100, "Confidence must be 0-100");
        require(txHashToAlertId[_txHash] == 0, "Alert exists");
        
        uint256 alertId = totalAlerts++;
        
        alerts[alertId] = Alert({
            id: alertId,
            txHash: _txHash,
            flaggedAddress: _flaggedAddress,
            level: _level,
            category: _category,
            confidenceScore: _confidenceScore,
            reporter: msg.sender,
            timestamp: block.timestamp,
            modelHash: _modelHash,
            isActive: true
        });
        
        txHashToAlertId[_txHash] = alertId;
        alertsByAddress[_flaggedAddress].push(alertId);
        
        if (_level == ThreatLevel.CRITICAL) {
            criticalAlertsCount++;
        } else if (_level == ThreatLevel.HIGH) {
            highAlertsCount++;
        } else if (_level == ThreatLevel.MEDIUM) {
            mediumAlertsCount++;
        }
        
        emit ThreatReported(
            alertId,
            _txHash,
            _flaggedAddress,
            _level,
            _category,
            _confidenceScore,
            msg.sender,
            block.timestamp,
            _modelHash
        );
    }
    
    function deactivateAlert(uint256 _alertId) external onlyOwner {
        require(_alertId < totalAlerts, "Alert does not exist");
        require(alerts[_alertId].isActive, "Already deactivated");
        
        alerts[_alertId].isActive = false;
        
        ThreatLevel level = alerts[_alertId].level;
        if (level == ThreatLevel.CRITICAL && criticalAlertsCount > 0) {
            criticalAlertsCount--;
        } else if (level == ThreatLevel.HIGH && highAlertsCount > 0) {
            highAlertsCount--;
        } else if (level == ThreatLevel.MEDIUM && mediumAlertsCount > 0) {
            mediumAlertsCount--;
        }
        
        emit AlertDeactivated(_alertId, msg.sender, block.timestamp);
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    function setAuthorizedReporter(address _reporter, bool _authorized) 
        external 
        onlyOwner 
    {
        require(_reporter != address(0), "Invalid address");
        authorizedReporters[_reporter] = _authorized;
        emit ReporterAuthorized(_reporter, _authorized);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getAlert(uint256 _alertId) 
        external 
        view 
        returns (Alert memory) 
    {
        require(_alertId < totalAlerts, "Alert does not exist");
        return alerts[_alertId];
    }
    
    function getAlertsByAddress(address _address) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return alertsByAddress[_address];
    }
    
    function getAlertIdByTxHash(bytes32 _txHash) 
        external 
        view 
        returns (uint256) 
    {
        return txHashToAlertId[_txHash];
    }
    
    function getStatistics() 
        external 
        view 
        returns (
            uint256 total,
            uint256 critical,
            uint256 high,
            uint256 medium
        ) 
    {
        return (
            totalAlerts,
            criticalAlertsCount,
            highAlertsCount,
            mediumAlertsCount
        );
    }
    
    function getRecentAlerts(uint256 _count) 
        external 
        view 
        returns (Alert[] memory) 
    {
        uint256 count = _count > totalAlerts ? totalAlerts : _count;
        Alert[] memory recentAlerts = new Alert[](count);
        
        for (uint256 i = 0; i < count; i++) {
            recentAlerts[i] = alerts[totalAlerts - 1 - i];
        }
        
        return recentAlerts;
    }
}
