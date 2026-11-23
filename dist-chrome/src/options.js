(()=>{"use strict";var e,t,r,o={932:(e,t,r)=>{var o=r(893),n=r(294),a=r(206);const i="notifyme";var s=r(150),c=r.n(s);new Set(["cycle","auth","feed","ratelimit","news","ui"]);new Set;const d={tokenFields:["jsc_token","token"],solutionRegex:'await\\(async e=>e\\+e\\)\\("([^"]*)"\\)'};const l={commentIdAttributes:["thingId","thing-id"],postIdAttributes:["id"],postBannerSlots:["post-removed-banner"],commentButtonSlots:["comment-share"],postButtonSlots:["action-row-whitespace"]};const u={paths:["/login","/account/login","/register","/account/register"],markers:[]};const h="news_cache",g=(...e)=>new Promise((t=>{try{chrome.storage.local.get(e,(e=>t(e||{})))}catch{t({})}})),m=async()=>(await g(h))[h]||null,b=async()=>(await m())?.feed?.options||{},p=(new Map,(e,t,r)=>["number","string"].includes(typeof e)&&Number(e)>=t&&Number(e)<=r),f=e=>p(e,10,100)&&Number.isInteger(Number(e)),v=e=>p(e,1,60),x=e=>({readsPerClick:f(e?.scan_reads_per_click)?Number(e.scan_reads_per_click):20,seconds:v(e?.scan_seconds_between_reads)?Number(e.scan_seconds_between_reads):3}),y=e=>c().storage.sync.get(["options"]).then((t=>e((t||{}).options))).catch((t=>(console.log(t),e({})))),k=(e,t)=>{const r=new Date(e),o=r.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});return r.toDateString()===new Date(t).toDateString()?o:`${r.toLocaleDateString([],{month:"short",day:"numeric"})}, ${o}`};var w=r(745),j=r(917);const _={sm:"4px",md:"6px",lg:"8px",pill:"999px"},$={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px"},C={body:'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},S=j.iv`
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
`,Z=j.iv`
    html,
    body {
        margin: 0;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family: ${C.body};
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
        margin: ${$.md} 0;
    }

    h1,
    h2,
    h3,
    h4 {
        color: var(--text-primary);
    }
    h1 {
        font-size: 22px;
        margin: 0 0 ${$.lg} 0;
    }
    h2 {
        font-size: 18px;
        margin: 0 0 ${$.md} 0;
    }
    h3 {
        font-size: 16px;
        margin: 0 0 ${$.sm} 0;
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
        border-radius: ${_.sm};
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
`,R=j.iv`
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
        border-radius: ${_.md};
    }
    .md-body code {
        background: var(--code-bg);
        border: 1px solid var(--code-border);
        border-radius: 3px;
        padding: 0 4px;
        font-family: ${C.mono};
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
`,M="ui_theme";function O(e){document.documentElement.setAttribute("data-theme",function(e){return"auto"===e?window.matchMedia?.("(prefers-color-scheme: light)").matches?"light":"dark":e}(e))}function z(){return(0,n.useEffect)((()=>{try{chrome.storage.local.get([M],(e=>{O(e?.[M]||"auto")}))}catch{O("auto")}const e=window.matchMedia?.("(prefers-color-scheme: light)"),t=()=>{try{chrome.storage.local.get([M],(e=>{"auto"===(e?.[M]||"auto")&&O("auto")}))}catch(e){}};e?.addEventListener?.("change",t);const r=(e,t)=>{"local"===t&&e[M]&&O(e[M].newValue||"auto")};return chrome.storage.onChanged.addListener(r),()=>{e?.removeEventListener?.("change",t),chrome.storage.onChanged.removeListener(r)}}),[]),(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(j.xB,{styles:S}),(0,o.jsx)(j.xB,{styles:Z}),(0,o.jsx)(j.xB,{styles:R})]})}const I=a.Z.a`
    color: var(--link);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,L=(a.Z.a`
    color: var(--text-secondary);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,a.Z.button`
    display: block;
    width: 100%;
    margin-top: 6px;
    padding: 8px 10px;
    background: var(--accent);
    color: var(--text-on-accent);
    border: 0;
    border-radius: ${_.md};
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
`),T=((0,a.Z)(L)`
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--border-light);
    &:hover {
        background: var(--bg-surface-hover);
    }
`,a.Z.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${_.md};
    font-size: 0.92em;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
    ${e=>{switch(e.variant){case"secondary":return j.iv`
                    background: var(--button-bg);
                    color: var(--button-text);
                    border-color: var(--border);
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;case"ghost":return j.iv`
                    background: transparent;
                    color: var(--link);
                    border-color: transparent;
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;default:return j.iv`
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
`),E={warning:["var(--locked-bg)","var(--locked-border)","var(--text-primary)"],success:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],info:["var(--bg-surface)","var(--border)","var(--text-secondary)"]},F=a.Z.div`
    padding: 10px 12px;
    margin: 6px 0;
    border-radius: ${_.md};
    font-size: 0.92em;
    ${e=>{const[t,r,o]=E[e.variant]??E.info;return j.iv`
            background: ${t};
            border: 1px solid ${r};
            color: ${o};
        `}}
`,N=(a.Z.div`
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: ${_.lg};
    padding: ${$.md} ${$.lg};
    margin-bottom: ${$.md};
    transition: border-color 0.15s ease;
    &:hover {
        border-color: var(--border-light);
    }
`,a.Z.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${$.sm};
    margin-bottom: ${$.xs};
`,a.Z.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${$.sm};
    color: var(--text-secondary);
    font-size: 0.85em;
    margin-bottom: ${$.sm};
    & > span + span::before {
        content: '·';
        margin-right: ${$.sm};
        color: var(--text-muted);
    }
`,a.Z.div`
    color: var(--text-primary);
    font-size: 0.95em;
`,a.Z.div`
    display: flex;
    gap: ${$.sm};
    margin-top: ${$.sm};
    padding-top: ${$.sm};
    border-top: 1px solid var(--border);
`,{removed:["var(--removed-bg)","var(--removed-border)","var(--removed-text)"],deleted:["var(--deleted-bg)","var(--deleted-border)","var(--deleted-text)"],approved:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],locked:["var(--locked-bg)","var(--locked-border)","var(--text-primary)"],unlocked:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],edited:["var(--bg-surface-hover)","var(--border)","var(--text-primary)"],default:["var(--bg-surface-hover)","var(--border)","var(--text-secondary)"]}),B=(a.Z.span`
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: ${_.pill};
    font-weight: 700;
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    border: 1px solid transparent;
    ${e=>{const[t,r,o]=N[e.variant??"default"]??N.default;return j.iv`
            background: ${t};
            border-color: ${r};
            color: ${o};
        `}}
`,a.Z.h2`
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin: ${$.lg} 0 ${$.sm} 0;
    padding-bottom: ${$.xs};
    border-bottom: 1px solid var(--border);
`),D=(a.Z.span`
    color: var(--author);
    font-weight: 600;
`,a.Z.span`
    color: var(--text-secondary);
`,a.Z.h3`
    margin: ${$.xs} 0 ${$.sm} 0;
    color: var(--text-primary);
`,a.Z.div`
    font-size: 0.95em;
`,a.Z.div`
    max-width: 820px;
    margin: 0 auto;
    padding: ${$.xl} ${$.lg};
`,a.Z.p`
  color: var(--text-secondary);
  font-size: 0.88em;
  margin: ${$.sm} 0;
`),A=a.Z.div`
  display: flex;
  gap: ${$.sm};
  margin-top: ${$.sm};
`,P=chrome.runtime.sendMessage,Y=chrome.runtime;new Set([429]);const H="viewer_account",U="viewer_connect",W="viewer_connect_result",V=(e,t)=>!!e&&!!t&&e.toLowerCase()===t.toLowerCase(),q=()=>{try{return!!globalThis.chrome?.extension?.inIncognitoContext}catch{return!1}};Promise.resolve();const G="viewer_identity",J="https://www.reveddit.com/about/reddit-login/",K={same_account:"That's your main account. Connect a different one.",not_signed_in:"The sign-in ended before an account signed in. Your own login is back.",unconfirmed:"Reddit didn't say which account signed in, so the sign-in was undone. Your own login is back. Try again in a few minutes.",cancelled:"Sign-in cancelled. Your own login is back.",timed_out:"The sign-in took too long, so it ended. Your own login is back.",no_tab:"Couldn't open Reddit's login page."},Q=6e5,X=a.Z.dialog`
  max-width: 400px;
  padding: ${$.lg};
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: ${_.lg};
  &::backdrop {
    background: rgba(0, 0, 0, 0.45);
  }
  h3 {
    margin: 0 0 ${$.sm};
    font-size: 1em;
  }
  p {
    margin: 0 0 ${$.md};
    color: var(--text-secondary);
    font-size: 0.92em;
  }
`,ee=a.Z.div`
  display: flex;
  justify-content: flex-end;
  gap: ${$.sm};
`,te=8;function re({anchor:e,title:t,text:r,confirmLabel:a,onConfirm:i,onCancel:s}){const c=(0,n.useRef)(null);return(0,n.useEffect)((()=>{const t=c.current;if(e&&t&&!t.open){t.showModal();const r=e.getBoundingClientRect(),o=t.offsetHeight,n=Math.max(te,Math.min(r.top+r.height/2-o/2,window.innerHeight-o-te));t.style.margin=`${n}px auto auto`}!e&&t?.open&&t.close()}),[e]),(0,o.jsxs)(X,{ref:c,"aria-label":t,onCancel:e=>{e.preventDefault(),s()},children:[(0,o.jsx)("h3",{children:t}),(0,o.jsx)("p",{children:r}),(0,o.jsxs)(ee,{children:[(0,o.jsx)(T,{variant:"secondary",onClick:s,children:"cancel"}),(0,o.jsx)(T,{variant:"primary",onClick:i,autoFocus:!0,children:a})]})]})}function oe(){const[e,t]=(0,n.useState)(null),[r,a]=(0,n.useState)(!1),[i,s]=(0,n.useState)(""),[c,d]=(0,n.useState)(!1),[l,u]=(0,n.useState)(null),[h,g]=(0,n.useState)(!1),[m,b]=(0,n.useState)(null);(0,n.useEffect)((()=>{const e=[H,U,W,G,"last_logged_in_user"],r=()=>{chrome.storage.local.get(e,(e=>{const r=e?.[H];t(r&&"string"==typeof r.name?{name:r.name,connectedAt:Number(r.connectedAt)||0}:null);const o=e?.[G];a(!!r&&o?.token===r.token&&"signed_out"===o?.result),s(String(e?.last_logged_in_user||"")),d(!!e?.[U]);const n=e?.[W];u(n&&Date.now()-Number(n.t)<Q?n:null)}))},o=(t,o)=>{"local"===o&&e.some((e=>e in t))&&r()};return r(),chrome.storage.onChanged.addListener(o),"#second-account"===window.location.hash&&setTimeout((()=>document.getElementById("second-account")?.scrollIntoView()),0),()=>chrome.storage.onChanged.removeListener(o)}),[]);const p=e=>{g(!0),P({action:e},(()=>{Y.lastError,g(!1)}))};return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(B,{id:"second-account",children:"Second account"}),(0,o.jsx)(D,{children:"When Reddit asks for a login before it shows profiles, the extension checks your posts and comments through a second Reddit account, the way other people see them. It only reads: it never posts, votes or joins anything."}),q()?(0,o.jsxs)(D,{children:[e?`Connected: u/${e.name}. `:"","To connect or change the second account, open these options in a normal window, not a private or incognito one."]}):c?(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(D,{children:"Waiting for you to sign in on Reddit's page. Your other Reddit tabs are signed out until then."}),(0,o.jsx)(A,{children:(0,o.jsx)(T,{variant:"secondary",onClick:()=>p("viewer-connect-cancel"),disabled:h,children:"cancel"})})]}):!e||V(e.name,i)||r?(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(D,{children:e&&V(e.name,i)?(0,o.jsxs)(o.Fragment,{children:["u/",e.name," is connected, but it's also the account you're signed in to Reddit with, so it can't check its own posts and comments. Connect a different account to check them."]}):e?(0,o.jsxs)(o.Fragment,{children:["u/",e.name," was signed out of Reddit, so your posts and comments aren't being checked. Connect it again to pick up where it left off."]}):(0,o.jsx)(o.Fragment,{children:"Use an account that isn't your main one, isn't a moderator where you post, and that you haven't blocked. You'll sign in on Reddit's own page."})}),(0,o.jsxs)(A,{style:{alignItems:"center"},children:[(0,o.jsx)(T,{variant:"primary",onClick:e=>b(e.currentTarget),disabled:h,children:e?V(e.name,i)?"connect a different account":"connect it again":"connect a second account"}),e&&(0,o.jsx)(T,{variant:"secondary",onClick:()=>p("viewer-disconnect"),disabled:h,children:"disconnect"}),(0,o.jsx)(I,{target:"_blank",href:J,children:"Why?"})]})]}):(0,o.jsxs)(o.Fragment,{children:[(0,o.jsxs)(D,{children:["Connected: u/",e.name,e.connectedAt?`, since ${new Date(e.connectedAt).toLocaleDateString()}`:"",". Your posts and comments are checked through it."]}),(0,o.jsx)(A,{children:(0,o.jsx)(T,{variant:"secondary",onClick:()=>p("viewer-disconnect"),disabled:h,children:"disconnect"})})]}),(0,o.jsx)(re,{anchor:m,title:"Connect a second account",text:"You'll be briefly signed out of Reddit while you sign in to the second account. But you'll be signed back in automatically when you finish.",confirmLabel:"continue",onConfirm:()=>{b(null),p("viewer-connect-start")},onCancel:()=>b(null)}),l?.ok&&e&&(0,o.jsx)(F,{variant:"success",children:"✓ Connected, and your own login is back."}),l&&!l.ok&&l.error&&K[l.error]&&(0,o.jsx)(F,{variant:"warning",children:K[l.error]})]})}const ne=a.Z.div`
  width: 380px;
  min-height: 300px;
  padding: ${$.lg};
`,ae=a.Z.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${$.md};
  margin-bottom: ${$.md};
`,ie=a.Z.h1`
  margin: 0;
  font-size: 18px;
`,se=a.Z.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${$.md};
  padding: ${$.sm} 0;
  border-bottom: 1px solid var(--border);
  &:last-child {
    border-bottom: 0;
  }
  & > label {
    color: var(--text-primary);
    flex: 1;
  }
  & > input[type='text'],
  & > input[type='number'],
  & > select {
    width: 90px;
    text-align: right;
  }
`,ce=a.Z.div``,de=({label:e,checked:t,onChange:r})=>(0,o.jsxs)(se,{children:[(0,o.jsx)("label",{children:e}),(0,o.jsx)("input",{type:"checkbox",checked:t,onChange:e=>r(e.target.checked)})]}),le=a.Z.div`
  font-size: 0.8em;
  font-weight: normal;
  color: var(--text-secondary);
  margin-top: 3px;
  max-width: 28em;
`,ue=a.Z.select`
  && {
    width: auto;
    min-width: 175px;
    text-align: left;
  }
`,he=a.Z.div`
  font-size: 0.9em;
  margin-top: ${$.xs};
`,ge=a.Z.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${$.lg};
  padding-top: ${$.md};
  border-top: 1px solid var(--border);
  gap: ${$.md};
`,me=e=>e.track?e.notify?"notify":"badge":"off",be=[{value:"notify",label:"badge + notifications"},{value:"badge",label:"badge only"},{value:"off",label:"off"}];!function(e){(0,w.createRoot)(document.getElementById("root")).render((0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(z,{}),(0,o.jsx)(e,{})]}))}((function(){const[e,t]=(0,n.useState)(""),[r,a]=(0,n.useState)(""),[s,c]=(0,n.useState)(""),[d,l]=(0,n.useState)(""),[u,h]=(0,n.useState)({}),[g,m]=(0,n.useState)("off"),[p,w]=(0,n.useState)("off"),[j,_]=(0,n.useState)(!1),[$,C]=(0,n.useState)(!1),[S,Z]=(0,n.useState)(!0),[R,z]=(0,n.useState)(!0),[L,E]=(0,n.useState)(!0),[N,H]=(0,n.useState)(!0),[U,W]=(0,n.useState)("auto"),[V,q]=(0,n.useState)(""),[G,J]=(0,n.useState)(!1),[K,Q]=(0,n.useState)(!1),[X,ee]=(0,n.useState)(!1),[te,re]=(0,n.useState)(""),[pe,fe]=(0,n.useState)(!1);(0,n.useEffect)((()=>{let e=!1;const r=(e,t)=>{"sync"===t&&e.options&&o()},o=()=>{y((o=>{if(e||!o||!Object.keys(o).length)return;e=!0,chrome.storage.onChanged.removeListener(r);const n=o,i=n.removal_status||{},s=n.lock_status||{};t(String(n.interval??1)),a(String(n.seen_count||2));const d=x(n);c(String(d.readsPerClick)),l(String(d.seconds)),m(me(i)),w(me(s)),_(!!n.hide_subscribe),C(!!n.show_scan_on_own_profile),Z(!1!==n.show_scan_on_other_profiles),z(!1!==n.show_thread_scan_buttons),E(!1!==n.highlight_own_profile_status),H(!1!==n.auto_filter_removed_threads),J(!0)}))};return chrome.storage.onChanged.addListener(r),o(),(async()=>(await b()).scan_limits??{})().then(h),chrome.storage.local.get([M],(e=>{W(e?.[M]||"auto")})),P({action:"get-diag-status"},(e=>{if(Y.lastError||!e||e.error)return;const t=((e,t=Date.now())=>{const r=[];return e.itemsFailingSince?r.push(e.itemsCheckedAt?`last good check ${k(e.itemsCheckedAt,t)}`:`checks failing since ${k(e.itemsFailingSince,t)}`):e.lastCheck&&r.push(`last check ${k(1e3*e.lastCheck,t)}`),e.backoffRemainingMs&&e.backoffRemainingMs>0?r.push(`paused ~${Math.max(1,Math.ceil(e.backoffRemainingMs/6e4))} min (Reddit rate limit)`):e.nextCheck&&e.nextCheck>t&&r.push(`next ~${k(e.nextCheck,t)}`),r.join(" · ")})(e);t&&re(t)})),()=>chrome.storage.onChanged.removeListener(r)}),[]);const ve=e=>{W(e),function(e){chrome.storage.local.set({[M]:e}),O(e)}(e)},xe=()=>{const t=Number(e),o=Number(r),n=e=>{q(e),setTimeout((()=>q("")),2800)};return Number.isInteger(t)&&t>0?Number.isInteger(o)&&o>0?f(s)?v(d)?(q(""),void((e,t)=>{const{scan_reads_per_click:r,scan_seconds_between_reads:o,...n}=e;chrome.storage.sync.set({options:{...n,...20!==r&&{scan_reads_per_click:r},...3!==o&&{scan_seconds_between_reads:o}}},t)})({seen_count:o,interval:t,removal_status:{track:"off"!==g,notify:"notify"===g},lock_status:{track:"off"!==p,notify:"notify"===p},hide_subscribe:j,show_scan_on_own_profile:$,show_scan_on_other_profiles:S,show_thread_scan_buttons:R,highlight_own_profile_status:L,auto_filter_removed_threads:N,scan_reads_per_click:Number(s),scan_seconds_between_reads:Number(d)},(()=>{var e;e=t,chrome.alarms.clear(i),chrome.alarms.create(i,{delayInMinutes:1,periodInMinutes:e}),chrome.runtime.sendMessage({action:"update-badge"}),window.close()}))):n('"seconds between scan reads" must be from 1 to 60'):n('"most Reddit reads per scan click" must be a whole number from 10 to 100'):n('"same-status count before alert" must be a positive integer'):n('"minutes between Reddit checks" must be a positive integer')},ye=[u.reads_per_click&&`at most ${u.reads_per_click} reads a click`,u.seconds_between_reads&&`at least ${Math.min(u.seconds_between_reads,60)} seconds between reads`].filter(Boolean).join(" and ");return G?(0,o.jsxs)(ne,{children:[(0,o.jsxs)(ae,{children:[(0,o.jsx)(ie,{children:"Options"}),(0,o.jsx)(T,{variant:"primary",onClick:xe,children:"save"})]}),(0,o.jsx)(B,{children:"Subscriptions"}),(0,o.jsx)(ce,{children:(0,o.jsxs)(se,{children:[(0,o.jsx)("label",{children:"other subscriptions"}),(0,o.jsx)(I,{target:"_blank",href:"/src/other.html",children:"manage ↗"})]})}),(0,o.jsx)(oe,{}),(0,o.jsx)(B,{children:"Tracking & notification"}),(0,o.jsxs)(ce,{children:[(0,o.jsxs)(se,{children:[(0,o.jsx)("label",{children:"removed content"}),(0,o.jsx)(ue,{value:g,onChange:e=>m(e.target.value),children:be.map((e=>(0,o.jsx)("option",{value:e.value,children:e.label},e.value)))})]}),(0,o.jsxs)(se,{children:[(0,o.jsx)("label",{children:"locked content"}),(0,o.jsx)(ue,{value:p,onChange:e=>w(e.target.value),children:be.map((e=>(0,o.jsx)("option",{value:e.value,children:e.label},e.value)))})]})]}),("notify"===g||"notify"===p)&&(0,o.jsx)(he,{children:(0,o.jsx)(I,{href:"#",onClick:e=>{e.preventDefault(),"notify"===g&&m("badge"),"notify"===p&&w("badge")},children:"turn off all notifications"})}),(0,o.jsx)(D,{children:'"badge only" counts changes on the toolbar icon and in history, without showing system notifications.'}),(0,o.jsx)(B,{children:"Polling"}),(0,o.jsxs)(ce,{children:[(0,o.jsxs)(se,{children:[(0,o.jsxs)("label",{children:["minutes between Reddit checks",(0,o.jsx)(le,{children:"How often the extension checks Reddit for removed content. Increase this if Reddit rate-limits you (429 errors)."})]}),(0,o.jsx)("input",{type:"text",value:e,onChange:e=>t(e.target.value)})]}),(0,o.jsxs)(se,{children:[(0,o.jsx)("label",{children:"same-status count before alert"}),(0,o.jsx)("input",{type:"text",value:r,onChange:e=>a(e.target.value)})]}),(0,o.jsx)(de,{label:"hide subscribe button",checked:j,onChange:_}),(0,o.jsx)(de,{label:"show removed-content scan on other profiles",checked:S,onChange:Z}),(0,o.jsx)(de,{label:"show removed-content scan on your own profile",checked:$,onChange:C}),(0,o.jsx)(de,{label:'show "scan for removed comments" buttons on threads',checked:R,onChange:z}),(0,o.jsx)(de,{label:"flag your removed/locked content on your own profile",checked:L,onChange:E}),(0,o.jsx)(de,{label:"auto-filter to show only removed comments after thread scan",checked:N,onChange:H})]}),(0,o.jsx)(B,{children:"Scans"}),(0,o.jsxs)(ce,{children:[(0,o.jsxs)(se,{children:[(0,o.jsx)("label",{children:"most Reddit reads per scan click"}),(0,o.jsx)("input",{type:"text",value:s,onChange:e=>c(e.target.value)})]}),(0,o.jsxs)(se,{children:[(0,o.jsx)("label",{children:"seconds between scan reads"}),(0,o.jsx)("input",{type:"text",value:d,onChange:e=>l(e.target.value)})]})]}),(0,o.jsxs)(D,{children:["Scans read Reddit with your login. More reads or a shorter wait get through big threads sooner, but Reddit may ask you to verify you're human if it sees what looks like automated activity.",ye&&` For now, Reveddit holds every scan to ${ye}, whatever these say.`]}),(0,o.jsx)(B,{children:"Appearance"}),(0,o.jsx)(ce,{children:(0,o.jsxs)(se,{children:[(0,o.jsx)("label",{children:"theme"}),(0,o.jsxs)("select",{value:U,onChange:e=>ve(e.target.value),children:[(0,o.jsx)("option",{value:"auto",children:"auto"}),(0,o.jsx)("option",{value:"dark",children:"dark"}),(0,o.jsx)("option",{value:"light",children:"light"})]})]})}),(0,o.jsx)(B,{children:"Diagnostics"}),(0,o.jsx)(D,{children:"If removal detection seems broken, run a check, then copy the log and include it in a GitHub issue or email. The log stays on this device — nothing is sent automatically. Your username is left out unless you include it. The log lists the ids of your recent posts and comments, which let the developer check what happened to them, so leave them in if you can. Hidden, each becomes a stand-in that can't be traced back, as long as your username stays out too."}),(0,o.jsxs)(ce,{children:[(0,o.jsx)(de,{label:"include username in copied log",checked:K,onChange:Q}),(0,o.jsx)(de,{label:"hide post and comment ids",checked:X,onChange:ee})]}),(0,o.jsxs)(A,{children:[(0,o.jsx)(T,{onClick:()=>{P({action:"run-check-now"},(e=>{!Y.lastError&&e?re(e.throttled?"a manual check already ran in the last minute":"check started — wait about 30 seconds, then copy the log"):re("could not start a check — try reopening this page")}))},children:"check now"}),(0,o.jsx)(T,{onClick:()=>{fe(!0),P({action:"get-diag-log",includeUsername:K,hideIds:X},(e=>{if(fe(!1),Y.lastError||!e||e.error||"string"!=typeof e.text)return void re("could not read the log — try reopening this page");const t=e.text;navigator.clipboard.writeText(t).then((()=>re(`copied ${t.split("\n").length} lines to the clipboard`)),(()=>re("copy failed — clipboard unavailable")))}))},disabled:pe,children:"copy log"}),(0,o.jsx)(T,{onClick:()=>{P({action:"clear-diag-log"},(()=>{Y.lastError||re("log cleared")}))},children:"clear log"})]}),te&&(0,o.jsx)(D,{children:te}),V&&(0,o.jsx)(F,{variant:"warning",children:V}),(0,o.jsxs)(ge,{children:[(0,o.jsx)(I,{href:"#",onClick:e=>{e.preventDefault(),t(String(1)),a(String(2)),c(String(20)),l(String(3))},children:"reset to defaults"}),(0,o.jsx)(T,{variant:"primary",onClick:xe,children:"save"})]})]}):(0,o.jsx)(ne,{children:"Loading…"})}))}},n={};function a(e){var t=n[e];if(void 0!==t)return t.exports;var r=n[e]={exports:{}};return o[e].call(r.exports,r,r.exports,a),r.exports}a.m=o,e=[],a.O=(t,r,o,n)=>{if(!r){var i=1/0;for(l=0;l<e.length;l++){for(var[r,o,n]=e[l],s=!0,c=0;c<r.length;c++)(!1&n||i>=n)&&Object.keys(a.O).every((e=>a.O[e](r[c])))?r.splice(c--,1):(s=!1,n<i&&(i=n));if(s){e.splice(l--,1);var d=o();void 0!==d&&(t=d)}}return t}n=n||0;for(var l=e.length;l>0&&e[l-1][2]>n;l--)e[l]=e[l-1];e[l]=[r,o,n]},a.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return a.d(t,{a:t}),t},r=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,a.t=function(e,o){if(1&o&&(e=this(e)),8&o)return e;if("object"==typeof e&&e){if(4&o&&e.__esModule)return e;if(16&o&&"function"==typeof e.then)return e}var n=Object.create(null);a.r(n);var i={};t=t||[null,r({}),r([]),r(r)];for(var s=2&o&&e;"object"==typeof s&&!~t.indexOf(s);s=r(s))Object.getOwnPropertyNames(s).forEach((t=>i[t]=()=>e[t]));return i.default=()=>e,a.d(n,i),n},a.d=(e,t)=>{for(var r in t)a.o(t,r)&&!a.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},a.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),a.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},(()=>{var e={798:0};a.O.j=t=>0===e[t];var t=(t,r)=>{var o,n,[i,s,c]=r,d=0;if(i.some((t=>0!==e[t]))){for(o in s)a.o(s,o)&&(a.m[o]=s[o]);if(c)var l=c(a)}for(t&&t(r);d<i.length;d++)n=i[d],a.o(e,n)&&e[n]&&e[n][0](),e[n]=0;return a.O(l)},r=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})();var i=a.O(void 0,[736],(()=>a(932)));i=a.O(i)})();