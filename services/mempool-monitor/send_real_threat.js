const { ethers } = require('ethers');
require('dotenv').config();

async function sendRealThreat() {
    console.log('🚨 SENDING REAL HIGH-GAS TRANSACTION');
    console.log('====================================');
    
    const provider = new ethers.JsonRpcProvider('https://rpc-nebulas-testnet.uniultra.xyz');
    const wallet = new ethers.Wallet(process.env.MONITOR_PRIVATE_KEY, provider);
    
    console.log(`🔸 From Wallet: ${wallet.address}`);
    
    // Check balance first
    const balance = await provider.getBalance(wallet.address);
    console.log(`🔸 Balance: ${ethers.formatEther(balance)} U2U`);
    
    if (parseFloat(ethers.formatEther(balance)) < 0.1) {
        console.log('❌ Insufficient balance for test transaction');
        return;
    }
    
    console.log('🔸 Preparing high-gas transaction (should trigger Cerberus)...');
    
    try {
        const tx = await wallet.sendTransaction({
            to: wallet.address,  // Send to self
            value: ethers.parseEther('0.01'),  // Small amount
            gasPrice: ethers.parseUnits('120', 'gwei'),  // High gas price (trigger)
            gasLimit: 21000
        });
        
        console.log(`✅ Transaction sent: ${tx.hash}`);
        console.log(`🔸 Gas Price: 120 gwei (should trigger alert!)`);
        console.log(`🔸 Value: 0.01 U2U`);
        console.log('🔸 Monitor should detect this as threat in ~10 seconds...');
        
        const receipt = await tx.wait();
        console.log(`⚡ Transaction confirmed in block: ${receipt.blockNumber}`);
        console.log('🎯 Check your monitor terminal and frontend for alerts!');
        
    } catch (error) {
        console.error('❌ Transaction failed:', error.message);
    }
}

// Run immediately
sendRealThreat().then(() => {
    console.log('\n✨ Real transaction test complete!');
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});