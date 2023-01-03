import { ArgumentGroup, ArgumentParser, SubParser } from 'argparse'
import { ParsedArguments } from '../types'
import { parserConfig } from './parserConfig'

export enum CommandType {
  APP_VERSION = 'version',
  DEVICE_VERSION = 'device.version',
  SHOW_ADDRESS = 'address.show',
  ADDRESS_KEY_GEN = 'address.key-gen',
  VERIFICATION_KEY = 'key.verification-key',
  SIGN_TRANSACTION = 'transaction.sign',
  WITNESS_TRANSACTION = 'transaction.witness',
  VALIDATE_RAW_TRANSACTION = 'transaction.validate-raw',
  VALIDATE_TRANSACTION = 'transaction.validate',
  TRANSFORM_RAW_TRANSACTION = 'transaction.transform-raw',
  TRANSFORM_TRANSACTION = 'transaction.transform',
  DERIVE_NATIVE_SCRIPT_HASH = 'transaction.policyid',
  SIGN_OPERATIONAL_CERTIFICATE = 'node.issue-op-cert',
  NODE_KEY_GEN = 'node.key-gen',
  CATALYST_VOTING_KEY_REGISTRATION_METADATA = 'catalyst.voting-key-registration-metadata',
  PUBKEY_QUERY = 'pubkey.query',
}

const initParser = (parser: ArgumentParser | ArgumentGroup, config: any): void => {
  const MUTUALLY_EXCLUSIVE_GROUP_KEY = '_mutually-exclusive-group'
  const isMutuallyExclusiveGroup = (str: string) => str.startsWith(MUTUALLY_EXCLUSIVE_GROUP_KEY)
  const isOneOfGroupRequired = (str: string) => str.startsWith(`${MUTUALLY_EXCLUSIVE_GROUP_KEY}-required`)
  const isCommand = (str: string) => !str.startsWith('--') && !isMutuallyExclusiveGroup(str)
  const commandType = (parent: string, current: string) => (parent ? `${parent}.${current}` : current)

  const subparsers = 'add_subparsers' in parser ? parser.add_subparsers() : null
  Object.keys(config).forEach((key) => {
    if (isCommand(key)) {
      const subparser = (subparsers as SubParser).add_parser(key)
      subparser.set_defaults({ command: commandType(parser.get_default('command'), key) })
      initParser(subparser, config[key])
    } else if (isMutuallyExclusiveGroup(key)) {
      const group = parser.add_mutually_exclusive_group({ required: isOneOfGroupRequired(key) })
      initParser(group, config[key])
    } else {
      parser.add_argument(key, config[key])
    }
  })
}

const preProcessArgs = (inputArgs: string[]): string[] => {
  // First 2 args are node version and script name
  const commandArgs = inputArgs.slice(2)
  if (commandArgs[0] === 'shelley') {
    return commandArgs.slice(1)
  }
  return commandArgs
}

export const parse = (inputArgs: string[]): { parser: ArgumentParser, parsedArgs: ParsedArguments } => {
  const parser = new ArgumentParser({
    description: 'Command line tool for ledger/trezor transaction signing',
    prog: 'cardano-hw-cli',
  })
  initParser(parser, parserConfig)
  const { ...parsedArgs } = parser.parse_args(preProcessArgs(inputArgs))
  return { parser, parsedArgs }
}
