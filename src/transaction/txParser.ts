import { isArrayOfType } from '../guards'
import NamedError from '../namedError'
import {
  isDelegationCert,
  isStakepoolRegistrationCert,
  isStakingKeyDeregistrationCert,
  isTxInput,
  isTxMultiHostNameRelay,
  isTxOutput,
  isTxSingleHostIPRelay,
  isTxSingleHostNameRelay,
  isTxStakingKeyRegistrationCert,
  isWithdrawalsMap,
} from './guards'
import {
  _Input,
  _Output,
  _DelegationCert,
  _StakingKeyRegistrationCert,
  _StakingKeyDeregistrationCert,
  _StakepoolRegistrationCert,
  _Withdrawal,
  _UnsignedTxDecoded,
  _UnsignedTxParsed,
  TxBodyKeys,
  TxCertificateKeys,
  _Certificate,
  TxRelayTypes,
  _PoolRelay,
  _SingleHostIPRelay,
  _SingleHostNameRelay,
  _MultiHostNameRelay,
  TxInput,
  TxOutput,
} from './types'

const parseTxInputs = (
  txInputs: any[],
): _Input[] => {
  if (!isArrayOfType<TxInput>(txInputs, isTxInput)) {
    throw NamedError('TxInputParseError')
  }
  return txInputs.map(([txHash, outputIndex]): _Input => ({ txHash, outputIndex }))
}

const parseTxOutputs = (
  txOutputs: any[],
): _Output[] => {
  if (!isArrayOfType<TxOutput>(txOutputs, isTxOutput)) {
    throw NamedError('TxOutputParseError')
  }
  return txOutputs.map(([address, coins]): _Output => ({ address, coins }))
}

const parseRelay = (poolRelay: any): _PoolRelay => {
  const parseSingleHostIPRelay = (relay : any): _SingleHostIPRelay => {
    if (!isTxSingleHostIPRelay(relay)) {
      throw NamedError('TxSingleHostIPRelayParseError')
    }
    const [type, portNumber, ipv4, ipv6] = relay
    return {
      type,
      portNumber,
      ipv4,
      ipv6,
    }
  }
  const parseSingleHostNameRelay = (relay : any): _SingleHostNameRelay => {
    if (!isTxSingleHostNameRelay(relay)) {
      throw NamedError('TxSingleHostNameRelayParseError')
    }
    const [type, portNumber, dnsName] = relay
    return {
      type,
      portNumber,
      dnsName,
    }
  }
  const parseMultiHostNameRelay = (relay : any): _MultiHostNameRelay => {
    if (!isTxMultiHostNameRelay(relay)) {
      throw NamedError('TxMultiHostNameRelayParseError')
    }
    const [type, dnsName] = relay
    return {
      type,
      dnsName,
    }
  }
  switch (poolRelay[0]) {
    case TxRelayTypes.SINGLE_HOST_IP:
      return parseSingleHostIPRelay(poolRelay)
    case TxRelayTypes.SINGLE_HOST_NAME:
      return parseSingleHostNameRelay(poolRelay)
    case TxRelayTypes.MULTI_HOST_NAME:
      return parseMultiHostNameRelay(poolRelay)
    default:
      throw NamedError('UnsupportedRelayTypeError')
  }
}

const parseTxCerts = (txCertificates: any[]): _Certificate[] => {
  const stakeKeyRegistrationCertParser = (
    txCertificate: any,
  ): _StakingKeyRegistrationCert => {
    if (!isTxStakingKeyRegistrationCert(txCertificate)) {
      throw NamedError('TxStakingKeyRegistrationCertParseError')
    }
    const [type, [, pubKeyHash]] = txCertificate
    return ({ type, pubKeyHash })
  }

  const stakeKeyDeregistrationCertParser = (
    txCertificate: any,
  ): _StakingKeyDeregistrationCert => {
    if (!isStakingKeyDeregistrationCert(txCertificate)) {
      throw NamedError('TxStakingKeyDeregistrationCertParseError')
    }
    const [type, [, pubKeyHash]] = txCertificate
    return ({ type, pubKeyHash })
  }

  const delegationCertParser = (
    txCertificate: any,
  ): _DelegationCert => {
    if (!isDelegationCert(txCertificate)) {
      throw NamedError('TxDelegationCertParseError')
    }
    const [type, [, pubKeyHash], poolHash] = txCertificate
    return ({ type, pubKeyHash, poolHash })
  }

  const stakepoolRegistrationCertParser = (
    txCertificate: any,
  ): _StakepoolRegistrationCert => {
    if (!isStakepoolRegistrationCert(txCertificate)) {
      throw NamedError('TxStakepoolRegistrationCertParseError')
    }
    const [
      type,
      poolKeyHash,
      vrfPubKeyHash,
      pledge,
      cost,
      { value },
      rewardAddress,
      poolOwnersPubKeyHashes,
      relays,
      [metadataUrl, metadataHash],
    ] = txCertificate
    return ({
      type,
      poolKeyHash,
      vrfPubKeyHash,
      pledge,
      cost,
      margin: { numerator: value[0], denominator: value[1] }, // tagged
      rewardAddress,
      poolOwnersPubKeyHashes,
      relays: relays.map(parseRelay),
      metadata: { metadataUrl, metadataHash },
    })
  }

  const parseTxCert = (cert: any) => {
    switch (cert[0]) {
      case TxCertificateKeys.STAKING_KEY_REGISTRATION:
        return stakeKeyRegistrationCertParser(cert)
      case TxCertificateKeys.STAKING_KEY_DEREGISTRATION:
        return stakeKeyDeregistrationCertParser(cert)
      case TxCertificateKeys.DELEGATION:
        return delegationCertParser(cert)
      case TxCertificateKeys.STAKEPOOL_REGISTRATION:
        return stakepoolRegistrationCertParser(cert)
      default:
        throw NamedError('UnsupportedCertificateTypeError')
    }
  }

  return txCertificates.map(
    (certificate) => parseTxCert(certificate),
  )
}

const parseTxWithdrawals = (
  withdrawals: Map<Buffer, number>,
): _Withdrawal[] => {
  if (!isWithdrawalsMap(withdrawals)) {
    throw NamedError('WithrawalsParseError')
  }
  return Array.from(withdrawals).map(([address, coins]): _Withdrawal => ({ address, coins }))
}

const parseUnsignedTx = ([txBody, meta]: _UnsignedTxDecoded): _UnsignedTxParsed => {
  const inputs = parseTxInputs(txBody.get(TxBodyKeys.INPUTS))
  const outputs = parseTxOutputs(txBody.get(TxBodyKeys.OUTPUTS))
  const fee = txBody.get(TxBodyKeys.FEE) as number
  const ttl = txBody.get(TxBodyKeys.TTL) as number
  const certificates = parseTxCerts(
    txBody.get(TxBodyKeys.CERTIFICATES) || [],
  )
  const withdrawals = parseTxWithdrawals(
    txBody.get(TxBodyKeys.WITHDRAWALS) || new Map(),
  )
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
