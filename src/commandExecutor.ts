import { CryptoProvider } from './crypto-providers/types'
import { NETWORKS } from './constants'
import {
  TxSignedOutput,
  write,
  HwSigningKeyOutput,
  HwVerificationKeyOutput,
  TxWitnessOutput,
} from './fileWriter'
import { TxAux } from './transaction/transaction'
import {
  ParsedKeyGenArguments,
  ParsedTransactionSignArguments,
  ParsedTransactionWitnessArguments,
  ParsedVerificationKeyArguments,
} from './types'
import { LedgerCryptoProvider } from './crypto-providers/ledgerCryptoProvider'
import { TrezorCryptoProvider } from './crypto-providers/trezorCryptoProvider'

const promiseTimeout = <T> (ms: number, promise: Promise<T>): Promise<T> => {
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

// const getCryptoProvider = async (): Promise<CryptoProvider> => {
//   try {
//     const ledgerCryptoProvider = await promiseTimeout(5000, LedgerCryptoProvider())
//     return ledgerCryptoProvider
//   } catch (ledgerError) {
//     try {
//       const trezorCryptoProvider = await promiseTimeout(5000, TrezorCryptoProvider())
//       return trezorCryptoProvider
//     } catch (trezorError) {
//       console.log(ledgerError)
//       console.log(trezorError)
//     }
//   }
//   throw new Error('Hardware wallet transport not found')
// }

const getCryptoProvider = async (): Promise<CryptoProvider> => LedgerCryptoProvider()

const CommandExecutor = async () => {
  const cryptoProvider: CryptoProvider = await getCryptoProvider()

  const createSigningKeyFile = async (
    { path, hwSigningFile, verificationKeyFile }: ParsedKeyGenArguments,
  ) => {
    const xPubKey = await cryptoProvider.getXPubKey(path)
    write(hwSigningFile, HwSigningKeyOutput(xPubKey, path))
    write(verificationKeyFile, HwVerificationKeyOutput(xPubKey, path))
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
    const network = NETWORKS.MAINNET // get this from args
    const txAux = TxAux(args.txBodyFileData.cborHex)
    const signedTx = await cryptoProvider.signTx(txAux, args.hwSigningFileData, network)
    write(args.outFile, TxSignedOutput(signedTx))
  }

  const createTxWitness = async (args: ParsedTransactionWitnessArguments) => {
    const network = NETWORKS.MAINNET // get this from args
    const txAux = TxAux(args.txBodyFileData.cborHex)
    const txWitness = await cryptoProvider.witnessTx(txAux, args.hwSigningFileData, network)
    write(args.outFile, TxWitnessOutput(txWitness))
  }

  return {
    createSigningKeyFile,
    createVerificationKeyFile,
    createSignedTx,
    createTxWitness,
  }
}

export {
  CommandExecutor,
}
