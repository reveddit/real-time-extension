// Runs on reveddit.com at document_start, before any of the page's own scripts,
// and only marks the page: <html data-reveddit-extension="version"
// data-reveddit-extension-store="chrome|edge|firefox">. The website
// (src/api/reddit/extensionStatus.ts) reads it to know right away that the
// extension is running, in every browser, and which store's version to compare
// it with (Edge can also install the Chrome store's build). Unlike the
// localStorage stamps content.ts writes at document_idle, the mark can't
// outlive a disabled or removed extension. Not registered on reddit.com, which
// should not learn the extension is installed.
document.documentElement.setAttribute('data-reveddit-extension', chrome.runtime.getManifest().version)
document.documentElement.setAttribute('data-reveddit-extension-store', __STORE__)
