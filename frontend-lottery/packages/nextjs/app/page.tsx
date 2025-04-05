"use client";

import { NextPage } from "next";
import { useAccount } from "wagmi";

import { Address } from "~~/components/scaffold-eth";
import { LotteryInfo } from "~~/components/LotteryInfo";
import { TokenExchangeCard } from "~~/components/TokenExchangeCard";
import { BetActions } from "../components/BetActions";
import { PrizeWithdraw } from "~~/components/PrizeWithdraw";
import { LotteryAdminPanel } from "../components/LotteryAdminPanel";

const Home: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();

  return (
    <main className="flex flex-col items-center p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">🎯 Connected Wallet</h1>
        {isConnected ? (
          <Address address={connectedAddress} />
        ) : (
          <p className="text-gray-500">Please connect your wallet</p>
        )}
      </div>

      {/* First row: LotteryInfo + AdminPanel */}
      <div className="flex flex-wrap justify-center gap-6 w-full">
        <LotteryInfo />
        <LotteryAdminPanel />
      </div>

      {/* Second row: TokenExchange + BetActions + PrizeWithdraw */}
      <div className="flex flex-wrap justify-center gap-6 w-full">
        <TokenExchangeCard />
        <BetActions />
        <PrizeWithdraw />
      </div>
    </main>
  );
};

export default Home;
