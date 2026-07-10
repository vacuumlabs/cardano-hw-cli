import * as InteropLib from 'cardano-hw-interop-lib'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid-noevents'
import {TransportNodeUSB} from '@keystonehq/hw-transport-nodeusb'
import {
  CryptoProvider,
  NativeScriptDisplayFormat,
  SigningMode,
  TxSigningParameters,
} from './crypto-providers/cryptoProvider'
import {
  constructHwSigningKeyOutput,
  constructVerificationKeyOutput,
  constructTxWitnessOutput,
  constructSignedOpCertOutput,
  constructOpCertIssueCounterOutput,
  writeCbor,
  writeOutputData,
  WitnessOutput,
  constructSignedMessageOutput,
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
  ParsedSignMessageArguments,
} from './command-parser/argTypes'
import {LedgerCryptoProvider} from './crypto-providers/ledgerCryptoProvider'
import {TrezorCryptoProvider} from './crypto-providers/trezorCryptoProvider'
import {
  validateKeyGenInputs,
  classifyPath,
  PathTypes,
  areHwSigningDataNonByron,
  determineSigningMode,
  getTxBodyHash,
  pathEquals,
  getAddressAttributes,
} from './crypto-providers/util'
import {Errors} from './errors'
import {parseOpCertIssueCounterFile} from './command-parser/parsers'
import {CIP36_VOTING_PURPOSE_CATALYST} from './constants'
import {validateWitnessing} from './crypto-providers/witnessingValidation'
import {validateTxBeforeWitnessing} from './transaction/transactionValidation'
import {AddressType, Cbor, CVoteDelegation} from './basicTypes'
import {KeystoneCryptoProvider} from './crypto-providers/keystoneCryptoProvider'

const promiseTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout: Promise<T> = new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id)
      reject(new Error(`Promise timed out in ${ms} ms`))
    }, ms)
  })

  return Promise.race([promise, timeout])
}

const openLedgerTransport = async () => {
  const paths = await TransportNodeHid.list()
  if (paths.length === 0) {
    throw new Error('NoDeviceFound')
  }
  return TransportNodeHid.open(paths[0])
}

const getCryptoProvider = async (): Promise<CryptoProvider> => {
  const ledgerPromise = async () =>
    LedgerCryptoProvider(await openLedgerTransport())
  // if you want to test with speculos, you can use this temporarily:
  // LedgerCryptoProvider(await require('@ledgerhq/hw-transport-node-speculos').default.open({apduPort: 9999}))
  const trezorPromise = async () => await TrezorCryptoProvider()
  const keystonePromise = async () =>
    await KeystoneCryptoProvider(await TransportNodeUSB.connect())
  try {
    const results = await Promise.allSettled([
      promiseTimeout(ledgerPromise(), 5000),
      promiseTimeout(trezorPromise(), 5000),
      promiseTimeout(keystonePromise(), 5000),
    ])

    // Find the first successful result
    const successfulResult = results.find(
      (result) => result.status === 'fulfilled',
    )
    if (successfulResult && successfulResult.status === 'fulfilled') {
      return successfulResult.value
    }

    // If no successful connection found, throw error
    throw Error(Errors.HwTransportNotFoundError)
  } catch (e) {
    throw Error(Errors.HwTransportNotFoundError)
  }
}

const CommandExecutor = async () => {
  const cryptoProvider: CryptoProvider = await getCryptoProvider()

  const printDeviceVersion = async () =>
    // eslint-disable-next-line no-console
    console.log(await cryptoProvider.getVersion())

  const validateShowAddressArgs = (args: ParsedShowAddressArguments): void => {
    const hasPaymentCredential =
      args.paymentPath != null || args.paymentScriptHash != null
    const hasStakingCredential =
      args.stakingPath != null || args.stakingScriptHash != null

    if (!hasPaymentCredential && !hasStakingCredential) {
      throw Error(Errors.InvalidAddressParametersProvidedError)
    }

    const {addressType} = getAddressAttributes(args.address)

    switch (addressType) {
      case AddressType.BASE_PAYMENT_KEY_STAKE_KEY:
      case AddressType.BASE_PAYMENT_SCRIPT_STAKE_KEY:
      case AddressType.BASE_PAYMENT_KEY_STAKE_SCRIPT:
      case AddressType.BASE_PAYMENT_SCRIPT_STAKE_SCRIPT:
        if (!hasPaymentCredential || !hasStakingCredential) {
          throw Error(Errors.InvalidAddressParametersProvidedError)
        }
        break
      case AddressType.ENTERPRISE_KEY:
      case AddressType.ENTERPRISE_SCRIPT:
        if (!hasPaymentCredential || hasStakingCredential) {
          throw Error(Errors.InvalidAddressParametersProvidedError)
        }
        break
      case AddressType.REWARD_KEY:
      case AddressType.REWARD_SCRIPT:
        if (!hasStakingCredential || hasPaymentCredential) {
          throw Error(Errors.InvalidAddressParametersProvidedError)
        }
        break
      default:
        throw Error(Errors.InvalidAddressParametersProvidedError)
    }
  }

  const showAddress = async (args: ParsedShowAddressArguments) => {
    validateShowAddressArgs(args)
    // eslint-disable-next-line no-console
    console.log(`address: ${args.address}`)
    return await cryptoProvider.showAddress(args)
  }

  const createSigningKeyFile = async ({
    paths,
    hwSigningFiles,
    verificationKeyFiles,
    derivationType,
  }: ParsedAddressKeyGenArguments) => {
    validateKeyGenInputs(paths, hwSigningFiles, verificationKeyFiles)
    const xPubKeys = await cryptoProvider.getXPubKeys(paths, derivationType)
    xPubKeys.forEach((xPubKey, i) =>
      writeOutputData(
        hwSigningFiles[i],
        constructHwSigningKeyOutput(xPubKey, paths[i]),
      ),
    )
    xPubKeys.forEach((xPubKey, i) =>
      writeOutputData(
        verificationKeyFiles[i],
        constructVerificationKeyOutput(xPubKey, paths[i]),
      ),
    )
  }

  const createVerificationKeyFile = ({
    verificationKeyFile,
    hwSigningFileData,
  }: ParsedVerificationKeyArguments) => {
    writeOutputData(
      verificationKeyFile,
      constructVerificationKeyOutput(
        hwSigningFileData.cborXPubKeyHex,
        hwSigningFileData.path,
      ),
    )
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
    validateTxBeforeWitnessing(args.txFileData.cborHex, {
      allowUnrestrictedMode: args.allowUnrestrictedMode,
    })
    const txCbor = Buffer.from(args.txFileData.cborHex, 'hex')
    const tx = InteropLib.decodeTx(txCbor)

    const {era} = args.txFileData
    const signingMode = determineSigningMode(tx.body, args.hwSigningFileData)
    // Unrestricted mode is auto-applied when the tx requires it. Refuse to sign unless the user
    // explicitly authorized it via --allow-unrestricted-mode, and verify the connected device/app
    // can actually honor it.
    if (signingMode === SigningMode.UNRESTRICTED) {
      if (!args.allowUnrestrictedMode) {
        throw Error(Errors.UnrestrictedModeRequiredError)
      }
      if (!(await cryptoProvider.supportsUnrestrictedTransaction())) {
        throw Error(Errors.UnrestrictedModeUnsupportedByDeviceError)
      }
    }
    const signingParameters: TxSigningParameters = {
      signingMode,
      tx,
      txBodyHashHex: getTxBodyHash(tx.body),
      hwSigningFileData: args.hwSigningFileData,
      network: args.network,
      era,
      derivationType: args.derivationType,
    }
    validateWitnessing(signingParameters)
    const {byronWitnesses, shelleyWitnesses} = await cryptoProvider.witnessTx(
      signingParameters,
      args.changeOutputKeyFileData,
    )
    const txWitnesses = [...byronWitnesses, ...shelleyWitnesses]

    const txWitnessOutputs: (WitnessOutput | undefined)[] = []
    for (let i = 0; i < args.hwSigningFileData.length; i += 1) {
      const signingFilePath = args.hwSigningFileData[i].path
      const witness = txWitnesses.find((w) =>
        pathEquals(w.path, signingFilePath),
      )
      if (witness !== undefined) {
        txWitnessOutputs.push(constructTxWitnessOutput(era, witness))
      } else {
        // all signing files are forwarded to LedgerJS/Connect as additionalWitnessRequests,
        // so this is not expected to happen - show a warning below
        txWitnessOutputs.push(undefined)
      }
    }
    if (txWitnessOutputs.length > args.outFiles.length) {
      const witnessPaths = txWitnesses
        .map((output) => output.path.toString())
        .join('\n')
      // eslint-disable-next-line no-console,max-len
      console.log(`Witness paths:\n${witnessPaths}`)
      throw Error(Errors.NotEnoughOutFilesError)
    }
    for (let i = 0; i < args.outFiles.length; i += 1) {
      if (i < txWitnessOutputs.length && txWitnessOutputs[i] !== undefined) {
        writeOutputData(args.outFiles[i], txWitnessOutputs[i] as WitnessOutput)
      } else {
        // eslint-disable-next-line no-console,max-len
        console.log(
          `Warning! A superfluous output file specified (${i + 1} of ${
            args.outFiles.length
          }), the file was not written to.`,
        )
      }
    }
  }

  const createNodeSigningKeyFiles = async (args: ParsedNodeKeyGenArguments) => {
    const {paths, hwSigningFiles, verificationKeyFiles, issueCounterFiles} =
      args
    if (
      hwSigningFiles.length !== paths.length ||
      verificationKeyFiles.length !== paths.length ||
      issueCounterFiles.length !== paths.length
    ) {
      throw Error(Errors.InvalidNodeKeyGenInputsError)
    }

    for (let i = 0; i < paths.length; i += 1) {
      const path = paths[i]
      if (classifyPath(path) !== PathTypes.PATH_POOL_COLD_KEY) {
        throw Error(Errors.InvalidNodeKeyGenInputsError)
      }

      // eslint-disable-next-line no-await-in-loop
      const xPubKey = (await cryptoProvider.getXPubKeys([path]))[0]

      writeOutputData(
        hwSigningFiles[i],
        constructHwSigningKeyOutput(xPubKey, path),
      )
      writeOutputData(
        verificationKeyFiles[i],
        constructVerificationKeyOutput(xPubKey, path),
      )

      const issueCounter = {
        counter: 0n,
        poolColdKey: Buffer.from(xPubKey, 'hex').subarray(-64).subarray(0, 32),
      }
      writeOutputData(
        issueCounterFiles[i],
        constructOpCertIssueCounterOutput(issueCounter),
      )
    }
  }

  const createSignedOperationalCertificate = async (
    args: ParsedOpCertArguments,
  ) => {
    const issueCounter = parseOpCertIssueCounterFile(args.issueCounterFile)

    const signedCertCborHex = await cryptoProvider.signOperationalCertificate(
      args.kesVKey,
      args.kesPeriod,
      issueCounter,
      args.hwSigningFileData,
    )

    writeOutputData(
      args.outFile,
      constructSignedOpCertOutput(signedCertCborHex),
    )

    issueCounter.counter += 1n
    writeOutputData(
      args.issueCounterFile,
      constructOpCertIssueCounterOutput(issueCounter),
    )
  }

  const createSignedMessage = async (args: ParsedSignMessageArguments) => {
    const signedMessageData = await cryptoProvider.signMessage(args)
    writeOutputData(
      args.outFile,
      constructSignedMessageOutput(
        args.messageHex,
        args.hashPayload,
        signedMessageData,
      ),
    )
  }

  const createCIP36RegistrationMetadata = async (
    args: ParsedCIP36RegistrationMetadataArguments,
  ) => {
    // adds stake signing data to payment address data so that it is not necessary to repeat the same
    // staking key file in command line arguments
    const hwSigningData = [
      ...args.paymentAddressSigningKeyData,
      args.hwStakeSigningFileData,
    ]
    if (!areHwSigningDataNonByron(hwSigningData)) {
      throw Error(Errors.ByronSigningFilesFoundInCIP36Registration)
    }

    const votePublicKeyCount = args.votePublicKeys.length
    const voteWeightCount = args.voteWeights.length
    if (votePublicKeyCount === 1 && voteWeightCount === 0) {
      // delegate the whole voting power to the single vote public key
      args.voteWeights.push(1n)
    } else if (
      votePublicKeyCount > 0 &&
      votePublicKeyCount === voteWeightCount
    ) {
      // the vote public keys and vote weights are provided correctly
      // nothing to do
    } else {
      throw Error(Errors.InvalidCVoteDelegations)
    }
    const delegations: CVoteDelegation[] = args.votePublicKeys.map(
      (votePublicKey, index) => ({
        votePublicKey,
        voteWeight: args.voteWeights[index],
      }),
    )

    const votingPurpose = args.votingPurpose || CIP36_VOTING_PURPOSE_CATALYST

    const registrationMetaData =
      await cryptoProvider.signCIP36RegistrationMetaData(
        delegations,
        args.hwStakeSigningFileData,
        args.paymentAddress,
        args.nonce,
        votingPurpose,
        args.network,
        hwSigningData,
        args.derivationType,
      )

    writeCbor(args.outFile, Buffer.from(registrationMetaData, 'hex') as Cbor)
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
    createSignedMessage,
  }
}

export {CommandExecutor}
