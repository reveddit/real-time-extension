(()=>{"use strict";var e,t,r,o={9947:(e,t,r)=>{r.d(t,{yK:()=>n});r(7785);const o="notifyme";function n(e){chrome.alarms.clear(o),chrome.alarms.create(o,{delayInMinutes:1,periodInMinutes:e})}},1748:(e,t,r)=>{var o=r(5893),n=r(7294),a=r(745),i=r(3867),c=r(7785);const s=e=>new Date(e).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});var d=r(9947),l=r(917);const u={sm:"4px",md:"6px",lg:"8px",pill:"999px"},h={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px"},g={body:'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},m=l.iv`
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
`,b=l.iv`
    html,
    body {
        margin: 0;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family: ${g.body};
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
        margin: ${h.md} 0;
    }

    h1,
    h2,
    h3,
    h4 {
        color: var(--text-primary);
    }
    h1 {
        font-size: 22px;
        margin: 0 0 ${h.lg} 0;
    }
    h2 {
        font-size: 18px;
        margin: 0 0 ${h.md} 0;
    }
    h3 {
        font-size: 16px;
        margin: 0 0 ${h.sm} 0;
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
        border-radius: ${u.sm};
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
`,p=l.iv`
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
        border-radius: ${u.md};
    }
    .md-body code {
        background: var(--code-bg);
        border: 1px solid var(--code-border);
        border-radius: 3px;
        padding: 0 4px;
        font-family: ${g.mono};
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
`,f="ui_theme";function x(e){const t="auto"===e?window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark":e;document.documentElement.setAttribute("data-theme",t)}function v(){return(0,n.useEffect)((()=>{try{chrome.storage.local.get([f],(e=>{x(e?.[f]||"auto")}))}catch{x("auto")}const e=window.matchMedia?.("(prefers-color-scheme: light)"),t=()=>{try{chrome.storage.local.get([f],(e=>{"auto"===(e?.[f]||"auto")&&x("auto")}))}catch(e){}};e?.addEventListener?.("change",t);const r=(e,t)=>{"local"===t&&e[f]&&x(e[f].newValue||"auto")};return chrome.storage.onChanged.addListener(r),()=>{e?.removeEventListener?.("change",t),chrome.storage.onChanged.removeListener(r)}}),[]),(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(l.xB,{styles:m}),(0,o.jsx)(l.xB,{styles:b}),(0,o.jsx)(l.xB,{styles:p})]})}const y=i.Z.a`
    color: var(--link);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,k=(i.Z.a`
    color: var(--text-secondary);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,i.Z.button`
    display: block;
    width: 100%;
    margin-top: 6px;
    padding: 8px 10px;
    background: var(--accent);
    color: var(--text-on-accent);
    border: 0;
    border-radius: ${u.md};
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
`),j=((0,i.Z)(k)`
    background: var(--button-bg);
    color: var(--button-text);
    border: 1px solid var(--border);
    &:hover {
        background: var(--bg-surface-hover);
    }
`,i.Z.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${u.md};
    font-size: 0.92em;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
    ${e=>{switch(e.variant){case"secondary":return l.iv`
                    background: var(--button-bg);
                    color: var(--button-text);
                    border-color: var(--border);
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;case"ghost":return l.iv`
                    background: transparent;
                    color: var(--link);
                    border-color: transparent;
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;default:return l.iv`
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
`),w=i.Z.div`
    padding: 10px 12px;
    margin: 6px 0;
    border-radius: ${u.md};
    font-size: 0.92em;
    ${e=>{switch(e.variant){case"warning":return l.iv`
                    background: var(--locked-bg);
                    border: 1px solid var(--locked-border);
                    color: var(--text-primary);
                `;case"success":return l.iv`
                    background: var(--approved-bg);
                    border: 1px solid var(--approved-border);
                    color: var(--text-primary);
                `;case"news":return l.iv`
                    background: var(--note-bg);
                    border: 1px solid var(--border-light);
                    color: var(--text-primary);
                `;default:return l.iv`
                    background: var(--bg-surface);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                `}}}
`,_=(i.Z.span`
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
`,i.Z.div`
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: ${u.lg};
    padding: ${h.md} ${h.lg};
    margin-bottom: ${h.md};
    transition: border-color 0.15s ease;
    &:hover {
        border-color: var(--border-light);
    }
`,i.Z.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${h.sm};
    margin-bottom: ${h.xs};
`,i.Z.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${h.sm};
    color: var(--text-secondary);
    font-size: 0.85em;
    margin-bottom: ${h.sm};
    & > span + span::before {
        content: '·';
        margin-right: ${h.sm};
        color: var(--text-muted);
    }
`,i.Z.div`
    color: var(--text-primary);
    font-size: 0.95em;
`,i.Z.div`
    display: flex;
    gap: ${h.sm};
    margin-top: ${h.sm};
    padding-top: ${h.sm};
    border-top: 1px solid var(--border);
`,i.Z.span`
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: ${u.pill};
    font-weight: 700;
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    border: 1px solid transparent;
    ${e=>{switch(e.variant){case"removed":return l.iv`
                    background: var(--removed-bg);
                    border-color: var(--removed-border);
                    color: var(--removed-text);
                `;case"deleted":return l.iv`
                    background: var(--deleted-bg);
                    border-color: var(--deleted-border);
                    color: var(--deleted-text);
                `;case"approved":case"unlocked":return l.iv`
                    background: var(--approved-bg);
                    border-color: var(--approved-border);
                    color: var(--text-primary);
                `;case"locked":return l.iv`
                    background: var(--locked-bg);
                    border-color: var(--locked-border);
                    color: var(--text-primary);
                `;case"edited":return l.iv`
                    background: var(--bg-surface-hover);
                    border-color: var(--border);
                    color: var(--text-primary);
                `;default:return l.iv`
                    background: var(--bg-surface-hover);
                    border-color: var(--border);
                    color: var(--text-secondary);
                `}}}
`,i.Z.h2`
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin: ${h.lg} 0 ${h.sm} 0;
    padding-bottom: ${h.xs};
    border-bottom: 1px solid var(--border);
`);i.Z.label`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${h.md};
    padding: ${h.sm} 0;
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
`,i.Z.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
`,i.Z.input`
    width: 80px;
    text-align: right;
`,i.Z.input`
    width: 100%;
`,i.Z.span`
    color: var(--author);
    font-weight: 600;
`,i.Z.span`
    color: var(--text-secondary);
`,i.Z.h3`
    margin: ${h.xs} 0 ${h.sm} 0;
    color: var(--text-primary);
`,i.Z.div`
    font-size: 0.95em;
`;r(3150);new Set(["cycle","auth","feed","ratelimit","news","ui"]);new Set;const C={tokenFields:["jsc_token","token"],solutionRegex:'await\\(async e=>e\\+e\\)\\("([^"]*)"\\)'};const $={commentIdAttributes:["thingId","thing-id"],postIdAttributes:["id"],postBannerSlots:["post-removed-banner"]};const S={paths:["/login","/account/login","/register","/account/register"],markers:[]};const Z="viewer_account",z="viewer_connect",R="viewer_connect_result",O=(e,t)=>!!e&&!!t&&e.toLowerCase()===t.toLowerCase(),M=()=>{try{return!!globalThis.chrome?.extension?.inIncognitoContext}catch{return!1}};Promise.resolve();const I="viewer_identity",T="https://www.reveddit.com/about/reddit-login/",E=i.Z.div`
  width: 380px;
  min-height: 300px;
  padding: ${h.lg};
`,L=i.Z.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${h.md};
  margin-bottom: ${h.md};
`,F=i.Z.h1`
  margin: 0;
  font-size: 18px;
`,B=i.Z.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${h.md};
  padding: ${h.sm} 0;
  border-bottom: 1px solid var(--border);
  &:last-child { border-bottom: 0; }
  & > label {
    color: var(--text-primary);
    flex: 1;
  }
  & > input[type='text'], & > input[type='number'], & > select {
    width: 90px;
    text-align: right;
  }
`,A=i.Z.div``,U=i.Z.div`
  font-size: 0.8em;
  font-weight: normal;
  color: var(--text-secondary);
  margin-top: 3px;
  max-width: 28em;
`,D=i.Z.select`
  && {
    width: auto;
    min-width: 175px;
    text-align: left;
  }
`,P=i.Z.div`
  font-size: 0.9em;
  margin-top: ${h.xs};
`,Y=i.Z.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${h.lg};
  padding-top: ${h.md};
  border-top: 1px solid var(--border);
  gap: ${h.md};
`,N=i.Z.div`
  margin-top: ${h.md};
  font-size: 0.9em;
`,q=i.Z.div`
  display: ${e=>e.visible?"block":"none"};
  margin-top: ${h.sm};
`,H=i.Z.p`
  color: var(--text-secondary);
  font-size: 0.88em;
  margin: ${h.sm} 0;
`,W=i.Z.div`
  display: flex;
  gap: ${h.sm};
  margin-top: ${h.sm};
`,K=chrome.runtime.sendMessage,V=chrome.runtime,G={same_account:"That's your main account. Connect a different one.",not_signed_in:"The sign-in ended before an account signed in. Your own login is back.",unconfirmed:"Reddit didn't say which account signed in, so the sign-in was undone. Your own login is back. Try again in a few minutes.",cancelled:"Sign-in cancelled. Your own login is back.",timed_out:"The sign-in took too long, so it ended. Your own login is back.",no_tab:"Couldn't open Reddit's login page."},J=6e5,Q=i.Z.dialog`
  max-width: 400px;
  padding: ${h.lg};
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: ${u.lg};
  &::backdrop {
    background: rgba(0, 0, 0, 0.45);
  }
  h3 {
    margin: 0 0 ${h.sm};
    font-size: 1em;
  }
  p {
    margin: 0 0 ${h.md};
    color: var(--text-secondary);
    font-size: 0.92em;
  }
`,X=i.Z.div`
  display: flex;
  justify-content: flex-end;
  gap: ${h.sm};
`,ee=8;function te({anchor:e,title:t,text:r,confirmLabel:a,onConfirm:i,onCancel:c}){const s=(0,n.useRef)(null);return(0,n.useEffect)((()=>{const t=s.current;if(e&&t&&!t.open){t.showModal();const r=e.getBoundingClientRect(),o=t.offsetHeight,n=Math.max(ee,Math.min(r.top+r.height/2-o/2,window.innerHeight-o-ee));t.style.margin=`${n}px auto auto`}!e&&t?.open&&t.close()}),[e]),(0,o.jsxs)(Q,{ref:s,"aria-label":t,onCancel:e=>{e.preventDefault(),c()},children:[(0,o.jsx)("h3",{children:t}),(0,o.jsx)("p",{children:r}),(0,o.jsxs)(X,{children:[(0,o.jsx)(j,{variant:"secondary",onClick:c,children:"cancel"}),(0,o.jsx)(j,{variant:"primary",onClick:i,autoFocus:!0,children:a})]})]})}function re(){const[e,t]=(0,n.useState)(null),[r,a]=(0,n.useState)(!1),[i,c]=(0,n.useState)(""),[s,d]=(0,n.useState)(!1),[l,u]=(0,n.useState)(null),[h,g]=(0,n.useState)(!1),[m,b]=(0,n.useState)(null);(0,n.useEffect)((()=>{const e=[Z,z,R,I,"last_logged_in_user"],r=()=>{chrome.storage.local.get(e,(e=>{const r=e?.[Z];t(r&&"string"==typeof r.name?{name:r.name,connectedAt:Number(r.connectedAt)||0}:null);const o=e?.[I];a(!!r&&o?.token===r.token&&"signed_out"===o?.result),c(String(e?.last_logged_in_user||"")),d(!!e?.[z]);const n=e?.[R];u(n&&Date.now()-Number(n.t)<J?n:null)}))},o=(t,o)=>{"local"===o&&e.some((e=>e in t))&&r()};return r(),chrome.storage.onChanged.addListener(o),"#second-account"===window.location.hash&&setTimeout((()=>document.getElementById("second-account")?.scrollIntoView()),0),()=>chrome.storage.onChanged.removeListener(o)}),[]);const p=e=>{g(!0),K({action:e},(()=>{V.lastError,g(!1)}))};return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(_,{id:"second-account",children:"Second account"}),(0,o.jsx)(H,{children:"When Reddit asks for a login before it shows profiles, the extension checks your posts and comments through a second Reddit account, the way other people see them. It only reads: it never posts, votes or joins anything."}),M()?(0,o.jsxs)(H,{children:[e?`Connected: u/${e.name}. `:"","To connect or change the second account, open these options in a normal window, not a private or incognito one."]}):s?(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(H,{children:"Waiting for you to sign in on Reddit's page. Your other Reddit tabs are signed out until then."}),(0,o.jsx)(W,{children:(0,o.jsx)(j,{variant:"secondary",onClick:()=>p("viewer-connect-cancel"),disabled:h,children:"cancel"})})]}):!e||O(e.name,i)||r?(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(H,{children:e&&O(e.name,i)?(0,o.jsxs)(o.Fragment,{children:["u/",e.name," is connected, but it's also the account you're signed in to Reddit with, so it can't check its own posts and comments. Connect a different account to check them."]}):e?(0,o.jsxs)(o.Fragment,{children:["u/",e.name," was signed out of Reddit, so your posts and comments aren't being checked. Connect it again to pick up where it left off."]}):(0,o.jsx)(o.Fragment,{children:"Use an account that isn't your main one, isn't a moderator where you post, and that you haven't blocked. You'll sign in on Reddit's own page."})}),(0,o.jsxs)(W,{style:{alignItems:"center"},children:[(0,o.jsx)(j,{variant:"primary",onClick:e=>b(e.currentTarget),disabled:h,children:e?O(e.name,i)?"connect a different account":"connect it again":"connect a second account"}),e&&(0,o.jsx)(j,{variant:"secondary",onClick:()=>p("viewer-disconnect"),disabled:h,children:"disconnect"}),(0,o.jsx)(y,{target:"_blank",href:T,children:"Why?"})]})]}):(0,o.jsxs)(o.Fragment,{children:[(0,o.jsxs)(H,{children:["Connected: u/",e.name,e.connectedAt?`, since ${new Date(e.connectedAt).toLocaleDateString()}`:"",". Your posts and comments are checked through it."]}),(0,o.jsx)(W,{children:(0,o.jsx)(j,{variant:"secondary",onClick:()=>p("viewer-disconnect"),disabled:h,children:"disconnect"})})]}),(0,o.jsx)(te,{anchor:m,title:"Connect a second account",text:"You'll be briefly signed out of Reddit while you sign in to the second account. But you'll be signed back in automatically when you finish.",confirmLabel:"continue",onConfirm:()=>{b(null),p("viewer-connect-start")},onCancel:()=>b(null)}),l?.ok&&e&&(0,o.jsx)(w,{variant:"success",children:"✓ Connected, and your own login is back."}),l&&!l.ok&&l.error&&G[l.error]&&(0,o.jsx)(w,{variant:"warning",children:G[l.error]})]})}const oe=e=>e.track?e.notify?"notify":"badge":"off",ne=[{value:"notify",label:"badge + notifications"},{value:"badge",label:"badge only"},{value:"off",label:"off"}];(0,a.createRoot)(document.getElementById("root")).render((0,o.jsx)((function(){const[e,t]=(0,n.useState)(""),[r,a]=(0,n.useState)(""),[i,l]=(0,n.useState)(""),[u,h]=(0,n.useState)("off"),[g,m]=(0,n.useState)("off"),[b,p]=(0,n.useState)(!1),[k,C]=(0,n.useState)(!1),[$,S]=(0,n.useState)(!1),[Z,z]=(0,n.useState)(!0),[R,O]=(0,n.useState)(!0),[M,I]=(0,n.useState)(!0),[T,G]=(0,n.useState)(!0),[J,Q]=(0,n.useState)(!1),[X,ee]=(0,n.useState)(!1),[te,ae]=(0,n.useState)("auto"),[ie,ce]=(0,n.useState)(""),[se,de]=(0,n.useState)(!1),[le,ue]=(0,n.useState)(!1),[he,ge]=(0,n.useState)(!1),[me,be]=(0,n.useState)(""),[pe,fe]=(0,n.useState)(!1);(0,n.useEffect)((()=>{let e=!1;const r=(e,t)=>{"sync"===t&&e.options&&o()},o=()=>{(0,c.FW)(((o,n,i)=>{if(e||!i||!Object.keys(i).length)return;e=!0,chrome.storage.onChanged.removeListener(r);const s=i,d=s.removal_status||{},u=s.lock_status||{};t(String(s.interval??c.Bz)),a(String(s.seen_count||c.UU)),l(s.custom_clientid||""),h(oe(d)),m(oe(u)),p(!!s.hide_subscribe),C(!!s.monitor_quarantined),S(!!s.show_scan_on_own_profile),z(!1!==s.show_scan_on_other_profiles),O(!1!==s.show_thread_scan_buttons),I(!1!==s.highlight_own_profile_status),G(!1!==s.auto_filter_removed_threads),de(!0)}))};return chrome.storage.onChanged.addListener(r),o(),chrome.storage.local.get([f],(e=>{ae(e?.[f]||"auto")})),chrome.storage.local.get(["dev_simulate_endpoint_deprecation"],(e=>{ee(!!e?.dev_simulate_endpoint_deprecation)})),K({action:"get-diag-status"},(e=>{if(V.lastError||!e||e.error)return;const t=((e,t=Date.now())=>{const r=[];return e.lastCheck&&r.push(`last check ${s(1e3*e.lastCheck)}`),e.backoffRemainingMs&&e.backoffRemainingMs>0?r.push(`paused ~${Math.max(1,Math.ceil(e.backoffRemainingMs/6e4))} min (Reddit rate limit)`):e.nextCheck&&e.nextCheck>t&&r.push(`next ~${s(e.nextCheck)}`),r.join(" · ")})(e);t&&be(t)})),()=>chrome.storage.onChanged.removeListener(r)}),[]);const xe=e=>{ae(e),function(e){chrome.storage.local.set({[f]:e}),x(e)}(e)},ve=()=>{const t=Number(e),o=Number(r),n=(i||"").trim();return Number.isInteger(t)&&t>0?Number.isInteger(o)&&o>0?(ce(""),void(0,c.oe)(o,t,n,"off"!==u,"notify"===u,"off"!==g,"notify"===g,b,k,$,Z,R,M,T,(()=>{(0,d.yK)(t),chrome.runtime.sendMessage({action:"update-badge"}),window.close()}))):(ce('"same-status count before alert" must be a positive integer'),void setTimeout((()=>ce("")),2800)):(ce('"minutes between Reddit checks" must be a positive integer'),void setTimeout((()=>ce("")),2800))};return se?(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(v,{}),(0,o.jsxs)(E,{children:[(0,o.jsxs)(L,{children:[(0,o.jsx)(F,{children:"Options"}),(0,o.jsx)(j,{variant:"primary",onClick:ve,children:"save"})]}),(0,o.jsx)(_,{children:"Subscriptions"}),(0,o.jsx)(A,{children:(0,o.jsxs)(B,{children:[(0,o.jsx)("label",{children:"other subscriptions"}),(0,o.jsx)(y,{target:"_blank",href:"/src/other.html",children:"manage ↗"})]})}),(0,o.jsx)(re,{}),(0,o.jsx)(_,{children:"Tracking & notification"}),(0,o.jsxs)(A,{children:[(0,o.jsxs)(B,{children:[(0,o.jsx)("label",{children:"removed content"}),(0,o.jsx)(D,{value:u,onChange:e=>h(e.target.value),children:ne.map((e=>(0,o.jsx)("option",{value:e.value,children:e.label},e.value)))})]}),(0,o.jsxs)(B,{children:[(0,o.jsx)("label",{children:"locked content"}),(0,o.jsx)(D,{value:g,onChange:e=>m(e.target.value),children:ne.map((e=>(0,o.jsx)("option",{value:e.value,children:e.label},e.value)))})]})]}),("notify"===u||"notify"===g)&&(0,o.jsx)(P,{children:(0,o.jsx)(y,{href:"#",onClick:e=>{e.preventDefault(),"notify"===u&&h("badge"),"notify"===g&&m("badge")},children:"turn off all notifications"})}),(0,o.jsx)(H,{children:'"badge only" counts changes on the toolbar icon and in history, without showing system notifications.'}),(0,o.jsx)(_,{children:"Polling"}),(0,o.jsxs)(A,{children:[(0,o.jsxs)(B,{children:[(0,o.jsxs)("label",{children:["minutes between Reddit checks",(0,o.jsx)(U,{children:"How often the extension checks Reddit for removed content. Increase this if Reddit rate-limits you (429 errors)."})]}),(0,o.jsx)("input",{type:"text",value:e,onChange:e=>t(e.target.value)})]}),(0,o.jsxs)(B,{children:[(0,o.jsx)("label",{children:"same-status count before alert"}),(0,o.jsx)("input",{type:"text",value:r,onChange:e=>a(e.target.value)})]}),(0,o.jsxs)(B,{children:[(0,o.jsx)("label",{children:"monitor quarantined content"}),(0,o.jsx)("input",{type:"checkbox",checked:k,onChange:e=>C(e.target.checked)})]}),(0,o.jsxs)(B,{children:[(0,o.jsx)("label",{children:"hide subscribe button"}),(0,o.jsx)("input",{type:"checkbox",checked:b,onChange:e=>p(e.target.checked)})]}),(0,o.jsxs)(B,{children:[(0,o.jsx)("label",{children:"show removed-content scan on other profiles"}),(0,o.jsx)("input",{type:"checkbox",checked:Z,onChange:e=>z(e.target.checked)})]}),(0,o.jsxs)(B,{children:[(0,o.jsx)("label",{children:"show removed-content scan on your own profile"}),(0,o.jsx)("input",{type:"checkbox",checked:$,onChange:e=>S(e.target.checked)})]}),(0,o.jsxs)(B,{children:[(0,o.jsx)("label",{children:'show "scan for removed comments" buttons on threads'}),(0,o.jsx)("input",{type:"checkbox",checked:R,onChange:e=>O(e.target.checked)})]}),(0,o.jsxs)(B,{children:[(0,o.jsx)("label",{children:"flag your removed/locked content on your own profile"}),(0,o.jsx)("input",{type:"checkbox",checked:M,onChange:e=>I(e.target.checked)})]}),(0,o.jsxs)(B,{children:[(0,o.jsx)("label",{children:"auto-filter to show only removed comments after thread scan"}),(0,o.jsx)("input",{type:"checkbox",checked:T,onChange:e=>G(e.target.checked)})]})]}),k&&(0,o.jsx)(H,{children:'Enabling "monitor quarantined content" may appear to cause an occasional logout. Refreshing the page should show you are still logged in. Increase "minutes between Reddit checks" to 5 or more to reduce this occurrence.'}),(0,o.jsx)(_,{children:"Appearance"}),(0,o.jsx)(A,{children:(0,o.jsxs)(B,{children:[(0,o.jsx)("label",{children:"theme"}),(0,o.jsxs)("select",{value:te,onChange:e=>xe(e.target.value),children:[(0,o.jsx)("option",{value:"auto",children:"auto"}),(0,o.jsx)("option",{value:"dark",children:"dark"}),(0,o.jsx)("option",{value:"light",children:"light"})]})]})}),(0,o.jsx)(_,{children:"Diagnostics"}),(0,o.jsx)(H,{children:"If removal detection seems broken, run a check, then copy the log and include it in a GitHub issue or email. The log stays on this device — nothing is sent automatically. Your username is left out unless you include it. The log lists the ids of your recent posts and comments, which let the developer check what happened to them, so leave them in if you can. Hidden, each becomes a stand-in that can't be traced back, as long as your username stays out too."}),(0,o.jsxs)(A,{children:[(0,o.jsxs)(B,{children:[(0,o.jsx)("label",{children:"include username in copied log"}),(0,o.jsx)("input",{type:"checkbox",checked:le,onChange:e=>ue(e.target.checked)})]}),(0,o.jsxs)(B,{children:[(0,o.jsx)("label",{children:"hide post and comment ids"}),(0,o.jsx)("input",{type:"checkbox",checked:he,onChange:e=>ge(e.target.checked)})]})]}),(0,o.jsxs)(W,{children:[(0,o.jsx)(j,{onClick:()=>{K({action:"run-check-now"},(e=>{!V.lastError&&e?be(e.throttled?"a manual check already ran in the last minute":"check started — wait about 30 seconds, then copy the log"):be("could not start a check — try reopening this page")}))},children:"check now"}),(0,o.jsx)(j,{onClick:()=>{fe(!0),K({action:"get-diag-log",includeUsername:le,hideIds:he},(e=>{if(fe(!1),V.lastError||!e||e.error||"string"!=typeof e.text)return void be("could not read the log — try reopening this page");const t=e.text;navigator.clipboard.writeText(t).then((()=>be(`copied ${t.split("\n").length} lines to the clipboard`)),(()=>be("copy failed — clipboard unavailable")))}))},disabled:pe,children:"copy log"}),(0,o.jsx)(j,{onClick:()=>{K({action:"clear-diag-log"},(()=>{V.lastError||be("log cleared")}))},children:"clear log"})]}),me&&(0,o.jsx)(H,{children:me}),(0,o.jsx)(N,{children:!J&&(0,o.jsx)(y,{href:"#",onClick:e=>{e.preventDefault(),Q(!0)},children:"advanced"})}),(0,o.jsxs)(q,{visible:J,children:[(0,o.jsx)(_,{children:"Advanced"}),(0,o.jsx)(H,{children:'This option overrides the "installed app" client id from reddit > preferences > apps.'}),(0,o.jsxs)(A,{children:[(0,o.jsxs)(B,{children:[(0,o.jsx)("label",{children:"custom client id"}),(0,o.jsx)("input",{type:"text",value:i,onChange:e=>l(e.target.value),placeholder:"<default is blank>",autoComplete:"off",autoCorrect:"off",autoCapitalize:"off",spellCheck:!1})]}),!1]})]}),ie&&(0,o.jsx)(w,{variant:"warning",children:ie}),(0,o.jsxs)(Y,{children:[(0,o.jsx)(y,{href:"#",onClick:e=>{e.preventDefault(),t(String(c.Bz)),a(String(c.UU)),l("")},children:"reset to defaults"}),(0,o.jsx)(j,{variant:"primary",onClick:ve,children:"save"})]})]})]}):(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(v,{}),(0,o.jsx)(E,{children:"Loading…"})]})}),{}))},7785:(e,t,r)=>{r.d(t,{Bz:()=>a,FW:()=>c,UU:()=>i,oe:()=>s});r(9947);var o=r(3150),n=r.n(o);const a=1,i=2,c=e=>n().storage.sync.get(["user_subscriptions","other_subscriptions","options"]).then((t=>{const r=t||{},o=Object.keys(r.user_subscriptions||{}),n=Object.keys(r.other_subscriptions||{}),a=r.options;return e(o,n,a)})).catch((t=>(console.log(t),e([],[],{})))),s=(e,t,r,o,n,a,i,c,s,d,l,u,h,g,m)=>{chrome.storage.sync.set({options:{seen_count:e,interval:t,custom_clientid:r,removal_status:{track:o,notify:n},lock_status:{track:a,notify:i},hide_subscribe:c,monitor_quarantined:s,show_scan_on_own_profile:d,show_scan_on_other_profiles:l,show_thread_scan_buttons:u,highlight_own_profile_status:h,auto_filter_removed_threads:g}},m)};Promise.resolve()}},n={};function a(e){var t=n[e];if(void 0!==t)return t.exports;var r=n[e]={exports:{}};return o[e].call(r.exports,r,r.exports,a),r.exports}a.m=o,e=[],a.O=(t,r,o,n)=>{if(!r){var i=1/0;for(l=0;l<e.length;l++){for(var[r,o,n]=e[l],c=!0,s=0;s<r.length;s++)(!1&n||i>=n)&&Object.keys(a.O).every((e=>a.O[e](r[s])))?r.splice(s--,1):(c=!1,n<i&&(i=n));if(c){e.splice(l--,1);var d=o();void 0!==d&&(t=d)}}return t}n=n||0;for(var l=e.length;l>0&&e[l-1][2]>n;l--)e[l]=e[l-1];e[l]=[r,o,n]},a.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return a.d(t,{a:t}),t},r=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,a.t=function(e,o){if(1&o&&(e=this(e)),8&o)return e;if("object"==typeof e&&e){if(4&o&&e.__esModule)return e;if(16&o&&"function"==typeof e.then)return e}var n=Object.create(null);a.r(n);var i={};t=t||[null,r({}),r([]),r(r)];for(var c=2&o&&e;"object"==typeof c&&!~t.indexOf(c);c=r(c))Object.getOwnPropertyNames(c).forEach((t=>i[t]=()=>e[t]));return i.default=()=>e,a.d(n,i),n},a.d=(e,t)=>{for(var r in t)a.o(t,r)&&!a.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},a.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),a.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},a.j=798,a.p="",(()=>{a.b=document.baseURI||self.location.href;var e={798:0};a.O.j=t=>0===e[t];var t=(t,r)=>{var o,n,[i,c,s]=r,d=0;if(i.some((t=>0!==e[t]))){for(o in c)a.o(c,o)&&(a.m[o]=c[o]);if(s)var l=s(a)}for(t&&t(r);d<i.length;d++)n=i[d],a.o(e,n)&&e[n]&&e[n][0](),e[n]=0;return a.O(l)},r=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})();var i=a.O(void 0,[736],(()=>a(1748)));i=a.O(i)})();