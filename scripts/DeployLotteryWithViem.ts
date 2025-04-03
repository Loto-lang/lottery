import {
    createPublicClient,
    createWalletClient,
    http,
    formatEther,
  } from "viem";
  import { privateKeyToAccount } from "viem/accounts";
  import { holesky } from "viem/chains";
  import {
    abi as abiLottery,
    bytecode as bytecodeLottery,
  } from "../artifacts/contracts/Lottery.sol/Lottery.json";
  import * as dotenv from "dotenv";
  
  dotenv.config();
  
  const providerApiKey = process.env.ALCHEMY_API_KEY || "";
  const deployerPrivateKey = process.env.PRIVATE_KEY || "";
  
  function validateParams(
    name: string,
    symbol: string,
    purchaseRatio: number,
    betPrice: bigint,
    betFee: bigint
  ) {
    if (!name || !symbol) throw new Error("Token name and symbol are required");
    if (purchaseRatio <= 0) throw new Error("purchaseRatio must be > 0");
    if (betPrice <= 0n) throw new Error("betPrice must be > 0");
    if (betFee < 0n) throw new Error("betFee must be ≥ 0");
    if (betFee >= betPrice)
      throw new Error("betFee must be less than betPrice");
  }
  
  async function main() {
    const args = process.argv.slice(2);
  
    if (args.length < 5) {
      throw new Error(
        "Usage: ts-node DeployLottery.ts <tokenName> <tokenSymbol> <purchaseRatio> <betPrice> <betFee>"
      );
    }
  
    const [tokenName, tokenSymbol, purchaseRatioRaw, betPriceRaw, betFeeRaw] =
      args;
  
    const purchaseRatio = parseInt(purchaseRatioRaw);
    const betPrice = BigInt(betPriceRaw) * 10n ** 18n;
    const betFee = BigInt(betFeeRaw) * 10n ** 18n;

    console.log("Parsed values:");
    console.log("- betPrice (ETH):", betPriceRaw);
    console.log("- betPrice (wei):", betPrice.toString());
    console.log("- betFee (ETH):", betFeeRaw);
    console.log("- betFee (wei):", betFee.toString());

    
  
    validateParams(tokenName, tokenSymbol, purchaseRatio, betPrice, betFee);
  
    const publicClient = createPublicClient({
      chain: holesky,
      transport: http(
        `https://eth-holesky.g.alchemy.com/v2/${providerApiKey}`
      ),
    });
  
    const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
    const deployer = createWalletClient({
      account,
      chain: holesky,
      transport: http(
        `https://eth-holesky.g.alchemy.com/v2/${providerApiKey}`
      ),
    });
  
    console.log("Deployer address:", deployer.account.address);
  
    const balance = await publicClient.getBalance({
      address: deployer.account.address,
    });
  
    console.log(
      "Deployer balance:",
      formatEther(balance),
      deployer.chain.nativeCurrency.symbol
    );
  
    console.log("\nDeploying Lottery contract...");
  
    const hash = await deployer.deployContract({
      abi: abiLottery,
      bytecode: bytecodeLottery as `0x${string}`,
      args: [tokenName, tokenSymbol, purchaseRatio, betPrice, betFee],
    });
  
    console.log("Transaction hash:", hash);
    console.log("Waiting for confirmation...");
  
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      pollingInterval: 5_000,
      timeout: 180_000,
    });
  
    console.log("✅ Lottery contract deployed to:", receipt.contractAddress);
  }
  
  main().catch((err) => {
    console.error("❌ Error during deployment:", err);
    process.exit(1);
  });
  