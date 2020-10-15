import { parse } from './command-parser/commandParser'
import { CommandExecutor } from './commandExecutor'
import { getErrorTranslation } from './errors'
import { CommandType, ParsedArguments } from './types'

const executeCommand = async (parsedArgs: ParsedArguments) => {
  if (
    parsedArgs.command === CommandType.KEY_GEN
    || parsedArgs.command === CommandType.VERIFICATION_KEY
    || parsedArgs.command === CommandType.SIGN_TRANSACTION
    || parsedArgs.command === CommandType.WITNESS_TRANSACTION
  ) {
    const commandExecutor = await CommandExecutor()
    switch (parsedArgs.command) {
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
        throw Error('UndefinedCommand')
    }
  }
}

const parsedArgs = parse(process.argv)

executeCommand(parsedArgs).catch((e) => {
  // eslint-disable-next-line no-console
  console.log(e)
  console.log(getErrorTranslation(e))
  // get help for command
}).finally(() => {
  process.exit()
})
