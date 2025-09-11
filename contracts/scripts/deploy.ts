import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Cerberus Advanced Threat Detection System...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Check deployer balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "U2U");
  
  // Deploy CerberusAlerts contract
  console.log("\n📦 Deploying CerberusAlerts contract...");
  const CerberusAlerts = await ethers.getContractFactory("CerberusAlerts");
  const cerberusAlerts = await CerberusAlerts.deploy();
  
  await cerberusAlerts.waitForDeployment();
  const contractAddress = await cerberusAlerts.getAddress();
  
  console.log("✅ CerberusAlerts deployed to:", contractAddress);
  
  // Initialize the contract with some default ML model
  console.log("\n🧠 Setting up initial ML model...");
  const initialModelHash = ethers.keccak256(ethers.toUtf8Bytes("cerberus-ai-v1.0.0"));
  
  try {
    const deployModelTx = await cerberusAlerts.deployMLModel(
      initialModelHash,
      "v1.0.0",
      85, // 85% accuracy
      "IsolationForest",
      2000 // Training data size
    );
    await deployModelTx.wait();
    console.log("✅ Initial ML model registered with hash:", initialModelHash);
  } catch (error) {
    console.log("⚠️ ML model setup skipped (may already exist)");
  }
  
  // Grant AI_REPORTER_ROLE to deployer for testing
  console.log("\n🔑 Setting up roles...");
  const AI_REPORTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AI_REPORTER_ROLE"));
  const VALIDATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VALIDATOR_ROLE"));
  
  try {
    await cerberusAlerts.grantRole(AI_REPORTER_ROLE, deployer.address);
    await cerberusAlerts.grantRole(VALIDATOR_ROLE, deployer.address);
    console.log("✅ Roles granted to deployer for testing");
  } catch (error) {
    console.log("⚠️ Roles may already be granted");
  }
  
  // Display contract information
  console.log("\n📊 Contract Information:");
  console.log("==========================================");
  console.log("Contract Address:", contractAddress);
  console.log("Deployer Address:", deployer.address);
  console.log("Network:", (await deployer.provider.getNetwork()).name);
  console.log("Block Number:", await deployer.provider.getBlockNumber());
  console.log("Gas Price:", ethers.formatUnits(await deployer.provider.getFeeData().then(f => f.gasPrice || 0n), "gwei"), "gwei");
  
  // Get contract stats
  try {
    const stats = await cerberusAlerts.getContractStats();
    console.log("\n📈 Initial Contract Stats:");
    console.log("Total Alerts:", stats[0].toString());
    console.log("Total Confirmed:", stats[1].toString());
    console.log("Total Staked:", ethers.formatEther(stats[2]), "U2U");
    console.log("Total Rewards:", ethers.formatEther(stats[3]), "U2U");
  } catch (error) {
    console.log("⚠️ Could not fetch initial stats");
  }
  
  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📝 Next Steps:");
  console.log("1. Update CONTRACT_ADDRESS in your .env files with:", contractAddress);
  console.log("2. Update ML model hash in your AI service with:", initialModelHash);
  console.log("3. Start your AI Sentinel API service");
  console.log("4. Start your Mempool Monitor service");
  console.log("5. Deploy your frontend with the contract address");
  
  // Verification note
  console.log("\n🔍 Contract Verification:");
  console.log("To verify on U2U Explorer, use:");
  console.log(`npx hardhat verify --network u2u_testnet ${contractAddress}`);
  
  return {
    contractAddress,
    modelHash: initialModelHash,
    deployer: deployer.address
  };
}

// Execute deployment
main()
  .then((result) => {
    console.log("\n✅ Deployment result:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });