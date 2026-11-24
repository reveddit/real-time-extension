(()=>{"use strict";var e,t,n,r={411:(e,t,n)=>{var r=n(893),o=n(294),s=n(206),a=n(745),i=n(917);const l={sm:"4px",md:"6px",lg:"8px",pill:"999px"},c={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px"},d={body:'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},u=i.iv`
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
`,f=i.iv`
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
        margin: ${c.md} 0;
    }

    h1,
    h2,
    h3,
    h4 {
        color: var(--text-primary);
    }
    h1 {
        font-size: 22px;
        margin: 0 0 ${c.lg} 0;
    }
    h2 {
        font-size: 18px;
        margin: 0 0 ${c.md} 0;
    }
    h3 {
        font-size: 16px;
        margin: 0 0 ${c.sm} 0;
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
`,h=i.iv`
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
`,p="ui_theme";function g(e){document.documentElement.setAttribute("data-theme",function(e){return"auto"===e?window.matchMedia?.("(prefers-color-scheme: light)").matches?"light":"dark":e}(e))}function b(){return(0,o.useEffect)((()=>{try{chrome.storage.local.get([p],(e=>{g(e?.[p]||"auto")}))}catch{g("auto")}const e=window.matchMedia?.("(prefers-color-scheme: light)"),t=()=>{try{chrome.storage.local.get([p],(e=>{"auto"===(e?.[p]||"auto")&&g("auto")}))}catch(e){}};e?.addEventListener?.("change",t);const n=(e,t)=>{"local"===t&&e[p]&&g(e[p].newValue||"auto")};return chrome.storage.onChanged.addListener(n),()=>{e?.removeEventListener?.("change",t),chrome.storage.onChanged.removeListener(n)}}),[]),(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(i.xB,{styles:u}),(0,r.jsx)(i.xB,{styles:f}),(0,r.jsx)(i.xB,{styles:h})]})}s.Z.a`
    color: var(--link);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,s.Z.a`
    color: var(--text-secondary);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`;const m=s.Z.button`
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
`,v=((0,s.Z)(m)`
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--border-light);
    &:hover {
        background: var(--bg-surface-hover);
    }
`,s.Z.button`
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
`,{warning:["var(--locked-bg)","var(--locked-border)","var(--text-primary)"],success:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],info:["var(--bg-surface)","var(--border)","var(--text-secondary)"]}),k=(s.Z.div`
    padding: 10px 12px;
    margin: 6px 0;
    border-radius: ${l.md};
    font-size: 0.92em;
    ${e=>{const[t,n,r]=v[e.variant]??v.info;return i.iv`
            background: ${t};
            border: 1px solid ${n};
            color: ${r};
        `}}
`,s.Z.div`
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: ${l.lg};
    padding: ${c.md} ${c.lg};
    margin-bottom: ${c.md};
    transition: border-color 0.15s ease;
    &:hover {
        border-color: var(--border-light);
    }
`),x=(s.Z.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${c.sm};
    margin-bottom: ${c.xs};
`,s.Z.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${c.sm};
    color: var(--text-secondary);
    font-size: 0.85em;
    margin-bottom: ${c.sm};
    & > span + span::before {
        content: '·';
        margin-right: ${c.sm};
        color: var(--text-muted);
    }
`,s.Z.div`
    color: var(--text-primary);
    font-size: 0.95em;
`,s.Z.div`
    display: flex;
    gap: ${c.sm};
    margin-top: ${c.sm};
    padding-top: ${c.sm};
    border-top: 1px solid var(--border);
`,{removed:["var(--removed-bg)","var(--removed-border)","var(--removed-text)"],deleted:["var(--deleted-bg)","var(--deleted-border)","var(--deleted-text)"],approved:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],locked:["var(--locked-bg)","var(--locked-border)","var(--text-primary)"],unlocked:["var(--approved-bg)","var(--approved-border)","var(--text-primary)"],edited:["var(--bg-surface-hover)","var(--border)","var(--text-primary)"],default:["var(--bg-surface-hover)","var(--border)","var(--text-secondary)"]}),w=(s.Z.span`
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
    ${e=>{const[t,n,r]=x[e.variant??"default"]??x.default;return i.iv`
            background: ${t};
            border-color: ${n};
            color: ${r};
        `}}
`,s.Z.h2`
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin: ${c.lg} 0 ${c.sm} 0;
    padding-bottom: ${c.xs};
    border-bottom: 1px solid var(--border);
`,s.Z.span`
    color: var(--author);
    font-weight: 600;
`,s.Z.span`
    color: var(--text-secondary);
`,s.Z.h3`
    margin: ${c.xs} 0 ${c.sm} 0;
    color: var(--text-primary);
`,s.Z.div`
    font-size: 0.95em;
`,s.Z.div`
    max-width: 820px;
    margin: 0 auto;
    padding: ${c.xl} ${c.lg};
`);!function(e){function t(e){return" "==e||"\n"==e}function n(e){return/[\x09-\x0d ]/.test(e)}function r(e){return/[A-Za-z0-9]/.test(e)}function o(e){return/[A-Za-z]/.test(e)}function s(e){return/[0-9]/.test(e)}function a(e){return/[0-9a-fA-F]/.test(e)}function i(e){return/[\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]/.test(e)}function l(e){var t="0123456789ABCDEF";return"%"+t[(240&e)>>4]+t[(15&e)>>0]}function c(e){var t=e.charCodeAt(0);if(t<128)return l(t);if(t>127&&t<2048){var n=l(t>>6&255|192);return n+=l(t>>0&63|128)}n=l(t>>12&255|224);return n+=l(t>>6&63|128),n+=l(t>>0&63|128)}function d(e,t){var r,o=0,s=e.length;if(s<3||"<"!=e[0])return Fe;"/"==e[r=1]&&(o=1,r++);for(var a=0;r<s&&!(a>=t.length);++r,++a)if(e[r]!=t[a])return Fe;return r==s?Fe:n(e[r])||">"==e[r]?o?Ue:Ke:Fe}function u(e,t){for(var n,r=0;r<t.s.length;){for(n=r;r<t.s.length&&"\\"!=t.s[r];)r++;if(r>n&&(e.s+=t.s.slice(n,r)),r+1>=t.s.length)break;e.s+=t.s[r+1],r+=2}}var f=1114111;var h=["&AElig;","&Aacute;","&Acirc;","&Agrave;","&Alpha;","&Aring;","&Atilde;","&Auml;","&Beta;","&Ccedil;","&Chi;","&Dagger;","&Delta;","&ETH;","&Eacute;","&Ecirc;","&Egrave;","&Epsilon;","&Eta;","&Euml;","&Gamma;","&Iacute;","&Icirc;","&Igrave;","&Iota;","&Iuml;","&Kappa;","&Lambda;","&Mu;","&Ntilde;","&Nu;","&OElig;","&Oacute;","&Ocirc;","&Ograve;","&Omega;","&Omicron;","&Oslash;","&Otilde;","&Ouml;","&Phi;","&Pi;","&Prime;","&Psi;","&Rho;","&Scaron;","&Sigma;","&THORN;","&Tau;","&Theta;","&Uacute;","&Ucirc;","&Ugrave;","&Upsilon;","&Uuml;","&Xi;","&Yacute;","&Yuml;","&Zeta;","&aacute;","&acirc;","&acute;","&aelig;","&agrave;","&alefsym;","&alpha;","&amp;","&and;","&ang;","&apos;","&aring;","&asymp;","&atilde;","&auml;","&bdquo;","&beta;","&brvbar;","&bull;","&cap;","&ccedil;","&cedil;","&cent;","&chi;","&circ;","&clubs;","&cong;","&copy;","&crarr;","&cup;","&curren;","&dArr;","&dagger;","&darr;","&deg;","&delta;","&diams;","&divide;","&eacute;","&ecirc;","&egrave;","&empty;","&emsp;","&ensp;","&epsilon;","&equiv;","&eta;","&eth;","&euml;","&euro;","&exist;","&fnof;","&forall;","&frac12;","&frac14;","&frac34;","&frasl;","&gamma;","&ge;","&gt;","&hArr;","&harr;","&hearts;","&hellip;","&iacute;","&icirc;","&iexcl;","&igrave;","&image;","&infin;","&int;","&iota;","&iquest;","&isin;","&iuml;","&kappa;","&lArr;","&lambda;","&lang;","&laquo;","&larr;","&lceil;","&ldquo;","&le;","&lfloor;","&lowast;","&loz;","&lrm;","&lsaquo;","&lsquo;","&lt;","&macr;","&mdash;","&micro;","&middot;","&minus;","&mu;","&nabla;","&nbsp;","&ndash;","&ne;","&ni;","&not;","&notin;","&nsub;","&ntilde;","&nu;","&oacute;","&ocirc;","&oelig;","&ograve;","&oline;","&omega;","&omicron;","&oplus;","&or;","&ordf;","&ordm;","&oslash;","&otilde;","&otimes;","&ouml;","&para;","&part;","&permil;","&perp;","&phi;","&pi;","&piv;","&plusmn;","&pound;","&prime;","&prod;","&prop;","&psi;","&quot;","&rArr;","&radic;","&rang;","&raquo;","&rarr;","&rceil;","&rdquo;","&real;","&reg;","&rfloor;","&rho;","&rlm;","&rsaquo;","&rsquo;","&sbquo;","&scaron;","&sdot;","&sect;","&shy;","&sigma;","&sigmaf;","&sim;","&spades;","&sub;","&sube;","&sum;","&sup1;","&sup2;","&sup3;","&sup;","&supe;","&szlig;","&tau;","&there4;","&theta;","&thetasym;","&thinsp;","&thorn;","&tilde;","&times;","&trade;","&uArr;","&uacute;","&uarr;","&ucirc;","&ugrave;","&uml;","&upsih;","&upsilon;","&uuml;","&weierp;","&xi;","&yacute;","&yen;","&yuml;","&zeta;","&zwj;","&zwnj;"],p=[7,7,7,7,7,7,7,7,7,0,0,7,7,0,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,0,0,1,0,0,0,2,3,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,5,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],g=["","&quot;","&amp;","&#39;","&#47;","&lt;","&gt;",""];function b(e,t,n){for(var r,o=0,s=0;o<t.length;){for(r=o;o<t.length&&!(s=p[t.charCodeAt(o)]);)o++;if(o>r&&(e.s+=t.slice(r,o)),o>=t.length)break;"/"!=t[o]||n?7==p[t.charCodeAt(o)]||(e.s+=g[s]):e.s+="/",o++}}var m=[2,2,2,2,2,2,2,2,2,0,0,2,2,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,1,0,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];function v(e,t){for(var n,r=0;r<t.length;){for(n=r;r<t.length&&1===m[t.charCodeAt(r)];)r++;if(r>n&&(e.s+=t.slice(n,r)),r>=t.length)break;if(2!=m[t.charCodeAt(r)]){switch(t[r]){case"&":e.s+="&amp;";break;case"'":e.s+="&#x27;";break;default:e.s+=c(t[r])}r++}else r++}}function k(e,t,n,r,s){var a,i,l=e.slice(n),c=0;for(i=0;i<t;++i)if("<"==l[i]){t=i;break}for(;t>0;){var d=l[t-1];if("\0"===d)break;if(-1!=="?!.,".indexOf(d))t--;else{if(";"!==d)break;for(var u=t-2;u>0&&o(l[u]);)u--;u<t-2&&"&"==l[u]?t=u:t--}}if(0==t)return 0;switch(a=l[t-1]){case'"':c='"';break;case"'":c="'";break;case")":c="(";break;case"]":c="[";break;case"}":c="{"}if(0!=c){for(var f=0,h=0,p=0;p<t;)l[p]==c?h++:l[p]==a&&f++,p++;f!=h&&t--}return t}function x(e,t){var n,o=0;if(!r(e[0]))return 0;for(n=1;n<e.length-1;++n)if("."==e[n])o++;else if(!r(e[n])&&"-"!=e[n])break;return t||o?n:0}function w(e){var t,n=["http://","https://","ftp://","mailto://","/","git://","steam://","irc://","news://","mumble://","ssh://","ircs://","ts3server://","#"];for(t=0;t<n.length;++t){var r=n[t].length;if(e.length>r&&0==e.toLowerCase().indexOf(n[t])&&/[A-Za-z0-9#\/?]/.test(e[r]))return 1}return 0}function y(e,t,r,o,s){var a=t,l=new We(e,t);if(o<2||r<1||l.getChar(-1)!=s)return 0;if(r>1){var c=l.getChar(-2);return"/"==c?2:i(c)||n(c)?1:0}return a>2&&"/"==l.getChar(-2)&&"\\"==l.getChar(-3)?0:1}function _(e){if(e)for(var t in e)t in this&&(this[t]=e[t])}function S(e,t){this.callbacks=e,this.context=t}function A(){return{nofollow:0,target:null,tocData:{headerCount:0,currentLevel:0,levelOffset:0},toc_id_prefix:null,html_element_whitelist:$t,html_attr_whitelist:Lt,flags:0,link_attributes:function(e,t,n){n.nofollow&&(e.s+=' rel="nofollow"'),null!=n.target&&(e.s+=' target="'+n.target+'"')}}}function L(e){var t=A();t.flags=null==e?St:e;var n=new S($(),t);return n.context.flags&Ce&&(n.callbacks.image=null),n.context.flags&Ie&&(n.callbacks.link=null,n.callbacks.autolink=null),(n.context.flags&Te||n.context.flags&Re)&&(n.callbacks.blockhtml=null),n}function $(){return new _({blockcode:T,blockquote:E,blockhtml:C,header:I,hrule:j,list:M,listitem:D,paragraph:B,table:R,table_row:N,table_cell:z,autolink:q,codespan:Z,double_emphasis:H,emphasis:P,image:F,linebreak:K,link:U,raw_html_tag:W,triple_emphasis:G,strikethrough:J,superscript:Y,entity:null,normal_text:V,doc_header:null,doc_footer:te})}function O(){return new _({blockcode:null,blockquote:null,blockhtml:null,header:Q,hrule:null,list:null,listitem:null,paragraph:null,table:null,table_row:null,table_cell:null,autolink:null,codespan:Z,double_emphasis:H,emphasis:P,image:null,linebreak:null,link:ee,raw_html_tag:null,triple_emphasis:G,strikethrough:J,superscript:Y,entity:null,normal_text:null,doc_header:null,doc_footer:ne})}function T(e,t,r,o){if(e.s.length&&(e.s+="\n"),r&&r.s.length){var s,a;for(e.s+='<pre><code class="',s=0,a=0;s<r.s.length;++s,++a){for(;s<r.s.length&&n(r.s[s]);)s++;if(s<r.s.length){for(var i=s;s<r.s.length&&!n(r.s[s]);)s++;"."==r.s[i]&&i++,a&&(e.s+=" "),b(e,r.s.slice(i,s),!1)}}e.s+='">'}else e.s+="<pre><code>";t&&b(e,t.s,!1),e.s+="</code></pre>\n"}function E(e,t,n){e.s.length&&(e.s+="\n"),e.s+="<blockquote>\n",t&&(e.s+=t.s),e.s+="</blockquote>\n"}function C(e,t,n){var r,o;if(t){for(o=t.s.length;o>0&&"\n"==t.s[o-1];)o--;for(r=0;r<o&&"\n"==t.s[r];)r++;r>=o||(e.s.length&&(e.s+="\n"),e.s+=t.s.slice(r,o),e.s+="\n")}}function I(e,t,n,r){e.s.length&&(e.s+="\n"),r.flags&Me?(e.s+="<h"+ +n+' id="',r.toc_id_prefix&&(e.s+=r.toc_id_prefix),e.s+="toc_"+r.tocData.headerCount+++'">'):e.s+="<h"+ +n+">",t&&(e.s+=t.s),e.s+="</h"+ +n+">\n"}function j(e,t){e.s.length&&(e.s+="\n"),e.s+=t.flags&Be?"<hr/>\n":"<hr>\n"}function M(e,t,n,r){e.s.length&&(e.s+="\n"),e.s+=n&oe?"<ol>\n":"<ul>\n",t&&(e.s+=t.s),e.s+=n&oe?"</ol>\n":"</ul>\n"}function D(e,t,n,r){if(e.s+="<li>",t){for(var o=t.s.length;o&&"\n"==t.s[o-1];)o--;e.s+=t.s.slice(0,o)}e.s+="</li>\n"}function B(e,t,r){var o=0;if(e.s.length&&(e.s+="\n"),t&&t.s.length){for(;o<t.s.length&&n(t.s[o]);)o++;if(o!=t.s.length){if(e.s+="<p>",r.flags&De)for(var s;o<t.s.length;){for(s=o;o<t.s.length&&"\n"!=t.data[o];)o++;if(o>s&&(e.s+=t.s.slice(s,o)),o>=t.s.length-1)break;K(e,r),o++}else e.s+=t.s.slice(o);e.s+="</p>\n"}}}function R(e,t,n,r){e.s.length&&(e.s+="\n"),e.s+="<table><thead>\n",t&&(e.s+=t.s),e.s+="</thead><tbody>\n",n&&(e.s+=n.s),e.s+="</tbody></table>\n"}function N(e,t,n){e.s+="<tr>\n",t&&(e.s+=t.s),e.s+="</tr>\n"}function z(e,t,n,r,o){switch(e.s+=n&Pe?"<th":"<td",o>1&&(e.s+=' colspan="'+o+'" '),n&He){case Ze:e.s+=' align="center">';break;case ze:e.s+=' align="left">';break;case qe:e.s+=' align="right">';break;default:e.s+=">"}t&&(e.s+=t.s),e.s+=n&Pe?"</th>\n":"</td>\n"}function q(e,t,n,r){return t&&t.s.length&&(0==(r.flags&je)||w(t.s)||n==_e)?(e.s+='<a href="',n==_e&&(e.s+="mailto:"),v(e,t.s.slice(0)),r.link_attributes?(e.s+='"',r.link_attributes(e,t,r),e.s+=">"):e.s+='">',0==t.s.indexOf("mailto:")?b(e,t.s.slice(7),!1):b(e,t.s,!1),e.s+="</a>",1):0}function Z(e,t,n){return e.s+="<code>",t&&b(e,t.s,!1),e.s+="</code>",1}function H(e,t,n){return t&&t.s.length?(e.s+="<strong>"+t.s+"</strong>",1):0}function P(e,t,n){return t&&t.s.length?(e.s+="<em>"+t.s+"</em>",1):0}function F(e,t,n,r,o){return t&&t.s.length?(e.s+='<img src="',v(e,t.s),e.s+='" alt="',r&&r.s.length&&b(e,r.s,!1),n&&n.s.length&&(e.s+='" title="',b(e,n.s,!1)),e.s+=o.flags&Be?'"/>':'">',1):0}function K(e,t){return e.s+=t.flags&Be?"<br/>\n":"<br>\n",1}function U(e,t,n,r,o){return null==t||0==(o.flags&je)||w(t.s)?(e.s+='<a href="',t&&t.s.length&&v(e,t.s),n&&n.s.length&&(e.s+='" title="',b(e,n.s,!1)),o.link_attributes?(e.s+='"',o.link_attributes(e,t,o),e.s+=">"):e.s+='">',r&&r.s.length&&(e.s+=r.s),e.s+="</a>",1):0}function X(e,t,n,r,o,s){var a,i,l,c,d,u=0,f=0,h=0,p=0,g=0;if(e.s+="<",s!=Ue){e.s+=r;var m=1+r.length;for(l=new Xe,c=new Xe;m<t.s.length&&!h;m++){switch(h=0,g=0,p=0,d=t.s[m]){case">":h=1;break;case"'":case'"':f?u?u==d?(u=0,p=1):c.s+=d:u=d:g=1;break;case" ":u?c.s+=" ":g=1;break;case"=":if(f){g=1;break}f=1;break;default:(f&&u||!f)&&(f?c.s+=d:l.s+=d)}if(p){var v=0;for(i=0;o[i];i++)if(o[i].length==l.s.length){for(a=0;a<l.s.length&&o[i][a].toLowerCase()==l.s[a].toLowerCase();a++);if(a==l.s.length){v=1;break}}v&&c.s.length&&l.s.length&&(e.s+=" ",b(e,l.s,!1),e.s+='="',b(e,c.s,!1),e.s+='"'),g=1}g&&(f=0,u=0,l=new Xe,c=new Xe)}e.s+=">"}else e.s+="/"+r+">"}function W(e,t,n){var r=n.html_element_whitelist;if(0!=(n.flags&Ne)&&r)for(var o=0;r[o];o++){var s=d(t.s,r[o]);if(s!=Fe)return X(e,t,0,r[o],n.html_attr_whitelist,s),1}return 0!=(n.flags&Re)?(b(e,t.s,!1),1):(0!=(n.flags&Te)||0!=(n.flags&Ee)&&d(t.s,"style")||0!=(n.flags&Ie)&&d(t.s,"a")||0!=(n.flags&Ce)&&d(t.s,"img")||(e.s+=t.s),1)}function G(e,t,n){return t&&t.s.length?(e.s+="<strong><em>"+t.s+"</em></strong>",1):0}function J(e,t,n){return t&&t.s.length?(e.s+="<del>"+t.s+"</del>",1):0}function Y(e,t,n){return t&&t.s.length?(e.s+="<sup>"+t.s+"</sup>",1):0}function V(e,t,n){t&&b(e,t.s,!1)}function Q(e,t,n,r){if(0==r.tocData.currentLevel&&(e.s+='<div class="toc">\n',r.tocData.levelOffset=n-1),(n-=r.tocData.levelOffset)>r.tocData.currentLevel)for(;n>r.tocData.currentLevel;)e.s+="<ul>\n<li>\n",r.tocData.currentLevel++;else if(n<r.tocData.currentLevel){for(e.s+="</li>\n";n<r.tocData.currentLevel;)e.s+="</ul>\n</li>\n",r.tocData.currentLevel--;e.s+="<li>\n"}else e.s+="</li>\n<li>\n";e.s+='<a href="#',r.toc_id_prefix&&(e.s+=r.toc_id_prefix),e.s+="toc_"+r.tocData.headerCount+++'">',t&&b(e,t.s,!1),e.s+="</a>\n"}function ee(e,t,n,r,o){return r&&r.s&&(e.s+=r.s),1}function te(e,t){t.tocData={headerCount:0,currentLevel:0,levelOffset:0}}function ne(e,t){for(var n=!1;t.tocData.currentLevel>0;)e.s+="</li>\n</ul>\n",t.tocData.currentLevel--,n=!0;n&&(e.s+="</div>\n"),te(0,t)}_.prototype={blockcode:null,blockquote:null,blockhtml:null,header:null,hrule:null,list:null,listitem:null,paragraph:null,table:null,table_row:null,table_cell:null,autolink:null,codespan:null,double_emphasis:null,emphasis:null,image:null,linebreak:null,link:null,raw_html_tag:null,triple_emphasis:null,strikethrough:null,superscript:null,entity:null,normal_text:null,doc_header:null,doc_footer:null},e.createCustomRenderer=function(e,t){return new S(e,t)},e.defaultRenderState=A,e.getRedditRenderer=L,e.getTocRenderer=function(){var e=A();return e.flags=Me|Te,new S(O(),e)},e.createCustomCallbacks=function(e){return new _(e)},e.getRedditCallbacks=$,e.getTocCallbacks=O;var re=[null,function(e,n,r,o,s){var a,i=r.slice(o),l=i.length,c=i[0];return l>2&&i[1]!=c?"~"==c||t(i[1])||0==(a=et(e,n,i,c))?0:a+1:i.length>3&&i[1]==c&&i[2]!=c?t(i[2])||0==(a=tt(e,n,i,c))?0:a+2:i.length>4&&i[1]==c&&i[2]==c&&i[3]!=c?"~"==c||t(i[3])||0==(a=function(e,n,r,o){var s,a,i=r.slice(3),l=0;for(;l<i.length;){if(!(s=Qe(i.slice(l),o)))return 0;if(i[l+=s]==o&&!t(i[l-1])){if(l+2<i.length&&i[l+1]==o&&i[l+2]==o&&n.callbacks.triple_emphasis){var c=new Xe;return n.spanStack.push(c),ct(c,n,i.slice(0,l)),a=n.callbacks.triple_emphasis(e,c,n.context),n.spanStack.pop(),a?l+3:0}return l+1<i.length&&i[l+1]==o?(s=et(e,n,r,o))?s-2:0:(s=tt(e,n,r,o))?s-1:0}}return 0}(e,n,i,c))?0:a+3:0},function(e,t,n,r,o){for(var s,a,i,l,c=n.slice(r),d=0;d<c.length&&"`"==c[d];)d++;for(a=0,s=d;s<c.length&&a<d;s++)"`"==c[s]?a++:a=0;if(a<d&&s>=c.length)return 0;for(i=d;i<s&&" "==c[i];)i++;for(l=s-d;l>d&&" "==c[l-1];)l--;if(i<l){var u=new Xe(c.slice(i,l));t.callbacks.codespan(e,u,t.context)||(s=0)}else t.callbacks.codespan(e,null,t.context)||(s=0);return s},function(e,t,n,r,o){if(n.slice(r),o<2||" "!=n[r-1]||" "!=n[r-2])return 0;for(var s=e.s.length;s&&" "==e.s[s-1];)s--;return e.s=e.s.slice(0,s),t.callbacks.linebreak(e,t.context)?1:0},function(e,n,r,o,s){var a,i,l=r.slice(o),c=s&&"!"==r[o-1],d=1,f=0,h=0,p=0,g=0,b=null,m=null,v=null,k=null,x=n.spanStack.length,w=0,y=0,_=0,S=0;function A(){return n.spanStack.length=x,y?d:0}if(c&&!n.callbacks.image||!c&&!n.callbacks.link)return A();for(a=1;d<l.length;d++)if("\n"==l[d])w=1;else{if("\\"==l[d-1])continue;if("["==l[d])a++;else if("]"==l[d]&&--a<=0)break}if(d>=l.length)return A();for(i=d,d++;d<l.length&&t(l[d]);)d++;if(d<l.length&&"("==l[d]){for(d++;d<l.length&&t(l[d]);)d++;for(f=d;d<l.length;)if("\\"==l[d])d+=2;else{if(")"==l[d])break;if(d>=1&&t(l[d-1])&&("'"==l[d]||'"'==l[d]))break;d++}if(d>=l.length)return A();if(h=d,"'"==l[d]||'"'==l[d]){for(S=l[d],_=1,p=++d;d<l.length;)if("\\"==l[d])d+=2;else if(l[d]==S)_=0,d++;else{if(")"==l[d]&&!_)break;d++}if(d>=l.length)return A();for(g=d-1;g>p&&t(l[g]);)g--;"'"!=l[g]&&'"'!=l[g]&&(p=g=0,h=d)}for(;h>f&&t(l[h-1]);)h--;"<"==l[f]&&f++,">"==l[h-1]&&h--,h>f&&(m=new Xe,n.spanStack.push(m),m.s+=l.slice(f,h)),g>p&&(v=new Xe,n.spanStack.push(v),v.s+=l.slice(p,g)),d++}else if(d<l.length&&"["==l[d]){var L=new Xe,$=null;for(f=++d;d<l.length&&"]"!=l[d];)d++;if(d>=l.length)return A();if(f==(h=d))if(w){var O=new Xe;for(n.spanStack.push(O),T=1;T<i;T++)"\n"!=l[T]?O.s+=l[T]:" "!=l[T-1]&&(O.s+=" ");L.s=O.s}else L.s=l.slice(1);else L.s=l.slice(f,h);if(!($=n.refs[L.s]))return A();m=$.link,v=$.title,d++}else{L=new Xe,$=null;if(w){var T;O=new Xe;for(n.spanStack.push(O),T=1;T<i;T++)"\n"!=l[T]?O.s+=l[T]:" "!=l[T-1]&&(O.s+=" ");L.s=O.s}else L.s=l.slice(1,i);if(!($=n.refs[L.s]))return A();m=$.link,v=$.title,d=i+1}return i>1&&(b=new Xe,n.spanStack.push(b),c?b.s+=l.slice(1,i):(n.inLinkBody=1,ct(b,n,l.slice(1,i)),n.inLinkBody=0)),m?(k=new Xe,n.spanStack.push(k),u(k,m),c?(e.s.length&&"!"==e.s[e.s.length-1]&&(e.s=e.s.slice(0,-1)),y=n.callbacks.image(e,k,v,b,n.context)):y=n.callbacks.link(e,k,v,b,n.context),A()):A()},function(e,t,n,o,s){var a=n.slice(o),i={p:we},l=function(e,t){var n,o;if(e.length<3)return 0;if("<"!=e[0])return 0;if(n="/"==e[1]?2:1,!r(e[n]))return 0;t.p=we;for(;n<e.length&&(r(e[n])||"."==e[n]||"+"==e[n]||"-"==e[n]);)n++;if(n>1&&"@"==e[n]&&0!=(o=function(e){var t=0,n=0;for(t=0;t<e.length;++t)if(!r(e[t]))switch(e[t]){case"@":n++;case"-":case".":case"_":break;case">":return 1==n?t+1:0;default:return 0}return 0}(e.slice(n))))return t.p=_e,n+o;n>2&&":"==e[n]&&(t.p=ye,n++);if(n>=e.length)t.p=we;else if(t.p){for(o=n;n<e.length;)if("\\"==e[n])n+=2;else{if(">"==e[n]||"'"==e[n]||'"'==e[n]||" "==e[n]||"\n"==e[n])break;n++}if(n>=e.length)return 0;if(n>o&&">"==e[n])return n+1;t.p=we}for(;n<e.length&&">"!=e[n];)n++;return n>=e.length?0:n+1}(a,i),c=new Xe(a.slice(0,l)),d=0;if(l>2)if(t.callbacks.autolink&&i.p!=we){var f=new Xe;t.spanStack.push(f),c.s=a.substr(1,l-2),u(f,c),d=t.callbacks.autolink(e,f,i.p,t.context),t.spanStack.pop()}else t.callbacks.raw_html_tag&&(d=t.callbacks.raw_html_tag(e,c,t.context));return d?l:0},function(e,t,n,r,o){var s=n.slice(r),a=new Xe;if(s.length>1){if(-1=="\\`*_{}[]()#+-.!:|&<>/^~".indexOf(s[1]))return 0;t.callbacks.normal_text?(a.s=s[1],t.callbacks.normal_text(e,a,t.context)):e.s+=s[1]}else 1==s.length&&(e.s+=s[0]);return 2},function(e,t,n,o,i){var l,c,d=n.slice(o),u=1,p=!1,g=!1,b=new Xe;for(u<d.length&&"#"===d[u]&&(p=!0,u++),u<d.length&&p&&"x"===d[u].toLowerCase()&&(g=!0,u++),l=u;u<d.length;){var m=d[u];if(g){if(!a(m))break}else if(p){if(!s(m))break}else if(!r(m))break;u++}if(!(u>l&&u<d.length&&";"===d[u]))return 0;if(u++,p&&undefined-l>7)return 0;if(p){if(c=g?16:10,!function(e){return e>8&&11!==e&&12!==e&&(e<14||e>31)&&(e<55296||e>57343)&&65534!==e&&65535!==e&&e<=f}(parseInt(d.slice(l),c)))return 0}else if(-1===h.indexOf(d.slice(0,u)))return 0;return t.callbacks.entity?(b.s=d.slice(0,u),t.callbacks.entity(e,b,t.context)):e.s+=d.slice(0,u),u},function(e,t,r,s,a){var i,l,c=r.slice(s),d={p:null};return!t.callbacks.autolink||t.inLinkBody?0:(i=new Xe,t.spanStack.push(i),(l=function(e,t,r,s,a,i,l){var c,d,u=r.slice(s),f=0;if(i<4||"/"!=r[s+1]||"/"!=r[s+2])return 0;for(;f<a&&o(r[s-f-1]);)f++;if(!w(r.substr(s-f,i+f)))return 0;if(c=3,0==(d=x(u.slice(c),l&xe)))return 0;for(c+=d;c<i&&!n(r[s+c]);)c++;return 0==(c=k(r,c,s))?0:(t.s+=r.substr(s-f,c+f),e.p=f,c)}(d,i,r,s,a,c.length,0))>0&&(d.p>0&&e.truncate(e.s.length-d.p),t.callbacks.autolink(e,i,ye,t.context)),t.spanStack.pop(),l)},function(e,t,n,o,s){var a,i,l=n.slice(o),c={p:null};return!t.callbacks.autolink||t.inLinkBody?0:(a=new Xe,t.spanStack.push(a),(i=function(e,t,n,o,s,a,i){n.slice(o);var l,c,d=0,u=0;for(c=0;c<s&&"\0"!=(f=n[o-c-1])&&(r(f)||-1!=".+-_".indexOf(f));++c);if(0==c)return 0;for(l=0;l<a;++l){var f;if(!r(f=n[o+l]))if("@"==f)d++;else if("."==f&&l<a-1)u++;else if("-"!=f&&"_"!=f)break}return l<2||1!=d||0==u||0==(l=k(n,l,o))?0:(t.s+=n.substr(o-c,l+c),e.p=c,l)}(c,a,n,o,s,l.length))>0&&(c.p>0&&e.truncate(e.s.length-c.p),t.callbacks.autolink(e,a,_e,t.context)),t.spanStack.pop(),i)},function(e,t,r,o,s){var a,l,c=r.slice(o),d=null,u=null,f={p:null};return!t.callbacks.link||t.inLinkBody?0:(a=new Xe,t.spanStack.push(a),(l=function(e,t,r,o,s,a,l){var c,d=r.slice(o);if(s>0&&!i(r[o-1])&&!n(r[o-1]))return 0;if(a<4||"www."!=d.slice(0,4))return 0;if(0==(c=x(d,0)))return 0;for(;c<a&&!n(d[c]);)c++;return 0==(c=k(r,c,o))?0:(t.s+=d.slice(0,c),e.p=0,c)}(f,a,r,o,s,c.length))>0&&(d=new Xe,t.spanStack.push(d),d.s+="http://",d.s+=a.s,f.p>0&&e.truncate(e.s.length-f.p),t.callbacks.normal_text?(u=new Xe,t.spanStack.push(u),t.callbacks.normal_text(u,a,t.context),t.callbacks.link(e,d,null,u,t.context),t.spanStack.pop()):t.callbacks.link(e,d,null,a,t.context),t.spanStack.pop()),t.spanStack.pop(),l)},function(e,t,n,o,s){var a,i=n.slice(o),l=0,c={p:null},d={p:null};if(!t.callbacks.autolink||t.inLinkBody)return 0;if(a=new Xe,t.spanStack.push(a),0===(l=function(e,t,n,o,s,a,i){var l=n.slice(o),c=0,d=!1,u=y(n,o,s,a,"r");if(!u)return 0;c=1,"all-"==l.substr(c,4).toLowerCase()&&(d=!0);do{var f=c,h=24;if(a>=c+10&&"reddit.com"==l.substr(c,10).toLowerCase())c+=10,h=10;else{if(a>c+2&&"t:"==l.substr(c,2)&&(c+=2),!r(l[c]))return 0;c+=1}for(;c<a&&(r(l[c])||"_"==l[c]);)c++;if(c-f<2||c-f>h)return 0}while(c<a&&("+"==l[c]||d&&"-"==l[c])&&c++);if(c<a&&"/"==l[c])for(;c<a&&(r(l[c])||"_"==l[c]||"/"==l[c]||"-"==l[c]);)c++;var p=o-u;return t.s+=n.slice(p,p+c+u),i.p=1==u,e.p=u,c}(c,a,n,o,s,i.length,d))&&(l=function(e,t,n,o,s,a,i){var l=n.slice(o),c=0;if(!(a<3)){var d=y(n,o,s,a,"u");if(!d)return 0;if(!r(l[c=1])&&"_"!=l[c]&&"-"!=l[c])return 0;for(c+=1;c<a&&(r(l[c])||"_"==l[c]||"/"==l[c]||"-"==l[c]);)c++;var u=o-d;return t.s+=n.slice(u,u+c+d),i.p=1==d,e.p=d,c}}(c,a,n,o,s,i.length,d)),l>0){var u=new Xe;if(t.spanStack.push(u),d.p&&(u.s+="/"),u.s+=a.s,c.p>0&&e.truncate(e.s.length-c.p),t.callbacks.normal_text){var f=new Xe;t.spanStack.push(f),t.callbacks.normal_text(f,a,t.context),t.callbacks.link(e,u,null,f,t.context),t.spanStack.pop()}else t.callbacks.link(e,u,null,a,t.context);t.spanStack.pop()}return t.spanStack.pop(),l},function(e,n,r,o,s){var a,i,l,c=r.slice(o),d=c.length;if(!n.callbacks.superscript)return 0;if(d<2)return 0;if("("==c[1]){for(a=i=2;i<d&&")"!=c[i]&&"\\"!=c[i-1];)i++;if(i==d)return 0}else for(a=i=1;i<d&&!t(c[i]);)i++;return i-a==0?2==a?3:0:(l=new Xe,n.spanStack.push(l),ct(l,n,c.slice(a,i)),n.callbacks.superscript(e,l,n.context),n.spanStack.pop(),2==a?i+1:i)}],oe=1,se=2,ae=8,ie=0,le=(ie++,ie++),ce=ie++,de=ie++,ue=ie++,fe=ie++,he=ie++,pe=ie++,ge=ie++,be=ie++,me=ie++,ve=ie++,ke=ie++,xe=1;ie=0;var we=ie++,ye=ie++,_e=ie++,Se=1,Ae=2,Le=4,$e=64,Oe=256,Te=1,Ee=2,Ce=4,Ie=8,je=32,Me=64,De=128,Be=256,Re=512,Ne=1024,ze=1,qe=2,Ze=3,He=3,Pe=4,Fe=0,Ke=1,Ue=2;function Xe(e){this.s=e||""}function We(e,t){if(this.s=e,t>=e.length||t<0)throw new RangeError("char * offset out of bounds");this.offset=t}function Ge(){this.spanStack=[],this.blockStack=[],this.extensions=152|Se|Ae|Ae;var e=L();this.context=e.context,this.callbacks=e.callbacks,this.inLinkBody=0,this.activeChars={},this.refs={},this.nestingLimit=16,this.maxTableCols=64}function Je(e){var t;for(t=0;t<e.length&&"\n"!=e[t];t++)if(" "!=e[t])return 0;return t+1}function Ye(e){var t,n=0,r=0;if(e.length<3)return 0;if(" "==e[0]&&(n++," "==e[1]&&(n++," "==e[2]&&n++)),n+2>=e.length||"*"!=e[n]&&"-"!=e[n]&&"_"!=e[n])return 0;for(t=e[n];n<e.length&&"\n"!=e[n];){if(e[n]==t)r++;else if(" "!=e[n])return 0;n++}return r>=3}function Ve(e,n){var r,o=0,s=0;if(o=function(e){var t,n=0,r=0;if(e.length<3)return 0;if(" "==e[0]&&(n++," "==e[1]&&(n++," "==e[2]&&n++)),n+2>=e.length||"~"!=e[n]&&"`"!=e[n])return 0;for(t=e[n];n<e.length&&e[n]==t;)r++,n++;return r<3?0:n}(e),0==o)return 0;for(;o<e.length&&" "==e[o];)o++;if(r=o,o<e.length&&"{"==e[o]){for(o++,r++;o<e.length&&"}"!=e[o]&&"\n"!=e[o];)s++,o++;if(o==e.length||"}"!=e[o])return 0;for(;s>0&&t(e[r+0]);)r++,s--;for(;s>0&&t(e[r+s-1]);)s--;o++}else for(;o<e.length&&!t(e[o]);)s++,o++;for(n&&(n.s=e.substr(r,s));o<e.length&&"\n"!=e[o];){if(!t(e[o]))return 0;o++}return o+1}function Qe(e,t){for(var n=1;n<e.length;){for(;n<e.length&&e[n]!=t&&"`"!=e[n]&&"["!=e[n];)n++;if(n==e.length)return 0;if(e[n]==t)return n;if(n&&"\\"==e[n-1])n++;else if("`"==e[n]){for(var r,o=0,s=0;n<e.length&&"`"==e[n];)n++,o++;if(n>=e.length)return 0;for(r=0;n<e.length&&r<o;)s||e[n]!=t||(s=n),"`"==e[n]?r++:r=0,n++;if(n>=e.length)return s}else if("["==e[n]){var a;s=0;for(n++;n<e.length&&"]"!=e[n];)s||e[n]!=t||(s=n),n++;for(n++;n<e.length&&(" "==e[n]||"\n"==e[n]);)n++;if(n>=e.length)return s;switch(e[n]){case"[":a="]";break;case"(":a=")";break;default:if(s)return s;continue}for(n++;n<e.length&&e[n]!=a;)s||e[n]!=t||(s=n),n++;if(n>=e.length)return s;n++}}return 0}function et(e,n,r,o){var s,a,l=r.slice(1),c=0;if(!n.callbacks.emphasis)return 0;for(l.length>1&&l[0]==o&&l[1]==o&&(c=1);c<l.length;){if(!(s=Qe(l.slice(c),o)))return 0;if((c+=s)>=l.length)return 0;if(l[c]==o&&!t(l[c-1])){if(n.extensions&Se&&"_"==o&&c+1!=l.length&&!t(l[c+1])&&!i(l[c+1]))continue;var d=new Xe;return n.spanStack.push(d),ct(d,n,l.slice(0,c)),a=n.callbacks.emphasis(e,d,n.context),n.spanStack.pop(),a?c+1:0}}return 0}function tt(e,n,r,o){var s,a,i=r.slice(2),l=0,c="~"==o?n.callbacks.strikethrough:n.callbacks.double_emphasis;if(!c)return 0;for(;l<i.length;){if(!(s=Qe(i.slice(l),o)))return 0;if((l+=s)+1<i.length&&i[l]==o&&i[l+1]==o&&l&&!t(i[l-1])){var d=new Xe;return n.spanStack.push(d),ct(d,n,i.slice(0,l)),a=c(e,d,n.context),n.spanStack.pop(),a?l+2:0}l++}return 0}function nt(e,t){if("#"!=t[0])return!1;if(e.extensions&$e){for(var n=0;n<t.length&&n<6&&"#"==t[n];)n++;if(n<t.length&&" "!=t[n])return!1}return!0}function rt(e){var t=0,n=e.length;if("="==e[t]){for(t=1;t<n&&"="==e[t];t++);for(;t<n&&" "==e[t];)t++;return t>=n||"\n"==e[t]?1:0}if("-"==e[t]){for(t=1;t<n&&"-"==e[t];t++);for(;t<n&&" "==e[t];)t++;return t>=n||"\n"==e[t]?2:0}return 0}function ot(e){for(var t=e.length,n=0;n<t&&"\n"!=e[n];)n++;return++n>=t?0:rt(e.slice(n))}function st(e){var t=0,n=e.length;return t<n&&" "==e[t]&&t++,t<n&&" "==e[t]&&t++,t<n&&" "==e[t]&&t++,t<n&&">"==e[t]?t+1<n&&" "==e[t+1]?t+2:t+1:0}function at(e){return e.length>3&&" "==e[0]&&" "==e[1]&&" "==e[2]&&" "==e[3]?4:0}function it(e){var t=e.length,n=0;if(n<t&&" "==e[n]&&n++,n<t&&" "==e[n]&&n++,n<t&&" "==e[n]&&n++,n>=t||e[n]<"0"||e[n]>"9")return 0;for(;n<t&&e[n]>="0"&&e[n]<="9";)n++;return n+1>=t||"."!=e[n]||" "!=e[n+1]||ot(e.slice(n))?0:n+2}function lt(e){var t=e.length,n=0;return n<t&&" "==e[n]&&n++,n<t&&" "==e[n]&&n++,n<t&&" "==e[n]&&n++,n+1>=t||"*"!=e[n]&&"+"!=e[n]&&"-"!=e[n]||" "!=e[n+1]||ot(e.slice(n))?0:n+2}function ct(e,t,n){var r=0,o=0,s=0,a=0,i=new Xe;if(!(t.spanStack.length+t.blockStack.length>t.nestingLimit))for(;r<n.length;){for(;o<n.length&&!(a=t.activeChars[n[o]]);)o++;if(t.callbacks.normal_text?(i.s=n.slice(r,o),t.callbacks.normal_text(e,i,t.context)):e.s+=n.slice(r,o),o>=n.length)break;r=o,(o=re[a](e,t,n,r,r-s))?s=o=r+=o:o=r+1}}function dt(e,t,n){for(var r,o,s,a=0;a<n.length&&a<6&&"#"==n[a];)a++;for(r=a;r<n.length&&" "==n[r];r++);for(o=r;o<n.length&&"\n"!=n[o];o++);for(s=o;o&&"#"==n[o-1];)o--;for(;o&&" "==n[o-1];)o--;if(o>r){var i=new Xe;t.spanStack.push(i),ct(i,t,n.slice(r,o)),t.callbacks.header&&t.callbacks.header(e,i,a,t.context),t.spanStack.pop()}return s}function ut(e,t,n){var r,o;return e.length+3>=n.length||n.slice(2).toLowerCase()!=e||">"!=n[e.length+2]?0:(o=0,(r=e.length+3)<n.length&&0==(o=Je(n.slice(r)))?0:(r+=o,o=0,r<n.length&&(o=Je(n.slice(r))),r+o))}function ft(e,t,n,r){var o,s,a,i=0,l=null,c=new Xe(n);if(n.length<2||"<"!=n[0])return 0;for(o=1;o<n.length&&">"!=n[o]&&" "!=n[o];)o++;if(o<n.length&&(a=n.slice(1),l=-1!=["p","dl","div","math","table","ul","del","form","blockquote","figure","ol","fieldset","h1","h6","pre","script","h5","noscript","style","iframe","h4","ins","h3","h2"].indexOf(a.toLowerCase())?a.toLowerCase():""),!l){if(n.length>5&&"!"==n[1]&&"-"==n[2]&&"-"==n[3]){for(o=5;o<n.length&&("-"!=n[o-2]||"-"!=n[o-1]||">"!=n[o]);)o++;if(++o<size&&(i=Je(n.slice(o))),i)return c.s=n.slice(0,o+i),r&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),c.s.length}if(n.length>4&&("h"==n[1]||"H"==n[1])&&("r"==n[2]||"R"==n[2])){for(o=3;o<n.length&&">"!=n[o];)o++;if(o+1<n.length&&(o++,i=Je(n.slice(o))))return c.s=n.slice(0,o+i),r&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),c.s.length}return 0}if(o=1,s=0,"ins"!=l&&"del"!=l){var d=l.length;for(o=1;o<n.length;){for(o++;o<n.length&&("<"!=n[o-1]||"/"!=n[o]);)o++;if(o+2+d>=n.length)break;if(i=ut(tag,0,n.slice(o-1))){o+=i-1,s=1;break}}}return s?(c.s=c.s.slice(0,o),r&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),o):0}function ht(e,t,n){var r,o,s=n.length,a=0,i="",l=new Xe;for(t.blockStack.push(l),r=0;r<s;){for(a=r+1;a<s&&"\n"!=n[a-1];a++);if(o=st(n.slice(r,a)))r+=o;else if(Je(n.slice(r,a))&&(a>=s||0==st(n.slice(a))&&!Je(n.slice(a))))break;r<a&&(i+=n.slice(r,a),a-r),r=a}return wt(l,t,i),t.callbacks.blockquote&&t.callbacks.blockquote(e,l,t.context),t.blockStack.pop(),a}function pt(e,t,n){for(var o=0,s=0,a=0,i=n.length,l=new Xe(n);o<i;){for(s=o+1;s<i&&"\n"!=n[s-1];s++);if(0!=st(n.slice(o,s))){s=o;break}var c=n.slice(o);if(Je(c)||0!=(a=rt(c)))break;if(Je(c))break;if(0!=(a=rt(c)))break;if(nt(t,c)||Ye(c)||st(c)){s=o;break}if(t.extensions&Oe&&!r(n[o])){if(it(c)||lt(c)){s=o;break}if("<"==n[o]&&t.callbacks.blockhtml&&ft(e,t,c,0)){s=o;break}if(0!=(t.extensions&&Le)&&0!=Ve(c,null)){s=o;break}}o=s}for(var d=o;d&&"\n"==n[d-1];)d--;if(l.s=l.s.slice(0,d),a){var u;if(l.size){var f;for(o=l.s.length;d&&"\n"!=n[d];)d-=1;for(f=d+1;d&&"\n"==n[d-1];)d-=1;if(l.s=l.s.slice(0,d),d>0){h=new Xe;t.blockStack.push(h),ct(h,t,l.s),t.callbacks.paragraph&&t.callbacks.paragraph(e,h,t.context),t.blockStack.pop(),l.s=l.s.slice(f,o)}else l.s=l.s.slice(0,o)}u=new Xe,t.spanStack.push(u),ct(u,t,l.s),t.callbacks.header&&t.callbacks.header(e,u,a,t.context),t.spanStack.pop()}else{var h=new Xe;t.blockStack.push(h),ct(h,t,l.s),t.callbacks.paragraph&&t.callbacks.paragraph(e,h,t.context),t.blockStack.pop()}return s}function gt(e,t,n){var r,o,s=null,a=new Xe;if(0==(r=Ve(n,a)))return 0;for(s=new Xe,t.blockStack.push(s);r<n.length;){var i,l=new Xe;if(0!=(i=Ve(n.slice(r),l))&&0==l.s.length){r+=i;break}for(o=r+1;o<n.length&&"\n"!=n[o-1];o++);if(r<o){var c=n.slice(r,o);Je(c)?s.s+="\n":s.s+=c}r=o}return s.s.length&&"\n"!=s.s[s.s.length-1]&&(s.s+="\n"),t.callbacks.blockcode&&t.callbacks.blockcode(e,s,a.s.length?a:null,t.context),t.blockStack.pop(),r}function bt(e,t,n){var r,o,s,a=n.length,i=null;for(t.blockStack.push(i=new Xe),r=0;r<a;){for(o=r+1;o<a&&"\n"!=n[o-1];o++);if(s=at(n.slice(r,o)))r+=s;else if(!Je(n.slice(r,o)))break;r<o&&(Je(n.slice(r,o))?i.s+="\n":i.s+=n.slice(r,o)),r=o}for(var l=i.s.length;l&&"\n"==i.s[l-1];)l-=1;return i.s=i.s.slice(0,l),i.s+="\n",t.callbacks.blockcode&&t.callbacks.blockcode(e,i,null,t.context),t.blockStack.pop(),r}function mt(e,t,n,r){for(var o,s,a,i,l=n.length,c=null,d=0,u=0,f=0,h=0,p=0,g=0;f<3&&f<l&&" "==n[f];)f++;if((d=lt(n))||(d=it(n)),!d)return 0;for(s=d;s<l&&"\n"!=n[s-1];)s++;for(t.spanStack.push(c=new Xe),t.spanStack.push(o=new Xe),c.s+=n.slice(d,s),d=s;d<l;){var b,m;for(s++;s<l&&"\n"!=n[s-1];)s++;if(Je(n.slice(d,s)))h=1,d=s;else{for(i=0;i<4&&d+i<s&&" "==n[d+i];)i++;if(a=i,t.flags&Le&&0!=Ve(n.slice(d+i,s),null)&&(g=!g),g||(b=lt(n.slice(d+i,s)),m=it(n.slice(d+i,s))),h&&(r.p&oe&&b||!(r.p&oe)&&m)){r.p|=ae;break}if(b&&!Ye(n.slice(d+i,s))||m){if(h&&(p=1),a==f)break;u||(u=c.s.length)}else{if(h&&0==a){r.p|=ae;break}h&&(c.s+="\n",p=1)}h=0,c.s+=n.slice(d+i,s),d=s}}return p&&(r.p|=se),r.p&se?u&&u<c.s.length?(wt(o,t,c.s.slice(0,u)),wt(o,t,c.s.slice(u))):wt(o,t,c.s):u&&u<c.s.length?(ct(o,t,c.s.slice(0,u)),wt(o,t,c.s.slice(u))):ct(o,t,c.s),t.callbacks.listitem&&t.callbacks.listitem(e,o,r.p,t.context),t.spanStack.pop(),t.spanStack.pop(),d}function vt(e,t,n,r){var o,s,a=n.length,i=0;for(t.blockStack.push(s=new Xe);i<a;){var l={p:r};if(o=mt(s,t,n.slice(i),l),r=l.p,i+=o,!o||r&ae)break}return t.callbacks.list&&t.callbacks.list(e,s,r,t.context),t.blockStack.pop(),i}function kt(e,n,r,o,s){var a,i,l,c=0;if(n.callbacks.table_cell&&n.callbacks.table_row){for(n.spanStack.push(l=new Xe),c<r.length&&"|"==r[c]&&c++,a=0;a<o.length&&c<r.length;++a){var d,u,f;for(n.spanStack.push(f=new Xe);c<r.length&&t(r[c]);)c++;for(d=c;c<r.length&&"|"!=r[c];)c++;for(u=c-1;u>d&&t(r[u]);)u--;ct(f,n,r.slice(d,1+u)),n.callbacks.table_cell(l,f,o[a]|s,n.context,0),n.spanStack.pop(),c++}if((i=o.length-a)>0){n.callbacks.table_cell(l,null,o[a]|s,n.context,i)}n.callbacks.table_row(e,l,n.context),n.spanStack.pop()}}function xt(e,n,r){var o,s,a,i={p:null};if(n.spanStack.push(s=new Xe),n.blockStack.push(a=new Xe),o=function(e,n,r,o){for(var s,a,i,l=0,c=0;l<r.length&&"\n"!=r[l];)"|"==r[l++]&&c++;if(l==r.length||0==c)return 0;for(a=l;a>0&&t(r[a-1]);)a--;if("|"==r[0]&&c--,a&&"|"==r[a-1]&&c--,c+1>n.maxTableCols)return 0;o.p=new Array(c+1);for(var d=0;d<o.p.length;d++)o.p[d]=0;for(++l<r.length&&"|"==r[l]&&l++,i=l;i<r.length&&"\n"!=r[i];)i++;for(s=0;s<o.p.length&&l<i;++s){for(var u=0;l<i&&" "==r[l];)l++;for(":"==r[l]&&(l++,o.p[s]|=ze,u++);l<i&&"-"==r[l];)l++,u++;for(l<i&&":"==r[l]&&(l++,o.p[s]|=qe,u++);l<i&&" "==r[l];)l++;if(l<i&&"|"!=r[l])break;if(u<1)break;l++}return s<o.p.length?0:(kt(e,n,r.slice(0,a),o.p,Pe),i+1)}(s,n,r,i),o>0){for(;o<r.length;){var l,c=0;for(l=o;o<r.length&&"\n"!=r[o];)"|"==r[o++]&&c++;if(0==c||o==r.length){o=l;break}kt(a,n,r.slice(l,o),i.p,0),o++}n.callbacks.table&&n.callbacks.table(e,s,a,n.context)}return n.spanStack.pop(),n.blockStack.pop(),o}function wt(e,t,n){var r,o,s=0;if(!(t.spanStack.length+t.blockStack.length>t.nestingLimit))for(;s<n.length;)if(o=n.slice(s),n.length-s,nt(t,o))s+=dt(e,t,o);else if("<"==n[s]&&t.callbacks.blockhtml&&0!=(r=ft(e,t,o,1)))s+=r;else if(0!=(r=Je(o)))s+=r;else if(Ye(o)){for(t.callbacks.hrule&&t.callbacks.hrule(e,t.context);s<n.length&&"\n"!=n[s];)s++;s++}else 0!=(t.extensions&Le)&&0!=(r=gt(e,t,o))||0!=(t.extensions&Ae)&&0!=(r=xt(e,t,o))?s+=r:st(o)?s+=ht(e,t,o):at(o)?s+=bt(e,t,o):lt(o)?s+=vt(e,t,o,0):it(o)?s+=vt(e,t,o,oe):s+=pt(e,t,o)}function yt(e,t,n,r){var o,s,a,i,l,c,d,u=0;if(t+3>=n)return 0;if(" "==e[t]&&(u=1," "==e[t+1]&&(u=2," "==e[t+2]&&(u=3," "==e[t+3]))))return 0;if("["!=e[u+=t])return 0;for(o=++u;u<n&&"\n"!=e[u]&&"\r"!=e[u]&&"]"!=e[u];)u++;if(u>=n||"]"!=e[u])return 0;if(s=u,++u>=n||":"!=e[u])return 0;for(u++;u<n&&" "==e[u];)u++;for(u<n&&("\n"==e[u]||"\r"==e[u])&&++u<n&&"\r"==e[u]&&"\n"==e[u-1]&&u++;u<n&&" "==e[u];)u++;if(u>=n)return 0;for("<"==e[u]&&u++,a=u;u<n&&" "!=e[u]&&"\n"!=e[u]&&"\r"!=e[u];)u++;for(i=">"==e[u-1]?u-1:u;u<n&&" "==e[u];)u++;if(u<n&&"\n"!=e[u]&&"\r"!=e[u]&&"'"!=e[u]&&'"'!=e[u]&&"("!=e[u])return 0;if(d=0,(u>=n||"\r"==e[u]||"\n"==e[u])&&(d=u),u+1<n&&"\n"==e[u]&&"\r"==e[u+1]&&(d=u+1),d)for(u=d+1;u<n&&" "==e[u];)u++;if(l=c=0,u+1<n&&("'"==e[u]||'"'==e[u]||"("==e[u])){for(l=++u;u<n&&"\n"!=e[u]&&"\r"!=e[u];)u++;for(c=u+1<n&&"\n"==e[u]&&"\r"==e[u+1]?u+1:u,u-=1;u>l&&" "==e[u];)u-=1;u>l&&("'"==e[u]||'"'==e[u]||")"==e[u])&&(d=c,c=u)}if(!d||i==a)return 0;var f=e.slice(o,s),h=e.slice(a,i),p=null;return c>l&&(p=e.slice(l,c)),r.refs[f]={id:f,link:new Xe(h),title:new Xe(p)},d}function _t(e,t){for(var n=0,r=0;n<t.length;){for(var o=n;n<t.length&&"\t"!=t[n];)n++,r++;if(n>o&&(e.s+=t.slice(o,n)),n>=t.length)break;do{e.s+=" ",r++}while(r%4);n++}}Xe.prototype.truncate=function(e){if(this.s.length<e)throw new RangeError("Buffer smaller than desired size");if(e<0)throw new RangeError("Size argument is negative");this.s=this.s.slice(0,e)},We.prototype.getChar=function(e){var t=this.offset+e;if(t>=this.s.length||t<0)throw new RangeError("Character index out of bounds");return this.s.slice(t,t+1)},We.prototype.toString=function(){return this.s.slice(this.offset)},Ge.prototype.render=function(e){var t,n=new Xe,r=0;for(this.refs={};r<e.length;)if(t=yt(e,r,e.length,this))r=t;else{for(t=r;t<e.length&&"\n"!=e[t]&&"\r"!=e[t];)t++;for(t>r&&_t(n,e.slice(r,t));t<e.length&&("\n"==e[t]||"\r"==e[t]);)("\n"==e[t]||t+1<e.length&&"\n"!=e[t+1])&&(n.s+="\n"),t++;r=t}var o=new Xe;return this.callbacks.doc_header&&this.callbacks.doc_header(o,this.context),n.s.length&&("\n"!=n.s[n.s.length-1]&&"\r"!=n.s[n.s.length-1]&&(n.s+="\n"),wt(o,this,n.s)),this.callbacks.doc_footer&&this.callbacks.doc_footer(o,this.context),o.s},e.getParser=function(e,t,n,r){var o=new Ge;e&&(o.callbacks=e.callbacks),n&&(o.nestingLimit=n),n&&(o.maxTableCols=r),e&&(o.context=e.context),null!=t&&null!=t&&(o.extensions=t);var s=o.callbacks;return(s.emphasis||s.double_emphasis||s.triple_emphasis)&&(o.activeChars["*"]=le,o.activeChars._=le,16&o.extensions&&(o.activeChars["~"]=le)),s.codespan&&(o.activeChars["`"]=ce),s.linebreak&&(o.activeChars["\n"]=de),(s.image||s.link)&&(o.activeChars["["]=ue),o.activeChars["<"]=fe,o.activeChars["\\"]=he,o.activeChars["&"]=pe,8&o.extensions&&(512&o.extensions||(o.activeChars["@"]=be),o.activeChars[":"]=ge,o.activeChars.w=me,o.activeChars["/"]=ve),128&o.extensions&&(o.activeChars["^"]=ke),o};var St=Te|Ce|je|Re|Be,At=Te|je|Ne|Re|Be,Lt=["colspan","rowspan","cellspacing","cellpadding","scope"],$t=["tr","th","td","table","tbody","thead","tfoot","caption"];e.DEFAULT_HTML_ELEMENT_WHITELIST=$t,e.DEFAULT_HTML_ATTR_WHITELIST=Lt,e.DEFAULT_BODY_FLAGS=St,e.DEFAULT_WIKI_FLAGS=At,e.HTML_SKIP_HTML=Te,e.HTML_SKIP_STYLE=Ee,e.HTML_SKIP_IMAGES=Ce,e.HTML_SKIP_LINKS=Ie,e.HTML_EXPAND_TABS=16,e.HTML_SAFELINK=je,e.HTML_TOC=Me,e.HTML_HARD_WRAP=De,e.HTML_USE_XHTML=Be,e.HTML_ESCAPE=Re,e.HTML_ALLOW_ELEMENT_WHITELIST=Ne,e.MKDEXT_NO_INTRA_EMPHASIS=Se,e.MKDEXT_TABLES=Ae,e.MKDEXT_FENCED_CODE=Le,e.MKDEXT_AUTOLINK=8,e.MKDEXT_STRIKETHROUGH=16,e.MKDEXT_SPACE_HEADERS=$e,e.MKDEXT_SUPERSCRIPT=128,e.MKDEXT_LAX_SPACING=Oe,e.MKDEXT_NO_EMAIL_AUTOLINK=512,e.SD_AUTOLINK_SHORT_DOMAINS=xe,e.MKDA_NOT_AUTOLINK=we,e.MKDA_NORMAL=ye,e.MKDA_EMAIL=_e,"function"==typeof define&&define("snuownd",[],e)}((()=>{const e="undefined"!=typeof window?window:"undefined"!=typeof globalThis?globalThis:{};return e.SnuOwnd||(e.SnuOwnd={}),e.SnuOwnd})());const y=("undefined"!=typeof window?window:"undefined"!=typeof globalThis?globalThis:{}).SnuOwnd,_=y.getParser(),S=y.getRedditRenderer();S.context.target="_blank";const A=y.getParser(S),L=(e,t=!1)=>(t?A:_).render((e||"").replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<")).replace(/href="\//g,'href="https://www.reddit.com/');var $=n(150),O=n.n($);const T=new Set(["cycle","auth","feed","ratelimit","news","ui"]),E="diag_log_v1",C="diag_summary_v2",I=36e5;let j=[],M=!1,D=[];const B=new Set;let R=!1,N=null;const z=e=>Math.floor(e/I),q=e=>`${C}_${z(e)}`,Z=(e,t)=>Array.from({length:t-e+1},((t,n)=>`${C}_${e+n}`)),H=e=>{const t=z(e)-36+1;return Z(t-24,t-1)},P=(e,t)=>{const n=(z(t)-36+1)*I;let r=e.filter((e=>e.t>=n));return r.length>12e3&&(r=r.slice(r.length-12e3)),r},F=e=>((e,t,n)=>{let r=e.length>t?e.slice(e.length-t):e;for(;r.length>1&&JSON.stringify(r).length>n;)r=r.slice(Math.max(1,Math.floor(r.length/10)));return r})(e,600,131072),K=()=>{R&&!N&&(N=setTimeout((()=>{N=null,(()=>{const e=Date.now(),t={};if(M&&(t[E]=j,M=!1),B.size){const e={};for(const t of D){const n=q(t.t);B.has(n)&&(e[n]=e[n]||[]).push(t)}for(const n of B)t[n]=e[n]||[];B.clear()}const n=[];Object.keys(t).length&&n.push(O().storage.local.set(t)),n.push(O().storage.local.remove(H(e))),Promise.all(n).then((()=>{})).catch((()=>{}))})()}),2e3))},U=(e,t,n,r)=>{void 0===r?console.log(n):console.log(n,r);const o={t:Date.now(),a:t,m:n};if(void 0!==r)try{const e="string"==typeof r?r:JSON.stringify(r);o.d=e.length>500?e.slice(0,500)+"…":e}catch{o.d=String(r)}"summary"===e?(D.push(o),D=P(D,o.t),B.add(q(o.t))):(j.push(o),j=F(j),M=!0),K()},X=(e,t,n)=>U(T.has(e)?"summary":"detail",e,t,n),W=(e,t,n)=>Array.isArray(e)?[...new Set(e.filter((e=>"string"==typeof e&&t.test(e))))].slice(0,n):[],G={tokenFields:["jsc_token","token"],solutionRegex:'await\\(async e=>e\\+e\\)\\("([^"]*)"\\)'},J=/^[a-z][a-z0-9_]{0,31}$/;let Y={...G};const V=e=>{const t={};if(e&&"object"==typeof e){const n=W(e.token_fields,J,8);if(n.length&&(t.tokenFields=n),"string"==typeof e.solution_regex&&e.solution_regex.length<=200)try{new RegExp(e.solution_regex),/\(/.test(e.solution_regex)&&(e=>{let t=0,n=!1;for(let r=0;r<e.length;r++){const o=e[r];if("\\"===o){const t=e[r+1];if(void 0===t||/[1-9k]/.test(t))return!1;r++,n=!0}else if("["===o){let t=r+1;for("^"===e[t]&&t++,"]"===e[t]&&t++;t<e.length&&"]"!==e[t];)t+="\\"===e[t]?2:1;if(t>=e.length)return!1;r=t,n=!0}else if("("===o){if("?"===e[r+1]){if(":"!==e[r+2])return!1;r+=2}n=!1}else if("*"===o||"+"===o||"?"===o||"{"===o){if(!n)return!1;if("{"===o){const n=/^\{(\d+)(,(\d*))?\}/.exec(e.slice(r));if(!n)return!1;if(""===n[3])t++;else if(Number(n[3]??n[1])>1e3)return!1;r+=n[0].length-1}else"?"!==o&&t++;"?"===e[r+1]&&r++,n=!1}else n=!")|^$.".includes(o)}return t<=2})(e.solution_regex)&&(t.solutionRegex=e.solution_regex)}catch{}}return t},Q={commentIdAttributes:["thingId","thing-id"],postIdAttributes:["id"],postBannerSlots:["post-removed-banner"],commentButtonSlots:["comment-share"],postButtonSlots:["action-row-whitespace"]},ee=/^[A-Za-z][A-Za-z0-9_-]{0,39}$/;let te={commentIdAttributes:[...Q.commentIdAttributes],postIdAttributes:[...Q.postIdAttributes],postBannerSlots:[...Q.postBannerSlots],commentButtonSlots:[...Q.commentButtonSlots],postButtonSlots:[...Q.postButtonSlots]};const ne=e=>{const t={},n=e=>W(e,ee,8);if(e&&"object"==typeof e){const r=n(e.comment_id_attributes??e.commentIdAttributes),o=n(e.post_id_attributes??e.postIdAttributes),s=n(e.post_banner_slots??e.postBannerSlots),a=n(e.comment_button_slots??e.commentButtonSlots),i=n(e.post_button_slots??e.postButtonSlots);r.length&&(t.commentIdAttributes=r),o.length&&(t.postIdAttributes=o),s.length&&(t.postBannerSlots=s),a.length&&(t.commentButtonSlots=a),i.length&&(t.postButtonSlots=i)}return t},re={paths:["/login","/account/login","/register","/account/register"],markers:[]},oe=/^\/[A-Za-z0-9_/-]{1,63}$/,se=/^[\x20-\x7e]{6,120}$/;let ae={paths:[...re.paths],markers:[...re.markers]};const ie=e=>"string"==typeof e?e.replace(/\/+$/,""):e,le=e=>{const t={};if(e&&"object"==typeof e){const n=W(Array.isArray(e.paths)?e.paths.map(ie):[],oe,8),r=W(e.markers,se,4);n.length&&(t.paths=n),r.length&&(t.markers=r)}return t},ce=["background","tab"],de=["default","no-store","no-cache","reload"],ue=e=>{if("string"!=typeof e)return!1;const[t,n,...r]=e.split(":");return 0===r.length&&ce.includes(t)&&(e=>de.includes(e))(n)},fe=e=>Array.isArray(e)?[...new Set(e.filter(ue))]:[],he=e=>{const t={};if(!e||"object"!=typeof e||Array.isArray(e))return t;for(const n of["chrome","firefox"]){const r=e[n],o=Array.isArray(r)?{order:fe(r),skip:[]}:{order:fe(r?.order),skip:fe(r?.skip)};(o.order.length||o.skip.length)&&(t[n]=o)}return t},pe="7e9b27126097f51ae6c9cd5b049af34891da6ba6",ge=/^[0-9a-f]{40}$/;let be=null;const me=e=>"string"==typeof e&&ge.test(e)?e:"",ve="news_cache",ke="news_fetch_failed_at",xe=["chrome","edge","firefox"],we=(...e)=>new Promise((t=>{try{chrome.storage.local.get(e,(e=>t(e||{})))}catch{t({})}})),ye=async()=>(await we(ve))[ve]||null,_e=/^\d+(\.\d+){0,3}$/,Se=e=>"string"==typeof e&&_e.test(e),Ae=(e,t)=>{const n=e.split(".").map((e=>parseInt(e,10)||0)),r=t.split(".").map((e=>parseInt(e,10)||0));for(let e=0;e<Math.max(n.length,r.length);e++){const t=(n[e]||0)-(r[e]||0);if(0!==t)return t}return 0},Le=async()=>{const e=(await ye())?.feed||{messages:[]};let t="";try{t=chrome.runtime.getManifest().version}catch{}const n=t?((e,t)=>e.filter((e=>!(Se(e.min_version)&&Ae(t,e.min_version)<0||Se(e.max_version)&&Ae(t,e.max_version)>0))))(e.messages,t):e.messages;return[...n].sort(((e,t)=>(t.priority||0)-(e.priority||0)||(t.published_utc||0)-(e.published_utc||0)))},$e=e=>{var t,n;t=e.challenge||{},Y={tokenFields:t.tokenFields?.length?t.tokenFields:G.tokenFields,solutionRegex:t.solutionRegex||G.solutionRegex},(e=>{const t=(e,t)=>[...e||[],...t.filter((t=>!(e||[]).includes(t)))];te={commentIdAttributes:t(e.commentIdAttributes,Q.commentIdAttributes),postIdAttributes:t(e.postIdAttributes,Q.postIdAttributes),postBannerSlots:t(e.postBannerSlots,Q.postBannerSlots),commentButtonSlots:t(e.commentButtonSlots,Q.commentButtonSlots),postButtonSlots:t(e.postButtonSlots,Q.postButtonSlots)}})(ne(e.markup)),(e=>{ae={paths:[...new Set([...e.paths||[],...re.paths])],markers:[...new Set([...e.markers||[],...re.markers])]}})(le(e.login_wall)),n=e.publicmodlogs_feed||"",be=me(n)||pe},Oe=/^[A-Za-z0-9_.-]{1,64}$/,Te=e=>W(e,Oe,4),Ee=e=>{const t={};if(e&&"object"==typeof e)for(const[n,r]of Object.entries(e))"auto"!==r&&"on"!==r&&"off"!==r||(t[n]=r);return t},Ce=e=>{const t={};if(e&&"object"==typeof e)for(const n of xe)Se(e[n])&&(t[n]=e[n]);return t},Ie=e=>Object.fromEntries(Object.entries(e).filter((([,e])=>e&&"object"==typeof e?Object.keys(e).length:e))),je=/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/,Me=async(e={})=>{const t=await ye(),n=Date.now(),r=t?n-t.lastFetched:1/0;if(!e.force&&r>=0&&r<36e5)return;const o=()=>chrome.storage.local.set({[ke]:n});if(!e.force){const e=Number((await we(ke))[ke])||0;if(n-e>=0&&n-e<6e5)return}try{const e=await fetch("https://www.reveddit.com/extension-news.json",{credentials:"omit",cache:"no-cache"});if(!e.ok)return X("news",`[reveddit] news fetch failed: ${e.status}`),void o();const t=await e.json();if(!t||!Array.isArray(t.messages))return void o();const r=(e=>{const t=e.options||{};return{messages:e.messages.filter((e=>e&&"string"==typeof e.id&&"string"==typeof e.title&&"string"==typeof e.body_markdown)).map((e=>{return{id:e.id,published_utc:Number(e.published_utc)||0,title:e.title,body_markdown:e.body_markdown,severity:e.severity,...Se(e.min_version)?{min_version:e.min_version}:{},...Se(e.max_version)?{max_version:e.max_version}:{},...Number(e.priority)?{priority:Number(e.priority)}:{},...(t=e.icon,"string"==typeof t&&t.length<=8e3&&je.test(t)?{icon:e.icon}:{})};var t})),options:{mechanisms:Ee(t.mechanisms),...Ie({challenge:V(t.challenge),www_route_order:he(t.www_route_order),markup:ne(t.markup),login_cookies:Te(t.login_cookies),login_wall:le(t.login_wall),publicmodlogs_feed:me(t.publicmodlogs_feed)})},...Ie({latest_version:Se(e.latest_version)?e.latest_version:"",latest_version_published_utc:Math.max(Number(e.latest_version_published_utc)||0,0),store_versions:Ce(e.store_versions)})}})(t),s=r.options,a={feed:r,lastFetched:n};chrome.storage.local.set({[ve]:a}),$e(s),X("news",`[reveddit] news fetch ok: ${r.messages.length} messages, mechanisms=${JSON.stringify(s.mechanisms)}`+(s.www_route_order?`, www_route_order=${JSON.stringify(s.www_route_order)}`:"")+(s.markup?`, markup=${JSON.stringify(s.markup)}`:"")+(s.login_wall?`, login_wall=${JSON.stringify(s.login_wall)}`:"")+(s.publicmodlogs_feed?", publicmodlogs_feed set":""))}catch(e){X("news",`[reveddit] news fetch error: ${String(e?.message||e)}`),o()}},De=[{id:"apps",label:"Other apps"},{id:"versions",label:"Version history"}],Be=s.Z.h1`
  font-size: 1.4em;
  margin: 0 0 ${c.lg} 0;
`,Re=s.Z.div`
  display: flex;
  gap: ${c.xl};
  border-bottom: 1px solid var(--border);
  margin-bottom: ${c.lg};
`,Ne=s.Z.button`
  background: none;
  border: none;
  border-bottom: 2px solid ${e=>e.$active?"var(--link)":"transparent"};
  color: ${e=>e.$active?"var(--text-primary)":"var(--text-secondary)"};
  cursor: pointer;
  font: inherit;
  font-weight: ${e=>e.$active?600:400};
  padding: ${c.sm} 0;
  margin-bottom: -1px;
  &:hover {
    color: var(--text-primary);
  }
`,ze=(0,s.Z)(k)`
  display: flex;
  gap: ${c.lg};
  align-items: flex-start;
  & > img {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    flex: none;
  }
  & > div {
    min-width: 0;
    flex: 1;
  }
  & h3 {
    margin: 0;
    font-size: 1em;
  }
  & time {
    display: block;
    margin: 2px 0 ${c.sm} 0;
    color: var(--text-secondary);
    font-size: 0.85em;
  }
  & ul {
    margin: ${c.sm} 0 0 0;
    padding-left: ${c.xl};
  }
`,qe=s.Z.p`
  color: var(--text-secondary);
`,Ze=e=>Number.isNaN(e.getTime())?"":e.toLocaleDateString(void 0,{year:"numeric",month:"long",day:"numeric"});function He({message:e}){const t=e.published_utc>0?Ze(new Date(e.published_utc)):"";return(0,r.jsxs)(ze,{children:[e.icon&&(0,r.jsx)("img",{src:e.icon,alt:""}),(0,r.jsxs)("div",{children:[(0,r.jsx)("h3",{children:e.title}),t&&(0,r.jsx)("time",{children:t}),(0,r.jsx)("div",{className:"md-body",dangerouslySetInnerHTML:{__html:L(e.body_markdown,!0)}})]})]})}function Pe({messages:e}){return e?e.length?(0,r.jsx)(r.Fragment,{children:e.map((e=>(0,r.jsx)(He,{message:e},e.id)))}):(0,r.jsx)(qe,{children:"Nothing here yet."}):null}function Fe(){return(0,r.jsx)(r.Fragment,{children:[{version:"0.0.5.38",date:"2026/11/23",notes:["removes scans, which Reddit no longer supports; a news page lists announcements and versions"]},{version:"0.0.5.37",date:"2026/11/17",notes:["removal checks no longer pause when reddit shows your profile in a different layout"]},{version:"0.0.5.36",date:"2026/11/15",notes:["removals of your older posts and comments are checked again, no second account needed"]},{version:"0.0.5.35",date:"2026/11/12",notes:["while reddit refuses your profile's pages, the extension asks for them again every half hour instead of at every check, and the warning about your older posts and comments offers a second account"]},{version:"0.0.5.34",date:"2026/11/10",notes:["the popup gives a newly opened www.reddit.com tab a few checks before it suggests a second account, and clears its warning once checks work again"]},{version:"0.0.5.33",date:"2026/11/09",notes:["less work on reddit pages, which slowed some browsers down with several reddit tabs open; the copied log now shows each hour's work"]},{version:"0.0.5.32",date:"2026/11/08",notes:["a clearer popup; checks pause while a second account signs in; fixes for stalled checks and for follows and seen marks that could be lost"]},{version:"0.0.5.31",date:"2026/11/06",notes:["scans for removed comments work again while signed in to reddit, gently by default, with their pace in options; the removed post note is back on new reddit, and subscribing is back as a bell"]},{version:"0.0.5.30",date:"2026/10/31",notes:["a way to keep checks working if reddit starts asking for a login; report a problem from the popup"]},{version:"0.0.5.29",date:"2026/10/29",notes:["fix repeated removal alerts when saved data fills up; NSFW and profile posts checked correctly"]},{version:"0.0.5.28",date:"2026/10/25",notes:["fix false removal alerts on posts mentioning removal; checks work for profiles with hidden comments"]},{version:"0.0.5.27",date:"2026/10/24",notes:["removal checks recover on their own when reddit refuses some requests; safer reveddit.com connection"]},{version:"0.0.5.26",date:"2026/10/21",notes:["fix removal checks reddit began refusing; future changes like it are handled without an update"]},{version:"0.0.5.25",date:"2026/10/17",notes:["fix false and missed removal alerts; Chrome and Edge get new versions sooner"]},{version:"0.0.5.24",date:"2026/10/17",notes:["fix reveddit.com and removal checks after reddit began blocking logged-out requests"]},{version:"0.0.5.23",date:"2026/09/11",notes:["fix silent failed checks and the check interval resetting to one minute"]},{version:"0.0.5.22",date:"2026/09/03",notes:["restore removal detection after reddit changes on August 31; fix failing to connect"]},{version:"0.0.5.21",date:"2026/08/29",notes:["reveddit.com can now fetch public reddit data through the extension over a typed, allowlisted bridge; it covers what the website's own fallback cannot serve and keeps the site working for extension users if reddit blocks it further; bridge requests always yield to your own monitoring, run through the same rate limiter, and share its backoff"]},{version:"0.0.5.20",date:"2026/08/27",notes:["alert in the popup when a newer version has been out for days but your browser has not installed it, with a link to reveddit.com/update-help; apply a downloaded update immediately instead of waiting; news messages can target specific versions; the diagnostic log header now records news-fetch state"]},{version:"0.0.5.19",date:"2026/08/24",notes:['fix notification settings being ignored for notices about older removed/locked content, so the toolbar badge can count removals without any notifications; clarify the options page with per-type "off / badge only / badge + notifications" pickers and a "turn off all notifications" link; the test notification now says when some notification types are off']},{version:"0.0.5.18",date:"2026/08/18",notes:["fix duplicate backlog notification: the 12-hour follow-up re-announced the same older removed/locked items covered right after install; it now reports only items found since then, and backlog entries in the notification log include item IDs"]},{version:"0.0.5.17",date:"2026/08/17",notes:["check comment removals through reddit's own comment-loading route, which can stay readable when reddit walls off regular page checks; pause scans while reddit is rate limiting so monitoring recovers first; skip overlapping checks; name the exact block page in the diagnostic log"]},{version:"0.0.5.16",date:"2026/08/14",notes:["keep detection working when Reddit blocks the extension's background checks: check through an open reddit tab even after extension updates, pace retries of unreadable pages, show a warning when removal checks stay blocked, and record why a check failed in the diagnostic log"]},{version:"0.0.5.15",date:"2026/08/07",notes:['add a copyable diagnostic log in options ("check now" + "copy log"); improve detection reliability when Reddit rate-limits or challenges the extension']},{version:"0.0.5.14",date:"2026/07/26",notes:['fix false and repeated "mod removed" alerts for content that was not actually removed']},{version:"0.0.5.13",date:"2026/07/12",notes:["fix a bug where removal notifications could be delayed by up to an hour"]},{version:"0.0.5.12",date:"2026/06/09",notes:["improve scan button wording; show rate-limit backoff countdown in popup"]},{version:"0.0.5.11",date:"2026/06/02",notes:["fix subscribe-rev button duplicating on comments; add scan and filter buttons on new reddit threads"]},{version:"0.0.5.10",date:"2026/06/01",notes:["mark logged-in user's known removed comments in thread view"]},{version:"0.0.5.9",date:"2026/06/01",notes:["fix per-comment restore; batch search with progress; cross-check all removed comments; reduce wasted requests"]},{version:"0.0.5.8",date:"2026/06/01",notes:["restore removed comments within threads; flag your removed/locked content on your own profile; hide scan button on own profile"]},{version:"0.0.5.7",date:"2026/05/30",notes:["show removed content on reddit profiles; fix rate-limit lockouts and stuck scanning"]},{version:"0.0.5.6",date:"2026/05/17",notes:["duplicate notification fix + add notification log"]},{version:"0.0.5.5",date:"2026/05/16",notes:["batch old content notifications"]},{version:"0.0.5.4",date:"2026/05/13",notes:["fix duplicate notifications regression for removed posts"]},{version:"0.0.5.3",date:"2026/05/10",notes:["improve delayed post removal notifications with batching, age context, and progress UI"]},{version:"0.0.5.2",date:"2026/04/12",notes:["notification of rate limiting"]},{version:"0.0.5.1",date:"2026/04/12",notes:["open history page on install instead of reveddit.com user page"]},{version:"0.0.5.0",date:"2026/04/11",notes:["new ui to match reveddit.com"]},{version:"0.0.4.0",date:"2026/03/09",notes:["fix periodic false flagging of unremoved posts as removed"]},{version:"0.0.3.9",date:"2026/01/25",notes:["filter out alerts for content older than the most recent 100 items"]},{version:"0.0.3.8",date:"2026/01/19",notes:["fix status check for posts"]},{version:"0.0.3.7",date:"2026/01/16",notes:["enhance request handling and error recovery"]},{version:"0.0.3.6",date:"2025/10/06",notes:["better comment links when post id was not saved"]},{version:"0.0.3.5",date:"2025/10/05",notes:["history link fallback to rendered api/info"]},{version:"0.0.3.4",date:"2025/10/05",notes:["history entries now link to relevant comment or post"]},{version:"0.0.3.3",date:"2025/10/04",notes:["fix excessive /me queries"]},{version:"0.0.3.2",date:"2025/09/21",notes:["lookup content from logged-in profile"]},{version:"0.0.3.1",date:"2024/12/28",notes:['display removal notices on new "sh" Reddit']},{version:"0.0.3.0",date:"2023/07/15",notes:["stop using shared ID for oauth in accordance with recent Reddit API changes"]},{version:"0.0.2.9",date:"2023/03/03",notes:["auto-subscribe to current user if not subscribed and never unsubscribed"]},{version:"0.0.2.8",date:"2023/03/01",notes:["add Reveddit links for removed comments on new Reddit redesign"]},{version:"0.0.2.7",date:"2023/02/20",notes:["notify about Reddit removals indicated by removal_reason field"]},{version:"0.0.2.6",date:"2023/02/16",notes:["bug fix: post removal note was appearing on comment-link pages of unremoved posts"]},{version:"0.0.2.5",date:"2023/02/14",notes:["fix notifications for browsers set to use a non-english language"]},{version:"0.0.2.4",date:"2023/02/14",notes:["fix missing removal notice for 4+ year old posts on new Reddit redesign"]},{version:"0.0.2.3",date:"2023/02/12",notes:["fix repeat notifications, approved status must be repeatedly observed consecutively before notification"]},{version:"0.0.2.2",date:"2023/01/21",notes:["fix an incorrectly named function that may have introduced errors for long-time users with logs of over 500 removed items"]},{version:"0.0.2.1",date:"2023/01/11",notes:['add option to avoid repeat notifications, "same-status count before alert"']},{version:"0.0.2.0",date:"2022/10/28",notes:["fix issue where notifications were only happening once per hour due to a newly imposed cache"]},{version:"0.0.1.9",date:"2022/05/22",notes:["make it more clear that post removal notices are created by this extension, not the website"]},{version:"0.0.1.8",date:"2021/07/09",notes:["remove comment ID from link to new reddit in extension's removal notices on old reddit. New reddit does not show post removal notices when viewing a link to a comment"]},{version:"0.0.1.7",date:"2021/05/28",notes:["fix issue that appeared to cause occasional logouts","made monitoring quarantined content optional"]},{version:"0.0.1.6",date:"2021/02/26",notes:["add option to hide subscribe button","using manifest v3"]},{version:"0.0.1.5",date:"2021/01/09",notes:["only add quarantine cookie for reveddit.com requests"]},{version:"0.0.1.4",date:"2021/01/03",notes:["update to work with new reveddit website paths"]},{version:"0.0.1.3",date:"2020/11/01",notes:["prepare for manifest v3"]},{version:"0.0.1.2",date:"2020/04/19",notes:["fixes the old.reddit.com removal notice on posts for deleted/removed crossposts"]},{version:"0.0.1.1",date:"2020/04/19",notes:["updates the notice that appears on deleted posts on old.reddit.com to handle html/css changes"]},{version:"0.0.1.0",date:"2019/12/11",notes:["initial release"]}].map((e=>(0,r.jsx)(ze,{children:(0,r.jsxs)("div",{children:[(0,r.jsxs)("h3",{children:["v",e.version]}),(0,r.jsx)("time",{children:Ze(new Date(`${e.date.replace(/\//g,"-")}T12:00:00`))}),(0,r.jsx)("ul",{children:e.notes.map(((e,t)=>(0,r.jsx)("li",{children:e},t)))})]})},e.version)))})}!function(e){(0,a.createRoot)(document.getElementById("root")).render((0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(b,{}),(0,r.jsx)(e,{})]}))}((function(){const[e,t]=(0,o.useState)("#versions"===window.location.hash?"versions":"apps"),[n,s]=(0,o.useState)(null);return(0,o.useEffect)((()=>{Le().then((e=>{e.length&&s(e)})).then((()=>Me())).finally((()=>Le().then(s)))}),[]),(0,r.jsxs)(w,{children:[(0,r.jsx)(Be,{children:"News"}),(0,r.jsx)(Re,{role:"tablist",children:De.map((({id:n,label:o})=>(0,r.jsx)(Ne,{role:"tab","aria-selected":e===n,$active:e===n,onClick:()=>t(n),children:o},n)))}),(0,r.jsx)("div",{role:"tabpanel",children:"apps"===e?(0,r.jsx)(Pe,{messages:n}):(0,r.jsx)(Fe,{})})]})}))}},o={};function s(e){var t=o[e];if(void 0!==t)return t.exports;var n=o[e]={exports:{}};return r[e].call(n.exports,n,n.exports,s),n.exports}s.m=r,e=[],s.O=(t,n,r,o)=>{if(!n){var a=1/0;for(d=0;d<e.length;d++){for(var[n,r,o]=e[d],i=!0,l=0;l<n.length;l++)(!1&o||a>=o)&&Object.keys(s.O).every((e=>s.O[e](n[l])))?n.splice(l--,1):(i=!1,o<a&&(a=o));if(i){e.splice(d--,1);var c=r();void 0!==c&&(t=c)}}return t}o=o||0;for(var d=e.length;d>0&&e[d-1][2]>o;d--)e[d]=e[d-1];e[d]=[n,r,o]},s.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return s.d(t,{a:t}),t},n=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,s.t=function(e,r){if(1&r&&(e=this(e)),8&r)return e;if("object"==typeof e&&e){if(4&r&&e.__esModule)return e;if(16&r&&"function"==typeof e.then)return e}var o=Object.create(null);s.r(o);var a={};t=t||[null,n({}),n([]),n(n)];for(var i=2&r&&e;"object"==typeof i&&!~t.indexOf(i);i=n(i))Object.getOwnPropertyNames(i).forEach((t=>a[t]=()=>e[t]));return a.default=()=>e,s.d(o,a),o},s.d=(e,t)=>{for(var n in t)s.o(t,n)&&!s.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:t[n]})},s.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),s.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},(()=>{var e={921:0};s.O.j=t=>0===e[t];var t=(t,n)=>{var r,o,[a,i,l]=n,c=0;if(a.some((t=>0!==e[t]))){for(r in i)s.o(i,r)&&(s.m[r]=i[r]);if(l)var d=l(s)}for(t&&t(n);c<a.length;c++)o=a[c],s.o(e,o)&&e[o]&&e[o][0](),e[o]=0;return s.O(d)},n=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];n.forEach(t.bind(null,0)),n.push=t.bind(null,n.push.bind(n))})();var a=s.O(void 0,[736],(()=>s(411)));a=s.O(a)})();