const fs = require('fs')

export default (data: string, path: string) => fs.writeFileSync(path, data, 'utf8')
