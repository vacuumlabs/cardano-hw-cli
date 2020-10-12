import { BIP32Path } from '../types'

export type TrezorCertificatePointer = {
  blockIndex: number
  txIndex: number
  certificateIndex: number
}

export type TrezorInput = {
  path: string | BIP32Path
  // eslint-disable-next-line camelcase
  prev_hash: string
  // eslint-disable-next-line camelcase
  prev_index: number
}

type TrezorAddressParameters = {
  addressType: number
  path: string | BIP32Path
  stakingPath?: string | BIP32Path
  stakingKeyHash?: string
  certificatePointer?: TrezorCertificatePointer
}

export type TrezorOutput =
  | {
    addressParameters: TrezorAddressParameters
    amount: string
  }
  | {
    address: string
    amount: string
  }
export type TrezorCertificate = {
  type: number
  path: string | BIP32Path
  pool?: string
}

export type TrezorWithdrawal = {
  path: string | BIP32Path
  amount: string
}
