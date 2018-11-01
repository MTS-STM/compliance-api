const { promises: fs, constants: fsConstants } = require('fs')
const { parse, join } = require('path')

const getChecks = async (path = '/checks') => {
  try {
    let access = await fs.access(path, fsConstants.R_OK)
  } catch ({ message }) {
    throw new Error(`Checks directory isn't a readable directory: ${message}`)
  }
  let files = await fs.readdir(path)
  let jsonFiles = files.map(f => join(path, f.match(/.json$/).input))
  let checks = await Promise.all(
    jsonFiles.map(file => fs.readFile(file, { encoding: 'utf-8' })),
  )

  return checks.map(c => JSON.parse(c))
}
module.exports.getChecks = getChecks
