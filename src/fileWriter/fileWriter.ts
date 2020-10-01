import { promises as fs } from 'fs'

export default async (data: string, path: string) => fs.writeFile(path, data, 'utf8')
