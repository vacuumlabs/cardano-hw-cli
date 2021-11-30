import * as InteropLib from 'cardano-hw-interop-lib'
import { Errors } from '../errors'
import { partition } from '../util'
import {
  ParsedTransactionValidateRawArguments,
  ParsedTransactionValidateArguments,
  ParsedTransactionTransformRawArguments,
  ParsedTransactionTransformArguments,
  CborHex,
  ExitCode,
} from '../types'
import { constructRawTxFileOutput, constructTxFileOutput, write } from '../fileWriter'
import { containsVKeyWitnesses } from './transaction'

const printValidationErrors = (
  cborHex: CborHex,
  validator: (txCbor: Buffer) => InteropLib.ValidationError[],
  printSuccessMessage: boolean,
): { containsUnfixable: boolean, containsFixable: boolean } => {
  const cbor = Buffer.from(cborHex, 'hex')
  const validationErrors = validator(cbor)
  const [fixableErrors, unfixableErrors] = partition(validationErrors, (e) => e.fixable)
  const errorGroups = [
    { title: 'unfixable', errors: unfixableErrors },
    { title: 'fixable', errors: fixableErrors },
  ]
  errorGroups.forEach(({ title, errors }) => {
    if (errors.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`The transaction contains following ${title} errors:`)
      // eslint-disable-next-line no-console
      errors.forEach((e) => console.log(`- ${e.reason} (${e.position})`))
    }
  })

  if (validationErrors.length === 0 && printSuccessMessage) {
    // eslint-disable-next-line no-console
    console.log('The transaction CBOR is valid and canonical.')
  }
  return { containsUnfixable: unfixableErrors.length > 0, containsFixable: fixableErrors.length > 0 }
}

const validateRawTxBeforeSigning = (rawTxCborHex: CborHex): void => {
  const {
    containsUnfixable, containsFixable,
  } = printValidationErrors(rawTxCborHex, InteropLib.validateRawTx, false)

  if (containsUnfixable) {
    throw Error(Errors.TxContainsUnfixableErrors)
  }
  if (containsFixable) {
    throw Error(Errors.TxContainsFixableErrors)
  }
}

const validateRawTx = (args: ParsedTransactionValidateRawArguments): ExitCode => {
  const {
    containsUnfixable, containsFixable,
  } = printValidationErrors(args.rawTxFileData.cborHex, InteropLib.validateRawTx, true)
  if (containsUnfixable) return ExitCode.UnfixableValidationErrorsFound
  if (containsFixable) return ExitCode.FixableValidationErrorsFound
  return ExitCode.Success
}

const validateTx = (args: ParsedTransactionValidateArguments): ExitCode => {
  const {
    containsUnfixable, containsFixable,
  } = printValidationErrors(args.txFileData.cborHex, InteropLib.validateTx, true)
  if (containsUnfixable) return ExitCode.UnfixableValidationErrorsFound
  if (containsFixable) return ExitCode.FixableValidationErrorsFound
  return ExitCode.Success
}

const transformRawTx = (args: ParsedTransactionTransformRawArguments): void => {
  const {
    containsUnfixable, containsFixable,
  } = printValidationErrors(args.rawTxFileData.cborHex, InteropLib.validateRawTx, true)
  if (containsUnfixable) {
    throw Error(Errors.TxContainsUnfixableErrors)
  }
  if (containsFixable) {
    // eslint-disable-next-line no-console
    console.log('Fixed transaction will be written to the output file.')
  }
  const rawTxCbor = Buffer.from(args.rawTxFileData.cborHex, 'hex')
  const transformedRawTx = InteropLib.transformRawTx(InteropLib.decodeRawTx(rawTxCbor))
  const encodedRawTx = InteropLib.encodeRawTx(transformedRawTx).toString('hex') as CborHex
  write(args.outFile, constructRawTxFileOutput(args.rawTxFileData.era, encodedRawTx))
}

const transformTx = (args: ParsedTransactionTransformArguments): void => {
  const {
    containsUnfixable, containsFixable,
  } = printValidationErrors(args.txFileData.cborHex, InteropLib.validateTx, true)
  if (containsUnfixable) {
    throw Error(Errors.TxContainsUnfixableErrors)
  }
  const txCbor = Buffer.from(args.txFileData.cborHex, 'hex')
  const transformedTx = InteropLib.transformTx(InteropLib.decodeTx(txCbor))
  if (containsFixable) {
    if (containsVKeyWitnesses(transformedTx)) {
      throw Error(Errors.CannotTransformSignedTx)
    }
    // eslint-disable-next-line no-console
    console.log('Fixed transaction will be written to the output file.')
  }
  const encodedTx = InteropLib.encodeTx(transformedTx).toString('hex') as CborHex
  write(args.outFile, constructTxFileOutput(args.txFileData.era, encodedTx))
}

export {
  validateRawTxBeforeSigning,
  validateRawTx,
  validateTx,
  transformRawTx,
  transformTx,
}
