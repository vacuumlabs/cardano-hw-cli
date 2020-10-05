export const enum TxBodyKeys {
  INPUTS = 0,
  OUTPUTS = 1,
  FEE = 2,
  TTL = 3,
  CERTIFICATES = 4,
  WITHDRAWALS = 5,
}

export const enum TxWitnessKeys {
  SHELLEY = 0,
  BYRON = 2,
}

export type Input = {
  txHash: Buffer,
  outputIndex: number,
}

export type Output = {
  address: Buffer,
  coins: number,
}

export type DelegationCert = {
  type: 2,
  pubKey: Buffer,
  poolHash: Buffer,
}

export type StakingKeyRegistrationCert = {
  type: 0 | 1,
  pubKey: Buffer,
}

export type StakepoolRegistrationCert = {
  type: 3,
  poolPubKey: Buffer,
  operatorPubKey: Buffer,
  fixedCost: any,
  margin: any,
  tagged: any,
  rewardAddressBuff: Buffer,
  ownerPubKeys: Array<any>,
  s1: any,
  s2: any,
}

export type Withdrawal = {
  address: Buffer,
  coins: number,
}

export type ShelleyWitness = {
  pubKey: Buffer,
  signature: Buffer,
}

export type ByronWitness = {
  pubKey: Buffer,
  chainCode: Buffer,
  signature: Buffer,
}

export type InternalTxRepresentation = {
  inputs: Input[],
  outputs: Output[],
  fee: string,
  ttl: string,
  certificates: {
    stakingKeyRegistrationCerts: StakingKeyRegistrationCert[],
    delegationCerts: DelegationCert[],
    stakepoolRegistrationCerts: StakepoolRegistrationCert[],
  },
  withdrawals: Withdrawal[],
  meta: Buffer | null
}

export type TxWitnessByron = [
  Buffer,
  Buffer,
  Buffer,
  Buffer,
]

export type TxWitnessShelley = [
  Buffer,
  Buffer,
]

export type SignedTxDecoded = [
  Map<number, any>,
  Map<number, Array<TxWitnessByron | TxWitnessShelley>>,
  Buffer | null,
]

export type UnsignedTxDecoded = [
  Map<number, any>,
  Buffer | null,
]

export type SignedTxCborHex = string

export type UnsignedTxCborHex = string
