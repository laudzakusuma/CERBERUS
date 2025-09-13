const { ethers } = require('ethers');
require('dotenv').config();

async function grantAIOracleRole() {
    console.log('🔐 GRANTING AI_ORACLE_ROLE TO MONITOR WALLET');
    console.log('============================================');
    
    const provider = new ethers.JsonRpcProvider('https://rpc-nebulas-testnet.uniultra.xyz');

    console.log("DEPLOYER_PRIVATE_KEY:", process.env.DEPLOYER_PRIVATE_KEY);
    console.log("Length:", process.env.DEPLOYER_PRIVATE_KEY?.length);


    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    
    // Contract ABI with necessary functions
    const contractABI = [
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
    
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);
    
    console.log(`📝 Contract: ${process.env.CONTRACT_ADDRESS}`);
    console.log(`👤 Monitor Wallet: ${wallet.address}`);
    
    try {
        // Get AI_ORACLE_ROLE value
        const AI_ORACLE_ROLE = await contract.AI_ORACLE_ROLE();
        console.log(`🔑 AI_ORACLE_ROLE: ${AI_ORACLE_ROLE}`);
        
        // Check if already has role
        const hasRole = await contract.hasRole(AI_ORACLE_ROLE, wallet.address);
        console.log(`🔍 Current Role Status: ${hasRole ? 'HAS ROLE' : 'NO ROLE'}`);
        
        if (!hasRole) {
            console.log('🔄 Granting AI_ORACLE_ROLE...');
            
            const tx = await contract.grantRole(AI_ORACLE_ROLE, wallet.address, {
                gasLimit: 100000,
                gasPrice: ethers.parseUnits('20', 'gwei')
            });
            
            console.log(`📤 Transaction sent: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`✅ Role granted! Block: ${receipt.blockNumber}`);
            
            // Verify role was granted
            const newRoleStatus = await contract.hasRole(AI_ORACLE_ROLE, wallet.address);
            console.log(`🎉 Verification: ${newRoleStatus ? 'SUCCESS' : 'FAILED'}`);
            
        } else {
            console.log('✅ Wallet already has AI_ORACLE_ROLE');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.message.includes('AccessControl')) {
            console.log('\n💡 SOLUTION: You need to run this with the contract deployer wallet');
            console.log('1. Update MONITOR_PRIVATE_KEY in .env to your deployer private key');
            console.log('2. Run this script again');
            console.log('3. Change MONITOR_PRIVATE_KEY back to monitor wallet');
        }
    }
}

grantAIOracleRole().then(() => {
    console.log('\n✨ Role management complete!');
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});