/* eslint-disable no-console */
import { parse } from './command-parser/commandParser'
import { CommandExecutor } from './commandExecutor'
import { Errors } from './errors'
import { CommandType } from './types'

const { version } = require('../package.json')

const executeCommand = async (): Promise<void> => {
  const { parser, parsedArgs } = parse(process.argv)
  if (!Object.values(CommandType).includes(parsedArgs.command)) {
    parser.print_help()
    return
  }

  if (parsedArgs.command === CommandType.APP_VERSION) {
    console.log(`Cardano HW CLI Tool version ${version}`)
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
      throw Error(Errors.UndefinedCommandError)
  }
}

executeCommand().catch((e: Error) => {
  console.log('Error:', e.message)
}).finally(() => process.exit())
