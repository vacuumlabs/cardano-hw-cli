// import { TrezorCryptoProvider } from './crypto-providers/trezorCryptoProvider'
import { CryptoProvider } from './crypto-providers/types'
import { NETWORKS } from './constants'
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
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

const getCryptoProvider = async () => null as any // TODO

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
