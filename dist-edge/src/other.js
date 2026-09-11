(()=>{"use strict";var e,t,r,n={9947:(e,t,r)=>{r.d(t,{C3:()=>a,D4:()=>l,Dh:()=>o,fq:()=>s});r(7785);const n=e=>e.replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/[^\S\n]+/g," ").substr(0,1e4),a=e=>"t1"===e.substr(0,2),s=(e,t)=>{let r=Object.keys(e).map((t=>[t,e[t]]));return r.sort(((e,r)=>r[1][t]-e[1][t])),r};class l{constructor({item:e=null,observed_utc:t=null,object:r=null}){if(r)this.t=r.t,this.o=r.o,this.c=r.c,this.n=r.n||0,this.r=r.r||0,void 0!==r.p&&(this.p=r.p),void 0!==r.b&&(this.b=r.b),void 0!==r.s&&(this.s=r.s);else{let r="";e&&a(e.name)?r=n(e.body||""):e&&(r=e.title||""),this.t=r,this.o=t,this.c=e?e.created_utc:0,this.n=0,this.r=0,e&&a(e.name)&&e.link_id&&(this.p=e.link_id),e&&!a(e.name)&&e.selftext&&(this.b=n(e.selftext)),e&&e.subreddit&&(this.s=e.subreddit)}}setText(e){this.t=n(e)}getText(){return this.t}getBody(){return this.b}getSubreddit(){return this.s}getObservedUTC(){return this.o}getCreatedUTC(){return this.c}resetSeenCount(){this.n=0}getSeenCount(){return this.n}getPostID(){return this.p}incrementRemovalCount(){return void 0===this.r&&(this.r=0),this.r+=1,this.r}resetRemovalCount(){this.r=0}getRemovalCount(){return this.r||0}incrementSeenCount(){return void 0===this.n&&(this.n=0),this.n+=1,this.n}}const o=e=>(e=>{const t=[[60,"second","seconds"],[60,"minute","minutes"],[24,"hour","hours"],[7,"day","days"],[365/12/7,"week","weeks"],[12,"month","months"],[10,"year","years"],[10,"decade","decades"],[10,"century","centuries"],[10,"millenium","millenia"]];if(e<60)return e+" seconds";let r=e;for(let e=0;e<t.length;e++){let n=t[e][0],a=t[e][1],s=t[e][2];if(r<n){let n=r-Math.floor(r),l=Math.round(n*t[e-1][0]);if(t[e-1][0]===l&&(r+=1,l=0),(Math.floor(r)>1||0==Math.floor(r))&&(a=s),e>1&&l>0){let r=t[e-1][1];l>1&&(r=t[e-1][2]),a+=", "+String(l)+" "+r}return String(Math.floor(r))+" "+a}r/=n}})(Math.floor((new Date).getTime()/1e3)-e)+" ago"},2488:(e,t,r)=>{var n=r(5893),a=r(7294),s=r(745),l=r(3867),o=r(7785),i=r(9947),c=r(917);const u={sm:"4px",md:"6px",lg:"8px",pill:"999px"},f={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px"},d={body:'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},h=c.iv`
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
`,p=c.iv`
    html,
    body {
        margin: 0;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family: ${d.body};
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
        margin: ${f.md} 0;
    }

    h1,
    h2,
    h3,
    h4 {
        color: var(--text-primary);
    }
    h1 {
        font-size: 22px;
        margin: 0 0 ${f.lg} 0;
    }
    h2 {
        font-size: 18px;
        margin: 0 0 ${f.md} 0;
    }
    h3 {
        font-size: 16px;
        margin: 0 0 ${f.sm} 0;
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
`,g=c.iv`
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
        font-family: ${d.mono};
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
`,b="ui_theme";function m(e){const t="auto"===e?window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark":e;document.documentElement.setAttribute("data-theme",t)}function v(){return(0,a.useEffect)((()=>{try{chrome.storage.local.get([b],(e=>{m(e?.[b]||"auto")}))}catch{m("auto")}const e=window.matchMedia?.("(prefers-color-scheme: light)"),t=()=>{try{chrome.storage.local.get([b],(e=>{"auto"===(e?.[b]||"auto")&&m("auto")}))}catch(e){}};e?.addEventListener?.("change",t);const r=(e,t)=>{"local"===t&&e[b]&&m(e[b].newValue||"auto")};return chrome.storage.onChanged.addListener(r),()=>{e?.removeEventListener?.("change",t),chrome.storage.onChanged.removeListener(r)}}),[]),(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(c.xB,{styles:h}),(0,n.jsx)(c.xB,{styles:p}),(0,n.jsx)(c.xB,{styles:g})]})}const k=l.Z.a`
    color: var(--link);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,x=l.Z.a`
    color: var(--text-secondary);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,w=(l.Z.button`
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
`,l.Z.button`
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
    ${e=>{switch(e.variant){case"secondary":return c.iv`
                    background: var(--button-bg);
                    color: var(--button-text);
                    border-color: var(--border);
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;case"ghost":return c.iv`
                    background: transparent;
                    color: var(--link);
                    border-color: transparent;
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;default:return c.iv`
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
`),_=(l.Z.div`
    padding: 10px 12px;
    margin: 6px 0;
    border-radius: ${u.md};
    font-size: 0.92em;
    ${e=>{switch(e.variant){case"warning":return c.iv`
                    background: var(--locked-bg);
                    border: 1px solid var(--locked-border);
                    color: var(--text-primary);
                `;case"success":return c.iv`
                    background: var(--approved-bg);
                    border: 1px solid var(--approved-border);
                    color: var(--text-primary);
                `;case"news":return c.iv`
                    background: var(--note-bg);
                    border: 1px solid var(--border-light);
                    color: var(--text-primary);
                `;default:return c.iv`
                    background: var(--bg-surface);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                `}}}
`,l.Z.span`
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
`,l.Z.div`
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: ${u.lg};
    padding: ${f.md} ${f.lg};
    margin-bottom: ${f.md};
    transition: border-color 0.15s ease;
    &:hover {
        border-color: var(--border-light);
    }
`),y=l.Z.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${f.sm};
    margin-bottom: ${f.xs};
`,S=l.Z.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${f.sm};
    color: var(--text-secondary);
    font-size: 0.85em;
    margin-bottom: ${f.sm};
    & > span + span::before {
        content: '·';
        margin-right: ${f.sm};
        color: var(--text-muted);
    }
`,C=l.Z.div`
    color: var(--text-primary);
    font-size: 0.95em;
`,T=l.Z.div`
    display: flex;
    gap: ${f.sm};
    margin-top: ${f.sm};
    padding-top: ${f.sm};
    border-top: 1px solid var(--border);
`,L=(l.Z.span`
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
    ${e=>{switch(e.variant){case"removed":return c.iv`
                    background: var(--removed-bg);
                    border-color: var(--removed-border);
                    color: var(--removed-text);
                `;case"deleted":return c.iv`
                    background: var(--deleted-bg);
                    border-color: var(--deleted-border);
                    color: var(--deleted-text);
                `;case"approved":case"unlocked":return c.iv`
                    background: var(--approved-bg);
                    border-color: var(--approved-border);
                    color: var(--text-primary);
                `;case"locked":return c.iv`
                    background: var(--locked-bg);
                    border-color: var(--locked-border);
                    color: var(--text-primary);
                `;case"edited":return c.iv`
                    background: var(--bg-surface-hover);
                    border-color: var(--border);
                    color: var(--text-primary);
                `;default:return c.iv`
                    background: var(--bg-surface-hover);
                    border-color: var(--border);
                    color: var(--text-secondary);
                `}}}
`,l.Z.h2`
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin: ${f.lg} 0 ${f.sm} 0;
    padding-bottom: ${f.xs};
    border-bottom: 1px solid var(--border);
`,l.Z.label`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${f.md};
    padding: ${f.sm} 0;
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
`,l.Z.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
`,l.Z.input`
    width: 80px;
    text-align: right;
`,l.Z.input`
    width: 100%;
`,l.Z.span`
    color: var(--author);
    font-weight: 600;
`,l.Z.span`
    color: var(--text-secondary);
`),O=l.Z.h3`
    margin: ${f.xs} 0 ${f.sm} 0;
    color: var(--text-primary);
`,E=l.Z.div`
    font-size: 0.95em;
`;!function(e){function t(e){return" "==e||"\n"==e}function r(e){return/[\x09-\x0d ]/.test(e)}function n(e){return/[A-Za-z0-9]/.test(e)}function a(e){return/[A-Za-z]/.test(e)}function s(e){return/[0-9]/.test(e)}function l(e){return/[0-9a-fA-F]/.test(e)}function o(e){return/[\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]/.test(e)}function i(e){var t="0123456789ABCDEF";return"%"+t[(240&e)>>4]+t[(15&e)>>0]}function c(e){var t=e.charCodeAt(0);if(t<128)return i(t);if(t>127&&t<2048){var r=i(t>>6&255|192);return r+=i(t>>0&63|128)}r=i(t>>12&255|224);return r+=i(t>>6&63|128),r+=i(t>>0&63|128)}function u(e,t){var n,a=0,s=e.length;if(s<3||"<"!=e[0])return Ne;"/"==e[n=1]&&(a=1,n++);for(var l=0;n<s&&!(l>=t.length);++n,++l)if(e[n]!=t[l])return Ne;return n==s?Ne:r(e[n])||">"==e[n]?a?Fe:Be:Ne}function f(e,t){for(var r,n=0;n<t.s.length;){for(r=n;n<t.s.length&&"\\"!=t.s[n];)n++;if(n>r&&(e.s+=t.s.slice(r,n)),n+1>=t.s.length)break;e.s+=t.s[n+1],n+=2}}var d=1114111;var h=["&AElig;","&Aacute;","&Acirc;","&Agrave;","&Alpha;","&Aring;","&Atilde;","&Auml;","&Beta;","&Ccedil;","&Chi;","&Dagger;","&Delta;","&ETH;","&Eacute;","&Ecirc;","&Egrave;","&Epsilon;","&Eta;","&Euml;","&Gamma;","&Iacute;","&Icirc;","&Igrave;","&Iota;","&Iuml;","&Kappa;","&Lambda;","&Mu;","&Ntilde;","&Nu;","&OElig;","&Oacute;","&Ocirc;","&Ograve;","&Omega;","&Omicron;","&Oslash;","&Otilde;","&Ouml;","&Phi;","&Pi;","&Prime;","&Psi;","&Rho;","&Scaron;","&Sigma;","&THORN;","&Tau;","&Theta;","&Uacute;","&Ucirc;","&Ugrave;","&Upsilon;","&Uuml;","&Xi;","&Yacute;","&Yuml;","&Zeta;","&aacute;","&acirc;","&acute;","&aelig;","&agrave;","&alefsym;","&alpha;","&amp;","&and;","&ang;","&apos;","&aring;","&asymp;","&atilde;","&auml;","&bdquo;","&beta;","&brvbar;","&bull;","&cap;","&ccedil;","&cedil;","&cent;","&chi;","&circ;","&clubs;","&cong;","&copy;","&crarr;","&cup;","&curren;","&dArr;","&dagger;","&darr;","&deg;","&delta;","&diams;","&divide;","&eacute;","&ecirc;","&egrave;","&empty;","&emsp;","&ensp;","&epsilon;","&equiv;","&eta;","&eth;","&euml;","&euro;","&exist;","&fnof;","&forall;","&frac12;","&frac14;","&frac34;","&frasl;","&gamma;","&ge;","&gt;","&hArr;","&harr;","&hearts;","&hellip;","&iacute;","&icirc;","&iexcl;","&igrave;","&image;","&infin;","&int;","&iota;","&iquest;","&isin;","&iuml;","&kappa;","&lArr;","&lambda;","&lang;","&laquo;","&larr;","&lceil;","&ldquo;","&le;","&lfloor;","&lowast;","&loz;","&lrm;","&lsaquo;","&lsquo;","&lt;","&macr;","&mdash;","&micro;","&middot;","&minus;","&mu;","&nabla;","&nbsp;","&ndash;","&ne;","&ni;","&not;","&notin;","&nsub;","&ntilde;","&nu;","&oacute;","&ocirc;","&oelig;","&ograve;","&oline;","&omega;","&omicron;","&oplus;","&or;","&ordf;","&ordm;","&oslash;","&otilde;","&otimes;","&ouml;","&para;","&part;","&permil;","&perp;","&phi;","&pi;","&piv;","&plusmn;","&pound;","&prime;","&prod;","&prop;","&psi;","&quot;","&rArr;","&radic;","&rang;","&raquo;","&rarr;","&rceil;","&rdquo;","&real;","&reg;","&rfloor;","&rho;","&rlm;","&rsaquo;","&rsquo;","&sbquo;","&scaron;","&sdot;","&sect;","&shy;","&sigma;","&sigmaf;","&sim;","&spades;","&sub;","&sube;","&sum;","&sup1;","&sup2;","&sup3;","&sup;","&supe;","&szlig;","&tau;","&there4;","&theta;","&thetasym;","&thinsp;","&thorn;","&tilde;","&times;","&trade;","&uArr;","&uacute;","&uarr;","&ucirc;","&ugrave;","&uml;","&upsih;","&upsilon;","&uuml;","&weierp;","&xi;","&yacute;","&yen;","&yuml;","&zeta;","&zwj;","&zwnj;"],p=[7,7,7,7,7,7,7,7,7,0,0,7,7,0,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,0,0,1,0,0,0,2,3,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,5,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],g=["","&quot;","&amp;","&#39;","&#47;","&lt;","&gt;",""];function b(e,t,r){for(var n,a=0,s=0;a<t.length;){for(n=a;a<t.length&&!(s=p[t.charCodeAt(a)]);)a++;if(a>n&&(e.s+=t.slice(n,a)),a>=t.length)break;"/"!=t[a]||r?7==p[t.charCodeAt(a)]||(e.s+=g[s]):e.s+="/",a++}}var m=[2,2,2,2,2,2,2,2,2,0,0,2,2,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,1,0,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];function v(e,t){for(var r,n=0;n<t.length;){for(r=n;n<t.length&&1===m[t.charCodeAt(n)];)n++;if(n>r&&(e.s+=t.slice(r,n)),n>=t.length)break;if(2!=m[t.charCodeAt(n)]){switch(t[n]){case"&":e.s+="&amp;";break;case"'":e.s+="&#x27;";break;default:e.s+=c(t[n])}n++}else n++}}function k(e,t,r,n,s){var l,o,i=e.slice(r),c=0;for(o=0;o<t;++o)if("<"==i[o]){t=o;break}for(;t>0;){var u=i[t-1];if("\0"===u)break;if(-1!=="?!.,".indexOf(u))t--;else{if(";"!==u)break;for(var f=t-2;f>0&&a(i[f]);)f--;f<t-2&&"&"==i[f]?t=f:t--}}if(0==t)return 0;switch(l=i[t-1]){case'"':c='"';break;case"'":c="'";break;case")":c="(";break;case"]":c="[";break;case"}":c="{"}if(0!=c){for(var d=0,h=0,p=0;p<t;)i[p]==c?h++:i[p]==l&&d++,p++;d!=h&&t--}return t}function x(e,t){var r,a=0;if(!n(e[0]))return 0;for(r=1;r<e.length-1;++r)if("."==e[r])a++;else if(!n(e[r])&&"-"!=e[r])break;return t||a?r:0}function w(e){var t,r=["http://","https://","ftp://","mailto://","/","git://","steam://","irc://","news://","mumble://","ssh://","ircs://","ts3server://","#"];for(t=0;t<r.length;++t){var n=r[t].length;if(e.length>n&&0==e.toLowerCase().indexOf(r[t])&&/[A-Za-z0-9#\/?]/.test(e[n]))return 1}return 0}function _(e,t,n,a,s){var l=t,i=new We(e,t);if(a<2||n<1||i.getChar(-1)!=s)return 0;if(n>1){var c=i.getChar(-2);return"/"==c?2:o(c)||r(c)?1:0}return l>2&&"/"==i.getChar(-2)&&"\\"==i.getChar(-3)?0:1}function y(e){if(e)for(var t in e)t in this&&(this[t]=e[t])}function S(e,t){this.callbacks=e,this.context=t}function C(){return{nofollow:0,target:null,tocData:{headerCount:0,currentLevel:0,levelOffset:0},toc_id_prefix:null,html_element_whitelist:Lt,html_attr_whitelist:Tt,flags:0,link_attributes:function(e,t,r){r.nofollow&&(e.s+=' rel="nofollow"'),null!=r.target&&(e.s+=' target="'+r.target+'"')}}}function T(e){var t=C();t.flags=null==e?St:e;var r=new S(L(),t);return r.context.flags&Ae&&(r.callbacks.image=null),r.context.flags&Me&&(r.callbacks.link=null,r.callbacks.autolink=null),(r.context.flags&Ee||r.context.flags&ze)&&(r.callbacks.blockhtml=null),r}function L(){return new y({blockcode:E,blockquote:j,blockhtml:A,header:M,hrule:D,list:$,listitem:I,paragraph:R,table:z,table_row:H,table_cell:P,autolink:Z,codespan:U,double_emphasis:q,emphasis:K,image:N,linebreak:B,link:F,raw_html_tag:W,triple_emphasis:G,strikethrough:Y,superscript:V,entity:null,normal_text:Q,doc_header:null,doc_footer:te})}function O(){return new y({blockcode:null,blockquote:null,blockhtml:null,header:J,hrule:null,list:null,listitem:null,paragraph:null,table:null,table_row:null,table_cell:null,autolink:null,codespan:U,double_emphasis:q,emphasis:K,image:null,linebreak:null,link:ee,raw_html_tag:null,triple_emphasis:G,strikethrough:Y,superscript:V,entity:null,normal_text:null,doc_header:null,doc_footer:re})}function E(e,t,n,a){if(e.s.length&&(e.s+="\n"),n&&n.s.length){var s,l;for(e.s+='<pre><code class="',s=0,l=0;s<n.s.length;++s,++l){for(;s<n.s.length&&r(n.s[s]);)s++;if(s<n.s.length){for(var o=s;s<n.s.length&&!r(n.s[s]);)s++;"."==n.s[o]&&o++,l&&(e.s+=" "),b(e,n.s.slice(o,s),!1)}}e.s+='">'}else e.s+="<pre><code>";t&&b(e,t.s,!1),e.s+="</code></pre>\n"}function j(e,t,r){e.s.length&&(e.s+="\n"),e.s+="<blockquote>\n",t&&(e.s+=t.s),e.s+="</blockquote>\n"}function A(e,t,r){var n,a;if(t){for(a=t.s.length;a>0&&"\n"==t.s[a-1];)a--;for(n=0;n<a&&"\n"==t.s[n];)n++;n>=a||(e.s.length&&(e.s+="\n"),e.s+=t.s.slice(n,a),e.s+="\n")}}function M(e,t,r,n){e.s.length&&(e.s+="\n"),n.flags&$e?(e.s+="<h"+ +r+' id="',n.toc_id_prefix&&(e.s+=n.toc_id_prefix),e.s+="toc_"+n.tocData.headerCount+++'">'):e.s+="<h"+ +r+">",t&&(e.s+=t.s),e.s+="</h"+ +r+">\n"}function D(e,t){e.s.length&&(e.s+="\n"),e.s+=t.flags&Re?"<hr/>\n":"<hr>\n"}function $(e,t,r,n){e.s.length&&(e.s+="\n"),e.s+=r&ae?"<ol>\n":"<ul>\n",t&&(e.s+=t.s),e.s+=r&ae?"</ol>\n":"</ul>\n"}function I(e,t,r,n){if(e.s+="<li>",t){for(var a=t.s.length;a&&"\n"==t.s[a-1];)a--;e.s+=t.s.slice(0,a)}e.s+="</li>\n"}function R(e,t,n){var a=0;if(e.s.length&&(e.s+="\n"),t&&t.s.length){for(;a<t.s.length&&r(t.s[a]);)a++;if(a!=t.s.length){if(e.s+="<p>",n.flags&Ie)for(var s;a<t.s.length;){for(s=a;a<t.s.length&&"\n"!=t.data[a];)a++;if(a>s&&(e.s+=t.s.slice(s,a)),a>=t.s.length-1)break;B(e,n),a++}else e.s+=t.s.slice(a);e.s+="</p>\n"}}}function z(e,t,r,n){e.s.length&&(e.s+="\n"),e.s+="<table><thead>\n",t&&(e.s+=t.s),e.s+="</thead><tbody>\n",r&&(e.s+=r.s),e.s+="</tbody></table>\n"}function H(e,t,r){e.s+="<tr>\n",t&&(e.s+=t.s),e.s+="</tr>\n"}function P(e,t,r,n,a){switch(e.s+=r&Ke?"<th":"<td",a>1&&(e.s+=' colspan="'+a+'" '),r&qe){case Ue:e.s+=' align="center">';break;case Pe:e.s+=' align="left">';break;case Ze:e.s+=' align="right">';break;default:e.s+=">"}t&&(e.s+=t.s),e.s+=r&Ke?"</th>\n":"</td>\n"}function Z(e,t,r,n){return t&&t.s.length&&(0==(n.flags&De)||w(t.s)||r==ye)?(e.s+='<a href="',r==ye&&(e.s+="mailto:"),v(e,t.s.slice(0)),n.link_attributes?(e.s+='"',n.link_attributes(e,t,n),e.s+=">"):e.s+='">',0==t.s.indexOf("mailto:")?b(e,t.s.slice(7),!1):b(e,t.s,!1),e.s+="</a>",1):0}function U(e,t,r){return e.s+="<code>",t&&b(e,t.s,!1),e.s+="</code>",1}function q(e,t,r){return t&&t.s.length?(e.s+="<strong>"+t.s+"</strong>",1):0}function K(e,t,r){return t&&t.s.length?(e.s+="<em>"+t.s+"</em>",1):0}function N(e,t,r,n,a){return t&&t.s.length?(e.s+='<img src="',v(e,t.s),e.s+='" alt="',n&&n.s.length&&b(e,n.s,!1),r&&r.s.length&&(e.s+='" title="',b(e,r.s,!1)),e.s+=a.flags&Re?'"/>':'">',1):0}function B(e,t){return e.s+=t.flags&Re?"<br/>\n":"<br>\n",1}function F(e,t,r,n,a){return null==t||0==(a.flags&De)||w(t.s)?(e.s+='<a href="',t&&t.s.length&&v(e,t.s),r&&r.s.length&&(e.s+='" title="',b(e,r.s,!1)),a.link_attributes?(e.s+='"',a.link_attributes(e,t,a),e.s+=">"):e.s+='">',n&&n.s.length&&(e.s+=n.s),e.s+="</a>",1):0}function X(e,t,r,n,a,s){var l,o,i,c,u,f=0,d=0,h=0,p=0,g=0;if(e.s+="<",s!=Fe){e.s+=n;var m=1+n.length;for(i=new Xe,c=new Xe;m<t.s.length&&!h;m++){switch(h=0,g=0,p=0,u=t.s[m]){case">":h=1;break;case"'":case'"':d?f?f==u?(f=0,p=1):c.s+=u:f=u:g=1;break;case" ":f?c.s+=" ":g=1;break;case"=":if(d){g=1;break}d=1;break;default:(d&&f||!d)&&(d?c.s+=u:i.s+=u)}if(p){var v=0;for(o=0;a[o];o++)if(a[o].length==i.s.length){for(l=0;l<i.s.length&&a[o][l].toLowerCase()==i.s[l].toLowerCase();l++);if(l==i.s.length){v=1;break}}v&&c.s.length&&i.s.length&&(e.s+=" ",b(e,i.s,!1),e.s+='="',b(e,c.s,!1),e.s+='"'),g=1}g&&(d=0,f=0,i=new Xe,c=new Xe)}e.s+=">"}else e.s+="/"+n+">"}function W(e,t,r){var n=r.html_element_whitelist;if(0!=(r.flags&He)&&n)for(var a=0;n[a];a++){var s=u(t.s,n[a]);if(s!=Ne)return X(e,t,0,n[a],r.html_attr_whitelist,s),1}return 0!=(r.flags&ze)?(b(e,t.s,!1),1):(0!=(r.flags&Ee)||0!=(r.flags&je)&&u(t.s,"style")||0!=(r.flags&Me)&&u(t.s,"a")||0!=(r.flags&Ae)&&u(t.s,"img")||(e.s+=t.s),1)}function G(e,t,r){return t&&t.s.length?(e.s+="<strong><em>"+t.s+"</em></strong>",1):0}function Y(e,t,r){return t&&t.s.length?(e.s+="<del>"+t.s+"</del>",1):0}function V(e,t,r){return t&&t.s.length?(e.s+="<sup>"+t.s+"</sup>",1):0}function Q(e,t,r){t&&b(e,t.s,!1)}function J(e,t,r,n){if(0==n.tocData.currentLevel&&(e.s+='<div class="toc">\n',n.tocData.levelOffset=r-1),(r-=n.tocData.levelOffset)>n.tocData.currentLevel)for(;r>n.tocData.currentLevel;)e.s+="<ul>\n<li>\n",n.tocData.currentLevel++;else if(r<n.tocData.currentLevel){for(e.s+="</li>\n";r<n.tocData.currentLevel;)e.s+="</ul>\n</li>\n",n.tocData.currentLevel--;e.s+="<li>\n"}else e.s+="</li>\n<li>\n";e.s+='<a href="#',n.toc_id_prefix&&(e.s+=n.toc_id_prefix),e.s+="toc_"+n.tocData.headerCount+++'">',t&&b(e,t.s,!1),e.s+="</a>\n"}function ee(e,t,r,n,a){return n&&n.s&&(e.s+=n.s),1}function te(e,t){t.tocData={headerCount:0,currentLevel:0,levelOffset:0}}function re(e,t){for(var r=!1;t.tocData.currentLevel>0;)e.s+="</li>\n</ul>\n",t.tocData.currentLevel--,r=!0;r&&(e.s+="</div>\n"),te(0,t)}y.prototype={blockcode:null,blockquote:null,blockhtml:null,header:null,hrule:null,list:null,listitem:null,paragraph:null,table:null,table_row:null,table_cell:null,autolink:null,codespan:null,double_emphasis:null,emphasis:null,image:null,linebreak:null,link:null,raw_html_tag:null,triple_emphasis:null,strikethrough:null,superscript:null,entity:null,normal_text:null,doc_header:null,doc_footer:null},e.createCustomRenderer=function(e,t){return new S(e,t)},e.defaultRenderState=C,e.getRedditRenderer=T,e.getTocRenderer=function(){var e=C();return e.flags=$e|Ee,new S(O(),e)},e.createCustomCallbacks=function(e){return new y(e)},e.getRedditCallbacks=L,e.getTocCallbacks=O;var ne=[null,function(e,r,n,a,s){var l,o=n.slice(a),i=o.length,c=o[0];return i>2&&o[1]!=c?"~"==c||t(o[1])||0==(l=et(e,r,o,c))?0:l+1:o.length>3&&o[1]==c&&o[2]!=c?t(o[2])||0==(l=tt(e,r,o,c))?0:l+2:o.length>4&&o[1]==c&&o[2]==c&&o[3]!=c?"~"==c||t(o[3])||0==(l=function(e,r,n,a){var s,l,o=n.slice(3),i=0;for(;i<o.length;){if(!(s=Je(o.slice(i),a)))return 0;if(o[i+=s]==a&&!t(o[i-1])){if(i+2<o.length&&o[i+1]==a&&o[i+2]==a&&r.callbacks.triple_emphasis){var c=new Xe;return r.spanStack.push(c),ct(c,r,o.slice(0,i)),l=r.callbacks.triple_emphasis(e,c,r.context),r.spanStack.pop(),l?i+3:0}return i+1<o.length&&o[i+1]==a?(s=et(e,r,n,a))?s-2:0:(s=tt(e,r,n,a))?s-1:0}}return 0}(e,r,o,c))?0:l+3:0},function(e,t,r,n,a){for(var s,l,o,i,c=r.slice(n),u=0;u<c.length&&"`"==c[u];)u++;for(l=0,s=u;s<c.length&&l<u;s++)"`"==c[s]?l++:l=0;if(l<u&&s>=c.length)return 0;for(o=u;o<s&&" "==c[o];)o++;for(i=s-u;i>u&&" "==c[i-1];)i--;if(o<i){var f=new Xe(c.slice(o,i));t.callbacks.codespan(e,f,t.context)||(s=0)}else t.callbacks.codespan(e,null,t.context)||(s=0);return s},function(e,t,r,n,a){if(r.slice(n),a<2||" "!=r[n-1]||" "!=r[n-2])return 0;for(var s=e.s.length;s&&" "==e.s[s-1];)s--;return e.s=e.s.slice(0,s),t.callbacks.linebreak(e,t.context)?1:0},function(e,r,n,a,s){var l,o,i=n.slice(a),c=s&&"!"==n[a-1],u=1,d=0,h=0,p=0,g=0,b=null,m=null,v=null,k=null,x=r.spanStack.length,w=0,_=0,y=0,S=0;function C(){return r.spanStack.length=x,_?u:0}if(c&&!r.callbacks.image||!c&&!r.callbacks.link)return C();for(l=1;u<i.length;u++)if("\n"==i[u])w=1;else{if("\\"==i[u-1])continue;if("["==i[u])l++;else if("]"==i[u]&&--l<=0)break}if(u>=i.length)return C();for(o=u,u++;u<i.length&&t(i[u]);)u++;if(u<i.length&&"("==i[u]){for(u++;u<i.length&&t(i[u]);)u++;for(d=u;u<i.length;)if("\\"==i[u])u+=2;else{if(")"==i[u])break;if(u>=1&&t(i[u-1])&&("'"==i[u]||'"'==i[u]))break;u++}if(u>=i.length)return C();if(h=u,"'"==i[u]||'"'==i[u]){for(S=i[u],y=1,p=++u;u<i.length;)if("\\"==i[u])u+=2;else if(i[u]==S)y=0,u++;else{if(")"==i[u]&&!y)break;u++}if(u>=i.length)return C();for(g=u-1;g>p&&t(i[g]);)g--;"'"!=i[g]&&'"'!=i[g]&&(p=g=0,h=u)}for(;h>d&&t(i[h-1]);)h--;"<"==i[d]&&d++,">"==i[h-1]&&h--,h>d&&(m=new Xe,r.spanStack.push(m),m.s+=i.slice(d,h)),g>p&&(v=new Xe,r.spanStack.push(v),v.s+=i.slice(p,g)),u++}else if(u<i.length&&"["==i[u]){var T=new Xe,L=null;for(d=++u;u<i.length&&"]"!=i[u];)u++;if(u>=i.length)return C();if(d==(h=u))if(w){var O=new Xe;for(r.spanStack.push(O),E=1;E<o;E++)"\n"!=i[E]?O.s+=i[E]:" "!=i[E-1]&&(O.s+=" ");T.s=O.s}else T.s=i.slice(1);else T.s=i.slice(d,h);if(!(L=r.refs[T.s]))return C();m=L.link,v=L.title,u++}else{T=new Xe,L=null;if(w){var E;O=new Xe;for(r.spanStack.push(O),E=1;E<o;E++)"\n"!=i[E]?O.s+=i[E]:" "!=i[E-1]&&(O.s+=" ");T.s=O.s}else T.s=i.slice(1,o);if(!(L=r.refs[T.s]))return C();m=L.link,v=L.title,u=o+1}return o>1&&(b=new Xe,r.spanStack.push(b),c?b.s+=i.slice(1,o):(r.inLinkBody=1,ct(b,r,i.slice(1,o)),r.inLinkBody=0)),m?(k=new Xe,r.spanStack.push(k),f(k,m),c?(e.s.length&&"!"==e.s[e.s.length-1]&&(e.s=e.s.slice(0,-1)),_=r.callbacks.image(e,k,v,b,r.context)):_=r.callbacks.link(e,k,v,b,r.context),C()):C()},function(e,t,r,a,s){var l=r.slice(a),o={p:we},i=function(e,t){var r,a;if(e.length<3)return 0;if("<"!=e[0])return 0;if(r="/"==e[1]?2:1,!n(e[r]))return 0;t.p=we;for(;r<e.length&&(n(e[r])||"."==e[r]||"+"==e[r]||"-"==e[r]);)r++;if(r>1&&"@"==e[r]&&0!=(a=function(e){var t=0,r=0;for(t=0;t<e.length;++t)if(!n(e[t]))switch(e[t]){case"@":r++;case"-":case".":case"_":break;case">":return 1==r?t+1:0;default:return 0}return 0}(e.slice(r))))return t.p=ye,r+a;r>2&&":"==e[r]&&(t.p=_e,r++);if(r>=e.length)t.p=we;else if(t.p){for(a=r;r<e.length;)if("\\"==e[r])r+=2;else{if(">"==e[r]||"'"==e[r]||'"'==e[r]||" "==e[r]||"\n"==e[r])break;r++}if(r>=e.length)return 0;if(r>a&&">"==e[r])return r+1;t.p=we}for(;r<e.length&&">"!=e[r];)r++;return r>=e.length?0:r+1}(l,o),c=new Xe(l.slice(0,i)),u=0;if(i>2)if(t.callbacks.autolink&&o.p!=we){var d=new Xe;t.spanStack.push(d),c.s=l.substr(1,i-2),f(d,c),u=t.callbacks.autolink(e,d,o.p,t.context),t.spanStack.pop()}else t.callbacks.raw_html_tag&&(u=t.callbacks.raw_html_tag(e,c,t.context));return u?i:0},function(e,t,r,n,a){var s=r.slice(n),l=new Xe;if(s.length>1){if(-1=="\\`*_{}[]()#+-.!:|&<>/^~".indexOf(s[1]))return 0;t.callbacks.normal_text?(l.s=s[1],t.callbacks.normal_text(e,l,t.context)):e.s+=s[1]}else 1==s.length&&(e.s+=s[0]);return 2},function(e,t,r,a,o){var i,c,u=r.slice(a),f=1,p=!1,g=!1,b=new Xe;for(f<u.length&&"#"===u[f]&&(p=!0,f++),f<u.length&&p&&"x"===u[f].toLowerCase()&&(g=!0,f++),i=f;f<u.length;){var m=u[f];if(g){if(!l(m))break}else if(p){if(!s(m))break}else if(!n(m))break;f++}if(!(f>i&&f<u.length&&";"===u[f]))return 0;if(f++,p&&undefined-i>7)return 0;if(p){if(c=g?16:10,!function(e){return e>8&&11!==e&&12!==e&&(e<14||e>31)&&(e<55296||e>57343)&&65534!==e&&65535!==e&&e<=d}(parseInt(u.slice(i),c)))return 0}else if(-1===h.indexOf(u.slice(0,f)))return 0;return t.callbacks.entity?(b.s=u.slice(0,f),t.callbacks.entity(e,b,t.context)):e.s+=u.slice(0,f),f},function(e,t,n,s,l){var o,i,c=n.slice(s),u={p:null};return!t.callbacks.autolink||t.inLinkBody?0:(o=new Xe,t.spanStack.push(o),(i=function(e,t,n,s,l,o,i){var c,u,f=n.slice(s),d=0;if(o<4||"/"!=n[s+1]||"/"!=n[s+2])return 0;for(;d<l&&a(n[s-d-1]);)d++;if(!w(n.substr(s-d,o+d)))return 0;if(c=3,0==(u=x(f.slice(c),i&xe)))return 0;for(c+=u;c<o&&!r(n[s+c]);)c++;return 0==(c=k(n,c,s))?0:(t.s+=n.substr(s-d,c+d),e.p=d,c)}(u,o,n,s,l,c.length,0))>0&&(u.p>0&&e.truncate(e.s.length-u.p),t.callbacks.autolink(e,o,_e,t.context)),t.spanStack.pop(),i)},function(e,t,r,a,s){var l,o,i=r.slice(a),c={p:null};return!t.callbacks.autolink||t.inLinkBody?0:(l=new Xe,t.spanStack.push(l),(o=function(e,t,r,a,s,l,o){r.slice(a);var i,c,u=0,f=0;for(c=0;c<s&&"\0"!=(d=r[a-c-1])&&(n(d)||-1!=".+-_".indexOf(d));++c);if(0==c)return 0;for(i=0;i<l;++i){var d;if(!n(d=r[a+i]))if("@"==d)u++;else if("."==d&&i<l-1)f++;else if("-"!=d&&"_"!=d)break}return i<2||1!=u||0==f||0==(i=k(r,i,a))?0:(t.s+=r.substr(a-c,i+c),e.p=c,i)}(c,l,r,a,s,i.length))>0&&(c.p>0&&e.truncate(e.s.length-c.p),t.callbacks.autolink(e,l,ye,t.context)),t.spanStack.pop(),o)},function(e,t,n,a,s){var l,i,c=n.slice(a),u=null,f=null,d={p:null};return!t.callbacks.link||t.inLinkBody?0:(l=new Xe,t.spanStack.push(l),(i=function(e,t,n,a,s,l,i){var c,u=n.slice(a);if(s>0&&!o(n[a-1])&&!r(n[a-1]))return 0;if(l<4||"www."!=u.slice(0,4))return 0;if(0==(c=x(u,0)))return 0;for(;c<l&&!r(u[c]);)c++;return 0==(c=k(n,c,a))?0:(t.s+=u.slice(0,c),e.p=0,c)}(d,l,n,a,s,c.length))>0&&(u=new Xe,t.spanStack.push(u),u.s+="http://",u.s+=l.s,d.p>0&&e.truncate(e.s.length-d.p),t.callbacks.normal_text?(f=new Xe,t.spanStack.push(f),t.callbacks.normal_text(f,l,t.context),t.callbacks.link(e,u,null,f,t.context),t.spanStack.pop()):t.callbacks.link(e,u,null,l,t.context),t.spanStack.pop()),t.spanStack.pop(),i)},function(e,t,r,a,s){var l,o=r.slice(a),i=0,c={p:null},u={p:null};if(!t.callbacks.autolink||t.inLinkBody)return 0;if(l=new Xe,t.spanStack.push(l),0===(i=function(e,t,r,a,s,l,o){var i=r.slice(a),c=0,u=!1,f=_(r,a,s,l,"r");if(!f)return 0;c=1,"all-"==i.substr(c,4).toLowerCase()&&(u=!0);do{var d=c,h=24;if(l>=c+10&&"reddit.com"==i.substr(c,10).toLowerCase())c+=10,h=10;else{if(l>c+2&&"t:"==i.substr(c,2)&&(c+=2),!n(i[c]))return 0;c+=1}for(;c<l&&(n(i[c])||"_"==i[c]);)c++;if(c-d<2||c-d>h)return 0}while(c<l&&("+"==i[c]||u&&"-"==i[c])&&c++);if(c<l&&"/"==i[c])for(;c<l&&(n(i[c])||"_"==i[c]||"/"==i[c]||"-"==i[c]);)c++;var p=a-f;return t.s+=r.slice(p,p+c+f),o.p=1==f,e.p=f,c}(c,l,r,a,s,o.length,u))&&(i=function(e,t,r,a,s,l,o){var i=r.slice(a),c=0;if(!(l<3)){var u=_(r,a,s,l,"u");if(!u)return 0;if(!n(i[c=1])&&"_"!=i[c]&&"-"!=i[c])return 0;for(c+=1;c<l&&(n(i[c])||"_"==i[c]||"/"==i[c]||"-"==i[c]);)c++;var f=a-u;return t.s+=r.slice(f,f+c+u),o.p=1==u,e.p=u,c}}(c,l,r,a,s,o.length,u)),i>0){var f=new Xe;if(t.spanStack.push(f),u.p&&(f.s+="/"),f.s+=l.s,c.p>0&&e.truncate(e.s.length-c.p),t.callbacks.normal_text){var d=new Xe;t.spanStack.push(d),t.callbacks.normal_text(d,l,t.context),t.callbacks.link(e,f,null,d,t.context),t.spanStack.pop()}else t.callbacks.link(e,f,null,l,t.context);t.spanStack.pop()}return t.spanStack.pop(),i},function(e,r,n,a,s){var l,o,i,c=n.slice(a),u=c.length;if(!r.callbacks.superscript)return 0;if(u<2)return 0;if("("==c[1]){for(l=o=2;o<u&&")"!=c[o]&&"\\"!=c[o-1];)o++;if(o==u)return 0}else for(l=o=1;o<u&&!t(c[o]);)o++;return o-l==0?2==l?3:0:(i=new Xe,r.spanStack.push(i),ct(i,r,c.slice(l,o)),r.callbacks.superscript(e,i,r.context),r.spanStack.pop(),2==l?o+1:o)}],ae=1,se=2,le=8,oe=0,ie=(oe++,oe++),ce=oe++,ue=oe++,fe=oe++,de=oe++,he=oe++,pe=oe++,ge=oe++,be=oe++,me=oe++,ve=oe++,ke=oe++,xe=1;oe=0;var we=oe++,_e=oe++,ye=oe++,Se=1,Ce=2,Te=4,Le=64,Oe=256,Ee=1,je=2,Ae=4,Me=8,De=32,$e=64,Ie=128,Re=256,ze=512,He=1024,Pe=1,Ze=2,Ue=3,qe=3,Ke=4,Ne=0,Be=1,Fe=2;function Xe(e){this.s=e||""}function We(e,t){if(this.s=e,t>=e.length||t<0)throw new RangeError("char * offset out of bounds");this.offset=t}function Ge(){this.spanStack=[],this.blockStack=[],this.extensions=152|Se|Ce|Ce;var e=T();this.context=e.context,this.callbacks=e.callbacks,this.inLinkBody=0,this.activeChars={},this.refs={},this.nestingLimit=16,this.maxTableCols=64}function Ye(e){var t;for(t=0;t<e.length&&"\n"!=e[t];t++)if(" "!=e[t])return 0;return t+1}function Ve(e){var t,r=0,n=0;if(e.length<3)return 0;if(" "==e[0]&&(r++," "==e[1]&&(r++," "==e[2]&&r++)),r+2>=e.length||"*"!=e[r]&&"-"!=e[r]&&"_"!=e[r])return 0;for(t=e[r];r<e.length&&"\n"!=e[r];){if(e[r]==t)n++;else if(" "!=e[r])return 0;r++}return n>=3}function Qe(e,r){var n,a=0,s=0;if(a=function(e){var t,r=0,n=0;if(e.length<3)return 0;if(" "==e[0]&&(r++," "==e[1]&&(r++," "==e[2]&&r++)),r+2>=e.length||"~"!=e[r]&&"`"!=e[r])return 0;for(t=e[r];r<e.length&&e[r]==t;)n++,r++;return n<3?0:r}(e),0==a)return 0;for(;a<e.length&&" "==e[a];)a++;if(n=a,a<e.length&&"{"==e[a]){for(a++,n++;a<e.length&&"}"!=e[a]&&"\n"!=e[a];)s++,a++;if(a==e.length||"}"!=e[a])return 0;for(;s>0&&t(e[n+0]);)n++,s--;for(;s>0&&t(e[n+s-1]);)s--;a++}else for(;a<e.length&&!t(e[a]);)s++,a++;for(r&&(r.s=e.substr(n,s));a<e.length&&"\n"!=e[a];){if(!t(e[a]))return 0;a++}return a+1}function Je(e,t){for(var r=1;r<e.length;){for(;r<e.length&&e[r]!=t&&"`"!=e[r]&&"["!=e[r];)r++;if(r==e.length)return 0;if(e[r]==t)return r;if(r&&"\\"==e[r-1])r++;else if("`"==e[r]){for(var n,a=0,s=0;r<e.length&&"`"==e[r];)r++,a++;if(r>=e.length)return 0;for(n=0;r<e.length&&n<a;)s||e[r]!=t||(s=r),"`"==e[r]?n++:n=0,r++;if(r>=e.length)return s}else if("["==e[r]){var l;s=0;for(r++;r<e.length&&"]"!=e[r];)s||e[r]!=t||(s=r),r++;for(r++;r<e.length&&(" "==e[r]||"\n"==e[r]);)r++;if(r>=e.length)return s;switch(e[r]){case"[":l="]";break;case"(":l=")";break;default:if(s)return s;continue}for(r++;r<e.length&&e[r]!=l;)s||e[r]!=t||(s=r),r++;if(r>=e.length)return s;r++}}return 0}function et(e,r,n,a){var s,l,i=n.slice(1),c=0;if(!r.callbacks.emphasis)return 0;for(i.length>1&&i[0]==a&&i[1]==a&&(c=1);c<i.length;){if(!(s=Je(i.slice(c),a)))return 0;if((c+=s)>=i.length)return 0;if(i[c]==a&&!t(i[c-1])){if(r.extensions&Se&&"_"==a&&c+1!=i.length&&!t(i[c+1])&&!o(i[c+1]))continue;var u=new Xe;return r.spanStack.push(u),ct(u,r,i.slice(0,c)),l=r.callbacks.emphasis(e,u,r.context),r.spanStack.pop(),l?c+1:0}}return 0}function tt(e,r,n,a){var s,l,o=n.slice(2),i=0,c="~"==a?r.callbacks.strikethrough:r.callbacks.double_emphasis;if(!c)return 0;for(;i<o.length;){if(!(s=Je(o.slice(i),a)))return 0;if((i+=s)+1<o.length&&o[i]==a&&o[i+1]==a&&i&&!t(o[i-1])){var u=new Xe;return r.spanStack.push(u),ct(u,r,o.slice(0,i)),l=c(e,u,r.context),r.spanStack.pop(),l?i+2:0}i++}return 0}function rt(e,t){if("#"!=t[0])return!1;if(e.extensions&Le){for(var r=0;r<t.length&&r<6&&"#"==t[r];)r++;if(r<t.length&&" "!=t[r])return!1}return!0}function nt(e){var t=0,r=e.length;if("="==e[t]){for(t=1;t<r&&"="==e[t];t++);for(;t<r&&" "==e[t];)t++;return t>=r||"\n"==e[t]?1:0}if("-"==e[t]){for(t=1;t<r&&"-"==e[t];t++);for(;t<r&&" "==e[t];)t++;return t>=r||"\n"==e[t]?2:0}return 0}function at(e){for(var t=e.length,r=0;r<t&&"\n"!=e[r];)r++;return++r>=t?0:nt(e.slice(r))}function st(e){var t=0,r=e.length;return t<r&&" "==e[t]&&t++,t<r&&" "==e[t]&&t++,t<r&&" "==e[t]&&t++,t<r&&">"==e[t]?t+1<r&&" "==e[t+1]?t+2:t+1:0}function lt(e){return e.length>3&&" "==e[0]&&" "==e[1]&&" "==e[2]&&" "==e[3]?4:0}function ot(e){var t=e.length,r=0;if(r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r>=t||e[r]<"0"||e[r]>"9")return 0;for(;r<t&&e[r]>="0"&&e[r]<="9";)r++;return r+1>=t||"."!=e[r]||" "!=e[r+1]||at(e.slice(r))?0:r+2}function it(e){var t=e.length,r=0;return r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r+1>=t||"*"!=e[r]&&"+"!=e[r]&&"-"!=e[r]||" "!=e[r+1]||at(e.slice(r))?0:r+2}function ct(e,t,r){var n=0,a=0,s=0,l=0,o=new Xe;if(!(t.spanStack.length+t.blockStack.length>t.nestingLimit))for(;n<r.length;){for(;a<r.length&&!(l=t.activeChars[r[a]]);)a++;if(t.callbacks.normal_text?(o.s=r.slice(n,a),t.callbacks.normal_text(e,o,t.context)):e.s+=r.slice(n,a),a>=r.length)break;n=a,(a=ne[l](e,t,r,n,n-s))?s=a=n+=a:a=n+1}}function ut(e,t,r){for(var n,a,s,l=0;l<r.length&&l<6&&"#"==r[l];)l++;for(n=l;n<r.length&&" "==r[n];n++);for(a=n;a<r.length&&"\n"!=r[a];a++);for(s=a;a&&"#"==r[a-1];)a--;for(;a&&" "==r[a-1];)a--;if(a>n){var o=new Xe;t.spanStack.push(o),ct(o,t,r.slice(n,a)),t.callbacks.header&&t.callbacks.header(e,o,l,t.context),t.spanStack.pop()}return s}function ft(e,t,r){var n,a;return e.length+3>=r.length||r.slice(2).toLowerCase()!=e||">"!=r[e.length+2]?0:(a=0,(n=e.length+3)<r.length&&0==(a=Ye(r.slice(n)))?0:(n+=a,a=0,n<r.length&&(a=Ye(r.slice(n))),n+a))}function dt(e,t,r,n){var a,s,l,o=0,i=null,c=new Xe(r);if(r.length<2||"<"!=r[0])return 0;for(a=1;a<r.length&&">"!=r[a]&&" "!=r[a];)a++;if(a<r.length&&(l=r.slice(1),i=-1!=["p","dl","div","math","table","ul","del","form","blockquote","figure","ol","fieldset","h1","h6","pre","script","h5","noscript","style","iframe","h4","ins","h3","h2"].indexOf(l.toLowerCase())?l.toLowerCase():""),!i){if(r.length>5&&"!"==r[1]&&"-"==r[2]&&"-"==r[3]){for(a=5;a<r.length&&("-"!=r[a-2]||"-"!=r[a-1]||">"!=r[a]);)a++;if(++a<size&&(o=Ye(r.slice(a))),o)return c.s=r.slice(0,a+o),n&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),c.s.length}if(r.length>4&&("h"==r[1]||"H"==r[1])&&("r"==r[2]||"R"==r[2])){for(a=3;a<r.length&&">"!=r[a];)a++;if(a+1<r.length&&(a++,o=Ye(r.slice(a))))return c.s=r.slice(0,a+o),n&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),c.s.length}return 0}if(a=1,s=0,"ins"!=i&&"del"!=i){var u=i.length;for(a=1;a<r.length;){for(a++;a<r.length&&("<"!=r[a-1]||"/"!=r[a]);)a++;if(a+2+u>=r.length)break;if(o=ft(tag,0,r.slice(a-1))){a+=o-1,s=1;break}}}return s?(c.s=c.s.slice(0,a),n&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),a):0}function ht(e,t,r){var n,a,s=r.length,l=0,o="",i=new Xe;for(t.blockStack.push(i),n=0;n<s;){for(l=n+1;l<s&&"\n"!=r[l-1];l++);if(a=st(r.slice(n,l)))n+=a;else if(Ye(r.slice(n,l))&&(l>=s||0==st(r.slice(l))&&!Ye(r.slice(l))))break;n<l&&(o+=r.slice(n,l),l-n),n=l}return wt(i,t,o),t.callbacks.blockquote&&t.callbacks.blockquote(e,i,t.context),t.blockStack.pop(),l}function pt(e,t,r){for(var a=0,s=0,l=0,o=r.length,i=new Xe(r);a<o;){for(s=a+1;s<o&&"\n"!=r[s-1];s++);if(0!=st(r.slice(a,s))){s=a;break}var c=r.slice(a);if(Ye(c)||0!=(l=nt(c)))break;if(Ye(c))break;if(0!=(l=nt(c)))break;if(rt(t,c)||Ve(c)||st(c)){s=a;break}if(t.extensions&Oe&&!n(r[a])){if(ot(c)||it(c)){s=a;break}if("<"==r[a]&&t.callbacks.blockhtml&&dt(e,t,c,0)){s=a;break}if(0!=(t.extensions&&Te)&&0!=Qe(c,null)){s=a;break}}a=s}for(var u=a;u&&"\n"==r[u-1];)u--;if(i.s=i.s.slice(0,u),l){var f;if(i.size){var d;for(a=i.s.length;u&&"\n"!=r[u];)u-=1;for(d=u+1;u&&"\n"==r[u-1];)u-=1;if(i.s=i.s.slice(0,u),u>0){h=new Xe;t.blockStack.push(h),ct(h,t,i.s),t.callbacks.paragraph&&t.callbacks.paragraph(e,h,t.context),t.blockStack.pop(),i.s=i.s.slice(d,a)}else i.s=i.s.slice(0,a)}f=new Xe,t.spanStack.push(f),ct(f,t,i.s),t.callbacks.header&&t.callbacks.header(e,f,l,t.context),t.spanStack.pop()}else{var h=new Xe;t.blockStack.push(h),ct(h,t,i.s),t.callbacks.paragraph&&t.callbacks.paragraph(e,h,t.context),t.blockStack.pop()}return s}function gt(e,t,r){var n,a,s=null,l=new Xe;if(0==(n=Qe(r,l)))return 0;for(s=new Xe,t.blockStack.push(s);n<r.length;){var o,i=new Xe;if(0!=(o=Qe(r.slice(n),i))&&0==i.s.length){n+=o;break}for(a=n+1;a<r.length&&"\n"!=r[a-1];a++);if(n<a){var c=r.slice(n,a);Ye(c)?s.s+="\n":s.s+=c}n=a}return s.s.length&&"\n"!=s.s[s.s.length-1]&&(s.s+="\n"),t.callbacks.blockcode&&t.callbacks.blockcode(e,s,l.s.length?l:null,t.context),t.blockStack.pop(),n}function bt(e,t,r){var n,a,s,l=r.length,o=null;for(t.blockStack.push(o=new Xe),n=0;n<l;){for(a=n+1;a<l&&"\n"!=r[a-1];a++);if(s=lt(r.slice(n,a)))n+=s;else if(!Ye(r.slice(n,a)))break;n<a&&(Ye(r.slice(n,a))?o.s+="\n":o.s+=r.slice(n,a)),n=a}for(var i=o.s.length;i&&"\n"==o.s[i-1];)i-=1;return o.s=o.s.slice(0,i),o.s+="\n",t.callbacks.blockcode&&t.callbacks.blockcode(e,o,null,t.context),t.blockStack.pop(),n}function mt(e,t,r,n){for(var a,s,l,o,i=r.length,c=null,u=0,f=0,d=0,h=0,p=0,g=0;d<3&&d<i&&" "==r[d];)d++;if((u=it(r))||(u=ot(r)),!u)return 0;for(s=u;s<i&&"\n"!=r[s-1];)s++;for(t.spanStack.push(c=new Xe),t.spanStack.push(a=new Xe),c.s+=r.slice(u,s),u=s;u<i;){var b,m;for(s++;s<i&&"\n"!=r[s-1];)s++;if(Ye(r.slice(u,s)))h=1,u=s;else{for(o=0;o<4&&u+o<s&&" "==r[u+o];)o++;if(l=o,t.flags&Te&&0!=Qe(r.slice(u+o,s),null)&&(g=!g),g||(b=it(r.slice(u+o,s)),m=ot(r.slice(u+o,s))),h&&(n.p&ae&&b||!(n.p&ae)&&m)){n.p|=le;break}if(b&&!Ve(r.slice(u+o,s))||m){if(h&&(p=1),l==d)break;f||(f=c.s.length)}else{if(h&&0==l){n.p|=le;break}h&&(c.s+="\n",p=1)}h=0,c.s+=r.slice(u+o,s),u=s}}return p&&(n.p|=se),n.p&se?f&&f<c.s.length?(wt(a,t,c.s.slice(0,f)),wt(a,t,c.s.slice(f))):wt(a,t,c.s):f&&f<c.s.length?(ct(a,t,c.s.slice(0,f)),wt(a,t,c.s.slice(f))):ct(a,t,c.s),t.callbacks.listitem&&t.callbacks.listitem(e,a,n.p,t.context),t.spanStack.pop(),t.spanStack.pop(),u}function vt(e,t,r,n){var a,s,l=r.length,o=0;for(t.blockStack.push(s=new Xe);o<l;){var i={p:n};if(a=mt(s,t,r.slice(o),i),n=i.p,o+=a,!a||n&le)break}return t.callbacks.list&&t.callbacks.list(e,s,n,t.context),t.blockStack.pop(),o}function kt(e,r,n,a,s){var l,o,i,c=0;if(r.callbacks.table_cell&&r.callbacks.table_row){for(r.spanStack.push(i=new Xe),c<n.length&&"|"==n[c]&&c++,l=0;l<a.length&&c<n.length;++l){var u,f,d;for(r.spanStack.push(d=new Xe);c<n.length&&t(n[c]);)c++;for(u=c;c<n.length&&"|"!=n[c];)c++;for(f=c-1;f>u&&t(n[f]);)f--;ct(d,r,n.slice(u,1+f)),r.callbacks.table_cell(i,d,a[l]|s,r.context,0),r.spanStack.pop(),c++}if((o=a.length-l)>0){r.callbacks.table_cell(i,null,a[l]|s,r.context,o)}r.callbacks.table_row(e,i,r.context),r.spanStack.pop()}}function xt(e,r,n){var a,s,l,o={p:null};if(r.spanStack.push(s=new Xe),r.blockStack.push(l=new Xe),a=function(e,r,n,a){for(var s,l,o,i=0,c=0;i<n.length&&"\n"!=n[i];)"|"==n[i++]&&c++;if(i==n.length||0==c)return 0;for(l=i;l>0&&t(n[l-1]);)l--;if("|"==n[0]&&c--,l&&"|"==n[l-1]&&c--,c+1>r.maxTableCols)return 0;a.p=new Array(c+1);for(var u=0;u<a.p.length;u++)a.p[u]=0;for(++i<n.length&&"|"==n[i]&&i++,o=i;o<n.length&&"\n"!=n[o];)o++;for(s=0;s<a.p.length&&i<o;++s){for(var f=0;i<o&&" "==n[i];)i++;for(":"==n[i]&&(i++,a.p[s]|=Pe,f++);i<o&&"-"==n[i];)i++,f++;for(i<o&&":"==n[i]&&(i++,a.p[s]|=Ze,f++);i<o&&" "==n[i];)i++;if(i<o&&"|"!=n[i])break;if(f<1)break;i++}return s<a.p.length?0:(kt(e,r,n.slice(0,l),a.p,Ke),o+1)}(s,r,n,o),a>0){for(;a<n.length;){var i,c=0;for(i=a;a<n.length&&"\n"!=n[a];)"|"==n[a++]&&c++;if(0==c||a==n.length){a=i;break}kt(l,r,n.slice(i,a),o.p,0),a++}r.callbacks.table&&r.callbacks.table(e,s,l,r.context)}return r.spanStack.pop(),r.blockStack.pop(),a}function wt(e,t,r){var n,a,s=0;if(!(t.spanStack.length+t.blockStack.length>t.nestingLimit))for(;s<r.length;)if(a=r.slice(s),r.length-s,rt(t,a))s+=ut(e,t,a);else if("<"==r[s]&&t.callbacks.blockhtml&&0!=(n=dt(e,t,a,1)))s+=n;else if(0!=(n=Ye(a)))s+=n;else if(Ve(a)){for(t.callbacks.hrule&&t.callbacks.hrule(e,t.context);s<r.length&&"\n"!=r[s];)s++;s++}else 0!=(t.extensions&Te)&&0!=(n=gt(e,t,a))||0!=(t.extensions&Ce)&&0!=(n=xt(e,t,a))?s+=n:st(a)?s+=ht(e,t,a):lt(a)?s+=bt(e,t,a):it(a)?s+=vt(e,t,a,0):ot(a)?s+=vt(e,t,a,ae):s+=pt(e,t,a)}function _t(e,t,r,n){var a,s,l,o,i,c,u,f=0;if(t+3>=r)return 0;if(" "==e[t]&&(f=1," "==e[t+1]&&(f=2," "==e[t+2]&&(f=3," "==e[t+3]))))return 0;if("["!=e[f+=t])return 0;for(a=++f;f<r&&"\n"!=e[f]&&"\r"!=e[f]&&"]"!=e[f];)f++;if(f>=r||"]"!=e[f])return 0;if(s=f,++f>=r||":"!=e[f])return 0;for(f++;f<r&&" "==e[f];)f++;for(f<r&&("\n"==e[f]||"\r"==e[f])&&++f<r&&"\r"==e[f]&&"\n"==e[f-1]&&f++;f<r&&" "==e[f];)f++;if(f>=r)return 0;for("<"==e[f]&&f++,l=f;f<r&&" "!=e[f]&&"\n"!=e[f]&&"\r"!=e[f];)f++;for(o=">"==e[f-1]?f-1:f;f<r&&" "==e[f];)f++;if(f<r&&"\n"!=e[f]&&"\r"!=e[f]&&"'"!=e[f]&&'"'!=e[f]&&"("!=e[f])return 0;if(u=0,(f>=r||"\r"==e[f]||"\n"==e[f])&&(u=f),f+1<r&&"\n"==e[f]&&"\r"==e[f+1]&&(u=f+1),u)for(f=u+1;f<r&&" "==e[f];)f++;if(i=c=0,f+1<r&&("'"==e[f]||'"'==e[f]||"("==e[f])){for(i=++f;f<r&&"\n"!=e[f]&&"\r"!=e[f];)f++;for(c=f+1<r&&"\n"==e[f]&&"\r"==e[f+1]?f+1:f,f-=1;f>i&&" "==e[f];)f-=1;f>i&&("'"==e[f]||'"'==e[f]||")"==e[f])&&(u=c,c=f)}if(!u||o==l)return 0;var d=e.slice(a,s),h=e.slice(l,o),p=null;return c>i&&(p=e.slice(i,c)),n.refs[d]={id:d,link:new Xe(h),title:new Xe(p)},u}function yt(e,t){for(var r=0,n=0;r<t.length;){for(var a=r;r<t.length&&"\t"!=t[r];)r++,n++;if(r>a&&(e.s+=t.slice(a,r)),r>=t.length)break;do{e.s+=" ",n++}while(n%4);r++}}Xe.prototype.truncate=function(e){if(this.s.length<e)throw new RangeError("Buffer smaller than desired size");if(e<0)throw new RangeError("Size argument is negative");this.s=this.s.slice(0,e)},We.prototype.getChar=function(e){var t=this.offset+e;if(t>=this.s.length||t<0)throw new RangeError("Character index out of bounds");return this.s.slice(t,t+1)},We.prototype.toString=function(){return this.s.slice(this.offset)},Ge.prototype.render=function(e){var t,r=new Xe,n=0;for(this.refs={};n<e.length;)if(t=_t(e,n,e.length,this))n=t;else{for(t=n;t<e.length&&"\n"!=e[t]&&"\r"!=e[t];)t++;for(t>n&&yt(r,e.slice(n,t));t<e.length&&("\n"==e[t]||"\r"==e[t]);)("\n"==e[t]||t+1<e.length&&"\n"!=e[t+1])&&(r.s+="\n"),t++;n=t}var a=new Xe;return this.callbacks.doc_header&&this.callbacks.doc_header(a,this.context),r.s.length&&("\n"!=r.s[r.s.length-1]&&"\r"!=r.s[r.s.length-1]&&(r.s+="\n"),wt(a,this,r.s)),this.callbacks.doc_footer&&this.callbacks.doc_footer(a,this.context),a.s},e.getParser=function(e,t,r,n){var a=new Ge;e&&(a.callbacks=e.callbacks),r&&(a.nestingLimit=r),r&&(a.maxTableCols=n),e&&(a.context=e.context),null!=t&&null!=t&&(a.extensions=t);var s=a.callbacks;return(s.emphasis||s.double_emphasis||s.triple_emphasis)&&(a.activeChars["*"]=ie,a.activeChars._=ie,16&a.extensions&&(a.activeChars["~"]=ie)),s.codespan&&(a.activeChars["`"]=ce),s.linebreak&&(a.activeChars["\n"]=ue),(s.image||s.link)&&(a.activeChars["["]=fe),a.activeChars["<"]=de,a.activeChars["\\"]=he,a.activeChars["&"]=pe,8&a.extensions&&(512&a.extensions||(a.activeChars["@"]=be),a.activeChars[":"]=ge,a.activeChars.w=me,a.activeChars["/"]=ve),128&a.extensions&&(a.activeChars["^"]=ke),a};var St=Ee|Ae|De|ze|Re,Ct=Ee|De|He|ze|Re,Tt=["colspan","rowspan","cellspacing","cellpadding","scope"],Lt=["tr","th","td","table","tbody","thead","tfoot","caption"];e.DEFAULT_HTML_ELEMENT_WHITELIST=Lt,e.DEFAULT_HTML_ATTR_WHITELIST=Tt,e.DEFAULT_BODY_FLAGS=St,e.DEFAULT_WIKI_FLAGS=Ct,e.HTML_SKIP_HTML=Ee,e.HTML_SKIP_STYLE=je,e.HTML_SKIP_IMAGES=Ae,e.HTML_SKIP_LINKS=Me,e.HTML_EXPAND_TABS=16,e.HTML_SAFELINK=De,e.HTML_TOC=$e,e.HTML_HARD_WRAP=Ie,e.HTML_USE_XHTML=Re,e.HTML_ESCAPE=ze,e.HTML_ALLOW_ELEMENT_WHITELIST=He,e.MKDEXT_NO_INTRA_EMPHASIS=Se,e.MKDEXT_TABLES=Ce,e.MKDEXT_FENCED_CODE=Te,e.MKDEXT_AUTOLINK=8,e.MKDEXT_STRIKETHROUGH=16,e.MKDEXT_SPACE_HEADERS=Le,e.MKDEXT_SUPERSCRIPT=128,e.MKDEXT_LAX_SPACING=Oe,e.MKDEXT_NO_EMAIL_AUTOLINK=512,e.SD_AUTOLINK_SHORT_DOMAINS=xe,e.MKDA_NOT_AUTOLINK=we,e.MKDA_NORMAL=_e,e.MKDA_EMAIL=ye,"function"==typeof define&&define("snuownd",[],e)}((()=>{const e="undefined"!=typeof window?window:"undefined"!=typeof globalThis?globalThis:{};return e.SnuOwnd||(e.SnuOwnd={}),e.SnuOwnd})());const j=("undefined"!=typeof window?window:"undefined"!=typeof globalThis?globalThis:{}).SnuOwnd.getParser(),A=l.Z.div`
  max-width: 820px;
  margin: 0 auto;
  padding: ${f.xl} ${f.lg};
`,M=l.Z.div`
  margin-bottom: ${f.lg};
  & h1 { margin: 0 0 ${f.sm} 0; font-size: 22px; }
  & p {
    color: var(--text-secondary);
    margin: ${f.xs} 0;
  }
`,D=l.Z.div`
  & p { margin: 0 0 ${f.sm} 0; }
  & ul { margin: 0; padding-left: 1.4em; }
  & li { margin: ${f.xs} 0; color: var(--text-secondary); }
`;function $(e,t,r){if(t){if(r){return`https://www.reddit.com/comments/${r.substring(3)}/-/${e.substring(3)}?context=3`}return`https://www.reveddit.com/info?id=${encodeURIComponent(e)}`}return`https://www.reddit.com/comments/${e.substring(3)}`}(0,s.createRoot)(document.getElementById("root")).render((0,n.jsx)((function(){const[e,t]=(0,a.useState)([]),[r,s]=(0,a.useState)(null),[l,c]=(0,a.useState)(!1);return(0,a.useEffect)((()=>{chrome.storage.local.get(void 0,(e=>{chrome.storage.sync.get(void 0,(r=>{const n=r.other_subscriptions||{},{unseen:a,seen:l}=(0,o.Yp)("other",!1,r),u=[...new Set([...a,...l])];s(u.length?`https://www.reveddit.com/info?id=${u.join(",")}&removal_status=all`:null);const f=[];(0,i.fq)(n,"t").forEach((([t,r])=>{const n=r.t||0,a=(0,o.PM)("other",!1,t,e),s=(0,i.C3)(t),l=s?"comment":"post";let c,u="",d="",h="",p=0;if(a&&"string"!=typeof a){const e=a,t=(e.getText()||"").trim(),r=(e.getBody?.()||"").trim();h=e.getSubreddit?.()||"",p=e.getCreatedUTC()||0,c=e.getPostID?.(),s?d=t:(u=t,d=r)}f.push({id:t,contentType:l,subreddit:h,title:u,body:d,subscribedUTC:n,createdUTC:p,formattedSubscribed:(0,i.Dh)(n),formattedSubscribedFull:new Date(1e3*n).toString(),formattedCreated:p?(0,i.Dh)(p):"",formattedCreatedFull:p?new Date(1e3*p).toString():"",href:$(t,s,c),revedditHref:`https://www.reveddit.com/info?id=${encodeURIComponent(t)}`})})),t(f),c(!0)}))}))}),[]),(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(v,{}),(0,n.jsxs)(A,{children:[(0,n.jsxs)(M,{children:[(0,n.jsx)("h1",{children:"Other subscriptions"}),(0,n.jsx)("p",{children:"Up to 100 items. When the list is full, the least-recently subscribed items are dropped. Subscribing to a post only tracks the post itself, not its comments."}),r&&(0,n.jsx)("p",{children:(0,n.jsx)(k,{href:r,target:"_blank",rel:"noreferrer",children:"View all current statuses on reveddit ↗"})})]}),l&&0===e.length&&(0,n.jsx)(_,{children:(0,n.jsxs)(D,{children:[(0,n.jsx)("p",{children:'No "other" subscriptions yet. To subscribe:'}),(0,n.jsxs)("ul",{children:[(0,n.jsx)("li",{children:'Click "subscribe-rev" beneath any comment or post'}),(0,n.jsx)("li",{children:'Right-click a Reddit or reveddit link and choose "reveddit subscribe"'}),(0,n.jsx)("li",{children:'Open the reveddit extension popup on a Reddit page and toggle "subscribe to comment/post"'})]})]})}),e.map((e=>{return(0,n.jsxs)(_,{children:[(0,n.jsx)(y,{children:(0,n.jsxs)("span",{style:{color:"var(--text-secondary)",fontSize:"0.9em"},children:[e.contentType,e.subreddit&&(0,n.jsxs)(n.Fragment,{children:[" in ",(0,n.jsxs)(L,{children:["r/",e.subreddit]})]})]})}),(0,n.jsxs)(S,{children:[(0,n.jsxs)("span",{title:e.formattedSubscribedFull,children:["subscribed ",e.formattedSubscribed]}),e.formattedCreated&&(0,n.jsxs)("span",{title:e.formattedCreatedFull,children:["created ",e.formattedCreated]})]}),e.title&&(0,n.jsx)(O,{children:e.title}),e.body&&(0,n.jsx)(C,{children:(0,n.jsx)(E,{className:"md-body",dangerouslySetInnerHTML:{__html:(r=e.body,j.render((r||"").replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<")).replace(/href="\//g,'href="https://www.reddit.com/'))}})}),(0,n.jsxs)(T,{children:[(0,n.jsx)(k,{href:e.href,target:"_blank",rel:"noreferrer",children:"Open on Reddit ↗"}),(0,n.jsx)(x,{href:e.revedditHref,target:"_blank",rel:"noreferrer",children:"View on reveddit ↗"}),(0,n.jsx)(w,{variant:"ghost",onClick:()=>{return r=e.id,void(0,o.VQ)(r,(()=>{t((e=>e.filter((e=>e.id!==r))))}));var r},children:"unsubscribe"})]})]},e.id);var r}))]})]})}),{}))},7785:(e,t,r)=>{r.d(t,{PM:()=>c,VQ:()=>o,Yp:()=>i});var n=r(9947);r(3150);const a={changes:[],removed:{},approved:{},locked:{},unlocked:{}},s=(e,t,r)=>r?e+"_u_"+t:e+"_"+t,l=(e,t=!0)=>{const r={};return Object.keys(a).forEach((n=>{r[n]=s(n,e,t)})),r},o=(e,t=(()=>{}))=>{const r="other_subscriptions",n=l("other",!1);delete n.changes,chrome.storage.sync.get(Object.values(n).concat(r),(a=>{delete a[r][e],Object.values(n).forEach((t=>{e in a[t]&&delete a[t][e]})),chrome.storage.sync.set(a,(()=>{chrome.runtime.sendMessage({action:"update-badge"}).then(t).catch((()=>t()))}))}))},i=(e,t,r)=>{const n=r.options||{},a=n.removal_status||{},s=n.lock_status||{},o=!1!==a.track,i=!1!==s.track,c={},u={};let f=[];const d=l(e,t);return o&&f.push(d.removed,d.approved),i&&f.push(d.locked,d.unlocked),f.forEach((e=>{const t=r[e]||{};Object.keys(t).forEach((e=>{const r=t[e];r&&r.u?c[e]=!0:u[e]=!0}))})),{unseen:Object.keys(c),seen:Object.keys(u)}},c=(e,t,r,a)=>{const l=s("items",e,t);return l in a&&r in a[l]?new n.D4({object:a[l][r]}):""}}},a={};function s(e){var t=a[e];if(void 0!==t)return t.exports;var r=a[e]={exports:{}};return n[e].call(r.exports,r,r.exports,s),r.exports}s.m=n,e=[],s.O=(t,r,n,a)=>{if(!r){var l=1/0;for(u=0;u<e.length;u++){for(var[r,n,a]=e[u],o=!0,i=0;i<r.length;i++)(!1&a||l>=a)&&Object.keys(s.O).every((e=>s.O[e](r[i])))?r.splice(i--,1):(o=!1,a<l&&(l=a));if(o){e.splice(u--,1);var c=n();void 0!==c&&(t=c)}}return t}a=a||0;for(var u=e.length;u>0&&e[u-1][2]>a;u--)e[u]=e[u-1];e[u]=[r,n,a]},s.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return s.d(t,{a:t}),t},r=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,s.t=function(e,n){if(1&n&&(e=this(e)),8&n)return e;if("object"==typeof e&&e){if(4&n&&e.__esModule)return e;if(16&n&&"function"==typeof e.then)return e}var a=Object.create(null);s.r(a);var l={};t=t||[null,r({}),r([]),r(r)];for(var o=2&n&&e;"object"==typeof o&&!~t.indexOf(o);o=r(o))Object.getOwnPropertyNames(o).forEach((t=>l[t]=()=>e[t]));return l.default=()=>e,s.d(a,l),a},s.d=(e,t)=>{for(var r in t)s.o(t,r)&&!s.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},s.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),s.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},s.j=576,s.p="",(()=>{s.b=document.baseURI||self.location.href;var e={576:0};s.O.j=t=>0===e[t];var t=(t,r)=>{var n,a,[l,o,i]=r,c=0;if(l.some((t=>0!==e[t]))){for(n in o)s.o(o,n)&&(s.m[n]=o[n]);if(i)var u=i(s)}for(t&&t(r);c<l.length;c++)a=l[c],s.o(e,a)&&e[a]&&e[a][0](),e[a]=0;return s.O(u)},r=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})();var l=s.O(void 0,[736],(()=>s(2488)));l=s.O(l)})();