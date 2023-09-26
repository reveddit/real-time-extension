import {readFile, writeFile} from 'fs'
import { distPath, __filename, __dirname } from './common.js'
import path from "path"

const background_file = path.join(distPath, 'background.js')

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

