import { CryptoProvider } from './crypto-providers/types'
import {
  TxSignedOutput,
  write,
  HwSigningKeyOutput,
  HwVerificationKeyOutput,
  TxWitnessOutput,
} from './fileWriter'
import { TxAux } from './transaction/transaction'
import {
  ParsedShowAddressArguments,
  ParsedKeyGenArguments,
  ParsedTransactionSignArguments,
  ParsedTransactionWitnessArguments,
  ParsedVerificationKeyArguments,
} from './types'
import { LedgerCryptoProvider } from './crypto-providers/ledgerCryptoProvider'
import { TrezorCryptoProvider } from './crypto-providers/trezorCryptoProvider'
import { validateSigning, validateWitnessing, validateKeyGenInputs } from './crypto-providers/util'
import { Errors } from './errors'

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
    { paymentPath, stakingPath, address }: ParsedShowAddressArguments,
  ) => {
    // eslint-disable-next-line no-console
    console.log(`address: ${address}`)
    return cryptoProvider.showAddress(paymentPath, stakingPath, address)
  }

  const createSigningKeyFile = async (
    { paths, hwSigningFiles, verificationKeyFiles }: ParsedKeyGenArguments,
  ) => {
    validateKeyGenInputs(paths, hwSigningFiles, verificationKeyFiles)
    const xPubKeys = await cryptoProvider.getXPubKeys(paths)
    xPubKeys.forEach((xPubKey, i) => write(hwSigningFiles[i], HwSigningKeyOutput(xPubKey, paths[i])))
    xPubKeys.forEach((xPubKey, i) => write(
      verificationKeyFiles[i], HwVerificationKeyOutput(xPubKey, paths[i]),
    ))
  }

  const createVerificationKeyFile = (
    { verificationKeyFile, hwSigningFileData }: ParsedVerificationKeyArguments,
  ) => {
    write(verificationKeyFile, HwVerificationKeyOutput(
      hwSigningFileData.cborXPubKeyHex,
      hwSigningFileData.path,
    ))
  }

  const createSignedTx = async (args: ParsedTransactionSignArguments) => {
    const txAux = TxAux(args.txBodyFileData.cborHex)
    validateSigning(txAux, args.hwSigningFileData)
    const signedTx = await cryptoProvider.signTx(
      txAux, args.hwSigningFileData, args.network, args.changeOutputKeyFileData,
    )
    write(args.outFile, TxSignedOutput(signedTx))
  }

  const createTxWitness = async (args: ParsedTransactionWitnessArguments) => {
    const txAux = TxAux(args.txBodyFileData.cborHex)
    validateWitnessing(txAux, args.hwSigningFileData)
    const txWitness = await cryptoProvider.witnessTx(
      txAux, args.hwSigningFileData[0], args.network, args.changeOutputKeyFileData,
    )
    write(args.outFile, TxWitnessOutput(txWitness))
  }

  return {
    printDeviceVersion,
    showAddress,
    createSigningKeyFile,
    createVerificationKeyFile,
    createSignedTx,
    createTxWitness,
  }
}

export {
  CommandExecutor,
}
