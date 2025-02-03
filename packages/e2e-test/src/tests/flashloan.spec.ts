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

describe('flash loan between L2s', async () => {
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
          address: testAccount.address,
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
          args: [parseUnits('1000', decimals)],
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
      const amountToLoan = parseUnits('2000', decimals)
      const chainId = await destinationClient.getChainId()

      // Initiate flashloan of 1000 tokens
      const hash = await sourceClient.writeContract({
        account: minterAccount,
        address: envVars.VITE_POOL_ADDRESS,
        abi: PoolAbi,
        functionName: 'flashLoan',
        args: [envVars.VITE_FLASH_BORROWER, amountToLoan, BigInt(chainId)],
      })

      const receipt = await sourceClient.waitForTransactionReceipt({ hash })

      // Extract the cross-chain message from the flashloan transaction
      const { sentMessages } = await createInteropSentL2ToL2Messages(
        // @ts-expect-error
        sourceClient,
        { receipt },
      )
      expect(sentMessages).toHaveLength(1)

      // Relay the message on the destination chain
      let relayMessageTxHash = await destinationClient.relayL2ToL2Message({
        account: testAccount,
        sentMessageId: sentMessages[0].id,
        sentMessagePayload: sentMessages[0].payload,
      })

      let relayMessageReceipt = await destinationClient.waitForTransactionReceipt({
        hash: relayMessageTxHash,
      })

      // Verify the message was successfully processed
      const { successfulMessages: firstSuccessfulMessages } = decodeRelayedL2ToL2Messages({
        receipt: relayMessageReceipt,
      })
      expect(firstSuccessfulMessages).length(1)

      const { sentMessages: relaySentMessages } = await createInteropSentL2ToL2Messages(
        // @ts-expect-error
        destinationClient,
        { receipt: relayMessageReceipt },
      )

      expect(relaySentMessages).toHaveLength(2)

      // Relay the message on the destination chain
      relayMessageTxHash = await sourceClient.relayL2ToL2Message({
        account: testAccount,
        sentMessageId: relaySentMessages[0].id,
        sentMessagePayload: relaySentMessages[0].payload,
      })

      relayMessageReceipt = await sourceClient.waitForTransactionReceipt({
        hash: relayMessageTxHash,
      })

      // Verify the message was successfully processed
      const { successfulMessages: secondSuccessfulMessages } = decodeRelayedL2ToL2Messages({
        receipt: relayMessageReceipt,
      })
      expect(secondSuccessfulMessages).length(1)

      // Relay the message on the destination chain
      relayMessageTxHash = await sourceClient.relayL2ToL2Message({
        account: testAccount,
        sentMessageId: relaySentMessages[1].id,
        sentMessagePayload: relaySentMessages[1].payload,
      })

      relayMessageReceipt = await sourceClient.waitForTransactionReceipt({
        hash: relayMessageTxHash,
      })

      // Verify the message was successfully processed
      const { successfulMessages: thirdSuccessfulMessages } = decodeRelayedL2ToL2Messages({
        receipt: relayMessageReceipt,
      })
      expect(thirdSuccessfulMessages).length(1)

      const sourceBalance = await sourceClient.readContract({
        ...l2NativeSuperchainERC20Contract,
        functionName: 'balanceOf',
        args: [envVars.VITE_POOL_ADDRESS],
      })

      expect(sourceBalance).toEqual(amountToLoan)
    },
  )
})
