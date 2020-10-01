/* eslint-disable no-console */
import parseArgs from './command-parser/commandParser'

parseArgs(process.argv.slice(2))
  .then((e) => console.log(JSON.stringify(e)))
  .catch((e) => console.log(e.message))
