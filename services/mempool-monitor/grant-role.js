const { ethers } = require('ethers');
require('dotenv').config();

async function grantAIOracleRole() {
    console.log('🔐 GRANTING AI_ORACLE_ROLE TO MONITOR WALLET');
    console.log('============================================');
    
    const provider = new ethers.JsonRpcProvider('https://rpc-nebulas-testnet.uniultra.xyz');
    const wallet = new ethers.Wallet(process.env.MONITOR_PRIVATE_KEY, provider);
    
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