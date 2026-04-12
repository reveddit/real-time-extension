import { distPath, zipFile } from './common.js'
import { rimraf } from 'rimraf'
import fs from 'fs'
import path from 'path'

// Delete dist folder *contents* (not the folder itself) so that a shell
// cwd'd inside the dist folder remains valid across rebuilds.
if (fs.existsSync(distPath)) {
  const children = fs.readdirSync(distPath).map(name => path.join(distPath, name))
  await rimraf(children)
}
if (zipFile && fs.existsSync(zipFile)) {
  await rimraf(zipFile)
}