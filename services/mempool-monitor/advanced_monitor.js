// ADVANCED_MONITOR.JS - VERSI PERBAIKAN FINAL
const { ethers } = require('ethers');
const fetch = require('node-fetch');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const CONFIG = {
    U2U_RPC_HTTP: 'https://rpc-nebulas-testnet.uniultra.xyz',
    AI_API_URL: process.env.AI_API_URL || 'http://127.0.0.1:5001/predict',
    MONITOR_PRIVATE_KEY: process.env.MONITOR_PRIVATE_KEY,
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
    POLLING_INTERVAL: 3000,
    BATCH_SIZE: 10,
    ALERT_COOLDOWN: 30000,
    MIN_VALUE_THRESHOLD: 0.0001,
    MIN_GAS_THRESHOLD: 30
};

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
    constructor() { super(); this.alertCooldowns = new Map(); }
    analyzeThreat(txData, aiAnalysis) {
        const riskScore = aiAnalysis.danger_score || 0;
        
        // LOWER THRESHOLD FOR TESTING
        const shouldAlert = riskScore > 40 && (aiAnalysis.is_malicious || riskScore > 50);
        
        return { 
            txData, 
            aiAnalysis, 
            riskScore, 
            severity: this.getSeverity(riskScore), 
            shouldAlert  // Now triggers at > 40 instead of > 70
        };
    }
    getSeverity(riskScore) { if (riskScore > 90) return 3; if (riskScore > 75) return 2; if (riskScore > 50) return 1; return 0; }
    canAlert(txHash) {
        const lastAlert = this.alertCooldowns.get(txHash);
        if (!lastAlert || Date.now() - lastAlert > CONFIG.ALERT_COOLDOWN) { this.alertCooldowns.set(txHash, Date.now()); return true; }
        return false;
    }
}

class CerberusMonitor {
    constructor() {
        this.analyzer = new ThreatAnalyzer();
        this.isRunning = false;
        this.processedTxs = new Set();
        this.stats = { startTime: Date.now(), totalAnalyzed: 0, threatsDetected: 0, alertsSent: 0, errors: 0, lastBlock: 0 };
    }

    async initialize() {
        console.log('\n🚀 INITIALIZING CERBERUS MONITOR'); console.log('='.repeat(50));
        if (!CONFIG.MONITOR_PRIVATE_KEY || CONFIG.MONITOR_PRIVATE_KEY === 'MONITOR_PRIVATE_KEY') throw new Error('MONITOR_PRIVATE_KEY not configured in .env file');
        this.provider = new ethers.JsonRpcProvider(CONFIG.U2U_RPC_HTTP);
        this.wallet = new ethers.Wallet(CONFIG.MONITOR_PRIVATE_KEY, this.provider);
        this.contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, this.wallet);
        const [blockNumber, balance, contractCode] = await Promise.all([this.provider.getBlockNumber(), this.provider.getBalance(this.wallet.address), this.provider.getCode(CONFIG.CONTRACT_ADDRESS)]);
        if (contractCode === '0x') throw new Error('Contract not deployed at specified address');
        console.log('✅ Blockchain Connection Established'); console.log(`📦 Current Block: ${blockNumber}`); console.log(`💳 Monitor Wallet: ${this.wallet.address}`); console.log(`💰 Balance: ${ethers.formatEther(balance)} U2U`); console.log(`📜 Contract: ${CONFIG.CONTRACT_ADDRESS}`);
        await this.testAIConnection();
        this.setupEventListeners();
        this.stats.lastBlock = blockNumber;
        console.log('='.repeat(50)); console.log('✨ Monitor Ready!\n');
    }

    async testAIConnection() {
        try {
            console.log('\n🤖 Testing AI Sentinel...');
            const response = await fetch(CONFIG.AI_API_URL.replace('/predict', '/'));
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ AI Sentinel: active`);
                console.log(`   Version: ${data.version || '2.0.0-advanced'}`);
                console.log(`   Model: ${data.isolation_model_loaded ? 'Loaded' : 'Not loaded'}`);
            } else { console.warn('⚠️  AI Sentinel not responding properly'); }
        } catch (error) { console.warn('⚠️  AI Sentinel offline - using fallback detection'); }
    }

    setupEventListeners() {
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }

    async start() {
        if (this.isRunning) return;
        console.log('🔄 Starting monitoring loop...\n');
        this.isRunning = true;
        while (this.isRunning) {
            try {
                const currentBlock = await this.provider.getBlockNumber();
                if (currentBlock > this.stats.lastBlock) {
                    const lastProcessedBlock = await this.processBlocks(this.stats.lastBlock + 1, currentBlock);
                    this.stats.lastBlock = lastProcessedBlock;
                }
                await this.sleep(CONFIG.POLLING_INTERVAL);
            } catch (error) {
                console.error('❌ Monitoring loop error:', error.message); this.stats.errors++; await this.sleep(CONFIG.POLLING_INTERVAL * 2);
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
            if (!block || !block.prefetchedTransactions || block.prefetchedTransactions.length === 0) return;
            console.log(`📦 Processing block ${blockNumber} with ${block.prefetchedTransactions.length} transactions`);
            for (const tx of block.prefetchedTransactions) {
                if (!this.processedTxs.has(tx.hash)) { await this.analyzeTransaction(tx); this.processedTxs.add(tx.hash); }
            }
        } catch (error) { console.error(`Error processing block ${blockNumber}:`, error.message); }
    }

    async analyzeTransaction(tx) {
        if (!tx || !tx.hash) { console.log('   ⏩ Skipping transaction with no hash.'); return; }
        try {
            const txData = { hash: tx.hash, from: tx.from, to: tx.to, value: tx.value.toString(), gasPrice: tx.gasPrice.toString(), data: tx.data, nonce: tx.nonce };
            const gasPrice = parseFloat(ethers.formatUnits(txData.gasPrice, 'gwei'));
            const value = parseFloat(ethers.formatEther(txData.value));
            if (value < CONFIG.MIN_VALUE_THRESHOLD && gasPrice < CONFIG.MIN_GAS_THRESHOLD && txData.to) return;

            console.log(`   🔍 Analyzing: ${tx.hash.substring(0, 10)}... | From: ${tx.from.substring(0,10)}...`);
            this.stats.totalAnalyzed++;
            const aiAnalysis = await this.getAIAnalysis(txData);
            console.log(`      -> 📊 AI Response:`, JSON.stringify(aiAnalysis, null, 2));
            const threat = this.analyzer.analyzeThreat(txData, aiAnalysis);
            if (gasPrice > 100) {  // If gas > 100 gwei
                threat.riskScore = 85;  // Force high risk
                threat.shouldAlert = true;
                aiAnalysis.is_malicious = true;
                aiAnalysis.threat_signature = "FORCED: High Gas Price Attack";
                console.log(`      -> ⚠️ OVERRIDE: Forcing alert for high gas (${gasPrice} gwei)`);
            }
            console.log(`      -> 📊 Risk: ${threat.riskScore.toFixed(1)} | Malicious: ${threat.shouldAlert ? '🚨 YES' : '✅ NO'}`);
            if (threat.shouldAlert && this.analyzer.canAlert(txData.hash)) {
                console.log(`      -> 🚨 THREAT DETECTED! Signature: ${aiAnalysis.threat_signature}`); this.stats.threatsDetected++; await this.sendOnChainAlert(threat);
            }
        } catch (error) { console.error(`❌ Error analyzing tx ${tx.hash}:`, error.message); this.stats.errors++; }
    }

    async getAIAnalysis(txData) {
        try {
            const response = await fetch(CONFIG.AI_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(txData) });
            if (response.ok) return await response.json();
        } catch (error) { /* Fallback below */ }
        return { danger_score: 0, is_malicious: false, threat_signature: 'FALLBACK: AI unreachable' };
    }

    async sendOnChainAlert(threat) {
        try {
            const { txData, aiAnalysis, severity, riskScore } = threat;
            console.log('      -> ⛓️  Sending on-chain alert...');
            const params = [ txData.hash, txData.from, [], severity, 0, Math.floor(aiAnalysis.confidence || 80), Math.floor(riskScore), aiAnalysis.threat_signature.substring(0, 100), '0x', ethers.keccak256(ethers.toUtf8Bytes("cerberus-v2")), 0, [] ];
            const tx = await this.contract.reportAdvancedThreat(...params, { value: ethers.parseEther("0.01"), gasLimit: 500000 });
            console.log(`      -> ✅ Alert sent! Tx: ${tx.hash.substring(0,12)}...`);
            this.stats.alertsSent++;
        } catch (error) {
            if (error.message.includes('already reported')) console.log('      -> ⚠️  Transaction already reported.');
            else console.error('      -> ❌ On-chain alert failed:', error.message);
        }
    }

    printStats() {
        const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
        console.log(`\n📊 STATS: Uptime: ${uptime}s | Analyzed: ${this.stats.totalAnalyzed} | Threats: ${this.stats.threatsDetected} | Alerts: ${this.stats.alertsSent} | Errors: ${this.stats.errors}\n`);
    }

    async shutdown() {
        if (!this.isRunning) return;
        console.log('\n\n🛑 Shutting down monitor...'); this.isRunning = false;
        this.printStats();
        try {
            await fs.writeFile(path.join(__dirname, 'monitor_state.json'), JSON.stringify({ stats: this.stats, timestamp: Date.now() }, null, 2));
            console.log('💾 State saved');
        } catch (error) { console.error('Failed to save state:', error.message); }
        console.log('✅ Monitor shutdown complete');
        process.exit(0);
    }
    
    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

async function main() {
    const monitor = new CerberusMonitor();
    try {
        await monitor.initialize();

        console.log("\n🔥 FORCING TEST TRANSACTION");
        const testTx = {
            hash: '0xtest' + Date.now(),
            from: '0xfe89f390C1cf3D6b83171D41bEEF4A3E3A763fAE',
            to: null, // Contract creation
            value: ethers.parseEther('10').toString(),
            gasPrice: ethers.parseUnits('150', 'gwei').toString(),
            gasLimit: '500000',
            data: '0x60806040',
            nonce: 1
        };
        await monitor.analyzeTransaction(testTx);
    console.log("🔥 TEST COMPLETE\n");
    } catch (error) {
        console.error('FATAL:', error.message); 
        process.exit(1);
    }
}

// This prevents the script from exiting prematurely.
process.stdin.resume();
main();