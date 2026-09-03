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
`,n.Z.span`
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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RUFBRVUsRUFBS3FDLEdBQTBDLElBQTdCRCxFQUFnQkMsR0FHeEQsSUFBSUMsRUFBdUIsQ0FBQ0MsRUFBNEJDLEtBQ3ZELElBR0kxRCxFQUFVdUQsR0FIVDdDLEVBQVVpRCxFQUFhM0UsR0FBVzBFLEVBR2hCM0MsRUFBSSxFQUMzQixHQUFHTCxFQUFTa0QsTUFBTUMsR0FBZ0MsSUFBeEJQLEVBQWdCTyxLQUFhLENBQ3RELElBQUk3RCxLQUFZMkQsRUFDWjVELEVBQW9CMkMsRUFBRWlCLEVBQWEzRCxLQUNyQ0QsRUFBb0JRLEVBQUVQLEdBQVkyRCxFQUFZM0QsSUFHaEQsR0FBR2hCLEVBQVMsSUFBSXlCLEVBQVN6QixFQUFRZSxFQUNsQyxDQUVBLElBREcwRCxHQUE0QkEsRUFBMkJDLEdBQ3JEM0MsRUFBSUwsRUFBU00sT0FBUUQsSUFDekJ3QyxFQUFVN0MsRUFBU0ssR0FDaEJoQixFQUFvQjJDLEVBQUVZLEVBQWlCQyxJQUFZRCxFQUFnQkMsSUFDckVELEVBQWdCQyxHQUFTLEtBRTFCRCxFQUFnQkMsR0FBVyxFQUU1QixPQUFPeEQsRUFBb0JTLEVBQUVDLEVBQU8sRUFHakNxRCxFQUFxQlYsS0FBcUMsK0JBQUlBLEtBQXFDLGdDQUFLLEdBQzVHVSxFQUFtQnRCLFFBQVFnQixFQUFxQk8sS0FBSyxLQUFNLElBQzNERCxFQUFtQkUsS0FBT1IsRUFBcUJPLEtBQUssS0FBTUQsRUFBbUJFLEtBQUtELEtBQUtELEcsS0M3Q3ZGLElBQUlHLEVBQXNCbEUsRUFBb0JTLE9BQUVOLEVBQVcsQ0FBQyxNQUFNLElBQU9ILEVBQW9CLFFBQzdGa0UsRUFBc0JsRSxFQUFvQlMsRUFBRXlELEUiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvd2VicGFjay9ydW50aW1lL2NodW5rIGxvYWRlZCIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvd2VicGFjay9ydW50aW1lL2NyZWF0ZSBmYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lLy4vc3JjL3NyYy91aS90b2tlbnMudHMiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lLy4vc3JjL3NyYy91aS9nbG9iYWwudHN4Iiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS8uL3NyYy9zcmMvdWkvY29tcG9uZW50cy50cyIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvLi9zcmMvc3JjL3doYXRzbmV3LnRzeCIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svcnVudGltZS9jb21wYXQgZ2V0IGRlZmF1bHQgZXhwb3J0Iiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svcnVudGltZS9ydW50aW1lSWQiLCJ3ZWJwYWNrOi8vcmV2ZWRkaXRfcmVhbF90aW1lL3dlYnBhY2svcnVudGltZS9wdWJsaWNQYXRoIiwid2VicGFjazovL3JldmVkZGl0X3JlYWxfdGltZS93ZWJwYWNrL3J1bnRpbWUvanNvbnAgY2h1bmsgbG9hZGluZyIsIndlYnBhY2s6Ly9yZXZlZGRpdF9yZWFsX3RpbWUvd2VicGFjay9zdGFydHVwIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBkZWZlcnJlZCA9IFtdO1xuX193ZWJwYWNrX3JlcXVpcmVfXy5PID0gKHJlc3VsdCwgY2h1bmtJZHMsIGZuLCBwcmlvcml0eSkgPT4ge1xuXHRpZihjaHVua0lkcykge1xuXHRcdHByaW9yaXR5ID0gcHJpb3JpdHkgfHwgMDtcblx0XHRmb3IodmFyIGkgPSBkZWZlcnJlZC5sZW5ndGg7IGkgPiAwICYmIGRlZmVycmVkW2kgLSAxXVsyXSA+IHByaW9yaXR5OyBpLS0pIGRlZmVycmVkW2ldID0gZGVmZXJyZWRbaSAtIDFdO1xuXHRcdGRlZmVycmVkW2ldID0gW2NodW5rSWRzLCBmbiwgcHJpb3JpdHldO1xuXHRcdHJldHVybjtcblx0fVxuXHR2YXIgbm90RnVsZmlsbGVkID0gSW5maW5pdHk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZGVmZXJyZWQubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgW2NodW5rSWRzLCBmbiwgcHJpb3JpdHldID0gZGVmZXJyZWRbaV07XG5cdFx0dmFyIGZ1bGZpbGxlZCA9IHRydWU7XG5cdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBjaHVua0lkcy5sZW5ndGg7IGorKykge1xuXHRcdFx0aWYgKChwcmlvcml0eSAmIDEgPT09IDAgfHwgbm90RnVsZmlsbGVkID49IHByaW9yaXR5KSAmJiBPYmplY3Qua2V5cyhfX3dlYnBhY2tfcmVxdWlyZV9fLk8pLmV2ZXJ5KChrZXkpID0+IChfX3dlYnBhY2tfcmVxdWlyZV9fLk9ba2V5XShjaHVua0lkc1tqXSkpKSkge1xuXHRcdFx0XHRjaHVua0lkcy5zcGxpY2Uoai0tLCAxKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZ1bGZpbGxlZCA9IGZhbHNlO1xuXHRcdFx0XHRpZihwcmlvcml0eSA8IG5vdEZ1bGZpbGxlZCkgbm90RnVsZmlsbGVkID0gcHJpb3JpdHk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmKGZ1bGZpbGxlZCkge1xuXHRcdFx0ZGVmZXJyZWQuc3BsaWNlKGktLSwgMSlcblx0XHRcdHZhciByID0gZm4oKTtcblx0XHRcdGlmIChyICE9PSB1bmRlZmluZWQpIHJlc3VsdCA9IHI7XG5cdFx0fVxuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59OyIsInZhciBnZXRQcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZiA/IChvYmopID0+IChPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKSkgOiAob2JqKSA9PiAob2JqLl9fcHJvdG9fXyk7XG52YXIgbGVhZlByb3RvdHlwZXM7XG4vLyBjcmVhdGUgYSBmYWtlIG5hbWVzcGFjZSBvYmplY3Rcbi8vIG1vZGUgJiAxOiB2YWx1ZSBpcyBhIG1vZHVsZSBpZCwgcmVxdWlyZSBpdFxuLy8gbW9kZSAmIDI6IG1lcmdlIGFsbCBwcm9wZXJ0aWVzIG9mIHZhbHVlIGludG8gdGhlIG5zXG4vLyBtb2RlICYgNDogcmV0dXJuIHZhbHVlIHdoZW4gYWxyZWFkeSBucyBvYmplY3Rcbi8vIG1vZGUgJiAxNjogcmV0dXJuIHZhbHVlIHdoZW4gaXQncyBQcm9taXNlLWxpa2Vcbi8vIG1vZGUgJiA4fDE6IGJlaGF2ZSBsaWtlIHJlcXVpcmVcbl9fd2VicGFja19yZXF1aXJlX18udCA9IGZ1bmN0aW9uKHZhbHVlLCBtb2RlKSB7XG5cdGlmKG1vZGUgJiAxKSB2YWx1ZSA9IHRoaXModmFsdWUpO1xuXHRpZihtb2RlICYgOCkgcmV0dXJuIHZhbHVlO1xuXHRpZih0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlKSB7XG5cdFx0aWYoKG1vZGUgJiA0KSAmJiB2YWx1ZS5fX2VzTW9kdWxlKSByZXR1cm4gdmFsdWU7XG5cdFx0aWYoKG1vZGUgJiAxNikgJiYgdHlwZW9mIHZhbHVlLnRoZW4gPT09ICdmdW5jdGlvbicpIHJldHVybiB2YWx1ZTtcblx0fVxuXHR2YXIgbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIobnMpO1xuXHR2YXIgZGVmID0ge307XG5cdGxlYWZQcm90b3R5cGVzID0gbGVhZlByb3RvdHlwZXMgfHwgW251bGwsIGdldFByb3RvKHt9KSwgZ2V0UHJvdG8oW10pLCBnZXRQcm90byhnZXRQcm90byldO1xuXHRmb3IodmFyIGN1cnJlbnQgPSBtb2RlICYgMiAmJiB2YWx1ZTsgdHlwZW9mIGN1cnJlbnQgPT0gJ29iamVjdCcgJiYgIX5sZWFmUHJvdG90eXBlcy5pbmRleE9mKGN1cnJlbnQpOyBjdXJyZW50ID0gZ2V0UHJvdG8oY3VycmVudCkpIHtcblx0XHRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhjdXJyZW50KS5mb3JFYWNoKChrZXkpID0+IChkZWZba2V5XSA9ICgpID0+ICh2YWx1ZVtrZXldKSkpO1xuXHR9XG5cdGRlZlsnZGVmYXVsdCddID0gKCkgPT4gKHZhbHVlKTtcblx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKG5zLCBkZWYpO1xuXHRyZXR1cm4gbnM7XG59OyIsIi8vIERlc2lnbiB0b2tlbnMgcG9ydGVkIGZyb20gd2Vic2l0ZS9zcmMvc2Fzcy9jb2xvcnMuc2FzcyBzbyB0aGUgZXh0ZW5zaW9uXG4vLyBtYXRjaGVzIHRoZSByZXZkZGl0LmNvbSBzaXRlLiBEYXJrIGlzIHRoZSBkZWZhdWx0OyBbZGF0YS10aGVtZT1cImxpZ2h0XCJdIG9uXG4vLyB0aGUgcm9vdCBlbGVtZW50IGZsaXBzIHRoZSBwYWxldHRlLiBUaGUgZXh0ZW5zaW9uIGlzIHNlbGYtY29udGFpbmVkOiB0aGVzZVxuLy8gdmFsdWVzIGFyZSBjb3BpZWQsIG5vdCBpbXBvcnRlZCBmcm9tIHdlYnNpdGUvLlxuaW1wb3J0IHsgY3NzIH0gZnJvbSAnQGVtb3Rpb24vcmVhY3QnO1xuZXhwb3J0IGNvbnN0IHRva2VucyA9IHtcbiAgICByYWRpdXM6IHtcbiAgICAgICAgc206ICc0cHgnLFxuICAgICAgICBtZDogJzZweCcsXG4gICAgICAgIGxnOiAnOHB4JyxcbiAgICAgICAgcGlsbDogJzk5OXB4JyxcbiAgICB9LFxuICAgIHNwYWNlOiB7XG4gICAgICAgIHhzOiAnNHB4JyxcbiAgICAgICAgc206ICc4cHgnLFxuICAgICAgICBtZDogJzEycHgnLFxuICAgICAgICBsZzogJzE2cHgnLFxuICAgICAgICB4bDogJzI0cHgnLFxuICAgIH0sXG4gICAgZm9udDoge1xuICAgICAgICBib2R5OiAnLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCBcIlNlZ29lIFVJXCIsIEhlbHZldGljYSwgQXJpYWwsIHNhbnMtc2VyaWYnLFxuICAgICAgICBtb25vOiAndWktbW9ub3NwYWNlLCBTRk1vbm8tUmVndWxhciwgTWVubG8sIE1vbmFjbywgQ29uc29sYXMsIG1vbm9zcGFjZScsXG4gICAgfSxcbn07XG5leHBvcnQgY29uc3QgZ2xvYmFsVG9rZW5zID0gY3NzIGBcbiAgICA6cm9vdCB7XG4gICAgICAgIC8qIEJhY2tncm91bmRzICovXG4gICAgICAgIC0tYmctcHJpbWFyeTogIzFhMWIxZTtcbiAgICAgICAgLS1iZy1zZWNvbmRhcnk6ICMxMTEyMTQ7XG4gICAgICAgIC0tYmctc3VyZmFjZTogIzI1MjYyYjtcbiAgICAgICAgLS1iZy1zdXJmYWNlLWhvdmVyOiAjMmMyZDMzO1xuXG4gICAgICAgIC8qIFRleHQgKi9cbiAgICAgICAgLS10ZXh0LXByaW1hcnk6ICNlMGUwZTA7XG4gICAgICAgIC0tdGV4dC1zZWNvbmRhcnk6ICM5MDkyOTY7XG4gICAgICAgIC0tdGV4dC1tdXRlZDogIzYwNjM2ODtcbiAgICAgICAgLS10ZXh0LW9uLWFjY2VudDogI2ZmZmZmZjtcblxuICAgICAgICAvKiBBY2NlbnQgLyBicmFuZCAqL1xuICAgICAgICAtLWFjY2VudDogI2UwM2UzZTtcbiAgICAgICAgLS1hY2NlbnQtZGltOiAjYzEzMDMwO1xuICAgICAgICAtLWFjY2VudC1ob3ZlcjogI2U4NTU1NTtcblxuICAgICAgICAvKiBMaW5rcyAqL1xuICAgICAgICAtLWxpbms6ICM3NGIzZTA7XG4gICAgICAgIC0tbGluay1ob3ZlcjogIzlhYzhlYjtcblxuICAgICAgICAvKiBTZW1hbnRpYyAqL1xuICAgICAgICAtLWF1dGhvcjogIzZhOThhZjtcbiAgICAgICAgLS1zdWJtaXR0ZXI6ICMyYjdkZTk7XG4gICAgICAgIC0tbW9kZXJhdG9yOiAjMmVhMDQzO1xuICAgICAgICAtLWFkbWluOiAjZTAzZTNlO1xuICAgICAgICAtLXF1YXJhbnRpbmVkOiAjZmZkNjM1O1xuXG4gICAgICAgIC8qIFJlbW92ZWQgLyBkZWxldGVkIGluZGljYXRvcnMgKi9cbiAgICAgICAgLS1yZW1vdmVkLWJnOiByZ2JhKDk5LCA1NCwgNTQsIDEpO1xuICAgICAgICAtLXJlbW92ZWQtYm9yZGVyOiAjZTAzZTNlO1xuICAgICAgICAtLXJlbW92ZWQtdGV4dDogI2ZmZmZmZjtcbiAgICAgICAgLS1kZWxldGVkLWJnOiByZ2JhKDMzLCA3NywgMTQ5LCAxKTtcbiAgICAgICAgLS1kZWxldGVkLWJvcmRlcjogIzRjNmVmNTtcbiAgICAgICAgLS1kZWxldGVkLXRleHQ6ICNmZmZmZmY7XG4gICAgICAgIC0tYXBwcm92ZWQtYmc6IHJnYmEoNDYsIDE2MCwgNjcsIDAuMjIpO1xuICAgICAgICAtLWFwcHJvdmVkLWJvcmRlcjogIzJlYTA0MztcbiAgICAgICAgLS1sb2NrZWQtYmc6IHJnYmEoMjU1LCAyMTQsIDUzLCAwLjIyKTtcbiAgICAgICAgLS1sb2NrZWQtYm9yZGVyOiAjZmZkNjM1O1xuXG4gICAgICAgIC8qIEJvcmRlcnMgJiBzdXJmYWNlcyAqL1xuICAgICAgICAtLWJvcmRlcjogIzM3M2E0MDtcbiAgICAgICAgLS1ib3JkZXItbGlnaHQ6ICM0YTRlNTQ7XG4gICAgICAgIC0tbm90ZS1iZzogIzI2NGQ3MztcbiAgICAgICAgLS1jb2RlLWJnOiByZ2JhKDQyLCA1MSwgNjQsIDEpO1xuICAgICAgICAtLWNvZGUtYm9yZGVyOiByZ2JhKDg4LCAxMDUsIDEyMywgMSk7XG5cbiAgICAgICAgLyogVUkgZWxlbWVudHMgKi9cbiAgICAgICAgLS1idXR0b24tYmc6ICMzNzNhNDA7XG4gICAgICAgIC0tYnV0dG9uLXRleHQ6ICNlMGUwZTA7XG4gICAgICAgIC0taW5wdXQtYmc6ICMyNTI2MmI7XG4gICAgICAgIC0taW5wdXQtYm9yZGVyOiAjMzczYTQwO1xuICAgICAgICAtLWlucHV0LWZvY3VzOiAjNzRiM2UwO1xuXG4gICAgICAgIC8qIFNjb3JlcyAmIG1ldGEgKi9cbiAgICAgICAgLS1tZXRhOiAjOTA5Mjk2O1xuXG4gICAgICAgIGNvbG9yLXNjaGVtZTogZGFyaztcbiAgICB9XG5cbiAgICA6cm9vdFtkYXRhLXRoZW1lPSdsaWdodCddIHtcbiAgICAgICAgLS1iZy1wcmltYXJ5OiAjZmZmZmZmO1xuICAgICAgICAtLWJnLXNlY29uZGFyeTogI2Y4ZjlmYTtcbiAgICAgICAgLS1iZy1zdXJmYWNlOiAjZjFmM2Y1O1xuICAgICAgICAtLWJnLXN1cmZhY2UtaG92ZXI6ICNlOWVjZWY7XG5cbiAgICAgICAgLS10ZXh0LXByaW1hcnk6ICMxYTFiMWU7XG4gICAgICAgIC0tdGV4dC1zZWNvbmRhcnk6ICM0OTUwNTc7XG4gICAgICAgIC0tdGV4dC1tdXRlZDogIzg2OGU5NjtcbiAgICAgICAgLS10ZXh0LW9uLWFjY2VudDogI2ZmZmZmZjtcblxuICAgICAgICAtLWFjY2VudDogI2M5MmEyYTtcbiAgICAgICAgLS1hY2NlbnQtZGltOiAjYTgyODI4O1xuICAgICAgICAtLWFjY2VudC1ob3ZlcjogI2UwMzEzMTtcblxuICAgICAgICAtLWxpbms6ICMxOTcxYzI7XG4gICAgICAgIC0tbGluay1ob3ZlcjogIzFjN2VkNjtcblxuICAgICAgICAtLWF1dGhvcjogIzNhNmY4YTtcbiAgICAgICAgLS1zdWJtaXR0ZXI6ICMxODY0YWI7XG4gICAgICAgIC0tbW9kZXJhdG9yOiAjMmI4YTNlO1xuICAgICAgICAtLWFkbWluOiAjYzkyYTJhO1xuXG4gICAgICAgIC0tcmVtb3ZlZC1iZzogcmdiYSgyNTUsIDIzMCwgMjMwLCAxKTtcbiAgICAgICAgLS1yZW1vdmVkLWJvcmRlcjogI2M5MmEyYTtcbiAgICAgICAgLS1yZW1vdmVkLXRleHQ6ICM5YjFjMWM7XG4gICAgICAgIC0tZGVsZXRlZC1iZzogcmdiYSgyMTksIDIzNCwgMjU0LCAxKTtcbiAgICAgICAgLS1kZWxldGVkLWJvcmRlcjogIzE5NzFjMjtcbiAgICAgICAgLS1kZWxldGVkLXRleHQ6ICMxYzRmOGE7XG4gICAgICAgIC0tYXBwcm92ZWQtYmc6IHJnYmEoNDMsIDEzOCwgNjIsIDAuMTIpO1xuICAgICAgICAtLWFwcHJvdmVkLWJvcmRlcjogIzJiOGEzZTtcbiAgICAgICAgLS1sb2NrZWQtYmc6IHJnYmEoMjU1LCAyMTQsIDUzLCAwLjI4KTtcbiAgICAgICAgLS1sb2NrZWQtYm9yZGVyOiAjZDRhMDE3O1xuXG4gICAgICAgIC0tYm9yZGVyOiAjZGVlMmU2O1xuICAgICAgICAtLWJvcmRlci1saWdodDogI2NlZDRkYTtcbiAgICAgICAgLS1ub3RlLWJnOiAjZTdmNWZmO1xuICAgICAgICAtLWNvZGUtYmc6ICNmMWYzZjU7XG4gICAgICAgIC0tY29kZS1ib3JkZXI6ICNkZWUyZTY7XG5cbiAgICAgICAgLS1idXR0b24tYmc6ICNlOWVjZWY7XG4gICAgICAgIC0tYnV0dG9uLXRleHQ6ICMxYTFiMWU7XG4gICAgICAgIC0taW5wdXQtYmc6ICNmZmZmZmY7XG4gICAgICAgIC0taW5wdXQtYm9yZGVyOiAjY2VkNGRhO1xuICAgICAgICAtLWlucHV0LWZvY3VzOiAjMTk3MWMyO1xuXG4gICAgICAgIC0tbWV0YTogIzg2OGU5NjtcblxuICAgICAgICBjb2xvci1zY2hlbWU6IGxpZ2h0O1xuICAgIH1cbmA7XG5leHBvcnQgY29uc3QgZ2xvYmFsQmFzZSA9IGNzcyBgXG4gICAgaHRtbCxcbiAgICBib2R5IHtcbiAgICAgICAgbWFyZ2luOiAwO1xuICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1iZy1wcmltYXJ5KTtcbiAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgICAgIGZvbnQtZmFtaWx5OiAke3Rva2Vucy5mb250LmJvZHl9O1xuICAgICAgICBmb250LXNpemU6IDE0cHg7XG4gICAgICAgIGxpbmUtaGVpZ2h0OiAxLjQ1O1xuICAgIH1cbiAgICAqLFxuICAgICo6OmJlZm9yZSxcbiAgICAqOjphZnRlciB7XG4gICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG4gICAgfVxuXG4gICAgYSB7XG4gICAgICAgIGNvbG9yOiB2YXIoLS1saW5rKTtcbiAgICAgICAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xuICAgIH1cbiAgICBhOmhvdmVyIHtcbiAgICAgICAgY29sb3I6IHZhcigtLWxpbmstaG92ZXIpO1xuICAgICAgICB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbiAgICB9XG5cbiAgICBociB7XG4gICAgICAgIGJvcmRlcjogMDtcbiAgICAgICAgYm9yZGVyLXRvcDogMXB4IHNvbGlkIHZhcigtLWJvcmRlcik7XG4gICAgICAgIG1hcmdpbjogJHt0b2tlbnMuc3BhY2UubWR9IDA7XG4gICAgfVxuXG4gICAgaDEsXG4gICAgaDIsXG4gICAgaDMsXG4gICAgaDQge1xuICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICB9XG4gICAgaDEge1xuICAgICAgICBmb250LXNpemU6IDIycHg7XG4gICAgICAgIG1hcmdpbjogMCAwICR7dG9rZW5zLnNwYWNlLmxnfSAwO1xuICAgIH1cbiAgICBoMiB7XG4gICAgICAgIGZvbnQtc2l6ZTogMThweDtcbiAgICAgICAgbWFyZ2luOiAwIDAgJHt0b2tlbnMuc3BhY2UubWR9IDA7XG4gICAgfVxuICAgIGgzIHtcbiAgICAgICAgZm9udC1zaXplOiAxNnB4O1xuICAgICAgICBtYXJnaW46IDAgMCAke3Rva2Vucy5zcGFjZS5zbX0gMDtcbiAgICB9XG5cbiAgICBidXR0b24ge1xuICAgICAgICBmb250LWZhbWlseTogaW5oZXJpdDtcbiAgICAgICAgZm9udC1zaXplOiBpbmhlcml0O1xuICAgIH1cblxuICAgIGlucHV0W3R5cGU9J3RleHQnXSxcbiAgICBpbnB1dFt0eXBlPSdudW1iZXInXSxcbiAgICBzZWxlY3QsXG4gICAgdGV4dGFyZWEge1xuICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1pbnB1dC1iZyk7XG4gICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1pbnB1dC1ib3JkZXIpO1xuICAgICAgICBib3JkZXItcmFkaXVzOiAke3Rva2Vucy5yYWRpdXMuc219O1xuICAgICAgICBwYWRkaW5nOiA2cHggOHB4O1xuICAgICAgICBmb250LWZhbWlseTogaW5oZXJpdDtcbiAgICAgICAgZm9udC1zaXplOiBpbmhlcml0O1xuICAgICAgICBvdXRsaW5lOiBub25lO1xuICAgICAgICAmOmZvY3VzIHtcbiAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0taW5wdXQtZm9jdXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaW5wdXRbdHlwZT0nY2hlY2tib3gnXSB7XG4gICAgICAgIGFjY2VudC1jb2xvcjogdmFyKC0tbGluayk7XG4gICAgfVxuYDtcbi8vIE1hcmtkb3duIG91dHB1dCBzdHlsZXMgKHBvcnRlZCBlc3NlbnRpYWxzIGZyb20gd2Vic2l0ZS9zcmMvc2Fzcy9tYXJrZG93bi5zYXNzXG4vLyBhbmQgY29tbWVudC5zYXNzKS4gQXBwbGllZCBpbnNpZGUgLm1kLWJvZHkgY29udGFpbmVycy5cbmV4cG9ydCBjb25zdCBnbG9iYWxNYXJrZG93biA9IGNzcyBgXG4gICAgLm1kLWJvZHkge1xuICAgICAgICB3b3JkLWJyZWFrOiBicmVhay13b3JkO1xuICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICB9XG4gICAgLm1kLWJvZHkgcCB7XG4gICAgICAgIG1hcmdpbjogMC41ZW0gMDtcbiAgICAgICAgbGluZS1oZWlnaHQ6IDEuNDU7XG4gICAgfVxuICAgIC5tZC1ib2R5IGEge1xuICAgICAgICBjb2xvcjogdmFyKC0tbGluayk7XG4gICAgfVxuICAgIC5tZC1ib2R5IGE6aG92ZXIge1xuICAgICAgICBjb2xvcjogdmFyKC0tbGluay1ob3Zlcik7XG4gICAgfVxuICAgIC5tZC1ib2R5IHVsLFxuICAgIC5tZC1ib2R5IG9sIHtcbiAgICAgICAgbWFyZ2luOiAwLjVlbSAwO1xuICAgICAgICBwYWRkaW5nLWxlZnQ6IDEuNWVtO1xuICAgIH1cbiAgICAubWQtYm9keSBsaSB7XG4gICAgICAgIG1hcmdpbjogMC4yZW0gMDtcbiAgICB9XG4gICAgLm1kLWJvZHkgYmxvY2txdW90ZSB7XG4gICAgICAgIGJvcmRlci1sZWZ0OiAzcHggc29saWQgdmFyKC0tYm9yZGVyLWxpZ2h0KTtcbiAgICAgICAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTtcbiAgICAgICAgcGFkZGluZy1sZWZ0OiAxMHB4O1xuICAgICAgICBtYXJnaW46IDAuNWVtIDA7XG4gICAgfVxuICAgIC5tZC1ib2R5IHByZSB7XG4gICAgICAgIG1hcmdpbjogMC41ZW0gMDtcbiAgICAgICAgcGFkZGluZzogOHB4IDEwcHg7XG4gICAgICAgIG92ZXJmbG93OiBhdXRvO1xuICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1jb2RlLWJvcmRlcik7XG4gICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWNvZGUtYmcpO1xuICAgICAgICBib3JkZXItcmFkaXVzOiAke3Rva2Vucy5yYWRpdXMubWR9O1xuICAgIH1cbiAgICAubWQtYm9keSBjb2RlIHtcbiAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tY29kZS1iZyk7XG4gICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWNvZGUtYm9yZGVyKTtcbiAgICAgICAgYm9yZGVyLXJhZGl1czogM3B4O1xuICAgICAgICBwYWRkaW5nOiAwIDRweDtcbiAgICAgICAgZm9udC1mYW1pbHk6ICR7dG9rZW5zLmZvbnQubW9ub307XG4gICAgICAgIGZvbnQtc2l6ZTogMC45MmVtO1xuICAgIH1cbiAgICAubWQtYm9keSBwcmUgY29kZSB7XG4gICAgICAgIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xuICAgICAgICBib3JkZXI6IDA7XG4gICAgICAgIHBhZGRpbmc6IDA7XG4gICAgICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgICAgICB3aGl0ZS1zcGFjZTogcHJlO1xuICAgIH1cbiAgICAubWQtYm9keSBoMSxcbiAgICAubWQtYm9keSBoMixcbiAgICAubWQtYm9keSBoMyxcbiAgICAubWQtYm9keSBoNCB7XG4gICAgICAgIG1hcmdpbjogMC42ZW0gMCAwLjNlbSAwO1xuICAgIH1cbiAgICAubWQtYm9keSA+ICo6Zmlyc3Qtb2YtdHlwZSB7XG4gICAgICAgIG1hcmdpbi10b3A6IDA7XG4gICAgfVxuICAgIC5tZC1ib2R5ID4gKjpsYXN0LWNoaWxkIHtcbiAgICAgICAgbWFyZ2luLWJvdHRvbTogMDtcbiAgICB9XG5gO1xuIiwiaW1wb3J0IHsganN4IGFzIF9qc3gsIEZyYWdtZW50IGFzIF9GcmFnbWVudCwganN4cyBhcyBfanN4cyB9IGZyb20gXCJyZWFjdC9qc3gtcnVudGltZVwiO1xuaW1wb3J0IFJlYWN0LCB7IHVzZUVmZmVjdCB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IEdsb2JhbCB9IGZyb20gJ0BlbW90aW9uL3JlYWN0JztcbmltcG9ydCB7IGdsb2JhbFRva2VucywgZ2xvYmFsQmFzZSwgZ2xvYmFsTWFya2Rvd24gfSBmcm9tICcuL3Rva2Vucyc7XG5leHBvcnQgY29uc3QgVEhFTUVfU1RPUkFHRV9LRVkgPSAndWlfdGhlbWUnO1xuZnVuY3Rpb24gYXBwbHlUaGVtZShtb2RlKSB7XG4gICAgY29uc3QgcmVzb2x2ZWQgPSBtb2RlID09PSAnYXV0bydcbiAgICAgICAgPyAod2luZG93Lm1hdGNoTWVkaWEgJiYgd2luZG93Lm1hdGNoTWVkaWEoJyhwcmVmZXJzLWNvbG9yLXNjaGVtZTogbGlnaHQpJykubWF0Y2hlc1xuICAgICAgICAgICAgPyAnbGlnaHQnXG4gICAgICAgICAgICA6ICdkYXJrJylcbiAgICAgICAgOiBtb2RlO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtdGhlbWUnLCByZXNvbHZlZCk7XG59XG5leHBvcnQgZnVuY3Rpb24gQXBwR2xvYmFsKCkge1xuICAgIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1RIRU1FX1NUT1JBR0VfS0VZXSwgcmVzID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RlID0gcmVzPy5bVEhFTUVfU1RPUkFHRV9LRVldIHx8ICdhdXRvJztcbiAgICAgICAgICAgICAgICBhcHBseVRoZW1lKG1vZGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgYXBwbHlUaGVtZSgnYXV0bycpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1xID0gd2luZG93Lm1hdGNoTWVkaWE/LignKHByZWZlcnMtY29sb3Itc2NoZW1lOiBsaWdodCknKTtcbiAgICAgICAgY29uc3QgaGFuZGxlciA9ICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFtUSEVNRV9TVE9SQUdFX0tFWV0sIHJlcyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGUgPSByZXM/LltUSEVNRV9TVE9SQUdFX0tFWV0gfHwgJ2F1dG8nO1xuICAgICAgICAgICAgICAgICAgICBpZiAobW9kZSA9PT0gJ2F1dG8nKVxuICAgICAgICAgICAgICAgICAgICAgICAgYXBwbHlUaGVtZSgnYXV0bycpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICB2b2lkIGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIG1xPy5hZGRFdmVudExpc3RlbmVyPy4oJ2NoYW5nZScsIGhhbmRsZXIpO1xuICAgICAgICBjb25zdCBvblN0b3JhZ2VDaGFuZ2VkID0gKGNoYW5nZXMsIGFyZWEpID0+IHtcbiAgICAgICAgICAgIGlmIChhcmVhID09PSAnbG9jYWwnICYmIGNoYW5nZXNbVEhFTUVfU1RPUkFHRV9LRVldKSB7XG4gICAgICAgICAgICAgICAgYXBwbHlUaGVtZShjaGFuZ2VzW1RIRU1FX1NUT1JBR0VfS0VZXS5uZXdWYWx1ZSB8fCAnYXV0bycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBjaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIob25TdG9yYWdlQ2hhbmdlZCk7XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICBtcT8ucmVtb3ZlRXZlbnRMaXN0ZW5lcj8uKCdjaGFuZ2UnLCBoYW5kbGVyKTtcbiAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5yZW1vdmVMaXN0ZW5lcihvblN0b3JhZ2VDaGFuZ2VkKTtcbiAgICAgICAgfTtcbiAgICB9LCBbXSk7XG4gICAgcmV0dXJuIChfanN4cyhfRnJhZ21lbnQsIHsgY2hpbGRyZW46IFtfanN4KEdsb2JhbCwgeyBzdHlsZXM6IGdsb2JhbFRva2VucyB9KSwgX2pzeChHbG9iYWwsIHsgc3R5bGVzOiBnbG9iYWxCYXNlIH0pLCBfanN4KEdsb2JhbCwgeyBzdHlsZXM6IGdsb2JhbE1hcmtkb3duIH0pXSB9KSk7XG59XG5leHBvcnQgZnVuY3Rpb24gc2V0VGhlbWVNb2RlKG1vZGUpIHtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbVEhFTUVfU1RPUkFHRV9LRVldOiBtb2RlIH0pO1xuICAgIGFwcGx5VGhlbWUobW9kZSk7XG59XG4iLCJpbXBvcnQgc3R5bGVkIGZyb20gJ0BlbW90aW9uL3N0eWxlZCc7XG5pbXBvcnQgeyBjc3MgfSBmcm9tICdAZW1vdGlvbi9yZWFjdCc7XG5pbXBvcnQgeyB0b2tlbnMgfSBmcm9tICcuL3Rva2Vucyc7XG5leHBvcnQgY29uc3QgQmx1ZUxpbmsgPSBzdHlsZWQuYSBgXG4gICAgY29sb3I6IHZhcigtLWxpbmspO1xuICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbiAgICAmOmhvdmVyIHtcbiAgICAgICAgY29sb3I6IHZhcigtLWxpbmstaG92ZXIpO1xuICAgICAgICB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbiAgICB9XG5gO1xuZXhwb3J0IGNvbnN0IE11dGVkTGluayA9IHN0eWxlZC5hIGBcbiAgICBjb2xvcjogdmFyKC0tdGV4dC1zZWNvbmRhcnkpO1xuICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbiAgICAmOmhvdmVyIHtcbiAgICAgICAgY29sb3I6IHZhcigtLWxpbmstaG92ZXIpO1xuICAgICAgICB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbiAgICB9XG5gO1xuZXhwb3J0IGNvbnN0IEFjdGlvbkJ0biA9IHN0eWxlZC5idXR0b24gYFxuICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIG1hcmdpbi10b3A6IDZweDtcbiAgICBwYWRkaW5nOiA4cHggMTBweDtcbiAgICBiYWNrZ3JvdW5kOiB2YXIoLS1hY2NlbnQpO1xuICAgIGNvbG9yOiB2YXIoLS10ZXh0LW9uLWFjY2VudCk7XG4gICAgYm9yZGVyOiAwO1xuICAgIGJvcmRlci1yYWRpdXM6ICR7dG9rZW5zLnJhZGl1cy5tZH07XG4gICAgY3Vyc29yOiBwb2ludGVyO1xuICAgIGZvbnQtc2l6ZTogMC45NWVtO1xuICAgIGZvbnQtd2VpZ2h0OiA2MDA7XG4gICAgdHJhbnNpdGlvbjogYmFja2dyb3VuZCAwLjE1cyBlYXNlO1xuICAgICY6aG92ZXIge1xuICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1hY2NlbnQtaG92ZXIpO1xuICAgIH1cbiAgICAmOmRpc2FibGVkIHtcbiAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYnV0dG9uLWJnKTtcbiAgICAgICAgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpO1xuICAgICAgICBjdXJzb3I6IHdhaXQ7XG4gICAgfVxuYDtcbmV4cG9ydCBjb25zdCBCdXR0b24gPSBzdHlsZWQuYnV0dG9uIGBcbiAgICBkaXNwbGF5OiBpbmxpbmUtZmxleDtcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICAgIGdhcDogNnB4O1xuICAgIHBhZGRpbmc6IDZweCAxMnB4O1xuICAgIGJvcmRlci1yYWRpdXM6ICR7dG9rZW5zLnJhZGl1cy5tZH07XG4gICAgZm9udC1zaXplOiAwLjkyZW07XG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcbiAgICBjdXJzb3I6IHBvaW50ZXI7XG4gICAgYm9yZGVyOiAxcHggc29saWQgdHJhbnNwYXJlbnQ7XG4gICAgdHJhbnNpdGlvbjpcbiAgICAgICAgYmFja2dyb3VuZCAwLjE1cyBlYXNlLFxuICAgICAgICBib3JkZXItY29sb3IgMC4xNXMgZWFzZSxcbiAgICAgICAgY29sb3IgMC4xNXMgZWFzZTtcbiAgICAke3AgPT4ge1xuICAgIHN3aXRjaCAocC52YXJpYW50KSB7XG4gICAgICAgIGNhc2UgJ3NlY29uZGFyeSc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYnV0dG9uLWJnKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLWJ1dHRvbi10ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1ib3JkZXIpO1xuICAgICAgICAgICAgICAgICAgICAmOmhvdmVyIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWJnLXN1cmZhY2UtaG92ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAnZ2hvc3QnOlxuICAgICAgICAgICAgcmV0dXJuIGNzcyBgXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tbGluayk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdHJhbnNwYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgICY6aG92ZXIge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYmctc3VyZmFjZS1ob3Zlcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICBjYXNlICdwcmltYXJ5JzpcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1hY2NlbnQpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1vbi1hY2NlbnQpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLWFjY2VudCk7XG4gICAgICAgICAgICAgICAgICAgICY6aG92ZXIge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYWNjZW50LWhvdmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tYWNjZW50LWhvdmVyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGA7XG4gICAgfVxufX1cbiAgICAmOmRpc2FibGVkIHtcbiAgICAgICAgb3BhY2l0eTogMC42O1xuICAgICAgICBjdXJzb3I6IG5vdC1hbGxvd2VkO1xuICAgIH1cbmA7XG5leHBvcnQgY29uc3QgTWVzc2FnZUJhbm5lciA9IHN0eWxlZC5kaXYgYFxuICAgIHBhZGRpbmc6IDEwcHggMTJweDtcbiAgICBtYXJnaW46IDZweCAwO1xuICAgIGJvcmRlci1yYWRpdXM6ICR7dG9rZW5zLnJhZGl1cy5tZH07XG4gICAgZm9udC1zaXplOiAwLjkyZW07XG4gICAgJHtwID0+IHtcbiAgICBzd2l0Y2ggKHAudmFyaWFudCkge1xuICAgICAgICBjYXNlICd3YXJuaW5nJzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1sb2NrZWQtYmcpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1sb2NrZWQtYm9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAnc3VjY2Vzcyc6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYXBwcm92ZWQtYmcpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1hcHByb3ZlZC1ib3JkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICBjYXNlICduZXdzJzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1ub3RlLWJnKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyLWxpZ2h0KTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAnaW5mbyc6XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gY3NzIGBcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYmctc3VyZmFjZSk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJvcmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXNlY29uZGFyeSk7XG4gICAgICAgICAgICAgICAgYDtcbiAgICB9XG59fVxuYDtcbmV4cG9ydCBjb25zdCBNaW5pU3Bpbm5lciA9IHN0eWxlZC5zcGFuIGBcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XG4gICAgd2lkdGg6IDE0cHg7XG4gICAgaGVpZ2h0OiAxNHB4O1xuICAgIGJvcmRlcjogMnB4IHNvbGlkIGN1cnJlbnRDb2xvcjtcbiAgICBib3JkZXItdG9wLWNvbG9yOiB0cmFuc3BhcmVudDtcbiAgICBib3JkZXItcmFkaXVzOiA1MCU7XG4gICAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcbiAgICBtYXJnaW4tcmlnaHQ6IDZweDtcbiAgICBhbmltYXRpb246IG1pbmktc3BpbiAwLjhzIGxpbmVhciBpbmZpbml0ZTtcbiAgICBAa2V5ZnJhbWVzIG1pbmktc3BpbiB7XG4gICAgICAgIHRvIHtcbiAgICAgICAgICAgIHRyYW5zZm9ybTogcm90YXRlKDM2MGRlZyk7XG4gICAgICAgIH1cbiAgICB9XG5gO1xuZXhwb3J0IGNvbnN0IENhcmQgPSBzdHlsZWQuZGl2IGBcbiAgICBiYWNrZ3JvdW5kOiB2YXIoLS1iZy1zdXJmYWNlKTtcbiAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXIpO1xuICAgIGJvcmRlci1yYWRpdXM6ICR7dG9rZW5zLnJhZGl1cy5sZ307XG4gICAgcGFkZGluZzogJHt0b2tlbnMuc3BhY2UubWR9ICR7dG9rZW5zLnNwYWNlLmxnfTtcbiAgICBtYXJnaW4tYm90dG9tOiAke3Rva2Vucy5zcGFjZS5tZH07XG4gICAgdHJhbnNpdGlvbjogYm9yZGVyLWNvbG9yIDAuMTVzIGVhc2U7XG4gICAgJjpob3ZlciB7XG4gICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tYm9yZGVyLWxpZ2h0KTtcbiAgICB9XG5gO1xuZXhwb3J0IGNvbnN0IENhcmRIZWFkZXIgPSBzdHlsZWQuZGl2IGBcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGZsZXgtd3JhcDogd3JhcDtcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgIGdhcDogJHt0b2tlbnMuc3BhY2Uuc219O1xuICAgIG1hcmdpbi1ib3R0b206ICR7dG9rZW5zLnNwYWNlLnhzfTtcbmA7XG5leHBvcnQgY29uc3QgQ2FyZE1ldGEgPSBzdHlsZWQuZGl2IGBcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGZsZXgtd3JhcDogd3JhcDtcbiAgICBnYXA6ICR7dG9rZW5zLnNwYWNlLnNtfTtcbiAgICBjb2xvcjogdmFyKC0tdGV4dC1zZWNvbmRhcnkpO1xuICAgIGZvbnQtc2l6ZTogMC44NWVtO1xuICAgIG1hcmdpbi1ib3R0b206ICR7dG9rZW5zLnNwYWNlLnNtfTtcbiAgICAmID4gc3BhbiArIHNwYW46OmJlZm9yZSB7XG4gICAgICAgIGNvbnRlbnQ6ICfCtyc7XG4gICAgICAgIG1hcmdpbi1yaWdodDogJHt0b2tlbnMuc3BhY2Uuc219O1xuICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1tdXRlZCk7XG4gICAgfVxuYDtcbmV4cG9ydCBjb25zdCBDYXJkQm9keSA9IHN0eWxlZC5kaXYgYFxuICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuICAgIGZvbnQtc2l6ZTogMC45NWVtO1xuYDtcbmV4cG9ydCBjb25zdCBDYXJkQWN0aW9ucyA9IHN0eWxlZC5kaXYgYFxuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgZ2FwOiAke3Rva2Vucy5zcGFjZS5zbX07XG4gICAgbWFyZ2luLXRvcDogJHt0b2tlbnMuc3BhY2Uuc219O1xuICAgIHBhZGRpbmctdG9wOiAke3Rva2Vucy5zcGFjZS5zbX07XG4gICAgYm9yZGVyLXRvcDogMXB4IHNvbGlkIHZhcigtLWJvcmRlcik7XG5gO1xuZXhwb3J0IGNvbnN0IEJhZGdlID0gc3R5bGVkLnNwYW4gYFxuICAgIGRpc3BsYXk6IGlubGluZS1mbGV4O1xuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgcGFkZGluZzogM3B4IDEwcHg7XG4gICAgYm9yZGVyLXJhZGl1czogJHt0b2tlbnMucmFkaXVzLnBpbGx9O1xuICAgIGZvbnQtd2VpZ2h0OiA3MDA7XG4gICAgZm9udC1zaXplOiAwLjc1ZW07XG4gICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcbiAgICBsZXR0ZXItc3BhY2luZzogMC4wNGVtO1xuICAgIHdoaXRlLXNwYWNlOiBub3dyYXA7XG4gICAgYm9yZGVyOiAxcHggc29saWQgdHJhbnNwYXJlbnQ7XG4gICAgJHtwID0+IHtcbiAgICBzd2l0Y2ggKHAudmFyaWFudCkge1xuICAgICAgICBjYXNlICdyZW1vdmVkJzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1yZW1vdmVkLWJnKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1yZW1vdmVkLWJvcmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS1yZW1vdmVkLXRleHQpO1xuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgIGNhc2UgJ2RlbGV0ZWQnOlxuICAgICAgICAgICAgcmV0dXJuIGNzcyBgXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWRlbGV0ZWQtYmcpO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXItY29sb3I6IHZhcigtLWRlbGV0ZWQtYm9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLWRlbGV0ZWQtdGV4dCk7XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAnYXBwcm92ZWQnOlxuICAgICAgICAgICAgcmV0dXJuIGNzcyBgXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWFwcHJvdmVkLWJnKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1hcHByb3ZlZC1ib3JkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICBjYXNlICdsb2NrZWQnOlxuICAgICAgICAgICAgcmV0dXJuIGNzcyBgXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWxvY2tlZC1iZyk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tbG9ja2VkLWJvcmRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgIGNhc2UgJ3VubG9ja2VkJzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1hcHByb3ZlZC1iZyk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tYXBwcm92ZWQtYm9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXRleHQtcHJpbWFyeSk7XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgY2FzZSAnZWRpdGVkJzpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1iZy1zdXJmYWNlLWhvdmVyKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1ib3JkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICBjYXNlICdkZWZhdWx0JzpcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBjc3MgYFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1iZy1zdXJmYWNlLWhvdmVyKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1ib3JkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogdmFyKC0tdGV4dC1zZWNvbmRhcnkpO1xuICAgICAgICAgICAgICAgIGA7XG4gICAgfVxufX1cbmA7XG5leHBvcnQgY29uc3QgU2VjdGlvbkhlYWRlciA9IHN0eWxlZC5oMiBgXG4gICAgZm9udC1zaXplOiAwLjc4ZW07XG4gICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcbiAgICBsZXR0ZXItc3BhY2luZzogMC4wOGVtO1xuICAgIGNvbG9yOiB2YXIoLS10ZXh0LXNlY29uZGFyeSk7XG4gICAgbWFyZ2luOiAke3Rva2Vucy5zcGFjZS5sZ30gMCAke3Rva2Vucy5zcGFjZS5zbX0gMDtcbiAgICBwYWRkaW5nLWJvdHRvbTogJHt0b2tlbnMuc3BhY2UueHN9O1xuICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCB2YXIoLS1ib3JkZXIpO1xuYDtcbmV4cG9ydCBjb25zdCBGaWVsZCA9IHN0eWxlZC5sYWJlbCBgXG4gICAgZGlzcGxheTogZmxleDtcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcbiAgICBnYXA6ICR7dG9rZW5zLnNwYWNlLm1kfTtcbiAgICBwYWRkaW5nOiAke3Rva2Vucy5zcGFjZS5zbX0gMDtcbiAgICAmID4gc3Bhbi5sYWJlbCB7XG4gICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1xuICAgICAgICBmb250LXNpemU6IDAuOTVlbTtcbiAgICB9XG4gICAgJiA+IHNwYW4uaGludCB7XG4gICAgICAgIGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTtcbiAgICAgICAgZm9udC1zaXplOiAwLjgyZW07XG4gICAgICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgICAgICBtYXJnaW4tdG9wOiAycHg7XG4gICAgfVxuYDtcbmV4cG9ydCBjb25zdCBGaWVsZENvbCA9IHN0eWxlZC5kaXYgYFxuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgICBmbGV4OiAxO1xuICAgIG1pbi13aWR0aDogMDtcbmA7XG5leHBvcnQgY29uc3QgTnVtYmVySW5wdXQgPSBzdHlsZWQuaW5wdXQgYFxuICAgIHdpZHRoOiA4MHB4O1xuICAgIHRleHQtYWxpZ246IHJpZ2h0O1xuYDtcbmV4cG9ydCBjb25zdCBUZXh0SW5wdXQgPSBzdHlsZWQuaW5wdXQgYFxuICAgIHdpZHRoOiAxMDAlO1xuYDtcbmV4cG9ydCBjb25zdCBBdXRob3IgPSBzdHlsZWQuc3BhbiBgXG4gICAgY29sb3I6IHZhcigtLWF1dGhvcik7XG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcbmA7XG5leHBvcnQgY29uc3QgU3VicmVkZGl0ID0gc3R5bGVkLnNwYW4gYFxuICAgIGNvbG9yOiB2YXIoLS10ZXh0LXNlY29uZGFyeSk7XG5gO1xuZXhwb3J0IGNvbnN0IFBvc3RUaXRsZSA9IHN0eWxlZC5oMyBgXG4gICAgbWFyZ2luOiAke3Rva2Vucy5zcGFjZS54c30gMCAke3Rva2Vucy5zcGFjZS5zbX0gMDtcbiAgICBjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcbmA7XG5leHBvcnQgY29uc3QgTWRCb2R5ID0gc3R5bGVkLmRpdiBgXG4gICAgZm9udC1zaXplOiAwLjk1ZW07XG5gO1xuIiwiaW1wb3J0IHsganN4IGFzIF9qc3gsIGpzeHMgYXMgX2pzeHMsIEZyYWdtZW50IGFzIF9GcmFnbWVudCB9IGZyb20gXCJyZWFjdC9qc3gtcnVudGltZVwiO1xuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IGNyZWF0ZVJvb3QgfSBmcm9tICdyZWFjdC1kb20vY2xpZW50JztcbmltcG9ydCBzdHlsZWQgZnJvbSAnQGVtb3Rpb24vc3R5bGVkJztcbmltcG9ydCB7IEFwcEdsb2JhbCB9IGZyb20gJy4vdWkvZ2xvYmFsJztcbmltcG9ydCB7IENhcmQsIENhcmRCb2R5LCBTZWN0aW9uSGVhZGVyLCBCdXR0b24sIEJsdWVMaW5rIH0gZnJvbSAnLi91aS9jb21wb25lbnRzJztcbmltcG9ydCB7IHRva2VucyB9IGZyb20gJy4vdWkvdG9rZW5zJztcbmNvbnN0IFBhZ2UgPSBzdHlsZWQuZGl2IGBcbiAgbWF4LXdpZHRoOiA3MjBweDtcbiAgbWFyZ2luOiAwIGF1dG87XG4gIHBhZGRpbmc6ICR7dG9rZW5zLnNwYWNlLnhsfTtcbmA7XG5jb25zdCBIZXJvID0gc3R5bGVkLmRpdiBgXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgcGFkZGluZzogJHt0b2tlbnMuc3BhY2UueGx9IDA7XG4gIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCB2YXIoLS1ib3JkZXIpO1xuICBtYXJnaW4tYm90dG9tOiAke3Rva2Vucy5zcGFjZS54bH07XG5gO1xuY29uc3QgVGl0bGUgPSBzdHlsZWQuaDEgYFxuICBmb250LXNpemU6IDI4cHg7XG4gIG1hcmdpbjogMCAwICR7dG9rZW5zLnNwYWNlLnNtfSAwO1xuYDtcbmNvbnN0IFN1YnRpdGxlID0gc3R5bGVkLnAgYFxuICBjb2xvcjogdmFyKC0tdGV4dC1zZWNvbmRhcnkpO1xuICBtYXJnaW46IDA7XG4gIGZvbnQtc2l6ZTogMS4xZW07XG5gO1xuY29uc3QgRmVhdHVyZSA9IHN0eWxlZC5kaXYgYFxuICBtYXJnaW4tYm90dG9tOiAke3Rva2Vucy5zcGFjZS5sZ307XG4gICYgPiBoMyB7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgIGdhcDogJHt0b2tlbnMuc3BhY2Uuc219O1xuICAgIG1hcmdpbi1ib3R0b206ICR7dG9rZW5zLnNwYWNlLnhzfTtcbiAgfVxuICAmID4gcCB7XG4gICAgbWFyZ2luOiAwO1xuICAgIGNvbG9yOiB2YXIoLS10ZXh0LXNlY29uZGFyeSk7XG4gIH1cbmA7XG5jb25zdCBGb290ZXIgPSBzdHlsZWQuZGl2IGBcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xuICBtYXJnaW4tdG9wOiAke3Rva2Vucy5zcGFjZS54bH07XG4gIHBhZGRpbmctdG9wOiAke3Rva2Vucy5zcGFjZS5sZ307XG4gIGJvcmRlci10b3A6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXIpO1xuICBjb2xvcjogdmFyKC0tdGV4dC1tdXRlZCk7XG4gIGZvbnQtc2l6ZTogMC45ZW07XG5gO1xuZnVuY3Rpb24gV2hhdHNOZXcoKSB7XG4gICAgY29uc3QgdmVyc2lvbiA9ICgoKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gY2hyb21lLnJ1bnRpbWUuZ2V0TWFuaWZlc3QoKS52ZXJzaW9uO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgIH0pKCk7XG4gICAgY29uc3Qgb3Blbkhpc3RvcnkgPSAoKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjaHJvbWUudGFicy5jcmVhdGUoeyB1cmw6IGNocm9tZS5ydW50aW1lLmdldFVSTCgnc3JjL2hpc3RvcnkuaHRtbCcpIH0pO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb3Blbkhpc3RvcnkgZmFpbGVkOicsIGUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gKF9qc3hzKF9GcmFnbWVudCwgeyBjaGlsZHJlbjogW19qc3goQXBwR2xvYmFsLCB7fSksIF9qc3hzKFBhZ2UsIHsgY2hpbGRyZW46IFtfanN4cyhIZXJvLCB7IGNoaWxkcmVuOiBbX2pzeChUaXRsZSwgeyBjaGlsZHJlbjogXCJXaGF0J3MgbmV3IGluIHJldmVkZGl0IHJlYWwtdGltZVwiIH0pLCBfanN4cyhTdWJ0aXRsZSwgeyBjaGlsZHJlbjogW1wiQSByZWRlc2lnbiB0byBtYXRjaCByZXZlZGRpdC5jb20gXCIsIHZlcnNpb24gPyBgwrcgdiR7dmVyc2lvbn1gIDogJyddIH0pXSB9KSwgX2pzeChTZWN0aW9uSGVhZGVyLCB7IGNoaWxkcmVuOiBcIkhpZ2hsaWdodHNcIiB9KSwgX2pzeChDYXJkLCB7IGNoaWxkcmVuOiBfanN4cyhDYXJkQm9keSwgeyBjaGlsZHJlbjogW19qc3hzKEZlYXR1cmUsIHsgY2hpbGRyZW46IFtfanN4KFwiaDNcIiwgeyBjaGlsZHJlbjogXCJGcmVzaCBsb29rLCBkYXJrIGJ5IGRlZmF1bHRcIiB9KSwgX2pzeChcInBcIiwgeyBjaGlsZHJlbjogXCJUaGUgcG9wdXAsIG9wdGlvbnMsIGFuZCBoaXN0b3J5IHBhZ2VzIGhhdmUgYmVlbiByZWJ1aWx0IHRvIG1hdGNoIHRoZSByZXZkZGl0LmNvbSBkZXNpZ24uIERhcmsgaXMgdGhlIGRlZmF1bHQsIHdpdGggYSBsaWdodCBtb2RlIHlvdSBjYW4gcGljayBmcm9tIHRoZSBvcHRpb25zIHBhZ2UuXCIgfSldIH0pLCBfanN4cyhGZWF0dXJlLCB7IGNoaWxkcmVuOiBbX2pzeChcImgzXCIsIHsgY2hpbGRyZW46IFwiSGlzdG9yeSBzaG93cyByZWFsIGNvbW1lbnRzIGFuZCBwb3N0c1wiIH0pLCBfanN4KFwicFwiLCB7IGNoaWxkcmVuOiBcIkVhY2ggcmVtb3ZhbCwgZGVsZXRpb24sIG9yIGxvY2sgbm93IHJlbmRlcnMgYXMgYSBSZWRkaXQtc3R5bGUgY2FyZCB3aXRoIHRoZSBmdWxsIG1hcmtkb3duIGJvZHkgXFx1MjAxNCBubyBtb3JlIHRydW5jYXRlZCBsaW5rIGxhYmVscy4gRmlsdGVyIGFuZCBzb3J0IGZyb20gdGhlIHRvcCBvZiB0aGUgcGFnZS5cIiB9KV0gfSksIF9qc3hzKEZlYXR1cmUsIHsgY2hpbGRyZW46IFtfanN4KFwiaDNcIiwgeyBjaGlsZHJlbjogXCJTYW1lIHNldHRpbmdzLCBjbGVhcmVyIGxheW91dFwiIH0pLCBfanN4KFwicFwiLCB7IGNoaWxkcmVuOiBcIkFsbCBvZiB5b3VyIGV4aXN0aW5nIG9wdGlvbnMgYW5kIHN1YnNjcmlwdGlvbnMgY2Fycnkgb3ZlciB1bmNoYW5nZWQuIFRoZSBvcHRpb25zIHBhZ2UgaXMgbm93IGdyb3VwZWQgaW50byBzZWN0aW9ucyBzbyBub3RoaW5nIGdldHMgbG9zdC5cIiB9KV0gfSldIH0pIH0pLCBfanN4cyhGb290ZXIsIHsgY2hpbGRyZW46IFtfanN4KEJ1dHRvbiwgeyB2YXJpYW50OiBcInByaW1hcnlcIiwgb25DbGljazogb3Blbkhpc3RvcnksIGNoaWxkcmVuOiBcIk9wZW4gaGlzdG9yeVwiIH0pLCBfanN4cyhcImRpdlwiLCB7IHN0eWxlOiB7IG1hcmdpblRvcDogMTYgfSwgY2hpbGRyZW46IFtcIlF1ZXN0aW9ucyBvciBmZWVkYmFjaz9cIiwgJyAnLCBfanN4KEJsdWVMaW5rLCB7IGhyZWY6IFwiaHR0cHM6Ly93d3cucmVkZGl0LmNvbS9yL3JldmVkZGl0XCIsIHRhcmdldDogXCJfYmxhbmtcIiwgcmVsOiBcIm5vcmVmZXJyZXJcIiwgY2hpbGRyZW46IFwici9yZXZlZGRpdFwiIH0pXSB9KV0gfSldIH0pXSB9KSk7XG59XG5jcmVhdGVSb290KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyb290JykpLnJlbmRlcihfanN4KFdoYXRzTmV3LCB7fSkpO1xuIiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbi8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG5fX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBfX3dlYnBhY2tfbW9kdWxlc19fO1xuXG4iLCIvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuX193ZWJwYWNrX3JlcXVpcmVfXy5uID0gKG1vZHVsZSkgPT4ge1xuXHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cblx0XHQoKSA9PiAobW9kdWxlWydkZWZhdWx0J10pIDpcblx0XHQoKSA9PiAobW9kdWxlKTtcblx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgeyBhOiBnZXR0ZXIgfSk7XG5cdHJldHVybiBnZXR0ZXI7XG59OyIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLmogPSA0NzsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIlwiOyIsIl9fd2VicGFja19yZXF1aXJlX18uYiA9IGRvY3VtZW50LmJhc2VVUkkgfHwgc2VsZi5sb2NhdGlvbi5ocmVmO1xuXG4vLyBvYmplY3QgdG8gc3RvcmUgbG9hZGVkIGFuZCBsb2FkaW5nIGNodW5rc1xuLy8gdW5kZWZpbmVkID0gY2h1bmsgbm90IGxvYWRlZCwgbnVsbCA9IGNodW5rIHByZWxvYWRlZC9wcmVmZXRjaGVkXG4vLyBbcmVzb2x2ZSwgcmVqZWN0LCBQcm9taXNlXSA9IGNodW5rIGxvYWRpbmcsIDAgPSBjaHVuayBsb2FkZWRcbnZhciBpbnN0YWxsZWRDaHVua3MgPSB7XG5cdDQ3OiAwXG59O1xuXG4vLyBubyBjaHVuayBvbiBkZW1hbmQgbG9hZGluZ1xuXG4vLyBubyBwcmVmZXRjaGluZ1xuXG4vLyBubyBwcmVsb2FkZWRcblxuLy8gbm8gSE1SXG5cbi8vIG5vIEhNUiBtYW5pZmVzdFxuXG5fX3dlYnBhY2tfcmVxdWlyZV9fLk8uaiA9IChjaHVua0lkKSA9PiAoaW5zdGFsbGVkQ2h1bmtzW2NodW5rSWRdID09PSAwKTtcblxuLy8gaW5zdGFsbCBhIEpTT05QIGNhbGxiYWNrIGZvciBjaHVuayBsb2FkaW5nXG52YXIgd2VicGFja0pzb25wQ2FsbGJhY2sgPSAocGFyZW50Q2h1bmtMb2FkaW5nRnVuY3Rpb24sIGRhdGEpID0+IHtcblx0dmFyIFtjaHVua0lkcywgbW9yZU1vZHVsZXMsIHJ1bnRpbWVdID0gZGF0YTtcblx0Ly8gYWRkIFwibW9yZU1vZHVsZXNcIiB0byB0aGUgbW9kdWxlcyBvYmplY3QsXG5cdC8vIHRoZW4gZmxhZyBhbGwgXCJjaHVua0lkc1wiIGFzIGxvYWRlZCBhbmQgZmlyZSBjYWxsYmFja1xuXHR2YXIgbW9kdWxlSWQsIGNodW5rSWQsIGkgPSAwO1xuXHRpZihjaHVua0lkcy5zb21lKChpZCkgPT4gKGluc3RhbGxlZENodW5rc1tpZF0gIT09IDApKSkge1xuXHRcdGZvcihtb2R1bGVJZCBpbiBtb3JlTW9kdWxlcykge1xuXHRcdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKG1vcmVNb2R1bGVzLCBtb2R1bGVJZCkpIHtcblx0XHRcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tW21vZHVsZUlkXSA9IG1vcmVNb2R1bGVzW21vZHVsZUlkXTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYocnVudGltZSkgdmFyIHJlc3VsdCA9IHJ1bnRpbWUoX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cdH1cblx0aWYocGFyZW50Q2h1bmtMb2FkaW5nRnVuY3Rpb24pIHBhcmVudENodW5rTG9hZGluZ0Z1bmN0aW9uKGRhdGEpO1xuXHRmb3IoO2kgPCBjaHVua0lkcy5sZW5ndGg7IGkrKykge1xuXHRcdGNodW5rSWQgPSBjaHVua0lkc1tpXTtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oaW5zdGFsbGVkQ2h1bmtzLCBjaHVua0lkKSAmJiBpbnN0YWxsZWRDaHVua3NbY2h1bmtJZF0pIHtcblx0XHRcdGluc3RhbGxlZENodW5rc1tjaHVua0lkXVswXSgpO1xuXHRcdH1cblx0XHRpbnN0YWxsZWRDaHVua3NbY2h1bmtJZF0gPSAwO1xuXHR9XG5cdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fLk8ocmVzdWx0KTtcbn1cblxudmFyIGNodW5rTG9hZGluZ0dsb2JhbCA9IHNlbGZbXCJ3ZWJwYWNrQ2h1bmtyZXZlZGRpdF9yZWFsX3RpbWVcIl0gPSBzZWxmW1wid2VicGFja0NodW5rcmV2ZWRkaXRfcmVhbF90aW1lXCJdIHx8IFtdO1xuY2h1bmtMb2FkaW5nR2xvYmFsLmZvckVhY2god2VicGFja0pzb25wQ2FsbGJhY2suYmluZChudWxsLCAwKSk7XG5jaHVua0xvYWRpbmdHbG9iYWwucHVzaCA9IHdlYnBhY2tKc29ucENhbGxiYWNrLmJpbmQobnVsbCwgY2h1bmtMb2FkaW5nR2xvYmFsLnB1c2guYmluZChjaHVua0xvYWRpbmdHbG9iYWwpKTsiLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbi8vIFRoaXMgZW50cnkgbW9kdWxlIGRlcGVuZHMgb24gb3RoZXIgbG9hZGVkIGNodW5rcyBhbmQgZXhlY3V0aW9uIG5lZWQgdG8gYmUgZGVsYXllZFxudmFyIF9fd2VicGFja19leHBvcnRzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fLk8odW5kZWZpbmVkLCBbNzM2XSwgKCkgPT4gKF9fd2VicGFja19yZXF1aXJlX18oMzUwNSkpKVxuX193ZWJwYWNrX2V4cG9ydHNfXyA9IF9fd2VicGFja19yZXF1aXJlX18uTyhfX3dlYnBhY2tfZXhwb3J0c19fKTtcbiJdLCJuYW1lcyI6WyJkZWZlcnJlZCIsImxlYWZQcm90b3R5cGVzIiwiZ2V0UHJvdG8iLCJ0b2tlbnMiLCJzbSIsIm1kIiwibGciLCJwaWxsIiwieHMiLCJ4bCIsImJvZHkiLCJtb25vIiwiZ2xvYmFsVG9rZW5zIiwiZ2xvYmFsQmFzZSIsImdsb2JhbE1hcmtkb3duIiwiVEhFTUVfU1RPUkFHRV9LRVkiLCJhcHBseVRoZW1lIiwibW9kZSIsInJlc29sdmVkIiwid2luZG93IiwibWF0Y2hNZWRpYSIsIm1hdGNoZXMiLCJkb2N1bWVudCIsImRvY3VtZW50RWxlbWVudCIsInNldEF0dHJpYnV0ZSIsIkFwcEdsb2JhbCIsInVzZUVmZmVjdCIsImNocm9tZSIsInN0b3JhZ2UiLCJsb2NhbCIsImdldCIsInJlcyIsIm1xIiwiaGFuZGxlciIsImUiLCJhZGRFdmVudExpc3RlbmVyIiwib25TdG9yYWdlQ2hhbmdlZCIsImNoYW5nZXMiLCJhcmVhIiwibmV3VmFsdWUiLCJvbkNoYW5nZWQiLCJhZGRMaXN0ZW5lciIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJyZW1vdmVMaXN0ZW5lciIsImNoaWxkcmVuIiwic3R5bGVzIiwiQmx1ZUxpbmsiLCJhIiwiQnV0dG9uIiwiYnV0dG9uIiwicCIsInZhcmlhbnQiLCJDYXJkIiwiZGl2Iiwic3BhbiIsIkNhcmRCb2R5IiwiU2VjdGlvbkhlYWRlciIsImgyIiwiUGFnZSIsImxhYmVsIiwiaW5wdXQiLCJoMyIsIkhlcm8iLCJUaXRsZSIsImgxIiwiU3VidGl0bGUiLCJGZWF0dXJlIiwiRm9vdGVyIiwiY3JlYXRlUm9vdCIsImdldEVsZW1lbnRCeUlkIiwicmVuZGVyIiwidmVyc2lvbiIsInJ1bnRpbWUiLCJnZXRNYW5pZmVzdCIsIm9uQ2xpY2siLCJ0YWJzIiwiY3JlYXRlIiwidXJsIiwiZ2V0VVJMIiwiY29uc29sZSIsImxvZyIsInN0eWxlIiwibWFyZ2luVG9wIiwiaHJlZiIsInRhcmdldCIsInJlbCIsIl9fd2VicGFja19tb2R1bGVfY2FjaGVfXyIsIl9fd2VicGFja19yZXF1aXJlX18iLCJtb2R1bGVJZCIsImNhY2hlZE1vZHVsZSIsInVuZGVmaW5lZCIsImV4cG9ydHMiLCJtb2R1bGUiLCJfX3dlYnBhY2tfbW9kdWxlc19fIiwiY2FsbCIsIm0iLCJPIiwicmVzdWx0IiwiY2h1bmtJZHMiLCJmbiIsInByaW9yaXR5Iiwibm90RnVsZmlsbGVkIiwiSW5maW5pdHkiLCJpIiwibGVuZ3RoIiwiZnVsZmlsbGVkIiwiaiIsIk9iamVjdCIsImtleXMiLCJldmVyeSIsImtleSIsInNwbGljZSIsInIiLCJuIiwiZ2V0dGVyIiwiX19lc01vZHVsZSIsImQiLCJnZXRQcm90b3R5cGVPZiIsIm9iaiIsInQiLCJ2YWx1ZSIsInRoaXMiLCJ0aGVuIiwibnMiLCJkZWYiLCJjdXJyZW50IiwiaW5kZXhPZiIsImdldE93blByb3BlcnR5TmFtZXMiLCJmb3JFYWNoIiwiZGVmaW5pdGlvbiIsIm8iLCJkZWZpbmVQcm9wZXJ0eSIsImVudW1lcmFibGUiLCJwcm9wIiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJTeW1ib2wiLCJ0b1N0cmluZ1RhZyIsImIiLCJiYXNlVVJJIiwic2VsZiIsImxvY2F0aW9uIiwiaW5zdGFsbGVkQ2h1bmtzIiwiY2h1bmtJZCIsIndlYnBhY2tKc29ucENhbGxiYWNrIiwicGFyZW50Q2h1bmtMb2FkaW5nRnVuY3Rpb24iLCJkYXRhIiwibW9yZU1vZHVsZXMiLCJzb21lIiwiaWQiLCJjaHVua0xvYWRpbmdHbG9iYWwiLCJiaW5kIiwicHVzaCIsIl9fd2VicGFja19leHBvcnRzX18iXSwic291cmNlUm9vdCI6IiJ9