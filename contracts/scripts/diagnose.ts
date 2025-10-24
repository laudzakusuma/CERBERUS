import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Diagnosing Contract...\n");

  const CONTRACT_ADDRESS = "0x9Dfb525D1448031ab48c4F404b330d781C0B8854";
  const [signer] = await ethers.getSigners();

  console.log(`Wallet: ${signer.address}`);
  console.log(`Contract: ${CONTRACT_ADDRESS}\n`);

  // Full ABI
  const abi = [
    "function owner() view returns (address)",
    "function totalAlerts() view returns (uint256)",
    "function flagTransaction(bytes32 _txHash, address _potentialThreatActor, string memory _threatSignature, uint8 _level) public"
  ];

  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

  try {
    // Test 1: Check owner
    console.log("TEST 1: Checking owner...");
    const owner = await contract.owner();
    console.log(`   Contract owner: ${owner}`);
    console.log(`   Your wallet:    ${signer.address}`);
    console.log(`   Match: ${owner.toLowerCase() === signer.address.toLowerCase() ? '✅ YES' : '❌ NO'}\n`);

    // Test 2: Check totalAlerts
    console.log("TEST 2: Checking totalAlerts...");
    const total = await contract.totalAlerts();
    console.log(`   Total alerts: ${total.toString()}\n`);

    // Test 3: Try to estimate gas for flagTransaction
    console.log("TEST 3: Estimating gas for flagTransaction...");
    try {
      const testHash = ethers.id("test-diagnosis");
      const gasEstimate = await contract.flagTransaction.estimateGas(
        testHash,
        signer.address,
        "Test Alert",
        1
      );
      console.log(`   ✅ Gas estimate: ${gasEstimate.toString()}\n`);
    } catch (e: any) {
      console.log(`   ❌ Gas estimation failed!`);
      console.log(`   Error: ${e.message}\n`);
      
      // Try to get revert reason
      if (e.data) {
        console.log(`   Revert data: ${e.data}`);
      }
      
      // This tells us WHY it's reverting!
    }

    // Test 4: Check contract code
    console.log("TEST 4: Checking if contract has code...");
    const code = await signer.provider.getCode(CONTRACT_ADDRESS);
    console.log(`   Code length: ${code.length} characters`);
    console.log(`   Has code: ${code !== '0x' ? '✅ YES' : '❌ NO (not deployed!)'}\n`);

  } catch (error: any) {
    console.error("❌ Error during diagnosis:", error.message);
  }

  console.log("════════════════════════════════════════");
  console.log("Diagnosis complete!");
  console.log("════════════════════════════════════════\n");
}

main().catch(console.error);