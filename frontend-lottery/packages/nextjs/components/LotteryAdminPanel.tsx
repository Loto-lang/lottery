"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { writeContract, waitForTransactionReceipt } from "wagmi/actions";
import lotteryJson from "../contracts/abis/Lottery.json";
import { parseEther } from "viem";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const LOTTERY_ABI = lotteryJson.abi;
const LOTTERY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_LOTTERY_CONTRACT_ADDRESS as `0x${string}`;

export function LotteryAdminPanel() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [isOwner, setIsOwner] = useState(false);
  const [closingTimestamp, setClosingTimestamp] = useState(""); // en secondes depuis maintenant
  const [ownerWithdrawAmount, setOwnerWithdrawAmount] = useState("0");
  const [isPending, setIsPending] = useState(false);

  // Check if user is owner
  const fetchOwner = async () => {
    if (!address || !publicClient) return;

    try {
      const owner = await publicClient.readContract({
        address: LOTTERY_CONTRACT_ADDRESS,
        abi: LOTTERY_ABI,
        functionName: "owner",
      }) as `0x${string}`;
      setIsOwner(owner.toLowerCase() === address.toLowerCase());
    } catch (err) {
      console.error("❌ Error checking owner", err);
    }
  };

  useEffect(() => {
    fetchOwner();
  }, [address]);

  const handleOpenBets = async () => {
    if (!walletClient || !address || !publicClient) {
      alert("❌ Wallet not connected.");
      return;
    }
  
    const duration = parseInt(closingTimestamp); // par exemple, "120"
    if (isNaN(duration) || duration <= 0) {
      alert("❌ Invalid duration. Must be a number > 0.");
      return;
    }
  
    try {
      setIsPending(true);
  
      // Obtenir le timestamp actuel du réseau
      const block = await publicClient.getBlock();
      const currentTimestamp = Number(block.timestamp);
      const buffer = 10; // secondes
      const closingTimestamp = currentTimestamp + duration + buffer;
  
      console.log("🕓 Current block.timestamp:", currentTimestamp);
      console.log("📆 Requested closingTime:", closingTimestamp);
  
      const txHash = await writeContract(wagmiConfig, {
        address: LOTTERY_CONTRACT_ADDRESS,
        abi: LOTTERY_ABI,
        functionName: "openBets",
        args: [closingTimestamp],
        account: address,
      });
  
      await waitForTransactionReceipt(wagmiConfig, { hash: txHash });
  
      alert("✅ Bets opened successfully!");
    } catch (err: any) {
      console.error("❌ Error opening bets", err);
      const message =
        err?.shortMessage || err?.message || "Unknown error during transaction";
      alert(`❌ ${message}`);
    } finally {
      setIsPending(false);
    }
  };
  

  const handleCloseLottery = async () => {
    if (!walletClient || !address) return;

    try {
      setIsPending(true);

      const txHash = await writeContract(wagmiConfig, {
        address: LOTTERY_CONTRACT_ADDRESS,
        abi: LOTTERY_ABI,
        functionName: "closeLottery",
        account: address,
      });

      await waitForTransactionReceipt(wagmiConfig, { hash: txHash });
      alert("✅ Lottery closed");
    } catch (err) {
      console.error("❌ Error closing lottery", err);
      alert("❌ Error closing lottery");
    } finally {
      setIsPending(false);
    }
  };

  const handleOwnerWithdraw = async () => {
    if (!walletClient || !address) return;

    try {
      setIsPending(true);

      const txHash = await writeContract(wagmiConfig, {
        address: LOTTERY_CONTRACT_ADDRESS,
        abi: LOTTERY_ABI,
        functionName: "ownerWithdraw",
        args: [parseEther(ownerWithdrawAmount)],
        account: address,
      });

      await waitForTransactionReceipt(wagmiConfig, { hash: txHash });
      alert("✅ Fees withdrawn");
    } catch (err) {
      console.error("❌ Error withdrawing fees", err);
      alert("❌ Error withdrawing fees");
    } finally {
      setIsPending(false);
    }
  };

  if (!isConnected || !isOwner) return null;

  return (
    <div className="bg-white text-black rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
      <h2 className="text-xl font-bold">👑 Admin Panel</h2>

      <div>
        <label className="block font-medium">
          Closing time (in seconds from now):
        </label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={closingTimestamp}
          onChange={(e) => setClosingTimestamp(e.target.value)}
        />
        <button
          className="btn btn-primary mt-2 w-full"
          onClick={handleOpenBets}
          disabled={isPending || parseInt(closingTimestamp) <= 0}
        >
          Open Bets
        </button>
      </div>

      <div>
        <button
          className="btn btn-secondary w-full"
          onClick={handleCloseLottery}
          disabled={isPending}
        >
          Close Lottery
        </button>
      </div>

      <div>
        <label className="block font-medium">Withdraw fees (tokens):</label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={ownerWithdrawAmount}
          onChange={(e) => setOwnerWithdrawAmount(e.target.value)}
        />
        <button
          className="btn btn-accent mt-2 w-full"
          onClick={handleOwnerWithdraw}
          disabled={isPending || parseFloat(ownerWithdrawAmount) <= 0}
        >
          Withdraw Fees
        </button>
      </div>

      {isPending && (
        <p className="text-sm text-gray-500">⏳ Transaction pending...</p>
      )}
    </div>
  );
}
