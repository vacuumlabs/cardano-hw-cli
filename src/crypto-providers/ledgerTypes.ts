import { BIP32Path } from '../types'

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

export type LedgerCertificate = {
  type: number
  path: BIP32Path,
  poolKeyHashHex?: string
}

export type LedgerWithdrawal = {
  path: string | BIP32Path
  amountStr: string
}
