const fs = require('fs')

export default (path: string, data: string) => fs.writeFileSync(path, data, 'utf8')
