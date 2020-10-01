import fileReader from '../fileReader/fileReader'
import commandMap from './commandMap'
import { ArgType, CommandType } from './types'

const { ArgumentParser } = require('argparse')

const initParser = (parser: any, partialCommandMap: any) => {
  const subparsers = parser.add_subparsers()

  Object.keys(partialCommandMap).reduce((acc, key) => {
    if (key.startsWith('--')) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { argType, ...config } = partialCommandMap[key]
      parser.add_argument(key, config)
    } else {
      const subparser = acc.add_parser(key)
      initParser(subparser, partialCommandMap[key])
    }
    return acc
  }, subparsers)

  return parser
}

const getCommandType = (inputArgs: string[]) => inputArgs
  .reduce((acc, key) => {
    if (key.startsWith('--')) { acc.skip = true }
    return (acc.skip ? acc : { skip: acc.skip, commands: [...acc.commands, key] })
  }, { skip: false, commands: [] as string[] })
  .commands
  .join('.') as CommandType

const readFiles = async (inputArgs: string[]) => {
  try {
    const parser = initParser(new ArgumentParser({ description: 'Lorem Ipsum (TODO)' }), commandMap)
    const args = inputArgs ? parser.parse_args(inputArgs) : parser.parse_args()
    const config = inputArgs
      .reduce((acc, key) => (key in acc && !key.startsWith('--') ? acc[key] : acc), commandMap)
    return {
      command: getCommandType(inputArgs),
      args: await Object
        .keys(args)
        .filter((key) => args[key] !== undefined)
        .reduce(async (accPromise: Promise<any>, keyInUnderscoreCase) => {
          const acc = await accPromise
          const value = args[keyInUnderscoreCase]
          const key = `--${keyInUnderscoreCase.replace(/_/g, '-')}`
          if (config[key].argType === ArgType.FileInput) {
            acc[key] = await (
              Array.isArray(value)
                ? Promise.all(value.map((e: string) => fileReader(key, e)))
                : fileReader(key, value)
            )
          } else acc[key] = value
          return acc
        }, Promise.resolve({})),
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e.message)
    return { command: getCommandType(inputArgs) }
  }
}

export default readFiles
