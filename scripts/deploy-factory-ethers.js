/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const rpc = process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io";
  const pk = process.env.ARC_PRIVATE_KEY;
  if (!pk) throw new Error("ARC_PRIVATE_KEY not set in .env");

  const provider = new ethers.JsonRpcProvider(rpc, { chainId: 5042, name: "arc-mainnet" });
  const network = await provider.getNetwork();
  if (network.chainId !== 5042n) {
    throw new Error(`Refusing deployment on chainId=${network.chainId}; expected Arc Mainnet (5042)`);
  }
  const wallet = new ethers.Wallet(pk, provider);
  if (process.env.DEV_ADDRESS && wallet.address.toLowerCase() !== process.env.DEV_ADDRESS.toLowerCase()) {
    throw new Error(`Configured private key does not control DEV_ADDRESS ${process.env.DEV_ADDRESS}`);
  }

  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "BondingCurveFactory.sol", "BondingCurveFactory.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abi = artifact.abi;
  const bytecode = artifact.bytecode;

  console.log("Deploying from:", await wallet.getAddress());
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const gasLimit = BigInt(process.env.ARC_DEPLOY_GAS_LIMIT || "4000000");
  const contract = await factory.deploy({ gasLimit });
  const deploymentTx = contract.deploymentTransaction();
  console.log("Sent tx:", deploymentTx.hash);
  const deployed = await contract.waitForDeployment();
  const addr = await deployed.getAddress();
  const receipt = await deploymentTx.wait();
  console.log("BondingCurveFactory deployed at:", addr);

  const outDir = path.join(__dirname, "..", "addresses");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, "arc-mainnet-bonding-curve.json");
  const payload = {
    chainId: 5042,
    rpc,
    factory: addr,
    deploymentBlock: receipt.blockNumber,
    transactionHash: deploymentTx.hash,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log("Saved:", outPath);
  console.log("Arc Explorer:", `https://explorer.arc.io/address/${addr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
