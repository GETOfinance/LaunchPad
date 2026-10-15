import { Contract, Interface, InterfaceAbi, JsonRpcProvider, ethers } from "ethers";
import { prisma } from "@/lib/prisma";
import factoryArtifact from "@/artifacts/contracts/BondingCurveFactory.sol/BondingCurveFactory.json";
import poolArtifact from "@/artifacts/contracts/BondingCurvePool.sol/BondingCurvePool.json";
import { ARC_DEPLOYMENT_BLOCK, ARC_MAINNET, FACTORY_ADDRESS } from "@/lib/arc";

const artifactAbi = (artifact: unknown): InterfaceAbi =>
  ((artifact as { abi?: InterfaceAbi }).abi || artifact) as InterfaceAbi;
const factoryInterface = new Interface(artifactAbi(factoryArtifact));
const poolInterface = new Interface(artifactAbi(poolArtifact));
const CHUNK_SIZE = 1_500;
const MAX_BLOCKS_PER_RUN = 15_000;

export type SnapshotResult = {
  token: string;
  pool: string;
  priceRaw: string;
  reservesNativeRaw: string;
  reservesTokenRaw: string;
  blockNumber: number;
};

export class EVMIndexer {
  readonly provider = new JsonRpcProvider(process.env.ARC_RPC_URL || ARC_MAINNET.rpcUrl, ARC_MAINNET.chainId);

  private factory(): Contract {
    return new Contract(FACTORY_ADDRESS, artifactAbi(factoryArtifact), this.provider);
  }

  async discoverTokens(): Promise<string[]> {
    const factory = this.factory();
    const count = Math.min(Number(await factory.allTokensLength()), 1_000);
    return Promise.all(Array.from({ length: count }, (_, index) => factory.allTokens(index)));
  }

  async getPoolForToken(token: string): Promise<string | null> {
    const pool = String(await this.factory().getPool(token));
    return pool === ethers.ZeroAddress ? null : pool;
  }

  private async createdAt(blockNumber: number, cache: Map<number, Date>): Promise<Date> {
    const cached = cache.get(blockNumber);
    if (cached) return cached;
    const block = await this.provider.getBlock(blockNumber);
    const date = new Date(Number(block?.timestamp || 0) * 1_000);
    cache.set(blockNumber, date);
    return date;
  }

  async ingestEvents(): Promise<{ fromBlock: number; toBlock: number; events: number }> {
    const latest = await this.provider.getBlockNumber();
    const state = await prisma.indexerState.findUnique({ where: { id: "arc-events" } });
    const configuredStart = ARC_DEPLOYMENT_BLOCK;
    const fromBlock = state ? state.blockNumber + 1 : Math.max(configuredStart, latest - MAX_BLOCKS_PER_RUN + 1);
    const toBlock = Math.min(latest, fromBlock + MAX_BLOCKS_PER_RUN - 1);
    if (fromBlock > toBlock) return { fromBlock, toBlock, events: 0 };

    const blockDates = new Map<number, Date>();
    let events = 0;
    const createdTopic = factoryInterface.getEvent("TokenCreated")!.topicHash;
    for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
      const end = Math.min(toBlock, start + CHUNK_SIZE - 1);
      const logs = await this.provider.getLogs({ address: FACTORY_ADDRESS, fromBlock: start, toBlock: end, topics: [createdTopic] });
      for (const log of logs) {
        const parsed = factoryInterface.parseLog(log);
        if (!parsed) continue;
        const [token, pool, name, symbol, iconURI, projectURI, creator] = parsed.args;
        const tokenAddress = String(token).toLowerCase();
        const timestamp = await this.createdAt(log.blockNumber, blockDates);
        await prisma.fA.upsert({
          where: { address: tokenAddress },
          create: { address: tokenAddress, pool_address: String(pool).toLowerCase(), name, symbol, creator: String(creator).toLowerCase(), decimals: 18, icon_uri: iconURI, project_uri: projectURI, created_at: timestamp },
          update: { pool_address: String(pool).toLowerCase(), name, symbol, creator: String(creator).toLowerCase(), icon_uri: iconURI, project_uri: projectURI },
        });
        await prisma.poolStats.upsert({ where: { fa_address: tokenAddress }, create: { fa_address: tokenAddress, hbar_reserves: "0" }, update: {} });
        await prisma.fAEvent.upsert({
          where: { transaction_hash_log_index: { transaction_hash: log.transactionHash, log_index: log.index } },
          create: { transaction_hash: log.transactionHash, log_index: log.index, fa_address: tokenAddress, event_type: "CREATE_FA", event_data: { token: tokenAddress, pool: String(pool).toLowerCase(), creator: String(creator).toLowerCase() }, created_at: timestamp },
          update: {},
        });
        events++;
      }
    }

    const tokens = await prisma.fA.findMany({ where: { pool_address: { not: null } }, select: { address: true, pool_address: true } });
    for (const item of tokens.slice(0, 1_000)) {
      const poolAddress = item.pool_address!;
      for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
        const end = Math.min(toBlock, start + CHUNK_SIZE - 1);
        const logs = await this.provider.getLogs({ address: poolAddress, fromBlock: start, toBlock: end, topics: [[poolInterface.getEvent("Bought")!.topicHash, poolInterface.getEvent("Sold")!.topicHash]] });
        for (const log of logs) {
          const parsed = poolInterface.parseLog(log);
          if (!parsed) continue;
          const isBuy = parsed.name === "Bought";
          const nativeRaw = BigInt(isBuy ? parsed.args[1] : parsed.args[2]);
          const tokenRaw = BigInt(isBuy ? parsed.args[2] : parsed.args[1]);
          const user = String(parsed.args[0]).toLowerCase();
          const timestamp = await this.createdAt(log.blockNumber, blockDates);
          const priceRaw = tokenRaw === 0n ? 0n : (nativeRaw * 10n ** 18n) / tokenRaw;
          await prisma.trade.upsert({
            where: { transaction_hash_log_index: { transaction_hash: log.transactionHash, log_index: log.index } },
            create: { transaction_hash: log.transactionHash, log_index: log.index, fa_address: item.address, user_address: user, hbar_amount: nativeRaw.toString(), token_amount: tokenRaw.toString(), price_per_token: priceRaw.toString(), trade_type: isBuy ? "BUY" : "SELL", created_at: timestamp },
            update: {},
          });
          await prisma.fAEvent.upsert({
            where: { transaction_hash_log_index: { transaction_hash: log.transactionHash, log_index: log.index } },
            create: { transaction_hash: log.transactionHash, log_index: log.index, fa_address: item.address, event_type: isBuy ? "BUY_TOKENS" : "SELL_TOKENS", event_data: { user, nativeRaw: nativeRaw.toString(), tokenRaw: tokenRaw.toString() }, created_at: timestamp },
            update: {},
          });
          events++;
        }
      }
      const pool = new Contract(poolAddress, artifactAbi(poolArtifact), this.provider);
      const [nativeReserve, tokenReserve] = await pool.reserves();
      const aggregate = await prisma.trade.findMany({ where: { fa_address: item.address }, select: { hbar_amount: true }, take: 10_000 });
      const totalVolume = aggregate.reduce((sum, trade) => sum + BigInt(trade.hbar_amount), 0n);
      await prisma.poolStats.update({ where: { fa_address: item.address }, data: { hbar_reserves: nativeReserve.toString(), token_reserves: tokenReserve.toString(), total_volume: totalVolume.toString(), trade_count: aggregate.length, is_graduated: false } });
    }

    await prisma.indexerState.upsert({ where: { id: "arc-events" }, create: { id: "arc-events", blockNumber: toBlock }, update: { blockNumber: toBlock } });
    return { fromBlock, toBlock, events };
  }

  async snapshotAllTokens(): Promise<SnapshotResult[]> {
    await this.ingestEvents();
    const latest = await this.provider.getBlockNumber();
    const rows = await prisma.fA.findMany({ where: { pool_address: { not: null } }, take: 1_000 });
    const results: SnapshotResult[] = [];
    for (const row of rows) {
      const pool = new Contract(row.pool_address!, artifactAbi(poolArtifact), this.provider);
      const [nativeReserve, tokenReserve] = await pool.reserves();
      const priceRaw = BigInt(await pool.getPriceForSell(10n ** 18n));
      await prisma.tokenSnapshot.create({ data: { token: row.address, pool: row.pool_address!, priceUsd: priceRaw.toString(), priceHbar: priceRaw.toString(), hbarPriceUsd: (10n ** 18n).toString(), reservesHbar: nativeReserve.toString(), reservesToken: tokenReserve.toString(), blockNumber: latest, blockTime: new Date() } });
      results.push({ token: row.address, pool: row.pool_address!, priceRaw: priceRaw.toString(), reservesNativeRaw: nativeReserve.toString(), reservesTokenRaw: tokenReserve.toString(), blockNumber: latest });
    }
    return results;
  }
}
