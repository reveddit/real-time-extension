# Claude Code MCP browser integration

Wires `@playwright/mcp` into Claude Code so the agent can drive a real Chromium with this extension loaded — useful for visual checks that don't fit the headless vitest / Playwright E2E suites.

This is **per-machine local config**. None of the files described below ship in the repo except this README and `playwright-mcp.json` is gitignored. Recreate them on each machine following the steps below.

## Prerequisites

`dist-dev-chrome/` must exist and be current before launching the MCP browser:

```bash
yarn build-chrome-dev
```

Stale `dist-dev-chrome/` → Claude screenshots the *old* code. The MCP server does not watch for rebuilds, so rerun after each source change.

## Setup

Three files work together. `<REPO_PARENT>` below means the parent of `real-time-extension/` (i.e. wherever you cloned the repo). All paths must be **absolute** — the MCP server's CWD is not guaranteed.

### 1. `<REPO_PARENT>/.mcp.json` (above the repo, not checked in)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--config",
        "<absolute path to real-time-extension/.claude-mcp/playwright-mcp.json>"
      ]
    }
  }
}
```

### 2. `<REPO_PARENT>/.claude/settings.json` (above the repo, not checked in)

Add `playwright` to `enabledMcpjsonServers` to auto-approve it on session start:

```json
{
  "enabledMcpjsonServers": ["playwright"]
}
```

Merge with whatever else lives in that file.

### 3. `real-time-extension/.claude-mcp/playwright-mcp.json` (gitignored)

```json
{
  "browser": {
    "browserName": "chromium",
    "launchOptions": {
      "headless": false,
      "args": [
        "--disable-extensions-except=<absolute path to real-time-extension/dist-dev-chrome>",
        "--load-extension=<absolute path to real-time-extension/dist-dev-chrome>",
        "--no-first-run"
      ]
    }
  }
}
```

Launch args mirror the same `--disable-extensions-except` + `--load-extension` pair used in [../tests/e2e/fixtures.js](../tests/e2e/fixtures.js).

`headless: false` makes a visible browser window pop up when Claude runs MCP tools. Flip to `true` once the workflow is proven, if the window is disruptive.

### 4. Restart Claude Code

MCP servers load at session start, so any changes to the three files above require restarting the session.

### 5. First-time browser install

If `chromium` isn't already installed for Playwright:

```bash
npx -y @playwright/mcp@latest install-browser chromium
```

## Extension ID discovery

Unpacked extensions get a deterministic ID derived from the install path — stable across restarts but machine-specific. To navigate to extension pages, Claude needs that ID.

Easiest source: when the extension is freshly installed (or just rebuilt + reloaded), `welcome.html` auto-opens, exposing the ID in the tab URL. Otherwise:

1. `browser_navigate` → `chrome://extensions/`
2. `browser_evaluate` to dig through the shadow DOM and read the ID:
   ```js
   document
     .querySelector('extensions-manager')
     .shadowRoot.querySelector('extensions-item-list')
     .shadowRoot.querySelectorAll('extensions-item')[0]
     .id
   ```
3. Cache the returned ID for the rest of the session and use it for `chrome-extension://<id>/src/*.html` URLs.

### Fallback — pin the ID via manifest `key`

If ID discovery gets flaky, add a `"key": "<base64 public key>"` field to [../src/manifest.json](../src/manifest.json) for dev builds only. Chrome derives the extension ID from this key, so it stops moving.

```bash
openssl genrsa 2048 | openssl rsa -pubout -outform DER | openssl base64 -A
```

**Must not ship with `key` present** — Chrome / Firefox / Edge store submissions reject it. Gate it behind a `NODE_ENV === 'development'` branch in [../webpack.config.js](../webpack.config.js) so production builds strip it automatically.

## What MCP can / can't verify

**Yes:** all extension HTML pages (welcome/history/options/other/popup) loaded as `chrome-extension://<id>/src/*.html`, content script injection on reddit.com and reveddit.com, DOM/computed-style inspection, seeding `chrome.storage.local` / `.sync` to reproduce stateful bugs.

**No:** toolbar popup UX (clicking the actual toolbar icon), badge text on the extension icon, OS-level `chrome.notifications` banners, Firefox/Edge parity. These still need hands-on testing.

**Partial:** popup.html loads as a normal tab but `chrome.tabs.query({active:true,currentWindow:true})` returns a different tab than when opened via the toolbar — DOM/styles render but tab-dependent code paths don't exercise. Service worker alarms can be triggered manually but wake-from-sleep timing is unrealistic.
