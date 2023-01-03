/* eslint-disable no-console */
import { CommandType, parse } from './command-parser/commandParser'
import { parseAppVersion } from './command-parser/parsers'
import { CommandExecutor } from './commandExecutor'
import { Errors } from './errors'
import {
  transformRawTx,
  transformTx,
  validateRawTx,
  validateTx,
} from './transaction/transactionValidation'
import { ExitCode } from './types'

const executeCommand = async (): Promise<ExitCode> => {
  const { parser, parsedArgs } = parse(process.argv)
  if (!Object.values(CommandType).includes(parsedArgs.command)) {
    parser.print_help()
    return ExitCode.Success
  }

  const { version, commit } = parseAppVersion()

  // calls that don't need a cryptoProvider
  switch (parsedArgs.command) {
    case (CommandType.APP_VERSION):
      console.log(`Cardano HW CLI Tool version ${version}`)
      if (commit) console.log(`Commit hash: ${commit}`)
      return ExitCode.Success
    case (CommandType.VALIDATE_RAW_TRANSACTION):
      return validateRawTx(parsedArgs)
    case (CommandType.VALIDATE_TRANSACTION):
      return validateTx(parsedArgs)
    case (CommandType.TRANSFORM_RAW_TRANSACTION):
      transformRawTx(parsedArgs)
      return ExitCode.Success
    case (CommandType.TRANSFORM_TRANSACTION):
      transformTx(parsedArgs)
      return ExitCode.Success
    default:
      break
  }

  const commandExecutor = await CommandExecutor()
  switch (parsedArgs.command) {
    case (CommandType.DEVICE_VERSION):
      await commandExecutor.printDeviceVersion()
      break
    case (CommandType.SHOW_ADDRESS):
      await commandExecutor.showAddress(parsedArgs)
      break
    case (CommandType.PUBKEY_QUERY):
      await commandExecutor.printPubkeys(parsedArgs)
      break
    case (CommandType.ADDRESS_KEY_GEN):
      await commandExecutor.createSigningKeyFile(parsedArgs)
      break
    case (CommandType.VERIFICATION_KEY):
      await commandExecutor.createVerificationKeyFile(parsedArgs)
      break
    case (CommandType.SIGN_TRANSACTION):
      await commandExecutor.createSignedTx(parsedArgs)
      break
    case (CommandType.DERIVE_NATIVE_SCRIPT_HASH):
      await commandExecutor.createTxPolicyId(parsedArgs)
      break
    case (CommandType.WITNESS_TRANSACTION):
      await commandExecutor.createTxWitnesses(parsedArgs)
      break
    case (CommandType.NODE_KEY_GEN):
      await commandExecutor.createNodeSigningKeyFiles(parsedArgs)
      break
    case (CommandType.SIGN_OPERATIONAL_CERTIFICATE):
      await commandExecutor.createSignedOperationalCertificate(parsedArgs)
      break
    case (CommandType.CATALYST_VOTING_KEY_REGISTRATION_METADATA):
      await commandExecutor.createCatalystVotingKeyRegistrationMetadata(parsedArgs)
      break
    default:
      throw Error(Errors.UndefinedCommandError)
  }

  return ExitCode.Success
}

executeCommand()
  .then((exitCode: ExitCode) => process.exit(exitCode))
  .catch((e: Error) => {
    console.error('Error:', e.message)
    process.exit(ExitCode.Error)
  })
