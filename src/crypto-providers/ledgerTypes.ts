import { BIP32Path } from '../types'

export type LedgerInput = {
  path?: BIP32Path,
  txHashHex: string,
  outputIndex: number,
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

export type LedgerPoolRewardAccount = {
  path?: BIP32Path,
  rewardAccountHex?: string,
}

export type LedgerPoolParams = {
  poolKeyHashHex: string,
  vrfKeyHashHex: string,
  pledgeStr: string,
  costStr: string,
  margin: LedgerMargin,
  rewardAccount: LedgerPoolRewardAccount,
  poolOwners: LedgerPoolOwnerParams[],
  relays: LedgerRelayParams[],
  metadata: LedgerPoolMetadataParams
}

export type LedgerPoolRetirementParams = {
  poolKeyPath: BIP32Path,
  retirementEpochStr: string,
}

export type LedgerCertificate = {
  type: number,
  path?: BIP32Path,
  poolKeyHashHex?: string,
  poolRegistrationParams?: LedgerPoolParams,
  poolRetirementParams?: LedgerPoolRetirementParams,
}

export const enum LedgerCryptoProviderFeature {
  BULK_EXPORT,
  MULTI_ASSET,
  OPTIONAL_TTL,
  POOL_REGISTRATION_OPERATOR,
  VALIDITY_INTERVAL_START,
}

export type LedgerStakingBlockchainPointer = {
  blockIndex: number,
  txIndex: number,
  certificateIndex: number
}

export type LedgerToken = {
  assetNameHex: string,
  amountStr: string
}

export type LedgerAssetGroup = {
  policyIdHex: string,
  tokens: LedgerToken[]
}

export type LedgerTxOutputTypeAddress = {
  amountStr: string,
  tokenBundle: LedgerAssetGroup[],
  addressHex: string
}

export type LedgerTxOutputTypeAddressParams = {
  amountStr: string,
  tokenBundle: LedgerAssetGroup[],
  addressTypeNibble: number,
  spendingPath: BIP32Path,
  stakingPath?: BIP32Path,
  stakingKeyHashHex?: string,
  stakingBlockchainPointer?: LedgerStakingBlockchainPointer,
}

export type LedgerOutput = LedgerTxOutputTypeAddress | LedgerTxOutputTypeAddressParams;
