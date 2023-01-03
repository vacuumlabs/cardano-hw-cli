import * as InteropLib from 'cardano-hw-interop-lib'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid-noevents'
import { CryptoProvider, SigningParameters } from './crypto-providers/types'
import {
  constructTxFileOutput,
  constructHwSigningKeyOutput,
  constructVerificationKeyOutput,
  constructTxWitnessOutput,
  constructSignedOpCertOutput,
  constructOpCertIssueCounterOutput,
  writeCbor,
  writeOutputData,
} from './fileWriter'
import {
  ParsedShowAddressArguments,
  ParsedPubkeyQueryArguments,
  ParsedAddressKeyGenArguments,
  ParsedTransactionSignArguments,
  ParsedTransactionPolicyIdArguments,
  ParsedTransactionWitnessArguments,
  ParsedVerificationKeyArguments,
  ParsedOpCertArguments,
  ParsedNodeKeyGenArguments,
  ParsedCatalystVotingKeyRegistrationMetadataArguments,
  Cbor,
  NativeScriptDisplayFormat,
} from './types'
import { LedgerCryptoProvider } from './crypto-providers/ledgerCryptoProvider'
import { TrezorCryptoProvider } from './crypto-providers/trezorCryptoProvider'
import {
  validBIP32Paths,
  validateKeyGenInputs,
  classifyPath,
  PathTypes,
  areHwSigningDataNonByron,
  determineSigningMode,
  getTxBodyHash,
  pathEquals,
} from './crypto-providers/util'
import { Errors } from './errors'
import { parseOpCertIssueCounterFile } from './command-parser/parsers'
import { validateSigning, validateWitnessing } from './crypto-providers/signingValidation'
import { validateRawTxBeforeSigning, validateTxBeforeSigning } from './transaction/transactionValidation'
import { cardanoEraToSignedType } from './constants'
import { WitnessOutput } from './transaction/types'

const promiseTimeout = <T> (promise: Promise<T>, ms: number): Promise<T> => {
  const timeout: Promise<T> = new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id)
      reject(new Error(`Promise timed out in ${ms} ms`))
    }, ms)
  })

  return Promise.race([
    promise,
    timeout,
  ])
}

const getCryptoProvider = async (): Promise<CryptoProvider> => {
  const ledgerPromise = async () => LedgerCryptoProvider(await TransportNodeHid.create())
  const trezorPromise = async () => TrezorCryptoProvider()
  const cryptoProviderPromise = Promise.any([ledgerPromise(), trezorPromise()])

  try {
    return await promiseTimeout(cryptoProviderPromise, 5000)
  } catch (e) {
    throw Error(Errors.HwTransportNotFoundError)
  }
}

const CommandExecutor = async () => {
  const cryptoProvider: CryptoProvider = await getCryptoProvider()

  // eslint-disable-next-line no-console
  const printDeviceVersion = async () => console.log(await cryptoProvider.getVersion())

  const showAddress = async (args: ParsedShowAddressArguments) => {
    // eslint-disable-next-line no-console
    console.log(`address: ${args.address}`)
    return cryptoProvider.showAddress(args)
  }

  const printPubkeys = async ({ paths, derivationType }: ParsedPubkeyQueryArguments) => {
    if (!validBIP32Paths(paths)) { throw Error(Errors.InvalidKeyGenInputsError) }

    const xPubKeys = await cryptoProvider.getXPubKeys(paths, derivationType)
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(paths.map((path, index) => [path, xPubKeys[index]])))
  }

  const createSigningKeyFile = async (
    {
      paths, hwSigningFiles, verificationKeyFiles, derivationType,
    }: ParsedAddressKeyGenArguments,
  ) => {
    validateKeyGenInputs(paths, hwSigningFiles, verificationKeyFiles)
    const xPubKeys = await cryptoProvider.getXPubKeys(paths, derivationType)
    xPubKeys.forEach((xPubKey, i) => writeOutputData(
      hwSigningFiles[i],
      constructHwSigningKeyOutput(xPubKey, paths[i]),
    ))
    xPubKeys.forEach((xPubKey, i) => writeOutputData(
      verificationKeyFiles[i],
      constructVerificationKeyOutput(xPubKey, paths[i]),
    ))
  }

  const createVerificationKeyFile = (
    { verificationKeyFile, hwSigningFileData }: ParsedVerificationKeyArguments,
  ) => {
    writeOutputData(verificationKeyFile, constructVerificationKeyOutput(
      hwSigningFileData.cborXPubKeyHex,
      hwSigningFileData.path,
    ))
  }

  const createSignedTx = async (args: ParsedTransactionSignArguments) => {
    // eslint-disable-next-line no-console,max-len
    console.log('Warning! This call is DEPRECATED and will be REMOVED in Oct 2022. Please use witness call instead.')

    let rawTx: InteropLib.RawTransaction | undefined
    let tx: InteropLib.Transaction | undefined
    if (args.rawTxFileData) {
      validateRawTxBeforeSigning(args.rawTxFileData.cborHex)
      // eslint-disable-next-line no-console,max-len
      console.log('Warning! The --tx-body-file option is DEPRECATED and will be REMOVED in Oct 2022. Please use --tx-file instead (use --cddl-format when building transactions with cardano-cli).')

      const rawTxCbor = Buffer.from(args.rawTxFileData.cborHex, 'hex')
      rawTx = InteropLib.decodeRawTx(rawTxCbor)
    } else {
      validateTxBeforeSigning(args.txFileData!.cborHex)
      const txCbor = Buffer.from(args.txFileData!.cborHex, 'hex')
      tx = InteropLib.decodeTx(txCbor)
    }

    const txBody = (rawTx?.body ?? tx?.body)!
    const era = (args.rawTxFileData?.era ?? args.txFileData?.era)!
    const signingParameters: SigningParameters = {
      signingMode: determineSigningMode(txBody, args.hwSigningFileData),
      rawTx,
      tx,
      txBodyHashHex: getTxBodyHash(txBody),
      hwSigningFileData: args.hwSigningFileData,
      network: args.network,
      era,
      derivationType: args.derivationType,
    }
    validateSigning(signingParameters)

    const envelopeType = cardanoEraToSignedType[era]
    const description = '' // we are creating a signed tx file, leave description empty
    const signedTx = await cryptoProvider.signTx(signingParameters, args.changeOutputKeyFileData)
    writeOutputData(args.outFile, constructTxFileOutput(envelopeType, description, signedTx))
  }

  const createTxPolicyId = async (args: ParsedTransactionPolicyIdArguments) => {
    const scriptHashHex = await cryptoProvider.deriveNativeScriptHash(
      args.nativeScript,
      args.hwSigningFileData,
      NativeScriptDisplayFormat.POLICY_ID,
      args.derivationType,
    )

    // eslint-disable-next-line no-console
    console.log(scriptHashHex)
  }

  const createTxWitnesses = async (args: ParsedTransactionWitnessArguments) => {
    let rawTx: InteropLib.RawTransaction | undefined
    let tx: InteropLib.Transaction | undefined
    if (args.rawTxFileData) {
      // eslint-disable-next-line no-console,max-len
      console.log('Warning! The --tx-body-file option is DEPRECATED and will be REMOVED in Oct 2022. Please use --tx-file instead (use --cddl-format when building transactions with cardano-cli).')

      validateRawTxBeforeSigning(args.rawTxFileData.cborHex)
      const rawTxCbor = Buffer.from(args.rawTxFileData.cborHex, 'hex')
      rawTx = InteropLib.decodeRawTx(rawTxCbor)
    } else {
      validateTxBeforeSigning(args.txFileData!.cborHex)
      const txCbor = Buffer.from(args.txFileData!.cborHex, 'hex')
      tx = InteropLib.decodeTx(txCbor)
    }

    const txBody = (rawTx?.body ?? tx?.body)!
    const era = (args.rawTxFileData?.era ?? args.txFileData?.era)!
    const signingParameters: SigningParameters = {
      signingMode: determineSigningMode(txBody, args.hwSigningFileData),
      rawTx,
      tx,
      txBodyHashHex: getTxBodyHash(txBody),
      hwSigningFileData: args.hwSigningFileData,
      network: args.network,
      era,
      derivationType: args.derivationType,
    }
    validateWitnessing(signingParameters)
    const {
      byronWitnesses, shelleyWitnesses,
    } = await cryptoProvider.witnessTx(signingParameters, args.changeOutputKeyFileData)
    const txWitnesses = [...byronWitnesses, ...shelleyWitnesses]

    const txWitnessOutputs: WitnessOutput[] = []
    for (let i = 0; i < args.hwSigningFileData.length; i += 1) {
      const signingFilePath = args.hwSigningFileData[i].path
      const witness = txWitnesses.find((w) => pathEquals(w.path, signingFilePath))
      if (witness !== undefined) {
        txWitnessOutputs.push(constructTxWitnessOutput(era, witness))
      } else {
        // eslint-disable-next-line no-console,max-len
        console.log(`Warning! A superfluous HW signing file specified (${i + 1} of ${args.hwSigningFileData.length}), the witness was not created.`)
      }
    }
    if (txWitnessOutputs.length > args.outFiles.length) {
      throw Error(Errors.NotEnoughOutFilesError)
    }
    for (let i = 0; i < args.outFiles.length; i += 1) {
      if (i < txWitnessOutputs.length) {
        writeOutputData(args.outFiles[i], txWitnessOutputs[i])
      } else {
        // eslint-disable-next-line no-console,max-len
        console.log(`Warning! A superfluous output file specified (${i + 1} of ${args.outFiles.length}), the file was not written to.`)
      }
    }
  }

  const createNodeSigningKeyFiles = async (args: ParsedNodeKeyGenArguments) => {
    const {
      paths, hwSigningFiles, verificationKeyFiles, issueCounterFiles,
    } = args
    if (hwSigningFiles.length !== paths.length
      || verificationKeyFiles.length !== paths.length
      || issueCounterFiles.length !== paths.length) {
      throw Error(Errors.InvalidNodeKeyGenInputsError)
    }

    for (let i = 0; i < paths.length; i += 1) {
      const path = paths[i]
      if (classifyPath(path) !== PathTypes.PATH_POOL_COLD_KEY) {
        throw Error(Errors.InvalidNodeKeyGenInputsError)
      }

      // eslint-disable-next-line no-await-in-loop
      const xPubKey = (await cryptoProvider.getXPubKeys([path]))[0]

      writeOutputData(hwSigningFiles[i], constructHwSigningKeyOutput(xPubKey, path))
      writeOutputData(verificationKeyFiles[i], constructVerificationKeyOutput(xPubKey, path))

      const issueCounter = {
        counter: BigInt(0),
        poolColdKey: Buffer.from(xPubKey, 'hex').slice(-64).slice(0, 32),
      }
      writeOutputData(issueCounterFiles[i], constructOpCertIssueCounterOutput(issueCounter))
    }
  }

  const createSignedOperationalCertificate = async (args: ParsedOpCertArguments) => {
    const issueCounter = parseOpCertIssueCounterFile(args.issueCounterFile)

    const signedCertCborHex = await cryptoProvider.signOperationalCertificate(
      args.kesVKey,
      args.kesPeriod,
      issueCounter,
      args.hwSigningFileData,
    )

    writeOutputData(args.outFile, constructSignedOpCertOutput(signedCertCborHex))

    // TODO how to increment BigInt?
    issueCounter.counter = BigInt(issueCounter.counter as bigint) + BigInt(1)
    writeOutputData(args.issueCounterFile, constructOpCertIssueCounterOutput(issueCounter))
  }

  const createCatalystVotingKeyRegistrationMetadata = async (
    args: ParsedCatalystVotingKeyRegistrationMetadataArguments,
  ) => {
    if (!areHwSigningDataNonByron([...args.rewardAddressSigningKeyData, args.hwStakeSigningFileData])) {
      throw Error(Errors.ByronSigningFilesFoundInVotingRegistration)
    }

    const votingRegistrationMetaData = await cryptoProvider.signVotingRegistrationMetaData(
      args.rewardAddressSigningKeyData,
      args.hwStakeSigningFileData,
      args.rewardAddress,
      args.votePublicKey,
      args.network,
      args.nonce,
      args.derivationType,
    )

    writeCbor(args.outFile, Buffer.from(votingRegistrationMetaData, 'hex') as Cbor)
  }

  return {
    printDeviceVersion,
    showAddress,
    printPubkeys,
    createSigningKeyFile,
    createVerificationKeyFile,
    createSignedTx,
    createTxPolicyId,
    createTxWitnesses,
    createNodeSigningKeyFiles,
    createSignedOperationalCertificate,
    createCatalystVotingKeyRegistrationMetadata,
  }
}

export {
  CommandExecutor,
}
