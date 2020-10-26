import { Network, NetworkIds, ProtocolMagics } from './types'

export const NETWORKS: {[key: string]: Network} = {
  MAINNET: {
    networkId: NetworkIds.MAINNET,
    protocolMagic: ProtocolMagics.MAINNET,
  },
  TESTNET: {
    networkId: NetworkIds.TESTNET,
    protocolMagic: ProtocolMagics.TESTNET,
  },
}

export const HARDENED_THRESHOLD = 0x80000000
