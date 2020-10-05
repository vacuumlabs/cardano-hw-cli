import { parserConfig } from './parserConfig'

const { ArgumentParser } = require('argparse')

const makeParser = () => {
  const initParser = (parser: any, config: any) => {
    const isCommand = (str: string) => !str.startsWith('--')
    const commandType = (parent: string, current: string) => (parent ? `${parent}.${current}` : current)
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

  return initParser(new ArgumentParser({ description: 'Lorem Ipsum (TODO)' }), parserConfig)
}

export const parse = (inputArgs: string[]) => makeParser().parse_args(inputArgs)
