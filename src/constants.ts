import { Network } from './types'

export const NETWORKS: {[key: string]: Network} = {
  MAINNET: {
    name: 'mainnet',
    networkId: 1,
    protocolMagic: 764824073,
  },
  TESTNET: {
    name: 'testnet',
    networkId: 0,
    protocolMagic: 42,
  },
}

export const HARDENED_THRESHOLD = 0x80000000
