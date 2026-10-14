import fs from 'node:fs'
import path from 'node:path'

let _dataDirectory: string | undefined

export function getDataDirectory(): string {
    if (_dataDirectory) return _dataDirectory

    const directory = process.env.DATA_DIR?.trim()
        ? path.resolve(process.env.DATA_DIR)
        : path.resolve(process.cwd(), '..', 'data')

    try {
        fs.mkdirSync(directory, { recursive: true })
        fs.accessSync(directory, fs.constants.W_OK)
    } catch (error) {
        throw new Error(`Data directory [${directory}] is not writable`, {
            cause: error,
        })
    }

    _dataDirectory = directory
    return directory
}
