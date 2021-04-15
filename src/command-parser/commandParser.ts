import { ParsedArguments } from '../types'
import { parserConfig } from './parserConfig'

const { ArgumentParser } = require('argparse')

export enum CommandType {
  APP_VERSION = 'version',
  DEVICE_VERSION = 'device.version',
  SHOW_ADDRESS = 'address.show',
  ADDRESS_KEY_GEN = 'address.key-gen',
  VERIFICATION_KEY = 'key.verification-key',
  SIGN_TRANSACTION = 'transaction.sign',
  WITNESS_TRANSACTION = 'transaction.witness',
  SIGN_OPERATIONAL_CERTIFICATE = 'node.issue-op-cert',
  NODE_KEY_GEN = 'node.key-gen',
  CATALYST_VOTING_KEY_REGISTRATION_METADATA = 'catalyst.voting-key-registration-metadata',
}

const makeParser = () => {
  const initParser = (parser: any, config: any) => {
    const isCommand = (str: string) => !str.startsWith('--')
    const commandType = (parent: string, current: string) => (parent ? `${parent}.${current}` : current)
    parser.set_defaults({ parser })
    const subparsers = parser.add_subparsers()

    Object.keys(config).reduce((acc, key) => {
      if (isCommand(key)) {
        const subparser = acc.add_parser(key)
        subparser.set_defaults({ command: commandType(parser.get_default('command'), key) })
        initParser(subparser, config[key])
      } else {
        parser.add_argument(key, config[key])
      }
      return acc
    }, subparsers)

    return parser
  }

  return initParser(new ArgumentParser(
    {
      description: 'Command line tool for ledger/trezor transaction signing',
      prog: 'cardano-hw-cli',
    },
  ), parserConfig)
}

const preProcessArgs = (inputArgs: string[]) => {
  // First 2 args are node version and script name
  const commandArgs = inputArgs.slice(2)
  if (commandArgs[0] === 'shelley') {
    return commandArgs.slice(1)
  }
  return commandArgs
}

export const parse = (inputArgs: string[]): { parser: any, parsedArgs: ParsedArguments } => {
  const { parser, ...parsedArgs } = makeParser().parse_args(preProcessArgs(inputArgs))
  return { parser, parsedArgs }
}
