// consume() from https://qwtel.com/posts/software/how-to-use-htmlrewriter-for-web-scraping/
// also handy: https://blog.csdn.net/wk3368/article/details/129483898

export const consume = async (stream) => {
  const reader = stream.getReader()
  while (!(await reader.read()).done) { /* NOOP */ }
}

export const oldReddit = 'https://old.reddit.com'
export const newReddit = 'https://www.reddit.com'

export const redditHTMLRequestOptions = {
  headers: {
    'Accept-Language': 'en',
    'Cookie': 'over18=1;',
    'User-Agent': 'reveddit worker 3.0'
  }
}

export class ErrorCollector {
  constructor(url) {
    this.errors = {}
    this.url = url
  }
  addError(error_name) {
    this.errors[error_name] = (this.errors[error_name] || 0) + 1
  }
  printErrors() {
    for (const [field, numErrors] of Object.entries(this.errors)) {
      if (numErrors) {
        console.error('ERROR:', '['+field+']', numErrors, 'times on', this.url)
      }
    }
  }
}
