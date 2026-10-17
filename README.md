## Direct Installation

This extension can be installed directly via [Chrome](https://chrome.google.com/webstore/detail/reveddit-real-time/ickfhlplfbipnfahjbeongebnmojbnhm) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/reveddit-real-time/):

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/reveddit-real-time/ickfhlplfbipnfahjbeongebnmojbnhm">
    <img src="https://i.imgur.com/B0i5sn3.png" alt="Chrome Web Store"></a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/reveddit-real-time/">
    <img src="https://i.imgur.com/dvof8rG.png" alt="Firefox add-ons"></a>
</p>


![chrome](images/chrome.png) Note: the Chrome Store can lag behind the newest release. The version history is in [STORE_DESCRIPTION.txt](STORE_DESCRIPTION.txt); questions and bug reports go to [GitHub issues](https://github.com/reveddit/real-time-extension/issues).

## Install from source

Clone the repository and load either the dist-chrome/ or dist-firefox/. See [here](INSTALL.md) for more detailed instructions.

## Dev: Hot reloading

Chrome: Run `yarn start`, load `dist-dev-chrome/` in the browser, and visit a targeted content URL. Subsequent code changes will rebuild the code, reload the extension in the browser, and reload any impacted tabs.

Firefox: `yarn start-firefox`, load `dist-dev-firefox/`

## Dev: Manual development build

`yarn build-chrome-dev` and `yarn build-firefox-dev` build for the respective browsers, or `yarn build-dev` to build for both. Using this option requires manually reloading the extension and any impacted tabs after any code change.

## Dev: Production build

`yarn build-prod` builds Chrome and Firefox code and packages it into zip files.

## Dev: Testing

`yarn test` — unit and integration tests (Vitest)

`yarn test:watch` — Vitest in watch mode

`yarn test:e2e` — Playwright E2E tests against a real Chromium instance with the extension loaded. Runs headless, with no window (`E2E_HEADED=1 yarn test:e2e` shows the browser). Requires a fresh build first:

```bash
yarn build-chrome-dev
npx playwright install chromium   # first time only
yarn test:e2e
```

`yarn test:all` — run both Vitest and Playwright suites

`yarn preflight` — full pre-publish verification: typecheck, unit tests, dev build, then E2E

## Dev: Checking a build in real Firefox

Playwright can't load extensions into Firefox, so `scripts/firefox-bidi.cjs` drives a Firefox you start yourself with its remote-control port open (WebDriver BiDi, nothing to install in Firefox):

1. Make the launcher once, then keep it in the Dock: `osacompile -o ~/Applications/"Firefox for Claude.app" scripts/firefox-for-claude.applescript`. It starts Firefox with `--remote-debugging-port 9222`; quit Firefox first, since a running Firefox ignores startup flags. While it's open that way, Firefox shows its remote-control icon, so use it for test sessions.
2. `yarn build-firefox-dev`, and copy `dist-dev-firefox` out of `~/Desktop` (Firefox asks for Desktop access otherwise).
3. `node --experimental-websocket scripts/firefox-bidi.cjs --install <copy> https://www.reveddit.com/y/<user>/`

It loads the build as a temporary add-on, opens its own tab, and prints the page's items (removed ones marked), any connect error, and each bridge request with its answer. On macOS, don't launch Firefox from an automated session: a Firefox started that way cost the session its `~/Desktop` access.

## Dev: Code quality

`yarn lint` / `yarn lint:fix` — ESLint

`yarn format` / `yarn format:check` — Prettier

`yarn typecheck` — TypeScript type checking

## CI and pre-commit hooks

[Husky](https://typicode.github.io/husky/) pre-commit hooks run automatically on each commit: lint:fix, format, typecheck, and unit tests.

[GitHub Actions](.github/workflows/ci.yml) runs on push/PR to master/main: lint, typecheck, unit tests, and dev builds, followed by Playwright E2E in a separate job.

## Smoke testing

See [SMOKE_TESTS.md](SMOKE_TESTS.md) for the manual pre-release verification checklist.

## Claude Code MCP browser integration

Claude Code can drive a real Chromium instance with the extension loaded for visual verification via Playwright MCP. See [.claude-mcp/README.md](.claude-mcp/README.md) for per-machine setup instructions.

## Future work

* Monitor parent comments / posts of subscribed users' comments + other subscribed comments
* Track edits to parent comments
