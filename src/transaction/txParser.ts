import {
  Input,
  Output,
  DelegationCert,
  StakingKeyRegistrationCert,
  StakepoolRegistrationCert,
  Withdrawal,
  SignedTxDecoded,
  UnsignedTxDecoded,
  TxShelleyWitness,
  TxByronWitness,
} from './types'

function parseTxInputs(txInputs: any[]) {
  return txInputs.map(([txHash, outputIndex]):Input => (
    { txHash, outputIndex }
  ))
}

function parseTxOutputs(txOutputs: any[]) {
  return txOutputs.map(([address, coins]): Output => (
    { address, coins }
  ))
}

function parseTxCerts(txCertificates: any[] = []) {
  const stakingKeyRegistrationCerts: StakingKeyRegistrationCert[] = []
  const delegationCerts: DelegationCert[] = []
  const stakepoolRegistrationCerts: StakepoolRegistrationCert[] = []

  const stakeKeyRegistrationCertParser = (
    [type, [, pubKey]]: any,
  ) => stakingKeyRegistrationCerts.push({ type, pubKey })

  const delegationCertParser = (
    [type, [, pubKey], poolHash]: any,
  ) => delegationCerts.push({ type, pubKey, poolHash })

  const stakepoolRegistrationCertParser = (
    [
      type,
      poolPubKey,
      operatorPubKey,
      fixedCost,
      margin,
      tagged,
      rewardAddressBuff,
      ownerPubKeys,
      s1,
      s2,
    ]: any,
  ) => stakepoolRegistrationCerts.push(
    // TODO: check whether this is accurate and which of these we actually need
    {
      type,
      poolPubKey,
      operatorPubKey,
      fixedCost,
      margin,
      tagged,
      rewardAddressBuff,
      ownerPubKeys,
      s1,
      s2,
    },
  )

  type certificateParserType =
    typeof stakeKeyRegistrationCertParser |
    typeof delegationCertParser |
    typeof stakepoolRegistrationCertParser

  const certificateParsers:{[key: number]: certificateParserType} = {
    0: stakeKeyRegistrationCertParser,
    1: stakeKeyRegistrationCertParser,
    2: delegationCertParser,
    3: stakepoolRegistrationCertParser,
  }

  txCertificates.forEach((txCertificate) => {
    const type:number = txCertificate[0]
    certificateParsers[type](txCertificate)
  })
  return {
    stakingKeyRegistrationCerts,
    delegationCerts,
    stakepoolRegistrationCerts,
  }
}

function parseTxWithdrawals(withdrawals: Map<any, any> = new Map()) {
  return Array.from(withdrawals).map(([address, coins]): Withdrawal => (
    { address, coins }
  ))
}

function parseUnsignedTx([txBody, meta]: UnsignedTxDecoded) {
  const inputs = parseTxInputs(txBody.get(0))
  const outputs = parseTxOutputs(txBody.get(1))
  const fee = `${txBody.get(2)}`
  const ttl = `${txBody.get(3)}`
  const certificates = parseTxCerts(txBody.get(4))
  const withdrawals = parseTxWithdrawals(txBody.get(5))
  return {
    inputs,
    outputs,
    fee,
    ttl,
    certificates,
    withdrawals,
    meta,
  }
}

function parseTxWitnesses([, witnesses]:SignedTxDecoded) {
  return {
    shelleyWitnesses: witnesses.get(0) as TxShelleyWitness[],
    byronWitnesses: witnesses.get(2) as TxByronWitness[],
  }
}

export {
  parseUnsignedTx,
  parseTxWitnesses,
}
