export const PoolAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_token',
        type: 'address',
        internalType: 'contract L2NativeSuperchainERC20',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'CALLBACK_SUCCESS',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'CROSS_DOMAIN_MESSENGER',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract L2ToL2CrossDomainMessenger',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'SUPERCHAIN_TOKEN_BRIDGE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract SuperchainTokenBridge',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      {
        name: '_amount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'depositsOf',
    inputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'flashFee',
    inputs: [
      {
        name: '_amount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'flashLoan',
    inputs: [
      {
        name: '_borrower',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_chainId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '_messageId',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: '_success',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'maxFlashLoan',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'token',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract L2NativeSuperchainERC20',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      {
        name: '_amount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'error',
    name: 'Pool_CallbackFailed',
    inputs: [],
  },
] as const