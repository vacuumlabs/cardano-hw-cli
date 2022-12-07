import {
  CardanoEra, Network, NetworkIds, ProtocolMagics,
} from './types'
import { invertObject } from './util'

export const NETWORKS: {[key: string]: Network} = {
  MAINNET: {
    networkId: NetworkIds.MAINNET,
    protocolMagic: ProtocolMagics.MAINNET,
  },
  TESTNET: {
    networkId: NetworkIds.TESTNET,
    protocolMagic: ProtocolMagics.TESTNET,
  },
  TESTNET_LEGACY: { // we keep this because some test CBORs contain this network
    networkId: NetworkIds.TESTNET,
    protocolMagic: ProtocolMagics.TESTNET_LEGACY,
  },
}

export const HARDENED_THRESHOLD = 0x80000000

// the 'Catalyst' value for voting_purpose in https://cips.cardano.org/cips/cip36/
export const GOVERNANCE_VOTING_PURPOSE_CATALYST = 0

export enum PathLabel {
  PAYMENT = 'Payment',
  STAKE = 'Stake',
  POOL_COLD = 'StakePool',
  GOVERNANCE_VOTING = 'GovernanceVoting',
}

// Unwitnessed, Witnessed and Signed types follow the same CDDL format, they are just used
// in different contexts

export const cardanoEraToUnwitnessedType: {[key in CardanoEra]: string} = {
  [CardanoEra.BYRON]: 'Unwitnessed Tx ByronEra',
  [CardanoEra.SHELLEY]: 'Unwitnessed Tx ShelleyEra',
  [CardanoEra.ALLEGRA]: 'Unwitnessed Tx AllegraEra',
  [CardanoEra.MARY]: 'Unwitnessed Tx MaryEra',
  [CardanoEra.ALONZO]: 'Unwitnessed Tx AlonzoEra',
  [CardanoEra.BABBAGE]: 'Unwitnessed Tx BabbageEra',
}

export const cardanoEraToWitnessedType: {[key in CardanoEra]: string} = {
  [CardanoEra.BYRON]: 'Witnessed Tx ByronEra',
  [CardanoEra.SHELLEY]: 'Witnessed Tx ShelleyEra',
  [CardanoEra.ALLEGRA]: 'Witnessed Tx AllegraEra',
  [CardanoEra.MARY]: 'Witnessed Tx MaryEra',
  [CardanoEra.ALONZO]: 'Witnessed Tx AlonzoEra',
  [CardanoEra.BABBAGE]: 'Witnessed Tx BabbageEra',
}

export const cardanoEraToSignedType: {[key in CardanoEra]: string} = {
  [CardanoEra.BYRON]: 'TxSignedByron',
  [CardanoEra.SHELLEY]: 'TxSignedShelley',
  [CardanoEra.ALLEGRA]: 'Tx AllegraEra',
  [CardanoEra.MARY]: 'Tx MaryEra',
  [CardanoEra.ALONZO]: 'Tx AlonzoEra',
  [CardanoEra.BABBAGE]: 'Tx BabbageEra',
}

export const txTypeToCardanoEra: {[key: string]: string} = {
  ...invertObject(cardanoEraToUnwitnessedType),
  ...invertObject(cardanoEraToWitnessedType),
  ...invertObject(cardanoEraToSignedType),
}

export const cardanoEraToWitnessType: {[key in CardanoEra]: string} = {
  [CardanoEra.BYRON]: 'TxWitnessByron',
  [CardanoEra.SHELLEY]: 'TxWitnessShelley',
  [CardanoEra.ALLEGRA]: 'TxWitness AllegraEra',
  [CardanoEra.MARY]: 'TxWitness MaryEra',
  [CardanoEra.ALONZO]: 'TxWitness AlonzoEra',
  [CardanoEra.BABBAGE]: 'TxWitness BabbageEra',
}

export const txEnvelopeTypes: string[] = Object.keys(txTypeToCardanoEra)
