const { ethers } = require('ethers');
require('dotenv').config();

async function sendRealTestThreat() {
    console.log('🚨 SENDING REAL TEST TRANSACTION');
    console.log('================================');
    
    const provider = new ethers.JsonRpcProvider('https://rpc-nebulas-testnet.uniultra.xyz');
    const wallet = new ethers.Wallet(process.env.MONITOR_PRIVATE_KEY, provider);
    
    console.log(`👤 From: ${wallet.address}`);
    
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} U2U`);
    
    if (parseFloat(ethers.formatEther(balance)) < 0.1) {
        console.log('❌ Insufficient balance for test');
        return;
    }
    
    try {
        console.log('🔥 Sending HIGH-GAS transaction (should trigger Cerberus)...');
        
        const tx = await wallet.sendTransaction({
            to: wallet.address,  // Send to self
            value: ethers.parseEther('0.01'),
            gasPrice: ethers.parseUnits('150', 'gwei'),  // HIGH GAS = THREAT
            gasLimit: 21000
        });
        
        console.log(`✅ Transaction sent: ${tx.hash}`);
        console.log(`⛽ Gas Price: 150 gwei (SHOULD TRIGGER ALERT!)`);
        console.log(`💰 Value: 0.01 U2U`);
        console.log('');
        console.log('🎯 Monitor should detect this in ~10 seconds...');
        console.log('🎯 Check frontend dashboard for real-time alert!');
        
        const receipt = await tx.wait();
        console.log(`⚡ Confirmed in block: ${receipt.blockNumber}`);
        
        console.log('');
        console.log('📊 EXPECTED FLOW:');
        console.log('1. Monitor detects transaction');
        console.log('2. AI analyzes (high gas = threat)');
        console.log('3. Alert sent to smart contract');
        console.log('4. Frontend shows real-time alert');
        console.log('5. SUCCESS - Full end-to-end demo!');
        
    } catch (error) {
        console.error('❌ Transaction failed:', error.message);
    }
}

sendRealTestThreat().then(() => {
    console.log('\n✨ Real threat transaction test complete!');
    process.exit(0);
}).catch(error => {
    console.error('Error:', error);
    process.exit(1);
});