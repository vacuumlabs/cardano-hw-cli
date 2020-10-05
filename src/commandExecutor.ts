/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { write } from './fileWriter'
import {
  ParsedKeyGenArguments,
  ParsedTransactionSignArguments,
  ParsedTransactionWitnessArguments,
  ParsedVerificationKeyArguments,
} from './types'

export const keyGen = (args: ParsedKeyGenArguments) => {
  // TODO
  console.dir(args)
  const hwSigningFileContents = ''
  const verificationKeyFileContents = ''

  write(args.hwSigningFile, hwSigningFileContents)
  write(args.verificationKeyFile, verificationKeyFileContents)
}

export const verificationKey = (args: ParsedVerificationKeyArguments) => {
  // TODO
  console.dir(args)
  const verificationKeyFileContents = ''

  write(args.verificationKeyFile, verificationKeyFileContents)
}

export const transactionSign = (args: ParsedTransactionSignArguments) => {
  // TODO
  console.dir(args)
  const outFileContents = ''

  write(args.outFile, outFileContents)
}

export const transactionWitness = (args: ParsedTransactionWitnessArguments) => {
  // TODO
  console.dir(args)
  const outFileContents = ''

  write(args.outFile, outFileContents)
}
