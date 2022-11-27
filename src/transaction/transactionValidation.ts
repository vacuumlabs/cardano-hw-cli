import * as InteropLib from 'cardano-hw-interop-lib'
import { Errors } from '../errors'
import { partition } from '../util'
import {
  ParsedTransactionValidateArguments,
  ParsedTransactionTransformArguments,
  CborHex,
  ExitCode,
} from '../types'
import { constructTxFileOutput, writeOutputData } from '../fileWriter'
import { containsVKeyWitnesses } from './transaction'

const checkValidationErrors = (
  cborHex: CborHex,
  validator: (txCbor: Buffer) => InteropLib.ValidationError[],
  printErrors: boolean,
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
    if (errors.length > 0 && printErrors) {
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

const validateTxBeforeSigning = (txCborHex: CborHex): void => {
  const {
    containsUnfixable, containsFixable,
  } = checkValidationErrors(txCborHex, InteropLib.validateTx, true, false)

  if (containsUnfixable) {
    throw Error(Errors.TxContainsUnfixableErrors)
  }
  if (containsFixable) {
    throw Error(Errors.TxContainsFixableErrors)
  }
}

const validateTx = (args: ParsedTransactionValidateArguments): ExitCode => {
  const {
    containsUnfixable, containsFixable,
  } = checkValidationErrors(args.txFileData.cborHex, InteropLib.validateTx, true, true)
  if (containsUnfixable) return ExitCode.UnfixableValidationErrorsFound
  if (containsFixable) return ExitCode.FixableValidationErrorsFound
  return ExitCode.Success
}

const transformTx = (args: ParsedTransactionTransformArguments): void => {
  const {
    containsUnfixable, containsFixable,
  } = checkValidationErrors(args.txFileData.cborHex, InteropLib.validateTx, true, true)
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
    console.log('Transformed transaction will be written to the output file.')
  }
  const encodedTx = InteropLib.encodeTx(transformedTx).toString('hex') as CborHex
  const txFileOutput = constructTxFileOutput(
    args.txFileData.envelopeType,
    args.txFileData.description,
    encodedTx,
  )
  writeOutputData(args.outFile, txFileOutput)
}

export {
  checkValidationErrors,
  validateTxBeforeSigning,
  validateTx,
  transformTx,
}
