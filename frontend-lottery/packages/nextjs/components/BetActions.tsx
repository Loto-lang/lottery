"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { formatEther, parseEther } from "viem";
import { writeContract, waitForTransactionReceipt } from "wagmi/actions";
import { wagmiConfig } from "../services/web3/wagmiConfig";
import lotteryJson from "../contracts/abis/Lottery.json";

const LOTTERY_ABI = lotteryJson.abi;
const LOTTERY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_LOTTERY_CONTRACT_ADDRESS as `0x${string}`;
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`;

export function BetActions() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [times, setTimes] = useState("1");
  const [isPending, setIsPending] = useState(false);
  const [betPrice, setBetPrice] = useState("0");
  const [betFee, setBetFee] = useState("0");
  const [tokenSymbol, setTokenSymbol] = useState("TOKEN");
  const [userBalance, setUserBalance] = useState("0");

  const fetchContractInfo = async () => {
    if (!publicClient || !address) return;

    try {
      const [price, fee, symbol, tokenAddress] = await Promise.all([
        publicClient.readContract({
          address: LOTTERY_CONTRACT_ADDRESS,
          abi: LOTTERY_ABI,
          functionName: "betPrice",
        }),
        publicClient.readContract({
          address: LOTTERY_CONTRACT_ADDRESS,
          abi: LOTTERY_ABI,
          functionName: "betFee",
        }),
        publicClient.readContract({
          address: LOTTERY_CONTRACT_ADDRESS,
          abi: LOTTERY_ABI,
          functionName: "getTokenSymbol",
        }),
        publicClient.readContract({
          address: LOTTERY_CONTRACT_ADDRESS,
          abi: LOTTERY_ABI,
          functionName: "getPaymentTokenAddress",
        }),
      ]);

      setBetPrice(formatEther(price as bigint));
      setBetFee(formatEther(fee as bigint));
      setTokenSymbol(symbol as string);

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

      setUserBalance(formatEther(balance as bigint));
    } catch (err) {
      console.error("❌ Failed to load contract info", err);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchContractInfo();
    }
  }, [isConnected]);

  const costPerBet = parseFloat(betPrice) + parseFloat(betFee);
  const totalCost = costPerBet * parseInt(times || "0");
  const hasEnough = parseFloat(userBalance) >= totalCost;

  const handleBet = async () => {
    if (!walletClient || !address || !publicClient) {
      alert("❌ Wallet not connected");
      return;
    }
  
    try {
      setIsPending(true);
      console.log("🔍 Starting bet process...");
  
      // Step 1: Read key values from contract
      const [betsOpen, closingTime, balanceRaw, allowanceRaw, betPriceRaw, betFeeRaw] = await Promise.all([
        publicClient.readContract({
          address: LOTTERY_CONTRACT_ADDRESS,
          abi: LOTTERY_ABI,
          functionName: "getBetsOpen",
        }),
        publicClient.readContract({
          address: LOTTERY_CONTRACT_ADDRESS,
          abi: LOTTERY_ABI,
          functionName: "getBetsClosingTime",
        }),
        publicClient.readContract({
          address: TOKEN_ADDRESS,
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
        }),
        publicClient.readContract({
          address: TOKEN_ADDRESS,
          abi: [
            {
              name: "allowance",
              type: "function",
              stateMutability: "view",
              inputs: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
              ],
              outputs: [{ name: "", type: "uint256" }],
            },
          ],
          functionName: "allowance",
          args: [address, LOTTERY_CONTRACT_ADDRESS],
        }),
        publicClient.readContract({
          address: LOTTERY_CONTRACT_ADDRESS,
          abi: LOTTERY_ABI,
          functionName: "betPrice",
        }),
        publicClient.readContract({
          address: LOTTERY_CONTRACT_ADDRESS,
          abi: LOTTERY_ABI,
          functionName: "betFee",
        }),
      ]);
  
      const now = Math.floor(Date.now() / 1000);
      const closingTimestamp = Number(closingTime);
      const balance = balanceRaw as bigint;
      const allowance = allowanceRaw as bigint;
      const betPrice = betPriceRaw as bigint;
      const betFee = betFeeRaw as bigint;
      const totalRequired = BigInt(betPrice) + BigInt(betFee);
      console.log("💰 Required (price+fee):", formatEther(totalRequired));
      console.log("💳 User balance (raw):", balance.toString());
      if (balance < totalRequired) {
        alert("⛔ Not enough token balance.");
        return;
      }
  
      // ✅ Logs
      console.log("🧩 Current time (epoch):", now);
      console.log("🎯 Lottery status:", { betsOpen, closingTimestamp });
      console.log("💰 Required (price+fee):", formatEther(totalRequired));
      console.log("💳 User balance:", formatEther(balance));
      console.log("🔐 Current allowance:", formatEther(allowance));
  
      // Step 2: Check conditions
      if (!betsOpen) {
        alert("⛔ Lottery is not open.");
        return;
      }
  
      if (now >= closingTimestamp) {
        alert("⛔ Lottery has expired.");
        return;
      }
  
      if (balance < totalRequired) {
        alert("⛔ Not enough token balance.");
        return;
      }
  
      // Step 3: Approve only if allowance is too low
      if (allowance < totalRequired) {
        console.log("⚙️ Approving", formatEther(totalRequired), "tokens...");
  
        const approveHash = await writeContract(wagmiConfig, {
          address: TOKEN_ADDRESS,
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
          args: [LOTTERY_CONTRACT_ADDRESS, totalRequired],
          account: address,
        });
  
        await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
        console.log("✅ Approved successfully.");
      } else {
        console.log("✅ Allowance is sufficient, no need to approve.");
      }
  
      // Step 4: Call bet()
      console.log("🎰 Calling bet()...");
  
      const txHash = await writeContract(wagmiConfig, {
        address: LOTTERY_CONTRACT_ADDRESS,
        abi: LOTTERY_ABI,
        functionName: "bet",
        account: address,
      });
  
      await waitForTransactionReceipt(wagmiConfig, { hash: txHash });
      console.log("✅ Bet placed. Tx hash:", txHash);
  
      alert("✅ Bet placed successfully");
      await fetchContractInfo();
    } catch (err: any) {
      console.error("❌ Error placing bet", err);
      const message = err?.shortMessage || err?.message || "Unknown error during transaction";
      alert(`❌ ${message}`);
    } finally {
      setIsPending(false);
    }
  };
  
  

  const handleBetMany = async () => {
    if (!walletClient || !address) return alert("❌ Wallet not connected");

    try {
      setIsPending(true);
      const amountToApprove = parseEther((costPerBet * parseInt(times)).toString());

      const approveHash = await writeContract(wagmiConfig, {
        address: TOKEN_ADDRESS,
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
        args: [LOTTERY_CONTRACT_ADDRESS, amountToApprove],
        account: address,
      });
      
      await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });


      const txHash = await writeContract(wagmiConfig, {
        address: LOTTERY_CONTRACT_ADDRESS,
        abi: LOTTERY_ABI,
        functionName: "betMany",
        args: [parseInt(times)],
        account: address,
      });

      await waitForTransactionReceipt(wagmiConfig, { hash: txHash });
      alert("✅ Bets placed successfully");
      await fetchContractInfo();
    } catch (err) {
      console.error("❌ Error placing multiple bets", err);
      alert("❌ Error placing multiple bets");
    } finally {
      setIsPending(false);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="bg-white text-black rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
      <h2 className="text-xl font-bold">🎰 Place Your Bets</h2>

      <p><strong>Your balance:</strong> {userBalance} {tokenSymbol}</p>
      <p><strong>Cost per bet:</strong> {costPerBet.toFixed(0)} {tokenSymbol}</p>
      <p><strong>Total cost:</strong> {totalCost.toFixed(0)} {tokenSymbol}</p>

      <div>
        <label className="block font-medium">Number of Bets:</label>
        <input
          type="number"
          min="1"
          value={times}
          onChange={(e) => setTimes(e.target.value)}
          className="input input-bordered w-full"
        />
      </div>

      <button
        className="btn btn-primary w-full"
        onClick={handleBet}
        disabled={isPending || !hasEnough}
      >
        Bet Once
      </button>

      <button
        className="btn btn-secondary w-full"
        onClick={handleBetMany}
        disabled={isPending || !hasEnough || parseInt(times) <= 0}
      >
        Bet Many
      </button>

      {!hasEnough && (
        <p className="text-sm text-red-500">
          ❌ Not enough tokens to place this bet.
        </p>
      )}

      {isPending && (
        <p className="text-sm text-gray-500">⏳ Waiting for transaction...</p>
      )}
    </div>
  );
}
