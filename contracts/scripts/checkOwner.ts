import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0x01475C4B89d4e4576dB0e86d1845e9E0a11c0818";
  const [signer] = await ethers.getSigners();
  
  console.log("🔍 Checking Contract Ownership...\n");
  console.log(`Your wallet: ${signer.address}`);
  
  const abi = ["function owner() view returns (address)"];
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
  
  try {
    const contractOwner = await contract.owner();
    console.log(`Contract owner: ${contractOwner}\n`);
    
    if (contractOwner.toLowerCase() === signer.address.toLowerCase()) {
      console.log("✅ ✅ ✅ MATCH! You are the owner!");
      console.log("You CAN flag transactions.");
      console.log("\nBut transactions are reverting... checking other issues:");
      
      // Check balance
      const balance = await signer.provider.getBalance(signer.address);
      console.log(`\nU2U Balance: ${ethers.formatEther(balance)} U2U`);
      
      if (balance < ethers.parseEther("0.01")) {
        console.log("⚠️  Low balance! Get more from faucet.");
      }
      
    } else {
      console.log("❌ ❌ ❌ MISMATCH! You are NOT the owner!");
      console.log("\n📋 Solution Options:");
      console.log("\n1️⃣  REDEPLOY CONTRACT (Recommended):");
      console.log("   npx hardhat run scripts/deploy.ts --network u2u_testnet");
      console.log("   Then update CONTRACT_ADDRESS everywhere");
      console.log("\n2️⃣  USE CORRECT WALLET:");
      console.log("   Update .env with the private key of:");
      console.log(`   ${contractOwner}`);
    }
  } catch (error: any) {
    console.error("❌ Error checking ownership:", error.message);
  }
}

main();