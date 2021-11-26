import * as InteropLib from 'cardano-hw-interop-lib'
import { Errors } from '../errors'
import { CborHex } from '../types'
import { partition } from '../util'

export const printValidationErrors = (
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
      errors.forEach((e) => console.log(`  ${e.reason} (${e.position})`))
    }
  })

  if (validationErrors.length === 0 && printSuccessMessage) {
    // eslint-disable-next-line no-console
    console.log('The transaction CBOR is valid and canonical.')
  }
  return { containsUnfixable: unfixableErrors.length > 0, containsFixable: fixableErrors.length > 0 }
}

export const validateRawTxBeforeSigning = (rawTxCborHex: CborHex): void => {
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
