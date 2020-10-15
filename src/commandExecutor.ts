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
// import { TrezorCryptoProvider } from './crypto-providers/trezorCryptoProvider'
import { validateUnsignedTx } from './crypto-providers/util'

// const promiseTimeout = <T> (promise: Promise<T>, ms: number): Promise<T> => {
//   const timeout: Promise<T> = new Promise((resolve, reject) => {
//     const id = setTimeout(() => {
//       clearTimeout(id)
//       reject(new Error(`Promise timed out in ${ms} ms`))
//     }, ms)
//   })

//   return Promise.race([
//     promise,
//     timeout,
//   ])
// }

// const getCryptoProvider = async (): Promise<CryptoProvider> => {
//   try {
//     const ledgerCryptoProvider = await promiseTimeout(LedgerCryptoProvider(), 5000)
//     return ledgerCryptoProvider
//   } catch (ledgerError) {
//     try {
//       const trezorCryptoProvider = await promiseTimeout(TrezorCryptoProvider(), 5000)
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
    const txAux = TxAux(args.txBodyFileData.cborHex)
    validateUnsignedTx(txAux, args.hwSigningFileData)
    const signedTx = await cryptoProvider.signTx(
      txAux, args.hwSigningFileData, args.network, args.changeOutputKeyFileData,
    )
    write(args.outFile, TxSignedOutput(signedTx))
  }

  const createTxWitness = async (args: ParsedTransactionWitnessArguments) => {
    const txAux = TxAux(args.txBodyFileData.cborHex)
    validateUnsignedTx(txAux, [args.hwSigningFileData])
    const txWitness = await cryptoProvider.witnessTx(
      txAux, args.hwSigningFileData, args.network, args.changeOutputKeyFileData,
    )
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
