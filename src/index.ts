import { parse } from './command-parser/commandParser'
import { CommandExecutor } from './commandExecutor'
import { CommandType } from './types'

const parsedArgs = parse(process.argv)

if (
  parsedArgs.command === CommandType.KEY_GEN
  || parsedArgs.command === CommandType.VERIFICATION_KEY
  || parsedArgs.command === CommandType.SIGN_TRANSACTION
  || parsedArgs.command === CommandType.WITNESS_TRANSACTION
) {
  CommandExecutor().then(async (commandExecutor: any) => {
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
        break
    }
    process.exit()
  })
}
