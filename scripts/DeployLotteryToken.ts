
import { createPublicClient, http, createWalletClient, formatEther, parseEther, toHex, hexToString, Address, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { holesky } from "viem/chains";
import { abi as abiLotteryToken, bytecode as bytecodeLotteryToken } from "../artifacts/contracts/LotteryToken.sol/LotteryToken.json";
import * as dotenv from "dotenv";

dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY || "";
const deployerPublicKey = process.env.PUBLIC_KEY || "";

async function main() {
  //deploy MyToken contract at a specific address (to be recorded in .env for the future usage of several scripts) 
  //with arg = integer total of MyEth minted for initialization

    if (!/^0x[a-fA-F0-9]{40}$/.test(deployerPublicKey)) {
        throw new Error("Invalid PUBLIC_KEY: must be a valid Ethereum address.");
      }

 

    const publicClient = createPublicClient({
        chain: holesky,
        transport: http(`https://eth-holesky.g.alchemy.com/v2/${providerApiKey}`),
    });

    const blockNumber = await publicClient.getBlockNumber();
    console.log("Last block number:", blockNumber);
    
    const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
    const deployer = createWalletClient({
        account,
        chain: holesky,
        transport: http(`https://eth-holesky.g.alchemy.com/v2/${providerApiKey}`),

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

    console.log("\nDeploying = LotteryToken contract");
    const hashTxLotteryToken = await deployer.deployContract({
        abi : abiLotteryToken,
        bytecode: bytecodeLotteryToken as `0x${string}`,
        args: ["LotteryToken", "LTO"],
      });
    if (!hashTxLotteryToken) throw new Error("Transaction hashTx LotteryToken is undefined");

    console.log("Transaction hash:", hashTxLotteryToken);
    console.log("Waiting for confirmations...");
    const receiptTxLotteryToken = await publicClient.waitForTransactionReceipt({ 
        hash: hashTxLotteryToken,
        pollingInterval: 5_000, // 5 sec
        timeout: 180_000 // 3 minutes
     });
    const LotteryTokenContractAddress = receiptTxLotteryToken.contractAddress;
    console.log("LotteryToken contract deployed to:", LotteryTokenContractAddress); 

    const balanceInitial  = await publicClient.readContract({
        address: LotteryTokenContractAddress as Address,
        abi: abiLotteryToken,
        functionName: "balanceOf",
        args: [deployerPublicKey]
      });
    
    console.log(
        `Account ${      deployerPublicKey    } has ${formatEther(balanceInitial as bigint).toString()} units of LotteryToken`
    );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});