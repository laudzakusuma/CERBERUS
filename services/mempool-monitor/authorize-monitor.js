import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

// Ambil variabel dari .env
const {
    U2U_RPC_HTTP,
    DEPLOYER_PRIVATE_KEY, // Kunci ADMIN (a29a...)
    CONTRACT_ADDRESS,       // Kontrak (0x30A0...)
    MONITOR_ADDRESS         // Monitor (0x5807...)
} = process.env;

// ABI yang benar dari CerberusAlerts.sol
const contractABI = [
    "function setAuthorizedReporter(address _reporter, bool _authorized) external",
    "function authorizedReporters(address _reporter) public view returns (bool)"
];

async function authorize() {
    console.log("🔐 MEMBERI IZIN: Menjalankan setAuthorizedReporter...");
    console.log("======================================================");

    if (!DEPLOYER_PRIVATE_KEY || !CONTRACT_ADDRESS || !MONITOR_ADDRESS) {
        console.error("❌ Error: Pastikan DEPLOYER_PRIVATE_KEY, CONTRACT_ADDRESS, dan MONITOR_ADDRESS ada di .env.");
        return;
    }

    const provider = new ethers.JsonRpcProvider(U2U_RPC_HTTP);
    const adminWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, adminWallet);

    console.log(`👑 Admin Wallet (Owner): ${adminWallet.address}`);
    console.log(`🎯 Kontrak: ${CONTRACT_ADDRESS}`);
    console.log(`🤖 Memberi izin ke Monitor: ${MONITOR_ADDRESS}`);

    try {
        const isAlreadyAuthorized = await contract.authorizedReporters(MONITOR_ADDRESS);
        if (isAlreadyAuthorized) {
            console.log("\n✅ BERHASIL! Alamat monitor sudah diotorisasi.");
            return;
        }

        console.log("\n⏳ Mengirim transaksi 'setAuthorizedReporter'...");
        const tx = await contract.setAuthorizedReporter(MONITOR_ADDRESS, true);
        console.log(`... Menunggu konfirmasi transaksi: ${tx.hash}`);
        await tx.wait();

        console.log("\n✅ BERHASIL! Monitor Anda sekarang adalah 'Authorized Reporter'.");
        console.log("======================================================");

    } catch (error) {
        console.error(`\n❌ GAGAL: ${error.message}`);
    }
}

authorize();