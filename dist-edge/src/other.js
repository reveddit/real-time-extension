(()=>{"use strict";var e,t,r,n={435:(e,t,r)=>{var n=r(893),s=r(294),a=r(206);const l="action",o=e=>e.replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/[^\S\n]+/g," ").substr(0,1e4),i=e=>"t1"===e.substr(0,2),c=(e,t)=>Object.entries(e).sort(((e,r)=>r[1][t]-e[1][t]));class u{constructor({item:e=null,observed_utc:t=null,object:r=null}){if(r)this.t=r.t,this.o=r.o,this.c=r.c,this.n=r.n||0,this.r=r.r||0,void 0!==r.ln&&(this.ln=r.ln),void 0!==r.lr&&(this.lr=r.lr),void 0!==r.p&&(this.p=r.p),void 0!==r.b&&(this.b=r.b),void 0!==r.s&&(this.s=r.s);else{let r="";e&&i(e.name)?r=o(e.body||""):e&&(r=e.title||""),this.t=r,this.o=t,this.c=e?e.created_utc:0,this.n=0,this.r=0,e&&i(e.name)&&e.link_id&&(this.p=e.link_id),e&&!i(e.name)&&e.selftext&&(this.b=o(e.selftext)),e&&e.subreddit&&(this.s=e.subreddit)}}setText(e){this.t=o(e)}getText(){return this.t}getBody(){return this.b}getSubreddit(){return this.s}getObservedUTC(){return this.o}getCreatedUTC(){return this.c}getPostID(){return this.p}getCount(e){return this[e]||0}resetCount(e){this[e]=0}incrementCount(e){const t=this.getCount(e)+1;return this[e]=t,t}}const f=e=>(e=>{const t=[[60,"second","seconds"],[60,"minute","minutes"],[24,"hour","hours"],[7,"day","days"],[365/12/7,"week","weeks"],[12,"month","months"],[10,"year","years"],[10,"decade","decades"],[10,"century","centuries"],[10,"millenium","millenia"]];if(e<60)return e+" seconds";let r=e;for(let e=0;e<t.length;e++){let n=t[e][0],s=t[e][1],a=t[e][2];if(r<n){let n=r-Math.floor(r),l=Math.round(n*t[e-1][0]);if(t[e-1][0]===l&&(r+=1,l=0),(Math.floor(r)>1||0==Math.floor(r))&&(s=a),e>1&&l>0){let r=t[e-1][1];l>1&&(r=t[e-1][2]),s+=", "+String(l)+" "+r}return String(Math.floor(r))+" "+s}r/=n}})(Math.floor((new Date).getTime()/1e3)-e)+" ago";var d=r(150),h=r.n(d);new Set(["cycle","auth","feed","ratelimit","news","ui"]);new Set;const g={tokenFields:["jsc_token","token"],solutionRegex:'await\\(async e=>e\\+e\\)\\("([^"]*)"\\)'};const p={commentIdAttributes:["thingId","thing-id"],postIdAttributes:["id"],postBannerSlots:["post-removed-banner"],commentButtonSlots:["comment-share"],postButtonSlots:["action-row-whitespace"]};const b={paths:["/login","/account/login","/register","/account/register"],markers:[]};const m=new Map,v=(e,t,r)=>new Promise(((n,s)=>{const a=()=>{const e=Promise.resolve().then(t);let r;e.then(n,s);const a=new Promise((e=>r=setTimeout(e,1e4)));return Promise.race([e.then((()=>{}),(()=>{})),a]).finally((()=>clearTimeout(r)))},l=globalThis.navigator?.locks;if(l?.request)return void l.request(`reveddit:${e}`,{mode:r},a).catch(s);const o=m.get(e)??Promise.resolve();if("shared"===r)return void o.then(a);const i=o.then(a);m.set(e,i),i.then((()=>{m.get(e)===i&&m.delete(e)}))})),k={changes:[],removed:{},approved:{},locked:{},unlocked:{}},x=(e,t,r)=>e+(r?"_u_":"_")+t,w=(e,t=!0)=>{const r={};return Object.keys(k).forEach((n=>{r[n]=x(n,e,t)})),r},_=(e,t)=>{const r=w(e,t);return delete r.changes,r},y=e=>[...Object.keys(e).map((e=>({thing:e,isUser:!0}))),{thing:"other",isUser:!1}],S=e=>new Promise((t=>chrome.storage.sync.get(e,t))),C=()=>/^http/.test(location.protocol),T=(e,...t)=>h().runtime.sendMessage({action:"page-write",write:e,args:t}).then((e=>e?.ok?e.answer:Promise.reject(new Error(e?.error||"no answer")))),L="reveddit:followed",O=(e,t)=>t?e:L,E=(e,t)=>`lists:${O(e,t)}`,j=e=>{return t=E("other",!1),v(t,(async()=>{const t="other_subscriptions",r=_("other",!1),n=await S(Object.values(r).concat(t));delete n[t][e],Object.values(r).forEach((t=>{e in n[t]&&delete n[t][e]})),await h().storage.sync.set(n).then($,(()=>{}))}),"exclusive");var t},A=(e,t,r)=>M(e,t,r).unseen,M=(e,t,r)=>{const n=r.options||{},s=n.removal_status||{},a=n.lock_status||{},l=!1!==s.track,o=!1!==a.track,i={},c={};let u=[];const f=w(e,t);return l&&u.push(f.removed,f.approved),o&&u.push(f.locked,f.unlocked),u.forEach((e=>{const t=r[e]||{};Object.keys(t).forEach((e=>{const r=t[e];r&&r.u?i[e]=!0:c[e]=!0}))})),{unseen:Object.keys(i),seen:Object.keys(c)}},$=()=>{var e;C()?h().runtime.sendMessage({action:"update-badge"}).catch((()=>{})):(e=e=>{let t=0;Object.values(e).forEach((e=>{t+=e.length}));const r=e=>{chrome[l].setBadgeBackgroundColor({color:"red"}),chrome[l].setBadgeText({text:e})};t>0?r(t.toString()):chrome.storage.local.get(["error_status"],(e=>{e?.error_status?(e=>{try{chrome[l].setBadgeText({text:"!"}),chrome[l].setBadgeBackgroundColor({color:"#ffcc00"}),e&&chrome.storage.local.set({error_status:e})}catch{}})():r("")}))},chrome.storage.sync.get(void 0,(t=>{const r={};y(t.user_subscriptions).forEach((({thing:e,isUser:n})=>{r[O(e,n)]=A(e,n,t)})),e(r)})))};var D=r(745),I=r(917);const R={sm:"4px",md:"6px",lg:"8px",pill:"999px"},P={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px"},B={body:'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},H=I.iv`
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
`,z=I.iv`
    html,
    body {
        margin: 0;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family: ${B.body};
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
        margin: ${P.md} 0;
    }

    h1,
    h2,
    h3,
    h4 {
        color: var(--text-primary);
    }
    h1 {
        font-size: 22px;
        margin: 0 0 ${P.lg} 0;
    }
    h2 {
        font-size: 18px;
        margin: 0 0 ${P.md} 0;
    }
    h3 {
        font-size: 16px;
        margin: 0 0 ${P.sm} 0;
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
        border-radius: ${R.sm};
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
`,U=I.iv`
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
        border-radius: ${R.md};
    }
    .md-body code {
        background: var(--code-bg);
        border: 1px solid var(--code-border);
        border-radius: 3px;
        padding: 0 4px;
        font-family: ${B.mono};
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
`,q="ui_theme";function K(e){document.documentElement.setAttribute("data-theme",function(e){return"auto"===e?window.matchMedia?.("(prefers-color-scheme: light)").matches?"light":"dark":e}(e))}function Z(){return(0,s.useEffect)((()=>{try{chrome.storage.local.get([q],(e=>{K(e?.[q]||"auto")}))}catch{K("auto")}const e=window.matchMedia?.("(prefers-color-scheme: light)"),t=()=>{try{chrome.storage.local.get([q],(e=>{"auto"===(e?.[q]||"auto")&&K("auto")}))}catch(e){}};e?.addEventListener?.("change",t);const r=(e,t)=>{"local"===t&&e[q]&&K(e[q].newValue||"auto")};return chrome.storage.onChanged.addListener(r),()=>{e?.removeEventListener?.("change",t),chrome.storage.onChanged.removeListener(r)}}),[]),(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(I.xB,{styles:H}),(0,n.jsx)(I.xB,{styles:z}),(0,n.jsx)(I.xB,{styles:U})]})}function N(e,t){const r=`https://www.reddit.com/comments/${(t??e).substring(3)}`;return t?`${r}/-/${e.substring(3)}?context=3`:r}const F=a.Z.a`
    color: var(--link);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,X=a.Z.a`
    color: var(--text-secondary);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,W=a.Z.button`
    display: block;
    width: 100%;
    margin-top: 6px;
    padding: 8px 10px;
    background: var(--accent);
    color: var(--text-on-accent);
    border: 0;
    border-radius: ${R.md};
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
`,G=((0,a.Z)(W)`
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
    border-radius: ${R.md};
    font-size: 0.92em;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
    ${e=>{switch(e.variant){case"secondary":return I.iv`
                    background: var(--button-bg);
                    color: var(--button-text);
                    border-color: var(--border);
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;case"ghost":return I.iv`
                    background: transparent;
                    color: var(--link);
                    border-color: transparent;
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;default:return I.iv`
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
`),Y={warning:["var(--locked-bg)","var(--locked-border)","var(--text-primary)"],success:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],info:["var(--bg-surface)","var(--border)","var(--text-secondary)"]},V=(a.Z.div`
    padding: 10px 12px;
    margin: 6px 0;
    border-radius: ${R.md};
    font-size: 0.92em;
    ${e=>{const[t,r,n]=Y[e.variant]??Y.info;return I.iv`
            background: ${t};
            border: 1px solid ${r};
            color: ${n};
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
    border-radius: ${R.lg};
    padding: ${P.md} ${P.lg};
    margin-bottom: ${P.md};
    transition: border-color 0.15s ease;
    &:hover {
        border-color: var(--border-light);
    }
`),J=a.Z.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${P.sm};
    margin-bottom: ${P.xs};
`,Q=a.Z.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${P.sm};
    color: var(--text-secondary);
    font-size: 0.85em;
    margin-bottom: ${P.sm};
    & > span + span::before {
        content: '·';
        margin-right: ${P.sm};
        color: var(--text-muted);
    }
`,ee=a.Z.div`
    color: var(--text-primary);
    font-size: 0.95em;
`,te=a.Z.div`
    display: flex;
    gap: ${P.sm};
    margin-top: ${P.sm};
    padding-top: ${P.sm};
    border-top: 1px solid var(--border);
`,re={removed:["var(--removed-bg)","var(--removed-border)","var(--removed-text)"],deleted:["var(--deleted-bg)","var(--deleted-border)","var(--deleted-text)"],approved:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],locked:["var(--locked-bg)","var(--locked-border)","var(--text-primary)"],unlocked:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],edited:["var(--bg-surface-hover)","var(--border)","var(--text-primary)"],default:["var(--bg-surface-hover)","var(--border)","var(--text-secondary)"]},ne=(a.Z.span`
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: ${R.pill};
    font-weight: 700;
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    border: 1px solid transparent;
    ${e=>{const[t,r,n]=re[e.variant??"default"]??re.default;return I.iv`
            background: ${t};
            border-color: ${r};
            color: ${n};
        `}}
`,a.Z.h2`
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin: ${P.lg} 0 ${P.sm} 0;
    padding-bottom: ${P.xs};
    border-bottom: 1px solid var(--border);
`,a.Z.span`
    color: var(--author);
    font-weight: 600;
`,a.Z.span`
    color: var(--text-secondary);
`),se=a.Z.h3`
    margin: ${P.xs} 0 ${P.sm} 0;
    color: var(--text-primary);
`,ae=a.Z.div`
    font-size: 0.95em;
`,le=a.Z.div`
    max-width: 820px;
    margin: 0 auto;
    padding: ${P.xl} ${P.lg};
`;!function(e){function t(e){return" "==e||"\n"==e}function r(e){return/[\x09-\x0d ]/.test(e)}function n(e){return/[A-Za-z0-9]/.test(e)}function s(e){return/[A-Za-z]/.test(e)}function a(e){return/[0-9]/.test(e)}function l(e){return/[0-9a-fA-F]/.test(e)}function o(e){return/[\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]/.test(e)}function i(e){var t="0123456789ABCDEF";return"%"+t[(240&e)>>4]+t[(15&e)>>0]}function c(e){var t=e.charCodeAt(0);if(t<128)return i(t);if(t>127&&t<2048){var r=i(t>>6&255|192);return r+=i(t>>0&63|128)}r=i(t>>12&255|224);return r+=i(t>>6&63|128),r+=i(t>>0&63|128)}function u(e,t){var n,s=0,a=e.length;if(a<3||"<"!=e[0])return Ze;"/"==e[n=1]&&(s=1,n++);for(var l=0;n<a&&!(l>=t.length);++n,++l)if(e[n]!=t[l])return Ze;return n==a?Ze:r(e[n])||">"==e[n]?s?Fe:Ne:Ze}function f(e,t){for(var r,n=0;n<t.s.length;){for(r=n;n<t.s.length&&"\\"!=t.s[n];)n++;if(n>r&&(e.s+=t.s.slice(r,n)),n+1>=t.s.length)break;e.s+=t.s[n+1],n+=2}}var d=1114111;var h=["&AElig;","&Aacute;","&Acirc;","&Agrave;","&Alpha;","&Aring;","&Atilde;","&Auml;","&Beta;","&Ccedil;","&Chi;","&Dagger;","&Delta;","&ETH;","&Eacute;","&Ecirc;","&Egrave;","&Epsilon;","&Eta;","&Euml;","&Gamma;","&Iacute;","&Icirc;","&Igrave;","&Iota;","&Iuml;","&Kappa;","&Lambda;","&Mu;","&Ntilde;","&Nu;","&OElig;","&Oacute;","&Ocirc;","&Ograve;","&Omega;","&Omicron;","&Oslash;","&Otilde;","&Ouml;","&Phi;","&Pi;","&Prime;","&Psi;","&Rho;","&Scaron;","&Sigma;","&THORN;","&Tau;","&Theta;","&Uacute;","&Ucirc;","&Ugrave;","&Upsilon;","&Uuml;","&Xi;","&Yacute;","&Yuml;","&Zeta;","&aacute;","&acirc;","&acute;","&aelig;","&agrave;","&alefsym;","&alpha;","&amp;","&and;","&ang;","&apos;","&aring;","&asymp;","&atilde;","&auml;","&bdquo;","&beta;","&brvbar;","&bull;","&cap;","&ccedil;","&cedil;","&cent;","&chi;","&circ;","&clubs;","&cong;","&copy;","&crarr;","&cup;","&curren;","&dArr;","&dagger;","&darr;","&deg;","&delta;","&diams;","&divide;","&eacute;","&ecirc;","&egrave;","&empty;","&emsp;","&ensp;","&epsilon;","&equiv;","&eta;","&eth;","&euml;","&euro;","&exist;","&fnof;","&forall;","&frac12;","&frac14;","&frac34;","&frasl;","&gamma;","&ge;","&gt;","&hArr;","&harr;","&hearts;","&hellip;","&iacute;","&icirc;","&iexcl;","&igrave;","&image;","&infin;","&int;","&iota;","&iquest;","&isin;","&iuml;","&kappa;","&lArr;","&lambda;","&lang;","&laquo;","&larr;","&lceil;","&ldquo;","&le;","&lfloor;","&lowast;","&loz;","&lrm;","&lsaquo;","&lsquo;","&lt;","&macr;","&mdash;","&micro;","&middot;","&minus;","&mu;","&nabla;","&nbsp;","&ndash;","&ne;","&ni;","&not;","&notin;","&nsub;","&ntilde;","&nu;","&oacute;","&ocirc;","&oelig;","&ograve;","&oline;","&omega;","&omicron;","&oplus;","&or;","&ordf;","&ordm;","&oslash;","&otilde;","&otimes;","&ouml;","&para;","&part;","&permil;","&perp;","&phi;","&pi;","&piv;","&plusmn;","&pound;","&prime;","&prod;","&prop;","&psi;","&quot;","&rArr;","&radic;","&rang;","&raquo;","&rarr;","&rceil;","&rdquo;","&real;","&reg;","&rfloor;","&rho;","&rlm;","&rsaquo;","&rsquo;","&sbquo;","&scaron;","&sdot;","&sect;","&shy;","&sigma;","&sigmaf;","&sim;","&spades;","&sub;","&sube;","&sum;","&sup1;","&sup2;","&sup3;","&sup;","&supe;","&szlig;","&tau;","&there4;","&theta;","&thetasym;","&thinsp;","&thorn;","&tilde;","&times;","&trade;","&uArr;","&uacute;","&uarr;","&ucirc;","&ugrave;","&uml;","&upsih;","&upsilon;","&uuml;","&weierp;","&xi;","&yacute;","&yen;","&yuml;","&zeta;","&zwj;","&zwnj;"],g=[7,7,7,7,7,7,7,7,7,0,0,7,7,0,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,0,0,1,0,0,0,2,3,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,5,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],p=["","&quot;","&amp;","&#39;","&#47;","&lt;","&gt;",""];function b(e,t,r){for(var n,s=0,a=0;s<t.length;){for(n=s;s<t.length&&!(a=g[t.charCodeAt(s)]);)s++;if(s>n&&(e.s+=t.slice(n,s)),s>=t.length)break;"/"!=t[s]||r?7==g[t.charCodeAt(s)]||(e.s+=p[a]):e.s+="/",s++}}var m=[2,2,2,2,2,2,2,2,2,0,0,2,2,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,1,0,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];function v(e,t){for(var r,n=0;n<t.length;){for(r=n;n<t.length&&1===m[t.charCodeAt(n)];)n++;if(n>r&&(e.s+=t.slice(r,n)),n>=t.length)break;if(2!=m[t.charCodeAt(n)]){switch(t[n]){case"&":e.s+="&amp;";break;case"'":e.s+="&#x27;";break;default:e.s+=c(t[n])}n++}else n++}}function k(e,t,r,n,a){var l,o,i=e.slice(r),c=0;for(o=0;o<t;++o)if("<"==i[o]){t=o;break}for(;t>0;){var u=i[t-1];if("\0"===u)break;if(-1!=="?!.,".indexOf(u))t--;else{if(";"!==u)break;for(var f=t-2;f>0&&s(i[f]);)f--;f<t-2&&"&"==i[f]?t=f:t--}}if(0==t)return 0;switch(l=i[t-1]){case'"':c='"';break;case"'":c="'";break;case")":c="(";break;case"]":c="[";break;case"}":c="{"}if(0!=c){for(var d=0,h=0,g=0;g<t;)i[g]==c?h++:i[g]==l&&d++,g++;d!=h&&t--}return t}function x(e,t){var r,s=0;if(!n(e[0]))return 0;for(r=1;r<e.length-1;++r)if("."==e[r])s++;else if(!n(e[r])&&"-"!=e[r])break;return t||s?r:0}function w(e){var t,r=["http://","https://","ftp://","mailto://","/","git://","steam://","irc://","news://","mumble://","ssh://","ircs://","ts3server://","#"];for(t=0;t<r.length;++t){var n=r[t].length;if(e.length>n&&0==e.toLowerCase().indexOf(r[t])&&/[A-Za-z0-9#\/?]/.test(e[n]))return 1}return 0}function _(e,t,n,s,a){var l=t,i=new We(e,t);if(s<2||n<1||i.getChar(-1)!=a)return 0;if(n>1){var c=i.getChar(-2);return"/"==c?2:o(c)||r(c)?1:0}return l>2&&"/"==i.getChar(-2)&&"\\"==i.getChar(-3)?0:1}function y(e){if(e)for(var t in e)t in this&&(this[t]=e[t])}function S(e,t){this.callbacks=e,this.context=t}function C(){return{nofollow:0,target:null,tocData:{headerCount:0,currentLevel:0,levelOffset:0},toc_id_prefix:null,html_element_whitelist:Lt,html_attr_whitelist:Tt,flags:0,link_attributes:function(e,t,r){r.nofollow&&(e.s+=' rel="nofollow"'),null!=r.target&&(e.s+=' target="'+r.target+'"')}}}function T(e){var t=C();t.flags=null==e?St:e;var r=new S(L(),t);return r.context.flags&Ae&&(r.callbacks.image=null),r.context.flags&Me&&(r.callbacks.link=null,r.callbacks.autolink=null),(r.context.flags&Ee||r.context.flags&Pe)&&(r.callbacks.blockhtml=null),r}function L(){return new y({blockcode:E,blockquote:j,blockhtml:A,header:M,hrule:$,list:D,listitem:I,paragraph:R,table:P,table_row:B,table_cell:H,autolink:z,codespan:U,double_emphasis:q,emphasis:K,image:Z,linebreak:N,link:F,raw_html_tag:W,triple_emphasis:G,strikethrough:Y,superscript:V,entity:null,normal_text:J,doc_header:null,doc_footer:te})}function O(){return new y({blockcode:null,blockquote:null,blockhtml:null,header:Q,hrule:null,list:null,listitem:null,paragraph:null,table:null,table_row:null,table_cell:null,autolink:null,codespan:U,double_emphasis:q,emphasis:K,image:null,linebreak:null,link:ee,raw_html_tag:null,triple_emphasis:G,strikethrough:Y,superscript:V,entity:null,normal_text:null,doc_header:null,doc_footer:re})}function E(e,t,n,s){if(e.s.length&&(e.s+="\n"),n&&n.s.length){var a,l;for(e.s+='<pre><code class="',a=0,l=0;a<n.s.length;++a,++l){for(;a<n.s.length&&r(n.s[a]);)a++;if(a<n.s.length){for(var o=a;a<n.s.length&&!r(n.s[a]);)a++;"."==n.s[o]&&o++,l&&(e.s+=" "),b(e,n.s.slice(o,a),!1)}}e.s+='">'}else e.s+="<pre><code>";t&&b(e,t.s,!1),e.s+="</code></pre>\n"}function j(e,t,r){e.s.length&&(e.s+="\n"),e.s+="<blockquote>\n",t&&(e.s+=t.s),e.s+="</blockquote>\n"}function A(e,t,r){var n,s;if(t){for(s=t.s.length;s>0&&"\n"==t.s[s-1];)s--;for(n=0;n<s&&"\n"==t.s[n];)n++;n>=s||(e.s.length&&(e.s+="\n"),e.s+=t.s.slice(n,s),e.s+="\n")}}function M(e,t,r,n){e.s.length&&(e.s+="\n"),n.flags&De?(e.s+="<h"+ +r+' id="',n.toc_id_prefix&&(e.s+=n.toc_id_prefix),e.s+="toc_"+n.tocData.headerCount+++'">'):e.s+="<h"+ +r+">",t&&(e.s+=t.s),e.s+="</h"+ +r+">\n"}function $(e,t){e.s.length&&(e.s+="\n"),e.s+=t.flags&Re?"<hr/>\n":"<hr>\n"}function D(e,t,r,n){e.s.length&&(e.s+="\n"),e.s+=r&se?"<ol>\n":"<ul>\n",t&&(e.s+=t.s),e.s+=r&se?"</ol>\n":"</ul>\n"}function I(e,t,r,n){if(e.s+="<li>",t){for(var s=t.s.length;s&&"\n"==t.s[s-1];)s--;e.s+=t.s.slice(0,s)}e.s+="</li>\n"}function R(e,t,n){var s=0;if(e.s.length&&(e.s+="\n"),t&&t.s.length){for(;s<t.s.length&&r(t.s[s]);)s++;if(s!=t.s.length){if(e.s+="<p>",n.flags&Ie)for(var a;s<t.s.length;){for(a=s;s<t.s.length&&"\n"!=t.data[s];)s++;if(s>a&&(e.s+=t.s.slice(a,s)),s>=t.s.length-1)break;N(e,n),s++}else e.s+=t.s.slice(s);e.s+="</p>\n"}}}function P(e,t,r,n){e.s.length&&(e.s+="\n"),e.s+="<table><thead>\n",t&&(e.s+=t.s),e.s+="</thead><tbody>\n",r&&(e.s+=r.s),e.s+="</tbody></table>\n"}function B(e,t,r){e.s+="<tr>\n",t&&(e.s+=t.s),e.s+="</tr>\n"}function H(e,t,r,n,s){switch(e.s+=r&Ke?"<th":"<td",s>1&&(e.s+=' colspan="'+s+'" '),r&qe){case Ue:e.s+=' align="center">';break;case He:e.s+=' align="left">';break;case ze:e.s+=' align="right">';break;default:e.s+=">"}t&&(e.s+=t.s),e.s+=r&Ke?"</th>\n":"</td>\n"}function z(e,t,r,n){return t&&t.s.length&&(0==(n.flags&$e)||w(t.s)||r==ye)?(e.s+='<a href="',r==ye&&(e.s+="mailto:"),v(e,t.s.slice(0)),n.link_attributes?(e.s+='"',n.link_attributes(e,t,n),e.s+=">"):e.s+='">',0==t.s.indexOf("mailto:")?b(e,t.s.slice(7),!1):b(e,t.s,!1),e.s+="</a>",1):0}function U(e,t,r){return e.s+="<code>",t&&b(e,t.s,!1),e.s+="</code>",1}function q(e,t,r){return t&&t.s.length?(e.s+="<strong>"+t.s+"</strong>",1):0}function K(e,t,r){return t&&t.s.length?(e.s+="<em>"+t.s+"</em>",1):0}function Z(e,t,r,n,s){return t&&t.s.length?(e.s+='<img src="',v(e,t.s),e.s+='" alt="',n&&n.s.length&&b(e,n.s,!1),r&&r.s.length&&(e.s+='" title="',b(e,r.s,!1)),e.s+=s.flags&Re?'"/>':'">',1):0}function N(e,t){return e.s+=t.flags&Re?"<br/>\n":"<br>\n",1}function F(e,t,r,n,s){return null==t||0==(s.flags&$e)||w(t.s)?(e.s+='<a href="',t&&t.s.length&&v(e,t.s),r&&r.s.length&&(e.s+='" title="',b(e,r.s,!1)),s.link_attributes?(e.s+='"',s.link_attributes(e,t,s),e.s+=">"):e.s+='">',n&&n.s.length&&(e.s+=n.s),e.s+="</a>",1):0}function X(e,t,r,n,s,a){var l,o,i,c,u,f=0,d=0,h=0,g=0,p=0;if(e.s+="<",a!=Fe){e.s+=n;var m=1+n.length;for(i=new Xe,c=new Xe;m<t.s.length&&!h;m++){switch(h=0,p=0,g=0,u=t.s[m]){case">":h=1;break;case"'":case'"':d?f?f==u?(f=0,g=1):c.s+=u:f=u:p=1;break;case" ":f?c.s+=" ":p=1;break;case"=":if(d){p=1;break}d=1;break;default:(d&&f||!d)&&(d?c.s+=u:i.s+=u)}if(g){var v=0;for(o=0;s[o];o++)if(s[o].length==i.s.length){for(l=0;l<i.s.length&&s[o][l].toLowerCase()==i.s[l].toLowerCase();l++);if(l==i.s.length){v=1;break}}v&&c.s.length&&i.s.length&&(e.s+=" ",b(e,i.s,!1),e.s+='="',b(e,c.s,!1),e.s+='"'),p=1}p&&(d=0,f=0,i=new Xe,c=new Xe)}e.s+=">"}else e.s+="/"+n+">"}function W(e,t,r){var n=r.html_element_whitelist;if(0!=(r.flags&Be)&&n)for(var s=0;n[s];s++){var a=u(t.s,n[s]);if(a!=Ze)return X(e,t,0,n[s],r.html_attr_whitelist,a),1}return 0!=(r.flags&Pe)?(b(e,t.s,!1),1):(0!=(r.flags&Ee)||0!=(r.flags&je)&&u(t.s,"style")||0!=(r.flags&Me)&&u(t.s,"a")||0!=(r.flags&Ae)&&u(t.s,"img")||(e.s+=t.s),1)}function G(e,t,r){return t&&t.s.length?(e.s+="<strong><em>"+t.s+"</em></strong>",1):0}function Y(e,t,r){return t&&t.s.length?(e.s+="<del>"+t.s+"</del>",1):0}function V(e,t,r){return t&&t.s.length?(e.s+="<sup>"+t.s+"</sup>",1):0}function J(e,t,r){t&&b(e,t.s,!1)}function Q(e,t,r,n){if(0==n.tocData.currentLevel&&(e.s+='<div class="toc">\n',n.tocData.levelOffset=r-1),(r-=n.tocData.levelOffset)>n.tocData.currentLevel)for(;r>n.tocData.currentLevel;)e.s+="<ul>\n<li>\n",n.tocData.currentLevel++;else if(r<n.tocData.currentLevel){for(e.s+="</li>\n";r<n.tocData.currentLevel;)e.s+="</ul>\n</li>\n",n.tocData.currentLevel--;e.s+="<li>\n"}else e.s+="</li>\n<li>\n";e.s+='<a href="#',n.toc_id_prefix&&(e.s+=n.toc_id_prefix),e.s+="toc_"+n.tocData.headerCount+++'">',t&&b(e,t.s,!1),e.s+="</a>\n"}function ee(e,t,r,n,s){return n&&n.s&&(e.s+=n.s),1}function te(e,t){t.tocData={headerCount:0,currentLevel:0,levelOffset:0}}function re(e,t){for(var r=!1;t.tocData.currentLevel>0;)e.s+="</li>\n</ul>\n",t.tocData.currentLevel--,r=!0;r&&(e.s+="</div>\n"),te(0,t)}y.prototype={blockcode:null,blockquote:null,blockhtml:null,header:null,hrule:null,list:null,listitem:null,paragraph:null,table:null,table_row:null,table_cell:null,autolink:null,codespan:null,double_emphasis:null,emphasis:null,image:null,linebreak:null,link:null,raw_html_tag:null,triple_emphasis:null,strikethrough:null,superscript:null,entity:null,normal_text:null,doc_header:null,doc_footer:null},e.createCustomRenderer=function(e,t){return new S(e,t)},e.defaultRenderState=C,e.getRedditRenderer=T,e.getTocRenderer=function(){var e=C();return e.flags=De|Ee,new S(O(),e)},e.createCustomCallbacks=function(e){return new y(e)},e.getRedditCallbacks=L,e.getTocCallbacks=O;var ne=[null,function(e,r,n,s,a){var l,o=n.slice(s),i=o.length,c=o[0];return i>2&&o[1]!=c?"~"==c||t(o[1])||0==(l=et(e,r,o,c))?0:l+1:o.length>3&&o[1]==c&&o[2]!=c?t(o[2])||0==(l=tt(e,r,o,c))?0:l+2:o.length>4&&o[1]==c&&o[2]==c&&o[3]!=c?"~"==c||t(o[3])||0==(l=function(e,r,n,s){var a,l,o=n.slice(3),i=0;for(;i<o.length;){if(!(a=Qe(o.slice(i),s)))return 0;if(o[i+=a]==s&&!t(o[i-1])){if(i+2<o.length&&o[i+1]==s&&o[i+2]==s&&r.callbacks.triple_emphasis){var c=new Xe;return r.spanStack.push(c),ct(c,r,o.slice(0,i)),l=r.callbacks.triple_emphasis(e,c,r.context),r.spanStack.pop(),l?i+3:0}return i+1<o.length&&o[i+1]==s?(a=et(e,r,n,s))?a-2:0:(a=tt(e,r,n,s))?a-1:0}}return 0}(e,r,o,c))?0:l+3:0},function(e,t,r,n,s){for(var a,l,o,i,c=r.slice(n),u=0;u<c.length&&"`"==c[u];)u++;for(l=0,a=u;a<c.length&&l<u;a++)"`"==c[a]?l++:l=0;if(l<u&&a>=c.length)return 0;for(o=u;o<a&&" "==c[o];)o++;for(i=a-u;i>u&&" "==c[i-1];)i--;if(o<i){var f=new Xe(c.slice(o,i));t.callbacks.codespan(e,f,t.context)||(a=0)}else t.callbacks.codespan(e,null,t.context)||(a=0);return a},function(e,t,r,n,s){if(r.slice(n),s<2||" "!=r[n-1]||" "!=r[n-2])return 0;for(var a=e.s.length;a&&" "==e.s[a-1];)a--;return e.s=e.s.slice(0,a),t.callbacks.linebreak(e,t.context)?1:0},function(e,r,n,s,a){var l,o,i=n.slice(s),c=a&&"!"==n[s-1],u=1,d=0,h=0,g=0,p=0,b=null,m=null,v=null,k=null,x=r.spanStack.length,w=0,_=0,y=0,S=0;function C(){return r.spanStack.length=x,_?u:0}if(c&&!r.callbacks.image||!c&&!r.callbacks.link)return C();for(l=1;u<i.length;u++)if("\n"==i[u])w=1;else{if("\\"==i[u-1])continue;if("["==i[u])l++;else if("]"==i[u]&&--l<=0)break}if(u>=i.length)return C();for(o=u,u++;u<i.length&&t(i[u]);)u++;if(u<i.length&&"("==i[u]){for(u++;u<i.length&&t(i[u]);)u++;for(d=u;u<i.length;)if("\\"==i[u])u+=2;else{if(")"==i[u])break;if(u>=1&&t(i[u-1])&&("'"==i[u]||'"'==i[u]))break;u++}if(u>=i.length)return C();if(h=u,"'"==i[u]||'"'==i[u]){for(S=i[u],y=1,g=++u;u<i.length;)if("\\"==i[u])u+=2;else if(i[u]==S)y=0,u++;else{if(")"==i[u]&&!y)break;u++}if(u>=i.length)return C();for(p=u-1;p>g&&t(i[p]);)p--;"'"!=i[p]&&'"'!=i[p]&&(g=p=0,h=u)}for(;h>d&&t(i[h-1]);)h--;"<"==i[d]&&d++,">"==i[h-1]&&h--,h>d&&(m=new Xe,r.spanStack.push(m),m.s+=i.slice(d,h)),p>g&&(v=new Xe,r.spanStack.push(v),v.s+=i.slice(g,p)),u++}else if(u<i.length&&"["==i[u]){var T=new Xe,L=null;for(d=++u;u<i.length&&"]"!=i[u];)u++;if(u>=i.length)return C();if(d==(h=u))if(w){var O=new Xe;for(r.spanStack.push(O),E=1;E<o;E++)"\n"!=i[E]?O.s+=i[E]:" "!=i[E-1]&&(O.s+=" ");T.s=O.s}else T.s=i.slice(1);else T.s=i.slice(d,h);if(!(L=r.refs[T.s]))return C();m=L.link,v=L.title,u++}else{T=new Xe,L=null;if(w){var E;O=new Xe;for(r.spanStack.push(O),E=1;E<o;E++)"\n"!=i[E]?O.s+=i[E]:" "!=i[E-1]&&(O.s+=" ");T.s=O.s}else T.s=i.slice(1,o);if(!(L=r.refs[T.s]))return C();m=L.link,v=L.title,u=o+1}return o>1&&(b=new Xe,r.spanStack.push(b),c?b.s+=i.slice(1,o):(r.inLinkBody=1,ct(b,r,i.slice(1,o)),r.inLinkBody=0)),m?(k=new Xe,r.spanStack.push(k),f(k,m),c?(e.s.length&&"!"==e.s[e.s.length-1]&&(e.s=e.s.slice(0,-1)),_=r.callbacks.image(e,k,v,b,r.context)):_=r.callbacks.link(e,k,v,b,r.context),C()):C()},function(e,t,r,s,a){var l=r.slice(s),o={p:we},i=function(e,t){var r,s;if(e.length<3)return 0;if("<"!=e[0])return 0;if(r="/"==e[1]?2:1,!n(e[r]))return 0;t.p=we;for(;r<e.length&&(n(e[r])||"."==e[r]||"+"==e[r]||"-"==e[r]);)r++;if(r>1&&"@"==e[r]&&0!=(s=function(e){var t=0,r=0;for(t=0;t<e.length;++t)if(!n(e[t]))switch(e[t]){case"@":r++;case"-":case".":case"_":break;case">":return 1==r?t+1:0;default:return 0}return 0}(e.slice(r))))return t.p=ye,r+s;r>2&&":"==e[r]&&(t.p=_e,r++);if(r>=e.length)t.p=we;else if(t.p){for(s=r;r<e.length;)if("\\"==e[r])r+=2;else{if(">"==e[r]||"'"==e[r]||'"'==e[r]||" "==e[r]||"\n"==e[r])break;r++}if(r>=e.length)return 0;if(r>s&&">"==e[r])return r+1;t.p=we}for(;r<e.length&&">"!=e[r];)r++;return r>=e.length?0:r+1}(l,o),c=new Xe(l.slice(0,i)),u=0;if(i>2)if(t.callbacks.autolink&&o.p!=we){var d=new Xe;t.spanStack.push(d),c.s=l.substr(1,i-2),f(d,c),u=t.callbacks.autolink(e,d,o.p,t.context),t.spanStack.pop()}else t.callbacks.raw_html_tag&&(u=t.callbacks.raw_html_tag(e,c,t.context));return u?i:0},function(e,t,r,n,s){var a=r.slice(n),l=new Xe;if(a.length>1){if(-1=="\\`*_{}[]()#+-.!:|&<>/^~".indexOf(a[1]))return 0;t.callbacks.normal_text?(l.s=a[1],t.callbacks.normal_text(e,l,t.context)):e.s+=a[1]}else 1==a.length&&(e.s+=a[0]);return 2},function(e,t,r,s,o){var i,c,u=r.slice(s),f=1,g=!1,p=!1,b=new Xe;for(f<u.length&&"#"===u[f]&&(g=!0,f++),f<u.length&&g&&"x"===u[f].toLowerCase()&&(p=!0,f++),i=f;f<u.length;){var m=u[f];if(p){if(!l(m))break}else if(g){if(!a(m))break}else if(!n(m))break;f++}if(!(f>i&&f<u.length&&";"===u[f]))return 0;if(f++,g&&undefined-i>7)return 0;if(g){if(c=p?16:10,!function(e){return e>8&&11!==e&&12!==e&&(e<14||e>31)&&(e<55296||e>57343)&&65534!==e&&65535!==e&&e<=d}(parseInt(u.slice(i),c)))return 0}else if(-1===h.indexOf(u.slice(0,f)))return 0;return t.callbacks.entity?(b.s=u.slice(0,f),t.callbacks.entity(e,b,t.context)):e.s+=u.slice(0,f),f},function(e,t,n,a,l){var o,i,c=n.slice(a),u={p:null};return!t.callbacks.autolink||t.inLinkBody?0:(o=new Xe,t.spanStack.push(o),(i=function(e,t,n,a,l,o,i){var c,u,f=n.slice(a),d=0;if(o<4||"/"!=n[a+1]||"/"!=n[a+2])return 0;for(;d<l&&s(n[a-d-1]);)d++;if(!w(n.substr(a-d,o+d)))return 0;if(c=3,0==(u=x(f.slice(c),i&xe)))return 0;for(c+=u;c<o&&!r(n[a+c]);)c++;return 0==(c=k(n,c,a))?0:(t.s+=n.substr(a-d,c+d),e.p=d,c)}(u,o,n,a,l,c.length,0))>0&&(u.p>0&&e.truncate(e.s.length-u.p),t.callbacks.autolink(e,o,_e,t.context)),t.spanStack.pop(),i)},function(e,t,r,s,a){var l,o,i=r.slice(s),c={p:null};return!t.callbacks.autolink||t.inLinkBody?0:(l=new Xe,t.spanStack.push(l),(o=function(e,t,r,s,a,l,o){r.slice(s);var i,c,u=0,f=0;for(c=0;c<a&&"\0"!=(d=r[s-c-1])&&(n(d)||-1!=".+-_".indexOf(d));++c);if(0==c)return 0;for(i=0;i<l;++i){var d;if(!n(d=r[s+i]))if("@"==d)u++;else if("."==d&&i<l-1)f++;else if("-"!=d&&"_"!=d)break}return i<2||1!=u||0==f||0==(i=k(r,i,s))?0:(t.s+=r.substr(s-c,i+c),e.p=c,i)}(c,l,r,s,a,i.length))>0&&(c.p>0&&e.truncate(e.s.length-c.p),t.callbacks.autolink(e,l,ye,t.context)),t.spanStack.pop(),o)},function(e,t,n,s,a){var l,i,c=n.slice(s),u=null,f=null,d={p:null};return!t.callbacks.link||t.inLinkBody?0:(l=new Xe,t.spanStack.push(l),(i=function(e,t,n,s,a,l,i){var c,u=n.slice(s);if(a>0&&!o(n[s-1])&&!r(n[s-1]))return 0;if(l<4||"www."!=u.slice(0,4))return 0;if(0==(c=x(u,0)))return 0;for(;c<l&&!r(u[c]);)c++;return 0==(c=k(n,c,s))?0:(t.s+=u.slice(0,c),e.p=0,c)}(d,l,n,s,a,c.length))>0&&(u=new Xe,t.spanStack.push(u),u.s+="http://",u.s+=l.s,d.p>0&&e.truncate(e.s.length-d.p),t.callbacks.normal_text?(f=new Xe,t.spanStack.push(f),t.callbacks.normal_text(f,l,t.context),t.callbacks.link(e,u,null,f,t.context),t.spanStack.pop()):t.callbacks.link(e,u,null,l,t.context),t.spanStack.pop()),t.spanStack.pop(),i)},function(e,t,r,s,a){var l,o=r.slice(s),i=0,c={p:null},u={p:null};if(!t.callbacks.autolink||t.inLinkBody)return 0;if(l=new Xe,t.spanStack.push(l),0===(i=function(e,t,r,s,a,l,o){var i=r.slice(s),c=0,u=!1,f=_(r,s,a,l,"r");if(!f)return 0;c=1,"all-"==i.substr(c,4).toLowerCase()&&(u=!0);do{var d=c,h=24;if(l>=c+10&&"reddit.com"==i.substr(c,10).toLowerCase())c+=10,h=10;else{if(l>c+2&&"t:"==i.substr(c,2)&&(c+=2),!n(i[c]))return 0;c+=1}for(;c<l&&(n(i[c])||"_"==i[c]);)c++;if(c-d<2||c-d>h)return 0}while(c<l&&("+"==i[c]||u&&"-"==i[c])&&c++);if(c<l&&"/"==i[c])for(;c<l&&(n(i[c])||"_"==i[c]||"/"==i[c]||"-"==i[c]);)c++;var g=s-f;return t.s+=r.slice(g,g+c+f),o.p=1==f,e.p=f,c}(c,l,r,s,a,o.length,u))&&(i=function(e,t,r,s,a,l,o){var i=r.slice(s),c=0;if(!(l<3)){var u=_(r,s,a,l,"u");if(!u)return 0;if(!n(i[c=1])&&"_"!=i[c]&&"-"!=i[c])return 0;for(c+=1;c<l&&(n(i[c])||"_"==i[c]||"/"==i[c]||"-"==i[c]);)c++;var f=s-u;return t.s+=r.slice(f,f+c+u),o.p=1==u,e.p=u,c}}(c,l,r,s,a,o.length,u)),i>0){var f=new Xe;if(t.spanStack.push(f),u.p&&(f.s+="/"),f.s+=l.s,c.p>0&&e.truncate(e.s.length-c.p),t.callbacks.normal_text){var d=new Xe;t.spanStack.push(d),t.callbacks.normal_text(d,l,t.context),t.callbacks.link(e,f,null,d,t.context),t.spanStack.pop()}else t.callbacks.link(e,f,null,l,t.context);t.spanStack.pop()}return t.spanStack.pop(),i},function(e,r,n,s,a){var l,o,i,c=n.slice(s),u=c.length;if(!r.callbacks.superscript)return 0;if(u<2)return 0;if("("==c[1]){for(l=o=2;o<u&&")"!=c[o]&&"\\"!=c[o-1];)o++;if(o==u)return 0}else for(l=o=1;o<u&&!t(c[o]);)o++;return o-l==0?2==l?3:0:(i=new Xe,r.spanStack.push(i),ct(i,r,c.slice(l,o)),r.callbacks.superscript(e,i,r.context),r.spanStack.pop(),2==l?o+1:o)}],se=1,ae=2,le=8,oe=0,ie=(oe++,oe++),ce=oe++,ue=oe++,fe=oe++,de=oe++,he=oe++,ge=oe++,pe=oe++,be=oe++,me=oe++,ve=oe++,ke=oe++,xe=1;oe=0;var we=oe++,_e=oe++,ye=oe++,Se=1,Ce=2,Te=4,Le=64,Oe=256,Ee=1,je=2,Ae=4,Me=8,$e=32,De=64,Ie=128,Re=256,Pe=512,Be=1024,He=1,ze=2,Ue=3,qe=3,Ke=4,Ze=0,Ne=1,Fe=2;function Xe(e){this.s=e||""}function We(e,t){if(this.s=e,t>=e.length||t<0)throw new RangeError("char * offset out of bounds");this.offset=t}function Ge(){this.spanStack=[],this.blockStack=[],this.extensions=152|Se|Ce|Ce;var e=T();this.context=e.context,this.callbacks=e.callbacks,this.inLinkBody=0,this.activeChars={},this.refs={},this.nestingLimit=16,this.maxTableCols=64}function Ye(e){var t;for(t=0;t<e.length&&"\n"!=e[t];t++)if(" "!=e[t])return 0;return t+1}function Ve(e){var t,r=0,n=0;if(e.length<3)return 0;if(" "==e[0]&&(r++," "==e[1]&&(r++," "==e[2]&&r++)),r+2>=e.length||"*"!=e[r]&&"-"!=e[r]&&"_"!=e[r])return 0;for(t=e[r];r<e.length&&"\n"!=e[r];){if(e[r]==t)n++;else if(" "!=e[r])return 0;r++}return n>=3}function Je(e,r){var n,s=0,a=0;if(s=function(e){var t,r=0,n=0;if(e.length<3)return 0;if(" "==e[0]&&(r++," "==e[1]&&(r++," "==e[2]&&r++)),r+2>=e.length||"~"!=e[r]&&"`"!=e[r])return 0;for(t=e[r];r<e.length&&e[r]==t;)n++,r++;return n<3?0:r}(e),0==s)return 0;for(;s<e.length&&" "==e[s];)s++;if(n=s,s<e.length&&"{"==e[s]){for(s++,n++;s<e.length&&"}"!=e[s]&&"\n"!=e[s];)a++,s++;if(s==e.length||"}"!=e[s])return 0;for(;a>0&&t(e[n+0]);)n++,a--;for(;a>0&&t(e[n+a-1]);)a--;s++}else for(;s<e.length&&!t(e[s]);)a++,s++;for(r&&(r.s=e.substr(n,a));s<e.length&&"\n"!=e[s];){if(!t(e[s]))return 0;s++}return s+1}function Qe(e,t){for(var r=1;r<e.length;){for(;r<e.length&&e[r]!=t&&"`"!=e[r]&&"["!=e[r];)r++;if(r==e.length)return 0;if(e[r]==t)return r;if(r&&"\\"==e[r-1])r++;else if("`"==e[r]){for(var n,s=0,a=0;r<e.length&&"`"==e[r];)r++,s++;if(r>=e.length)return 0;for(n=0;r<e.length&&n<s;)a||e[r]!=t||(a=r),"`"==e[r]?n++:n=0,r++;if(r>=e.length)return a}else if("["==e[r]){var l;a=0;for(r++;r<e.length&&"]"!=e[r];)a||e[r]!=t||(a=r),r++;for(r++;r<e.length&&(" "==e[r]||"\n"==e[r]);)r++;if(r>=e.length)return a;switch(e[r]){case"[":l="]";break;case"(":l=")";break;default:if(a)return a;continue}for(r++;r<e.length&&e[r]!=l;)a||e[r]!=t||(a=r),r++;if(r>=e.length)return a;r++}}return 0}function et(e,r,n,s){var a,l,i=n.slice(1),c=0;if(!r.callbacks.emphasis)return 0;for(i.length>1&&i[0]==s&&i[1]==s&&(c=1);c<i.length;){if(!(a=Qe(i.slice(c),s)))return 0;if((c+=a)>=i.length)return 0;if(i[c]==s&&!t(i[c-1])){if(r.extensions&Se&&"_"==s&&c+1!=i.length&&!t(i[c+1])&&!o(i[c+1]))continue;var u=new Xe;return r.spanStack.push(u),ct(u,r,i.slice(0,c)),l=r.callbacks.emphasis(e,u,r.context),r.spanStack.pop(),l?c+1:0}}return 0}function tt(e,r,n,s){var a,l,o=n.slice(2),i=0,c="~"==s?r.callbacks.strikethrough:r.callbacks.double_emphasis;if(!c)return 0;for(;i<o.length;){if(!(a=Qe(o.slice(i),s)))return 0;if((i+=a)+1<o.length&&o[i]==s&&o[i+1]==s&&i&&!t(o[i-1])){var u=new Xe;return r.spanStack.push(u),ct(u,r,o.slice(0,i)),l=c(e,u,r.context),r.spanStack.pop(),l?i+2:0}i++}return 0}function rt(e,t){if("#"!=t[0])return!1;if(e.extensions&Le){for(var r=0;r<t.length&&r<6&&"#"==t[r];)r++;if(r<t.length&&" "!=t[r])return!1}return!0}function nt(e){var t=0,r=e.length;if("="==e[t]){for(t=1;t<r&&"="==e[t];t++);for(;t<r&&" "==e[t];)t++;return t>=r||"\n"==e[t]?1:0}if("-"==e[t]){for(t=1;t<r&&"-"==e[t];t++);for(;t<r&&" "==e[t];)t++;return t>=r||"\n"==e[t]?2:0}return 0}function st(e){for(var t=e.length,r=0;r<t&&"\n"!=e[r];)r++;return++r>=t?0:nt(e.slice(r))}function at(e){var t=0,r=e.length;return t<r&&" "==e[t]&&t++,t<r&&" "==e[t]&&t++,t<r&&" "==e[t]&&t++,t<r&&">"==e[t]?t+1<r&&" "==e[t+1]?t+2:t+1:0}function lt(e){return e.length>3&&" "==e[0]&&" "==e[1]&&" "==e[2]&&" "==e[3]?4:0}function ot(e){var t=e.length,r=0;if(r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r>=t||e[r]<"0"||e[r]>"9")return 0;for(;r<t&&e[r]>="0"&&e[r]<="9";)r++;return r+1>=t||"."!=e[r]||" "!=e[r+1]||st(e.slice(r))?0:r+2}function it(e){var t=e.length,r=0;return r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r+1>=t||"*"!=e[r]&&"+"!=e[r]&&"-"!=e[r]||" "!=e[r+1]||st(e.slice(r))?0:r+2}function ct(e,t,r){var n=0,s=0,a=0,l=0,o=new Xe;if(!(t.spanStack.length+t.blockStack.length>t.nestingLimit))for(;n<r.length;){for(;s<r.length&&!(l=t.activeChars[r[s]]);)s++;if(t.callbacks.normal_text?(o.s=r.slice(n,s),t.callbacks.normal_text(e,o,t.context)):e.s+=r.slice(n,s),s>=r.length)break;n=s,(s=ne[l](e,t,r,n,n-a))?a=s=n+=s:s=n+1}}function ut(e,t,r){for(var n,s,a,l=0;l<r.length&&l<6&&"#"==r[l];)l++;for(n=l;n<r.length&&" "==r[n];n++);for(s=n;s<r.length&&"\n"!=r[s];s++);for(a=s;s&&"#"==r[s-1];)s--;for(;s&&" "==r[s-1];)s--;if(s>n){var o=new Xe;t.spanStack.push(o),ct(o,t,r.slice(n,s)),t.callbacks.header&&t.callbacks.header(e,o,l,t.context),t.spanStack.pop()}return a}function ft(e,t,r){var n,s;return e.length+3>=r.length||r.slice(2).toLowerCase()!=e||">"!=r[e.length+2]?0:(s=0,(n=e.length+3)<r.length&&0==(s=Ye(r.slice(n)))?0:(n+=s,s=0,n<r.length&&(s=Ye(r.slice(n))),n+s))}function dt(e,t,r,n){var s,a,l,o=0,i=null,c=new Xe(r);if(r.length<2||"<"!=r[0])return 0;for(s=1;s<r.length&&">"!=r[s]&&" "!=r[s];)s++;if(s<r.length&&(l=r.slice(1),i=-1!=["p","dl","div","math","table","ul","del","form","blockquote","figure","ol","fieldset","h1","h6","pre","script","h5","noscript","style","iframe","h4","ins","h3","h2"].indexOf(l.toLowerCase())?l.toLowerCase():""),!i){if(r.length>5&&"!"==r[1]&&"-"==r[2]&&"-"==r[3]){for(s=5;s<r.length&&("-"!=r[s-2]||"-"!=r[s-1]||">"!=r[s]);)s++;if(++s<size&&(o=Ye(r.slice(s))),o)return c.s=r.slice(0,s+o),n&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),c.s.length}if(r.length>4&&("h"==r[1]||"H"==r[1])&&("r"==r[2]||"R"==r[2])){for(s=3;s<r.length&&">"!=r[s];)s++;if(s+1<r.length&&(s++,o=Ye(r.slice(s))))return c.s=r.slice(0,s+o),n&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),c.s.length}return 0}if(s=1,a=0,"ins"!=i&&"del"!=i){var u=i.length;for(s=1;s<r.length;){for(s++;s<r.length&&("<"!=r[s-1]||"/"!=r[s]);)s++;if(s+2+u>=r.length)break;if(o=ft(tag,0,r.slice(s-1))){s+=o-1,a=1;break}}}return a?(c.s=c.s.slice(0,s),n&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),s):0}function ht(e,t,r){var n,s,a=r.length,l=0,o="",i=new Xe;for(t.blockStack.push(i),n=0;n<a;){for(l=n+1;l<a&&"\n"!=r[l-1];l++);if(s=at(r.slice(n,l)))n+=s;else if(Ye(r.slice(n,l))&&(l>=a||0==at(r.slice(l))&&!Ye(r.slice(l))))break;n<l&&(o+=r.slice(n,l),l-n),n=l}return wt(i,t,o),t.callbacks.blockquote&&t.callbacks.blockquote(e,i,t.context),t.blockStack.pop(),l}function gt(e,t,r){for(var s=0,a=0,l=0,o=r.length,i=new Xe(r);s<o;){for(a=s+1;a<o&&"\n"!=r[a-1];a++);if(0!=at(r.slice(s,a))){a=s;break}var c=r.slice(s);if(Ye(c)||0!=(l=nt(c)))break;if(Ye(c))break;if(0!=(l=nt(c)))break;if(rt(t,c)||Ve(c)||at(c)){a=s;break}if(t.extensions&Oe&&!n(r[s])){if(ot(c)||it(c)){a=s;break}if("<"==r[s]&&t.callbacks.blockhtml&&dt(e,t,c,0)){a=s;break}if(0!=(t.extensions&&Te)&&0!=Je(c,null)){a=s;break}}s=a}for(var u=s;u&&"\n"==r[u-1];)u--;if(i.s=i.s.slice(0,u),l){var f;if(i.size){var d;for(s=i.s.length;u&&"\n"!=r[u];)u-=1;for(d=u+1;u&&"\n"==r[u-1];)u-=1;if(i.s=i.s.slice(0,u),u>0){h=new Xe;t.blockStack.push(h),ct(h,t,i.s),t.callbacks.paragraph&&t.callbacks.paragraph(e,h,t.context),t.blockStack.pop(),i.s=i.s.slice(d,s)}else i.s=i.s.slice(0,s)}f=new Xe,t.spanStack.push(f),ct(f,t,i.s),t.callbacks.header&&t.callbacks.header(e,f,l,t.context),t.spanStack.pop()}else{var h=new Xe;t.blockStack.push(h),ct(h,t,i.s),t.callbacks.paragraph&&t.callbacks.paragraph(e,h,t.context),t.blockStack.pop()}return a}function pt(e,t,r){var n,s,a=null,l=new Xe;if(0==(n=Je(r,l)))return 0;for(a=new Xe,t.blockStack.push(a);n<r.length;){var o,i=new Xe;if(0!=(o=Je(r.slice(n),i))&&0==i.s.length){n+=o;break}for(s=n+1;s<r.length&&"\n"!=r[s-1];s++);if(n<s){var c=r.slice(n,s);Ye(c)?a.s+="\n":a.s+=c}n=s}return a.s.length&&"\n"!=a.s[a.s.length-1]&&(a.s+="\n"),t.callbacks.blockcode&&t.callbacks.blockcode(e,a,l.s.length?l:null,t.context),t.blockStack.pop(),n}function bt(e,t,r){var n,s,a,l=r.length,o=null;for(t.blockStack.push(o=new Xe),n=0;n<l;){for(s=n+1;s<l&&"\n"!=r[s-1];s++);if(a=lt(r.slice(n,s)))n+=a;else if(!Ye(r.slice(n,s)))break;n<s&&(Ye(r.slice(n,s))?o.s+="\n":o.s+=r.slice(n,s)),n=s}for(var i=o.s.length;i&&"\n"==o.s[i-1];)i-=1;return o.s=o.s.slice(0,i),o.s+="\n",t.callbacks.blockcode&&t.callbacks.blockcode(e,o,null,t.context),t.blockStack.pop(),n}function mt(e,t,r,n){for(var s,a,l,o,i=r.length,c=null,u=0,f=0,d=0,h=0,g=0,p=0;d<3&&d<i&&" "==r[d];)d++;if((u=it(r))||(u=ot(r)),!u)return 0;for(a=u;a<i&&"\n"!=r[a-1];)a++;for(t.spanStack.push(c=new Xe),t.spanStack.push(s=new Xe),c.s+=r.slice(u,a),u=a;u<i;){var b,m;for(a++;a<i&&"\n"!=r[a-1];)a++;if(Ye(r.slice(u,a)))h=1,u=a;else{for(o=0;o<4&&u+o<a&&" "==r[u+o];)o++;if(l=o,t.flags&Te&&0!=Je(r.slice(u+o,a),null)&&(p=!p),p||(b=it(r.slice(u+o,a)),m=ot(r.slice(u+o,a))),h&&(n.p&se&&b||!(n.p&se)&&m)){n.p|=le;break}if(b&&!Ve(r.slice(u+o,a))||m){if(h&&(g=1),l==d)break;f||(f=c.s.length)}else{if(h&&0==l){n.p|=le;break}h&&(c.s+="\n",g=1)}h=0,c.s+=r.slice(u+o,a),u=a}}return g&&(n.p|=ae),n.p&ae?f&&f<c.s.length?(wt(s,t,c.s.slice(0,f)),wt(s,t,c.s.slice(f))):wt(s,t,c.s):f&&f<c.s.length?(ct(s,t,c.s.slice(0,f)),wt(s,t,c.s.slice(f))):ct(s,t,c.s),t.callbacks.listitem&&t.callbacks.listitem(e,s,n.p,t.context),t.spanStack.pop(),t.spanStack.pop(),u}function vt(e,t,r,n){var s,a,l=r.length,o=0;for(t.blockStack.push(a=new Xe);o<l;){var i={p:n};if(s=mt(a,t,r.slice(o),i),n=i.p,o+=s,!s||n&le)break}return t.callbacks.list&&t.callbacks.list(e,a,n,t.context),t.blockStack.pop(),o}function kt(e,r,n,s,a){var l,o,i,c=0;if(r.callbacks.table_cell&&r.callbacks.table_row){for(r.spanStack.push(i=new Xe),c<n.length&&"|"==n[c]&&c++,l=0;l<s.length&&c<n.length;++l){var u,f,d;for(r.spanStack.push(d=new Xe);c<n.length&&t(n[c]);)c++;for(u=c;c<n.length&&"|"!=n[c];)c++;for(f=c-1;f>u&&t(n[f]);)f--;ct(d,r,n.slice(u,1+f)),r.callbacks.table_cell(i,d,s[l]|a,r.context,0),r.spanStack.pop(),c++}if((o=s.length-l)>0){r.callbacks.table_cell(i,null,s[l]|a,r.context,o)}r.callbacks.table_row(e,i,r.context),r.spanStack.pop()}}function xt(e,r,n){var s,a,l,o={p:null};if(r.spanStack.push(a=new Xe),r.blockStack.push(l=new Xe),s=function(e,r,n,s){for(var a,l,o,i=0,c=0;i<n.length&&"\n"!=n[i];)"|"==n[i++]&&c++;if(i==n.length||0==c)return 0;for(l=i;l>0&&t(n[l-1]);)l--;if("|"==n[0]&&c--,l&&"|"==n[l-1]&&c--,c+1>r.maxTableCols)return 0;s.p=new Array(c+1);for(var u=0;u<s.p.length;u++)s.p[u]=0;for(++i<n.length&&"|"==n[i]&&i++,o=i;o<n.length&&"\n"!=n[o];)o++;for(a=0;a<s.p.length&&i<o;++a){for(var f=0;i<o&&" "==n[i];)i++;for(":"==n[i]&&(i++,s.p[a]|=He,f++);i<o&&"-"==n[i];)i++,f++;for(i<o&&":"==n[i]&&(i++,s.p[a]|=ze,f++);i<o&&" "==n[i];)i++;if(i<o&&"|"!=n[i])break;if(f<1)break;i++}return a<s.p.length?0:(kt(e,r,n.slice(0,l),s.p,Ke),o+1)}(a,r,n,o),s>0){for(;s<n.length;){var i,c=0;for(i=s;s<n.length&&"\n"!=n[s];)"|"==n[s++]&&c++;if(0==c||s==n.length){s=i;break}kt(l,r,n.slice(i,s),o.p,0),s++}r.callbacks.table&&r.callbacks.table(e,a,l,r.context)}return r.spanStack.pop(),r.blockStack.pop(),s}function wt(e,t,r){var n,s,a=0;if(!(t.spanStack.length+t.blockStack.length>t.nestingLimit))for(;a<r.length;)if(s=r.slice(a),r.length-a,rt(t,s))a+=ut(e,t,s);else if("<"==r[a]&&t.callbacks.blockhtml&&0!=(n=dt(e,t,s,1)))a+=n;else if(0!=(n=Ye(s)))a+=n;else if(Ve(s)){for(t.callbacks.hrule&&t.callbacks.hrule(e,t.context);a<r.length&&"\n"!=r[a];)a++;a++}else 0!=(t.extensions&Te)&&0!=(n=pt(e,t,s))||0!=(t.extensions&Ce)&&0!=(n=xt(e,t,s))?a+=n:at(s)?a+=ht(e,t,s):lt(s)?a+=bt(e,t,s):it(s)?a+=vt(e,t,s,0):ot(s)?a+=vt(e,t,s,se):a+=gt(e,t,s)}function _t(e,t,r,n){var s,a,l,o,i,c,u,f=0;if(t+3>=r)return 0;if(" "==e[t]&&(f=1," "==e[t+1]&&(f=2," "==e[t+2]&&(f=3," "==e[t+3]))))return 0;if("["!=e[f+=t])return 0;for(s=++f;f<r&&"\n"!=e[f]&&"\r"!=e[f]&&"]"!=e[f];)f++;if(f>=r||"]"!=e[f])return 0;if(a=f,++f>=r||":"!=e[f])return 0;for(f++;f<r&&" "==e[f];)f++;for(f<r&&("\n"==e[f]||"\r"==e[f])&&++f<r&&"\r"==e[f]&&"\n"==e[f-1]&&f++;f<r&&" "==e[f];)f++;if(f>=r)return 0;for("<"==e[f]&&f++,l=f;f<r&&" "!=e[f]&&"\n"!=e[f]&&"\r"!=e[f];)f++;for(o=">"==e[f-1]?f-1:f;f<r&&" "==e[f];)f++;if(f<r&&"\n"!=e[f]&&"\r"!=e[f]&&"'"!=e[f]&&'"'!=e[f]&&"("!=e[f])return 0;if(u=0,(f>=r||"\r"==e[f]||"\n"==e[f])&&(u=f),f+1<r&&"\n"==e[f]&&"\r"==e[f+1]&&(u=f+1),u)for(f=u+1;f<r&&" "==e[f];)f++;if(i=c=0,f+1<r&&("'"==e[f]||'"'==e[f]||"("==e[f])){for(i=++f;f<r&&"\n"!=e[f]&&"\r"!=e[f];)f++;for(c=f+1<r&&"\n"==e[f]&&"\r"==e[f+1]?f+1:f,f-=1;f>i&&" "==e[f];)f-=1;f>i&&("'"==e[f]||'"'==e[f]||")"==e[f])&&(u=c,c=f)}if(!u||o==l)return 0;var d=e.slice(s,a),h=e.slice(l,o),g=null;return c>i&&(g=e.slice(i,c)),n.refs[d]={id:d,link:new Xe(h),title:new Xe(g)},u}function yt(e,t){for(var r=0,n=0;r<t.length;){for(var s=r;r<t.length&&"\t"!=t[r];)r++,n++;if(r>s&&(e.s+=t.slice(s,r)),r>=t.length)break;do{e.s+=" ",n++}while(n%4);r++}}Xe.prototype.truncate=function(e){if(this.s.length<e)throw new RangeError("Buffer smaller than desired size");if(e<0)throw new RangeError("Size argument is negative");this.s=this.s.slice(0,e)},We.prototype.getChar=function(e){var t=this.offset+e;if(t>=this.s.length||t<0)throw new RangeError("Character index out of bounds");return this.s.slice(t,t+1)},We.prototype.toString=function(){return this.s.slice(this.offset)},Ge.prototype.render=function(e){var t,r=new Xe,n=0;for(this.refs={};n<e.length;)if(t=_t(e,n,e.length,this))n=t;else{for(t=n;t<e.length&&"\n"!=e[t]&&"\r"!=e[t];)t++;for(t>n&&yt(r,e.slice(n,t));t<e.length&&("\n"==e[t]||"\r"==e[t]);)("\n"==e[t]||t+1<e.length&&"\n"!=e[t+1])&&(r.s+="\n"),t++;n=t}var s=new Xe;return this.callbacks.doc_header&&this.callbacks.doc_header(s,this.context),r.s.length&&("\n"!=r.s[r.s.length-1]&&"\r"!=r.s[r.s.length-1]&&(r.s+="\n"),wt(s,this,r.s)),this.callbacks.doc_footer&&this.callbacks.doc_footer(s,this.context),s.s},e.getParser=function(e,t,r,n){var s=new Ge;e&&(s.callbacks=e.callbacks),r&&(s.nestingLimit=r),r&&(s.maxTableCols=n),e&&(s.context=e.context),null!=t&&null!=t&&(s.extensions=t);var a=s.callbacks;return(a.emphasis||a.double_emphasis||a.triple_emphasis)&&(s.activeChars["*"]=ie,s.activeChars._=ie,16&s.extensions&&(s.activeChars["~"]=ie)),a.codespan&&(s.activeChars["`"]=ce),a.linebreak&&(s.activeChars["\n"]=ue),(a.image||a.link)&&(s.activeChars["["]=fe),s.activeChars["<"]=de,s.activeChars["\\"]=he,s.activeChars["&"]=ge,8&s.extensions&&(512&s.extensions||(s.activeChars["@"]=be),s.activeChars[":"]=pe,s.activeChars.w=me,s.activeChars["/"]=ve),128&s.extensions&&(s.activeChars["^"]=ke),s};var St=Ee|Ae|$e|Pe|Re,Ct=Ee|$e|Be|Pe|Re,Tt=["colspan","rowspan","cellspacing","cellpadding","scope"],Lt=["tr","th","td","table","tbody","thead","tfoot","caption"];e.DEFAULT_HTML_ELEMENT_WHITELIST=Lt,e.DEFAULT_HTML_ATTR_WHITELIST=Tt,e.DEFAULT_BODY_FLAGS=St,e.DEFAULT_WIKI_FLAGS=Ct,e.HTML_SKIP_HTML=Ee,e.HTML_SKIP_STYLE=je,e.HTML_SKIP_IMAGES=Ae,e.HTML_SKIP_LINKS=Me,e.HTML_EXPAND_TABS=16,e.HTML_SAFELINK=$e,e.HTML_TOC=De,e.HTML_HARD_WRAP=Ie,e.HTML_USE_XHTML=Re,e.HTML_ESCAPE=Pe,e.HTML_ALLOW_ELEMENT_WHITELIST=Be,e.MKDEXT_NO_INTRA_EMPHASIS=Se,e.MKDEXT_TABLES=Ce,e.MKDEXT_FENCED_CODE=Te,e.MKDEXT_AUTOLINK=8,e.MKDEXT_STRIKETHROUGH=16,e.MKDEXT_SPACE_HEADERS=Le,e.MKDEXT_SUPERSCRIPT=128,e.MKDEXT_LAX_SPACING=Oe,e.MKDEXT_NO_EMAIL_AUTOLINK=512,e.SD_AUTOLINK_SHORT_DOMAINS=xe,e.MKDA_NOT_AUTOLINK=we,e.MKDA_NORMAL=_e,e.MKDA_EMAIL=ye,"function"==typeof define&&define("snuownd",[],e)}((()=>{const e="undefined"!=typeof window?window:"undefined"!=typeof globalThis?globalThis:{};return e.SnuOwnd||(e.SnuOwnd={}),e.SnuOwnd})());const oe=("undefined"!=typeof window?window:"undefined"!=typeof globalThis?globalThis:{}).SnuOwnd.getParser(),ie=a.Z.div`
  margin-bottom: ${P.lg};
  & h1 { margin: 0 0 ${P.sm} 0; font-size: 22px; }
  & p {
    color: var(--text-secondary);
    margin: ${P.xs} 0;
  }
`,ce=a.Z.div`
  & p { margin: 0 0 ${P.sm} 0; }
  & ul { margin: 0; padding-left: 1.4em; }
  & li { margin: ${P.xs} 0; color: var(--text-secondary); }
`;function ue(e,t,r){return t?r?N(e,r):`https://www.reveddit.com/info?id=${encodeURIComponent(e)}`:N(e)}!function(e){(0,D.createRoot)(document.getElementById("root")).render((0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(Z,{}),(0,n.jsx)(e,{})]}))}((function(){const[e,t]=(0,s.useState)([]),[r,a]=(0,s.useState)(null),[l,o]=(0,s.useState)(!1),d=()=>{chrome.storage.local.get(void 0,(e=>{chrome.storage.sync.get(void 0,(r=>{const n=r.other_subscriptions||{},{unseen:s,seen:l}=M("other",!1,r),d=[...new Set([...s,...l])];a(d.length?`https://www.reveddit.com/info?id=${d.join(",")}&removal_status=all`:null);const h=[];c(n,"t").forEach((([t,r])=>{const n=r.t||0,s=((e,t,r,n)=>{const s=x("items",e,t);return s in n&&r in n[s]?new u({object:n[s][r]}):""})("other",!1,t,e),a=i(t),l=a?"comment":"post";let o,c="",d="",g="",p=0;if(s&&"string"!=typeof s){const e=s,t=(e.getText()||"").trim(),r=(e.getBody?.()||"").trim();g=e.getSubreddit?.()||"",p=e.getCreatedUTC()||0,o=e.getPostID?.(),a?d=t:(c=t,d=r)}h.push({id:t,contentType:l,subreddit:g,title:c,body:d,subscribedUTC:n,createdUTC:p,formattedSubscribed:f(n),formattedSubscribedFull:new Date(1e3*n).toString(),formattedCreated:p?f(p):"",formattedCreatedFull:p?new Date(1e3*p).toString():"",href:ue(t,a,o),revedditHref:`https://www.reveddit.com/info?id=${encodeURIComponent(t)}`})})),t(h),o(!0)}))}))};(0,s.useEffect)((()=>{d()}),[]);const h=e=>{((e,t=(()=>{}))=>{(C()?T("unsubscribeId",e):j(e)).then((()=>t()),(()=>{}))})(e,(()=>{t((t=>t.filter((t=>t.id!==e))))}))};return(0,n.jsxs)(le,{children:[(0,n.jsxs)(ie,{children:[(0,n.jsx)("h1",{children:"Other subscriptions"}),(0,n.jsx)("p",{children:"Up to 100 items. When the list is full, the least-recently subscribed items are dropped. Subscribing to a post only tracks the post itself, not its comments."}),r&&(0,n.jsx)("p",{children:(0,n.jsx)(F,{href:r,target:"_blank",rel:"noreferrer",children:"View all current statuses on reveddit ↗"})})]}),l&&0===e.length&&(0,n.jsx)(V,{children:(0,n.jsxs)(ce,{children:[(0,n.jsx)("p",{children:'No "other" subscriptions yet. To subscribe:'}),(0,n.jsxs)("ul",{children:[(0,n.jsx)("li",{children:'Click the bell on new reddit, or "subscribe-rev" on old reddit, beneath any comment or post'}),(0,n.jsx)("li",{children:'Right-click a Reddit or reveddit link and choose "reveddit subscribe"'}),(0,n.jsx)("li",{children:'Open the reveddit extension popup on a Reddit page and toggle "subscribe to comment/post"'})]})]})}),e.map((e=>{return(0,n.jsxs)(V,{children:[(0,n.jsx)(J,{children:(0,n.jsxs)("span",{style:{color:"var(--text-secondary)",fontSize:"0.9em"},children:[e.contentType,e.subreddit&&(0,n.jsxs)(n.Fragment,{children:[" in ",(0,n.jsxs)(ne,{children:["r/",e.subreddit]})]})]})}),(0,n.jsxs)(Q,{children:[(0,n.jsxs)("span",{title:e.formattedSubscribedFull,children:["subscribed ",e.formattedSubscribed]}),e.formattedCreated&&(0,n.jsxs)("span",{title:e.formattedCreatedFull,children:["created ",e.formattedCreated]})]}),e.title&&(0,n.jsx)(se,{children:e.title}),e.body&&(0,n.jsx)(ee,{children:(0,n.jsx)(ae,{className:"md-body",dangerouslySetInnerHTML:{__html:(t=e.body,oe.render((t||"").replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<")).replace(/href="\//g,'href="https://www.reddit.com/'))}})}),(0,n.jsxs)(te,{children:[(0,n.jsx)(F,{href:e.href,target:"_blank",rel:"noreferrer",children:"Open on Reddit ↗"}),(0,n.jsx)(X,{href:e.revedditHref,target:"_blank",rel:"noreferrer",children:"View on reveddit ↗"}),(0,n.jsx)(G,{variant:"ghost",onClick:()=>h(e.id),children:"unsubscribe"})]})]},e.id);var t}))]})}))}},s={};function a(e){var t=s[e];if(void 0!==t)return t.exports;var r=s[e]={exports:{}};return n[e].call(r.exports,r,r.exports,a),r.exports}a.m=n,e=[],a.O=(t,r,n,s)=>{if(!r){var l=1/0;for(u=0;u<e.length;u++){for(var[r,n,s]=e[u],o=!0,i=0;i<r.length;i++)(!1&s||l>=s)&&Object.keys(a.O).every((e=>a.O[e](r[i])))?r.splice(i--,1):(o=!1,s<l&&(l=s));if(o){e.splice(u--,1);var c=n();void 0!==c&&(t=c)}}return t}s=s||0;for(var u=e.length;u>0&&e[u-1][2]>s;u--)e[u]=e[u-1];e[u]=[r,n,s]},a.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return a.d(t,{a:t}),t},r=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,a.t=function(e,n){if(1&n&&(e=this(e)),8&n)return e;if("object"==typeof e&&e){if(4&n&&e.__esModule)return e;if(16&n&&"function"==typeof e.then)return e}var s=Object.create(null);a.r(s);var l={};t=t||[null,r({}),r([]),r(r)];for(var o=2&n&&e;"object"==typeof o&&!~t.indexOf(o);o=r(o))Object.getOwnPropertyNames(o).forEach((t=>l[t]=()=>e[t]));return l.default=()=>e,a.d(s,l),s},a.d=(e,t)=>{for(var r in t)a.o(t,r)&&!a.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},a.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),a.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},a.j=576,a.p="",(()=>{a.b=document.baseURI||self.location.href;var e={576:0};a.O.j=t=>0===e[t];var t=(t,r)=>{var n,s,[l,o,i]=r,c=0;if(l.some((t=>0!==e[t]))){for(n in o)a.o(o,n)&&(a.m[n]=o[n]);if(i)var u=i(a)}for(t&&t(r);c<l.length;c++)s=l[c],a.o(e,s)&&e[s]&&e[s][0](),e[s]=0;return a.O(u)},r=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})();var l=a.O(void 0,[736],(()=>a(435)));l=a.O(l)})();