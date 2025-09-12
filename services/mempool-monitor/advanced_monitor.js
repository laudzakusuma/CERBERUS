const { ethers } = require('ethers');
const fetch = require('node-fetch');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
    U2U_RPC_HTTP: 'https://rpc-nebulas-testnet.uniultra.xyz',
    AI_API_URL: process.env.AI_API_URL || 'http://127.0.0.1:5001/predict',
    MONITOR_PRIVATE_KEY: process.env.MONITOR_PRIVATE_KEY || 'a29a6848264f0ae2e5c34ad0858cb6b4aae9355190919b765622b566c7fa808b',
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || '0xBb05190BA95adBf889A61F113E3C251a9C605832',
    POLLING_INTERVAL: 3000,
    MAX_RETRIES: 3,
    BATCH_SIZE: 10,
    ALERT_COOLDOWN: 30000,
    CORRELATION_WINDOW: 300000,
    MIN_VALUE_THRESHOLD: 0.001, // Minimum value in ETH to analyze
    MIN_GAS_THRESHOLD: 30 // Minimum gas price in gwei to analyze
};

// Enhanced Contract ABI (simplified for essential functions)
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

class ThreatAnalyzer extends EventEmitter {
    constructor() {
        super();
        this.threatHistory = new Map();
        this.addressPatterns = new Map();
        this.alertCooldowns = new Map();
    }

    analyzeThreat(txData, aiAnalysis) {
        const correlations = this._analyzePatterns(txData, aiAnalysis);
        const riskScore = this._calculateRiskScore(aiAnalysis, correlations);
        
        const enhancedThreat = {
            txData,
            aiAnalysis,
            correlations,
            riskScore,
            timestamp: Date.now(),
            severity: this._determineSeverity(riskScore, aiAnalysis),
            shouldAlert: riskScore > 70 && aiAnalysis.is_malicious
        };
        
        this.threatHistory.set(txData.hash, enhancedThreat);
        this._updateAddressPattern(txData.from, enhancedThreat);
        
        return enhancedThreat;
    }

    _analyzePatterns(txData, aiAnalysis) {
        const patterns = {
            highGas: false,
            highValue: false,
            contractCreation: false,
            suspiciousPattern: false
        };
        
        const gasPrice = parseFloat(ethers.formatUnits(txData.gasPrice || 0, 'gwei'));
        const value = parseFloat(ethers.formatEther(txData.value || 0));
        
        patterns.highGas = gasPrice > 80;
        patterns.highValue = value > 10;
        patterns.contractCreation = !txData.to;
        patterns.suspiciousPattern = patterns.highGas && patterns.highValue;
        
        return patterns;
    }

    _calculateRiskScore(aiAnalysis, correlations) {
        let score = aiAnalysis.danger_score || 0;
        
        if (correlations.highGas) score += 15;
        if (correlations.highValue) score += 10;
        if (correlations.contractCreation) score += 10;
        if (correlations.suspiciousPattern) score += 20;
        
        return Math.min(score, 100);
    }

    _determineSeverity(riskScore, aiAnalysis) {
        if (riskScore > 90) return 3; // CRITICAL
        if (riskScore > 75) return 2; // HIGH
        if (riskScore > 50) return 1; // MEDIUM
        return 0; // LOW
    }

    _updateAddressPattern(address, threat) {
        if (!this.addressPatterns.has(address)) {
            this.addressPatterns.set(address, {
                transactions: [],
                totalRisk: 0,
                firstSeen: Date.now()
            });
        }
        
        const pattern = this.addressPatterns.get(address);
        pattern.transactions.push(threat);
        pattern.totalRisk += threat.riskScore;
        
        // Keep only recent transactions (last hour)
        const cutoff = Date.now() - 3600000;
        pattern.transactions = pattern.transactions.filter(t => t.timestamp > cutoff);
    }

    canAlert(address) {
        const lastAlert = this.alertCooldowns.get(address);
        const now = Date.now();
        
        if (!lastAlert || now - lastAlert > CONFIG.ALERT_COOLDOWN) {
            this.alertCooldowns.set(address, now);
            return true;
        }
        return false;
    }
}

class CerberusMonitor {
    constructor() {
        this.analyzer = new ThreatAnalyzer();
        this.isRunning = false;
        this.processedTxs = new Set();
        this.stats = {
            startTime: Date.now(),
            totalAnalyzed: 0,
            threatsDetected: 0,
            alertsSent: 0,
            errors: 0,
            lastBlock: 0
        };
    }

    async initialize() {
        try {
            console.log('\n🚀 INITIALIZING CERBERUS MONITOR');
            console.log('='.repeat(50));
            
            // Validate configuration
            if (!CONFIG.MONITOR_PRIVATE_KEY) {
                throw new Error('MONITOR_PRIVATE_KEY not configured');
            }
            
            // Setup blockchain connection
            this.provider = new ethers.JsonRpcProvider(CONFIG.U2U_RPC_HTTP);
            this.wallet = new ethers.Wallet(CONFIG.MONITOR_PRIVATE_KEY, this.provider);
            this.contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, this.wallet);
            
            // Test connections
            const [blockNumber, balance, contractCode] = await Promise.all([
                this.provider.getBlockNumber(),
                this.provider.getBalance(this.wallet.address),
                this.provider.getCode(CONFIG.CONTRACT_ADDRESS)
            ]);
            
            if (contractCode === '0x') {
                throw new Error('Contract not deployed at specified address');
            }
            
            console.log('✅ Blockchain Connection Established');
            console.log(`📦 Current Block: ${blockNumber}`);
            console.log(`💳 Monitor Wallet: ${this.wallet.address}`);
            console.log(`💰 Balance: ${ethers.formatEther(balance)} U2U`);
            console.log(`📜 Contract: ${CONFIG.CONTRACT_ADDRESS}`);
            
            // Test AI connection
            await this.testAIConnection();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.stats.lastBlock = blockNumber;
            
            console.log('='.repeat(50));
            console.log('✨ Monitor Ready!\n');
            
            return true;
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            throw error;
        }
    }

    async testAIConnection() {
        try {
            console.log('\n🤖 Testing AI Sentinel...');
            const response = await fetch(CONFIG.AI_API_URL.replace('/predict', '/'));
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ AI Sentinel: ${data.status}`);
                console.log(`   Version: ${data.version || '2.0.0'}`);
                console.log(`   Model: ${data.isolation_model_loaded ? 'Loaded' : 'Not loaded'}`);
            } else {
                console.warn('⚠️  AI Sentinel not responding properly');
                console.log('   Monitor will continue with limited functionality');
            }
        } catch (error) {
            console.warn('⚠️  AI Sentinel offline - using fallback detection');
        }
    }

    setupEventListeners() {
        // Contract events
        this.contract.on('ThreatReported', (alertId, txHash, flaggedAddress, level, category, confidence, reporter, timestamp, modelHash) => {
            const levelNames = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
            const categoryNames = ['UNKNOWN', 'RUG_PULL', 'FRONT_RUNNING', 'SMART_CONTRACT_EXPLOIT', 'PHISHING'];
            
            console.log('\n' + '🚨'.repeat(20));
            console.log('ON-CHAIN ALERT CONFIRMED');
            console.log('━'.repeat(40));
            console.log(`Alert ID: #${alertId}`);
            console.log(`Tx Hash: ${txHash}`);
            console.log(`Threat Level: ${levelNames[level] || 'UNKNOWN'}`);
            console.log(`Category: ${categoryNames[category] || 'UNKNOWN'}`);
            console.log(`Confidence: ${confidence}%`);
            console.log('━'.repeat(40) + '\n');
        });

        // Graceful shutdown
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }

    async start() {
        if (this.isRunning) {
            console.log('⚠️  Monitor already running');
            return;
        }

        console.log('🔄 Starting monitoring loop...\n');
        this.isRunning = true;

        // Main monitoring loop
        while (this.isRunning) {
            try {
                const currentBlock = await this.provider.getBlockNumber();
                
                if (currentBlock > this.stats.lastBlock) {
                    // Proses blok dan dapatkan nomor blok terakhir yang benar-benar diproses
                    const lastProcessedBlock = await this.processBlocks(this.stats.lastBlock + 1, currentBlock);
                    this.stats.lastBlock = lastProcessedBlock; // Perbarui dengan nomor blok yang benar
                }
                
                // Print stats periodically
                if (this.stats.totalAnalyzed > 0 && this.stats.totalAnalyzed % 50 === 0) {
                    this.printStats();
                }
                
                await this.sleep(CONFIG.POLLING_INTERVAL);
                
            } catch (error) {
                console.error('❌ Monitoring error:', error.message);
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
        return lastBlockToProcess;
    }

    async processBlock(blockNumber) {
        try {
            const block = await this.provider.getBlock(blockNumber, true);
            
            if (!block || !block.transactions || block.transactions.length === 0) {
                return;
            }
            
            console.log(`📦 Processing block ${blockNumber} with ${block.transactions.length} transactions`);
            
            for (const tx of block.transactions) {
                if (!this.processedTxs.has(tx.hash)) {
                    await this.analyzeTransaction(tx);
                    this.processedTxs.add(tx.hash);
                    
                    // Cleanup old entries
                    if (this.processedTxs.size > 1000) {
                        const toDelete = Array.from(this.processedTxs).slice(0, 500);
                        toDelete.forEach(hash => this.processedTxs.delete(hash));
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing block ${blockNumber}:`, error.message);
        }
    }

    async analyzeTransaction(tx) {
        if (!tx || !tx.hash) {
            console.log('   ⏩ Skipping transaction with no hash.');
            return;
        }

        try {
            // Extract transaction data
            const txData = {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value?.toString() || '0',
                gasPrice: tx.gasPrice?.toString() || '0',
                gasLimit: tx.gasLimit?.toString() || '21000',
                data: tx.data || '0x',
                nonce: tx.nonce || 0
            };
            
            // Check if transaction meets minimum thresholds
            const gasPrice = parseFloat(ethers.formatUnits(txData.gasPrice, 'gwei'));
            const value = parseFloat(ethers.formatEther(txData.value));
            
            if (value < CONFIG.MIN_VALUE_THRESHOLD && gasPrice < CONFIG.MIN_GAS_THRESHOLD && txData.to) {
                return; // Skip small transactions
            }
            
            console.log(`🔍 Analyzing: ${tx.hash.substring(0, 10)}... | Gas: ${gasPrice.toFixed(1)} gwei | Value: ${value.toFixed(4)} U2U`);
            this.stats.totalAnalyzed++;
            
            // Get AI analysis
            const aiAnalysis = await this.getAIAnalysis(txData);
            
            // Analyze threat
            const threat = this.analyzer.analyzeThreat(txData, aiAnalysis);
            
            console.log(`   📊 Risk Score: ${threat.riskScore.toFixed(1)} | Malicious: ${threat.shouldAlert ? '🚨 YES' : '✅ NO'}`);
            
            // Send alert if needed
            if (threat.shouldAlert && this.analyzer.canAlert(txData.from)) {
                console.log(`   🚨 THREAT DETECTED! ${aiAnalysis.threat_signature}`);
                this.stats.threatsDetected++;
                await this.sendOnChainAlert(threat);
            }
            
        } catch (error) {
            console.error(`Error analyzing tx ${tx.hash}:`, error.message);
        }
    }

    async getAIAnalysis(txData) {
        try {
            const response = await fetch(CONFIG.AI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(txData),
                timeout: 10000
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            // AI offline - use fallback
        }
        
        // Fallback analysis
        const gasPrice = parseFloat(ethers.formatUnits(txData.gasPrice || 0, 'gwei'));
        const value = parseFloat(ethers.formatEther(txData.value || 0));
        
        return {
            danger_score: gasPrice > 100 ? 80 : value > 10 ? 70 : 30,
            threat_signature: gasPrice > 100 ? 'HIGH: Excessive Gas' : value > 10 ? 'HIGH: Large Transfer' : 'Normal',
            is_malicious: gasPrice > 100 || value > 10,
            threat_level: gasPrice > 100 ? 2 : value > 10 ? 2 : 0,
            threat_category: gasPrice > 100 ? 'FRONT_RUNNING' : 'UNKNOWN',
            confidence: 75
        };
    }

    async sendOnChainAlert(threat) {
        try {
            console.log('   📤 Sending on-chain alert...');
            
            const { txData, aiAnalysis, severity, riskScore } = threat;
            
            // Prepare parameters
            const params = [
                txData.hash,                           // txHash
                txData.from,                           // flaggedAddress
                [],                                     // relatedAddresses
                severity,                               // level
                this.getCategoryCode(aiAnalysis.threat_category), // category
                Math.floor(aiAnalysis.confidence || 75), // confidenceScore
                Math.floor(riskScore),                 // severityScore
                aiAnalysis.threat_signature.substring(0, 100), // description
                '0x',                                   // additionalData
                ethers.keccak256(ethers.toUtf8Bytes("cerberus-v2")), // modelHash
                0,                                      // economicImpact
                []                                      // relatedAlerts
            ];
            
            // Estimate gas
            const gasEstimate = await this.contract.reportAdvancedThreat.estimateGas(
                ...params,
                { value: ethers.parseEther("0.01") }
            );
            
            // Send transaction
            const tx = await this.contract.reportAdvancedThreat(
                ...params,
                {
                    value: ethers.parseEther("0.01"),
                    gasLimit: gasEstimate * 120n / 100n,
                    gasPrice: ethers.parseUnits("20", "gwei")
                }
            );
            
            console.log(`   ✅ Alert sent! Tx: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
            
            this.stats.alertsSent++;
            
        } catch (error) {
            if (error.message.includes('already reported')) {
                console.log('   ⚠️  Transaction already reported');
            } else {
                console.error('   ❌ Alert failed:', error.message);
            }
        }
    }

    getCategoryCode(category) {
        const categories = {
            'UNKNOWN': 0,
            'RUG_PULL': 1,
            'FRONT_RUNNING': 3,
            'SMART_CONTRACT_EXPLOIT': 6,
            'PHISHING_CONTRACT': 7
        };
        return categories[category] || 0;
    }

    printStats() {
        const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 MONITORING STATISTICS');
        console.log('='.repeat(50));
        console.log(`⏱️  Uptime: ${hours}h ${minutes}m`);
        console.log(`🔍 Transactions Analyzed: ${this.stats.totalAnalyzed}`);
        console.log(`🚨 Threats Detected: ${this.stats.threatsDetected}`);
        console.log(`📤 Alerts Sent: ${this.stats.alertsSent}`);
        console.log(`❌ Errors: ${this.stats.errors}`);
        console.log(`📊 Detection Rate: ${this.stats.totalAnalyzed > 0 ? 
            (this.stats.threatsDetected / this.stats.totalAnalyzed * 100).toFixed(2) : 0}%`);
        console.log(`📦 Last Block: ${this.stats.lastBlock}`);
        console.log('='.repeat(50) + '\n');
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async shutdown() {
        console.log('\n🛑 Shutting down monitor...');
        this.isRunning = false;
        
        // Print final stats
        this.printStats();
        
        // Save state
        try {
            const state = {
                stats: this.stats,
                threatHistory: Array.from(this.analyzer.threatHistory.entries()),
                timestamp: Date.now()
            };
            
            await fs.writeFile(
                path.join(__dirname, 'monitor_state.json'),
                JSON.stringify(state, null, 2)
            );
            
            console.log('💾 State saved');
        } catch (error) {
            console.error('Failed to save state:', error.message);
        }
        
        console.log('✅ Monitor shutdown complete');
        process.exit(0);
    }
}

// Main execution
async function main() {
    const monitor = new CerberusMonitor();
    
    try {
        await monitor.initialize();
        await monitor.start();
    } catch (error) {
        console.error('Fatal error:', error.message);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = { CerberusMonitor, ThreatAnalyzer, CONFIG };