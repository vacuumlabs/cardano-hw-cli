import { ParsedArguments } from '../types'
import { parserConfig } from './parserConfig'

const { ArgumentParser } = require('argparse')

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

// First 2 args are node version and script name
export const parse = (inputArgs: string[]): { parser: any, parsedArgs: ParsedArguments } => {
  const { parser, ...parsedArgs } = makeParser().parse_args(inputArgs.slice(2))
  return { parser, parsedArgs }
}
