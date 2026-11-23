import fs from 'fs'
import { distPath, __filename, __dirname } from './common.js'
import webpack from "webpack"
import path from "path"
import CopyWebpackPlugin from "copy-webpack-plugin"
import TerserPlugin from 'terser-webpack-plugin'
import ExtReloader from 'webpack-ext-reloader'
import AfterEmitPlugin from './AfterEmitPlugin.js'
import { parseReleaseHistory } from './release-history.js'

// Every release in the file, for the news page; the popup's "released" card
// shows the manifest's own
const releaseHistory = parseReleaseHistory(fs.readFileSync(path.join(__dirname, 'STORE_DESCRIPTION.txt'), 'utf8'))
const latestRelease = (() => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'manifest.json'), 'utf8'))
  const manifestVersion = manifest.version

  const release = releaseHistory.find(r => r.version === manifestVersion)
  if (!release) {
    throw new Error(
      `STORE_DESCRIPTION.txt has no changelog entry for manifest version ${manifestVersion}. ` +
      `Add an entry before building.`
    )
  }
  return { version: manifestVersion, description: release.notes[0] || '' }
})()

const mode = process.env.NODE_ENV
const distSrcPath = path.join(distPath, 'src')
// Dev and staging builds work with the local website (localhost:8080)
const localSite = mode === 'development' || Boolean(process.env.STAGING)

let built_for = '"chrome"', chromelike = true
const browserIsFirefox = process.env.BROWSER === 'firefox'
if (browserIsFirefox) {
    built_for = '"firefox"'
    chromelike = false
}
// The store this build is for. __BUILT_FOR__ stays "chrome" for the Edge
// build, which differs only in its update_url.
const store = ['chrome', 'edge', 'firefox'].includes(process.env.BROWSER) ? process.env.BROWSER : 'chrome'

const manifestPath = path.join(distPath,
                              'manifest.json')

function modify(buffer) {
    // copy-webpack-plugin passes a buffer
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
            // data_collection_permissions: AMO lint warns without it and will
            // refuse. 'none' is accurate while the diag log stays local-only;
            // revisit if remote log upload ever ships.
            "gecko": { id, strict_min_version: '109.0', data_collection_permissions: { required: ['none'] } },
            "gecko_android": {}
        }
        // The cookie header rules run through webRequest on Firefox (the DNR
        // calls in header-rules.ts, viewer.ts and public-cookies.ts are guarded),
        // so the permission is dead weight. webRequest is in the base manifest
        // too (public-cookies.ts reads reddit's answers with it), so only what's
        // missing is added.
        manifest.permissions = manifest.permissions.filter(p => p !== 'declarativeNetRequestWithHostAccess')
        for (const permission of [
            'activeTab', 'webRequest', 'webRequestBlocking',
            'https://*.reddit.com/*', 'https://*.reveddit.com/*',
        ]) {
            if (!manifest.permissions.includes(permission)) manifest.permissions.push(permission)
        }
        delete manifest.host_permissions
        delete manifest.externally_connectable
        delete manifest.minimum_chrome_version
        manifest.manifest_version = 2
        manifest.background.scripts = [manifest.background.service_worker]
        manifest.background.persistent = true
        delete manifest.background.service_worker
        delete Object.assign(manifest, {browser_action: manifest.action }).action
        manifest.web_accessible_resources = manifest.web_accessible_resources[0].resources
        manifest.content_security_policy = manifest.content_security_policy.extension_pages
    }
    if (localSite) {
		// The local website's port (Firefox patterns can't name one; the
		// content script and background check the origin themselves)
		const localhostPattern = browserIsFirefox ? "http://localhost/*" : "http://localhost:8080/*"
		manifest[host_permissions_location].push(localhostPattern)
		manifest.content_scripts.forEach(script => script.matches.push(localhostPattern))
        if (manifest.externally_connectable && manifest.externally_connectable.matches) {
            manifest.externally_connectable.matches.push(localhostPattern)
        }
    }
    // pretty print to JSON with two spaces
    return JSON.stringify(manifest, null, 2);
}
const contentScripts = {
    content: './src/src/content.ts',
    'content-revddit-start': './src/src/content-revddit-start.ts',
}
const extensionPages = {
    options: './src/src/options.tsx',
    popup: './src/src/popup.tsx',
    history: './src/src/history.tsx',
    other: './src/src/other.tsx',
    welcome: './src/src/welcome.tsx',
    whatsnew: './src/src/whatsnew.tsx',
    'news-page': './src/src/news-page.tsx',
}
const extensionPageNames = Object.keys(extensionPages)

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
        __BUILT_FOR__: built_for,
        __STORE__: JSON.stringify(store),
        __DEV__: JSON.stringify(mode !== 'production'),
        __LOCAL_SITE__: JSON.stringify(localSite),
        __LATEST_RELEASE__: JSON.stringify(latestRelease),
        __RELEASE_HISTORY__: JSON.stringify(releaseHistory),
    }),
    new AfterEmitPlugin(),
]

if (process.argv.indexOf("--watch") >= 0 && mode !== 'production' && !process.env.ANDROID_DEV) {
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
    // Production packages carried ~5.5 MB of inline maps per store zip; keep
    // them for development only (still no eval, so the CSP is unaffected).
    devtool: mode === 'production' ? false : 'inline-source-map',
    optimization: {
        minimizer: [new TerserPlugin({
          extractComments: false,
        })],
        splitChunks: {
            chunks: (chunk) => extensionPageNames.includes(chunk.name),
            cacheGroups: {
                default: false,
                defaultVendors: false,
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    enforce: true,
                }
            }
        },
    },
    entry: {
        background: './src/background.ts',
        ...contentScripts,
        ...extensionPages
    },
    output: {
        publicPath: '',
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
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    }
}
