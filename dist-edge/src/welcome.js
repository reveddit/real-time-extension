(()=>{"use strict";var e,t,r,o={770:(e,t,r)=>{var o=r(893),n=r(294),a=r(206);var i=r(150),s=r.n(i);const d=new Set(["cycle","auth","feed","ratelimit","news","ui"]),c="diag_log_v1",l="diag_summary_v2",u=36e5;let m=[],g=!1,p=[];const b=new Set;let h=!1,f=null;const v=e=>Math.floor(e/u),x=e=>`${l}_${v(e)}`,y=(e,t)=>Array.from({length:t-e+1},((t,r)=>`${l}_${e+r}`)),w=e=>{const t=v(e)-36+1;return y(t-24,t-1)},k=(e,t)=>{const r=(v(t)-36+1)*u;let o=e.filter((e=>e.t>=r));return o.length>12e3&&(o=o.slice(o.length-12e3)),o},$=e=>((e,t,r)=>{let o=e.length>t?e.slice(e.length-t):e;for(;o.length>1&&JSON.stringify(o).length>r;)o=o.slice(Math.max(1,Math.floor(o.length/10)));return o})(e,600,131072),_=()=>{h&&!f&&(f=setTimeout((()=>{f=null,(()=>{const e=Date.now(),t={};if(g&&(t[c]=m,g=!1),b.size){const e={};for(const t of p){const r=x(t.t);b.has(r)&&(e[r]=e[r]||[]).push(t)}for(const r of b)t[r]=e[r]||[];b.clear()}const r=[];Object.keys(t).length&&r.push(s().storage.local.set(t)),r.push(s().storage.local.remove(w(e))),Promise.all(r).then((()=>{})).catch((()=>{}))})()}),2e3))},j=(e,t,r,o)=>{void 0===o?console.log(r):console.log(r,o);const n={t:Date.now(),a:t,m:r};if(void 0!==o)try{const e="string"==typeof o?o:JSON.stringify(o);n.d=e.length>500?e.slice(0,500)+"…":e}catch{n.d=String(o)}"summary"===e?(p.push(n),p=k(p,n.t),b.add(x(n.t))):(m.push(n),m=$(m),g=!0),_()},O=(e,t,r)=>j(d.has(e)?"summary":"detail",e,t,r),S={tokenFields:["jsc_token","token"],solutionRegex:'await\\(async e=>e\\+e\\)\\("([^"]*)"\\)'};let Z={...S};const R={commentIdAttributes:["thingId","thing-id"],postIdAttributes:["id"],postBannerSlots:["post-removed-banner"],commentButtonSlots:["comment-share"],postButtonSlots:["action-row-whitespace"]};const z={paths:["/login","/account/login","/register","/account/register"],markers:[]};const I="news_cache",C=(...e)=>new Promise((t=>{try{chrome.storage.local.get(e,(e=>t(e||{})))}catch{t({})}})),M=async()=>(await C(I))[I]||null,D=async()=>(await M())?.feed?.options||{},A=/^[A-Za-z0-9_.-]{1,64}$/,E=e=>((e,t,r)=>Array.isArray(e)?[...new Set(e.filter((e=>"string"==typeof e&&t.test(e))))].slice(0,r):[])(e,A,4),P={changes:[],removed:{},approved:{},locked:{},unlocked:{}},T=(e,t,r)=>e+(r?"_u_":"_")+t,B=(e,t,r=!0)=>{Object.keys(P).forEach((o=>{e[T(o,t,r)]=P[o]}))},L=e=>{const t={};return B(t,e,!0),t};Promise.resolve();const N="rv_legacy=1",U=(new RegExp("[?&]"+N+"(&|$)"),"viewer_connect"),F=e=>({name:String(e.name),value:String(e.value),domain:String(e.domain),path:String(e.path||"/"),secure:!!e.secure,httpOnly:!!e.httpOnly,hostOnly:!!e.hostOnly,...e.sameSite&&{sameSite:String(e.sameSite)},...!e.session&&Number(e.expirationDate)>0&&{expirationDate:Number(e.expirationDate)},...e.storeId&&{storeId:String(e.storeId)}}),J=e=>`https://${e.domain.replace(/^\./,"")}${e.path||"/"}`,W=e=>({url:J(e),name:e.name,value:e.value,path:e.path,secure:e.secure,httpOnly:e.httpOnly,...!e.hostOnly&&{domain:e.domain},...e.sameSite&&"unspecified"!==e.sameSite&&{sameSite:e.sameSite},...e.expirationDate&&{expirationDate:e.expirationDate},...e.storeId&&{storeId:e.storeId}}),q=(e,t=Date.now()/1e3)=>!!e.expirationDate&&e.expirationDate<=t,H=async()=>{try{const e=(await s().storage.local.get({[U]:null}))[U];return e&&Number(e.started)>0&&Array.isArray(e.main)?e:null}catch{return null}},G=async()=>!!await H(),V=async()=>{try{for(const e of await(async()=>{const e=E((await D()).login_cookies);return e.length?e:["reddit_session"]})())if(await s().cookies.get({url:"https://www.reddit.com/",name:e}))return!0}catch{}return!1},K=async e=>{for(const t of e)await s().cookies.set(W(t)).catch((()=>null))};Promise.resolve();const Q=/js_challenge/,X=(e,t)=>{if(!Q.test(e))return null;const r=Z,o=(()=>{try{return e.match(new RegExp(r.solutionRegex))}catch{return null}})();if(!o||void 0===o[1])return null;const n=t=>{const r=e.match(new RegExp(`<input[^>]*\\bname="${t}"[^>]*\\bvalue="([^"]*)"`));return r?r[1]:null};let a=null,i=null;for(const e of r.tokenFields)if(i=n(e),null!==i){a=e;break}if(null===a||null===i)return null;const s=o[1]+o[1],d=t.includes("?")?"&":"?";let c=`${t}${d}solution=${encodeURIComponent(s)}&js_challenge=1&${a}=${encodeURIComponent(i)}`;const l=n("jsc_orig_r");return null!==l&&(c+=`&jsc_orig_r=${encodeURIComponent(l)}`),c};const Y=(e,t,r)=>s().storage.local.get({[e]:null}).then((async o=>{const n=o[e];return((e,t,r)=>null!==e?e:"off"===t||"on"!==t&&r)(null===n?null:!!n,await(async e=>{const t=(await D()).mechanisms?.[e];return"on"===t||"off"===t?t:"auto"})(t),r)})).catch((()=>r)),ee=(new Set([429]),"absent_verify_unavailable"),te="profile_pagination_unavailable",re="viewer_unavailable",oe=(new Map,new Set([re,ee,te]),e=>{const t=e.expirationDate?0:(e=>{const t="reddit_session"===e.name?String(e.value).split(".")[1]:"";if(!t)return 0;try{const e=t.replace(/-/g,"+").replace(/_/g,"/"),r=Number(JSON.parse(atob(e+"=".repeat((4-e.length%4)%4))).exp);return r<Date.now()/1e3+3456e4?r:0}catch{return 0}})(e);return t?{...e,expirationDate:t}:e}),ne=e=>/^\.[^.]+\.reddit\.com$/.test(e.domain),ae=(new Set,()=>G().then((e=>!e&&se()))),ie=e=>oe("boolean"==typeof e.hostOnly?e:{...F(e),hostOnly:!String(e.domain).startsWith(".")}),se=async()=>{const e=(await new Promise((e=>chrome.storage.local.get(["stored_reddit_cookie_objects"],e)))).stored_reddit_cookie_objects;return!(!Array.isArray(e)||!e.length)&&s().cookies.getAll({domain:"reddit.com"}).then((async t=>{const r=new Set(t.map((e=>`${e.domain}|${e.path}|${e.name}`))),o=e.filter((e=>e&&"string"==typeof e.name&&"string"==typeof e.domain)).map(ie).filter((e=>!ne(e)&&!q(e)&&!r.has(`${e.domain}|${e.path||"/"}|${e.name}`)));return!(!o.length||await G())&&(await K(o),!0)})).catch((()=>!1))},de=async e=>{let t,r;try{t=await fetch(e,{credentials:"include",cache:"reload"})}catch(e){return{state:"indeterminate",reason:`network error: ${String(e?.message||e)}`}}if(!t.ok)return{state:"indeterminate",reason:`status ${t.status}`};try{r=await t.text()}catch(e){return{state:"indeterminate",reason:`body read failed: ${String(e?.message||e)}`}}try{const e=JSON.parse(r),t=e?.data?.name;return t?{state:"user",user:String(t)}:{state:"loggedOut"}}catch{return{state:"indeterminate",reason:"non-JSON response (challenge or HTML page)",html:r}}},ce=async e=>{const t=`https://${e}/api/me.json`;let r=await de(t);if("indeterminate"===r.state&&r.html&&!await Y("dev_disable_me_challenge_solve","meJsonChallengeSolve",!1)){const o=X(r.html,t);o&&(O("auth",`[reveddit] me.json challenge detected on ${e} — retrying with solution`),r=await de(o))}return"indeterminate"===r.state&&O("auth",`getLoggedinUser direct fetch failed (${t}): ${r.reason}`),r},le=async()=>{if(("undefined"==typeof chrome||!chrome.tabs||"function"!=typeof chrome.tabs.query)&&"undefined"!=typeof window&&window.location&&window.location.hostname){const e=await de(`https://${window.location.hostname}/api/me.json`);return"user"===e.state?{user:e.user,indeterminate:!1}:{user:null,indeterminate:"indeterminate"===e.state,reason:"indeterminate"===e.state?e.reason:void 0}}if(!await V()&&(await ae(),!await V()))return{user:null,indeterminate:!1};const e=await new Promise((e=>{try{chrome.tabs.query({url:["*://old.reddit.com/*"]},(t=>{e(t&&t.length>0?"old.reddit.com":"www.reddit.com")}))}catch{e("www.reddit.com")}}));let t=await ce(e);if("user"===t.state)return{user:t.user,indeterminate:!1};let r="loggedOut"===t.state,o="indeterminate"===t.state?t.reason:void 0;if("indeterminate"===t.state){const n="www.reddit.com"===e?"old.reddit.com":"www.reddit.com";if(t=await ce(n),"user"===t.state)return{user:t.user,indeterminate:!1};r=r||"loggedOut"===t.state,o="indeterminate"===t.state?t.reason:o}if(!r){if(await ae()){if(t=await ce(e),"user"===t.state)return{user:t.user,indeterminate:!1};"indeterminate"===t.state&&(O("auth","Failed to authenticate with stored cookies"),o=t.reason),r=r||"loggedOut"===t.state}}return r?{user:null,indeterminate:!1}:{user:null,indeterminate:!0,reason:o||"unknown"}};var ue=r(745),me=r(917);const ge={sm:"4px",md:"6px",lg:"8px",pill:"999px"},pe={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px"},be={body:'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},he=me.iv`
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
`,fe=me.iv`
    html,
    body {
        margin: 0;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family: ${be.body};
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
        margin: ${pe.md} 0;
    }

    h1,
    h2,
    h3,
    h4 {
        color: var(--text-primary);
    }
    h1 {
        font-size: 22px;
        margin: 0 0 ${pe.lg} 0;
    }
    h2 {
        font-size: 18px;
        margin: 0 0 ${pe.md} 0;
    }
    h3 {
        font-size: 16px;
        margin: 0 0 ${pe.sm} 0;
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
        border-radius: ${ge.sm};
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
`,ve=me.iv`
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
        border-radius: ${ge.md};
    }
    .md-body code {
        background: var(--code-bg);
        border: 1px solid var(--code-border);
        border-radius: 3px;
        padding: 0 4px;
        font-family: ${be.mono};
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
`,xe="ui_theme";function ye(e){document.documentElement.setAttribute("data-theme",function(e){return"auto"===e?window.matchMedia?.("(prefers-color-scheme: light)").matches?"light":"dark":e}(e))}function we(){return(0,n.useEffect)((()=>{try{chrome.storage.local.get([xe],(e=>{ye(e?.[xe]||"auto")}))}catch{ye("auto")}const e=window.matchMedia?.("(prefers-color-scheme: light)"),t=()=>{try{chrome.storage.local.get([xe],(e=>{"auto"===(e?.[xe]||"auto")&&ye("auto")}))}catch(e){}};e?.addEventListener?.("change",t);const r=(e,t)=>{"local"===t&&e[xe]&&ye(e[xe].newValue||"auto")};return chrome.storage.onChanged.addListener(r),()=>{e?.removeEventListener?.("change",t),chrome.storage.onChanged.removeListener(r)}}),[]),(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(me.xB,{styles:he}),(0,o.jsx)(me.xB,{styles:fe}),(0,o.jsx)(me.xB,{styles:ve})]})}const ke=a.Z.a`
    color: var(--link);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,$e=(a.Z.a`
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
    border-radius: ${ge.md};
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
`),_e=((0,a.Z)($e)`
    background: var(--button-bg);
    color: var(--button-text);
    border: 1px solid var(--border);
    &:hover {
        background: var(--bg-surface-hover);
    }
`,a.Z.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${ge.md};
    font-size: 0.92em;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
    ${e=>{switch(e.variant){case"secondary":return me.iv`
                    background: var(--button-bg);
                    color: var(--button-text);
                    border-color: var(--border);
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;case"ghost":return me.iv`
                    background: transparent;
                    color: var(--link);
                    border-color: transparent;
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;default:return me.iv`
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
`),je={warning:["var(--locked-bg)","var(--locked-border)","var(--text-primary)"],success:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],info:["var(--bg-surface)","var(--border)","var(--text-secondary)"]},Oe=(a.Z.div`
    padding: 10px 12px;
    margin: 6px 0;
    border-radius: ${ge.md};
    font-size: 0.92em;
    ${e=>{const[t,r,o]=je[e.variant]??je.info;return me.iv`
            background: ${t};
            border: 1px solid ${r};
            color: ${o};
        `}}
`,a.Z.span`
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
`,a.Z.div`
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: ${ge.lg};
    padding: ${pe.md} ${pe.lg};
    margin-bottom: ${pe.md};
    transition: border-color 0.15s ease;
    &:hover {
        border-color: var(--border-light);
    }
`),Se=(a.Z.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${pe.sm};
    margin-bottom: ${pe.xs};
`,a.Z.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${pe.sm};
    color: var(--text-secondary);
    font-size: 0.85em;
    margin-bottom: ${pe.sm};
    & > span + span::before {
        content: '·';
        margin-right: ${pe.sm};
        color: var(--text-muted);
    }
`,a.Z.div`
    color: var(--text-primary);
    font-size: 0.95em;
`,a.Z.div`
    display: flex;
    gap: ${pe.sm};
    margin-top: ${pe.sm};
    padding-top: ${pe.sm};
    border-top: 1px solid var(--border);
`,{removed:["var(--removed-bg)","var(--removed-border)","var(--removed-text)"],deleted:["var(--deleted-bg)","var(--deleted-border)","var(--deleted-text)"],approved:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],locked:["var(--locked-bg)","var(--locked-border)","var(--text-primary)"],unlocked:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],edited:["var(--bg-surface-hover)","var(--border)","var(--text-primary)"],default:["var(--bg-surface-hover)","var(--border)","var(--text-secondary)"]}),Ze=(a.Z.span`
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: ${ge.pill};
    font-weight: 700;
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    border: 1px solid transparent;
    ${e=>{const[t,r,o]=Se[e.variant??"default"]??Se.default;return me.iv`
            background: ${t};
            border-color: ${r};
            color: ${o};
        `}}
`,a.Z.h2`
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin: ${pe.lg} 0 ${pe.sm} 0;
    padding-bottom: ${pe.xs};
    border-bottom: 1px solid var(--border);
`,a.Z.span`
    color: var(--author);
    font-weight: 600;
`,a.Z.span`
    color: var(--text-secondary);
`,a.Z.h3`
    margin: ${pe.xs} 0 ${pe.sm} 0;
    color: var(--text-primary);
`,a.Z.div`
    font-size: 0.95em;
`,a.Z.div`
    max-width: 820px;
    margin: 0 auto;
    padding: ${pe.xl} ${pe.lg};
`,a.Z.div`
  max-width: 560px;
  margin: 0 auto;
  padding: ${pe.xl} ${pe.lg};
`),Re=a.Z.div`
  text-align: center;
  margin-bottom: ${pe.lg};
`,ze=a.Z.img`
  width: 72px;
  height: 72px;
  margin-bottom: ${pe.sm};
`,Ie=a.Z.h1`
  margin: 0 0 ${pe.xs} 0;
  font-size: 1.8em;
`,Ce=a.Z.p`
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.5;
`,Me=(0,a.Z)(Oe)`
  text-align: center;
`,De=a.Z.div`
  font-size: 1.05em;
  color: ${e=>"success"===e.statusType?"var(--approved-border)":"error"===e.statusType?"var(--accent)":"var(--text-secondary)"};
`,Ae=(0,a.Z)(Oe)`
  & h2 {
    font-size: 1.1em;
    margin: 0 0 ${pe.sm} 0;
  }
  & ol {
    margin: 0;
    padding-left: 1.4em;
    line-height: 1.8;
    color: var(--text-primary);
  }
  & li { margin: ${pe.xs} 0; }
`,Ee=a.Z.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${pe.sm};
  margin: ${pe.lg} 0;
`,Pe=a.Z.div`
  text-align: center;
  margin-top: ${pe.lg};
  padding-top: ${pe.md};
  border-top: 1px solid var(--border);
`;function Te(e){null!==e.current&&(window.clearInterval(e.current),e.current=null)}!function(e){(0,ue.createRoot)(document.getElementById("root")).render((0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(we,{}),(0,o.jsx)(e,{})]}))}((function(){const[e,t]=(0,n.useState)("Checking Reddit connection..."),[r,a]=(0,n.useState)("checking"),[i,s]=(0,n.useState)(!1),[d,c]=(0,n.useState)(!1),l=(0,n.useRef)(!1),u=(0,n.useRef)(0),m=(0,n.useRef)(null),g=(0,n.useCallback)(((e=!1)=>{l.current||d||(l.current=!0,u.current+=1,e&&(t("Checking Reddit connection..."),a("checking")),le().then((e=>{const r=e.user;if(l.current=!1,r){c(!0),t(`Connected as ${r}! Redirecting...`),a("success"),s(!1),Te(m);const e=()=>{setTimeout((()=>{window.location.href=chrome.runtime.getURL("src/history.html?welcome=1")}),1e3)};((e,t=(()=>{}),r=(()=>{}))=>{const o=L(e);chrome.storage.sync.get(["user_subscriptions",...Object.keys(o)],(n=>{const a=n.user_subscriptions;if(e in a)r("already subscribed to this user");else if(Object.keys(a).length<5){a[e]=!0;const r=Object.fromEntries(Object.entries(o).filter((([e])=>!(e in n))));chrome.storage.sync.set({user_subscriptions:a,...r},t)}else r("maximum number of subscriptions reached")}))})(r,(()=>{try{chrome.runtime.sendMessage({action:"immediate-user-lookup",user:r})}catch(e){console.log("immediate-user-lookup send failed:",e)}e()}),e)}else e.indeterminate?t(`Couldn't confirm your Reddit login right now${e.reason?` (${e.reason})`:""}. If you're already signed in, open www.reddit.com in a tab and try again. There's no need to sign in again.`):1===u.current?t("We couldn't detect your Reddit session yet. If you're already signed in, open a Reddit tab so the extension can read your session. Otherwise, sign in to Reddit below."):t("Waiting for Reddit session… (we'll detect it automatically)"),a("error"),s(!0)})).catch((e=>{l.current=!1,console.log("Error checking connection:",e),t("Waiting for Reddit session… (we'll detect it automatically)"),a("error"),s(!0)})))}),[d]);return(0,n.useEffect)((()=>{g();const e=Date.now();return m.current=window.setInterval((()=>{if(d)return void Te(m);const t=Date.now()-e;5e3==(t<6e4?2e3:5e3)&&Math.floor(t/2e3)%2!=0||g()}),2e3),()=>{Te(m)}}),[g,d]),(0,o.jsxs)(Ze,{children:[(0,o.jsxs)(Re,{children:[(0,o.jsx)(ze,{src:"/icons/128.png",alt:"Reveddit"}),(0,o.jsx)(Ie,{children:"Welcome to reveddit real-time"}),(0,o.jsx)(Ce,{children:"This extension monitors your Reddit comments and posts in real time, notifying you when content is removed by moderators."})]}),(0,o.jsx)(Me,{children:(0,o.jsx)(De,{statusType:r,children:e})}),i&&(0,o.jsxs)(Ae,{children:[(0,o.jsx)("h2",{children:"Getting started"}),(0,o.jsxs)("ol",{children:[(0,o.jsxs)("li",{children:["Open ",(0,o.jsx)(ke,{href:"https://www.reddit.com",target:"_blank",rel:"noreferrer",children:"www.reddit.com"})," ","or ",(0,o.jsx)(ke,{href:"https://old.reddit.com",target:"_blank",rel:"noreferrer",children:"old.reddit.com"})]}),(0,o.jsx)("li",{children:"Log in to your Reddit account"}),(0,o.jsx)("li",{children:"We'll detect you automatically — no click needed."})]})]}),!d&&(0,o.jsxs)(Ee,{children:[(0,o.jsx)(_e,{variant:"primary",onClick:()=>{try{chrome.tabs.create({url:"https://www.reddit.com"})}catch(e){console.log("chrome.tabs.create failed, falling back to window.open:",e),window.open("https://www.reddit.com","_blank")}},children:"Open Reddit"}),(0,o.jsx)(_e,{variant:"ghost",onClick:()=>g(!0),disabled:l.current,children:"Check connection now"})]}),(0,o.jsx)(Pe,{children:(0,o.jsx)(ke,{href:"https://www.reveddit.com/about/faq/",target:"_blank",rel:"noreferrer",children:"Learn more about reveddit"})})]})}))}},n={};function a(e){var t=n[e];if(void 0!==t)return t.exports;var r=n[e]={exports:{}};return o[e].call(r.exports,r,r.exports,a),r.exports}a.m=o,e=[],a.O=(t,r,o,n)=>{if(!r){var i=1/0;for(l=0;l<e.length;l++){for(var[r,o,n]=e[l],s=!0,d=0;d<r.length;d++)(!1&n||i>=n)&&Object.keys(a.O).every((e=>a.O[e](r[d])))?r.splice(d--,1):(s=!1,n<i&&(i=n));if(s){e.splice(l--,1);var c=o();void 0!==c&&(t=c)}}return t}n=n||0;for(var l=e.length;l>0&&e[l-1][2]>n;l--)e[l]=e[l-1];e[l]=[r,o,n]},a.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return a.d(t,{a:t}),t},r=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,a.t=function(e,o){if(1&o&&(e=this(e)),8&o)return e;if("object"==typeof e&&e){if(4&o&&e.__esModule)return e;if(16&o&&"function"==typeof e.then)return e}var n=Object.create(null);a.r(n);var i={};t=t||[null,r({}),r([]),r(r)];for(var s=2&o&&e;"object"==typeof s&&!~t.indexOf(s);s=r(s))Object.getOwnPropertyNames(s).forEach((t=>i[t]=()=>e[t]));return i.default=()=>e,a.d(n,i),n},a.d=(e,t)=>{for(var r in t)a.o(t,r)&&!a.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},a.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),a.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},a.j=773,a.p="",(()=>{a.b=document.baseURI||self.location.href;var e={773:0};a.O.j=t=>0===e[t];var t=(t,r)=>{var o,n,[i,s,d]=r,c=0;if(i.some((t=>0!==e[t]))){for(o in s)a.o(s,o)&&(a.m[o]=s[o]);if(d)var l=d(a)}for(t&&t(r);c<i.length;c++)n=i[c],a.o(e,n)&&e[n]&&e[n][0](),e[n]=0;return a.O(l)},r=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})();var i=a.O(void 0,[736],(()=>a(770)));i=a.O(i)})();