import { distPath, zipFile } from './common.js'
import {rimraf} from 'rimraf'

const paths = [distPath]
if (zipFile) {
  paths.push(zipFile)
}
rimraf(paths)