/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { write } from './fileWriter'

export const keyGen = (args: any) => {
  // TODO
  console.dir(args)
  const hwSigningFileContents = ''
  const verificationKeyFileContents = ''

  write(args.hw_signing_file, hwSigningFileContents)
  write(args.verification_key_file, verificationKeyFileContents)
}

export const verificationKey = (args: any) => {
  // TODO
  console.dir(args)
  const verificationKeyFileContents = ''

  write(args.verification_key_file, verificationKeyFileContents)
}

export const transactionSign = (args: any) => {
  // TODO
  console.dir(args)
  const outFileContents = ''

  write(args.out_file, outFileContents)
}

export const transactionWitness = (args: any) => {
  // TODO
  console.dir(args)
  const outFileContents = ''

  write(args.out_file, outFileContents)
}
