import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Flagging Test Transactions...\n");

  const CONTRACT_ADDRESS = "0x9Dfb525D1448031ab48c4F404b330d781C0B8854";
  const [signer] = await ethers.getSigners();

  console.log(`Wallet: ${signer.address}`);
  console.log(`Contract: ${CONTRACT_ADDRESS}\n`);

  // CORRECT ABI with reportThreat
  const abi = [
    "function reportThreat(bytes32 _txHash, address _flaggedAddress, uint8 _level, uint8 _category, uint256 _confidenceScore, bytes32 _modelHash) external"
  ];

  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

  // ThreatLevel enum: INFO=0, MEDIUM=1, HIGH=2, CRITICAL=3
  // ThreatCategory enum: RUG_PULL=0, FLASH_LOAN_ATTACK=1, etc.

  const txs = [
    { 
      h: ethers.id("test-1"), 
      s: "CRITICAL: High Value Reentrancy Attack",
      level: 3,        // CRITICAL
      category: 3,     // SMART_CONTRACT_EXPLOIT
      confidence: 95
    },
    { 
      h: ethers.id("test-2"), 
      s: "HIGH: Suspicious Gas Price Manipulation",
      level: 2,        // HIGH
      category: 8,     // MEV_ABUSE
      confidence: 85
    },
    { 
      h: ethers.id("test-3"), 
      s: "HIGH: Atypical Contract Creation",
      level: 2,        // HIGH
      category: 3,     // SMART_CONTRACT_EXPLOIT
      confidence: 80
    },
    { 
      h: ethers.id("test-4"), 
      s: "MEDIUM: Unusual Transaction Value",
      level: 1,        // MEDIUM
      category: 5,     // PRICE_MANIPULATION
      confidence: 70
    },
    { 
      h: ethers.id("test-5"), 
      s: "CRITICAL: Flash Loan Attack",
      level: 3,        // CRITICAL
      category: 1,     // FLASH_LOAN_ATTACK
      confidence: 98
    }
  ];

  let success = 0;

  for (let i = 0; i < txs.length; i++) {
    try {
      console.log(`[${i + 1}/5] ${txs[i].s}`);
      console.log(`   Level: ${txs[i].level} | Category: ${txs[i].category} | Confidence: ${txs[i].confidence}%`);
      
      // Create modelHash (can be any bytes32 for testing)
      const modelHash = ethers.id(`cerberus-ai-model-v1-${i}`);
      
      const tx = await contract.reportThreat(
        txs[i].h,            // txHash
        signer.address,      // flaggedAddress
        txs[i].level,        // ThreatLevel
        txs[i].category,     // ThreatCategory
        txs[i].confidence,   // confidenceScore
        modelHash            // modelHash
      );
      
      console.log(`   ⏳ ${tx.hash}`);
      await tx.wait();
      console.log(`   ✅ Confirmed!\n`);
      
      success++;
      await new Promise(r => setTimeout(r, 2000));
      
    } catch (e: any) {
      if (e.message.includes("Alert exists")) {
        console.log(`   ⚠️  Alert already exists\n`);
        success++;
      } else {
        console.log(`   ❌ Error: ${e.message.substring(0, 100)}\n`);
      }
    }
  }

  console.log("════════════════════════════════════════");
  console.log(`✅ Flagged: ${success}/5 transactions`);
  console.log("════════════════════════════════════════");
  console.log("\n🎉 Check frontend: http://localhost:3000");
  console.log(`🔍 Explorer: https://testnet.u2uscan.xyz/address/${CONTRACT_ADDRESS}\n`);
}

main().catch(console.error);