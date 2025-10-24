# Cerberus Watchdog: On-Chain AI Threat Detection

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![U2U Network](https://img.shields.io/badge/Network-U2U%20Testnet-blue)](https://u2u.xyz)
[![Built for VietBUILD](https://img.shields.io/badge/Built%20for-VietBUILD%20Hackathon-green)](https://hackathon.u2u.xyz)
[![Built for BI-OJK Hackathon](https://img.shields.io/badge/Built%20for-BI--OJK%20Hackathon-green)](https://GANTI_DENGAN_URL_HACKATHON)

**Cerberus Watchdog** adalah sistem AI otonom yang memantau U2U Network secara real-time untuk mendeteksi dan menandai transaksi berbahaya sebelum dieksekusi. Ancaman yang terdeteksi dicatat secara on-chain untuk menciptakan lapisan reputasi yang terdesentralisasi dan abadi.

## Fitur Utama

- **AI-Powered Detection**: Deteksi ancaman menggunakan algoritma machine learning
- **Real-time Monitoring**: Monitoring mempool U2U Network secara real-time
- **On-chain Recording**: Pencatatan ancaman permanent di blockchain
- **Advanced Analytics**: Dashboard dan analytics untuk threat intelligence
- **Multi-threat Categories**: Deteksi 10+ kategori ancaman berbeda

## Arsitektur

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   U2U Network   │    │  AI Sentinel    │    │ Smart Contract  │
│   (Mempool)     │───▶│   (Analysis)    │───▶│   (Recording)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Frontend      │
                       │  (Dashboard)    │
                       └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js v18+
- Python 3.9+
- MetaMask dengan U2U Testnet
- U2U testnet tokens

### Installation

1. **Clone repository**
```bash
git clone https://github.com/yourusername/cerberus-watchdog.git
cd cerberus-watchdog
```

2. **Install dependencies**
```bash
# Install workspace dependencies
pnpm install

# Setup AI Sentinel
cd services/ai-sentinel
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\Activate.ps1
pip install flask

# Setup Monitor
cd ../mempool-monitor
npm install

# Setup Frontend
cd ../../apps/frontend
npm install
```

3. **Deploy Smart Contract**
```bash
cd contracts
npx hardhat run scripts/deploy.ts --network u2u_testnet
```

4. **Configure Environment**
```bash
# Copy .env.example to .env dan isi dengan values Anda
cp .env.example .env
```

5. **Start Services**
```bash
# Terminal 1: AI Sentinel
cd services/ai-sentinel
python app.py

# Terminal 2: Monitor
cd services/mempool-monitor
node monitor.js

# Terminal 3: Frontend
cd apps/frontend
npm run dev
```

## 🔧 Configuration

### Environment Variables

```env
# U2U Network
U2U_RPC_HTTP=https://rpc-nebulas-testnet.uniultra.xyz
U2U_RPC_WSS=wss://rpc-nebulas-testnet.uniultra.xyz

# Smart Contract
CONTRACT_ADDRESS=your_deployed_contract_address

# Monitor
MONITOR_PRIVATE_KEY=your_wallet_private_key
AI_API_URL=http://127.0.0.1:5001/predict

# Frontend
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address
NEXT_PUBLIC_U2U_RPC_HTTP=https://rpc-nebulas-testnet.uniultra.xyz
```

## 🎨 Tech Stack

### Smart Contracts
- **Solidity 0.8.19**
- **Hardhat** untuk development & deployment
- **OpenZeppelin** untuk security standards

### AI & Backend
- **Python Flask** untuk AI API
- **Rule-based ML** untuk threat detection
- **Node.js + Ethers.js** untuk blockchain monitoring

### Frontend
- **Next.js (React)** untuk web interface
- **Styled-Components** untuk modern UI
- **Real-time WebSocket** untuk live updates

## 🛡️ Threat Categories

Cerberus dapat mendeteksi berbagai jenis ancaman:

1. **RUG_PULL** - Penarikan likuiditas mendadak
2. **FLASH_LOAN_ATTACK** - Serangan menggunakan flash loan
3. **FRONT_RUNNING** - MEV dan sandwich attacks
4. **SMART_CONTRACT_EXPLOIT** - Eksploitasi vulnerability kontrak
5. **PHISHING_CONTRACT** - Kontrak phishing palsu
6. **PRICE_MANIPULATION** - Manipulasi harga token
7. **HONEY_POT** - Trap contracts
8. **GOVERNANCE_ATTACK** - Serangan pada governance
9. **MEV_ABUSE** - Penyalahgunaan MEV

## 📊 Demo

### Live Detection Example

```
🔍 Analyzing: 0xbd9623e0... | Value: 1.0000 U2U
📊 Danger: 100.0 | Category: FRONT_RUNNING | Malicious: true
🚨 THREAT DETECTED! Reporting to blockchain...
📤 Report sent! Tx: 0x0fc59d18...
✅ Confirmed on block: 59465798
```

### Smart Contract Events

```solidity
event ThreatReported(
    uint256 indexed alertId,
    bytes32 indexed txHash,
    address indexed flaggedAddress,
    ThreatLevel level,
    ThreatCategory category,
    uint256 confidenceScore,
    address reporter,
    uint256 timestamp
);
```

## 🔗 Deployed Contracts

- **U2U Testnet**: `0xC65f3ec1e0a6853d2e6267CB918E683BA7E4f36c`
- **Explorer**: [View on U2U Explorer](https://testnet.u2uscan.xyz/address/0xC65f3ec1e0a6853d2e6267CB918E683BA7E4f36c)

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🏆 Hackathon

Built for **VietBUILD Hackathon** - demonstrating innovative blockchain security solutions on U2U Network.

## 📞 Contact

- **GitHub**: [@laudzakusuma](https://github.com/laudzakusuma)
- **Email**: laudzaxie@gmail.com
- **Demo**: soon

---

**⚠️ Disclaimer**: This is a proof-of-concept built for hackathon purposes. Use in production environments requires additional security audits and testing.
=======
# CERBERUS
>>>>>>> 511bbbf98f4bd352074e35e017d23afc642eba37
