/* NOTE: Support for Keystone is developed and maintained by the Keystone team. https://keyst.one/ */

import {
  QRHardwareCall,
  CryptoKeypath,
  PathComponent,
  KeyDerivation,
  KeyDerivationSchema,
  Curve,
  DerivationAlgorithm,
  QRHardwareCallType,
  CryptoMultiAccounts,
} from '@keystonehq/bc-ur-registry'
import {
  CardanoCertKeyData,
  CardanoUtxoData,
  CardanoSignCip8DataRequest,
  CardanoSignCip8DataSignature,
  MessageAddressFieldType,
} from '@keystonehq/bc-ur-registry-cardano'
import {UR, UREncoder, URDecoder} from '@ngraveio/bc-ur'
import {Actions, TransportHID} from '@keystonehq/hw-transport-usb'
import {throwTransportError, Status} from '@keystonehq/hw-transport-error'
import CardanoSerializationLib from '@emurgo/cardano-serialization-lib-nodejs'
import {bech32} from 'bech32'
import KeystoneSDK, {
  CardanoCatalystRequestProps,
  CardanoSignDataRequestProps,
} from '@keystonehq/keystone-sdk'
import {BIP32Path} from '../basicTypes'
import {HARDENED_THRESHOLD} from '../constants'
import {classifyPath, PathTypes} from './util'
import {uuid} from '@keystonehq/keystone-sdk/dist/utils'

export const WALLET_NAME = 'cardano_hw_cli_wallet'

export const pathToKeypath = (
  path: string,
  sourceFingerprintHex?: string,
): CryptoKeypath => {
  const paths = path.replace(/^[mM]\//, '').split('/')
  const pathComponents = paths.map((path) => {
    const index = parseInt(path.replace("'", ''), 10)
    const isHardened = path.endsWith("'")
    return new PathComponent({index, hardened: isHardened})
  })
  if (sourceFingerprintHex !== undefined) {
    // The source fingerprint is a 4-byte value, i.e. exactly 8 hex characters.
    if (!/^[0-9a-fA-F]{8}$/.test(sourceFingerprintHex)) {
      throw new Error(
        `Invalid source fingerprint: '${sourceFingerprintHex}'. Expected 8 hex characters.`,
      )
    }
    const sourceFingerprint = Buffer.alloc(4)
    sourceFingerprint.writeUInt32BE(parseInt(sourceFingerprintHex, 16), 0)
    return new CryptoKeypath(pathComponents, sourceFingerprint)
  }
  return new CryptoKeypath(pathComponents)
}

const decodeBech32PublicKey = (bech32Pubkey: string) => {
  const decoded = bech32.decode(bech32Pubkey)
  return Buffer.from(bech32.fromWords(decoded.words))
}

const parseResponseUR = (urPayload: string): UR => {
  const decoder = new URDecoder()
  decoder.receivePart(urPayload)
  if (!decoder.isComplete()) {
    throwTransportError(Status.ERR_UR_INCOMPLETE)
  }
  const resultUR = decoder.resultUR()
  return resultUR
}

export type Witness = {
  pubKey: string
  witnessSignatureHex: string
}

export const bip32PathToString = (path: BIP32Path): string => {
  return `m/${path
    .map((element) => {
      // add ' for first three elements
      if (element >= HARDENED_THRESHOLD) {
        return `${element - HARDENED_THRESHOLD}'`
      }
      return element.toString()
    })
    .join('/')}`
}

const pathStringToBip32Path = (pathString: string): BIP32Path => {
  // remove  m/ and split by /
  const pathElements = pathString.replace('m/', '').split('/')
  const bip32Path: number[] = []
  pathElements.forEach((element) => {
    if (element.includes("'")) {
      bip32Path.push(
        parseInt(element.replace("'", ''), 10) + HARDENED_THRESHOLD,
      )
    } else {
      bip32Path.push(parseInt(element, 10))
    }
  })
  return bip32Path as BIP32Path
}

const needsShelleyLocalDerivation = (
  pathType: PathTypes,
  path: BIP32Path,
): boolean => {
  if (path.length !== 5) {
    return false
  }
  switch (pathType) {
    case PathTypes.PATH_WALLET_SPENDING_KEY_SHELLEY:
    case PathTypes.PATH_WALLET_STAKING_KEY:
    case PathTypes.PATH_DREP_KEY:
    case PathTypes.PATH_COMMITTEE_COLD_KEY:
    case PathTypes.PATH_COMMITTEE_HOT_KEY:
      return true
    default:
      return false
  }
}

const deriveChildXpubNonHardened = (
  parentXpubHex: string,
  childIndex: number,
): string => {
  if (childIndex >= HARDENED_THRESHOLD) {
    throw new Error(`Invalid non-hardened derivation index: ${childIndex}`)
  }
  const parentXpub = CardanoSerializationLib.Bip32PublicKey.from_bytes(
    Buffer.from(parentXpubHex, 'hex'),
  )
  const childXpub = parentXpub.derive(childIndex)
  return Buffer.from(childXpub.as_bytes()).toString('hex')
}

const deriveShelleyAddressXpub = (
  accountXpubHex: string,
  path: BIP32Path,
): {publicKey: string; chainCode: string} => {
  const role = path[3]
  const index = path[4]
  if (role === undefined || index === undefined) {
    throw new Error('Invalid Shelley address derivation path')
  }
  const roleXpubHex = deriveChildXpubNonHardened(accountXpubHex, role)
  const addressXpubHex = deriveChildXpubNonHardened(roleXpubHex, index)
  return {
    publicKey: addressXpubHex.slice(0, 64),
    chainCode: addressXpubHex.slice(64, 128),
  }
}

const buildKeyDerivationSchema = (
  path: string,
  pathType: PathTypes,
  sourceFingerprintHex?: string,
): KeyDerivationSchema => {
  const curve = Curve.ed25519
  const algo = DerivationAlgorithm.bip32ed25519
  const keypath = pathToKeypath(path, sourceFingerprintHex)
  if (pathType === PathTypes.PATH_POOL_COLD_KEY) {
    return new KeyDerivationSchema(keypath, curve, algo, 'ADA_CIP_1853')
  }
  if (
    pathType === PathTypes.PATH_WALLET_ACCOUNT_MULTISIG ||
    pathType === PathTypes.PATH_WALLET_SPENDING_KEY_MULTISIG ||
    pathType === PathTypes.PATH_WALLET_STAKING_KEY_MULTISIG
  ) {
    return new KeyDerivationSchema(keypath, curve, algo, 'ADA_CIP_1854')
  }
  return new KeyDerivationSchema(keypath, curve, algo, 'ADA')
}

export default class Cardano {
  private transport: TransportHID
  private mfp: string | undefined

  /**
   * Constructs a new instance of the class.
   *
   * @param transport - An object of type TransportWebUSB
   * @param mfp - Optional parameter of type string, default is undefined, but the mfp should exist in the signing process.
   */
  constructor(transport: TransportHID, mfp?: string) {
    this.transport = transport
    if (mfp) {
      this.mfp = mfp
    }
  }

  private precheck() {
    if (!this.transport) {
      throwTransportError(Status.ERR_TRANSPORT_HAS_NOT_BEEN_SET)
    }
    if (!this.mfp) {
      throw new Error('missing mfp for this wallet')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sendToDevice(actions: Actions, data: any): Promise<any> {
    return this.transport.send(actions, data)
  }

  private async checkDeviceLockStatus(): Promise<boolean> {
    const result = await this.sendToDevice(Actions.CMD_CHECK_LOCK_STATUS, '')
    return result.payload
  }
  async getDeviceInfo(): Promise<{firmwareVersion: string; walletMFP: string}> {
    const result = await this.sendToDevice(Actions.CMD_GET_DEVICE_VERSION, '')
    return Promise.resolve(result)
  }

  async getExtendedPublicKeys(
    paths: string[],
  ): Promise<{publicKey: string; mfp: string; chainCode: string}[]> {
    // Keystone exports account-level xpubs for Shelley (1852) paths; role and
    // address index must be derived locally (same approach as NuFi / hw-app-ada).
    // Reuse the master fingerprint from the constructor when available, only
    // querying the device if it wasn't provided.
    const walletMFP = this.mfp ?? (await this.getDeviceInfo()).walletMFP

    type PathRequest = {
      originalPath: string
      devicePath: string
      bip32Path: BIP32Path
      pathType: PathTypes
      needsLocalDerivation: boolean
    }

    const pathRequests: PathRequest[] = paths.map((path) => {
      const bip32Path = pathStringToBip32Path(path)
      const pathType = classifyPath(bip32Path)
      const needsLocalDerivation = needsShelleyLocalDerivation(
        pathType,
        bip32Path,
      )
      // Request the account xpub from the device, then derive role/index locally.
      // hw-app-ada uses the same pattern in getPublicKeyHex (initAda cache + derive).
      const devicePath = needsLocalDerivation
        ? bip32PathToString(bip32Path.slice(0, 3) as BIP32Path)
        : path
      return {
        originalPath: path,
        devicePath,
        bip32Path,
        pathType,
        needsLocalDerivation,
      }
    })

    const uniqueDevicePaths: string[] = []
    const seenDevicePaths = new Set<string>()
    for (const request of pathRequests) {
      if (!seenDevicePaths.has(request.devicePath)) {
        seenDevicePaths.add(request.devicePath)
        uniqueDevicePaths.push(request.devicePath)
      }
    }

    const schemas = uniqueDevicePaths.map((devicePath) => {
      const bip32Path = pathStringToBip32Path(devicePath)
      const pathType = classifyPath(bip32Path)
      return buildKeyDerivationSchema(devicePath, pathType, walletMFP)
    })

    const keyDerivation = new KeyDerivation(schemas)
    const hardwareCall = new QRHardwareCall(
      QRHardwareCallType.KeyDerivation,
      keyDerivation,
      WALLET_NAME,
    )
    const ur = hardwareCall.toUR()
    const encodedUR = new UREncoder(ur, Infinity).nextPart().toUpperCase()

    const response = await this.sendToDevice(Actions.CMD_RESOLVE_UR, encodedUR)
    const resultUR = parseResponseUR(response.payload)

    const account = CryptoMultiAccounts.fromCBOR(resultUR.cbor)
    const keys = account.getKeys()
    const mfp = account.getMasterFingerprint().toString('hex')

    if (keys.length !== uniqueDevicePaths.length) {
      throw new Error(
        `Keystone returned ${keys.length} extended public key(s), but ${uniqueDevicePaths.length} were requested.`,
      )
    }

    const devicePathResults = new Map<
      string,
      {publicKey: string; chainCode: string}
    >()
    uniqueDevicePaths.forEach((devicePath, index) => {
      const key = keys[index]
      devicePathResults.set(devicePath, {
        publicKey: key.getKey().toString('hex'),
        chainCode: key.getChainCode().toString('hex'),
      })
    })

    return pathRequests.map((request) => {
      const accountKey = devicePathResults.get(request.devicePath)
      if (!accountKey) {
        throw new Error(
          `Missing extended public key for path ${request.devicePath}`,
        )
      }
      if (!request.needsLocalDerivation) {
        return {...accountKey, mfp}
      }
      const accountXpubHex = accountKey.publicKey + accountKey.chainCode
      const derivedKey = deriveShelleyAddressXpub(
        accountXpubHex,
        request.bip32Path,
      )
      return {...derivedKey, mfp}
    })
  }

  async signCardanoDataTransaction(
    props: CardanoSignDataRequestProps,
  ): Promise<{signature: Buffer}> {
    this.precheck()
    const keystoneSDK = new KeystoneSDK()
    const ur = keystoneSDK.cardano.generateSignDataRequest(props)
    const encodedUR = new UREncoder(ur, Infinity).nextPart().toUpperCase()
    const response = await this.sendToDevice(Actions.CMD_RESOLVE_UR, encodedUR)
    const resultUR = parseResponseUR(response.payload)
    // parse signature
    const signature = keystoneSDK.cardano.parseSignDataSignature(resultUR)
    return {
      signature: Buffer.from(signature.signature, 'hex'),
    }
  }

  async signCardanoTransaction({
    signData,
    utxos,
    extraSigners,
  }: // eslint-disable-next-line @typescript-eslint/no-explicit-any
  {
    signData: Buffer
    utxos: CardanoUtxoData[]
    extraSigners: CardanoCertKeyData[]
  }): Promise<Witness[]> {
    const requestId = uuid.v4()
    this.precheck()
    const keystoneSDK = new KeystoneSDK()
    const ur = keystoneSDK.cardano.generateSignRequest({
      signData,
      utxos,
      extraSigners,
      requestId,
      origin: WALLET_NAME,
    })
    const encodedUR = new UREncoder(ur, Infinity).nextPart().toUpperCase()
    const response = await this.sendToDevice(Actions.CMD_RESOLVE_UR, encodedUR)
    const resultUR = parseResponseUR(response.payload)
    // parse signature
    const cardanoSignResult = keystoneSDK.cardano.parseSignature(resultUR)
    const witnessSet = cardanoSignResult.witnessSet
    const witnessSetObj =
      CardanoSerializationLib.TransactionWitnessSet.from_hex(
        witnessSet,
      ).to_js_value()
    const vkeywitnesses = witnessSetObj.vkeys
    const result = vkeywitnesses?.map((witness) => ({
      pubKey: decodeBech32PublicKey(witness.vkey).toString('hex'),
      witnessSignatureHex: witness.signature,
    }))
    return result || []
  }

  async signCardanoCatalystRequest(
    props: CardanoCatalystRequestProps,
  ): Promise<{signature: Buffer}> {
    const keystoneSDK = new KeystoneSDK()
    const ur = keystoneSDK.cardano.generateCatalystRequest(props)
    const encodedUR = new UREncoder(ur, Infinity).nextPart().toUpperCase()
    const response = await this.sendToDevice(Actions.CMD_RESOLVE_UR, encodedUR)
    const resultUR = parseResponseUR(response.payload)
    // parse signature
    const signature = keystoneSDK.cardano.parseCatalystSignature(resultUR)
    return {
      signature: Buffer.from(signature.signature, 'hex'),
    }
  }

  async signCardanoCip8DataTransaction(props: {
    requestId: string
    path: string
    xfp: string
    xpub: string
    messageHex: string
    hashPayload: boolean
    addressFieldType: MessageAddressFieldType
    address?: string
    origin?: string
  }): Promise<{signature: string; publicKey: string; addressFieldHex: string}> {
    this.precheck()
    const signDataRequest =
      CardanoSignCip8DataRequest.constructCardanoSignCip8DataRequest(
        props.messageHex,
        props.path,
        props.xfp,
        props.xpub,
        props.hashPayload,
        props.addressFieldType,
        props.address,
        props.requestId,
        props.origin,
      )
    const encodedUR = new UREncoder(signDataRequest.toUR(), Infinity)
      .nextPart()
      .toUpperCase()
    const response = await this.sendToDevice(Actions.CMD_RESOLVE_UR, encodedUR)
    const resultUR = parseResponseUR(response.payload)
    const signDataResult = CardanoSignCip8DataSignature.fromCBOR(resultUR.cbor)
    return {
      signature: signDataResult.getSignature().toString('hex'),
      publicKey: signDataResult.getPublicKey().toString('hex'),
      addressFieldHex: signDataResult.getAddressField().toString('hex'),
    }
  }
}
