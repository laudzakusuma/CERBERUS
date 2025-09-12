const { ethers } = require('ethers');
require('dotenv').config();

async function sendRealThreat() {
    const provider = new ethers.JsonRpcProvider('https://rpc-nebulas-testnet.uniultra.xyz');
    const wallet = new ethers.Wallet(process.env.MONITOR_PRIVATE_KEY, provider);
    
    console.log('Sending REAL high-gas transaction...');
    
    const tx = await wallet.sendTransaction({
        to: wallet.address,
        value: ethers.parseEther('0.01'),
        gasPrice: ethers.parseUnits('150', 'gwei'),
        gasLimit: 21000
    });
    
    console.log(`Transaction sent: ${tx.hash}`);
    console.log('Monitor should detect this as threat!');
    
    await tx.wait();
    console.log('Confirmed!');
}

sendRealThreat();