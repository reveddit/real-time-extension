(()=>{"use strict";var e,r,o,t={3505:(e,r,o)=>{var t=o(5893),a=o(7294),d=o(745),n=o(3867),i=o(917);const c={sm:"4px",md:"6px",lg:"8px",pill:"999px"},s={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px"},l={body:'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},b=i.iv`
    :root {
        /* Backgrounds */
        --bg-primary: #1a1b1e;
        --bg-secondary: #111214;
        --bg-surface: #25262b;
        --bg-surface-hover: #2c2d33;

        /* Text */
        --text-primary: #e0e0e0;
        --text-secondary: #909296;
        --text-muted: #606368;
        --text-on-accent: #ffffff;

        /* Accent / brand */
        --accent: #e03e3e;
        --accent-dim: #c13030;
        --accent-hover: #e85555;

        /* Links */
        --link: #74b3e0;
        --link-hover: #9ac8eb;

        /* Semantic */
        --author: #6a98af;
        --submitter: #2b7de9;
        --moderator: #2ea043;
        --admin: #e03e3e;
        --quarantined: #ffd635;

        /* Removed / deleted indicators */
        --removed-bg: rgba(99, 54, 54, 1);
        --removed-border: #e03e3e;
        --deleted-bg: rgba(33, 77, 149, 1);
        --deleted-border: #4c6ef5;
        --approved-bg: rgba(46, 160, 67, 0.22);
        --approved-border: #2ea043;
        --locked-bg: rgba(255, 214, 53, 0.22);
        --locked-border: #ffd635;

        /* Borders & surfaces */
        --border: #373a40;
        --border-light: #4a4e54;
        --note-bg: #264d73;
        --code-bg: rgba(42, 51, 64, 1);
        --code-border: rgba(88, 105, 123, 1);

        /* UI elements */
        --button-bg: #373a40;
        --button-text: #e0e0e0;
        --input-bg: #25262b;
        --input-border: #373a40;
        --input-focus: #74b3e0;

        /* Scores & meta */
        --meta: #909296;

        color-scheme: dark;
    }

    :root[data-theme='light'] {
        --bg-primary: #ffffff;
        --bg-secondary: #f8f9fa;
        --bg-surface: #f1f3f5;
        --bg-surface-hover: #e9ecef;

        --text-primary: #1a1b1e;
        --text-secondary: #495057;
        --text-muted: #868e96;
        --text-on-accent: #ffffff;

        --accent: #c92a2a;
        --accent-dim: #a82828;
        --accent-hover: #e03131;

        --link: #1971c2;
        --link-hover: #1c7ed6;

        --author: #3a6f8a;
        --submitter: #1864ab;
        --moderator: #2b8a3e;
        --admin: #c92a2a;

        --removed-bg: rgba(255, 230, 230, 1);
        --removed-border: #c92a2a;
        --deleted-bg: rgba(219, 234, 254, 1);
        --deleted-border: #1971c2;
        --approved-bg: rgba(43, 138, 62, 0.12);
        --approved-border: #2b8a3e;
        --locked-bg: rgba(255, 214, 53, 0.28);
        --locked-border: #d4a017;

        --border: #dee2e6;
        --border-light: #ced4da;
        --note-bg: #e7f5ff;
        --code-bg: #f1f3f5;
        --code-border: #dee2e6;

        --button-bg: #e9ecef;
        --button-text: #1a1b1e;
        --input-bg: #ffffff;
        --input-border: #ced4da;
        --input-focus: #1971c2;

        --meta: #868e96;

        color-scheme: light;
    }
`,p=i.iv`
    html,
    body {
        margin: 0;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family: ${l.body};
        font-size: 14px;
        line-height: 1.45;
    }
    *,
    *::before,
    *::after {
        box-sizing: border-box;
    }

    a {
        color: var(--link);
        text-decoration: none;
    }
    a:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }

    hr {
        border: 0;
        border-top: 1px solid var(--border);
        margin: ${s.md} 0;
    }

    h1,
    h2,
    h3,
    h4 {
        color: var(--text-primary);
    }
    h1 {
        font-size: 22px;
        margin: 0 0 ${s.lg} 0;
    }
    h2 {
        font-size: 18px;
        margin: 0 0 ${s.md} 0;
    }
    h3 {
        font-size: 16px;
        margin: 0 0 ${s.sm} 0;
    }

    button {
        font-family: inherit;
        font-size: inherit;
    }

    input[type='text'],
    input[type='number'],
    select,
    textarea {
        background: var(--input-bg);
        color: var(--text-primary);
        border: 1px solid var(--input-border);
        border-radius: ${c.sm};
        padding: 6px 8px;
        font-family: inherit;
        font-size: inherit;
        outline: none;
        &:focus {
            border-color: var(--input-focus);
        }
    }

    input[type='checkbox'] {
        accent-color: var(--link);
    }
`,m=i.iv`
    .md-body {
        word-break: break-word;
        color: var(--text-primary);
    }
    .md-body p {
        margin: 0.5em 0;
        line-height: 1.45;
    }
    .md-body a {
        color: var(--link);
    }
    .md-body a:hover {
        color: var(--link-hover);
    }
    .md-body ul,
    .md-body ol {
        margin: 0.5em 0;
        padding-left: 1.5em;
    }
    .md-body li {
        margin: 0.2em 0;
    }
    .md-body blockquote {
        border-left: 3px solid var(--border-light);
        color: var(--text-secondary);
        padding-left: 10px;
        margin: 0.5em 0;
    }
    .md-body pre {
        margin: 0.5em 0;
        padding: 8px 10px;
        overflow: auto;
        border: 1px solid var(--code-border);
        background: var(--code-bg);
        border-radius: ${c.md};
    }
    .md-body code {
        background: var(--code-bg);
        border: 1px solid var(--code-border);
        border-radius: 3px;
        padding: 0 4px;
        font-family: ${l.mono};
        font-size: 0.92em;
    }
    .md-body pre code {
        background: transparent;
        border: 0;
        padding: 0;
        display: block;
        white-space: pre;
    }
    .md-body h1,
    .md-body h2,
    .md-body h3,
    .md-body h4 {
        margin: 0.6em 0 0.3em 0;
    }
    .md-body > *:first-of-type {
        margin-top: 0;
    }
    .md-body > *:last-child {
        margin-bottom: 0;
    }
`,g="ui_theme";function v(e){const r="auto"===e?window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark":e;document.documentElement.setAttribute("data-theme",r)}function u(){return(0,a.useEffect)((()=>{try{chrome.storage.local.get([g],(e=>{v(e?.[g]||"auto")}))}catch{v("auto")}const e=window.matchMedia?.("(prefers-color-scheme: light)"),r=()=>{try{chrome.storage.local.get([g],(e=>{"auto"===(e?.[g]||"auto")&&v("auto")}))}catch(e){}};e?.addEventListener?.("change",r);const o=(e,r)=>{"local"===r&&e[g]&&v(e[g].newValue||"auto")};return chrome.storage.onChanged.addListener(o),()=>{e?.removeEventListener?.("change",r),chrome.storage.onChanged.removeListener(o)}}),[]),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(i.xB,{styles:b}),(0,t.jsx)(i.xB,{styles:p}),(0,t.jsx)(i.xB,{styles:m})]})}const f=n.Z.a`
    color: var(--link);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,h=(n.Z.a`
    color: var(--text-secondary);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,n.Z.button`
    display: block;
    width: 100%;
    margin-top: 6px;
    padding: 8px 10px;
    background: var(--accent);
    color: var(--text-on-accent);
    border: 0;
    border-radius: ${c.md};
    cursor: pointer;
    font-size: 0.95em;
    font-weight: 600;
    transition: background 0.15s ease;
    &:hover {
        background: var(--accent-hover);
    }
    &:disabled {
        background: var(--button-bg);
        color: var(--text-muted);
        cursor: wait;
    }
`,n.Z.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${c.md};
    font-size: 0.92em;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
    ${e=>{switch(e.variant){case"secondary":return i.iv`
                    background: var(--button-bg);
                    color: var(--button-text);
                    border-color: var(--border);
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;case"ghost":return i.iv`
                    background: transparent;
                    color: var(--link);
                    border-color: transparent;
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;default:return i.iv`
                    background: var(--accent);
                    color: var(--text-on-accent);
                    border-color: var(--accent);
                    &:hover {
                        background: var(--accent-hover);
                        border-color: var(--accent-hover);
                    }
                `}}}
    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`),x=(n.Z.div`
    padding: 10px 12px;
    margin: 6px 0;
    border-radius: ${c.md};
    font-size: 0.92em;
    ${e=>{switch(e.variant){case"warning":return i.iv`
                    background: var(--locked-bg);
                    border: 1px solid var(--locked-border);
                    color: var(--text-primary);
                `;case"success":return i.iv`
                    background: var(--approved-bg);
                    border: 1px solid var(--approved-border);
                    color: var(--text-primary);
                `;case"news":return i.iv`
                    background: var(--note-bg);
                    border: 1px solid var(--border-light);
                    color: var(--text-primary);
                `;default:return i.iv`
                    background: var(--bg-surface);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                `}}}
`,n.Z.div`
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: ${c.lg};
    padding: ${s.md} ${s.lg};
    margin-bottom: ${s.md};
    transition: border-color 0.15s ease;
    &:hover {
        border-color: var(--border-light);
    }
`),y=(n.Z.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${s.sm};
    margin-bottom: ${s.xs};
`,n.Z.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${s.sm};
    color: var(--text-secondary);
    font-size: 0.85em;
    margin-bottom: ${s.sm};
    & > span + span::before {
        content: '·';
        margin-right: ${s.sm};
        color: var(--text-muted);
    }
`,n.Z.div`
    color: var(--text-primary);
    font-size: 0.95em;
`),k=(n.Z.div`
    display: flex;
    gap: ${s.sm};
    margin-top: ${s.sm};
    padding-top: ${s.sm};
    border-top: 1px solid var(--border);
`,n.Z.span`
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: ${c.pill};
    font-weight: 700;
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    border: 1px solid transparent;
    ${e=>{switch(e.variant){case"removed":return i.iv`
                    background: var(--removed-bg);
                    border-color: var(--removed-border);
                    color: #fff;
                `;case"deleted":return i.iv`
                    background: var(--deleted-bg);
                    border-color: var(--deleted-border);
                    color: #fff;
                `;case"approved":case"unlocked":return i.iv`
                    background: var(--approved-bg);
                    border-color: var(--approved-border);
                    color: var(--text-primary);
                `;case"locked":return i.iv`
                    background: var(--locked-bg);
                    border-color: var(--locked-border);
                    color: var(--text-primary);
                `;case"edited":return i.iv`
                    background: var(--bg-surface-hover);
                    border-color: var(--border);
                    color: var(--text-primary);
                `;default:return i.iv`
                    background: var(--bg-surface-hover);
                    border-color: var(--border);
                    color: var(--text-secondary);
                `}}}
`,n.Z.h2`
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin: ${s.lg} 0 ${s.sm} 0;
    padding-bottom: ${s.xs};
    border-bottom: 1px solid var(--border);
`),w=(n.Z.label`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${s.md};
    padding: ${s.sm} 0;
    & > span.label {
        color: var(--text-primary);
        font-size: 0.95em;
    }
    & > span.hint {
        color: var(--text-muted);
        font-size: 0.82em;
        display: block;
        margin-top: 2px;
    }
`,n.Z.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
`,n.Z.input`
    width: 80px;
    text-align: right;
`,n.Z.input`
    width: 100%;
`,n.Z.span`
    color: var(--author);
    font-weight: 600;
`,n.Z.span`
    color: var(--text-secondary);
`,n.Z.h3`
    margin: ${s.xs} 0 ${s.sm} 0;
    color: var(--text-primary);
`,n.Z.div`
    font-size: 0.95em;
`,n.Z.div`
  max-width: 720px;
  margin: 0 auto;
  padding: ${s.xl};
`),$=n.Z.div`
  text-align: center;
  padding: ${s.xl} 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: ${s.xl};
`,j=n.Z.h1`
  font-size: 28px;
  margin: 0 0 ${s.sm} 0;
`,Z=n.Z.p`
  color: var(--text-secondary);
  margin: 0;
  font-size: 1.1em;
`,O=n.Z.div`
  margin-bottom: ${s.lg};
  & > h3 {
    display: flex;
    align-items: center;
    gap: ${s.sm};
    margin-bottom: ${s.xs};
  }
  & > p {
    margin: 0;
    color: var(--text-secondary);
  }
`,z=n.Z.div`
  text-align: center;
  margin-top: ${s.xl};
  padding-top: ${s.lg};
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.9em;
`;(0,d.createRoot)(document.getElementById("root")).render((0,t.jsx)((function(){const e=(()=>{try{return chrome.runtime.getManifest().version}catch{return""}})();return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(u,{}),(0,t.jsxs)(w,{children:[(0,t.jsxs)($,{children:[(0,t.jsx)(j,{children:"What's new in reveddit real-time"}),(0,t.jsxs)(Z,{children:["A redesign to match reveddit.com ",e?`· v${e}`:""]})]}),(0,t.jsx)(k,{children:"Highlights"}),(0,t.jsx)(x,{children:(0,t.jsxs)(y,{children:[(0,t.jsxs)(O,{children:[(0,t.jsx)("h3",{children:"Fresh look, dark by default"}),(0,t.jsx)("p",{children:"The popup, options, and history pages have been rebuilt to match the revddit.com design. Dark is the default, with a light mode you can pick from the options page."})]}),(0,t.jsxs)(O,{children:[(0,t.jsx)("h3",{children:"History shows real comments and posts"}),(0,t.jsx)("p",{children:"Each removal, deletion, or lock now renders as a Reddit-style card with the full markdown body — no more truncated link labels. Filter and sort from the top of the page."})]}),(0,t.jsxs)(O,{children:[(0,t.jsx)("h3",{children:"Same settings, clearer layout"}),(0,t.jsx)("p",{children:"All of your existing options and subscriptions carry over unchanged. The options page is now grouped into sections so nothing gets lost."})]})]})}),(0,t.jsxs)(z,{children:[(0,t.jsx)(h,{variant:"primary",onClick:()=>{try{chrome.tabs.create({url:chrome.runtime.getURL("src/history.html")})}catch(e){console.log("openHistory failed:",e)}},children:"Open history"}),(0,t.jsxs)("div",{style:{marginTop:16},children:["Questions or feedback?"," ",(0,t.jsx)(f,{href:"https://www.reddit.com/r/reveddit",target:"_blank",rel:"noreferrer",children:"r/reveddit"})]})]})]})]})}),{}))}},a={};function d(e){var r=a[e];if(void 0!==r)return r.exports;var o=a[e]={exports:{}};return t[e].call(o.exports,o,o.exports,d),o.exports}d.m=t,e=[],d.O=(r,o,t,a)=>{if(!o){var n=1/0;for(l=0;l<e.length;l++){for(var[o,t,a]=e[l],i=!0,c=0;c<o.length;c++)(!1&a||n>=a)&&Object.keys(d.O).every((e=>d.O[e](o[c])))?o.splice(c--,1):(i=!1,a<n&&(n=a));if(i){e.splice(l--,1);var s=t();void 0!==s&&(r=s)}}return r}a=a||0;for(var l=e.length;l>0&&e[l-1][2]>a;l--)e[l]=e[l-1];e[l]=[o,t,a]},d.n=e=>{var r=e&&e.__esModule?()=>e.default:()=>e;return d.d(r,{a:r}),r},o=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,d.t=function(e,t){if(1&t&&(e=this(e)),8&t)return e;if("object"==typeof e&&e){if(4&t&&e.__esModule)return e;if(16&t&&"function"==typeof e.then)return e}var a=Object.create(null);d.r(a);var n={};r=r||[null,o({}),o([]),o(o)];for(var i=2&t&&e;"object"==typeof i&&!~r.indexOf(i);i=o(i))Object.getOwnPropertyNames(i).forEach((r=>n[r]=()=>e[r]));return n.default=()=>e,d.d(a,n),a},d.d=(e,r)=>{for(var o in r)d.o(r,o)&&!d.o(e,o)&&Object.defineProperty(e,o,{enumerable:!0,get:r[o]})},d.o=(e,r)=>Object.prototype.hasOwnProperty.call(e,r),d.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},d.j=47,d.p="",(()=>{d.b=document.baseURI||self.location.href;var e={47:0};d.O.j=r=>0===e[r];var r=(r,o)=>{var t,a,[n,i,c]=o,s=0;if(n.some((r=>0!==e[r]))){for(t in i)d.o(i,t)&&(d.m[t]=i[t]);if(c)var l=c(d)}for(r&&r(o);s<n.length;s++)a=n[s],d.o(e,a)&&e[a]&&e[a][0](),e[a]=0;return d.O(l)},o=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];o.forEach(r.bind(null,0)),o.push=r.bind(null,o.push.bind(o))})();var n=d.O(void 0,[736],(()=>d(3505)));n=d.O(n)})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3JjL3doYXRzbmV3LmpzIiwibWFwcGluZ3MiOiJ1QkFBSUEsRUNDQUMsRUFEQUMsRSxzRUNLRyxNQUFNQyxFQUNELENBQ0pDLEdBQUksTUFDSkMsR0FBSSxNQUNKQyxHQUFJLE1BQ0pDLEtBQU0sU0FMREosRUFPRixDQUNISyxHQUFJLE1BQ0pKLEdBQUksTUFDSkMsR0FBSSxPQUNKQyxHQUFJLE9BQ0pHLEdBQUksUUFaQ04sRUFjSCxDQUNGTyxLQUFNLDhFQUNOQyxLQUFNLG9FQUdEQyxFQUFlLElBQUk7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQTZHbkJDLEVBQWEsSUFBSTs7Ozs7O3VCQU1QVixFQUFZTzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztrQkFzQmpCUCxFQUFhRTs7Ozs7Ozs7Ozs7c0JBV1RGLEVBQWFHOzs7O3NCQUliSCxFQUFhRTs7OztzQkFJYkYsRUFBYUM7Ozs7Ozs7Ozs7Ozs7Ozt5QkFlVkQsRUFBY0M7Ozs7Ozs7Ozs7Ozs7RUFnQjFCVSxFQUFpQixJQUFJOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozt5QkFtQ1RYLEVBQWNFOzs7Ozs7O3VCQU9oQkYsRUFBWVE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUN6UHRCSSxFQUFvQixXQUNqQyxTQUFTQyxFQUFXQyxHQUNoQixNQUFNQyxFQUFvQixTQUFURCxFQUNWRSxPQUFPQyxZQUFjRCxPQUFPQyxXQUFXLGlDQUFpQ0MsUUFDckUsUUFDQSxPQUNKSixFQUNOSyxTQUFTQyxnQkFBZ0JDLGFBQWEsYUFBY04sRUFDeEQsQ0FDTyxTQUFTTyxJQW9DWixPQW5DQSxJQUFBQyxZQUFVLEtBQ04sSUFDSUMsT0FBT0MsUUFBUUMsTUFBTUMsSUFBSSxDQUFDZixJQUFvQmdCLElBRTFDZixFQURhZSxJQUFNaEIsSUFBc0IsT0FDekIsR0FFeEIsQ0FD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R3hELElBQUlDLEVBQXVCLENBQUNDLEVBQTRCQyxLQUN2RCxJQUdJMUQsRUFBVXVELEdBSFQ3QyxFQUFVaUQsRUFBYTNFLEdBQVcwRSxFQUdoQjNDLEVBQUksRUFDM0IsR0FBR0wsRUFBU2tELE1BQU1DLEdBQWdDLElBQXhCUCxFQUFnQk8sS0FBYSxDQUN0RCxJQUFJN0QsS0FBWTJELEVBQ1o1RCxFQUFvQjJDLEVBQUVpQixFQUFhM0QsS0FDckNELEVBQW9CUSxFQUFFUCxHQUFZMkQsRUFBWTNELElBR2hELEdBQUdoQixFQUFTLElBQUl5QixFQUFTekIsRUFBUWUsRUFDbEMsQ0FFQSxJQURHMEQsR0FBNEJBLEVBQTJCQyxHQUNyRDNDLEVBQUlMLEVBQVNNLE9BQVFELElBQ3pCd0MsRUFBVTdDLEVBQVNLLEdBQ2hCaEIsRUFBb0IyQyxFQUFFWSxFQUFpQkMsSUFBWUQsRUFBZ0JDLElBQ3JFRCxFQUFnQkMsR0FBUyxLQUUxQkQsRUFBZ0JDLEdBQVcsRUFFNUIsT0FBT3hELEVBQW9CUyxFQUFFQyxFQUFPLEVBR2pDcUQsRUFBcUJWLEtBQXFDLCtCQUFJQSxLQUFxQyxnQ0FBSyxHQUM1R1UsRUFBbUJ0QixRQUFRZ0IsRUFBcUJPLEtBQUssS0FBTSxJQUMzREQsRUFBbUJFLEtBQU9SLEVBQXFCTyxLQUFLLEtBQU1ELEVBQW1CRSxLQUFLRCxLQUFLRCxHLEtDN0N2RixJQUFJRyxFQUFzQmxFLEVBQW9CUyxPQUFFTixFQUFXLENBQUMsTUFBTSxJQUFPSCxFQUFvQixRQUM3RmtFLEVBQXNCbEUsRUFBb0JTLEVBQUV5RCxFIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svcnVudGltZS9jaHVuayBsb2FkZWQiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svcnVudGltZS9jcmVhdGUgZmFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS8uL3NyYy9zcmMvdWkvdG9rZW5zLnRzIiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS8uL3NyYy9zcmMvdWkvZ2xvYmFsLnRzeCIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvLi9zcmMvc3JjL3VpL2NvbXBvbmVudHMudHMiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lLy4vc3JjL3NyYy93aGF0c25ldy50c3giLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS93ZWJwYWNrL3J1bnRpbWUvY29tcGF0IGdldCBkZWZhdWx0IGV4cG9ydCIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS93ZWJwYWNrL3J1bnRpbWUvcnVudGltZUlkIiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS93ZWJwYWNrL3J1bnRpbWUvcHVibGljUGF0aCIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvd2VicGFjay9ydW50aW1lL2pzb25wIGNodW5rIGxvYWRpbmciLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svc3RhcnR1cCJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZGVmZXJyZWQgPSBbXTtcbl9fd2VicGFja19yZXF1aXJlX18uTyA9IChyZXN1bHQsIGNodW5rSWRzLCBmbiwgcHJpb3JpdHkpID0+IHtcblx0aWYoY2h1bmtJZHMpIHtcblx0XHRwcmlvcml0eSA9IHByaW9yaXR5IHx8IDA7XG5cdFx0Zm9yKHZhciBpID0gZGVmZXJyZWQubGVuZ3RoOyBpID4gMCAmJiBkZWZlcnJlZFtpIC0gMV1bMl0gPiBwcmlvcml0eTsgaS0tKSBkZWZlcnJlZFtpXSA9IGRlZmVycmVkW2kgLSAxXTtcblx0XHRkZWZlcnJlZFtpXSA9IFtjaHVua0lkcywgZm4sIHByaW9yaXR5XTtcblx0XHRyZXR1cm47XG5cdH1cblx0dmFyIG5vdEZ1bGZpbGxlZCA9IEluZmluaXR5O1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IGRlZmVycmVkLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIFtjaHVua0lkcywgZm4sIHByaW9yaXR5XSA9IGRlZmVycmVkW2ldO1xuXHRcdHZhciBmdWxmaWxsZWQgPSB0cnVlO1xuXHRcdGZvciAodmFyIGogPSAwOyBqIDwgY2h1bmtJZHMubGVuZ3RoOyBqKyspIHtcblx0XHRcdGlmICgocHJpb3JpdHkgJiAxID09PSAwIHx8IG5vdEZ1bGZpbGxlZCA+PSBwcmlvcml0eSkgJiYgT2JqZWN0LmtleXMoX193ZWJwYWNrX3JlcXVpcmVfXy5PKS5ldmVyeSgoa2V5KSA9PiAoX193ZWJwYWNrX3JlcXVpcmVfXy5PW2tleV0oY2h1bmtJZHNbal0pKSkpIHtcblx0XHRcdFx0Y2h1bmtJZHMuc3BsaWNlKGotLSwgMSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmdWxmaWxsZWQgPSBmYWxzZTtcblx0XHRcdFx0aWYocHJpb3JpdHkgPCBub3RGdWxmaWxsZWQpIG5vdEZ1bGZpbGxlZCA9IHByaW9yaXR5O1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZihmdWxmaWxsZWQpIHtcblx0XHRcdGRlZmVycmVkLnNwbGljZShpLS0sIDEpXG5cdFx0XHR2YXIgciA9IGZuKCk7XG5cdFx0XHRpZiAociAhPT0gdW5kZWZpbmVkKSByZXN1bHQgPSByO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gcmVzdWx0O1xufTsiLCJ2YXIgZ2V0UHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YgPyAob2JqKSA9PiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iaikpIDogKG9iaikgPT4gKG9iai5fX3Byb3RvX18pO1xudmFyIGxlYWZQcm90b3R5cGVzO1xuLy8gY3JlYXRlIGEgZmFrZSBuYW1lc3BhY2Ugb2JqZWN0XG4vLyBtb2RlICYgMTogdmFsdWUgaXMgYSBtb2R1bGUgaWQsIHJlcXVpcmUgaXRcbi8vIG1vZGUgJiAyOiBtZXJnZSBhbGwgcHJvcGVydGllcyBvZiB2YWx1ZSBpbnRvIHRoZSBuc1xuLy8gbW9kZSAmIDQ6IHJldHVybiB2YWx1ZSB3aGVuIGFscmVhZHkgbnMgb2JqZWN0XG4vLyBtb2RlICYgMTY6IHJldHVybiB2YWx1ZSB3aGVuIGl0J3MgUHJvbWlzZS1saWtlXG4vLyBtb2RlICYgOHwxOiBiZWhhdmUgbGlrZSByZXF1aXJlXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnQgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZSkge1xuXHRpZihtb2RlICYgMSkgdmFsdWUgPSB0aGlzKHZhbHVlKTtcblx0aWYobW9kZSAmIDgpIHJldHVybiB2YWx1ZTtcblx0aWYodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSkge1xuXHRcdGlmKChtb2RlICYgNCkgJiYgdmFsdWUuX19lc01vZHVsZSkgcmV0dXJuIHZhbHVlO1xuXHRcdGlmKChtb2RlICYgMTYpICYmIHR5cGVvZiB2YWx1ZS50aGVuID09PSAnZnVuY3Rpb24nKSByZXR1cm4gdmFsdWU7XG5cdH1cblx0dmFyIG5zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblx0X193ZWJwYWNrX3JlcXVpcmVfXy5yKG5zKTtcblx0dmFyIGRlZiA9IHt9O1xuXHRsZWFmUHJvdG90eXBlcyA9IGxlYWZQcm90b3R5cGVzIHx8IFtudWxsLCBnZXRQcm90byh7fSksIGdldFByb3RvKFtdKSwgZ2V0UHJvdG8oZ2V0UHJvdG8pXTtcblx0Zm9yKHZhciBjdXJyZW50ID0gbW9kZSAmIDIgJiYgdmFsdWU7IHR5cGVvZiBjdXJyZW50ID09ICdvYmplY3QnICYmICF+bGVhZlByb3RvdHlwZXMuaW5kZXhPZihjdXJyZW50KTsgY3VycmVudCA9IGdldFByb3RvKGN1cnJlbnQpKSB7XG5cdFx0T2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoY3VycmVudCkuZm9yRWFjaCgoa2V5KSA9PiAoZGVmW2tleV0gPSAoKSA9PiAodmFsdWVba2V5XSkpKTtcblx0fVxuXHRkZWZbJ2RlZmF1bHQnXSA9ICgpID0+ICh2YWx1ZSk7XG5cdF9fd2VicGFja19yZXF1aXJlX18uZChucywgZGVmKTtcblx0cmV0dXJuIG5zO1xufTsiLCIvLyBEZXNpZ24gdG9rZW5zIHBvcnRlZCBmcm9tIHdlYnNpdGUvc3JjL3Nhc3MvY29sb3JzLnNhc3Mgc28gdGhlIGV4dGVuc2lvblxuLy8gbWF0Y2hlcyB0aGUgcmV2ZGRpdC5jb20gc2l0ZS4gRGFyayBpcyB0aGUgZGVmYXVsdDsgW2RhdGEtdGhlbWU9XCJsaWdodFwiXSBvblxuLy8gdGhlIHJvb3QgZWxlbWVudCBmbGlwcyB0aGUgcGFsZXR0ZS4gVGhlIGV4dGVuc2lvbiBpcyBzZWxmLWNvbnRhaW5lZDogdGhlc2Vcbi8vIHZhbHVlcyBhcmUgY29waWVkLCBub3QgaW1wb3J0ZWQgZnJvbSB3ZWJzaXRlLy5cbmltcG9ydCB7IGNzcyB9IGZyb20gJ0BlbW90aW9uL3JlYWN0JztcbmV4cG9ydCBjb25zdCB0b2tlbnMgPSB7XG4gICAgcmFkaXVzOiB7XG4gICAgICAgIHNtOiAnNHB4JyxcbiAgICAgICAgbWQ6ICc2cHgnLFxuICAgICAgICBsZzogJzhweCcsXG4gICAgICAgIHBpbGw6ICc5OTlweCcsXG4gICAgfSxcbiAgICBzcGFjZToge1xuICAgICAgICB4czogJzRweCcsXG4gICAgICAgIHNtOiAnOHB4JyxcbiAgICAgICAgbWQ6ICcxMnB4JyxcbiAgICAgICAgbGc6ICcxNnB4JyxcbiAgICAgICAgeGw6ICcyNHB4JyxcbiAgICB9LFxuICAgIGZvbnQ6IHtcbiAgICAgICAgYm9keTogJy1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgXCJTZWdvZSBVSVwiLCBIZWx2ZXRpY2EsIEFyaWFsLCBzYW5zLXNlcmlmJyxcbiAgICAgICAgbW9ubzogJ3VpLW1vbm9zcGFjZSwgU0ZNb25vLVJlZ3VsYXIsIE1lbmxvLCBNb25hY28sIENvbnNvbGFzLCBtb25vc3BhY2UnLFxuICAgIH0sXG59O1xuZXhwb3J0IGNvbnN0IGdsb2JhbFRva2VucyA9IGNzcyBgXG4gICAgOnJvb3Qge1xuICAgICAgICAvKiBCYWNrZ3JvdW5kcyAqL1xuICAgICAgICAtLWJnLXByaW1hcnk6ICMxYTFiMWU7XG4gICAgICAgIC0tYmctc2Vjb25kYXJ5OiAjMTExMjE0O1xuICAgICAgICAtLWJnLXN1cmZhY2U6ICMyNTI2MmI7XG4gICAgICAgIC0tYmctc3VyZmFjZS1ob3ZlcjogIzJjMmQzMztcblxuICAgICAgICAvKiBUZXh0ICovXG4gICAgICAgIC0tdGV4dC1wcmltYXJ5OiAjZTBlMGUwO1xuICAgICAgICAtLXRleHQtc2Vjb25kYXJ5OiAjOTA5Mjk2O1xuICAgICAgICAtLXRleHQtbXV0ZWQ6ICM2MDYzNjg7XG4gICAgICAgIC0tdGV4dC1vbi1hY2NlbnQ6ICNmZmZmZmY7XG5cbiAgICAgICAgLyogQWNjZW50IC8gYnJhbmQgKi9cbiAgICAgICAgLS1hY2NlbnQ6ICNlMDNlM2U7XG4gICAgICAgIC0tYWNjZW50LWRpbTogI2MxMzAzMDtcbiAgICAgICAgLS1hY2NlbnQtaG92ZXI6ICNlODU1NTU7XG5cbiAgICAgICAgLyogTGlua3MgKi9cbiAgICAgICAgLS1saW5rOiAjNzRiM2UwO1xuICAgICAgICAtLWxpbmstaG92ZXI6ICM5YWM4ZWI7XG5cbiAgICAgICAgLyogU2VtYW50aWMgKi9cbiAgICAgICAgLS1hdXRob3I6ICM2YTk4YWY7XG4gICAgICAgIC0tc3VibWl0dGVyOiAjMmI3ZGU5O1xuICAgICAgICAtLW1vZGVyYXRvcjogIzJlYTA0MztcbiAgICAgICAgLS1hZG1pbjogI2UwM2UzZTtcbiAgICAgICAgLS1xdWFyYW50aW5lZDogI2ZmZDYzNTtcblxuICAgICAgICAvKiBSZW1vdmVkIC8gZGVsZXRlZCBpbmRpY2F0b3JzICovXG4gICAgICAgIC0tcmVtb3ZlZC1iZzogcmdiYSg5OSwgNTQsIDU0LCAxKTtcbiAgICAgICAgLS1yZW1vdmVkLWJvcmRlcjogI2UwM2UzZTtcbiAgICAgICAgLS1kZWxldGVkLWJnOiByZ2JhKDMzLCA3NywgMTQ5LCAxKTtcbiAgICAgICAgLS1kZWxldGVkLWJvcmRlcjogIzRjNmVmNTtcbiAgICAgICAgLS1hcHByb3ZlZC1iZzogcmdiYSg0NiwgMTYwLCA2NywgMC4yMik7XG4gICAgICAgIC0tYXBwcm92ZWQtYm9yZGVyOiAjMmVhMDQzO1xuICAgICAgICAtLWxvY2tlZC1iZzogcmdiYSgyNTUsIDIxNCwgNTMsIDAuMjIpO1xuICAgICAgICAtLWxvY2tlZC1ib3JkZXI6ICNmZmQ2MzU7XG5cbiAgICAgICAgLyogQm9yZGVycyAmIHN1cmZhY2VzICovXG4gICAgICAgIC0tYm9yZGVyOiAjMzczYTQwO1xuICAgICAgICAtLWJvcmRlci1saWdodDogIzRhNGU1NDtcbiAgICAgICAgLS1ub3RlLWJnOiAjMjY0ZDczO1xuICAgICAgICAtLWNvZGUtYmc6IHJnYmEoNDIsIDUxLCA2NCwgMSk7XG4gICAgICAgIC0tY29kZS1ib3JkZXI6IHJnYmEoODgsIDEwNSwgMTIzLCAxKTtcblxuICAgICAgICAvKiBVSSBlbGVtZW50cyAqL1xuICAgICAgICAtLWJ1dHRvbi1iZzogIzM3M2E0MDtcbiAgICAgICAgLS1idXR0b24tdGV4dDogI2UwZTBlMDtcbiAgICAgICAgLS1pbnB1dC1iZzogIzI1MjYyYjtcbiAgICAgICAgLS1pbnB1dC1ib3JkZXI6ICMzNzNhNDA7XG4gICAgICAgIC0taW5wdXQtZm9jdXM6ICM3NGIzZTA7XG5cbiAgICAgICAgLyogU2NvcmVzICYgbWV0YSAqL1xuICAgICAgICAtLW1ldGE6ICM5MDkyOTY7XG5cbiAgICAgICAgY29sb3Itc2NoZW1lOiBkYXJrO1xuICAgIH1cblxuICAgIDpyb290W2RhdGEtdGhlbWU9J2xpZ2h0J10ge1xuICAgICAgICAtLWJnLXByaW1hcnk6ICNmZmZmZmY7XG4gICAgICAgIC0tYmctc2Vjb25kYXJ5OiAjZjhmOWZhO1xuICAgICAgICAtLWJnLXN1cmZhY2U6ICNmMWYzZjU7XG4gICAgICAgIC0tYmctc3VyZmFjZS1ob3ZlcjogI2U5ZWNlZjtcblxuICAgICAgICAtLXRleHQtcHJpbWFyeTogIzFhMWIxZTtcbiAgICAgICAgLS10ZXh0LXNlY29uZGFyeTogIzQ5NTA1NztcbiAgICAgICAgLS10ZXh0LW11dGVkOiAjODY4ZTk2O1xuICAgICAgICAtLXRleHQtb24tYWNjZW50OiAjZmZmZmZmO1xuXG4gICAgICAgIC0tYWNjZW50OiAjYzkyYTJhO1xuICAgICAgICAtLWFjY2VudC1kaW06ICNhODI4Mjg7XG4gICAgICAgIC0tYWNjZW50LWhvdmVyOiAjZTAzMTMxO1xuXG4gICAgICAgIC0tbGluazogIzE5NzFjMjtcbiAgICAgICAgLS1saW5rLWhvdmVyOiAjMWM3ZWQ2O1xuXG4gICAgICAgIC0tYXV0aG9yOiAjM2E2ZjhhO1xuICAgICAgICAtLXN1Ym1pdHRlcjogIzE4NjRhYjtcbiAgICAgICAgLS1tb2RlcmF0b3I6ICMyYjhhM2U7XG4gICAgICAgIC0tYWRtaW46ICNjOTJhMmE7XG5cbiAgICAgICAgLS1yZW1vdmVkLWJnOiByZ2JhKDI1NSwgMjMwLCAyMzAsIDEpO1xuICAgICAgICAtLXJlbW92ZWQtYm9yZGVyOiAjYzkyYTJhO1xuICAgICAgICAtLWRlbGV0ZWQtYmc6IHJnYmEoMjE5LCAyMzQsIDI1NCwgMSk7XG4gICAgICAgIC0tZGVsZXRlZC1ib3JkZXI6ICMxOTcxYzI7XG4gICAgICAgIC0tYXBwcm92ZWQtYmc6IHJnYmEoNDMsIDEzOCwgNjIsIDAuMTIpO1xuICAgICAgICAtLWFwcHJvdmVkLWJvcmRlcjogIzJiOGEzZTtcbiAgICAgICAgLS1sb2NrZWQtYmc6IHJnYmEoMjU1LCAyMTQsIDUzLCAwLjI4KTtcbiAgICAgICAgLS1sb2NrZWQtYm9yZGVyOiAjZDRhMDE3O1xuXG4gICAgICAgIC0tYm9yZGVyOiAjZGVlMmU2O1xuICAgICAgICAtLWJvcmRlci1saWdodDogI2NlZDRkYTtcbiAgICAgICAgLS1ub3RlLWJnOiAjZTdmNWZmO1xuICAgICAgICAtLWNvZGUtYmc6ICNmMWYzZjU7XG4gICAgICAgIC0tY29kZS1ib3JkZXI6ICNkZWUyZTY7XG5cbiAgICAgICAgLS1idXR0b24tYmc6ICNlOWVjZWY7XG4gICAgICAgIC0tYnV0dG9uLXRleHQ6ICMxYTFiMWU7XG4gICAgICAgIC0taW5wdXQtYmc6ICNmZmZmZmY7XG4gICAgICAgIC0taW5wdXQtYm9yZGVyOiAjY2VkNGRhO1xuICAgICAgICAtLWlucHV0LWZvY3VzOiAjMTk3MWMyO1xuXG4gICAgICAgIC0tbWV0YTogIzg2OGU5NjtcblxuICAgICAgICBjb2xvci1zY2hlbWU6IGxpZ2h0O1xuICAgIH1cbmA7XG5leHBvcnQgY29uc3QgZ2xvYmFsQmFzZSA9IGNzcyBgXG4gICAgaHRtbCxcbiAgICBib2R5IHtcbiAgICAgICAgbWFyZ2luOiAwO1xuICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1iZy1wcmltYXJ5KTtcbiAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgICAgIGZvbnQtZmFtaWx5OiAke3Rva2Vucy5mb250LmJvZHl9O1xuICAgICAgICBmb250LXNpemU6IDE0cHg7XG4gICAgICAgIGxpbmUtaGVpZ2h0OiAxLjQ1O1xuICAgIH1cbiAgICAqLFxuICAgICo6OmJlZm9yZSxcbiAgICAqOjphZnRlciB7XG4gICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG4gICAgfVxuXG4gICAgYSB7XG4gICAgICAgIGNvbG9yOiB2YXIoLS1saW5rKTtcbiAgICAgICAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xuICAgIH1cbiAgICBhOmhvdmVyIHtcbiAgICAgICAgY29sb3I6IHZhcigtLWxpbmstaG92ZXIpO1xuICAgICAgICB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbiAgICB9XG5cbiAgICBociB7XG4gICAgICAgIGJvcmRlcjogMDtcbiAgICAgICAgYm9yZGVyLXRvcDogMXB4IHNvbGlkIHZhcigtLWJvcmRlcik7XG4gICAgICAgIG1hcmdpbjogJHt0b2tlbnMuc3BhY2UubWR9IDA7XG4gICAgfVxuXG4gICAgaDEsXG4gICAgaDIsXG4gICAgaDMsXG4gICAgaDQge1xuICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICB9XG4gICAgaDEge1xuICAgICAgICBmb250LXNpemU6IDIycHg7XG4gICAgICAgIG1hcmdpbjogMCAwICR7dG9rZW5zLnNwYWNlLmxnfSAwO1xuICAgIH1cbiAgICBoMiB7XG4gICAgICAgIGZvbnQtc2l6ZTogMThweDtcbiAgICAgICAgbWFyZ2luOiAwIDAgJHt0b2tlbnMuc3BhY2UubWR9IDA7XG4gICAgfVxuICAgIGgzIHtcbiAgICAgICAgZm9udC1zaXplOiAxNnB4O1xuICAgICAgICBtYXJnaW46IDAgMCAke3Rva2Vucy5zcGFjZS5zbX0gMDtcbiAgICB9XG5cbiAgICBidXR0b24ge1xuICAgICAgICBmb250LWZhbWlseTogaW5oZXJpdDtcbiAgICAgICAgZm9udC1zaXplOiBpbmhlcml0O1xuICAgIH1cblxuICAgIGlucHV0W3R5cGU9J3RleHQnXSxcbiAgICBpbnB1dFt0eXBlPSdudW1iZXInXSxcbiAgICBzZWxlY3QsXG4gICAgdGV4dGFyZWEge1xuICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1pbnB1dC1iZyk7XG4gICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1pbnB1dC1ib3JkZXIpO1xuICAgICAgICBib3JkZXItcmFkaXVzOiAke3Rva2Vucy5yYWRpdXMuc219O1xuICAgICAgICBwYWRkaW5nOiA2cHggOHB4O1xuICAgICAgICBmb250LWZhbWlseTogaW5oZXJpdDtcbiAgICAgICAgZm9udC1zaXplOiBpbmhlcml0O1xuICAgICAgICBvdXRsaW5lOiBub25lO1xuICAgICAgICAmOmZvY3VzIHtcbiAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0taW5wdXQtZm9jdXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaW5wdXRbdHlwZT0nY2hlY2tib3gnXSB7XG4gICAgICAgIGFjY2VudC1jb2xvcjogdmFyKC0tbGluayk7XG4gICAgfVxuYDtcbi8vIE1hcmtkb3duIG91dHB1dCBzdHlsZXMgKHBvcnRlZCBlc3NlbnRpYWxzIGZyb20gd2Vic2l0ZS9zcmMvc2Fzcy9tYXJrZG93bi5zYXNzXG4vLyBhbmQgY29tbWVudC5zYXNzKS4gQXBwbGllZCBpbnNpZGUgLm1kLWJvZHkgY29udGFpbmVycy5cbmV4cG9ydCBjb25zdCBnbG9iYWxNYXJrZG93biA9IGNzcyBgXG4gICAgLm1kLWJvZHkge1xuICAgICAgICB3b3JkLWJyZWFrOiBicmVhay13b3JkO1xuICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICB9XG4gICAgLm1kLWJvZHkgcCB7XG4gICAgICAgIG1hcmdpbjogMC41ZW0gMDtcbiAgICAgICAgbGluZS1oZWlnaHQ6IDEuNDU7XG4gICAgfVxuICAgIC5tZC1ib2R5IGEge1xuICAgICAgICBjb2xvcjogdmFyKC0tbGluayk7XG4gICAgfVxuICAgIC5tZC1ib2R5IGE6aG92ZXIge1xuICAgICAgICBjb2xvcjogdmFyKC0tbGluay1ob3Zlcik7XG4gICAgfVxuICAgIC5tZC1ib2R5IHVsLFxuICAgIC5tZC1ib2R5IG9sIHtcbiAgICAgICAgbWFyZ2luOiAwLjVlbSAwO1xuICAgICAgICBwYWRkaW5nLWxlZnQ6IDEuNWVtO1xuICAgIH1cbiAgICAubWQtYm9keSBsaSB7XG4gICAgICAgIG1hcmdpbjogMC4yZW0gMDtcbiAgICB9XG4gICAgLm1kLWJvZHkgYmxvY2txdW90ZSB7XG4gICAgICAgIGJvcmRlci1sZWZ0OiAzcHggc29saWQgdmFyKC0tYm9yZGVyLWxpZ2h0KTtcbiAgICAgICAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTtcbiAgICAgICAgcGFkZGluZy1sZWZ0OiAxMHB4O1xuICAgICAgICBtYXJnaW46IDAuNWVtIDA7XG4gICAgfVxuICAgIC5tZC1ib2R5IHByZSB7XG4gICAgICAgIG1hcmdpbjogMC41ZW0gMDtcbiAgICAgICAgcGFkZGluZzogOHB4IDEwcHg7XG4gICAgICAgIG92ZXJmbG93OiBhdXRvO1xuICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1jb2RlLWJvcmRlcik7XG4gICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWNvZGUtYmcpO1xuICAgICAgICBib3JkZXItcmFkaXVzOiAke3Rva2Vucy5yYWRpdXMubWR9O1xuICAgIH1cbiAgICAubWQtYm9keSBjb2RlIHtcbiAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tY29kZS1iZyk7XG4gICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWNvZGUtYm9yZGVyKTtcbiAgICAgICAgYm9yZGVyLXJhZGl1czogM3B4O1xuICAgICAgICBwYWRkaW5nOiAwIDRweDtcbiAgICAgICAgZm9udC1mYW1pbHk6ICR7dG9rZW5zLmZvbnQubW9ub307XG4gICAgICAgIGZvbnQtc2l6ZTogMC45MmVtO1xuICAgIH1cbiAgICAubWQtYm9keSBwcmUgY29kZSB7XG4gICAgICAgIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xuICAgICAgICBib3JkZXI6IDA7XG4gICAgICAgIHBhZGRpbmc6IDA7XG4gICAgICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgICAgICB3aGl0ZS1zcGFjZTogcHJlO1xuICAgIH1cbiAgICAubWQtYm9keSBoMSxcbiAgICAubWQtYm9keSBoMixcbiAgICAubWQtYm9keSBoMyxcbiAgICAubWQtYm9keSBoNCB7XG4gICAgICAgIG1hcmdpbjogMC42ZW0gMCAwLjNlbSAwO1xuICAgIH1cbiAgICAubWQtYm9keSA+ICo6Zmlyc3Qtb2YtdHlwZSB7XG4gICAgICAgIG1hcmdpbi10b3A6IDA7XG4gICAgfVxuICAgIC5tZC1ib2R5ID4gKjpsYXN0LWNoaWxkIHtcbiAgICAgICAgbWFyZ2luLWJvdHRvbTogMDtcbiAgICB9XG5gO1xuIiwiaW1wb3J0IHsganN4IGFzIF9qc3gsIEZyYWdtZW50IGFzIF9GcmFnbWVudCwganN4cyBhcyBfanN4cyB9IGZyb20gXCJyZWFjdC9qc3gtcnVudGltZVwiO1xuaW1wb3J0IFJlYWN0LCB7IHVzZUVmZmVjdCB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IEdsb2JhbCB9IGZyb20gJ0BlbW90aW9uL3JlYWN0JztcbmltcG9ydCB7IGdsb2JhbFRva2VucywgZ2xvYmFsQmFzZSwgZ2xvYmFsTWFya2Rvd24gfSBmcm9tICcuL3Rva2Vucyc7XG5leHBvcnQgY29uc3QgVEhFTUVfU1RPUkFHRV9LRVkgPSAndWlfdGhlbWUnO1xuZnVuY3Rpb24gYXBwbHlUaGVtZShtb2RlKSB7XG4gICAgY29uc3QgcmVzb2x2ZWQgPSBtb2RlID09PSAnYXV0bydcbiAgICAgICAgPyAod2luZG93Lm1hdGNoTWVkaWEgJiYgd2luZG93Lm1hdGNoTWVkaWEoJyhwcmVmZXJzLWNvbG9yLXNjaGVtZTogbGlnaHQpJykubWF0Y2hlc1xuICAgICAgICAgICAgPyAnbGlnaHQnXG4gICAgICAgICAgICA6ICdkYXJrJylcbiAgICAgICAgOiBtb2RlO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtdGhlbWUnLCByZXNvbHZlZCk7XG59XG5leHBvcnQgZnVuY3Rpb24gQXBwR2xvYmFsKCkge1xuICAgIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1RIRU1FX1NUT1JBR0VfS0VZXSwgcmVzID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RlID0gcmVzPy5bVEhFTUVfU1RPUkFHRV9LRVldIHx8ICdhdXRvJztcbiAgICAgICAgICAgICAgICBhcHBseVRoZW1lKG1vZGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgYXBwbHlUaGVtZSgnYXV0bycpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1xID0gd2luZG93Lm1hdGNoTWVkaWE/LignKHByZWZlcnMtY29sb3Itc2NoZW1lOiBsaWdodCknKTtcbiAgICAgICAgY29uc3QgaGFuZGxlciA9ICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFtUSEVNRV9TVE9SQUdFX0tFWV0sIHJlcyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGUgPSByZXM/LltUSEVNRV9TVE9SQUdFX0tFWV0gfHwgJ2F1dG8nO1xuICAgICAgICAgICAgICAgICAgICBpZiAobW9kZSA9PT0gJ2F1dG8nKVxuICAgICAgICAgICAgICAgICAgICAgICAgYXBwbHlUaGVtZSgnYXV0bycpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICB2b2lkIGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIG1xPy5hZGRFdmVudExpc3RlbmVyPy4oJ2NoYW5nZScsIGhhbmRsZXIpO1xuICAgICAgICBjb25zdCBvblN0b3JhZ2VDaGFuZ2VkID0gKGNoYW5nZXMsIGFyZWEpID0+IHtcbiAgICAgICAgICAgIGlmIChhcmVhID09PSAnbG9jYWwnICYmIGNoYW5nZXNbVEhFTUVfU1RPUkFHRV9LRVldKSB7XG4gICAgICAgICAgICAgICAgYXBwbHlUaGVtZShjaGFuZ2VzW1RIRU1FX1NUT1JBR0VfS0VZXS5uZXdWYWx1ZSB8fCAnYXV0bycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBjaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIob25TdG9yYWdlQ2hhbmdlZCk7XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICBtcT8ucmVtb3ZlRXZlbnRMaXN0ZW5lcj8uKCdjaGFuZ2UnLCBoYW5kbGVyKTtcbiAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5yZW1vdmVMaXN0ZW5lcihvblN0b3JhZ2VDaGFuZ2VkKTtcbiAgICAgICAgfTtcbiAgICB9LCBbXSk7XG4gICAgcmV0dXJuIChfanN4cyhfRnJhZ21lbnQsIHsgY2hpbGRyZW46IFtfanN4KEdsb2JhbCwgeyBzdHlsZXM6IGdsb2JhbFRva2VucyB9KSwgX2pzeChHbG9iYWwsIHsgc3R5bGVzOiBnbG9iYWxCYXNlIH0pLCBfanN4KEdsb2JhbCwgeyBzdHlsZXM6IGdsb2JhbE1hcmtkb3duIH0pXSB9KSk7XG59XG5leHBvcnQgZnVuY3Rpb24gc2V0VGhlbWVNb2RlKG1vZGUpIHtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbVEhFTUVfU1RPUkFHRV9LRVldOiBtb2RlIH0pO1xuICAgIGFwcGx5VGhlbWUobW9kZSk7XG59XG4iLCJpbXBvcnQgc3R5bGVkIGZyb20gJ0BlbW90aW9uL3N0eWxlZCc7XG5pbXBvcnQgeyBjc3MgfSBmcm9tICdAZW1vdGlvbi9yZWFjdCc7XG5pbXBvcnQgeyB0b2tlbnMgfSBmcm9tICcuL3Rva2Vucyc7XG5leHBvcnQgY29uc3QgQmx1ZUxpbmsgPSBzdHlsZWQuYSBgXG4gICAgY29sb3I6IHZhcigtLWxpbmspO1xuICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbiAgICAmOmhvdmVyIHtcbiAgICAgICAgY29sb3I6IHZhcigtLWxpbmstaG92ZXIpO1xuICAgICAgICB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbiAgICB9XG5gO1xuZXhwb3J0IGNvbnN0IE11dGVkTGluayA9IHN0eWxlZC5hIGBcbiAgICBjb2xvcjogdmFyKC0tdGV4dC1zZWNvbmRhcnkpO1xuICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbiAgICAmOmhvdmVyIHtcbiAgICAgICAgY29sb3I6IHZhcigtLWxpbmstaG92ZXIpO1xuICAgICAgICB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbiAgICB9XG5gO1xuZXhwb3J0IGNvbnN0IEFjdGlvbkJ0biA9IHN0eWxlZC5idXR0b24gYFxuICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIG1hcmdpbi10b3A6IDZweDtcbiAgICBwYWRkaW5nOiA4cHggMTBweDtcbiAgICBiYWNrZ3JvdW5kOiB2YXIoLS1hY2NlbnQpO1xuICAgIGNvbG9yOiB2YXIoLS10ZXh0LW9uLWFjY2VudCk7XG4gICAgYm9yZGVyOiAwO1xuICAgIGJvcmRlci1yYWRpdXM6ICR7dG9rZW5zLnJhZGl1cy5tZH07XG4gICAgY3Vyc29yOiBwb2ludGVyO1xuICAgIGZvbnQtc2l6ZTogMC45NWVtO1xuICAgIGZvbnQtd2VpZ2h0OiA2MDA7XG4gICAgdHJhbnNpdGlvbjogYmFja2dyb3VuZCAwLjE1cyBlYXNlO1xuICAgICY6aG92ZXIge1xuICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1hY2NlbnQtaG92ZXIpO1xuICAgIH1cbiAgICAmOmRpc2FibGVkIHtcbiAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYnV0dG9uLWJnKTtcbiAgICAgICAgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpO1xuICAgICAgICBjdXJzb3I6IHdhaXQ7XG4gICAgfVxuYDtcbmV4cG9ydCBjb25zdCBCdXR0b24gPSBzdHlsZWQuYnV0dG9uIGBcbiAgICBkaXNwbGF5OiBpbmxpbmUtZmxleDtcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICAgIGdhcDogNnB4O1xuICAgIHBhZGRpbmc6IDZweCAxMnB4O1xuICAgIGJvcmRlci1yYWRpdXM6ICR7dG9rZW5zLnJhZGl1cy5tZH07XG4gICAgZm9udC1zaXplOiAwLjkyZW07XG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcbiAgICBjdXJzb3I6IHBvaW50ZXI7XG4gICAgYm9yZGVyOiAxcHggc29saWQgdHJhbnNwYXJlbnQ7XG4gICAgdHJhbnNpdGlvbjpcbiAgICAgICAgYmFja2dyb3VuZCAwLjE1cyBlYXNlLFxuICAgICAgICBib3JkZXItY29sb3IgMC4xNXMgZWFzZSxcbiAgICAgICAgY29sb3IgMC4xNXMgZWFzZTtcbiAgICAke3AgPT4ge1xuICAgIHN3aXRjaCAocC52YXJpYW50KSB7XG4gICAgICAgIGNhc2UgJ3NlY29uZGFyeSc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYnV0dG9uLWJnKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLWJ1dHRvbi10ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1ib3JkZXIpO1xuICAgICAgICAgICAgICAgICAgICAmOmhvdmVyIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWJnLXN1cmZhY2UtaG92ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAnZ2hvc3QnOlxuICAgICAgICAgICAgcmV0dXJuIGNzcyBgXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tbGluayk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdHJhbnNwYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgICY6aG92ZXIge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYmctc3VyZmFjZS1ob3Zlcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICBjYXNlICdwcmltYXJ5JzpcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1hY2NlbnQpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1vbi1hY2NlbnQpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLWFjY2VudCk7XG4gICAgICAgICAgICAgICAgICAgICY6aG92ZXIge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYWNjZW50LWhvdmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tYWNjZW50LWhvdmVyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGA7XG4gICAgfVxufX1cbiAgICAmOmRpc2FibGVkIHtcbiAgICAgICAgb3BhY2l0eTogMC42O1xuICAgICAgICBjdXJzb3I6IG5vdC1hbGxvd2VkO1xuICAgIH1cbmA7XG5leHBvcnQgY29uc3QgTWVzc2FnZUJhbm5lciA9IHN0eWxlZC5kaXYgYFxuICAgIHBhZGRpbmc6IDEwcHggMTJweDtcbiAgICBtYXJnaW46IDZweCAwO1xuICAgIGJvcmRlci1yYWRpdXM6ICR7dG9rZW5zLnJhZGl1cy5tZH07XG4gICAgZm9udC1zaXplOiAwLjkyZW07XG4gICAgJHtwID0+IHtcbiAgICBzd2l0Y2ggKHAudmFyaWFudCkge1xuICAgICAgICBjYXNlICd3YXJuaW5nJzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1sb2NrZWQtYmcpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1sb2NrZWQtYm9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAnc3VjY2Vzcyc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYXBwcm92ZWQtYmcpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1hcHByb3ZlZC1ib3JkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICBjYXNlICduZXdzJzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1ub3RlLWJnKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyLWxpZ2h0KTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAnaW5mbyc6XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYmctc3VyZmFjZSk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJvcmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXNlY29uZGFyeSk7XG4gICAgICAgICAgICAgICAgYDtcbiAgICB9XG59fVxuYDtcbmV4cG9ydCBjb25zdCBDYXJkID0gc3R5bGVkLmRpdiBgXG4gICAgYmFja2dyb3VuZDogdmFyKC0tYmctc3VyZmFjZSk7XG4gICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTtcbiAgICBib3JkZXItcmFkaXVzOiAke3Rva2Vucy5yYWRpdXMubGd9O1xuICAgIHBhZGRpbmc6ICR7dG9rZW5zLnNwYWNlLm1kfSAke3Rva2Vucy5zcGFjZS5sZ307XG4gICAgbWFyZ2luLWJvdHRvbTogJHt0b2tlbnMuc3BhY2UubWR9O1xuICAgIHRyYW5zaXRpb246IGJvcmRlci1jb2xvciAwLjE1cyBlYXNlO1xuICAgICY6aG92ZXIge1xuICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLWJvcmRlci1saWdodCk7XG4gICAgfVxuYDtcbmV4cG9ydCBjb25zdCBDYXJkSGVhZGVyID0gc3R5bGVkLmRpdiBgXG4gICAgZGlzcGxheTogZmxleDtcbiAgICBmbGV4LXdyYXA6IHdyYXA7XG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICBnYXA6ICR7dG9rZW5zLnNwYWNlLnNtfTtcbiAgICBtYXJnaW4tYm90dG9tOiAke3Rva2Vucy5zcGFjZS54c307XG5gO1xuZXhwb3J0IGNvbnN0IENhcmRNZXRhID0gc3R5bGVkLmRpdiBgXG4gICAgZGlzcGxheTogZmxleDtcbiAgICBmbGV4LXdyYXA6IHdyYXA7XG4gICAgZ2FwOiAke3Rva2Vucy5zcGFjZS5zbX07XG4gICAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTtcbiAgICBmb250LXNpemU6IDAuODVlbTtcbiAgICBtYXJnaW4tYm90dG9tOiAke3Rva2Vucy5zcGFjZS5zbX07XG4gICAgJiA+IHNwYW4gKyBzcGFuOjpiZWZvcmUge1xuICAgICAgICBjb250ZW50OiAnwrcnO1xuICAgICAgICBtYXJnaW4tcmlnaHQ6ICR7dG9rZW5zLnNwYWNlLnNtfTtcbiAgICAgICAgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpO1xuICAgIH1cbmA7XG5leHBvcnQgY29uc3QgQ2FyZEJvZHkgPSBzdHlsZWQuZGl2IGBcbiAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICBmb250LXNpemU6IDAuOTVlbTtcbmA7XG5leHBvcnQgY29uc3QgQ2FyZEFjdGlvbnMgPSBzdHlsZWQuZGl2IGBcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGdhcDogJHt0b2tlbnMuc3BhY2Uuc219O1xuICAgIG1hcmdpbi10b3A6ICR7dG9rZW5zLnNwYWNlLnNtfTtcbiAgICBwYWRkaW5nLXRvcDogJHt0b2tlbnMuc3BhY2Uuc219O1xuICAgIGJvcmRlci10b3A6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXIpO1xuYDtcbmV4cG9ydCBjb25zdCBCYWRnZSA9IHN0eWxlZC5zcGFuIGBcbiAgICBkaXNwbGF5OiBpbmxpbmUtZmxleDtcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgIHBhZGRpbmc6IDNweCAxMHB4O1xuICAgIGJvcmRlci1yYWRpdXM6ICR7dG9rZW5zLnJhZGl1cy5waWxsfTtcbiAgICBmb250LXdlaWdodDogNzAwO1xuICAgIGZvbnQtc2l6ZTogMC43NWVtO1xuICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XG4gICAgbGV0dGVyLXNwYWNpbmc6IDAuMDRlbTtcbiAgICB3aGl0ZS1zcGFjZTogbm93cmFwO1xuICAgIGJvcmRlcjogMXB4IHNvbGlkIHRyYW5zcGFyZW50O1xuICAgICR7cCA9PiB7XG4gICAgc3dpdGNoIChwLnZhcmlhbnQpIHtcbiAgICAgICAgY2FzZSAncmVtb3ZlZCc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tcmVtb3ZlZC1iZyk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tcmVtb3ZlZC1ib3JkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogI2ZmZjtcbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICBjYXNlICdkZWxldGVkJzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1kZWxldGVkLWJnKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1kZWxldGVkLWJvcmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiAjZmZmO1xuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgIGNhc2UgJ2FwcHJvdmVkJzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1hcHByb3ZlZC1iZyk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tYXBwcm92ZWQtYm9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAnbG9ja2VkJzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1sb2NrZWQtYmcpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLWxvY2tlZC1ib3JkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICBjYXNlICd1bmxvY2tlZCc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYXBwcm92ZWQtYmcpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLWFwcHJvdmVkLWJvcmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgIGNhc2UgJ2VkaXRlZCc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYmctc3VyZmFjZS1ob3Zlcik7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tYm9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAnZGVmYXVsdCc6XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYmctc3VyZmFjZS1ob3Zlcik7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tYm9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTtcbiAgICAgICAgICAgICAgICBgO1xuICAgIH1cbn19XG5gO1xuZXhwb3J0IGNvbnN0IFNlY3Rpb25IZWFkZXIgPSBzdHlsZWQuaDIgYFxuICAgIGZvbnQtc2l6ZTogMC43OGVtO1xuICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XG4gICAgbGV0dGVyLXNwYWNpbmc6IDAuMDhlbTtcbiAgICBjb2xvcjogdmFyKC0tdGV4dC1zZWNvbmRhcnkpO1xuICAgIG1hcmdpbjogJHt0b2tlbnMuc3BhY2UubGd9IDAgJHt0b2tlbnMuc3BhY2Uuc219IDA7XG4gICAgcGFkZGluZy1ib3R0b206ICR7dG9rZW5zLnNwYWNlLnhzfTtcbiAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTtcbmA7XG5leHBvcnQgY29uc3QgRmllbGQgPSBzdHlsZWQubGFiZWwgYFxuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG4gICAgZ2FwOiAke3Rva2Vucy5zcGFjZS5tZH07XG4gICAgcGFkZGluZzogJHt0b2tlbnMuc3BhY2Uuc219IDA7XG4gICAgJiA+IHNwYW4ubGFiZWwge1xuICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICAgICAgZm9udC1zaXplOiAwLjk1ZW07XG4gICAgfVxuICAgICYgPiBzcGFuLmhpbnQge1xuICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1tdXRlZCk7XG4gICAgICAgIGZvbnQtc2l6ZTogMC44MmVtO1xuICAgICAgICBkaXNwbGF5OiBibG9jaztcbiAgICAgICAgbWFyZ2luLXRvcDogMnB4O1xuICAgIH1cbmA7XG5leHBvcnQgY29uc3QgRmllbGRDb2wgPSBzdHlsZWQuZGl2IGBcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gICAgZmxleDogMTtcbiAgICBtaW4td2lkdGg6IDA7XG5gO1xuZXhwb3J0IGNvbnN0IE51bWJlcklucHV0ID0gc3R5bGVkLmlucHV0IGBcbiAgICB3aWR0aDogODBweDtcbiAgICB0ZXh0LWFsaWduOiByaWdodDtcbmA7XG5leHBvcnQgY29uc3QgVGV4dElucHV0ID0gc3R5bGVkLmlucHV0IGBcbiAgICB3aWR0aDogMTAwJTtcbmA7XG5leHBvcnQgY29uc3QgQXV0aG9yID0gc3R5bGVkLnNwYW4gYFxuICAgIGNvbG9yOiB2YXIoLS1hdXRob3IpO1xuICAgIGZvbnQtd2VpZ2h0OiA2MDA7XG5gO1xuZXhwb3J0IGNvbnN0IFN1YnJlZGRpdCA9IHN0eWxlZC5zcGFuIGBcbiAgICBjb2xvcjogdmFyKC0tdGV4dC1zZWNvbmRhcnkpO1xuYDtcbmV4cG9ydCBjb25zdCBQb3N0VGl0bGUgPSBzdHlsZWQuaDMgYFxuICAgIG1hcmdpbjogJHt0b2tlbnMuc3BhY2UueHN9IDAgJHt0b2tlbnMuc3BhY2Uuc219IDA7XG4gICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG5gO1xuZXhwb3J0IGNvbnN0IE1kQm9keSA9IHN0eWxlZC5kaXYgYFxuICAgIGZvbnQtc2l6ZTogMC45NWVtO1xuYDtcbiIsImltcG9ydCB7IGpzeCBhcyBfanN4LCBqc3hzIGFzIF9qc3hzLCBGcmFnbWVudCBhcyBfRnJhZ21lbnQgfSBmcm9tIFwicmVhY3QvanN4LXJ1bnRpbWVcIjtcbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBjcmVhdGVSb290IH0gZnJvbSAncmVhY3QtZG9tL2NsaWVudCc7XG5pbXBvcnQgc3R5bGVkIGZyb20gJ0BlbW90aW9uL3N0eWxlZCc7XG5pbXBvcnQgeyBBcHBHbG9iYWwgfSBmcm9tICcuL3VpL2dsb2JhbCc7XG5pbXBvcnQgeyBDYXJkLCBDYXJkQm9keSwgU2VjdGlvbkhlYWRlciwgQnV0dG9uLCBCbHVlTGluayB9IGZyb20gJy4vdWkvY29tcG9uZW50cyc7XG5pbXBvcnQgeyB0b2tlbnMgfSBmcm9tICcuL3VpL3Rva2Vucyc7XG5jb25zdCBQYWdlID0gc3R5bGVkLmRpdiBgXG4gIG1heC13aWR0aDogNzIwcHg7XG4gIG1hcmdpbjogMCBhdXRvO1xuICBwYWRkaW5nOiAke3Rva2Vucy5zcGFjZS54bH07XG5gO1xuY29uc3QgSGVybyA9IHN0eWxlZC5kaXYgYFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gIHBhZGRpbmc6ICR7dG9rZW5zLnNwYWNlLnhsfSAwO1xuICBib3JkZXItYm90dG9tOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTtcbiAgbWFyZ2luLWJvdHRvbTogJHt0b2tlbnMuc3BhY2UueGx9O1xuYDtcbmNvbnN0IFRpdGxlID0gc3R5bGVkLmgxIGBcbiAgZm9udC1zaXplOiAyOHB4O1xuICBtYXJnaW46IDAgMCAke3Rva2Vucy5zcGFjZS5zbX0gMDtcbmA7XG5jb25zdCBTdWJ0aXRsZSA9IHN0eWxlZC5wIGBcbiAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTtcbiAgbWFyZ2luOiAwO1xuICBmb250LXNpemU6IDEuMWVtO1xuYDtcbmNvbnN0IEZlYXR1cmUgPSBzdHlsZWQuZGl2IGBcbiAgbWFyZ2luLWJvdHRvbTogJHt0b2tlbnMuc3BhY2UubGd9O1xuICAmID4gaDMge1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICBnYXA6ICR7dG9rZW5zLnNwYWNlLnNtfTtcbiAgICBtYXJnaW4tYm90dG9tOiAke3Rva2Vucy5zcGFjZS54c307XG4gIH1cbiAgJiA+IHAge1xuICAgIG1hcmdpbjogMDtcbiAgICBjb2xvcjogdmFyKC0tdGV4dC1zZWNvbmRhcnkpO1xuICB9XG5gO1xuY29uc3QgRm9vdGVyID0gc3R5bGVkLmRpdiBgXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgbWFyZ2luLXRvcDogJHt0b2tlbnMuc3BhY2UueGx9O1xuICBwYWRkaW5nLXRvcDogJHt0b2tlbnMuc3BhY2UubGd9O1xuICBib3JkZXItdG9wOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTtcbiAgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpO1xuICBmb250LXNpemU6IDAuOWVtO1xuYDtcbmZ1bmN0aW9uIFdoYXRzTmV3KCkge1xuICAgIGNvbnN0IHZlcnNpb24gPSAoKCkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIGNocm9tZS5ydW50aW1lLmdldE1hbmlmZXN0KCkudmVyc2lvbjtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICB9KSgpO1xuICAgIGNvbnN0IG9wZW5IaXN0b3J5ID0gKCkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY2hyb21lLnRhYnMuY3JlYXRlKHsgdXJsOiBjaHJvbWUucnVudGltZS5nZXRVUkwoJ3NyYy9oaXN0b3J5Lmh0bWwnKSB9KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ29wZW5IaXN0b3J5IGZhaWxlZDonLCBlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIChfanN4cyhfRnJhZ21lbnQsIHsgY2hpbGRyZW46IFtfanN4KEFwcEdsb2JhbCwge30pLCBfanN4cyhQYWdlLCB7IGNoaWxkcmVuOiBbX2pzeHMoSGVybywgeyBjaGlsZHJlbjogW19qc3goVGl0bGUsIHsgY2hpbGRyZW46IFwiV2hhdCdzIG5ldyBpbiByZXZlZGRpdCByZWFsLXRpbWVcIiB9KSwgX2pzeHMoU3VidGl0bGUsIHsgY2hpbGRyZW46IFtcIkEgcmVkZXNpZ24gdG8gbWF0Y2ggcmV2ZWRkaXQuY29tIFwiLCB2ZXJzaW9uID8gYMK3IHYke3ZlcnNpb259YCA6ICcnXSB9KV0gfSksIF9qc3goU2VjdGlvbkhlYWRlciwgeyBjaGlsZHJlbjogXCJIaWdobGlnaHRzXCIgfSksIF9qc3goQ2FyZCwgeyBjaGlsZHJlbjogX2pzeHMoQ2FyZEJvZHksIHsgY2hpbGRyZW46IFtfanN4cyhGZWF0dXJlLCB7IGNoaWxkcmVuOiBbX2pzeChcImgzXCIsIHsgY2hpbGRyZW46IFwiRnJlc2ggbG9vaywgZGFyayBieSBkZWZhdWx0XCIgfSksIF9qc3goXCJwXCIsIHsgY2hpbGRyZW46IFwiVGhlIHBvcHVwLCBvcHRpb25zLCBhbmQgaGlzdG9yeSBwYWdlcyBoYXZlIGJlZW4gcmVidWlsdCB0byBtYXRjaCB0aGUgcmV2ZGRpdC5jb20gZGVzaWduLiBEYXJrIGlzIHRoZSBkZWZhdWx0LCB3aXRoIGEgbGlnaHQgbW9kZSB5b3UgY2FuIHBpY2sgZnJvbSB0aGUgb3B0aW9ucyBwYWdlLlwiIH0pXSB9KSwgX2pzeHMoRmVhdHVyZSwgeyBjaGlsZHJlbjogW19qc3goXCJoM1wiLCB7IGNoaWxkcmVuOiBcIkhpc3Rvcnkgc2hvd3MgcmVhbCBjb21tZW50cyBhbmQgcG9zdHNcIiB9KSwgX2pzeChcInBcIiwgeyBjaGlsZHJlbjogXCJFYWNoIHJlbW92YWwsIGRlbGV0aW9uLCBvciBsb2NrIG5vdyByZW5kZXJzIGFzIGEgUmVkZGl0LXN0eWxlIGNhcmQgd2l0aCB0aGUgZnVsbCBtYXJrZG93biBib2R5IFxcdTIwMTQgbm8gbW9yZSB0cnVuY2F0ZWQgbGluayBsYWJlbHMuIEZpbHRlciBhbmQgc29ydCBmcm9tIHRoZSB0b3Agb2YgdGhlIHBhZ2UuXCIgfSldIH0pLCBfanN4cyhGZWF0dXJlLCB7IGNoaWxkcmVuOiBbX2pzeChcImgzXCIsIHsgY2hpbGRyZW46IFwiU2FtZSBzZXR0aW5ncywgY2xlYXJlciBsYXlvdXRcIiB9KSwgX2pzeChcInBcIiwgeyBjaGlsZHJlbjogXCJBbGwgb2YgeW91ciBleGlzdGluZyBvcHRpb25zIGFuZCBzdWJzY3JpcHRpb25zIGNhcnJ5IG92ZXIgdW5jaGFuZ2VkLiBUaGUgb3B0aW9ucyBwYWdlIGlzIG5vdyBncm91cGVkIGludG8gc2VjdGlvbnMgc28gbm90aGluZyBnZXRzIGxvc3QuXCIgfSldIH0pXSB9KSB9KSwgX2pzeHMoRm9vdGVyLCB7IGNoaWxkcmVuOiBbX2pzeChCdXR0b24sIHsgdmFyaWFudDogXCJwcmltYXJ5XCIsIG9uQ2xpY2s6IG9wZW5IaXN0b3J5LCBjaGlsZHJlbjogXCJPcGVuIGhpc3RvcnlcIiB9KSwgX2pzeHMoXCJkaXZcIiwgeyBzdHlsZTogeyBtYXJnaW5Ub3A6IDE2IH0sIGNoaWxkcmVuOiBbXCJRdWVzdGlvbnMgb3IgZmVlZGJhY2s/XCIsICcgJywgX2pzeChCbHVlTGluaywgeyBocmVmOiBcImh0dHBzOi8vd3d3LnJlZGRpdC5jb20vci9yZXZlZGRpdFwiLCB0YXJnZXQ6IFwiX2JsYW5rXCIsIHJlbDogXCJub3JlZmVycmVyXCIsIGNoaWxkcmVuOiBcInIvcmV2ZWRkaXRcIiB9KV0gfSldIH0pXSB9KV0gfSkpO1xufVxuY3JlYXRlUm9vdChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpKS5yZW5kZXIoX2pzeChXaGF0c05ldywge30pKTtcbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4vLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuX193ZWJwYWNrX3JlcXVpcmVfXy5tID0gX193ZWJwYWNrX21vZHVsZXNfXztcblxuIiwiLy8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbl9fd2VicGFja19yZXF1aXJlX18ubiA9IChtb2R1bGUpID0+IHtcblx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG5cdFx0KCkgPT4gKG1vZHVsZVsnZGVmYXVsdCddKSA6XG5cdFx0KCkgPT4gKG1vZHVsZSk7XG5cdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsIHsgYTogZ2V0dGVyIH0pO1xuXHRyZXR1cm4gZ2V0dGVyO1xufTsiLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5qID0gNDc7IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLmIgPSBkb2N1bWVudC5iYXNlVVJJIHx8IHNlbGYubG9jYXRpb24uaHJlZjtcblxuLy8gb2JqZWN0IHRvIHN0b3JlIGxvYWRlZCBhbmQgbG9hZGluZyBjaHVua3Ncbi8vIHVuZGVmaW5lZCA9IGNodW5rIG5vdCBsb2FkZWQsIG51bGwgPSBjaHVuayBwcmVsb2FkZWQvcHJlZmV0Y2hlZFxuLy8gW3Jlc29sdmUsIHJlamVjdCwgUHJvbWlzZV0gPSBjaHVuayBsb2FkaW5nLCAwID0gY2h1bmsgbG9hZGVkXG52YXIgaW5zdGFsbGVkQ2h1bmtzID0ge1xuXHQ0NzogMFxufTtcblxuLy8gbm8gY2h1bmsgb24gZGVtYW5kIGxvYWRpbmdcblxuLy8gbm8gcHJlZmV0Y2hpbmdcblxuLy8gbm8gcHJlbG9hZGVkXG5cbi8vIG5vIEhNUlxuXG4vLyBubyBITVIgbWFuaWZlc3RcblxuX193ZWJwYWNrX3JlcXVpcmVfXy5PLmogPSAoY2h1bmtJZCkgPT4gKGluc3RhbGxlZENodW5rc1tjaHVua0lkXSA9PT0gMCk7XG5cbi8vIGluc3RhbGwgYSBKU09OUCBjYWxsYmFjayBmb3IgY2h1bmsgbG9hZGluZ1xudmFyIHdlYnBhY2tKc29ucENhbGxiYWNrID0gKHBhcmVudENodW5rTG9hZGluZ0Z1bmN0aW9uLCBkYXRhKSA9PiB7XG5cdHZhciBbY2h1bmtJZHMsIG1vcmVNb2R1bGVzLCBydW50aW1lXSA9IGRhdGE7XG5cdC8vIGFkZCBcIm1vcmVNb2R1bGVzXCIgdG8gdGhlIG1vZHVsZXMgb2JqZWN0LFxuXHQvLyB0aGVuIGZsYWcgYWxsIFwiY2h1bmtJZHNcIiBhcyBsb2FkZWQgYW5kIGZpcmUgY2FsbGJhY2tcblx0dmFyIG1vZHVsZUlkLCBjaHVua0lkLCBpID0gMDtcblx0aWYoY2h1bmtJZHMuc29tZSgoaWQpID0+IChpbnN0YWxsZWRDaHVua3NbaWRdICE9PSAwKSkpIHtcblx0XHRmb3IobW9kdWxlSWQgaW4gbW9yZU1vZHVsZXMpIHtcblx0XHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhtb3JlTW9kdWxlcywgbW9kdWxlSWQpKSB7XG5cdFx0XHRcdF9fd2VicGFja19yZXF1aXJlX18ubVttb2R1bGVJZF0gPSBtb3JlTW9kdWxlc1ttb2R1bGVJZF07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmKHJ1bnRpbWUpIHZhciByZXN1bHQgPSBydW50aW1lKF9fd2VicGFja19yZXF1aXJlX18pO1xuXHR9XG5cdGlmKHBhcmVudENodW5rTG9hZGluZ0Z1bmN0aW9uKSBwYXJlbnRDaHVua0xvYWRpbmdGdW5jdGlvbihkYXRhKTtcblx0Zm9yKDtpIDwgY2h1bmtJZHMubGVuZ3RoOyBpKyspIHtcblx0XHRjaHVua0lkID0gY2h1bmtJZHNbaV07XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGluc3RhbGxlZENodW5rcywgY2h1bmtJZCkgJiYgaW5zdGFsbGVkQ2h1bmtzW2NodW5rSWRdKSB7XG5cdFx0XHRpbnN0YWxsZWRDaHVua3NbY2h1bmtJZF1bMF0oKTtcblx0XHR9XG5cdFx0aW5zdGFsbGVkQ2h1bmtzW2NodW5rSWRdID0gMDtcblx0fVxuXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXy5PKHJlc3VsdCk7XG59XG5cbnZhciBjaHVua0xvYWRpbmdHbG9iYWwgPSBzZWxmW1wid2VicGFja0NodW5rcmV2ZWRkaXRfcmVhbF90aW1lXCJdID0gc2VsZltcIndlYnBhY2tDaHVua3JldmVkZGl0X3JlYWxfdGltZVwiXSB8fCBbXTtcbmNodW5rTG9hZGluZ0dsb2JhbC5mb3JFYWNoKHdlYnBhY2tKc29ucENhbGxiYWNrLmJpbmQobnVsbCwgMCkpO1xuY2h1bmtMb2FkaW5nR2xvYmFsLnB1c2ggPSB3ZWJwYWNrSnNvbnBDYWxsYmFjay5iaW5kKG51bGwsIGNodW5rTG9hZGluZ0dsb2JhbC5wdXNoLmJpbmQoY2h1bmtMb2FkaW5nR2xvYmFsKSk7IiwiLy8gc3RhcnR1cFxuLy8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4vLyBUaGlzIGVudHJ5IG1vZHVsZSBkZXBlbmRzIG9uIG90aGVyIGxvYWRlZCBjaHVua3MgYW5kIGV4ZWN1dGlvbiBuZWVkIHRvIGJlIGRlbGF5ZWRcbnZhciBfX3dlYnBhY2tfZXhwb3J0c19fID0gX193ZWJwYWNrX3JlcXVpcmVfXy5PKHVuZGVmaW5lZCwgWzczNl0sICgpID0+IChfX3dlYnBhY2tfcmVxdWlyZV9fKDM1MDUpKSlcbl9fd2VicGFja19leHBvcnRzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fLk8oX193ZWJwYWNrX2V4cG9ydHNfXyk7XG4iXSwibmFtZXMiOlsiZGVmZXJyZWQiLCJsZWFmUHJvdG90eXBlcyIsImdldFByb3RvIiwidG9rZW5zIiwic20iLCJtZCIsImxnIiwicGlsbCIsInhzIiwieGwiLCJib2R5IiwibW9ubyIsImdsb2JhbFRva2VucyIsImdsb2JhbEJhc2UiLCJnbG9iYWxNYXJrZG93biIsIlRIRU1FX1NUT1JBR0VfS0VZIiwiYXBwbHlUaGVtZSIsIm1vZGUiLCJyZXNvbHZlZCIsIndpbmRvdyIsIm1hdGNoTWVkaWEiLCJtYXRjaGVzIiwiZG9jdW1lbnQiLCJkb2N1bWVudEVsZW1lbnQiLCJzZXRBdHRyaWJ1dGUiLCJBcHBHbG9iYWwiLCJ1c2VFZmZlY3QiLCJjaHJvbWUiLCJzdG9yYWdlIiwibG9jYWwiLCJnZXQiLCJyZXMiLCJtcSIsImhhbmRsZXIiLCJlIiwiYWRkRXZlbnRMaXN0ZW5lciIsIm9uU3RvcmFnZUNoYW5nZWQiLCJjaGFuZ2VzIiwiYXJlYSIsIm5ld1ZhbHVlIiwib25DaGFuZ2VkIiwiYWRkTGlzdGVuZXIiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwicmVtb3ZlTGlzdGVuZXIiLCJjaGlsZHJlbiIsInN0eWxlcyIsIkJsdWVMaW5rIiwiYSIsIkJ1dHRvbiIsImJ1dHRvbiIsInAiLCJ2YXJpYW50IiwiQ2FyZCIsImRpdiIsIkNhcmRCb2R5IiwiU2VjdGlvbkhlYWRlciIsInNwYW4iLCJoMiIsIlBhZ2UiLCJsYWJlbCIsImlucHV0IiwiaDMiLCJIZXJvIiwiVGl0bGUiLCJoMSIsIlN1YnRpdGxlIiwiRmVhdHVyZSIsIkZvb3RlciIsImNyZWF0ZVJvb3QiLCJnZXRFbGVtZW50QnlJZCIsInJlbmRlciIsInZlcnNpb24iLCJydW50aW1lIiwiZ2V0TWFuaWZlc3QiLCJvbkNsaWNrIiwidGFicyIsImNyZWF0ZSIsInVybCIsImdldFVSTCIsImNvbnNvbGUiLCJsb2ciLCJzdHlsZSIsIm1hcmdpblRvcCIsImhyZWYiLCJ0YXJnZXQiLCJyZWwiLCJfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18iLCJfX3dlYnBhY2tfcmVxdWlyZV9fIiwibW9kdWxlSWQiLCJjYWNoZWRNb2R1bGUiLCJ1bmRlZmluZWQiLCJleHBvcnRzIiwibW9kdWxlIiwiX193ZWJwYWNrX21vZHVsZXNfXyIsImNhbGwiLCJtIiwiTyIsInJlc3VsdCIsImNodW5rSWRzIiwiZm4iLCJwcmlvcml0eSIsIm5vdEZ1bGZpbGxlZCIsIkluZmluaXR5IiwiaSIsImxlbmd0aCIsImZ1bGZpbGxlZCIsImoiLCJPYmplY3QiLCJrZXlzIiwiZXZlcnkiLCJrZXkiLCJzcGxpY2UiLCJyIiwibiIsImdldHRlciIsIl9fZXNNb2R1bGUiLCJkIiwiZ2V0UHJvdG90eXBlT2YiLCJvYmoiLCJ0IiwidmFsdWUiLCJ0aGlzIiwidGhlbiIsIm5zIiwiZGVmIiwiY3VycmVudCIsImluZGV4T2YiLCJnZXRPd25Qcm9wZXJ0eU5hbWVzIiwiZm9yRWFjaCIsImRlZmluaXRpb24iLCJvIiwiZGVmaW5lUHJvcGVydHkiLCJlbnVtZXJhYmxlIiwicHJvcCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiU3ltYm9sIiwidG9TdHJpbmdUYWciLCJiIiwiYmFzZVVSSSIsInNlbGYiLCJsb2NhdGlvbiIsImluc3RhbGxlZENodW5rcyIsImNodW5rSWQiLCJ3ZWJwYWNrSnNvbnBDYWxsYmFjayIsInBhcmVudENodW5rTG9hZGluZ0Z1bmN0aW9uIiwiZGF0YSIsIm1vcmVNb2R1bGVzIiwic29tZSIsImlkIiwiY2h1bmtMb2FkaW5nR2xvYmFsIiwiYmluZCIsInB1c2giLCJfX3dlYnBhY2tfZXhwb3J0c19fIl0sInNvdXJjZVJvb3QiOiIifQ==