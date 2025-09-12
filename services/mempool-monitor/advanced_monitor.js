const { ethers } = require('ethers');
const fetch = require('node-fetch');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const CONFIG = {
    U2U_RPC_WSS: 'wss://rpc-nebulas-testnet.uniultra.xyz',
    U2U_RPC_HTTP: 'https://rpc-nebulas-testnet.uniultra.xyz',
    AI_API_URL: process.env.AI_API_URL || 'http://127.0.0.1:5001/predict',
    MONITOR_PRIVATE_KEY: process.env.MONITOR_PRIVATE_KEY || 'a29a6848264f0ae2e5c34ad0858cb6b4aae9355190919b765622b566c7fa808b',
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || '0xBb05190BA95adBf889A61F113E3C251a9C605832',
    POLLING_INTERVAL: 3000,
    MAX_RETRIES: 3,
    BATCH_SIZE: 10,
    ALERT_COOLDOWN: 30000,
    CORRELATION_WINDOW: 300000
};

const ENHANCED_CONTRACT_ABI = [
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

class AdvancedThreatCorrelator extends EventEmitter {
    constructor() {
        super();
        this.threatHistory = new Map();
        this.addressPatterns = new Map();
        this.temporalClusters = new Map();
        this.alertCooldowns = new Map();
        this.correlationRules = this._initializeCorrelationRules();
    }

    _initializeCorrelationRules() {
        return {
            addressVelocity: {
                threshold: 5,
                window: 60000,
                severity: 'HIGH'
            },
            
            valuePattern: {
                roundNumberThreshold: 0.95,
                frequency: 3,
                window: 300000,
                severity: 'MEDIUM'
            },
            
            temporalClustering: {
                minClusterSize: 3,
                timeWindow: 180000,
                severity: 'CRITICAL'
            },
            
            gasPriceManipulation: {
                deviationThreshold: 200,
                frequency: 2,
                window: 120000,
                severity: 'HIGH'
            }
        };
    }

    analyzeThreat(txData, aiAnalysis) {
        const correlations = this._performCorrelationAnalysis(txData, aiAnalysis);
        const enhancedThreat = this._enhanceThreatData(txData, aiAnalysis, correlations);
        
        this.threatHistory.set(txData.hash, enhancedThreat);
        
        this._updateAddressPatterns(txData);
        
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
            if (diff < 0.05) {
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
        
        const recentGasPrices = Array.from(this.threatHistory.values())
            .filter(threat => Date.now() - threat.timestamp < 300000)
            .map(threat => parseFloat(ethers.formatUnits(threat.txData.gasPrice || 0, 'gwei')));
        
        const avgGasPrice = recentGasPrices.length > 0 
            ? recentGasPrices.reduce((sum, price) => sum + price, 0) / recentGasPrices.length 
            : 20;
        
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
            
            if (now - threat.timestamp > CONFIG.CORRELATION_WINDOW) continue;

            if (threat.txData.from === txData.from || 
                threat.txData.to === txData.to ||
                threat.txData.from === txData.to ||
                threat.txData.to === txData.from) {
                related.push({
                    hash,
                    relationship: 'address_connection',
                    timestamp: threat.timestamp,
                    address: threat.txData.from
                });
            }
            
            const valueDiff = Math.abs(
                parseFloat(ethers.formatEther(threat.txData.value || 0)) -
                parseFloat(ethers.formatEther(txData.value || 0))
            );
            
            if (valueDiff < 0.01) {
                related.push({
                    hash,
                    relationship: 'value_similarity',
                    timestamp: threat.timestamp,
                    address: threat.txData.from
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
        
        if (correlations.addressVelocity.isAnomalous) baseSeverity += 1;
        if (correlations.temporalClustering.isClustered) baseSeverity += 2;
        if (correlations.gasPriceManipulation.isManipulated) baseSeverity += 1;
        if (correlations.relatedThreats.length > 2) baseSeverity += 1;
        
        return Math.min(baseSeverity, 5);
    }

    _calculateRiskScore(aiAnalysis, correlations) {
        let score = aiAnalysis.danger_score || 0;
        
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
        
        impact *= (1 + correlations.relatedThreats.length * 0.5);
        
        impact *= (1 + correlations.temporalClustering.clusterSize * 0.2);
        
        return Math.floor(impact * 1e18);
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
        
        const cutoff = Date.now() - 3600000;
        pattern.transactions = pattern.transactions.filter(tx => tx.timestamp > cutoff);
        
        this.addressPatterns.set(txData.from, pattern);
    }

    _updateTemporalClusters(enhancedThreat) {
        const timeSlot = Math.floor(enhancedThreat.timestamp / 60000) * 60000;
        
        if (!this.temporalClusters.has(timeSlot)) {
            this.temporalClusters.set(timeSlot, []);
        }
        
        this.temporalClusters.get(timeSlot).push(enhancedThreat);
        
        const cutoff = Date.now() - CONFIG.CORRELATION_WINDOW;
        for (const [slot, cluster] of this.temporalClusters) {
            if (slot < cutoff) {
                this.temporalClusters.delete(slot);
            }
        }
    }

    shouldAlert(address) {
        const lastAlert = this.alertCooldowns.get(address);
        const now = Date.now();
        
        if (!lastAlert || now - lastAlert > CONFIG.ALERT_COOLDOWN) {
            this.alertCooldowns.set(address, now);
            return true;
        }
        
        return false;
    }

    getCorrelationStats() {
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
        const gasPriceGwei = parseFloat(ethers.formatUnits(txData.gasPrice || 0, 'gwei'));
        this.metrics.gasPrice.samples.push(gasPriceGwei);
        
        if (this.metrics.gasPrice.samples.length > 100) {
            this.metrics.gasPrice.samples.shift();
        }
        
        this._updateGasStats();
        
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
        const category = enhancedThreat.aiAnalysis.threat_category || 'UNKNOWN';
        const categoryCount = this.metrics.threatCategories.get(category) || 0;
        this.metrics.threatCategories.set(category, categoryCount + 1);
        this._updateNetworkRiskScore(enhancedThreat);
    }

    recordAlert(alertId, responseTime) {
        this.metrics.alertsSent++;
        
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
        const decay = 0.95;
        
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
        
        this._setupContractListeners();
        
        this._startPollingLoop();
        
        this._startAnalyticsReporting();
        
        console.log('✅ Advanced Cerberus Monitor is now active!');
    }

    _setupContractListeners() {
        this.contract.on('ThreatReported', (alertId, txHash, flaggedAddress, level, category, confidence, reporter, timestamp, modelHash) => {
            console.log('\n🚨 ADVANCED THREAT ALERT CONFIRMED');
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
                
                await this._processRetryQueue();
                
                await this._sleep(CONFIG.POLLING_INTERVAL);
                
            } catch (error) {
                console.error('⚠️ Polling error:', error.message);
                await this._sleep(CONFIG.POLLING_INTERVAL * 2);
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
            const txData = this._extractTransactionData(tx);
            
            if (this._shouldSkipTransaction(txData)) {
                return;
            }
            
            console.log(`🔍 Advanced analysis: ${tx.hash.substring(0, 10)}... | Value: ${parseFloat(ethers.formatEther(tx.value || 0)).toFixed(4)} U2U`);
            
            const aiAnalysis = await this._getAIAnalysis(txData);
            const enhancedThreat = this.correlator.analyzeThreat(txData, aiAnalysis);
            const processingTime = Date.now() - startTime;
            this.analytics.recordTransaction(txData, processingTime);
            
            console.log(`📊 Enhanced Analysis: Danger=${enhancedThreat.riskScore} | Category=${aiAnalysis.threat_category} | Correlations=${Object.keys(enhancedThreat.correlations).filter(k => enhancedThreat.correlations[k].isAnomalous || enhancedThreat.correlations[k].isClustered || enhancedThreat.correlations[k].isManipulated).length}`);
            
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
        return valueEth < 0.01 && txData.to;
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
        
        if (!this.correlator.shouldAlert(enhancedThreat.txData.from)) {
            return false;
        }
        
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
            
            const gasEstimate = await this.contract.reportAdvancedThreat.estimateGas(
                ...alertParams.params,
                { value: alertParams.stakeAmount }
            );
            
            console.log(`⛽ Gas estimate: ${gasEstimate.toString()}`);
            
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
        const relatedAddresses = correlations.relatedThreats
            .map(threat => threat.address)
            .filter(addr => addr !== null)
            .slice(0, 5);
        
        const relatedAlerts = correlations.relatedThreats
            .map(threat => ethers.keccak256(ethers.toUtf8Bytes(threat.hash)))
            .slice(0, 10);
        
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
            txData.hash,
            txData.from,
            relatedAddresses,
            enhancedThreat.enhancedSeverity,
            categoryValue,
            Math.floor(aiAnalysis.confidence || 0),
            enhancedThreat.riskScore,
            (aiAnalysis.threat_signature || 'Unknown threat').substring(0, 100),
            additionalData,
            modelHash,
            economicImpact,
            relatedAlerts
        ];
        
        return { params, stakeAmount };
    }

    async _processRetryQueue() {
        if (this.retryQueue.length === 0) return;
        
        const itemsToRetry = this.retryQueue.splice(0, 5);
        
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
                this.retryQueue.push(item);
            }
        }
    }

    _startAnalyticsReporting() {
        setInterval(() => {
            this._logAnalytics();
        }, 300000);
        
        setInterval(() => {
            this._logDetailedAnalytics();
        }, 1800000);
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
        console.log(`🌍 Network Risk Score: ${metrics.networkRiskScore.toFixed(2)}`);
        console.log(`⛽ Avg Gas Price: ${metrics.gasPrice.average.toFixed(2)} gwei`);
        console.log(`📈 Gas Volatility: ${metrics.gasPrice.volatility.toFixed(2)}`);
        console.log(`⏱️  Avg Processing Time: ${metrics.avgProcessingTime.toFixed(2)}ms`);
        console.log('================================\n');
    }

    _logDetailedAnalytics() {
        const metrics = this.analytics.getMetrics();
        
        console.log('\n📊 DETAILED THREAT ANALYTICS');
        console.log('========================================');
        console.log('📅 Hourly Activity Distribution:');
        for (const [hour, data] of metrics.hourlyStats) {
            const threatRate = data.count > 0 ? (data.threats / data.count * 100).toFixed(1) : '0.0';
            console.log(`   ${hour.toString().padStart(2, '0')}:00 - Txs: ${data.count}, Threats: ${data.threats} (${threatRate}%)`);
        }
        
        console.log('\n🏷️  Threat Category Distribution:');
        for (const [category, count] of metrics.threatCategories) {
            const percentage = (count / metrics.threatsDetected * 100).toFixed(1);
            console.log(`   ${category}: ${count} (${percentage}%)`);
        }
        
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
        this._logDetailedAnalytics();
        
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
            
            this.correlator.threatHistory = new Map(state.threatHistory);
            this.correlator.addressPatterns = new Map(state.addressPatterns);
            
            console.log(`💾 Monitor state loaded (${state.threatHistory.length} threats, ${state.addressPatterns.length} addresses)`);
            
        } catch (error) {
            console.log('ℹ️ No previous state found, starting fresh');
        }
    }
}

async function main() {
    try {
        console.log('🚀 Initializing Advanced Cerberus Monitoring System...');
        
        const monitor = new AdvancedCerberusMonitor();
        
        await monitor.loadState();
        
        console.log('🧪 Testing AI Sentinel connection...');
        try {
            const testResponse = await fetch(CONFIG.AI_API_URL.replace('/predict', '/'));
            if (testResponse.ok) {
                const aiHealth = await testResponse.json();
                console.log(`✅ AI Sentinel: ${aiHealth.status} | Version: ${aiHealth.version}`);
            } else {
                console.log('⚠️ AI Sentinel health check failed, but will continue monitoring');
            }
        } catch (error) {
            console.log('⚠️ AI Sentinel not responding, monitoring will continue with degraded functionality');
        }
        
        await monitor.start();
        
    } catch (error) {
        console.error('❌ Advanced Monitor startup failed:', error.message);
        process.exit(1);
    }
}

module.exports = {
    AdvancedCerberusMonitor,
    AdvancedThreatCorrelator,
    AdvancedAnalyticsCollector,
    CONFIG
};

if (require.main === module) {
    main();
}