const { ethers } = require('ethers');
require('dotenv').config();

const CONTRACT_ABI = [
    "function grantRole(bytes32 role, address account) external",
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function AI_ORACLE_ROLE() view returns (bytes32)",
    "function VALIDATOR_ROLE() view returns (bytes32)",
    "function DEFAULT_ADMIN_ROLE() view returns (bytes32)"
];

async function grantRoleToMonitor() {
    console.log('🔐 GRANTING AI_ORACLE_ROLE TO MONITOR\n');
    console.log('='.repeat(70));
    
    const ADMIN_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
    
    if (!ADMIN_PRIVATE_KEY) {
        console.error('❌ Missing DEPLOYER_PRIVATE_KEY or PRIVATE_KEY in .env');
        console.error('   This script must be run by the contract admin/deployer!');
        process.exit(1);
    }
    
    const provider = new ethers.JsonRpcProvider(process.env.U2U_RPC_HTTP);
    const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, adminWallet);
    
    const MONITOR_ADDRESS = new ethers.Wallet(process.env.MONITOR_PRIVATE_KEY).address;
    
    console.log('📡 Network: U2U Nebula Testnet');
    console.log('🎯 Contract:', process.env.CONTRACT_ADDRESS);
    console.log('👑 Admin Wallet:', adminWallet.address);
    console.log('🤖 Monitor Wallet:', MONITOR_ADDRESS);
    console.log('');
    
    try {
        const ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
        const isAdmin = await contract.hasRole(ADMIN_ROLE, adminWallet.address);
        
        if (!isAdmin) {
            console.error('❌ This wallet is NOT an admin!');
            console.error('   Only the deployer can grant roles.');
            process.exit(1);
        }
        console.log('✅ Confirmed: You are the admin\n');
        
        const AI_ORACLE_ROLE = await contract.AI_ORACLE_ROLE();
        console.log('🔑 AI_ORACLE_ROLE:', AI_ORACLE_ROLE);
        
        const hasRole = await contract.hasRole(AI_ORACLE_ROLE, MONITOR_ADDRESS);
        
        if (hasRole) {
            console.log('✅ Monitor already has AI_ORACLE_ROLE!');
            console.log('   No action needed.\n');
            return;
        }
        
        console.log('⚠️  Monitor does NOT have role yet');
        console.log('📤 Granting AI_ORACLE_ROLE...\n');
        
        // Grant role
        const tx = await contract.grantRole(AI_ORACLE_ROLE, MONITOR_ADDRESS);
        console.log('⏳ Transaction sent:', tx.hash);
        console.log('   Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log('✅ Role granted in block:', receipt.blockNumber);
        
        // Verify
        const hasRoleNow = await contract.hasRole(AI_ORACLE_ROLE, MONITOR_ADDRESS);
        
        if (hasRoleNow) {
            console.log('\n🎉 SUCCESS!');
            console.log('   Monitor wallet now has AI_ORACLE_ROLE');
            console.log('   Monitor can now report threats on-chain!\n');
        } else {
            console.log('\n❌ Verification failed');
            console.log('   Please check transaction on explorer\n');
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        
        if (error.message.includes('AccessControl')) {
            console.error('\n💡 Tip: Make sure you are using the DEPLOYER wallet');
            console.error('   The wallet that deployed the contract');
        }
    }
    
    console.log('='.repeat(70));
}

grantRoleToMonitor().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});