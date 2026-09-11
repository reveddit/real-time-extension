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
        --removed-text: #ffffff;
        --deleted-bg: rgba(33, 77, 149, 1);
        --deleted-border: #4c6ef5;
        --deleted-text: #ffffff;
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
        --removed-text: #9b1c1c;
        --deleted-bg: rgba(219, 234, 254, 1);
        --deleted-border: #1971c2;
        --deleted-text: #1c4f8a;
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
                    color: var(--removed-text);
                `;case"deleted":return i.iv`
                    background: var(--deleted-bg);
                    border-color: var(--deleted-border);
                    color: var(--deleted-text);
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
`;(0,n.createRoot)(document.getElementById("root")).render((0,t.jsx)((function(){const e=(()=>{try{return chrome.runtime.getManifest().version}catch{return""}})();return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(u,{}),(0,t.jsxs)(w,{children:[(0,t.jsxs)($,{children:[(0,t.jsx)(j,{children:"What's new in reveddit real-time"}),(0,t.jsxs)(Z,{children:["A redesign to match reveddit.com ",e?`· v${e}`:""]})]}),(0,t.jsx)(k,{children:"Highlights"}),(0,t.jsx)(x,{children:(0,t.jsxs)(y,{children:[(0,t.jsxs)(O,{children:[(0,t.jsx)("h3",{children:"Fresh look, dark by default"}),(0,t.jsx)("p",{children:"The popup, options, and history pages have been rebuilt to match the revddit.com design. Dark is the default, with a light mode you can pick from the options page."})]}),(0,t.jsxs)(O,{children:[(0,t.jsx)("h3",{children:"History shows real comments and posts"}),(0,t.jsx)("p",{children:"Each removal, deletion, or lock now renders as a Reddit-style card with the full markdown body — no more truncated link labels. Filter and sort from the top of the page."})]}),(0,t.jsxs)(O,{children:[(0,t.jsx)("h3",{children:"Same settings, clearer layout"}),(0,t.jsx)("p",{children:"All of your existing options and subscriptions carry over unchanged. The options page is now grouped into sections so nothing gets lost."})]})]})}),(0,t.jsxs)(z,{children:[(0,t.jsx)(h,{variant:"primary",onClick:()=>{try{chrome.tabs.create({url:chrome.runtime.getURL("src/history.html")})}catch(e){console.log("openHistory failed:",e)}},children:"Open history"}),(0,t.jsxs)("div",{style:{marginTop:16},children:["Questions or feedback?"," ",(0,t.jsx)(f,{href:"https://github.com/reveddit/real-time-extension/issues",target:"_blank",rel:"noreferrer",children:"GitHub issues"})]})]})]})]})}),{}))}},a={};function n(e){var r=a[e];if(void 0!==r)return r.exports;var o=a[e]={exports:{}};return t[e].call(o.exports,o,o.exports,n),o.exports}n.m=t,e=[],n.O=(r,o,t,a)=>{if(!o){var d=1/0;for(l=0;l<e.length;l++){for(var[o,t,a]=e[l],i=!0,c=0;c<o.length;c++)(!1&a||d>=a)&&Object.keys(n.O).every((e=>n.O[e](o[c])))?o.splice(c--,1):(i=!1,a<d&&(d=a));if(i){e.splice(l--,1);var s=t();void 0!==s&&(r=s)}}return r}a=a||0;for(var l=e.length;l>0&&e[l-1][2]>a;l--)e[l]=e[l-1];e[l]=[o,t,a]},n.n=e=>{var r=e&&e.__esModule?()=>e.default:()=>e;return n.d(r,{a:r}),r},o=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,n.t=function(e,t){if(1&t&&(e=this(e)),8&t)return e;if("object"==typeof e&&e){if(4&t&&e.__esModule)return e;if(16&t&&"function"==typeof e.then)return e}var a=Object.create(null);n.r(a);var d={};r=r||[null,o({}),o([]),o(o)];for(var i=2&t&&e;"object"==typeof i&&!~r.indexOf(i);i=o(i))Object.getOwnPropertyNames(i).forEach((r=>d[r]=()=>e[r]));return d.default=()=>e,n.d(a,d),a},n.d=(e,r)=>{for(var o in r)n.o(r,o)&&!n.o(e,o)&&Object.defineProperty(e,o,{enumerable:!0,get:r[o]})},n.o=(e,r)=>Object.prototype.hasOwnProperty.call(e,r),n.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.j=47,n.p="",(()=>{n.b=document.baseURI||self.location.href;var e={47:0};n.O.j=r=>0===e[r];var r=(r,o)=>{var t,a,[d,i,c]=o,s=0;if(d.some((r=>0!==e[r]))){for(t in i)n.o(i,t)&&(n.m[t]=i[t]);if(c)var l=c(n)}for(r&&r(o);s<d.length;s++)a=d[s],n.o(e,a)&&e[a]&&e[a][0](),e[a]=0;return n.O(l)},o=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];o.forEach(r.bind(null,0)),o.push=r.bind(null,o.push.bind(o))})();var d=n.O(void 0,[736],(()=>n(3505)));d=n.O(d)})();