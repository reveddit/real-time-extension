(()=>{"use strict";var e,t,n,r={1005:(e,t,n)=>{n.d(t,{PY:()=>l,kX:()=>a,ms:()=>i});const r={tokenFields:["jsc_token","token"],solutionRegex:'await\\(async e=>e\\+e\\)\\("([^"]*)"\\)'},s=/^[a-z][a-z0-9_]{0,31}$/;let o={...r};const a=()=>o,i=e=>{const t={};if(e&&"object"==typeof e){if(Array.isArray(e.token_fields)){const n=e.token_fields.filter((e=>"string"==typeof e&&s.test(e)));n.length&&(t.tokenFields=n.slice(0,8))}if("string"==typeof e.solution_regex&&e.solution_regex.length<=200)try{new RegExp(e.solution_regex),/\(/.test(e.solution_regex)&&(t.solutionRegex=e.solution_regex)}catch{}}return t},l=e=>{o={tokenFields:e.tokenFields?.length?e.tokenFields:r.tokenFields,solutionRegex:e.solutionRegex||r.solutionRegex}}},9947:(e,t,n)=>{n.d(t,{C3:()=>h,D4:()=>w,Fm:()=>_,Go:()=>f,LC:()=>u,Me:()=>g,N5:()=>m,NS:()=>a,QT:()=>k,SV:()=>S,Vk:()=>y,jn:()=>o,pB:()=>v,sc:()=>x});var r=n(7785);const s="browserAction",o=e=>{try{chrome[s].setBadgeText({text:"!"}),chrome[s].setBadgeBackgroundColor({color:"#ffcc00"}),e&&chrome.storage.local.set({error_status:e})}catch{}},a=e=>{const t=e.replace(/https:\/\/[^/]*re(ve)?ddit.com/,"");return c(t)},i=/^\/(v|r|user)\/([^/]+)\/comments\/([^/]+)\/[^/]*(?:\/([^/?&#]+))?/,l=/^\/(?:user|y|u)\/([^/?&#]+)\/?/,c=e=>{let t,n,r,s;const o=e.match(i),a=e.match(l);if(o){"user"===o[1]?r=o[2]:s=o[2],o[3]&&(t="t3_"+o[3]),o[4]&&(n="t1_"+o[4])}else a&&(r=a[1]);return[t,n,r,s]},d=e=>e.replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/[^\S\n]+/g," ").substr(0,1e4),u=e=>!!e.removal_reason||(h(e.name)?f(e):p(e)),h=e=>"t1"===e.substr(0,2),f=e=>"["===e.author.replace(/\\/g,"")[0]&&"["===(e.body||"").replace(/\\/g,"")[0],g=e=>h(e.name)?(e=>"[deleted]"===(e.body||"").replace(/\\/g,"")&&"[deleted]"===e.author.replace(/\\/g,""))(e):(e=>!1===e.is_robot_indexable&&"[deleted]"===e.author.replace(/\\/g,""))(e),p=e=>!1===e.is_robot_indexable,m=(e,t,n)=>{const r=b(e,n).slice(0,t),s={};return r.forEach((e=>{s[e[0]]=e[1]})),s},b=(e,t)=>{let n=Object.keys(e).map((t=>[t,e[t]]));return n.sort(((e,n)=>n[1][t]-e[1][t])),n};class v{constructor(e,t,n,r=null){r?(this.c=r.c,this.u=r.u,void 0!==r.p&&(this.p=r.p)):(this.c=e,this.u=t,void 0!==n&&(this.p=n))}getCreatedUTC(){return this.c}getUnseen(){return this.u}getPostID(){return this.p}}class k{constructor({id:e=null,observed_utc:t=null,change_type:n=null,seen_count:r=null,object:s=null}){s?(this.i=s.i,this.o=s.o,this.g=s.g,this.n=s.n):(this.i=e,this.o=t,this.g=n,this.n=r)}getID(){return this.i}getObservedUTC(){return this.o}getChangeTypeInternal(){return this.g}getChangeType(){switch(this.g){case r.U$:return"mod removed";case r.oZ:return"user deleted";case r.Ci:return"approved";case r.nb:return"locked";case r.YU:return"unlocked";case r.WK:return"edited"}}getSeenCount(){return this.n}}class w{constructor({item:e=null,observed_utc:t=null,object:n=null}){if(n)this.t=n.t,this.o=n.o,this.c=n.c,this.n=n.n||0,this.r=n.r||0,void 0!==n.p&&(this.p=n.p),void 0!==n.b&&(this.b=n.b),void 0!==n.s&&(this.s=n.s);else{let n="";e&&h(e.name)?n=d(e.body||""):e&&(n=e.title||""),this.t=n,this.o=t,this.c=e?e.created_utc:0,this.n=0,this.r=0,e&&h(e.name)&&e.link_id&&(this.p=e.link_id),e&&!h(e.name)&&e.selftext&&(this.b=d(e.selftext)),e&&e.subreddit&&(this.s=e.subreddit)}}setText(e){this.t=d(e)}getText(){return this.t}getBody(){return this.b}getSubreddit(){return this.s}getObservedUTC(){return this.o}getCreatedUTC(){return this.c}resetSeenCount(){this.n=0}getSeenCount(){return this.n}getPostID(){return this.p}incrementRemovalCount(){return void 0===this.r&&(this.r=0),this.r+=1,this.r}resetRemovalCount(){this.r=0}getRemovalCount(){return this.r||0}incrementSeenCount(){return void 0===this.n&&(this.n=0),this.n+=1,this.n}}function _(){"undefined"!=typeof navigator&&/Android/i.test(navigator.userAgent)?(chrome.tabs.create({url:chrome.runtime.getURL("src/options.html"),active:!0}),window.close()):chrome.runtime.openOptionsPage?(chrome.runtime.openOptionsPage(),window.close()):window.open(chrome.runtime.getURL("/src/options.html"))}const y=e=>{const t=(0,r.e4)(e),n="If you see this, notifications are working.";return t.removal||t.lock?t.removal?t.lock?n:n+" Note: notifications for locked content are turned off in options.":n+" Note: notifications for removed content are turned off in options.":"If you see this, notifications are working, but notifications for removed and locked content are turned off in options."},x=({notificationId:e,title:t,message:n})=>(console.log(`createNotification called: ${e} - ${t} - ${n}`),new Promise((r=>{if(location.protocol.match(/^http/))console.log("Sending notification via message passing"),chrome.runtime.sendMessage({action:"create-notification",options:{notificationId:e,title:t,message:n}}),r(!0);else{console.log("Creating notification directly with chrome.notifications.create");const s=String(e),o=s.includes("|")?s:`${s}|${Date.now()}`,a={type:"basic",iconUrl:chrome.runtime.getURL("icons/128.png"),title:t,message:n},i=()=>{try{const e=self,r=e&&e.registration?e.registration:null;r&&r.showNotification&&r.showNotification(t,{body:n,icon:chrome.runtime.getURL("icons/128.png"),data:s})}catch(e){console.log("Fallback showNotification failed:",e)}};try{chrome.notifications.create(o,a,(()=>{chrome.runtime?.lastError?(console.log("chrome.notifications.create error:",chrome.runtime.lastError.message),i(),r(!1)):r(!0)}))}catch(e){console.log("Error creating notification:",e),i(),r(!1)}}}))),S=()=>{location.protocol.match(/^http/)?chrome.runtime.sendMessage({action:"update-badge"}).catch((()=>{})):(0,r.Nd)((e=>{let t=0;Object.values(e).forEach((e=>{t+=e.length}));let n=t.toString();0==t&&(n=""),chrome[s].setBadgeBackgroundColor({color:"red"}),chrome[s].setBadgeText({text:n})}))}},4007:(e,t,n)=>{n.d(t,{C1:()=>x,Sq:()=>y});var r=n(3150),s=n.n(r);const o=new Set(["cycle","auth","feed","ratelimit","news","ui"]),a="diag_log_v1",i="diag_summary_v2",l=36e5;let c=[],d=!1,u=[];const h=new Set;let f=!1,g=null;const p=e=>Math.floor(e/l),m=e=>`${i}_${p(e)}`,b=e=>{const t=[],n=p(e)-36+1;for(let e=n-24;e<n;e++)t.push(`${i}_${e}`);return t},v=(e,t)=>{const n=(p(t)-36+1)*l;let r=e.filter((e=>e.t>=n));return r.length>12e3&&(r=r.slice(r.length-12e3)),r},k=e=>((e,t,n)=>{let r=e.length>t?e.slice(e.length-t):e;for(;r.length>1&&JSON.stringify(r).length>n;)r=r.slice(Math.max(1,Math.floor(r.length/10)));return r})(e,600,131072),w=()=>{f&&!g&&(g=setTimeout((()=>{g=null,(()=>{const e=Date.now(),t={};if(d&&(t[a]=c,d=!1),h.size){const e={};for(const t of u){const n=m(t.t);h.has(n)&&(e[n]=e[n]||[]).push(t)}for(const n of h)t[n]=e[n]||[];h.clear()}const n=[];Object.keys(t).length&&n.push(s().storage.local.set(t)),n.push(s().storage.local.remove(b(e))),Promise.all(n).then((()=>{})).catch((()=>{}))})()}),2e3))},_=(e,t,n,r)=>{void 0===r?console.log(n):console.log(n,r);const s={t:Date.now(),a:t,m:n};if(void 0!==r)try{const e="string"==typeof r?r:JSON.stringify(r);s.d=e.length>500?e.slice(0,500)+"…":e}catch{s.d=String(r)}"summary"===e?(u.push(s),u=v(u,s.t),h.add(m(s.t))):(c.push(s),c=k(c),d=!0),w()},y=(e,t,n)=>_(o.has(e)?"summary":"detail",e,t,n),x=(e,t,n)=>_("summary",e,t,n)},5302:(e,t,n)=>{n.d(t,{FZ:()=>v,Hg:()=>k,Hl:()=>u,Mh:()=>_,XO:()=>f,Yy:()=>d,aL:()=>y,fX:()=>b,kh:()=>w,t:()=>c,un:()=>l});var r=n(4007),s=n(1005);const o="news_cache",a="news_read_ids",i=["www.reddit.com","old.reddit.com"],l="www.reddit.com",c="legacyOldReddit",d="absentPageVerification",u="absentUnverifiedIsUnknown",h=()=>new Promise((e=>{try{chrome.storage.local.get([o],(t=>{e(t&&t[o]||null)}))}catch{e(null)}})),f=e=>new Promise((t=>{try{chrome.storage.local.get([a],(n=>{const r=n&&n[a]||{};r[e]=!0,chrome.storage.local.set({[a]:r},(()=>t()))}))}catch{t()}})),g=/^\d+(\.\d+){0,3}$/,p=e=>"string"==typeof e&&g.test(e),m=(e,t)=>{const n=e.split(".").map((e=>parseInt(e,10)||0)),r=t.split(".").map((e=>parseInt(e,10)||0));for(let e=0;e<Math.max(n.length,r.length);e++){const t=(n[e]||0)-(r[e]||0);if(0!==t)return t}return 0},b=async()=>{try{const e=await h(),t=e?.feed,n=chrome.runtime.getManifest().version;if(t&&((e,t,n,r,s=432e6)=>{if(!p(t))return!1;const o=Number(n);return!(!o||!Number.isFinite(o))&&!(m(e,t)>=0)&&r-o>=s})(n,t.latest_version,t.latest_version_published_utc,Date.now()))return t.latest_version}catch{}return null},v=async()=>{const[e,t]=await Promise.all([h(),new Promise((e=>{try{chrome.storage.local.get([a],(t=>{e(t&&t[a]||{})}))}catch{e({})}}))]),n=e?.feed||{messages:[]};let r="";try{r=chrome.runtime.getManifest().version}catch{}const s=r?((e,t)=>e.filter((e=>!(p(e.min_version)&&m(t,e.min_version)<0||p(e.max_version)&&m(t,e.max_version)>0))))(n.messages,r):n.messages;return s.filter((e=>!t[e.id])).sort(((e,t)=>(t.published_utc||0)-(e.published_utc||0)))},k=async e=>{const t=await h(),n=t?.feed?.options?.mechanisms?.[e];return"on"===n||"off"===n?n:"auto"},w=async()=>{const e=await h(),t=e?.feed?.options?.legacy_host;return i.includes(t||"")?t:l},_=(e,t,n)=>null!==e?e:"off"===t||"on"!==t&&n,y=async(e={})=>{const t=await h(),n=Date.now();if(!(!e.force&&t&&n-t.lastFetched<216e5))try{const e=await fetch("https://www.reveddit.com/extension-news.json",{credentials:"omit",cache:"no-cache"});if(!e.ok)return void(0,r.Sq)("news",`[reveddit] news fetch failed: ${e.status}`);const t=await e.json();if(!t||!Array.isArray(t.messages))return;const a={},l=t.options?.mechanisms;if(l&&"object"==typeof l)for(const[e,t]of Object.entries(l))"auto"!==t&&"on"!==t&&"off"!==t||(a[e]=t);const c=(0,s.ms)(t.options?.challenge),d={messages:t.messages.filter((e=>e&&"string"==typeof e.id&&"string"==typeof e.title&&"string"==typeof e.body_markdown)).map((e=>({id:e.id,published_utc:Number(e.published_utc)||0,title:e.title,body_markdown:e.body_markdown,severity:e.severity,...p(e.min_version)?{min_version:e.min_version}:{},...p(e.max_version)?{max_version:e.max_version}:{}}))),options:{mechanisms:a,...i.includes(t.options?.legacy_host)?{legacy_host:t.options.legacy_host}:{},...Object.keys(c).length?{challenge:c}:{}},...p(t.latest_version)?{latest_version:t.latest_version}:{},...Number(t.latest_version_published_utc)>0?{latest_version_published_utc:Number(t.latest_version_published_utc)}:{}},u={feed:d,lastFetched:n};chrome.storage.local.set({[o]:u}),(0,s.PY)(c),(0,r.Sq)("news",`[reveddit] news fetch ok: ${d.messages.length} messages, mechanisms=${JSON.stringify(a)}`)}catch(e){(0,r.Sq)("news",`[reveddit] news fetch error: ${String(e?.message||e)}`)}}},2811:(e,t,n)=>{n.d(t,{F_:()=>s,Sd:()=>d,iN:()=>l,kv:()=>c,m1:()=>a,oG:()=>o,qk:()=>i});var r=n(5302);const s=async e=>{const t=e.getReader();for(;!(await t.read()).done;);},o="https://www.reddit.com",a=(e,t)=>e+t+(t.includes("?")?"&":"?")+"rv_legacy=1",i=async()=>{try{return"https://"+await(0,r.kh)()}catch{return"https://"+r.un}},l={headers:{"Accept-Language":"en",Cookie:"over18=1;","User-Agent":"extension"},cache:"reload"},c=async(e,t={},n=15e3)=>{const r=new AbortController,s=setTimeout((()=>r.abort()),n);try{return await fetch(e,{...t,signal:r.signal})}finally{clearTimeout(s)}};class d{constructor(e){this.errors={},this.url=e}addError(e){this.errors[e]=(this.errors[e]||0)+1}printErrors(){for(const[e,t]of Object.entries(this.errors))t&&console.error("ERROR:","["+e+"]",t,"times on",this.url)}}},7163:(e,t,n)=>{n.d(t,{Gi:()=>R,sT:()=>N});var r=n(2811),s=n(1763),o=n(36),a=n(8145);const i=new o.Z,l=new s.aw,c=e=>i.turndown(l.parseFromString(e,"text/html"));i.addRule("listItem",{filter:"li",replacement:function(e,t,n){e=e.replace(/^\n+/,"").replace(/\n+$/,"\n").replace(/\n/gm,"\n    ");let r=n.bulletListMarker+" ";const s=t.parentNode;if("OL"===s.nodeName){const e=s.getAttribute("start"),n=Array.prototype.indexOf.call(s.children,t);r=(e?Number(e)+n:n+1)+". "}return r+e+(t.nextSibling&&!/\n$/.test(e)?"\n":"")}});class d{constructor(e,t,n){this.field=e,this.attribute=t,this.func=n}}const u=[new d("name","data-fullname"),new d("subreddit","data-subreddit"),new d("author_fullname","data-author-fullname"),new d("author","data-author"),new d("permalink","data-permalink"),new d("subreddit_id","data-subreddit-fullname"),new d("created_utc","data-timestamp",(e=>Number(e)/1e3)),new d("url","data-url"),new d("domain","data-domain"),new d("num_comments","data-comments-count",Number),new d("num_crossposts","data-num-crossposts",Number),new d("score","data-score",Number)],h="https://www.reddit.com",f=e=>new RegExp("(^|\\s)"+e+"($|\\s)"),g=f("controversial"),p=f("stickied"),m=f("sticky-pinned"),b=(f("locked"),{removal_reason:null,quarantine:!1,score:1,locked:!1,distinguished:null,stickied:!1}),v={...b},k={...b,link_flair_text:null,author_flair_text:null,pinned:!1,removed_by_category:null,is_robot_indexable:!0},w={locked:f("locked")},_=e=>"t1"===e.substr(0,2),y=e=>"t3"===e.substr(0,2);class x extends r.Sd{constructor(e){super(e),this.items=[],this.ids_set=new Set,this.quarantined_subs=new Set,this.url=e}element(e){const t={};for(const n of u){let r=e.getAttribute(n.attribute);null!==r&&(n.func&&(r=n.func(r)),t[n.field]=r)}const n=e.getAttribute("class");for(const[e,r]of Object.entries(w))t[e]=!!n.match(r);if(!t.name&&t.permalink){const e=t.permalink.split("/").filter(Boolean);e.length>=5&&"comments"===e[2]&&(e.length>=6?t.name="t1_"+e[5]:t.name="t3_"+e[3])}if(t.name){if(t.id=t.name.replace(/^t[0-9]_/,""),_(t.name)){if(t.permalink){const e=t.permalink.split("/");t.link_id="t3_"+e[4],t.link_permalink=h+e.slice(0,6).join("/")+"/"}else this.addError("permalink_undefined");t.stickied=!!n.match(p),n.match(g)?t.controversiality=1:t.controversiality=0}else t.pinned=!!n.match(m);this.items.push(t),this.ids_set.add(t.name)}else this.addError("name_undefined")}addQuarantinedSub(e){this.quarantined_subs.add(e)}fillInDefaultValues(){for(const e of this.items){if(!e.name)continue;let t;if(_(e.name)?t=v:y(e.name)&&(t=k),t)for(const[n,r]of Object.entries(t))n in e||(e[n]=r)}}}class S{constructor(e){this.itemsObj=e,this.items=e.items,this.last={}}element(e){if(this.items.length){const e=this.items[this.items.length-1];e?this.last=e:this.itemsObj.addError("last_undefined")}}}class $ extends S{constructor(e,t,n){super(e),this.field_name=t,this.value=n}element(e,t=this.value){super.element(e),this.last[this.field_name]=t}}class j extends S{constructor(e,t){super(e),this.field_name=t}element(e){super.element(e),this.last[this.field_name]||(this.last[this.field_name]="");const t=[...e.attributes].map((([e,t])=>` ${e}="${t}"`)).join("");if(this.last[this.field_name]+=`<${e.tagName}${t}>`,"br"!==e.tagName)try{e.onEndTag((e=>{this.last[this.field_name]+=`</${e.name}>`}))}catch{this.itemsObj.addError("NO_END_TAG_"+e.tagName)}}text({text:e}){this.last[this.field_name]+=e}}class C extends S{constructor(e){super(e)}element(e){super.element(e),this.last.author="[deleted]"}}class T extends ${constructor(e){super(e,"score")}element(e){super.element(e,Number(e.getAttribute("title")))}}const O=f("live-timestamp"),E=f("edited-timestamp");class L extends S{element(e){super.element(e);const t=e.getAttribute("class");let n;if(t.match(O)?n="created_utc":t.match(E)&&(n="edited"),n){const t=(r=e.getAttribute("datetime"),new Date(r).getTime()/1e3);t&&(this.last[n]=t)}var r}}class A extends r.Sd{constructor(e){super(e),this.is_removed=!1}element(e){this.is_removed=!0}}class M extends r.Sd{constructor(e){super(e),this.count=0}element(e){this.count++}}class D extends r.Sd{constructor(e){super(e),this.author=""}text({text:e}){this.author+=e.trim()}}class I extends r.Sd{constructor(){super(...arguments),this.count=0}element(e){this.count++}}const N=async(e,t=null)=>{const n=Array.isArray(e)?e:e.split(","),s=n.filter((e=>e.startsWith("t3_")));s.length>0&&t&&t(s);const{items:o}=await(async e=>{const t=Array.isArray(e)?e:e.split(","),n=await(0,r.qk)()+"/api/info?id="+t.join(","),s=await fetch(n,{...r.iN,credentials:"omit"});if(!s.ok)throw new Error(`legacy reddit HTML request failed: ${s.status}`);const o=new x(n),i=new I(n),l=(new a.G).on("#siteTable",i).on("#siteTable .thing",o).on("#siteTable .thing.deleted",new C(o)).on("#siteTable .thing .entry .usertext-body .md *",new j(o,"body")).on("#siteTable .thing .tagline .score.unvoted",new T(o)).on("#siteTable .thing .tagline time",new L(o)).on("#siteTable .thing .tagline .locked-tagline",new $(o,"locked",!0));return await(0,r.F_)(l.transform(s).body),o.fillInDefaultValues(),o.items.forEach((e=>{e.body&&(e.body_html=e.body,e.body=c(e.body))})),{valid:i.count>0,items:o.items}})(n);return o.filter((e=>!e.name||!e.name.startsWith("t3_"))).map((e=>({data:e})))},R=async e=>{const t=(0,r.m1)(await(0,r.qk)(),e),n=await(0,r.kv)(t,r.iN);if(!n.ok)return{error:"request failed"};const s=new A(t),o=new D(t),i=new M(t),l=(new a.G).on('meta[name="robots"][content="noindex,nofollow"]',s).on("#siteTable .thing .tagline span",o).on("#siteTable .thing",i);return await(0,r.F_)(l.transform(n).body),0===i.count?{error:"unrecognized page (no thread things)"}:{is_removed:s.is_removed,...o.author&&{author:o.author}}}},1195:(e,t,n)=>{var r=n(5893),s=n(7294),o=n(745),a=n(3867),i=n(917),l=n(9947);const c={sm:"4px",md:"6px",lg:"8px",pill:"999px"},d={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px"},u={body:'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},h=i.iv`
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
`,f=i.iv`
    html,
    body {
        margin: 0;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family: ${u.body};
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
        margin: ${d.md} 0;
    }

    h1,
    h2,
    h3,
    h4 {
        color: var(--text-primary);
    }
    h1 {
        font-size: 22px;
        margin: 0 0 ${d.lg} 0;
    }
    h2 {
        font-size: 18px;
        margin: 0 0 ${d.md} 0;
    }
    h3 {
        font-size: 16px;
        margin: 0 0 ${d.sm} 0;
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
        border-radius: ${c.sm};
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
`,g=i.iv`
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
        border-radius: ${c.md};
    }
    .md-body code {
        background: var(--code-bg);
        border: 1px solid var(--code-border);
        border-radius: 3px;
        padding: 0 4px;
        font-family: ${u.mono};
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
`,p="ui_theme";function m(e){const t="auto"===e?window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark":e;document.documentElement.setAttribute("data-theme",t)}function b(){return(0,s.useEffect)((()=>{try{chrome.storage.local.get([p],(e=>{m(e?.[p]||"auto")}))}catch{m("auto")}const e=window.matchMedia?.("(prefers-color-scheme: light)"),t=()=>{try{chrome.storage.local.get([p],(e=>{"auto"===(e?.[p]||"auto")&&m("auto")}))}catch(e){}};e?.addEventListener?.("change",t);const n=(e,t)=>{"local"===t&&e[p]&&m(e[p].newValue||"auto")};return chrome.storage.onChanged.addListener(n),()=>{e?.removeEventListener?.("change",t),chrome.storage.onChanged.removeListener(n)}}),[]),(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(i.xB,{styles:h}),(0,r.jsx)(i.xB,{styles:f}),(0,r.jsx)(i.xB,{styles:g})]})}a.Z.a`
    color: var(--link);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,a.Z.a`
    color: var(--text-secondary);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`;const v=a.Z.button`
    display: block;
    width: 100%;
    margin-top: 6px;
    padding: 8px 10px;
    background: var(--accent);
    color: var(--text-on-accent);
    border: 0;
    border-radius: ${c.md};
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
`,k=(a.Z.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${c.md};
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
`,a.Z.div`
    padding: 10px 12px;
    margin: 6px 0;
    border-radius: ${c.md};
    font-size: 0.92em;
    ${e=>{switch(e.variant){case"warning":return i.iv`
                    background: var(--locked-bg);
                    border: 1px solid var(--locked-border);
                    color: var(--text-primary);
                `;case"success":return i.iv`
                    background: var(--approved-bg);
                    border: 1px solid var(--approved-border);
                    color: var(--text-primary);
                `;case"news":return i.iv`
                    background: var(--note-bg);
                    border: 1px solid var(--border-light);
                    color: var(--text-primary);
                `;default:return i.iv`
                    background: var(--bg-surface);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                `}}}
`),w=a.Z.span`
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
`,_=a.Z.div`
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: ${c.lg};
    padding: ${d.md} ${d.lg};
    margin-bottom: ${d.md};
    transition: border-color 0.15s ease;
    &:hover {
        border-color: var(--border-light);
    }
`,y=(a.Z.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${d.sm};
    margin-bottom: ${d.xs};
`,a.Z.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${d.sm};
    color: var(--text-secondary);
    font-size: 0.85em;
    margin-bottom: ${d.sm};
    & > span + span::before {
        content: '·';
        margin-right: ${d.sm};
        color: var(--text-muted);
    }
`,a.Z.div`
    color: var(--text-primary);
    font-size: 0.95em;
`,a.Z.div`
    display: flex;
    gap: ${d.sm};
    margin-top: ${d.sm};
    padding-top: ${d.sm};
    border-top: 1px solid var(--border);
`,a.Z.span`
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: ${c.pill};
    font-weight: 700;
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    border: 1px solid transparent;
    ${e=>{switch(e.variant){case"removed":return i.iv`
                    background: var(--removed-bg);
                    border-color: var(--removed-border);
                    color: var(--removed-text);
                `;case"deleted":return i.iv`
                    background: var(--deleted-bg);
                    border-color: var(--deleted-border);
                    color: var(--deleted-text);
                `;case"approved":case"unlocked":return i.iv`
                    background: var(--approved-bg);
                    border-color: var(--approved-border);
                    color: var(--text-primary);
                `;case"locked":return i.iv`
                    background: var(--locked-bg);
                    border-color: var(--locked-border);
                    color: var(--text-primary);
                `;case"edited":return i.iv`
                    background: var(--bg-surface-hover);
                    border-color: var(--border);
                    color: var(--text-primary);
                `;default:return i.iv`
                    background: var(--bg-surface-hover);
                    border-color: var(--border);
                    color: var(--text-secondary);
                `}}}
`,a.Z.h2`
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin: ${d.lg} 0 ${d.sm} 0;
    padding-bottom: ${d.xs};
    border-bottom: 1px solid var(--border);
`,a.Z.label`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${d.md};
    padding: ${d.sm} 0;
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
`,a.Z.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
`,a.Z.input`
    width: 80px;
    text-align: right;
`,a.Z.input`
    width: 100%;
`,a.Z.span`
    color: var(--author);
    font-weight: 600;
`,a.Z.span`
    color: var(--text-secondary);
`,a.Z.h3`
    margin: ${d.xs} 0 ${d.sm} 0;
    color: var(--text-primary);
`,a.Z.div`
    font-size: 0.95em;
`,e=>new Date(e).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}));var x=n(7785),S=n(9217),$=(n(4007),n(3150)),j=n.n($);n(7163);const C=Math.floor(60*Math.random())+60,T=Math.floor(3*Math.random())+3,O=172800,E=(e,t)=>{const n=(0,x.BG)(e,t);return j().storage.local.get({[n]:null}).then((e=>e[n]))};const L=async(e,t,n,r,s,o,a={},i=[],c=null,d=!1)=>{let u;const h=s.options.monitor_quarantined,f=n?t:"",g={};if(n){const e=s[(0,x.tN)(t,n).removed]||{};for(const[t,n]of Object.entries(a))g[t]={locked:!!n.locked,created_utc:n.created_utc,is_robot_indexable:n.is_robot_indexable,removed_by_category:n.removed_by_category,permalink:n.permalink,link_id:n.link_id,quarantine:!!n.quarantine,over_18:!!n.over_18,subreddit_type:n.subreddit_type,known_removed:t in e}}return u=c?Promise.resolve(c):location.protocol.match(/^http/)?j().runtime.sendMessage({action:"get-reddit-items-by-id",ids:e,monitor_quarantined:h,username:f,authItemsMeta:g}):(0,S.my)(e,r,h,s.tempVar_monitor_quarantined,i,f,g),u.then((e=>{if(!e)return;const r=Array.isArray(e)?e:e.items;if(!r)return;const i=s.options.removal_status,c=s.options.lock_status,u=s.options.seen_count||x.UU,h=(0,x.tN)(t,n),f=s[h.removed]||{},g=s[h.approved]||{},p=s[h.locked]||{},m=s[h.unlocked]||{},b=s[h.changes]||[];n||(a={});const v=[],k=[],w=[],_=[];r.forEach((e=>{const t=e.data;n||(a[t.name]=t);const r=n?a[t.name]:null;t._public_view&&r&&(r.quarantine||r.over_18||"private"===r.subreddit_type)?k.push(t.name):(0,l.LC)(t)?v.push(t.name):k.push(t.name),t.locked?w.push(t.name):_.push(t.name)})),((e,t,n,r)=>{if(e.length<100)return Promise.resolve(null);const s=e.map((e=>(e.data||t[e.name]||e).created_utc)).filter((e=>"number"==typeof e&&e>0));if(0===s.length)return Promise.resolve(null);s.sort(((e,t)=>e-t));const o=s[0],a=(0,x.BG)(n,r);j().storage.local.set({[a]:o}).then((()=>o))})(r,a,t,n);const y={},S=[];let $=0;const C={count:0,changeTypes:[],ids:[]},T={count:0,changeTypes:[],ids:[],ageRange:{min:1/0,max:0}},O=e=>{$+=e.num_changes,C.count+=e.realtimeChanges.count,C.ids.push(...e.realtimeChanges.ids),T.count+=e.backlogChanges.count,T.ids.push(...e.backlogChanges.ids);for(const t of e.realtimeChanges.changeTypes)C.changeTypes.includes(t)||C.changeTypes.push(t);for(const t of e.backlogChanges.changeTypes)T.changeTypes.includes(t)||T.changeTypes.push(t);e.backlogChanges.count>0&&(T.ageRange.min=Math.min(T.ageRange.min,e.backlogChanges.ageRange.min),T.ageRange.max=Math.max(T.ageRange.max,e.backlogChanges.ageRange.max))};return Promise.all([(0,x.$6)(t,n),E(t,n)]).then((([e,r])=>{if(i.track&&O(M(v,x.U$,"mod removed",f,k,x.Ci,"approved",g,b,a,i.notify,y,S,n,o,e,u,r,d)),c.track&&O(M(w,x.nb,"locked",p,_,x.YU,"unlocked",m,b,a,c.notify,y,S,n,o,e,u,r,d)),console.log("[debug] post-markChanges",{thing:t,isUser:n,subscribedFrom:o,removed:v.length,approved:k.length,locked:w.length,unlocked:_.length,known_removed:Object.keys(f).length,known_approved:Object.keys(g).length,existingLS:Object.keys(e||{}).length,num_changes:$,changeTypes:S,realtimeCount:C.count,backlogCount:T.count}),C.count>0&&C.changeTypes.length){const e=`${C.count} new [${C.changeTypes.join(", ")}] actions, click to view`;console.log(`Creating realtime notification for ${t}: ${C.count} changes of type ${C.changeTypes.join(", ")}`),(0,l.sc)({notificationId:t,title:t,message:e}).then((e=>{e&&(0,x.lY)(t).catch((()=>{}))})),(0,x.oL)(t,{count:C.count,types:C.changeTypes,itemIds:C.ids,firstAttemptAt:Date.now(),attempts:1}).catch((()=>{})),(0,x.bE)({ts:Date.now(),id:t,title:t,message:e,itemIds:C.ids,source:"recent"}).catch((()=>{}))}return T.count>0&&console.log(`Backlog for ${t}: ${T.count} older changes collected (badge-only, no notification)`),0===$&&(0,x.qN)(t).then((e=>{if(!e)return;if(!i.notify&&!c.notify)return void(0,x.lY)(t).catch((()=>{}));if(e.attempts>=5)return;if(Date.now()-e.firstAttemptAt<12e4)return;const n=`${e.count} new [${e.types.join(", ")}] actions, click to view`;console.log(`Retrying pending notification for ${t} (attempt ${e.attempts+1})`),(0,l.sc)({notificationId:t,title:t,message:n}).then((e=>{e&&(0,x.lY)(t).catch((()=>{}))})),(0,x.oL)(t,{...e,attempts:e.attempts+1}).catch((()=>{})),(0,x.bE)({ts:Date.now(),id:t,title:t,message:n,itemIds:e.itemIds,source:"retry"}).catch((()=>{}))})).catch((()=>{})),chrome.storage.sync.set({[h.removed]:(0,l.N5)(f,x.JQ,"c"),[h.approved]:(0,l.N5)(g,x.JQ,"c"),[h.locked]:(0,l.N5)(p,x.JQ,"c"),[h.unlocked]:(0,l.N5)(m,x.JQ,"c"),[h.changes]:b.slice(-x.Yn)},(()=>((0,l.SV)(),console.log("[debug] addLocalStorageItems",{thing:t,isUser:n,keys:Object.keys(y),sample:Object.keys(y).slice(0,2).map((e=>({id:e,t:y[e]?.t?.slice(0,60)})))}),(0,x.oX)(y,t,n))))}))}))},A=(e,t,n)=>{for(const r of n){let n=r;if(n instanceof l.QT||(n=new l.QT({object:r})),n.getID()===e&&t===n.getChangeTypeInternal())return!0}return!1};function M(e,t,n,r,s,o,a,i,c,d,u,h,f,g,p,m,b,v,k=!1){const w=[],_=[],y=[],S=Math.floor(Date.now()/1e3);e.forEach((e=>{const n=d[e],s=m[e];if(g||s){if(s){const t=new l.D4({object:s});t.resetSeenCount();const n=t.incrementRemovalCount();if(h[e]=t,!k&&n<T&&!(e in r))return}}else h[e]=new l.D4({item:n,observed_utc:S});const o=n.created_utc;if(!(e in r)&&!(v&&o&&o<v)){let s=!0;if((0===p&&t!==x.U$||1===p)&&(s=!1),r[e]=new l.pB(n.created_utc,s,(0,l.C3)(n.name)&&n.link_id?n.link_id:void 0),delete i[e],s){let r=t;(0,l.Me)(n)?(r=x.oZ,y.push(e)):w.push(e),c.push(new l.QT({id:e,observed_utc:S,change_type:r}))}g&&(h[e]=new l.D4({item:n,observed_utc:S}))}})),s.forEach((e=>{const t=d[e];if(g||m[e]||(h[e]=new l.D4({item:t,observed_utc:S})),m[e]){const t=new l.D4({object:m[e]});t.getRemovalCount()>0&&(t.resetRemovalCount(),h[e]||(h[e]=t))}if(e in r){const n=new l.D4({object:m[e]}),s=n.incrementSeenCount();if(s>=b){!A(e,o,c)||s>=C?(i[e]=new l.pB(t.created_utc,!0,(0,l.C3)(t.name)&&t.link_id?t.link_id:void 0),delete r[e],c.push(new l.QT({id:e,observed_utc:S,change_type:o,seen_count:s})),_.push(e),h[e]=new l.D4({item:t,observed_utc:S})):h[e]=n}else h[e]=n}else{const n=t.created_utc;v&&n&&n<v||(i[e]=new l.pB(t.created_utc,!1,(0,l.C3)(t.name)&&t.link_id?t.link_id:void 0),g&&!m[e]&&(h[e]=new l.D4({item:t,observed_utc:S})))}}));const $=[...w,..._,...y],j=$.length;u&&j&&(w.length&&f.push(n),y.length&&f.push("user deleted"),_.length&&f.push(a));const E=[],L=[],M=[],D=[],I=[];let N=0,R=0;for(const e of $){const t=d[e],n=t?.created_utc?S-t.created_utc:0;n>O?(R++,M.push(n),I.push(e)):(N++,D.push(e))}return N>0&&E.push(...f),R>0&&L.push(...f),{num_changes:j,realtimeChanges:{count:N,changeTypes:E,ids:D},backlogChanges:{count:R,changeTypes:L,ids:I,ageRange:M.length?{min:Math.min(...M),max:Math.max(...M)}:{min:0,max:0}}}}var D=n(5302);!function(e){function t(e){return" "==e||"\n"==e}function n(e){return/[\x09-\x0d ]/.test(e)}function r(e){return/[A-Za-z0-9]/.test(e)}function s(e){return/[A-Za-z]/.test(e)}function o(e){return/[0-9]/.test(e)}function a(e){return/[0-9a-fA-F]/.test(e)}function i(e){return/[\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]/.test(e)}function l(e){var t="0123456789ABCDEF";return"%"+t[(240&e)>>4]+t[(15&e)>>0]}function c(e){var t=e.charCodeAt(0);if(t<128)return l(t);if(t>127&&t<2048){var n=l(t>>6&255|192);return n+=l(t>>0&63|128)}n=l(t>>12&255|224);return n+=l(t>>6&63|128),n+=l(t>>0&63|128)}function d(e,t){var r,s=0,o=e.length;if(o<3||"<"!=e[0])return Be;"/"==e[r=1]&&(s=1,r++);for(var a=0;r<o&&!(a>=t.length);++r,++a)if(e[r]!=t[a])return Be;return r==o?Be:n(e[r])||">"==e[r]?s?Ke:He:Be}function u(e,t){for(var n,r=0;r<t.s.length;){for(n=r;r<t.s.length&&"\\"!=t.s[r];)r++;if(r>n&&(e.s+=t.s.slice(n,r)),r+1>=t.s.length)break;e.s+=t.s[r+1],r+=2}}var h=1114111;var f=["&AElig;","&Aacute;","&Acirc;","&Agrave;","&Alpha;","&Aring;","&Atilde;","&Auml;","&Beta;","&Ccedil;","&Chi;","&Dagger;","&Delta;","&ETH;","&Eacute;","&Ecirc;","&Egrave;","&Epsilon;","&Eta;","&Euml;","&Gamma;","&Iacute;","&Icirc;","&Igrave;","&Iota;","&Iuml;","&Kappa;","&Lambda;","&Mu;","&Ntilde;","&Nu;","&OElig;","&Oacute;","&Ocirc;","&Ograve;","&Omega;","&Omicron;","&Oslash;","&Otilde;","&Ouml;","&Phi;","&Pi;","&Prime;","&Psi;","&Rho;","&Scaron;","&Sigma;","&THORN;","&Tau;","&Theta;","&Uacute;","&Ucirc;","&Ugrave;","&Upsilon;","&Uuml;","&Xi;","&Yacute;","&Yuml;","&Zeta;","&aacute;","&acirc;","&acute;","&aelig;","&agrave;","&alefsym;","&alpha;","&amp;","&and;","&ang;","&apos;","&aring;","&asymp;","&atilde;","&auml;","&bdquo;","&beta;","&brvbar;","&bull;","&cap;","&ccedil;","&cedil;","&cent;","&chi;","&circ;","&clubs;","&cong;","&copy;","&crarr;","&cup;","&curren;","&dArr;","&dagger;","&darr;","&deg;","&delta;","&diams;","&divide;","&eacute;","&ecirc;","&egrave;","&empty;","&emsp;","&ensp;","&epsilon;","&equiv;","&eta;","&eth;","&euml;","&euro;","&exist;","&fnof;","&forall;","&frac12;","&frac14;","&frac34;","&frasl;","&gamma;","&ge;","&gt;","&hArr;","&harr;","&hearts;","&hellip;","&iacute;","&icirc;","&iexcl;","&igrave;","&image;","&infin;","&int;","&iota;","&iquest;","&isin;","&iuml;","&kappa;","&lArr;","&lambda;","&lang;","&laquo;","&larr;","&lceil;","&ldquo;","&le;","&lfloor;","&lowast;","&loz;","&lrm;","&lsaquo;","&lsquo;","&lt;","&macr;","&mdash;","&micro;","&middot;","&minus;","&mu;","&nabla;","&nbsp;","&ndash;","&ne;","&ni;","&not;","&notin;","&nsub;","&ntilde;","&nu;","&oacute;","&ocirc;","&oelig;","&ograve;","&oline;","&omega;","&omicron;","&oplus;","&or;","&ordf;","&ordm;","&oslash;","&otilde;","&otimes;","&ouml;","&para;","&part;","&permil;","&perp;","&phi;","&pi;","&piv;","&plusmn;","&pound;","&prime;","&prod;","&prop;","&psi;","&quot;","&rArr;","&radic;","&rang;","&raquo;","&rarr;","&rceil;","&rdquo;","&real;","&reg;","&rfloor;","&rho;","&rlm;","&rsaquo;","&rsquo;","&sbquo;","&scaron;","&sdot;","&sect;","&shy;","&sigma;","&sigmaf;","&sim;","&spades;","&sub;","&sube;","&sum;","&sup1;","&sup2;","&sup3;","&sup;","&supe;","&szlig;","&tau;","&there4;","&theta;","&thetasym;","&thinsp;","&thorn;","&tilde;","&times;","&trade;","&uArr;","&uacute;","&uarr;","&ucirc;","&ugrave;","&uml;","&upsih;","&upsilon;","&uuml;","&weierp;","&xi;","&yacute;","&yen;","&yuml;","&zeta;","&zwj;","&zwnj;"],g=[7,7,7,7,7,7,7,7,7,0,0,7,7,0,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,0,0,1,0,0,0,2,3,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,5,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],p=["","&quot;","&amp;","&#39;","&#47;","&lt;","&gt;",""];function m(e,t,n){for(var r,s=0,o=0;s<t.length;){for(r=s;s<t.length&&!(o=g[t.charCodeAt(s)]);)s++;if(s>r&&(e.s+=t.slice(r,s)),s>=t.length)break;"/"!=t[s]||n?7==g[t.charCodeAt(s)]||(e.s+=p[o]):e.s+="/",s++}}var b=[2,2,2,2,2,2,2,2,2,0,0,2,2,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,1,0,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];function v(e,t){for(var n,r=0;r<t.length;){for(n=r;r<t.length&&1===b[t.charCodeAt(r)];)r++;if(r>n&&(e.s+=t.slice(n,r)),r>=t.length)break;if(2!=b[t.charCodeAt(r)]){switch(t[r]){case"&":e.s+="&amp;";break;case"'":e.s+="&#x27;";break;default:e.s+=c(t[r])}r++}else r++}}function k(e,t,n,r,o){var a,i,l=e.slice(n),c=0;for(i=0;i<t;++i)if("<"==l[i]){t=i;break}for(;t>0;){var d=l[t-1];if("\0"===d)break;if(-1!=="?!.,".indexOf(d))t--;else{if(";"!==d)break;for(var u=t-2;u>0&&s(l[u]);)u--;u<t-2&&"&"==l[u]?t=u:t--}}if(0==t)return 0;switch(a=l[t-1]){case'"':c='"';break;case"'":c="'";break;case")":c="(";break;case"]":c="[";break;case"}":c="{"}if(0!=c){for(var h=0,f=0,g=0;g<t;)l[g]==c?f++:l[g]==a&&h++,g++;h!=f&&t--}return t}function w(e,t){var n,s=0;if(!r(e[0]))return 0;for(n=1;n<e.length-1;++n)if("."==e[n])s++;else if(!r(e[n])&&"-"!=e[n])break;return t||s?n:0}function _(e){var t,n=["http://","https://","ftp://","mailto://","/","git://","steam://","irc://","news://","mumble://","ssh://","ircs://","ts3server://","#"];for(t=0;t<n.length;++t){var r=n[t].length;if(e.length>r&&0==e.toLowerCase().indexOf(n[t])&&/[A-Za-z0-9#\/?]/.test(e[r]))return 1}return 0}function y(e,t,r,s,o){var a=t,l=new Ge(e,t);if(s<2||r<1||l.getChar(-1)!=o)return 0;if(r>1){var c=l.getChar(-2);return"/"==c?2:i(c)||n(c)?1:0}return a>2&&"/"==l.getChar(-2)&&"\\"==l.getChar(-3)?0:1}function x(e){if(e)for(var t in e)t in this&&(this[t]=e[t])}function S(e,t){this.callbacks=e,this.context=t}function $(){return{nofollow:0,target:null,tocData:{headerCount:0,currentLevel:0,levelOffset:0},toc_id_prefix:null,html_element_whitelist:Ct,html_attr_whitelist:jt,flags:0,link_attributes:function(e,t,n){n.nofollow&&(e.s+=' rel="nofollow"'),null!=n.target&&(e.s+=' target="'+n.target+'"')}}}function j(e){var t=$();t.flags=null==e?St:e;var n=new S(C(),t);return n.context.flags&Le&&(n.callbacks.image=null),n.context.flags&Ae&&(n.callbacks.link=null,n.callbacks.autolink=null),(n.context.flags&Oe||n.context.flags&Re)&&(n.callbacks.blockhtml=null),n}function C(){return new x({blockcode:O,blockquote:E,blockhtml:L,header:A,hrule:M,list:D,listitem:I,paragraph:N,table:R,table_row:q,table_cell:U,autolink:P,codespan:F,double_emphasis:Z,emphasis:z,image:B,linebreak:H,link:K,raw_html_tag:G,triple_emphasis:X,strikethrough:Y,superscript:V,entity:null,normal_text:J,doc_header:null,doc_footer:te})}function T(){return new x({blockcode:null,blockquote:null,blockhtml:null,header:Q,hrule:null,list:null,listitem:null,paragraph:null,table:null,table_row:null,table_cell:null,autolink:null,codespan:F,double_emphasis:Z,emphasis:z,image:null,linebreak:null,link:ee,raw_html_tag:null,triple_emphasis:X,strikethrough:Y,superscript:V,entity:null,normal_text:null,doc_header:null,doc_footer:ne})}function O(e,t,r,s){if(e.s.length&&(e.s+="\n"),r&&r.s.length){var o,a;for(e.s+='<pre><code class="',o=0,a=0;o<r.s.length;++o,++a){for(;o<r.s.length&&n(r.s[o]);)o++;if(o<r.s.length){for(var i=o;o<r.s.length&&!n(r.s[o]);)o++;"."==r.s[i]&&i++,a&&(e.s+=" "),m(e,r.s.slice(i,o),!1)}}e.s+='">'}else e.s+="<pre><code>";t&&m(e,t.s,!1),e.s+="</code></pre>\n"}function E(e,t,n){e.s.length&&(e.s+="\n"),e.s+="<blockquote>\n",t&&(e.s+=t.s),e.s+="</blockquote>\n"}function L(e,t,n){var r,s;if(t){for(s=t.s.length;s>0&&"\n"==t.s[s-1];)s--;for(r=0;r<s&&"\n"==t.s[r];)r++;r>=s||(e.s.length&&(e.s+="\n"),e.s+=t.s.slice(r,s),e.s+="\n")}}function A(e,t,n,r){e.s.length&&(e.s+="\n"),r.flags&De?(e.s+="<h"+ +n+' id="',r.toc_id_prefix&&(e.s+=r.toc_id_prefix),e.s+="toc_"+r.tocData.headerCount+++'">'):e.s+="<h"+ +n+">",t&&(e.s+=t.s),e.s+="</h"+ +n+">\n"}function M(e,t){e.s.length&&(e.s+="\n"),e.s+=t.flags&Ne?"<hr/>\n":"<hr>\n"}function D(e,t,n,r){e.s.length&&(e.s+="\n"),e.s+=n&se?"<ol>\n":"<ul>\n",t&&(e.s+=t.s),e.s+=n&se?"</ol>\n":"</ul>\n"}function I(e,t,n,r){if(e.s+="<li>",t){for(var s=t.s.length;s&&"\n"==t.s[s-1];)s--;e.s+=t.s.slice(0,s)}e.s+="</li>\n"}function N(e,t,r){var s=0;if(e.s.length&&(e.s+="\n"),t&&t.s.length){for(;s<t.s.length&&n(t.s[s]);)s++;if(s!=t.s.length){if(e.s+="<p>",r.flags&Ie)for(var o;s<t.s.length;){for(o=s;s<t.s.length&&"\n"!=t.data[s];)s++;if(s>o&&(e.s+=t.s.slice(o,s)),s>=t.s.length-1)break;H(e,r),s++}else e.s+=t.s.slice(s);e.s+="</p>\n"}}}function R(e,t,n,r){e.s.length&&(e.s+="\n"),e.s+="<table><thead>\n",t&&(e.s+=t.s),e.s+="</thead><tbody>\n",n&&(e.s+=n.s),e.s+="</tbody></table>\n"}function q(e,t,n){e.s+="<tr>\n",t&&(e.s+=t.s),e.s+="</tr>\n"}function U(e,t,n,r,s){switch(e.s+=n&ze?"<th":"<td",s>1&&(e.s+=' colspan="'+s+'" '),n&Ze){case Fe:e.s+=' align="center">';break;case Ue:e.s+=' align="left">';break;case Pe:e.s+=' align="right">';break;default:e.s+=">"}t&&(e.s+=t.s),e.s+=n&ze?"</th>\n":"</td>\n"}function P(e,t,n,r){return t&&t.s.length&&(0==(r.flags&Me)||_(t.s)||n==xe)?(e.s+='<a href="',n==xe&&(e.s+="mailto:"),v(e,t.s.slice(0)),r.link_attributes?(e.s+='"',r.link_attributes(e,t,r),e.s+=">"):e.s+='">',0==t.s.indexOf("mailto:")?m(e,t.s.slice(7),!1):m(e,t.s,!1),e.s+="</a>",1):0}function F(e,t,n){return e.s+="<code>",t&&m(e,t.s,!1),e.s+="</code>",1}function Z(e,t,n){return t&&t.s.length?(e.s+="<strong>"+t.s+"</strong>",1):0}function z(e,t,n){return t&&t.s.length?(e.s+="<em>"+t.s+"</em>",1):0}function B(e,t,n,r,s){return t&&t.s.length?(e.s+='<img src="',v(e,t.s),e.s+='" alt="',r&&r.s.length&&m(e,r.s,!1),n&&n.s.length&&(e.s+='" title="',m(e,n.s,!1)),e.s+=s.flags&Ne?'"/>':'">',1):0}function H(e,t){return e.s+=t.flags&Ne?"<br/>\n":"<br>\n",1}function K(e,t,n,r,s){return null==t||0==(s.flags&Me)||_(t.s)?(e.s+='<a href="',t&&t.s.length&&v(e,t.s),n&&n.s.length&&(e.s+='" title="',m(e,n.s,!1)),s.link_attributes?(e.s+='"',s.link_attributes(e,t,s),e.s+=">"):e.s+='">',r&&r.s.length&&(e.s+=r.s),e.s+="</a>",1):0}function W(e,t,n,r,s,o){var a,i,l,c,d,u=0,h=0,f=0,g=0,p=0;if(e.s+="<",o!=Ke){e.s+=r;var b=1+r.length;for(l=new We,c=new We;b<t.s.length&&!f;b++){switch(f=0,p=0,g=0,d=t.s[b]){case">":f=1;break;case"'":case'"':h?u?u==d?(u=0,g=1):c.s+=d:u=d:p=1;break;case" ":u?c.s+=" ":p=1;break;case"=":if(h){p=1;break}h=1;break;default:(h&&u||!h)&&(h?c.s+=d:l.s+=d)}if(g){var v=0;for(i=0;s[i];i++)if(s[i].length==l.s.length){for(a=0;a<l.s.length&&s[i][a].toLowerCase()==l.s[a].toLowerCase();a++);if(a==l.s.length){v=1;break}}v&&c.s.length&&l.s.length&&(e.s+=" ",m(e,l.s,!1),e.s+='="',m(e,c.s,!1),e.s+='"'),p=1}p&&(h=0,u=0,l=new We,c=new We)}e.s+=">"}else e.s+="/"+r+">"}function G(e,t,n){var r=n.html_element_whitelist;if(0!=(n.flags&qe)&&r)for(var s=0;r[s];s++){var o=d(t.s,r[s]);if(o!=Be)return W(e,t,0,r[s],n.html_attr_whitelist,o),1}return 0!=(n.flags&Re)?(m(e,t.s,!1),1):(0!=(n.flags&Oe)||0!=(n.flags&Ee)&&d(t.s,"style")||0!=(n.flags&Ae)&&d(t.s,"a")||0!=(n.flags&Le)&&d(t.s,"img")||(e.s+=t.s),1)}function X(e,t,n){return t&&t.s.length?(e.s+="<strong><em>"+t.s+"</em></strong>",1):0}function Y(e,t,n){return t&&t.s.length?(e.s+="<del>"+t.s+"</del>",1):0}function V(e,t,n){return t&&t.s.length?(e.s+="<sup>"+t.s+"</sup>",1):0}function J(e,t,n){t&&m(e,t.s,!1)}function Q(e,t,n,r){if(0==r.tocData.currentLevel&&(e.s+='<div class="toc">\n',r.tocData.levelOffset=n-1),(n-=r.tocData.levelOffset)>r.tocData.currentLevel)for(;n>r.tocData.currentLevel;)e.s+="<ul>\n<li>\n",r.tocData.currentLevel++;else if(n<r.tocData.currentLevel){for(e.s+="</li>\n";n<r.tocData.currentLevel;)e.s+="</ul>\n</li>\n",r.tocData.currentLevel--;e.s+="<li>\n"}else e.s+="</li>\n<li>\n";e.s+='<a href="#',r.toc_id_prefix&&(e.s+=r.toc_id_prefix),e.s+="toc_"+r.tocData.headerCount+++'">',t&&m(e,t.s,!1),e.s+="</a>\n"}function ee(e,t,n,r,s){return r&&r.s&&(e.s+=r.s),1}function te(e,t){t.tocData={headerCount:0,currentLevel:0,levelOffset:0}}function ne(e,t){for(var n=!1;t.tocData.currentLevel>0;)e.s+="</li>\n</ul>\n",t.tocData.currentLevel--,n=!0;n&&(e.s+="</div>\n"),te(0,t)}x.prototype={blockcode:null,blockquote:null,blockhtml:null,header:null,hrule:null,list:null,listitem:null,paragraph:null,table:null,table_row:null,table_cell:null,autolink:null,codespan:null,double_emphasis:null,emphasis:null,image:null,linebreak:null,link:null,raw_html_tag:null,triple_emphasis:null,strikethrough:null,superscript:null,entity:null,normal_text:null,doc_header:null,doc_footer:null},e.createCustomRenderer=function(e,t){return new S(e,t)},e.defaultRenderState=$,e.getRedditRenderer=j,e.getTocRenderer=function(){var e=$();return e.flags=De|Oe,new S(T(),e)},e.createCustomCallbacks=function(e){return new x(e)},e.getRedditCallbacks=C,e.getTocCallbacks=T;var re=[null,function(e,n,r,s,o){var a,i=r.slice(s),l=i.length,c=i[0];return l>2&&i[1]!=c?"~"==c||t(i[1])||0==(a=et(e,n,i,c))?0:a+1:i.length>3&&i[1]==c&&i[2]!=c?t(i[2])||0==(a=tt(e,n,i,c))?0:a+2:i.length>4&&i[1]==c&&i[2]==c&&i[3]!=c?"~"==c||t(i[3])||0==(a=function(e,n,r,s){var o,a,i=r.slice(3),l=0;for(;l<i.length;){if(!(o=Qe(i.slice(l),s)))return 0;if(i[l+=o]==s&&!t(i[l-1])){if(l+2<i.length&&i[l+1]==s&&i[l+2]==s&&n.callbacks.triple_emphasis){var c=new We;return n.spanStack.push(c),ct(c,n,i.slice(0,l)),a=n.callbacks.triple_emphasis(e,c,n.context),n.spanStack.pop(),a?l+3:0}return l+1<i.length&&i[l+1]==s?(o=et(e,n,r,s))?o-2:0:(o=tt(e,n,r,s))?o-1:0}}return 0}(e,n,i,c))?0:a+3:0},function(e,t,n,r,s){for(var o,a,i,l,c=n.slice(r),d=0;d<c.length&&"`"==c[d];)d++;for(a=0,o=d;o<c.length&&a<d;o++)"`"==c[o]?a++:a=0;if(a<d&&o>=c.length)return 0;for(i=d;i<o&&" "==c[i];)i++;for(l=o-d;l>d&&" "==c[l-1];)l--;if(i<l){var u=new We(c.slice(i,l));t.callbacks.codespan(e,u,t.context)||(o=0)}else t.callbacks.codespan(e,null,t.context)||(o=0);return o},function(e,t,n,r,s){if(n.slice(r),s<2||" "!=n[r-1]||" "!=n[r-2])return 0;for(var o=e.s.length;o&&" "==e.s[o-1];)o--;return e.s=e.s.slice(0,o),t.callbacks.linebreak(e,t.context)?1:0},function(e,n,r,s,o){var a,i,l=r.slice(s),c=o&&"!"==r[s-1],d=1,h=0,f=0,g=0,p=0,m=null,b=null,v=null,k=null,w=n.spanStack.length,_=0,y=0,x=0,S=0;function $(){return n.spanStack.length=w,y?d:0}if(c&&!n.callbacks.image||!c&&!n.callbacks.link)return $();for(a=1;d<l.length;d++)if("\n"==l[d])_=1;else{if("\\"==l[d-1])continue;if("["==l[d])a++;else if("]"==l[d]&&--a<=0)break}if(d>=l.length)return $();for(i=d,d++;d<l.length&&t(l[d]);)d++;if(d<l.length&&"("==l[d]){for(d++;d<l.length&&t(l[d]);)d++;for(h=d;d<l.length;)if("\\"==l[d])d+=2;else{if(")"==l[d])break;if(d>=1&&t(l[d-1])&&("'"==l[d]||'"'==l[d]))break;d++}if(d>=l.length)return $();if(f=d,"'"==l[d]||'"'==l[d]){for(S=l[d],x=1,g=++d;d<l.length;)if("\\"==l[d])d+=2;else if(l[d]==S)x=0,d++;else{if(")"==l[d]&&!x)break;d++}if(d>=l.length)return $();for(p=d-1;p>g&&t(l[p]);)p--;"'"!=l[p]&&'"'!=l[p]&&(g=p=0,f=d)}for(;f>h&&t(l[f-1]);)f--;"<"==l[h]&&h++,">"==l[f-1]&&f--,f>h&&(b=new We,n.spanStack.push(b),b.s+=l.slice(h,f)),p>g&&(v=new We,n.spanStack.push(v),v.s+=l.slice(g,p)),d++}else if(d<l.length&&"["==l[d]){var j=new We,C=null;for(h=++d;d<l.length&&"]"!=l[d];)d++;if(d>=l.length)return $();if(h==(f=d))if(_){var T=new We;for(n.spanStack.push(T),O=1;O<i;O++)"\n"!=l[O]?T.s+=l[O]:" "!=l[O-1]&&(T.s+=" ");j.s=T.s}else j.s=l.slice(1);else j.s=l.slice(h,f);if(!(C=n.refs[j.s]))return $();b=C.link,v=C.title,d++}else{j=new We,C=null;if(_){var O;T=new We;for(n.spanStack.push(T),O=1;O<i;O++)"\n"!=l[O]?T.s+=l[O]:" "!=l[O-1]&&(T.s+=" ");j.s=T.s}else j.s=l.slice(1,i);if(!(C=n.refs[j.s]))return $();b=C.link,v=C.title,d=i+1}return i>1&&(m=new We,n.spanStack.push(m),c?m.s+=l.slice(1,i):(n.inLinkBody=1,ct(m,n,l.slice(1,i)),n.inLinkBody=0)),b?(k=new We,n.spanStack.push(k),u(k,b),c?(e.s.length&&"!"==e.s[e.s.length-1]&&(e.s=e.s.slice(0,-1)),y=n.callbacks.image(e,k,v,m,n.context)):y=n.callbacks.link(e,k,v,m,n.context),$()):$()},function(e,t,n,s,o){var a=n.slice(s),i={p:_e},l=function(e,t){var n,s;if(e.length<3)return 0;if("<"!=e[0])return 0;if(n="/"==e[1]?2:1,!r(e[n]))return 0;t.p=_e;for(;n<e.length&&(r(e[n])||"."==e[n]||"+"==e[n]||"-"==e[n]);)n++;if(n>1&&"@"==e[n]&&0!=(s=function(e){var t=0,n=0;for(t=0;t<e.length;++t)if(!r(e[t]))switch(e[t]){case"@":n++;case"-":case".":case"_":break;case">":return 1==n?t+1:0;default:return 0}return 0}(e.slice(n))))return t.p=xe,n+s;n>2&&":"==e[n]&&(t.p=ye,n++);if(n>=e.length)t.p=_e;else if(t.p){for(s=n;n<e.length;)if("\\"==e[n])n+=2;else{if(">"==e[n]||"'"==e[n]||'"'==e[n]||" "==e[n]||"\n"==e[n])break;n++}if(n>=e.length)return 0;if(n>s&&">"==e[n])return n+1;t.p=_e}for(;n<e.length&&">"!=e[n];)n++;return n>=e.length?0:n+1}(a,i),c=new We(a.slice(0,l)),d=0;if(l>2)if(t.callbacks.autolink&&i.p!=_e){var h=new We;t.spanStack.push(h),c.s=a.substr(1,l-2),u(h,c),d=t.callbacks.autolink(e,h,i.p,t.context),t.spanStack.pop()}else t.callbacks.raw_html_tag&&(d=t.callbacks.raw_html_tag(e,c,t.context));return d?l:0},function(e,t,n,r,s){var o=n.slice(r),a=new We;if(o.length>1){if(-1=="\\`*_{}[]()#+-.!:|&<>/^~".indexOf(o[1]))return 0;t.callbacks.normal_text?(a.s=o[1],t.callbacks.normal_text(e,a,t.context)):e.s+=o[1]}else 1==o.length&&(e.s+=o[0]);return 2},function(e,t,n,s,i){var l,c,d=n.slice(s),u=1,g=!1,p=!1,m=new We;for(u<d.length&&"#"===d[u]&&(g=!0,u++),u<d.length&&g&&"x"===d[u].toLowerCase()&&(p=!0,u++),l=u;u<d.length;){var b=d[u];if(p){if(!a(b))break}else if(g){if(!o(b))break}else if(!r(b))break;u++}if(!(u>l&&u<d.length&&";"===d[u]))return 0;if(u++,g&&undefined-l>7)return 0;if(g){if(c=p?16:10,!function(e){return e>8&&11!==e&&12!==e&&(e<14||e>31)&&(e<55296||e>57343)&&65534!==e&&65535!==e&&e<=h}(parseInt(d.slice(l),c)))return 0}else if(-1===f.indexOf(d.slice(0,u)))return 0;return t.callbacks.entity?(m.s=d.slice(0,u),t.callbacks.entity(e,m,t.context)):e.s+=d.slice(0,u),u},function(e,t,r,o,a){var i,l,c=r.slice(o),d={p:null};return!t.callbacks.autolink||t.inLinkBody?0:(i=new We,t.spanStack.push(i),(l=function(e,t,r,o,a,i,l){var c,d,u=r.slice(o),h=0;if(i<4||"/"!=r[o+1]||"/"!=r[o+2])return 0;for(;h<a&&s(r[o-h-1]);)h++;if(!_(r.substr(o-h,i+h)))return 0;if(c=3,0==(d=w(u.slice(c),l&we)))return 0;for(c+=d;c<i&&!n(r[o+c]);)c++;return 0==(c=k(r,c,o))?0:(t.s+=r.substr(o-h,c+h),e.p=h,c)}(d,i,r,o,a,c.length,0))>0&&(d.p>0&&e.truncate(e.s.length-d.p),t.callbacks.autolink(e,i,ye,t.context)),t.spanStack.pop(),l)},function(e,t,n,s,o){var a,i,l=n.slice(s),c={p:null};return!t.callbacks.autolink||t.inLinkBody?0:(a=new We,t.spanStack.push(a),(i=function(e,t,n,s,o,a,i){n.slice(s);var l,c,d=0,u=0;for(c=0;c<o&&"\0"!=(h=n[s-c-1])&&(r(h)||-1!=".+-_".indexOf(h));++c);if(0==c)return 0;for(l=0;l<a;++l){var h;if(!r(h=n[s+l]))if("@"==h)d++;else if("."==h&&l<a-1)u++;else if("-"!=h&&"_"!=h)break}return l<2||1!=d||0==u||0==(l=k(n,l,s))?0:(t.s+=n.substr(s-c,l+c),e.p=c,l)}(c,a,n,s,o,l.length))>0&&(c.p>0&&e.truncate(e.s.length-c.p),t.callbacks.autolink(e,a,xe,t.context)),t.spanStack.pop(),i)},function(e,t,r,s,o){var a,l,c=r.slice(s),d=null,u=null,h={p:null};return!t.callbacks.link||t.inLinkBody?0:(a=new We,t.spanStack.push(a),(l=function(e,t,r,s,o,a,l){var c,d=r.slice(s);if(o>0&&!i(r[s-1])&&!n(r[s-1]))return 0;if(a<4||"www."!=d.slice(0,4))return 0;if(0==(c=w(d,0)))return 0;for(;c<a&&!n(d[c]);)c++;return 0==(c=k(r,c,s))?0:(t.s+=d.slice(0,c),e.p=0,c)}(h,a,r,s,o,c.length))>0&&(d=new We,t.spanStack.push(d),d.s+="http://",d.s+=a.s,h.p>0&&e.truncate(e.s.length-h.p),t.callbacks.normal_text?(u=new We,t.spanStack.push(u),t.callbacks.normal_text(u,a,t.context),t.callbacks.link(e,d,null,u,t.context),t.spanStack.pop()):t.callbacks.link(e,d,null,a,t.context),t.spanStack.pop()),t.spanStack.pop(),l)},function(e,t,n,s,o){var a,i=n.slice(s),l=0,c={p:null},d={p:null};if(!t.callbacks.autolink||t.inLinkBody)return 0;if(a=new We,t.spanStack.push(a),0===(l=function(e,t,n,s,o,a,i){var l=n.slice(s),c=0,d=!1,u=y(n,s,o,a,"r");if(!u)return 0;c=1,"all-"==l.substr(c,4).toLowerCase()&&(d=!0);do{var h=c,f=24;if(a>=c+10&&"reddit.com"==l.substr(c,10).toLowerCase())c+=10,f=10;else{if(a>c+2&&"t:"==l.substr(c,2)&&(c+=2),!r(l[c]))return 0;c+=1}for(;c<a&&(r(l[c])||"_"==l[c]);)c++;if(c-h<2||c-h>f)return 0}while(c<a&&("+"==l[c]||d&&"-"==l[c])&&c++);if(c<a&&"/"==l[c])for(;c<a&&(r(l[c])||"_"==l[c]||"/"==l[c]||"-"==l[c]);)c++;var g=s-u;return t.s+=n.slice(g,g+c+u),i.p=1==u,e.p=u,c}(c,a,n,s,o,i.length,d))&&(l=function(e,t,n,s,o,a,i){var l=n.slice(s),c=0;if(!(a<3)){var d=y(n,s,o,a,"u");if(!d)return 0;if(!r(l[c=1])&&"_"!=l[c]&&"-"!=l[c])return 0;for(c+=1;c<a&&(r(l[c])||"_"==l[c]||"/"==l[c]||"-"==l[c]);)c++;var u=s-d;return t.s+=n.slice(u,u+c+d),i.p=1==d,e.p=d,c}}(c,a,n,s,o,i.length,d)),l>0){var u=new We;if(t.spanStack.push(u),d.p&&(u.s+="/"),u.s+=a.s,c.p>0&&e.truncate(e.s.length-c.p),t.callbacks.normal_text){var h=new We;t.spanStack.push(h),t.callbacks.normal_text(h,a,t.context),t.callbacks.link(e,u,null,h,t.context),t.spanStack.pop()}else t.callbacks.link(e,u,null,a,t.context);t.spanStack.pop()}return t.spanStack.pop(),l},function(e,n,r,s,o){var a,i,l,c=r.slice(s),d=c.length;if(!n.callbacks.superscript)return 0;if(d<2)return 0;if("("==c[1]){for(a=i=2;i<d&&")"!=c[i]&&"\\"!=c[i-1];)i++;if(i==d)return 0}else for(a=i=1;i<d&&!t(c[i]);)i++;return i-a==0?2==a?3:0:(l=new We,n.spanStack.push(l),ct(l,n,c.slice(a,i)),n.callbacks.superscript(e,l,n.context),n.spanStack.pop(),2==a?i+1:i)}],se=1,oe=2,ae=8,ie=0,le=(ie++,ie++),ce=ie++,de=ie++,ue=ie++,he=ie++,fe=ie++,ge=ie++,pe=ie++,me=ie++,be=ie++,ve=ie++,ke=ie++,we=1;ie=0;var _e=ie++,ye=ie++,xe=ie++,Se=1,$e=2,je=4,Ce=64,Te=256,Oe=1,Ee=2,Le=4,Ae=8,Me=32,De=64,Ie=128,Ne=256,Re=512,qe=1024,Ue=1,Pe=2,Fe=3,Ze=3,ze=4,Be=0,He=1,Ke=2;function We(e){this.s=e||""}function Ge(e,t){if(this.s=e,t>=e.length||t<0)throw new RangeError("char * offset out of bounds");this.offset=t}function Xe(){this.spanStack=[],this.blockStack=[],this.extensions=152|Se|$e|$e;var e=j();this.context=e.context,this.callbacks=e.callbacks,this.inLinkBody=0,this.activeChars={},this.refs={},this.nestingLimit=16,this.maxTableCols=64}function Ye(e){var t;for(t=0;t<e.length&&"\n"!=e[t];t++)if(" "!=e[t])return 0;return t+1}function Ve(e){var t,n=0,r=0;if(e.length<3)return 0;if(" "==e[0]&&(n++," "==e[1]&&(n++," "==e[2]&&n++)),n+2>=e.length||"*"!=e[n]&&"-"!=e[n]&&"_"!=e[n])return 0;for(t=e[n];n<e.length&&"\n"!=e[n];){if(e[n]==t)r++;else if(" "!=e[n])return 0;n++}return r>=3}function Je(e,n){var r,s=0,o=0;if(s=function(e){var t,n=0,r=0;if(e.length<3)return 0;if(" "==e[0]&&(n++," "==e[1]&&(n++," "==e[2]&&n++)),n+2>=e.length||"~"!=e[n]&&"`"!=e[n])return 0;for(t=e[n];n<e.length&&e[n]==t;)r++,n++;return r<3?0:n}(e),0==s)return 0;for(;s<e.length&&" "==e[s];)s++;if(r=s,s<e.length&&"{"==e[s]){for(s++,r++;s<e.length&&"}"!=e[s]&&"\n"!=e[s];)o++,s++;if(s==e.length||"}"!=e[s])return 0;for(;o>0&&t(e[r+0]);)r++,o--;for(;o>0&&t(e[r+o-1]);)o--;s++}else for(;s<e.length&&!t(e[s]);)o++,s++;for(n&&(n.s=e.substr(r,o));s<e.length&&"\n"!=e[s];){if(!t(e[s]))return 0;s++}return s+1}function Qe(e,t){for(var n=1;n<e.length;){for(;n<e.length&&e[n]!=t&&"`"!=e[n]&&"["!=e[n];)n++;if(n==e.length)return 0;if(e[n]==t)return n;if(n&&"\\"==e[n-1])n++;else if("`"==e[n]){for(var r,s=0,o=0;n<e.length&&"`"==e[n];)n++,s++;if(n>=e.length)return 0;for(r=0;n<e.length&&r<s;)o||e[n]!=t||(o=n),"`"==e[n]?r++:r=0,n++;if(n>=e.length)return o}else if("["==e[n]){var a;o=0;for(n++;n<e.length&&"]"!=e[n];)o||e[n]!=t||(o=n),n++;for(n++;n<e.length&&(" "==e[n]||"\n"==e[n]);)n++;if(n>=e.length)return o;switch(e[n]){case"[":a="]";break;case"(":a=")";break;default:if(o)return o;continue}for(n++;n<e.length&&e[n]!=a;)o||e[n]!=t||(o=n),n++;if(n>=e.length)return o;n++}}return 0}function et(e,n,r,s){var o,a,l=r.slice(1),c=0;if(!n.callbacks.emphasis)return 0;for(l.length>1&&l[0]==s&&l[1]==s&&(c=1);c<l.length;){if(!(o=Qe(l.slice(c),s)))return 0;if((c+=o)>=l.length)return 0;if(l[c]==s&&!t(l[c-1])){if(n.extensions&Se&&"_"==s&&c+1!=l.length&&!t(l[c+1])&&!i(l[c+1]))continue;var d=new We;return n.spanStack.push(d),ct(d,n,l.slice(0,c)),a=n.callbacks.emphasis(e,d,n.context),n.spanStack.pop(),a?c+1:0}}return 0}function tt(e,n,r,s){var o,a,i=r.slice(2),l=0,c="~"==s?n.callbacks.strikethrough:n.callbacks.double_emphasis;if(!c)return 0;for(;l<i.length;){if(!(o=Qe(i.slice(l),s)))return 0;if((l+=o)+1<i.length&&i[l]==s&&i[l+1]==s&&l&&!t(i[l-1])){var d=new We;return n.spanStack.push(d),ct(d,n,i.slice(0,l)),a=c(e,d,n.context),n.spanStack.pop(),a?l+2:0}l++}return 0}function nt(e,t){if("#"!=t[0])return!1;if(e.extensions&Ce){for(var n=0;n<t.length&&n<6&&"#"==t[n];)n++;if(n<t.length&&" "!=t[n])return!1}return!0}function rt(e){var t=0,n=e.length;if("="==e[t]){for(t=1;t<n&&"="==e[t];t++);for(;t<n&&" "==e[t];)t++;return t>=n||"\n"==e[t]?1:0}if("-"==e[t]){for(t=1;t<n&&"-"==e[t];t++);for(;t<n&&" "==e[t];)t++;return t>=n||"\n"==e[t]?2:0}return 0}function st(e){for(var t=e.length,n=0;n<t&&"\n"!=e[n];)n++;return++n>=t?0:rt(e.slice(n))}function ot(e){var t=0,n=e.length;return t<n&&" "==e[t]&&t++,t<n&&" "==e[t]&&t++,t<n&&" "==e[t]&&t++,t<n&&">"==e[t]?t+1<n&&" "==e[t+1]?t+2:t+1:0}function at(e){return e.length>3&&" "==e[0]&&" "==e[1]&&" "==e[2]&&" "==e[3]?4:0}function it(e){var t=e.length,n=0;if(n<t&&" "==e[n]&&n++,n<t&&" "==e[n]&&n++,n<t&&" "==e[n]&&n++,n>=t||e[n]<"0"||e[n]>"9")return 0;for(;n<t&&e[n]>="0"&&e[n]<="9";)n++;return n+1>=t||"."!=e[n]||" "!=e[n+1]||st(e.slice(n))?0:n+2}function lt(e){var t=e.length,n=0;return n<t&&" "==e[n]&&n++,n<t&&" "==e[n]&&n++,n<t&&" "==e[n]&&n++,n+1>=t||"*"!=e[n]&&"+"!=e[n]&&"-"!=e[n]||" "!=e[n+1]||st(e.slice(n))?0:n+2}function ct(e,t,n){var r=0,s=0,o=0,a=0,i=new We;if(!(t.spanStack.length+t.blockStack.length>t.nestingLimit))for(;r<n.length;){for(;s<n.length&&!(a=t.activeChars[n[s]]);)s++;if(t.callbacks.normal_text?(i.s=n.slice(r,s),t.callbacks.normal_text(e,i,t.context)):e.s+=n.slice(r,s),s>=n.length)break;r=s,(s=re[a](e,t,n,r,r-o))?o=s=r+=s:s=r+1}}function dt(e,t,n){for(var r,s,o,a=0;a<n.length&&a<6&&"#"==n[a];)a++;for(r=a;r<n.length&&" "==n[r];r++);for(s=r;s<n.length&&"\n"!=n[s];s++);for(o=s;s&&"#"==n[s-1];)s--;for(;s&&" "==n[s-1];)s--;if(s>r){var i=new We;t.spanStack.push(i),ct(i,t,n.slice(r,s)),t.callbacks.header&&t.callbacks.header(e,i,a,t.context),t.spanStack.pop()}return o}function ut(e,t,n){var r,s;return e.length+3>=n.length||n.slice(2).toLowerCase()!=e||">"!=n[e.length+2]?0:(s=0,(r=e.length+3)<n.length&&0==(s=Ye(n.slice(r)))?0:(r+=s,s=0,r<n.length&&(s=Ye(n.slice(r))),r+s))}function ht(e,t,n,r){var s,o,a,i=0,l=null,c=new We(n);if(n.length<2||"<"!=n[0])return 0;for(s=1;s<n.length&&">"!=n[s]&&" "!=n[s];)s++;if(s<n.length&&(a=n.slice(1),l=-1!=["p","dl","div","math","table","ul","del","form","blockquote","figure","ol","fieldset","h1","h6","pre","script","h5","noscript","style","iframe","h4","ins","h3","h2"].indexOf(a.toLowerCase())?a.toLowerCase():""),!l){if(n.length>5&&"!"==n[1]&&"-"==n[2]&&"-"==n[3]){for(s=5;s<n.length&&("-"!=n[s-2]||"-"!=n[s-1]||">"!=n[s]);)s++;if(++s<size&&(i=Ye(n.slice(s))),i)return c.s=n.slice(0,s+i),r&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),c.s.length}if(n.length>4&&("h"==n[1]||"H"==n[1])&&("r"==n[2]||"R"==n[2])){for(s=3;s<n.length&&">"!=n[s];)s++;if(s+1<n.length&&(s++,i=Ye(n.slice(s))))return c.s=n.slice(0,s+i),r&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),c.s.length}return 0}if(s=1,o=0,"ins"!=l&&"del"!=l){var d=l.length;for(s=1;s<n.length;){for(s++;s<n.length&&("<"!=n[s-1]||"/"!=n[s]);)s++;if(s+2+d>=n.length)break;if(i=ut(tag,0,n.slice(s-1))){s+=i-1,o=1;break}}}return o?(c.s=c.s.slice(0,s),r&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),s):0}function ft(e,t,n){var r,s,o=n.length,a=0,i="",l=new We;for(t.blockStack.push(l),r=0;r<o;){for(a=r+1;a<o&&"\n"!=n[a-1];a++);if(s=ot(n.slice(r,a)))r+=s;else if(Ye(n.slice(r,a))&&(a>=o||0==ot(n.slice(a))&&!Ye(n.slice(a))))break;r<a&&(i+=n.slice(r,a),a-r),r=a}return _t(l,t,i),t.callbacks.blockquote&&t.callbacks.blockquote(e,l,t.context),t.blockStack.pop(),a}function gt(e,t,n){for(var s=0,o=0,a=0,i=n.length,l=new We(n);s<i;){for(o=s+1;o<i&&"\n"!=n[o-1];o++);if(0!=ot(n.slice(s,o))){o=s;break}var c=n.slice(s);if(Ye(c)||0!=(a=rt(c)))break;if(Ye(c))break;if(0!=(a=rt(c)))break;if(nt(t,c)||Ve(c)||ot(c)){o=s;break}if(t.extensions&Te&&!r(n[s])){if(it(c)||lt(c)){o=s;break}if("<"==n[s]&&t.callbacks.blockhtml&&ht(e,t,c,0)){o=s;break}if(0!=(t.extensions&&je)&&0!=Je(c,null)){o=s;break}}s=o}for(var d=s;d&&"\n"==n[d-1];)d--;if(l.s=l.s.slice(0,d),a){var u;if(l.size){var h;for(s=l.s.length;d&&"\n"!=n[d];)d-=1;for(h=d+1;d&&"\n"==n[d-1];)d-=1;if(l.s=l.s.slice(0,d),d>0){f=new We;t.blockStack.push(f),ct(f,t,l.s),t.callbacks.paragraph&&t.callbacks.paragraph(e,f,t.context),t.blockStack.pop(),l.s=l.s.slice(h,s)}else l.s=l.s.slice(0,s)}u=new We,t.spanStack.push(u),ct(u,t,l.s),t.callbacks.header&&t.callbacks.header(e,u,a,t.context),t.spanStack.pop()}else{var f=new We;t.blockStack.push(f),ct(f,t,l.s),t.callbacks.paragraph&&t.callbacks.paragraph(e,f,t.context),t.blockStack.pop()}return o}function pt(e,t,n){var r,s,o=null,a=new We;if(0==(r=Je(n,a)))return 0;for(o=new We,t.blockStack.push(o);r<n.length;){var i,l=new We;if(0!=(i=Je(n.slice(r),l))&&0==l.s.length){r+=i;break}for(s=r+1;s<n.length&&"\n"!=n[s-1];s++);if(r<s){var c=n.slice(r,s);Ye(c)?o.s+="\n":o.s+=c}r=s}return o.s.length&&"\n"!=o.s[o.s.length-1]&&(o.s+="\n"),t.callbacks.blockcode&&t.callbacks.blockcode(e,o,a.s.length?a:null,t.context),t.blockStack.pop(),r}function mt(e,t,n){var r,s,o,a=n.length,i=null;for(t.blockStack.push(i=new We),r=0;r<a;){for(s=r+1;s<a&&"\n"!=n[s-1];s++);if(o=at(n.slice(r,s)))r+=o;else if(!Ye(n.slice(r,s)))break;r<s&&(Ye(n.slice(r,s))?i.s+="\n":i.s+=n.slice(r,s)),r=s}for(var l=i.s.length;l&&"\n"==i.s[l-1];)l-=1;return i.s=i.s.slice(0,l),i.s+="\n",t.callbacks.blockcode&&t.callbacks.blockcode(e,i,null,t.context),t.blockStack.pop(),r}function bt(e,t,n,r){for(var s,o,a,i,l=n.length,c=null,d=0,u=0,h=0,f=0,g=0,p=0;h<3&&h<l&&" "==n[h];)h++;if((d=lt(n))||(d=it(n)),!d)return 0;for(o=d;o<l&&"\n"!=n[o-1];)o++;for(t.spanStack.push(c=new We),t.spanStack.push(s=new We),c.s+=n.slice(d,o),d=o;d<l;){var m,b;for(o++;o<l&&"\n"!=n[o-1];)o++;if(Ye(n.slice(d,o)))f=1,d=o;else{for(i=0;i<4&&d+i<o&&" "==n[d+i];)i++;if(a=i,t.flags&je&&0!=Je(n.slice(d+i,o),null)&&(p=!p),p||(m=lt(n.slice(d+i,o)),b=it(n.slice(d+i,o))),f&&(r.p&se&&m||!(r.p&se)&&b)){r.p|=ae;break}if(m&&!Ve(n.slice(d+i,o))||b){if(f&&(g=1),a==h)break;u||(u=c.s.length)}else{if(f&&0==a){r.p|=ae;break}f&&(c.s+="\n",g=1)}f=0,c.s+=n.slice(d+i,o),d=o}}return g&&(r.p|=oe),r.p&oe?u&&u<c.s.length?(_t(s,t,c.s.slice(0,u)),_t(s,t,c.s.slice(u))):_t(s,t,c.s):u&&u<c.s.length?(ct(s,t,c.s.slice(0,u)),_t(s,t,c.s.slice(u))):ct(s,t,c.s),t.callbacks.listitem&&t.callbacks.listitem(e,s,r.p,t.context),t.spanStack.pop(),t.spanStack.pop(),d}function vt(e,t,n,r){var s,o,a=n.length,i=0;for(t.blockStack.push(o=new We);i<a;){var l={p:r};if(s=bt(o,t,n.slice(i),l),r=l.p,i+=s,!s||r&ae)break}return t.callbacks.list&&t.callbacks.list(e,o,r,t.context),t.blockStack.pop(),i}function kt(e,n,r,s,o){var a,i,l,c=0;if(n.callbacks.table_cell&&n.callbacks.table_row){for(n.spanStack.push(l=new We),c<r.length&&"|"==r[c]&&c++,a=0;a<s.length&&c<r.length;++a){var d,u,h;for(n.spanStack.push(h=new We);c<r.length&&t(r[c]);)c++;for(d=c;c<r.length&&"|"!=r[c];)c++;for(u=c-1;u>d&&t(r[u]);)u--;ct(h,n,r.slice(d,1+u)),n.callbacks.table_cell(l,h,s[a]|o,n.context,0),n.spanStack.pop(),c++}if((i=s.length-a)>0){n.callbacks.table_cell(l,null,s[a]|o,n.context,i)}n.callbacks.table_row(e,l,n.context),n.spanStack.pop()}}function wt(e,n,r){var s,o,a,i={p:null};if(n.spanStack.push(o=new We),n.blockStack.push(a=new We),s=function(e,n,r,s){for(var o,a,i,l=0,c=0;l<r.length&&"\n"!=r[l];)"|"==r[l++]&&c++;if(l==r.length||0==c)return 0;for(a=l;a>0&&t(r[a-1]);)a--;if("|"==r[0]&&c--,a&&"|"==r[a-1]&&c--,c+1>n.maxTableCols)return 0;s.p=new Array(c+1);for(var d=0;d<s.p.length;d++)s.p[d]=0;for(++l<r.length&&"|"==r[l]&&l++,i=l;i<r.length&&"\n"!=r[i];)i++;for(o=0;o<s.p.length&&l<i;++o){for(var u=0;l<i&&" "==r[l];)l++;for(":"==r[l]&&(l++,s.p[o]|=Ue,u++);l<i&&"-"==r[l];)l++,u++;for(l<i&&":"==r[l]&&(l++,s.p[o]|=Pe,u++);l<i&&" "==r[l];)l++;if(l<i&&"|"!=r[l])break;if(u<1)break;l++}return o<s.p.length?0:(kt(e,n,r.slice(0,a),s.p,ze),i+1)}(o,n,r,i),s>0){for(;s<r.length;){var l,c=0;for(l=s;s<r.length&&"\n"!=r[s];)"|"==r[s++]&&c++;if(0==c||s==r.length){s=l;break}kt(a,n,r.slice(l,s),i.p,0),s++}n.callbacks.table&&n.callbacks.table(e,o,a,n.context)}return n.spanStack.pop(),n.blockStack.pop(),s}function _t(e,t,n){var r,s,o=0;if(!(t.spanStack.length+t.blockStack.length>t.nestingLimit))for(;o<n.length;)if(s=n.slice(o),n.length-o,nt(t,s))o+=dt(e,t,s);else if("<"==n[o]&&t.callbacks.blockhtml&&0!=(r=ht(e,t,s,1)))o+=r;else if(0!=(r=Ye(s)))o+=r;else if(Ve(s)){for(t.callbacks.hrule&&t.callbacks.hrule(e,t.context);o<n.length&&"\n"!=n[o];)o++;o++}else 0!=(t.extensions&je)&&0!=(r=pt(e,t,s))||0!=(t.extensions&$e)&&0!=(r=wt(e,t,s))?o+=r:ot(s)?o+=ft(e,t,s):at(s)?o+=mt(e,t,s):lt(s)?o+=vt(e,t,s,0):it(s)?o+=vt(e,t,s,se):o+=gt(e,t,s)}function yt(e,t,n,r){var s,o,a,i,l,c,d,u=0;if(t+3>=n)return 0;if(" "==e[t]&&(u=1," "==e[t+1]&&(u=2," "==e[t+2]&&(u=3," "==e[t+3]))))return 0;if("["!=e[u+=t])return 0;for(s=++u;u<n&&"\n"!=e[u]&&"\r"!=e[u]&&"]"!=e[u];)u++;if(u>=n||"]"!=e[u])return 0;if(o=u,++u>=n||":"!=e[u])return 0;for(u++;u<n&&" "==e[u];)u++;for(u<n&&("\n"==e[u]||"\r"==e[u])&&++u<n&&"\r"==e[u]&&"\n"==e[u-1]&&u++;u<n&&" "==e[u];)u++;if(u>=n)return 0;for("<"==e[u]&&u++,a=u;u<n&&" "!=e[u]&&"\n"!=e[u]&&"\r"!=e[u];)u++;for(i=">"==e[u-1]?u-1:u;u<n&&" "==e[u];)u++;if(u<n&&"\n"!=e[u]&&"\r"!=e[u]&&"'"!=e[u]&&'"'!=e[u]&&"("!=e[u])return 0;if(d=0,(u>=n||"\r"==e[u]||"\n"==e[u])&&(d=u),u+1<n&&"\n"==e[u]&&"\r"==e[u+1]&&(d=u+1),d)for(u=d+1;u<n&&" "==e[u];)u++;if(l=c=0,u+1<n&&("'"==e[u]||'"'==e[u]||"("==e[u])){for(l=++u;u<n&&"\n"!=e[u]&&"\r"!=e[u];)u++;for(c=u+1<n&&"\n"==e[u]&&"\r"==e[u+1]?u+1:u,u-=1;u>l&&" "==e[u];)u-=1;u>l&&("'"==e[u]||'"'==e[u]||")"==e[u])&&(d=c,c=u)}if(!d||i==a)return 0;var h=e.slice(s,o),f=e.slice(a,i),g=null;return c>l&&(g=e.slice(l,c)),r.refs[h]={id:h,link:new We(f),title:new We(g)},d}function xt(e,t){for(var n=0,r=0;n<t.length;){for(var s=n;n<t.length&&"\t"!=t[n];)n++,r++;if(n>s&&(e.s+=t.slice(s,n)),n>=t.length)break;do{e.s+=" ",r++}while(r%4);n++}}We.prototype.truncate=function(e){if(this.s.length<e)throw new RangeError("Buffer smaller than desired size");if(e<0)throw new RangeError("Size argument is negative");this.s=this.s.slice(0,e)},Ge.prototype.getChar=function(e){var t=this.offset+e;if(t>=this.s.length||t<0)throw new RangeError("Character index out of bounds");return this.s.slice(t,t+1)},Ge.prototype.toString=function(){return this.s.slice(this.offset)},Xe.prototype.render=function(e){var t,n=new We,r=0;for(this.refs={};r<e.length;)if(t=yt(e,r,e.length,this))r=t;else{for(t=r;t<e.length&&"\n"!=e[t]&&"\r"!=e[t];)t++;for(t>r&&xt(n,e.slice(r,t));t<e.length&&("\n"==e[t]||"\r"==e[t]);)("\n"==e[t]||t+1<e.length&&"\n"!=e[t+1])&&(n.s+="\n"),t++;r=t}var s=new We;return this.callbacks.doc_header&&this.callbacks.doc_header(s,this.context),n.s.length&&("\n"!=n.s[n.s.length-1]&&"\r"!=n.s[n.s.length-1]&&(n.s+="\n"),_t(s,this,n.s)),this.callbacks.doc_footer&&this.callbacks.doc_footer(s,this.context),s.s},e.getParser=function(e,t,n,r){var s=new Xe;e&&(s.callbacks=e.callbacks),n&&(s.nestingLimit=n),n&&(s.maxTableCols=r),e&&(s.context=e.context),null!=t&&null!=t&&(s.extensions=t);var o=s.callbacks;return(o.emphasis||o.double_emphasis||o.triple_emphasis)&&(s.activeChars["*"]=le,s.activeChars._=le,16&s.extensions&&(s.activeChars["~"]=le)),o.codespan&&(s.activeChars["`"]=ce),o.linebreak&&(s.activeChars["\n"]=de),(o.image||o.link)&&(s.activeChars["["]=ue),s.activeChars["<"]=he,s.activeChars["\\"]=fe,s.activeChars["&"]=ge,8&s.extensions&&(512&s.extensions||(s.activeChars["@"]=me),s.activeChars[":"]=pe,s.activeChars.w=be,s.activeChars["/"]=ve),128&s.extensions&&(s.activeChars["^"]=ke),s};var St=Oe|Le|Me|Re|Ne,$t=Oe|Me|qe|Re|Ne,jt=["colspan","rowspan","cellspacing","cellpadding","scope"],Ct=["tr","th","td","table","tbody","thead","tfoot","caption"];e.DEFAULT_HTML_ELEMENT_WHITELIST=Ct,e.DEFAULT_HTML_ATTR_WHITELIST=jt,e.DEFAULT_BODY_FLAGS=St,e.DEFAULT_WIKI_FLAGS=$t,e.HTML_SKIP_HTML=Oe,e.HTML_SKIP_STYLE=Ee,e.HTML_SKIP_IMAGES=Le,e.HTML_SKIP_LINKS=Ae,e.HTML_EXPAND_TABS=16,e.HTML_SAFELINK=Me,e.HTML_TOC=De,e.HTML_HARD_WRAP=Ie,e.HTML_USE_XHTML=Ne,e.HTML_ESCAPE=Re,e.HTML_ALLOW_ELEMENT_WHITELIST=qe,e.MKDEXT_NO_INTRA_EMPHASIS=Se,e.MKDEXT_TABLES=$e,e.MKDEXT_FENCED_CODE=je,e.MKDEXT_AUTOLINK=8,e.MKDEXT_STRIKETHROUGH=16,e.MKDEXT_SPACE_HEADERS=Ce,e.MKDEXT_SUPERSCRIPT=128,e.MKDEXT_LAX_SPACING=Te,e.MKDEXT_NO_EMAIL_AUTOLINK=512,e.SD_AUTOLINK_SHORT_DOMAINS=we,e.MKDA_NOT_AUTOLINK=_e,e.MKDA_NORMAL=ye,e.MKDA_EMAIL=xe,"function"==typeof define&&define("snuownd",[],e)}((()=>{const e="undefined"!=typeof window?window:"undefined"!=typeof globalThis?globalThis:{};return e.SnuOwnd||(e.SnuOwnd={}),e.SnuOwnd})());const I=("undefined"!=typeof window?window:"undefined"!=typeof globalThis?globalThis:{}).SnuOwnd.getParser(),N=e=>I.render((e||"").replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<")).replace(/href="\//g,'href="https://www.reddit.com/'),R=chrome.runtime,q=a.Z.div`
  width: 320px;
  padding: ${d.md};
  font-size: 14px;
`,U=a.Z.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${d.sm};
  gap: ${d.sm};
`,P=a.Z.div`
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.01em;
`,F=a.Z.div`
  font-size: 11px;
  color: var(--text-secondary);
  margin: -6px 0 8px;
`,Z=(0,a.Z)(_)`
  padding: ${d.xs} ${d.md};
  margin: ${d.sm} 0;
`,z=a.Z.a`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px 10px 12px;
  margin: 0 -10px;
  min-height: 36px;
  border-radius: ${c.md};
  text-decoration: none;
  color: var(--link);
  cursor: pointer;
  transition: background-color 0.12s ease;

  & + & {
    border-top: 1px solid var(--border);
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  &:hover {
    background: var(--bg-surface-hover);
    text-decoration: none;
    & .sub-chev { color: var(--text-secondary); }
  }
  &:active {
    background: var(--bg-surface-hover);
    filter: brightness(0.95);
  }
  &:focus-visible {
    outline: 2px solid var(--input-focus);
    outline-offset: -2px;
  }
`,B=a.Z.span`
  flex: 1;
  min-width: 0;
  font-size: 0.95em;
  color: var(--link);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,H=a.Z.span`
  flex-shrink: 0;
  font-size: 18px;
  line-height: 1;
  margin-left: 2px;
  color: var(--text-muted);
  transition: color 0.12s ease;
`,K=a.Z.span`
  min-width: 2em;
  text-align: center;
  padding: 2px 8px;
  border-radius: ${c.pill};
  background: var(--bg-surface-hover);
  color: var(--text-secondary);
  font-size: 0.82em;
  font-weight: 600;
`,W=(0,a.Z)(K)`
  background: var(--accent);
  color: var(--text-on-accent);
`,G=a.Z.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
`,X=a.Z.span`
  color: ${e=>e.active?"var(--text-primary)":"var(--text-secondary)"};
  cursor: pointer;
  font-size: 0.92em;
`,Y=a.Z.label`
  position: relative;
  display: inline-block;
  width: 42px;
  height: 22px;
  & input { opacity: 0; width: 0; height: 0; }
  & .slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--button-bg);
    border: 1px solid var(--border);
    border-radius: ${c.pill};
    transition: 0.2s;
  }
  & .slider::before {
    position: absolute;
    content: '';
    height: 16px;
    width: 16px;
    left: 2px;
    top: 2px;
    background: var(--text-primary);
    border-radius: 50%;
    transition: 0.2s;
  }
  & input:checked + .slider {
    background: var(--accent);
    border-color: var(--accent);
  }
  & input:checked + .slider::before {
    transform: translateX(20px);
    background: var(--text-on-accent);
  }
`,V=(0,a.Z)(_)`
  padding: ${d.sm} ${d.md};
  background: var(--note-bg);
  border-color: var(--border-light);
  position: relative;
  & h4 {
    margin: 0 0 4px 0;
    font-size: 0.92em;
    color: var(--text-primary);
  }
  & .md-body { font-size: 0.85em; color: var(--text-primary); }
  & .dismiss {
    position: absolute;
    top: 6px;
    right: 8px;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 2px 6px;
    &:hover { color: var(--text-primary); }
  }
`,J=a.Z.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 18px;
  padding: 2px 4px;
  line-height: 1;
  transition: color 0.15s ease;
  &:hover { color: var(--text-primary); }
`,Q=a.Z.div`
  border-top: 1px solid var(--border);
  margin-top: 4px;
  padding-top: 6px;
  text-align: right;
`,ee=a.Z.a`
  font-size: 0.78em;
  text-decoration: none;
  transition: color 0.15s ease;
  ${e=>e.$enabled?i.iv`
          color: var(--link);
          cursor: pointer;
          &:hover {
            color: var(--link-hover);
            text-decoration: underline;
          }
        `:i.iv`
          color: var(--text-muted);
          cursor: default;
          opacity: 0.55;
          &:hover {
            text-decoration: none;
          }
        `}
`,te=a.Z.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: ${d.sm};
`,ne=a.Z.button`
  padding: 7px 10px;
  background: var(--accent);
  color: var(--text-on-accent);
  border: 0;
  border-radius: ${c.md};
  font-size: 0.88em;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover {
    background: var(--accent-hover);
  }
`,re=a.Z.div`
  display: flex;
  justify-content: space-between;
  margin: 8px 0 2px;
`,se=a.Z.a`
  font-size: 0.78em;
  color: var(--text-muted);
  text-decoration: none;
  cursor: pointer;
  &:hover {
    color: var(--text-secondary);
    text-decoration: underline;
  }
`;function oe({type:e,checked:t,onToggle:n}){return(0,r.jsxs)(G,{children:[(0,r.jsxs)(X,{active:t,onClick:()=>n(!t),children:[t?"subscribed":"subscribe"," to ",e]}),(0,r.jsxs)(Y,{children:[(0,r.jsx)("input",{type:"checkbox",checked:t,onChange:e=>n(e.target.checked)}),(0,r.jsx)("span",{className:"slider"})]})]})}function ae({thing:e,isUser:t,unseenCount:n,totalStr:s,url:o}){const a=n>0?W:K;return(0,r.jsxs)(z,{href:o,target:"_blank",onClick:n=>{n.preventDefault(),chrome.storage.sync.get(void 0,(n=>{(0,x.Sy)(n,e,t),(0,x.lY)(e).catch((()=>{})),(0,x.FB)(n).then((()=>{chrome.tabs.create({url:o}),window.close()}))}))},children:[(0,r.jsx)(B,{children:e}),(0,r.jsx)(a,{children:s??n}),(0,r.jsx)(H,{className:"sub-chev","aria-hidden":"true",children:"›"})]})}function ie({message:e,onDismiss:t}){return(0,r.jsxs)(V,{children:[(0,r.jsx)("button",{className:"dismiss",onClick:t,"aria-label":"Dismiss",children:"×"}),(0,r.jsx)("h4",{children:e.title}),(0,r.jsx)("div",{className:"md-body",dangerouslySetInnerHTML:{__html:N(e.body_markdown)}})]})}(0,o.createRoot)(document.getElementById("root")).render((0,r.jsx)((function(){const[e,t]=(0,s.useState)(null),[n,o]=(0,s.useState)(null),[a,i]=(0,s.useState)(void 0),[c,u]=(0,s.useState)(!1),[h,f]=(0,s.useState)(null),[g,$]=(0,s.useState)(null),[j,C]=(0,s.useState)(!1),[T,O]=(0,s.useState)(null),[E,A]=(0,s.useState)(!1),[M,I]=(0,s.useState)(null),[N,z]=(0,s.useState)(null),[B,H]=(0,s.useState)("");(0,s.useEffect)((()=>{const e=()=>{try{chrome.runtime.sendMessage({action:"get-diag-status"},(e=>{chrome.runtime.lastError||!e||e.error||H(((e,t=Date.now())=>{const n=[];return e.lastCheck&&n.push(`last check ${y(1e3*e.lastCheck)}`),e.backoffRemainingMs&&e.backoffRemainingMs>0?n.push(`paused ~${Math.max(1,Math.ceil(e.backoffRemainingMs/6e4))} min (Reddit rate limit)`):e.nextCheck&&e.nextCheck>t&&n.push(`next ~${y(e.nextCheck)}`),n.join(" · ")})(e))}))}catch{}};e();const t=window.setInterval(e,3e4);return()=>window.clearInterval(t)}),[]);const[K,W]=(0,s.useState)(null),[G,X]=(0,s.useState)(null),[Y,le]=(0,s.useState)(0),[ce,de]=(0,s.useState)(null),[ue,he]=(0,s.useState)("dark"),[fe,ge]=(0,s.useState)(!1),pe=(0,s.useCallback)((()=>{o(null),i(void 0),f(null),$(null),C(!1),O(null),A(!1),I(null),z(null),chrome.storage.local.get(["error_status"],(e=>{t(e?.error_status||null)})),(0,x.b1)((async(e,t)=>{const n=e.other;delete e.other,o({users:e,otherUnseen:n.unseen,otherTotal:Object.keys(t.other_subscriptions).length}),chrome.tabs.query({url:["*://*.reddit.com/*"]},(e=>{const t=e.filter((e=>{try{const t=new URL(e.url).hostname;return"www.reddit.com"===t||"old.reddit.com"===t}catch{return!1}}));e.length>0&&0===t.length&&chrome.storage.local.get(["subdomain_warning_shown"],(e=>{e.subdomain_warning_shown||(u(!0),chrome.storage.local.set({subdomain_warning_shown:!0}))}))})),chrome.storage.local.get(["last_logged_in_user"],(e=>{i(e?.last_logged_in_user||null)}))})),chrome.storage.sync.get(void 0,(e=>{f(e),chrome.tabs.query({active:!0,currentWindow:!0},(e=>{const t=e[0]?.url;if(t){const[e,n]=(0,l.NS)(t);$({url:t,postID:e,commentID:n})}}))})),(0,x.VU)().then((e=>le(e))),chrome.storage.local.get(["pending_post_progress"],(e=>{const t=e?.pending_post_progress;de(t&&"number"==typeof t.total?{processed:t.processed||0,total:t.total}:null)})),(0,D.aL)().finally((()=>{(0,D.FZ)().then((e=>{W(e[0]||null)})),(0,D.fX)().then((e=>{e&&chrome.storage.local.get(["dismissed_update_notice_version"],(t=>{if(t.dismissed_update_notice_version!==e){X(e);try{R.requestUpdateCheck?.((()=>{R.lastError}))}catch{}}}))}))}))}),[]);(0,s.useEffect)((()=>{pe()}),[pe]),(0,s.useEffect)((()=>{const e=(e,t)=>{if("local"===t&&e.pending_post_lookups){const t=e.pending_post_lookups.newValue||[];le(t.length),0===t.length&&de(null)}if("local"===t&&e.pending_post_progress){const t=e.pending_post_progress.newValue;de(t&&"number"==typeof t.total?{processed:t.processed||0,total:t.total}:null)}};return chrome.storage.onChanged.addListener(e),()=>chrome.storage.onChanged.removeListener(e)}),[]),(0,s.useEffect)((()=>{chrome.storage.local.get([p],(e=>{const t=e[p]||"auto",n="auto"===t?window.matchMedia?.("(prefers-color-scheme: light)").matches?"light":"dark":t;he(n)}))}),[]),(0,s.useEffect)((()=>{chrome.storage.local.get(["dismissed_release_version"],(e=>{"0.0.5.23"!==e.dismissed_release_version&&ge(!0)}))}),[]);const me=()=>{A(!0),chrome.runtime.sendMessage({action:"try-reconnect"},(e=>{e?.success?(I({success:!0,user:e.user}),setTimeout((()=>pe()),1e3)):(A(!1),z(e?.indeterminate?`Reddit isn't answering the login check${e.reason?` (${e.reason})`:""}. If you're already logged in, open www.reddit.com in a tab and try again.`:"Could not detect user. Make sure you are logged in to Reddit."))}))},be=(e,t,n)=>{(t?x.Pd:x.VQ)(e,(async()=>{chrome.runtime.sendMessage({action:"update-badge"}),t&&await((e,t)=>{let n=0;return t.match(/^https:\/\/www.reveddit.com/)&&(n=1),chrome.storage.sync.get(void 0,(function(t){(0,S.v0)().then((r=>L([e],"other",!1,r,t,n,{})))}))})(e,n),pe()}))},ve=[];h&&g&&(g.commentID&&ve.push({id:g.commentID,type:"comment",subscribed:g.commentID in(h.other_subscriptions||{})}),g.postID&&ve.push({id:g.postID,type:"post",subscribed:g.postID in(h.other_subscriptions||{})}));const ke=(n?.otherUnseen.length??0)>0||Object.values(n?.users??{}).some((e=>e.unseen.length>0)),we=chrome.runtime.getURL("src/history.html");let _e=chrome.runtime.getURL("src/other.html");n&&n.otherUnseen.length&&(_e=`https://www.reveddit.com/info?id=${n.otherUnseen.join(",")}&removal_status=all`);let ye=null;if(void 0!==a&&n)if(a){const e=n.users[a],t=e?e.unseen:[];ye=(0,r.jsx)(ae,{thing:a,isUser:!0,unseenCount:t.length,url:we})}else ye=(0,r.jsx)("div",{children:M?.success?(0,r.jsxs)(k,{variant:"success",children:["✓ Connected as ",M.user,"!"]}):(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(k,{variant:"info",children:N||"Log in to www.reddit.com or old.reddit.com to get started."}),(0,r.jsx)(v,{onClick:me,disabled:E,children:E?"Connecting...":"Connect"})]})});return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(b,{}),(0,r.jsxs)(q,{children:[(0,r.jsxs)(U,{children:[(0,r.jsx)(P,{children:"reveddit real-time"}),(0,r.jsx)(J,{onClick:()=>{const e="dark"===ue?"light":"dark";var t;he(e),t=e,chrome.storage.local.set({[p]:t}),m(t)},"aria-label":"Toggle theme",children:"dark"===ue?"🌙":"☀️"})]}),B&&(0,r.jsx)(F,{children:B}),G&&(0,r.jsxs)(V,{children:[(0,r.jsx)("button",{className:"dismiss",onClick:()=>{G&&chrome.storage.local.set({dismissed_update_notice_version:G}),X(null)},"aria-label":"Dismiss",children:"×"}),(0,r.jsxs)("h4",{children:["Update available: v",G]}),(0,r.jsxs)("div",{className:"md-body",children:["Your browser hasn't installed it yet. Open chrome://extensions, turn on Developer mode (top right), and press Update."," ",(0,r.jsx)("a",{href:"https://www.reveddit.com/update-help",target:"_blank",rel:"noopener noreferrer",children:"Still stuck?"})]})]}),fe&&{version:"0.0.5.23",description:"fix silent failed checks and the check interval resetting to one minute"}&&(0,r.jsxs)(V,{children:[(0,r.jsx)("button",{className:"dismiss",onClick:()=>{ge(!1),chrome.storage.local.set({dismissed_release_version:"0.0.5.23"})},"aria-label":"Dismiss",children:"×"}),(0,r.jsxs)("h4",{children:["v","0.0.5.23"," released"]}),(0,r.jsx)("div",{className:"md-body",children:"fix silent failed checks and the check interval resetting to one minute"})]}),K&&(0,r.jsx)(ie,{message:K,onDismiss:()=>{if(!K)return;const e=K.id;(0,D.XO)(e).then((()=>(0,D.FZ)())).then((e=>{W(e[0]||null)}))}}),e&&(a||"logged_in_view_unavailable"===e)&&(0,r.jsx)("div",{children:T?(0,r.jsx)(k,{variant:"success",children:"✓ Connected!"}):"rate_limited"===e?(0,r.jsx)(k,{variant:"warning",children:"⚠ Reddit is rate-limiting requests. Monitoring will resume automatically."}):"reddit_blocked"===e?(0,r.jsx)(k,{variant:"warning",children:"⚠ Reddit blocked the extension's last request (HTTP 403). It keeps retrying; opening a www.reddit.com tab usually clears this."}):"profile_publicly_empty"===e?(0,r.jsx)(k,{variant:"warning",children:"⚠ Your profile appears empty to logged-out users — possibly a shadowban. Removal alerts are paused. You can appeal at reddit.com/appeals."}):"public_view_unavailable"===e?(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(k,{variant:"warning",children:"⚠ Removal monitoring is paused — Reddit's public view isn't loading. Opening a www.reddit.com tab usually restores it."}),(0,r.jsx)(v,{onClick:()=>chrome.tabs.create({url:"https://www.reddit.com/",active:!0}),children:"Open www.reddit.com"})]}):"absent_verify_unavailable"===e?(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(k,{variant:"warning",children:"⚠ Reddit isn't letting the extension confirm whether missing content was removed, so some removals can't be detected. Keeping a www.reddit.com tab open usually restores this. If it keeps up, copy the diagnostic log from options and report it."}),(0,r.jsx)(v,{onClick:()=>chrome.tabs.create({url:"https://www.reddit.com/",active:!0}),children:"Open www.reddit.com"})]}):"logged_in_view_unavailable"===e?(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(k,{variant:"warning",children:"⚠ Reddit isn't answering the extension's login check, so monitoring may be paused. Opening a www.reddit.com tab usually restores it. If this keeps up, copy the diagnostic log from options and report it."}),(0,r.jsx)(v,{onClick:()=>chrome.tabs.create({url:"https://www.reddit.com/",active:!0}),children:"Open www.reddit.com"})]}):(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(k,{variant:"warning",children:!1===T?"⚠ Still disconnected. Try logging into Reddit again.":"⚠ Session may be disconnected."}),(0,r.jsx)(v,{onClick:()=>{C(!0),chrome.runtime.sendMessage({action:"store-reddit-cookies"}),setTimeout((()=>{chrome.runtime.sendMessage({action:"try-reconnect"},(e=>{e?.success?(O(!0),setTimeout((()=>pe()),1e3)):(C(!1),O(!1))}))}),500)},disabled:j,children:j?"Checking...":"Reconnect"})]})}),ve.length>0&&(0,r.jsx)(_,{style:{padding:`${d.sm} ${d.md}`,margin:`${d.sm} 0`},children:ve.map((e=>(0,r.jsx)(oe,{type:e.type,checked:e.subscribed,onToggle:t=>be(e.id,t,g.url)},e.id)))}),c&&(0,r.jsx)(k,{variant:"warning",children:"⚠ User monitoring requires www.reddit.com or old.reddit.com"}),Y>0&&(0,r.jsxs)(k,{variant:"info",children:[(0,r.jsx)(w,{}),ce&&ce.total>0?`Scanning ${Math.min(ce.processed,ce.total)} of ${ce.total} posts for removals…`:`Scanning ${Y} posts for removals…`]}),(0,r.jsxs)(Z,{children:[ye,n&&(0,r.jsx)(ae,{thing:"other",isUser:!1,unseenCount:n.otherUnseen.length,totalStr:`${n.otherUnseen.length} / ${n.otherTotal}`,url:_e}),(0,r.jsx)(Q,{children:(0,r.jsx)(ee,{href:"#",$enabled:ke,"aria-disabled":!ke,onClick:e=>{e.preventDefault(),ke&&(0,x.aL)().then((()=>pe()))},children:"mark all as seen"})})]}),(0,r.jsxs)(te,{children:[(0,r.jsx)(ne,{onClick:()=>{chrome.tabs.create({url:we}),window.close()},children:"History"}),(0,r.jsx)(ne,{onClick:()=>(0,l.Fm)(),children:"Options"})]}),(0,r.jsxs)(re,{children:[(0,r.jsx)(se,{href:"#",onClick:e=>{e.preventDefault(),(0,l.sc)({notificationId:"test",title:"Reveddit test notification",message:(0,l.Vk)((h||{}).options||{})})},children:"send a test notification"}),(0,r.jsx)(se,{href:"https://github.com/reveddit/real-time-extension/issues",target:"_blank",rel:"noopener noreferrer",children:"feedback"})]})]})]})}),{}))},9217:(e,t,n)=>{n.d(t,{v0:()=>ce,my:()=>U});var r=n(7785),s=n(3150),o=n.n(s),a=n(4007),i=n(7163),l=n(2811),c=n(1005);const d=/\bthing-id="(t[13]_[a-z0-9]+)"/g,u=/<shreddit-comment-action-row\b([^>]*)>/g,h=/<shreddit-feed-load-more-observer\b[^>]*\bcursor="([^"]+)"/g,f=/([\w-]+)="([^"]*)"/g,g=/have any (posts|comments) yet/i,p=/js_challenge/,m=e=>parseInt(e.split("_")[1],36),b={comments:{path:"comments",partialFeed:"profile_comments-more-posts",typePrefix:"t1_"},posts:{path:"submitted",partialFeed:"profile_posts-more-posts",typePrefix:"t3_"}},v=(e,t,n)=>`${l.oG}/svc/shreddit/profiles/${b[t].partialFeed}/new/?sort=new&after=${encodeURIComponent(n)}&name=${encodeURIComponent(e)}&feedLength=8`,k=(e,t)=>{const n=new Set,r=[],s=e=>{e.startsWith(t)&&!n.has(e)&&(n.add(e),r.push(e))};for(const t of e.matchAll(d))s(t[1]);const o=new Map;for(const t of e.matchAll(u)){const e={};for(const n of t[1].matchAll(f))e[n[1]]=n[2];const n=e["comment-id"];n&&(s(n),o.set(n,{...void 0!==e.score&&""!==e.score&&{score:Number(e.score)},...e.permalink&&{permalink:e.permalink}}))}const a=[...e.matchAll(h)].map((e=>e[1]));return{ids:r,rows:o,cursor:a.length?a[a.length-1]:null,emptyState:g.test(e),hasItems:r.length>0}},w=/awaiting moderator approval/i,_=/(removed by (the )?moderators?|removed by reddit|reddit'?s? spam filters?|deleted by (the )?(author|user)|banned from this community|community is private)/i,y=e=>`${l.oG}/comments/${e.replace(/^t3_/,"")}/`,x=e=>{const t=e.match(/<shreddit-post\b([^>]*)>/);if(!t)return{status:"unknown"};const n={};for(const e of t[1].matchAll(f))n[e[1]]=e[2];const r=n["created-timestamp"]?Date.parse(n["created-timestamp"]):NaN,s={...n.author&&{author:n.author},...n["post-title"]&&{title:n["post-title"]},...Number.isFinite(r)&&{created_utc:Math.floor(r/1e3)},...n["subreddit-name"]&&{subreddit:n["subreddit-name"]}},o=t.index||0,a=e.indexOf("</shreddit-post>",o),i=e.slice(o,-1===a?Math.min(e.length,o+1e5):a);return w.test(i)?{status:"held",...s}:_.test(i)?{status:"removed",...s}:{status:"live",...s}},S=/<shreddit-comment(?![\w-])([^>]*)>/g,$=/<shreddit-comment-tree\b|<shreddit-post\b/,j=(e,t,n="removed")=>{for(const n of e.matchAll(S)){const e={};for(const t of n[1].matchAll(f))e[t[1]]=t[2];if((e.thingId||e["thing-id"])===t){const t=e.author;return t?t.startsWith("[")?"removed":"live":"unknown"}}return $.test(e)?n:"unknown"},C=(e,t)=>{if(!p.test(e))return null;const n=(0,c.kX)(),r=(()=>{try{return e.match(new RegExp(n.solutionRegex))}catch{return null}})();if(!r||void 0===r[1])return null;const s=t=>{const n=e.match(new RegExp(`<input[^>]*\\bname="${t}"[^>]*\\bvalue="([^"]*)"`));return n?n[1]:null};let o=null,a=null;for(const e of n.tokenFields)if(a=s(e),null!==a){o=e;break}if(null===o||null===a)return null;const i=r[1]+r[1],l=t.includes("?")?"&":"?";let d=`${t}${l}solution=${encodeURIComponent(i)}&js_challenge=1&${o}=${encodeURIComponent(a)}`;const u=s("jsc_orig_r");return null!==u&&(d+=`&jsc_orig_r=${encodeURIComponent(u)}`),d},T=e=>{const t=(e.match(/<title[^>]*>([^<]{0,60})/)||[])[1]||"",n=(e.match(/<link\b[^>]*\brel="canonical"[^>]*>/)||[])[0],r=n&&(n.match(/\bhref="(?:https?:\/\/[^/"]+)?([^"]{0,80})"/)||[])[1],s=/Prove your humanity/i.test(t)?" wall=captcha":"";return`bytes=${e.length} challenge=${p.test(e)?1:0} scaffold=${$.test(e)?1:0} title=${JSON.stringify(t)}`+(void 0!==r?` canonical=${JSON.stringify(r)}`:"")+s},O=async(e,t,n,r,s)=>{const{typePrefix:o}=b[t],a=new Map,i={items:a,valid:!1,emptyState:!1,floor:1/0},c=((e,t)=>`${l.oG}/user/${encodeURIComponent(e)}/${b[t].path}/?sort=new`)(e,t);let d=await n(c),u=k(d,o);if(!u.hasItems&&!u.emptyState){const e=C(d,c);if(!e)return i;if(d=await n(e),u=k(d,o),!u.hasItems&&!u.emptyState)return i}let h=0;const f=t=>{for(const n of t.ids){a.set(n,{name:n,author:e,...t.rows.get(n)});const r=m(n);Number.isFinite(r)&&(h=0===h?r:Math.min(h,r))}};f(u);let g=u.cursor;null!==g&&0===h&&(h=(e=>{try{const t=m(atob(e));return Number.isFinite(t)?t:null}catch{return null}})(g)??1/0);let p=0;for(;null!==g&&p<s&&r.some((e=>e<h));){const r=await n(v(e,t,g)),s=k(r,o);if(!s.hasItems)break;f(s),g=s.cursor,p++}return null===g&&(h=0),{items:a,valid:!0,emptyState:u.emptyState,floor:h}};var E=n(9947),L=n(5302);const A="dev_simulate_endpoint_deprecation",M=()=>o().storage.local.get({[A]:null}).then((async e=>{const t=e[A],n=await(0,L.Hg)(L.t);return(0,L.Mh)(null===t?null:!!t,n,false)})).catch((()=>false)),D=async e=>{if(await M())throw new Error(`${e} request failed: 403 (legacy endpoints disabled)`)},I=new Set([429]),N=e=>{const t=e.message.match(/request failed: (\d+)/);if(!t)return;const n=Number(t[1]);I.has(n)?(0,E.jn)("rate_limited"):403!==n||e.message.includes("legacy endpoints disabled")||(0,E.jn)("reddit_blocked"),429===n&&((0,a.Sq)("ratelimit","[reveddit] 429 from Reddit — scheduling monitoring backoff"),(0,r.g7)())},R="https://www.reddit.com/",q="none",U=(e,t,n=!1,r=!1,s=[],o="",a={})=>{const i={id:e,raw_json:1};r&&(i.quarantined_subreddits=s.join(","));const l="?"+Object.keys(i).map((e=>`${e}=${i[e]}`)).join("&");return te("api/info",l,t,n,r,e,o,a)},P={credentials:"omit",headers:{"Accept-Language":"en"}},F=async e=>{const t=await fetch(e,P);if(!t.ok)throw new Error(`www.reddit.com request failed: ${t.status}`);return t.text()},Z=async()=>{let e=[];try{"undefined"!=typeof chrome&&chrome.tabs&&(e=await o().tabs.query({url:["https://www.reddit.com/*"]}))}catch{}const t=e.find((e=>null!=e.id&&!e.discarded))||e.find((e=>null!=e.id));if(!t)return{fetchHtml:F,viaTab:!1};let n=!0,r=!0;return{fetchHtml:async e=>{if(n)try{const n=await o().tabs.sendMessage(t.id,{action:"fetch-www-profile-public",url:e});if(n&&n.success&&"string"==typeof n.html)return n.html;throw new Error(n?.error||"content-script www fetch failed")}catch(e){n=!1,(0,a.Sq)("feed","[reveddit] content-script www fetch failed, trying next fetch mode:",String(e?.message||e))}if(r)try{return await(async(e,t)=>{const n=o().scripting||"undefined"!=typeof chrome&&chrome.scripting;if(!n)throw new Error("scripting API unavailable");const r=await n.executeScript({target:{tabId:e},func:async(e,t)=>{try{const n="undefined"!=typeof content&&content&&"function"==typeof content.fetch?content:null,r=await(n?n.fetch(e,t):fetch(e,t));return{ok:r.ok,status:r.status,text:r.ok?await r.text():""}}catch(e){return{ok:!1,status:0,text:"",err:String(e)}}},args:[t,P]}),s=r&&r[0]&&r[0].result;if(!s||"string"!=typeof s.text)throw new Error("executeScript fetch returned no result");if(!s.ok)throw new Error(`www.reddit.com request failed: ${s.status}${s.err?` (${s.err})`:""}`);return s.text})(t.id,e)}catch(e){if(/request failed: \d/.test(String(e?.message)))throw e;r=!1,(0,a.Sq)("feed","[reveddit] executeScript fetch unavailable, using background fetch:",String(e?.message||e))}return F(e)},viaTab:!0}},z="profile_publicly_empty";let B="removed";const H="www_detect_consecutive_failures",K="www_post_page_verdicts",W="www_absent_item_verdicts",G="absent_verify_consecutive_failures",X="dev_disable_absent_verification",Y=async(e,t,n)=>{let r;if(e.startsWith("t3_"))r=y(e);else if(t.permalink)r=l.oG+t.permalink;else{if(!t.link_id)return"unknown";s=e,o=t.link_id,r=`${l.oG}/comments/${o.replace(/^t3_/,"")}/comment/${s.replace(/^t1_/,"")}/`}var s,o;const i=t=>e.startsWith("t3_")?x(t).status:j(t,e,B);if(!e.startsWith("t3_")&&t.permalink){const r=((e,t)=>{const n=e.match(/^\/r\/([^/]+)\/comments\/([^/]+)\//);return n?`${l.oG}/svc/shreddit/comments/r/${n[1]}/${n[2]}/${t.replace(/^t1_/,"")}?render-mode=partial`:null})(t.permalink,e);if(r)try{const t=await n(r),s=j(t,e,B);if("unknown"!==s)return s;(0,a.Sq)("verify",`[reveddit] ${e} svc partial unreadable, trying full page`,T(t))}catch(t){N(t),(0,a.Sq)("verify",`[reveddit] ${e} svc partial fetch failed, trying full page:`,String(t?.message||t))}}let c=await n(r),d=i(c);if("unknown"===d){const t=T(c),s=C(c,r);s?(c=await n(s),d=i(c),"unknown"===d&&(0,a.Sq)("verify",`[reveddit] ${e} page unreadable after challenge solve`,`${t} → ${T(c)}`)):(0,a.Sq)("verify",`[reveddit] ${e} page unreadable (no solvable challenge)`,t)}return d},V={commentsById:i.sT,postByPath:i.Gi},J=async(e,t,n,s=[])=>{const i=Date.now();let l={};try{l=(await o().storage.local.get({[W]:{}}))[W]||{}}catch{}const c={},d=[];let u=0;for(const t of e){const e=l[t];if(e){const n="live"===e.v?216e5:"removed"===e.v?72e5:18e5;if(i-e.t<n){"unknown"===e.v?u++:c[t]=e.v;continue}}d.push(t)}const h=null!==(f=await(0,r.ax)())&&f<36e5?{maxPerCycle:Math.max(3,Math.floor(10)),delayMs:1e3}:{maxPerCycle:20,delayMs:500};var f;d.length&&h.maxPerCycle<20&&(0,a.Sq)("ratelimit",`[reveddit] absent verification budget reduced to ${h.maxPerCycle}/cycle (recent 429)`);let g=0,p=0;for(const e of d){if(g>=h.maxPerCycle)break;g>0&&await new Promise((e=>setTimeout(e,h.delayMs))),g++;try{const r=await Y(e,t[e]||{},n);(0,a.Sq)("verify",`[reveddit] absent item verdict ${e}: ${r}`),l[e]={v:r,t:i},"unknown"!==r&&(c[e]=r,p++)}catch(t){(0,a.Sq)("verify",`[reveddit] absent item verification failed ${e}:`,String(t?.message||t)),N(t)}}let m=g>0;if(await(async(e,t,n,r,s={})=>{const o=e.filter((e=>!(e in n)));if(!o.length||await M())return;const i=o.filter((e=>e.startsWith("t1_"))),l=o.filter((e=>e.startsWith("t3_")));if(i.length)try{const e=[...i,...t],n=await V.commentsById(e,null),s={};for(const e of n||[])e?.data?.name&&(s[e.data.name]=e.data);const o=t.some((e=>s[e]));(0,a.C1)("legacy",`[reveddit] legacy comment tiebreak: ${Object.keys(s).length}/${e.length} rendered, canaryRendered=${o}`);for(const e of i){const t=s[e];t&&t.author?r(e,(0,E.Go)(t)?"removed":"live"):!t&&o&&r(e,"removed")}}catch(e){(0,a.Sq)("legacy","[reveddit] legacy comment tiebreak failed:",String(e?.message||e))}let c=0;for(const e of l){if(c>=5)break;c>0&&await new Promise((e=>setTimeout(e,500))),c++;try{const t=s[e]?.permalink,n=t&&t.startsWith("/r/")?t:"/comments/"+e.substring(3)+"/",o=await V.postByPath(n);o&&!o.error?r(e,o.is_removed?"removed":"live"):(0,a.Sq)("legacy",`[reveddit] legacy post tiebreak ${e}: no page${o?.error?` (${o.error})`:""}`)}catch(t){(0,a.Sq)("legacy",`[reveddit] legacy post tiebreak failed ${e}:`,String(t?.message||t))}}})(e,s,c,((e,t)=>{c[e]=t,l[e]={v:t,t:i},m=!0,p++}),t),(g>0||u>0)&&(0,a.C1)("verify",`[reveddit] absent verify: ${g} fetched, ${u} paced (recent unknown), ${p} resolved this cycle`),g>0&&await(async e=>{try{if(e)return void await o().storage.local.remove(G);const t=await o().storage.local.get({[G]:0}),n=Number(t[G]||0)+1;await o().storage.local.set({[G]:n}),(0,a.C1)("verify",`[reveddit] absent verification resolved nothing — consecutive cycles: ${n}`),n>=5&&(0,E.jn)("absent_verify_unavailable")}catch{}})(p>0),m){const e=Object.entries(l).sort(((e,t)=>t[1].t-e[1].t));l=Object.fromEntries(e.slice(0,200));try{await o().storage.local.set({[W]:l})}catch{}}return c},Q=async e=>{try{if(e)return void await o().storage.local.remove(H);const t=await o().storage.local.get({[H]:0}),n=Number(t[H]||0)+1;await o().storage.local.set({[H]:n}),(0,a.Sq)("feed",`[reveddit] www public-view lookup failed — consecutive failures: ${n}`),n>=5&&(0,E.jn)("public_view_unavailable")}catch{}},ee=async(e,t,n={})=>{const{fetchHtml:s,viaTab:i}=await Z(),l=await(async(e,t,n=[],r=4)=>{const s=e=>n.filter((t=>t.startsWith(e))).map(m).filter(Number.isFinite);try{const[n,o]=await Promise.all([O(e,"comments",t,s("t1_"),r),O(e,"posts",t,s("t3_"),r)]),a=new Map([...n.items,...o.items]);return{items:a,valid:n.valid&&o.valid,emptyProfile:n.emptyState&&o.emptyState&&0===a.size,coverage:{t1:n.floor,t3:o.floor}}}catch(e){return{items:new Map,valid:!1,emptyProfile:!1,coverage:{t1:1/0,t3:1/0},error:String(e?.message||e)}}})(t,s,e);if(!l.valid)throw await Q(!1),new Error(`www profile lookup invalid: ${l.error||"unrecognized response"}`);if(await Q(!0),l.emptyProfile&&e.length){if(e.some((e=>{const t=n[e];return!t||!(t.quarantine||t.over_18||"private"===t.subreddit_type)})))throw(0,a.Sq)("feed",`[reveddit] public profile for ${t} is empty - possible shadowban`),(0,E.jn)(z),new Error(z);(0,a.Sq)("feed",`[reveddit] public profile for ${t} is empty, but every item is NSFW, quarantined or private; not treated as a shadowban`)}const c=await(async(e,t,n,r,s)=>{if(!s)return{};const a=Math.floor(Date.now()/1e3),i=Date.now();let l={};try{l=(await o().storage.local.get({[K]:{}}))[K]||{}}catch{}const c={},d=[];for(const r of e){if(!r.startsWith("t3_")||!t.has(r))continue;const e=n[r];if(e&&(!1===e.is_robot_indexable||e.removed_by_category))continue;const s=e?.created_utc,o=void 0!==s&&a-s>172800,u=l[r];(!o||u&&"live"!==u.v||e?.known_removed)&&(u&&i-u.t<72e5?c[r]=u.v:d.push(r))}if(d.length){await Promise.all(d.map((async e=>{try{const t=await r(y(e)),n=x(t);c[e]=n.status,console.log(`[reveddit] post page verdict ${e}: ${n.status} (html ${t.length}b)`),"unknown"!==n.status&&(l[e]={v:n.status,t:i})}catch(t){console.log(`[reveddit] post page fetch failed ${e}:`,String(t?.message||t)),c[e]="unknown"}})));const e=Object.entries(l).sort(((e,t)=>t[1].t-e[1].t));l=Object.fromEntries(e.slice(0,50));try{await o().storage.local.set({[K]:l})}catch{}}return c})(e,new Set(l.items.keys()),n,s,i),d=await o().storage.local.get({[X]:null}).then((async e=>{const t=e[X],n=await(0,L.Hg)(L.Yy);return(0,L.Mh)(null===t?null:!!t,n,!1)})).catch((()=>!1)),u=await(async()=>"on"===await(0,L.Hg)(L.Hl).catch((()=>"auto")))();B=u?"unknown":"removed";const h=e.filter((e=>{if(d)return!1;if(l.items.has(e))return!1;const t=n[e]||{};if(e.startsWith("t3_")&&(!1===t.is_robot_indexable||t.removed_by_category))return!1;if(t.quarantine||t.over_18||"private"===t.subreddit_type)return!1;const r=e.startsWith("t3_")?l.coverage.t3:l.coverage.t1,s=m(e);return Number.isFinite(s)&&s>=r})),f=[...l.items.keys()].filter((e=>e.startsWith("t1_"))).slice(0,3),g=h.length?await J(h,n,s,f):{},p=[];for(const r of e){const e=n[r]||{},s={locked:!!e.locked,...void 0!==e.created_utc&&{created_utc:e.created_utc},_public_view:!0},o=r.startsWith("t3_"),a=o&&(!1===e.is_robot_indexable||!!e.removed_by_category),i=l.items.get(r);if(i)if(o)if(a)p.push({data:{...i,is_robot_indexable:!1,...s}});else{const t=c[r];"held"===t||"removed"===t?p.push({data:{...i,is_robot_indexable:!1,...s}}):e.known_removed&&"live"!==t||p.push({data:{...i,is_robot_indexable:!0,...s}})}else p.push({data:{...i,...s}});else{const n=o?l.coverage.t3:l.coverage.t1,i=m(r),c=Number.isFinite(i)&&i>=n,h=e.quarantine||e.over_18||"private"===e.subreddit_type,f={data:{name:r,author:"[deleted]",body:"[removed]",is_robot_indexable:!1,...s}};if(a)p.push(f);else if(c&&h)p.push(f);else if(c)if(d)u||p.push(f);else{const e=g[r];"live"===e?p.push({data:{name:r,author:t,is_robot_indexable:!0,...s}}):"removed"!==e&&"held"!==e||p.push(f)}}}const b=e.filter((e=>e.startsWith("t3_")));b.length&&(0,r.B4)(b).catch((()=>{}));const v=p.filter((e=>"[deleted]"===e.data.author||!1===e.data.is_robot_indexable)).length;return(0,a.Sq)("feed",`[reveddit] www lookup ${t}: ${e.length} requested, ${p.length} returned (${v} removed, ${e.length-p.length} omitted/uncovered), coverage t1=${l.coverage.t1} t3=${l.coverage.t3}, verdicts=${JSON.stringify(c)}, absentVerdicts=${JSON.stringify(g)}, via=${i?"tab":"background"}`),p},te=(e,t,n,s=!1,o=!1,a="",l="",c={})=>{const d=(Array.isArray(a)?a:String(a).split(",")).filter((e=>e)),u=()=>((e,t,n,s,o,a)=>D("legacy reddit HTML").then((()=>(0,i.sT)(a,r.VO))).then((e=>((0,r.fT)(),e))).catch((a=>{console.log("old.reddit.com HTML fallback failed:",a.message);const i=R+e+".json"+t,l={credentials:"omit"};return D("www.reddit.com JSON").then((()=>fetch(i,l))).then((e=>{if(e.ok)return(0,r.fT)(),e.json();throw new Error(`www.reddit.com request failed: ${e.status}`)})).then((e=>{if(e&&e.data&&e.data.children)return e.data.children;throw new Error("Invalid data format from www.reddit.com")})).catch((r=>{if(console.log("www.reddit.com JSON failed:",r.message),n&&"none"!==n)return console.log("Trying OAuth fallback"),oe(...de(e,t,n,o),s);throw N(r),a}))})))(e,t,n,s,o,a);return d.length?l?ee(d,l,c).then((e=>((0,r.fT)(),e))).catch((e=>{if(e.message===z)throw e;return console.log("www.reddit.com public profile lookup failed:",e.message),u()})):(async(e,t,n)=>{const r=t&&t!==q;r||await ue();const s=[];for(let o=0;o<e.length;o+=100){const a=`?id=${e.slice(o,o+100).join(",")}&raw_json=1`;let i;if(r)i=await oe(...de("api/info",a,t,!1),n);else{const e=await fetch(`${R}api/info.json${a}`,{credentials:"include",cache:"reload",headers:{"Accept-Language":"en"}});if(!e.ok)throw new Error(`authenticated api/info request failed: ${e.status}`);const t=await e.json();i=t?.data?.children}if(!Array.isArray(i))throw new Error("authenticated api/info returned no children");s.push(...i),o+100<e.length&&await new Promise((e=>setTimeout(e,1e3)))}return s})(d,n,s).then((e=>((0,r.fT)(),e))).catch((e=>(console.log("authenticated api/info lookup failed:",e.message),u()))):u()},ne={name:"reddit_session",url:"https://reddit.com"},re=["name","value","domain","path","secure","httpOnly","storeId"],se=(e,t="https://reddit.com")=>{if(!e)return e;const n=Object.keys(e).filter((e=>re.includes(e))).reduce(((t,n)=>({...t,[n]:e[n]})),{});return n.url=t,n},oe=async(e,t,n=!1)=>{let r;await o().cookies.set({domain:"reddit.com",url:"https://reddit.com",name:"_options",value:"{%22pref_quarantine_optin%22:true}"}),n&&(r=se(await o().cookies.get(ne)),r&&await o().cookies.remove(ne)),t||(t={credentials:"omit"}),t.cache="reload",t.headers||(t.headers={}),"en"!==t.headers["Accept-Language"]&&(t.headers["Accept-Language"]="en");const s=fetch(e,t).then(ae).then(ie).catch(console.log);return r&&await o().cookies.set(r),s},ae=e=>{if(!e.ok)throw Error(e.statusText);return e.json()},ie=e=>{if(e&&e.user&&e.user.items)return e;if(!e||!e.data||!e.data.children)throw Error("reddit data is not defined");return e.data.children},le=e=>{if(!e||!e.access_token)throw Error("access token is not defined");return e.access_token},ce=(e=!1)=>(0,r.FW)(((t,n,r)=>{let s="SEw1uvRd6kxFEw";if(r.custom_clientid){if(s=r.custom_clientid,"testing"===s)return q}else if(!e)return q;const o={headers:{Authorization:`Basic ${btoa(`${s}:`)}`,"Content-Type":"application/x-www-form-urlencoded; charset=utf-8"},method:"POST",body:`grant_type=${encodeURIComponent("https://oauth.reddit.com/grants/installed_client")}&device_id=DO_NOT_TRACK_THIS_DEVICE`};return fetch("https://www.reddit.com/api/v1/access_token",o).then(ae).then(le).then((e=>({headers:{Authorization:`bearer ${e}`,"Accept-Language":"en"}}))).catch(console.log)})),de=(e,t,n,r)=>{if(n&&n!==q){let s="https://oauth.reddit.com/",o=e+t;r&&(s="https://cred2.reveddit.com/",o+="&give_it_to_me=1");return[s+o,n]}{let n=(r?"https://wred.reveddit.com/":R)+e;return"api/info"===e&&(n+=".json"),n+=t,[n]}},ue=()=>new Promise((e=>{chrome.storage.local.get(["stored_reddit_cookie_objects"],(t=>{const n=t.stored_reddit_cookie_objects;Array.isArray(n)&&n.length?Promise.all(n.map((e=>o().cookies.set(e).catch((()=>null))))).then((()=>e(!0))).catch((()=>e(!1))):e(!1)}))}))},7785:(e,t,n)=>{n.d(t,{$6:()=>D,B4:()=>F,BG:()=>v,Ci:()=>d,FB:()=>C,FW:()=>R,JQ:()=>i,Nd:()=>L,Pd:()=>T,Sy:()=>j,U$:()=>c,UU:()=>a,VO:()=>U,VQ:()=>O,VU:()=>P,WK:()=>f,YU:()=>h,Yn:()=>l,aL:()=>k,ax:()=>X,b1:()=>E,bE:()=>$,e4:()=>N,fT:()=>Y,g7:()=>G,lY:()=>x,nb:()=>u,oL:()=>y,oX:()=>I,oZ:()=>g,qN:()=>_,tN:()=>b});var r=n(9947),s=n(3150),o=n.n(s);const a=2,i=130,l=100,c=1,d=2,u=3,h=4,f=5,g=6,p={changes:[],removed:{},approved:{},locked:{},unlocked:{}},m=(e,t,n)=>n?e+"_u_"+t:e+"_"+t,b=(e,t=!0)=>{const n={};return Object.keys(p).forEach((r=>{n[r]=m(r,e,t)})),n},v=(e,t)=>t?"oldest_date_u_"+e:"oldest_date_"+e,k=()=>o().storage.sync.get(null).then((e=>(Object.keys(e.user_subscriptions).forEach((t=>{j(e,t,!0)})),j(e,"other",!1),C(e)))),w="pending_notifications",_=e=>o().storage.local.get({[w]:{}}).then((t=>(t[w]||{})[e]||null)),y=(e,t)=>o().storage.local.get({[w]:{}}).then((n=>{const r=n[w]||{};return r[e]={thing:e,...t},o().storage.local.set({[w]:r})})),x=e=>o().storage.local.get({[w]:{}}).then((t=>{const n=t[w]||{};return delete n[e],o().storage.local.set({[w]:n})})),S="notification_log",$=e=>o().storage.local.get({[S]:[]}).then((t=>{const n=t[S]||[];return n.push(e),n.length>50&&n.splice(0,n.length-50),o().storage.local.set({[S]:n})})),j=(e,t,n)=>{const r=b(t,n);delete r.changes;const s=[];Object.values(r).forEach((e=>{s.push(e)})),s.forEach((t=>{Object.values(e[t]).forEach((e=>{e.u=!1}))}))},C=e=>o().storage.sync.set(e).then((()=>o().runtime.sendMessage({action:"update-badge"}))).catch((()=>{})),T=(e,t=(()=>{}))=>{const n="other_subscriptions";chrome.storage.sync.get(n,(s=>{s[n][e]={t:Math.floor((new Date).getTime()/1e3)};const o=(0,r.N5)(s[n],100,"t");chrome.storage.sync.set({[n]:o},t)}))},O=(e,t=(()=>{}))=>{const n="other_subscriptions",r=b("other",!1);delete r.changes,chrome.storage.sync.get(Object.values(r).concat(n),(s=>{delete s[n][e],Object.values(r).forEach((t=>{e in s[t]&&delete s[t][e]})),chrome.storage.sync.set(s,(()=>{chrome.runtime.sendMessage({action:"update-badge"}).then(t).catch((()=>t()))}))}))},E=e=>{chrome.storage.sync.get(void 0,(t=>{t&&t.user_subscriptions||((t=t||{}).user_subscriptions=t.user_subscriptions||{},t.other_subscriptions=t.other_subscriptions||{},t.options=t.options||{removal_status:{track:!0},lock_status:{track:!0}});const n=Object.keys(t.user_subscriptions),r={};n.forEach((e=>{r[e]=M(e,!0,t)})),r.other=M("other",!1,t),e(r,t)}))},L=e=>{chrome.storage.sync.get(void 0,(t=>{const n=Object.keys(t.user_subscriptions),r={};n.forEach((e=>{r[e]=A(e,!0,t)})),r.other=A("other",!1,t),e(r)}))},A=(e,t,n)=>M(e,t,n).unseen,M=(e,t,n)=>{const r=n.options||{},s=r.removal_status||{},o=r.lock_status||{},a=!1!==s.track,i=!1!==o.track,l={},c={};let d=[];const u=b(e,t);return a&&d.push(u.removed,u.approved),i&&d.push(u.locked,u.unlocked),d.forEach((e=>{const t=n[e]||{};Object.keys(t).forEach((e=>{const n=t[e];n&&n.u?l[e]=!0:c[e]=!0}))})),{unseen:Object.keys(l),seen:Object.keys(c)}},D=(e,t)=>{const n=m("items",e,t);return o().storage.local.get({[n]:{}}).then((e=>e[n]))},I=(e,t,n)=>{const s=m("items",t,n);return chrome.storage.local.get({[s]:{}},(t=>{const n=t[s];Object.keys(e).forEach((t=>{n[t]=e[t]}));let a=n;return Object.keys(n).length>1e3&&(a=(0,r.N5)(n,1e3,"o")),o().storage.local.set({[s]:a})}))},N=e=>{const t=(e||{}).removal_status||{},n=(e||{}).lock_status||{};return{removal:!1!==t.track&&!1!==t.notify,lock:!1!==n.track&&!1!==n.notify}},R=e=>o().storage.sync.get(["user_subscriptions","other_subscriptions","options"]).then((t=>{const n=t||{},r=Object.keys(n.user_subscriptions||{}),s=Object.keys(n.other_subscriptions||{}),o=n.options;return e(r,s,o)})).catch((t=>(console.log(t),e([],[],{})))),q="pending_post_lookups",U=async e=>{const t=await B(),n=e.filter((e=>(t[e]||0)<z));if(0===n.length)return;const r=(await o().storage.local.get({[q]:[]}))[q],s=[...new Set([...r,...n])];await o().storage.local.set({[q]:s})},P=async()=>(await o().storage.local.get({[q]:[]}))[q].length,F=async e=>{const t=(await o().storage.local.get({[q]:[]}))[q],n=new Set(e),r=t.filter((e=>!n.has(e)));await o().storage.local.set({[q]:r})},Z="pending_post_attempts",z=3,B=async()=>(await o().storage.local.get({[Z]:{}}))[Z],H="rate_limit_until",K="rate_limit_level",W="rate_limit_last_hit",G=async()=>{const e=(await o().storage.local.get({[K]:0}))[K]||0,t=Math.min(12e4*Math.pow(2,e),18e5);return await o().storage.local.set({[H]:Date.now()+t,[K]:e+1,[W]:Date.now()}),t},X=async()=>{const e=(await o().storage.local.get({[W]:0}))[W]||0;return e>0?Math.max(0,Date.now()-e):null},Y=async()=>{const e=await o().storage.local.get({[K]:0,[H]:0});(e[K]||e[H])&&await o().storage.local.set({[H]:0,[K]:0})}}},s={};function o(e){var t=s[e];if(void 0!==t)return t.exports;var n=s[e]={exports:{}};return r[e].call(n.exports,n,n.exports,o),n.exports}o.m=r,e=[],o.O=(t,n,r,s)=>{if(!n){var a=1/0;for(d=0;d<e.length;d++){for(var[n,r,s]=e[d],i=!0,l=0;l<n.length;l++)(!1&s||a>=s)&&Object.keys(o.O).every((e=>o.O[e](n[l])))?n.splice(l--,1):(i=!1,s<a&&(a=s));if(i){e.splice(d--,1);var c=r();void 0!==c&&(t=c)}}return t}s=s||0;for(var d=e.length;d>0&&e[d-1][2]>s;d--)e[d]=e[d-1];e[d]=[n,r,s]},o.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return o.d(t,{a:t}),t},n=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,o.t=function(e,r){if(1&r&&(e=this(e)),8&r)return e;if("object"==typeof e&&e){if(4&r&&e.__esModule)return e;if(16&r&&"function"==typeof e.then)return e}var s=Object.create(null);o.r(s);var a={};t=t||[null,n({}),n([]),n(n)];for(var i=2&r&&e;"object"==typeof i&&!~t.indexOf(i);i=n(i))Object.getOwnPropertyNames(i).forEach((t=>a[t]=()=>e[t]));return a.default=()=>e,o.d(s,a),s},o.d=(e,t)=>{for(var n in t)o.o(t,n)&&!o.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:t[n]})},o.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),o.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},o.j=42,o.p="",(()=>{o.b=document.baseURI||self.location.href;var e={42:0,646:0};o.O.j=t=>0===e[t];var t=(t,n)=>{var r,s,[a,i,l]=n,c=0;if(a.some((t=>0!==e[t]))){for(r in i)o.o(i,r)&&(o.m[r]=i[r]);if(l)var d=l(o)}for(t&&t(n);c<a.length;c++)s=a[c],o.o(e,s)&&e[s]&&e[s][0](),e[s]=0;return o.O(d)},n=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];n.forEach(t.bind(null,0)),n.push=t.bind(null,n.push.bind(n))})();var a=o.O(void 0,[736],(()=>o(1195)));a=o.O(a)})();