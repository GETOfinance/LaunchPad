"use client";

import { useCallback, useEffect, useState } from "react";
import { Contract, JsonRpcSigner, MaxUint256, parseUnits, ZeroAddress } from "ethers";
import { ARCDEX_FACTORY_ABI, ARCDEX_ROUTER_ABI, ERC20_ABI } from "@/lib/arcdex";
import {
  FACTORY_ADDRESS,
  ROUTER_ADDRESS,
  USDC_ADDRESS,
  USDC_DECIMALS,
} from "@/lib/arc";
import { applySlippage } from "@/lib/amounts";

export function useBondingCurveTrade(
  tokenAddress: string,
  signer: JsonRpcSigner | null,
  account: string | null,
) {
  const [poolAddress, setPoolAddress] = useState<string | null>(null);
  const [balanceRaw, setBalanceRaw] = useState(0n);
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [pending, setPending] = useState(false);

  const contracts = useCallback(async () => {
    if (!signer || !account) throw new Error("Connect your wallet first");
    const factory = new Contract(FACTORY_ADDRESS, ARCDEX_FACTORY_ABI, signer);
    const pair = String(await factory.getPair(USDC_ADDRESS, tokenAddress));
    if (pair === ZeroAddress) throw new Error("No ArcDEX USDC pair exists for this token");
    return {
      pair,
      router: new Contract(ROUTER_ADDRESS, ARCDEX_ROUTER_ABI, signer),
      token: new Contract(tokenAddress, ERC20_ABI, signer),
      usdc: new Contract(USDC_ADDRESS, ERC20_ABI, signer),
    };
  }, [account, signer, tokenAddress]);

  const refreshBalance = useCallback(async () => {
    if (!signer || !account) return setBalanceRaw(0n);
    const { token, pair } = await contracts();
    const [balance, decimals] = await Promise.all([token.balanceOf(account), token.decimals()]);
    setPoolAddress(pair);
    setBalanceRaw(BigInt(balance));
    setTokenDecimals(Number(decimals));
  }, [account, contracts, signer]);

  useEffect(() => {
    void refreshBalance().catch(() => undefined);
  }, [refreshBalance]);

  const quote = useCallback(async (amountIn: bigint, path: string[]) => {
    if (amountIn <= 0n) return 0n;
    const { router } = await contracts();
    const amounts = await router.getAmountsOut(amountIn, path);
    return BigInt(amounts[amounts.length - 1]);
  }, [contracts]);

  const swap = useCallback(async (
    amountIn: bigint,
    minimumOut: bigint,
    path: string[],
    inputToken: Contract,
    deadlineMinutes: number,
  ) => {
    const { router } = await contracts();
    const allowance = BigInt(await inputToken.allowance(account, ROUTER_ADDRESS));
    if (allowance < amountIn) {
      const approval = await inputToken.approve(ROUTER_ADDRESS, MaxUint256);
      await approval.wait();
    }
    const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60);
    const transaction = await router.swapExactTokensForTokens(
      amountIn,
      minimumOut,
      path,
      account,
      deadline,
    );
    const receipt = await transaction.wait();
    await refreshBalance();
    return receipt.hash as string;
  }, [account, contracts, refreshBalance]);

  const buy = useCallback(async (amount: string, slippageBps = 100, deadlineMinutes = 10) => {
    const amountIn = parseUnits(amount || "0", USDC_DECIMALS);
    if (amountIn <= 0n) throw new Error("Enter an amount greater than zero");
    const { usdc } = await contracts();
    const quoted = await quote(amountIn, [USDC_ADDRESS, tokenAddress]);
    setPending(true);
    try {
      return await swap(amountIn, applySlippage(quoted, slippageBps), [USDC_ADDRESS, tokenAddress], usdc, deadlineMinutes);
    } finally {
      setPending(false);
    }
  }, [contracts, quote, swap, tokenAddress]);

  const sell = useCallback(async (amount: string, slippageBps = 100, deadlineMinutes = 10) => {
    const amountIn = parseUnits(amount || "0", tokenDecimals);
    if (amountIn <= 0n) throw new Error("Enter an amount greater than zero");
    const { token } = await contracts();
    const quoted = await quote(amountIn, [tokenAddress, USDC_ADDRESS]);
    setPending(true);
    try {
      return await swap(amountIn, applySlippage(quoted, slippageBps), [tokenAddress, USDC_ADDRESS], token, deadlineMinutes);
    } finally {
      setPending(false);
    }
  }, [contracts, quote, swap, tokenAddress, tokenDecimals]);

  const quoteBuy = useCallback(
    (amount: string) => quote(parseUnits(amount || "0", USDC_DECIMALS), [USDC_ADDRESS, tokenAddress]),
    [quote, tokenAddress],
  );
  const quoteSell = useCallback(
    (amount: string) => quote(parseUnits(amount || "0", tokenDecimals), [tokenAddress, USDC_ADDRESS]),
    [quote, tokenAddress, tokenDecimals],
  );

  return {
    buy,
    sell,
    quoteBuy,
    quoteSell,
    pending,
    balanceRaw,
    poolAddress,
    tokenDecimals,
    usdcDecimals: USDC_DECIMALS,
    refreshBalance,
  };
}
