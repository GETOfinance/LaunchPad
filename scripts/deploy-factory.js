/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import hre from "hardhat";
const { ethers } = hre;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Basic sanity
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 5042n) {
    throw new Error(`Refusing deployment on chainId=${network.chainId}; expected Arc Mainnet (5042)`);
  }

  console.log("Deploying BondingCurveFactory...");
  const Factory = await ethers.getContractFactory("BondingCurveFactory");
  const gasLimit = BigInt(process.env.ARC_DEPLOY_GAS_LIMIT || "4000000");
  const factory = await Factory.deploy({ gasLimit });
  const deploymentTx = factory.deploymentTransaction();
  await factory.waitForDeployment();
  const receipt = await deploymentTx.wait();
  const factoryAddress = await factory.getAddress();
  console.log("BondingCurveFactory deployed at:", factoryAddress);

  // Persist addresses
  const outDir = path.join(__dirname, "..", "addresses");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, "arc-mainnet-bonding-curve.json");
  const payload = {
    chainId: 5042,
    rpc: process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io",
    factory: factoryAddress,
    deploymentBlock: receipt.blockNumber,
    transactionHash: deploymentTx.hash,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log("Saved:", outPath);

  console.log("Arc Explorer: https://explorer.arc.io/address/" + factoryAddress);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
