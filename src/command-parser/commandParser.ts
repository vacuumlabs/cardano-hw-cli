import { commandMap } from './commandMap'

const { ArgumentParser } = require('argparse')

const makeParser = () => {
  const initParser = (parser: any, partialCommandMap: any) => {
    const isCommand = (str: string) => !str.startsWith('--')
    const commandType = (parent: string, current: string) => (parent ? `${parent}.${current}` : current)
    const subparsers = parser.add_subparsers()

    Object.keys(partialCommandMap).reduce((acc, key) => {
      if (isCommand(key)) {
        const subparser = acc.add_parser(key)
        subparser.set_defaults({ command: commandType(parser.get_default('command'), key) })
        initParser(subparser, partialCommandMap[key])
      } else {
        parser.add_argument(key, partialCommandMap[key])
      }
      return acc
    }, subparsers)

    return parser
  }

  return initParser(new ArgumentParser({ description: 'Lorem Ipsum (TODO)' }), commandMap)
}

export const parse = (inputArgs: string[]) => makeParser().parse_args(inputArgs)
