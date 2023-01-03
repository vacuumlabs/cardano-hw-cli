import * as cardanoSerialization from '@emurgo/cardano-serialization-lib-nodejs'
import {
  RewardAccount,
  StakeCredential,
  StakeCredentialType,
  TransactionBody,
  encodeTxBody,
  CertificateType,
  PoolRegistrationCertificate,
  Certificate,
  StakeRegistrationCertificate,
  StakeDeregistrationCertificate,
  StakeDelegationCertificate,
  KeyHash,
  ScriptHash,
} from 'cardano-hw-interop-lib'
import { HARDENED_THRESHOLD } from '../constants'
import { Errors } from '../errors'
import { isBIP32Path, isPubKeyHex } from '../guards'
import {
  VotingRegistrationAuxiliaryData,
  VotingRegistrationMetaData,
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
  _AddressParameters,
  SigningMode,
} from './types'

const cardanoCrypto = require('cardano-crypto.js')
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

const classifyPath = (path: number[]): PathTypes => {
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

const pathEquals = (path1: BIP32Path, path2: BIP32Path) => (
  path1.length === path2.length && path1.every((element, i) => element === path2[i])
)

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
  const isTestnet = cardanoCrypto.getShelleyAddressNetworkId(address) === NetworkIds.TESTNET
  const addressPrefix = `${addressPrefixes[addressType]}${isTestnet ? '_test' : ''}`
  return bech32.encode(addressPrefix, address)
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

const hwSigningFileToPubKey = (signingFile: HwSigningData): Buffer => (
  splitXPubKeyCborHex(signingFile.cborXPubKeyHex).pubKey
)

const hwSigningFileToPubKeyHash = (signingFile: HwSigningData): Buffer => {
  const pubKey = hwSigningFileToPubKey(signingFile)
  return Buffer.from(cardanoSerialization.PublicKey.from_bytes(pubKey).hash().to_bytes())
}

const findSigningPathForKey = (
  keyHash: Buffer,
  signingFiles: HwSigningData[],
): BIP32Path | undefined => {
  const signingFile = signingFiles.find((file) => keyHash.equals(hwSigningFileToPubKey(file)))
  return signingFile?.path
}

const findSigningPathForKeyHash = (
  keyHash: Buffer,
  signingFiles: HwSigningData[],
): BIP32Path | undefined => {
  const signingFile = signingFiles.find((file) => keyHash.equals(hwSigningFileToPubKeyHash(file)))
  return signingFile?.path
}

const extractStakePubKeyFromHwSigningData = (signingFile: HwSigningData): PubKeyHex => {
  const cborStakeXPubKeyHex = signingFile.cborXPubKeyHex
  const stakePubHex = splitXPubKeyCborHex(cborStakeXPubKeyHex).pubKey.toString('hex')
  if (isPubKeyHex(stakePubHex)) return stakePubHex
  throw Error(Errors.InternalInvalidTypeError)
}

const hasPaymentSigningFile = (signingFiles: HwSigningData[]): boolean => (
  signingFiles.some((signingFile) => signingFile.type === HwSigningType.Payment)
)

const hasMultisigSigningFile = (signingFiles: HwSigningData[]): boolean => (
  signingFiles.some((signingFile) => signingFile.type === HwSigningType.MultiSig)
)

const certificatesWithStakeCredentials = (certificates: Certificate[]): (
    StakeRegistrationCertificate | StakeDeregistrationCertificate | StakeDelegationCertificate)[] => (
  certificates.filter((cert) => cert.type in [
    CertificateType.STAKE_REGISTRATION,
    CertificateType.STAKE_DEREGISTRATION,
    CertificateType.STAKE_DELEGATION,
  ]) as (StakeRegistrationCertificate | StakeDeregistrationCertificate | StakeDelegationCertificate)[]
)

const determineSigningMode = (
  txBody: TransactionBody,
  signingFiles: HwSigningData[],
): SigningMode => {
  const poolRegistrationCert = txBody.certificates?.find(
    (cert) => cert.type === CertificateType.POOL_REGISTRATION,
  ) as PoolRegistrationCertificate | undefined

  // If txBody contains pool registration certificate, we must use one of the POOL_REGISTRATION
  // signing modes. If the user provides e.g. multisig signing files at the same time (which
  // indicates that a mistake happened at some point), this attempt is refused by
  // signingValidation.ts.
  if (poolRegistrationCert) {
    const poolKeyPath = findSigningPathForKeyHash(poolRegistrationCert.poolParams.operator, signingFiles)
    const isPaying = hasPaymentSigningFile(signingFiles)
    return (poolKeyPath || isPaying)
      ? SigningMode.POOL_REGISTRATION_AS_OPERATOR
      : SigningMode.POOL_REGISTRATION_AS_OWNER
  }

  // Collaterals are allowed only in the PLUTUS signing mode. Note that we have to consider PLUTUS
  // signing mode before MULTISIG, because multisig signing files are allowed in PLUTUS signing
  // mode, too.
  if (txBody.collateralInputs) {
    return SigningMode.PLUTUS_TRANSACTION
  }

  // If we got here, the tx should be a valid ORDINARY or MULTISIG tx. We cannot distinguish these
  // two only by the txBody contents, so we need to make the decision based on signing files.
  return hasMultisigSigningFile(signingFiles)
    ? SigningMode.MULTISIG_TRANSACTION
    : SigningMode.ORDINARY_TRANSACTION
}
const validBIP32Paths = (paths: BIP32Path[]): boolean => Array.isArray(paths) && paths.every(isBIP32Path) && paths.length > 0

const validateKeyGenInputs = (
  paths: BIP32Path[],
  hwSigningFiles: string[],
  verificationKeyFiles: string[],
): void => {
  if (
    !validBIP32Paths
    || !Array.isArray(hwSigningFiles)
    || !Array.isArray(verificationKeyFiles)
    || paths.length !== hwSigningFiles.length
    || paths.length !== verificationKeyFiles.length
  ) throw Error(Errors.InvalidKeyGenInputsError)
}

const _packByronAddress = (
  paymentSigningFile: HwSigningData,
  network: Network,
): _AddressParameters => {
  const { pubKey, chainCode } = splitXPubKeyCborHex(paymentSigningFile.cborXPubKeyHex)
  const xPubKey = Buffer.concat([pubKey, chainCode])
  const address: Buffer = cardanoCrypto.packBootstrapAddress(
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
  paymentSigningFile: HwSigningData,
  stakeSigningFile: HwSigningData,
  network: Network,
): _AddressParameters => {
  const { pubKey: paymentPubKey } = splitXPubKeyCborHex(paymentSigningFile.cborXPubKeyHex)
  const { pubKey: stakePubKey } = splitXPubKeyCborHex(stakeSigningFile.cborXPubKeyHex)
  const address: Buffer = cardanoCrypto.packBaseAddress(
    cardanoCrypto.getPubKeyBlake2b224Hash(paymentPubKey),
    cardanoCrypto.getPubKeyBlake2b224Hash(stakePubKey),
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
  paymentSigningFile: HwSigningData,
  network: Network,
): _AddressParameters => {
  const { pubKey: paymentPubKey } = splitXPubKeyCborHex(paymentSigningFile.cborXPubKeyHex)
  const address: Buffer = cardanoCrypto.packEnterpriseAddress(
    cardanoCrypto.getPubKeyBlake2b224Hash(paymentPubKey),
    network.networkId,
  )
  return {
    address,
    addressType: getAddressType(address),
    paymentPath: paymentSigningFile.path,
  }
}

const _packRewardAddress = (
  stakeSigningFile: HwSigningData,
  network: Network,
): _AddressParameters => {
  const { pubKey: stakePubKey } = splitXPubKeyCborHex(stakeSigningFile.cborXPubKeyHex)
  const address: Buffer = cardanoCrypto.packRewardAddress(
    cardanoCrypto.getPubKeyBlake2b224Hash(stakePubKey),
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
  if (hwSigningData.length === 0) return null
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
          paymentSigningFiles.map((paymentSigningFile) => _packByronAddress(paymentSigningFile, network)),
        )

      case AddressType.BASE_PAYMENT_KEY_STAKE_KEY:
        return findMatchingAddress(
          paymentSigningFiles.flatMap((paymentSigningFile) => (
            stakeSigningFiles.map((stakeSigningFile) => (
              _packBaseAddress(paymentSigningFile, stakeSigningFile, network)
            ))
          )),
        )
        // Note: BASE addresses containing a script hash cannot be constructed from hwSigningData this way.
        // However, hw wallets will show them anyway, so let's just send them as address bytes.

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

const areAddressParamsAllowed = (signingMode: SigningMode) : boolean => (
  [SigningMode.ORDINARY_TRANSACTION, SigningMode.PLUTUS_TRANSACTION].includes(signingMode)
)

const getAddressAttributes = (addressStr: Address): {
  addressType: number,
  networkId: number,
  protocolMagic: number,
} => {
  let address: cardanoSerialization.ByronAddress | cardanoSerialization.Address
  try {
    // first check if the address can be decoded as a Byron address
    address = cardanoSerialization.ByronAddress.from_base58(addressStr)
  } catch (_e) {
    // if not try to work with it as a Shelley address
    address = cardanoSerialization.Address.from_bech32(addressStr)
  }

  if (address instanceof cardanoSerialization.ByronAddress) {
    return {
      addressType: AddressType.BYRON,
      networkId: address.network_id(),
      protocolMagic: address.byron_protocol_magic(),
    }
  } if (address instanceof cardanoSerialization.Address) {
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

const ipv4ToString = (ipv4: Buffer | null | undefined): string | undefined => {
  if (!ipv4) return undefined
  return new Uint8Array(ipv4).join('.')
}
const ipv6ToString = (ipv6: Buffer | null | undefined): string | undefined => {
  if (!ipv6) return undefined
  // concats the little endians to Buffer and divides the hex string to foursomes
  const ipv6LE = Buffer.from(ipv6).swap32().toString('hex').match(/.{1,4}/g)
  return ipv6LE ? ipv6LE.join(':') : undefined
}

const rewardAccountToStakeCredential = (address: RewardAccount): StakeCredential => {
  const type = getAddressType(address)
  switch (type) {
    case (AddressType.REWARD_KEY): {
      return {
        type: StakeCredentialType.KEY_HASH,
        hash: address.slice(1) as KeyHash,
      }
    }
    case (AddressType.REWARD_SCRIPT): {
      return {
        type: StakeCredentialType.SCRIPT_HASH,
        hash: address.slice(1) as ScriptHash,
      }
    }
    default:
      throw Error(Errors.InvalidAddressError)
  }
}

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

const areHwSigningDataNonByron = (hwSigningData: HwSigningData[]): boolean => (
  hwSigningData
    .map((signingFile) => classifyPath(signingFile.path))
    .every((pathType) => pathType !== PathTypes.PATH_WALLET_SPENDING_KEY_BYRON)
)

const validateVotingRegistrationAddressType = (addressType: number): void => {
  if (addressType !== AddressTypes.BASE && addressType !== AddressTypes.REWARD) {
    throw Error(Errors.InvalidVotingRegistrationAddressType)
  }
}

const getTxBodyHash = (txBody: TransactionBody): string => (
  blake2b(encodeTxBody(txBody), 32).toString('hex')
)

export {
  PathTypes,
  classifyPath,
  pathEquals,
  splitXPubKeyCborHex,
  validBIP32Paths,
  validateKeyGenInputs,
  filterSigningFiles,
  findSigningPathForKeyHash,
  findSigningPathForKey,
  extractStakePubKeyFromHwSigningData,
  encodeAddress,
  getAddressParameters,
  areAddressParamsAllowed,
  getAddressType,
  getAddressAttributes,
  ipv4ToString,
  ipv6ToString,
  rewardAccountToStakeCredential,
  formatVotingRegistrationMetaData,
  encodeVotingRegistrationMetaData,
  areHwSigningDataNonByron,
  validateVotingRegistrationAddressType,
  certificatesWithStakeCredentials,
  hasMultisigSigningFile,
  determineSigningMode,
  getTxBodyHash,
}
