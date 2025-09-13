const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.U2U_RPC_HTTP);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  const abi = require("./CerberusAdvanced.json").abi;
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

  const monitor = process.env.MONITOR_ADDRESS; // isi di .env alamat wallet monitor
  console.log("🔎 Checking roles for:", monitor);

  const AI_ORACLE_ROLE = await contract.AI_ORACLE_ROLE();
  const VALIDATOR_ROLE = await contract.VALIDATOR_ROLE();
  const GUARDIAN_ROLE = await contract.GUARDIAN_ROLE();

  console.log("AI_ORACLE_ROLE:", await contract.hasRole(AI_ORACLE_ROLE, monitor));
  console.log("VALIDATOR_ROLE:", await contract.hasRole(VALIDATOR_ROLE, monitor));
  console.log("GUARDIAN_ROLE:", await contract.hasRole(GUARDIAN_ROLE, monitor));
}

main().catch((err) => {
  console.error("❌ Error:", err);
});