import { parseEther, parseUnits } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import { testClientByChain, testClients } from '@/utils/clients'
import { envVars } from '@/envVars'
import { L2NativeSuperchainERC20Abi } from '@/abi/L2NativeSuperchainERC20Abi'
import { PoolAbi } from '@/abi/PoolAbi'
import {
  generatePrivateKey,
  privateKeyToAccount,
  toAccount,
} from 'viem/accounts'
import {
  createInteropSentL2ToL2Messages,
  decodeRelayedL2ToL2Messages,
} from '@eth-optimism/viem'

const testPrivateKey = generatePrivateKey()
const testAccount = privateKeyToAccount(testPrivateKey)

// Private key-less account - used with impersonation
const minterAccount = toAccount(envVars.VITE_TOKEN_MINTER_ADDRESS)

const l2NativeSuperchainERC20Contract = {
  address: envVars.VITE_TOKEN_CONTRACT_ADDRESS,
  abi: L2NativeSuperchainERC20Abi,
} as const

describe('bridge token from L2 to L2', async () => {
  const decimals = await testClientByChain.supersimL2A.readContract({
    ...l2NativeSuperchainERC20Contract,
    functionName: 'decimals',
  })

  beforeAll(async () => {
    // Deal 1000 ETH to the test account on each chain
    await Promise.all(
      testClients.map((client) =>
        client.setBalance({
          address: testAccount.address,
          value: parseEther('1000'),
        }),
      ),
    )
  })

  beforeAll(async () => {
    // Impersonate the minter account, mint 1000 tokens to the test account and deposit on pool
    await Promise.all(
      testClients.map(async (client) => {
        await client.impersonateAccount({
          address: envVars.VITE_TOKEN_MINTER_ADDRESS,
        })
        let hash = await client.writeContract({
          account: minterAccount,
          address: envVars.VITE_TOKEN_CONTRACT_ADDRESS,
          abi: L2NativeSuperchainERC20Abi,
          functionName: 'mintTo',
          args: [testAccount.address, parseUnits('1000', decimals)],
        })
        await client.waitForTransactionReceipt({ hash })
        
        await client.impersonateAccount({
            address: testAccount.address
        })
        hash = await client.writeContract({
            account: testAccount,
            address: envVars.VITE_TOKEN_CONTRACT_ADDRESS,
            abi: L2NativeSuperchainERC20Abi,
            functionName: 'approve',
            args: [envVars.VITE_POOL_ADDRESS, parseUnits('1000', decimals)],
        })
        await client.waitForTransactionReceipt({ hash })
        
        hash = await client.writeContract({
            account: testAccount,
            address: envVars.VITE_POOL_ADDRESS,
            abi: PoolAbi,
            functionName: 'deposit',
            args: [parseUnits('1000', decimals)]
        })
        await client.waitForTransactionReceipt({ hash })
      }),
    )
  })

  it.for([
    {
      source: testClientByChain.supersimL2A,
      destination: testClientByChain.supersimL2B,
    },
    {
      source: testClientByChain.supersimL2B,
      destination: testClientByChain.supersimL2A,
    },
  ] as const)(
    'should loan tokens from $destination.chain.id to $source.chain.id',
    async ({ source: sourceClient, destination: destinationClient }) => {
      const startingSourceBalance = await sourceClient.readContract({
        ...l2NativeSuperchainERC20Contract,
        functionName: 'balanceOf',
        args: [envVars.VITE_POOL_ADDRESS],
      })

      const amountToLoan = parseUnits('1000', decimals)

      // Initiate flashloan of 1000 tokens
      let hash = await sourceClient.writeContract({
        account: minterAccount,
        address: envVars.VITE_POOL_ADDRESS,
        abi: PoolAbi,
        functionName: 'flashLoan',
        args: [envVars.VITE_FLASH_BORROWER, amountToLoan],
      })
      await sourceClient.waitForTransactionReceipt({ hash })

      const endingBalance = await sourceClient.readContract({
        ...l2NativeSuperchainERC20Contract,
        functionName: 'balanceOf',
        args: [envVars.VITE_POOL_ADDRESS],
      })

      expect(endingBalance).toEqual(startingSourceBalance)
    },
  )
})
