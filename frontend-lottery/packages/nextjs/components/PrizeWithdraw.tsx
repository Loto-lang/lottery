"use client";
import { wagmiConfig } from "../services/web3/wagmiConfig";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { writeContract, waitForTransactionReceipt } from "wagmi/actions";
import lotteryJson from "../contracts/abis/Lottery.json";
import { formatEther, parseEther } from "viem";

const LOTTERY_ABI = lotteryJson.abi;
const LOTTERY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_LOTTERY_CONTRACT_ADDRESS as `0x${string}`;

export function PrizeWithdraw() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [availablePrize, setAvailablePrize] = useState("0");
  const [withdrawAmount, setWithdrawAmount] = useState("0");
  const [isPending, setIsPending] = useState(false);

  const fetchPrize = async () => {
    if (!address || !publicClient) return;

    try {
      const prize = await publicClient.readContract({
        address: LOTTERY_CONTRACT_ADDRESS,
        abi: LOTTERY_ABI,
        functionName: "getPrizeOf",
        args: [address],
      });

      setAvailablePrize(formatEther(prize as bigint));
    } catch (err) {
      console.error("❌ Failed to fetch prize", err);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchPrize();
    }
  }, [isConnected, address]);

  const handleWithdraw = async () => {
    if (!walletClient || !address) return alert("❌ Wallet not connected");

    try {
      setIsPending(true);

      const txHash = await writeContract(wagmiConfig, {
        address: LOTTERY_CONTRACT_ADDRESS,
        abi: LOTTERY_ABI,
        functionName: "prizeWithdraw",
        args: [parseEther(withdrawAmount)],
        account: address,
      });

      await waitForTransactionReceipt(wagmiConfig, { hash: txHash });
      await fetchPrize();
      alert("✅ Prize withdrawn successfully");
    } catch (err) {
      console.error("❌ Error withdrawing prize", err);
      alert("❌ Error withdrawing prize");
    } finally {
      setIsPending(false);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="bg-white text-black rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
      <h2 className="text-xl font-bold">🏆 Claim Prize</h2>
      <p><strong>Available prize:</strong> {availablePrize}</p>

      <div>
        <label className="block font-medium">Amount to withdraw:</label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          max={parseFloat(availablePrize)}
        />
        <button
          className="btn btn-accent mt-2 w-full"
          onClick={handleWithdraw}
          disabled={isPending || parseFloat(withdrawAmount) <= 0}
        >
          Withdraw
        </button>
      </div>

      {isPending && (
        <p className="text-sm text-gray-500">⏳ Processing withdrawal...</p>
      )}
    </div>
  );
}
