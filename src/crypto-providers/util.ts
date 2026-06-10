import * as cardanoSerialization from '@emurgo/cardano-serialization-lib-nodejs'
import {
  RewardAccount,
  Credential,
  CredentialType,
  TransactionBody,
  encodeTxBody,
  CertificateType,
  Certificate,
  PoolRegistrationCertificate,
  KeyHash,
  ScriptHash,
  KEY_HASH_LENGTH,
  VoterType,
} from 'cardano-hw-interop-lib'
import {HARDENED_THRESHOLD} from '../constants'
import {Errors} from '../errors'
import {isBIP32Path, isPubKeyHex} from '../guards'
import {
  CIP36RegistrationAuxiliaryData,
  CIP36RegistrationMetaData,
  CIP36RegistrationMetaDataPayloadItem,
  _XPubKey,
} from '../transaction/txTypes'
import {
  HumanAddress,
  BIP32Path,
  HexString,
  PubKeyHex,
  XPubKeyCborHex,
  Network,
  NetworkIds,
  ProtocolMagics,
  AddressType,
  CVoteDelegation,
} from '../basicTypes'
import {decodeCbor, encodeCbor} from '../util'
import {SigningMode} from './cryptoProvider'
import {HwSigningData, HwSigningType} from '../command-parser/argTypes'

const cardanoCrypto = require('cardano-crypto.js')
const {
  BaseAddressTypes,
  AddressTypes,
  base58,
  bech32,
  blake2b,
  verify,
} = require('cardano-crypto.js')

export type _AddressParameters = {
  address: Buffer
  addressType: number
  paymentPath?: BIP32Path
  stakePath?: BIP32Path
}

enum PathTypes {
  // hd wallet account
  PATH_WALLET_ACCOUNT,

  // hd wallet address
  PATH_WALLET_SPENDING_KEY_BYRON,
  PATH_WALLET_SPENDING_KEY_SHELLEY,

  // hd wallet reward address, withdrawal witness, pool owner
  PATH_WALLET_STAKING_KEY,

  // DRep keys
  PATH_DREP_KEY,

  // constitutional committee keys
  PATH_COMMITTEE_COLD_KEY,
  PATH_COMMITTEE_HOT_KEY,

  // hd wallet multisig account
  PATH_WALLET_ACCOUNT_MULTISIG,

  // hd wallet multisig spending key
  PATH_WALLET_SPENDING_KEY_MULTISIG,

  // hd wallet multisig staking key
  PATH_WALLET_STAKING_KEY_MULTISIG,

  // key used for token minting
  PATH_WALLET_MINTING_KEY,

  // pool cold key in pool registrations and retirements
  PATH_POOL_COLD_KEY,

  // CIP-36 voting
  PATH_CVOTE_ACCOUNT,
  PATH_CVOTE_KEY,

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
      if (path[3] === 0 || path[3] === 1)
        return PathTypes.PATH_WALLET_SPENDING_KEY_BYRON
      break
    case 1852 + HD:
      if (path.length === 3) return PathTypes.PATH_WALLET_ACCOUNT
      if (path.length !== 5) return PathTypes.PATH_INVALID
      if (path[3] === 0 || path[3] === 1)
        return PathTypes.PATH_WALLET_SPENDING_KEY_SHELLEY
      if (path[3] === 2) return PathTypes.PATH_WALLET_STAKING_KEY
      if (path[3] === 3) return PathTypes.PATH_DREP_KEY
      if (path[3] === 4) return PathTypes.PATH_COMMITTEE_COLD_KEY
      if (path[3] === 5) return PathTypes.PATH_COMMITTEE_HOT_KEY
      break
    case 1853 + HD:
      if (path.length === 4 && path[2] === 0 + HD && path[3] >= HD)
        return PathTypes.PATH_POOL_COLD_KEY
      break
    case 1854 + HD:
      if (path.length === 3) return PathTypes.PATH_WALLET_ACCOUNT_MULTISIG
      if (path.length !== 5) return PathTypes.PATH_INVALID
      if (path[3] === 0) return PathTypes.PATH_WALLET_SPENDING_KEY_MULTISIG
      if (path[3] === 2) return PathTypes.PATH_WALLET_STAKING_KEY_MULTISIG
      break
    case 1855 + HD:
      if (path.length === 3 && path[2] >= 0 + HD)
        return PathTypes.PATH_WALLET_MINTING_KEY
      break
    case 1694 + HD:
      if (path.length === 3 && path[2] >= 0 + HD)
        return PathTypes.PATH_CVOTE_ACCOUNT
      if (path.length === 5 && path[2] >= 0 + HD && path[3] === 0)
        return PathTypes.PATH_CVOTE_KEY
      break
    default:
      break
  }

  return PathTypes.PATH_INVALID
}

const pathEquals = (path1: BIP32Path, path2: BIP32Path) =>
  path1.length === path2.length &&
  path1.every((element, i) => element === path2[i])

const splitXPubKeyCborHex = (xPubKeyCborHex: XPubKeyCborHex): _XPubKey => {
  const xPubKeyDecoded = decodeCbor(xPubKeyCborHex)
  // TODO some check if it can be sliced? and call subarray instead of slice?
  const pubKey = xPubKeyDecoded.slice(0, 32)
  const chainCode = xPubKeyDecoded.slice(32, 64)
  return {pubKey, chainCode}
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
  const addressPrefixes: Omit<
    Record<AddressType, string>,
    AddressType.BYRON
  > = {
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
  const isTestnet =
    cardanoCrypto.getShelleyAddressNetworkId(address) === NetworkIds.TESTNET
  const addressPrefix = `${addressPrefixes[addressType]}${
    isTestnet ? '_test' : ''
  }`
  return bech32.encode(addressPrefix, address)
}

const filterSigningFiles = (
  signingFiles: HwSigningData[],
): {
  paymentSigningFiles: HwSigningData[]
  stakeSigningFiles: HwSigningData[]
  dRepSigningFiles: HwSigningData[]
  committeeColdSigningFiles: HwSigningData[]
  committeeHotSigningFiles: HwSigningData[]
  poolColdSigningFiles: HwSigningData[]
  mintSigningFiles: HwSigningData[]
  multisigSigningFiles: HwSigningData[]
} => {
  const paymentSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === HwSigningType.Payment,
  )
  const stakeSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === HwSigningType.Stake,
  )
  const dRepSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === HwSigningType.DRep,
  )
  const committeeColdSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === HwSigningType.CommitteeCold,
  )
  const committeeHotSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === HwSigningType.CommitteeHot,
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
    dRepSigningFiles,
    committeeColdSigningFiles,
    committeeHotSigningFiles,
    poolColdSigningFiles,
    mintSigningFiles,
    multisigSigningFiles,
  }
}

const hwSigningFileToPubKey = (signingFile: HwSigningData): Buffer =>
  splitXPubKeyCborHex(signingFile.cborXPubKeyHex).pubKey

const hwSigningFileToPubKeyHash = (signingFile: HwSigningData): Buffer => {
  const pubKey = hwSigningFileToPubKey(signingFile)
  return Buffer.from(
    cardanoSerialization.PublicKey.from_bytes(pubKey).hash().to_bytes(),
  )
}

const findSigningPathForKey = (
  keyHash: Buffer,
  signingFiles: HwSigningData[],
): BIP32Path | undefined => {
  const signingFile = signingFiles.find((file) =>
    keyHash.equals(hwSigningFileToPubKey(file)),
  )
  return signingFile?.path
}
const findSigningXpubForKey = (
  keyHash: Buffer,
  signingFiles: HwSigningData[],
): XPubKeyCborHex | undefined => {
  const signingFile = signingFiles.find((file) =>
    keyHash.equals(hwSigningFileToPubKey(file)),
  )
  return signingFile?.cborXPubKeyHex
}

const findSigningPathForKeyHash = (
  keyHash: Buffer,
  signingFiles: HwSigningData[],
): BIP32Path | undefined => {
  const signingFile = signingFiles.find((file) =>
    keyHash.equals(hwSigningFileToPubKeyHash(file)),
  )
  return signingFile?.path
}

const extractStakePubKeyFromHwSigningData = (
  signingFile: HwSigningData,
): PubKeyHex => {
  const cborStakeXPubKeyHex = signingFile.cborXPubKeyHex
  const stakePubHex =
    splitXPubKeyCborHex(cborStakeXPubKeyHex).pubKey.toString('hex')
  if (isPubKeyHex(stakePubHex)) return stakePubHex
  throw Error(Errors.InternalInvalidTypeError)
}

const hasPaymentSigningFile = (signingFiles: HwSigningData[]): boolean =>
  signingFiles.some((signingFile) => signingFile.type === HwSigningType.Payment)

const hasMultisigSigningFile = (signingFiles: HwSigningData[]): boolean =>
  signingFiles.some(
    (signingFile) => signingFile.type === HwSigningType.MultiSig,
  )

// Pulls every credential field a non-unrestricted signing mode validates on a certificate (i.e.
// the credentials whose form — KEY_PATH, KEY_HASH or SCRIPT_HASH — the lib checks per mode).
// hotCredential on AUTHORIZE_COMMITTEE_HOT is intentionally skipped: only the cold credential
// authorizes the cert and the lib's per-mode rules do not constrain the hot one.
const collectCertCredentials = (cert: Certificate): Credential[] => {
  const credentials: Credential[] = []
  if ('stakeCredential' in cert) credentials.push(cert.stakeCredential)
  if ('dRepCredential' in cert) credentials.push(cert.dRepCredential)
  if ('coldCredential' in cert) credentials.push(cert.coldCredential)
  return credentials
}

export const paymentHashFromAddress = (addressBytes: Buffer): Buffer => {
  if (addressBytes.length < 1 + KEY_HASH_LENGTH) {
    throw Error('Wrong address length, likely a bug in hw-cli')
  }
  return addressBytes.subarray(1, 1 + KEY_HASH_LENGTH)
}

const rewardAccountToStakeCredential = (address: RewardAccount): Credential => {
  const type = getAddressType(address)
  switch (type) {
    case AddressType.REWARD_KEY: {
      return {
        type: CredentialType.KEY_HASH,
        keyHash: paymentHashFromAddress(address) as KeyHash,
      }
    }
    case AddressType.REWARD_SCRIPT: {
      return {
        type: CredentialType.SCRIPT_HASH,
        scriptHash: paymentHashFromAddress(address) as ScriptHash,
      }
    }
    default:
      throw Error(Errors.InvalidAddressError)
  }
}

// The form in which hw-cli presents a credential to the device: a key hash with a matching
// signing file is lifted to a derivation path (see prepareCredential in ledgerCryptoProvider).
enum CredentialForm {
  KEY_PATH,
  KEY_HASH,
  SCRIPT_HASH,
}

// Collects the form of every credential whose form the signing modes constrain: certificate
// stake/cold/dRep credentials, withdrawal stake credentials and voters.
const collectCredentialForms = (
  txBody: TransactionBody,
  signingFiles: HwSigningData[],
): CredentialForm[] => {
  const signingKeyHashes = new Set(
    signingFiles.map((f) => hwSigningFileToPubKeyHash(f).toString('hex')),
  )
  const keyHashForm = (keyHash: KeyHash): CredentialForm =>
    signingKeyHashes.has(keyHash.toString('hex'))
      ? CredentialForm.KEY_PATH
      : CredentialForm.KEY_HASH
  const credentialForm = (credential: Credential): CredentialForm =>
    credential.type === CredentialType.SCRIPT_HASH
      ? CredentialForm.SCRIPT_HASH
      : keyHashForm(credential.keyHash)

  const certForms = (txBody.certificates?.items ?? []).flatMap((cert) =>
    collectCertCredentials(cert).map(credentialForm),
  )

  const withdrawalForms = (txBody.withdrawals ?? []).map((withdrawal) =>
    credentialForm(rewardAccountToStakeCredential(withdrawal.rewardAccount)),
  )

  const voterForms = (txBody.votingProcedures ?? []).map(({voter}) =>
    voter.type === VoterType.COMMITTEE_SCRIPT ||
    voter.type === VoterType.DREP_SCRIPT
      ? CredentialForm.SCRIPT_HASH
      : // COMMITTEE_KEY, DREP_KEY, STAKE_POOL — all key-based, all carry `hash: KeyHash`.
        keyHashForm(voter.hash),
  )

  return [...certForms, ...withdrawalForms, ...voterForms]
}

// Transaction body fields rejected by both the ORDINARY and MULTISIG signing modes.
const hasPlutusOnlyFields = (txBody: TransactionBody): boolean =>
  txBody.collateralInputs != null ||
  txBody.collateralReturnOutput != null ||
  txBody.totalCollateral != null ||
  txBody.referenceInputs != null

// canSignWith*Mode mirror the per-signing-mode tx-body rejection rules of the Ledger app
// (ledgerjs `parsing/transaction.ts`), each clause annotated with the rule it mirrors.

const canSignWithOrdinaryMode = (
  txBody: TransactionBody,
  signingFiles: HwSigningData[],
): boolean =>
  // SIGN_MODE_ORDINARY__POOL_REGISTRATION_NOT_ALLOWED
  !txBody.certificates?.items.some(
    (cert) => cert.type === CertificateType.POOL_REGISTRATION,
  ) &&
  // SIGN_MODE_ORDINARY__CERTIFICATE_*_ONLY_AS_PATH, __WITHDRAWAL_ONLY_AS_PATH,
  // __VOTER_ONLY_AS_PATH
  collectCredentialForms(txBody, signingFiles).every(
    (form) => form === CredentialForm.KEY_PATH,
  ) &&
  // SIGN_MODE_ORDINARY__COLLATERAL_INPUTS_NOT_ALLOWED, __COLLATERAL_OUTPUT_NOT_ALLOWED,
  // __TOTAL_COLLATERAL_NOT_ALLOWED, __REFERENCE_INPUTS_NOT_ALLOWED
  !hasPlutusOnlyFields(txBody)

// SIGN_MODE_MULTISIG__DEVICE_OWNED_ADDRESS_NOT_ALLOWED needs no clause: hw-cli sends outputs
// as third-party addresses in MULTISIG mode (see areAddressParamsAllowed).
const canSignWithMultisigMode = (
  txBody: TransactionBody,
  signingFiles: HwSigningData[],
): boolean =>
  // SIGN_MODE_MULTISIG__POOL_REGISTRATION_NOT_ALLOWED, __POOL_RETIREMENT_NOT_ALLOWED
  !txBody.certificates?.items.some(
    (cert) =>
      cert.type === CertificateType.POOL_REGISTRATION ||
      cert.type === CertificateType.POOL_RETIREMENT,
  ) &&
  // SIGN_MODE_MULTISIG__CERTIFICATE_CREDENTIAL_ONLY_AS_SCRIPT, __WITHDRAWAL_ONLY_AS_SCRIPT,
  // __VOTER_ONLY_AS_SCRIPT — a path-resolvable key hash violates these too (it would be sent
  // as a key path).
  collectCredentialForms(txBody, signingFiles).every(
    (form) => form === CredentialForm.SCRIPT_HASH,
  ) &&
  // SIGN_MODE_MULTISIG__COLLATERAL_INPUTS_NOT_ALLOWED, __COLLATERAL_OUTPUT_NOT_ALLOWED,
  // __TOTAL_COLLATERAL_NOT_ALLOWED, __REFERENCE_INPUTS_NOT_ALLOWED
  !hasPlutusOnlyFields(txBody)

const determineSigningMode = (
  txBody: TransactionBody,
  signingFiles: HwSigningData[],
): SigningMode => {
  const poolRegistrationCert = txBody.certificates?.items.find(
    (cert) => cert.type === CertificateType.POOL_REGISTRATION,
  ) as PoolRegistrationCertificate | undefined

  // A pool registration cert requires one of the POOL_REGISTRATION signing modes — never
  // unrestricted mode, which rejects pool registration certs, too. Txs these modes cannot sign
  // are not signable at all; per-mode validation reports the violated rule.
  if (poolRegistrationCert) {
    const poolKeyPath = findSigningPathForKeyHash(
      poolRegistrationCert.poolParams.operator,
      signingFiles,
    )
    const isPaying = hasPaymentSigningFile(signingFiles)
    return poolKeyPath || isPaying
      ? SigningMode.POOL_REGISTRATION_AS_OPERATOR
      : SigningMode.POOL_REGISTRATION_AS_OWNER
  }

  // Plutus-only fields point to the PLUTUS signing mode, which accepts any tx without a pool
  // registration cert. PLUTUS has to be considered before MULTISIG, because multisig signing
  // files are allowed in PLUTUS signing mode, too.
  if (hasPlutusOnlyFields(txBody)) {
    return SigningMode.PLUTUS_TRANSACTION
  }

  // ORDINARY and MULTISIG cannot be distinguished by the txBody contents alone, so we decide
  // based on signing files. Txs the decided mode cannot sign fall back to unrestricted mode;
  // the caller (commandExecutor) asserts that the user authorized it via
  // --allow-unrestricted-mode and that the device supports it.
  if (hasMultisigSigningFile(signingFiles)) {
    return canSignWithMultisigMode(txBody, signingFiles)
      ? SigningMode.MULTISIG_TRANSACTION
      : SigningMode.UNRESTRICTED
  }
  return canSignWithOrdinaryMode(txBody, signingFiles)
    ? SigningMode.ORDINARY_TRANSACTION
    : SigningMode.UNRESTRICTED
}

const validateKeyGenInputs = (
  paths: BIP32Path[],
  hwSigningFiles: string[],
  verificationKeyFiles: string[],
): void => {
  if (
    !Array.isArray(paths) ||
    !paths.every(isBIP32Path) ||
    !Array.isArray(hwSigningFiles) ||
    !Array.isArray(verificationKeyFiles) ||
    paths.length < 1 ||
    paths.length !== hwSigningFiles.length ||
    paths.length !== verificationKeyFiles.length
  )
    throw Error(Errors.InvalidKeyGenInputsError)
}

const _packByronAddress = (
  paymentSigningFile: HwSigningData,
  protocolMagic: number,
): _AddressParameters => {
  const {pubKey, chainCode} = splitXPubKeyCborHex(
    paymentSigningFile.cborXPubKeyHex,
  )
  const xPubKey = Buffer.concat([pubKey, chainCode])
  const address: Buffer = cardanoCrypto.packBootstrapAddress(
    paymentSigningFile.path,
    xPubKey,
    undefined, // passphrase is undefined for derivation scheme v2
    2, // derivation scheme is always 2 for hw wallets
    protocolMagic,
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
  networkId: number,
): _AddressParameters => {
  const {pubKey: paymentPubKey} = splitXPubKeyCborHex(
    paymentSigningFile.cborXPubKeyHex,
  )
  const {pubKey: stakePubKey} = splitXPubKeyCborHex(
    stakeSigningFile.cborXPubKeyHex,
  )
  const address: Buffer = cardanoCrypto.packBaseAddress(
    cardanoCrypto.getPubKeyBlake2b224Hash(paymentPubKey),
    cardanoCrypto.getPubKeyBlake2b224Hash(stakePubKey),
    networkId,
    BaseAddressTypes.BASE,
  )
  return {
    address,
    addressType: getAddressType(address),
    paymentPath: paymentSigningFile.path,
    stakePath: stakeSigningFile.path,
  }
}

const _packBaseAddressKeyScript = (
  paymentSigningFile: HwSigningData,
  stakeHash: Buffer,
  networkId: number,
): _AddressParameters => {
  const {pubKey: paymentPubKey} = splitXPubKeyCborHex(
    paymentSigningFile.cborXPubKeyHex,
  )
  const address: Buffer = cardanoCrypto.packBaseAddress(
    cardanoCrypto.getPubKeyBlake2b224Hash(paymentPubKey),
    stakeHash,
    networkId,
    BaseAddressTypes.KEY_SCRIPT,
  )
  return {
    address,
    addressType: getAddressType(address),
    paymentPath: paymentSigningFile.path,
  }
}

const _packEnterpriseAddress = (
  paymentSigningFile: HwSigningData,
  networkId: number,
): _AddressParameters => {
  const {pubKey: paymentPubKey} = splitXPubKeyCborHex(
    paymentSigningFile.cborXPubKeyHex,
  )
  const address: Buffer = cardanoCrypto.packEnterpriseAddress(
    cardanoCrypto.getPubKeyBlake2b224Hash(paymentPubKey),
    networkId,
  )
  return {
    address,
    addressType: getAddressType(address),
    paymentPath: paymentSigningFile.path,
  }
}

const _packRewardAddress = (
  stakeSigningFile: HwSigningData,
  networkId: number,
): _AddressParameters => {
  const {pubKey: stakePubKey} = splitXPubKeyCborHex(
    stakeSigningFile.cborXPubKeyHex,
  )
  const address: Buffer = cardanoCrypto.packRewardAddress(
    cardanoCrypto.getPubKeyBlake2b224Hash(stakePubKey),
    networkId,
  )
  return {
    address,
    addressType: getAddressType(address),
    stakePath: stakeSigningFile.path,
  }
}

export const stakeHashFromBaseAddress = (addressBytes: Buffer): Buffer => {
  if (addressBytes.length !== 1 + 2 * KEY_HASH_LENGTH) {
    throw Error('Wrong address length, likely a bug in hw-cli')
  }
  return addressBytes.subarray(1 + KEY_HASH_LENGTH)
}

/*
 * Turns binary address into address parameters. Useful for nicer UI:
 * HW wallets can show key derivation paths etc.
 *
 * If there is not enough signing data (e.g. when the address is third-party),
 * returns null.
 */
const getAddressParameters = (
  hwSigningData: HwSigningData[],
  address: Buffer,
  network: Network,
): _AddressParameters | null => {
  if (hwSigningData.length === 0) return null
  const {paymentSigningFiles, stakeSigningFiles} =
    filterSigningFiles(hwSigningData)
  const addressType = getAddressType(address)
  const findMatchingAddress = (
    packedAddresses: (_AddressParameters | null)[],
  ) => {
    return (
      (
        packedAddresses.filter(
          (packedAddress) => packedAddress,
        ) as _AddressParameters[]
      ).find((packedAddress) => address.equals(packedAddress.address)) || null
    )
  }

  try {
    switch (addressType) {
      case AddressType.BYRON:
        return findMatchingAddress(
          paymentSigningFiles.map((paymentSigningFile) =>
            _packByronAddress(paymentSigningFile, network.protocolMagic),
          ),
        )

      case AddressType.BASE_PAYMENT_KEY_STAKE_KEY:
        return findMatchingAddress(
          paymentSigningFiles.flatMap((paymentSigningFile) =>
            stakeSigningFiles.map((stakeSigningFile) =>
              _packBaseAddress(
                paymentSigningFile,
                stakeSigningFile,
                network.networkId,
              ),
            ),
          ),
        )

      case AddressType.BASE_PAYMENT_KEY_STAKE_SCRIPT: {
        const stakeHash = stakeHashFromBaseAddress(address)
        return findMatchingAddress(
          paymentSigningFiles.map((paymentSigningFile) =>
            _packBaseAddressKeyScript(
              paymentSigningFile,
              stakeHash,
              network.networkId,
            ),
          ),
        )
      }

      case AddressType.ENTERPRISE_KEY:
        return findMatchingAddress(
          paymentSigningFiles.map((paymentSigningFile) =>
            _packEnterpriseAddress(paymentSigningFile, network.networkId),
          ),
        )

      case AddressType.REWARD_KEY:
        return findMatchingAddress(
          stakeSigningFiles.map((stakeSigningFile) =>
            _packRewardAddress(stakeSigningFile, network.networkId),
          ),
        )

      // TODO: Pointer address

      default:
        return null
    }
  } catch (e) {
    // for debugging purposes
    // eslint-disable-next-line no-console
    console.log(e)
    return null
  }
}

const areAddressParamsAllowed = (signingMode: SigningMode): boolean =>
  [
    SigningMode.ORDINARY_TRANSACTION,
    SigningMode.PLUTUS_TRANSACTION,
    SigningMode.UNRESTRICTED,
  ].includes(signingMode)

const getAddressAttributes = (
  addressStr: HumanAddress,
): {
  addressType: number
  networkId: number
  protocolMagic: number
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
  }
  if (address instanceof cardanoSerialization.Address) {
    // HW wallets require us to supply protocol magic, but it is only
    // relevant for Byron addresses, so we can return anything here
    const protocolMagic =
      address.network_id() === NetworkIds.MAINNET
        ? ProtocolMagics.MAINNET
        : ProtocolMagics.TESTNET_PREVIEW
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
  const ipv6LE = Buffer.from(ipv6)
    .swap32()
    .toString('hex')
    .match(/.{1,4}/g)
  return ipv6LE ? ipv6LE.join(':') : undefined
}

const formatCIP36RegistrationMetaData = (
  delegations: [Buffer, bigint][],
  stakePub: Buffer,
  address: Buffer,
  nonce: bigint,
  votingPurpose: bigint,
  signature: Buffer,
): CIP36RegistrationMetaData =>
  new Map<number, Map<number, CIP36RegistrationMetaDataPayloadItem>>([
    [
      61284,
      new Map<number, CIP36RegistrationMetaDataPayloadItem>([
        [1, delegations],
        [2, stakePub],
        [3, address],
        [4, nonce],
        [5, votingPurpose],
      ]),
    ],
    [61285, new Map<number, Buffer>([[1, signature]])],
  ])

const encodeCIP36RegistrationMetaData = (
  delegations: CVoteDelegation[],
  hwStakeSigningFile: HwSigningData,
  address: Buffer,
  nonce: bigint,
  votingPurpose: bigint,
  auxiliaryDataHashHex: HexString,
  registrationSignatureHex: HexString,
) => {
  const serializedDelegations: [Buffer, bigint][] = delegations.map(
    ({votePublicKey, voteWeight}) => [
      Buffer.from(votePublicKey, 'hex'),
      voteWeight,
    ],
  )
  const stakePubHex = extractStakePubKeyFromHwSigningData(hwStakeSigningFile)

  const metadata = formatCIP36RegistrationMetaData(
    serializedDelegations,
    Buffer.from(stakePubHex, 'hex'),
    address,
    nonce,
    votingPurpose,
    Buffer.from(registrationSignatureHex, 'hex'),
  )

  // we serialize the entire (Mary-era formatted) auxiliary data only to check that its hash
  // matches the hash computed by the HW wallet
  const auxiliaryData: CIP36RegistrationAuxiliaryData = [metadata, []]
  const auxiliaryDataCbor = encodeCbor(auxiliaryData)

  if (blake2b(auxiliaryDataCbor, 32).toString('hex') !== auxiliaryDataHashHex) {
    throw Error(Errors.MetadataSerializationMismatchError)
  }

  return encodeCbor(metadata).toString('hex')
}

const areHwSigningDataNonByron = (hwSigningData: HwSigningData[]): boolean =>
  hwSigningData
    .map((signingFile) => classifyPath(signingFile.path))
    .every((pathType) => pathType !== PathTypes.PATH_WALLET_SPENDING_KEY_BYRON)

const validateCIP36RegistrationAddressType = (addressType: number): void => {
  if (
    addressType !== AddressTypes.BASE &&
    addressType !== AddressTypes.REWARD
  ) {
    throw Error(Errors.InvalidCIP36RegistrationAddressType)
  }
}

const getTxBodyHash = (txBody: TransactionBody): string =>
  blake2b(encodeTxBody(txBody), 32).toString('hex')

const verifySignature = (
  message: Buffer,
  pubKey: Buffer,
  signature: Buffer,
): boolean => verify(message, pubKey, signature)

const verifyIntendedPubKeySignatureMatch = (
  messageHex: string,
  hwSigningFile: HwSigningData,
  signatureHex: string,
): void => {
  const hash = Buffer.from(messageHex, 'hex')
  const pubKey = splitXPubKeyCborHex(hwSigningFile.cborXPubKeyHex).pubKey
  const signature = Buffer.from(signatureHex, 'hex')
  if (!verifySignature(hash, pubKey, signature)) {
    throw Error(Errors.SigningPubKeyMismatchError)
  }
}

export {
  PathTypes,
  classifyPath,
  pathEquals,
  splitXPubKeyCborHex,
  validateKeyGenInputs,
  filterSigningFiles,
  findSigningPathForKeyHash,
  findSigningPathForKey,
  findSigningXpubForKey,
  extractStakePubKeyFromHwSigningData,
  encodeAddress,
  getAddressParameters,
  areAddressParamsAllowed,
  getAddressType,
  getAddressAttributes,
  ipv4ToString,
  ipv6ToString,
  rewardAccountToStakeCredential,
  formatCIP36RegistrationMetaData,
  encodeCIP36RegistrationMetaData,
  areHwSigningDataNonByron,
  validateCIP36RegistrationAddressType,
  hasMultisigSigningFile,
  determineSigningMode,
  getTxBodyHash,
  verifyIntendedPubKeySignatureMatch,
  hwSigningFileToPubKeyHash,
}
