export type txInput = {
  txHash: Buffer,
  outputIndex: number,
}

export type txOutput = {
  address: Buffer,
  coins: number,
}

export type txDelegationCert = {
  type: 2,
  pubKey: Buffer,
  poolHash: Buffer,
}

export type txStakingKeyRegistrationCert = {
  type: 0 | 1,
  pubKey: Buffer,
}

export type txStakepoolRegistrationCert = {
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

export type txCertificate =
  txDelegationCert | txStakingKeyRegistrationCert | txStakepoolRegistrationCert

export type txWithdrawal = {
  address: Buffer,
  coins: number,
}
