/* eslint-disable no-console */
import {CommandType} from './command-parser/argTypes'
import {parse} from './command-parser/commandParser'
import {parseAppVersion} from './command-parser/parsers'
import {CommandExecutor} from './commandExecutor'
import {Errors, ExitCode} from './errors'
import {transformTx, validateTx} from './transaction/transactionValidation'

const executeCommand = async (): Promise<ExitCode> => {
  const {parser, parsedArgs} = parse(process.argv)
  if (!Object.values(CommandType).includes(parsedArgs.command)) {
    parser.print_help()
    return ExitCode.Success
  }

  const {version, commit} = parseAppVersion()

  // calls that don't need a cryptoProvider
  switch (parsedArgs.command) {
    case CommandType.APP_VERSION:
      console.log(`Cardano HW CLI Tool version ${version}`)
      if (commit) console.log(`Commit hash: ${commit}`)
      return ExitCode.Success
    case CommandType.VALIDATE_TRANSACTION:
      return validateTx(parsedArgs)
    case CommandType.TRANSFORM_TRANSACTION:
      transformTx(parsedArgs)
      return ExitCode.Success
    default:
      break
  }

  const commandExecutor = await CommandExecutor()
  switch (parsedArgs.command) {
    case CommandType.DEVICE_VERSION:
      await commandExecutor.printDeviceVersion()
      break
    case CommandType.SHOW_ADDRESS:
      await commandExecutor.showAddress(parsedArgs)
      break
    case CommandType.ADDRESS_KEY_GEN:
      await commandExecutor.createSigningKeyFile(parsedArgs)
      break
    case CommandType.VERIFICATION_KEY:
      await commandExecutor.createVerificationKeyFile(parsedArgs)
      break
    case CommandType.DERIVE_NATIVE_SCRIPT_HASH:
      await commandExecutor.createTxPolicyId(parsedArgs)
      break
    case CommandType.WITNESS_TRANSACTION:
      await commandExecutor.createTxWitnesses(parsedArgs)
      break
    case CommandType.NODE_KEY_GEN:
      await commandExecutor.createNodeSigningKeyFiles(parsedArgs)
      break
    case CommandType.SIGN_OPERATIONAL_CERTIFICATE:
      await commandExecutor.createSignedOperationalCertificate(parsedArgs)
      break
    case CommandType.CIP36_REGISTRATION_METADATA:
      await commandExecutor.createCIP36RegistrationMetadata(parsedArgs)
      break
    case CommandType.SIGN_MESSAGE:
      await commandExecutor.createSignedMessage(parsedArgs)
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
