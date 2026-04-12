import { distPath, __filename, __dirname } from './common.js'
import webpack from "webpack"
import path from "path"
import CopyWebpackPlugin from "copy-webpack-plugin"
import babel_preset from "@babel/preset-env"
import TerserPlugin from 'terser-webpack-plugin'
import ExtReloader from 'webpack-ext-reloader'
import AfterEmitPlugin from './AfterEmitPlugin.js'

const mode = process.env.NODE_ENV
const distSrcPath = path.join(distPath, 'src')

let built_for = '"chrome"', chromelike = true
const browserIsFirefox = process.env.BROWSER === 'firefox'
if (browserIsFirefox) {
    built_for = '"firefox"'
    chromelike = false
}

const manifestPath = path.join(distPath,
                              'manifest.json')

function modify(buffer) {
    // copy-webpack-plugin passes a buffer
    // this line, buffer.toString(), causes this error if this filename ends in babel.js:
    //     Cannot find module 'core-js/modules/es.object.to-string'
    // maybe babel converts it incorrectly?
    var manifest = JSON.parse(buffer.toString());
    let host_permissions_location = 'host_permissions'
    if (chromelike) {
        manifest.incognito = 'split'
    }

    if (process.env.BROWSER === 'edge') {
        manifest.update_url = 'https://edge.microsoft.com/extensionwebstorebase/v1/crx'
    } else if (browserIsFirefox) {
        host_permissions_location = 'permissions'
        let id = 'real-time-stable@reveddit.com'
        manifest.browser_specific_settings = {
            "gecko": { id }
        }
        manifest.permissions.push(
            'activeTab', 'webRequest', 'webRequestBlocking',
            'https://*.reddit.com/*', 'https://*.reveddit.com/*',
        )
        delete manifest.host_permissions
        delete manifest.externally_connectable
        manifest.manifest_version = 2
        manifest.background.scripts = [manifest.background.service_worker]
        manifest.background.persistent = true
        delete manifest.background.service_worker
        delete Object.assign(manifest, {browser_action: manifest.action }).action
        manifest.web_accessible_resources = manifest.web_accessible_resources[0].resources
        manifest.content_security_policy = manifest.content_security_policy.extension_pages
    }
    if (mode === 'development' || process.env.STAGING) {
		const localhostPattern = browserIsFirefox ? "http://localhost/*" : "http://localhost:*/*"
		manifest[host_permissions_location].push(localhostPattern)
		manifest.content_scripts[0].matches.push(localhostPattern)
        if (manifest.externally_connectable && manifest.externally_connectable.matches) {
            manifest.externally_connectable.matches.push(localhostPattern)
        }
    }
    // pretty print to JSON with two spaces
    return JSON.stringify(manifest, null, 2);
}
const contentScripts = {
    common: './src/src/common.ts',
    content: ['@babel/polyfill', './src/src/content.ts'],
    'content-reddit': './src/src/content-reddit.ts',
    'content-revddit': './src/src/content-revddit.ts',
    'content-common': './src/src/content-common.ts',
    contextMenus: './src/src/contextMenus.ts',
    requests: './src/src/requests.ts',
    storage: './src/src/storage.ts'
}
const extensionPages = {
    options: ['@babel/polyfill', './src/src/options.tsx'],
    popup: ['@babel/polyfill', './src/src/popup.tsx'],
    history: ['@babel/polyfill', './src/src/history.tsx'],
    other: ['@babel/polyfill', './src/src/other.tsx'],
    welcome: ['@babel/polyfill', './src/src/welcome.tsx'],
    whatsnew: ['@babel/polyfill', './src/src/whatsnew.tsx'],
    parse: ['@babel/polyfill', './src/src/parse_html/common.ts', './src/src/parse_html/old.ts'],
}


const plugins = [
   new CopyWebpackPlugin({ patterns: [
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
        { context: 'src/src/', from: "content.css", to: distSrcPath },
    ]}),
    new webpack.DefinePlugin({
        __BUILT_FOR__: built_for
    }),
    new AfterEmitPlugin(),
]

if (process.argv.indexOf("--watch") >= 0 && mode !== 'production') {
  plugins.unshift(
    new ExtReloader({
        //manifest: manifestPath,
        // must specify content scripts manually. Setting 'manifest' does not work, per:
        // https://github.com/SimplifyJobs/webpack-ext-reloader/issues/479
        entries: {
            contentScript: Object.keys(contentScripts),
            background: 'background',
            extensionPage: Object.keys(extensionPages)
        },
    })
  )
}

export default {
    mode,
    // overriding `devtool` default to, for example, 'inline-source-map',
    // prevents webpack from using 'eval' statements when mode = development.
    //   - useful for extensions b/c browsers' "Content Security Policy (CSP)"
    //     suggests not using eval statements
    devtool: "inline-source-map",
    optimization: {
        minimizer: [new TerserPlugin({
          extractComments: false,
        })],
    },
    entry: {
        background: ['@babel/polyfill', './src/background.ts'],
        ...contentScripts,
        ...extensionPages
    },
    output: {
        path: distPath,
        filename: (pathData) => {
            const filename = '[name].js'
            if (pathData.chunk.name !== 'background') {
                return 'src/'+filename
            } else {
                return filename
            }
        }
    },
    plugins,
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'ts-loader',
                    options: { transpileOnly: true }
                }
            },
            {
                test: /\.js?$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [babel_preset]
                    }
                }
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    }
}
