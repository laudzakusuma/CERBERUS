import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // Enable IR optimization for large contracts
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    u2u_testnet: {
      url: "https://rpc-nebulas-testnet.uniultra.xyz",
      accounts: [PRIVATE_KEY],
      chainId: 2484,
      gasPrice: 20000000000, // 20 gwei
    },
    u2u_mainnet: {
      url: "https://rpc-mainnet.uniultra.xyz",
      accounts: [PRIVATE_KEY],
      chainId: 39,
      gasPrice: 20000000000,
    },
  },
  etherscan: {
    apiKey: {
      u2u_testnet: "your-api-key-here", // If U2U has verification API
    },
    customChains: [
      {
        network: "u2u_testnet",
        chainId: 2484,
        urls: {
          apiURL: "https://testnet.u2uscan.xyz/api",
          browserURL: "https://testnet.u2uscan.xyz",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};

export default config;