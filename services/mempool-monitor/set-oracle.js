import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const {
    U2U_RPC_HTTP,
    DEPLOYER_PRIVATE_KEY, // Kunci ADMIN (a29a...)
    CONTRACT_ADDRESS,       // Kontrak (0x30A0...)
    MONITOR_ADDRESS         // Monitor (0x5807...)
} = process.env;

// ABI yang benar dari CerberusAlerts.sol
const contractABI = [
    "function setAiOracleAddress(address _newOracleAddress) external",
    "function aiOracleAddress() public view returns (address)"
];

async function setOracle() {
    console.log("🔐 MENGATUR ORACLE: Menjalankan setAiOracleAddress...");
    console.log("======================================================");

    if (!DEPLOYER_PRIVATE_KEY || !CONTRACT_ADDRESS || !MONITOR_ADDRESS) {
        console.error("❌ Error: Pastikan DEPLOYER_PRIVATE_KEY, CONTRACT_ADDRESS, dan MONITOR_ADDRESS ada di .env.");
        return;
    }

    const provider = new ethers.JsonRpcProvider(U2U_RPC_HTTP);
    const adminWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, adminWallet);

    console.log(`👑 Admin Wallet: ${adminWallet.address}`);
    console.log(`🎯 Kontrak: ${CONTRACT_ADDRESS}`);
    console.log(`🤖 Mengatur Oracle ke Alamat Monitor: ${MONITOR_ADDRESS}`);

    try {
        const currentOracle = await contract.aiOracleAddress();
        if (currentOracle.toLowerCase() === MONITOR_ADDRESS.toLowerCase()) {
            console.log("\n✅ BERHASIL! Alamat monitor sudah diatur sebagai oracle.");
            return;
        }

        console.log("\n⏳ Mengirim transaksi 'setAiOracleAddress'...");
        const tx = await contract.setAiOracleAddress(MONITOR_ADDRESS);
        console.log(`... Menunggu konfirmasi transaksi: ${tx.hash}`);
        await tx.wait();

        console.log("\n✅ BERHASIL! Monitor Anda sekarang adalah AI Oracle.");
        console.log("======================================================");

    } catch (error) {
        console.error(`\n❌ GAGAL: ${error.message}`);
    }
}

setOracle();