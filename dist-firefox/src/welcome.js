(()=>{"use strict";var e,r,o,t={396:(e,r,o)=>{var t=o(893),a=o(294),n=o(206),d=o(150),i=o.n(d),c=o(745),s=o(917);const l={sm:"4px",md:"6px",lg:"8px",pill:"999px"},b={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px"},p={body:'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},m=s.iv`
    :root {
        /* Backgrounds */
        --bg-primary: #1a1b1e;
        --bg-surface: #25262b;
        --bg-surface-hover: #2c2d33;

        /* Text */
        --text-primary: #e0e0e0;
        --text-secondary: #909296;
        --text-muted: #606368;
        --text-on-accent: #ffffff;

        /* Accent / brand */
        --accent: #e03e3e;
        --accent-hover: #e85555;

        /* Links */
        --link: #74b3e0;
        --link-hover: #9ac8eb;

        /* Semantic */
        --author: #6a98af;

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

        color-scheme: dark;
    }

    :root[data-theme='light'] {
        --bg-primary: #ffffff;
        --bg-surface: #f1f3f5;
        --bg-surface-hover: #e9ecef;

        --text-primary: #1a1b1e;
        --text-secondary: #495057;
        --text-muted: #868e96;
        --text-on-accent: #ffffff;

        --accent: #c92a2a;
        --accent-hover: #e03131;

        --link: #1971c2;
        --link-hover: #1c7ed6;

        --author: #3a6f8a;

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

        color-scheme: light;
    }
`,g=s.iv`
    html,
    body {
        margin: 0;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family: ${p.body};
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
        margin: ${b.md} 0;
    }

    h1,
    h2,
    h3,
    h4 {
        color: var(--text-primary);
    }
    h1 {
        font-size: 22px;
        margin: 0 0 ${b.lg} 0;
    }
    h2 {
        font-size: 18px;
        margin: 0 0 ${b.md} 0;
    }
    h3 {
        font-size: 16px;
        margin: 0 0 ${b.sm} 0;
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
        border-radius: ${l.sm};
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
`,u=s.iv`
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
        border-radius: ${l.md};
    }
    .md-body code {
        background: var(--code-bg);
        border: 1px solid var(--code-border);
        border-radius: 3px;
        padding: 0 4px;
        font-family: ${p.mono};
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
`,v="ui_theme";function f(e){document.documentElement.setAttribute("data-theme",function(e){return"auto"===e?window.matchMedia?.("(prefers-color-scheme: light)").matches?"light":"dark":e}(e))}function h(){return(0,a.useEffect)((()=>{try{chrome.storage.local.get([v],(e=>{f(e?.[v]||"auto")}))}catch{f("auto")}const e=window.matchMedia?.("(prefers-color-scheme: light)"),r=()=>{try{chrome.storage.local.get([v],(e=>{"auto"===(e?.[v]||"auto")&&f("auto")}))}catch(e){}};e?.addEventListener?.("change",r);const o=(e,r)=>{"local"===r&&e[v]&&f(e[v].newValue||"auto")};return chrome.storage.onChanged.addListener(o),()=>{e?.removeEventListener?.("change",r),chrome.storage.onChanged.removeListener(o)}}),[]),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(s.xB,{styles:m}),(0,t.jsx)(s.xB,{styles:g}),(0,t.jsx)(s.xB,{styles:u})]})}const x=n.Z.a`
    color: var(--link);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,y=(n.Z.a`
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
    border-radius: ${l.md};
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
`),k=((0,n.Z)(y)`
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--border-light);
    &:hover {
        background: var(--bg-surface-hover);
    }
`,n.Z.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${l.md};
    font-size: 0.92em;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
    ${e=>{switch(e.variant){case"secondary":return s.iv`
                    background: var(--button-bg);
                    color: var(--button-text);
                    border-color: var(--border);
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;case"ghost":return s.iv`
                    background: transparent;
                    color: var(--link);
                    border-color: transparent;
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;default:return s.iv`
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
`),w={warning:["var(--locked-bg)","var(--locked-border)","var(--text-primary)"],success:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],info:["var(--bg-surface)","var(--border)","var(--text-secondary)"]},$=(n.Z.div`
    padding: 10px 12px;
    margin: 6px 0;
    border-radius: ${l.md};
    font-size: 0.92em;
    ${e=>{const[r,o,t]=w[e.variant]??w.info;return s.iv`
            background: ${r};
            border: 1px solid ${o};
            color: ${t};
        `}}
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
    border-radius: ${l.lg};
    padding: ${b.md} ${b.lg};
    margin-bottom: ${b.md};
    transition: border-color 0.15s ease;
    &:hover {
        border-color: var(--border-light);
    }
`),j=(n.Z.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${b.sm};
    margin-bottom: ${b.xs};
`,n.Z.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${b.sm};
    color: var(--text-secondary);
    font-size: 0.85em;
    margin-bottom: ${b.sm};
    & > span + span::before {
        content: '·';
        margin-right: ${b.sm};
        color: var(--text-muted);
    }
`,n.Z.div`
    color: var(--text-primary);
    font-size: 0.95em;
`,n.Z.div`
    display: flex;
    gap: ${b.sm};
    margin-top: ${b.sm};
    padding-top: ${b.sm};
    border-top: 1px solid var(--border);
`,{removed:["var(--removed-bg)","var(--removed-border)","var(--removed-text)"],deleted:["var(--deleted-bg)","var(--deleted-border)","var(--deleted-text)"],approved:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],locked:["var(--locked-bg)","var(--locked-border)","var(--text-primary)"],unlocked:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],edited:["var(--bg-surface-hover)","var(--border)","var(--text-primary)"],default:["var(--bg-surface-hover)","var(--border)","var(--text-secondary)"]}),Z=(n.Z.span`
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: ${l.pill};
    font-weight: 700;
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    border: 1px solid transparent;
    ${e=>{const[r,o,t]=j[e.variant??"default"]??j.default;return s.iv`
            background: ${r};
            border-color: ${o};
            color: ${t};
        `}}
`,n.Z.h2`
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin: ${b.lg} 0 ${b.sm} 0;
    padding-bottom: ${b.xs};
    border-bottom: 1px solid var(--border);
`,n.Z.span`
    color: var(--author);
    font-weight: 600;
`,n.Z.span`
    color: var(--text-secondary);
`,n.Z.h3`
    margin: ${b.xs} 0 ${b.sm} 0;
    color: var(--text-primary);
`,n.Z.div`
    font-size: 0.95em;
`,n.Z.div`
    max-width: 820px;
    margin: 0 auto;
    padding: ${b.xl} ${b.lg};
`,n.Z.div`
  max-width: 560px;
  margin: 0 auto;
  padding: ${b.xl} ${b.lg};
`),O=n.Z.div`
  text-align: center;
  margin-bottom: ${b.lg};
`,R=n.Z.img`
  width: 72px;
  height: 72px;
  margin-bottom: ${b.sm};
`,z=n.Z.h1`
  margin: 0 0 ${b.xs} 0;
  font-size: 1.8em;
`,_=n.Z.p`
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.5;
`,C=(0,n.Z)($)`
  text-align: center;
`,S=n.Z.div`
  font-size: 1.05em;
  color: ${e=>"success"===e.statusType?"var(--approved-border)":"error"===e.statusType?"var(--accent)":"var(--text-secondary)"};
`,M=(0,n.Z)($)`
  & h2 {
    font-size: 1.1em;
    margin: 0 0 ${b.sm} 0;
  }
  & ol {
    margin: 0;
    padding-left: 1.4em;
    line-height: 1.8;
    color: var(--text-primary);
  }
  & li { margin: ${b.xs} 0; }
`,E=n.Z.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${b.sm};
  margin: ${b.lg} 0;
`,T=n.Z.div`
  text-align: center;
  margin-top: ${b.lg};
  padding-top: ${b.md};
  border-top: 1px solid var(--border);
`;function I(e){null!==e.current&&(window.clearInterval(e.current),e.current=null)}!function(e){(0,c.createRoot)(document.getElementById("root")).render((0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(h,{}),(0,t.jsx)(e,{})]}))}((function(){const[e,r]=(0,a.useState)("Checking Reddit connection..."),[o,n]=(0,a.useState)("checking"),[d,c]=(0,a.useState)(!1),[s,l]=(0,a.useState)(!1),b=(0,a.useRef)(!1),p=(0,a.useRef)(0),m=(0,a.useRef)(null),g=(0,a.useCallback)(((e=!1)=>{b.current||s||(b.current=!0,p.current+=1,e&&(r("Checking Reddit connection..."),n("checking")),i().runtime.sendMessage({action:"try-reconnect",quiet:!0}).then((e=>{const o=e.user;b.current=!1,o?(l(!0),r(`Connected as ${o}! Redirecting...`),n("success"),c(!1),I(m),setTimeout((()=>{window.location.href=chrome.runtime.getURL("src/history.html?welcome=1")}),1e3)):(e.indeterminate?r(`Couldn't confirm your Reddit login right now${e.reason?` (${e.reason})`:""}. If you're already signed in, open www.reddit.com in a tab and try again. There's no need to sign in again.`):1===p.current?r("We couldn't detect your Reddit session yet. If you're already signed in, open a Reddit tab so the extension can read your session. Otherwise, sign in to Reddit below."):r("Waiting for Reddit session… (we'll detect it automatically)"),n("error"),c(!0))})).catch((e=>{b.current=!1,console.log("Error checking connection:",e),r("Waiting for Reddit session… (we'll detect it automatically)"),n("error"),c(!0)})))}),[s]);return(0,a.useEffect)((()=>{g();const e=Date.now();return m.current=window.setInterval((()=>{if(s)return void I(m);const r=Date.now()-e;5e3==(r<6e4?2e3:5e3)&&Math.floor(r/2e3)%2!=0||g()}),2e3),()=>{I(m)}}),[g,s]),(0,t.jsxs)(Z,{children:[(0,t.jsxs)(O,{children:[(0,t.jsx)(R,{src:"/icons/128.png",alt:"Reveddit"}),(0,t.jsx)(z,{children:"Welcome to reveddit real-time"}),(0,t.jsx)(_,{children:"This extension monitors your Reddit comments and posts in real time, notifying you when content is removed by moderators."})]}),(0,t.jsx)(C,{children:(0,t.jsx)(S,{statusType:o,children:e})}),d&&(0,t.jsxs)(M,{children:[(0,t.jsx)("h2",{children:"Getting started"}),(0,t.jsxs)("ol",{children:[(0,t.jsxs)("li",{children:["Open ",(0,t.jsx)(x,{href:"https://www.reddit.com",target:"_blank",rel:"noreferrer",children:"www.reddit.com"})," ","or ",(0,t.jsx)(x,{href:"https://old.reddit.com",target:"_blank",rel:"noreferrer",children:"old.reddit.com"})]}),(0,t.jsx)("li",{children:"Log in to your Reddit account"}),(0,t.jsx)("li",{children:"We'll detect you automatically — no click needed."})]})]}),!s&&(0,t.jsxs)(E,{children:[(0,t.jsx)(k,{variant:"primary",onClick:()=>{try{chrome.tabs.create({url:"https://www.reddit.com"})}catch(e){console.log("chrome.tabs.create failed, falling back to window.open:",e),window.open("https://www.reddit.com","_blank")}},children:"Open Reddit"}),(0,t.jsx)(k,{variant:"ghost",onClick:()=>g(!0),disabled:b.current,children:"Check connection now"})]}),(0,t.jsx)(T,{children:(0,t.jsx)(x,{href:"https://www.reveddit.com/about/faq/",target:"_blank",rel:"noreferrer",children:"Learn more about reveddit"})})]})}))}},a={};function n(e){var r=a[e];if(void 0!==r)return r.exports;var o=a[e]={exports:{}};return t[e].call(o.exports,o,o.exports,n),o.exports}n.m=t,e=[],n.O=(r,o,t,a)=>{if(!o){var d=1/0;for(l=0;l<e.length;l++){for(var[o,t,a]=e[l],i=!0,c=0;c<o.length;c++)(!1&a||d>=a)&&Object.keys(n.O).every((e=>n.O[e](o[c])))?o.splice(c--,1):(i=!1,a<d&&(d=a));if(i){e.splice(l--,1);var s=t();void 0!==s&&(r=s)}}return r}a=a||0;for(var l=e.length;l>0&&e[l-1][2]>a;l--)e[l]=e[l-1];e[l]=[o,t,a]},n.n=e=>{var r=e&&e.__esModule?()=>e.default:()=>e;return n.d(r,{a:r}),r},o=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,n.t=function(e,t){if(1&t&&(e=this(e)),8&t)return e;if("object"==typeof e&&e){if(4&t&&e.__esModule)return e;if(16&t&&"function"==typeof e.then)return e}var a=Object.create(null);n.r(a);var d={};r=r||[null,o({}),o([]),o(o)];for(var i=2&t&&e;"object"==typeof i&&!~r.indexOf(i);i=o(i))Object.getOwnPropertyNames(i).forEach((r=>d[r]=()=>e[r]));return d.default=()=>e,n.d(a,d),a},n.d=(e,r)=>{for(var o in r)n.o(r,o)&&!n.o(e,o)&&Object.defineProperty(e,o,{enumerable:!0,get:r[o]})},n.o=(e,r)=>Object.prototype.hasOwnProperty.call(e,r),n.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.j=773,n.p="",(()=>{n.b=document.baseURI||self.location.href;var e={773:0};n.O.j=r=>0===e[r];var r=(r,o)=>{var t,a,[d,i,c]=o,s=0;if(d.some((r=>0!==e[r]))){for(t in i)n.o(i,t)&&(n.m[t]=i[t]);if(c)var l=c(n)}for(r&&r(o);s<d.length;s++)a=d[s],n.o(e,a)&&e[a]&&e[a][0](),e[a]=0;return n.O(l)},o=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];o.forEach(r.bind(null,0)),o.push=r.bind(null,o.push.bind(o))})();var d=n.O(void 0,[736],(()=>n(396)));d=n.O(d)})();