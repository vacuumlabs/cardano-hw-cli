import {ArgumentGroup, ArgumentParser, SubParser} from 'argparse'
import {ParsedArguments} from './argTypes'
import {ParserConfig, parserConfig} from './parserConfig'

const initParser = (
  parser: ArgumentParser | ArgumentGroup,
  config: ParserConfig,
): void => {
  const MUTUALLY_EXCLUSIVE_GROUP_KEY = '_mutually-exclusive-group'
  const isMutuallyExclusiveGroup = (str: string) =>
    str.startsWith(MUTUALLY_EXCLUSIVE_GROUP_KEY)
  const isOneOfGroupRequired = (str: string) =>
    str.startsWith(`${MUTUALLY_EXCLUSIVE_GROUP_KEY}-required`)
  const isCommand = (str: string) =>
    !str.startsWith('--') && !isMutuallyExclusiveGroup(str)
  const commandType = (parent: string, current: string) =>
    parent ? `${parent}.${current}` : current

  const subparsers = 'add_subparsers' in parser ? parser.add_subparsers() : null
  Object.keys(config).forEach((key) => {
    if (isCommand(key)) {
      const subparser = (subparsers as SubParser).add_parser(key)
      subparser.set_defaults({
        command: commandType(parser.get_default('command'), key),
      })
      initParser(subparser, config[key] as ParserConfig)
    } else if (isMutuallyExclusiveGroup(key)) {
      const group = parser.add_mutually_exclusive_group({
        required: isOneOfGroupRequired(key),
      })
      initParser(group, config[key] as ParserConfig)
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

export const parse = (
  inputArgs: string[],
): {parser: ArgumentParser; parsedArgs: ParsedArguments} => {
  const parser = new ArgumentParser({
    description:
      'Command line tool for ledger/trezor/keystone transaction signing',
    prog: 'cardano-hw-cli',
  })
  initParser(parser, parserConfig)
  const {...parsedArgs} = parser.parse_args(preProcessArgs(inputArgs))
  return {parser, parsedArgs}
}
