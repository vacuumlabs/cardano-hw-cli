import { Network, NetworkIds } from './types'

export const NETWORKS: {[key: string]: Network} = {
  MAINNET: {
    name: 'mainnet',
    networkId: NetworkIds.MAINNET,
    protocolMagic: 764824073,
  },
  TESTNET: {
    name: 'testnet',
    networkId: NetworkIds.TESTNET,
    protocolMagic: 42,
  },
}

export const HARDENED_THRESHOLD = 0x80000000
