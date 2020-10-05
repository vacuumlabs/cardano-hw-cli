import { parse } from './command-parser/commandParser'
import {
  keyGen, transactionSign, transactionWitness, verificationKey,
} from './commandExecutor'
import { CommandType } from './types'

const parsedArgs = parse(process.argv.slice(2))

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
