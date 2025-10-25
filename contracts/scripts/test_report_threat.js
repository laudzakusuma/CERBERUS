const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0x9Dfb525D1448031ab48c4F404b330d781C0B8854";
  
  console.log("🧪 Testing ThreatReported event...\n");
  
  // Get contract
  const CerberusAlerts = await hre.ethers.getContractFactory("CerberusAlerts");
  const contract = CerberusAlerts.attach(CONTRACT_ADDRESS);
  
  const [signer] = await hre.ethers.getSigners();
  console.log("📍 Contract:", CONTRACT_ADDRESS);
  console.log("👤 Signer:", signer.address);
  
  // Generate dummy data with PROPER address format
  const testData = {
    txHash: hre.ethers.randomBytes(32),
    // ✅ FIX: Use signer address (valid address) instead of random
    flaggedAddress: signer.address,
    level: 2, // HIGH
    category: 0, // HIGH_GAS
    confidenceScore: 85,
    modelHash: hre.ethers.randomBytes(32)
  };
  
  console.log("\n📊 Test Data:");
  console.log("  Tx Hash:", hre.ethers.hexlify(testData.txHash));
  console.log("  Flagged Address:", testData.flaggedAddress);
  console.log("  Level:", testData.level, "(HIGH)");
  console.log("  Category:", testData.category, "(HIGH_GAS)");
  console.log("  Confidence:", testData.confidenceScore + "%");
  
  try {
    // Send transaction
    console.log("\n🚀 Reporting threat...");
    const tx = await contract.reportThreat(
      testData.txHash,
      testData.flaggedAddress,
      testData.level,
      testData.category,
      testData.confidenceScore,
      testData.modelHash
    );
    
    console.log("📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    console.log("📦 Block number:", receipt.blockNumber);
    
    // Find the event
    const eventFragment = contract.interface.getEvent('ThreatReported');
    const eventTopic = contract.interface.getEventTopic(eventFragment);
    
    const event = receipt.logs.find(log => log.topics[0] === eventTopic);
    
    if (event) {
      const parsed = contract.interface.parseLog({
        topics: event.topics,
        data: event.data
      });
      
      console.log("\n🎉 ThreatReported Event Emitted!");
      console.log("  Alert ID:", parsed.args.alertId.toString());
      console.log("  Tx Hash:", parsed.args.txHash);
      console.log("  Flagged Address:", parsed.args.flaggedAddress);
      console.log("  Level:", parsed.args.level.toString());
      console.log("  Category:", parsed.args.category.toString());
      console.log("  Confidence:", parsed.args.confidenceScore.toString() + "%");
      console.log("  Reporter:", parsed.args.reporter);
    }
    
    console.log("\n✅ Test completed! Refresh your frontend - data should appear!");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    
    if (error.message.includes("Ownable")) {
      console.log("\n💡 TIP: Make sure you're the contract owner or authorized reporter!");
      const owner = await contract.owner();
      console.log("   Contract owner:", owner);
      console.log("   Your address:", signer.address);
    } else if (error.message.includes("Pausable")) {
      console.log("\n💡 TIP: Contract might be paused!");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });