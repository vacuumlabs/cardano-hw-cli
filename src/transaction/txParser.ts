import * as Cardano from '@emurgo/cardano-serialization-lib-nodejs'
import { isArrayOfType } from '../guards'
import { Errors } from '../errors'
import {
  isDelegationCert,
  isUint64,
  isStakepoolRegistrationCert,
  isStakepoolRetirementCert,
  isStakingKeyDeregistrationCert,
  isTxInput,
  isTxMultiHostNameRelay,
  isTxOutput,
  isTxSingleHostIPRelay,
  isTxSingleHostNameRelay,
  isTxStakingKeyRegistrationCert,
  isWithdrawalsMap,
  isUnsignedTxDecoded,
  isInt64,
} from './guards'
import {
  _Input,
  _Output,
  _DelegationCert,
  _StakingKeyRegistrationCert,
  _StakingKeyDeregistrationCert,
  _StakepoolRegistrationCert,
  _StakepoolRetirementCert,
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
  Lovelace,
  _MultiAsset,
  _Asset,
  UnsignedTxCborHex,
  _Mint,
  StakeCredentialsKeys,
  StakeCredentials,
} from './types'
import { decodeCbor, encodeCbor } from '../util'
import { getAddressType, rewardAddressToPubKeyHash } from '../crypto-providers/util'
import { AddressType } from '../types'

const { blake2b } = require('cardano-crypto.js')

const parseTxInputs = (
  txInputs: any[],
): _Input[] => {
  if (!isArrayOfType<TxInput>(txInputs, isTxInput)) {
    throw Error(Errors.TxInputParseError)
  }
  return txInputs.map(([txHash, outputIndex]): _Input => ({ txHash, outputIndex }))
}

const parseAssets = (assets: any, isMint:Boolean): _Asset[] => {
  if (!(assets instanceof Map)) {
    throw Error(Errors.TxAssetParseError)
  }
  return Array.from(assets).map(([assetName, amount]) => {
    if (!Buffer.isBuffer(assetName)) {
      throw Error(Errors.AssetNameParseError)
    }
    if (isUint64(amount)) {
      return { assetName, amount: BigInt(amount) }
    }
    if (isInt64(amount)) {
      if (!isMint) {
        throw Error(Errors.AssetAmountParseError)
      }
      return { assetName, amount: BigInt(amount) }
    }
    throw Error(Errors.AssetAmountParseError)
  })
}

const parseMultiAsset = (multiAsset: any, isMint: Boolean): _MultiAsset[] => {
  if (!(multiAsset instanceof Map)) {
    throw Error(Errors.TxMultiAssetParseError)
  }
  return Array.from(multiAsset).map(([policyId, assets]) => {
    if (!Buffer.isBuffer(policyId)) {
      throw Error(Errors.PolicyIdParseError)
    }
    return { policyId, assets: parseAssets(assets, isMint) }
  })
}

const parseTxOutputs = (txOutputs: any[]): _Output[] => {
  if (!isArrayOfType<TxOutput>(txOutputs, isTxOutput)) {
    throw Error(Errors.TxOutputParseArrayError)
  }

  const parseAmount = (amount: any): { coins: BigInt, tokenBundle: _MultiAsset[] } => {
    if (isUint64(amount)) {
      return { coins: BigInt(amount), tokenBundle: [] }
    }
    const [coins, multiAsset] = amount
    if (!isUint64(coins)) {
      throw Error(Errors.TxOutputParseCoinError)
    }
    return { coins: BigInt(coins), tokenBundle: parseMultiAsset(multiAsset, false) }
  }

  return txOutputs.map(([address, amount]): _Output => ({ address, ...parseAmount(amount) }))
}

const parseRelay = (poolRelay: any): _PoolRelay => {
  const parseSingleHostIPRelay = (relay : any): _SingleHostIPRelay => {
    if (!isTxSingleHostIPRelay(relay)) {
      throw Error(Errors.TxSingleHostIPRelayParseError)
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
      throw Error(Errors.TxSingleHostNameRelayParseError)
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
      throw Error(Errors.TxMultiHostNameRelayParseError)
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
      throw Error(Errors.UnsupportedRelayTypeError)
  }
}

const parseTxCerts = (txCertificates: any[]): _Certificate[] => {
  const parseStakeCredentials = (stakeCredentials: any): StakeCredentials => {
    if (Array.isArray(stakeCredentials) && stakeCredentials.length === 2) {
      if (stakeCredentials[0] === StakeCredentialsKeys.ADDR_KEY_HASH) {
        return {
          type: StakeCredentialsKeys.ADDR_KEY_HASH,
          addrKeyHash: stakeCredentials[1],
        }
      }
      if (stakeCredentials[0] === StakeCredentialsKeys.SCRIPT_HASH) {
        return {
          type: StakeCredentialsKeys.SCRIPT_HASH,
          scriptHash: stakeCredentials[1],
        }
      }
    } else if (Buffer.isBuffer(stakeCredentials)) {
      return {
        type: StakeCredentialsKeys.ADDR_KEY_HASH,
        addrKeyHash: stakeCredentials,
      }
    }
    throw Error(Errors.StakeCredentialsParseError)
  }

  const stakeKeyRegistrationCertParser = (
    txCertificate: any,
  ): _StakingKeyRegistrationCert => {
    if (!isTxStakingKeyRegistrationCert(txCertificate)) {
      throw Error(Errors.TxStakingKeyRegistrationCertParseError)
    }
    const [type, stakeCredentials] = txCertificate
    return ({ type, stakeCredentials: parseStakeCredentials(stakeCredentials) })
  }

  const stakeKeyDeregistrationCertParser = (
    txCertificate: any,
  ): _StakingKeyDeregistrationCert => {
    if (!isStakingKeyDeregistrationCert(txCertificate)) {
      throw Error(Errors.TxStakingKeyDeregistrationCertParseError)
    }
    const [type, stakeCredentials] = txCertificate
    return ({ type, stakeCredentials: parseStakeCredentials(stakeCredentials) })
  }

  const delegationCertParser = (
    txCertificate: any,
  ): _DelegationCert => {
    if (!isDelegationCert(txCertificate)) {
      throw Error(Errors.TxDelegationCertParseError)
    }
    const [type, stakeCredentials, poolHash] = txCertificate
    return ({ type, stakeCredentials: parseStakeCredentials(stakeCredentials), poolHash })
  }

  const stakepoolRegistrationCertParser = (
    txCertificate: any,
  ): _StakepoolRegistrationCert => {
    if (!isStakepoolRegistrationCert(txCertificate)) {
      throw Error(Errors.TxStakepoolRegistrationCertParseError)
    }
    const [
      type,
      poolKeyHash,
      vrfPubKeyHash,
      pledge,
      cost,
      { value },
      rewardAccount,
      poolOwnersPubKeyHashes,
      relays,
      metadata,
    ] = txCertificate
    return ({
      type,
      poolKeyHash,
      vrfPubKeyHash,
      pledge: BigInt(pledge),
      cost: BigInt(cost),
      margin: { numerator: value[0], denominator: value[1] }, // tagged
      rewardAccount,
      poolOwnersPubKeyHashes,
      relays: relays.map(parseRelay),
      metadata: metadata
        ? { metadataUrl: metadata[0], metadataHash: metadata[1] }
        : null,
    })
  }

  const stakepoolRetirementCertParser = (
    txCertificate: any,
  ): _StakepoolRetirementCert => {
    if (!isStakepoolRetirementCert(txCertificate)) {
      throw Error(Errors.TxStakepoolRetirementCertParseError)
    }
    const [type, poolKeyHash, retirementEpoch] = txCertificate
    return ({
      type,
      poolKeyHash,
      retirementEpoch: BigInt(retirementEpoch),
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
      case TxCertificateKeys.STAKEPOOL_RETIREMENT:
        return stakepoolRetirementCertParser(cert)
      default:
        throw Error(Errors.UnsupportedCertificateTypeError)
    }
  }

  return txCertificates.map(
    (certificate) => parseTxCert(certificate),
  )
}

const parseTxWithdrawalRewardAccount = (addressBuffer: Buffer): StakeCredentials => {
  const address = Cardano.Address.from_bytes(addressBuffer)
  const type = getAddressType(address)
  switch (type) {
    case (AddressType.REWARD_KEY): {
      return {
        type: StakeCredentialsKeys.ADDR_KEY_HASH,
        addrKeyHash: rewardAddressToPubKeyHash(addressBuffer),
      }
    }
    case (AddressType.REWARD_SCRIPT): {
      return {
        type: StakeCredentialsKeys.SCRIPT_HASH,
        scriptHash: rewardAddressToPubKeyHash(addressBuffer),
      }
    }
    default:
      throw Error(Errors.WithrawalsParseError)
  }
}

const parseTxWithdrawals = (withdrawals: any): _Withdrawal[] => {
  if (!isWithdrawalsMap(withdrawals)) {
    throw Error(Errors.WithrawalsParseError)
  }
  return Array.from(withdrawals).map(([rewardAccount, coins]): _Withdrawal => ({
    stakeCredential: parseTxWithdrawalRewardAccount(rewardAccount),
    coins: BigInt(coins),
  }))
}

const parseFee = (fee: any): Lovelace => {
  if (!isUint64(fee)) {
    throw Error(Errors.FeeParseError)
  }
  return BigInt(fee)
}

const parseTtl = (ttl: any): BigInt | null => {
  if (ttl != null && !isUint64(ttl)) {
    throw Error(Errors.TTLParseError)
  }
  return ttl != null ? BigInt(ttl) : null
}

const parseValidityIntervalStart = (validityIntervalStart: any): BigInt | null => {
  if (validityIntervalStart != null && !isUint64(validityIntervalStart)) {
    throw Error(Errors.ValidityIntervalStartParseError)
  }
  return validityIntervalStart != null ? BigInt(validityIntervalStart) : null
}

const parseMetaDataHash = (metaDataHash: any): Buffer | null => {
  if (metaDataHash != null && !Buffer.isBuffer(metaDataHash)) {
    throw Error(Errors.MetaDataHashParseError)
  }
  return metaDataHash || null
}

const parseTxMint = (mint: any): _Mint => parseMultiAsset(mint, true)

const deconstructUnsignedTxDecoded = (unsignedTxDecoded: any): _UnsignedTxDecoded => {
  if (unsignedTxDecoded.length === 2) {
    const [txBody, meta] = unsignedTxDecoded
    return { txBody, meta, scriptWitnesses: [] }
  }
  if (unsignedTxDecoded.length === 3) {
    const [txBody, scriptWitnesses, meta] = unsignedTxDecoded
    return { txBody, scriptWitnesses, meta }
  }
  throw Error(Errors.FailedToParseTransaction)
}

const parseUnsignedTx = (unsignedTxCborHex: UnsignedTxCborHex): _UnsignedTxParsed => {
  const originalTxDecoded = decodeCbor(unsignedTxCborHex)
  const unsignedTxDecoded = deconstructUnsignedTxDecoded(originalTxDecoded)
  if (!isUnsignedTxDecoded(unsignedTxDecoded)) {
    throw Error(Errors.InvalidTransactionBody)
  } else {
    const { txBody, scriptWitnesses, meta } = unsignedTxDecoded
    const inputs = parseTxInputs(txBody.get(TxBodyKeys.INPUTS))
    const outputs = parseTxOutputs(txBody.get(TxBodyKeys.OUTPUTS))
    const fee = parseFee(txBody.get(TxBodyKeys.FEE))
    const ttl = parseTtl(txBody.get(TxBodyKeys.TTL))
    const certificates = parseTxCerts(
      txBody.get(TxBodyKeys.CERTIFICATES) || [],
    )
    const withdrawals = parseTxWithdrawals(
      txBody.get(TxBodyKeys.WITHDRAWALS) || new Map(),
    )
    const metaDataHash = parseMetaDataHash(txBody.get(TxBodyKeys.META_DATA_HASH))
    const validityIntervalStart = parseValidityIntervalStart(txBody.get(TxBodyKeys.VALIDITY_INTERVAL_START))
    const mint = parseTxMint(txBody.get(TxBodyKeys.MINT) || new Map())

    const getId = (): string => {
      const encodedTxBody = encodeCbor(txBody)
      return blake2b(
        encodedTxBody,
        32,
      ).toString('hex')
    }

    return {
      getId,
      originalTxDecoded,
      unsignedTxDecoded,
      inputs,
      outputs,
      fee,
      ttl,
      certificates,
      withdrawals,
      metaDataHash,
      meta,
      validityIntervalStart,
      mint,
      scriptWitnesses,
    }
  }
}

export {
  parseUnsignedTx,
}
