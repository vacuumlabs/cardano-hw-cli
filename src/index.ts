/* eslint-disable no-console */
import { CommandType, parse } from './command-parser/commandParser'
import { parseAppVersion } from './command-parser/parsers'
import { CommandExecutor } from './commandExecutor'
import { Errors } from './errors'

const executeCommand = async (): Promise<void> => {
  const { parser, parsedArgs } = parse(process.argv)
  if (!Object.values(CommandType).includes(parsedArgs.command)) {
    parser.print_help()
    return
  }

  if (parsedArgs.command === CommandType.APP_VERSION) {
    const { version, commit } = parseAppVersion()
    console.log(`Cardano HW CLI Tool version ${version}`)
    if (commit) console.log(`Commit hash: ${commit}`)
    return
  }

  const commandExecutor = await CommandExecutor()
  switch (parsedArgs.command) {
    case (CommandType.DEVICE_VERSION):
      await commandExecutor.printDeviceVersion()
      break
    case (CommandType.SHOW_ADDRESS):
      await commandExecutor.showAddress(parsedArgs)
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
    case (CommandType.VALIDATE_RAW_TRANSACTION):
      await commandExecutor.validateRawTx(parsedArgs)
      break
    case (CommandType.VALIDATE_TRANSACTION):
      await commandExecutor.validateTx(parsedArgs)
      break
    case (CommandType.TRANSFORM_RAW_TRANSACTION):
      await commandExecutor.transformRawTx(parsedArgs)
      break
    case (CommandType.TRANSFORM_TRANSACTION):
      await commandExecutor.transformTx(parsedArgs)
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
}

executeCommand()
  .then(() => process.exit(0))
  .catch((e: Error) => {
    console.error('Error:', e.message)
    process.exit(1)
  })
