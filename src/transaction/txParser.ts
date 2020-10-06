import {
  Input,
  Output,
  DelegationCert,
  StakingKeyRegistrationCert,
  StakepoolRegistrationCert,
  Withdrawal,
  UnsignedTxDecoded,
  InternalTxRepresentation,
  TxBodyKeys,
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

  type CertificateParserType =
    typeof stakeKeyRegistrationCertParser |
    typeof delegationCertParser |
    typeof stakepoolRegistrationCertParser

  const certificateParsers:{[key: number]: CertificateParserType} = {
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

function parseUnsignedTx([txBody, meta]: UnsignedTxDecoded): InternalTxRepresentation {
  const inputs = parseTxInputs(txBody.get(TxBodyKeys.INPUTS))
  const outputs = parseTxOutputs(txBody.get(TxBodyKeys.OUTPUTS))
  const fee = `${txBody.get(TxBodyKeys.FEE)}`
  const ttl = `${txBody.get(TxBodyKeys.TTL)}`
  const certificates = parseTxCerts(txBody.get(TxBodyKeys.CERTIFICATES))
  const withdrawals = parseTxWithdrawals(txBody.get(TxBodyKeys.WITHDRAWALS))
  const metaDataHash = txBody.get(TxBodyKeys.META_DATA_HASH) as Buffer
  return {
    inputs,
    outputs,
    fee,
    ttl,
    certificates,
    withdrawals,
    metaDataHash,
    meta,
  }
}

export {
  parseUnsignedTx,
}
