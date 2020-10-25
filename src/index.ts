/* eslint-disable no-console */
import { parse } from './command-parser/commandParser'
import { CommandExecutor } from './commandExecutor'
import { getErrorTranslation } from './errors'
import NamedError from './namedError'
import { CommandType } from './types'

const executeCommand = async (): Promise<void> => {
  const { parser, parsedArgs } = parse(process.argv)
  if (!Object.values(CommandType).includes(parsedArgs.command)) {
    parser.print_help()
    return
  }
  const commandExecutor = await CommandExecutor()
  switch (parsedArgs.command) {
    case (CommandType.DEVICE_VERSION):
      await commandExecutor.printVersion()
      break
    case (CommandType.SHOW_ADDRESS):
      await commandExecutor.showAddress(parsedArgs)
      break
    case (CommandType.KEY_GEN):
      await commandExecutor.createSigningKeyFile(parsedArgs)
      break
    case (CommandType.VERIFICATION_KEY):
      await commandExecutor.createVerificationKeyFile(parsedArgs)
      break
    case (CommandType.SIGN_TRANSACTION):
      await commandExecutor.createSignedTx(parsedArgs)
      break
    case (CommandType.WITNESS_TRANSACTION):
      await commandExecutor.createTxWitness(parsedArgs)
      break
    default:
      throw NamedError('UndefinedCommandError')
  }
}

executeCommand().catch((e) => {
  console.log(getErrorTranslation(e))
  console.log(e.stack)
}).finally(() => process.exit())
