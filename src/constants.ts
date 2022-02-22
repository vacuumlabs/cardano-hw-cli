import {
  CardanoEra, Network, NetworkIds, ProtocolMagics,
} from './types'

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

export const cardanoEraToRawType: {[key in CardanoEra]: string} = {
  [CardanoEra.BYRON]: 'TxUnsignedByron',
  [CardanoEra.SHELLEY]: 'TxUnsignedShelley',
  [CardanoEra.ALLEGRA]: 'TxBodyAllegra',
  [CardanoEra.MARY]: 'TxBodyMary',
  [CardanoEra.ALONZO]: 'TxBodyAlonzo',
}

export const cardanoEraToSignedType: {[key in CardanoEra]: string} = {
  [CardanoEra.BYRON]: 'TxSignedByron',
  [CardanoEra.SHELLEY]: 'TxSignedShelley',
  [CardanoEra.ALLEGRA]: 'Tx AllegraEra',
  [CardanoEra.MARY]: 'Tx MaryEra',
  [CardanoEra.ALONZO]: 'Tx AlonzoEra',
}

export const cardanoEraToWitnessType: {[key in CardanoEra]: string} = {
  [CardanoEra.BYRON]: 'TxWitnessByron',
  [CardanoEra.SHELLEY]: 'TxWitnessShelley',
  [CardanoEra.ALLEGRA]: 'TxWitness AllegraEra',
  [CardanoEra.MARY]: 'TxWitness MaryEra',
  [CardanoEra.ALONZO]: 'TxWitness AlonzoEra',
}
