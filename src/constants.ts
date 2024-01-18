import {Network, NetworkIds, ProtocolMagics, CardanoEra} from './basicTypes'
import {invertObject} from './util'

// taken from https://book.world.dev.cardano.org/environments.html
export const NETWORKS: {[key: string]: Network} = {
  MAINNET: {
    networkId: NetworkIds.MAINNET,
    protocolMagic: ProtocolMagics.MAINNET,
  },
  TESTNET_PREVIEW: {
    networkId: NetworkIds.TESTNET,
    protocolMagic: ProtocolMagics.TESTNET_PREVIEW,
  },
  TESTNET_PREPROD: {
    networkId: NetworkIds.TESTNET,
    protocolMagic: ProtocolMagics.TESTNET_PREPROD,
  },
  // we keep these because some test CBORs contain them
  TESTNET_LEGACY1: {
    networkId: NetworkIds.TESTNET,
    protocolMagic: ProtocolMagics.TESTNET_LEGACY1,
  },
  TESTNET_LEGACY2: {
    networkId: NetworkIds.TESTNET,
    protocolMagic: ProtocolMagics.TESTNET_LEGACY2,
  },
}

export const HARDENED_THRESHOLD = 0x80000000

// the 'Catalyst' value for voting_purpose in https://cips.cardano.org/cips/cip36/
export const CIP36_VOTING_PURPOSE_CATALYST = 0n

export enum PathLabel {
  PAYMENT = 'Payment',
  STAKE = 'Stake',
  DREP = 'DRep',
  COMMITTEE_COLD = 'ConstitutionalCommitteeCold',
  COMMITTEE_HOT = 'ConstitutionalCommitteeHot',
  POOL_COLD = 'StakePool',
  CIP36_VOTE = 'CIP36Vote',
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
  [CardanoEra.CONWAY]: 'Unwitnessed Tx ConwayEra',
}

export const cardanoEraToWitnessedType: {[key in CardanoEra]: string} = {
  [CardanoEra.BYRON]: 'Witnessed Tx ByronEra',
  [CardanoEra.SHELLEY]: 'Witnessed Tx ShelleyEra',
  [CardanoEra.ALLEGRA]: 'Witnessed Tx AllegraEra',
  [CardanoEra.MARY]: 'Witnessed Tx MaryEra',
  [CardanoEra.ALONZO]: 'Witnessed Tx AlonzoEra',
  [CardanoEra.BABBAGE]: 'Witnessed Tx BabbageEra',
  [CardanoEra.CONWAY]: 'Witnessed Tx ConwayEra',
}

export const cardanoEraToSignedType: {[key in CardanoEra]: string} = {
  [CardanoEra.BYRON]: 'TxSignedByron',
  [CardanoEra.SHELLEY]: 'TxSignedShelley',
  [CardanoEra.ALLEGRA]: 'Tx AllegraEra',
  [CardanoEra.MARY]: 'Tx MaryEra',
  [CardanoEra.ALONZO]: 'Tx AlonzoEra',
  [CardanoEra.BABBAGE]: 'Tx BabbageEra',
  [CardanoEra.CONWAY]: 'Tx ConwayEra',
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
  [CardanoEra.CONWAY]: 'TxWitness ConwayEra',
}

export const txEnvelopeTypes: string[] = Object.keys(txTypeToCardanoEra)
