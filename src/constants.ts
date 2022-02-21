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
  TESTNET_LEGACY: {
    networkId: NetworkIds.TESTNET,
    protocolMagic: ProtocolMagics.TESTNET_LEGACY,
  },
}

export const HARDENED_THRESHOLD = 0x80000000

export enum PathLabel {
  PAYMENT = 'Payment',
  STAKE = 'Stake',
  POOL_COLD = 'StakePool',
}
