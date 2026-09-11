(()=>{"use strict";var e,t,r,n={9947:(e,t,r)=>{r.d(t,{C3:()=>a,D4:()=>l,Dh:()=>c,QT:()=>s,tk:()=>i});var n=r(7785);const o=e=>e.replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/[^\S\n]+/g," ").substr(0,1e4),a=e=>"t1"===e.substr(0,2);class s{constructor({id:e=null,observed_utc:t=null,change_type:r=null,seen_count:n=null,object:o=null}){o?(this.i=o.i,this.o=o.o,this.g=o.g,this.n=o.n):(this.i=e,this.o=t,this.g=r,this.n=n)}getID(){return this.i}getObservedUTC(){return this.o}getChangeTypeInternal(){return this.g}getChangeType(){switch(this.g){case n.U$:return"mod removed";case n.oZ:return"user deleted";case n.Ci:return"approved";case n.nb:return"locked";case n.YU:return"unlocked";case n.WK:return"edited"}}getSeenCount(){return this.n}}class l{constructor({item:e=null,observed_utc:t=null,object:r=null}){if(r)this.t=r.t,this.o=r.o,this.c=r.c,this.n=r.n||0,this.r=r.r||0,void 0!==r.p&&(this.p=r.p),void 0!==r.b&&(this.b=r.b),void 0!==r.s&&(this.s=r.s);else{let r="";e&&a(e.name)?r=o(e.body||""):e&&(r=e.title||""),this.t=r,this.o=t,this.c=e?e.created_utc:0,this.n=0,this.r=0,e&&a(e.name)&&e.link_id&&(this.p=e.link_id),e&&!a(e.name)&&e.selftext&&(this.b=o(e.selftext)),e&&e.subreddit&&(this.s=e.subreddit)}}setText(e){this.t=o(e)}getText(){return this.t}getBody(){return this.b}getSubreddit(){return this.s}getObservedUTC(){return this.o}getCreatedUTC(){return this.c}resetSeenCount(){this.n=0}getSeenCount(){return this.n}getPostID(){return this.p}incrementRemovalCount(){return void 0===this.r&&(this.r=0),this.r+=1,this.r}resetRemovalCount(){this.r=0}getRemovalCount(){return this.r||0}incrementSeenCount(){return void 0===this.n&&(this.n=0),this.n+=1,this.n}}const i=e=>{const t=[[60,"second","seconds"],[60,"minute","minutes"],[24,"hour","hours"],[7,"day","days"],[365/12/7,"week","weeks"],[12,"month","months"],[10,"year","years"],[10,"decade","decades"],[10,"century","centuries"],[10,"millenium","millenia"]];if(e<60)return e+" seconds";let r=e;for(let e=0;e<t.length;e++){let n=t[e][0],o=t[e][1],a=t[e][2];if(r<n){let n=r-Math.floor(r),s=Math.round(n*t[e-1][0]);if(t[e-1][0]===s&&(r+=1,s=0),(Math.floor(r)>1||0==Math.floor(r))&&(o=a),e>1&&s>0){let r=t[e-1][1];s>1&&(r=t[e-1][2]),o+=", "+String(s)+" "+r}return String(Math.floor(r))+" "+o}r/=n}},c=e=>{const t=Math.floor((new Date).getTime()/1e3)-e;return i(t)+" ago"}},6402:(e,t,r)=>{var n=r(5893),o=r(7294),a=r(745),s=r(3867),l=r(7785),i=r(9947),c=r(917);const d={sm:"4px",md:"6px",lg:"8px",pill:"999px"},u={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px"},f={body:'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},h=c.iv`
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
        font-family: ${f.body};
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
        margin: ${u.md} 0;
    }

    h1,
    h2,
    h3,
    h4 {
        color: var(--text-primary);
    }
    h1 {
        font-size: 22px;
        margin: 0 0 ${u.lg} 0;
    }
    h2 {
        font-size: 18px;
        margin: 0 0 ${u.md} 0;
    }
    h3 {
        font-size: 16px;
        margin: 0 0 ${u.sm} 0;
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
        border-radius: ${d.sm};
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
        border-radius: ${d.md};
    }
    .md-body code {
        background: var(--code-bg);
        border: 1px solid var(--code-border);
        border-radius: 3px;
        padding: 0 4px;
        font-family: ${f.mono};
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
`,b="ui_theme";function m(e){const t="auto"===e?window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark":e;document.documentElement.setAttribute("data-theme",t)}function v(){return(0,o.useEffect)((()=>{try{chrome.storage.local.get([b],(e=>{m(e?.[b]||"auto")}))}catch{m("auto")}const e=window.matchMedia?.("(prefers-color-scheme: light)"),t=()=>{try{chrome.storage.local.get([b],(e=>{"auto"===(e?.[b]||"auto")&&m("auto")}))}catch(e){}};e?.addEventListener?.("change",t);const r=(e,t)=>{"local"===t&&e[b]&&m(e[b].newValue||"auto")};return chrome.storage.onChanged.addListener(r),()=>{e?.removeEventListener?.("change",t),chrome.storage.onChanged.removeListener(r)}}),[]),(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(c.xB,{styles:h}),(0,n.jsx)(c.xB,{styles:p}),(0,n.jsx)(c.xB,{styles:g})]})}const k=s.Z.a`
    color: var(--link);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,x=s.Z.a`
    color: var(--text-secondary);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,w=(s.Z.button`
    display: block;
    width: 100%;
    margin-top: 6px;
    padding: 8px 10px;
    background: var(--accent);
    color: var(--text-on-accent);
    border: 0;
    border-radius: ${d.md};
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
`,s.Z.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${d.md};
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
`),y=s.Z.div`
    padding: 10px 12px;
    margin: 6px 0;
    border-radius: ${d.md};
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
`,_=s.Z.span`
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
`,S=s.Z.div`
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: ${d.lg};
    padding: ${u.md} ${u.lg};
    margin-bottom: ${u.md};
    transition: border-color 0.15s ease;
    &:hover {
        border-color: var(--border-light);
    }
`,C=s.Z.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${u.sm};
    margin-bottom: ${u.xs};
`,j=s.Z.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${u.sm};
    color: var(--text-secondary);
    font-size: 0.85em;
    margin-bottom: ${u.sm};
    & > span + span::before {
        content: '·';
        margin-right: ${u.sm};
        color: var(--text-muted);
    }
`,T=s.Z.div`
    color: var(--text-primary);
    font-size: 0.95em;
`,L=s.Z.div`
    display: flex;
    gap: ${u.sm};
    margin-top: ${u.sm};
    padding-top: ${u.sm};
    border-top: 1px solid var(--border);
`,$=s.Z.span`
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: ${d.pill};
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
`,O=(s.Z.h2`
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin: ${u.lg} 0 ${u.sm} 0;
    padding-bottom: ${u.xs};
    border-bottom: 1px solid var(--border);
`,s.Z.label`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${u.md};
    padding: ${u.sm} 0;
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
`,s.Z.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
`,s.Z.input`
    width: 80px;
    text-align: right;
`,s.Z.input`
    width: 100%;
`,s.Z.span`
    color: var(--author);
    font-weight: 600;
`),E=s.Z.span`
    color: var(--text-secondary);
`,M=s.Z.h3`
    margin: ${u.xs} 0 ${u.sm} 0;
    color: var(--text-primary);
`,A=s.Z.div`
    font-size: 0.95em;
`;!function(e){function t(e){return" "==e||"\n"==e}function r(e){return/[\x09-\x0d ]/.test(e)}function n(e){return/[A-Za-z0-9]/.test(e)}function o(e){return/[A-Za-z]/.test(e)}function a(e){return/[0-9]/.test(e)}function s(e){return/[0-9a-fA-F]/.test(e)}function l(e){return/[\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]/.test(e)}function i(e){var t="0123456789ABCDEF";return"%"+t[(240&e)>>4]+t[(15&e)>>0]}function c(e){var t=e.charCodeAt(0);if(t<128)return i(t);if(t>127&&t<2048){var r=i(t>>6&255|192);return r+=i(t>>0&63|128)}r=i(t>>12&255|224);return r+=i(t>>6&63|128),r+=i(t>>0&63|128)}function d(e,t){var n,o=0,a=e.length;if(a<3||"<"!=e[0])return Be;"/"==e[n=1]&&(o=1,n++);for(var s=0;n<a&&!(s>=t.length);++n,++s)if(e[n]!=t[s])return Be;return n==a?Be:r(e[n])||">"==e[n]?o?Fe:qe:Be}function u(e,t){for(var r,n=0;n<t.s.length;){for(r=n;n<t.s.length&&"\\"!=t.s[n];)n++;if(n>r&&(e.s+=t.s.slice(r,n)),n+1>=t.s.length)break;e.s+=t.s[n+1],n+=2}}var f=1114111;var h=["&AElig;","&Aacute;","&Acirc;","&Agrave;","&Alpha;","&Aring;","&Atilde;","&Auml;","&Beta;","&Ccedil;","&Chi;","&Dagger;","&Delta;","&ETH;","&Eacute;","&Ecirc;","&Egrave;","&Epsilon;","&Eta;","&Euml;","&Gamma;","&Iacute;","&Icirc;","&Igrave;","&Iota;","&Iuml;","&Kappa;","&Lambda;","&Mu;","&Ntilde;","&Nu;","&OElig;","&Oacute;","&Ocirc;","&Ograve;","&Omega;","&Omicron;","&Oslash;","&Otilde;","&Ouml;","&Phi;","&Pi;","&Prime;","&Psi;","&Rho;","&Scaron;","&Sigma;","&THORN;","&Tau;","&Theta;","&Uacute;","&Ucirc;","&Ugrave;","&Upsilon;","&Uuml;","&Xi;","&Yacute;","&Yuml;","&Zeta;","&aacute;","&acirc;","&acute;","&aelig;","&agrave;","&alefsym;","&alpha;","&amp;","&and;","&ang;","&apos;","&aring;","&asymp;","&atilde;","&auml;","&bdquo;","&beta;","&brvbar;","&bull;","&cap;","&ccedil;","&cedil;","&cent;","&chi;","&circ;","&clubs;","&cong;","&copy;","&crarr;","&cup;","&curren;","&dArr;","&dagger;","&darr;","&deg;","&delta;","&diams;","&divide;","&eacute;","&ecirc;","&egrave;","&empty;","&emsp;","&ensp;","&epsilon;","&equiv;","&eta;","&eth;","&euml;","&euro;","&exist;","&fnof;","&forall;","&frac12;","&frac14;","&frac34;","&frasl;","&gamma;","&ge;","&gt;","&hArr;","&harr;","&hearts;","&hellip;","&iacute;","&icirc;","&iexcl;","&igrave;","&image;","&infin;","&int;","&iota;","&iquest;","&isin;","&iuml;","&kappa;","&lArr;","&lambda;","&lang;","&laquo;","&larr;","&lceil;","&ldquo;","&le;","&lfloor;","&lowast;","&loz;","&lrm;","&lsaquo;","&lsquo;","&lt;","&macr;","&mdash;","&micro;","&middot;","&minus;","&mu;","&nabla;","&nbsp;","&ndash;","&ne;","&ni;","&not;","&notin;","&nsub;","&ntilde;","&nu;","&oacute;","&ocirc;","&oelig;","&ograve;","&oline;","&omega;","&omicron;","&oplus;","&or;","&ordf;","&ordm;","&oslash;","&otilde;","&otimes;","&ouml;","&para;","&part;","&permil;","&perp;","&phi;","&pi;","&piv;","&plusmn;","&pound;","&prime;","&prod;","&prop;","&psi;","&quot;","&rArr;","&radic;","&rang;","&raquo;","&rarr;","&rceil;","&rdquo;","&real;","&reg;","&rfloor;","&rho;","&rlm;","&rsaquo;","&rsquo;","&sbquo;","&scaron;","&sdot;","&sect;","&shy;","&sigma;","&sigmaf;","&sim;","&spades;","&sub;","&sube;","&sum;","&sup1;","&sup2;","&sup3;","&sup;","&supe;","&szlig;","&tau;","&there4;","&theta;","&thetasym;","&thinsp;","&thorn;","&tilde;","&times;","&trade;","&uArr;","&uacute;","&uarr;","&ucirc;","&ugrave;","&uml;","&upsih;","&upsilon;","&uuml;","&weierp;","&xi;","&yacute;","&yen;","&yuml;","&zeta;","&zwj;","&zwnj;"],p=[7,7,7,7,7,7,7,7,7,0,0,7,7,0,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,0,0,1,0,0,0,2,3,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,5,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],g=["","&quot;","&amp;","&#39;","&#47;","&lt;","&gt;",""];function b(e,t,r){for(var n,o=0,a=0;o<t.length;){for(n=o;o<t.length&&!(a=p[t.charCodeAt(o)]);)o++;if(o>n&&(e.s+=t.slice(n,o)),o>=t.length)break;"/"!=t[o]||r?7==p[t.charCodeAt(o)]||(e.s+=g[a]):e.s+="/",o++}}var m=[2,2,2,2,2,2,2,2,2,0,0,2,2,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,1,0,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];function v(e,t){for(var r,n=0;n<t.length;){for(r=n;n<t.length&&1===m[t.charCodeAt(n)];)n++;if(n>r&&(e.s+=t.slice(r,n)),n>=t.length)break;if(2!=m[t.charCodeAt(n)]){switch(t[n]){case"&":e.s+="&amp;";break;case"'":e.s+="&#x27;";break;default:e.s+=c(t[n])}n++}else n++}}function k(e,t,r,n,a){var s,l,i=e.slice(r),c=0;for(l=0;l<t;++l)if("<"==i[l]){t=l;break}for(;t>0;){var d=i[t-1];if("\0"===d)break;if(-1!=="?!.,".indexOf(d))t--;else{if(";"!==d)break;for(var u=t-2;u>0&&o(i[u]);)u--;u<t-2&&"&"==i[u]?t=u:t--}}if(0==t)return 0;switch(s=i[t-1]){case'"':c='"';break;case"'":c="'";break;case")":c="(";break;case"]":c="[";break;case"}":c="{"}if(0!=c){for(var f=0,h=0,p=0;p<t;)i[p]==c?h++:i[p]==s&&f++,p++;f!=h&&t--}return t}function x(e,t){var r,o=0;if(!n(e[0]))return 0;for(r=1;r<e.length-1;++r)if("."==e[r])o++;else if(!n(e[r])&&"-"!=e[r])break;return t||o?r:0}function w(e){var t,r=["http://","https://","ftp://","mailto://","/","git://","steam://","irc://","news://","mumble://","ssh://","ircs://","ts3server://","#"];for(t=0;t<r.length;++t){var n=r[t].length;if(e.length>n&&0==e.toLowerCase().indexOf(r[t])&&/[A-Za-z0-9#\/?]/.test(e[n]))return 1}return 0}function y(e,t,n,o,a){var s=t,i=new Ve(e,t);if(o<2||n<1||i.getChar(-1)!=a)return 0;if(n>1){var c=i.getChar(-2);return"/"==c?2:l(c)||r(c)?1:0}return s>2&&"/"==i.getChar(-2)&&"\\"==i.getChar(-3)?0:1}function _(e){if(e)for(var t in e)t in this&&(this[t]=e[t])}function S(e,t){this.callbacks=e,this.context=t}function C(){return{nofollow:0,target:null,tocData:{headerCount:0,currentLevel:0,levelOffset:0},toc_id_prefix:null,html_element_whitelist:Tt,html_attr_whitelist:jt,flags:0,link_attributes:function(e,t,r){r.nofollow&&(e.s+=' rel="nofollow"'),null!=r.target&&(e.s+=' target="'+r.target+'"')}}}function j(e){var t=C();t.flags=null==e?St:e;var r=new S(T(),t);return r.context.flags&Ee&&(r.callbacks.image=null),r.context.flags&Me&&(r.callbacks.link=null,r.callbacks.autolink=null),(r.context.flags&$e||r.context.flags&Re)&&(r.callbacks.blockhtml=null),r}function T(){return new _({blockcode:$,blockquote:O,blockhtml:E,header:M,hrule:A,list:D,listitem:I,paragraph:Z,table:R,table_row:U,table_cell:z,autolink:P,codespan:H,double_emphasis:N,emphasis:K,image:B,linebreak:q,link:F,raw_html_tag:V,triple_emphasis:W,strikethrough:Y,superscript:G,entity:null,normal_text:Q,doc_header:null,doc_footer:te})}function L(){return new _({blockcode:null,blockquote:null,blockhtml:null,header:J,hrule:null,list:null,listitem:null,paragraph:null,table:null,table_row:null,table_cell:null,autolink:null,codespan:H,double_emphasis:N,emphasis:K,image:null,linebreak:null,link:ee,raw_html_tag:null,triple_emphasis:W,strikethrough:Y,superscript:G,entity:null,normal_text:null,doc_header:null,doc_footer:re})}function $(e,t,n,o){if(e.s.length&&(e.s+="\n"),n&&n.s.length){var a,s;for(e.s+='<pre><code class="',a=0,s=0;a<n.s.length;++a,++s){for(;a<n.s.length&&r(n.s[a]);)a++;if(a<n.s.length){for(var l=a;a<n.s.length&&!r(n.s[a]);)a++;"."==n.s[l]&&l++,s&&(e.s+=" "),b(e,n.s.slice(l,a),!1)}}e.s+='">'}else e.s+="<pre><code>";t&&b(e,t.s,!1),e.s+="</code></pre>\n"}function O(e,t,r){e.s.length&&(e.s+="\n"),e.s+="<blockquote>\n",t&&(e.s+=t.s),e.s+="</blockquote>\n"}function E(e,t,r){var n,o;if(t){for(o=t.s.length;o>0&&"\n"==t.s[o-1];)o--;for(n=0;n<o&&"\n"==t.s[n];)n++;n>=o||(e.s.length&&(e.s+="\n"),e.s+=t.s.slice(n,o),e.s+="\n")}}function M(e,t,r,n){e.s.length&&(e.s+="\n"),n.flags&De?(e.s+="<h"+ +r+' id="',n.toc_id_prefix&&(e.s+=n.toc_id_prefix),e.s+="toc_"+n.tocData.headerCount+++'">'):e.s+="<h"+ +r+">",t&&(e.s+=t.s),e.s+="</h"+ +r+">\n"}function A(e,t){e.s.length&&(e.s+="\n"),e.s+=t.flags&Ze?"<hr/>\n":"<hr>\n"}function D(e,t,r,n){e.s.length&&(e.s+="\n"),e.s+=r&oe?"<ol>\n":"<ul>\n",t&&(e.s+=t.s),e.s+=r&oe?"</ol>\n":"</ul>\n"}function I(e,t,r,n){if(e.s+="<li>",t){for(var o=t.s.length;o&&"\n"==t.s[o-1];)o--;e.s+=t.s.slice(0,o)}e.s+="</li>\n"}function Z(e,t,n){var o=0;if(e.s.length&&(e.s+="\n"),t&&t.s.length){for(;o<t.s.length&&r(t.s[o]);)o++;if(o!=t.s.length){if(e.s+="<p>",n.flags&Ie)for(var a;o<t.s.length;){for(a=o;o<t.s.length&&"\n"!=t.data[o];)o++;if(o>a&&(e.s+=t.s.slice(a,o)),o>=t.s.length-1)break;q(e,n),o++}else e.s+=t.s.slice(o);e.s+="</p>\n"}}}function R(e,t,r,n){e.s.length&&(e.s+="\n"),e.s+="<table><thead>\n",t&&(e.s+=t.s),e.s+="</thead><tbody>\n",r&&(e.s+=r.s),e.s+="</tbody></table>\n"}function U(e,t,r){e.s+="<tr>\n",t&&(e.s+=t.s),e.s+="</tr>\n"}function z(e,t,r,n,o){switch(e.s+=r&Ke?"<th":"<td",o>1&&(e.s+=' colspan="'+o+'" '),r&Ne){case He:e.s+=' align="center">';break;case ze:e.s+=' align="left">';break;case Pe:e.s+=' align="right">';break;default:e.s+=">"}t&&(e.s+=t.s),e.s+=r&Ke?"</th>\n":"</td>\n"}function P(e,t,r,n){return t&&t.s.length&&(0==(n.flags&Ae)||w(t.s)||r==_e)?(e.s+='<a href="',r==_e&&(e.s+="mailto:"),v(e,t.s.slice(0)),n.link_attributes?(e.s+='"',n.link_attributes(e,t,n),e.s+=">"):e.s+='">',0==t.s.indexOf("mailto:")?b(e,t.s.slice(7),!1):b(e,t.s,!1),e.s+="</a>",1):0}function H(e,t,r){return e.s+="<code>",t&&b(e,t.s,!1),e.s+="</code>",1}function N(e,t,r){return t&&t.s.length?(e.s+="<strong>"+t.s+"</strong>",1):0}function K(e,t,r){return t&&t.s.length?(e.s+="<em>"+t.s+"</em>",1):0}function B(e,t,r,n,o){return t&&t.s.length?(e.s+='<img src="',v(e,t.s),e.s+='" alt="',n&&n.s.length&&b(e,n.s,!1),r&&r.s.length&&(e.s+='" title="',b(e,r.s,!1)),e.s+=o.flags&Ze?'"/>':'">',1):0}function q(e,t){return e.s+=t.flags&Ze?"<br/>\n":"<br>\n",1}function F(e,t,r,n,o){return null==t||0==(o.flags&Ae)||w(t.s)?(e.s+='<a href="',t&&t.s.length&&v(e,t.s),r&&r.s.length&&(e.s+='" title="',b(e,r.s,!1)),o.link_attributes?(e.s+='"',o.link_attributes(e,t,o),e.s+=">"):e.s+='">',n&&n.s.length&&(e.s+=n.s),e.s+="</a>",1):0}function X(e,t,r,n,o,a){var s,l,i,c,d,u=0,f=0,h=0,p=0,g=0;if(e.s+="<",a!=Fe){e.s+=n;var m=1+n.length;for(i=new Xe,c=new Xe;m<t.s.length&&!h;m++){switch(h=0,g=0,p=0,d=t.s[m]){case">":h=1;break;case"'":case'"':f?u?u==d?(u=0,p=1):c.s+=d:u=d:g=1;break;case" ":u?c.s+=" ":g=1;break;case"=":if(f){g=1;break}f=1;break;default:(f&&u||!f)&&(f?c.s+=d:i.s+=d)}if(p){var v=0;for(l=0;o[l];l++)if(o[l].length==i.s.length){for(s=0;s<i.s.length&&o[l][s].toLowerCase()==i.s[s].toLowerCase();s++);if(s==i.s.length){v=1;break}}v&&c.s.length&&i.s.length&&(e.s+=" ",b(e,i.s,!1),e.s+='="',b(e,c.s,!1),e.s+='"'),g=1}g&&(f=0,u=0,i=new Xe,c=new Xe)}e.s+=">"}else e.s+="/"+n+">"}function V(e,t,r){var n=r.html_element_whitelist;if(0!=(r.flags&Ue)&&n)for(var o=0;n[o];o++){var a=d(t.s,n[o]);if(a!=Be)return X(e,t,0,n[o],r.html_attr_whitelist,a),1}return 0!=(r.flags&Re)?(b(e,t.s,!1),1):(0!=(r.flags&$e)||0!=(r.flags&Oe)&&d(t.s,"style")||0!=(r.flags&Me)&&d(t.s,"a")||0!=(r.flags&Ee)&&d(t.s,"img")||(e.s+=t.s),1)}function W(e,t,r){return t&&t.s.length?(e.s+="<strong><em>"+t.s+"</em></strong>",1):0}function Y(e,t,r){return t&&t.s.length?(e.s+="<del>"+t.s+"</del>",1):0}function G(e,t,r){return t&&t.s.length?(e.s+="<sup>"+t.s+"</sup>",1):0}function Q(e,t,r){t&&b(e,t.s,!1)}function J(e,t,r,n){if(0==n.tocData.currentLevel&&(e.s+='<div class="toc">\n',n.tocData.levelOffset=r-1),(r-=n.tocData.levelOffset)>n.tocData.currentLevel)for(;r>n.tocData.currentLevel;)e.s+="<ul>\n<li>\n",n.tocData.currentLevel++;else if(r<n.tocData.currentLevel){for(e.s+="</li>\n";r<n.tocData.currentLevel;)e.s+="</ul>\n</li>\n",n.tocData.currentLevel--;e.s+="<li>\n"}else e.s+="</li>\n<li>\n";e.s+='<a href="#',n.toc_id_prefix&&(e.s+=n.toc_id_prefix),e.s+="toc_"+n.tocData.headerCount+++'">',t&&b(e,t.s,!1),e.s+="</a>\n"}function ee(e,t,r,n,o){return n&&n.s&&(e.s+=n.s),1}function te(e,t){t.tocData={headerCount:0,currentLevel:0,levelOffset:0}}function re(e,t){for(var r=!1;t.tocData.currentLevel>0;)e.s+="</li>\n</ul>\n",t.tocData.currentLevel--,r=!0;r&&(e.s+="</div>\n"),te(0,t)}_.prototype={blockcode:null,blockquote:null,blockhtml:null,header:null,hrule:null,list:null,listitem:null,paragraph:null,table:null,table_row:null,table_cell:null,autolink:null,codespan:null,double_emphasis:null,emphasis:null,image:null,linebreak:null,link:null,raw_html_tag:null,triple_emphasis:null,strikethrough:null,superscript:null,entity:null,normal_text:null,doc_header:null,doc_footer:null},e.createCustomRenderer=function(e,t){return new S(e,t)},e.defaultRenderState=C,e.getRedditRenderer=j,e.getTocRenderer=function(){var e=C();return e.flags=De|$e,new S(L(),e)},e.createCustomCallbacks=function(e){return new _(e)},e.getRedditCallbacks=T,e.getTocCallbacks=L;var ne=[null,function(e,r,n,o,a){var s,l=n.slice(o),i=l.length,c=l[0];return i>2&&l[1]!=c?"~"==c||t(l[1])||0==(s=et(e,r,l,c))?0:s+1:l.length>3&&l[1]==c&&l[2]!=c?t(l[2])||0==(s=tt(e,r,l,c))?0:s+2:l.length>4&&l[1]==c&&l[2]==c&&l[3]!=c?"~"==c||t(l[3])||0==(s=function(e,r,n,o){var a,s,l=n.slice(3),i=0;for(;i<l.length;){if(!(a=Je(l.slice(i),o)))return 0;if(l[i+=a]==o&&!t(l[i-1])){if(i+2<l.length&&l[i+1]==o&&l[i+2]==o&&r.callbacks.triple_emphasis){var c=new Xe;return r.spanStack.push(c),ct(c,r,l.slice(0,i)),s=r.callbacks.triple_emphasis(e,c,r.context),r.spanStack.pop(),s?i+3:0}return i+1<l.length&&l[i+1]==o?(a=et(e,r,n,o))?a-2:0:(a=tt(e,r,n,o))?a-1:0}}return 0}(e,r,l,c))?0:s+3:0},function(e,t,r,n,o){for(var a,s,l,i,c=r.slice(n),d=0;d<c.length&&"`"==c[d];)d++;for(s=0,a=d;a<c.length&&s<d;a++)"`"==c[a]?s++:s=0;if(s<d&&a>=c.length)return 0;for(l=d;l<a&&" "==c[l];)l++;for(i=a-d;i>d&&" "==c[i-1];)i--;if(l<i){var u=new Xe(c.slice(l,i));t.callbacks.codespan(e,u,t.context)||(a=0)}else t.callbacks.codespan(e,null,t.context)||(a=0);return a},function(e,t,r,n,o){if(r.slice(n),o<2||" "!=r[n-1]||" "!=r[n-2])return 0;for(var a=e.s.length;a&&" "==e.s[a-1];)a--;return e.s=e.s.slice(0,a),t.callbacks.linebreak(e,t.context)?1:0},function(e,r,n,o,a){var s,l,i=n.slice(o),c=a&&"!"==n[o-1],d=1,f=0,h=0,p=0,g=0,b=null,m=null,v=null,k=null,x=r.spanStack.length,w=0,y=0,_=0,S=0;function C(){return r.spanStack.length=x,y?d:0}if(c&&!r.callbacks.image||!c&&!r.callbacks.link)return C();for(s=1;d<i.length;d++)if("\n"==i[d])w=1;else{if("\\"==i[d-1])continue;if("["==i[d])s++;else if("]"==i[d]&&--s<=0)break}if(d>=i.length)return C();for(l=d,d++;d<i.length&&t(i[d]);)d++;if(d<i.length&&"("==i[d]){for(d++;d<i.length&&t(i[d]);)d++;for(f=d;d<i.length;)if("\\"==i[d])d+=2;else{if(")"==i[d])break;if(d>=1&&t(i[d-1])&&("'"==i[d]||'"'==i[d]))break;d++}if(d>=i.length)return C();if(h=d,"'"==i[d]||'"'==i[d]){for(S=i[d],_=1,p=++d;d<i.length;)if("\\"==i[d])d+=2;else if(i[d]==S)_=0,d++;else{if(")"==i[d]&&!_)break;d++}if(d>=i.length)return C();for(g=d-1;g>p&&t(i[g]);)g--;"'"!=i[g]&&'"'!=i[g]&&(p=g=0,h=d)}for(;h>f&&t(i[h-1]);)h--;"<"==i[f]&&f++,">"==i[h-1]&&h--,h>f&&(m=new Xe,r.spanStack.push(m),m.s+=i.slice(f,h)),g>p&&(v=new Xe,r.spanStack.push(v),v.s+=i.slice(p,g)),d++}else if(d<i.length&&"["==i[d]){var j=new Xe,T=null;for(f=++d;d<i.length&&"]"!=i[d];)d++;if(d>=i.length)return C();if(f==(h=d))if(w){var L=new Xe;for(r.spanStack.push(L),$=1;$<l;$++)"\n"!=i[$]?L.s+=i[$]:" "!=i[$-1]&&(L.s+=" ");j.s=L.s}else j.s=i.slice(1);else j.s=i.slice(f,h);if(!(T=r.refs[j.s]))return C();m=T.link,v=T.title,d++}else{j=new Xe,T=null;if(w){var $;L=new Xe;for(r.spanStack.push(L),$=1;$<l;$++)"\n"!=i[$]?L.s+=i[$]:" "!=i[$-1]&&(L.s+=" ");j.s=L.s}else j.s=i.slice(1,l);if(!(T=r.refs[j.s]))return C();m=T.link,v=T.title,d=l+1}return l>1&&(b=new Xe,r.spanStack.push(b),c?b.s+=i.slice(1,l):(r.inLinkBody=1,ct(b,r,i.slice(1,l)),r.inLinkBody=0)),m?(k=new Xe,r.spanStack.push(k),u(k,m),c?(e.s.length&&"!"==e.s[e.s.length-1]&&(e.s=e.s.slice(0,-1)),y=r.callbacks.image(e,k,v,b,r.context)):y=r.callbacks.link(e,k,v,b,r.context),C()):C()},function(e,t,r,o,a){var s=r.slice(o),l={p:we},i=function(e,t){var r,o;if(e.length<3)return 0;if("<"!=e[0])return 0;if(r="/"==e[1]?2:1,!n(e[r]))return 0;t.p=we;for(;r<e.length&&(n(e[r])||"."==e[r]||"+"==e[r]||"-"==e[r]);)r++;if(r>1&&"@"==e[r]&&0!=(o=function(e){var t=0,r=0;for(t=0;t<e.length;++t)if(!n(e[t]))switch(e[t]){case"@":r++;case"-":case".":case"_":break;case">":return 1==r?t+1:0;default:return 0}return 0}(e.slice(r))))return t.p=_e,r+o;r>2&&":"==e[r]&&(t.p=ye,r++);if(r>=e.length)t.p=we;else if(t.p){for(o=r;r<e.length;)if("\\"==e[r])r+=2;else{if(">"==e[r]||"'"==e[r]||'"'==e[r]||" "==e[r]||"\n"==e[r])break;r++}if(r>=e.length)return 0;if(r>o&&">"==e[r])return r+1;t.p=we}for(;r<e.length&&">"!=e[r];)r++;return r>=e.length?0:r+1}(s,l),c=new Xe(s.slice(0,i)),d=0;if(i>2)if(t.callbacks.autolink&&l.p!=we){var f=new Xe;t.spanStack.push(f),c.s=s.substr(1,i-2),u(f,c),d=t.callbacks.autolink(e,f,l.p,t.context),t.spanStack.pop()}else t.callbacks.raw_html_tag&&(d=t.callbacks.raw_html_tag(e,c,t.context));return d?i:0},function(e,t,r,n,o){var a=r.slice(n),s=new Xe;if(a.length>1){if(-1=="\\`*_{}[]()#+-.!:|&<>/^~".indexOf(a[1]))return 0;t.callbacks.normal_text?(s.s=a[1],t.callbacks.normal_text(e,s,t.context)):e.s+=a[1]}else 1==a.length&&(e.s+=a[0]);return 2},function(e,t,r,o,l){var i,c,d=r.slice(o),u=1,p=!1,g=!1,b=new Xe;for(u<d.length&&"#"===d[u]&&(p=!0,u++),u<d.length&&p&&"x"===d[u].toLowerCase()&&(g=!0,u++),i=u;u<d.length;){var m=d[u];if(g){if(!s(m))break}else if(p){if(!a(m))break}else if(!n(m))break;u++}if(!(u>i&&u<d.length&&";"===d[u]))return 0;if(u++,p&&undefined-i>7)return 0;if(p){if(c=g?16:10,!function(e){return e>8&&11!==e&&12!==e&&(e<14||e>31)&&(e<55296||e>57343)&&65534!==e&&65535!==e&&e<=f}(parseInt(d.slice(i),c)))return 0}else if(-1===h.indexOf(d.slice(0,u)))return 0;return t.callbacks.entity?(b.s=d.slice(0,u),t.callbacks.entity(e,b,t.context)):e.s+=d.slice(0,u),u},function(e,t,n,a,s){var l,i,c=n.slice(a),d={p:null};return!t.callbacks.autolink||t.inLinkBody?0:(l=new Xe,t.spanStack.push(l),(i=function(e,t,n,a,s,l,i){var c,d,u=n.slice(a),f=0;if(l<4||"/"!=n[a+1]||"/"!=n[a+2])return 0;for(;f<s&&o(n[a-f-1]);)f++;if(!w(n.substr(a-f,l+f)))return 0;if(c=3,0==(d=x(u.slice(c),i&xe)))return 0;for(c+=d;c<l&&!r(n[a+c]);)c++;return 0==(c=k(n,c,a))?0:(t.s+=n.substr(a-f,c+f),e.p=f,c)}(d,l,n,a,s,c.length,0))>0&&(d.p>0&&e.truncate(e.s.length-d.p),t.callbacks.autolink(e,l,ye,t.context)),t.spanStack.pop(),i)},function(e,t,r,o,a){var s,l,i=r.slice(o),c={p:null};return!t.callbacks.autolink||t.inLinkBody?0:(s=new Xe,t.spanStack.push(s),(l=function(e,t,r,o,a,s,l){r.slice(o);var i,c,d=0,u=0;for(c=0;c<a&&"\0"!=(f=r[o-c-1])&&(n(f)||-1!=".+-_".indexOf(f));++c);if(0==c)return 0;for(i=0;i<s;++i){var f;if(!n(f=r[o+i]))if("@"==f)d++;else if("."==f&&i<s-1)u++;else if("-"!=f&&"_"!=f)break}return i<2||1!=d||0==u||0==(i=k(r,i,o))?0:(t.s+=r.substr(o-c,i+c),e.p=c,i)}(c,s,r,o,a,i.length))>0&&(c.p>0&&e.truncate(e.s.length-c.p),t.callbacks.autolink(e,s,_e,t.context)),t.spanStack.pop(),l)},function(e,t,n,o,a){var s,i,c=n.slice(o),d=null,u=null,f={p:null};return!t.callbacks.link||t.inLinkBody?0:(s=new Xe,t.spanStack.push(s),(i=function(e,t,n,o,a,s,i){var c,d=n.slice(o);if(a>0&&!l(n[o-1])&&!r(n[o-1]))return 0;if(s<4||"www."!=d.slice(0,4))return 0;if(0==(c=x(d,0)))return 0;for(;c<s&&!r(d[c]);)c++;return 0==(c=k(n,c,o))?0:(t.s+=d.slice(0,c),e.p=0,c)}(f,s,n,o,a,c.length))>0&&(d=new Xe,t.spanStack.push(d),d.s+="http://",d.s+=s.s,f.p>0&&e.truncate(e.s.length-f.p),t.callbacks.normal_text?(u=new Xe,t.spanStack.push(u),t.callbacks.normal_text(u,s,t.context),t.callbacks.link(e,d,null,u,t.context),t.spanStack.pop()):t.callbacks.link(e,d,null,s,t.context),t.spanStack.pop()),t.spanStack.pop(),i)},function(e,t,r,o,a){var s,l=r.slice(o),i=0,c={p:null},d={p:null};if(!t.callbacks.autolink||t.inLinkBody)return 0;if(s=new Xe,t.spanStack.push(s),0===(i=function(e,t,r,o,a,s,l){var i=r.slice(o),c=0,d=!1,u=y(r,o,a,s,"r");if(!u)return 0;c=1,"all-"==i.substr(c,4).toLowerCase()&&(d=!0);do{var f=c,h=24;if(s>=c+10&&"reddit.com"==i.substr(c,10).toLowerCase())c+=10,h=10;else{if(s>c+2&&"t:"==i.substr(c,2)&&(c+=2),!n(i[c]))return 0;c+=1}for(;c<s&&(n(i[c])||"_"==i[c]);)c++;if(c-f<2||c-f>h)return 0}while(c<s&&("+"==i[c]||d&&"-"==i[c])&&c++);if(c<s&&"/"==i[c])for(;c<s&&(n(i[c])||"_"==i[c]||"/"==i[c]||"-"==i[c]);)c++;var p=o-u;return t.s+=r.slice(p,p+c+u),l.p=1==u,e.p=u,c}(c,s,r,o,a,l.length,d))&&(i=function(e,t,r,o,a,s,l){var i=r.slice(o),c=0;if(!(s<3)){var d=y(r,o,a,s,"u");if(!d)return 0;if(!n(i[c=1])&&"_"!=i[c]&&"-"!=i[c])return 0;for(c+=1;c<s&&(n(i[c])||"_"==i[c]||"/"==i[c]||"-"==i[c]);)c++;var u=o-d;return t.s+=r.slice(u,u+c+d),l.p=1==d,e.p=d,c}}(c,s,r,o,a,l.length,d)),i>0){var u=new Xe;if(t.spanStack.push(u),d.p&&(u.s+="/"),u.s+=s.s,c.p>0&&e.truncate(e.s.length-c.p),t.callbacks.normal_text){var f=new Xe;t.spanStack.push(f),t.callbacks.normal_text(f,s,t.context),t.callbacks.link(e,u,null,f,t.context),t.spanStack.pop()}else t.callbacks.link(e,u,null,s,t.context);t.spanStack.pop()}return t.spanStack.pop(),i},function(e,r,n,o,a){var s,l,i,c=n.slice(o),d=c.length;if(!r.callbacks.superscript)return 0;if(d<2)return 0;if("("==c[1]){for(s=l=2;l<d&&")"!=c[l]&&"\\"!=c[l-1];)l++;if(l==d)return 0}else for(s=l=1;l<d&&!t(c[l]);)l++;return l-s==0?2==s?3:0:(i=new Xe,r.spanStack.push(i),ct(i,r,c.slice(s,l)),r.callbacks.superscript(e,i,r.context),r.spanStack.pop(),2==s?l+1:l)}],oe=1,ae=2,se=8,le=0,ie=(le++,le++),ce=le++,de=le++,ue=le++,fe=le++,he=le++,pe=le++,ge=le++,be=le++,me=le++,ve=le++,ke=le++,xe=1;le=0;var we=le++,ye=le++,_e=le++,Se=1,Ce=2,je=4,Te=64,Le=256,$e=1,Oe=2,Ee=4,Me=8,Ae=32,De=64,Ie=128,Ze=256,Re=512,Ue=1024,ze=1,Pe=2,He=3,Ne=3,Ke=4,Be=0,qe=1,Fe=2;function Xe(e){this.s=e||""}function Ve(e,t){if(this.s=e,t>=e.length||t<0)throw new RangeError("char * offset out of bounds");this.offset=t}function We(){this.spanStack=[],this.blockStack=[],this.extensions=152|Se|Ce|Ce;var e=j();this.context=e.context,this.callbacks=e.callbacks,this.inLinkBody=0,this.activeChars={},this.refs={},this.nestingLimit=16,this.maxTableCols=64}function Ye(e){var t;for(t=0;t<e.length&&"\n"!=e[t];t++)if(" "!=e[t])return 0;return t+1}function Ge(e){var t,r=0,n=0;if(e.length<3)return 0;if(" "==e[0]&&(r++," "==e[1]&&(r++," "==e[2]&&r++)),r+2>=e.length||"*"!=e[r]&&"-"!=e[r]&&"_"!=e[r])return 0;for(t=e[r];r<e.length&&"\n"!=e[r];){if(e[r]==t)n++;else if(" "!=e[r])return 0;r++}return n>=3}function Qe(e,r){var n,o=0,a=0;if(o=function(e){var t,r=0,n=0;if(e.length<3)return 0;if(" "==e[0]&&(r++," "==e[1]&&(r++," "==e[2]&&r++)),r+2>=e.length||"~"!=e[r]&&"`"!=e[r])return 0;for(t=e[r];r<e.length&&e[r]==t;)n++,r++;return n<3?0:r}(e),0==o)return 0;for(;o<e.length&&" "==e[o];)o++;if(n=o,o<e.length&&"{"==e[o]){for(o++,n++;o<e.length&&"}"!=e[o]&&"\n"!=e[o];)a++,o++;if(o==e.length||"}"!=e[o])return 0;for(;a>0&&t(e[n+0]);)n++,a--;for(;a>0&&t(e[n+a-1]);)a--;o++}else for(;o<e.length&&!t(e[o]);)a++,o++;for(r&&(r.s=e.substr(n,a));o<e.length&&"\n"!=e[o];){if(!t(e[o]))return 0;o++}return o+1}function Je(e,t){for(var r=1;r<e.length;){for(;r<e.length&&e[r]!=t&&"`"!=e[r]&&"["!=e[r];)r++;if(r==e.length)return 0;if(e[r]==t)return r;if(r&&"\\"==e[r-1])r++;else if("`"==e[r]){for(var n,o=0,a=0;r<e.length&&"`"==e[r];)r++,o++;if(r>=e.length)return 0;for(n=0;r<e.length&&n<o;)a||e[r]!=t||(a=r),"`"==e[r]?n++:n=0,r++;if(r>=e.length)return a}else if("["==e[r]){var s;a=0;for(r++;r<e.length&&"]"!=e[r];)a||e[r]!=t||(a=r),r++;for(r++;r<e.length&&(" "==e[r]||"\n"==e[r]);)r++;if(r>=e.length)return a;switch(e[r]){case"[":s="]";break;case"(":s=")";break;default:if(a)return a;continue}for(r++;r<e.length&&e[r]!=s;)a||e[r]!=t||(a=r),r++;if(r>=e.length)return a;r++}}return 0}function et(e,r,n,o){var a,s,i=n.slice(1),c=0;if(!r.callbacks.emphasis)return 0;for(i.length>1&&i[0]==o&&i[1]==o&&(c=1);c<i.length;){if(!(a=Je(i.slice(c),o)))return 0;if((c+=a)>=i.length)return 0;if(i[c]==o&&!t(i[c-1])){if(r.extensions&Se&&"_"==o&&c+1!=i.length&&!t(i[c+1])&&!l(i[c+1]))continue;var d=new Xe;return r.spanStack.push(d),ct(d,r,i.slice(0,c)),s=r.callbacks.emphasis(e,d,r.context),r.spanStack.pop(),s?c+1:0}}return 0}function tt(e,r,n,o){var a,s,l=n.slice(2),i=0,c="~"==o?r.callbacks.strikethrough:r.callbacks.double_emphasis;if(!c)return 0;for(;i<l.length;){if(!(a=Je(l.slice(i),o)))return 0;if((i+=a)+1<l.length&&l[i]==o&&l[i+1]==o&&i&&!t(l[i-1])){var d=new Xe;return r.spanStack.push(d),ct(d,r,l.slice(0,i)),s=c(e,d,r.context),r.spanStack.pop(),s?i+2:0}i++}return 0}function rt(e,t){if("#"!=t[0])return!1;if(e.extensions&Te){for(var r=0;r<t.length&&r<6&&"#"==t[r];)r++;if(r<t.length&&" "!=t[r])return!1}return!0}function nt(e){var t=0,r=e.length;if("="==e[t]){for(t=1;t<r&&"="==e[t];t++);for(;t<r&&" "==e[t];)t++;return t>=r||"\n"==e[t]?1:0}if("-"==e[t]){for(t=1;t<r&&"-"==e[t];t++);for(;t<r&&" "==e[t];)t++;return t>=r||"\n"==e[t]?2:0}return 0}function ot(e){for(var t=e.length,r=0;r<t&&"\n"!=e[r];)r++;return++r>=t?0:nt(e.slice(r))}function at(e){var t=0,r=e.length;return t<r&&" "==e[t]&&t++,t<r&&" "==e[t]&&t++,t<r&&" "==e[t]&&t++,t<r&&">"==e[t]?t+1<r&&" "==e[t+1]?t+2:t+1:0}function st(e){return e.length>3&&" "==e[0]&&" "==e[1]&&" "==e[2]&&" "==e[3]?4:0}function lt(e){var t=e.length,r=0;if(r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r>=t||e[r]<"0"||e[r]>"9")return 0;for(;r<t&&e[r]>="0"&&e[r]<="9";)r++;return r+1>=t||"."!=e[r]||" "!=e[r+1]||ot(e.slice(r))?0:r+2}function it(e){var t=e.length,r=0;return r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r+1>=t||"*"!=e[r]&&"+"!=e[r]&&"-"!=e[r]||" "!=e[r+1]||ot(e.slice(r))?0:r+2}function ct(e,t,r){var n=0,o=0,a=0,s=0,l=new Xe;if(!(t.spanStack.length+t.blockStack.length>t.nestingLimit))for(;n<r.length;){for(;o<r.length&&!(s=t.activeChars[r[o]]);)o++;if(t.callbacks.normal_text?(l.s=r.slice(n,o),t.callbacks.normal_text(e,l,t.context)):e.s+=r.slice(n,o),o>=r.length)break;n=o,(o=ne[s](e,t,r,n,n-a))?a=o=n+=o:o=n+1}}function dt(e,t,r){for(var n,o,a,s=0;s<r.length&&s<6&&"#"==r[s];)s++;for(n=s;n<r.length&&" "==r[n];n++);for(o=n;o<r.length&&"\n"!=r[o];o++);for(a=o;o&&"#"==r[o-1];)o--;for(;o&&" "==r[o-1];)o--;if(o>n){var l=new Xe;t.spanStack.push(l),ct(l,t,r.slice(n,o)),t.callbacks.header&&t.callbacks.header(e,l,s,t.context),t.spanStack.pop()}return a}function ut(e,t,r){var n,o;return e.length+3>=r.length||r.slice(2).toLowerCase()!=e||">"!=r[e.length+2]?0:(o=0,(n=e.length+3)<r.length&&0==(o=Ye(r.slice(n)))?0:(n+=o,o=0,n<r.length&&(o=Ye(r.slice(n))),n+o))}function ft(e,t,r,n){var o,a,s,l=0,i=null,c=new Xe(r);if(r.length<2||"<"!=r[0])return 0;for(o=1;o<r.length&&">"!=r[o]&&" "!=r[o];)o++;if(o<r.length&&(s=r.slice(1),i=-1!=["p","dl","div","math","table","ul","del","form","blockquote","figure","ol","fieldset","h1","h6","pre","script","h5","noscript","style","iframe","h4","ins","h3","h2"].indexOf(s.toLowerCase())?s.toLowerCase():""),!i){if(r.length>5&&"!"==r[1]&&"-"==r[2]&&"-"==r[3]){for(o=5;o<r.length&&("-"!=r[o-2]||"-"!=r[o-1]||">"!=r[o]);)o++;if(++o<size&&(l=Ye(r.slice(o))),l)return c.s=r.slice(0,o+l),n&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),c.s.length}if(r.length>4&&("h"==r[1]||"H"==r[1])&&("r"==r[2]||"R"==r[2])){for(o=3;o<r.length&&">"!=r[o];)o++;if(o+1<r.length&&(o++,l=Ye(r.slice(o))))return c.s=r.slice(0,o+l),n&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),c.s.length}return 0}if(o=1,a=0,"ins"!=i&&"del"!=i){var d=i.length;for(o=1;o<r.length;){for(o++;o<r.length&&("<"!=r[o-1]||"/"!=r[o]);)o++;if(o+2+d>=r.length)break;if(l=ut(tag,0,r.slice(o-1))){o+=l-1,a=1;break}}}return a?(c.s=c.s.slice(0,o),n&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),o):0}function ht(e,t,r){var n,o,a=r.length,s=0,l="",i=new Xe;for(t.blockStack.push(i),n=0;n<a;){for(s=n+1;s<a&&"\n"!=r[s-1];s++);if(o=at(r.slice(n,s)))n+=o;else if(Ye(r.slice(n,s))&&(s>=a||0==at(r.slice(s))&&!Ye(r.slice(s))))break;n<s&&(l+=r.slice(n,s),s-n),n=s}return wt(i,t,l),t.callbacks.blockquote&&t.callbacks.blockquote(e,i,t.context),t.blockStack.pop(),s}function pt(e,t,r){for(var o=0,a=0,s=0,l=r.length,i=new Xe(r);o<l;){for(a=o+1;a<l&&"\n"!=r[a-1];a++);if(0!=at(r.slice(o,a))){a=o;break}var c=r.slice(o);if(Ye(c)||0!=(s=nt(c)))break;if(Ye(c))break;if(0!=(s=nt(c)))break;if(rt(t,c)||Ge(c)||at(c)){a=o;break}if(t.extensions&Le&&!n(r[o])){if(lt(c)||it(c)){a=o;break}if("<"==r[o]&&t.callbacks.blockhtml&&ft(e,t,c,0)){a=o;break}if(0!=(t.extensions&&je)&&0!=Qe(c,null)){a=o;break}}o=a}for(var d=o;d&&"\n"==r[d-1];)d--;if(i.s=i.s.slice(0,d),s){var u;if(i.size){var f;for(o=i.s.length;d&&"\n"!=r[d];)d-=1;for(f=d+1;d&&"\n"==r[d-1];)d-=1;if(i.s=i.s.slice(0,d),d>0){h=new Xe;t.blockStack.push(h),ct(h,t,i.s),t.callbacks.paragraph&&t.callbacks.paragraph(e,h,t.context),t.blockStack.pop(),i.s=i.s.slice(f,o)}else i.s=i.s.slice(0,o)}u=new Xe,t.spanStack.push(u),ct(u,t,i.s),t.callbacks.header&&t.callbacks.header(e,u,s,t.context),t.spanStack.pop()}else{var h=new Xe;t.blockStack.push(h),ct(h,t,i.s),t.callbacks.paragraph&&t.callbacks.paragraph(e,h,t.context),t.blockStack.pop()}return a}function gt(e,t,r){var n,o,a=null,s=new Xe;if(0==(n=Qe(r,s)))return 0;for(a=new Xe,t.blockStack.push(a);n<r.length;){var l,i=new Xe;if(0!=(l=Qe(r.slice(n),i))&&0==i.s.length){n+=l;break}for(o=n+1;o<r.length&&"\n"!=r[o-1];o++);if(n<o){var c=r.slice(n,o);Ye(c)?a.s+="\n":a.s+=c}n=o}return a.s.length&&"\n"!=a.s[a.s.length-1]&&(a.s+="\n"),t.callbacks.blockcode&&t.callbacks.blockcode(e,a,s.s.length?s:null,t.context),t.blockStack.pop(),n}function bt(e,t,r){var n,o,a,s=r.length,l=null;for(t.blockStack.push(l=new Xe),n=0;n<s;){for(o=n+1;o<s&&"\n"!=r[o-1];o++);if(a=st(r.slice(n,o)))n+=a;else if(!Ye(r.slice(n,o)))break;n<o&&(Ye(r.slice(n,o))?l.s+="\n":l.s+=r.slice(n,o)),n=o}for(var i=l.s.length;i&&"\n"==l.s[i-1];)i-=1;return l.s=l.s.slice(0,i),l.s+="\n",t.callbacks.blockcode&&t.callbacks.blockcode(e,l,null,t.context),t.blockStack.pop(),n}function mt(e,t,r,n){for(var o,a,s,l,i=r.length,c=null,d=0,u=0,f=0,h=0,p=0,g=0;f<3&&f<i&&" "==r[f];)f++;if((d=it(r))||(d=lt(r)),!d)return 0;for(a=d;a<i&&"\n"!=r[a-1];)a++;for(t.spanStack.push(c=new Xe),t.spanStack.push(o=new Xe),c.s+=r.slice(d,a),d=a;d<i;){var b,m;for(a++;a<i&&"\n"!=r[a-1];)a++;if(Ye(r.slice(d,a)))h=1,d=a;else{for(l=0;l<4&&d+l<a&&" "==r[d+l];)l++;if(s=l,t.flags&je&&0!=Qe(r.slice(d+l,a),null)&&(g=!g),g||(b=it(r.slice(d+l,a)),m=lt(r.slice(d+l,a))),h&&(n.p&oe&&b||!(n.p&oe)&&m)){n.p|=se;break}if(b&&!Ge(r.slice(d+l,a))||m){if(h&&(p=1),s==f)break;u||(u=c.s.length)}else{if(h&&0==s){n.p|=se;break}h&&(c.s+="\n",p=1)}h=0,c.s+=r.slice(d+l,a),d=a}}return p&&(n.p|=ae),n.p&ae?u&&u<c.s.length?(wt(o,t,c.s.slice(0,u)),wt(o,t,c.s.slice(u))):wt(o,t,c.s):u&&u<c.s.length?(ct(o,t,c.s.slice(0,u)),wt(o,t,c.s.slice(u))):ct(o,t,c.s),t.callbacks.listitem&&t.callbacks.listitem(e,o,n.p,t.context),t.spanStack.pop(),t.spanStack.pop(),d}function vt(e,t,r,n){var o,a,s=r.length,l=0;for(t.blockStack.push(a=new Xe);l<s;){var i={p:n};if(o=mt(a,t,r.slice(l),i),n=i.p,l+=o,!o||n&se)break}return t.callbacks.list&&t.callbacks.list(e,a,n,t.context),t.blockStack.pop(),l}function kt(e,r,n,o,a){var s,l,i,c=0;if(r.callbacks.table_cell&&r.callbacks.table_row){for(r.spanStack.push(i=new Xe),c<n.length&&"|"==n[c]&&c++,s=0;s<o.length&&c<n.length;++s){var d,u,f;for(r.spanStack.push(f=new Xe);c<n.length&&t(n[c]);)c++;for(d=c;c<n.length&&"|"!=n[c];)c++;for(u=c-1;u>d&&t(n[u]);)u--;ct(f,r,n.slice(d,1+u)),r.callbacks.table_cell(i,f,o[s]|a,r.context,0),r.spanStack.pop(),c++}if((l=o.length-s)>0){r.callbacks.table_cell(i,null,o[s]|a,r.context,l)}r.callbacks.table_row(e,i,r.context),r.spanStack.pop()}}function xt(e,r,n){var o,a,s,l={p:null};if(r.spanStack.push(a=new Xe),r.blockStack.push(s=new Xe),o=function(e,r,n,o){for(var a,s,l,i=0,c=0;i<n.length&&"\n"!=n[i];)"|"==n[i++]&&c++;if(i==n.length||0==c)return 0;for(s=i;s>0&&t(n[s-1]);)s--;if("|"==n[0]&&c--,s&&"|"==n[s-1]&&c--,c+1>r.maxTableCols)return 0;o.p=new Array(c+1);for(var d=0;d<o.p.length;d++)o.p[d]=0;for(++i<n.length&&"|"==n[i]&&i++,l=i;l<n.length&&"\n"!=n[l];)l++;for(a=0;a<o.p.length&&i<l;++a){for(var u=0;i<l&&" "==n[i];)i++;for(":"==n[i]&&(i++,o.p[a]|=ze,u++);i<l&&"-"==n[i];)i++,u++;for(i<l&&":"==n[i]&&(i++,o.p[a]|=Pe,u++);i<l&&" "==n[i];)i++;if(i<l&&"|"!=n[i])break;if(u<1)break;i++}return a<o.p.length?0:(kt(e,r,n.slice(0,s),o.p,Ke),l+1)}(a,r,n,l),o>0){for(;o<n.length;){var i,c=0;for(i=o;o<n.length&&"\n"!=n[o];)"|"==n[o++]&&c++;if(0==c||o==n.length){o=i;break}kt(s,r,n.slice(i,o),l.p,0),o++}r.callbacks.table&&r.callbacks.table(e,a,s,r.context)}return r.spanStack.pop(),r.blockStack.pop(),o}function wt(e,t,r){var n,o,a=0;if(!(t.spanStack.length+t.blockStack.length>t.nestingLimit))for(;a<r.length;)if(o=r.slice(a),r.length-a,rt(t,o))a+=dt(e,t,o);else if("<"==r[a]&&t.callbacks.blockhtml&&0!=(n=ft(e,t,o,1)))a+=n;else if(0!=(n=Ye(o)))a+=n;else if(Ge(o)){for(t.callbacks.hrule&&t.callbacks.hrule(e,t.context);a<r.length&&"\n"!=r[a];)a++;a++}else 0!=(t.extensions&je)&&0!=(n=gt(e,t,o))||0!=(t.extensions&Ce)&&0!=(n=xt(e,t,o))?a+=n:at(o)?a+=ht(e,t,o):st(o)?a+=bt(e,t,o):it(o)?a+=vt(e,t,o,0):lt(o)?a+=vt(e,t,o,oe):a+=pt(e,t,o)}function yt(e,t,r,n){var o,a,s,l,i,c,d,u=0;if(t+3>=r)return 0;if(" "==e[t]&&(u=1," "==e[t+1]&&(u=2," "==e[t+2]&&(u=3," "==e[t+3]))))return 0;if("["!=e[u+=t])return 0;for(o=++u;u<r&&"\n"!=e[u]&&"\r"!=e[u]&&"]"!=e[u];)u++;if(u>=r||"]"!=e[u])return 0;if(a=u,++u>=r||":"!=e[u])return 0;for(u++;u<r&&" "==e[u];)u++;for(u<r&&("\n"==e[u]||"\r"==e[u])&&++u<r&&"\r"==e[u]&&"\n"==e[u-1]&&u++;u<r&&" "==e[u];)u++;if(u>=r)return 0;for("<"==e[u]&&u++,s=u;u<r&&" "!=e[u]&&"\n"!=e[u]&&"\r"!=e[u];)u++;for(l=">"==e[u-1]?u-1:u;u<r&&" "==e[u];)u++;if(u<r&&"\n"!=e[u]&&"\r"!=e[u]&&"'"!=e[u]&&'"'!=e[u]&&"("!=e[u])return 0;if(d=0,(u>=r||"\r"==e[u]||"\n"==e[u])&&(d=u),u+1<r&&"\n"==e[u]&&"\r"==e[u+1]&&(d=u+1),d)for(u=d+1;u<r&&" "==e[u];)u++;if(i=c=0,u+1<r&&("'"==e[u]||'"'==e[u]||"("==e[u])){for(i=++u;u<r&&"\n"!=e[u]&&"\r"!=e[u];)u++;for(c=u+1<r&&"\n"==e[u]&&"\r"==e[u+1]?u+1:u,u-=1;u>i&&" "==e[u];)u-=1;u>i&&("'"==e[u]||'"'==e[u]||")"==e[u])&&(d=c,c=u)}if(!d||l==s)return 0;var f=e.slice(o,a),h=e.slice(s,l),p=null;return c>i&&(p=e.slice(i,c)),n.refs[f]={id:f,link:new Xe(h),title:new Xe(p)},d}function _t(e,t){for(var r=0,n=0;r<t.length;){for(var o=r;r<t.length&&"\t"!=t[r];)r++,n++;if(r>o&&(e.s+=t.slice(o,r)),r>=t.length)break;do{e.s+=" ",n++}while(n%4);r++}}Xe.prototype.truncate=function(e){if(this.s.length<e)throw new RangeError("Buffer smaller than desired size");if(e<0)throw new RangeError("Size argument is negative");this.s=this.s.slice(0,e)},Ve.prototype.getChar=function(e){var t=this.offset+e;if(t>=this.s.length||t<0)throw new RangeError("Character index out of bounds");return this.s.slice(t,t+1)},Ve.prototype.toString=function(){return this.s.slice(this.offset)},We.prototype.render=function(e){var t,r=new Xe,n=0;for(this.refs={};n<e.length;)if(t=yt(e,n,e.length,this))n=t;else{for(t=n;t<e.length&&"\n"!=e[t]&&"\r"!=e[t];)t++;for(t>n&&_t(r,e.slice(n,t));t<e.length&&("\n"==e[t]||"\r"==e[t]);)("\n"==e[t]||t+1<e.length&&"\n"!=e[t+1])&&(r.s+="\n"),t++;n=t}var o=new Xe;return this.callbacks.doc_header&&this.callbacks.doc_header(o,this.context),r.s.length&&("\n"!=r.s[r.s.length-1]&&"\r"!=r.s[r.s.length-1]&&(r.s+="\n"),wt(o,this,r.s)),this.callbacks.doc_footer&&this.callbacks.doc_footer(o,this.context),o.s},e.getParser=function(e,t,r,n){var o=new We;e&&(o.callbacks=e.callbacks),r&&(o.nestingLimit=r),r&&(o.maxTableCols=n),e&&(o.context=e.context),null!=t&&null!=t&&(o.extensions=t);var a=o.callbacks;return(a.emphasis||a.double_emphasis||a.triple_emphasis)&&(o.activeChars["*"]=ie,o.activeChars._=ie,16&o.extensions&&(o.activeChars["~"]=ie)),a.codespan&&(o.activeChars["`"]=ce),a.linebreak&&(o.activeChars["\n"]=de),(a.image||a.link)&&(o.activeChars["["]=ue),o.activeChars["<"]=fe,o.activeChars["\\"]=he,o.activeChars["&"]=pe,8&o.extensions&&(512&o.extensions||(o.activeChars["@"]=be),o.activeChars[":"]=ge,o.activeChars.w=me,o.activeChars["/"]=ve),128&o.extensions&&(o.activeChars["^"]=ke),o};var St=$e|Ee|Ae|Re|Ze,Ct=$e|Ae|Ue|Re|Ze,jt=["colspan","rowspan","cellspacing","cellpadding","scope"],Tt=["tr","th","td","table","tbody","thead","tfoot","caption"];e.DEFAULT_HTML_ELEMENT_WHITELIST=Tt,e.DEFAULT_HTML_ATTR_WHITELIST=jt,e.DEFAULT_BODY_FLAGS=St,e.DEFAULT_WIKI_FLAGS=Ct,e.HTML_SKIP_HTML=$e,e.HTML_SKIP_STYLE=Oe,e.HTML_SKIP_IMAGES=Ee,e.HTML_SKIP_LINKS=Me,e.HTML_EXPAND_TABS=16,e.HTML_SAFELINK=Ae,e.HTML_TOC=De,e.HTML_HARD_WRAP=Ie,e.HTML_USE_XHTML=Ze,e.HTML_ESCAPE=Re,e.HTML_ALLOW_ELEMENT_WHITELIST=Ue,e.MKDEXT_NO_INTRA_EMPHASIS=Se,e.MKDEXT_TABLES=Ce,e.MKDEXT_FENCED_CODE=je,e.MKDEXT_AUTOLINK=8,e.MKDEXT_STRIKETHROUGH=16,e.MKDEXT_SPACE_HEADERS=Te,e.MKDEXT_SUPERSCRIPT=128,e.MKDEXT_LAX_SPACING=Le,e.MKDEXT_NO_EMAIL_AUTOLINK=512,e.SD_AUTOLINK_SHORT_DOMAINS=xe,e.MKDA_NOT_AUTOLINK=we,e.MKDA_NORMAL=ye,e.MKDA_EMAIL=_e,"function"==typeof define&&define("snuownd",[],e)}((()=>{const e="undefined"!=typeof window?window:"undefined"!=typeof globalThis?globalThis:{};return e.SnuOwnd||(e.SnuOwnd={}),e.SnuOwnd})());const D=("undefined"!=typeof window?window:"undefined"!=typeof globalThis?globalThis:{}).SnuOwnd.getParser(),I=e=>D.render((e||"").replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<")).replace(/href="\//g,'href="https://www.reddit.com/'),Z=new URLSearchParams(window.location.search),R=["removed","deleted","approved","locked","unlocked","edited"],U=(()=>{const e=Z.get("filter");return e?e.split(",").filter((e=>R.includes(e))):[]})(),z=(0,s.Z)(S)`
  margin-bottom: ${u.lg};
  & h2 {
    margin: 0 0 ${u.sm} 0;
    font-size: 1.2em;
  }
  & p {
    margin: ${u.xs} 0;
    line-height: 1.6;
    color: var(--text-primary);
  }
  & ul {
    margin: ${u.sm} 0;
    padding-left: 1.4em;
    line-height: 1.8;
    color: var(--text-primary);
  }
`,P=s.Z.div`
  display: flex;
  gap: ${u.sm};
  align-items: center;
  margin-top: ${u.md};
  flex-wrap: wrap;
`,H=s.Z.div`
  max-width: 820px;
  margin: 0 auto;
  padding: ${u.xl} ${u.lg};
`,N=s.Z.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${u.lg};
  margin-bottom: ${u.lg};
  flex-wrap: wrap;
`,K=s.Z.div`
  display: flex;
  gap: ${u.lg};
  align-items: baseline;
  flex-wrap: wrap;
`,B=s.Z.div`
  display: flex;
  gap: ${u.sm};
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
`,q=s.Z.span`
  color: var(--text-secondary);
  font-size: 0.85em;
  font-weight: 500;
  margin-right: ${u.xs};
`,F=s.Z.button`
  background: none;
  border: none;
  padding: 0;
  color: var(--text-secondary);
  font-size: 0.85em;
  cursor: pointer;
  text-decoration: underline;
  &:hover { color: var(--link-hover); }
`,X=s.Z.button`
  background: var(--accent);
  border: 1px solid var(--accent);
  border-radius: ${d.sm};
  color: var(--text-on-accent);
  font-size: 0.8em;
  cursor: pointer;
  padding: 4px 8px;
  &:hover:not(:disabled) { background: var(--accent-hover); border-color: var(--accent-hover); }
  &:disabled { opacity: 0.4; cursor: default; }
`,V=s.Z.button`
  background: none;
  border: none;
  padding: 0;
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 0.9em;
  cursor: pointer;
  text-decoration: underline;
  &:hover { color: var(--link-hover); }
`,W=s.Z.p`
  text-align: center;
  color: var(--text-secondary);
  padding: ${u.xl};
`,Y=s.Z.span`
  display: block;
  width: 48px;
  height: 48px;
  margin: 0 auto ${u.md};
  border: 4px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`,G=e=>"mod removed"===e?"removed":"user deleted"===e?"deleted":"approved"===e?"approved":"locked"===e?"locked":"unlocked"===e?"unlocked":"edited"===e?"edited":"default";function Q({row:e,onResolve:t}){const r=(0,o.useMemo)((()=>"comment"===e.contentType?e.text?I(e.text):"":e.body?I(e.body):""),[e.text,e.body,e.contentType]),a="post"===e.contentType&&e.text,s=!r||""===r.trim()||"<p></p>"===r.trim();return(0,n.jsxs)(S,{children:[(0,n.jsxs)(C,{children:[(0,n.jsx)($,{variant:e.actionVariant,children:e.action}),(0,n.jsxs)("span",{style:{color:"var(--text-secondary)",fontSize:"0.9em"},children:[e.contentType," by ",(0,n.jsxs)(O,{children:["u/",e.user]}),e.subreddit?(0,n.jsxs)(n.Fragment,{children:[" in ",(0,n.jsxs)(E,{children:["r/",e.subreddit]})]}):null]})]}),(0,n.jsxs)(j,{children:[(0,n.jsxs)("span",{title:e.formattedObservedFull,children:["observed ",e.formattedObserved]}),"n/a"!==e.timeLength&&(0,n.jsxs)("span",{title:e.formattedCreated,children:[e.action," ",e.timeLength," after creation"]}),e.seenCount?(0,n.jsxs)("span",{children:["seen ",e.seenCount,"×"]}):null]}),a&&(0,n.jsx)(M,{children:e.text}),(0,n.jsx)(T,{children:s?(0,n.jsx)("span",{style:{color:"var(--text-muted)",fontStyle:"italic"},children:"(no body content stored)"}):(0,n.jsx)(A,{className:"md-body",dangerouslySetInnerHTML:{__html:r}})}),(0,n.jsxs)(L,{children:[e.needsResolve?(0,n.jsx)(w,{variant:"secondary",onClick:()=>t(e.id),children:"Open on Reddit ↗"}):(0,n.jsx)(k,{href:e.href,target:"_blank",rel:"noreferrer",children:"Open on Reddit ↗"}),e.id&&(0,n.jsx)(x,{href:`https://www.reveddit.com/info?id=${encodeURIComponent(e.id)}`,target:"_blank",rel:"noreferrer",children:"View on reveddit ↗"})]})]})}const J=s.Z.div`
    margin-top: ${u.lg};
    padding-top: ${u.md};
    border-top: 1px solid var(--border);
`,ee=s.Z.button`
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.85em;
    padding: ${u.xs} 0;
    &:hover { color: var(--text-primary); }
`,te=s.Z.div`
    display: grid;
    grid-template-columns: auto auto 1fr auto;
    gap: 0;
    margin-top: ${u.sm};
    font-size: 0.82em;
    color: var(--text-secondary);
`,re=s.Z.div`
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    padding: ${u.xs} ${u.sm};
    border-bottom: 1px solid var(--border);
`,ne=s.Z.div`
    padding: ${u.xs} ${u.sm};
    border-bottom: 1px solid var(--border);
    word-break: break-all;
`,oe=s.Z.div`
    color: var(--text-muted);
    padding: ${u.sm} 0;
`,ae=s.Z.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: ${u.sm};
`,se=s.Z.button`
    background: none;
    border: none;
    color: var(--link);
    cursor: pointer;
    font-size: 0.85em;
    padding: 0;
    text-decoration: none;
    &:hover { color: var(--link-hover); text-decoration: underline; }
`;(0,a.createRoot)(document.getElementById("root")).render((0,n.jsx)((function(){const[e,t]=(0,o.useState)([]),[r,a]=(0,o.useState)(!1),[s,c]=(0,o.useState)(U),[d,u]=(0,o.useState)("observed"),[f,h]=(0,o.useState)(null),[p,g]=(0,o.useState)((()=>"1"!==new URLSearchParams(location.search).get("welcome")&&"1"===localStorage.getItem("history_banner_dismissed"))),[b,m]=(0,o.useState)(0),[x,S]=(0,o.useState)(null),[C,j]=(0,o.useState)(0),[T,L]=(0,o.useState)(!0),[$,O]=(0,o.useState)([]),[E,M]=(0,o.useState)(!1),A=(0,o.useRef)(null),D=(0,o.useCallback)((()=>{(0,l.VU)().then((e=>m(e))),chrome.storage.local.get(["last_logged_in_user","pending_post_progress","rate_limit_until"],(e=>{h(e?.last_logged_in_user||null);const t=e?.pending_post_progress;S(t&&"number"==typeof t.total?{processed:t.processed||0,total:t.total}:null),j(Math.max(0,(e?.rate_limit_until||0)-Date.now()))})),chrome.storage.sync.get(["last_check"],(e=>{L(null!=e.last_check)})),(0,l.Bc)((e=>{chrome.storage.local.get(void 0,(r=>{const n=[];Object.keys(e).forEach((t=>{e[t].forEach((e=>{const r=new i.QT({object:e});r.user=t,n.push(r)}))}));const o=n.map((e=>{const t=e.getID(),n=e.getObservedUTC()||0,o=e.getChangeType()||"",a=e.getSeenCount(),s=e.user||"",c="other"!==s,d=(0,l.PM)(s,c,t,r),u=(0,i.C3)(t)?"comment":"post";let f="",h="",p="",g="n/a",b="",m=0;if(d&&"string"!=typeof d){const e=d;m=e.getCreatedUTC()||0,f=(e.getText()||"").trim(),h=(e.getBody?.()||"").trim(),p=e.getSubreddit?.()||"",m&&(g=(0,i.tk)(n-m)||"n/a",b=new Date(1e3*m).toString())}f||h||(f=t||"");const v=d&&"string"!=typeof d?d.getPostID?.():void 0;let k="#",x=!1;if((0,i.C3)(t))if(v){k=`https://www.reddit.com/comments/${v.substring(3)}/-/${t.substring(3)}?context=3`}else x=!0;else{k=`https://www.reddit.com/comments/${t.substring(3)}`}return{id:t,action:o,actionVariant:G(o),observedUTC:n,createdUTC:m,formattedObserved:(0,i.Dh)(n),formattedObservedFull:new Date(1e3*n).toString(),timeLength:g,formattedCreated:b,contentType:u,user:s,subreddit:p,text:f,body:h,href:k,needsResolve:x,seenCount:a}}));t(o),a(!0)}))}))}),[]);(0,o.useEffect)((()=>{D(),(0,l.BO)().then(O);let e=null;const t=()=>{e&&clearTimeout(e),e=setTimeout(D,500)},r=(e,r)=>{const n=Object.keys(e);if(("sync"===r&&n.some((e=>e.startsWith("changes_")))||"local"===r&&n.some((e=>e.startsWith("items_"))))&&t(),"sync"===r&&e.last_check&&L(!0),"local"===r&&e.pending_post_lookups){const t=e.pending_post_lookups.newValue||[];m(t.length),0===t.length&&S(null)}if("local"===r&&e.pending_post_progress){const t=e.pending_post_progress.newValue;S(t&&"number"==typeof t.total?{processed:t.processed||0,total:t.total}:null)}"local"===r&&e.rate_limit_until&&j(Math.max(0,(e.rate_limit_until.newValue||0)-Date.now())),"local"===r&&e.notification_log&&O(e.notification_log.newValue||[])};return chrome.storage.onChanged.addListener(r),()=>{chrome.storage.onChanged.removeListener(r),e&&clearTimeout(e)}}),[D]);const I=e=>{const t=`https://www.reddit.com/api/info.json?id=${encodeURIComponent(e)}`,r=`https://www.reddit.com/api/info?id=${encodeURIComponent(e)}`;fetch(t,{credentials:"include"}).then((e=>e.json())).then((t=>{const n=t?.data?.children&&Array.isArray(t.data.children)?t.data.children:[],o=n[0]?.data||(n.find((t=>t?.data?.name===e))||{}).data;if(o?.permalink)return void window.open(`https://www.reddit.com${o.permalink}?context=3`,"_blank");const a=o&&(o.link_id||("t3_"===o.parent_id?.substr(0,3)?o.parent_id:null));if("t3_"===a?.substr(0,3)){const t=a.substring(3),r=e.substring(3);window.open(`https://www.reddit.com/comments/${t}/-/${r}?context=3`,"_blank")}else window.open(r,"_blank")})).catch((()=>{window.open(r,"_blank")}))},Z=(0,o.useMemo)((()=>{const t=e.filter((e=>((e,t)=>0===t.length||t.includes(e.actionVariant))(e,s))),r=[...t];return"observed"===d?r.sort(((e,t)=>t.observedUTC-e.observedUTC)):"created"===d?r.sort(((e,t)=>t.createdUTC-e.createdUTC)):r.sort(((e,t)=>t.observedUTC-t.createdUTC-(e.observedUTC-e.createdUTC))),r}),[e,s,d]),R=!p,le=p&&0===e.length&&r;return r?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(v,{}),(0,n.jsxs)(H,{children:[R?(0,n.jsxs)(z,{children:[(0,n.jsxs)("h2",{children:["Monitoring is active",f?` for u/${f}`:""]}),(0,n.jsx)("p",{children:"reveddit real-time is now watching your Reddit comments and posts. You'll be notified whenever content is removed by moderators, reapproved, locked, or unlocked."}),(0,n.jsxs)("ul",{children:[(0,n.jsx)("li",{children:"The extension's toolbar icon displays a badge count of removed comments and posts you haven't viewed yet."}),(0,n.jsxs)("li",{children:[(0,n.jsx)("strong",{children:"Pin the extension to your toolbar"})," so you can always see this count. ","Click the extensions puzzle icon in the toolbar, then pin reveddit real-time."]})]}),f&&(0,n.jsxs)("p",{children:["You can also view your"," ",(0,n.jsx)(k,{href:`https://www.reveddit.com/user/${f}?all=true`,target:"_blank",rel:"noreferrer",children:"reveddit.com user page"}),", which can show orphaned and collapsed comments."]}),(0,n.jsx)(P,{children:(0,n.jsx)(w,{variant:"secondary",onClick:()=>{localStorage.setItem("history_banner_dismissed","1"),g(!0)},children:"Got it"})})]}):(0,n.jsx)(F,{onClick:()=>{localStorage.removeItem("history_banner_dismissed"),g(!1)},children:"show welcome message"}),(0,n.jsxs)(ae,{children:[(0,n.jsx)("h1",{style:{margin:0},children:"History"}),(0,n.jsx)(se,{onClick:()=>{M(!0),setTimeout((()=>A.current?.scrollIntoView({behavior:"smooth"})),50)},children:"notification log"})]}),(0,n.jsx)(N,{children:(0,n.jsxs)(K,{children:[(0,n.jsxs)(B,{children:[(0,n.jsx)(q,{children:"filter"}),[["removed","mod removed"],["deleted","user deleted"],["locked","locked"],["unlocked","unlocked"],["approved","approved"],["edited","edited"]].map((([e,t])=>(0,n.jsxs)("label",{children:[(0,n.jsx)("input",{type:"checkbox",checked:s.includes(e),onChange:t=>{c(t.target.checked?[...s,e]:s.filter((t=>t!==e)))}}),t]},e)))]}),(0,n.jsxs)(B,{children:[(0,n.jsx)(q,{children:"sort"}),[["observed","observed"],["created","created"],["delta","time to action"]].map((([e,t])=>(0,n.jsxs)("label",{children:[(0,n.jsx)("input",{type:"radio",name:"sort",value:e,checked:d===e,onChange:()=>u(e)}),t]},e)))]}),(0,n.jsx)(X,{disabled:0===s.length&&"observed"===d,onClick:()=>{c([]),u("observed")},children:"reset"})]})}),b>0&&(0,n.jsxs)(y,{variant:"info",children:[(0,n.jsx)(_,{}),x&&x.total>0?`Scanning ${Math.min(x.processed,x.total)} of ${x.total} posts for removals…`:`Scanning ${b} ${1===b?"post":"posts"} for removals…`,C>0?` Paused ~${Math.max(1,Math.ceil(C/6e4))} min — Reddit rate limit.`:" New results appear here automatically.",(0,n.jsx)(V,{onClick:()=>{(0,l.GZ)(),m(0),S(null)},children:"stop"})]}),Z.length>0?Z.map(((e,t)=>(0,n.jsx)(Q,{row:e,onResolve:I},`${e.id}-${t}`))):(0,n.jsxs)(n.Fragment,{children:[le&&(0,n.jsxs)(z,{children:[(0,n.jsxs)("h2",{children:["Monitoring is active",f?` for u/${f}`:""]}),(0,n.jsx)("p",{children:"No removed or changed content has been observed yet. You'll be notified when any of your comments or posts are removed by moderators."}),(0,n.jsxs)("p",{children:["The extension's toolbar icon will display a count of removed items you haven't viewed. Pin the extension to your toolbar to always see it. ","Click the extensions puzzle icon in the toolbar, then pin reveddit real-time."]}),f&&(0,n.jsxs)("p",{children:["You can also check your"," ",(0,n.jsx)(k,{href:`https://www.reveddit.com/user/${f}?all=true`,target:"_blank",rel:"noreferrer",children:"reveddit.com user page"})," ","for orphaned and collapsed comments."]})]}),!le&&0===e.length&&!T&&(0,n.jsxs)(W,{children:[(0,n.jsx)(Y,{}),"Scanning your recent posts and comments…"]}),!le&&(T||e.length>0)&&(0,n.jsx)(W,{children:0===e.length?"No actions observed since extension installation.":"No events match the current filter."})]}),(0,n.jsxs)(J,{ref:A,children:[(0,n.jsxs)(ee,{onClick:()=>M(!E),children:[E?"▾":"▸"," Notification Log (",$.length,")"]}),E&&(0===$.length?(0,n.jsx)(oe,{children:"No notifications logged yet."}):(0,n.jsxs)(te,{children:[(0,n.jsx)(re,{children:"Time"}),(0,n.jsx)(re,{children:"Type"}),(0,n.jsx)(re,{children:"Message"}),(0,n.jsx)(re,{children:"IDs"}),$.slice().reverse().map(((e,t)=>(0,n.jsxs)(o.Fragment,{children:[(0,n.jsx)(ne,{children:new Date(e.ts).toLocaleString()}),(0,n.jsx)(ne,{children:e.source}),(0,n.jsx)(ne,{children:e.message}),(0,n.jsx)(ne,{children:e.itemIds?.join(", ")})]},t)))]}))]})]})]}):(0,n.jsx)(v,{})}),{}))},7785:(e,t,r)=>{r.d(t,{BO:()=>p,Bc:()=>b,Ci:()=>l,GZ:()=>x,PM:()=>g,U$:()=>s,VU:()=>v,WK:()=>d,YU:()=>c,nb:()=>i,oZ:()=>u});var n=r(9947),o=r(3150),a=r.n(o);const s=1,l=2,i=3,c=4,d=5,u=6,f=(e,t,r)=>r?e+"_u_"+t:e+"_"+t,h="notification_log",p=()=>a().storage.local.get({[h]:[]}).then((e=>e[h]||[])),g=(e,t,r,o)=>{const a=f("items",e,t);return a in o&&r in o[a]?new n.D4({object:o[a][r]}):""},b=e=>{chrome.storage.sync.get("user_subscriptions",(t=>{const r=[f("changes","other",!1)],n={changes_other:"other"};Object.keys(t.user_subscriptions).forEach((e=>{const t=f("changes",e,!0);r.push(t),n[t]=e})),chrome.storage.sync.get(r,(t=>{const o={};r.forEach((e=>{e in t&&t[e].length&&(o[n[e]]=t[e])})),e(o)}))}))},m="pending_post_lookups",v=async()=>(await a().storage.local.get({[m]:[]}))[m].length,k="pending_post_attempts",x=async()=>{await a().storage.local.remove([m,"pending_post_progress",k])}}},o={};function a(e){var t=o[e];if(void 0!==t)return t.exports;var r=o[e]={exports:{}};return n[e].call(r.exports,r,r.exports,a),r.exports}a.m=n,e=[],a.O=(t,r,n,o)=>{if(!r){var s=1/0;for(d=0;d<e.length;d++){for(var[r,n,o]=e[d],l=!0,i=0;i<r.length;i++)(!1&o||s>=o)&&Object.keys(a.O).every((e=>a.O[e](r[i])))?r.splice(i--,1):(l=!1,o<s&&(s=o));if(l){e.splice(d--,1);var c=n();void 0!==c&&(t=c)}}return t}o=o||0;for(var d=e.length;d>0&&e[d-1][2]>o;d--)e[d]=e[d-1];e[d]=[r,n,o]},a.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return a.d(t,{a:t}),t},r=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,a.t=function(e,n){if(1&n&&(e=this(e)),8&n)return e;if("object"==typeof e&&e){if(4&n&&e.__esModule)return e;if(16&n&&"function"==typeof e.then)return e}var o=Object.create(null);a.r(o);var s={};t=t||[null,r({}),r([]),r(r)];for(var l=2&n&&e;"object"==typeof l&&!~t.indexOf(l);l=r(l))Object.getOwnPropertyNames(l).forEach((t=>s[t]=()=>e[t]));return s.default=()=>e,a.d(o,s),o},a.d=(e,t)=>{for(var r in t)a.o(t,r)&&!a.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},a.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),a.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},a.j=908,a.p="",(()=>{a.b=document.baseURI||self.location.href;var e={908:0};a.O.j=t=>0===e[t];var t=(t,r)=>{var n,o,[s,l,i]=r,c=0;if(s.some((t=>0!==e[t]))){for(n in l)a.o(l,n)&&(a.m[n]=l[n]);if(i)var d=i(a)}for(t&&t(r);c<s.length;c++)o=s[c],a.o(e,o)&&e[o]&&e[o][0](),e[o]=0;return a.O(d)},r=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})();var s=a.O(void 0,[736],(()=>a(6402)));s=a.O(s)})();