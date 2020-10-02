import parseArgs from './command-parser/commandParser'
import CommandType from './command-parser/types'
import {
  keyGen, transactionSign, transactionWitness, verificationKey,
} from './commandExecutor'

const parsedArgs = parseArgs(process.argv.slice(2))

switch (parsedArgs.command) {
  case (CommandType.KEY_GEN):
    keyGen(parsedArgs)
    break
  case (CommandType.VERIFICATION_KEY):
    verificationKey(parsedArgs)
    break
  case (CommandType.SIGN_TRANSACTION):
    transactionSign(parsedArgs)
    break
  case (CommandType.WITNESS_TRANSACTION):
    transactionWitness(parsedArgs)
    break
  default:
    break
}
