import { CryptoProvider } from './crypto-providers/types'
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { TxSignedOutput, write } from './fileWriter'
import { TxAux } from './transaction/transaction'
import {
  ParsedKeyGenArguments,
  ParsedTransactionSignArguments,
  ParsedTransactionWitnessArguments,
  ParsedVerificationKeyArguments,
} from './types'

const getCryptoProvider = async () => {
  // await
  // this will return instance of cryptoProvider
}

const CommandExecutor = async () => {
  let cryptoProvider: CryptoProvider // await getCryptoProvider()
  const createSigningKeyFile = (args: ParsedKeyGenArguments) => {
    // TODO
    console.dir(args)
    // const hwSigningFileContents = ''
    // const verificationKeyFileContents = ''

    // write(args.hwSigningFile, hwSigningFileContents)
    // write(args.verificationKeyFile, verificationKeyFileContents)
  }

  const createVerificationKeyFile = (args: ParsedVerificationKeyArguments) => {
    // TODO
    // console.dir(args)
    // const verificationKeyFileContents = ''

    // write(args.verificationKeyFile, verificationKeyFileContents)
  }

  const createSignedTx = (args: ParsedTransactionSignArguments) => {
    // const network = null // get this from args
    // const txAux = TxAux(args.txBodyFileData.cborHex)
    // const signedTx = cryptoProvider.signTx(txAux, args.hwSigningFileData, network)
    // write(args.outFile, TxSignedOutput(signedTx))
  }

  const createTxWitness = (args: ParsedTransactionWitnessArguments) => {
    // // TODO
    // console.dir(args)
    // const outFileContents = ''

    // write(args.outFile, outFileContents)
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
