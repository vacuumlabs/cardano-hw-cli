import { BIP32Path } from '../types'
import { DeviceVersion } from './types'

export type LedgerInput = {
  path?: BIP32Path,
  txHashHex: string,
  outputIndex: number,
}

export type LedgerOutput = {
  amountStr: string
  addressHex: string
} | {
  addressTypeNibble: number
  spendingPath: BIP32Path,
  amountStr: string
  stakingPath?: BIP32Path,
  stakingKeyHashHex?: string
}

export type LedgerWitness = {
  path: BIP32Path
  signature: Buffer
}

export type LedgerWithdrawal = {
  path: string | BIP32Path
  amountStr: string
}

export type LedgerPoolOwnerParams = {
  stakingPath?: BIP32Path,
  stakingKeyHashHex?: string
}

export type LedgerSingleHostIPRelay = {
  portNumber?: number,
  ipv4?: string | null,
  ipv6?: string | null,
}

export type LedgerSingleHostNameRelay = {
  portNumber?: number,
  dnsName: string
}

export type LedgerMultiHostNameRelay = {
  dnsName: string
}

export type LedgerRelayParams = {
  type: number, // single host ip = 0, single hostname = 1, multi host name = 2
  params: LedgerSingleHostIPRelay | LedgerSingleHostNameRelay | LedgerMultiHostNameRelay
}

export type LedgerPoolMetadataParams = null | {
  metadataUrl: string,
  metadataHashHex: string
}

export type LedgerMargin = {
  numeratorStr: string,
  denominatorStr: string,
}

export type LedgerPoolParams = {
  poolKeyHashHex: string,
  vrfKeyHashHex: string,
  pledgeStr: string,
  costStr: string,
  margin: LedgerMargin,
  rewardAccountHex: string,
  poolOwners: Array<LedgerPoolOwnerParams>,
  relays: Array<LedgerRelayParams>,
  metadata: LedgerPoolMetadataParams
}

export type LedgerCertificate = {
  type: number,
  path?: BIP32Path,
  poolKeyHashHex?: string,
  poolRegistrationParams?: LedgerPoolParams,
}

export const enum LedgerCryptoProviderFeature {
  BULK_EXPORT,
  MULTI_ASSET,
  VALIDITY_INTERVAL_START,
}

export type LedgerVersionThresholdMap = { [key in LedgerCryptoProviderFeature]: DeviceVersion }
