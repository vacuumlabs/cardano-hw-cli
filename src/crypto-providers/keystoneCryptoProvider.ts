/* eslint-disable no-console */
import * as InteropLib from 'cardano-hw-interop-lib'
import {TransportHID} from '@keystonehq/hw-transport-usb'
import {Errors} from '../errors'
import {isChainCodeHex, isPubKeyHex, isXPubKeyHex} from '../guards'
import {
  CIP36RegistrationAuxiliaryData,
  CIP36RegistrationMetaDataCborHex,
  TxWitnesses,
  TxWitnessKeys,
} from '../transaction/txTypes'
import {
  BIP32Path,
  CVoteDelegation,
  HexString,
  NativeScript,
  NativeScriptHashKeyHex,
  NativeScriptType,
  Network,
  XPubKeyHex,
} from '../basicTypes'
import {
  HwSigningData,
  ParsedShowAddressArguments,
  ParsedSignMessageArguments,
} from '../command-parser/argTypes'
import {
  CryptoProvider,
  NativeScriptDisplayFormat,
  TxSigningParameters,
} from './cryptoProvider'
import Cardano, {bip32PathToString} from './keystoneUtils'
import {
  classifyPath,
  encodeAddress,
  encodeCIP36RegistrationMetaData,
  extractStakePubKeyFromHwSigningData,
  formatCIP36RegistrationMetaData,
  PathTypes,
  hwSigningFileToPubKeyHash,
  splitXPubKeyCborHex,
  pathEquals,
  findSigningPathForKey,
  findSigningXpubForKey,
} from './util'
import {
  TxByronWitnessData,
  TxShelleyWitnessData,
} from '../transaction/transaction'
import {decodeCbor, encodeCbor, partition} from '../util'
import {
  KesVKey,
  OpCertIssueCounter,
  OpCertSigned,
  SignedOpCertCborHex,
} from '../opCert/opCert'
import {SignedMessageData} from '../signMessage/signMessage'
import {CardanoSignCip8MessageData} from '@keystonehq/keystone-sdk/dist/types/props'
import {v4 as uuidv4} from 'uuid'
import * as cardanoSerialization from '@emurgo/cardano-serialization-lib-nodejs'
import {MessageAddressFieldType} from '@keystonehq/bc-ur-registry-cardano'
import {uint64_to_buf} from '@cardano-foundation/ledgerjs-hw-app-cardano/dist/utils/serialize'
import {Uint64_str} from '@cardano-foundation/ledgerjs-hw-app-cardano/dist/types/internal'
const {bech32, blake2b} = require('cardano-crypto.js')
const failedMsg = (e: unknown): string => `The requested operation failed. \
Check that your Keystone device is connected.
Details: ${e}`

const WALLET_NAME = 'cardano_cli_wallet'
export const KeystoneCryptoProvider: (
  transport: TransportHID,
  // eslint-disable-next-line require-await
) => Promise<CryptoProvider> = async (transport) => {
  let keystone = new Cardano(transport)

  const getVersion = async (): Promise<string> => {
    try {
      const result = await keystone.getDeviceInfo()
      return `Keystone app version ${result.firmwareVersion}`
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  const showAddress = async ({
    paymentPath,
    paymentScriptHash,
    stakingPath,
    stakingScriptHash,
    address,
  }: ParsedShowAddressArguments): Promise<void> => {
    console.log('showAddress function parameters:')
    console.log('paymentPath:', JSON.stringify(paymentPath, null, 2))
    console.log('paymentScriptHash:', paymentScriptHash)
    console.log('stakingPath:', JSON.stringify(stakingPath, null, 2))
    console.log('stakingScriptHash:', stakingScriptHash)
    console.log('address:', address)
    throw Error(Errors.Keystone3ProShowAddress)
  }

  const getXPubKeys = async (paths: BIP32Path[]): Promise<XPubKeyHex[]> => {
    try {
      const stringPaths: string[] = []
      for (const path of paths) {
        stringPaths.push(bip32PathToString(path))
      }
      const xPubKeys = await keystone.getExtendedPublicKeys(stringPaths)
      const xPubKeysHex: XPubKeyHex[] = []
      xPubKeys.forEach((xPubKey) => {
        if (
          !isPubKeyHex(xPubKey.publicKey) ||
          !isChainCodeHex(xPubKey.chainCode)
        ) {
          throw Error(Errors.InternalInvalidTypeError)
        }
        const xPubKeyHex = xPubKey.publicKey + xPubKey.chainCode
        if (!isXPubKeyHex(xPubKeyHex)) {
          throw Error(Errors.InternalInvalidTypeError)
        }
        xPubKeysHex.push(xPubKeyHex)
      })
      return xPubKeysHex
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  const witnessTx = async (
    params: TxSigningParameters,
    _changeOutputFiles: HwSigningData[],
  ): Promise<TxWitnesses> => {
    try {
      const {walletMFP} = await keystone.getDeviceInfo()
      const {tx, hwSigningFileData} = params
      const hdPaths: string[] = []
      hwSigningFileData.forEach((data) => {
        // Keystone Hardware Wallet Limitations:
        // Currently unsupported address types:
        // - Byron addresses (paths starting with 44'/1815'/*)
        // - Multisig addresses (paths starting with 1854'/1815'/*)
        // - Minting addresses (paths starting with 1855'/1815'/*)
        if (
          classifyPath(data.path) === PathTypes.PATH_WALLET_SPENDING_KEY_BYRON
        ) {
          throw Error(Errors.Keystone3ProUnsupportedThisPath)
        }

        if (
          classifyPath(data.path) === PathTypes.PATH_WALLET_ACCOUNT_MULTISIG ||
          classifyPath(data.path) ===
            PathTypes.PATH_WALLET_STAKING_KEY_MULTISIG ||
          classifyPath(data.path) ===
            PathTypes.PATH_WALLET_SPENDING_KEY_MULTISIG
        ) {
          throw Error(Errors.Keystone3ProUnsupportedMultisig)
        }

        hdPaths.push(bip32PathToString(data.path))
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const utxos: any[] = []
      const outputs = tx.body.outputs
      tx.body.inputs.items.forEach((input, index) => {
        utxos.push({
          transactionHash: input.transactionId.toString('hex'),
          index: input.index,
          amount: outputs[index].amount.coin.toString(),
          xfp: walletMFP,
          hdPath: hdPaths[index],
          address: encodeAddress(outputs[index].address),
        })
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      keystone = new Cardano(transport, walletMFP)
      const extraSigners = hwSigningFileData.map((signingFile) => ({
        keyHash: hwSigningFileToPubKeyHash(signingFile),
        xfp: walletMFP,
        keyPath: bip32PathToString(signingFile.path),
      }))
      const witnesses = await keystone.signCardanoTransaction({
        signData: InteropLib.encodeTx(tx),
        utxos,
        extraSigners,
      })
      const getSigningFileDataByPath = (path: BIP32Path): HwSigningData => {
        const hwSigningData = hwSigningFileData.find((signingFile) =>
          pathEquals(signingFile.path, path),
        )
        if (hwSigningData) return hwSigningData
        throw Error(Errors.MissingHwSigningDataAtPathError)
      }
      const witnessesWithKeys = witnesses.map((witness) => {
        // get witness path from signingFileData
        const signingFile = hwSigningFileData.find(
          (signingFile) =>
            witness.pubKey ===
            splitXPubKeyCborHex(signingFile.cborXPubKeyHex).pubKey.toString(
              'hex',
            ),
        )
        if (!signingFile) {
          throw Error(Errors.MissingHwSigningDataAtPathError)
        }
        const {pubKey, chainCode} = splitXPubKeyCborHex(
          getSigningFileDataByPath(signingFile.path as BIP32Path)
            .cborXPubKeyHex,
        )
        return {
          path: signingFile.path as BIP32Path,
          signature: Buffer.from(witness.witnessSignatureHex, 'hex'),
          pubKey,
          chainCode,
        }
      })
      const [byronWitnesses, shelleyWitnesses] = partition(
        witnessesWithKeys,
        (witness) =>
          classifyPath(witness.path) ===
          PathTypes.PATH_WALLET_SPENDING_KEY_BYRON,
      )
      return {
        byronWitnesses: byronWitnesses.map((witness) => ({
          key: TxWitnessKeys.BYRON,
          data: TxByronWitnessData(
            witness.pubKey,
            witness.signature,
            witness.chainCode,
            {},
          ),
          path: witness.path,
        })),
        shelleyWitnesses: shelleyWitnesses.map((witness) => ({
          key: TxWitnessKeys.SHELLEY,
          data: TxShelleyWitnessData(witness.pubKey, witness.signature),
          path: witness.path,
        })),
      }
    } catch (err) {
      throw err
    }
  }

  const signCIP36RegistrationMetaData = async (
    delegations: CVoteDelegation[],
    hwStakeSigningFile: HwSigningData,
    paymentAddressBech32: string,
    nonce: bigint,
    votingPurpose: bigint,
    _network: Network,
    _paymentAddressSigningFiles: HwSigningData[],
  ): Promise<CIP36RegistrationMetaDataCborHex> => {
    const serializedDelegations: [Buffer, bigint][] = delegations.map(
      ({votePublicKey, voteWeight}) => [
        Buffer.from(votePublicKey, 'hex'),
        voteWeight,
      ],
    )
    const {walletMFP} = await keystone.getDeviceInfo()
    const keystoneDelegations = delegations.map((delegation) => ({
      pubKey: delegation.votePublicKey,
      weight: Number(delegation.voteWeight),
    }))
    const {data: address}: {data: Buffer} = bech32.decode(paymentAddressBech32)

    const stakePubHex = extractStakePubKeyFromHwSigningData(hwStakeSigningFile)

    const cardanoCatalystVotingRequest = {
      requestId: uuidv4(),
      path: bip32PathToString(hwStakeSigningFile.path),
      delegations: keystoneDelegations,
      stakePub: stakePubHex,
      paymentAddress: address.toString('hex'),
      nonce: Number(nonce),
      voting_purpose: Number(votingPurpose),
      xfp: walletMFP,
      origin: WALLET_NAME,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keystone = new Cardano(transport, walletMFP)
    const result = await keystone.signCardanoCatalystRequest(
      cardanoCatalystVotingRequest,
    )
    try {
      const metadata = formatCIP36RegistrationMetaData(
        serializedDelegations,
        Buffer.from(stakePubHex, 'hex'),
        address,
        nonce,
        votingPurpose,
        result.signature,
      )
      // we serialize the entire (Mary-era formatted) auxiliary data only to check that its hash
      // matches the hash computed by the HW wallet
      const auxiliaryData: CIP36RegistrationAuxiliaryData = [metadata, []]
      const auxiliaryDataCbor = encodeCbor(auxiliaryData)
      const auxiliaryDataHashHex = blake2b(auxiliaryDataCbor, 32).toString(
        'hex',
      )
      return encodeCIP36RegistrationMetaData(
        delegations,
        hwStakeSigningFile,
        address,
        nonce,
        votingPurpose,
        auxiliaryDataHashHex,
        result.signature.toString('hex') as HexString,
      )
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  const signOperationalCertificate = async (
    kesVKey: KesVKey,
    kesPeriod: bigint,
    issueCounter: OpCertIssueCounter,
    signingFiles: HwSigningData[],
  ): Promise<SignedOpCertCborHex> => {
    const poolColdKeyPath = findSigningPathForKey(
      issueCounter.poolColdKey,
      signingFiles,
    )
    const xpubCbor = findSigningXpubForKey(
      issueCounter.poolColdKey,
      signingFiles,
    )
    if (!xpubCbor) {
      throw Error(Errors.MissingHwSigningDataAtPoolColdKeyError)
    }
    try {
      // fin xpub by cold key
      // op_cert_hash = Buffer.concat([kesPublicKeyHex,issueCounter,kesPeriod)
      // op_cert_hash length must be 48
      const opCertMessage = Buffer.concat([
        Buffer.from(kesVKey.toString('hex'), 'hex'),
        uint64_to_buf(BigInt(issueCounter.counter).toString() as Uint64_str),
        uint64_to_buf(BigInt(kesPeriod).toString() as Uint64_str),
      ]).toString('hex')
      // sgin cardano transaction
      const {walletMFP} = await keystone.getDeviceInfo()
      keystone = new Cardano(transport, walletMFP)

      const response = await keystone.signCardanoDataTransaction({
        requestId: uuidv4(),
        xfp: walletMFP,
        xpub: decodeCbor(xpubCbor),
        payload: opCertMessage,
        path: bip32PathToString(poolColdKeyPath as BIP32Path),
        origin: WALLET_NAME,
      })
      return OpCertSigned(kesVKey, kesPeriod, issueCounter, response.signature)
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  // https://github.com/input-output-hk/cardano-js-sdk/blob/master/packages/key-management/src/cip8/cip30signData.ts#L52
  const signMessage = async (
    args: ParsedSignMessageArguments,
  ): Promise<SignedMessageData> => {
    const {walletMFP} = await keystone.getDeviceInfo()
    const {hwSigningFileData} = args
    const {pubKey} = splitXPubKeyCborHex(hwSigningFileData.cborXPubKeyHex)
    const cardanoSignCip8DataRequest = {
      requestId: uuidv4(),
      xfp: walletMFP,
      messageHex: args.messageHex,
      hashPayload: args.hashPayload,
      preferHexDisplay: args.preferHexDisplay,
      xpub: pubKey.toString('hex'),
      path: bip32PathToString(hwSigningFileData.path),
      origin: WALLET_NAME,
      signingPath: bip32PathToString(hwSigningFileData.path),
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let keystoneArgs: CardanoSignCip8MessageData
    if (args.address !== undefined) {
      keystoneArgs = {
        ...cardanoSignCip8DataRequest,
        addressFieldType: MessageAddressFieldType.ADDRESS,
        address: args.address,
      }
    } else {
      keystoneArgs = {
        ...cardanoSignCip8DataRequest,
        addressFieldType: MessageAddressFieldType.KEY_HASH,
      }
    }

    try {
      keystone = new Cardano(transport, walletMFP)
      const response = await keystone.signCardanoCip8DataTransaction(
        keystoneArgs,
      )
      return {
        signatureHex: response.signature,
        signingPublicKeyHex: pubKey.toString('hex'),
        addressFieldHex: response.addressFieldHex,
      } as SignedMessageData
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  const cliNativeScriptToCardanoNativeScript = (
    nativeScript: NativeScript,
  ): cardanoSerialization.NativeScript => {
    switch (nativeScript.type) {
      case NativeScriptType.PUBKEY: {
        const scriptPubkey = cardanoSerialization.ScriptPubkey.new(
          // eslint-disable-next-line no-undef
          cardanoSerialization.Ed25519KeyHash.from_bytes(
            Buffer.from(nativeScript.keyHash, 'hex'),
          ),
        )
        return cardanoSerialization.NativeScript.new_script_pubkey(scriptPubkey)
      }
      case NativeScriptType.ALL: {
        const nativeScripts = nativeScript.scripts.map((script) =>
          cliNativeScriptToCardanoNativeScript(script),
        )
        const nativeScriptsSet = cardanoSerialization.NativeScripts.new()
        nativeScripts.forEach((script) => nativeScriptsSet.add(script))
        const scriptAll = cardanoSerialization.ScriptAll.new(nativeScriptsSet)
        return cardanoSerialization.NativeScript.new_script_all(scriptAll)
      }

      case NativeScriptType.ANY: {
        const nativeScripts = nativeScript.scripts.map((script) =>
          cliNativeScriptToCardanoNativeScript(script),
        )
        const nativeScriptsSet = cardanoSerialization.NativeScripts.new()
        nativeScripts.forEach((script) => nativeScriptsSet.add(script))
        const scriptAny = cardanoSerialization.ScriptAny.new(nativeScriptsSet)
        return cardanoSerialization.NativeScript.new_script_any(scriptAny)
      }
      case NativeScriptType.N_OF_K: {
        const nativeScripts = nativeScript.scripts.map((script) =>
          cliNativeScriptToCardanoNativeScript(script),
        )
        const nativeScriptsSet = cardanoSerialization.NativeScripts.new()
        nativeScripts.forEach((script) => nativeScriptsSet.add(script))
        const scriptNOfK = cardanoSerialization.ScriptNOfK.new(
          nativeScriptsSet.len(),
          nativeScriptsSet,
        )
        return cardanoSerialization.NativeScript.new_script_n_of_k(scriptNOfK)
      }
      case NativeScriptType.INVALID_BEFORE: {
        const slot = cardanoSerialization.TimelockStart.new_timelockstart(
          cardanoSerialization.BigNum.from_str(nativeScript.slot.toString()),
        )
        return cardanoSerialization.NativeScript.new_timelock_start(slot)
      }
      case NativeScriptType.INVALID_HEREAFTER: {
        const slot = cardanoSerialization.TimelockExpiry.new_timelockexpiry(
          cardanoSerialization.BigNum.from_str(nativeScript.slot.toString()),
        )
        return cardanoSerialization.NativeScript.new_timelock_expiry(slot)
      }
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const deriveNativeScriptHash = async (
    nativeScript: NativeScript,
    _signingFiles: HwSigningData[],
    _displayFormat: NativeScriptDisplayFormat,
  ): Promise<NativeScriptHashKeyHex> => {
    try {
      const ledgerNativeScript =
        cliNativeScriptToCardanoNativeScript(nativeScript)
      const policyId = ledgerNativeScript.hash()
      const scriptHashHex = policyId.to_hex()
      return scriptHashHex as NativeScriptHashKeyHex
    } catch (err) {
      throw Error(Errors.Keystone3ProUnsupportedThisCommand)
    }
  }

  return {
    showAddress,
    getVersion,
    witnessTx,
    getXPubKeys,
    signCIP36RegistrationMetaData,
    signOperationalCertificate,
    signMessage,
    deriveNativeScriptHash,
  }
}
