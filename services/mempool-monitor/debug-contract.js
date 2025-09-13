const { ethers } = require('ethers');
require('dotenv').config();

const CONTRACT_ABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "alertId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum CerberusAdvanced.AlertStatus",
          "name": "finalStatus",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "validatorCount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "totalStake",
          "type": "uint256"
        }
      ],
      "name": "ConsensusReached",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "modelHash",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "version",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "accuracy",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "deployer",
          "type": "address"
        }
      ],
      "name": "ModelDeployed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Paused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "accuracyScore",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stakingBalance",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "validationPower",
          "type": "uint256"
        }
      ],
      "name": "ReputationUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "previousAdminRole",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "newAdminRole",
          "type": "bytes32"
        }
      ],
      "name": "RoleAdminChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleGranted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleRevoked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "alertId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "validator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "confirmations",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "consensusReached",
          "type": "uint256"
        }
      ],
      "name": "ThreatConfirmed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "alertId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum CerberusAdvanced.ThreatLevel",
          "name": "newLevel",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "escalator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "ThreatEscalated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "alertId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txHash",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "flaggedAddress",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "enum CerberusAdvanced.ThreatLevel",
          "name": "level",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "enum CerberusAdvanced.ThreatCategory",
          "name": "category",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "confidenceScore",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "reporter",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "modelHash",
          "type": "bytes32"
        }
      ],
      "name": "ThreatReported",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Unpaused",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "AI_ORACLE_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DEFAULT_ADMIN_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DISPUTE_WINDOW",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "ESCALATION_WINDOW",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "GUARDIAN_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MAX_VALIDATORS_PER_ALERT",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MIN_CONFIRMATIONS",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MIN_STAKE",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MODEL_GOVERNOR_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "REPUTATION_DECAY_RATE",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "VALIDATOR_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "addressRiskScores",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "alertPriority",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "authorizedOracles",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "enum CerberusAdvanced.ThreatCategory",
          "name": "",
          "type": "uint8"
        }
      ],
      "name": "categoryDistribution",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "enum CerberusAdvanced.ThreatCategory",
          "name": "",
          "type": "uint8"
        }
      ],
      "name": "categoryExpertise",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "enum CerberusAdvanced.ThreatCategory",
          "name": "",
          "type": "uint8"
        }
      ],
      "name": "categoryMultipliers",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "enum CerberusAdvanced.ThreatCategory",
          "name": "",
          "type": "uint8"
        }
      ],
      "name": "categoryThresholds",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "dailyThreatCounts",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_modelHash",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "_version",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_modelType",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "_accuracy",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_precision",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_recall",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_trainingDataSize",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "_trainingMetrics",
          "type": "string"
        },
        {
          "internalType": "bytes32[]",
          "name": "_predecessors",
          "type": "bytes32[]"
        }
      ],
      "name": "deployMLModelWithGovernance",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_alertId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "_reason",
          "type": "string"
        }
      ],
      "name": "emergencyEscalate",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "emergencyPause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "emergencyUnpause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_days",
          "type": "uint256"
        }
      ],
      "name": "getAdvancedThreatAnalytics",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "dailyCounts",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256[]",
          "name": "categoryBreakdown",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256[]",
          "name": "levelDistribution",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256",
          "name": "averageResponseTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "consensusRate",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "networkRiskScore",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getContractStats",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "totalAlerts",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "confirmedAlerts",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalStaked",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalRewards",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        }
      ],
      "name": "getRoleAdmin",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_validator",
          "type": "address"
        }
      ],
      "name": "getValidatorPerformance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "totalValidations",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "correctValidations",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "accuracy",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "validationPowerScore",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "categoryExpertiseCount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "averageConfidence",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "grantRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "hasRole",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "incentivePool",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "totalRewards",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "reporterShare",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "validatorShare",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "guardianShare",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "burnAmount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "enum CerberusAdvanced.ThreatLevel",
          "name": "",
          "type": "uint8"
        }
      ],
      "name": "levelAccuracy",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "enum CerberusAdvanced.ThreatLevel",
          "name": "",
          "type": "uint8"
        }
      ],
      "name": "levelMultipliers",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "mlModels",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "modelHash",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "version",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "modelType",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "accuracy",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "precision",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "recall",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "f1Score",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deployedAt",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "deployer",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "isDeprecated",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "trainingDataSize",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "validationDataSize",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "trainingMetrics",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "performanceScore",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "usageCount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "networkMetrics",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "totalThreats",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "confirmedThreats",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "averageResponseTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "falsePositiveRate",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "threatVelocity",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "networkRiskScore",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "lastUpdated",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "renounceRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txHash",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "_flaggedAddress",
          "type": "address"
        },
        {
          "internalType": "address[]",
          "name": "_relatedAddresses",
          "type": "address[]"
        },
        {
          "internalType": "enum CerberusAdvanced.ThreatLevel",
          "name": "_level",
          "type": "uint8"
        },
        {
          "internalType": "enum CerberusAdvanced.ThreatCategory",
          "name": "_category",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "_confidenceScore",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_severityScore",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "_description",
          "type": "string"
        },
        {
          "internalType": "bytes",
          "name": "_additionalData",
          "type": "bytes"
        },
        {
          "internalType": "bytes32",
          "name": "_modelHash",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "_economicImpact",
          "type": "uint256"
        },
        {
          "internalType": "bytes32[]",
          "name": "_relatedAlerts",
          "type": "bytes32[]"
        }
      ],
      "name": "reportAdvancedThreat",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "reportedTransactions",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "reputationProfiles",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "totalReports",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "confirmedThreats",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "falsePositives",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "accuracyScore",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "stakingBalance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalStaked",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalEarned",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isBlacklisted",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "lastActivity",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "profileMetadata",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "consecutiveCorrect",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "validationPower",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "reputationDecay",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "revokeRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "threatAlerts",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "alertId",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "txHash",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "flaggedAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "reporter",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "enum CerberusAdvanced.ThreatLevel",
          "name": "level",
          "type": "uint8"
        },
        {
          "internalType": "enum CerberusAdvanced.ThreatCategory",
          "name": "category",
          "type": "uint8"
        },
        {
          "internalType": "enum CerberusAdvanced.AlertStatus",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "confidenceScore",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "severityScore",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "threatDescription",
          "type": "string"
        },
        {
          "internalType": "bytes",
          "name": "additionalData",
          "type": "bytes"
        },
        {
          "internalType": "uint256",
          "name": "stakeAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "confirmations",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "disputes",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "escalations",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "economicImpact",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "networkRisk",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "modelHash",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "threatCorrelations",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "transactionAlerts",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "userAlertHistory",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "enum CerberusAdvanced.ThreatCategory",
          "name": "",
          "type": "uint8"
        }
      ],
      "name": "userSpecialization",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_alertId",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "_isConfirming",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "_confidence",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "_reasoning",
          "type": "string"
        },
        {
          "internalType": "bytes",
          "name": "",
          "type": "bytes"
        }
      ],
      "name": "validateThreatWithConsensus",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "validatorPower",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "validatorVotes",
      "outputs": [
        {
          "internalType": "bool",
          "name": "hasVoted",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "isConfirming",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "confidence",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "reasoning",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "stakeAmount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
];

async function debugContractCall() {
    console.log('🔧 DEBUGGING CONTRACT CALL PARAMETERS');
    console.log('=====================================');
    
    const provider = new ethers.JsonRpcProvider('https://rpc-nebulas-testnet.uniultra.xyz');
    const wallet = new ethers.Wallet(process.env.MONITOR_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    
    // Test parameters (same as what monitor uses)
    const testHash = '0x' + require('crypto').createHash('sha256').update('test_' + Date.now()).digest('hex');
    const testParams = [
        testHash, // bytes32 _txHash
        '0xfe89f390C1cf3D6b83171D41bEEF4A3E3A763fAE', // address _flaggedAddress
        [], // address[] _relatedAddresses
        1, // uint8 _level (MEDIUM)
        0, // uint8 _category (UNKNOWN)
        80, // uint256 _confidenceScore
        85, // uint256 _severityScore
        'FORCED: High Gas Price Attack', // string _description
        '0x', // bytes _additionalData
        ethers.keccak256(ethers.toUtf8Bytes("cerberus-v2")), // bytes32 _modelHash
        0, // uint256 _economicImpact
        [] // bytes32[] _relatedAlerts
    ];
    
    console.log('📋 Test Parameters:');
    console.log('  txHash:', testParams[0]);
    console.log('  flaggedAddress:', testParams[1]);
    console.log('  level:', testParams[3]);
    console.log('  category:', testParams[4]);
    console.log('  confidenceScore:', testParams[5]);
    console.log('  description:', testParams[8]);
    console.log('  modelHash:', testParams[9]);
    
    try {
        // Check 1: Is transaction already reported?
        console.log('\n🔍 Check 1: Transaction already reported?');
        const isReported = await contract.reportedTransactions(testParams[0]);
        console.log('  Result:', isReported ? '❌ Already reported' : '✅ Not reported');
        
        // Check 2: Check category threshold
        console.log('\n🔍 Check 2: Category threshold');
        try {
            const threshold = await contract.categoryThresholds(testParams[4]);
            console.log('  Category 0 threshold:', threshold.toString());
            console.log('  Our confidence:', testParams[5]);
            console.log('  Passes threshold?', testParams[5] >= threshold ? '✅ Yes' : '❌ No');
        } catch (error) {
            console.log('  ⚠️ Could not check threshold');
        }
        
        // Check 3: Check model hash
        console.log('\n🔍 Check 3: Model hash validation');
        try {
            const modelInfo = await contract.mlModels(testParams[9]);
            console.log('  Model exists?', modelInfo[9] ? '✅ Yes' : '❌ No'); // isActive
            console.log('  Model active?', modelInfo[9]);
        } catch (error) {
            console.log('  ❌ Model not found or invalid');
        }
        
        // Check 4: Min stake requirement
        console.log('\n🔍 Check 4: Minimum stake');
        try {
            const minStake = await contract.MIN_STAKE();
            console.log('  Required stake:', ethers.formatEther(minStake), 'U2U');
            console.log('  Our stake: 0.01 U2U');
            console.log('  Sufficient?', ethers.parseEther("0.01") >= minStake ? '✅ Yes' : '❌ No');
        } catch (error) {
            console.log('  ⚠️ Could not check min stake');
        }
        
        // Check 5: Estimate gas
        console.log('\n🔍 Check 5: Gas estimation');
        try {
            const gasEstimate = await contract.reportAdvancedThreat.estimateGas(...testParams, {
                value: ethers.parseEther("0.01")
            });
            console.log('  Estimated gas:', gasEstimate.toString());
            console.log('  ✅ Gas estimation successful');
        } catch (error) {
            console.log('  ❌ Gas estimation failed:', error.message);
            
            // Try to identify specific error
            if (error.message.includes('confidence')) {
                console.log('  💡 Likely cause: Invalid confidence score');
            } else if (error.message.includes('threshold')) {
                console.log('  💡 Likely cause: Below category threshold');
            } else if (error.message.includes('model')) {
                console.log('  💡 Likely cause: Invalid model hash');
            } else if (error.message.includes('stake')) {
                console.log('  💡 Likely cause: Insufficient stake amount');
            } else if (error.message.includes('already')) {
                console.log('  💡 Likely cause: Transaction already reported');
            }
        }
        
        // Suggest fixes
        console.log('\n💡 SUGGESTED FIXES:');
        console.log('1. Try with higher confidence score (95)');
        console.log('2. Try with different model hash');
        console.log('3. Try with higher stake (0.02 U2U)');
        console.log('4. Check if model needs to be deployed first');
        
    } catch (error) {
        console.error('Debug failed:', error.message);
    }
}

debugContractCall().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Error:', error);
    process.exit(1);
});