const fs = require('fs')

export const write = (path: string, data: string) => fs.writeFileSync(path, data, 'utf8')
