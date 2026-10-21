(()=>{"use strict";var e,t,r,o={1005:(e,t,r)=>{r.d(t,{kX:()=>a});const o={tokenFields:["jsc_token","token"],solutionRegex:'await\\(async e=>e\\+e\\)\\("([^"]*)"\\)'};let n={...o};const a=()=>n},9947:(e,t,r)=>{r(7785)},4007:(e,t,r)=>{r.d(t,{Sq:()=>k});var o=r(3150),n=r.n(o);const a=new Set(["cycle","auth","feed","ratelimit","news","ui"]),i="diag_log_v1",s="diag_summary_v2",d=36e5;let c=[],l=!1,u=[];const m=new Set;let h=!1,g=null;const b=e=>Math.floor(e/d),p=e=>`${s}_${b(e)}`,f=e=>{const t=[],r=b(e)-36+1;for(let e=r-24;e<r;e++)t.push(`${s}_${e}`);return t},v=(e,t)=>{const r=(b(t)-36+1)*d;let o=e.filter((e=>e.t>=r));return o.length>12e3&&(o=o.slice(o.length-12e3)),o},x=e=>((e,t,r)=>{let o=e.length>t?e.slice(e.length-t):e;for(;o.length>1&&JSON.stringify(o).length>r;)o=o.slice(Math.max(1,Math.floor(o.length/10)));return o})(e,600,131072),y=()=>{h&&!g&&(g=setTimeout((()=>{g=null,(()=>{const e=Date.now(),t={};if(l&&(t[i]=c,l=!1),m.size){const e={};for(const t of u){const r=p(t.t);m.has(r)&&(e[r]=e[r]||[]).push(t)}for(const r of m)t[r]=e[r]||[];m.clear()}const r=[];Object.keys(t).length&&r.push(n().storage.local.set(t)),r.push(n().storage.local.remove(f(e))),Promise.all(r).then((()=>{})).catch((()=>{}))})()}),2e3))},w=(e,t,r,o)=>{void 0===o?console.log(r):console.log(r,o);const n={t:Date.now(),a:t,m:r};if(void 0!==o)try{const e="string"==typeof o?o:JSON.stringify(o);n.d=e.length>500?e.slice(0,500)+"…":e}catch{n.d=String(o)}"summary"===e?(u.push(n),u=v(u,n.t),m.add(p(n.t))):(c.push(n),c=x(c),l=!0),y()},k=(e,t,r)=>w(a.has(e)?"summary":"detail",e,t,r)},5302:(e,t,r)=>{r.d(t,{Hg:()=>d,Mh:()=>l,an:()=>i,kh:()=>c,un:()=>a});r(4007),r(1005);const o="news_cache",n=["www.reddit.com","old.reddit.com"],a="www.reddit.com",i="meJsonChallengeSolve",s=()=>new Promise((e=>{try{chrome.storage.local.get([o],(t=>{e(t&&t[o]||null)}))}catch{e(null)}})),d=async e=>{const t=await s(),r=t?.feed?.options?.mechanisms?.[e];return"on"===r||"off"===r?r:"auto"},c=async()=>{const e=await s(),t=e?.feed?.options?.legacy_host;return n.includes(t||"")?t:a},l=(e,t,r)=>null!==e?e:"off"===t||"on"!==t&&r},2811:(e,t,r)=>{r.d(t,{F_:()=>n,Sd:()=>c,iN:()=>s,kv:()=>d,m1:()=>a,qk:()=>i});var o=r(5302);const n=async e=>{const t=e.getReader();for(;!(await t.read()).done;);},a=(e,t)=>e+t+(t.includes("?")?"&":"?")+"rv_legacy=1",i=async()=>{try{return"https://"+await(0,o.kh)()}catch{return"https://"+o.un}},s={headers:{"Accept-Language":"en",Cookie:"over18=1;","User-Agent":"extension"},cache:"reload"},d=async(e,t={},r=15e3)=>{const o=new AbortController,n=setTimeout((()=>o.abort()),r);try{return await fetch(e,{...t,signal:o.signal})}finally{clearTimeout(n)}};class c{constructor(e){this.errors={},this.url=e}addError(e){this.errors[e]=(this.errors[e]||0)+1}printErrors(){for(const[e,t]of Object.entries(this.errors))t&&console.error("ERROR:","["+e+"]",t,"times on",this.url)}}},7163:(e,t,r)=>{r.d(t,{Gi:()=>q,sT:()=>A});var o=r(2811),n=r(1763),a=r(36),i=r(8145);const s=new a.Z,d=new n.aw,c=e=>s.turndown(d.parseFromString(e,"text/html"));s.addRule("listItem",{filter:"li",replacement:function(e,t,r){e=e.replace(/^\n+/,"").replace(/\n+$/,"\n").replace(/\n/gm,"\n    ");let o=r.bulletListMarker+" ";const n=t.parentNode;if("OL"===n.nodeName){const e=n.getAttribute("start"),r=Array.prototype.indexOf.call(n.children,t);o=(e?Number(e)+r:r+1)+". "}return o+e+(t.nextSibling&&!/\n$/.test(e)?"\n":"")}});class l{constructor(e,t,r){this.field=e,this.attribute=t,this.func=r}}const u=[new l("name","data-fullname"),new l("subreddit","data-subreddit"),new l("author_fullname","data-author-fullname"),new l("author","data-author"),new l("permalink","data-permalink"),new l("subreddit_id","data-subreddit-fullname"),new l("created_utc","data-timestamp",(e=>Number(e)/1e3)),new l("url","data-url"),new l("domain","data-domain"),new l("num_comments","data-comments-count",Number),new l("num_crossposts","data-num-crossposts",Number),new l("score","data-score",Number)],m="https://www.reddit.com",h=e=>new RegExp("(^|\\s)"+e+"($|\\s)"),g=h("controversial"),b=h("stickied"),p=h("sticky-pinned"),f=(h("locked"),{removal_reason:null,quarantine:!1,score:1,locked:!1,distinguished:null,stickied:!1}),v={...f},x={...f,link_flair_text:null,author_flair_text:null,pinned:!1,removed_by_category:null,is_robot_indexable:!0},y={locked:h("locked")},w=e=>"t1"===e.substr(0,2),k=e=>"t3"===e.substr(0,2);class _ extends o.Sd{constructor(e){super(e),this.items=[],this.ids_set=new Set,this.quarantined_subs=new Set,this.url=e}element(e){const t={};for(const r of u){let o=e.getAttribute(r.attribute);null!==o&&(r.func&&(o=r.func(o)),t[r.field]=o)}const r=e.getAttribute("class");for(const[e,o]of Object.entries(y))t[e]=!!r.match(o);if(!t.name&&t.permalink){const e=t.permalink.split("/").filter(Boolean);e.length>=5&&"comments"===e[2]&&(e.length>=6?t.name="t1_"+e[5]:t.name="t3_"+e[3])}if(t.name){if(t.id=t.name.replace(/^t[0-9]_/,""),w(t.name)){if(t.permalink){const e=t.permalink.split("/");t.link_id="t3_"+e[4],t.link_permalink=m+e.slice(0,6).join("/")+"/"}else this.addError("permalink_undefined");t.stickied=!!r.match(b),r.match(g)?t.controversiality=1:t.controversiality=0}else t.pinned=!!r.match(p);this.items.push(t),this.ids_set.add(t.name)}else this.addError("name_undefined")}addQuarantinedSub(e){this.quarantined_subs.add(e)}fillInDefaultValues(){for(const e of this.items){if(!e.name)continue;let t;if(w(e.name)?t=v:k(e.name)&&(t=x),t)for(const[r,o]of Object.entries(t))r in e||(e[r]=o)}}}class ${constructor(e){this.itemsObj=e,this.items=e.items,this.last={}}element(e){if(this.items.length){const e=this.items[this.items.length-1];e?this.last=e:this.itemsObj.addError("last_undefined")}}}class j extends ${constructor(e,t,r){super(e),this.field_name=t,this.value=r}element(e,t=this.value){super.element(e),this.last[this.field_name]=t}}class O extends ${constructor(e,t){super(e),this.field_name=t}element(e){super.element(e),this.last[this.field_name]||(this.last[this.field_name]="");const t=[...e.attributes].map((([e,t])=>` ${e}="${t}"`)).join("");if(this.last[this.field_name]+=`<${e.tagName}${t}>`,"br"!==e.tagName)try{e.onEndTag((e=>{this.last[this.field_name]+=`</${e.name}>`}))}catch{this.itemsObj.addError("NO_END_TAG_"+e.tagName)}}text({text:e}){this.last[this.field_name]+=e}}class S extends ${constructor(e){super(e)}element(e){super.element(e),this.last.author="[deleted]"}}class R extends j{constructor(e){super(e,"score")}element(e){super.element(e,Number(e.getAttribute("title")))}}const Z=h("live-timestamp"),T=h("edited-timestamp");class E extends ${element(e){super.element(e);const t=e.getAttribute("class");let r;if(t.match(Z)?r="created_utc":t.match(T)&&(r="edited"),r){const t=(o=e.getAttribute("datetime"),new Date(o).getTime()/1e3);t&&(this.last[r]=t)}var o}}class z extends o.Sd{constructor(e){super(e),this.is_removed=!1}element(e){this.is_removed=!0}}class C extends o.Sd{constructor(e){super(e),this.count=0}element(e){this.count++}}class M extends o.Sd{constructor(e){super(e),this.author=""}text({text:e}){this.author+=e.trim()}}class N extends o.Sd{constructor(){super(...arguments),this.count=0}element(e){this.count++}}const A=async(e,t=null)=>{const r=Array.isArray(e)?e:e.split(","),n=r.filter((e=>e.startsWith("t3_")));n.length>0&&t&&t(n);const{items:a}=await(async e=>{const t=Array.isArray(e)?e:e.split(","),r=await(0,o.qk)()+"/api/info?id="+t.join(","),n=await fetch(r,{...o.iN,credentials:"omit"});if(!n.ok)throw new Error(`legacy reddit HTML request failed: ${n.status}`);const a=new _(r),s=new N(r),d=(new i.G).on("#siteTable",s).on("#siteTable .thing",a).on("#siteTable .thing.deleted",new S(a)).on("#siteTable .thing .entry .usertext-body .md *",new O(a,"body")).on("#siteTable .thing .tagline .score.unvoted",new R(a)).on("#siteTable .thing .tagline time",new E(a)).on("#siteTable .thing .tagline .locked-tagline",new j(a,"locked",!0));return await(0,o.F_)(d.transform(n).body),a.fillInDefaultValues(),a.items.forEach((e=>{e.body&&(e.body_html=e.body,e.body=c(e.body))})),{valid:s.count>0,items:a.items}})(r);return a.filter((e=>!e.name||!e.name.startsWith("t3_"))).map((e=>({data:e})))},q=async e=>{const t=(0,o.m1)(await(0,o.qk)(),e),r=await(0,o.kv)(t,o.iN);if(!r.ok)return{error:"request failed"};const n=new z(t),a=new M(t),s=new C(t),d=(new i.G).on('meta[name="robots"][content="noindex,nofollow"]',n).on("#siteTable .thing .tagline span",a).on("#siteTable .thing",s);return await(0,o.F_)(d.transform(r).body),0===s.count?{error:"unrecognized page (no thread things)"}:{is_removed:n.is_removed,...a.author&&{author:a.author}}}},9217:(e,t,r)=>{r.d(t,{G5:()=>g});r(7785);var o=r(3150),n=r.n(o),a=r(4007),i=r(7163),s=(r(2811),r(1005));const d=/js_challenge/,c=(e,t)=>{if(!d.test(e))return null;const r=(0,s.kX)(),o=(()=>{try{return e.match(new RegExp(r.solutionRegex))}catch{return null}})();if(!o||void 0===o[1])return null;const n=t=>{const r=e.match(new RegExp(`<input[^>]*\\bname="${t}"[^>]*\\bvalue="([^"]*)"`));return r?r[1]:null};let a=null,i=null;for(const e of r.tokenFields)if(i=n(e),null!==i){a=e;break}if(null===a||null===i)return null;const c=o[1]+o[1],l=t.includes("?")?"&":"?";let u=`${t}${l}solution=${encodeURIComponent(c)}&js_challenge=1&${a}=${encodeURIComponent(i)}`;const m=n("jsc_orig_r");return null!==m&&(u+=`&jsc_orig_r=${encodeURIComponent(m)}`),u};r(9947);var l=r(5302);new Set([429]);i.sT,i.Gi;const u="dev_disable_me_challenge_solve",m=async e=>{let t,r;try{t=await fetch(e,{credentials:"include",cache:"reload"})}catch(e){return{state:"indeterminate",reason:`network error: ${String(e?.message||e)}`}}if(!t.ok)return{state:"indeterminate",reason:`status ${t.status}`};try{r=await t.text()}catch(e){return{state:"indeterminate",reason:`body read failed: ${String(e?.message||e)}`}}try{const e=JSON.parse(r),t=e?.data?.name;return t?{state:"user",user:String(t)}:{state:"loggedOut"}}catch{return{state:"indeterminate",reason:"non-JSON response (challenge or HTML page)",html:r}}},h=async e=>{const t=`https://${e}/api/me.json`;let r=await m(t);if("indeterminate"===r.state&&r.html&&!await n().storage.local.get({[u]:null}).then((async e=>{const t=e[u],r=await(0,l.Hg)(l.an);return(0,l.Mh)(null===t?null:!!t,r,!1)})).catch((()=>!1))){const o=c(r.html,t);o&&((0,a.Sq)("auth",`[reveddit] me.json challenge detected on ${e} — retrying with solution`),r=await m(o))}return"indeterminate"===r.state&&(0,a.Sq)("auth",`getLoggedinUser direct fetch failed (${t}): ${r.reason}`),r},g=async()=>{if(("undefined"==typeof chrome||!chrome.tabs||"function"!=typeof chrome.tabs.query)&&"undefined"!=typeof window&&window.location&&window.location.hostname){const e=await m(`https://${window.location.hostname}/api/me.json`);return"user"===e.state?{user:e.user,indeterminate:!1}:{user:null,indeterminate:"indeterminate"===e.state,reason:"indeterminate"===e.state?e.reason:void 0}}const e=await new Promise((e=>{try{chrome.tabs.query({url:["*://old.reddit.com/*"]},(t=>{e(t&&t.length>0?"old.reddit.com":"www.reddit.com")}))}catch{e("www.reddit.com")}}));let t=await h(e);if("user"===t.state)return{user:t.user,indeterminate:!1};let r="loggedOut"===t.state,o="indeterminate"===t.state?t.reason:void 0;if("indeterminate"===t.state){const n="www.reddit.com"===e?"old.reddit.com":"www.reddit.com";if(t=await h(n),"user"===t.state)return{user:t.user,indeterminate:!1};r=r||"loggedOut"===t.state,o="indeterminate"===t.state?t.reason:o}if(!r){if(await b()){if(t=await h(e),"user"===t.state)return{user:t.user,indeterminate:!1};"indeterminate"===t.state&&((0,a.Sq)("auth","Failed to authenticate with stored cookies"),o=t.reason),r=r||"loggedOut"===t.state}}return r?{user:null,indeterminate:!1}:{user:null,indeterminate:!0,reason:o||"unknown"}},b=()=>new Promise((e=>{chrome.storage.local.get(["stored_reddit_cookie_objects"],(t=>{const r=t.stored_reddit_cookie_objects;Array.isArray(r)&&r.length?Promise.all(r.map((e=>n().cookies.set(e).catch((()=>null))))).then((()=>e(!0))).catch((()=>e(!1))):e(!1)}))}))},7785:(e,t,r)=>{r.d(t,{CU:()=>s});r(9947),r(3150);const o={changes:[],removed:{},approved:{},locked:{},unlocked:{}},n=(e,t,r)=>r?e+"_u_"+t:e+"_"+t,a=(e,t,r=!0)=>{Object.keys(o).forEach((a=>{e[n(a,t,r)]=o[a]}))},i=e=>{const t={};return a(t,e,!0),t},s=(e,t=(()=>{}),r=(()=>{}))=>{const o=i(e);chrome.storage.sync.get("user_subscriptions",(n=>{const a=n.user_subscriptions;e in a?r("already subscribed to this user"):Object.keys(a).length<5?(a[e]=!0,chrome.storage.sync.set({user_subscriptions:a,...o},t)):r("maximum number of subscriptions reached")}))}},8396:(e,t,r)=>{var o=r(5893),n=r(7294),a=r(745),i=r(3867),s=r(7785),d=r(9217),c=r(917);const l={sm:"4px",md:"6px",lg:"8px",pill:"999px"},u={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px"},m={body:'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},h=c.iv`
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
`,g=c.iv`
    html,
    body {
        margin: 0;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family: ${m.body};
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
`,b=c.iv`
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
        font-family: ${m.mono};
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
`,p="ui_theme";function f(e){const t="auto"===e?window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark":e;document.documentElement.setAttribute("data-theme",t)}function v(){return(0,n.useEffect)((()=>{try{chrome.storage.local.get([p],(e=>{f(e?.[p]||"auto")}))}catch{f("auto")}const e=window.matchMedia?.("(prefers-color-scheme: light)"),t=()=>{try{chrome.storage.local.get([p],(e=>{"auto"===(e?.[p]||"auto")&&f("auto")}))}catch(e){}};e?.addEventListener?.("change",t);const r=(e,t)=>{"local"===t&&e[p]&&f(e[p].newValue||"auto")};return chrome.storage.onChanged.addListener(r),()=>{e?.removeEventListener?.("change",t),chrome.storage.onChanged.removeListener(r)}}),[]),(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(c.xB,{styles:h}),(0,o.jsx)(c.xB,{styles:g}),(0,o.jsx)(c.xB,{styles:b})]})}const x=i.Z.a`
    color: var(--link);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,y=(i.Z.a`
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
`,i.Z.button`
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
`),w=(i.Z.div`
    padding: 10px 12px;
    margin: 6px 0;
    border-radius: ${l.md};
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
`,i.Z.span`
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
    border-radius: ${l.lg};
    padding: ${u.md} ${u.lg};
    margin-bottom: ${u.md};
    transition: border-color 0.15s ease;
    &:hover {
        border-color: var(--border-light);
    }
`),k=(i.Z.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${u.sm};
    margin-bottom: ${u.xs};
`,i.Z.div`
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
`,i.Z.div`
    color: var(--text-primary);
    font-size: 0.95em;
`,i.Z.div`
    display: flex;
    gap: ${u.sm};
    margin-top: ${u.sm};
    padding-top: ${u.sm};
    border-top: 1px solid var(--border);
`,i.Z.span`
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
`,i.Z.h2`
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin: ${u.lg} 0 ${u.sm} 0;
    padding-bottom: ${u.xs};
    border-bottom: 1px solid var(--border);
`,i.Z.label`
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
    margin: ${u.xs} 0 ${u.sm} 0;
    color: var(--text-primary);
`,i.Z.div`
    font-size: 0.95em;
`,i.Z.div`
  max-width: 560px;
  margin: 0 auto;
  padding: ${u.xl} ${u.lg};
`),_=i.Z.div`
  text-align: center;
  margin-bottom: ${u.lg};
`,$=i.Z.img`
  width: 72px;
  height: 72px;
  margin-bottom: ${u.sm};
`,j=i.Z.h1`
  margin: 0 0 ${u.xs} 0;
  font-size: 1.8em;
`,O=i.Z.p`
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.5;
`,S=(0,i.Z)(w)`
  text-align: center;
`,R=i.Z.div`
  font-size: 1.05em;
  color: ${e=>"success"===e.statusType?"var(--approved-border)":"error"===e.statusType?"var(--accent)":"var(--text-secondary)"};
`,Z=(0,i.Z)(w)`
  & h2 {
    font-size: 1.1em;
    margin: 0 0 ${u.sm} 0;
  }
  & ol {
    margin: 0;
    padding-left: 1.4em;
    line-height: 1.8;
    color: var(--text-primary);
  }
  & li { margin: ${u.xs} 0; }
`,T=i.Z.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${u.sm};
  margin: ${u.lg} 0;
`,E=i.Z.div`
  text-align: center;
  margin-top: ${u.lg};
  padding-top: ${u.md};
  border-top: 1px solid var(--border);
`;(0,a.createRoot)(document.getElementById("root")).render((0,o.jsx)((function(){const[e,t]=(0,n.useState)("Checking Reddit connection..."),[r,a]=(0,n.useState)("checking"),[i,c]=(0,n.useState)(!1),[l,u]=(0,n.useState)(!1),m=(0,n.useRef)(!1),h=(0,n.useRef)(0),g=(0,n.useRef)(null),b=(0,n.useCallback)(((e=!1)=>{m.current||l||(m.current=!0,h.current+=1,e&&(t("Checking Reddit connection..."),a("checking")),(0,d.G5)().then((e=>{const r=e.user;if(m.current=!1,r){u(!0),t(`Connected as ${r}! Redirecting...`),a("success"),c(!1),null!==g.current&&(window.clearInterval(g.current),g.current=null);const e=()=>{setTimeout((()=>{window.location.href=chrome.runtime.getURL("src/history.html?welcome=1")}),1e3)};(0,s.CU)(r,(()=>{try{chrome.runtime.sendMessage({action:"immediate-user-lookup",user:r})}catch(e){console.log("immediate-user-lookup send failed:",e)}e()}),e)}else e.indeterminate?t(`Reddit isn't answering the login check right now${e.reason?` (${e.reason})`:""}. If you're already signed in, open www.reddit.com in a tab and try again. There's no need to sign in again.`):1===h.current?t("We couldn't detect your Reddit session yet. If you're already signed in, open a Reddit tab so the extension can read your session. Otherwise, sign in to Reddit below."):t("Waiting for Reddit session… (we'll detect it automatically)"),a("error"),c(!0)})).catch((e=>{m.current=!1,console.log("Error checking connection:",e),t("Waiting for Reddit session… (we'll detect it automatically)"),a("error"),c(!0)})))}),[l]);return(0,n.useEffect)((()=>{b();const e=Date.now();return g.current=window.setInterval((()=>{if(l)return void(null!==g.current&&(window.clearInterval(g.current),g.current=null));const t=Date.now()-e;5e3==(t<6e4?2e3:5e3)&&Math.floor(t/2e3)%2!=0||b()}),2e3),()=>{null!==g.current&&(window.clearInterval(g.current),g.current=null)}}),[b,l]),(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(v,{}),(0,o.jsxs)(k,{children:[(0,o.jsxs)(_,{children:[(0,o.jsx)($,{src:"/icons/128.png",alt:"Reveddit"}),(0,o.jsx)(j,{children:"Welcome to reveddit real-time"}),(0,o.jsx)(O,{children:"This extension monitors your Reddit comments and posts in real time, notifying you when content is removed by moderators."})]}),(0,o.jsx)(S,{children:(0,o.jsx)(R,{statusType:r,children:e})}),i&&(0,o.jsxs)(Z,{children:[(0,o.jsx)("h2",{children:"Getting started"}),(0,o.jsxs)("ol",{children:[(0,o.jsxs)("li",{children:["Open ",(0,o.jsx)(x,{href:"https://www.reddit.com",target:"_blank",rel:"noreferrer",children:"www.reddit.com"})," ","or ",(0,o.jsx)(x,{href:"https://old.reddit.com",target:"_blank",rel:"noreferrer",children:"old.reddit.com"})]}),(0,o.jsx)("li",{children:"Log in to your Reddit account"}),(0,o.jsx)("li",{children:"We'll detect you automatically — no click needed."})]})]}),!l&&(0,o.jsxs)(T,{children:[(0,o.jsx)(y,{variant:"primary",onClick:()=>{try{chrome.tabs.create({url:"https://www.reddit.com"})}catch(e){console.log("chrome.tabs.create failed, falling back to window.open:",e),window.open("https://www.reddit.com","_blank")}},children:"Open Reddit"}),(0,o.jsx)(y,{variant:"ghost",onClick:()=>b(!0),disabled:m.current,children:"Check connection now"})]}),(0,o.jsx)(E,{children:(0,o.jsx)(x,{href:"https://www.reveddit.com/about/faq/",target:"_blank",rel:"noreferrer",children:"Learn more about reveddit"})})]})]})}),{}))}},n={};function a(e){var t=n[e];if(void 0!==t)return t.exports;var r=n[e]={exports:{}};return o[e].call(r.exports,r,r.exports,a),r.exports}a.m=o,e=[],a.O=(t,r,o,n)=>{if(!r){var i=1/0;for(l=0;l<e.length;l++){for(var[r,o,n]=e[l],s=!0,d=0;d<r.length;d++)(!1&n||i>=n)&&Object.keys(a.O).every((e=>a.O[e](r[d])))?r.splice(d--,1):(s=!1,n<i&&(i=n));if(s){e.splice(l--,1);var c=o();void 0!==c&&(t=c)}}return t}n=n||0;for(var l=e.length;l>0&&e[l-1][2]>n;l--)e[l]=e[l-1];e[l]=[r,o,n]},a.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return a.d(t,{a:t}),t},r=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,a.t=function(e,o){if(1&o&&(e=this(e)),8&o)return e;if("object"==typeof e&&e){if(4&o&&e.__esModule)return e;if(16&o&&"function"==typeof e.then)return e}var n=Object.create(null);a.r(n);var i={};t=t||[null,r({}),r([]),r(r)];for(var s=2&o&&e;"object"==typeof s&&!~t.indexOf(s);s=r(s))Object.getOwnPropertyNames(s).forEach((t=>i[t]=()=>e[t]));return i.default=()=>e,a.d(n,i),n},a.d=(e,t)=>{for(var r in t)a.o(t,r)&&!a.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},a.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),a.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},a.j=773,a.p="",(()=>{a.b=document.baseURI||self.location.href;var e={773:0,646:0};a.O.j=t=>0===e[t];var t=(t,r)=>{var o,n,[i,s,d]=r,c=0;if(i.some((t=>0!==e[t]))){for(o in s)a.o(s,o)&&(a.m[o]=s[o]);if(d)var l=d(a)}for(t&&t(r);c<i.length;c++)n=i[c],a.o(e,n)&&e[n]&&e[n][0](),e[n]=0;return a.O(l)},r=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})();var i=a.O(void 0,[736],(()=>a(8396)));i=a.O(i)})();