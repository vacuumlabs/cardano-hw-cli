import { CryptoProvider } from './crypto-providers/types'
import {
  constructSignedTxOutput,
  write,
  constructHwSigningKeyOutput,
  constructVerificationKeyOutput,
  constructTxWitnessOutput,
  constructSignedOpCertOutput,
  constructOpCertIssueCounterOutput,
  writeCbor,
} from './fileWriter'
import {
  ParsedShowAddressArguments,
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
  validateSigning,
  validateWitnessing,
  validateKeyGenInputs,
  classifyPath,
  PathTypes,
  areHwSigningDataNonByron,
  determineSigningMode,
} from './crypto-providers/util'
import { Errors } from './errors'
import { parseOpCertIssueCounterFile } from './command-parser/parsers'
import { parseUnsignedTx } from './transaction/txParser'

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
  const cryptoProviderPromise = Promise.race([
    LedgerCryptoProvider(),
    TrezorCryptoProvider(),
  ])

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

  const showAddress = async (
    {
      paymentPath, paymentScriptHash, stakingPath, stakingScriptHash, address,
    }: ParsedShowAddressArguments,
  ) => {
    // eslint-disable-next-line no-console
    console.log(`address: ${address}`)
    return cryptoProvider.showAddress(
      paymentPath,
      paymentScriptHash,
      stakingPath,
      stakingScriptHash,
      address,
    )
  }

  const createSigningKeyFile = async (
    { paths, hwSigningFiles, verificationKeyFiles }: ParsedAddressKeyGenArguments,
  ) => {
    validateKeyGenInputs(paths, hwSigningFiles, verificationKeyFiles)
    const xPubKeys = await cryptoProvider.getXPubKeys(paths)
    xPubKeys.forEach((xPubKey, i) => write(hwSigningFiles[i], constructHwSigningKeyOutput(xPubKey, paths[i])))
    xPubKeys.forEach((xPubKey, i) => write(
      verificationKeyFiles[i], constructVerificationKeyOutput(xPubKey, paths[i]),
    ))
  }

  const createVerificationKeyFile = (
    { verificationKeyFile, hwSigningFileData }: ParsedVerificationKeyArguments,
  ) => {
    write(verificationKeyFile, constructVerificationKeyOutput(
      hwSigningFileData.cborXPubKeyHex,
      hwSigningFileData.path,
    ))
  }

  const createSignedTx = async (args: ParsedTransactionSignArguments) => {
    const unsignedTxParsed = parseUnsignedTx(args.txBodyFileData.cborHex)
    const signingParameters = {
      signingMode: determineSigningMode(unsignedTxParsed, args.hwSigningFileData),
      unsignedTxParsed,
      hwSigningFileData: args.hwSigningFileData,
      network: args.network,
    }
    validateSigning(unsignedTxParsed, args.hwSigningFileData)
    const signedTx = await cryptoProvider.signTx(signingParameters, args.changeOutputKeyFileData)
    write(args.outFile, constructSignedTxOutput(args.txBodyFileData.era, signedTx))
  }

  const createTxPolicyId = async (args: ParsedTransactionPolicyIdArguments) => {
    const scriptHashHex = await cryptoProvider.deriveNativeScriptHash(
      args.nativeScript,
      args.hwSigningFileData,
      NativeScriptDisplayFormat.POLICY_ID,
    )

    // eslint-disable-next-line no-console
    console.log(scriptHashHex)
  }

  const createTxWitness = async (args: ParsedTransactionWitnessArguments) => {
    const unsignedTxParsed = parseUnsignedTx(args.txBodyFileData.cborHex)
    const signingParameters = {
      signingMode: determineSigningMode(unsignedTxParsed, args.hwSigningFileData),
      unsignedTxParsed,
      hwSigningFileData: args.hwSigningFileData,
      network: args.network,
    }
    validateWitnessing(unsignedTxParsed, args.hwSigningFileData)
    const txWitnesses = await cryptoProvider.witnessTx(signingParameters, args.changeOutputKeyFileData)
    for (let i = 0; i < txWitnesses.length; i += 1) {
      write(args.outFiles[i], constructTxWitnessOutput(args.txBodyFileData.era, txWitnesses[i]))
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

      write(hwSigningFiles[i], constructHwSigningKeyOutput(xPubKey, path))
      write(verificationKeyFiles[i], constructVerificationKeyOutput(xPubKey, path))

      const issueCounter = {
        counter: BigInt(1),
        poolColdKey: Buffer.from(xPubKey, 'hex').slice(-64).slice(0, 32),
      }
      write(issueCounterFiles[i], constructOpCertIssueCounterOutput(issueCounter))
    }
  }

  const createSignedOperationalCertificate = async (args: ParsedOpCertArguments) => {
    const issueCounter = parseOpCertIssueCounterFile(args.issueCounterFile)

    const signedCertCborHex = await cryptoProvider.signOperationalCertificate(
      args.kesVKey, args.kesPeriod, issueCounter, args.hwSigningFileData,
    )

    write(args.outFile, constructSignedOpCertOutput(signedCertCborHex))

    // TODO how to increment BigInt?
    issueCounter.counter = BigInt(issueCounter.counter as bigint) + BigInt(1)
    write(args.issueCounterFile, constructOpCertIssueCounterOutput(issueCounter))
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
    )

    writeCbor(args.outFile, Buffer.from(votingRegistrationMetaData, 'hex') as Cbor)
  }

  return {
    printDeviceVersion,
    showAddress,
    createSigningKeyFile,
    createVerificationKeyFile,
    createSignedTx,
    createTxPolicyId,
    createTxWitness,
    createNodeSigningKeyFiles,
    createSignedOperationalCertificate,
    createCatalystVotingKeyRegistrationMetadata,
  }
}

export {
  CommandExecutor,
}
