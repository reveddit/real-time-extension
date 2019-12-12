const webpack = require("webpack")
const path = require("path")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const ExtensionReloader  = require("webpack-extension-reloader")

function getDistFolderName (mode, forChrome, forFirefox) {
    let folderName = 'dist-'

    if (mode === 'development') {
        folderName += 'dev-'
    }
    if (forChrome) {
        return folderName + 'chrome'
    } else if (forFirefox) {
        return folderName + 'firefox'
    } else {
        return folderName + 'unknown'
    }
}

const mode = process.env.NODE_ENV
const hot_reload = process.env.HOT_RELOAD === 'true'
const distFolder = getDistFolderName(mode, process.env.FORCHROME, process.env.FORFIREFOX)
const distPath = path.join(__dirname, distFolder)
const distSrcPath = path.join(distPath, 'src')
const distLibPath = path.join(distPath, 'lib')

let built_for = '"chrome"'
if (process.env.FORFIREFOX) {
    built_for = '"firefox"'
}

const manifestPath = path.join(distPath,
                              'manifest.json')

function modify(buffer) {
    // copy-webpack-plugin passes a buffer
    // this line, buffer.toString(), causes this error if this filename ends in babel.js:
    //     Cannot find module 'core-js/modules/es.object.to-string'
    // maybe babel converts it incorrectly?
    var manifest = JSON.parse(buffer.toString());
    if (process.env.FORCHROME) {
        manifest.incognito = 'split'
    }
    if (process.env.FORFIREFOX) {
        let id = 'real-time-stable@reveddit.com'
        manifest.browser_specific_settings = {
            "gecko": { id }
        }
    }
    if (mode === 'development') {
        manifest.permissions.push("http://localhost/*")
        manifest.content_scripts[0].matches.push("http://localhost/*")
    }
    // pretty print to JSON with two spaces
    return JSON.stringify(manifest, null, 2);
}

const plugins = [
    new CopyWebpackPlugin([
        {
            from: "./src/manifest.json",
            to:   distPath,
            // from https://stackoverflow.com/a/54700817/2636364
            transform (content, path) {
                return modify(content)
            }
        },
        { from: "src/icons", to: path.join(distPath, 'icons') },
        { context: 'src/src/', from: "*.html", to: distSrcPath },
        { context: 'src/src/', from: "*.css", to: distSrcPath },
        { context: 'lib/', from: "*", to: distLibPath },
        { context: 'node_modules/webextension-polyfill/dist/', from: 'browser-polyfill.js*', to: distLibPath },
        { context: 'node_modules/arrive/src/', from: 'arrive.js', to: distLibPath }
    ]),
    new webpack.DefinePlugin({
        __BUILT_FOR__: built_for
    })
]

const contentScripts = {
    common: './src/src/common.js',
    content: './src/src/content.js',
    'content-reddit': './src/src/content-reddit.js',
    'content-revddit': './src/src/content-revddit.js',
    'content-common': './src/src/content-common.js',
    contextMenus: './src/src/contextMenus.js',
    requests: './src/src/requests.js',
    storage: './src/src/storage.js'
}

const extensionPages = {
    options: './src/src/options.js',
    popup: './src/src/popup.js',
    history: './src/src/history.js',
    other: './src/src/other.js'
}

if (hot_reload) {
    plugins.push(new ExtensionReloader({
        port: 9123,
        reloadPage: true,
        entries: {
          contentScript: Object.keys(contentScripts),
          extensionPage: Object.keys(extensionPages),
          background: 'background'
        }
    }))
}

module.exports = {
    mode,
    // overriding `devtool` default to, for example, 'inline-source-map',
    // prevents webpack from using 'eval' statements when mode = development.
    //   - useful for extensions b/c browsers' "Content Security Policy (CSP)"
    //     suggests not using eval statements
    devtool: "inline-source-map",
    entry: {
        background: './src/src/background.js',
        ...contentScripts,
        ...extensionPages
    },
    output: {
        path: distSrcPath,
        filename: "[name].js"
    },
    plugins,
    module: {
        rules: [
            {
                test: /\.js?$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [require("@babel/preset-env")]
                    }
                }
            }
        ]
    }
}
