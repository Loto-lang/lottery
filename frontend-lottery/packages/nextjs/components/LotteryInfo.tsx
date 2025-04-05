"use client";

import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import lotteryJson from "../contracts/abis/Lottery.json";

const LOTTERY_ABI = lotteryJson.abi;

function truncateAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function LotteryInfo() {
  const LOTTERY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_LOTTERY_CONTRACT_ADDRESS as `0x${string}`;

  const { data: token } = useReadContract({
    address: LOTTERY_CONTRACT_ADDRESS,
    abi: LOTTERY_ABI,
    functionName: "getPaymentTokenAddress",
  });

  const { data: name } = useReadContract({
    address: LOTTERY_CONTRACT_ADDRESS,
    abi: LOTTERY_ABI,
    functionName: "getTokenName",
  });

  const { data: symbol } = useReadContract({
    address: LOTTERY_CONTRACT_ADDRESS,
    abi: LOTTERY_ABI,
    functionName: "getTokenSymbol",
  });

  const { data: price } = useReadContract({
    address: LOTTERY_CONTRACT_ADDRESS,
    abi: LOTTERY_ABI,
    functionName: "betPrice",
  });

  const { data: fee } = useReadContract({
    address: LOTTERY_CONTRACT_ADDRESS,
    abi: LOTTERY_ABI,
    functionName: "betFee",
  });

  const { data: open } = useReadContract({
    address: LOTTERY_CONTRACT_ADDRESS,
    abi: LOTTERY_ABI,
    functionName: "getBetsOpen",
  });

  const { data: closeTime } = useReadContract({
    address: LOTTERY_CONTRACT_ADDRESS,
    abi: LOTTERY_ABI,
    functionName: "getBetsClosingTime",
  });

  const { data: slots } = useReadContract({
    address: LOTTERY_CONTRACT_ADDRESS,
    abi: LOTTERY_ABI,
    functionName: "getNumberOfSlots",
  });

  return (
    <div className="p-4 rounded-2xl shadow-xl bg-white text-black space-y-3">
      <h2 className="text-xl font-bold">🎟️ Lottery Info</h2>
      <p><strong>Contract address:</strong> {truncateAddress(LOTTERY_CONTRACT_ADDRESS)}</p>
      <p><strong>Token:</strong> {name?.toString()} ({symbol?.toString()})</p>
      <p><strong>Token address:</strong> {truncateAddress(token?.toString())}</p>
      {/* <p><strong>Token address:</strong> {token?.toString()}</p> */}

      <p><strong>Bet price:</strong> {price ? formatEther(price as bigint) : ''} {symbol?.toString()}</p>
      <p><strong>Bet fee:</strong> {fee ? formatEther(fee as bigint) : ''} {symbol?.toString()}</p>
      <p><strong>Bets open:</strong> {open ? "Yes ✅" : "No ❌"}</p>
      {Boolean(open) && (
        <p><strong>Closing time:</strong> {closeTime ? new Date(Number(closeTime) * 1000).toLocaleString() : ''}</p>
      )}
      <p><strong>Number of players:</strong> {slots?.toString()}</p>
    </div>
  );
}
