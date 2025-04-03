// CheckLottery.ts

import { createPublicClient, http } from 'viem'
import { holesky } from 'viem/chains'
import lotteryArtifact from '../artifacts/contracts/Lottery.sol/Lottery.json'
import * as dotenv from 'dotenv'

dotenv.config()

const abi = lotteryArtifact.abi;

const provider = createPublicClient({
  chain: holesky,
  transport: http(`https://eth-holesky.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`),
})

const lotteryAddress = process.env.LOTTERY_ADDRESS || '' // Remplace par ton adresse exacte

async function main() {
  try {
    const name = await provider.readContract({
      address: lotteryAddress as `0x${string}`,
      abi,
      functionName: 'getTokenName',
    })
    const symbol = await provider.readContract({
      address: lotteryAddress as `0x${string}`,
      abi,
      functionName: 'getTokenSymbol',
    })
    const purchaseRatio = await provider.readContract({
      address: lotteryAddress as `0x${string}`,
      abi,
      functionName: 'purchaseRatio',
    })
    const betPrice = await provider.readContract({
      address: lotteryAddress as `0x${string}`,
      abi,
      functionName: 'betPrice',
    })
    const betFee = await provider.readContract({
      address: lotteryAddress as `0x${string}`,
      abi,
      functionName: 'betFee',
    })

    console.log(`✅ Token Name: ${name}`)
    console.log(`✅ Symbol: ${symbol}`)
    console.log(`🎟️ Purchase Ratio: ${purchaseRatio}`)
    console.log(`🎯 Bet Price (wei): ${betPrice}`)
    console.log(`💰 Bet Fee (wei): ${betFee}`)
  } catch (err) {
    console.error('❌ Error reading contract:', err)
  }
}

main()
