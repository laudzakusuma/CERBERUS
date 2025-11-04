import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Muat semua variabel dari file .env
dotenv.config();

const {
    U2U_RPC_HTTP,
    DEPLOYER_PRIVATE_KEY, // Kunci ADMIN Anda
    CONTRACT_ADDRESS,       // Alamat Kontrak BARU (0x30A0...)
    MONITOR_ADDRESS         // Alamat Monitor (0x5807...)
} = process.env;

// Ini adalah ABI (definisi fungsi) yang benar yang kita butuhkan
const contractABI = [
    "function grantOracleRole(address _oracle) public",
    "function hasRole(bytes32 role, address account) public view returns (bool)",
    "function AI_ORACLE_ROLE() public view returns (bytes32)"
];

async function grantPermission() {
    console.log("🔐 MEMPERBAIKI IZIN: Memberi AI_ORACLE_ROLE ke Monitor...");
    console.log("======================================================");

    if (!DEPLOYER_PRIVATE_KEY || !CONTRACT_ADDRESS || !MONITOR_ADDRESS) {
        console.error("❌ Error: Pastikan DEPLOYER_PRIVATE_KEY, CONTRACT_ADDRESS, dan MONITOR_ADDRESS ada di file .env Anda.");
        return;
    }

    const provider = new ethers.JsonRpcProvider(U2U_RPC_HTTP);

    // Terhubung sebagai ADMIN (Deployer)
    const adminWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
    console.log(`👑 Admin Wallet: ${adminWallet.address}`);
    console.log(`🎯 Kontrak: ${CONTRACT_ADDRESS}`);
    console.log(`🤖 Memberi izin ke Monitor: ${MONITOR_ADDRESS}`);

    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, adminWallet);

    try {
        // 1. Dapatkan nama 'role' dari kontrak
        const oracleRole = await contract.AI_ORACLE_ROLE();
        console.log(`\n🔍 Nama Role: ${oracleRole}`);

        // 2. Cek apakah monitor sudah punya izin
        const alreadyHasRole = await contract.hasRole(oracleRole, MONITOR_ADDRESS);
        if (alreadyHasRole) {
            console.log("✅ Monitor sudah memiliki AI_ORACLE_ROLE. Tidak perlu melakukan apa-apa.");
            return;
        }

        console.log("\n⏳ Memberi izin... (Mengirim transaksi 'grantOracleRole')");

        // 3. Kirim transaksi untuk memberi izin
        const tx = await contract.grantOracleRole(MONITOR_ADDRESS);
        console.log(`... Menunggu konfirmasi transaksi: ${tx.hash}`);

        await tx.wait();

        console.log("\n✅ BERHASIL! Izin telah diberikan.");
        console.log("======================================================");

    } catch (error) {
        console.error(`\n❌ GAGAL: ${error.message}`);
        if (error.code) console.error(`   Kode Error: ${error.code}`);
    }
}

grantPermission();