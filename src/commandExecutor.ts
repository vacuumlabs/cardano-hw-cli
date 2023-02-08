import * as InteropLib from 'cardano-hw-interop-lib'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid-noevents'
import { CryptoProvider, NativeScriptDisplayFormat, SigningParameters } from './crypto-providers/types'
import {
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
  ParsedAddressKeyGenArguments,
  ParsedTransactionPolicyIdArguments,
  ParsedTransactionWitnessArguments,
  ParsedVerificationKeyArguments,
  ParsedOpCertArguments,
  ParsedNodeKeyGenArguments,
  ParsedCIP36RegistrationMetadataArguments,
} from './types'
import { LedgerCryptoProvider } from './crypto-providers/ledgerCryptoProvider'
import { TrezorCryptoProvider } from './crypto-providers/trezorCryptoProvider'
import {
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
import { CIP36_VOTING_PURPOSE_CATALYST } from './constants'
import { validateWitnessing } from './crypto-providers/witnessingValidation'
import { WitnessOutput } from './transaction/types'
import { validateTxBeforeWitnessing } from './transaction/transactionValidation'
import { Cbor, CVoteDelegation } from './basicTypes'

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
    validateTxBeforeWitnessing(args.txFileData.cborHex)
    const txCbor = Buffer.from(args.txFileData.cborHex, 'hex')
    const tx = InteropLib.decodeTx(txCbor)

    const { era } = args.txFileData
    const signingParameters: SigningParameters = {
      signingMode: determineSigningMode(tx.body, args.hwSigningFileData),
      tx,
      txBodyHashHex: getTxBodyHash(tx.body),
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
        counter: 0n,
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

    issueCounter.counter += 1n
    writeOutputData(args.issueCounterFile, constructOpCertIssueCounterOutput(issueCounter))
  }

  const createCIP36RegistrationMetadata = async (
    args: ParsedCIP36RegistrationMetadataArguments,
  ) => {
    // adds stake signing data to payment address data so that it is not necessary to repeat the same
    // staking key file in command line arguments
    const hwSigningData = [...args.paymentAddressSigningKeyData, args.hwStakeSigningFileData]
    if (!areHwSigningDataNonByron(hwSigningData)) {
      throw Error(Errors.ByronSigningFilesFoundInCIP36Registration)
    }

    const votePublicKeyCount = args.votePublicKeys.length
    const voteWeightCount = args.voteWeights.length
    if (votePublicKeyCount === 1 && voteWeightCount === 0) {
      // delegate the whole voting power to the single vote public key
      args.voteWeights.push(1n)
    } else if (votePublicKeyCount > 0 && votePublicKeyCount === voteWeightCount) {
      // the vote public keys and vote weights are provided correctly
      // nothing to do
    } else {
      throw Error(Errors.InvalidCVoteDelegations)
    }
    const delegations: CVoteDelegation[] = args.votePublicKeys.map((votePublicKey, index) => ({
      votePublicKey,
      voteWeight: args.voteWeights[index],
    }))

    const votingPurpose = args.votingPurpose || CIP36_VOTING_PURPOSE_CATALYST

    const votingRegistrationMetaData = await cryptoProvider.signCIP36RegistrationMetaData(
      delegations,
      args.hwStakeSigningFileData,
      args.paymentAddress,
      args.nonce,
      votingPurpose,
      args.network,
      hwSigningData,
      args.derivationType,
    )

    writeCbor(args.outFile, Buffer.from(votingRegistrationMetaData, 'hex') as Cbor)
  }

  return {
    printDeviceVersion,
    showAddress,
    createSigningKeyFile,
    createVerificationKeyFile,
    createTxPolicyId,
    createTxWitnesses,
    createNodeSigningKeyFiles,
    createSignedOperationalCertificate,
    createCIP36RegistrationMetadata,
  }
}

export {
  CommandExecutor,
}
