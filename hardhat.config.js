import dotenv from "dotenv";
import "@nomicfoundation/hardhat-ethers";

dotenv.config();

const deploymentKey = process.env.ARC_PRIVATE_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true
    }
  },
  networks: {
    arcMainnet: {
      type: "http",
      url: process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io",
      chainId: 5042,
      accounts: deploymentKey ? [deploymentKey] : []
    }
  }
};

export default config;
