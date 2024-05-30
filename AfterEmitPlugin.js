import { replaceBackgroundFile } from './common.js'


class AfterEmitPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('AfterEmitPlugin', () => {
      replaceBackgroundFile()
    });
  }
}

export default AfterEmitPlugin
