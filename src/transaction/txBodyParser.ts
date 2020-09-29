import {
  txInput,
  txOutput,
  txDelegationCert,
  txStakingKeyRegistrationCert,
  txStakepoolRegistrationCert,
  txWithdrawal,
} from './types'

function parseTxInputs(txInputs: any[]) {
  return txInputs.map(([txHash, outputIndex]):txInput => (
    { txHash, outputIndex }
  ))
}

function parseTxOutputs(txOutputs: any[]) {
  return txOutputs.map(([address, coins]): txOutput => (
    { address, coins }
  ))
}

function parseTxCerts(txCertificates: any[] = []) {
  const stakingKeyRegistrationCerts: txStakingKeyRegistrationCert[] = []
  const delegationCerts: txDelegationCert[] = []
  const stakepoolRegistrationCerts: txStakepoolRegistrationCert[] = []

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

  txCertificates.forEach((certificate) => {
    const type:number = certificate[0]
    certificateParsers[type](certificate)
  })
  return {
    stakingKeyRegistrationCerts,
    delegationCerts,
    stakepoolRegistrationCerts,
  }
}

function parseTxWithdrawals(withdrawals: Map<any, any> = new Map()) {
  return Array.from(withdrawals).map(([address, coins]): txWithdrawal => (
    { address, coins }
  ))
}

export default function parseTxBody(txBody: Map<number, any>) {
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
  }
}
