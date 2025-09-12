// send-contract-creation-test.js
const { ethers } = require('ethers');
require('dotenv').config();

async function sendContractCreation() {
    const provider = new ethers.JsonRpcProvider('https://rpc-nebulas-testnet.uniultra.xyz');
    const wallet = new ethers.Wallet(process.env.MONITOR_PRIVATE_KEY, provider);
    
    console.log('🚨 SENDING CONTRACT CREATION TEST');
    
    // Simple contract bytecode
    const bytecode = "0x608060405234801561001057600080fd5b50610150806100206000396000f3fe";
    
    const tx = await wallet.sendTransaction({
        data: bytecode,
        gasPrice: ethers.parseUnits('150', 'gwei'),
        gasLimit: 500000,
        value: ethers.parseEther('0.1') // Include value
    });
    
    console.log(`✅ Contract creation sent: ${tx.hash}`);
    console.log('   This should trigger: CONTRACT CREATION + HIGH GAS');
    
    await tx.wait();
}

sendContractCreation().catch(console.error);