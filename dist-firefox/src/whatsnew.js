(()=>{"use strict";var e,r,o,t={3505:(e,r,o)=>{var t=o(5893),a=o(7294),n=o(745),d=o(3867),i=o(917);const c={sm:"4px",md:"6px",lg:"8px",pill:"999px"},s={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px"},l={body:'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},b=i.iv`
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
`,g="ui_theme";function v(e){const r="auto"===e?window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark":e;document.documentElement.setAttribute("data-theme",r)}function u(){return(0,a.useEffect)((()=>{try{chrome.storage.local.get([g],(e=>{v(e?.[g]||"auto")}))}catch{v("auto")}const e=window.matchMedia?.("(prefers-color-scheme: light)"),r=()=>{try{chrome.storage.local.get([g],(e=>{"auto"===(e?.[g]||"auto")&&v("auto")}))}catch(e){}};e?.addEventListener?.("change",r);const o=(e,r)=>{"local"===r&&e[g]&&v(e[g].newValue||"auto")};return chrome.storage.onChanged.addListener(o),()=>{e?.removeEventListener?.("change",r),chrome.storage.onChanged.removeListener(o)}}),[]),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(i.xB,{styles:b}),(0,t.jsx)(i.xB,{styles:p}),(0,t.jsx)(i.xB,{styles:m})]})}const f=d.Z.a`
    color: var(--link);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,h=(d.Z.a`
    color: var(--text-secondary);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,d.Z.button`
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
`,d.Z.button`
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
`),x=(d.Z.div`
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
`,d.Z.span`
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    vertical-align: middle;
    margin-right: 6px;
    animation: mini-spin 0.8s linear infinite;
    @keyframes mini-spin {
        to {
            transform: rotate(360deg);
        }
    }
`,d.Z.div`
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: ${c.lg};
    padding: ${s.md} ${s.lg};
    margin-bottom: ${s.md};
    transition: border-color 0.15s ease;
    &:hover {
        border-color: var(--border-light);
    }
`),y=(d.Z.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${s.sm};
    margin-bottom: ${s.xs};
`,d.Z.div`
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
`,d.Z.div`
    color: var(--text-primary);
    font-size: 0.95em;
`),k=(d.Z.div`
    display: flex;
    gap: ${s.sm};
    margin-top: ${s.sm};
    padding-top: ${s.sm};
    border-top: 1px solid var(--border);
`,d.Z.span`
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
`,d.Z.h2`
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin: ${s.lg} 0 ${s.sm} 0;
    padding-bottom: ${s.xs};
    border-bottom: 1px solid var(--border);
`),w=(d.Z.label`
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
`,d.Z.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
`,d.Z.input`
    width: 80px;
    text-align: right;
`,d.Z.input`
    width: 100%;
`,d.Z.span`
    color: var(--author);
    font-weight: 600;
`,d.Z.span`
    color: var(--text-secondary);
`,d.Z.h3`
    margin: ${s.xs} 0 ${s.sm} 0;
    color: var(--text-primary);
`,d.Z.div`
    font-size: 0.95em;
`,d.Z.div`
  max-width: 720px;
  margin: 0 auto;
  padding: ${s.xl};
`),$=d.Z.div`
  text-align: center;
  padding: ${s.xl} 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: ${s.xl};
`,j=d.Z.h1`
  font-size: 28px;
  margin: 0 0 ${s.sm} 0;
`,Z=d.Z.p`
  color: var(--text-secondary);
  margin: 0;
  font-size: 1.1em;
`,O=d.Z.div`
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
`,z=d.Z.div`
  text-align: center;
  margin-top: ${s.xl};
  padding-top: ${s.lg};
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.9em;
`;(0,n.createRoot)(document.getElementById("root")).render((0,t.jsx)((function(){const e=(()=>{try{return chrome.runtime.getManifest().version}catch{return""}})();return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(u,{}),(0,t.jsxs)(w,{children:[(0,t.jsxs)($,{children:[(0,t.jsx)(j,{children:"What's new in reveddit real-time"}),(0,t.jsxs)(Z,{children:["A redesign to match reveddit.com ",e?`· v${e}`:""]})]}),(0,t.jsx)(k,{children:"Highlights"}),(0,t.jsx)(x,{children:(0,t.jsxs)(y,{children:[(0,t.jsxs)(O,{children:[(0,t.jsx)("h3",{children:"Fresh look, dark by default"}),(0,t.jsx)("p",{children:"The popup, options, and history pages have been rebuilt to match the revddit.com design. Dark is the default, with a light mode you can pick from the options page."})]}),(0,t.jsxs)(O,{children:[(0,t.jsx)("h3",{children:"History shows real comments and posts"}),(0,t.jsx)("p",{children:"Each removal, deletion, or lock now renders as a Reddit-style card with the full markdown body — no more truncated link labels. Filter and sort from the top of the page."})]}),(0,t.jsxs)(O,{children:[(0,t.jsx)("h3",{children:"Same settings, clearer layout"}),(0,t.jsx)("p",{children:"All of your existing options and subscriptions carry over unchanged. The options page is now grouped into sections so nothing gets lost."})]})]})}),(0,t.jsxs)(z,{children:[(0,t.jsx)(h,{variant:"primary",onClick:()=>{try{chrome.tabs.create({url:chrome.runtime.getURL("src/history.html")})}catch(e){console.log("openHistory failed:",e)}},children:"Open history"}),(0,t.jsxs)("div",{style:{marginTop:16},children:["Questions or feedback?"," ",(0,t.jsx)(f,{href:"https://www.reddit.com/r/reveddit",target:"_blank",rel:"noreferrer",children:"r/reveddit"})]})]})]})]})}),{}))}},a={};function n(e){var r=a[e];if(void 0!==r)return r.exports;var o=a[e]={exports:{}};return t[e].call(o.exports,o,o.exports,n),o.exports}n.m=t,e=[],n.O=(r,o,t,a)=>{if(!o){var d=1/0;for(l=0;l<e.length;l++){for(var[o,t,a]=e[l],i=!0,c=0;c<o.length;c++)(!1&a||d>=a)&&Object.keys(n.O).every((e=>n.O[e](o[c])))?o.splice(c--,1):(i=!1,a<d&&(d=a));if(i){e.splice(l--,1);var s=t();void 0!==s&&(r=s)}}return r}a=a||0;for(var l=e.length;l>0&&e[l-1][2]>a;l--)e[l]=e[l-1];e[l]=[o,t,a]},n.n=e=>{var r=e&&e.__esModule?()=>e.default:()=>e;return n.d(r,{a:r}),r},o=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,n.t=function(e,t){if(1&t&&(e=this(e)),8&t)return e;if("object"==typeof e&&e){if(4&t&&e.__esModule)return e;if(16&t&&"function"==typeof e.then)return e}var a=Object.create(null);n.r(a);var d={};r=r||[null,o({}),o([]),o(o)];for(var i=2&t&&e;"object"==typeof i&&!~r.indexOf(i);i=o(i))Object.getOwnPropertyNames(i).forEach((r=>d[r]=()=>e[r]));return d.default=()=>e,n.d(a,d),a},n.d=(e,r)=>{for(var o in r)n.o(r,o)&&!n.o(e,o)&&Object.defineProperty(e,o,{enumerable:!0,get:r[o]})},n.o=(e,r)=>Object.prototype.hasOwnProperty.call(e,r),n.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.j=47,n.p="",(()=>{n.b=document.baseURI||self.location.href;var e={47:0};n.O.j=r=>0===e[r];var r=(r,o)=>{var t,a,[d,i,c]=o,s=0;if(d.some((r=>0!==e[r]))){for(t in i)n.o(i,t)&&(n.m[t]=i[t]);if(c)var l=c(n)}for(r&&r(o);s<d.length;s++)a=d[s],n.o(e,a)&&e[a]&&e[a][0](),e[a]=0;return n.O(l)},o=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];o.forEach(r.bind(null,0)),o.push=r.bind(null,o.push.bind(o))})();var d=n.O(void 0,[736],(()=>n(3505)));d=n.O(d)})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3JjL3doYXRzbmV3LmpzIiwibWFwcGluZ3MiOiJ1QkFBSUEsRUNDQUMsRUFEQUMsRSxzRUNLRyxNQUFNQyxFQUNELENBQ0pDLEdBQUksTUFDSkMsR0FBSSxNQUNKQyxHQUFJLE1BQ0pDLEtBQU0sU0FMREosRUFPRixDQUNISyxHQUFJLE1BQ0pKLEdBQUksTUFDSkMsR0FBSSxPQUNKQyxHQUFJLE9BQ0pHLEdBQUksUUFaQ04sRUFjSCxDQUNGTyxLQUFNLDhFQUNOQyxLQUFNLG9FQUdEQyxFQUFlLElBQUk7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQTZHbkJDLEVBQWEsSUFBSTs7Ozs7O3VCQU1QVixFQUFZTzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztrQkFzQmpCUCxFQUFhRTs7Ozs7Ozs7Ozs7c0JBV1RGLEVBQWFHOzs7O3NCQUliSCxFQUFhRTs7OztzQkFJYkYsRUFBYUM7Ozs7Ozs7Ozs7Ozs7Ozt5QkFlVkQsRUFBY0M7Ozs7Ozs7Ozs7Ozs7RUFnQjFCVSxFQUFpQixJQUFJOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozt5QkFtQ1RYLEVBQWNFOzs7Ozs7O3VCQU9oQkYsRUFBWVE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUN6UHRCSSxFQUFvQixXQUNqQyxTQUFTQyxFQUFXQyxHQUNoQixNQUFNQyxFQUFvQixTQUFURCxFQUNWRSxPQUFPQyxZQUFjRCxPQUFPQyxXQUFXLGlDQUFpQ0MsUUFDckUsUUFDQSxPQUNKSixFQUNOSyxTQUFTQyxnQkFBZ0JDLGFBQWEsYUFBY04sRUFDeEQsQ0FDTyxTQUFTTyxJQW9DWixPQW5DQSxJQUFBQyxZQUFVLEtBQ04sSUFDSUMsT0FBT0MsUUFBUUMsTUFBTUMsSUFBSSxDQUFDZixJQUFvQmdCLElBRTFDZixFQURhZSxJQUFNaEIsSUFBc0IsT0FDekIsR0FFeEIsQ0FD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VSxFQUFLcUMsR0FBMEMsSUFBN0JELEVBQWdCQyxHQUd4RCxJQUFJQyxFQUF1QixDQUFDQyxFQUE0QkMsS0FDdkQsSUFHSTFELEVBQVV1RCxHQUhUN0MsRUFBVWlELEVBQWEzRSxHQUFXMEUsRUFHaEIzQyxFQUFJLEVBQzNCLEdBQUdMLEVBQVNrRCxNQUFNQyxHQUFnQyxJQUF4QlAsRUFBZ0JPLEtBQWEsQ0FDdEQsSUFBSTdELEtBQVkyRCxFQUNaNUQsRUFBb0IyQyxFQUFFaUIsRUFBYTNELEtBQ3JDRCxFQUFvQlEsRUFBRVAsR0FBWTJELEVBQVkzRCxJQUdoRCxHQUFHaEIsRUFBUyxJQUFJeUIsRUFBU3pCLEVBQVFlLEVBQ2xDLENBRUEsSUFERzBELEdBQTRCQSxFQUEyQkMsR0FDckQzQyxFQUFJTCxFQUFTTSxPQUFRRCxJQUN6QndDLEVBQVU3QyxFQUFTSyxHQUNoQmhCLEVBQW9CMkMsRUFBRVksRUFBaUJDLElBQVlELEVBQWdCQyxJQUNyRUQsRUFBZ0JDLEdBQVMsS0FFMUJELEVBQWdCQyxHQUFXLEVBRTVCLE9BQU94RCxFQUFvQlMsRUFBRUMsRUFBTyxFQUdqQ3FELEVBQXFCVixLQUFxQywrQkFBSUEsS0FBcUMsZ0NBQUssR0FDNUdVLEVBQW1CdEIsUUFBUWdCLEVBQXFCTyxLQUFLLEtBQU0sSUFDM0RELEVBQW1CRSxLQUFPUixFQUFxQk8sS0FBSyxLQUFNRCxFQUFtQkUsS0FBS0QsS0FBS0QsRyxLQzdDdkYsSUFBSUcsRUFBc0JsRSxFQUFvQlMsT0FBRU4sRUFBVyxDQUFDLE1BQU0sSUFBT0gsRUFBb0IsUUFDN0ZrRSxFQUFzQmxFLEVBQW9CUyxFQUFFeUQsRSIsInNvdXJjZXMiOlsid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS93ZWJwYWNrL3J1bnRpbWUvY2h1bmsgbG9hZGVkIiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS93ZWJwYWNrL3J1bnRpbWUvY3JlYXRlIGZha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvLi9zcmMvc3JjL3VpL3Rva2Vucy50cyIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvLi9zcmMvc3JjL3VpL2dsb2JhbC50c3giLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lLy4vc3JjL3NyYy91aS9jb21wb25lbnRzLnRzIiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS8uL3NyYy9zcmMvd2hhdHNuZXcudHN4Iiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvd2VicGFjay9ydW50aW1lL2NvbXBhdCBnZXQgZGVmYXVsdCBleHBvcnQiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvd2VicGFjay9ydW50aW1lL3J1bnRpbWVJZCIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvd2VicGFjay9ydW50aW1lL3B1YmxpY1BhdGgiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svcnVudGltZS9qc29ucCBjaHVuayBsb2FkaW5nIiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS93ZWJwYWNrL3N0YXJ0dXAiXSwic291cmNlc0NvbnRlbnQiOlsidmFyIGRlZmVycmVkID0gW107XG5fX3dlYnBhY2tfcmVxdWlyZV9fLk8gPSAocmVzdWx0LCBjaHVua0lkcywgZm4sIHByaW9yaXR5KSA9PiB7XG5cdGlmKGNodW5rSWRzKSB7XG5cdFx0cHJpb3JpdHkgPSBwcmlvcml0eSB8fCAwO1xuXHRcdGZvcih2YXIgaSA9IGRlZmVycmVkLmxlbmd0aDsgaSA+IDAgJiYgZGVmZXJyZWRbaSAtIDFdWzJdID4gcHJpb3JpdHk7IGktLSkgZGVmZXJyZWRbaV0gPSBkZWZlcnJlZFtpIC0gMV07XG5cdFx0ZGVmZXJyZWRbaV0gPSBbY2h1bmtJZHMsIGZuLCBwcmlvcml0eV07XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHZhciBub3RGdWxmaWxsZWQgPSBJbmZpbml0eTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkZWZlcnJlZC5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBbY2h1bmtJZHMsIGZuLCBwcmlvcml0eV0gPSBkZWZlcnJlZFtpXTtcblx0XHR2YXIgZnVsZmlsbGVkID0gdHJ1ZTtcblx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGNodW5rSWRzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRpZiAoKHByaW9yaXR5ICYgMSA9PT0gMCB8fCBub3RGdWxmaWxsZWQgPj0gcHJpb3JpdHkpICYmIE9iamVjdC5rZXlzKF9fd2VicGFja19yZXF1aXJlX18uTykuZXZlcnkoKGtleSkgPT4gKF9fd2VicGFja19yZXF1aXJlX18uT1trZXldKGNodW5rSWRzW2pdKSkpKSB7XG5cdFx0XHRcdGNodW5rSWRzLnNwbGljZShqLS0sIDEpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZnVsZmlsbGVkID0gZmFsc2U7XG5cdFx0XHRcdGlmKHByaW9yaXR5IDwgbm90RnVsZmlsbGVkKSBub3RGdWxmaWxsZWQgPSBwcmlvcml0eTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYoZnVsZmlsbGVkKSB7XG5cdFx0XHRkZWZlcnJlZC5zcGxpY2UoaS0tLCAxKVxuXHRcdFx0dmFyIHIgPSBmbigpO1xuXHRcdFx0aWYgKHIgIT09IHVuZGVmaW5lZCkgcmVzdWx0ID0gcjtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn07IiwidmFyIGdldFByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mID8gKG9iaikgPT4gKE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmopKSA6IChvYmopID0+IChvYmouX19wcm90b19fKTtcbnZhciBsZWFmUHJvdG90eXBlcztcbi8vIGNyZWF0ZSBhIGZha2UgbmFtZXNwYWNlIG9iamVjdFxuLy8gbW9kZSAmIDE6IHZhbHVlIGlzIGEgbW9kdWxlIGlkLCByZXF1aXJlIGl0XG4vLyBtb2RlICYgMjogbWVyZ2UgYWxsIHByb3BlcnRpZXMgb2YgdmFsdWUgaW50byB0aGUgbnNcbi8vIG1vZGUgJiA0OiByZXR1cm4gdmFsdWUgd2hlbiBhbHJlYWR5IG5zIG9iamVjdFxuLy8gbW9kZSAmIDE2OiByZXR1cm4gdmFsdWUgd2hlbiBpdCdzIFByb21pc2UtbGlrZVxuLy8gbW9kZSAmIDh8MTogYmVoYXZlIGxpa2UgcmVxdWlyZVxuX193ZWJwYWNrX3JlcXVpcmVfXy50ID0gZnVuY3Rpb24odmFsdWUsIG1vZGUpIHtcblx0aWYobW9kZSAmIDEpIHZhbHVlID0gdGhpcyh2YWx1ZSk7XG5cdGlmKG1vZGUgJiA4KSByZXR1cm4gdmFsdWU7XG5cdGlmKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUpIHtcblx0XHRpZigobW9kZSAmIDQpICYmIHZhbHVlLl9fZXNNb2R1bGUpIHJldHVybiB2YWx1ZTtcblx0XHRpZigobW9kZSAmIDE2KSAmJiB0eXBlb2YgdmFsdWUudGhlbiA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIHZhbHVlO1xuXHR9XG5cdHZhciBucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cdF9fd2VicGFja19yZXF1aXJlX18ucihucyk7XG5cdHZhciBkZWYgPSB7fTtcblx0bGVhZlByb3RvdHlwZXMgPSBsZWFmUHJvdG90eXBlcyB8fCBbbnVsbCwgZ2V0UHJvdG8oe30pLCBnZXRQcm90byhbXSksIGdldFByb3RvKGdldFByb3RvKV07XG5cdGZvcih2YXIgY3VycmVudCA9IG1vZGUgJiAyICYmIHZhbHVlOyB0eXBlb2YgY3VycmVudCA9PSAnb2JqZWN0JyAmJiAhfmxlYWZQcm90b3R5cGVzLmluZGV4T2YoY3VycmVudCk7IGN1cnJlbnQgPSBnZXRQcm90byhjdXJyZW50KSkge1xuXHRcdE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGN1cnJlbnQpLmZvckVhY2goKGtleSkgPT4gKGRlZltrZXldID0gKCkgPT4gKHZhbHVlW2tleV0pKSk7XG5cdH1cblx0ZGVmWydkZWZhdWx0J10gPSAoKSA9PiAodmFsdWUpO1xuXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQobnMsIGRlZik7XG5cdHJldHVybiBucztcbn07IiwiLy8gRGVzaWduIHRva2VucyBwb3J0ZWQgZnJvbSB3ZWJzaXRlL3NyYy9zYXNzL2NvbG9ycy5zYXNzIHNvIHRoZSBleHRlbnNpb25cbi8vIG1hdGNoZXMgdGhlIHJldmRkaXQuY29tIHNpdGUuIERhcmsgaXMgdGhlIGRlZmF1bHQ7IFtkYXRhLXRoZW1lPVwibGlnaHRcIl0gb25cbi8vIHRoZSByb290IGVsZW1lbnQgZmxpcHMgdGhlIHBhbGV0dGUuIFRoZSBleHRlbnNpb24gaXMgc2VsZi1jb250YWluZWQ6IHRoZXNlXG4vLyB2YWx1ZXMgYXJlIGNvcGllZCwgbm90IGltcG9ydGVkIGZyb20gd2Vic2l0ZS8uXG5pbXBvcnQgeyBjc3MgfSBmcm9tICdAZW1vdGlvbi9yZWFjdCc7XG5leHBvcnQgY29uc3QgdG9rZW5zID0ge1xuICAgIHJhZGl1czoge1xuICAgICAgICBzbTogJzRweCcsXG4gICAgICAgIG1kOiAnNnB4JyxcbiAgICAgICAgbGc6ICc4cHgnLFxuICAgICAgICBwaWxsOiAnOTk5cHgnLFxuICAgIH0sXG4gICAgc3BhY2U6IHtcbiAgICAgICAgeHM6ICc0cHgnLFxuICAgICAgICBzbTogJzhweCcsXG4gICAgICAgIG1kOiAnMTJweCcsXG4gICAgICAgIGxnOiAnMTZweCcsXG4gICAgICAgIHhsOiAnMjRweCcsXG4gICAgfSxcbiAgICBmb250OiB7XG4gICAgICAgIGJvZHk6ICctYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsIFwiU2Vnb2UgVUlcIiwgSGVsdmV0aWNhLCBBcmlhbCwgc2Fucy1zZXJpZicsXG4gICAgICAgIG1vbm86ICd1aS1tb25vc3BhY2UsIFNGTW9uby1SZWd1bGFyLCBNZW5sbywgTW9uYWNvLCBDb25zb2xhcywgbW9ub3NwYWNlJyxcbiAgICB9LFxufTtcbmV4cG9ydCBjb25zdCBnbG9iYWxUb2tlbnMgPSBjc3MgYFxuICAgIDpyb290IHtcbiAgICAgICAgLyogQmFja2dyb3VuZHMgKi9cbiAgICAgICAgLS1iZy1wcmltYXJ5OiAjMWExYjFlO1xuICAgICAgICAtLWJnLXNlY29uZGFyeTogIzExMTIxNDtcbiAgICAgICAgLS1iZy1zdXJmYWNlOiAjMjUyNjJiO1xuICAgICAgICAtLWJnLXN1cmZhY2UtaG92ZXI6ICMyYzJkMzM7XG5cbiAgICAgICAgLyogVGV4dCAqL1xuICAgICAgICAtLXRleHQtcHJpbWFyeTogI2UwZTBlMDtcbiAgICAgICAgLS10ZXh0LXNlY29uZGFyeTogIzkwOTI5NjtcbiAgICAgICAgLS10ZXh0LW11dGVkOiAjNjA2MzY4O1xuICAgICAgICAtLXRleHQtb24tYWNjZW50OiAjZmZmZmZmO1xuXG4gICAgICAgIC8qIEFjY2VudCAvIGJyYW5kICovXG4gICAgICAgIC0tYWNjZW50OiAjZTAzZTNlO1xuICAgICAgICAtLWFjY2VudC1kaW06ICNjMTMwMzA7XG4gICAgICAgIC0tYWNjZW50LWhvdmVyOiAjZTg1NTU1O1xuXG4gICAgICAgIC8qIExpbmtzICovXG4gICAgICAgIC0tbGluazogIzc0YjNlMDtcbiAgICAgICAgLS1saW5rLWhvdmVyOiAjOWFjOGViO1xuXG4gICAgICAgIC8qIFNlbWFudGljICovXG4gICAgICAgIC0tYXV0aG9yOiAjNmE5OGFmO1xuICAgICAgICAtLXN1Ym1pdHRlcjogIzJiN2RlOTtcbiAgICAgICAgLS1tb2RlcmF0b3I6ICMyZWEwNDM7XG4gICAgICAgIC0tYWRtaW46ICNlMDNlM2U7XG4gICAgICAgIC0tcXVhcmFudGluZWQ6ICNmZmQ2MzU7XG5cbiAgICAgICAgLyogUmVtb3ZlZCAvIGRlbGV0ZWQgaW5kaWNhdG9ycyAqL1xuICAgICAgICAtLXJlbW92ZWQtYmc6IHJnYmEoOTksIDU0LCA1NCwgMSk7XG4gICAgICAgIC0tcmVtb3ZlZC1ib3JkZXI6ICNlMDNlM2U7XG4gICAgICAgIC0tZGVsZXRlZC1iZzogcmdiYSgzMywgNzcsIDE0OSwgMSk7XG4gICAgICAgIC0tZGVsZXRlZC1ib3JkZXI6ICM0YzZlZjU7XG4gICAgICAgIC0tYXBwcm92ZWQtYmc6IHJnYmEoNDYsIDE2MCwgNjcsIDAuMjIpO1xuICAgICAgICAtLWFwcHJvdmVkLWJvcmRlcjogIzJlYTA0MztcbiAgICAgICAgLS1sb2NrZWQtYmc6IHJnYmEoMjU1LCAyMTQsIDUzLCAwLjIyKTtcbiAgICAgICAgLS1sb2NrZWQtYm9yZGVyOiAjZmZkNjM1O1xuXG4gICAgICAgIC8qIEJvcmRlcnMgJiBzdXJmYWNlcyAqL1xuICAgICAgICAtLWJvcmRlcjogIzM3M2E0MDtcbiAgICAgICAgLS1ib3JkZXItbGlnaHQ6ICM0YTRlNTQ7XG4gICAgICAgIC0tbm90ZS1iZzogIzI2NGQ3MztcbiAgICAgICAgLS1jb2RlLWJnOiByZ2JhKDQyLCA1MSwgNjQsIDEpO1xuICAgICAgICAtLWNvZGUtYm9yZGVyOiByZ2JhKDg4LCAxMDUsIDEyMywgMSk7XG5cbiAgICAgICAgLyogVUkgZWxlbWVudHMgKi9cbiAgICAgICAgLS1idXR0b24tYmc6ICMzNzNhNDA7XG4gICAgICAgIC0tYnV0dG9uLXRleHQ6ICNlMGUwZTA7XG4gICAgICAgIC0taW5wdXQtYmc6ICMyNTI2MmI7XG4gICAgICAgIC0taW5wdXQtYm9yZGVyOiAjMzczYTQwO1xuICAgICAgICAtLWlucHV0LWZvY3VzOiAjNzRiM2UwO1xuXG4gICAgICAgIC8qIFNjb3JlcyAmIG1ldGEgKi9cbiAgICAgICAgLS1tZXRhOiAjOTA5Mjk2O1xuXG4gICAgICAgIGNvbG9yLXNjaGVtZTogZGFyaztcbiAgICB9XG5cbiAgICA6cm9vdFtkYXRhLXRoZW1lPSdsaWdodCddIHtcbiAgICAgICAgLS1iZy1wcmltYXJ5OiAjZmZmZmZmO1xuICAgICAgICAtLWJnLXNlY29uZGFyeTogI2Y4ZjlmYTtcbiAgICAgICAgLS1iZy1zdXJmYWNlOiAjZjFmM2Y1O1xuICAgICAgICAtLWJnLXN1cmZhY2UtaG92ZXI6ICNlOWVjZWY7XG5cbiAgICAgICAgLS10ZXh0LXByaW1hcnk6ICMxYTFiMWU7XG4gICAgICAgIC0tdGV4dC1zZWNvbmRhcnk6ICM0OTUwNTc7XG4gICAgICAgIC0tdGV4dC1tdXRlZDogIzg2OGU5NjtcbiAgICAgICAgLS10ZXh0LW9uLWFjY2VudDogI2ZmZmZmZjtcblxuICAgICAgICAtLWFjY2VudDogI2M5MmEyYTtcbiAgICAgICAgLS1hY2NlbnQtZGltOiAjYTgyODI4O1xuICAgICAgICAtLWFjY2VudC1ob3ZlcjogI2UwMzEzMTtcblxuICAgICAgICAtLWxpbms6ICMxOTcxYzI7XG4gICAgICAgIC0tbGluay1ob3ZlcjogIzFjN2VkNjtcblxuICAgICAgICAtLWF1dGhvcjogIzNhNmY4YTtcbiAgICAgICAgLS1zdWJtaXR0ZXI6ICMxODY0YWI7XG4gICAgICAgIC0tbW9kZXJhdG9yOiAjMmI4YTNlO1xuICAgICAgICAtLWFkbWluOiAjYzkyYTJhO1xuXG4gICAgICAgIC0tcmVtb3ZlZC1iZzogcmdiYSgyNTUsIDIzMCwgMjMwLCAxKTtcbiAgICAgICAgLS1yZW1vdmVkLWJvcmRlcjogI2M5MmEyYTtcbiAgICAgICAgLS1kZWxldGVkLWJnOiByZ2JhKDIxOSwgMjM0LCAyNTQsIDEpO1xuICAgICAgICAtLWRlbGV0ZWQtYm9yZGVyOiAjMTk3MWMyO1xuICAgICAgICAtLWFwcHJvdmVkLWJnOiByZ2JhKDQzLCAxMzgsIDYyLCAwLjEyKTtcbiAgICAgICAgLS1hcHByb3ZlZC1ib3JkZXI6ICMyYjhhM2U7XG4gICAgICAgIC0tbG9ja2VkLWJnOiByZ2JhKDI1NSwgMjE0LCA1MywgMC4yOCk7XG4gICAgICAgIC0tbG9ja2VkLWJvcmRlcjogI2Q0YTAxNztcblxuICAgICAgICAtLWJvcmRlcjogI2RlZTJlNjtcbiAgICAgICAgLS1ib3JkZXItbGlnaHQ6ICNjZWQ0ZGE7XG4gICAgICAgIC0tbm90ZS1iZzogI2U3ZjVmZjtcbiAgICAgICAgLS1jb2RlLWJnOiAjZjFmM2Y1O1xuICAgICAgICAtLWNvZGUtYm9yZGVyOiAjZGVlMmU2O1xuXG4gICAgICAgIC0tYnV0dG9uLWJnOiAjZTllY2VmO1xuICAgICAgICAtLWJ1dHRvbi10ZXh0OiAjMWExYjFlO1xuICAgICAgICAtLWlucHV0LWJnOiAjZmZmZmZmO1xuICAgICAgICAtLWlucHV0LWJvcmRlcjogI2NlZDRkYTtcbiAgICAgICAgLS1pbnB1dC1mb2N1czogIzE5NzFjMjtcblxuICAgICAgICAtLW1ldGE6ICM4NjhlOTY7XG5cbiAgICAgICAgY29sb3Itc2NoZW1lOiBsaWdodDtcbiAgICB9XG5gO1xuZXhwb3J0IGNvbnN0IGdsb2JhbEJhc2UgPSBjc3MgYFxuICAgIGh0bWwsXG4gICAgYm9keSB7XG4gICAgICAgIG1hcmdpbjogMDtcbiAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYmctcHJpbWFyeSk7XG4gICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuICAgICAgICBmb250LWZhbWlseTogJHt0b2tlbnMuZm9udC5ib2R5fTtcbiAgICAgICAgZm9udC1zaXplOiAxNHB4O1xuICAgICAgICBsaW5lLWhlaWdodDogMS40NTtcbiAgICB9XG4gICAgKixcbiAgICAqOjpiZWZvcmUsXG4gICAgKjo6YWZ0ZXIge1xuICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICAgIH1cblxuICAgIGEge1xuICAgICAgICBjb2xvcjogdmFyKC0tbGluayk7XG4gICAgICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbiAgICB9XG4gICAgYTpob3ZlciB7XG4gICAgICAgIGNvbG9yOiB2YXIoLS1saW5rLWhvdmVyKTtcbiAgICAgICAgdGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XG4gICAgfVxuXG4gICAgaHIge1xuICAgICAgICBib3JkZXI6IDA7XG4gICAgICAgIGJvcmRlci10b3A6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXIpO1xuICAgICAgICBtYXJnaW46ICR7dG9rZW5zLnNwYWNlLm1kfSAwO1xuICAgIH1cblxuICAgIGgxLFxuICAgIGgyLFxuICAgIGgzLFxuICAgIGg0IHtcbiAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgfVxuICAgIGgxIHtcbiAgICAgICAgZm9udC1zaXplOiAyMnB4O1xuICAgICAgICBtYXJnaW46IDAgMCAke3Rva2Vucy5zcGFjZS5sZ30gMDtcbiAgICB9XG4gICAgaDIge1xuICAgICAgICBmb250LXNpemU6IDE4cHg7XG4gICAgICAgIG1hcmdpbjogMCAwICR7dG9rZW5zLnNwYWNlLm1kfSAwO1xuICAgIH1cbiAgICBoMyB7XG4gICAgICAgIGZvbnQtc2l6ZTogMTZweDtcbiAgICAgICAgbWFyZ2luOiAwIDAgJHt0b2tlbnMuc3BhY2Uuc219IDA7XG4gICAgfVxuXG4gICAgYnV0dG9uIHtcbiAgICAgICAgZm9udC1mYW1pbHk6IGluaGVyaXQ7XG4gICAgICAgIGZvbnQtc2l6ZTogaW5oZXJpdDtcbiAgICB9XG5cbiAgICBpbnB1dFt0eXBlPSd0ZXh0J10sXG4gICAgaW5wdXRbdHlwZT0nbnVtYmVyJ10sXG4gICAgc2VsZWN0LFxuICAgIHRleHRhcmVhIHtcbiAgICAgICAgYmFja2dyb3VuZDogdmFyKC0taW5wdXQtYmcpO1xuICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICAgICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0taW5wdXQtYm9yZGVyKTtcbiAgICAgICAgYm9yZGVyLXJhZGl1czogJHt0b2tlbnMucmFkaXVzLnNtfTtcbiAgICAgICAgcGFkZGluZzogNnB4IDhweDtcbiAgICAgICAgZm9udC1mYW1pbHk6IGluaGVyaXQ7XG4gICAgICAgIGZvbnQtc2l6ZTogaW5oZXJpdDtcbiAgICAgICAgb3V0bGluZTogbm9uZTtcbiAgICAgICAgJjpmb2N1cyB7XG4gICAgICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLWlucHV0LWZvY3VzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlucHV0W3R5cGU9J2NoZWNrYm94J10ge1xuICAgICAgICBhY2NlbnQtY29sb3I6IHZhcigtLWxpbmspO1xuICAgIH1cbmA7XG4vLyBNYXJrZG93biBvdXRwdXQgc3R5bGVzIChwb3J0ZWQgZXNzZW50aWFscyBmcm9tIHdlYnNpdGUvc3JjL3Nhc3MvbWFya2Rvd24uc2Fzc1xuLy8gYW5kIGNvbW1lbnQuc2FzcykuIEFwcGxpZWQgaW5zaWRlIC5tZC1ib2R5IGNvbnRhaW5lcnMuXG5leHBvcnQgY29uc3QgZ2xvYmFsTWFya2Rvd24gPSBjc3MgYFxuICAgIC5tZC1ib2R5IHtcbiAgICAgICAgd29yZC1icmVhazogYnJlYWstd29yZDtcbiAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgfVxuICAgIC5tZC1ib2R5IHAge1xuICAgICAgICBtYXJnaW46IDAuNWVtIDA7XG4gICAgICAgIGxpbmUtaGVpZ2h0OiAxLjQ1O1xuICAgIH1cbiAgICAubWQtYm9keSBhIHtcbiAgICAgICAgY29sb3I6IHZhcigtLWxpbmspO1xuICAgIH1cbiAgICAubWQtYm9keSBhOmhvdmVyIHtcbiAgICAgICAgY29sb3I6IHZhcigtLWxpbmstaG92ZXIpO1xuICAgIH1cbiAgICAubWQtYm9keSB1bCxcbiAgICAubWQtYm9keSBvbCB7XG4gICAgICAgIG1hcmdpbjogMC41ZW0gMDtcbiAgICAgICAgcGFkZGluZy1sZWZ0OiAxLjVlbTtcbiAgICB9XG4gICAgLm1kLWJvZHkgbGkge1xuICAgICAgICBtYXJnaW46IDAuMmVtIDA7XG4gICAgfVxuICAgIC5tZC1ib2R5IGJsb2NrcXVvdGUge1xuICAgICAgICBib3JkZXItbGVmdDogM3B4IHNvbGlkIHZhcigtLWJvcmRlci1saWdodCk7XG4gICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXNlY29uZGFyeSk7XG4gICAgICAgIHBhZGRpbmctbGVmdDogMTBweDtcbiAgICAgICAgbWFyZ2luOiAwLjVlbSAwO1xuICAgIH1cbiAgICAubWQtYm9keSBwcmUge1xuICAgICAgICBtYXJnaW46IDAuNWVtIDA7XG4gICAgICAgIHBhZGRpbmc6IDhweCAxMHB4O1xuICAgICAgICBvdmVyZmxvdzogYXV0bztcbiAgICAgICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tY29kZS1ib3JkZXIpO1xuICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1jb2RlLWJnKTtcbiAgICAgICAgYm9yZGVyLXJhZGl1czogJHt0b2tlbnMucmFkaXVzLm1kfTtcbiAgICB9XG4gICAgLm1kLWJvZHkgY29kZSB7XG4gICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWNvZGUtYmcpO1xuICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1jb2RlLWJvcmRlcik7XG4gICAgICAgIGJvcmRlci1yYWRpdXM6IDNweDtcbiAgICAgICAgcGFkZGluZzogMCA0cHg7XG4gICAgICAgIGZvbnQtZmFtaWx5OiAke3Rva2Vucy5mb250Lm1vbm99O1xuICAgICAgICBmb250LXNpemU6IDAuOTJlbTtcbiAgICB9XG4gICAgLm1kLWJvZHkgcHJlIGNvZGUge1xuICAgICAgICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcbiAgICAgICAgYm9yZGVyOiAwO1xuICAgICAgICBwYWRkaW5nOiAwO1xuICAgICAgICBkaXNwbGF5OiBibG9jaztcbiAgICAgICAgd2hpdGUtc3BhY2U6IHByZTtcbiAgICB9XG4gICAgLm1kLWJvZHkgaDEsXG4gICAgLm1kLWJvZHkgaDIsXG4gICAgLm1kLWJvZHkgaDMsXG4gICAgLm1kLWJvZHkgaDQge1xuICAgICAgICBtYXJnaW46IDAuNmVtIDAgMC4zZW0gMDtcbiAgICB9XG4gICAgLm1kLWJvZHkgPiAqOmZpcnN0LW9mLXR5cGUge1xuICAgICAgICBtYXJnaW4tdG9wOiAwO1xuICAgIH1cbiAgICAubWQtYm9keSA+ICo6bGFzdC1jaGlsZCB7XG4gICAgICAgIG1hcmdpbi1ib3R0b206IDA7XG4gICAgfVxuYDtcbiIsImltcG9ydCB7IGpzeCBhcyBfanN4LCBGcmFnbWVudCBhcyBfRnJhZ21lbnQsIGpzeHMgYXMgX2pzeHMgfSBmcm9tIFwicmVhY3QvanN4LXJ1bnRpbWVcIjtcbmltcG9ydCBSZWFjdCwgeyB1c2VFZmZlY3QgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBHbG9iYWwgfSBmcm9tICdAZW1vdGlvbi9yZWFjdCc7XG5pbXBvcnQgeyBnbG9iYWxUb2tlbnMsIGdsb2JhbEJhc2UsIGdsb2JhbE1hcmtkb3duIH0gZnJvbSAnLi90b2tlbnMnO1xuZXhwb3J0IGNvbnN0IFRIRU1FX1NUT1JBR0VfS0VZID0gJ3VpX3RoZW1lJztcbmZ1bmN0aW9uIGFwcGx5VGhlbWUobW9kZSkge1xuICAgIGNvbnN0IHJlc29sdmVkID0gbW9kZSA9PT0gJ2F1dG8nXG4gICAgICAgID8gKHdpbmRvdy5tYXRjaE1lZGlhICYmIHdpbmRvdy5tYXRjaE1lZGlhKCcocHJlZmVycy1jb2xvci1zY2hlbWU6IGxpZ2h0KScpLm1hdGNoZXNcbiAgICAgICAgICAgID8gJ2xpZ2h0J1xuICAgICAgICAgICAgOiAnZGFyaycpXG4gICAgICAgIDogbW9kZTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLXRoZW1lJywgcmVzb2x2ZWQpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIEFwcEdsb2JhbCgpIHtcbiAgICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFtUSEVNRV9TVE9SQUdFX0tFWV0sIHJlcyA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kZSA9IHJlcz8uW1RIRU1FX1NUT1JBR0VfS0VZXSB8fCAnYXV0byc7XG4gICAgICAgICAgICAgICAgYXBwbHlUaGVtZShtb2RlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgIGFwcGx5VGhlbWUoJ2F1dG8nKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtcSA9IHdpbmRvdy5tYXRjaE1lZGlhPy4oJyhwcmVmZXJzLWNvbG9yLXNjaGVtZTogbGlnaHQpJyk7XG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbVEhFTUVfU1RPUkFHRV9LRVldLCByZXMgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RlID0gcmVzPy5bVEhFTUVfU1RPUkFHRV9LRVldIHx8ICdhdXRvJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1vZGUgPT09ICdhdXRvJylcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGx5VGhlbWUoJ2F1dG8nKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgdm9pZCBlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBtcT8uYWRkRXZlbnRMaXN0ZW5lcj8uKCdjaGFuZ2UnLCBoYW5kbGVyKTtcbiAgICAgICAgY29uc3Qgb25TdG9yYWdlQ2hhbmdlZCA9IChjaGFuZ2VzLCBhcmVhKSA9PiB7XG4gICAgICAgICAgICBpZiAoYXJlYSA9PT0gJ2xvY2FsJyAmJiBjaGFuZ2VzW1RIRU1FX1NUT1JBR0VfS0VZXSkge1xuICAgICAgICAgICAgICAgIGFwcGx5VGhlbWUoY2hhbmdlc1tUSEVNRV9TVE9SQUdFX0tFWV0ubmV3VmFsdWUgfHwgJ2F1dG8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLmFkZExpc3RlbmVyKG9uU3RvcmFnZUNoYW5nZWQpO1xuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgbXE/LnJlbW92ZUV2ZW50TGlzdGVuZXI/LignY2hhbmdlJywgaGFuZGxlcik7XG4gICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQucmVtb3ZlTGlzdGVuZXIob25TdG9yYWdlQ2hhbmdlZCk7XG4gICAgICAgIH07XG4gICAgfSwgW10pO1xuICAgIHJldHVybiAoX2pzeHMoX0ZyYWdtZW50LCB7IGNoaWxkcmVuOiBbX2pzeChHbG9iYWwsIHsgc3R5bGVzOiBnbG9iYWxUb2tlbnMgfSksIF9qc3goR2xvYmFsLCB7IHN0eWxlczogZ2xvYmFsQmFzZSB9KSwgX2pzeChHbG9iYWwsIHsgc3R5bGVzOiBnbG9iYWxNYXJrZG93biB9KV0gfSkpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHNldFRoZW1lTW9kZShtb2RlKSB7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1RIRU1FX1NUT1JBR0VfS0VZXTogbW9kZSB9KTtcbiAgICBhcHBseVRoZW1lKG1vZGUpO1xufVxuIiwiaW1wb3J0IHN0eWxlZCBmcm9tICdAZW1vdGlvbi9zdHlsZWQnO1xuaW1wb3J0IHsgY3NzIH0gZnJvbSAnQGVtb3Rpb24vcmVhY3QnO1xuaW1wb3J0IHsgdG9rZW5zIH0gZnJvbSAnLi90b2tlbnMnO1xuZXhwb3J0IGNvbnN0IEJsdWVMaW5rID0gc3R5bGVkLmEgYFxuICAgIGNvbG9yOiB2YXIoLS1saW5rKTtcbiAgICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XG4gICAgJjpob3ZlciB7XG4gICAgICAgIGNvbG9yOiB2YXIoLS1saW5rLWhvdmVyKTtcbiAgICAgICAgdGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XG4gICAgfVxuYDtcbmV4cG9ydCBjb25zdCBNdXRlZExpbmsgPSBzdHlsZWQuYSBgXG4gICAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTtcbiAgICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XG4gICAgJjpob3ZlciB7XG4gICAgICAgIGNvbG9yOiB2YXIoLS1saW5rLWhvdmVyKTtcbiAgICAgICAgdGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XG4gICAgfVxuYDtcbmV4cG9ydCBjb25zdCBBY3Rpb25CdG4gPSBzdHlsZWQuYnV0dG9uIGBcbiAgICBkaXNwbGF5OiBibG9jaztcbiAgICB3aWR0aDogMTAwJTtcbiAgICBtYXJnaW4tdG9wOiA2cHg7XG4gICAgcGFkZGluZzogOHB4IDEwcHg7XG4gICAgYmFja2dyb3VuZDogdmFyKC0tYWNjZW50KTtcbiAgICBjb2xvcjogdmFyKC0tdGV4dC1vbi1hY2NlbnQpO1xuICAgIGJvcmRlcjogMDtcbiAgICBib3JkZXItcmFkaXVzOiAke3Rva2Vucy5yYWRpdXMubWR9O1xuICAgIGN1cnNvcjogcG9pbnRlcjtcbiAgICBmb250LXNpemU6IDAuOTVlbTtcbiAgICBmb250LXdlaWdodDogNjAwO1xuICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgMC4xNXMgZWFzZTtcbiAgICAmOmhvdmVyIHtcbiAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYWNjZW50LWhvdmVyKTtcbiAgICB9XG4gICAgJjpkaXNhYmxlZCB7XG4gICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWJ1dHRvbi1iZyk7XG4gICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTtcbiAgICAgICAgY3Vyc29yOiB3YWl0O1xuICAgIH1cbmA7XG5leHBvcnQgY29uc3QgQnV0dG9uID0gc3R5bGVkLmJ1dHRvbiBgXG4gICAgZGlzcGxheTogaW5saW5lLWZsZXg7XG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgICBnYXA6IDZweDtcbiAgICBwYWRkaW5nOiA2cHggMTJweDtcbiAgICBib3JkZXItcmFkaXVzOiAke3Rva2Vucy5yYWRpdXMubWR9O1xuICAgIGZvbnQtc2l6ZTogMC45MmVtO1xuICAgIGZvbnQtd2VpZ2h0OiA2MDA7XG4gICAgY3Vyc29yOiBwb2ludGVyO1xuICAgIGJvcmRlcjogMXB4IHNvbGlkIHRyYW5zcGFyZW50O1xuICAgIHRyYW5zaXRpb246XG4gICAgICAgIGJhY2tncm91bmQgMC4xNXMgZWFzZSxcbiAgICAgICAgYm9yZGVyLWNvbG9yIDAuMTVzIGVhc2UsXG4gICAgICAgIGNvbG9yIDAuMTVzIGVhc2U7XG4gICAgJHtwID0+IHtcbiAgICBzd2l0Y2ggKHAudmFyaWFudCkge1xuICAgICAgICBjYXNlICdzZWNvbmRhcnknOlxuICAgICAgICAgICAgcmV0dXJuIGNzcyBgXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWJ1dHRvbi1iZyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS1idXR0b24tdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tYm9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgJjpob3ZlciB7XG4gICAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1iZy1zdXJmYWNlLWhvdmVyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgIGNhc2UgJ2dob3N0JzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLWxpbmspO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXItY29sb3I6IHRyYW5zcGFyZW50O1xuICAgICAgICAgICAgICAgICAgICAmOmhvdmVyIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWJnLXN1cmZhY2UtaG92ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAncHJpbWFyeSc6XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYWNjZW50KTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXRleHQtb24tYWNjZW50KTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1hY2NlbnQpO1xuICAgICAgICAgICAgICAgICAgICAmOmhvdmVyIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWFjY2VudC1ob3Zlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLWFjY2VudC1ob3Zlcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBgO1xuICAgIH1cbn19XG4gICAgJjpkaXNhYmxlZCB7XG4gICAgICAgIG9wYWNpdHk6IDAuNjtcbiAgICAgICAgY3Vyc29yOiBub3QtYWxsb3dlZDtcbiAgICB9XG5gO1xuZXhwb3J0IGNvbnN0IE1lc3NhZ2VCYW5uZXIgPSBzdHlsZWQuZGl2IGBcbiAgICBwYWRkaW5nOiAxMHB4IDEycHg7XG4gICAgbWFyZ2luOiA2cHggMDtcbiAgICBib3JkZXItcmFkaXVzOiAke3Rva2Vucy5yYWRpdXMubWR9O1xuICAgIGZvbnQtc2l6ZTogMC45MmVtO1xuICAgICR7cCA9PiB7XG4gICAgc3dpdGNoIChwLnZhcmlhbnQpIHtcbiAgICAgICAgY2FzZSAnd2FybmluZyc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tbG9ja2VkLWJnKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tbG9ja2VkLWJvcmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgIGNhc2UgJ3N1Y2Nlc3MnOlxuICAgICAgICAgICAgcmV0dXJuIGNzcyBgXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWFwcHJvdmVkLWJnKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYXBwcm92ZWQtYm9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAnbmV3cyc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tbm90ZS1iZyk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJvcmRlci1saWdodCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgIGNhc2UgJ2luZm8nOlxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGNzcyBgXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWJnLXN1cmZhY2UpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1zZWNvbmRhcnkpO1xuICAgICAgICAgICAgICAgIGA7XG4gICAgfVxufX1cbmA7XG5leHBvcnQgY29uc3QgTWluaVNwaW5uZXIgPSBzdHlsZWQuc3BhbiBgXG4gICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xuICAgIHdpZHRoOiAxNHB4O1xuICAgIGhlaWdodDogMTRweDtcbiAgICBib3JkZXI6IDJweCBzb2xpZCBjdXJyZW50Q29sb3I7XG4gICAgYm9yZGVyLXRvcC1jb2xvcjogdHJhbnNwYXJlbnQ7XG4gICAgYm9yZGVyLXJhZGl1czogNTAlO1xuICAgIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XG4gICAgbWFyZ2luLXJpZ2h0OiA2cHg7XG4gICAgYW5pbWF0aW9uOiBtaW5pLXNwaW4gMC44cyBsaW5lYXIgaW5maW5pdGU7XG4gICAgQGtleWZyYW1lcyBtaW5pLXNwaW4ge1xuICAgICAgICB0byB7XG4gICAgICAgICAgICB0cmFuc2Zvcm06IHJvdGF0ZSgzNjBkZWcpO1xuICAgICAgICB9XG4gICAgfVxuYDtcbmV4cG9ydCBjb25zdCBDYXJkID0gc3R5bGVkLmRpdiBgXG4gICAgYmFja2dyb3VuZDogdmFyKC0tYmctc3VyZmFjZSk7XG4gICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTtcbiAgICBib3JkZXItcmFkaXVzOiAke3Rva2Vucy5yYWRpdXMubGd9O1xuICAgIHBhZGRpbmc6ICR7dG9rZW5zLnNwYWNlLm1kfSAke3Rva2Vucy5zcGFjZS5sZ307XG4gICAgbWFyZ2luLWJvdHRvbTogJHt0b2tlbnMuc3BhY2UubWR9O1xuICAgIHRyYW5zaXRpb246IGJvcmRlci1jb2xvciAwLjE1cyBlYXNlO1xuICAgICY6aG92ZXIge1xuICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLWJvcmRlci1saWdodCk7XG4gICAgfVxuYDtcbmV4cG9ydCBjb25zdCBDYXJkSGVhZGVyID0gc3R5bGVkLmRpdiBgXG4gICAgZGlzcGxheTogZmxleDtcbiAgICBmbGV4LXdyYXA6IHdyYXA7XG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICBnYXA6ICR7dG9rZW5zLnNwYWNlLnNtfTtcbiAgICBtYXJnaW4tYm90dG9tOiAke3Rva2Vucy5zcGFjZS54c307XG5gO1xuZXhwb3J0IGNvbnN0IENhcmRNZXRhID0gc3R5bGVkLmRpdiBgXG4gICAgZGlzcGxheTogZmxleDtcbiAgICBmbGV4LXdyYXA6IHdyYXA7XG4gICAgZ2FwOiAke3Rva2Vucy5zcGFjZS5zbX07XG4gICAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTtcbiAgICBmb250LXNpemU6IDAuODVlbTtcbiAgICBtYXJnaW4tYm90dG9tOiAke3Rva2Vucy5zcGFjZS5zbX07XG4gICAgJiA+IHNwYW4gKyBzcGFuOjpiZWZvcmUge1xuICAgICAgICBjb250ZW50OiAnwrcnO1xuICAgICAgICBtYXJnaW4tcmlnaHQ6ICR7dG9rZW5zLnNwYWNlLnNtfTtcbiAgICAgICAgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpO1xuICAgIH1cbmA7XG5leHBvcnQgY29uc3QgQ2FyZEJvZHkgPSBzdHlsZWQuZGl2IGBcbiAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICBmb250LXNpemU6IDAuOTVlbTtcbmA7XG5leHBvcnQgY29uc3QgQ2FyZEFjdGlvbnMgPSBzdHlsZWQuZGl2IGBcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGdhcDogJHt0b2tlbnMuc3BhY2Uuc219O1xuICAgIG1hcmdpbi10b3A6ICR7dG9rZW5zLnNwYWNlLnNtfTtcbiAgICBwYWRkaW5nLXRvcDogJHt0b2tlbnMuc3BhY2Uuc219O1xuICAgIGJvcmRlci10b3A6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXIpO1xuYDtcbmV4cG9ydCBjb25zdCBCYWRnZSA9IHN0eWxlZC5zcGFuIGBcbiAgICBkaXNwbGF5OiBpbmxpbmUtZmxleDtcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgIHBhZGRpbmc6IDNweCAxMHB4O1xuICAgIGJvcmRlci1yYWRpdXM6ICR7dG9rZW5zLnJhZGl1cy5waWxsfTtcbiAgICBmb250LXdlaWdodDogNzAwO1xuICAgIGZvbnQtc2l6ZTogMC43NWVtO1xuICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XG4gICAgbGV0dGVyLXNwYWNpbmc6IDAuMDRlbTtcbiAgICB3aGl0ZS1zcGFjZTogbm93cmFwO1xuICAgIGJvcmRlcjogMXB4IHNvbGlkIHRyYW5zcGFyZW50O1xuICAgICR7cCA9PiB7XG4gICAgc3dpdGNoIChwLnZhcmlhbnQpIHtcbiAgICAgICAgY2FzZSAncmVtb3ZlZCc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tcmVtb3ZlZC1iZyk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tcmVtb3ZlZC1ib3JkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogI2ZmZjtcbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICBjYXNlICdkZWxldGVkJzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1kZWxldGVkLWJnKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1kZWxldGVkLWJvcmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiAjZmZmO1xuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgIGNhc2UgJ2FwcHJvdmVkJzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1hcHByb3ZlZC1iZyk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tYXBwcm92ZWQtYm9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAnbG9ja2VkJzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1sb2NrZWQtYmcpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLWxvY2tlZC1ib3JkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICBjYXNlICd1bmxvY2tlZCc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYXBwcm92ZWQtYmcpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLWFwcHJvdmVkLWJvcmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgIGNhc2UgJ2VkaXRlZCc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYmctc3VyZmFjZS1ob3Zlcik7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tYm9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAnZGVmYXVsdCc6XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYmctc3VyZmFjZS1ob3Zlcik7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tYm9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTtcbiAgICAgICAgICAgICAgICBgO1xuICAgIH1cbn19XG5gO1xuZXhwb3J0IGNvbnN0IFNlY3Rpb25IZWFkZXIgPSBzdHlsZWQuaDIgYFxuICAgIGZvbnQtc2l6ZTogMC43OGVtO1xuICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XG4gICAgbGV0dGVyLXNwYWNpbmc6IDAuMDhlbTtcbiAgICBjb2xvcjogdmFyKC0tdGV4dC1zZWNvbmRhcnkpO1xuICAgIG1hcmdpbjogJHt0b2tlbnMuc3BhY2UubGd9IDAgJHt0b2tlbnMuc3BhY2Uuc219IDA7XG4gICAgcGFkZGluZy1ib3R0b206ICR7dG9rZW5zLnNwYWNlLnhzfTtcbiAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTtcbmA7XG5leHBvcnQgY29uc3QgRmllbGQgPSBzdHlsZWQubGFiZWwgYFxuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG4gICAgZ2FwOiAke3Rva2Vucy5zcGFjZS5tZH07XG4gICAgcGFkZGluZzogJHt0b2tlbnMuc3BhY2Uuc219IDA7XG4gICAgJiA+IHNwYW4ubGFiZWwge1xuICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICAgICAgZm9udC1zaXplOiAwLjk1ZW07XG4gICAgfVxuICAgICYgPiBzcGFuLmhpbnQge1xuICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1tdXRlZCk7XG4gICAgICAgIGZvbnQtc2l6ZTogMC44MmVtO1xuICAgICAgICBkaXNwbGF5OiBibG9jaztcbiAgICAgICAgbWFyZ2luLXRvcDogMnB4O1xuICAgIH1cbmA7XG5leHBvcnQgY29uc3QgRmllbGRDb2wgPSBzdHlsZWQuZGl2IGBcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gICAgZmxleDogMTtcbiAgICBtaW4td2lkdGg6IDA7XG5gO1xuZXhwb3J0IGNvbnN0IE51bWJlcklucHV0ID0gc3R5bGVkLmlucHV0IGBcbiAgICB3aWR0aDogODBweDtcbiAgICB0ZXh0LWFsaWduOiByaWdodDtcbmA7XG5leHBvcnQgY29uc3QgVGV4dElucHV0ID0gc3R5bGVkLmlucHV0IGBcbiAgICB3aWR0aDogMTAwJTtcbmA7XG5leHBvcnQgY29uc3QgQXV0aG9yID0gc3R5bGVkLnNwYW4gYFxuICAgIGNvbG9yOiB2YXIoLS1hdXRob3IpO1xuICAgIGZvbnQtd2VpZ2h0OiA2MDA7XG5gO1xuZXhwb3J0IGNvbnN0IFN1YnJlZGRpdCA9IHN0eWxlZC5zcGFuIGBcbiAgICBjb2xvcjogdmFyKC0tdGV4dC1zZWNvbmRhcnkpO1xuYDtcbmV4cG9ydCBjb25zdCBQb3N0VGl0bGUgPSBzdHlsZWQuaDMgYFxuICAgIG1hcmdpbjogJHt0b2tlbnMuc3BhY2UueHN9IDAgJHt0b2tlbnMuc3BhY2Uuc219IDA7XG4gICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG5gO1xuZXhwb3J0IGNvbnN0IE1kQm9keSA9IHN0eWxlZC5kaXYgYFxuICAgIGZvbnQtc2l6ZTogMC45NWVtO1xuYDtcbiIsImltcG9ydCB7IGpzeCBhcyBfanN4LCBqc3hzIGFzIF9qc3hzLCBGcmFnbWVudCBhcyBfRnJhZ21lbnQgfSBmcm9tIFwicmVhY3QvanN4LXJ1bnRpbWVcIjtcbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBjcmVhdGVSb290IH0gZnJvbSAncmVhY3QtZG9tL2NsaWVudCc7XG5pbXBvcnQgc3R5bGVkIGZyb20gJ0BlbW90aW9uL3N0eWxlZCc7XG5pbXBvcnQgeyBBcHBHbG9iYWwgfSBmcm9tICcuL3VpL2dsb2JhbCc7XG5pbXBvcnQgeyBDYXJkLCBDYXJkQm9keSwgU2VjdGlvbkhlYWRlciwgQnV0dG9uLCBCbHVlTGluayB9IGZyb20gJy4vdWkvY29tcG9uZW50cyc7XG5pbXBvcnQgeyB0b2tlbnMgfSBmcm9tICcuL3VpL3Rva2Vucyc7XG5jb25zdCBQYWdlID0gc3R5bGVkLmRpdiBgXG4gIG1heC13aWR0aDogNzIwcHg7XG4gIG1hcmdpbjogMCBhdXRvO1xuICBwYWRkaW5nOiAke3Rva2Vucy5zcGFjZS54bH07XG5gO1xuY29uc3QgSGVybyA9IHN0eWxlZC5kaXYgYFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gIHBhZGRpbmc6ICR7dG9rZW5zLnNwYWNlLnhsfSAwO1xuICBib3JkZXItYm90dG9tOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTtcbiAgbWFyZ2luLWJvdHRvbTogJHt0b2tlbnMuc3BhY2UueGx9O1xuYDtcbmNvbnN0IFRpdGxlID0gc3R5bGVkLmgxIGBcbiAgZm9udC1zaXplOiAyOHB4O1xuICBtYXJnaW46IDAgMCAke3Rva2Vucy5zcGFjZS5zbX0gMDtcbmA7XG5jb25zdCBTdWJ0aXRsZSA9IHN0eWxlZC5wIGBcbiAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTtcbiAgbWFyZ2luOiAwO1xuICBmb250LXNpemU6IDEuMWVtO1xuYDtcbmNvbnN0IEZlYXR1cmUgPSBzdHlsZWQuZGl2IGBcbiAgbWFyZ2luLWJvdHRvbTogJHt0b2tlbnMuc3BhY2UubGd9O1xuICAmID4gaDMge1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICBnYXA6ICR7dG9rZW5zLnNwYWNlLnNtfTtcbiAgICBtYXJnaW4tYm90dG9tOiAke3Rva2Vucy5zcGFjZS54c307XG4gIH1cbiAgJiA+IHAge1xuICAgIG1hcmdpbjogMDtcbiAgICBjb2xvcjogdmFyKC0tdGV4dC1zZWNvbmRhcnkpO1xuICB9XG5gO1xuY29uc3QgRm9vdGVyID0gc3R5bGVkLmRpdiBgXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgbWFyZ2luLXRvcDogJHt0b2tlbnMuc3BhY2UueGx9O1xuICBwYWRkaW5nLXRvcDogJHt0b2tlbnMuc3BhY2UubGd9O1xuICBib3JkZXItdG9wOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTtcbiAgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpO1xuICBmb250LXNpemU6IDAuOWVtO1xuYDtcbmZ1bmN0aW9uIFdoYXRzTmV3KCkge1xuICAgIGNvbnN0IHZlcnNpb24gPSAoKCkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIGNocm9tZS5ydW50aW1lLmdldE1hbmlmZXN0KCkudmVyc2lvbjtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICB9KSgpO1xuICAgIGNvbnN0IG9wZW5IaXN0b3J5ID0gKCkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY2hyb21lLnRhYnMuY3JlYXRlKHsgdXJsOiBjaHJvbWUucnVudGltZS5nZXRVUkwoJ3NyYy9oaXN0b3J5Lmh0bWwnKSB9KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ29wZW5IaXN0b3J5IGZhaWxlZDonLCBlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIChfanN4cyhfRnJhZ21lbnQsIHsgY2hpbGRyZW46IFtfanN4KEFwcEdsb2JhbCwge30pLCBfanN4cyhQYWdlLCB7IGNoaWxkcmVuOiBbX2pzeHMoSGVybywgeyBjaGlsZHJlbjogW19qc3goVGl0bGUsIHsgY2hpbGRyZW46IFwiV2hhdCdzIG5ldyBpbiByZXZlZGRpdCByZWFsLXRpbWVcIiB9KSwgX2pzeHMoU3VidGl0bGUsIHsgY2hpbGRyZW46IFtcIkEgcmVkZXNpZ24gdG8gbWF0Y2ggcmV2ZWRkaXQuY29tIFwiLCB2ZXJzaW9uID8gYMK3IHYke3ZlcnNpb259YCA6ICcnXSB9KV0gfSksIF9qc3goU2VjdGlvbkhlYWRlciwgeyBjaGlsZHJlbjogXCJIaWdobGlnaHRzXCIgfSksIF9qc3goQ2FyZCwgeyBjaGlsZHJlbjogX2pzeHMoQ2FyZEJvZHksIHsgY2hpbGRyZW46IFtfanN4cyhGZWF0dXJlLCB7IGNoaWxkcmVuOiBbX2pzeChcImgzXCIsIHsgY2hpbGRyZW46IFwiRnJlc2ggbG9vaywgZGFyayBieSBkZWZhdWx0XCIgfSksIF9qc3goXCJwXCIsIHsgY2hpbGRyZW46IFwiVGhlIHBvcHVwLCBvcHRpb25zLCBhbmQgaGlzdG9yeSBwYWdlcyBoYXZlIGJlZW4gcmVidWlsdCB0byBtYXRjaCB0aGUgcmV2ZGRpdC5jb20gZGVzaWduLiBEYXJrIGlzIHRoZSBkZWZhdWx0LCB3aXRoIGEgbGlnaHQgbW9kZSB5b3UgY2FuIHBpY2sgZnJvbSB0aGUgb3B0aW9ucyBwYWdlLlwiIH0pXSB9KSwgX2pzeHMoRmVhdHVyZSwgeyBjaGlsZHJlbjogW19qc3goXCJoM1wiLCB7IGNoaWxkcmVuOiBcIkhpc3Rvcnkgc2hvd3MgcmVhbCBjb21tZW50cyBhbmQgcG9zdHNcIiB9KSwgX2pzeChcInBcIiwgeyBjaGlsZHJlbjogXCJFYWNoIHJlbW92YWwsIGRlbGV0aW9uLCBvciBsb2NrIG5vdyByZW5kZXJzIGFzIGEgUmVkZGl0LXN0eWxlIGNhcmQgd2l0aCB0aGUgZnVsbCBtYXJrZG93biBib2R5IFxcdTIwMTQgbm8gbW9yZSB0cnVuY2F0ZWQgbGluayBsYWJlbHMuIEZpbHRlciBhbmQgc29ydCBmcm9tIHRoZSB0b3Agb2YgdGhlIHBhZ2UuXCIgfSldIH0pLCBfanN4cyhGZWF0dXJlLCB7IGNoaWxkcmVuOiBbX2pzeChcImgzXCIsIHsgY2hpbGRyZW46IFwiU2FtZSBzZXR0aW5ncywgY2xlYXJlciBsYXlvdXRcIiB9KSwgX2pzeChcInBcIiwgeyBjaGlsZHJlbjogXCJBbGwgb2YgeW91ciBleGlzdGluZyBvcHRpb25zIGFuZCBzdWJzY3JpcHRpb25zIGNhcnJ5IG92ZXIgdW5jaGFuZ2VkLiBUaGUgb3B0aW9ucyBwYWdlIGlzIG5vdyBncm91cGVkIGludG8gc2VjdGlvbnMgc28gbm90aGluZyBnZXRzIGxvc3QuXCIgfSldIH0pXSB9KSB9KSwgX2pzeHMoRm9vdGVyLCB7IGNoaWxkcmVuOiBbX2pzeChCdXR0b24sIHsgdmFyaWFudDogXCJwcmltYXJ5XCIsIG9uQ2xpY2s6IG9wZW5IaXN0b3J5LCBjaGlsZHJlbjogXCJPcGVuIGhpc3RvcnlcIiB9KSwgX2pzeHMoXCJkaXZcIiwgeyBzdHlsZTogeyBtYXJnaW5Ub3A6IDE2IH0sIGNoaWxkcmVuOiBbXCJRdWVzdGlvbnMgb3IgZmVlZGJhY2s/XCIsICcgJywgX2pzeChCbHVlTGluaywgeyBocmVmOiBcImh0dHBzOi8vd3d3LnJlZGRpdC5jb20vci9yZXZlZGRpdFwiLCB0YXJnZXQ6IFwiX2JsYW5rXCIsIHJlbDogXCJub3JlZmVycmVyXCIsIGNoaWxkcmVuOiBcInIvcmV2ZWRkaXRcIiB9KV0gfSldIH0pXSB9KV0gfSkpO1xufVxuY3JlYXRlUm9vdChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpKS5yZW5kZXIoX2pzeChXaGF0c05ldywge30pKTtcbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4vLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuX193ZWJwYWNrX3JlcXVpcmVfXy5tID0gX193ZWJwYWNrX21vZHVsZXNfXztcblxuIiwiLy8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbl9fd2VicGFja19yZXF1aXJlX18ubiA9IChtb2R1bGUpID0+IHtcblx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG5cdFx0KCkgPT4gKG1vZHVsZVsnZGVmYXVsdCddKSA6XG5cdFx0KCkgPT4gKG1vZHVsZSk7XG5cdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsIHsgYTogZ2V0dGVyIH0pO1xuXHRyZXR1cm4gZ2V0dGVyO1xufTsiLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5qID0gNDc7IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLmIgPSBkb2N1bWVudC5iYXNlVVJJIHx8IHNlbGYubG9jYXRpb24uaHJlZjtcblxuLy8gb2JqZWN0IHRvIHN0b3JlIGxvYWRlZCBhbmQgbG9hZGluZyBjaHVua3Ncbi8vIHVuZGVmaW5lZCA9IGNodW5rIG5vdCBsb2FkZWQsIG51bGwgPSBjaHVuayBwcmVsb2FkZWQvcHJlZmV0Y2hlZFxuLy8gW3Jlc29sdmUsIHJlamVjdCwgUHJvbWlzZV0gPSBjaHVuayBsb2FkaW5nLCAwID0gY2h1bmsgbG9hZGVkXG52YXIgaW5zdGFsbGVkQ2h1bmtzID0ge1xuXHQ0NzogMFxufTtcblxuLy8gbm8gY2h1bmsgb24gZGVtYW5kIGxvYWRpbmdcblxuLy8gbm8gcHJlZmV0Y2hpbmdcblxuLy8gbm8gcHJlbG9hZGVkXG5cbi8vIG5vIEhNUlxuXG4vLyBubyBITVIgbWFuaWZlc3RcblxuX193ZWJwYWNrX3JlcXVpcmVfXy5PLmogPSAoY2h1bmtJZCkgPT4gKGluc3RhbGxlZENodW5rc1tjaHVua0lkXSA9PT0gMCk7XG5cbi8vIGluc3RhbGwgYSBKU09OUCBjYWxsYmFjayBmb3IgY2h1bmsgbG9hZGluZ1xudmFyIHdlYnBhY2tKc29ucENhbGxiYWNrID0gKHBhcmVudENodW5rTG9hZGluZ0Z1bmN0aW9uLCBkYXRhKSA9PiB7XG5cdHZhciBbY2h1bmtJZHMsIG1vcmVNb2R1bGVzLCBydW50aW1lXSA9IGRhdGE7XG5cdC8vIGFkZCBcIm1vcmVNb2R1bGVzXCIgdG8gdGhlIG1vZHVsZXMgb2JqZWN0LFxuXHQvLyB0aGVuIGZsYWcgYWxsIFwiY2h1bmtJZHNcIiBhcyBsb2FkZWQgYW5kIGZpcmUgY2FsbGJhY2tcblx0dmFyIG1vZHVsZUlkLCBjaHVua0lkLCBpID0gMDtcblx0aWYoY2h1bmtJZHMuc29tZSgoaWQpID0+IChpbnN0YWxsZWRDaHVua3NbaWRdICE9PSAwKSkpIHtcblx0XHRmb3IobW9kdWxlSWQgaW4gbW9yZU1vZHVsZXMpIHtcblx0XHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhtb3JlTW9kdWxlcywgbW9kdWxlSWQpKSB7XG5cdFx0XHRcdF9fd2VicGFja19yZXF1aXJlX18ubVttb2R1bGVJZF0gPSBtb3JlTW9kdWxlc1ttb2R1bGVJZF07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmKHJ1bnRpbWUpIHZhciByZXN1bHQgPSBydW50aW1lKF9fd2VicGFja19yZXF1aXJlX18pO1xuXHR9XG5cdGlmKHBhcmVudENodW5rTG9hZGluZ0Z1bmN0aW9uKSBwYXJlbnRDaHVua0xvYWRpbmdGdW5jdGlvbihkYXRhKTtcblx0Zm9yKDtpIDwgY2h1bmtJZHMubGVuZ3RoOyBpKyspIHtcblx0XHRjaHVua0lkID0gY2h1bmtJZHNbaV07XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGluc3RhbGxlZENodW5rcywgY2h1bmtJZCkgJiYgaW5zdGFsbGVkQ2h1bmtzW2NodW5rSWRdKSB7XG5cdFx0XHRpbnN0YWxsZWRDaHVua3NbY2h1bmtJZF1bMF0oKTtcblx0XHR9XG5cdFx0aW5zdGFsbGVkQ2h1bmtzW2NodW5rSWRdID0gMDtcblx0fVxuXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXy5PKHJlc3VsdCk7XG59XG5cbnZhciBjaHVua0xvYWRpbmdHbG9iYWwgPSBzZWxmW1wid2VicGFja0NodW5rcmV2ZWRkaXRfcmVhbF90aW1lXCJdID0gc2VsZltcIndlYnBhY2tDaHVua3JldmVkZGl0X3JlYWxfdGltZVwiXSB8fCBbXTtcbmNodW5rTG9hZGluZ0dsb2JhbC5mb3JFYWNoKHdlYnBhY2tKc29ucENhbGxiYWNrLmJpbmQobnVsbCwgMCkpO1xuY2h1bmtMb2FkaW5nR2xvYmFsLnB1c2ggPSB3ZWJwYWNrSnNvbnBDYWxsYmFjay5iaW5kKG51bGwsIGNodW5rTG9hZGluZ0dsb2JhbC5wdXNoLmJpbmQoY2h1bmtMb2FkaW5nR2xvYmFsKSk7IiwiLy8gc3RhcnR1cFxuLy8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4vLyBUaGlzIGVudHJ5IG1vZHVsZSBkZXBlbmRzIG9uIG90aGVyIGxvYWRlZCBjaHVua3MgYW5kIGV4ZWN1dGlvbiBuZWVkIHRvIGJlIGRlbGF5ZWRcbnZhciBfX3dlYnBhY2tfZXhwb3J0c19fID0gX193ZWJwYWNrX3JlcXVpcmVfXy5PKHVuZGVmaW5lZCwgWzczNl0sICgpID0+IChfX3dlYnBhY2tfcmVxdWlyZV9fKDM1MDUpKSlcbl9fd2VicGFja19leHBvcnRzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fLk8oX193ZWJwYWNrX2V4cG9ydHNfXyk7XG4iXSwibmFtZXMiOlsiZGVmZXJyZWQiLCJsZWFmUHJvdG90eXBlcyIsImdldFByb3RvIiwidG9rZW5zIiwic20iLCJtZCIsImxnIiwicGlsbCIsInhzIiwieGwiLCJib2R5IiwibW9ubyIsImdsb2JhbFRva2VucyIsImdsb2JhbEJhc2UiLCJnbG9iYWxNYXJrZG93biIsIlRIRU1FX1NUT1JBR0VfS0VZIiwiYXBwbHlUaGVtZSIsIm1vZGUiLCJyZXNvbHZlZCIsIndpbmRvdyIsIm1hdGNoTWVkaWEiLCJtYXRjaGVzIiwiZG9jdW1lbnQiLCJkb2N1bWVudEVsZW1lbnQiLCJzZXRBdHRyaWJ1dGUiLCJBcHBHbG9iYWwiLCJ1c2VFZmZlY3QiLCJjaHJvbWUiLCJzdG9yYWdlIiwibG9jYWwiLCJnZXQiLCJyZXMiLCJtcSIsImhhbmRsZXIiLCJlIiwiYWRkRXZlbnRMaXN0ZW5lciIsIm9uU3RvcmFnZUNoYW5nZWQiLCJjaGFuZ2VzIiwiYXJlYSIsIm5ld1ZhbHVlIiwib25DaGFuZ2VkIiwiYWRkTGlzdGVuZXIiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwicmVtb3ZlTGlzdGVuZXIiLCJjaGlsZHJlbiIsInN0eWxlcyIsIkJsdWVMaW5rIiwiYSIsIkJ1dHRvbiIsImJ1dHRvbiIsInAiLCJ2YXJpYW50IiwiQ2FyZCIsImRpdiIsInNwYW4iLCJDYXJkQm9keSIsIlNlY3Rpb25IZWFkZXIiLCJoMiIsIlBhZ2UiLCJsYWJlbCIsImlucHV0IiwiaDMiLCJIZXJvIiwiVGl0bGUiLCJoMSIsIlN1YnRpdGxlIiwiRmVhdHVyZSIsIkZvb3RlciIsImNyZWF0ZVJvb3QiLCJnZXRFbGVtZW50QnlJZCIsInJlbmRlciIsInZlcnNpb24iLCJydW50aW1lIiwiZ2V0TWFuaWZlc3QiLCJvbkNsaWNrIiwidGFicyIsImNyZWF0ZSIsInVybCIsImdldFVSTCIsImNvbnNvbGUiLCJsb2ciLCJzdHlsZSIsIm1hcmdpblRvcCIsImhyZWYiLCJ0YXJnZXQiLCJyZWwiLCJfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18iLCJfX3dlYnBhY2tfcmVxdWlyZV9fIiwibW9kdWxlSWQiLCJjYWNoZWRNb2R1bGUiLCJ1bmRlZmluZWQiLCJleHBvcnRzIiwibW9kdWxlIiwiX193ZWJwYWNrX21vZHVsZXNfXyIsImNhbGwiLCJtIiwiTyIsInJlc3VsdCIsImNodW5rSWRzIiwiZm4iLCJwcmlvcml0eSIsIm5vdEZ1bGZpbGxlZCIsIkluZmluaXR5IiwiaSIsImxlbmd0aCIsImZ1bGZpbGxlZCIsImoiLCJPYmplY3QiLCJrZXlzIiwiZXZlcnkiLCJrZXkiLCJzcGxpY2UiLCJyIiwibiIsImdldHRlciIsIl9fZXNNb2R1bGUiLCJkIiwiZ2V0UHJvdG90eXBlT2YiLCJvYmoiLCJ0IiwidmFsdWUiLCJ0aGlzIiwidGhlbiIsIm5zIiwiZGVmIiwiY3VycmVudCIsImluZGV4T2YiLCJnZXRPd25Qcm9wZXJ0eU5hbWVzIiwiZm9yRWFjaCIsImRlZmluaXRpb24iLCJvIiwiZGVmaW5lUHJvcGVydHkiLCJlbnVtZXJhYmxlIiwicHJvcCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiU3ltYm9sIiwidG9TdHJpbmdUYWciLCJiIiwiYmFzZVVSSSIsInNlbGYiLCJsb2NhdGlvbiIsImluc3RhbGxlZENodW5rcyIsImNodW5rSWQiLCJ3ZWJwYWNrSnNvbnBDYWxsYmFjayIsInBhcmVudENodW5rTG9hZGluZ0Z1bmN0aW9uIiwiZGF0YSIsIm1vcmVNb2R1bGVzIiwic29tZSIsImlkIiwiY2h1bmtMb2FkaW5nR2xvYmFsIiwiYmluZCIsInB1c2giLCJfX3dlYnBhY2tfZXhwb3J0c19fIl0sInNvdXJjZVJvb3QiOiIifQ==