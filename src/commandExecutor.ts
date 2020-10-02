/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { read, readMultiple, readOptional } from './fileReader'
import { write } from './fileWriter'

export const keyGen = (args: any) => {
  // TODO
  console.log(args)
  const hwSigningFileContents = ''
  const verificationKeyFileContents = ''

  write(args.hw_signing_file, hwSigningFileContents)
  write(args.verification_key_file, verificationKeyFileContents)
}

export const verificationKey = (args: any) => {
  const hwSigningFileContents = read('--hw-signing-file', args.hw_signing_file)

  // TODO
  console.log(args)
  console.log(hwSigningFileContents)
  const verificationKeyFileContents = ''

  write(args.verification_key_file, verificationKeyFileContents)
}

export const transactionSign = (args: any) => {
  const txBodyFileContents = read('--tx-body-file', args.tx_body_file)
  const hwSigningFilesContents = readMultiple('--hw-signing-file', args.hw_signing_file)
  const changeOutputKeyFile = readOptional('--change-output-key-file', args.change_output_key_file)

  // TODO
  console.log(args)
  console.log(txBodyFileContents)
  console.log(hwSigningFilesContents)
  console.log(changeOutputKeyFile)
  const outFileContents = ''

  write(args.out_file, outFileContents)
}

export const transactionWitness = (args: any) => {
  const txBodyFileContents = read('--tx-body-file', args.tx_body_file)
  const hwSigningFilesContents = readMultiple('--hw-signing-file', args.hw_signing_file)
  const changeOutputKeyFile = readOptional('--change-output-key-file', args.change_output_key_file)

  // TODO
  console.log(args)
  console.log(txBodyFileContents)
  console.log(hwSigningFilesContents)
  console.log(changeOutputKeyFile)
  const outFileContents = ''

  write(args.out_file, outFileContents)
}
