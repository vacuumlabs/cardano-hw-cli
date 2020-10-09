import { parse } from './command-parser/commandParser'
import { CommandExecutor } from './commandExecutor'
import { CommandType } from './types'

const parsedArgs = parse(process.argv)
CommandExecutor().then((commandExecutor: any) => {
  switch (parsedArgs.command) {
    case (CommandType.KEY_GEN):
      commandExecutor.createSigningKeyFile(parsedArgs)
      break
    case (CommandType.VERIFICATION_KEY):
      commandExecutor.createVerificationKeyFile(parsedArgs)
      break
    case (CommandType.SIGN_TRANSACTION):
      commandExecutor.createSignedTx(parsedArgs)
      break
    case (CommandType.WITNESS_TRANSACTION):
      commandExecutor.createTxWitness(parsedArgs)
      break
    default:
      break
  }
})
