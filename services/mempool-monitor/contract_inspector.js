const { ethers } = require('ethers');
require('dotenv').config();

async function inspectContract() {
    console.log('🔍 INSPECTING DEPLOYED CONTRACT\n');
    console.log('='.repeat(70));
    
    const provider = new ethers.JsonRpcProvider(process.env.U2U_RPC_HTTP);
    const wallet = new ethers.Wallet(process.env.MONITOR_PRIVATE_KEY, provider);
    
    console.log('📡 Network: U2U Nebula Testnet');
    console.log('🎯 Contract:', process.env.CONTRACT_ADDRESS);
    console.log('👤 Monitor Wallet:', wallet.address);
    
    const code = await provider.getCode(process.env.CONTRACT_ADDRESS);
    if (code === '0x') {
        console.log('❌ Contract not found at this address!');
        return;
    }
    console.log('✅ Contract exists\n');
    
    const possibleFunctions = [
        {
            name: 'reportThreat',
            signature: 'function reportThreat(bytes32 _txHash, address _flaggedAddress, uint8 _level, uint8 _category, uint256 _confidenceScore, string memory _signature, string memory _evidence) external'
        },
        {
            name: 'reportAdvancedThreat',
            signature: 'function reportAdvancedThreat(bytes32 _txHash, address _flaggedAddress, address[] memory _relatedAddresses, uint8 _level, uint8 _category, uint256 _confidenceScore, uint256 _severityScore, string memory _description, bytes memory _additionalData, bytes32 _modelHash, uint256 _economicImpact, bytes32[] memory _relatedAlerts) external payable'
        },
        {
            name: 'flagTransaction',
            signature: 'function flagTransaction(bytes32 _txHash, address _potentialThreatActor, string memory _threatSignature, uint8 _level) external'
        }
    ];
    
    console.log('🔎 Testing which function is available:\n');
    
    for (const func of possibleFunctions) {
        try {
            const contract = new ethers.Contract(
                process.env.CONTRACT_ADDRESS,
                [func.signature],
                wallet
            );
            
            const testTx = {
                txHash: ethers.ZeroHash,
                flaggedAddress: wallet.address,
                level: 1,
                category: 0,
                confidenceScore: 50,
                signature: 'test',
                evidence: 'test'
            };
            
            try {
                if (func.name === 'reportAdvancedThreat') {
                    await contract.reportAdvancedThreat.estimateGas(
                        testTx.txHash,
                        testTx.flaggedAddress,
                        [],
                        testTx.level,
                        testTx.category,
                        testTx.confidenceScore,
                        50,
                        testTx.signature,
                        '0x',
                        ethers.ZeroHash,
                        0,
                        [],
                        { value: ethers.parseEther('0.001') }
                    );
                } else if (func.name === 'reportThreat') {
                    await contract.reportThreat.estimateGas(
                        testTx.txHash,
                        testTx.flaggedAddress,
                        testTx.level,
                        testTx.category,
                        testTx.confidenceScore,
                        testTx.signature,
                        testTx.evidence
                    );
                } else {
                    await contract.flagTransaction.estimateGas(
                        testTx.txHash,
                        testTx.flaggedAddress,
                        testTx.signature,
                        testTx.level
                    );
                }
                
                console.log(`✅ FOUND: ${func.name}`);
                console.log(`   Signature: ${func.signature.substring(0, 80)}...`);
                console.log(`   This function EXISTS and is CALLABLE!\n`);
                
            } catch (gasError) {
                if (gasError.message.includes('AI_ORACLE_ROLE') || 
                    gasError.message.includes('AccessControl') ||
                    gasError.message.includes('MIN_STAKE')) {
                    console.log(`✅ FOUND: ${func.name} (but needs role/stake)`);
                    console.log(`   Issue: ${gasError.message.split('\n')[0]}\n`);
                } else {
                    console.log(`❌ NOT FOUND or INCOMPATIBLE: ${func.name}`);
                    console.log(`   Error: ${gasError.message.split('\n')[0]}\n`);
                }
            }
            
        } catch (error) {
            console.log(`❌ ${func.name}: ${error.message.split('\n')[0]}\n`);
        }
    }
    
    console.log('='.repeat(70));
    console.log('\n🔐 CHECKING ACCESS ROLES:\n');
    
    const roleABI = [
        'function hasRole(bytes32 role, address account) view returns (bool)',
        'function AI_ORACLE_ROLE() view returns (bytes32)',
        'function VALIDATOR_ROLE() view returns (bytes32)',
        'function DEFAULT_ADMIN_ROLE() view returns (bytes32)'
    ];
    
    try {
        const contract = new ethers.Contract(
            process.env.CONTRACT_ADDRESS,
            roleABI,
            provider
        );
        
        try {
            const AI_ORACLE_ROLE = await contract.AI_ORACLE_ROLE();
            const hasOracleRole = await contract.hasRole(AI_ORACLE_ROLE, wallet.address);
            console.log(`AI_ORACLE_ROLE: ${hasOracleRole ? '✅ HAS ROLE' : '❌ NO ROLE'}`);
            
            if (!hasOracleRole) {
                console.log(`   Role needed: ${AI_ORACLE_ROLE}`);
                console.log(`   Grant with: contract.grantRole(AI_ORACLE_ROLE, "${wallet.address}")`);
            }
        } catch (e) {
            console.log('AI_ORACLE_ROLE: Not applicable for this contract');
        }
        
        try {
            const VALIDATOR_ROLE = await contract.VALIDATOR_ROLE();
            const hasValidatorRole = await contract.hasRole(VALIDATOR_ROLE, wallet.address);
            console.log(`VALIDATOR_ROLE: ${hasValidatorRole ? '✅ HAS ROLE' : '❌ NO ROLE'}`);
        } catch (e) {
            console.log('VALIDATOR_ROLE: Not applicable for this contract');
        }
        
        try {
            const ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
            const hasAdminRole = await contract.hasRole(ADMIN_ROLE, wallet.address);
            console.log(`DEFAULT_ADMIN_ROLE: ${hasAdminRole ? '✅ HAS ROLE' : '❌ NO ROLE'}`);
        } catch (e) {
            console.log('DEFAULT_ADMIN_ROLE: Not applicable for this contract');
        }
        
    } catch (error) {
        console.log('ℹ️  Contract does not use role-based access control (this is OK)');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n💡 RECOMMENDATION:\n');
    console.log('Based on the results above, I will create a compatible monitor.');
    console.log('If roles are needed, you need to grant them from the admin wallet.\n');
}

inspectContract().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
});