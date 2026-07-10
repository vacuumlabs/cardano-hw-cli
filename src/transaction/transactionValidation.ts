import * as InteropLib from 'cardano-hw-interop-lib'
import {Errors, ExitCode} from '../errors'
import {partition} from '../util'
import {
  ParsedTransactionValidateArguments,
  ParsedTransactionTransformArguments,
  ProtocolParameters,
} from '../command-parser/argTypes'
import {constructTxFileOutput, writeOutputData} from '../fileWriter'
import {containsVKeyWitnesses} from './transaction'
import {CborHex} from '../basicTypes'

/** Unfixable CIP-21 issues permitted when --allow-unrestricted-mode is set (silent, not logged). */
const UNRESTRICTED_MODE_PERMITTED_UNFIXABLE_ISSUES = new Set<string>([
  'If a transaction contains a pool registration certificate, then it must not contain any other certificate',
  'If a transaction contains a pool registration certificate, then it must not contain any withdrawal',
  'If a transaction contains a pool registration certificate, then it must not contain mint entry',
  'If a transaction contains a pool registration certificate, then it must not contain datums and reference scripts in outputs',
  'If a transaction contains a pool registration certificate, then it must not contain script data hash',
  'If a transaction contains a pool registration certificate, then it must not contain collateral inputs',
  'If a transaction contains a pool registration certificate, then it must not contain required signers',
  'If a transaction contains a pool registration certificate, then it must not contain collateral return output',
  'If a transaction contains a pool registration certificate, then it must not contain total collateral',
  'If a transaction contains a pool registration certificate, then it must not contain reference inputs',
  'If a transaction contains a pool registration certificate, then it must not contain voting procedures',
  'If a transaction contains a pool registration certificate, then it must not contain treasury value entry',
  'If a transaction contains a pool registration certificate, then it must not contain treasury donation entry',
  'Only a single voter is allowed in voting procedures',
  'There must be exactly one voting procedure per voter',
])

const isPermittedUnfixableIssue = (
  issue: InteropLib.ValidationError,
): boolean => UNRESTRICTED_MODE_PERMITTED_UNFIXABLE_ISSUES.has(issue.reason)

const splitUnfixableIssues = (
  unfixableIssues: InteropLib.ValidationError[],
  permitListedUnfixableIssues: boolean,
): {
  permittedUnfixableIssues: InteropLib.ValidationError[]
  blockingUnfixableIssues: InteropLib.ValidationError[]
} => {
  if (!permitListedUnfixableIssues) {
    return {
      permittedUnfixableIssues: [],
      blockingUnfixableIssues: unfixableIssues,
    }
  }
  const permittedUnfixableIssues: InteropLib.ValidationError[] = []
  const blockingUnfixableIssues: InteropLib.ValidationError[] = []
  for (const issue of unfixableIssues) {
    if (isPermittedUnfixableIssue(issue)) {
      permittedUnfixableIssues.push(issue)
    } else {
      blockingUnfixableIssues.push(issue)
    }
  }
  return {permittedUnfixableIssues, blockingUnfixableIssues}
}

type CheckValidationErrorsOptions = {
  printIssues?: boolean
  printSuccessMessage?: boolean
  /** When set, listed unfixable CIP-21 issues are ignored silently. */
  permitListedUnfixableIssues?: boolean
}

const checkValidationErrors = (
  cborHex: CborHex,
  validator: (txCbor: Buffer) => InteropLib.ValidationError[],
  printIssuesOrOptions: boolean | CheckValidationErrorsOptions = true,
  printSuccessMessage = false,
): {containsUnfixable: boolean; containsFixable: boolean} => {
  const options: CheckValidationErrorsOptions =
    typeof printIssuesOrOptions === 'boolean'
      ? {
          printIssues: printIssuesOrOptions,
          printSuccessMessage,
        }
      : printIssuesOrOptions
  const {
    printIssues = true,
    printSuccessMessage: printSuccess = false,
    permitListedUnfixableIssues = false,
  } = options

  const cbor = Buffer.from(cborHex, 'hex')
  const validationErrors = validator(cbor)
  const [fixableIssues, unfixableIssues] = partition(
    validationErrors,
    (e) => e.fixable,
  )
  const {blockingUnfixableIssues} = splitUnfixableIssues(
    unfixableIssues,
    permitListedUnfixableIssues,
  )

  const issueGroups = [
    {
      header: 'The transaction contains following unfixable issues:',
      issues: blockingUnfixableIssues,
    },
    {
      header: 'The transaction contains following fixable issues:',
      issues: fixableIssues,
    },
  ]
  issueGroups.forEach(({header, issues}) => {
    if (issues.length > 0 && printIssues) {
      // eslint-disable-next-line no-console
      console.warn(header)
      // eslint-disable-next-line no-console
      issues.forEach((e) => console.warn(`- ${e.reason} (${e.position})`))
    }
  })

  if (validationErrors.length === 0 && printSuccess) {
    // eslint-disable-next-line no-console
    console.log('The transaction CBOR is valid and canonical.')
  }
  return {
    containsUnfixable: blockingUnfixableIssues.length > 0,
    containsFixable: fixableIssues.length > 0,
  }
}

type ValidateTxBeforeWitnessingOptions = {
  allowUnrestrictedMode?: boolean
}

const validateTxBeforeWitnessing = (
  txCborHex: CborHex,
  options?: ValidateTxBeforeWitnessingOptions,
): void => {
  const allowUnrestrictedMode = options?.allowUnrestrictedMode ?? false
  const {containsUnfixable, containsFixable} = checkValidationErrors(
    txCborHex,
    InteropLib.validateTx,
    {
      printIssues: true,
      permitListedUnfixableIssues: allowUnrestrictedMode,
    },
  )

  if (containsUnfixable) {
    throw Error(Errors.TxContainsUnfixableErrors)
  }
  if (containsFixable) {
    throw Error(Errors.TxContainsFixableErrors)
  }
}

const validateTx = (args: ParsedTransactionValidateArguments): ExitCode => {
  const allowUnrestrictedMode = args.allowUnrestrictedMode ?? false
  const {containsUnfixable, containsFixable} = checkValidationErrors(
    args.txFileData.cborHex,
    InteropLib.validateTx,
    {
      printIssues: true,
      printSuccessMessage: true,
      permitListedUnfixableIssues: allowUnrestrictedMode,
    },
  )
  if (containsUnfixable) {
    return ExitCode.UnfixableValidationErrorsFound
  }
  if (containsFixable) return ExitCode.FixableValidationErrorsFound
  return ExitCode.Success
}

const extractCostModels = (
  protocolParams: ProtocolParameters,
): InteropLib.CostModels => {
  const costModels: InteropLib.CostModels = new Map()
  for (const [key, values] of Object.entries(protocolParams.costModels)) {
    if (!InteropLib.PLUTUS_LANGUAGES.find(({name}) => name === key)) {
      throw Error(`Unknown Plutus version in cost models: ${key}`)
    }
    if (!Array.isArray(values) || !values.every((v) => typeof v === 'number')) {
      throw Error(
        `Invalid cost model values for ${key}: expected an array of numbers.`,
      )
    }
    costModels.set(key as InteropLib.CostModelLanguageName, values as number[])
  }
  return costModels
}

const transformTx = (args: ParsedTransactionTransformArguments): void => {
  const allowUnrestrictedMode = args.allowUnrestrictedMode ?? false
  const {containsUnfixable, containsFixable} = checkValidationErrors(
    args.txFileData.cborHex,
    InteropLib.validateTx,
    {
      printIssues: true,
      printSuccessMessage: true,
      permitListedUnfixableIssues: allowUnrestrictedMode,
    },
  )
  if (containsUnfixable) {
    throw Error(Errors.TxContainsUnfixableErrors)
  }
  const txCbor = Buffer.from(args.txFileData.cborHex, 'hex')
  const costModels = args.protocolParamsData
    ? extractCostModels(args.protocolParamsData)
    : undefined
  const usedCostModelLanguages = args.usedCostModelLanguages?.length
    ? (args.usedCostModelLanguages as InteropLib.CostModelLanguageName[])
    : undefined
  const transformedTx = InteropLib.transformTx(
    InteropLib.decodeTx(txCbor),
    costModels,
    usedCostModelLanguages,
  )
  if (containsFixable) {
    if (containsVKeyWitnesses(transformedTx)) {
      throw Error(Errors.CannotTransformSignedTx)
    }
    // eslint-disable-next-line no-console
    console.log('Transformed transaction will be written to the output file.')
  }
  const encodedTx = InteropLib.encodeTx(transformedTx).toString(
    'hex',
  ) as CborHex
  const txFileOutput = constructTxFileOutput(
    args.txFileData.envelopeType,
    args.txFileData.description,
    encodedTx,
  )
  writeOutputData(args.outFile, txFileOutput)
}

export {
  checkValidationErrors,
  extractCostModels,
  isPermittedUnfixableIssue,
  validateTxBeforeWitnessing,
  validateTx,
  transformTx,
}
