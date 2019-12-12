## Dev: Hot reloading

Chrome: Run `yarn start`, load `dist-dev-chrome/` in the browser, and visit a targeted content URL. Subsequent code changes will rebuild the code, reload the extension in the browser, and reload any impacted tabs.

Firefox: `yarn start-firefox`, load `dist-dev-firefox/`

## Dev: Manual development build

`yarn build-chrome-dev` and `yarn build-firefox-dev` build for the respective browsers, or `yarn build-dev` to build for both. Using this option requires manually reloading the extension and any impacted tabs after any code change.

## Dev: Production build

`yarn build-prod` builds Chrome and Firefox code and packages it into zip files.
