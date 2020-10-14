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

export type TrezorWithdrawal = {
  path: string | BIP32Path
  amount: string
}

export type TrezorPoolOwner = {
  stakingKeyPath?: string | number[];
  stakingKeyHash?: string;
}

export type TrezorPoolRelay = {
  type: number;
  ipv4Address?: string;
  ipv6Address?: string;
  port?: number;
  hostName: string;
}

export type TrezorPoolMetadata = {
  url: string;
  hash: string;
}

export type TrezorPoolParameters = {
  vrfKeyHash: string;
  pledge: string;
  cost: string;
  marginNumerator: string;
  marginDenominator: string;
  rewardAccountKeyHash: string;
  owners: TrezorPoolOwner[];
  relays: TrezorPoolRelay[];
  metadata: TrezorPoolMetadata;
}

export type TrezorCertificate = {
  type: number
  path?: string | number[]
  pool?: string
  poolParameters?: TrezorPoolParameters
}
