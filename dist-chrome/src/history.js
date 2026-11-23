(()=>{"use strict";var e,t,r,n={606:(e,t,r)=>{var n=r(893),o=r(294),a=r(206);const s={1:"mod removed",6:"user deleted",2:"approved",3:"locked",4:"unlocked",5:"edited"};const l=e=>e.replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/[^\S\n]+/g," ").substr(0,1e4),i=e=>"t1"===e.substr(0,2);class c{constructor({id:e=null,observed_utc:t=null,change_type:r=null,seen_count:n=null,object:o=null}){o?(this.i=o.i,this.o=o.o,this.g=o.g,this.n=o.n):(this.i=e,this.o=t,this.g=r,this.n=n)}getID(){return this.i}getObservedUTC(){return this.o}getChangeType(){return s[this.g]}getSeenCount(){return this.n}}class u{constructor({item:e=null,observed_utc:t=null,object:r=null}){if(r)this.t=r.t,this.o=r.o,this.c=r.c,this.n=r.n||0,this.r=r.r||0,void 0!==r.ln&&(this.ln=r.ln),void 0!==r.lr&&(this.lr=r.lr),void 0!==r.p&&(this.p=r.p),void 0!==r.b&&(this.b=r.b),void 0!==r.s&&(this.s=r.s);else{let r="";e&&i(e.name)?r=l(e.body||""):e&&(r=e.title||""),this.t=r,this.o=t,this.c=e?e.created_utc:0,this.n=0,this.r=0,e&&i(e.name)&&e.link_id&&(this.p=e.link_id),e&&!i(e.name)&&e.selftext&&(this.b=l(e.selftext)),e&&e.subreddit&&(this.s=e.subreddit)}}setText(e){this.t=l(e)}getText(){return this.t}getBody(){return this.b}getSubreddit(){return this.s}getObservedUTC(){return this.o}getCreatedUTC(){return this.c}getPostID(){return this.p}getCount(e){return this[e]||0}resetCount(e){this[e]=0}incrementCount(e){const t=this.getCount(e)+1;return this[e]=t,t}}const d=e=>{const t=[[60,"second","seconds"],[60,"minute","minutes"],[24,"hour","hours"],[7,"day","days"],[365/12/7,"week","weeks"],[12,"month","months"],[10,"year","years"],[10,"decade","decades"],[10,"century","centuries"],[10,"millenium","millenia"]];if(e<60)return e+" seconds";let r=e;for(let e=0;e<t.length;e++){let n=t[e][0],o=t[e][1],a=t[e][2];if(r<n){let n=r-Math.floor(r),s=Math.round(n*t[e-1][0]);if(t[e-1][0]===s&&(r+=1,s=0),(Math.floor(r)>1||0==Math.floor(r))&&(o=a),e>1&&s>0){let r=t[e-1][1];s>1&&(r=t[e-1][2]),o+=", "+String(s)+" "+r}return String(Math.floor(r))+" "+o}r/=n}},f=e=>{const t=Math.floor((new Date).getTime()/1e3)-e;return d(t)+" ago"};var h=r(150),g=r.n(h);new Set(["cycle","auth","feed","ratelimit","news","ui"]);new Set;const p={tokenFields:["jsc_token","token"],solutionRegex:'await\\(async e=>e\\+e\\)\\("([^"]*)"\\)'};const b={commentIdAttributes:["thingId","thing-id"],postIdAttributes:["id"],postBannerSlots:["post-removed-banner"],commentButtonSlots:["comment-share"],postButtonSlots:["action-row-whitespace"]};const m={paths:["/login","/account/login","/register","/account/register"],markers:[]};new Map;const v=(e,t,r)=>e+(r?"_u_":"_")+t,k="own_items_check",x=(e,t,r=(e=>e))=>g().storage.local.get({[e]:t}).then((n=>r(n[e]||t))),w="reveddit:followed",y="notification_log",_=(e,t,r,n)=>{const o=v("items",e,t);return o in n&&r in n[o]?new u({object:n[o][r]}):""};var S=r(745),C=r(917);const j={sm:"4px",md:"6px",lg:"8px",pill:"999px"},T={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px"},L={body:'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},$=C.iv`
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
`,O=C.iv`
    html,
    body {
        margin: 0;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family: ${L.body};
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
        margin: ${T.md} 0;
    }

    h1,
    h2,
    h3,
    h4 {
        color: var(--text-primary);
    }
    h1 {
        font-size: 22px;
        margin: 0 0 ${T.lg} 0;
    }
    h2 {
        font-size: 18px;
        margin: 0 0 ${T.md} 0;
    }
    h3 {
        font-size: 16px;
        margin: 0 0 ${T.sm} 0;
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
        border-radius: ${j.sm};
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
`,E=C.iv`
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
        border-radius: ${j.md};
    }
    .md-body code {
        background: var(--code-bg);
        border: 1px solid var(--code-border);
        border-radius: 3px;
        padding: 0 4px;
        font-family: ${L.mono};
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
`,A="ui_theme";function M(e){document.documentElement.setAttribute("data-theme",function(e){return"auto"===e?window.matchMedia?.("(prefers-color-scheme: light)").matches?"light":"dark":e}(e))}function D(){return(0,o.useEffect)((()=>{try{chrome.storage.local.get([A],(e=>{M(e?.[A]||"auto")}))}catch{M("auto")}const e=window.matchMedia?.("(prefers-color-scheme: light)"),t=()=>{try{chrome.storage.local.get([A],(e=>{"auto"===(e?.[A]||"auto")&&M("auto")}))}catch(e){}};e?.addEventListener?.("change",t);const r=(e,t)=>{"local"===t&&e[A]&&M(e[A].newValue||"auto")};return chrome.storage.onChanged.addListener(r),()=>{e?.removeEventListener?.("change",t),chrome.storage.onChanged.removeListener(r)}}),[]),(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(C.xB,{styles:$}),(0,n.jsx)(C.xB,{styles:O}),(0,n.jsx)(C.xB,{styles:E})]})}const I=a.Z.a`
    color: var(--link);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,R=a.Z.a`
    color: var(--text-secondary);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,U=a.Z.button`
    display: block;
    width: 100%;
    margin-top: 6px;
    padding: 8px 10px;
    background: var(--accent);
    color: var(--text-on-accent);
    border: 0;
    border-radius: ${j.md};
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
`,Z=((0,a.Z)(U)`
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
    border-radius: ${j.md};
    font-size: 0.92em;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
    ${e=>{switch(e.variant){case"secondary":return C.iv`
                    background: var(--button-bg);
                    color: var(--button-text);
                    border-color: var(--border);
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;case"ghost":return C.iv`
                    background: transparent;
                    color: var(--link);
                    border-color: transparent;
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;default:return C.iv`
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
`),z={warning:["var(--locked-bg)","var(--locked-border)","var(--text-primary)"],success:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],info:["var(--bg-surface)","var(--border)","var(--text-secondary)"]},P=(a.Z.div`
    padding: 10px 12px;
    margin: 6px 0;
    border-radius: ${j.md};
    font-size: 0.92em;
    ${e=>{const[t,r,n]=z[e.variant]??z.info;return C.iv`
            background: ${t};
            border: 1px solid ${r};
            color: ${n};
        `}}
`,a.Z.div`
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: ${j.lg};
    padding: ${T.md} ${T.lg};
    margin-bottom: ${T.md};
    transition: border-color 0.15s ease;
    &:hover {
        border-color: var(--border-light);
    }
`),H=a.Z.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${T.sm};
    margin-bottom: ${T.xs};
`,N=a.Z.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${T.sm};
    color: var(--text-secondary);
    font-size: 0.85em;
    margin-bottom: ${T.sm};
    & > span + span::before {
        content: '·';
        margin-right: ${T.sm};
        color: var(--text-muted);
    }
`,B=a.Z.div`
    color: var(--text-primary);
    font-size: 0.95em;
`,K=a.Z.div`
    display: flex;
    gap: ${T.sm};
    margin-top: ${T.sm};
    padding-top: ${T.sm};
    border-top: 1px solid var(--border);
`,q={removed:["var(--removed-bg)","var(--removed-border)","var(--removed-text)"],deleted:["var(--deleted-bg)","var(--deleted-border)","var(--deleted-text)"],approved:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],locked:["var(--locked-bg)","var(--locked-border)","var(--text-primary)"],unlocked:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],edited:["var(--bg-surface-hover)","var(--border)","var(--text-primary)"],default:["var(--bg-surface-hover)","var(--border)","var(--text-secondary)"]},F=a.Z.span`
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: ${j.pill};
    font-weight: 700;
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    border: 1px solid transparent;
    ${e=>{const[t,r,n]=q[e.variant??"default"]??q.default;return C.iv`
            background: ${t};
            border-color: ${r};
            color: ${n};
        `}}
`,X=(a.Z.h2`
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin: ${T.lg} 0 ${T.sm} 0;
    padding-bottom: ${T.xs};
    border-bottom: 1px solid var(--border);
`,a.Z.span`
    color: var(--author);
    font-weight: 600;
`),W=a.Z.span`
    color: var(--text-secondary);
`,Y=a.Z.h3`
    margin: ${T.xs} 0 ${T.sm} 0;
    color: var(--text-primary);
`,G=a.Z.div`
    font-size: 0.95em;
`,V=a.Z.div`
    max-width: 820px;
    margin: 0 auto;
    padding: ${T.xl} ${T.lg};
`;function J(e,t){const r=`https://www.reddit.com/comments/${(t??e).substring(3)}`;return t?`${r}/-/${e.substring(3)}?context=3`:r}const Q=async(e,t)=>{try{return(await g().storage.local.get({[e]:t}))[e]||t}catch{return t}},ee=(new Set([429]),"viewer_connect"),te=async()=>{const e=await Q(ee,null);return e&&Number(e.started)>0&&Array.isArray(e.main)?e:null};Promise.resolve();!function(e){function t(e){return" "==e||"\n"==e}function r(e){return/[\x09-\x0d ]/.test(e)}function n(e){return/[A-Za-z0-9]/.test(e)}function o(e){return/[A-Za-z]/.test(e)}function a(e){return/[0-9]/.test(e)}function s(e){return/[0-9a-fA-F]/.test(e)}function l(e){return/[\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]/.test(e)}function i(e){var t="0123456789ABCDEF";return"%"+t[(240&e)>>4]+t[(15&e)>>0]}function c(e){var t=e.charCodeAt(0);if(t<128)return i(t);if(t>127&&t<2048){var r=i(t>>6&255|192);return r+=i(t>>0&63|128)}r=i(t>>12&255|224);return r+=i(t>>6&63|128),r+=i(t>>0&63|128)}function u(e,t){var n,o=0,a=e.length;if(a<3||"<"!=e[0])return Ke;"/"==e[n=1]&&(o=1,n++);for(var s=0;n<a&&!(s>=t.length);++n,++s)if(e[n]!=t[s])return Ke;return n==a?Ke:r(e[n])||">"==e[n]?o?Fe:qe:Ke}function d(e,t){for(var r,n=0;n<t.s.length;){for(r=n;n<t.s.length&&"\\"!=t.s[n];)n++;if(n>r&&(e.s+=t.s.slice(r,n)),n+1>=t.s.length)break;e.s+=t.s[n+1],n+=2}}var f=1114111;var h=["&AElig;","&Aacute;","&Acirc;","&Agrave;","&Alpha;","&Aring;","&Atilde;","&Auml;","&Beta;","&Ccedil;","&Chi;","&Dagger;","&Delta;","&ETH;","&Eacute;","&Ecirc;","&Egrave;","&Epsilon;","&Eta;","&Euml;","&Gamma;","&Iacute;","&Icirc;","&Igrave;","&Iota;","&Iuml;","&Kappa;","&Lambda;","&Mu;","&Ntilde;","&Nu;","&OElig;","&Oacute;","&Ocirc;","&Ograve;","&Omega;","&Omicron;","&Oslash;","&Otilde;","&Ouml;","&Phi;","&Pi;","&Prime;","&Psi;","&Rho;","&Scaron;","&Sigma;","&THORN;","&Tau;","&Theta;","&Uacute;","&Ucirc;","&Ugrave;","&Upsilon;","&Uuml;","&Xi;","&Yacute;","&Yuml;","&Zeta;","&aacute;","&acirc;","&acute;","&aelig;","&agrave;","&alefsym;","&alpha;","&amp;","&and;","&ang;","&apos;","&aring;","&asymp;","&atilde;","&auml;","&bdquo;","&beta;","&brvbar;","&bull;","&cap;","&ccedil;","&cedil;","&cent;","&chi;","&circ;","&clubs;","&cong;","&copy;","&crarr;","&cup;","&curren;","&dArr;","&dagger;","&darr;","&deg;","&delta;","&diams;","&divide;","&eacute;","&ecirc;","&egrave;","&empty;","&emsp;","&ensp;","&epsilon;","&equiv;","&eta;","&eth;","&euml;","&euro;","&exist;","&fnof;","&forall;","&frac12;","&frac14;","&frac34;","&frasl;","&gamma;","&ge;","&gt;","&hArr;","&harr;","&hearts;","&hellip;","&iacute;","&icirc;","&iexcl;","&igrave;","&image;","&infin;","&int;","&iota;","&iquest;","&isin;","&iuml;","&kappa;","&lArr;","&lambda;","&lang;","&laquo;","&larr;","&lceil;","&ldquo;","&le;","&lfloor;","&lowast;","&loz;","&lrm;","&lsaquo;","&lsquo;","&lt;","&macr;","&mdash;","&micro;","&middot;","&minus;","&mu;","&nabla;","&nbsp;","&ndash;","&ne;","&ni;","&not;","&notin;","&nsub;","&ntilde;","&nu;","&oacute;","&ocirc;","&oelig;","&ograve;","&oline;","&omega;","&omicron;","&oplus;","&or;","&ordf;","&ordm;","&oslash;","&otilde;","&otimes;","&ouml;","&para;","&part;","&permil;","&perp;","&phi;","&pi;","&piv;","&plusmn;","&pound;","&prime;","&prod;","&prop;","&psi;","&quot;","&rArr;","&radic;","&rang;","&raquo;","&rarr;","&rceil;","&rdquo;","&real;","&reg;","&rfloor;","&rho;","&rlm;","&rsaquo;","&rsquo;","&sbquo;","&scaron;","&sdot;","&sect;","&shy;","&sigma;","&sigmaf;","&sim;","&spades;","&sub;","&sube;","&sum;","&sup1;","&sup2;","&sup3;","&sup;","&supe;","&szlig;","&tau;","&there4;","&theta;","&thetasym;","&thinsp;","&thorn;","&tilde;","&times;","&trade;","&uArr;","&uacute;","&uarr;","&ucirc;","&ugrave;","&uml;","&upsih;","&upsilon;","&uuml;","&weierp;","&xi;","&yacute;","&yen;","&yuml;","&zeta;","&zwj;","&zwnj;"],g=[7,7,7,7,7,7,7,7,7,0,0,7,7,0,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,0,0,1,0,0,0,2,3,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,5,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],p=["","&quot;","&amp;","&#39;","&#47;","&lt;","&gt;",""];function b(e,t,r){for(var n,o=0,a=0;o<t.length;){for(n=o;o<t.length&&!(a=g[t.charCodeAt(o)]);)o++;if(o>n&&(e.s+=t.slice(n,o)),o>=t.length)break;"/"!=t[o]||r?7==g[t.charCodeAt(o)]||(e.s+=p[a]):e.s+="/",o++}}var m=[2,2,2,2,2,2,2,2,2,0,0,2,2,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,1,0,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];function v(e,t){for(var r,n=0;n<t.length;){for(r=n;n<t.length&&1===m[t.charCodeAt(n)];)n++;if(n>r&&(e.s+=t.slice(r,n)),n>=t.length)break;if(2!=m[t.charCodeAt(n)]){switch(t[n]){case"&":e.s+="&amp;";break;case"'":e.s+="&#x27;";break;default:e.s+=c(t[n])}n++}else n++}}function k(e,t,r,n,a){var s,l,i=e.slice(r),c=0;for(l=0;l<t;++l)if("<"==i[l]){t=l;break}for(;t>0;){var u=i[t-1];if("\0"===u)break;if(-1!=="?!.,".indexOf(u))t--;else{if(";"!==u)break;for(var d=t-2;d>0&&o(i[d]);)d--;d<t-2&&"&"==i[d]?t=d:t--}}if(0==t)return 0;switch(s=i[t-1]){case'"':c='"';break;case"'":c="'";break;case")":c="(";break;case"]":c="[";break;case"}":c="{"}if(0!=c){for(var f=0,h=0,g=0;g<t;)i[g]==c?h++:i[g]==s&&f++,g++;f!=h&&t--}return t}function x(e,t){var r,o=0;if(!n(e[0]))return 0;for(r=1;r<e.length-1;++r)if("."==e[r])o++;else if(!n(e[r])&&"-"!=e[r])break;return t||o?r:0}function w(e){var t,r=["http://","https://","ftp://","mailto://","/","git://","steam://","irc://","news://","mumble://","ssh://","ircs://","ts3server://","#"];for(t=0;t<r.length;++t){var n=r[t].length;if(e.length>n&&0==e.toLowerCase().indexOf(r[t])&&/[A-Za-z0-9#\/?]/.test(e[n]))return 1}return 0}function y(e,t,n,o,a){var s=t,i=new We(e,t);if(o<2||n<1||i.getChar(-1)!=a)return 0;if(n>1){var c=i.getChar(-2);return"/"==c?2:l(c)||r(c)?1:0}return s>2&&"/"==i.getChar(-2)&&"\\"==i.getChar(-3)?0:1}function _(e){if(e)for(var t in e)t in this&&(this[t]=e[t])}function S(e,t){this.callbacks=e,this.context=t}function C(){return{nofollow:0,target:null,tocData:{headerCount:0,currentLevel:0,levelOffset:0},toc_id_prefix:null,html_element_whitelist:Tt,html_attr_whitelist:jt,flags:0,link_attributes:function(e,t,r){r.nofollow&&(e.s+=' rel="nofollow"'),null!=r.target&&(e.s+=' target="'+r.target+'"')}}}function j(e){var t=C();t.flags=null==e?St:e;var r=new S(T(),t);return r.context.flags&Ee&&(r.callbacks.image=null),r.context.flags&Ae&&(r.callbacks.link=null,r.callbacks.autolink=null),(r.context.flags&$e||r.context.flags&Ue)&&(r.callbacks.blockhtml=null),r}function T(){return new _({blockcode:$,blockquote:O,blockhtml:E,header:A,hrule:M,list:D,listitem:I,paragraph:R,table:U,table_row:Z,table_cell:z,autolink:P,codespan:H,double_emphasis:N,emphasis:B,image:K,linebreak:q,link:F,raw_html_tag:W,triple_emphasis:Y,strikethrough:G,superscript:V,entity:null,normal_text:J,doc_header:null,doc_footer:te})}function L(){return new _({blockcode:null,blockquote:null,blockhtml:null,header:Q,hrule:null,list:null,listitem:null,paragraph:null,table:null,table_row:null,table_cell:null,autolink:null,codespan:H,double_emphasis:N,emphasis:B,image:null,linebreak:null,link:ee,raw_html_tag:null,triple_emphasis:Y,strikethrough:G,superscript:V,entity:null,normal_text:null,doc_header:null,doc_footer:re})}function $(e,t,n,o){if(e.s.length&&(e.s+="\n"),n&&n.s.length){var a,s;for(e.s+='<pre><code class="',a=0,s=0;a<n.s.length;++a,++s){for(;a<n.s.length&&r(n.s[a]);)a++;if(a<n.s.length){for(var l=a;a<n.s.length&&!r(n.s[a]);)a++;"."==n.s[l]&&l++,s&&(e.s+=" "),b(e,n.s.slice(l,a),!1)}}e.s+='">'}else e.s+="<pre><code>";t&&b(e,t.s,!1),e.s+="</code></pre>\n"}function O(e,t,r){e.s.length&&(e.s+="\n"),e.s+="<blockquote>\n",t&&(e.s+=t.s),e.s+="</blockquote>\n"}function E(e,t,r){var n,o;if(t){for(o=t.s.length;o>0&&"\n"==t.s[o-1];)o--;for(n=0;n<o&&"\n"==t.s[n];)n++;n>=o||(e.s.length&&(e.s+="\n"),e.s+=t.s.slice(n,o),e.s+="\n")}}function A(e,t,r,n){e.s.length&&(e.s+="\n"),n.flags&De?(e.s+="<h"+ +r+' id="',n.toc_id_prefix&&(e.s+=n.toc_id_prefix),e.s+="toc_"+n.tocData.headerCount+++'">'):e.s+="<h"+ +r+">",t&&(e.s+=t.s),e.s+="</h"+ +r+">\n"}function M(e,t){e.s.length&&(e.s+="\n"),e.s+=t.flags&Re?"<hr/>\n":"<hr>\n"}function D(e,t,r,n){e.s.length&&(e.s+="\n"),e.s+=r&oe?"<ol>\n":"<ul>\n",t&&(e.s+=t.s),e.s+=r&oe?"</ol>\n":"</ul>\n"}function I(e,t,r,n){if(e.s+="<li>",t){for(var o=t.s.length;o&&"\n"==t.s[o-1];)o--;e.s+=t.s.slice(0,o)}e.s+="</li>\n"}function R(e,t,n){var o=0;if(e.s.length&&(e.s+="\n"),t&&t.s.length){for(;o<t.s.length&&r(t.s[o]);)o++;if(o!=t.s.length){if(e.s+="<p>",n.flags&Ie)for(var a;o<t.s.length;){for(a=o;o<t.s.length&&"\n"!=t.data[o];)o++;if(o>a&&(e.s+=t.s.slice(a,o)),o>=t.s.length-1)break;q(e,n),o++}else e.s+=t.s.slice(o);e.s+="</p>\n"}}}function U(e,t,r,n){e.s.length&&(e.s+="\n"),e.s+="<table><thead>\n",t&&(e.s+=t.s),e.s+="</thead><tbody>\n",r&&(e.s+=r.s),e.s+="</tbody></table>\n"}function Z(e,t,r){e.s+="<tr>\n",t&&(e.s+=t.s),e.s+="</tr>\n"}function z(e,t,r,n,o){switch(e.s+=r&Be?"<th":"<td",o>1&&(e.s+=' colspan="'+o+'" '),r&Ne){case He:e.s+=' align="center">';break;case ze:e.s+=' align="left">';break;case Pe:e.s+=' align="right">';break;default:e.s+=">"}t&&(e.s+=t.s),e.s+=r&Be?"</th>\n":"</td>\n"}function P(e,t,r,n){return t&&t.s.length&&(0==(n.flags&Me)||w(t.s)||r==_e)?(e.s+='<a href="',r==_e&&(e.s+="mailto:"),v(e,t.s.slice(0)),n.link_attributes?(e.s+='"',n.link_attributes(e,t,n),e.s+=">"):e.s+='">',0==t.s.indexOf("mailto:")?b(e,t.s.slice(7),!1):b(e,t.s,!1),e.s+="</a>",1):0}function H(e,t,r){return e.s+="<code>",t&&b(e,t.s,!1),e.s+="</code>",1}function N(e,t,r){return t&&t.s.length?(e.s+="<strong>"+t.s+"</strong>",1):0}function B(e,t,r){return t&&t.s.length?(e.s+="<em>"+t.s+"</em>",1):0}function K(e,t,r,n,o){return t&&t.s.length?(e.s+='<img src="',v(e,t.s),e.s+='" alt="',n&&n.s.length&&b(e,n.s,!1),r&&r.s.length&&(e.s+='" title="',b(e,r.s,!1)),e.s+=o.flags&Re?'"/>':'">',1):0}function q(e,t){return e.s+=t.flags&Re?"<br/>\n":"<br>\n",1}function F(e,t,r,n,o){return null==t||0==(o.flags&Me)||w(t.s)?(e.s+='<a href="',t&&t.s.length&&v(e,t.s),r&&r.s.length&&(e.s+='" title="',b(e,r.s,!1)),o.link_attributes?(e.s+='"',o.link_attributes(e,t,o),e.s+=">"):e.s+='">',n&&n.s.length&&(e.s+=n.s),e.s+="</a>",1):0}function X(e,t,r,n,o,a){var s,l,i,c,u,d=0,f=0,h=0,g=0,p=0;if(e.s+="<",a!=Fe){e.s+=n;var m=1+n.length;for(i=new Xe,c=new Xe;m<t.s.length&&!h;m++){switch(h=0,p=0,g=0,u=t.s[m]){case">":h=1;break;case"'":case'"':f?d?d==u?(d=0,g=1):c.s+=u:d=u:p=1;break;case" ":d?c.s+=" ":p=1;break;case"=":if(f){p=1;break}f=1;break;default:(f&&d||!f)&&(f?c.s+=u:i.s+=u)}if(g){var v=0;for(l=0;o[l];l++)if(o[l].length==i.s.length){for(s=0;s<i.s.length&&o[l][s].toLowerCase()==i.s[s].toLowerCase();s++);if(s==i.s.length){v=1;break}}v&&c.s.length&&i.s.length&&(e.s+=" ",b(e,i.s,!1),e.s+='="',b(e,c.s,!1),e.s+='"'),p=1}p&&(f=0,d=0,i=new Xe,c=new Xe)}e.s+=">"}else e.s+="/"+n+">"}function W(e,t,r){var n=r.html_element_whitelist;if(0!=(r.flags&Ze)&&n)for(var o=0;n[o];o++){var a=u(t.s,n[o]);if(a!=Ke)return X(e,t,0,n[o],r.html_attr_whitelist,a),1}return 0!=(r.flags&Ue)?(b(e,t.s,!1),1):(0!=(r.flags&$e)||0!=(r.flags&Oe)&&u(t.s,"style")||0!=(r.flags&Ae)&&u(t.s,"a")||0!=(r.flags&Ee)&&u(t.s,"img")||(e.s+=t.s),1)}function Y(e,t,r){return t&&t.s.length?(e.s+="<strong><em>"+t.s+"</em></strong>",1):0}function G(e,t,r){return t&&t.s.length?(e.s+="<del>"+t.s+"</del>",1):0}function V(e,t,r){return t&&t.s.length?(e.s+="<sup>"+t.s+"</sup>",1):0}function J(e,t,r){t&&b(e,t.s,!1)}function Q(e,t,r,n){if(0==n.tocData.currentLevel&&(e.s+='<div class="toc">\n',n.tocData.levelOffset=r-1),(r-=n.tocData.levelOffset)>n.tocData.currentLevel)for(;r>n.tocData.currentLevel;)e.s+="<ul>\n<li>\n",n.tocData.currentLevel++;else if(r<n.tocData.currentLevel){for(e.s+="</li>\n";r<n.tocData.currentLevel;)e.s+="</ul>\n</li>\n",n.tocData.currentLevel--;e.s+="<li>\n"}else e.s+="</li>\n<li>\n";e.s+='<a href="#',n.toc_id_prefix&&(e.s+=n.toc_id_prefix),e.s+="toc_"+n.tocData.headerCount+++'">',t&&b(e,t.s,!1),e.s+="</a>\n"}function ee(e,t,r,n,o){return n&&n.s&&(e.s+=n.s),1}function te(e,t){t.tocData={headerCount:0,currentLevel:0,levelOffset:0}}function re(e,t){for(var r=!1;t.tocData.currentLevel>0;)e.s+="</li>\n</ul>\n",t.tocData.currentLevel--,r=!0;r&&(e.s+="</div>\n"),te(0,t)}_.prototype={blockcode:null,blockquote:null,blockhtml:null,header:null,hrule:null,list:null,listitem:null,paragraph:null,table:null,table_row:null,table_cell:null,autolink:null,codespan:null,double_emphasis:null,emphasis:null,image:null,linebreak:null,link:null,raw_html_tag:null,triple_emphasis:null,strikethrough:null,superscript:null,entity:null,normal_text:null,doc_header:null,doc_footer:null},e.createCustomRenderer=function(e,t){return new S(e,t)},e.defaultRenderState=C,e.getRedditRenderer=j,e.getTocRenderer=function(){var e=C();return e.flags=De|$e,new S(L(),e)},e.createCustomCallbacks=function(e){return new _(e)},e.getRedditCallbacks=T,e.getTocCallbacks=L;var ne=[null,function(e,r,n,o,a){var s,l=n.slice(o),i=l.length,c=l[0];return i>2&&l[1]!=c?"~"==c||t(l[1])||0==(s=et(e,r,l,c))?0:s+1:l.length>3&&l[1]==c&&l[2]!=c?t(l[2])||0==(s=tt(e,r,l,c))?0:s+2:l.length>4&&l[1]==c&&l[2]==c&&l[3]!=c?"~"==c||t(l[3])||0==(s=function(e,r,n,o){var a,s,l=n.slice(3),i=0;for(;i<l.length;){if(!(a=Qe(l.slice(i),o)))return 0;if(l[i+=a]==o&&!t(l[i-1])){if(i+2<l.length&&l[i+1]==o&&l[i+2]==o&&r.callbacks.triple_emphasis){var c=new Xe;return r.spanStack.push(c),ct(c,r,l.slice(0,i)),s=r.callbacks.triple_emphasis(e,c,r.context),r.spanStack.pop(),s?i+3:0}return i+1<l.length&&l[i+1]==o?(a=et(e,r,n,o))?a-2:0:(a=tt(e,r,n,o))?a-1:0}}return 0}(e,r,l,c))?0:s+3:0},function(e,t,r,n,o){for(var a,s,l,i,c=r.slice(n),u=0;u<c.length&&"`"==c[u];)u++;for(s=0,a=u;a<c.length&&s<u;a++)"`"==c[a]?s++:s=0;if(s<u&&a>=c.length)return 0;for(l=u;l<a&&" "==c[l];)l++;for(i=a-u;i>u&&" "==c[i-1];)i--;if(l<i){var d=new Xe(c.slice(l,i));t.callbacks.codespan(e,d,t.context)||(a=0)}else t.callbacks.codespan(e,null,t.context)||(a=0);return a},function(e,t,r,n,o){if(r.slice(n),o<2||" "!=r[n-1]||" "!=r[n-2])return 0;for(var a=e.s.length;a&&" "==e.s[a-1];)a--;return e.s=e.s.slice(0,a),t.callbacks.linebreak(e,t.context)?1:0},function(e,r,n,o,a){var s,l,i=n.slice(o),c=a&&"!"==n[o-1],u=1,f=0,h=0,g=0,p=0,b=null,m=null,v=null,k=null,x=r.spanStack.length,w=0,y=0,_=0,S=0;function C(){return r.spanStack.length=x,y?u:0}if(c&&!r.callbacks.image||!c&&!r.callbacks.link)return C();for(s=1;u<i.length;u++)if("\n"==i[u])w=1;else{if("\\"==i[u-1])continue;if("["==i[u])s++;else if("]"==i[u]&&--s<=0)break}if(u>=i.length)return C();for(l=u,u++;u<i.length&&t(i[u]);)u++;if(u<i.length&&"("==i[u]){for(u++;u<i.length&&t(i[u]);)u++;for(f=u;u<i.length;)if("\\"==i[u])u+=2;else{if(")"==i[u])break;if(u>=1&&t(i[u-1])&&("'"==i[u]||'"'==i[u]))break;u++}if(u>=i.length)return C();if(h=u,"'"==i[u]||'"'==i[u]){for(S=i[u],_=1,g=++u;u<i.length;)if("\\"==i[u])u+=2;else if(i[u]==S)_=0,u++;else{if(")"==i[u]&&!_)break;u++}if(u>=i.length)return C();for(p=u-1;p>g&&t(i[p]);)p--;"'"!=i[p]&&'"'!=i[p]&&(g=p=0,h=u)}for(;h>f&&t(i[h-1]);)h--;"<"==i[f]&&f++,">"==i[h-1]&&h--,h>f&&(m=new Xe,r.spanStack.push(m),m.s+=i.slice(f,h)),p>g&&(v=new Xe,r.spanStack.push(v),v.s+=i.slice(g,p)),u++}else if(u<i.length&&"["==i[u]){var j=new Xe,T=null;for(f=++u;u<i.length&&"]"!=i[u];)u++;if(u>=i.length)return C();if(f==(h=u))if(w){var L=new Xe;for(r.spanStack.push(L),$=1;$<l;$++)"\n"!=i[$]?L.s+=i[$]:" "!=i[$-1]&&(L.s+=" ");j.s=L.s}else j.s=i.slice(1);else j.s=i.slice(f,h);if(!(T=r.refs[j.s]))return C();m=T.link,v=T.title,u++}else{j=new Xe,T=null;if(w){var $;L=new Xe;for(r.spanStack.push(L),$=1;$<l;$++)"\n"!=i[$]?L.s+=i[$]:" "!=i[$-1]&&(L.s+=" ");j.s=L.s}else j.s=i.slice(1,l);if(!(T=r.refs[j.s]))return C();m=T.link,v=T.title,u=l+1}return l>1&&(b=new Xe,r.spanStack.push(b),c?b.s+=i.slice(1,l):(r.inLinkBody=1,ct(b,r,i.slice(1,l)),r.inLinkBody=0)),m?(k=new Xe,r.spanStack.push(k),d(k,m),c?(e.s.length&&"!"==e.s[e.s.length-1]&&(e.s=e.s.slice(0,-1)),y=r.callbacks.image(e,k,v,b,r.context)):y=r.callbacks.link(e,k,v,b,r.context),C()):C()},function(e,t,r,o,a){var s=r.slice(o),l={p:we},i=function(e,t){var r,o;if(e.length<3)return 0;if("<"!=e[0])return 0;if(r="/"==e[1]?2:1,!n(e[r]))return 0;t.p=we;for(;r<e.length&&(n(e[r])||"."==e[r]||"+"==e[r]||"-"==e[r]);)r++;if(r>1&&"@"==e[r]&&0!=(o=function(e){var t=0,r=0;for(t=0;t<e.length;++t)if(!n(e[t]))switch(e[t]){case"@":r++;case"-":case".":case"_":break;case">":return 1==r?t+1:0;default:return 0}return 0}(e.slice(r))))return t.p=_e,r+o;r>2&&":"==e[r]&&(t.p=ye,r++);if(r>=e.length)t.p=we;else if(t.p){for(o=r;r<e.length;)if("\\"==e[r])r+=2;else{if(">"==e[r]||"'"==e[r]||'"'==e[r]||" "==e[r]||"\n"==e[r])break;r++}if(r>=e.length)return 0;if(r>o&&">"==e[r])return r+1;t.p=we}for(;r<e.length&&">"!=e[r];)r++;return r>=e.length?0:r+1}(s,l),c=new Xe(s.slice(0,i)),u=0;if(i>2)if(t.callbacks.autolink&&l.p!=we){var f=new Xe;t.spanStack.push(f),c.s=s.substr(1,i-2),d(f,c),u=t.callbacks.autolink(e,f,l.p,t.context),t.spanStack.pop()}else t.callbacks.raw_html_tag&&(u=t.callbacks.raw_html_tag(e,c,t.context));return u?i:0},function(e,t,r,n,o){var a=r.slice(n),s=new Xe;if(a.length>1){if(-1=="\\`*_{}[]()#+-.!:|&<>/^~".indexOf(a[1]))return 0;t.callbacks.normal_text?(s.s=a[1],t.callbacks.normal_text(e,s,t.context)):e.s+=a[1]}else 1==a.length&&(e.s+=a[0]);return 2},function(e,t,r,o,l){var i,c,u=r.slice(o),d=1,g=!1,p=!1,b=new Xe;for(d<u.length&&"#"===u[d]&&(g=!0,d++),d<u.length&&g&&"x"===u[d].toLowerCase()&&(p=!0,d++),i=d;d<u.length;){var m=u[d];if(p){if(!s(m))break}else if(g){if(!a(m))break}else if(!n(m))break;d++}if(!(d>i&&d<u.length&&";"===u[d]))return 0;if(d++,g&&undefined-i>7)return 0;if(g){if(c=p?16:10,!function(e){return e>8&&11!==e&&12!==e&&(e<14||e>31)&&(e<55296||e>57343)&&65534!==e&&65535!==e&&e<=f}(parseInt(u.slice(i),c)))return 0}else if(-1===h.indexOf(u.slice(0,d)))return 0;return t.callbacks.entity?(b.s=u.slice(0,d),t.callbacks.entity(e,b,t.context)):e.s+=u.slice(0,d),d},function(e,t,n,a,s){var l,i,c=n.slice(a),u={p:null};return!t.callbacks.autolink||t.inLinkBody?0:(l=new Xe,t.spanStack.push(l),(i=function(e,t,n,a,s,l,i){var c,u,d=n.slice(a),f=0;if(l<4||"/"!=n[a+1]||"/"!=n[a+2])return 0;for(;f<s&&o(n[a-f-1]);)f++;if(!w(n.substr(a-f,l+f)))return 0;if(c=3,0==(u=x(d.slice(c),i&xe)))return 0;for(c+=u;c<l&&!r(n[a+c]);)c++;return 0==(c=k(n,c,a))?0:(t.s+=n.substr(a-f,c+f),e.p=f,c)}(u,l,n,a,s,c.length,0))>0&&(u.p>0&&e.truncate(e.s.length-u.p),t.callbacks.autolink(e,l,ye,t.context)),t.spanStack.pop(),i)},function(e,t,r,o,a){var s,l,i=r.slice(o),c={p:null};return!t.callbacks.autolink||t.inLinkBody?0:(s=new Xe,t.spanStack.push(s),(l=function(e,t,r,o,a,s,l){r.slice(o);var i,c,u=0,d=0;for(c=0;c<a&&"\0"!=(f=r[o-c-1])&&(n(f)||-1!=".+-_".indexOf(f));++c);if(0==c)return 0;for(i=0;i<s;++i){var f;if(!n(f=r[o+i]))if("@"==f)u++;else if("."==f&&i<s-1)d++;else if("-"!=f&&"_"!=f)break}return i<2||1!=u||0==d||0==(i=k(r,i,o))?0:(t.s+=r.substr(o-c,i+c),e.p=c,i)}(c,s,r,o,a,i.length))>0&&(c.p>0&&e.truncate(e.s.length-c.p),t.callbacks.autolink(e,s,_e,t.context)),t.spanStack.pop(),l)},function(e,t,n,o,a){var s,i,c=n.slice(o),u=null,d=null,f={p:null};return!t.callbacks.link||t.inLinkBody?0:(s=new Xe,t.spanStack.push(s),(i=function(e,t,n,o,a,s,i){var c,u=n.slice(o);if(a>0&&!l(n[o-1])&&!r(n[o-1]))return 0;if(s<4||"www."!=u.slice(0,4))return 0;if(0==(c=x(u,0)))return 0;for(;c<s&&!r(u[c]);)c++;return 0==(c=k(n,c,o))?0:(t.s+=u.slice(0,c),e.p=0,c)}(f,s,n,o,a,c.length))>0&&(u=new Xe,t.spanStack.push(u),u.s+="http://",u.s+=s.s,f.p>0&&e.truncate(e.s.length-f.p),t.callbacks.normal_text?(d=new Xe,t.spanStack.push(d),t.callbacks.normal_text(d,s,t.context),t.callbacks.link(e,u,null,d,t.context),t.spanStack.pop()):t.callbacks.link(e,u,null,s,t.context),t.spanStack.pop()),t.spanStack.pop(),i)},function(e,t,r,o,a){var s,l=r.slice(o),i=0,c={p:null},u={p:null};if(!t.callbacks.autolink||t.inLinkBody)return 0;if(s=new Xe,t.spanStack.push(s),0===(i=function(e,t,r,o,a,s,l){var i=r.slice(o),c=0,u=!1,d=y(r,o,a,s,"r");if(!d)return 0;c=1,"all-"==i.substr(c,4).toLowerCase()&&(u=!0);do{var f=c,h=24;if(s>=c+10&&"reddit.com"==i.substr(c,10).toLowerCase())c+=10,h=10;else{if(s>c+2&&"t:"==i.substr(c,2)&&(c+=2),!n(i[c]))return 0;c+=1}for(;c<s&&(n(i[c])||"_"==i[c]);)c++;if(c-f<2||c-f>h)return 0}while(c<s&&("+"==i[c]||u&&"-"==i[c])&&c++);if(c<s&&"/"==i[c])for(;c<s&&(n(i[c])||"_"==i[c]||"/"==i[c]||"-"==i[c]);)c++;var g=o-d;return t.s+=r.slice(g,g+c+d),l.p=1==d,e.p=d,c}(c,s,r,o,a,l.length,u))&&(i=function(e,t,r,o,a,s,l){var i=r.slice(o),c=0;if(!(s<3)){var u=y(r,o,a,s,"u");if(!u)return 0;if(!n(i[c=1])&&"_"!=i[c]&&"-"!=i[c])return 0;for(c+=1;c<s&&(n(i[c])||"_"==i[c]||"/"==i[c]||"-"==i[c]);)c++;var d=o-u;return t.s+=r.slice(d,d+c+u),l.p=1==u,e.p=u,c}}(c,s,r,o,a,l.length,u)),i>0){var d=new Xe;if(t.spanStack.push(d),u.p&&(d.s+="/"),d.s+=s.s,c.p>0&&e.truncate(e.s.length-c.p),t.callbacks.normal_text){var f=new Xe;t.spanStack.push(f),t.callbacks.normal_text(f,s,t.context),t.callbacks.link(e,d,null,f,t.context),t.spanStack.pop()}else t.callbacks.link(e,d,null,s,t.context);t.spanStack.pop()}return t.spanStack.pop(),i},function(e,r,n,o,a){var s,l,i,c=n.slice(o),u=c.length;if(!r.callbacks.superscript)return 0;if(u<2)return 0;if("("==c[1]){for(s=l=2;l<u&&")"!=c[l]&&"\\"!=c[l-1];)l++;if(l==u)return 0}else for(s=l=1;l<u&&!t(c[l]);)l++;return l-s==0?2==s?3:0:(i=new Xe,r.spanStack.push(i),ct(i,r,c.slice(s,l)),r.callbacks.superscript(e,i,r.context),r.spanStack.pop(),2==s?l+1:l)}],oe=1,ae=2,se=8,le=0,ie=(le++,le++),ce=le++,ue=le++,de=le++,fe=le++,he=le++,ge=le++,pe=le++,be=le++,me=le++,ve=le++,ke=le++,xe=1;le=0;var we=le++,ye=le++,_e=le++,Se=1,Ce=2,je=4,Te=64,Le=256,$e=1,Oe=2,Ee=4,Ae=8,Me=32,De=64,Ie=128,Re=256,Ue=512,Ze=1024,ze=1,Pe=2,He=3,Ne=3,Be=4,Ke=0,qe=1,Fe=2;function Xe(e){this.s=e||""}function We(e,t){if(this.s=e,t>=e.length||t<0)throw new RangeError("char * offset out of bounds");this.offset=t}function Ye(){this.spanStack=[],this.blockStack=[],this.extensions=152|Se|Ce|Ce;var e=j();this.context=e.context,this.callbacks=e.callbacks,this.inLinkBody=0,this.activeChars={},this.refs={},this.nestingLimit=16,this.maxTableCols=64}function Ge(e){var t;for(t=0;t<e.length&&"\n"!=e[t];t++)if(" "!=e[t])return 0;return t+1}function Ve(e){var t,r=0,n=0;if(e.length<3)return 0;if(" "==e[0]&&(r++," "==e[1]&&(r++," "==e[2]&&r++)),r+2>=e.length||"*"!=e[r]&&"-"!=e[r]&&"_"!=e[r])return 0;for(t=e[r];r<e.length&&"\n"!=e[r];){if(e[r]==t)n++;else if(" "!=e[r])return 0;r++}return n>=3}function Je(e,r){var n,o=0,a=0;if(o=function(e){var t,r=0,n=0;if(e.length<3)return 0;if(" "==e[0]&&(r++," "==e[1]&&(r++," "==e[2]&&r++)),r+2>=e.length||"~"!=e[r]&&"`"!=e[r])return 0;for(t=e[r];r<e.length&&e[r]==t;)n++,r++;return n<3?0:r}(e),0==o)return 0;for(;o<e.length&&" "==e[o];)o++;if(n=o,o<e.length&&"{"==e[o]){for(o++,n++;o<e.length&&"}"!=e[o]&&"\n"!=e[o];)a++,o++;if(o==e.length||"}"!=e[o])return 0;for(;a>0&&t(e[n+0]);)n++,a--;for(;a>0&&t(e[n+a-1]);)a--;o++}else for(;o<e.length&&!t(e[o]);)a++,o++;for(r&&(r.s=e.substr(n,a));o<e.length&&"\n"!=e[o];){if(!t(e[o]))return 0;o++}return o+1}function Qe(e,t){for(var r=1;r<e.length;){for(;r<e.length&&e[r]!=t&&"`"!=e[r]&&"["!=e[r];)r++;if(r==e.length)return 0;if(e[r]==t)return r;if(r&&"\\"==e[r-1])r++;else if("`"==e[r]){for(var n,o=0,a=0;r<e.length&&"`"==e[r];)r++,o++;if(r>=e.length)return 0;for(n=0;r<e.length&&n<o;)a||e[r]!=t||(a=r),"`"==e[r]?n++:n=0,r++;if(r>=e.length)return a}else if("["==e[r]){var s;a=0;for(r++;r<e.length&&"]"!=e[r];)a||e[r]!=t||(a=r),r++;for(r++;r<e.length&&(" "==e[r]||"\n"==e[r]);)r++;if(r>=e.length)return a;switch(e[r]){case"[":s="]";break;case"(":s=")";break;default:if(a)return a;continue}for(r++;r<e.length&&e[r]!=s;)a||e[r]!=t||(a=r),r++;if(r>=e.length)return a;r++}}return 0}function et(e,r,n,o){var a,s,i=n.slice(1),c=0;if(!r.callbacks.emphasis)return 0;for(i.length>1&&i[0]==o&&i[1]==o&&(c=1);c<i.length;){if(!(a=Qe(i.slice(c),o)))return 0;if((c+=a)>=i.length)return 0;if(i[c]==o&&!t(i[c-1])){if(r.extensions&Se&&"_"==o&&c+1!=i.length&&!t(i[c+1])&&!l(i[c+1]))continue;var u=new Xe;return r.spanStack.push(u),ct(u,r,i.slice(0,c)),s=r.callbacks.emphasis(e,u,r.context),r.spanStack.pop(),s?c+1:0}}return 0}function tt(e,r,n,o){var a,s,l=n.slice(2),i=0,c="~"==o?r.callbacks.strikethrough:r.callbacks.double_emphasis;if(!c)return 0;for(;i<l.length;){if(!(a=Qe(l.slice(i),o)))return 0;if((i+=a)+1<l.length&&l[i]==o&&l[i+1]==o&&i&&!t(l[i-1])){var u=new Xe;return r.spanStack.push(u),ct(u,r,l.slice(0,i)),s=c(e,u,r.context),r.spanStack.pop(),s?i+2:0}i++}return 0}function rt(e,t){if("#"!=t[0])return!1;if(e.extensions&Te){for(var r=0;r<t.length&&r<6&&"#"==t[r];)r++;if(r<t.length&&" "!=t[r])return!1}return!0}function nt(e){var t=0,r=e.length;if("="==e[t]){for(t=1;t<r&&"="==e[t];t++);for(;t<r&&" "==e[t];)t++;return t>=r||"\n"==e[t]?1:0}if("-"==e[t]){for(t=1;t<r&&"-"==e[t];t++);for(;t<r&&" "==e[t];)t++;return t>=r||"\n"==e[t]?2:0}return 0}function ot(e){for(var t=e.length,r=0;r<t&&"\n"!=e[r];)r++;return++r>=t?0:nt(e.slice(r))}function at(e){var t=0,r=e.length;return t<r&&" "==e[t]&&t++,t<r&&" "==e[t]&&t++,t<r&&" "==e[t]&&t++,t<r&&">"==e[t]?t+1<r&&" "==e[t+1]?t+2:t+1:0}function st(e){return e.length>3&&" "==e[0]&&" "==e[1]&&" "==e[2]&&" "==e[3]?4:0}function lt(e){var t=e.length,r=0;if(r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r>=t||e[r]<"0"||e[r]>"9")return 0;for(;r<t&&e[r]>="0"&&e[r]<="9";)r++;return r+1>=t||"."!=e[r]||" "!=e[r+1]||ot(e.slice(r))?0:r+2}function it(e){var t=e.length,r=0;return r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r+1>=t||"*"!=e[r]&&"+"!=e[r]&&"-"!=e[r]||" "!=e[r+1]||ot(e.slice(r))?0:r+2}function ct(e,t,r){var n=0,o=0,a=0,s=0,l=new Xe;if(!(t.spanStack.length+t.blockStack.length>t.nestingLimit))for(;n<r.length;){for(;o<r.length&&!(s=t.activeChars[r[o]]);)o++;if(t.callbacks.normal_text?(l.s=r.slice(n,o),t.callbacks.normal_text(e,l,t.context)):e.s+=r.slice(n,o),o>=r.length)break;n=o,(o=ne[s](e,t,r,n,n-a))?a=o=n+=o:o=n+1}}function ut(e,t,r){for(var n,o,a,s=0;s<r.length&&s<6&&"#"==r[s];)s++;for(n=s;n<r.length&&" "==r[n];n++);for(o=n;o<r.length&&"\n"!=r[o];o++);for(a=o;o&&"#"==r[o-1];)o--;for(;o&&" "==r[o-1];)o--;if(o>n){var l=new Xe;t.spanStack.push(l),ct(l,t,r.slice(n,o)),t.callbacks.header&&t.callbacks.header(e,l,s,t.context),t.spanStack.pop()}return a}function dt(e,t,r){var n,o;return e.length+3>=r.length||r.slice(2).toLowerCase()!=e||">"!=r[e.length+2]?0:(o=0,(n=e.length+3)<r.length&&0==(o=Ge(r.slice(n)))?0:(n+=o,o=0,n<r.length&&(o=Ge(r.slice(n))),n+o))}function ft(e,t,r,n){var o,a,s,l=0,i=null,c=new Xe(r);if(r.length<2||"<"!=r[0])return 0;for(o=1;o<r.length&&">"!=r[o]&&" "!=r[o];)o++;if(o<r.length&&(s=r.slice(1),i=-1!=["p","dl","div","math","table","ul","del","form","blockquote","figure","ol","fieldset","h1","h6","pre","script","h5","noscript","style","iframe","h4","ins","h3","h2"].indexOf(s.toLowerCase())?s.toLowerCase():""),!i){if(r.length>5&&"!"==r[1]&&"-"==r[2]&&"-"==r[3]){for(o=5;o<r.length&&("-"!=r[o-2]||"-"!=r[o-1]||">"!=r[o]);)o++;if(++o<size&&(l=Ge(r.slice(o))),l)return c.s=r.slice(0,o+l),n&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),c.s.length}if(r.length>4&&("h"==r[1]||"H"==r[1])&&("r"==r[2]||"R"==r[2])){for(o=3;o<r.length&&">"!=r[o];)o++;if(o+1<r.length&&(o++,l=Ge(r.slice(o))))return c.s=r.slice(0,o+l),n&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),c.s.length}return 0}if(o=1,a=0,"ins"!=i&&"del"!=i){var u=i.length;for(o=1;o<r.length;){for(o++;o<r.length&&("<"!=r[o-1]||"/"!=r[o]);)o++;if(o+2+u>=r.length)break;if(l=dt(tag,0,r.slice(o-1))){o+=l-1,a=1;break}}}return a?(c.s=c.s.slice(0,o),n&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),o):0}function ht(e,t,r){var n,o,a=r.length,s=0,l="",i=new Xe;for(t.blockStack.push(i),n=0;n<a;){for(s=n+1;s<a&&"\n"!=r[s-1];s++);if(o=at(r.slice(n,s)))n+=o;else if(Ge(r.slice(n,s))&&(s>=a||0==at(r.slice(s))&&!Ge(r.slice(s))))break;n<s&&(l+=r.slice(n,s),s-n),n=s}return wt(i,t,l),t.callbacks.blockquote&&t.callbacks.blockquote(e,i,t.context),t.blockStack.pop(),s}function gt(e,t,r){for(var o=0,a=0,s=0,l=r.length,i=new Xe(r);o<l;){for(a=o+1;a<l&&"\n"!=r[a-1];a++);if(0!=at(r.slice(o,a))){a=o;break}var c=r.slice(o);if(Ge(c)||0!=(s=nt(c)))break;if(Ge(c))break;if(0!=(s=nt(c)))break;if(rt(t,c)||Ve(c)||at(c)){a=o;break}if(t.extensions&Le&&!n(r[o])){if(lt(c)||it(c)){a=o;break}if("<"==r[o]&&t.callbacks.blockhtml&&ft(e,t,c,0)){a=o;break}if(0!=(t.extensions&&je)&&0!=Je(c,null)){a=o;break}}o=a}for(var u=o;u&&"\n"==r[u-1];)u--;if(i.s=i.s.slice(0,u),s){var d;if(i.size){var f;for(o=i.s.length;u&&"\n"!=r[u];)u-=1;for(f=u+1;u&&"\n"==r[u-1];)u-=1;if(i.s=i.s.slice(0,u),u>0){h=new Xe;t.blockStack.push(h),ct(h,t,i.s),t.callbacks.paragraph&&t.callbacks.paragraph(e,h,t.context),t.blockStack.pop(),i.s=i.s.slice(f,o)}else i.s=i.s.slice(0,o)}d=new Xe,t.spanStack.push(d),ct(d,t,i.s),t.callbacks.header&&t.callbacks.header(e,d,s,t.context),t.spanStack.pop()}else{var h=new Xe;t.blockStack.push(h),ct(h,t,i.s),t.callbacks.paragraph&&t.callbacks.paragraph(e,h,t.context),t.blockStack.pop()}return a}function pt(e,t,r){var n,o,a=null,s=new Xe;if(0==(n=Je(r,s)))return 0;for(a=new Xe,t.blockStack.push(a);n<r.length;){var l,i=new Xe;if(0!=(l=Je(r.slice(n),i))&&0==i.s.length){n+=l;break}for(o=n+1;o<r.length&&"\n"!=r[o-1];o++);if(n<o){var c=r.slice(n,o);Ge(c)?a.s+="\n":a.s+=c}n=o}return a.s.length&&"\n"!=a.s[a.s.length-1]&&(a.s+="\n"),t.callbacks.blockcode&&t.callbacks.blockcode(e,a,s.s.length?s:null,t.context),t.blockStack.pop(),n}function bt(e,t,r){var n,o,a,s=r.length,l=null;for(t.blockStack.push(l=new Xe),n=0;n<s;){for(o=n+1;o<s&&"\n"!=r[o-1];o++);if(a=st(r.slice(n,o)))n+=a;else if(!Ge(r.slice(n,o)))break;n<o&&(Ge(r.slice(n,o))?l.s+="\n":l.s+=r.slice(n,o)),n=o}for(var i=l.s.length;i&&"\n"==l.s[i-1];)i-=1;return l.s=l.s.slice(0,i),l.s+="\n",t.callbacks.blockcode&&t.callbacks.blockcode(e,l,null,t.context),t.blockStack.pop(),n}function mt(e,t,r,n){for(var o,a,s,l,i=r.length,c=null,u=0,d=0,f=0,h=0,g=0,p=0;f<3&&f<i&&" "==r[f];)f++;if((u=it(r))||(u=lt(r)),!u)return 0;for(a=u;a<i&&"\n"!=r[a-1];)a++;for(t.spanStack.push(c=new Xe),t.spanStack.push(o=new Xe),c.s+=r.slice(u,a),u=a;u<i;){var b,m;for(a++;a<i&&"\n"!=r[a-1];)a++;if(Ge(r.slice(u,a)))h=1,u=a;else{for(l=0;l<4&&u+l<a&&" "==r[u+l];)l++;if(s=l,t.flags&je&&0!=Je(r.slice(u+l,a),null)&&(p=!p),p||(b=it(r.slice(u+l,a)),m=lt(r.slice(u+l,a))),h&&(n.p&oe&&b||!(n.p&oe)&&m)){n.p|=se;break}if(b&&!Ve(r.slice(u+l,a))||m){if(h&&(g=1),s==f)break;d||(d=c.s.length)}else{if(h&&0==s){n.p|=se;break}h&&(c.s+="\n",g=1)}h=0,c.s+=r.slice(u+l,a),u=a}}return g&&(n.p|=ae),n.p&ae?d&&d<c.s.length?(wt(o,t,c.s.slice(0,d)),wt(o,t,c.s.slice(d))):wt(o,t,c.s):d&&d<c.s.length?(ct(o,t,c.s.slice(0,d)),wt(o,t,c.s.slice(d))):ct(o,t,c.s),t.callbacks.listitem&&t.callbacks.listitem(e,o,n.p,t.context),t.spanStack.pop(),t.spanStack.pop(),u}function vt(e,t,r,n){var o,a,s=r.length,l=0;for(t.blockStack.push(a=new Xe);l<s;){var i={p:n};if(o=mt(a,t,r.slice(l),i),n=i.p,l+=o,!o||n&se)break}return t.callbacks.list&&t.callbacks.list(e,a,n,t.context),t.blockStack.pop(),l}function kt(e,r,n,o,a){var s,l,i,c=0;if(r.callbacks.table_cell&&r.callbacks.table_row){for(r.spanStack.push(i=new Xe),c<n.length&&"|"==n[c]&&c++,s=0;s<o.length&&c<n.length;++s){var u,d,f;for(r.spanStack.push(f=new Xe);c<n.length&&t(n[c]);)c++;for(u=c;c<n.length&&"|"!=n[c];)c++;for(d=c-1;d>u&&t(n[d]);)d--;ct(f,r,n.slice(u,1+d)),r.callbacks.table_cell(i,f,o[s]|a,r.context,0),r.spanStack.pop(),c++}if((l=o.length-s)>0){r.callbacks.table_cell(i,null,o[s]|a,r.context,l)}r.callbacks.table_row(e,i,r.context),r.spanStack.pop()}}function xt(e,r,n){var o,a,s,l={p:null};if(r.spanStack.push(a=new Xe),r.blockStack.push(s=new Xe),o=function(e,r,n,o){for(var a,s,l,i=0,c=0;i<n.length&&"\n"!=n[i];)"|"==n[i++]&&c++;if(i==n.length||0==c)return 0;for(s=i;s>0&&t(n[s-1]);)s--;if("|"==n[0]&&c--,s&&"|"==n[s-1]&&c--,c+1>r.maxTableCols)return 0;o.p=new Array(c+1);for(var u=0;u<o.p.length;u++)o.p[u]=0;for(++i<n.length&&"|"==n[i]&&i++,l=i;l<n.length&&"\n"!=n[l];)l++;for(a=0;a<o.p.length&&i<l;++a){for(var d=0;i<l&&" "==n[i];)i++;for(":"==n[i]&&(i++,o.p[a]|=ze,d++);i<l&&"-"==n[i];)i++,d++;for(i<l&&":"==n[i]&&(i++,o.p[a]|=Pe,d++);i<l&&" "==n[i];)i++;if(i<l&&"|"!=n[i])break;if(d<1)break;i++}return a<o.p.length?0:(kt(e,r,n.slice(0,s),o.p,Be),l+1)}(a,r,n,l),o>0){for(;o<n.length;){var i,c=0;for(i=o;o<n.length&&"\n"!=n[o];)"|"==n[o++]&&c++;if(0==c||o==n.length){o=i;break}kt(s,r,n.slice(i,o),l.p,0),o++}r.callbacks.table&&r.callbacks.table(e,a,s,r.context)}return r.spanStack.pop(),r.blockStack.pop(),o}function wt(e,t,r){var n,o,a=0;if(!(t.spanStack.length+t.blockStack.length>t.nestingLimit))for(;a<r.length;)if(o=r.slice(a),r.length-a,rt(t,o))a+=ut(e,t,o);else if("<"==r[a]&&t.callbacks.blockhtml&&0!=(n=ft(e,t,o,1)))a+=n;else if(0!=(n=Ge(o)))a+=n;else if(Ve(o)){for(t.callbacks.hrule&&t.callbacks.hrule(e,t.context);a<r.length&&"\n"!=r[a];)a++;a++}else 0!=(t.extensions&je)&&0!=(n=pt(e,t,o))||0!=(t.extensions&Ce)&&0!=(n=xt(e,t,o))?a+=n:at(o)?a+=ht(e,t,o):st(o)?a+=bt(e,t,o):it(o)?a+=vt(e,t,o,0):lt(o)?a+=vt(e,t,o,oe):a+=gt(e,t,o)}function yt(e,t,r,n){var o,a,s,l,i,c,u,d=0;if(t+3>=r)return 0;if(" "==e[t]&&(d=1," "==e[t+1]&&(d=2," "==e[t+2]&&(d=3," "==e[t+3]))))return 0;if("["!=e[d+=t])return 0;for(o=++d;d<r&&"\n"!=e[d]&&"\r"!=e[d]&&"]"!=e[d];)d++;if(d>=r||"]"!=e[d])return 0;if(a=d,++d>=r||":"!=e[d])return 0;for(d++;d<r&&" "==e[d];)d++;for(d<r&&("\n"==e[d]||"\r"==e[d])&&++d<r&&"\r"==e[d]&&"\n"==e[d-1]&&d++;d<r&&" "==e[d];)d++;if(d>=r)return 0;for("<"==e[d]&&d++,s=d;d<r&&" "!=e[d]&&"\n"!=e[d]&&"\r"!=e[d];)d++;for(l=">"==e[d-1]?d-1:d;d<r&&" "==e[d];)d++;if(d<r&&"\n"!=e[d]&&"\r"!=e[d]&&"'"!=e[d]&&'"'!=e[d]&&"("!=e[d])return 0;if(u=0,(d>=r||"\r"==e[d]||"\n"==e[d])&&(u=d),d+1<r&&"\n"==e[d]&&"\r"==e[d+1]&&(u=d+1),u)for(d=u+1;d<r&&" "==e[d];)d++;if(i=c=0,d+1<r&&("'"==e[d]||'"'==e[d]||"("==e[d])){for(i=++d;d<r&&"\n"!=e[d]&&"\r"!=e[d];)d++;for(c=d+1<r&&"\n"==e[d]&&"\r"==e[d+1]?d+1:d,d-=1;d>i&&" "==e[d];)d-=1;d>i&&("'"==e[d]||'"'==e[d]||")"==e[d])&&(u=c,c=d)}if(!u||l==s)return 0;var f=e.slice(o,a),h=e.slice(s,l),g=null;return c>i&&(g=e.slice(i,c)),n.refs[f]={id:f,link:new Xe(h),title:new Xe(g)},u}function _t(e,t){for(var r=0,n=0;r<t.length;){for(var o=r;r<t.length&&"\t"!=t[r];)r++,n++;if(r>o&&(e.s+=t.slice(o,r)),r>=t.length)break;do{e.s+=" ",n++}while(n%4);r++}}Xe.prototype.truncate=function(e){if(this.s.length<e)throw new RangeError("Buffer smaller than desired size");if(e<0)throw new RangeError("Size argument is negative");this.s=this.s.slice(0,e)},We.prototype.getChar=function(e){var t=this.offset+e;if(t>=this.s.length||t<0)throw new RangeError("Character index out of bounds");return this.s.slice(t,t+1)},We.prototype.toString=function(){return this.s.slice(this.offset)},Ye.prototype.render=function(e){var t,r=new Xe,n=0;for(this.refs={};n<e.length;)if(t=yt(e,n,e.length,this))n=t;else{for(t=n;t<e.length&&"\n"!=e[t]&&"\r"!=e[t];)t++;for(t>n&&_t(r,e.slice(n,t));t<e.length&&("\n"==e[t]||"\r"==e[t]);)("\n"==e[t]||t+1<e.length&&"\n"!=e[t+1])&&(r.s+="\n"),t++;n=t}var o=new Xe;return this.callbacks.doc_header&&this.callbacks.doc_header(o,this.context),r.s.length&&("\n"!=r.s[r.s.length-1]&&"\r"!=r.s[r.s.length-1]&&(r.s+="\n"),wt(o,this,r.s)),this.callbacks.doc_footer&&this.callbacks.doc_footer(o,this.context),o.s},e.getParser=function(e,t,r,n){var o=new Ye;e&&(o.callbacks=e.callbacks),r&&(o.nestingLimit=r),r&&(o.maxTableCols=n),e&&(o.context=e.context),null!=t&&null!=t&&(o.extensions=t);var a=o.callbacks;return(a.emphasis||a.double_emphasis||a.triple_emphasis)&&(o.activeChars["*"]=ie,o.activeChars._=ie,16&o.extensions&&(o.activeChars["~"]=ie)),a.codespan&&(o.activeChars["`"]=ce),a.linebreak&&(o.activeChars["\n"]=ue),(a.image||a.link)&&(o.activeChars["["]=de),o.activeChars["<"]=fe,o.activeChars["\\"]=he,o.activeChars["&"]=ge,8&o.extensions&&(512&o.extensions||(o.activeChars["@"]=be),o.activeChars[":"]=pe,o.activeChars.w=me,o.activeChars["/"]=ve),128&o.extensions&&(o.activeChars["^"]=ke),o};var St=$e|Ee|Me|Ue|Re,Ct=$e|Me|Ze|Ue|Re,jt=["colspan","rowspan","cellspacing","cellpadding","scope"],Tt=["tr","th","td","table","tbody","thead","tfoot","caption"];e.DEFAULT_HTML_ELEMENT_WHITELIST=Tt,e.DEFAULT_HTML_ATTR_WHITELIST=jt,e.DEFAULT_BODY_FLAGS=St,e.DEFAULT_WIKI_FLAGS=Ct,e.HTML_SKIP_HTML=$e,e.HTML_SKIP_STYLE=Oe,e.HTML_SKIP_IMAGES=Ee,e.HTML_SKIP_LINKS=Ae,e.HTML_EXPAND_TABS=16,e.HTML_SAFELINK=Me,e.HTML_TOC=De,e.HTML_HARD_WRAP=Ie,e.HTML_USE_XHTML=Re,e.HTML_ESCAPE=Ue,e.HTML_ALLOW_ELEMENT_WHITELIST=Ze,e.MKDEXT_NO_INTRA_EMPHASIS=Se,e.MKDEXT_TABLES=Ce,e.MKDEXT_FENCED_CODE=je,e.MKDEXT_AUTOLINK=8,e.MKDEXT_STRIKETHROUGH=16,e.MKDEXT_SPACE_HEADERS=Te,e.MKDEXT_SUPERSCRIPT=128,e.MKDEXT_LAX_SPACING=Le,e.MKDEXT_NO_EMAIL_AUTOLINK=512,e.SD_AUTOLINK_SHORT_DOMAINS=xe,e.MKDA_NOT_AUTOLINK=we,e.MKDA_NORMAL=ye,e.MKDA_EMAIL=_e,"function"==typeof define&&define("snuownd",[],e)}((()=>{const e="undefined"!=typeof window?window:"undefined"!=typeof globalThis?globalThis:{};return e.SnuOwnd||(e.SnuOwnd={}),e.SnuOwnd})());const re=("undefined"!=typeof window?window:"undefined"!=typeof globalThis?globalThis:{}).SnuOwnd.getParser(),ne=e=>re.render((e||"").replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<")).replace(/href="\//g,'href="https://www.reddit.com/'),oe=e=>"mod removed"===e?"removed":"user deleted"===e?"deleted":"approved"===e?"approved":"locked"===e?"locked":"unlocked"===e?"unlocked":"edited"===e?"edited":"default";function ae({row:e,onResolve:t}){const r=(0,o.useMemo)((()=>"comment"===e.contentType?e.text?ne(e.text):"":e.body?ne(e.body):""),[e.text,e.body,e.contentType]),a="post"===e.contentType&&e.text,s=!r||""===r.trim()||"<p></p>"===r.trim();return(0,n.jsxs)(P,{children:[(0,n.jsxs)(H,{children:[(0,n.jsx)(F,{variant:e.actionVariant,children:e.action}),(0,n.jsxs)("span",{style:{color:"var(--text-secondary)",fontSize:"0.9em"},children:[e.contentType," by ",(0,n.jsxs)(X,{children:["u/",e.user]}),e.subreddit?(0,n.jsxs)(n.Fragment,{children:[" ","in ",(0,n.jsxs)(W,{children:["r/",e.subreddit]})]}):null]})]}),(0,n.jsxs)(N,{children:[(0,n.jsxs)("span",{title:e.formattedObservedFull,children:["observed ",e.formattedObserved]}),"n/a"!==e.timeLength&&(0,n.jsxs)("span",{title:e.formattedCreated,children:[e.action," ",e.timeLength," after creation"]}),e.seenCount?(0,n.jsxs)("span",{children:["seen ",e.seenCount,"×"]}):null]}),a&&(0,n.jsx)(Y,{children:e.text}),(0,n.jsx)(B,{children:s?(0,n.jsx)("span",{style:{color:"var(--text-muted)",fontStyle:"italic"},children:"(no body content stored)"}):(0,n.jsx)(G,{className:"md-body",dangerouslySetInnerHTML:{__html:r}})}),(0,n.jsxs)(K,{children:[e.needsResolve?(0,n.jsx)(Z,{variant:"secondary",onClick:()=>t(e.id),children:"Open on Reddit ↗"}):(0,n.jsx)(I,{href:e.href,target:"_blank",rel:"noreferrer",children:"Open on Reddit ↗"}),e.id&&(0,n.jsx)(R,{href:`https://www.reveddit.com/info?id=${encodeURIComponent(e.id)}`,target:"_blank",rel:"noreferrer",children:"View on reveddit ↗"})]})]})}const se=(0,a.Z)(P)`
  margin-bottom: ${T.lg};
  & h2 {
    margin: 0 0 ${T.sm} 0;
    font-size: 1.2em;
  }
  & p {
    margin: ${T.xs} 0;
    line-height: 1.6;
    color: var(--text-primary);
  }
  & ul {
    margin: ${T.sm} 0;
    padding-left: 1.4em;
    line-height: 1.8;
    color: var(--text-primary);
  }
`,le=a.Z.div`
  display: flex;
  gap: ${T.sm};
  align-items: center;
  margin-top: ${T.md};
  flex-wrap: wrap;
`,ie=()=>navigator.userAgent.includes("Edg/")?"Click the extensions icon in the toolbar, then pin reveddit real-time.":"Click the puzzle piece icon in the toolbar, then pin reveddit real-time.";function ce({currentUser:e,onDismiss:t}){return(0,n.jsxs)(se,{children:[(0,n.jsxs)("h2",{children:["Monitoring is active",e?` for u/${e}`:""]}),(0,n.jsx)("p",{children:"reveddit real-time is now watching your Reddit comments and posts. You'll be notified whenever content is removed by moderators, reapproved, locked, or unlocked."}),(0,n.jsxs)("ul",{children:[(0,n.jsx)("li",{children:"The extension's toolbar icon displays a badge count of removed comments and posts you haven't viewed yet."}),(0,n.jsxs)("li",{children:[(0,n.jsx)("strong",{children:"Pin the extension to your toolbar"})," so you can always see this count. ",ie()]})]}),e&&(0,n.jsxs)("p",{children:["You can also view your"," ",(0,n.jsx)(I,{href:`https://www.reveddit.com/user/${e}?all=true`,target:"_blank",rel:"noreferrer",children:"reveddit.com user page"}),", which can show orphaned and collapsed comments."]}),(0,n.jsx)(le,{children:(0,n.jsx)(Z,{variant:"secondary",onClick:t,children:"Got it"})})]})}function ue({currentUser:e}){return(0,n.jsxs)(se,{children:[(0,n.jsxs)("h2",{children:["Monitoring is active",e?` for u/${e}`:""]}),(0,n.jsx)("p",{children:"No removed or changed content has been observed yet. You'll be notified when any of your comments or posts are removed by moderators."}),(0,n.jsxs)("p",{children:["The extension's toolbar icon will display a count of removed items you haven't viewed. Pin the extension to your toolbar to always see it. ",ie()]}),e&&(0,n.jsxs)("p",{children:["You can also check your"," ",(0,n.jsx)(I,{href:`https://www.reveddit.com/user/${e}?all=true`,target:"_blank",rel:"noreferrer",children:"reveddit.com user page"})," ","for orphaned and collapsed comments."]})]})}const de=a.Z.div`
    margin-top: ${T.lg};
    padding-top: ${T.md};
    border-top: 1px solid var(--border);
`,fe=a.Z.button`
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.85em;
    padding: ${T.xs} 0;
    &:hover { color: var(--text-primary); }
`,he=a.Z.div`
    display: grid;
    grid-template-columns: auto auto 1fr auto;
    gap: 0;
    margin-top: ${T.sm};
    font-size: 0.82em;
    color: var(--text-secondary);
`,ge=a.Z.div`
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    padding: ${T.xs} ${T.sm};
    border-bottom: 1px solid var(--border);
`,pe=a.Z.div`
    padding: ${T.xs} ${T.sm};
    border-bottom: 1px solid var(--border);
    word-break: break-all;
`,be=a.Z.div`
    color: var(--text-muted);
    padding: ${T.sm} 0;
`;function me({sectionRef:e,open:t,onToggle:r,entries:a}){return(0,n.jsxs)(de,{ref:e,children:[(0,n.jsxs)(fe,{onClick:()=>r(),children:[t?"▾":"▸"," Notification Log (",a.length,")"]}),t&&(0===a.length?(0,n.jsx)(be,{children:"No notifications logged yet."}):(0,n.jsxs)(he,{children:[(0,n.jsx)(ge,{children:"Time"}),(0,n.jsx)(ge,{children:"Type"}),(0,n.jsx)(ge,{children:"Message"}),(0,n.jsx)(ge,{children:"IDs"}),a.slice().reverse().map(((e,t)=>(0,n.jsxs)(o.Fragment,{children:[(0,n.jsx)(pe,{children:new Date(e.ts).toLocaleString()}),(0,n.jsx)(pe,{children:e.source}),(0,n.jsx)(pe,{children:e.message}),(0,n.jsx)(pe,{children:e.itemIds?.join(", ")})]},t)))]}))]})}const ve=new URLSearchParams(window.location.search),ke=["removed","deleted","approved","locked","unlocked","edited"],xe=(()=>{const e=ve.get("filter");return e?e.split(",").filter((e=>ke.includes(e))):[]})(),we=a.Z.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${T.lg};
  margin-bottom: ${T.lg};
  flex-wrap: wrap;
`,ye=a.Z.div`
  display: flex;
  gap: ${T.lg};
  align-items: baseline;
  flex-wrap: wrap;
`,_e=a.Z.div`
  display: flex;
  gap: ${T.sm};
  align-items: center;
  flex-wrap: wrap;
  & label {
    color: var(--text-secondary);
    font-size: 0.85em;
    display: flex;
    align-items: center;
    gap: 3px;
    cursor: pointer;
  }
`,Se=a.Z.span`
  color: var(--text-secondary);
  font-size: 0.85em;
  font-weight: 500;
  margin-right: ${T.xs};
`,Ce=a.Z.button`
  background: none;
  border: none;
  padding: 0;
  color: var(--text-secondary);
  font-size: 0.85em;
  cursor: pointer;
  text-decoration: underline;
  &:hover { color: var(--link-hover); }
`,je=a.Z.button`
  background: var(--accent);
  border: 1px solid var(--accent);
  border-radius: ${j.sm};
  color: var(--text-on-accent);
  font-size: 0.8em;
  cursor: pointer;
  padding: 4px 8px;
  &:hover:not(:disabled) { background: var(--accent-hover); border-color: var(--accent-hover); }
  &:disabled { opacity: 0.4; cursor: default; }
`,Te=a.Z.p`
  text-align: center;
  color: var(--text-secondary);
  padding: ${T.xl};
`,Le=a.Z.span`
  display: block;
  width: 48px;
  height: 48px;
  margin: 0 auto ${T.md};
  border: 4px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;const $e=a.Z.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: ${T.sm};
`,Oe=a.Z.button`
    background: none;
    border: none;
    color: var(--link);
    cursor: pointer;
    font-size: 0.85em;
    padding: 0;
    text-decoration: none;
    &:hover { color: var(--link-hover); text-decoration: underline; }
`;!function(e){(0,S.createRoot)(document.getElementById("root")).render((0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(D,{}),(0,n.jsx)(e,{})]}))}((function(){const[e,t]=(0,o.useState)([]),[r,a]=(0,o.useState)(!1),[s,l]=(0,o.useState)(xe),[u,h]=(0,o.useState)("observed"),[g,p]=(0,o.useState)(null),[b,m]=(0,o.useState)((()=>"1"!==new URLSearchParams(location.search).get("welcome")&&"1"===localStorage.getItem("history_banner_dismissed"))),[S,C]=(0,o.useState)(!0),[j,T]=(0,o.useState)([]),[L,$]=(0,o.useState)(!1),O=(0,o.useRef)(null),E=(0,o.useCallback)((()=>{chrome.storage.local.get([k,"last_logged_in_user"],(e=>{chrome.storage.sync.get(["last_check"],(t=>{C(!!e?.[k]?.ok||!e?.last_logged_in_user&&null!=t?.last_check)}))}))}),[]),A=(0,o.useCallback)((()=>{var e;chrome.storage.local.get(["last_logged_in_user"],(e=>{p(e?.last_logged_in_user||null)})),E(),e=e=>{chrome.storage.local.get(void 0,(r=>{const n=[];Object.keys(e).forEach((t=>{e[t].forEach((e=>{const r=new c({object:e});r.user=t,n.push(r)}))}));const o=n.map((e=>function(e,t){const r=e.getID(),n=e.getObservedUTC()||0,o=e.getChangeType()||"",a=e.getSeenCount(),s=e.user||"",l=s!==w,c=l?s:"other",u=_(c,l,r,t),h=i(r)?"comment":"post";let g="",p="",b="",m="n/a",v="",k=0;if(u&&"string"!=typeof u){const e=u;k=e.getCreatedUTC()||0,g=(e.getText()||"").trim(),p=(e.getBody?.()||"").trim(),b=e.getSubreddit?.()||"",k&&(m=d(n-k)||"n/a",v=new Date(1e3*k).toString())}g||p||(g=r||"");const x=u&&"string"!=typeof u?u.getPostID?.():void 0;let y="#",S=!1;return i(r)?x?y=J(r,x):S=!0:y=J(r),{id:r,action:o,actionVariant:oe(o),observedUTC:n,createdUTC:k,formattedObserved:f(n),formattedObservedFull:new Date(1e3*n).toString(),timeLength:m,formattedCreated:v,contentType:h,user:c,subreddit:b,text:g,body:p,href:y,needsResolve:S,seenCount:a}}(e,r)));t(o),a(!0)}))},chrome.storage.sync.get("user_subscriptions",(t=>{const r=v("changes","other",!1),n=[r],o={[r]:w};Object.keys(t.user_subscriptions).forEach((e=>{const t=v("changes",e,!0);n.push(t),o[t]=e})),chrome.storage.sync.get(n,(t=>{const r={};n.forEach((e=>{e in t&&t[e].length&&(r[o[e]]=t[e])})),e(r)}))}))}),[E]);(0,o.useEffect)((()=>{A(),x(y,[]).then(T);let e=null;const t=()=>{e&&clearTimeout(e),e=setTimeout(A,500)},r=(e,r)=>{const n=Object.keys(e);("sync"===r&&n.some((e=>e.startsWith("changes_")))||"local"===r&&n.some((e=>e.startsWith("items_"))))&&t(),("sync"===r&&e.last_check||"local"===r&&e[k])&&E(),"local"===r&&e.notification_log&&T(e.notification_log.newValue||[])};return chrome.storage.onChanged.addListener(r),()=>{chrome.storage.onChanged.removeListener(r),e&&clearTimeout(e)}}),[A]);const M=e=>{const t=`https://www.reddit.com/api/info.json?id=${encodeURIComponent(e)}`,r=`https://www.reddit.com/api/info?id=${encodeURIComponent(e)}`;(async()=>!!await te())().then((e=>{if(e)throw new Error("a second account is signing in");return fetch(t,{credentials:"include"})})).then((e=>e.json())).then((t=>{const n=t?.data?.children&&Array.isArray(t.data.children)?t.data.children:[],o=n[0]?.data||(n.find((t=>t?.data?.name===e))||{}).data;if(o?.permalink)return void window.open(`https://www.reddit.com${o.permalink}?context=3`,"_blank");const a=o&&(o.link_id||("t3_"===o.parent_id?.substr(0,3)?o.parent_id:null));"t3_"===a?.substr(0,3)?window.open(J(e,a),"_blank"):window.open(r,"_blank")})).catch((()=>{window.open(r,"_blank")}))},D=(0,o.useMemo)((()=>{const t=e.filter((e=>((e,t)=>0===t.length||t.includes(e.actionVariant))(e,s))),r=[...t];return"observed"===u?r.sort(((e,t)=>t.observedUTC-e.observedUTC)):"created"===u?r.sort(((e,t)=>t.createdUTC-e.createdUTC)):r.sort(((e,t)=>t.observedUTC-t.createdUTC-(e.observedUTC-e.createdUTC))),r}),[e,s,u]),I=!b,R=b&&0===e.length&&r;return r?(0,n.jsxs)(V,{children:[I?(0,n.jsx)(ce,{currentUser:g,onDismiss:()=>{localStorage.setItem("history_banner_dismissed","1"),m(!0)}}):(0,n.jsx)(Ce,{onClick:()=>{localStorage.removeItem("history_banner_dismissed"),m(!1)},children:"show welcome message"}),(0,n.jsxs)($e,{children:[(0,n.jsx)("h1",{style:{margin:0},children:"History"}),(0,n.jsx)(Oe,{onClick:()=>{$(!0),setTimeout((()=>O.current?.scrollIntoView({behavior:"smooth"})),50)},children:"notification log"})]}),(0,n.jsx)(we,{children:(0,n.jsxs)(ye,{children:[(0,n.jsxs)(_e,{children:[(0,n.jsx)(Se,{children:"filter"}),[["removed","mod removed"],["deleted","user deleted"],["locked","locked"],["unlocked","unlocked"],["approved","approved"],["edited","edited"]].map((([e,t])=>(0,n.jsxs)("label",{children:[(0,n.jsx)("input",{type:"checkbox",checked:s.includes(e),onChange:t=>{l(t.target.checked?[...s,e]:s.filter((t=>t!==e)))}}),t]},e)))]}),(0,n.jsxs)(_e,{children:[(0,n.jsx)(Se,{children:"sort"}),[["observed","observed"],["created","created"],["delta","time to action"]].map((([e,t])=>(0,n.jsxs)("label",{children:[(0,n.jsx)("input",{type:"radio",name:"sort",value:e,checked:u===e,onChange:()=>h(e)}),t]},e)))]}),(0,n.jsx)(je,{disabled:0===s.length&&"observed"===u,onClick:()=>{l([]),h("observed")},children:"reset"})]})}),D.length>0?D.map(((e,t)=>(0,n.jsx)(ae,{row:e,onResolve:M},`${e.id}-${t}`))):(0,n.jsxs)(n.Fragment,{children:[R&&(0,n.jsx)(ue,{currentUser:g}),!R&&0===e.length&&!S&&(0,n.jsxs)(Te,{children:[(0,n.jsx)(Le,{}),"Scanning your recent posts and comments…"]}),!R&&(S||e.length>0)&&(0,n.jsx)(Te,{children:0===e.length?"No actions observed since extension installation.":"No events match the current filter."})]}),(0,n.jsx)(me,{sectionRef:O,open:L,onToggle:()=>$(!L),entries:j})]}):null}))}},o={};function a(e){var t=o[e];if(void 0!==t)return t.exports;var r=o[e]={exports:{}};return n[e].call(r.exports,r,r.exports,a),r.exports}a.m=n,e=[],a.O=(t,r,n,o)=>{if(!r){var s=1/0;for(u=0;u<e.length;u++){for(var[r,n,o]=e[u],l=!0,i=0;i<r.length;i++)(!1&o||s>=o)&&Object.keys(a.O).every((e=>a.O[e](r[i])))?r.splice(i--,1):(l=!1,o<s&&(s=o));if(l){e.splice(u--,1);var c=n();void 0!==c&&(t=c)}}return t}o=o||0;for(var u=e.length;u>0&&e[u-1][2]>o;u--)e[u]=e[u-1];e[u]=[r,n,o]},a.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return a.d(t,{a:t}),t},r=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,a.t=function(e,n){if(1&n&&(e=this(e)),8&n)return e;if("object"==typeof e&&e){if(4&n&&e.__esModule)return e;if(16&n&&"function"==typeof e.then)return e}var o=Object.create(null);a.r(o);var s={};t=t||[null,r({}),r([]),r(r)];for(var l=2&n&&e;"object"==typeof l&&!~t.indexOf(l);l=r(l))Object.getOwnPropertyNames(l).forEach((t=>s[t]=()=>e[t]));return s.default=()=>e,a.d(o,s),o},a.d=(e,t)=>{for(var r in t)a.o(t,r)&&!a.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},a.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),a.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},(()=>{var e={908:0};a.O.j=t=>0===e[t];var t=(t,r)=>{var n,o,[s,l,i]=r,c=0;if(s.some((t=>0!==e[t]))){for(n in l)a.o(l,n)&&(a.m[n]=l[n]);if(i)var u=i(a)}for(t&&t(r);c<s.length;c++)o=s[c],a.o(e,o)&&e[o]&&e[o][0](),e[o]=0;return a.O(u)},r=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})();var s=a.O(void 0,[736],(()=>a(606)));s=a.O(s)})();