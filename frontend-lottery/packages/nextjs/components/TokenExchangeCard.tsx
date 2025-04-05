"use client";
import { wagmiConfig } from "../services/web3/wagmiConfig";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { formatEther, parseEther } from "viem";
import {
  writeContract,
  waitForTransactionReceipt,
} from "wagmi/actions";
import lotteryJson from "../contracts/abis/Lottery.json";

const LOTTERY_ABI = lotteryJson.abi;
const LOTTERY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_LOTTERY_CONTRACT_ADDRESS as `0x${string}`;

export function TokenExchangeCard() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [ethAmount, setEthAmount] = useState("0.01");
  const [tokenAmount, setTokenAmount] = useState("100");
  const [isPending, setIsPending] = useState(false);
  const [tokenBalance, setTokenBalance] = useState("0");

  const fetchBalance = async () => {
    if (!publicClient || !address) return;

    try {
      const tokenAddress = await publicClient.readContract({
        address: LOTTERY_CONTRACT_ADDRESS,
        abi: LOTTERY_ABI,
        functionName: "getPaymentTokenAddress",
      });

      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: "balanceOf",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ name: "", type: "uint256" }],
          },
        ],
        functionName: "balanceOf",
        args: [address],
      });

      setTokenBalance(formatEther(balance as bigint));
    } catch (err) {
      console.error("❌ Failed to fetch token balance", err);
    }
  };

  useEffect(() => {
    if (isConnected && publicClient) {
      fetchBalance();
    }
  }, [isConnected, publicClient]);

  const handleBuy = async () => {
    if (!walletClient || !publicClient || !address) {
      alert("❌ Please connect your wallet.");
      return;
    }

    try {
      setIsPending(true);

      const hash = await writeContract(wagmiConfig, {
        address: LOTTERY_CONTRACT_ADDRESS,
        abi: LOTTERY_ABI,
        functionName: "purchaseTokens",
        value: parseEther(ethAmount),
      });

      await waitForTransactionReceipt(wagmiConfig, { hash });
      await fetchBalance();
      alert("✅ Tokens purchased successfully");
    } catch (err) {
      console.error("❌ Error purchasing tokens", err);
      alert("❌ Error purchasing tokens");
    } finally {
      setIsPending(false);
    }
  };

  const handleReturn = async () => {
    if (!wagmiConfig || !publicClient || !address) {
      alert("❌ Please connect your wallet.");
      return;
    }
  
    try {
      setIsPending(true);
  
      // 1. Récupérer l'adresse du token via le contrat Lottery
      const tokenAddress = await publicClient.readContract({
        address: LOTTERY_CONTRACT_ADDRESS,
        abi: LOTTERY_ABI,
        functionName: "getPaymentTokenAddress",
      });
  
      // 2. Appeler approve(tokenAddress, lotteryAddress, amount)
      const approveHash = await writeContract(wagmiConfig, {
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: "approve",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "spender", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "", type: "bool" }],
          },
        ],
        functionName: "approve",
        args: [LOTTERY_CONTRACT_ADDRESS, parseEther(tokenAmount)],
        account: address,
      });
  
      await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
  
      // 3. Appeler returnTokens sur le contrat Lottery
      const returnHash = await writeContract(wagmiConfig, {
        address: LOTTERY_CONTRACT_ADDRESS,
        abi: LOTTERY_ABI,
        functionName: "returnTokens",
        args: [parseEther(tokenAmount)],
        account: address,
      });
  
      await waitForTransactionReceipt(wagmiConfig, { hash: returnHash });
  
      await fetchBalance();
      alert("✅ Tokens returned successfully");
    } catch (err) {
      console.error("❌ Error returning tokens", err);
      alert("❌ Error returning tokens");
    } finally {
      setIsPending(false);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="bg-white text-black rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
      <h2 className="text-xl font-bold">💰 Buy / Return Tokens</h2>

      <p>
        <strong>Your token balance:</strong> {tokenBalance}
      </p>

      {isPending && (
        <p className="text-sm text-gray-500">Transaction in progress... ⏳</p>
      )}

      <div>
        <label className="block font-medium">ETH to spend:</label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={ethAmount}
          onChange={(e) => setEthAmount(e.target.value)}
        />
        <button
          className="btn btn-primary mt-2 w-full"
          onClick={handleBuy}
          disabled={isPending}
        >
          Buy Tokens
        </button>
      </div>

      <div>
        <label className="block font-medium">Tokens to return:</label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={tokenAmount}
          onChange={(e) => setTokenAmount(e.target.value)}
        />
        <button
          className="btn btn-secondary mt-2 w-full"
          onClick={handleReturn}
          disabled={isPending}
        >
          Return Tokens
        </button>
      </div>
    </div>
  );
}
