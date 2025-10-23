import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting CerberusAlerts deployment (Solidity 0.8.28)...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "U2U\n");

  if (balance === BigInt(0)) {
    console.error("❌ Insufficient balance!");
    console.log("Get testnet tokens from U2U faucet first.");
    process.exit(1);
  }

  console.log("⏳ Deploying CerberusAlerts...");
  
  const CerberusAlerts = await ethers.getContractFactory("CerberusAlerts");
  const cerberusAlerts = await CerberusAlerts.deploy(deployer.address);

  console.log("⏳ Waiting for deployment...");
  await cerberusAlerts.waitForDeployment();

  const contractAddress = await cerberusAlerts.getAddress();

  console.log("\n" + "=".repeat(60));
  console.log("✅ CerberusAlerts deployed successfully!");
  console.log("=".repeat(60));
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Explorer:", `https://testnet.u2uscan.xyz/address/${contractAddress}`);
  console.log("=".repeat(60));

  console.log("\n📊 Verifying Initial State...");
  try {
    const totalAlerts = await cerberusAlerts.totalAlerts();
    const owner = await cerberusAlerts.owner();
    
    console.log("   ✓ Total Alerts:", totalAlerts.toString());
    console.log("   ✓ Contract Owner:", owner);
    console.log("   ✓ Deployer:", deployer.address);
    console.log("   ✓ Match:", owner === deployer.address ? "YES ✅" : "NO ❌");
  } catch (error) {
    console.log("   ⚠️  Could not verify (this is OK)");
  }

  console.log("\n💾 SAVE THIS:");
  console.log("=".repeat(60));
  console.log("CONTRACT_ADDRESS=" + contractAddress);
  console.log("DEPLOYER_ADDRESS=" + deployer.address);
  console.log("NETWORK=u2u_testnet");
  console.log("CHAIN_ID=2484");
  console.log("DEPLOYED_AT=" + new Date().toISOString());
  console.log("=".repeat(60));

  console.log("\n📝 NEXT STEPS:");
  console.log("━".repeat(60));
  console.log("1. Update apps/frontend/.env.local:");
  console.log("   NEXT_PUBLIC_CONTRACT_ADDRESS=" + contractAddress);
  console.log("");
  console.log("2. Update services/mempool-monitor/.env:");
  console.log("   CONTRACT_ADDRESS=" + contractAddress);
  console.log("");
  console.log("3. Test contract:");
  console.log("   CONTRACT_ADDRESS=" + contractAddress);
  console.log("   npx hardhat run scripts/test-contract.ts --network u2u_testnet");
  console.log("━".repeat(60));

  console.log("\n🎉 Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n" + "=".repeat(60));
    console.error("❌ DEPLOYMENT FAILED");
    console.error("=".repeat(60));
    console.error(error);
    console.error("=".repeat(60));
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Get testnet tokens from U2U faucet");
    } else if (error.message.includes("network")) {
      console.log("\n💡 Check hardhat.config.ts network settings");
    }
    
    console.log("");
    process.exit(1);
  });