// The browser keeps a popup shut until its page has finished loading, so a page's
// bundles load only after that: a slow start shows the placeholder in the page's
// HTML, not a button that seems to do nothing. The timer lets the browser count
// the page as loaded first.
const page = (document.currentScript as HTMLScriptElement).dataset.page

addEventListener('load', () =>
    setTimeout(() => {
        for (const name of ['vendor', page]) {
            const script = document.createElement('script')
            script.src = `${name}.js`
            script.async = false
            document.body.append(script)
        }
    }),
)

export {}
