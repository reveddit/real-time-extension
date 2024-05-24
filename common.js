import path from "path"
import { fileURLToPath } from 'url'
import {readFile, writeFile} from 'fs'

let folderName = 'dist-'
let zipName
const isProduction = process.env.NODE_ENV === 'production'
const browser = process.env.BROWSER

if (! isProduction) {
    folderName += 'dev-'
} else if (process.env.STAGING) {
    folderName += 'staging-'
}
if (browser) {
    folderName += browser
    if (isProduction) {
        zipName=browser+'.zip'
    }
} else {
    folderName += 'unknown'
}

export const __filename = fileURLToPath(import.meta.url)

export const __dirname = path.dirname(__filename)

export const distPath = path.join(__dirname, folderName)

export const zipFile = zipName ? path.join(__dirname, zipName) : ''

const background_file = path.join(distPath, 'background.js')

export const replaceBackgroundFile = () => {

    readFile(background_file, 'utf-8', function (err, contents) {
      if (err) {
        console.log(err);
        return;
      }
  
      const replaced = contents.replace(/ *document.baseURI *\|\|/g, '');
  
      writeFile(background_file, replaced, 'utf-8', function (err) {
        console.log(err);
      });
    });
  }
  