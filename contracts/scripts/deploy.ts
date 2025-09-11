import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting Cerberus Advanced Contract Deployment...");
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "U2U");
  
  if (balance < ethers.parseEther("0.1")) {
    throw new Error("❌ Insufficient balance for deployment. Need at least 0.1 U2U");
  }
  
  console.log("📦 Deploying CerberusAdvanced contract...");
  const CerberusAdvanced = await ethers.getContractFactory("CerberusAdvanced");
  const deploymentData = await CerberusAdvanced.getDeployTransaction();
  const gasEstimate = await deployer.estimateGas(deploymentData);
  console.log("⛽ Estimated gas for deployment:", gasEstimate.toString());
  const cerberusAdvanced = await CerberusAdvanced.deploy({
    gasLimit: gasEstimate * 120n / 100n,
    gasPrice: ethers.parseUnits("15", "gwei")
  });
  
  console.log("⏳ Waiting for deployment transaction...");
  await cerberusAdvanced.waitForDeployment();
  
  const contractAddress = await cerberusAdvanced.getAddress();
  console.log("✅ CerberusAdvanced deployed to:", contractAddress);
  const initialModelHash = ethers.keccak256(ethers.toUtf8Bytes("cerberus-ai-ensemble-v2.0.0-advanced"));
  console.log("🤖 Deploying initial ML model...");
  
  const deployModelTx = await cerberusAdvanced.deployMLModelWithGovernance(
    initialModelHash,
    "v2.0.0-advanced",
    "ensemble",
    85,
    82,
    88,
    10000,
    "precision:82,recall:88,f1:85",
    []
  );
  
  await deployModelTx.wait();
  console.log("✅ Initial ML model deployed with hash:", initialModelHash);
  console.log("🔍 Verifying deployment...");
  const contractStats = await cerberusAdvanced.getContractStats();
  console.log("📊 Contract initialized with stats:", {
    totalAlerts: contractStats[0].toString(),
    confirmedAlerts: contractStats[1].toString(),
    totalStaked: ethers.formatEther(contractStats[2]),
    totalRewards: ethers.formatEther(contractStats[3])
  });
  
  console.log("\n📊 Contract Information:");
  console.log("==========================================");
  console.log("Contract Address:", contractAddress);
  console.log("Deployer Address:", deployer.address);
  console.log("Network:", (await deployer.provider.getNetwork()).name);
  console.log("Block Number:", await deployer.provider.getBlockNumber());
  
  const feeData = await deployer.provider.getFeeData();
  console.log("Gas Price:", ethers.formatUnits(feeData.gasPrice || 0n, "gwei"), "gwei");
  
  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📝 Next Steps:");
  console.log("1. Update CONTRACT_ADDRESS in your .env files with:", contractAddress);
  console.log("2. Update ML model hash in your AI service with:", initialModelHash);
  console.log("3. Start your AI Sentinel API service");
  console.log("4. Start your Mempool Monitor service");
  console.log("5. Deploy your frontend with the contract address");
  console.log("\n🔍 Contract Verification:");
  console.log("To verify on U2U Explorer, use:");
  console.log(`npx hardhat verify --network u2u_testnet ${contractAddress}`);
  
  return {
    contractAddress,
    modelHash: initialModelHash,
    deployer: deployer.address
  };
}

main()
  .then((result) => {
    console.log("\n✅ Deployment result:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });