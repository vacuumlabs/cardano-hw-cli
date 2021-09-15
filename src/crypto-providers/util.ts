import * as Cardano from '@emurgo/cardano-serialization-lib-nodejs'
import { HARDENED_THRESHOLD } from '../constants'
import { Errors } from '../errors'
import { isBIP32Path, isPubKeyHex } from '../guards'
import {
  StakeCredentialType,
  TxCertificateKeys,
  VotingRegistrationAuxiliaryData,
  VotingRegistrationMetaData,
  _Certificate,
  _DelegationCert,
  _StakingKeyDeregistrationCert,
  _StakingKeyRegistrationCert,
  _UnsignedTxParsed,
  _XPubKey,
} from '../transaction/types'
import {
  Address,
  AddressType,
  BIP32Path,
  HexString,
  HwSigningData,
  HwSigningType,
  Network,
  NetworkIds,
  ProtocolMagics,
  PubKeyHex,
  VotePublicKeyHex,
  XPubKeyCborHex,
} from '../types'
import { decodeCbor, encodeCbor } from '../util'
import {
  DeviceVersion,
  _AddressParameters,
} from './types'

const cardano = require('cardano-crypto.js')
const {
  AddressTypes,
  base58,
  bech32,
  blake2b,
} = require('cardano-crypto.js')

enum PathTypes {
  // hd wallet account
  PATH_WALLET_ACCOUNT,

  // hd wallet address
  PATH_WALLET_SPENDING_KEY_BYRON,
  PATH_WALLET_SPENDING_KEY_SHELLEY,

  // hd wallet reward adress, withdrawal witness, pool owner
  PATH_WALLET_STAKING_KEY,

  // pool cold key in pool registrations and retirements
  PATH_POOL_COLD_KEY,

  // hd wallet multisig account
  PATH_WALLET_ACCOUNT_MULTISIG,

  // hd wallet multisig spending key
  PATH_WALLET_SPENDING_KEY_MULTISIG,

  // hd wallet multisig staking key
  PATH_WALLET_STAKING_KEY_MULTISIG,

  // key used for token miting
  PATH_WALLET_MINTING_KEY,

  // not one of the above
  PATH_INVALID,
}

const classifyPath = (path:number[]) => {
  const HD = HARDENED_THRESHOLD

  if (path.length < 3) return PathTypes.PATH_INVALID
  if (path[1] !== 1815 + HD) return PathTypes.PATH_INVALID

  switch (path[0]) {
    case 44 + HD:
      if (path.length === 3) return PathTypes.PATH_WALLET_ACCOUNT
      if (path.length !== 5) return PathTypes.PATH_INVALID
      if (path[3] === 0 || path[3] === 1) return PathTypes.PATH_WALLET_SPENDING_KEY_BYRON
      break
    case 1852 + HD:
      if (path.length === 3) return PathTypes.PATH_WALLET_ACCOUNT
      if (path.length !== 5) return PathTypes.PATH_INVALID
      if (path[3] === 0 || path[3] === 1) return PathTypes.PATH_WALLET_SPENDING_KEY_SHELLEY
      if (path[3] === 2 && path[4] === 0) return PathTypes.PATH_WALLET_STAKING_KEY
      break
    case 1853 + HD:
      if (path.length === 4 && path[2] === 0 + HD && path[3] >= HD) return PathTypes.PATH_POOL_COLD_KEY
      break
    case 1854 + HD:
      if (path.length === 3) return PathTypes.PATH_WALLET_ACCOUNT_MULTISIG
      if (path.length !== 5) return PathTypes.PATH_INVALID
      if (path[3] === 0) return PathTypes.PATH_WALLET_SPENDING_KEY_MULTISIG
      if (path[3] === 2) return PathTypes.PATH_WALLET_STAKING_KEY_MULTISIG
      break
    case 1855 + HD:
      if (path.length === 3 && path[2] >= 0 + HD) return PathTypes.PATH_WALLET_MINTING_KEY
      break
    default:
      break
  }

  return PathTypes.PATH_INVALID
}

const splitXPubKeyCborHex = (xPubKeyCborHex: XPubKeyCborHex): _XPubKey => {
  const xPubKeyDecoded = decodeCbor(xPubKeyCborHex)
  const pubKey = xPubKeyDecoded.slice(0, 32)
  const chainCode = xPubKeyDecoded.slice(32, 64)
  return { pubKey, chainCode }
}

const getAddressType = (address: Uint8Array): AddressType => {
  // eslint-disable-next-line no-bitwise
  const type = address[0] >> 4
  if (!(type in AddressType)) {
    throw Error(Errors.InvalidAddressError)
  }
  return type
}

const encodeAddress = (address: Buffer): string => {
  const addressType = getAddressType(address)
  if (addressType === AddressType.BYRON) {
    return base58.encode(address)
  }
  const addressPrefixes: Omit<Record<AddressType, string>, AddressType.BYRON> = {
    [AddressType.BASE_PAYMENT_KEY_STAKE_KEY]: 'addr',
    [AddressType.BASE_PAYMENT_SCRIPT_STAKE_KEY]: 'addr',
    [AddressType.BASE_PAYMENT_KEY_STAKE_SCRIPT]: 'addr',
    [AddressType.BASE_PAYMENT_SCRIPT_STAKE_SCRIPT]: 'addr',
    [AddressType.POINTER_KEY]: 'addr',
    [AddressType.POINTER_SCRIPT]: 'addr',
    [AddressType.ENTERPRISE_KEY]: 'addr',
    [AddressType.ENTERPRISE_SCRIPT]: 'addr',
    [AddressType.REWARD_KEY]: 'stake',
    [AddressType.REWARD_SCRIPT]: 'stake',
  }
  const isTestnet = cardano.getShelleyAddressNetworkId(address) === NetworkIds.TESTNET
  const addressPrefix = `${addressPrefixes[addressType]}${isTestnet ? '_test' : ''}`
  return bech32.encode(addressPrefix, address)
}

const getSigningPath = (
  signingFiles: HwSigningData[], i: number,
): BIP32Path | null => {
  if (!signingFiles.length) return null
  // in case signingFiles.length < input.length
  // we return the first path since all we need is to pass all the paths
  // disregarding their order
  return signingFiles[i] ? signingFiles[i].path : signingFiles[0].path
}

const filterSigningFiles = (
  signingFiles: HwSigningData[],
): {
    paymentSigningFiles: HwSigningData[],
    stakeSigningFiles: HwSigningData[],
    poolColdSigningFiles: HwSigningData[],
    mintSigningFiles: HwSigningData[],
    multisigSigningFiles: HwSigningData[],
} => {
  const paymentSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === HwSigningType.Payment,
  )
  const stakeSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === HwSigningType.Stake,
  )
  const poolColdSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === HwSigningType.PoolCold,
  )
  const mintSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === HwSigningType.Mint,
  )
  const multisigSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === HwSigningType.MultiSig,
  )
  return {
    paymentSigningFiles,
    stakeSigningFiles,
    poolColdSigningFiles,
    mintSigningFiles,
    multisigSigningFiles,
  }
}

const hwSigningFileToPubKeyHash = (signingFile: HwSigningData): Uint8Array => (
  Cardano.PublicKey.from_bytes(
    splitXPubKeyCborHex(signingFile.cborXPubKeyHex).pubKey,
  ).hash().to_bytes()
)

const findPathForKeyHash = (
  pubKeyHash: Buffer,
  signingFiles: HwSigningData[],
): BIP32Path | undefined => {
  const signingFile = signingFiles.find((file) => pubKeyHash.equals(hwSigningFileToPubKeyHash(file)))
  return signingFile?.path
}

// TOOD rename arguemnt, what about buffer length?
const findSigningPathForKeyHash = (
  certPubKeyHash: Buffer, signingFiles: HwSigningData[],
): BIP32Path | undefined => {
  const signingFile = signingFiles.find((file) => {
    const { pubKey } = splitXPubKeyCborHex(file.cborXPubKeyHex)
    const pubKeyHash = cardano.getPubKeyBlake2b224Hash(pubKey)
    return !Buffer.compare(pubKeyHash, certPubKeyHash)
  })
  return signingFile?.path
}

// TOOD rename arguemnt, what about buffer length?
const findSigningPathForKey = (
  key: Buffer, signingFiles: HwSigningData[],
): BIP32Path | undefined => {
  const signingFile = signingFiles.find((file) => {
    const { pubKey } = splitXPubKeyCborHex(file.cborXPubKeyHex)
    return !Buffer.compare(pubKey, key)
  })
  return signingFile?.path
}

const extractStakePubKeyFromHwSigningData = (signingFile: HwSigningData): PubKeyHex => {
  const cborStakeXPubKeyHex = signingFile.cborXPubKeyHex
  const stakePubHex = splitXPubKeyCborHex(cborStakeXPubKeyHex).pubKey.toString('hex')
  if (isPubKeyHex(stakePubHex)) return stakePubHex
  throw Error(Errors.InternalInvalidTypeError)
}

const txHasStakePoolRegistrationCert = (
  certs: _Certificate[],
): boolean => certs.some(
  ({ type }) => type === TxCertificateKeys.STAKEPOOL_REGISTRATION,
)

// validates if the given signing files correspond to the tx body
// TODO not entirely, e.g. we don't count unique witnesses, and don't verify there is an input included
const validateTxWithoutPoolRegistration = (
  unsignedTxParsed: _UnsignedTxParsed, signingFiles: HwSigningData[],
): void => {
  const {
    paymentSigningFiles, stakeSigningFiles, poolColdSigningFiles,
  } = filterSigningFiles(signingFiles)

  if (paymentSigningFiles.length === 0) {
    throw Error(Errors.MissingPaymentSigningFileError)
  }

  let numStakeWitnesses = unsignedTxParsed.withdrawals.length
  let numPoolColdWitnesses = 0
  unsignedTxParsed.certificates.forEach((cert) => {
    switch (cert.type) {
      case TxCertificateKeys.STAKING_KEY_REGISTRATION:
      case TxCertificateKeys.STAKING_KEY_DEREGISTRATION:
      case TxCertificateKeys.DELEGATION:
        numStakeWitnesses += 1
        break

      case TxCertificateKeys.STAKEPOOL_RETIREMENT:
        numPoolColdWitnesses += 1
        break

      default:
        break
    }
  })

  if (numStakeWitnesses > 0 && (stakeSigningFiles.length === 0)) {
    throw Error(Errors.MissingStakeSigningFileError)
  }
  if (stakeSigningFiles.length > numStakeWitnesses) {
    throw Error(Errors.TooManyStakeSigningFilesError)
  }

  if (numPoolColdWitnesses > 0 && (poolColdSigningFiles.length === 0)) {
    throw Error(Errors.MissingPoolColdSigningFileError)
  }
  if (poolColdSigningFiles.length > numPoolColdWitnesses) {
    throw Error(Errors.TooManyPoolColdSigningFilesError)
  }
}

// validates if the given signing files correspond to the tx body
const validateTxWithPoolRegistration = (
  unsignedTxParsed: _UnsignedTxParsed, signingFiles: HwSigningData[],
): void => {
  const {
    paymentSigningFiles, stakeSigningFiles, poolColdSigningFiles,
  } = filterSigningFiles(signingFiles)

  // TODO needs revisiting, including the error messages
  if (!unsignedTxParsed.inputs.length) {
    throw Error(Errors.MissingInputError)
  }
  if (unsignedTxParsed.certificates.length !== 1) {
    throw Error(Errors.MultipleCertificatesWithPoolRegError)
  }
  if (unsignedTxParsed.withdrawals.length) {
    throw Error(Errors.WithdrawalIncludedWithPoolRegError)
  }

  if (poolColdSigningFiles.length > 1) {
    throw Error(Errors.TooManyPoolColdSigningFilesError)
  }

  const isOperator = (poolColdSigningFiles.length > 0)

  if (isOperator) {
    // pool operator
    if (stakeSigningFiles.length > 0) {
      throw Error(Errors.TooManyStakeSigningFilesError)
    }
  } else {
    // pool owner
    if (paymentSigningFiles.length > 0) {
      throw Error(Errors.TooManyPaymentFilesWithPoolRegError)
    }
    if (stakeSigningFiles.length === 0) {
      throw Error(Errors.MissingStakeSigningFileError)
    }
    if (stakeSigningFiles.length > 1) {
      throw Error(Errors.TooManyStakeSigningFilesError)
    }
  }
}

const hasMultisigSigningFile = (signingFiles: HwSigningData[]): boolean => (
  signingFiles.some((signingFile) => signingFile.type === HwSigningType.MultiSig)
)

const isMultisigTransaction = (signingFiles: HwSigningData[]): boolean => (
  // We classify tx as multisig if it contains a multisig signing file
  hasMultisigSigningFile(signingFiles)
)

const certificatesWithStakeCredentials = (certificates: _Certificate[]) => (
  certificates.filter((cert) => cert.type in [
    TxCertificateKeys.DELEGATION,
    TxCertificateKeys.STAKING_KEY_REGISTRATION,
    TxCertificateKeys.STAKING_KEY_DEREGISTRATION,
  ]) as (
    _DelegationCert |
    _StakingKeyRegistrationCert |
    _StakingKeyDeregistrationCert
  )[]
)

const validateOrdinaryTx = (unsignedTxParsed: _UnsignedTxParsed, signingFiles: HwSigningData[]) => {
  // We require ordinary transactions to use certificates and withdrawals
  // only with AddrKeyHash stake credentials
  if (
    !certificatesWithStakeCredentials(unsignedTxParsed.certificates).every(
      (cert) => cert.stakeCredential.type === StakeCredentialType.ADDR_KEY_HASH,
    )
    || !unsignedTxParsed.withdrawals.every(
      (withdrawal) => withdrawal.stakeCredential.type === StakeCredentialType.ADDR_KEY_HASH,
    )
  ) {
    throw Error(Errors.ScriptStakeCredentialInOrdinaryTx)
  }
  if (hasMultisigSigningFile(signingFiles)) {
    throw Error(Errors.MixedOrdinaryAndMultisigSigningFiles)
  }
}

const validateMultisigTx = (unsignedTxParsed: _UnsignedTxParsed) => {
  // We require multisig transactions to use certificates and withdrawals
  // only with ScriptHash stake credentials
  if (
    !certificatesWithStakeCredentials(unsignedTxParsed.certificates).every(
      (cert) => cert.stakeCredential.type === StakeCredentialType.SCRIPT_HASH,
    )
    || !unsignedTxParsed.withdrawals.every(
      (withdrawal) => withdrawal.stakeCredential.type === StakeCredentialType.SCRIPT_HASH,
    )
  ) {
    throw Error(Errors.NonScriptStakeCredentialInMultisigTx)
  }
}

const validateWitnessing = (
  unsignedTxParsed: _UnsignedTxParsed, signingFiles: HwSigningData[],
): void => {
  if (isMultisigTransaction(signingFiles)) {
    validateMultisigTx(unsignedTxParsed)
    return
  }
  validateOrdinaryTx(unsignedTxParsed, signingFiles)
  if (txHasStakePoolRegistrationCert(unsignedTxParsed.certificates)) {
    validateTxWithPoolRegistration(unsignedTxParsed, signingFiles)
  } else {
    validateTxWithoutPoolRegistration(unsignedTxParsed, signingFiles)
  }
}

const validateSigning = (
  unsignedTxParsed: _UnsignedTxParsed, signingFiles: HwSigningData[],
): void => {
  if (isMultisigTransaction(signingFiles)) {
    validateMultisigTx(unsignedTxParsed)
    return
  }
  validateOrdinaryTx(unsignedTxParsed, signingFiles)
  if (txHasStakePoolRegistrationCert(unsignedTxParsed.certificates)) {
    throw Error(Errors.CantSignTxWithPoolRegError)
  }

  validateTxWithoutPoolRegistration(unsignedTxParsed, signingFiles)
}

const validateKeyGenInputs = (
  paths: BIP32Path[],
  hwSigningFiles: string[],
  verificationKeyFiles: string[],
): void => {
  if (
    !Array.isArray(paths)
    || !paths.every(isBIP32Path)
    || !Array.isArray(hwSigningFiles)
    || !Array.isArray(verificationKeyFiles)
    || paths.length < 1
    || paths.length !== hwSigningFiles.length
    || paths.length !== verificationKeyFiles.length
  ) throw Error(Errors.InvalidKeyGenInputsError)
}

const _packBootstrapAddress = (
  paymentSigningFile: HwSigningData, network: Network,
): _AddressParameters => {
  const { pubKey, chainCode } = splitXPubKeyCborHex(paymentSigningFile.cborXPubKeyHex)
  const xPubKey = Buffer.concat([pubKey, chainCode])
  const address: Buffer = cardano.packBootstrapAddress(
    paymentSigningFile.path,
    xPubKey,
    undefined, // passphrase is undefined for derivation scheme v2
    2, // derivation scheme is always 2 for hw wallets
    network.protocolMagic,
  )
  return {
    address,
    addressType: getAddressType(address),
    paymentPath: paymentSigningFile.path,
  }
}

const _packBaseAddress = (
  paymentSigningFile: HwSigningData, stakeSigningFile: HwSigningData, network: Network,
): _AddressParameters => {
  const { pubKey: stakePubKey } = splitXPubKeyCborHex(stakeSigningFile.cborXPubKeyHex)
  const { pubKey: paymentPubKey } = splitXPubKeyCborHex(paymentSigningFile.cborXPubKeyHex)
  const address: Buffer = cardano.packBaseAddress(
    cardano.getPubKeyBlake2b224Hash(paymentPubKey),
    cardano.getPubKeyBlake2b224Hash(stakePubKey),
    network.networkId,
  )
  return {
    address,
    addressType: getAddressType(address),
    paymentPath: paymentSigningFile.path,
    stakePath: stakeSigningFile.path,
  }
}

const _packEnterpriseAddress = (
  paymentSigningFile: HwSigningData, network: Network,
): _AddressParameters => {
  const { pubKey: paymentPubKey } = splitXPubKeyCborHex(paymentSigningFile.cborXPubKeyHex)
  const address: Buffer = cardano.packEnterpriseAddress(
    cardano.getPubKeyBlake2b224Hash(paymentPubKey),
    network.networkId,
  )
  return {
    address,
    addressType: getAddressType(address),
    paymentPath: paymentSigningFile.path,
  }
}

const _packRewardAddress = (
  stakeSigningFile: HwSigningData, network: Network,
): _AddressParameters => {
  const { pubKey: stakePubKey } = splitXPubKeyCborHex(stakeSigningFile.cborXPubKeyHex)
  const address: Buffer = cardano.packRewardAddress(
    cardano.getPubKeyBlake2b224Hash(stakePubKey),
    network.networkId,
  )
  return {
    address,
    addressType: getAddressType(address),
    stakePath: stakeSigningFile.path,
  }
}

const getAddressParameters = (
  hwSigningData: HwSigningData[],
  address: Buffer,
  network: Network,
): _AddressParameters | null => {
  if (hwSigningData == null || hwSigningData.length === 0) return null
  const { paymentSigningFiles, stakeSigningFiles } = filterSigningFiles(hwSigningData)
  const addressType = getAddressType(address)
  const findMatchingAddress = (packedAddresses: (_AddressParameters | null)[]) => (
    (packedAddresses.filter((packedAddress) => packedAddress) as _AddressParameters[]).find(
      (packedAddress) => address.equals(packedAddress.address),
    ) || null
  )

  try {
    switch (addressType) {
      case AddressType.BYRON:
        return findMatchingAddress(
          paymentSigningFiles.map((paymentSigningFile) => _packBootstrapAddress(paymentSigningFile, network)),
        )

      case AddressType.BASE_PAYMENT_KEY_STAKE_KEY:
      case AddressType.BASE_PAYMENT_SCRIPT_STAKE_KEY:
        return findMatchingAddress(
          paymentSigningFiles.flatMap((paymentSigningFile) => (
            stakeSigningFiles.map((stakeSigningFile) => (
              _packBaseAddress(paymentSigningFile, stakeSigningFile, network)
            ))
          )),
        )

      case AddressType.ENTERPRISE_KEY:
        return findMatchingAddress(
          paymentSigningFiles.map((paymentSigningFile) => (
            _packEnterpriseAddress(paymentSigningFile, network)
          )),
        )

      case AddressType.REWARD_KEY:
        return findMatchingAddress(
          stakeSigningFiles.map((stakeSigningFile) => _packRewardAddress(stakeSigningFile, network)),
        )

        // TODO: Pointer address

      default: return null
    }
  } catch (e) {
    return null
  }
}

const getAddressAttributes = (addressStr: Address): {
  addressType: number,
  networkId: number,
  protocolMagic: number,
} => {
  let address: Cardano.ByronAddress | Cardano.Address
  try {
    // first check if the address can be decoded as a Byron address
    address = Cardano.ByronAddress.from_base58(addressStr)
  } catch (_e) {
    // if not try to work with it as a Shelley address
    address = Cardano.Address.from_bech32(addressStr)
  }

  if (address instanceof Cardano.ByronAddress) {
    return {
      addressType: AddressType.BYRON,
      networkId: address.network_id(),
      protocolMagic: address.byron_protocol_magic(),
    }
  } if (address instanceof Cardano.Address) {
    const protocolMagic = address.network_id() === NetworkIds.MAINNET
      ? ProtocolMagics.MAINNET
      : ProtocolMagics.TESTNET
    return {
      addressType: getAddressType(address.to_bytes()),
      networkId: address.network_id(),
      protocolMagic,
    }
  }
  throw Error(Errors.InvalidAddressError)
}

const ipv4ToString = (ipv4: Buffer | undefined): string | undefined => {
  if (!ipv4) return undefined
  return new Uint8Array(ipv4).join('.')
}
const ipv6ToString = (ipv6: Buffer | undefined): string | undefined => {
  if (!ipv6) return undefined
  // concats the little endians to Buffer and divides the hex string to foursomes
  const ipv6LE = Buffer.from(ipv6).swap32().toString('hex').match(/.{1,4}/g)
  return ipv6LE ? ipv6LE.join(':') : undefined
}

const rewardAddressToStakeCredential = (address: Buffer) => address.slice(1)

const isDeviceVersionGTE = (
  deviceVersion: DeviceVersion,
  thresholdVersion: DeviceVersion,
): boolean => deviceVersion.major > thresholdVersion.major
  || (
    deviceVersion.major === thresholdVersion.major
    && deviceVersion.minor > thresholdVersion.minor
  )
  || (
    deviceVersion.major === thresholdVersion.major
    && deviceVersion.minor === thresholdVersion.minor
    && deviceVersion.patch >= thresholdVersion.patch
  )

const formatVotingRegistrationMetaData = (
  votingPublicKey: Buffer,
  stakePub: Buffer,
  address: Buffer,
  nonce: BigInt,
  signature: Buffer,
): VotingRegistrationMetaData => (
  new Map<number, Map<number, Buffer | BigInt>>([
    [
      61284,
      new Map<number, Buffer | BigInt>([
        [1, votingPublicKey],
        [2, stakePub],
        [3, address],
        [4, nonce],
      ]),
    ],
    [
      61285,
      new Map<number, Buffer>([
        [1, signature],
      ]),
    ],
  ])
)

const encodeVotingRegistrationMetaData = (
  hwStakeSigningFile: HwSigningData,
  votePublicKeyHex: VotePublicKeyHex,
  address: Buffer,
  nonce: BigInt,
  auxiliaryDataHashHex: HexString,
  catalystRegistrationSignatureHex: HexString,
) => {
  const stakePubHex = extractStakePubKeyFromHwSigningData(hwStakeSigningFile)
  const votingRegistrationMetaData = formatVotingRegistrationMetaData(
    Buffer.from(votePublicKeyHex, 'hex'),
    Buffer.from(stakePubHex, 'hex'),
    address,
    nonce,
    Buffer.from(catalystRegistrationSignatureHex, 'hex'),
  )

  const auxiliaryData: VotingRegistrationAuxiliaryData = [votingRegistrationMetaData, []]
  const auxiliaryDataCbor = encodeCbor(auxiliaryData)

  if (blake2b(auxiliaryDataCbor, 32).toString('hex') !== auxiliaryDataHashHex) {
    throw Error(Errors.MetadataSerializationMismatchError)
  }

  return encodeCbor(votingRegistrationMetaData).toString('hex')
}

const areHwSigningDataNonByron = (hwSigningData: HwSigningData[]) => (
  hwSigningData
    .map((signingFile) => classifyPath(signingFile.path))
    .every((pathType) => pathType !== PathTypes.PATH_WALLET_SPENDING_KEY_BYRON)
)

const validateVotingRegistrationAddressType = (addressType: number) => {
  if (addressType !== AddressTypes.BASE && addressType !== AddressTypes.REWARD) {
    throw Error(Errors.InvalidVotingRegistrationAddressType)
  }
}

export {
  PathTypes,
  classifyPath,
  splitXPubKeyCborHex,
  validateSigning,
  validateWitnessing,
  validateKeyGenInputs,
  getSigningPath,
  filterSigningFiles,
  findPathForKeyHash,
  findSigningPathForKeyHash,
  findSigningPathForKey,
  extractStakePubKeyFromHwSigningData,
  encodeAddress,
  getAddressParameters,
  getAddressType,
  getAddressAttributes,
  ipv4ToString,
  ipv6ToString,
  rewardAddressToStakeCredential,
  isDeviceVersionGTE,
  formatVotingRegistrationMetaData,
  encodeVotingRegistrationMetaData,
  areHwSigningDataNonByron,
  validateVotingRegistrationAddressType,
  isMultisigTransaction,
}
