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
    @keyframes mini-spin { to { transform: rotate(360deg); } }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3JjL3doYXRzbmV3LmpzIiwibWFwcGluZ3MiOiJ1QkFBSUEsRUNDQUMsRUFEQUMsRSxzRUNLRyxNQUFNQyxFQUNELENBQ0pDLEdBQUksTUFDSkMsR0FBSSxNQUNKQyxHQUFJLE1BQ0pDLEtBQU0sU0FMREosRUFPRixDQUNISyxHQUFJLE1BQ0pKLEdBQUksTUFDSkMsR0FBSSxPQUNKQyxHQUFJLE9BQ0pHLEdBQUksUUFaQ04sRUFjSCxDQUNGTyxLQUFNLDhFQUNOQyxLQUFNLG9FQUdEQyxFQUFlLElBQUk7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQTZHbkJDLEVBQWEsSUFBSTs7Ozs7O3VCQU1QVixFQUFZTzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztrQkFzQmpCUCxFQUFhRTs7Ozs7Ozs7Ozs7c0JBV1RGLEVBQWFHOzs7O3NCQUliSCxFQUFhRTs7OztzQkFJYkYsRUFBYUM7Ozs7Ozs7Ozs7Ozs7Ozt5QkFlVkQsRUFBY0M7Ozs7Ozs7Ozs7Ozs7RUFnQjFCVSxFQUFpQixJQUFJOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozt5QkFtQ1RYLEVBQWNFOzs7Ozs7O3VCQU9oQkYsRUFBWVE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUN6UHRCSSxFQUFvQixXQUNqQyxTQUFTQyxFQUFXQyxHQUNoQixNQUFNQyxFQUFvQixTQUFURCxFQUNWRSxPQUFPQyxZQUFjRCxPQUFPQyxXQUFXLGlDQUFpQ0MsUUFDckUsUUFDQSxPQUNKSixFQUNOSyxTQUFTQyxnQkFBZ0JDLGFBQWEsYUFBY04sRUFDeEQsQ0FDTyxTQUFTTyxJQW9DWixPQW5DQSxJQUFBQyxZQUFVLEtBQ04sSUFDSUMsT0FBT0MsUUFBUUMsTUFBTUMsSUFBSSxDQUFDZixJQUFvQmdCLElBRTFDZixFQURhZSxJQUFNaEIsSUFBc0IsT0FDekIsR0FFeEIsQ0FD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S3FDLEdBQTBDLElBQTdCRCxFQUFnQkMsR0FHeEQsSUFBSUMsRUFBdUIsQ0FBQ0MsRUFBNEJDLEtBQ3ZELElBR0kxRCxFQUFVdUQsR0FIVDdDLEVBQVVpRCxFQUFhM0UsR0FBVzBFLEVBR2hCM0MsRUFBSSxFQUMzQixHQUFHTCxFQUFTa0QsTUFBTUMsR0FBZ0MsSUFBeEJQLEVBQWdCTyxLQUFhLENBQ3RELElBQUk3RCxLQUFZMkQsRUFDWjVELEVBQW9CMkMsRUFBRWlCLEVBQWEzRCxLQUNyQ0QsRUFBb0JRLEVBQUVQLEdBQVkyRCxFQUFZM0QsSUFHaEQsR0FBR2hCLEVBQVMsSUFBSXlCLEVBQVN6QixFQUFRZSxFQUNsQyxDQUVBLElBREcwRCxHQUE0QkEsRUFBMkJDLEdBQ3JEM0MsRUFBSUwsRUFBU00sT0FBUUQsSUFDekJ3QyxFQUFVN0MsRUFBU0ssR0FDaEJoQixFQUFvQjJDLEVBQUVZLEVBQWlCQyxJQUFZRCxFQUFnQkMsSUFDckVELEVBQWdCQyxHQUFTLEtBRTFCRCxFQUFnQkMsR0FBVyxFQUU1QixPQUFPeEQsRUFBb0JTLEVBQUVDLEVBQU8sRUFHakNxRCxFQUFxQlYsS0FBcUMsK0JBQUlBLEtBQXFDLGdDQUFLLEdBQzVHVSxFQUFtQnRCLFFBQVFnQixFQUFxQk8sS0FBSyxLQUFNLElBQzNERCxFQUFtQkUsS0FBT1IsRUFBcUJPLEtBQUssS0FBTUQsRUFBbUJFLEtBQUtELEtBQUtELEcsS0M3Q3ZGLElBQUlHLEVBQXNCbEUsRUFBb0JTLE9BQUVOLEVBQVcsQ0FBQyxNQUFNLElBQU9ILEVBQW9CLFFBQzdGa0UsRUFBc0JsRSxFQUFvQlMsRUFBRXlELEUiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvd2VicGFjay9ydW50aW1lL2NodW5rIGxvYWRlZCIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvd2VicGFjay9ydW50aW1lL2NyZWF0ZSBmYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lLy4vc3JjL3NyYy91aS90b2tlbnMudHMiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lLy4vc3JjL3NyYy91aS9nbG9iYWwudHN4Iiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS8uL3NyYy9zcmMvdWkvY29tcG9uZW50cy50cyIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvLi9zcmMvc3JjL3doYXRzbmV3LnRzeCIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svcnVudGltZS9jb21wYXQgZ2V0IGRlZmF1bHQgZXhwb3J0Iiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svcnVudGltZS9ydW50aW1lSWQiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svcnVudGltZS9wdWJsaWNQYXRoIiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS93ZWJwYWNrL3J1bnRpbWUvanNvbnAgY2h1bmsgbG9hZGluZyIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvd2VicGFjay9zdGFydHVwIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBkZWZlcnJlZCA9IFtdO1xuX193ZWJwYWNrX3JlcXVpcmVfXy5PID0gKHJlc3VsdCwgY2h1bmtJZHMsIGZuLCBwcmlvcml0eSkgPT4ge1xuXHRpZihjaHVua0lkcykge1xuXHRcdHByaW9yaXR5ID0gcHJpb3JpdHkgfHwgMDtcblx0XHRmb3IodmFyIGkgPSBkZWZlcnJlZC5sZW5ndGg7IGkgPiAwICYmIGRlZmVycmVkW2kgLSAxXVsyXSA+IHByaW9yaXR5OyBpLS0pIGRlZmVycmVkW2ldID0gZGVmZXJyZWRbaSAtIDFdO1xuXHRcdGRlZmVycmVkW2ldID0gW2NodW5rSWRzLCBmbiwgcHJpb3JpdHldO1xuXHRcdHJldHVybjtcblx0fVxuXHR2YXIgbm90RnVsZmlsbGVkID0gSW5maW5pdHk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZGVmZXJyZWQubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgW2NodW5rSWRzLCBmbiwgcHJpb3JpdHldID0gZGVmZXJyZWRbaV07XG5cdFx0dmFyIGZ1bGZpbGxlZCA9IHRydWU7XG5cdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBjaHVua0lkcy5sZW5ndGg7IGorKykge1xuXHRcdFx0aWYgKChwcmlvcml0eSAmIDEgPT09IDAgfHwgbm90RnVsZmlsbGVkID49IHByaW9yaXR5KSAmJiBPYmplY3Qua2V5cyhfX3dlYnBhY2tfcmVxdWlyZV9fLk8pLmV2ZXJ5KChrZXkpID0+IChfX3dlYnBhY2tfcmVxdWlyZV9fLk9ba2V5XShjaHVua0lkc1tqXSkpKSkge1xuXHRcdFx0XHRjaHVua0lkcy5zcGxpY2Uoai0tLCAxKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZ1bGZpbGxlZCA9IGZhbHNlO1xuXHRcdFx0XHRpZihwcmlvcml0eSA8IG5vdEZ1bGZpbGxlZCkgbm90RnVsZmlsbGVkID0gcHJpb3JpdHk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmKGZ1bGZpbGxlZCkge1xuXHRcdFx0ZGVmZXJyZWQuc3BsaWNlKGktLSwgMSlcblx0XHRcdHZhciByID0gZm4oKTtcblx0XHRcdGlmIChyICE9PSB1bmRlZmluZWQpIHJlc3VsdCA9IHI7XG5cdFx0fVxuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59OyIsInZhciBnZXRQcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZiA/IChvYmopID0+IChPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKSkgOiAob2JqKSA9PiAob2JqLl9fcHJvdG9fXyk7XG52YXIgbGVhZlByb3RvdHlwZXM7XG4vLyBjcmVhdGUgYSBmYWtlIG5hbWVzcGFjZSBvYmplY3Rcbi8vIG1vZGUgJiAxOiB2YWx1ZSBpcyBhIG1vZHVsZSBpZCwgcmVxdWlyZSBpdFxuLy8gbW9kZSAmIDI6IG1lcmdlIGFsbCBwcm9wZXJ0aWVzIG9mIHZhbHVlIGludG8gdGhlIG5zXG4vLyBtb2RlICYgNDogcmV0dXJuIHZhbHVlIHdoZW4gYWxyZWFkeSBucyBvYmplY3Rcbi8vIG1vZGUgJiAxNjogcmV0dXJuIHZhbHVlIHdoZW4gaXQncyBQcm9taXNlLWxpa2Vcbi8vIG1vZGUgJiA4fDE6IGJlaGF2ZSBsaWtlIHJlcXVpcmVcbl9fd2VicGFja19yZXF1aXJlX18udCA9IGZ1bmN0aW9uKHZhbHVlLCBtb2RlKSB7XG5cdGlmKG1vZGUgJiAxKSB2YWx1ZSA9IHRoaXModmFsdWUpO1xuXHRpZihtb2RlICYgOCkgcmV0dXJuIHZhbHVlO1xuXHRpZih0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlKSB7XG5cdFx0aWYoKG1vZGUgJiA0KSAmJiB2YWx1ZS5fX2VzTW9kdWxlKSByZXR1cm4gdmFsdWU7XG5cdFx0aWYoKG1vZGUgJiAxNikgJiYgdHlwZW9mIHZhbHVlLnRoZW4gPT09ICdmdW5jdGlvbicpIHJldHVybiB2YWx1ZTtcblx0fVxuXHR2YXIgbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIobnMpO1xuXHR2YXIgZGVmID0ge307XG5cdGxlYWZQcm90b3R5cGVzID0gbGVhZlByb3RvdHlwZXMgfHwgW251bGwsIGdldFByb3RvKHt9KSwgZ2V0UHJvdG8oW10pLCBnZXRQcm90byhnZXRQcm90byldO1xuXHRmb3IodmFyIGN1cnJlbnQgPSBtb2RlICYgMiAmJiB2YWx1ZTsgdHlwZW9mIGN1cnJlbnQgPT0gJ29iamVjdCcgJiYgIX5sZWFmUHJvdG90eXBlcy5pbmRleE9mKGN1cnJlbnQpOyBjdXJyZW50ID0gZ2V0UHJvdG8oY3VycmVudCkpIHtcblx0XHRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhjdXJyZW50KS5mb3JFYWNoKChrZXkpID0+IChkZWZba2V5XSA9ICgpID0+ICh2YWx1ZVtrZXldKSkpO1xuXHR9XG5cdGRlZlsnZGVmYXVsdCddID0gKCkgPT4gKHZhbHVlKTtcblx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKG5zLCBkZWYpO1xuXHRyZXR1cm4gbnM7XG59OyIsIi8vIERlc2lnbiB0b2tlbnMgcG9ydGVkIGZyb20gd2Vic2l0ZS9zcmMvc2Fzcy9jb2xvcnMuc2FzcyBzbyB0aGUgZXh0ZW5zaW9uXG4vLyBtYXRjaGVzIHRoZSByZXZkZGl0LmNvbSBzaXRlLiBEYXJrIGlzIHRoZSBkZWZhdWx0OyBbZGF0YS10aGVtZT1cImxpZ2h0XCJdIG9uXG4vLyB0aGUgcm9vdCBlbGVtZW50IGZsaXBzIHRoZSBwYWxldHRlLiBUaGUgZXh0ZW5zaW9uIGlzIHNlbGYtY29udGFpbmVkOiB0aGVzZVxuLy8gdmFsdWVzIGFyZSBjb3BpZWQsIG5vdCBpbXBvcnRlZCBmcm9tIHdlYnNpdGUvLlxuaW1wb3J0IHsgY3NzIH0gZnJvbSAnQGVtb3Rpb24vcmVhY3QnO1xuZXhwb3J0IGNvbnN0IHRva2VucyA9IHtcbiAgICByYWRpdXM6IHtcbiAgICAgICAgc206ICc0cHgnLFxuICAgICAgICBtZDogJzZweCcsXG4gICAgICAgIGxnOiAnOHB4JyxcbiAgICAgICAgcGlsbDogJzk5OXB4JyxcbiAgICB9LFxuICAgIHNwYWNlOiB7XG4gICAgICAgIHhzOiAnNHB4JyxcbiAgICAgICAgc206ICc4cHgnLFxuICAgICAgICBtZDogJzEycHgnLFxuICAgICAgICBsZzogJzE2cHgnLFxuICAgICAgICB4bDogJzI0cHgnLFxuICAgIH0sXG4gICAgZm9udDoge1xuICAgICAgICBib2R5OiAnLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCBcIlNlZ29lIFVJXCIsIEhlbHZldGljYSwgQXJpYWwsIHNhbnMtc2VyaWYnLFxuICAgICAgICBtb25vOiAndWktbW9ub3NwYWNlLCBTRk1vbm8tUmVndWxhciwgTWVubG8sIE1vbmFjbywgQ29uc29sYXMsIG1vbm9zcGFjZScsXG4gICAgfSxcbn07XG5leHBvcnQgY29uc3QgZ2xvYmFsVG9rZW5zID0gY3NzIGBcbiAgICA6cm9vdCB7XG4gICAgICAgIC8qIEJhY2tncm91bmRzICovXG4gICAgICAgIC0tYmctcHJpbWFyeTogIzFhMWIxZTtcbiAgICAgICAgLS1iZy1zZWNvbmRhcnk6ICMxMTEyMTQ7XG4gICAgICAgIC0tYmctc3VyZmFjZTogIzI1MjYyYjtcbiAgICAgICAgLS1iZy1zdXJmYWNlLWhvdmVyOiAjMmMyZDMzO1xuXG4gICAgICAgIC8qIFRleHQgKi9cbiAgICAgICAgLS10ZXh0LXByaW1hcnk6ICNlMGUwZTA7XG4gICAgICAgIC0tdGV4dC1zZWNvbmRhcnk6ICM5MDkyOTY7XG4gICAgICAgIC0tdGV4dC1tdXRlZDogIzYwNjM2ODtcbiAgICAgICAgLS10ZXh0LW9uLWFjY2VudDogI2ZmZmZmZjtcblxuICAgICAgICAvKiBBY2NlbnQgLyBicmFuZCAqL1xuICAgICAgICAtLWFjY2VudDogI2UwM2UzZTtcbiAgICAgICAgLS1hY2NlbnQtZGltOiAjYzEzMDMwO1xuICAgICAgICAtLWFjY2VudC1ob3ZlcjogI2U4NTU1NTtcblxuICAgICAgICAvKiBMaW5rcyAqL1xuICAgICAgICAtLWxpbms6ICM3NGIzZTA7XG4gICAgICAgIC0tbGluay1ob3ZlcjogIzlhYzhlYjtcblxuICAgICAgICAvKiBTZW1hbnRpYyAqL1xuICAgICAgICAtLWF1dGhvcjogIzZhOThhZjtcbiAgICAgICAgLS1zdWJtaXR0ZXI6ICMyYjdkZTk7XG4gICAgICAgIC0tbW9kZXJhdG9yOiAjMmVhMDQzO1xuICAgICAgICAtLWFkbWluOiAjZTAzZTNlO1xuICAgICAgICAtLXF1YXJhbnRpbmVkOiAjZmZkNjM1O1xuXG4gICAgICAgIC8qIFJlbW92ZWQgLyBkZWxldGVkIGluZGljYXRvcnMgKi9cbiAgICAgICAgLS1yZW1vdmVkLWJnOiByZ2JhKDk5LCA1NCwgNTQsIDEpO1xuICAgICAgICAtLXJlbW92ZWQtYm9yZGVyOiAjZTAzZTNlO1xuICAgICAgICAtLWRlbGV0ZWQtYmc6IHJnYmEoMzMsIDc3LCAxNDksIDEpO1xuICAgICAgICAtLWRlbGV0ZWQtYm9yZGVyOiAjNGM2ZWY1O1xuICAgICAgICAtLWFwcHJvdmVkLWJnOiByZ2JhKDQ2LCAxNjAsIDY3LCAwLjIyKTtcbiAgICAgICAgLS1hcHByb3ZlZC1ib3JkZXI6ICMyZWEwNDM7XG4gICAgICAgIC0tbG9ja2VkLWJnOiByZ2JhKDI1NSwgMjE0LCA1MywgMC4yMik7XG4gICAgICAgIC0tbG9ja2VkLWJvcmRlcjogI2ZmZDYzNTtcblxuICAgICAgICAvKiBCb3JkZXJzICYgc3VyZmFjZXMgKi9cbiAgICAgICAgLS1ib3JkZXI6ICMzNzNhNDA7XG4gICAgICAgIC0tYm9yZGVyLWxpZ2h0OiAjNGE0ZTU0O1xuICAgICAgICAtLW5vdGUtYmc6ICMyNjRkNzM7XG4gICAgICAgIC0tY29kZS1iZzogcmdiYSg0MiwgNTEsIDY0LCAxKTtcbiAgICAgICAgLS1jb2RlLWJvcmRlcjogcmdiYSg4OCwgMTA1LCAxMjMsIDEpO1xuXG4gICAgICAgIC8qIFVJIGVsZW1lbnRzICovXG4gICAgICAgIC0tYnV0dG9uLWJnOiAjMzczYTQwO1xuICAgICAgICAtLWJ1dHRvbi10ZXh0OiAjZTBlMGUwO1xuICAgICAgICAtLWlucHV0LWJnOiAjMjUyNjJiO1xuICAgICAgICAtLWlucHV0LWJvcmRlcjogIzM3M2E0MDtcbiAgICAgICAgLS1pbnB1dC1mb2N1czogIzc0YjNlMDtcblxuICAgICAgICAvKiBTY29yZXMgJiBtZXRhICovXG4gICAgICAgIC0tbWV0YTogIzkwOTI5NjtcblxuICAgICAgICBjb2xvci1zY2hlbWU6IGRhcms7XG4gICAgfVxuXG4gICAgOnJvb3RbZGF0YS10aGVtZT0nbGlnaHQnXSB7XG4gICAgICAgIC0tYmctcHJpbWFyeTogI2ZmZmZmZjtcbiAgICAgICAgLS1iZy1zZWNvbmRhcnk6ICNmOGY5ZmE7XG4gICAgICAgIC0tYmctc3VyZmFjZTogI2YxZjNmNTtcbiAgICAgICAgLS1iZy1zdXJmYWNlLWhvdmVyOiAjZTllY2VmO1xuXG4gICAgICAgIC0tdGV4dC1wcmltYXJ5OiAjMWExYjFlO1xuICAgICAgICAtLXRleHQtc2Vjb25kYXJ5OiAjNDk1MDU3O1xuICAgICAgICAtLXRleHQtbXV0ZWQ6ICM4NjhlOTY7XG4gICAgICAgIC0tdGV4dC1vbi1hY2NlbnQ6ICNmZmZmZmY7XG5cbiAgICAgICAgLS1hY2NlbnQ6ICNjOTJhMmE7XG4gICAgICAgIC0tYWNjZW50LWRpbTogI2E4MjgyODtcbiAgICAgICAgLS1hY2NlbnQtaG92ZXI6ICNlMDMxMzE7XG5cbiAgICAgICAgLS1saW5rOiAjMTk3MWMyO1xuICAgICAgICAtLWxpbmstaG92ZXI6ICMxYzdlZDY7XG5cbiAgICAgICAgLS1hdXRob3I6ICMzYTZmOGE7XG4gICAgICAgIC0tc3VibWl0dGVyOiAjMTg2NGFiO1xuICAgICAgICAtLW1vZGVyYXRvcjogIzJiOGEzZTtcbiAgICAgICAgLS1hZG1pbjogI2M5MmEyYTtcblxuICAgICAgICAtLXJlbW92ZWQtYmc6IHJnYmEoMjU1LCAyMzAsIDIzMCwgMSk7XG4gICAgICAgIC0tcmVtb3ZlZC1ib3JkZXI6ICNjOTJhMmE7XG4gICAgICAgIC0tZGVsZXRlZC1iZzogcmdiYSgyMTksIDIzNCwgMjU0LCAxKTtcbiAgICAgICAgLS1kZWxldGVkLWJvcmRlcjogIzE5NzFjMjtcbiAgICAgICAgLS1hcHByb3ZlZC1iZzogcmdiYSg0MywgMTM4LCA2MiwgMC4xMik7XG4gICAgICAgIC0tYXBwcm92ZWQtYm9yZGVyOiAjMmI4YTNlO1xuICAgICAgICAtLWxvY2tlZC1iZzogcmdiYSgyNTUsIDIxNCwgNTMsIDAuMjgpO1xuICAgICAgICAtLWxvY2tlZC1ib3JkZXI6ICNkNGEwMTc7XG5cbiAgICAgICAgLS1ib3JkZXI6ICNkZWUyZTY7XG4gICAgICAgIC0tYm9yZGVyLWxpZ2h0OiAjY2VkNGRhO1xuICAgICAgICAtLW5vdGUtYmc6ICNlN2Y1ZmY7XG4gICAgICAgIC0tY29kZS1iZzogI2YxZjNmNTtcbiAgICAgICAgLS1jb2RlLWJvcmRlcjogI2RlZTJlNjtcblxuICAgICAgICAtLWJ1dHRvbi1iZzogI2U5ZWNlZjtcbiAgICAgICAgLS1idXR0b24tdGV4dDogIzFhMWIxZTtcbiAgICAgICAgLS1pbnB1dC1iZzogI2ZmZmZmZjtcbiAgICAgICAgLS1pbnB1dC1ib3JkZXI6ICNjZWQ0ZGE7XG4gICAgICAgIC0taW5wdXQtZm9jdXM6ICMxOTcxYzI7XG5cbiAgICAgICAgLS1tZXRhOiAjODY4ZTk2O1xuXG4gICAgICAgIGNvbG9yLXNjaGVtZTogbGlnaHQ7XG4gICAgfVxuYDtcbmV4cG9ydCBjb25zdCBnbG9iYWxCYXNlID0gY3NzIGBcbiAgICBodG1sLFxuICAgIGJvZHkge1xuICAgICAgICBtYXJnaW46IDA7XG4gICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWJnLXByaW1hcnkpO1xuICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICAgICAgZm9udC1mYW1pbHk6ICR7dG9rZW5zLmZvbnQuYm9keX07XG4gICAgICAgIGZvbnQtc2l6ZTogMTRweDtcbiAgICAgICAgbGluZS1oZWlnaHQ6IDEuNDU7XG4gICAgfVxuICAgICosXG4gICAgKjo6YmVmb3JlLFxuICAgICo6OmFmdGVyIHtcbiAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgICB9XG5cbiAgICBhIHtcbiAgICAgICAgY29sb3I6IHZhcigtLWxpbmspO1xuICAgICAgICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XG4gICAgfVxuICAgIGE6aG92ZXIge1xuICAgICAgICBjb2xvcjogdmFyKC0tbGluay1ob3Zlcik7XG4gICAgICAgIHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lO1xuICAgIH1cblxuICAgIGhyIHtcbiAgICAgICAgYm9yZGVyOiAwO1xuICAgICAgICBib3JkZXItdG9wOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTtcbiAgICAgICAgbWFyZ2luOiAke3Rva2Vucy5zcGFjZS5tZH0gMDtcbiAgICB9XG5cbiAgICBoMSxcbiAgICBoMixcbiAgICBoMyxcbiAgICBoNCB7XG4gICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuICAgIH1cbiAgICBoMSB7XG4gICAgICAgIGZvbnQtc2l6ZTogMjJweDtcbiAgICAgICAgbWFyZ2luOiAwIDAgJHt0b2tlbnMuc3BhY2UubGd9IDA7XG4gICAgfVxuICAgIGgyIHtcbiAgICAgICAgZm9udC1zaXplOiAxOHB4O1xuICAgICAgICBtYXJnaW46IDAgMCAke3Rva2Vucy5zcGFjZS5tZH0gMDtcbiAgICB9XG4gICAgaDMge1xuICAgICAgICBmb250LXNpemU6IDE2cHg7XG4gICAgICAgIG1hcmdpbjogMCAwICR7dG9rZW5zLnNwYWNlLnNtfSAwO1xuICAgIH1cblxuICAgIGJ1dHRvbiB7XG4gICAgICAgIGZvbnQtZmFtaWx5OiBpbmhlcml0O1xuICAgICAgICBmb250LXNpemU6IGluaGVyaXQ7XG4gICAgfVxuXG4gICAgaW5wdXRbdHlwZT0ndGV4dCddLFxuICAgIGlucHV0W3R5cGU9J251bWJlciddLFxuICAgIHNlbGVjdCxcbiAgICB0ZXh0YXJlYSB7XG4gICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWlucHV0LWJnKTtcbiAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWlucHV0LWJvcmRlcik7XG4gICAgICAgIGJvcmRlci1yYWRpdXM6ICR7dG9rZW5zLnJhZGl1cy5zbX07XG4gICAgICAgIHBhZGRpbmc6IDZweCA4cHg7XG4gICAgICAgIGZvbnQtZmFtaWx5OiBpbmhlcml0O1xuICAgICAgICBmb250LXNpemU6IGluaGVyaXQ7XG4gICAgICAgIG91dGxpbmU6IG5vbmU7XG4gICAgICAgICY6Zm9jdXMge1xuICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1pbnB1dC1mb2N1cyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpbnB1dFt0eXBlPSdjaGVja2JveCddIHtcbiAgICAgICAgYWNjZW50LWNvbG9yOiB2YXIoLS1saW5rKTtcbiAgICB9XG5gO1xuLy8gTWFya2Rvd24gb3V0cHV0IHN0eWxlcyAocG9ydGVkIGVzc2VudGlhbHMgZnJvbSB3ZWJzaXRlL3NyYy9zYXNzL21hcmtkb3duLnNhc3Ncbi8vIGFuZCBjb21tZW50LnNhc3MpLiBBcHBsaWVkIGluc2lkZSAubWQtYm9keSBjb250YWluZXJzLlxuZXhwb3J0IGNvbnN0IGdsb2JhbE1hcmtkb3duID0gY3NzIGBcbiAgICAubWQtYm9keSB7XG4gICAgICAgIHdvcmQtYnJlYWs6IGJyZWFrLXdvcmQ7XG4gICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuICAgIH1cbiAgICAubWQtYm9keSBwIHtcbiAgICAgICAgbWFyZ2luOiAwLjVlbSAwO1xuICAgICAgICBsaW5lLWhlaWdodDogMS40NTtcbiAgICB9XG4gICAgLm1kLWJvZHkgYSB7XG4gICAgICAgIGNvbG9yOiB2YXIoLS1saW5rKTtcbiAgICB9XG4gICAgLm1kLWJvZHkgYTpob3ZlciB7XG4gICAgICAgIGNvbG9yOiB2YXIoLS1saW5rLWhvdmVyKTtcbiAgICB9XG4gICAgLm1kLWJvZHkgdWwsXG4gICAgLm1kLWJvZHkgb2wge1xuICAgICAgICBtYXJnaW46IDAuNWVtIDA7XG4gICAgICAgIHBhZGRpbmctbGVmdDogMS41ZW07XG4gICAgfVxuICAgIC5tZC1ib2R5IGxpIHtcbiAgICAgICAgbWFyZ2luOiAwLjJlbSAwO1xuICAgIH1cbiAgICAubWQtYm9keSBibG9ja3F1b3RlIHtcbiAgICAgICAgYm9yZGVyLWxlZnQ6IDNweCBzb2xpZCB2YXIoLS1ib3JkZXItbGlnaHQpO1xuICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1zZWNvbmRhcnkpO1xuICAgICAgICBwYWRkaW5nLWxlZnQ6IDEwcHg7XG4gICAgICAgIG1hcmdpbjogMC41ZW0gMDtcbiAgICB9XG4gICAgLm1kLWJvZHkgcHJlIHtcbiAgICAgICAgbWFyZ2luOiAwLjVlbSAwO1xuICAgICAgICBwYWRkaW5nOiA4cHggMTBweDtcbiAgICAgICAgb3ZlcmZsb3c6IGF1dG87XG4gICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWNvZGUtYm9yZGVyKTtcbiAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tY29kZS1iZyk7XG4gICAgICAgIGJvcmRlci1yYWRpdXM6ICR7dG9rZW5zLnJhZGl1cy5tZH07XG4gICAgfVxuICAgIC5tZC1ib2R5IGNvZGUge1xuICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1jb2RlLWJnKTtcbiAgICAgICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tY29kZS1ib3JkZXIpO1xuICAgICAgICBib3JkZXItcmFkaXVzOiAzcHg7XG4gICAgICAgIHBhZGRpbmc6IDAgNHB4O1xuICAgICAgICBmb250LWZhbWlseTogJHt0b2tlbnMuZm9udC5tb25vfTtcbiAgICAgICAgZm9udC1zaXplOiAwLjkyZW07XG4gICAgfVxuICAgIC5tZC1ib2R5IHByZSBjb2RlIHtcbiAgICAgICAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XG4gICAgICAgIGJvcmRlcjogMDtcbiAgICAgICAgcGFkZGluZzogMDtcbiAgICAgICAgZGlzcGxheTogYmxvY2s7XG4gICAgICAgIHdoaXRlLXNwYWNlOiBwcmU7XG4gICAgfVxuICAgIC5tZC1ib2R5IGgxLFxuICAgIC5tZC1ib2R5IGgyLFxuICAgIC5tZC1ib2R5IGgzLFxuICAgIC5tZC1ib2R5IGg0IHtcbiAgICAgICAgbWFyZ2luOiAwLjZlbSAwIDAuM2VtIDA7XG4gICAgfVxuICAgIC5tZC1ib2R5ID4gKjpmaXJzdC1vZi10eXBlIHtcbiAgICAgICAgbWFyZ2luLXRvcDogMDtcbiAgICB9XG4gICAgLm1kLWJvZHkgPiAqOmxhc3QtY2hpbGQge1xuICAgICAgICBtYXJnaW4tYm90dG9tOiAwO1xuICAgIH1cbmA7XG4iLCJpbXBvcnQgeyBqc3ggYXMgX2pzeCwgRnJhZ21lbnQgYXMgX0ZyYWdtZW50LCBqc3hzIGFzIF9qc3hzIH0gZnJvbSBcInJlYWN0L2pzeC1ydW50aW1lXCI7XG5pbXBvcnQgUmVhY3QsIHsgdXNlRWZmZWN0IH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgR2xvYmFsIH0gZnJvbSAnQGVtb3Rpb24vcmVhY3QnO1xuaW1wb3J0IHsgZ2xvYmFsVG9rZW5zLCBnbG9iYWxCYXNlLCBnbG9iYWxNYXJrZG93biB9IGZyb20gJy4vdG9rZW5zJztcbmV4cG9ydCBjb25zdCBUSEVNRV9TVE9SQUdFX0tFWSA9ICd1aV90aGVtZSc7XG5mdW5jdGlvbiBhcHBseVRoZW1lKG1vZGUpIHtcbiAgICBjb25zdCByZXNvbHZlZCA9IG1vZGUgPT09ICdhdXRvJ1xuICAgICAgICA/ICh3aW5kb3cubWF0Y2hNZWRpYSAmJiB3aW5kb3cubWF0Y2hNZWRpYSgnKHByZWZlcnMtY29sb3Itc2NoZW1lOiBsaWdodCknKS5tYXRjaGVzXG4gICAgICAgICAgICA/ICdsaWdodCdcbiAgICAgICAgICAgIDogJ2RhcmsnKVxuICAgICAgICA6IG1vZGU7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNldEF0dHJpYnV0ZSgnZGF0YS10aGVtZScsIHJlc29sdmVkKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBBcHBHbG9iYWwoKSB7XG4gICAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbVEhFTUVfU1RPUkFHRV9LRVldLCByZXMgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGUgPSByZXM/LltUSEVNRV9TVE9SQUdFX0tFWV0gfHwgJ2F1dG8nO1xuICAgICAgICAgICAgICAgIGFwcGx5VGhlbWUobW9kZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICBhcHBseVRoZW1lKCdhdXRvJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbXEgPSB3aW5kb3cubWF0Y2hNZWRpYT8uKCcocHJlZmVycy1jb2xvci1zY2hlbWU6IGxpZ2h0KScpO1xuICAgICAgICBjb25zdCBoYW5kbGVyID0gKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1RIRU1FX1NUT1JBR0VfS0VZXSwgcmVzID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kZSA9IHJlcz8uW1RIRU1FX1NUT1JBR0VfS0VZXSB8fCAnYXV0byc7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAnYXV0bycpXG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBseVRoZW1lKCdhdXRvJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHZvaWQgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgbXE/LmFkZEV2ZW50TGlzdGVuZXI/LignY2hhbmdlJywgaGFuZGxlcik7XG4gICAgICAgIGNvbnN0IG9uU3RvcmFnZUNoYW5nZWQgPSAoY2hhbmdlcywgYXJlYSkgPT4ge1xuICAgICAgICAgICAgaWYgKGFyZWEgPT09ICdsb2NhbCcgJiYgY2hhbmdlc1tUSEVNRV9TVE9SQUdFX0tFWV0pIHtcbiAgICAgICAgICAgICAgICBhcHBseVRoZW1lKGNoYW5nZXNbVEhFTUVfU1RPUkFHRV9LRVldLm5ld1ZhbHVlIHx8ICdhdXRvJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcihvblN0b3JhZ2VDaGFuZ2VkKTtcbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIG1xPy5yZW1vdmVFdmVudExpc3RlbmVyPy4oJ2NoYW5nZScsIGhhbmRsZXIpO1xuICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLnJlbW92ZUxpc3RlbmVyKG9uU3RvcmFnZUNoYW5nZWQpO1xuICAgICAgICB9O1xuICAgIH0sIFtdKTtcbiAgICByZXR1cm4gKF9qc3hzKF9GcmFnbWVudCwgeyBjaGlsZHJlbjogW19qc3goR2xvYmFsLCB7IHN0eWxlczogZ2xvYmFsVG9rZW5zIH0pLCBfanN4KEdsb2JhbCwgeyBzdHlsZXM6IGdsb2JhbEJhc2UgfSksIF9qc3goR2xvYmFsLCB7IHN0eWxlczogZ2xvYmFsTWFya2Rvd24gfSldIH0pKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBzZXRUaGVtZU1vZGUobW9kZSkge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtUSEVNRV9TVE9SQUdFX0tFWV06IG1vZGUgfSk7XG4gICAgYXBwbHlUaGVtZShtb2RlKTtcbn1cbiIsImltcG9ydCBzdHlsZWQgZnJvbSAnQGVtb3Rpb24vc3R5bGVkJztcbmltcG9ydCB7IGNzcyB9IGZyb20gJ0BlbW90aW9uL3JlYWN0JztcbmltcG9ydCB7IHRva2VucyB9IGZyb20gJy4vdG9rZW5zJztcbmV4cG9ydCBjb25zdCBCbHVlTGluayA9IHN0eWxlZC5hIGBcbiAgICBjb2xvcjogdmFyKC0tbGluayk7XG4gICAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xuICAgICY6aG92ZXIge1xuICAgICAgICBjb2xvcjogdmFyKC0tbGluay1ob3Zlcik7XG4gICAgICAgIHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lO1xuICAgIH1cbmA7XG5leHBvcnQgY29uc3QgTXV0ZWRMaW5rID0gc3R5bGVkLmEgYFxuICAgIGNvbG9yOiB2YXIoLS10ZXh0LXNlY29uZGFyeSk7XG4gICAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xuICAgICY6aG92ZXIge1xuICAgICAgICBjb2xvcjogdmFyKC0tbGluay1ob3Zlcik7XG4gICAgICAgIHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lO1xuICAgIH1cbmA7XG5leHBvcnQgY29uc3QgQWN0aW9uQnRuID0gc3R5bGVkLmJ1dHRvbiBgXG4gICAgZGlzcGxheTogYmxvY2s7XG4gICAgd2lkdGg6IDEwMCU7XG4gICAgbWFyZ2luLXRvcDogNnB4O1xuICAgIHBhZGRpbmc6IDhweCAxMHB4O1xuICAgIGJhY2tncm91bmQ6IHZhcigtLWFjY2VudCk7XG4gICAgY29sb3I6IHZhcigtLXRleHQtb24tYWNjZW50KTtcbiAgICBib3JkZXI6IDA7XG4gICAgYm9yZGVyLXJhZGl1czogJHt0b2tlbnMucmFkaXVzLm1kfTtcbiAgICBjdXJzb3I6IHBvaW50ZXI7XG4gICAgZm9udC1zaXplOiAwLjk1ZW07XG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcbiAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kIDAuMTVzIGVhc2U7XG4gICAgJjpob3ZlciB7XG4gICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWFjY2VudC1ob3Zlcik7XG4gICAgfVxuICAgICY6ZGlzYWJsZWQge1xuICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1idXR0b24tYmcpO1xuICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1tdXRlZCk7XG4gICAgICAgIGN1cnNvcjogd2FpdDtcbiAgICB9XG5gO1xuZXhwb3J0IGNvbnN0IEJ1dHRvbiA9IHN0eWxlZC5idXR0b24gYFxuICAgIGRpc3BsYXk6IGlubGluZS1mbGV4O1xuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gICAgZ2FwOiA2cHg7XG4gICAgcGFkZGluZzogNnB4IDEycHg7XG4gICAgYm9yZGVyLXJhZGl1czogJHt0b2tlbnMucmFkaXVzLm1kfTtcbiAgICBmb250LXNpemU6IDAuOTJlbTtcbiAgICBmb250LXdlaWdodDogNjAwO1xuICAgIGN1cnNvcjogcG9pbnRlcjtcbiAgICBib3JkZXI6IDFweCBzb2xpZCB0cmFuc3BhcmVudDtcbiAgICB0cmFuc2l0aW9uOlxuICAgICAgICBiYWNrZ3JvdW5kIDAuMTVzIGVhc2UsXG4gICAgICAgIGJvcmRlci1jb2xvciAwLjE1cyBlYXNlLFxuICAgICAgICBjb2xvciAwLjE1cyBlYXNlO1xuICAgICR7cCA9PiB7XG4gICAgc3dpdGNoIChwLnZhcmlhbnQpIHtcbiAgICAgICAgY2FzZSAnc2Vjb25kYXJ5JzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1idXR0b24tYmcpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tYnV0dG9uLXRleHQpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLWJvcmRlcik7XG4gICAgICAgICAgICAgICAgICAgICY6aG92ZXIge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYmctc3VyZmFjZS1ob3Zlcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICBjYXNlICdnaG9zdCc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS1saW5rKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiB0cmFuc3BhcmVudDtcbiAgICAgICAgICAgICAgICAgICAgJjpob3ZlciB7XG4gICAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1iZy1zdXJmYWNlLWhvdmVyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgIGNhc2UgJ3ByaW1hcnknOlxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGNzcyBgXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWFjY2VudCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LW9uLWFjY2VudCk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tYWNjZW50KTtcbiAgICAgICAgICAgICAgICAgICAgJjpob3ZlciB7XG4gICAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1hY2NlbnQtaG92ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1hY2NlbnQtaG92ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYDtcbiAgICB9XG59fVxuICAgICY6ZGlzYWJsZWQge1xuICAgICAgICBvcGFjaXR5OiAwLjY7XG4gICAgICAgIGN1cnNvcjogbm90LWFsbG93ZWQ7XG4gICAgfVxuYDtcbmV4cG9ydCBjb25zdCBNZXNzYWdlQmFubmVyID0gc3R5bGVkLmRpdiBgXG4gICAgcGFkZGluZzogMTBweCAxMnB4O1xuICAgIG1hcmdpbjogNnB4IDA7XG4gICAgYm9yZGVyLXJhZGl1czogJHt0b2tlbnMucmFkaXVzLm1kfTtcbiAgICBmb250LXNpemU6IDAuOTJlbTtcbiAgICAke3AgPT4ge1xuICAgIHN3aXRjaCAocC52YXJpYW50KSB7XG4gICAgICAgIGNhc2UgJ3dhcm5pbmcnOlxuICAgICAgICAgICAgcmV0dXJuIGNzcyBgXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWxvY2tlZC1iZyk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWxvY2tlZC1ib3JkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICBjYXNlICdzdWNjZXNzJzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1hcHByb3ZlZC1iZyk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWFwcHJvdmVkLWJvcmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgIGNhc2UgJ25ld3MnOlxuICAgICAgICAgICAgcmV0dXJuIGNzcyBgXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLW5vdGUtYmcpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXItbGlnaHQpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICBjYXNlICdpbmZvJzpcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1iZy1zdXJmYWNlKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTtcbiAgICAgICAgICAgICAgICBgO1xuICAgIH1cbn19XG5gO1xuZXhwb3J0IGNvbnN0IE1pbmlTcGlubmVyID0gc3R5bGVkLnNwYW4gYFxuICAgIGRpc3BsYXk6IGlubGluZS1ibG9jaztcbiAgICB3aWR0aDogMTRweDtcbiAgICBoZWlnaHQ6IDE0cHg7XG4gICAgYm9yZGVyOiAycHggc29saWQgY3VycmVudENvbG9yO1xuICAgIGJvcmRlci10b3AtY29sb3I6IHRyYW5zcGFyZW50O1xuICAgIGJvcmRlci1yYWRpdXM6IDUwJTtcbiAgICB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO1xuICAgIG1hcmdpbi1yaWdodDogNnB4O1xuICAgIGFuaW1hdGlvbjogbWluaS1zcGluIDAuOHMgbGluZWFyIGluZmluaXRlO1xuICAgIEBrZXlmcmFtZXMgbWluaS1zcGluIHsgdG8geyB0cmFuc2Zvcm06IHJvdGF0ZSgzNjBkZWcpOyB9IH1cbmA7XG5leHBvcnQgY29uc3QgQ2FyZCA9IHN0eWxlZC5kaXYgYFxuICAgIGJhY2tncm91bmQ6IHZhcigtLWJnLXN1cmZhY2UpO1xuICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJvcmRlcik7XG4gICAgYm9yZGVyLXJhZGl1czogJHt0b2tlbnMucmFkaXVzLmxnfTtcbiAgICBwYWRkaW5nOiAke3Rva2Vucy5zcGFjZS5tZH0gJHt0b2tlbnMuc3BhY2UubGd9O1xuICAgIG1hcmdpbi1ib3R0b206ICR7dG9rZW5zLnNwYWNlLm1kfTtcbiAgICB0cmFuc2l0aW9uOiBib3JkZXItY29sb3IgMC4xNXMgZWFzZTtcbiAgICAmOmhvdmVyIHtcbiAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1ib3JkZXItbGlnaHQpO1xuICAgIH1cbmA7XG5leHBvcnQgY29uc3QgQ2FyZEhlYWRlciA9IHN0eWxlZC5kaXYgYFxuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgZmxleC13cmFwOiB3cmFwO1xuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgZ2FwOiAke3Rva2Vucy5zcGFjZS5zbX07XG4gICAgbWFyZ2luLWJvdHRvbTogJHt0b2tlbnMuc3BhY2UueHN9O1xuYDtcbmV4cG9ydCBjb25zdCBDYXJkTWV0YSA9IHN0eWxlZC5kaXYgYFxuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgZmxleC13cmFwOiB3cmFwO1xuICAgIGdhcDogJHt0b2tlbnMuc3BhY2Uuc219O1xuICAgIGNvbG9yOiB2YXIoLS10ZXh0LXNlY29uZGFyeSk7XG4gICAgZm9udC1zaXplOiAwLjg1ZW07XG4gICAgbWFyZ2luLWJvdHRvbTogJHt0b2tlbnMuc3BhY2Uuc219O1xuICAgICYgPiBzcGFuICsgc3Bhbjo6YmVmb3JlIHtcbiAgICAgICAgY29udGVudDogJ8K3JztcbiAgICAgICAgbWFyZ2luLXJpZ2h0OiAke3Rva2Vucy5zcGFjZS5zbX07XG4gICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTtcbiAgICB9XG5gO1xuZXhwb3J0IGNvbnN0IENhcmRCb2R5ID0gc3R5bGVkLmRpdiBgXG4gICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgZm9udC1zaXplOiAwLjk1ZW07XG5gO1xuZXhwb3J0IGNvbnN0IENhcmRBY3Rpb25zID0gc3R5bGVkLmRpdiBgXG4gICAgZGlzcGxheTogZmxleDtcbiAgICBnYXA6ICR7dG9rZW5zLnNwYWNlLnNtfTtcbiAgICBtYXJnaW4tdG9wOiAke3Rva2Vucy5zcGFjZS5zbX07XG4gICAgcGFkZGluZy10b3A6ICR7dG9rZW5zLnNwYWNlLnNtfTtcbiAgICBib3JkZXItdG9wOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTtcbmA7XG5leHBvcnQgY29uc3QgQmFkZ2UgPSBzdHlsZWQuc3BhbiBgXG4gICAgZGlzcGxheTogaW5saW5lLWZsZXg7XG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICBwYWRkaW5nOiAzcHggMTBweDtcbiAgICBib3JkZXItcmFkaXVzOiAke3Rva2Vucy5yYWRpdXMucGlsbH07XG4gICAgZm9udC13ZWlnaHQ6IDcwMDtcbiAgICBmb250LXNpemU6IDAuNzVlbTtcbiAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xuICAgIGxldHRlci1zcGFjaW5nOiAwLjA0ZW07XG4gICAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcbiAgICBib3JkZXI6IDFweCBzb2xpZCB0cmFuc3BhcmVudDtcbiAgICAke3AgPT4ge1xuICAgIHN3aXRjaCAocC52YXJpYW50KSB7XG4gICAgICAgIGNhc2UgJ3JlbW92ZWQnOlxuICAgICAgICAgICAgcmV0dXJuIGNzcyBgXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLXJlbW92ZWQtYmcpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLXJlbW92ZWQtYm9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6ICNmZmY7XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAnZGVsZXRlZCc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tZGVsZXRlZC1iZyk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tZGVsZXRlZC1ib3JkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogI2ZmZjtcbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICBjYXNlICdhcHByb3ZlZCc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYXBwcm92ZWQtYmcpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLWFwcHJvdmVkLWJvcmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgIGNhc2UgJ2xvY2tlZCc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tbG9ja2VkLWJnKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1sb2NrZWQtYm9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAndW5sb2NrZWQnOlxuICAgICAgICAgICAgcmV0dXJuIGNzcyBgXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWFwcHJvdmVkLWJnKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1hcHByb3ZlZC1ib3JkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICBjYXNlICdlZGl0ZWQnOlxuICAgICAgICAgICAgcmV0dXJuIGNzcyBgXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWJnLXN1cmZhY2UtaG92ZXIpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLWJvcmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgIGNhc2UgJ2RlZmF1bHQnOlxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGNzcyBgXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWJnLXN1cmZhY2UtaG92ZXIpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLWJvcmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXNlY29uZGFyeSk7XG4gICAgICAgICAgICAgICAgYDtcbiAgICB9XG59fVxuYDtcbmV4cG9ydCBjb25zdCBTZWN0aW9uSGVhZGVyID0gc3R5bGVkLmgyIGBcbiAgICBmb250LXNpemU6IDAuNzhlbTtcbiAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xuICAgIGxldHRlci1zcGFjaW5nOiAwLjA4ZW07XG4gICAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTtcbiAgICBtYXJnaW46ICR7dG9rZW5zLnNwYWNlLmxnfSAwICR7dG9rZW5zLnNwYWNlLnNtfSAwO1xuICAgIHBhZGRpbmctYm90dG9tOiAke3Rva2Vucy5zcGFjZS54c307XG4gICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHZhcigtLWJvcmRlcik7XG5gO1xuZXhwb3J0IGNvbnN0IEZpZWxkID0gc3R5bGVkLmxhYmVsIGBcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xuICAgIGdhcDogJHt0b2tlbnMuc3BhY2UubWR9O1xuICAgIHBhZGRpbmc6ICR7dG9rZW5zLnNwYWNlLnNtfSAwO1xuICAgICYgPiBzcGFuLmxhYmVsIHtcbiAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgICAgIGZvbnQtc2l6ZTogMC45NWVtO1xuICAgIH1cbiAgICAmID4gc3Bhbi5oaW50IHtcbiAgICAgICAgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpO1xuICAgICAgICBmb250LXNpemU6IDAuODJlbTtcbiAgICAgICAgZGlzcGxheTogYmxvY2s7XG4gICAgICAgIG1hcmdpbi10b3A6IDJweDtcbiAgICB9XG5gO1xuZXhwb3J0IGNvbnN0IEZpZWxkQ29sID0gc3R5bGVkLmRpdiBgXG4gICAgZGlzcGxheTogZmxleDtcbiAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICAgIGZsZXg6IDE7XG4gICAgbWluLXdpZHRoOiAwO1xuYDtcbmV4cG9ydCBjb25zdCBOdW1iZXJJbnB1dCA9IHN0eWxlZC5pbnB1dCBgXG4gICAgd2lkdGg6IDgwcHg7XG4gICAgdGV4dC1hbGlnbjogcmlnaHQ7XG5gO1xuZXhwb3J0IGNvbnN0IFRleHRJbnB1dCA9IHN0eWxlZC5pbnB1dCBgXG4gICAgd2lkdGg6IDEwMCU7XG5gO1xuZXhwb3J0IGNvbnN0IEF1dGhvciA9IHN0eWxlZC5zcGFuIGBcbiAgICBjb2xvcjogdmFyKC0tYXV0aG9yKTtcbiAgICBmb250LXdlaWdodDogNjAwO1xuYDtcbmV4cG9ydCBjb25zdCBTdWJyZWRkaXQgPSBzdHlsZWQuc3BhbiBgXG4gICAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTtcbmA7XG5leHBvcnQgY29uc3QgUG9zdFRpdGxlID0gc3R5bGVkLmgzIGBcbiAgICBtYXJnaW46ICR7dG9rZW5zLnNwYWNlLnhzfSAwICR7dG9rZW5zLnNwYWNlLnNtfSAwO1xuICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuYDtcbmV4cG9ydCBjb25zdCBNZEJvZHkgPSBzdHlsZWQuZGl2IGBcbiAgICBmb250LXNpemU6IDAuOTVlbTtcbmA7XG4iLCJpbXBvcnQgeyBqc3ggYXMgX2pzeCwganN4cyBhcyBfanN4cywgRnJhZ21lbnQgYXMgX0ZyYWdtZW50IH0gZnJvbSBcInJlYWN0L2pzeC1ydW50aW1lXCI7XG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgY3JlYXRlUm9vdCB9IGZyb20gJ3JlYWN0LWRvbS9jbGllbnQnO1xuaW1wb3J0IHN0eWxlZCBmcm9tICdAZW1vdGlvbi9zdHlsZWQnO1xuaW1wb3J0IHsgQXBwR2xvYmFsIH0gZnJvbSAnLi91aS9nbG9iYWwnO1xuaW1wb3J0IHsgQ2FyZCwgQ2FyZEJvZHksIFNlY3Rpb25IZWFkZXIsIEJ1dHRvbiwgQmx1ZUxpbmsgfSBmcm9tICcuL3VpL2NvbXBvbmVudHMnO1xuaW1wb3J0IHsgdG9rZW5zIH0gZnJvbSAnLi91aS90b2tlbnMnO1xuY29uc3QgUGFnZSA9IHN0eWxlZC5kaXYgYFxuICBtYXgtd2lkdGg6IDcyMHB4O1xuICBtYXJnaW46IDAgYXV0bztcbiAgcGFkZGluZzogJHt0b2tlbnMuc3BhY2UueGx9O1xuYDtcbmNvbnN0IEhlcm8gPSBzdHlsZWQuZGl2IGBcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xuICBwYWRkaW5nOiAke3Rva2Vucy5zcGFjZS54bH0gMDtcbiAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHZhcigtLWJvcmRlcik7XG4gIG1hcmdpbi1ib3R0b206ICR7dG9rZW5zLnNwYWNlLnhsfTtcbmA7XG5jb25zdCBUaXRsZSA9IHN0eWxlZC5oMSBgXG4gIGZvbnQtc2l6ZTogMjhweDtcbiAgbWFyZ2luOiAwIDAgJHt0b2tlbnMuc3BhY2Uuc219IDA7XG5gO1xuY29uc3QgU3VidGl0bGUgPSBzdHlsZWQucCBgXG4gIGNvbG9yOiB2YXIoLS10ZXh0LXNlY29uZGFyeSk7XG4gIG1hcmdpbjogMDtcbiAgZm9udC1zaXplOiAxLjFlbTtcbmA7XG5jb25zdCBGZWF0dXJlID0gc3R5bGVkLmRpdiBgXG4gIG1hcmdpbi1ib3R0b206ICR7dG9rZW5zLnNwYWNlLmxnfTtcbiAgJiA+IGgzIHtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgZ2FwOiAke3Rva2Vucy5zcGFjZS5zbX07XG4gICAgbWFyZ2luLWJvdHRvbTogJHt0b2tlbnMuc3BhY2UueHN9O1xuICB9XG4gICYgPiBwIHtcbiAgICBtYXJnaW46IDA7XG4gICAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTtcbiAgfVxuYDtcbmNvbnN0IEZvb3RlciA9IHN0eWxlZC5kaXYgYFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gIG1hcmdpbi10b3A6ICR7dG9rZW5zLnNwYWNlLnhsfTtcbiAgcGFkZGluZy10b3A6ICR7dG9rZW5zLnNwYWNlLmxnfTtcbiAgYm9yZGVyLXRvcDogMXB4IHNvbGlkIHZhcigtLWJvcmRlcik7XG4gIGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTtcbiAgZm9udC1zaXplOiAwLjllbTtcbmA7XG5mdW5jdGlvbiBXaGF0c05ldygpIHtcbiAgICBjb25zdCB2ZXJzaW9uID0gKCgpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBjaHJvbWUucnVudGltZS5nZXRNYW5pZmVzdCgpLnZlcnNpb247XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgfSkoKTtcbiAgICBjb25zdCBvcGVuSGlzdG9yeSA9ICgpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNocm9tZS50YWJzLmNyZWF0ZSh7IHVybDogY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKCdzcmMvaGlzdG9yeS5odG1sJykgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvcGVuSGlzdG9yeSBmYWlsZWQ6JywgZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiAoX2pzeHMoX0ZyYWdtZW50LCB7IGNoaWxkcmVuOiBbX2pzeChBcHBHbG9iYWwsIHt9KSwgX2pzeHMoUGFnZSwgeyBjaGlsZHJlbjogW19qc3hzKEhlcm8sIHsgY2hpbGRyZW46IFtfanN4KFRpdGxlLCB7IGNoaWxkcmVuOiBcIldoYXQncyBuZXcgaW4gcmV2ZWRkaXQgcmVhbC10aW1lXCIgfSksIF9qc3hzKFN1YnRpdGxlLCB7IGNoaWxkcmVuOiBbXCJBIHJlZGVzaWduIHRvIG1hdGNoIHJldmVkZGl0LmNvbSBcIiwgdmVyc2lvbiA/IGDCtyB2JHt2ZXJzaW9ufWAgOiAnJ10gfSldIH0pLCBfanN4KFNlY3Rpb25IZWFkZXIsIHsgY2hpbGRyZW46IFwiSGlnaGxpZ2h0c1wiIH0pLCBfanN4KENhcmQsIHsgY2hpbGRyZW46IF9qc3hzKENhcmRCb2R5LCB7IGNoaWxkcmVuOiBbX2pzeHMoRmVhdHVyZSwgeyBjaGlsZHJlbjogW19qc3goXCJoM1wiLCB7IGNoaWxkcmVuOiBcIkZyZXNoIGxvb2ssIGRhcmsgYnkgZGVmYXVsdFwiIH0pLCBfanN4KFwicFwiLCB7IGNoaWxkcmVuOiBcIlRoZSBwb3B1cCwgb3B0aW9ucywgYW5kIGhpc3RvcnkgcGFnZXMgaGF2ZSBiZWVuIHJlYnVpbHQgdG8gbWF0Y2ggdGhlIHJldmRkaXQuY29tIGRlc2lnbi4gRGFyayBpcyB0aGUgZGVmYXVsdCwgd2l0aCBhIGxpZ2h0IG1vZGUgeW91IGNhbiBwaWNrIGZyb20gdGhlIG9wdGlvbnMgcGFnZS5cIiB9KV0gfSksIF9qc3hzKEZlYXR1cmUsIHsgY2hpbGRyZW46IFtfanN4KFwiaDNcIiwgeyBjaGlsZHJlbjogXCJIaXN0b3J5IHNob3dzIHJlYWwgY29tbWVudHMgYW5kIHBvc3RzXCIgfSksIF9qc3goXCJwXCIsIHsgY2hpbGRyZW46IFwiRWFjaCByZW1vdmFsLCBkZWxldGlvbiwgb3IgbG9jayBub3cgcmVuZGVycyBhcyBhIFJlZGRpdC1zdHlsZSBjYXJkIHdpdGggdGhlIGZ1bGwgbWFya2Rvd24gYm9keSBcXHUyMDE0IG5vIG1vcmUgdHJ1bmNhdGVkIGxpbmsgbGFiZWxzLiBGaWx0ZXIgYW5kIHNvcnQgZnJvbSB0aGUgdG9wIG9mIHRoZSBwYWdlLlwiIH0pXSB9KSwgX2pzeHMoRmVhdHVyZSwgeyBjaGlsZHJlbjogW19qc3goXCJoM1wiLCB7IGNoaWxkcmVuOiBcIlNhbWUgc2V0dGluZ3MsIGNsZWFyZXIgbGF5b3V0XCIgfSksIF9qc3goXCJwXCIsIHsgY2hpbGRyZW46IFwiQWxsIG9mIHlvdXIgZXhpc3Rpbmcgb3B0aW9ucyBhbmQgc3Vic2NyaXB0aW9ucyBjYXJyeSBvdmVyIHVuY2hhbmdlZC4gVGhlIG9wdGlvbnMgcGFnZSBpcyBub3cgZ3JvdXBlZCBpbnRvIHNlY3Rpb25zIHNvIG5vdGhpbmcgZ2V0cyBsb3N0LlwiIH0pXSB9KV0gfSkgfSksIF9qc3hzKEZvb3RlciwgeyBjaGlsZHJlbjogW19qc3goQnV0dG9uLCB7IHZhcmlhbnQ6IFwicHJpbWFyeVwiLCBvbkNsaWNrOiBvcGVuSGlzdG9yeSwgY2hpbGRyZW46IFwiT3BlbiBoaXN0b3J5XCIgfSksIF9qc3hzKFwiZGl2XCIsIHsgc3R5bGU6IHsgbWFyZ2luVG9wOiAxNiB9LCBjaGlsZHJlbjogW1wiUXVlc3Rpb25zIG9yIGZlZWRiYWNrP1wiLCAnICcsIF9qc3goQmx1ZUxpbmssIHsgaHJlZjogXCJodHRwczovL3d3dy5yZWRkaXQuY29tL3IvcmV2ZWRkaXRcIiwgdGFyZ2V0OiBcIl9ibGFua1wiLCByZWw6IFwibm9yZWZlcnJlclwiLCBjaGlsZHJlbjogXCJyL3JldmVkZGl0XCIgfSldIH0pXSB9KV0gfSldIH0pKTtcbn1cbmNyZWF0ZVJvb3QoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jvb3QnKSkucmVuZGVyKF9qc3goV2hhdHNOZXcsIHt9KSk7XG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuLy8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbl9fd2VicGFja19yZXF1aXJlX18ubSA9IF9fd2VicGFja19tb2R1bGVzX187XG5cbiIsIi8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSAobW9kdWxlKSA9PiB7XG5cdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuXHRcdCgpID0+IChtb2R1bGVbJ2RlZmF1bHQnXSkgOlxuXHRcdCgpID0+IChtb2R1bGUpO1xuXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCB7IGE6IGdldHRlciB9KTtcblx0cmV0dXJuIGdldHRlcjtcbn07IiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18uaiA9IDQ3OyIsIl9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5iID0gZG9jdW1lbnQuYmFzZVVSSSB8fCBzZWxmLmxvY2F0aW9uLmhyZWY7XG5cbi8vIG9iamVjdCB0byBzdG9yZSBsb2FkZWQgYW5kIGxvYWRpbmcgY2h1bmtzXG4vLyB1bmRlZmluZWQgPSBjaHVuayBub3QgbG9hZGVkLCBudWxsID0gY2h1bmsgcHJlbG9hZGVkL3ByZWZldGNoZWRcbi8vIFtyZXNvbHZlLCByZWplY3QsIFByb21pc2VdID0gY2h1bmsgbG9hZGluZywgMCA9IGNodW5rIGxvYWRlZFxudmFyIGluc3RhbGxlZENodW5rcyA9IHtcblx0NDc6IDBcbn07XG5cbi8vIG5vIGNodW5rIG9uIGRlbWFuZCBsb2FkaW5nXG5cbi8vIG5vIHByZWZldGNoaW5nXG5cbi8vIG5vIHByZWxvYWRlZFxuXG4vLyBubyBITVJcblxuLy8gbm8gSE1SIG1hbmlmZXN0XG5cbl9fd2VicGFja19yZXF1aXJlX18uTy5qID0gKGNodW5rSWQpID0+IChpbnN0YWxsZWRDaHVua3NbY2h1bmtJZF0gPT09IDApO1xuXG4vLyBpbnN0YWxsIGEgSlNPTlAgY2FsbGJhY2sgZm9yIGNodW5rIGxvYWRpbmdcbnZhciB3ZWJwYWNrSnNvbnBDYWxsYmFjayA9IChwYXJlbnRDaHVua0xvYWRpbmdGdW5jdGlvbiwgZGF0YSkgPT4ge1xuXHR2YXIgW2NodW5rSWRzLCBtb3JlTW9kdWxlcywgcnVudGltZV0gPSBkYXRhO1xuXHQvLyBhZGQgXCJtb3JlTW9kdWxlc1wiIHRvIHRoZSBtb2R1bGVzIG9iamVjdCxcblx0Ly8gdGhlbiBmbGFnIGFsbCBcImNodW5rSWRzXCIgYXMgbG9hZGVkIGFuZCBmaXJlIGNhbGxiYWNrXG5cdHZhciBtb2R1bGVJZCwgY2h1bmtJZCwgaSA9IDA7XG5cdGlmKGNodW5rSWRzLnNvbWUoKGlkKSA9PiAoaW5zdGFsbGVkQ2h1bmtzW2lkXSAhPT0gMCkpKSB7XG5cdFx0Zm9yKG1vZHVsZUlkIGluIG1vcmVNb2R1bGVzKSB7XG5cdFx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8obW9yZU1vZHVsZXMsIG1vZHVsZUlkKSkge1xuXHRcdFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLm1bbW9kdWxlSWRdID0gbW9yZU1vZHVsZXNbbW9kdWxlSWRdO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZihydW50aW1lKSB2YXIgcmVzdWx0ID0gcnVudGltZShfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblx0fVxuXHRpZihwYXJlbnRDaHVua0xvYWRpbmdGdW5jdGlvbikgcGFyZW50Q2h1bmtMb2FkaW5nRnVuY3Rpb24oZGF0YSk7XG5cdGZvcig7aSA8IGNodW5rSWRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0Y2h1bmtJZCA9IGNodW5rSWRzW2ldO1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhpbnN0YWxsZWRDaHVua3MsIGNodW5rSWQpICYmIGluc3RhbGxlZENodW5rc1tjaHVua0lkXSkge1xuXHRcdFx0aW5zdGFsbGVkQ2h1bmtzW2NodW5rSWRdWzBdKCk7XG5cdFx0fVxuXHRcdGluc3RhbGxlZENodW5rc1tjaHVua0lkXSA9IDA7XG5cdH1cblx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18uTyhyZXN1bHQpO1xufVxuXG52YXIgY2h1bmtMb2FkaW5nR2xvYmFsID0gc2VsZltcIndlYnBhY2tDaHVua3JldmVkZGl0X3JlYWxfdGltZVwiXSA9IHNlbGZbXCJ3ZWJwYWNrQ2h1bmtyZXZlZGRpdF9yZWFsX3RpbWVcIl0gfHwgW107XG5jaHVua0xvYWRpbmdHbG9iYWwuZm9yRWFjaCh3ZWJwYWNrSnNvbnBDYWxsYmFjay5iaW5kKG51bGwsIDApKTtcbmNodW5rTG9hZGluZ0dsb2JhbC5wdXNoID0gd2VicGFja0pzb25wQ2FsbGJhY2suYmluZChudWxsLCBjaHVua0xvYWRpbmdHbG9iYWwucHVzaC5iaW5kKGNodW5rTG9hZGluZ0dsb2JhbCkpOyIsIi8vIHN0YXJ0dXBcbi8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuLy8gVGhpcyBlbnRyeSBtb2R1bGUgZGVwZW5kcyBvbiBvdGhlciBsb2FkZWQgY2h1bmtzIGFuZCBleGVjdXRpb24gbmVlZCB0byBiZSBkZWxheWVkXG52YXIgX193ZWJwYWNrX2V4cG9ydHNfXyA9IF9fd2VicGFja19yZXF1aXJlX18uTyh1bmRlZmluZWQsIFs3MzZdLCAoKSA9PiAoX193ZWJwYWNrX3JlcXVpcmVfXygzNTA1KSkpXG5fX3dlYnBhY2tfZXhwb3J0c19fID0gX193ZWJwYWNrX3JlcXVpcmVfXy5PKF9fd2VicGFja19leHBvcnRzX18pO1xuIl0sIm5hbWVzIjpbImRlZmVycmVkIiwibGVhZlByb3RvdHlwZXMiLCJnZXRQcm90byIsInRva2VucyIsInNtIiwibWQiLCJsZyIsInBpbGwiLCJ4cyIsInhsIiwiYm9keSIsIm1vbm8iLCJnbG9iYWxUb2tlbnMiLCJnbG9iYWxCYXNlIiwiZ2xvYmFsTWFya2Rvd24iLCJUSEVNRV9TVE9SQUdFX0tFWSIsImFwcGx5VGhlbWUiLCJtb2RlIiwicmVzb2x2ZWQiLCJ3aW5kb3ciLCJtYXRjaE1lZGlhIiwibWF0Y2hlcyIsImRvY3VtZW50IiwiZG9jdW1lbnRFbGVtZW50Iiwic2V0QXR0cmlidXRlIiwiQXBwR2xvYmFsIiwidXNlRWZmZWN0IiwiY2hyb21lIiwic3RvcmFnZSIsImxvY2FsIiwiZ2V0IiwicmVzIiwibXEiLCJoYW5kbGVyIiwiZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJvblN0b3JhZ2VDaGFuZ2VkIiwiY2hhbmdlcyIsImFyZWEiLCJuZXdWYWx1ZSIsIm9uQ2hhbmdlZCIsImFkZExpc3RlbmVyIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsInJlbW92ZUxpc3RlbmVyIiwiY2hpbGRyZW4iLCJzdHlsZXMiLCJCbHVlTGluayIsImEiLCJCdXR0b24iLCJidXR0b24iLCJwIiwidmFyaWFudCIsIkNhcmQiLCJkaXYiLCJzcGFuIiwiQ2FyZEJvZHkiLCJTZWN0aW9uSGVhZGVyIiwiaDIiLCJQYWdlIiwibGFiZWwiLCJpbnB1dCIsImgzIiwiSGVybyIsIlRpdGxlIiwiaDEiLCJTdWJ0aXRsZSIsIkZlYXR1cmUiLCJGb290ZXIiLCJjcmVhdGVSb290IiwiZ2V0RWxlbWVudEJ5SWQiLCJyZW5kZXIiLCJ2ZXJzaW9uIiwicnVudGltZSIsImdldE1hbmlmZXN0Iiwib25DbGljayIsInRhYnMiLCJjcmVhdGUiLCJ1cmwiLCJnZXRVUkwiLCJjb25zb2xlIiwibG9nIiwic3R5bGUiLCJtYXJnaW5Ub3AiLCJocmVmIiwidGFyZ2V0IiwicmVsIiwiX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fIiwiX193ZWJwYWNrX3JlcXVpcmVfXyIsIm1vZHVsZUlkIiwiY2FjaGVkTW9kdWxlIiwidW5kZWZpbmVkIiwiZXhwb3J0cyIsIm1vZHVsZSIsIl9fd2VicGFja19tb2R1bGVzX18iLCJjYWxsIiwibSIsIk8iLCJyZXN1bHQiLCJjaHVua0lkcyIsImZuIiwicHJpb3JpdHkiLCJub3RGdWxmaWxsZWQiLCJJbmZpbml0eSIsImkiLCJsZW5ndGgiLCJmdWxmaWxsZWQiLCJqIiwiT2JqZWN0Iiwia2V5cyIsImV2ZXJ5Iiwia2V5Iiwic3BsaWNlIiwiciIsIm4iLCJnZXR0ZXIiLCJfX2VzTW9kdWxlIiwiZCIsImdldFByb3RvdHlwZU9mIiwib2JqIiwidCIsInZhbHVlIiwidGhpcyIsInRoZW4iLCJucyIsImRlZiIsImN1cnJlbnQiLCJpbmRleE9mIiwiZ2V0T3duUHJvcGVydHlOYW1lcyIsImZvckVhY2giLCJkZWZpbml0aW9uIiwibyIsImRlZmluZVByb3BlcnR5IiwiZW51bWVyYWJsZSIsInByb3AiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsIlN5bWJvbCIsInRvU3RyaW5nVGFnIiwiYiIsImJhc2VVUkkiLCJzZWxmIiwibG9jYXRpb24iLCJpbnN0YWxsZWRDaHVua3MiLCJjaHVua0lkIiwid2VicGFja0pzb25wQ2FsbGJhY2siLCJwYXJlbnRDaHVua0xvYWRpbmdGdW5jdGlvbiIsImRhdGEiLCJtb3JlTW9kdWxlcyIsInNvbWUiLCJpZCIsImNodW5rTG9hZGluZ0dsb2JhbCIsImJpbmQiLCJwdXNoIiwiX193ZWJwYWNrX2V4cG9ydHNfXyJdLCJzb3VyY2VSb290IjoiIn0=