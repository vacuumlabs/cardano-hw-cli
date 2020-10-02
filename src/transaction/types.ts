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

export type TxByronWitness = [
  Buffer,
  Buffer,
  Buffer,
  Buffer,
]

export type TxShelleyWitness = [
  Buffer,
  Buffer,
]

export type SignedTxDecoded = [
  Map<number, any>,
  Map<number, Array<TxByronWitness | TxShelleyWitness>>,
  Buffer | null,
]

export type UnsignedTxDecoded = [
  Map<number, any>,
  Buffer | null,
]
