import { isArrayOfType } from '../guards'
import {
  TxInput,
  TxOutput,
  TxStakingKeyRegistrationCert,
  TxStakingKeyDeregistrationCert,
  TxDelegationCert,
  TxCertificateKeys,
  TxStakepoolRegistrationCert,
  TxStakepoolRetirementCert,
  TxMultiHostNameRelay,
  TxSingleHostIPRelay,
  TxSingleHostNameRelay,
  TxRelayTypes,
  TxWithdrawal,
  _UnsignedTxDecoded,
  TxBodyKeys,
} from './types'

export const isUint64 = (value: any): value is number => {
  if (typeof value === 'number' && value >= 0) return true
  try {
    BigInt(value)
    return value >= 0
  } catch (e) { return false }
}

export const isTxInput = (
  value: any,
): value is TxInput => {
  if (!Array.isArray(value) || value.length !== 2) return false
  const [txHash, outputIndex] = value
  return Buffer.isBuffer(txHash) && Number.isInteger(outputIndex)
}

export const isTxOutput = (
  value: any,
): value is TxOutput => {
  if (Array.isArray(value) && value.length === 2) {
    const [address, amount] = value
    const isMultiAsset = (outputAmount: any) => Array.isArray(outputAmount) && outputAmount.length === 2
    return Buffer.isBuffer(address) && (isUint64(amount) || isMultiAsset(amount))
  }
  return false
}

export const isWithdrawalsMap = (
  value: any,
): value is TxWithdrawal => value instanceof Map
  && Array.from(value.keys()).every((key) => Buffer.isBuffer(key))
  && Array.from(value.values()).every((mapValue) => isUint64(mapValue))

export const isTxStakingKeyRegistrationCert = (
  value: any,
): value is TxStakingKeyRegistrationCert => {
  if (!Array.isArray(value) || value.length !== 2) return false
  if (!Array.isArray(value[1]) || value[1].length !== 2) return false
  const [type, [, pubKeyHash]] = value
  return type === TxCertificateKeys.STAKING_KEY_REGISTRATION && Buffer.isBuffer(pubKeyHash)
}

export const isStakingKeyDeregistrationCert = (
  value: any,
): value is TxStakingKeyDeregistrationCert => {
  if (!Array.isArray(value) || value.length !== 2) return false
  if (!Array.isArray(value[1]) || value[1].length !== 2) return false
  const [type, [, pubKeyHash]] = value
  return type === TxCertificateKeys.STAKING_KEY_DEREGISTRATION && Buffer.isBuffer(pubKeyHash)
}

export const isDelegationCert = (
  value: any,
): value is TxDelegationCert => {
  if (!Array.isArray(value) || value.length !== 3) return false
  if (!Array.isArray(value[1]) || value[1].length !== 2) return false
  const [type, [, pubKeyHash], poolHash] = value
  return type === TxCertificateKeys.DELEGATION && Buffer.isBuffer(pubKeyHash) && Buffer.isBuffer(poolHash)
}

export const isTxSingleHostIPRelay = (
  value: any,
): value is TxSingleHostIPRelay => {
  if (!Array.isArray(value) || value.length !== 4) return false
  const [type, portNumber, ipv4, ipv6] = value
  return type === TxRelayTypes.SINGLE_HOST_IP
    && (portNumber === null || Number.isInteger(portNumber))
    && (ipv4 === null || Buffer.isBuffer(ipv4))
    && (ipv6 === null || Buffer.isBuffer(ipv6))
}

export const isTxSingleHostNameRelay = (
  value: any,
): value is TxSingleHostNameRelay => {
  if (!Array.isArray(value) || value.length !== 3) return false
  const [type, portNumber, dnsName] = value
  return type === TxRelayTypes.SINGLE_HOST_NAME && Number.isInteger(portNumber) && typeof dnsName === 'string'
}

export const isTxMultiHostNameRelay = (
  value: any,
): value is TxMultiHostNameRelay => {
  if (!Array.isArray(value) || value.length !== 2) return false
  const [type, dnsName] = value
  return type === TxRelayTypes.MULTI_HOST_NAME && typeof dnsName === 'string'
}

const isPoolMargin = (_value: any) => {
  if (typeof _value !== 'object') return false
  const { tag, value } = _value
  if (!Array.isArray(value)) return false
  const [numerator, denominator] = value
  return tag === 30
    && Number.isInteger(numerator)
    && Number.isInteger(denominator)
}

const isPoolMetaData = (value: any) => {
  if (value === null) return true
  if (!Array.isArray(value) || value.length !== 2) return false
  const [metadataUrl, metadataHash] = value
  return typeof metadataUrl === 'string' && Buffer.isBuffer(metadataHash)
}

export const isStakepoolRegistrationCert = (
  value: any,
): value is TxStakepoolRegistrationCert => {
  if (!Array.isArray(value) || value.length !== 10) return false
  const [
    type,
    poolKeyHash,
    vrfPubKeyHash,
    pledge,
    cost,
    margin,
    rewardAddress,
    poolOwnersPubKeyHashes,
    relays,
    metadata,
  ] = value
  return type === TxCertificateKeys.STAKEPOOL_REGISTRATION
    && Buffer.isBuffer(poolKeyHash)
    && Buffer.isBuffer(vrfPubKeyHash)
    && isUint64(pledge)
    && isUint64(cost)
    && isPoolMargin(margin)
    && Buffer.isBuffer(rewardAddress)
    && isArrayOfType<Buffer>(poolOwnersPubKeyHashes, Buffer.isBuffer)
    && Array.isArray(relays)
    && isPoolMetaData(metadata)
}

export const isStakepoolRetirementCert = (
  value: any,
): value is TxStakepoolRetirementCert => {
  if (!Array.isArray(value) || value.length !== 3) return false
  const [
    type,
    poolKeyHash,
    retirementEpoch,
  ] = value
  return type === TxCertificateKeys.STAKEPOOL_RETIREMENT
    && Buffer.isBuffer(poolKeyHash)
    // TODO not checked elsewhere; make 28 a named constant
    // and perhaps have a function for checking fixed-length buffer
    && poolKeyHash.length === 28
    && isUint64(retirementEpoch)
}

export const isUnsignedTxDecoded = (
  value: any,
): value is _UnsignedTxDecoded => {
  if (Array.isArray(value)) {
    const txBody = value[0]
    const validKeys = Object.values(TxBodyKeys).filter(Number.isInteger) as number[]
    const txBodyKeys: number[] = Array.from(txBody.keys())
    return txBodyKeys.every((key) => validKeys.includes(key))
  }
  return false
}
