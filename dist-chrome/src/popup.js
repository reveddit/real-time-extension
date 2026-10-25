(()=>{"use strict";var e,t,r,n={5392:(e,t,r)=>{r.d(t,{Vm:()=>i,jd:()=>a});const n="7e9b27126097f51ae6c9cd5b049af34891da6ba6",s=/^[0-9a-f]{40}$/;let o=null;const a=e=>"string"==typeof e&&s.test(e)?e:"",i=e=>{o=a(e)||n}},1005:(e,t,r)=>{r.d(t,{PY:()=>c,kX:()=>i,ms:()=>l});var n=r(6267);const s={tokenFields:["jsc_token","token"],solutionRegex:'await\\(async e=>e\\+e\\)\\("([^"]*)"\\)'},o=/^[a-z][a-z0-9_]{0,31}$/;let a={...s};const i=()=>a,l=e=>{const t={};if(e&&"object"==typeof e){const r=(0,n.l)(e.token_fields,o,8);if(r.length&&(t.tokenFields=r),"string"==typeof e.solution_regex&&e.solution_regex.length<=200)try{new RegExp(e.solution_regex),/\(/.test(e.solution_regex)&&(t.solutionRegex=e.solution_regex)}catch{}}return t},c=e=>{a={tokenFields:e.tokenFields?.length?e.tokenFields:s.tokenFields,solutionRegex:e.solutionRegex||s.solutionRegex}}},9947:(e,t,r)=>{r.d(t,{C3:()=>h,D4:()=>k,Fm:()=>_,Go:()=>f,LC:()=>u,Me:()=>g,N5:()=>m,NS:()=>a,QT:()=>w,SV:()=>S,Vk:()=>y,jn:()=>o,pB:()=>v,sc:()=>x});var n=r(7785);const s="action",o=e=>{try{chrome[s].setBadgeText({text:"!"}),chrome[s].setBadgeBackgroundColor({color:"#ffcc00"}),e&&chrome.storage.local.set({error_status:e})}catch{}},a=e=>{const t=e.replace(/https:\/\/[^/]*re(ve)?ddit.com/,"");return c(t)},i=/^\/(v|r|user)\/([^/]+)\/comments\/([^/]+)\/[^/]*(?:\/([^/?&#]+))?/,l=/^\/(?:user|y|u)\/([^/?&#]+)\/?/,c=e=>{let t,r,n,s;const o=e.match(i),a=e.match(l);if(o){"user"===o[1]?n=o[2]:s=o[2],o[3]&&(t="t3_"+o[3]),o[4]&&(r="t1_"+o[4])}else a&&(n=a[1]);return[t,r,n,s]},d=e=>e.replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/[^\S\n]+/g," ").substr(0,1e4),u=e=>!(!e.removal_reason&&!(e=>!0===e.removed||!0===e.spam||Boolean(e.banned_by))(e))||(h(e.name)?f(e):p(e)),h=e=>"t1"===e.substr(0,2),f=e=>"["===e.author.replace(/\\/g,"")[0]&&"["===(e.body||"").replace(/\\/g,"")[0],g=e=>h(e.name)?(e=>"[deleted]"===(e.body||"").replace(/\\/g,"")&&"[deleted]"===e.author.replace(/\\/g,""))(e):(e=>!1===e.is_robot_indexable&&"[deleted]"===e.author.replace(/\\/g,""))(e),p=e=>!1===e.is_robot_indexable,m=(e,t,r)=>{const n=b(e,r).slice(0,t),s={};return n.forEach((e=>{s[e[0]]=e[1]})),s},b=(e,t)=>{let r=Object.keys(e).map((t=>[t,e[t]]));return r.sort(((e,r)=>r[1][t]-e[1][t])),r};class v{constructor(e,t,r,n=null){n?(this.c=n.c,this.u=n.u,void 0!==n.p&&(this.p=n.p)):(this.c=e,this.u=t,void 0!==r&&(this.p=r))}getCreatedUTC(){return this.c}getUnseen(){return this.u}getPostID(){return this.p}}class w{constructor({id:e=null,observed_utc:t=null,change_type:r=null,seen_count:n=null,object:s=null}){s?(this.i=s.i,this.o=s.o,this.g=s.g,this.n=s.n):(this.i=e,this.o=t,this.g=r,this.n=n)}getID(){return this.i}getObservedUTC(){return this.o}getChangeTypeInternal(){return this.g}getChangeType(){switch(this.g){case n.U$:return"mod removed";case n.oZ:return"user deleted";case n.Ci:return"approved";case n.nb:return"locked";case n.YU:return"unlocked";case n.WK:return"edited"}}getSeenCount(){return this.n}}class k{constructor({item:e=null,observed_utc:t=null,object:r=null}){if(r)this.t=r.t,this.o=r.o,this.c=r.c,this.n=r.n||0,this.r=r.r||0,void 0!==r.p&&(this.p=r.p),void 0!==r.b&&(this.b=r.b),void 0!==r.s&&(this.s=r.s);else{let r="";e&&h(e.name)?r=d(e.body||""):e&&(r=e.title||""),this.t=r,this.o=t,this.c=e?e.created_utc:0,this.n=0,this.r=0,e&&h(e.name)&&e.link_id&&(this.p=e.link_id),e&&!h(e.name)&&e.selftext&&(this.b=d(e.selftext)),e&&e.subreddit&&(this.s=e.subreddit)}}setText(e){this.t=d(e)}getText(){return this.t}getBody(){return this.b}getSubreddit(){return this.s}getObservedUTC(){return this.o}getCreatedUTC(){return this.c}resetSeenCount(){this.n=0}getSeenCount(){return this.n}getPostID(){return this.p}incrementRemovalCount(){return void 0===this.r&&(this.r=0),this.r+=1,this.r}resetRemovalCount(){this.r=0}getRemovalCount(){return this.r||0}incrementSeenCount(){return void 0===this.n&&(this.n=0),this.n+=1,this.n}}function _(){"undefined"!=typeof navigator&&/Android/i.test(navigator.userAgent)?(chrome.tabs.create({url:chrome.runtime.getURL("src/options.html"),active:!0}),window.close()):chrome.runtime.openOptionsPage?(chrome.runtime.openOptionsPage(),window.close()):window.open(chrome.runtime.getURL("/src/options.html"))}const y=e=>{const t=(0,n.e4)(e),r="If you see this, notifications are working.";return t.removal||t.lock?t.removal?t.lock?r:r+" Note: notifications for locked content are turned off in options.":r+" Note: notifications for removed content are turned off in options.":"If you see this, notifications are working, but notifications for removed and locked content are turned off in options."},x=({notificationId:e,title:t,message:r})=>(console.log(`createNotification called: ${e} - ${t} - ${r}`),new Promise((n=>{if(location.protocol.match(/^http/))console.log("Sending notification via message passing"),chrome.runtime.sendMessage({action:"create-notification",options:{notificationId:e,title:t,message:r}}),n(!0);else{console.log("Creating notification directly with chrome.notifications.create");const s=String(e),o=s.includes("|")?s:`${s}|${Date.now()}`,a={type:"basic",iconUrl:chrome.runtime.getURL("icons/128.png"),title:t,message:r},i=()=>{try{const e=self,n=e&&e.registration?e.registration:null;n&&n.showNotification&&n.showNotification(t,{body:r,icon:chrome.runtime.getURL("icons/128.png"),data:s})}catch(e){console.log("Fallback showNotification failed:",e)}};try{chrome.notifications.create(o,a,(()=>{chrome.runtime?.lastError?(console.log("chrome.notifications.create error:",chrome.runtime.lastError.message),i(),n(!1)):n(!0)}))}catch(e){console.log("Error creating notification:",e),i(),n(!1)}}}))),S=()=>{location.protocol.match(/^http/)?chrome.runtime.sendMessage({action:"update-badge"}).catch((()=>{})):(0,n.Nd)((e=>{let t=0;Object.values(e).forEach((e=>{t+=e.length}));let r=t.toString();0==t&&(r=""),chrome[s].setBadgeBackgroundColor({color:"red"}),chrome[s].setBadgeText({text:r})}))}},4007:(e,t,r)=>{r.d(t,{C1:()=>x,Sq:()=>y});var n=r(3150),s=r.n(n);const o=new Set(["cycle","auth","feed","ratelimit","news","ui"]),a="diag_log_v1",i="diag_summary_v2",l=36e5;let c=[],d=!1,u=[];const h=new Set;let f=!1,g=null;const p=e=>Math.floor(e/l),m=e=>`${i}_${p(e)}`,b=e=>{const t=[],r=p(e)-36+1;for(let e=r-24;e<r;e++)t.push(`${i}_${e}`);return t},v=(e,t)=>{const r=(p(t)-36+1)*l;let n=e.filter((e=>e.t>=r));return n.length>12e3&&(n=n.slice(n.length-12e3)),n},w=e=>((e,t,r)=>{let n=e.length>t?e.slice(e.length-t):e;for(;n.length>1&&JSON.stringify(n).length>r;)n=n.slice(Math.max(1,Math.floor(n.length/10)));return n})(e,600,131072),k=()=>{f&&!g&&(g=setTimeout((()=>{g=null,(()=>{const e=Date.now(),t={};if(d&&(t[a]=c,d=!1),h.size){const e={};for(const t of u){const r=m(t.t);h.has(r)&&(e[r]=e[r]||[]).push(t)}for(const r of h)t[r]=e[r]||[];h.clear()}const r=[];Object.keys(t).length&&r.push(s().storage.local.set(t)),r.push(s().storage.local.remove(b(e))),Promise.all(r).then((()=>{})).catch((()=>{}))})()}),2e3))},_=(e,t,r,n)=>{void 0===n?console.log(r):console.log(r,n);const s={t:Date.now(),a:t,m:r};if(void 0!==n)try{const e="string"==typeof n?n:JSON.stringify(n);s.d=e.length>500?e.slice(0,500)+"…":e}catch{s.d=String(n)}"summary"===e?(u.push(s),u=v(u,s.t),h.add(m(s.t))):(c.push(s),c=w(c),d=!0),k()},y=(e,t,r)=>_(o.has(e)?"summary":"detail",e,t,r),x=(e,t,r)=>_("summary",e,t,r)},9244:(e,t,r)=>{r.d(t,{KP:()=>i,P4:()=>c,nV:()=>l});var n=r(6267);const s={commentIdAttributes:["thingId","thing-id"],postIdAttributes:["id"]},o=/^[A-Za-z][A-Za-z0-9_-]{0,39}$/;let a={commentIdAttributes:[...s.commentIdAttributes],postIdAttributes:[...s.postIdAttributes]};const i=()=>a,l=e=>{const t={},r=e=>(0,n.l)(e,o,8);if(e&&"object"==typeof e){const n=r(e.comment_id_attributes??e.commentIdAttributes),s=r(e.post_id_attributes??e.postIdAttributes);n.length&&(t.commentIdAttributes=n),s.length&&(t.postIdAttributes=s)}return t},c=e=>{const t=(e,t)=>[...e||[],...t.filter((t=>!(e||[]).includes(t)))];a={commentIdAttributes:t(e.commentIdAttributes,s.commentIdAttributes),postIdAttributes:t(e.postIdAttributes,s.postIdAttributes)}}},6267:(e,t,r)=>{r.d(t,{l:()=>n});const n=(e,t,r)=>Array.isArray(e)?[...new Set(e.filter((e=>"string"==typeof e&&t.test(e))))].slice(0,r):[]},5302:(e,t,r)=>{r.d(t,{CL:()=>C,FZ:()=>S,Hg:()=>$,Hl:()=>m,Mh:()=>E,XO:()=>w,Yy:()=>p,_9:()=>A,aL:()=>M,fX:()=>x,kh:()=>j,t:()=>g,un:()=>f});var n=r(4007),s=r(1005),o=r(9244),a=r(67),i=r(5392),l=r(6267);const c="news_cache",d="news_read_ids",u="news_fetch_failed_at",h=["www.reddit.com","old.reddit.com"],f="www.reddit.com",g="legacyOldReddit",p="absentPageVerification",m="absentUnverifiedIsUnknown",b=["chrome","edge","firefox"],v=()=>new Promise((e=>{try{chrome.storage.local.get([c],(t=>{e(t&&t[c]||null)}))}catch{e(null)}})),w=e=>new Promise((t=>{try{chrome.storage.local.get([d],(r=>{const n=r&&r[d]||{};n[e]=!0,chrome.storage.local.set({[d]:n},(()=>t()))}))}catch{t()}})),k=/^\d+(\.\d+){0,3}$/,_=e=>"string"==typeof e&&k.test(e),y=(e,t)=>{const r=e.split(".").map((e=>parseInt(e,10)||0)),n=t.split(".").map((e=>parseInt(e,10)||0));for(let e=0;e<Math.max(r.length,n.length);e++){const t=(r[e]||0)-(n[e]||0);if(0!==t)return t}return 0},x=async()=>{try{const e=await v(),t=e?.feed,r=chrome.runtime.getManifest().version;if(t&&((e,t,r,n,s=432e6)=>{if(!_(t))return!1;const o=Number(r);return!(!o||!Number.isFinite(o))&&!(y(e,t)>=0)&&n-o>=s})(r,t.latest_version,t.latest_version_published_utc,Date.now()))return t.latest_version}catch{}return null},S=async()=>{const[e,t]=await Promise.all([v(),new Promise((e=>{try{chrome.storage.local.get([d],(t=>{e(t&&t[d]||{})}))}catch{e({})}}))]),r=e?.feed||{messages:[]};let n="";try{n=chrome.runtime.getManifest().version}catch{}const s=n?((e,t)=>e.filter((e=>!(_(e.min_version)&&y(t,e.min_version)<0||_(e.max_version)&&y(t,e.max_version)>0))))(r.messages,n):r.messages;return s.filter((e=>!t[e.id])).sort(((e,t)=>(t.published_utc||0)-(e.published_utc||0)))},$=async e=>{const t=await v(),r=t?.feed?.options?.mechanisms?.[e];return"on"===r||"off"===r?r:"auto"},j=async()=>{const e=await v(),t=e?.feed?.options?.legacy_host;return h.includes(t||"")?t:f},C=async()=>{const e=await v();return(0,a.sl)(e?.feed?.options?.www_route_order)},T=/^[A-Za-z0-9_.-]{1,64}$/,O=e=>(0,l.l)(e,T,4),A="capability_rest",E=(e,t,r)=>null!==e?e:"off"===t||"on"!==t&&r,M=async(e={})=>{const t=await v(),r=Date.now(),l=t?r-t.lastFetched:1/0;if(!e.force&&l>=0&&l<36e5)return;const d=()=>chrome.storage.local.set({[u]:r});if(!e.force){const e=await new Promise((e=>{try{chrome.storage.local.get([u],(t=>e(Number(t?.[u])||0)))}catch{e(0)}}));if(r-e>=0&&r-e<6e5)return}try{const e=await fetch("https://www.reveddit.com/extension-news.json",{credentials:"omit",cache:"no-cache"});if(!e.ok)return(0,n.Sq)("news",`[reveddit] news fetch failed: ${e.status}`),void d();const l=await e.json();if(!l||!Array.isArray(l.messages))return;const u={},f=l.options?.mechanisms;if(f&&"object"==typeof f)for(const[e,t]of Object.entries(f))"auto"!==t&&"on"!==t&&"off"!==t||(u[e]=t);const p=(0,s.ms)(l.options?.challenge),m=(0,a.sl)(l.options?.www_route_order),v=(0,o.nV)(l.options?.markup),w=O(l.options?.login_cookies),k=(0,i.jd)(l.options?.publicmodlogs_feed),y={},x=l.store_versions;if(x&&"object"==typeof x)for(const e of b)_(x[e])&&(y[e]=x[e]);const S={messages:l.messages.filter((e=>e&&"string"==typeof e.id&&"string"==typeof e.title&&"string"==typeof e.body_markdown)).map((e=>({id:e.id,published_utc:Number(e.published_utc)||0,title:e.title,body_markdown:e.body_markdown,severity:e.severity,..._(e.min_version)?{min_version:e.min_version}:{},..._(e.max_version)?{max_version:e.max_version}:{}}))),options:{mechanisms:u,...h.includes(l.options?.legacy_host)?{legacy_host:l.options.legacy_host}:{},...Object.keys(p).length?{challenge:p}:{},...Object.keys(m).length?{www_route_order:m}:{},...Object.keys(v).length?{markup:v}:{},...w.length?{login_cookies:w}:{},...k?{publicmodlogs_feed:k}:{}},..._(l.latest_version)?{latest_version:l.latest_version}:{},...Number(l.latest_version_published_utc)>0?{latest_version_published_utc:Number(l.latest_version_published_utc)}:{},...Object.keys(y).length?{store_versions:y}:{}},$={feed:S,lastFetched:r};chrome.storage.local.set({[c]:$}),(0,s.PY)(p),(0,o.P4)(v),(0,i.Vm)(k);const j=t?.feed?.options;!t||j?.legacy_host===S.options?.legacy_host&&j?.mechanisms?.[g]===u[g]||chrome.storage.local.get([A],(e=>{const t={...e?.[A]||{}};(t.legacy||t.legacy_info)&&(delete t.legacy,delete t.legacy_info,chrome.storage.local.set({[A]:t}))})),(0,n.Sq)("news",`[reveddit] news fetch ok: ${S.messages.length} messages, mechanisms=${JSON.stringify(u)}`+(Object.keys(m).length?`, www_route_order=${JSON.stringify(m)}`:"")+(Object.keys(v).length?`, markup=${JSON.stringify(v)}`:"")+(k?", publicmodlogs_feed set":""))}catch(e){(0,n.Sq)("news",`[reveddit] news fetch error: ${String(e?.message||e)}`),d()}}},2811:(e,t,r)=>{r.d(t,{F_:()=>s,Sd:()=>h,iN:()=>d,kv:()=>u,l8:()=>o,m1:()=>l,oG:()=>a,qk:()=>c});var n=r(5302);const s=async e=>{const t=e.getReader();for(;!(await t.read()).done;);},o=e=>/request failed: 429\b/.test(String(e?.message||e)),a="https://www.reddit.com",i="rv_legacy=1",l=(e,t)=>e+t+(t.includes("?")?"&":"?")+i,c=(new RegExp("[?&]"+i+"(&|$)"),async()=>{try{return"https://"+await(0,n.kh)()}catch{return"https://"+n.un}}),d={headers:{"Accept-Language":"en",Cookie:"over18=1;","User-Agent":"extension"},cache:"reload"},u=async(e,t={},r=15e3)=>{const n=new AbortController,s=setTimeout((()=>n.abort()),r);try{return await fetch(e,{...t,signal:n.signal})}finally{clearTimeout(s)}};class h{constructor(e){this.errors={},this.url=e}addError(e){this.errors[e]=(this.errors[e]||0)+1}printErrors(){for(const[e,t]of Object.entries(this.errors))t&&console.error("ERROR:","["+e+"]",t,"times on",this.url)}}},7163:(e,t,r)=>{r.d(t,{Gi:()=>q,sT:()=>N});var n=r(2811),s=r(1763),o=r(36),a=r(8145);const i=new o.Z,l=new s.aw,c=e=>i.turndown(l.parseFromString(e,"text/html"));i.addRule("listItem",{filter:"li",replacement:function(e,t,r){e=e.replace(/^\n+/,"").replace(/\n+$/,"\n").replace(/\n/gm,"\n    ");let n=r.bulletListMarker+" ";const s=t.parentNode;if("OL"===s.nodeName){const e=s.getAttribute("start"),r=Array.prototype.indexOf.call(s.children,t);n=(e?Number(e)+r:r+1)+". "}return n+e+(t.nextSibling&&!/\n$/.test(e)?"\n":"")}});class d{constructor(e,t,r){this.field=e,this.attribute=t,this.func=r}}const u=[new d("name","data-fullname"),new d("subreddit","data-subreddit"),new d("author_fullname","data-author-fullname"),new d("author","data-author"),new d("permalink","data-permalink"),new d("subreddit_id","data-subreddit-fullname"),new d("created_utc","data-timestamp",(e=>Number(e)/1e3)),new d("url","data-url"),new d("domain","data-domain"),new d("num_comments","data-comments-count",Number),new d("num_crossposts","data-num-crossposts",Number),new d("score","data-score",Number)],h="https://www.reddit.com",f=e=>new RegExp("(^|\\s)"+e+"($|\\s)"),g=f("controversial"),p=f("stickied"),m=f("sticky-pinned"),b=(f("locked"),{removal_reason:null,quarantine:!1,score:1,locked:!1,distinguished:null,stickied:!1}),v={...b},w={...b,link_flair_text:null,author_flair_text:null,pinned:!1,removed_by_category:null,is_robot_indexable:!0},k={locked:f("locked")},_=e=>"t1"===e.substr(0,2),y=e=>"t3"===e.substr(0,2);class x extends n.Sd{constructor(e){super(e),this.items=[],this.ids_set=new Set,this.quarantined_subs=new Set,this.url=e}element(e){const t={};for(const r of u){let n=e.getAttribute(r.attribute);null!==n&&(r.func&&(n=r.func(n)),t[r.field]=n)}const r=e.getAttribute("class");for(const[e,n]of Object.entries(k))t[e]=!!r.match(n);if(!t.name&&t.permalink){const e=t.permalink.split("/").filter(Boolean);e.length>=5&&"comments"===e[2]&&(e.length>=6?t.name="t1_"+e[5]:t.name="t3_"+e[3])}if(t.name){if(t.id=t.name.replace(/^t[0-9]_/,""),_(t.name)){if(t.permalink){const e=t.permalink.split("/");t.link_id="t3_"+e[4],t.link_permalink=h+e.slice(0,6).join("/")+"/"}else this.addError("permalink_undefined");t.stickied=!!r.match(p),r.match(g)?t.controversiality=1:t.controversiality=0}else t.pinned=!!r.match(m);this.items.push(t),this.ids_set.add(t.name)}else this.addError("name_undefined")}addQuarantinedSub(e){this.quarantined_subs.add(e)}fillInDefaultValues(){for(const e of this.items){if(!e.name)continue;let t;if(_(e.name)?t=v:y(e.name)&&(t=w),t)for(const[r,n]of Object.entries(t))r in e||(e[r]=n)}}}class S{constructor(e){this.itemsObj=e,this.items=e.items,this.last={}}element(e){if(this.items.length){const e=this.items[this.items.length-1];e?this.last=e:this.itemsObj.addError("last_undefined")}}}class $ extends S{constructor(e,t,r){super(e),this.field_name=t,this.value=r}element(e,t=this.value){super.element(e),this.last[this.field_name]=t}}class j extends S{constructor(e,t){super(e),this.field_name=t}element(e){super.element(e),this.last[this.field_name]||(this.last[this.field_name]="");const t=[...e.attributes].map((([e,t])=>` ${e}="${t}"`)).join("");if(this.last[this.field_name]+=`<${e.tagName}${t}>`,"br"!==e.tagName)try{e.onEndTag((e=>{this.last[this.field_name]+=`</${e.name}>`}))}catch{this.itemsObj.addError("NO_END_TAG_"+e.tagName)}}text({text:e}){this.last[this.field_name]+=e}}class C extends S{constructor(e){super(e)}element(e){super.element(e),this.last.author="[deleted]"}}class T extends ${constructor(e){super(e,"score")}element(e){super.element(e,Number(e.getAttribute("title")))}}const O=f("live-timestamp"),A=f("edited-timestamp");class E extends S{element(e){super.element(e);const t=e.getAttribute("class");let r;if(t.match(O)?r="created_utc":t.match(A)&&(r="edited"),r){const t=(n=e.getAttribute("datetime"),new Date(n).getTime()/1e3);t&&(this.last[r]=t)}var n}}class M extends n.Sd{constructor(e){super(e),this.is_removed=!1}element(e){this.is_removed=!0}}class I extends n.Sd{constructor(e){super(e),this.count=0}element(e){this.count++}}class L extends n.Sd{constructor(e){super(e),this.author=""}text({text:e}){this.author+=e.trim()}}class D extends n.Sd{constructor(){super(...arguments),this.count=0}element(e){this.count++}}const N=async(e,t=null)=>{const r=Array.isArray(e)?e:e.split(","),s=r.filter((e=>e.startsWith("t3_"))),{items:o}=await(async e=>{const t=Array.isArray(e)?e:e.split(","),r=await(0,n.qk)()+"/api/info?id="+t.join(","),s=await fetch(r,{...n.iN,credentials:"omit"});if(!s.ok)throw new Error(`legacy reddit HTML request failed: ${s.status}`);const o=new x(r),i=new D(r),l=(new a.G).on("#siteTable",i).on("#siteTable .thing",o).on("#siteTable .thing.deleted",new C(o)).on("#siteTable .thing .entry .usertext-body .md *",new j(o,"body")).on("#siteTable .thing .tagline .score.unvoted",new T(o)).on("#siteTable .thing .tagline time",new E(o)).on("#siteTable .thing .tagline .locked-tagline",new $(o,"locked",!0));return await(0,n.F_)(l.transform(s).body),o.fillInDefaultValues(),o.items.forEach((e=>{e.body&&(e.body_html=e.body,e.body=c(e.body))})),{valid:i.count>0,items:o.items}})(r);return s.length>0&&t&&t(s),o.filter((e=>!e.name||!e.name.startsWith("t3_"))).map((e=>({data:e})))},q=async e=>{const t=(0,n.m1)(await(0,n.qk)(),e),r=await(0,n.kv)(t,n.iN);if(!r.ok)return{error:`legacy reddit HTML request failed: ${r.status}`,status:r.status};const s=new M(t),o=new L(t),i=new I(t),l=(new a.G).on('meta[name="robots"][content="noindex,nofollow"]',s).on("#siteTable .thing .tagline span",o).on("#siteTable .thing",i);return await(0,n.F_)(l.transform(r).body),0===i.count?{error:"unrecognized page (no thread things)"}:{is_removed:s.is_removed,...o.author&&{author:o.author}}}},1195:(e,t,r)=>{var n=r(5893),s=r(7294),o=r(745),a=r(3867),i=r(917),l=r(9947);const c={sm:"4px",md:"6px",lg:"8px",pill:"999px"},d={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px"},u={body:'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},h=i.iv`
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
`,p="ui_theme";function m(e){const t="auto"===e?window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark":e;document.documentElement.setAttribute("data-theme",t)}function b(){return(0,s.useEffect)((()=>{try{chrome.storage.local.get([p],(e=>{m(e?.[p]||"auto")}))}catch{m("auto")}const e=window.matchMedia?.("(prefers-color-scheme: light)"),t=()=>{try{chrome.storage.local.get([p],(e=>{"auto"===(e?.[p]||"auto")&&m("auto")}))}catch(e){}};e?.addEventListener?.("change",t);const r=(e,t)=>{"local"===t&&e[p]&&m(e[p].newValue||"auto")};return chrome.storage.onChanged.addListener(r),()=>{e?.removeEventListener?.("change",t),chrome.storage.onChanged.removeListener(r)}}),[]),(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(i.xB,{styles:h}),(0,n.jsx)(i.xB,{styles:f}),(0,n.jsx)(i.xB,{styles:g})]})}a.Z.a`
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
`,w=(a.Z.button`
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
`),k=a.Z.span`
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
`,e=>new Date(e).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}));var x=r(7785),S=r(9217),$=(r(4007),r(3150)),j=r.n($);r(7163);const C=Math.floor(60*Math.random())+60,T=Math.floor(3*Math.random())+3,O=172800,A=(e,t)=>{const r=(0,x.BG)(e,t);return j().storage.local.get({[r]:null}).then((e=>e[r]))};const E=async(e,t,r,n,s,o,a={},i=[],c=null,d=!1)=>{let u;const h=s.options.monitor_quarantined,f=r?t:"",g={};if(r){const e=s[(0,x.tN)(t,r).removed]||{};for(const[t,r]of Object.entries(a))g[t]={locked:!!r.locked,created_utc:r.created_utc,is_robot_indexable:r.is_robot_indexable,removed_by_category:r.removed_by_category,permalink:r.permalink,link_id:r.link_id,quarantine:!!r.quarantine,over_18:!!r.over_18,subreddit_type:r.subreddit_type,known_removed:t in e}}return u=c?Promise.resolve(c):location.protocol.match(/^http/)?j().runtime.sendMessage({action:"get-reddit-items-by-id",ids:e,monitor_quarantined:h,username:f,authItemsMeta:g}):(0,S.my)(e,n,h,s.tempVar_monitor_quarantined,i,f,g),u.then((e=>{if(!e)return;const n=Array.isArray(e)?e:e.items;if(!n)return;const i=s.options.removal_status,c=s.options.lock_status,u=s.options.seen_count||x.UU,h=(0,x.tN)(t,r),f=s[h.removed]||{},g=s[h.approved]||{},p=s[h.locked]||{},m=s[h.unlocked]||{},b=s[h.changes]||[];r||(a={});const v=[],w=[],k=[],_=[],y=[];n.forEach((e=>{const t=e.data;r||(a[t.name]=t);const n=r?a[t.name]:null;t._public_view&&n&&(n.quarantine||n.over_18||"private"===n.subreddit_type)?w.push(t.name):(0,l.LC)(t)?v.push(t.name):(w.push(t.name),t._public_view&&!t._public_view_unverified&&y.push(t.name)),t.locked?k.push(t.name):_.push(t.name)})),r&&n.some((e=>e.data?._public_view))&&(async(e,t)=>{const r=(0,x.Bl)(e),n=[...t].sort(),s=(await j().storage.local.get({[r]:null}))[r],o=Date.now()-Number(s?.t||0),a=Array.isArray(s?.ids)?[...s.ids].sort():[];a.length===n.length&&a.every(((e,t)=>e===n[t]))&&o>=0&&o<18e5||await j().storage.local.set({[r]:{ids:n,t:Date.now()}})})(t,y).catch((()=>{})),((e,t,r,n)=>{if(e.length<100)return Promise.resolve(null);const s=e.map((e=>(e.data||t[e.name]||e).created_utc)).filter((e=>"number"==typeof e&&e>0));if(0===s.length)return Promise.resolve(null);s.sort(((e,t)=>e-t));const o=s[0],a=(0,x.BG)(r,n);j().storage.local.set({[a]:o}).then((()=>o))})(n,a,t,r);const S={},$=[];let C=0;const T={count:0,changeTypes:[],ids:[]},O={count:0,changeTypes:[],ids:[],ageRange:{min:1/0,max:0}},E=e=>{C+=e.num_changes,T.count+=e.realtimeChanges.count,T.ids.push(...e.realtimeChanges.ids),O.count+=e.backlogChanges.count,O.ids.push(...e.backlogChanges.ids);for(const t of e.realtimeChanges.changeTypes)T.changeTypes.includes(t)||T.changeTypes.push(t);for(const t of e.backlogChanges.changeTypes)O.changeTypes.includes(t)||O.changeTypes.push(t);e.backlogChanges.count>0&&(O.ageRange.min=Math.min(O.ageRange.min,e.backlogChanges.ageRange.min),O.ageRange.max=Math.max(O.ageRange.max,e.backlogChanges.ageRange.max))};return Promise.all([(0,x.$6)(t,r),A(t,r)]).then((([e,n])=>{if(i.track&&E(I(v,x.U$,"mod removed",f,w,x.Ci,"approved",g,b,a,i.notify,S,$,r,o,e,u,n,d)),c.track&&E(I(k,x.nb,"locked",p,_,x.YU,"unlocked",m,b,a,c.notify,S,$,r,o,e,u,n,d)),console.log("[debug] post-markChanges",{thing:t,isUser:r,subscribedFrom:o,removed:v.length,approved:w.length,locked:k.length,unlocked:_.length,known_removed:Object.keys(f).length,known_approved:Object.keys(g).length,existingLS:Object.keys(e||{}).length,num_changes:C,changeTypes:$,realtimeCount:T.count,backlogCount:O.count}),T.count>0&&T.changeTypes.length){const e=`${T.count} new [${T.changeTypes.join(", ")}] actions, click to view`;console.log(`Creating realtime notification for ${t}: ${T.count} changes of type ${T.changeTypes.join(", ")}`),(0,l.sc)({notificationId:t,title:t,message:e}).then((e=>{e&&(0,x.lY)(t).catch((()=>{}))})),(0,x.oL)(t,{count:T.count,types:T.changeTypes,itemIds:T.ids,firstAttemptAt:Date.now(),attempts:1}).catch((()=>{})),(0,x.bE)({ts:Date.now(),id:t,title:t,message:e,itemIds:T.ids,source:"recent"}).catch((()=>{}))}return O.count>0&&console.log(`Backlog for ${t}: ${O.count} older changes collected (badge-only, no notification)`),0===C&&(0,x.qN)(t).then((e=>{if(!e)return;if(!i.notify&&!c.notify)return void(0,x.lY)(t).catch((()=>{}));if(e.attempts>=5)return;if(Date.now()-e.firstAttemptAt<12e4)return;const r=`${e.count} new [${e.types.join(", ")}] actions, click to view`;console.log(`Retrying pending notification for ${t} (attempt ${e.attempts+1})`),(0,l.sc)({notificationId:t,title:t,message:r}).then((e=>{e&&(0,x.lY)(t).catch((()=>{}))})),(0,x.oL)(t,{...e,attempts:e.attempts+1}).catch((()=>{})),(0,x.bE)({ts:Date.now(),id:t,title:t,message:r,itemIds:e.itemIds,source:"retry"}).catch((()=>{}))})).catch((()=>{})),chrome.storage.sync.set({[h.removed]:(0,l.N5)(f,x.JQ,"c"),[h.approved]:(0,l.N5)(g,x.JQ,"c"),[h.locked]:(0,l.N5)(p,x.JQ,"c"),[h.unlocked]:(0,l.N5)(m,x.JQ,"c"),[h.changes]:b.slice(-x.Yn)},(()=>((0,l.SV)(),console.log("[debug] addLocalStorageItems",{thing:t,isUser:r,keys:Object.keys(S),sample:Object.keys(S).slice(0,2).map((e=>({id:e,t:S[e]?.t?.slice(0,60)})))}),(0,x.oX)(S,t,r))))}))}))},M=(e,t,r)=>{for(const n of r){let r=n;if(r instanceof l.QT||(r=new l.QT({object:n})),r.getID()===e&&t===r.getChangeTypeInternal())return!0}return!1};function I(e,t,r,n,s,o,a,i,c,d,u,h,f,g,p,m,b,v,w=!1){const k=[],_=[],y=[],S=Math.floor(Date.now()/1e3);e.forEach((e=>{const r=d[e],s=m[e];if(g||s){if(s){const t=new l.D4({object:s});t.resetSeenCount();const r=t.incrementRemovalCount();if(h[e]=t,!w&&r<T&&!(e in n))return}}else h[e]=new l.D4({item:r,observed_utc:S});const o=r.created_utc;if(!(e in n)&&!(v&&o&&o<v)){let s=!0;if((0===p&&t!==x.U$||1===p)&&(s=!1),n[e]=new l.pB(r.created_utc,s,(0,l.C3)(r.name)&&r.link_id?r.link_id:void 0),delete i[e],s){let n=t;(0,l.Me)(r)?(n=x.oZ,y.push(e)):k.push(e),c.push(new l.QT({id:e,observed_utc:S,change_type:n}))}g&&(h[e]=new l.D4({item:r,observed_utc:S}))}})),s.forEach((e=>{const t=d[e];if(g||m[e]||(h[e]=new l.D4({item:t,observed_utc:S})),m[e]){const t=new l.D4({object:m[e]});t.getRemovalCount()>0&&(t.resetRemovalCount(),h[e]||(h[e]=t))}if(e in n){const r=new l.D4({object:m[e]}),s=r.incrementSeenCount();if(s>=b){!M(e,o,c)||s>=C?(i[e]=new l.pB(t.created_utc,!0,(0,l.C3)(t.name)&&t.link_id?t.link_id:void 0),delete n[e],c.push(new l.QT({id:e,observed_utc:S,change_type:o,seen_count:s})),_.push(e),h[e]=new l.D4({item:t,observed_utc:S})):h[e]=r}else h[e]=r}else{const r=t.created_utc;v&&r&&r<v||(i[e]=new l.pB(t.created_utc,!1,(0,l.C3)(t.name)&&t.link_id?t.link_id:void 0),g&&!m[e]&&(h[e]=new l.D4({item:t,observed_utc:S})))}}));const $=[...k,..._,...y],j=$.length;u&&j&&(k.length&&f.push(r),y.length&&f.push("user deleted"),_.length&&f.push(a));const A=[],E=[],I=[],L=[],D=[];let N=0,q=0;for(const e of $){const t=d[e],r=t?.created_utc?S-t.created_utc:0;r>O?(q++,I.push(r),D.push(e)):(N++,L.push(e))}return N>0&&A.push(...f),q>0&&E.push(...f),{num_changes:j,realtimeChanges:{count:N,changeTypes:A,ids:L},backlogChanges:{count:q,changeTypes:E,ids:D,ageRange:I.length?{min:Math.min(...I),max:Math.max(...I)}:{min:0,max:0}}}}var L=r(5302);!function(e){function t(e){return" "==e||"\n"==e}function r(e){return/[\x09-\x0d ]/.test(e)}function n(e){return/[A-Za-z0-9]/.test(e)}function s(e){return/[A-Za-z]/.test(e)}function o(e){return/[0-9]/.test(e)}function a(e){return/[0-9a-fA-F]/.test(e)}function i(e){return/[\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]/.test(e)}function l(e){var t="0123456789ABCDEF";return"%"+t[(240&e)>>4]+t[(15&e)>>0]}function c(e){var t=e.charCodeAt(0);if(t<128)return l(t);if(t>127&&t<2048){var r=l(t>>6&255|192);return r+=l(t>>0&63|128)}r=l(t>>12&255|224);return r+=l(t>>6&63|128),r+=l(t>>0&63|128)}function d(e,t){var n,s=0,o=e.length;if(o<3||"<"!=e[0])return Be;"/"==e[n=1]&&(s=1,n++);for(var a=0;n<o&&!(a>=t.length);++n,++a)if(e[n]!=t[a])return Be;return n==o?Be:r(e[n])||">"==e[n]?s?We:He:Be}function u(e,t){for(var r,n=0;n<t.s.length;){for(r=n;n<t.s.length&&"\\"!=t.s[n];)n++;if(n>r&&(e.s+=t.s.slice(r,n)),n+1>=t.s.length)break;e.s+=t.s[n+1],n+=2}}var h=1114111;var f=["&AElig;","&Aacute;","&Acirc;","&Agrave;","&Alpha;","&Aring;","&Atilde;","&Auml;","&Beta;","&Ccedil;","&Chi;","&Dagger;","&Delta;","&ETH;","&Eacute;","&Ecirc;","&Egrave;","&Epsilon;","&Eta;","&Euml;","&Gamma;","&Iacute;","&Icirc;","&Igrave;","&Iota;","&Iuml;","&Kappa;","&Lambda;","&Mu;","&Ntilde;","&Nu;","&OElig;","&Oacute;","&Ocirc;","&Ograve;","&Omega;","&Omicron;","&Oslash;","&Otilde;","&Ouml;","&Phi;","&Pi;","&Prime;","&Psi;","&Rho;","&Scaron;","&Sigma;","&THORN;","&Tau;","&Theta;","&Uacute;","&Ucirc;","&Ugrave;","&Upsilon;","&Uuml;","&Xi;","&Yacute;","&Yuml;","&Zeta;","&aacute;","&acirc;","&acute;","&aelig;","&agrave;","&alefsym;","&alpha;","&amp;","&and;","&ang;","&apos;","&aring;","&asymp;","&atilde;","&auml;","&bdquo;","&beta;","&brvbar;","&bull;","&cap;","&ccedil;","&cedil;","&cent;","&chi;","&circ;","&clubs;","&cong;","&copy;","&crarr;","&cup;","&curren;","&dArr;","&dagger;","&darr;","&deg;","&delta;","&diams;","&divide;","&eacute;","&ecirc;","&egrave;","&empty;","&emsp;","&ensp;","&epsilon;","&equiv;","&eta;","&eth;","&euml;","&euro;","&exist;","&fnof;","&forall;","&frac12;","&frac14;","&frac34;","&frasl;","&gamma;","&ge;","&gt;","&hArr;","&harr;","&hearts;","&hellip;","&iacute;","&icirc;","&iexcl;","&igrave;","&image;","&infin;","&int;","&iota;","&iquest;","&isin;","&iuml;","&kappa;","&lArr;","&lambda;","&lang;","&laquo;","&larr;","&lceil;","&ldquo;","&le;","&lfloor;","&lowast;","&loz;","&lrm;","&lsaquo;","&lsquo;","&lt;","&macr;","&mdash;","&micro;","&middot;","&minus;","&mu;","&nabla;","&nbsp;","&ndash;","&ne;","&ni;","&not;","&notin;","&nsub;","&ntilde;","&nu;","&oacute;","&ocirc;","&oelig;","&ograve;","&oline;","&omega;","&omicron;","&oplus;","&or;","&ordf;","&ordm;","&oslash;","&otilde;","&otimes;","&ouml;","&para;","&part;","&permil;","&perp;","&phi;","&pi;","&piv;","&plusmn;","&pound;","&prime;","&prod;","&prop;","&psi;","&quot;","&rArr;","&radic;","&rang;","&raquo;","&rarr;","&rceil;","&rdquo;","&real;","&reg;","&rfloor;","&rho;","&rlm;","&rsaquo;","&rsquo;","&sbquo;","&scaron;","&sdot;","&sect;","&shy;","&sigma;","&sigmaf;","&sim;","&spades;","&sub;","&sube;","&sum;","&sup1;","&sup2;","&sup3;","&sup;","&supe;","&szlig;","&tau;","&there4;","&theta;","&thetasym;","&thinsp;","&thorn;","&tilde;","&times;","&trade;","&uArr;","&uacute;","&uarr;","&ucirc;","&ugrave;","&uml;","&upsih;","&upsilon;","&uuml;","&weierp;","&xi;","&yacute;","&yen;","&yuml;","&zeta;","&zwj;","&zwnj;"],g=[7,7,7,7,7,7,7,7,7,0,0,7,7,0,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,0,0,1,0,0,0,2,3,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,5,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],p=["","&quot;","&amp;","&#39;","&#47;","&lt;","&gt;",""];function m(e,t,r){for(var n,s=0,o=0;s<t.length;){for(n=s;s<t.length&&!(o=g[t.charCodeAt(s)]);)s++;if(s>n&&(e.s+=t.slice(n,s)),s>=t.length)break;"/"!=t[s]||r?7==g[t.charCodeAt(s)]||(e.s+=p[o]):e.s+="/",s++}}var b=[2,2,2,2,2,2,2,2,2,0,0,2,2,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,1,0,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];function v(e,t){for(var r,n=0;n<t.length;){for(r=n;n<t.length&&1===b[t.charCodeAt(n)];)n++;if(n>r&&(e.s+=t.slice(r,n)),n>=t.length)break;if(2!=b[t.charCodeAt(n)]){switch(t[n]){case"&":e.s+="&amp;";break;case"'":e.s+="&#x27;";break;default:e.s+=c(t[n])}n++}else n++}}function w(e,t,r,n,o){var a,i,l=e.slice(r),c=0;for(i=0;i<t;++i)if("<"==l[i]){t=i;break}for(;t>0;){var d=l[t-1];if("\0"===d)break;if(-1!=="?!.,".indexOf(d))t--;else{if(";"!==d)break;for(var u=t-2;u>0&&s(l[u]);)u--;u<t-2&&"&"==l[u]?t=u:t--}}if(0==t)return 0;switch(a=l[t-1]){case'"':c='"';break;case"'":c="'";break;case")":c="(";break;case"]":c="[";break;case"}":c="{"}if(0!=c){for(var h=0,f=0,g=0;g<t;)l[g]==c?f++:l[g]==a&&h++,g++;h!=f&&t--}return t}function k(e,t){var r,s=0;if(!n(e[0]))return 0;for(r=1;r<e.length-1;++r)if("."==e[r])s++;else if(!n(e[r])&&"-"!=e[r])break;return t||s?r:0}function _(e){var t,r=["http://","https://","ftp://","mailto://","/","git://","steam://","irc://","news://","mumble://","ssh://","ircs://","ts3server://","#"];for(t=0;t<r.length;++t){var n=r[t].length;if(e.length>n&&0==e.toLowerCase().indexOf(r[t])&&/[A-Za-z0-9#\/?]/.test(e[n]))return 1}return 0}function y(e,t,n,s,o){var a=t,l=new Ge(e,t);if(s<2||n<1||l.getChar(-1)!=o)return 0;if(n>1){var c=l.getChar(-2);return"/"==c?2:i(c)||r(c)?1:0}return a>2&&"/"==l.getChar(-2)&&"\\"==l.getChar(-3)?0:1}function x(e){if(e)for(var t in e)t in this&&(this[t]=e[t])}function S(e,t){this.callbacks=e,this.context=t}function $(){return{nofollow:0,target:null,tocData:{headerCount:0,currentLevel:0,levelOffset:0},toc_id_prefix:null,html_element_whitelist:Ct,html_attr_whitelist:jt,flags:0,link_attributes:function(e,t,r){r.nofollow&&(e.s+=' rel="nofollow"'),null!=r.target&&(e.s+=' target="'+r.target+'"')}}}function j(e){var t=$();t.flags=null==e?St:e;var r=new S(C(),t);return r.context.flags&Ee&&(r.callbacks.image=null),r.context.flags&Me&&(r.callbacks.link=null,r.callbacks.autolink=null),(r.context.flags&Oe||r.context.flags&qe)&&(r.callbacks.blockhtml=null),r}function C(){return new x({blockcode:O,blockquote:A,blockhtml:E,header:M,hrule:I,list:L,listitem:D,paragraph:N,table:q,table_row:R,table_cell:P,autolink:U,codespan:z,double_emphasis:F,emphasis:Z,image:B,linebreak:H,link:W,raw_html_tag:G,triple_emphasis:V,strikethrough:X,superscript:Y,entity:null,normal_text:J,doc_header:null,doc_footer:te})}function T(){return new x({blockcode:null,blockquote:null,blockhtml:null,header:Q,hrule:null,list:null,listitem:null,paragraph:null,table:null,table_row:null,table_cell:null,autolink:null,codespan:z,double_emphasis:F,emphasis:Z,image:null,linebreak:null,link:ee,raw_html_tag:null,triple_emphasis:V,strikethrough:X,superscript:Y,entity:null,normal_text:null,doc_header:null,doc_footer:re})}function O(e,t,n,s){if(e.s.length&&(e.s+="\n"),n&&n.s.length){var o,a;for(e.s+='<pre><code class="',o=0,a=0;o<n.s.length;++o,++a){for(;o<n.s.length&&r(n.s[o]);)o++;if(o<n.s.length){for(var i=o;o<n.s.length&&!r(n.s[o]);)o++;"."==n.s[i]&&i++,a&&(e.s+=" "),m(e,n.s.slice(i,o),!1)}}e.s+='">'}else e.s+="<pre><code>";t&&m(e,t.s,!1),e.s+="</code></pre>\n"}function A(e,t,r){e.s.length&&(e.s+="\n"),e.s+="<blockquote>\n",t&&(e.s+=t.s),e.s+="</blockquote>\n"}function E(e,t,r){var n,s;if(t){for(s=t.s.length;s>0&&"\n"==t.s[s-1];)s--;for(n=0;n<s&&"\n"==t.s[n];)n++;n>=s||(e.s.length&&(e.s+="\n"),e.s+=t.s.slice(n,s),e.s+="\n")}}function M(e,t,r,n){e.s.length&&(e.s+="\n"),n.flags&Le?(e.s+="<h"+ +r+' id="',n.toc_id_prefix&&(e.s+=n.toc_id_prefix),e.s+="toc_"+n.tocData.headerCount+++'">'):e.s+="<h"+ +r+">",t&&(e.s+=t.s),e.s+="</h"+ +r+">\n"}function I(e,t){e.s.length&&(e.s+="\n"),e.s+=t.flags&Ne?"<hr/>\n":"<hr>\n"}function L(e,t,r,n){e.s.length&&(e.s+="\n"),e.s+=r&se?"<ol>\n":"<ul>\n",t&&(e.s+=t.s),e.s+=r&se?"</ol>\n":"</ul>\n"}function D(e,t,r,n){if(e.s+="<li>",t){for(var s=t.s.length;s&&"\n"==t.s[s-1];)s--;e.s+=t.s.slice(0,s)}e.s+="</li>\n"}function N(e,t,n){var s=0;if(e.s.length&&(e.s+="\n"),t&&t.s.length){for(;s<t.s.length&&r(t.s[s]);)s++;if(s!=t.s.length){if(e.s+="<p>",n.flags&De)for(var o;s<t.s.length;){for(o=s;s<t.s.length&&"\n"!=t.data[s];)s++;if(s>o&&(e.s+=t.s.slice(o,s)),s>=t.s.length-1)break;H(e,n),s++}else e.s+=t.s.slice(s);e.s+="</p>\n"}}}function q(e,t,r,n){e.s.length&&(e.s+="\n"),e.s+="<table><thead>\n",t&&(e.s+=t.s),e.s+="</thead><tbody>\n",r&&(e.s+=r.s),e.s+="</tbody></table>\n"}function R(e,t,r){e.s+="<tr>\n",t&&(e.s+=t.s),e.s+="</tr>\n"}function P(e,t,r,n,s){switch(e.s+=r&Ze?"<th":"<td",s>1&&(e.s+=' colspan="'+s+'" '),r&Fe){case ze:e.s+=' align="center">';break;case Pe:e.s+=' align="left">';break;case Ue:e.s+=' align="right">';break;default:e.s+=">"}t&&(e.s+=t.s),e.s+=r&Ze?"</th>\n":"</td>\n"}function U(e,t,r,n){return t&&t.s.length&&(0==(n.flags&Ie)||_(t.s)||r==xe)?(e.s+='<a href="',r==xe&&(e.s+="mailto:"),v(e,t.s.slice(0)),n.link_attributes?(e.s+='"',n.link_attributes(e,t,n),e.s+=">"):e.s+='">',0==t.s.indexOf("mailto:")?m(e,t.s.slice(7),!1):m(e,t.s,!1),e.s+="</a>",1):0}function z(e,t,r){return e.s+="<code>",t&&m(e,t.s,!1),e.s+="</code>",1}function F(e,t,r){return t&&t.s.length?(e.s+="<strong>"+t.s+"</strong>",1):0}function Z(e,t,r){return t&&t.s.length?(e.s+="<em>"+t.s+"</em>",1):0}function B(e,t,r,n,s){return t&&t.s.length?(e.s+='<img src="',v(e,t.s),e.s+='" alt="',n&&n.s.length&&m(e,n.s,!1),r&&r.s.length&&(e.s+='" title="',m(e,r.s,!1)),e.s+=s.flags&Ne?'"/>':'">',1):0}function H(e,t){return e.s+=t.flags&Ne?"<br/>\n":"<br>\n",1}function W(e,t,r,n,s){return null==t||0==(s.flags&Ie)||_(t.s)?(e.s+='<a href="',t&&t.s.length&&v(e,t.s),r&&r.s.length&&(e.s+='" title="',m(e,r.s,!1)),s.link_attributes?(e.s+='"',s.link_attributes(e,t,s),e.s+=">"):e.s+='">',n&&n.s.length&&(e.s+=n.s),e.s+="</a>",1):0}function K(e,t,r,n,s,o){var a,i,l,c,d,u=0,h=0,f=0,g=0,p=0;if(e.s+="<",o!=We){e.s+=n;var b=1+n.length;for(l=new Ke,c=new Ke;b<t.s.length&&!f;b++){switch(f=0,p=0,g=0,d=t.s[b]){case">":f=1;break;case"'":case'"':h?u?u==d?(u=0,g=1):c.s+=d:u=d:p=1;break;case" ":u?c.s+=" ":p=1;break;case"=":if(h){p=1;break}h=1;break;default:(h&&u||!h)&&(h?c.s+=d:l.s+=d)}if(g){var v=0;for(i=0;s[i];i++)if(s[i].length==l.s.length){for(a=0;a<l.s.length&&s[i][a].toLowerCase()==l.s[a].toLowerCase();a++);if(a==l.s.length){v=1;break}}v&&c.s.length&&l.s.length&&(e.s+=" ",m(e,l.s,!1),e.s+='="',m(e,c.s,!1),e.s+='"'),p=1}p&&(h=0,u=0,l=new Ke,c=new Ke)}e.s+=">"}else e.s+="/"+n+">"}function G(e,t,r){var n=r.html_element_whitelist;if(0!=(r.flags&Re)&&n)for(var s=0;n[s];s++){var o=d(t.s,n[s]);if(o!=Be)return K(e,t,0,n[s],r.html_attr_whitelist,o),1}return 0!=(r.flags&qe)?(m(e,t.s,!1),1):(0!=(r.flags&Oe)||0!=(r.flags&Ae)&&d(t.s,"style")||0!=(r.flags&Me)&&d(t.s,"a")||0!=(r.flags&Ee)&&d(t.s,"img")||(e.s+=t.s),1)}function V(e,t,r){return t&&t.s.length?(e.s+="<strong><em>"+t.s+"</em></strong>",1):0}function X(e,t,r){return t&&t.s.length?(e.s+="<del>"+t.s+"</del>",1):0}function Y(e,t,r){return t&&t.s.length?(e.s+="<sup>"+t.s+"</sup>",1):0}function J(e,t,r){t&&m(e,t.s,!1)}function Q(e,t,r,n){if(0==n.tocData.currentLevel&&(e.s+='<div class="toc">\n',n.tocData.levelOffset=r-1),(r-=n.tocData.levelOffset)>n.tocData.currentLevel)for(;r>n.tocData.currentLevel;)e.s+="<ul>\n<li>\n",n.tocData.currentLevel++;else if(r<n.tocData.currentLevel){for(e.s+="</li>\n";r<n.tocData.currentLevel;)e.s+="</ul>\n</li>\n",n.tocData.currentLevel--;e.s+="<li>\n"}else e.s+="</li>\n<li>\n";e.s+='<a href="#',n.toc_id_prefix&&(e.s+=n.toc_id_prefix),e.s+="toc_"+n.tocData.headerCount+++'">',t&&m(e,t.s,!1),e.s+="</a>\n"}function ee(e,t,r,n,s){return n&&n.s&&(e.s+=n.s),1}function te(e,t){t.tocData={headerCount:0,currentLevel:0,levelOffset:0}}function re(e,t){for(var r=!1;t.tocData.currentLevel>0;)e.s+="</li>\n</ul>\n",t.tocData.currentLevel--,r=!0;r&&(e.s+="</div>\n"),te(0,t)}x.prototype={blockcode:null,blockquote:null,blockhtml:null,header:null,hrule:null,list:null,listitem:null,paragraph:null,table:null,table_row:null,table_cell:null,autolink:null,codespan:null,double_emphasis:null,emphasis:null,image:null,linebreak:null,link:null,raw_html_tag:null,triple_emphasis:null,strikethrough:null,superscript:null,entity:null,normal_text:null,doc_header:null,doc_footer:null},e.createCustomRenderer=function(e,t){return new S(e,t)},e.defaultRenderState=$,e.getRedditRenderer=j,e.getTocRenderer=function(){var e=$();return e.flags=Le|Oe,new S(T(),e)},e.createCustomCallbacks=function(e){return new x(e)},e.getRedditCallbacks=C,e.getTocCallbacks=T;var ne=[null,function(e,r,n,s,o){var a,i=n.slice(s),l=i.length,c=i[0];return l>2&&i[1]!=c?"~"==c||t(i[1])||0==(a=et(e,r,i,c))?0:a+1:i.length>3&&i[1]==c&&i[2]!=c?t(i[2])||0==(a=tt(e,r,i,c))?0:a+2:i.length>4&&i[1]==c&&i[2]==c&&i[3]!=c?"~"==c||t(i[3])||0==(a=function(e,r,n,s){var o,a,i=n.slice(3),l=0;for(;l<i.length;){if(!(o=Qe(i.slice(l),s)))return 0;if(i[l+=o]==s&&!t(i[l-1])){if(l+2<i.length&&i[l+1]==s&&i[l+2]==s&&r.callbacks.triple_emphasis){var c=new Ke;return r.spanStack.push(c),ct(c,r,i.slice(0,l)),a=r.callbacks.triple_emphasis(e,c,r.context),r.spanStack.pop(),a?l+3:0}return l+1<i.length&&i[l+1]==s?(o=et(e,r,n,s))?o-2:0:(o=tt(e,r,n,s))?o-1:0}}return 0}(e,r,i,c))?0:a+3:0},function(e,t,r,n,s){for(var o,a,i,l,c=r.slice(n),d=0;d<c.length&&"`"==c[d];)d++;for(a=0,o=d;o<c.length&&a<d;o++)"`"==c[o]?a++:a=0;if(a<d&&o>=c.length)return 0;for(i=d;i<o&&" "==c[i];)i++;for(l=o-d;l>d&&" "==c[l-1];)l--;if(i<l){var u=new Ke(c.slice(i,l));t.callbacks.codespan(e,u,t.context)||(o=0)}else t.callbacks.codespan(e,null,t.context)||(o=0);return o},function(e,t,r,n,s){if(r.slice(n),s<2||" "!=r[n-1]||" "!=r[n-2])return 0;for(var o=e.s.length;o&&" "==e.s[o-1];)o--;return e.s=e.s.slice(0,o),t.callbacks.linebreak(e,t.context)?1:0},function(e,r,n,s,o){var a,i,l=n.slice(s),c=o&&"!"==n[s-1],d=1,h=0,f=0,g=0,p=0,m=null,b=null,v=null,w=null,k=r.spanStack.length,_=0,y=0,x=0,S=0;function $(){return r.spanStack.length=k,y?d:0}if(c&&!r.callbacks.image||!c&&!r.callbacks.link)return $();for(a=1;d<l.length;d++)if("\n"==l[d])_=1;else{if("\\"==l[d-1])continue;if("["==l[d])a++;else if("]"==l[d]&&--a<=0)break}if(d>=l.length)return $();for(i=d,d++;d<l.length&&t(l[d]);)d++;if(d<l.length&&"("==l[d]){for(d++;d<l.length&&t(l[d]);)d++;for(h=d;d<l.length;)if("\\"==l[d])d+=2;else{if(")"==l[d])break;if(d>=1&&t(l[d-1])&&("'"==l[d]||'"'==l[d]))break;d++}if(d>=l.length)return $();if(f=d,"'"==l[d]||'"'==l[d]){for(S=l[d],x=1,g=++d;d<l.length;)if("\\"==l[d])d+=2;else if(l[d]==S)x=0,d++;else{if(")"==l[d]&&!x)break;d++}if(d>=l.length)return $();for(p=d-1;p>g&&t(l[p]);)p--;"'"!=l[p]&&'"'!=l[p]&&(g=p=0,f=d)}for(;f>h&&t(l[f-1]);)f--;"<"==l[h]&&h++,">"==l[f-1]&&f--,f>h&&(b=new Ke,r.spanStack.push(b),b.s+=l.slice(h,f)),p>g&&(v=new Ke,r.spanStack.push(v),v.s+=l.slice(g,p)),d++}else if(d<l.length&&"["==l[d]){var j=new Ke,C=null;for(h=++d;d<l.length&&"]"!=l[d];)d++;if(d>=l.length)return $();if(h==(f=d))if(_){var T=new Ke;for(r.spanStack.push(T),O=1;O<i;O++)"\n"!=l[O]?T.s+=l[O]:" "!=l[O-1]&&(T.s+=" ");j.s=T.s}else j.s=l.slice(1);else j.s=l.slice(h,f);if(!(C=r.refs[j.s]))return $();b=C.link,v=C.title,d++}else{j=new Ke,C=null;if(_){var O;T=new Ke;for(r.spanStack.push(T),O=1;O<i;O++)"\n"!=l[O]?T.s+=l[O]:" "!=l[O-1]&&(T.s+=" ");j.s=T.s}else j.s=l.slice(1,i);if(!(C=r.refs[j.s]))return $();b=C.link,v=C.title,d=i+1}return i>1&&(m=new Ke,r.spanStack.push(m),c?m.s+=l.slice(1,i):(r.inLinkBody=1,ct(m,r,l.slice(1,i)),r.inLinkBody=0)),b?(w=new Ke,r.spanStack.push(w),u(w,b),c?(e.s.length&&"!"==e.s[e.s.length-1]&&(e.s=e.s.slice(0,-1)),y=r.callbacks.image(e,w,v,m,r.context)):y=r.callbacks.link(e,w,v,m,r.context),$()):$()},function(e,t,r,s,o){var a=r.slice(s),i={p:_e},l=function(e,t){var r,s;if(e.length<3)return 0;if("<"!=e[0])return 0;if(r="/"==e[1]?2:1,!n(e[r]))return 0;t.p=_e;for(;r<e.length&&(n(e[r])||"."==e[r]||"+"==e[r]||"-"==e[r]);)r++;if(r>1&&"@"==e[r]&&0!=(s=function(e){var t=0,r=0;for(t=0;t<e.length;++t)if(!n(e[t]))switch(e[t]){case"@":r++;case"-":case".":case"_":break;case">":return 1==r?t+1:0;default:return 0}return 0}(e.slice(r))))return t.p=xe,r+s;r>2&&":"==e[r]&&(t.p=ye,r++);if(r>=e.length)t.p=_e;else if(t.p){for(s=r;r<e.length;)if("\\"==e[r])r+=2;else{if(">"==e[r]||"'"==e[r]||'"'==e[r]||" "==e[r]||"\n"==e[r])break;r++}if(r>=e.length)return 0;if(r>s&&">"==e[r])return r+1;t.p=_e}for(;r<e.length&&">"!=e[r];)r++;return r>=e.length?0:r+1}(a,i),c=new Ke(a.slice(0,l)),d=0;if(l>2)if(t.callbacks.autolink&&i.p!=_e){var h=new Ke;t.spanStack.push(h),c.s=a.substr(1,l-2),u(h,c),d=t.callbacks.autolink(e,h,i.p,t.context),t.spanStack.pop()}else t.callbacks.raw_html_tag&&(d=t.callbacks.raw_html_tag(e,c,t.context));return d?l:0},function(e,t,r,n,s){var o=r.slice(n),a=new Ke;if(o.length>1){if(-1=="\\`*_{}[]()#+-.!:|&<>/^~".indexOf(o[1]))return 0;t.callbacks.normal_text?(a.s=o[1],t.callbacks.normal_text(e,a,t.context)):e.s+=o[1]}else 1==o.length&&(e.s+=o[0]);return 2},function(e,t,r,s,i){var l,c,d=r.slice(s),u=1,g=!1,p=!1,m=new Ke;for(u<d.length&&"#"===d[u]&&(g=!0,u++),u<d.length&&g&&"x"===d[u].toLowerCase()&&(p=!0,u++),l=u;u<d.length;){var b=d[u];if(p){if(!a(b))break}else if(g){if(!o(b))break}else if(!n(b))break;u++}if(!(u>l&&u<d.length&&";"===d[u]))return 0;if(u++,g&&undefined-l>7)return 0;if(g){if(c=p?16:10,!function(e){return e>8&&11!==e&&12!==e&&(e<14||e>31)&&(e<55296||e>57343)&&65534!==e&&65535!==e&&e<=h}(parseInt(d.slice(l),c)))return 0}else if(-1===f.indexOf(d.slice(0,u)))return 0;return t.callbacks.entity?(m.s=d.slice(0,u),t.callbacks.entity(e,m,t.context)):e.s+=d.slice(0,u),u},function(e,t,n,o,a){var i,l,c=n.slice(o),d={p:null};return!t.callbacks.autolink||t.inLinkBody?0:(i=new Ke,t.spanStack.push(i),(l=function(e,t,n,o,a,i,l){var c,d,u=n.slice(o),h=0;if(i<4||"/"!=n[o+1]||"/"!=n[o+2])return 0;for(;h<a&&s(n[o-h-1]);)h++;if(!_(n.substr(o-h,i+h)))return 0;if(c=3,0==(d=k(u.slice(c),l&ke)))return 0;for(c+=d;c<i&&!r(n[o+c]);)c++;return 0==(c=w(n,c,o))?0:(t.s+=n.substr(o-h,c+h),e.p=h,c)}(d,i,n,o,a,c.length,0))>0&&(d.p>0&&e.truncate(e.s.length-d.p),t.callbacks.autolink(e,i,ye,t.context)),t.spanStack.pop(),l)},function(e,t,r,s,o){var a,i,l=r.slice(s),c={p:null};return!t.callbacks.autolink||t.inLinkBody?0:(a=new Ke,t.spanStack.push(a),(i=function(e,t,r,s,o,a,i){r.slice(s);var l,c,d=0,u=0;for(c=0;c<o&&"\0"!=(h=r[s-c-1])&&(n(h)||-1!=".+-_".indexOf(h));++c);if(0==c)return 0;for(l=0;l<a;++l){var h;if(!n(h=r[s+l]))if("@"==h)d++;else if("."==h&&l<a-1)u++;else if("-"!=h&&"_"!=h)break}return l<2||1!=d||0==u||0==(l=w(r,l,s))?0:(t.s+=r.substr(s-c,l+c),e.p=c,l)}(c,a,r,s,o,l.length))>0&&(c.p>0&&e.truncate(e.s.length-c.p),t.callbacks.autolink(e,a,xe,t.context)),t.spanStack.pop(),i)},function(e,t,n,s,o){var a,l,c=n.slice(s),d=null,u=null,h={p:null};return!t.callbacks.link||t.inLinkBody?0:(a=new Ke,t.spanStack.push(a),(l=function(e,t,n,s,o,a,l){var c,d=n.slice(s);if(o>0&&!i(n[s-1])&&!r(n[s-1]))return 0;if(a<4||"www."!=d.slice(0,4))return 0;if(0==(c=k(d,0)))return 0;for(;c<a&&!r(d[c]);)c++;return 0==(c=w(n,c,s))?0:(t.s+=d.slice(0,c),e.p=0,c)}(h,a,n,s,o,c.length))>0&&(d=new Ke,t.spanStack.push(d),d.s+="http://",d.s+=a.s,h.p>0&&e.truncate(e.s.length-h.p),t.callbacks.normal_text?(u=new Ke,t.spanStack.push(u),t.callbacks.normal_text(u,a,t.context),t.callbacks.link(e,d,null,u,t.context),t.spanStack.pop()):t.callbacks.link(e,d,null,a,t.context),t.spanStack.pop()),t.spanStack.pop(),l)},function(e,t,r,s,o){var a,i=r.slice(s),l=0,c={p:null},d={p:null};if(!t.callbacks.autolink||t.inLinkBody)return 0;if(a=new Ke,t.spanStack.push(a),0===(l=function(e,t,r,s,o,a,i){var l=r.slice(s),c=0,d=!1,u=y(r,s,o,a,"r");if(!u)return 0;c=1,"all-"==l.substr(c,4).toLowerCase()&&(d=!0);do{var h=c,f=24;if(a>=c+10&&"reddit.com"==l.substr(c,10).toLowerCase())c+=10,f=10;else{if(a>c+2&&"t:"==l.substr(c,2)&&(c+=2),!n(l[c]))return 0;c+=1}for(;c<a&&(n(l[c])||"_"==l[c]);)c++;if(c-h<2||c-h>f)return 0}while(c<a&&("+"==l[c]||d&&"-"==l[c])&&c++);if(c<a&&"/"==l[c])for(;c<a&&(n(l[c])||"_"==l[c]||"/"==l[c]||"-"==l[c]);)c++;var g=s-u;return t.s+=r.slice(g,g+c+u),i.p=1==u,e.p=u,c}(c,a,r,s,o,i.length,d))&&(l=function(e,t,r,s,o,a,i){var l=r.slice(s),c=0;if(!(a<3)){var d=y(r,s,o,a,"u");if(!d)return 0;if(!n(l[c=1])&&"_"!=l[c]&&"-"!=l[c])return 0;for(c+=1;c<a&&(n(l[c])||"_"==l[c]||"/"==l[c]||"-"==l[c]);)c++;var u=s-d;return t.s+=r.slice(u,u+c+d),i.p=1==d,e.p=d,c}}(c,a,r,s,o,i.length,d)),l>0){var u=new Ke;if(t.spanStack.push(u),d.p&&(u.s+="/"),u.s+=a.s,c.p>0&&e.truncate(e.s.length-c.p),t.callbacks.normal_text){var h=new Ke;t.spanStack.push(h),t.callbacks.normal_text(h,a,t.context),t.callbacks.link(e,u,null,h,t.context),t.spanStack.pop()}else t.callbacks.link(e,u,null,a,t.context);t.spanStack.pop()}return t.spanStack.pop(),l},function(e,r,n,s,o){var a,i,l,c=n.slice(s),d=c.length;if(!r.callbacks.superscript)return 0;if(d<2)return 0;if("("==c[1]){for(a=i=2;i<d&&")"!=c[i]&&"\\"!=c[i-1];)i++;if(i==d)return 0}else for(a=i=1;i<d&&!t(c[i]);)i++;return i-a==0?2==a?3:0:(l=new Ke,r.spanStack.push(l),ct(l,r,c.slice(a,i)),r.callbacks.superscript(e,l,r.context),r.spanStack.pop(),2==a?i+1:i)}],se=1,oe=2,ae=8,ie=0,le=(ie++,ie++),ce=ie++,de=ie++,ue=ie++,he=ie++,fe=ie++,ge=ie++,pe=ie++,me=ie++,be=ie++,ve=ie++,we=ie++,ke=1;ie=0;var _e=ie++,ye=ie++,xe=ie++,Se=1,$e=2,je=4,Ce=64,Te=256,Oe=1,Ae=2,Ee=4,Me=8,Ie=32,Le=64,De=128,Ne=256,qe=512,Re=1024,Pe=1,Ue=2,ze=3,Fe=3,Ze=4,Be=0,He=1,We=2;function Ke(e){this.s=e||""}function Ge(e,t){if(this.s=e,t>=e.length||t<0)throw new RangeError("char * offset out of bounds");this.offset=t}function Ve(){this.spanStack=[],this.blockStack=[],this.extensions=152|Se|$e|$e;var e=j();this.context=e.context,this.callbacks=e.callbacks,this.inLinkBody=0,this.activeChars={},this.refs={},this.nestingLimit=16,this.maxTableCols=64}function Xe(e){var t;for(t=0;t<e.length&&"\n"!=e[t];t++)if(" "!=e[t])return 0;return t+1}function Ye(e){var t,r=0,n=0;if(e.length<3)return 0;if(" "==e[0]&&(r++," "==e[1]&&(r++," "==e[2]&&r++)),r+2>=e.length||"*"!=e[r]&&"-"!=e[r]&&"_"!=e[r])return 0;for(t=e[r];r<e.length&&"\n"!=e[r];){if(e[r]==t)n++;else if(" "!=e[r])return 0;r++}return n>=3}function Je(e,r){var n,s=0,o=0;if(s=function(e){var t,r=0,n=0;if(e.length<3)return 0;if(" "==e[0]&&(r++," "==e[1]&&(r++," "==e[2]&&r++)),r+2>=e.length||"~"!=e[r]&&"`"!=e[r])return 0;for(t=e[r];r<e.length&&e[r]==t;)n++,r++;return n<3?0:r}(e),0==s)return 0;for(;s<e.length&&" "==e[s];)s++;if(n=s,s<e.length&&"{"==e[s]){for(s++,n++;s<e.length&&"}"!=e[s]&&"\n"!=e[s];)o++,s++;if(s==e.length||"}"!=e[s])return 0;for(;o>0&&t(e[n+0]);)n++,o--;for(;o>0&&t(e[n+o-1]);)o--;s++}else for(;s<e.length&&!t(e[s]);)o++,s++;for(r&&(r.s=e.substr(n,o));s<e.length&&"\n"!=e[s];){if(!t(e[s]))return 0;s++}return s+1}function Qe(e,t){for(var r=1;r<e.length;){for(;r<e.length&&e[r]!=t&&"`"!=e[r]&&"["!=e[r];)r++;if(r==e.length)return 0;if(e[r]==t)return r;if(r&&"\\"==e[r-1])r++;else if("`"==e[r]){for(var n,s=0,o=0;r<e.length&&"`"==e[r];)r++,s++;if(r>=e.length)return 0;for(n=0;r<e.length&&n<s;)o||e[r]!=t||(o=r),"`"==e[r]?n++:n=0,r++;if(r>=e.length)return o}else if("["==e[r]){var a;o=0;for(r++;r<e.length&&"]"!=e[r];)o||e[r]!=t||(o=r),r++;for(r++;r<e.length&&(" "==e[r]||"\n"==e[r]);)r++;if(r>=e.length)return o;switch(e[r]){case"[":a="]";break;case"(":a=")";break;default:if(o)return o;continue}for(r++;r<e.length&&e[r]!=a;)o||e[r]!=t||(o=r),r++;if(r>=e.length)return o;r++}}return 0}function et(e,r,n,s){var o,a,l=n.slice(1),c=0;if(!r.callbacks.emphasis)return 0;for(l.length>1&&l[0]==s&&l[1]==s&&(c=1);c<l.length;){if(!(o=Qe(l.slice(c),s)))return 0;if((c+=o)>=l.length)return 0;if(l[c]==s&&!t(l[c-1])){if(r.extensions&Se&&"_"==s&&c+1!=l.length&&!t(l[c+1])&&!i(l[c+1]))continue;var d=new Ke;return r.spanStack.push(d),ct(d,r,l.slice(0,c)),a=r.callbacks.emphasis(e,d,r.context),r.spanStack.pop(),a?c+1:0}}return 0}function tt(e,r,n,s){var o,a,i=n.slice(2),l=0,c="~"==s?r.callbacks.strikethrough:r.callbacks.double_emphasis;if(!c)return 0;for(;l<i.length;){if(!(o=Qe(i.slice(l),s)))return 0;if((l+=o)+1<i.length&&i[l]==s&&i[l+1]==s&&l&&!t(i[l-1])){var d=new Ke;return r.spanStack.push(d),ct(d,r,i.slice(0,l)),a=c(e,d,r.context),r.spanStack.pop(),a?l+2:0}l++}return 0}function rt(e,t){if("#"!=t[0])return!1;if(e.extensions&Ce){for(var r=0;r<t.length&&r<6&&"#"==t[r];)r++;if(r<t.length&&" "!=t[r])return!1}return!0}function nt(e){var t=0,r=e.length;if("="==e[t]){for(t=1;t<r&&"="==e[t];t++);for(;t<r&&" "==e[t];)t++;return t>=r||"\n"==e[t]?1:0}if("-"==e[t]){for(t=1;t<r&&"-"==e[t];t++);for(;t<r&&" "==e[t];)t++;return t>=r||"\n"==e[t]?2:0}return 0}function st(e){for(var t=e.length,r=0;r<t&&"\n"!=e[r];)r++;return++r>=t?0:nt(e.slice(r))}function ot(e){var t=0,r=e.length;return t<r&&" "==e[t]&&t++,t<r&&" "==e[t]&&t++,t<r&&" "==e[t]&&t++,t<r&&">"==e[t]?t+1<r&&" "==e[t+1]?t+2:t+1:0}function at(e){return e.length>3&&" "==e[0]&&" "==e[1]&&" "==e[2]&&" "==e[3]?4:0}function it(e){var t=e.length,r=0;if(r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r>=t||e[r]<"0"||e[r]>"9")return 0;for(;r<t&&e[r]>="0"&&e[r]<="9";)r++;return r+1>=t||"."!=e[r]||" "!=e[r+1]||st(e.slice(r))?0:r+2}function lt(e){var t=e.length,r=0;return r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r<t&&" "==e[r]&&r++,r+1>=t||"*"!=e[r]&&"+"!=e[r]&&"-"!=e[r]||" "!=e[r+1]||st(e.slice(r))?0:r+2}function ct(e,t,r){var n=0,s=0,o=0,a=0,i=new Ke;if(!(t.spanStack.length+t.blockStack.length>t.nestingLimit))for(;n<r.length;){for(;s<r.length&&!(a=t.activeChars[r[s]]);)s++;if(t.callbacks.normal_text?(i.s=r.slice(n,s),t.callbacks.normal_text(e,i,t.context)):e.s+=r.slice(n,s),s>=r.length)break;n=s,(s=ne[a](e,t,r,n,n-o))?o=s=n+=s:s=n+1}}function dt(e,t,r){for(var n,s,o,a=0;a<r.length&&a<6&&"#"==r[a];)a++;for(n=a;n<r.length&&" "==r[n];n++);for(s=n;s<r.length&&"\n"!=r[s];s++);for(o=s;s&&"#"==r[s-1];)s--;for(;s&&" "==r[s-1];)s--;if(s>n){var i=new Ke;t.spanStack.push(i),ct(i,t,r.slice(n,s)),t.callbacks.header&&t.callbacks.header(e,i,a,t.context),t.spanStack.pop()}return o}function ut(e,t,r){var n,s;return e.length+3>=r.length||r.slice(2).toLowerCase()!=e||">"!=r[e.length+2]?0:(s=0,(n=e.length+3)<r.length&&0==(s=Xe(r.slice(n)))?0:(n+=s,s=0,n<r.length&&(s=Xe(r.slice(n))),n+s))}function ht(e,t,r,n){var s,o,a,i=0,l=null,c=new Ke(r);if(r.length<2||"<"!=r[0])return 0;for(s=1;s<r.length&&">"!=r[s]&&" "!=r[s];)s++;if(s<r.length&&(a=r.slice(1),l=-1!=["p","dl","div","math","table","ul","del","form","blockquote","figure","ol","fieldset","h1","h6","pre","script","h5","noscript","style","iframe","h4","ins","h3","h2"].indexOf(a.toLowerCase())?a.toLowerCase():""),!l){if(r.length>5&&"!"==r[1]&&"-"==r[2]&&"-"==r[3]){for(s=5;s<r.length&&("-"!=r[s-2]||"-"!=r[s-1]||">"!=r[s]);)s++;if(++s<size&&(i=Xe(r.slice(s))),i)return c.s=r.slice(0,s+i),n&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),c.s.length}if(r.length>4&&("h"==r[1]||"H"==r[1])&&("r"==r[2]||"R"==r[2])){for(s=3;s<r.length&&">"!=r[s];)s++;if(s+1<r.length&&(s++,i=Xe(r.slice(s))))return c.s=r.slice(0,s+i),n&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),c.s.length}return 0}if(s=1,o=0,"ins"!=l&&"del"!=l){var d=l.length;for(s=1;s<r.length;){for(s++;s<r.length&&("<"!=r[s-1]||"/"!=r[s]);)s++;if(s+2+d>=r.length)break;if(i=ut(tag,0,r.slice(s-1))){s+=i-1,o=1;break}}}return o?(c.s=c.s.slice(0,s),n&&t.callbacks.blockhtml&&t.callbacks.blockhtml(e,c,t.context),s):0}function ft(e,t,r){var n,s,o=r.length,a=0,i="",l=new Ke;for(t.blockStack.push(l),n=0;n<o;){for(a=n+1;a<o&&"\n"!=r[a-1];a++);if(s=ot(r.slice(n,a)))n+=s;else if(Xe(r.slice(n,a))&&(a>=o||0==ot(r.slice(a))&&!Xe(r.slice(a))))break;n<a&&(i+=r.slice(n,a),a-n),n=a}return _t(l,t,i),t.callbacks.blockquote&&t.callbacks.blockquote(e,l,t.context),t.blockStack.pop(),a}function gt(e,t,r){for(var s=0,o=0,a=0,i=r.length,l=new Ke(r);s<i;){for(o=s+1;o<i&&"\n"!=r[o-1];o++);if(0!=ot(r.slice(s,o))){o=s;break}var c=r.slice(s);if(Xe(c)||0!=(a=nt(c)))break;if(Xe(c))break;if(0!=(a=nt(c)))break;if(rt(t,c)||Ye(c)||ot(c)){o=s;break}if(t.extensions&Te&&!n(r[s])){if(it(c)||lt(c)){o=s;break}if("<"==r[s]&&t.callbacks.blockhtml&&ht(e,t,c,0)){o=s;break}if(0!=(t.extensions&&je)&&0!=Je(c,null)){o=s;break}}s=o}for(var d=s;d&&"\n"==r[d-1];)d--;if(l.s=l.s.slice(0,d),a){var u;if(l.size){var h;for(s=l.s.length;d&&"\n"!=r[d];)d-=1;for(h=d+1;d&&"\n"==r[d-1];)d-=1;if(l.s=l.s.slice(0,d),d>0){f=new Ke;t.blockStack.push(f),ct(f,t,l.s),t.callbacks.paragraph&&t.callbacks.paragraph(e,f,t.context),t.blockStack.pop(),l.s=l.s.slice(h,s)}else l.s=l.s.slice(0,s)}u=new Ke,t.spanStack.push(u),ct(u,t,l.s),t.callbacks.header&&t.callbacks.header(e,u,a,t.context),t.spanStack.pop()}else{var f=new Ke;t.blockStack.push(f),ct(f,t,l.s),t.callbacks.paragraph&&t.callbacks.paragraph(e,f,t.context),t.blockStack.pop()}return o}function pt(e,t,r){var n,s,o=null,a=new Ke;if(0==(n=Je(r,a)))return 0;for(o=new Ke,t.blockStack.push(o);n<r.length;){var i,l=new Ke;if(0!=(i=Je(r.slice(n),l))&&0==l.s.length){n+=i;break}for(s=n+1;s<r.length&&"\n"!=r[s-1];s++);if(n<s){var c=r.slice(n,s);Xe(c)?o.s+="\n":o.s+=c}n=s}return o.s.length&&"\n"!=o.s[o.s.length-1]&&(o.s+="\n"),t.callbacks.blockcode&&t.callbacks.blockcode(e,o,a.s.length?a:null,t.context),t.blockStack.pop(),n}function mt(e,t,r){var n,s,o,a=r.length,i=null;for(t.blockStack.push(i=new Ke),n=0;n<a;){for(s=n+1;s<a&&"\n"!=r[s-1];s++);if(o=at(r.slice(n,s)))n+=o;else if(!Xe(r.slice(n,s)))break;n<s&&(Xe(r.slice(n,s))?i.s+="\n":i.s+=r.slice(n,s)),n=s}for(var l=i.s.length;l&&"\n"==i.s[l-1];)l-=1;return i.s=i.s.slice(0,l),i.s+="\n",t.callbacks.blockcode&&t.callbacks.blockcode(e,i,null,t.context),t.blockStack.pop(),n}function bt(e,t,r,n){for(var s,o,a,i,l=r.length,c=null,d=0,u=0,h=0,f=0,g=0,p=0;h<3&&h<l&&" "==r[h];)h++;if((d=lt(r))||(d=it(r)),!d)return 0;for(o=d;o<l&&"\n"!=r[o-1];)o++;for(t.spanStack.push(c=new Ke),t.spanStack.push(s=new Ke),c.s+=r.slice(d,o),d=o;d<l;){var m,b;for(o++;o<l&&"\n"!=r[o-1];)o++;if(Xe(r.slice(d,o)))f=1,d=o;else{for(i=0;i<4&&d+i<o&&" "==r[d+i];)i++;if(a=i,t.flags&je&&0!=Je(r.slice(d+i,o),null)&&(p=!p),p||(m=lt(r.slice(d+i,o)),b=it(r.slice(d+i,o))),f&&(n.p&se&&m||!(n.p&se)&&b)){n.p|=ae;break}if(m&&!Ye(r.slice(d+i,o))||b){if(f&&(g=1),a==h)break;u||(u=c.s.length)}else{if(f&&0==a){n.p|=ae;break}f&&(c.s+="\n",g=1)}f=0,c.s+=r.slice(d+i,o),d=o}}return g&&(n.p|=oe),n.p&oe?u&&u<c.s.length?(_t(s,t,c.s.slice(0,u)),_t(s,t,c.s.slice(u))):_t(s,t,c.s):u&&u<c.s.length?(ct(s,t,c.s.slice(0,u)),_t(s,t,c.s.slice(u))):ct(s,t,c.s),t.callbacks.listitem&&t.callbacks.listitem(e,s,n.p,t.context),t.spanStack.pop(),t.spanStack.pop(),d}function vt(e,t,r,n){var s,o,a=r.length,i=0;for(t.blockStack.push(o=new Ke);i<a;){var l={p:n};if(s=bt(o,t,r.slice(i),l),n=l.p,i+=s,!s||n&ae)break}return t.callbacks.list&&t.callbacks.list(e,o,n,t.context),t.blockStack.pop(),i}function wt(e,r,n,s,o){var a,i,l,c=0;if(r.callbacks.table_cell&&r.callbacks.table_row){for(r.spanStack.push(l=new Ke),c<n.length&&"|"==n[c]&&c++,a=0;a<s.length&&c<n.length;++a){var d,u,h;for(r.spanStack.push(h=new Ke);c<n.length&&t(n[c]);)c++;for(d=c;c<n.length&&"|"!=n[c];)c++;for(u=c-1;u>d&&t(n[u]);)u--;ct(h,r,n.slice(d,1+u)),r.callbacks.table_cell(l,h,s[a]|o,r.context,0),r.spanStack.pop(),c++}if((i=s.length-a)>0){r.callbacks.table_cell(l,null,s[a]|o,r.context,i)}r.callbacks.table_row(e,l,r.context),r.spanStack.pop()}}function kt(e,r,n){var s,o,a,i={p:null};if(r.spanStack.push(o=new Ke),r.blockStack.push(a=new Ke),s=function(e,r,n,s){for(var o,a,i,l=0,c=0;l<n.length&&"\n"!=n[l];)"|"==n[l++]&&c++;if(l==n.length||0==c)return 0;for(a=l;a>0&&t(n[a-1]);)a--;if("|"==n[0]&&c--,a&&"|"==n[a-1]&&c--,c+1>r.maxTableCols)return 0;s.p=new Array(c+1);for(var d=0;d<s.p.length;d++)s.p[d]=0;for(++l<n.length&&"|"==n[l]&&l++,i=l;i<n.length&&"\n"!=n[i];)i++;for(o=0;o<s.p.length&&l<i;++o){for(var u=0;l<i&&" "==n[l];)l++;for(":"==n[l]&&(l++,s.p[o]|=Pe,u++);l<i&&"-"==n[l];)l++,u++;for(l<i&&":"==n[l]&&(l++,s.p[o]|=Ue,u++);l<i&&" "==n[l];)l++;if(l<i&&"|"!=n[l])break;if(u<1)break;l++}return o<s.p.length?0:(wt(e,r,n.slice(0,a),s.p,Ze),i+1)}(o,r,n,i),s>0){for(;s<n.length;){var l,c=0;for(l=s;s<n.length&&"\n"!=n[s];)"|"==n[s++]&&c++;if(0==c||s==n.length){s=l;break}wt(a,r,n.slice(l,s),i.p,0),s++}r.callbacks.table&&r.callbacks.table(e,o,a,r.context)}return r.spanStack.pop(),r.blockStack.pop(),s}function _t(e,t,r){var n,s,o=0;if(!(t.spanStack.length+t.blockStack.length>t.nestingLimit))for(;o<r.length;)if(s=r.slice(o),r.length-o,rt(t,s))o+=dt(e,t,s);else if("<"==r[o]&&t.callbacks.blockhtml&&0!=(n=ht(e,t,s,1)))o+=n;else if(0!=(n=Xe(s)))o+=n;else if(Ye(s)){for(t.callbacks.hrule&&t.callbacks.hrule(e,t.context);o<r.length&&"\n"!=r[o];)o++;o++}else 0!=(t.extensions&je)&&0!=(n=pt(e,t,s))||0!=(t.extensions&$e)&&0!=(n=kt(e,t,s))?o+=n:ot(s)?o+=ft(e,t,s):at(s)?o+=mt(e,t,s):lt(s)?o+=vt(e,t,s,0):it(s)?o+=vt(e,t,s,se):o+=gt(e,t,s)}function yt(e,t,r,n){var s,o,a,i,l,c,d,u=0;if(t+3>=r)return 0;if(" "==e[t]&&(u=1," "==e[t+1]&&(u=2," "==e[t+2]&&(u=3," "==e[t+3]))))return 0;if("["!=e[u+=t])return 0;for(s=++u;u<r&&"\n"!=e[u]&&"\r"!=e[u]&&"]"!=e[u];)u++;if(u>=r||"]"!=e[u])return 0;if(o=u,++u>=r||":"!=e[u])return 0;for(u++;u<r&&" "==e[u];)u++;for(u<r&&("\n"==e[u]||"\r"==e[u])&&++u<r&&"\r"==e[u]&&"\n"==e[u-1]&&u++;u<r&&" "==e[u];)u++;if(u>=r)return 0;for("<"==e[u]&&u++,a=u;u<r&&" "!=e[u]&&"\n"!=e[u]&&"\r"!=e[u];)u++;for(i=">"==e[u-1]?u-1:u;u<r&&" "==e[u];)u++;if(u<r&&"\n"!=e[u]&&"\r"!=e[u]&&"'"!=e[u]&&'"'!=e[u]&&"("!=e[u])return 0;if(d=0,(u>=r||"\r"==e[u]||"\n"==e[u])&&(d=u),u+1<r&&"\n"==e[u]&&"\r"==e[u+1]&&(d=u+1),d)for(u=d+1;u<r&&" "==e[u];)u++;if(l=c=0,u+1<r&&("'"==e[u]||'"'==e[u]||"("==e[u])){for(l=++u;u<r&&"\n"!=e[u]&&"\r"!=e[u];)u++;for(c=u+1<r&&"\n"==e[u]&&"\r"==e[u+1]?u+1:u,u-=1;u>l&&" "==e[u];)u-=1;u>l&&("'"==e[u]||'"'==e[u]||")"==e[u])&&(d=c,c=u)}if(!d||i==a)return 0;var h=e.slice(s,o),f=e.slice(a,i),g=null;return c>l&&(g=e.slice(l,c)),n.refs[h]={id:h,link:new Ke(f),title:new Ke(g)},d}function xt(e,t){for(var r=0,n=0;r<t.length;){for(var s=r;r<t.length&&"\t"!=t[r];)r++,n++;if(r>s&&(e.s+=t.slice(s,r)),r>=t.length)break;do{e.s+=" ",n++}while(n%4);r++}}Ke.prototype.truncate=function(e){if(this.s.length<e)throw new RangeError("Buffer smaller than desired size");if(e<0)throw new RangeError("Size argument is negative");this.s=this.s.slice(0,e)},Ge.prototype.getChar=function(e){var t=this.offset+e;if(t>=this.s.length||t<0)throw new RangeError("Character index out of bounds");return this.s.slice(t,t+1)},Ge.prototype.toString=function(){return this.s.slice(this.offset)},Ve.prototype.render=function(e){var t,r=new Ke,n=0;for(this.refs={};n<e.length;)if(t=yt(e,n,e.length,this))n=t;else{for(t=n;t<e.length&&"\n"!=e[t]&&"\r"!=e[t];)t++;for(t>n&&xt(r,e.slice(n,t));t<e.length&&("\n"==e[t]||"\r"==e[t]);)("\n"==e[t]||t+1<e.length&&"\n"!=e[t+1])&&(r.s+="\n"),t++;n=t}var s=new Ke;return this.callbacks.doc_header&&this.callbacks.doc_header(s,this.context),r.s.length&&("\n"!=r.s[r.s.length-1]&&"\r"!=r.s[r.s.length-1]&&(r.s+="\n"),_t(s,this,r.s)),this.callbacks.doc_footer&&this.callbacks.doc_footer(s,this.context),s.s},e.getParser=function(e,t,r,n){var s=new Ve;e&&(s.callbacks=e.callbacks),r&&(s.nestingLimit=r),r&&(s.maxTableCols=n),e&&(s.context=e.context),null!=t&&null!=t&&(s.extensions=t);var o=s.callbacks;return(o.emphasis||o.double_emphasis||o.triple_emphasis)&&(s.activeChars["*"]=le,s.activeChars._=le,16&s.extensions&&(s.activeChars["~"]=le)),o.codespan&&(s.activeChars["`"]=ce),o.linebreak&&(s.activeChars["\n"]=de),(o.image||o.link)&&(s.activeChars["["]=ue),s.activeChars["<"]=he,s.activeChars["\\"]=fe,s.activeChars["&"]=ge,8&s.extensions&&(512&s.extensions||(s.activeChars["@"]=me),s.activeChars[":"]=pe,s.activeChars.w=be,s.activeChars["/"]=ve),128&s.extensions&&(s.activeChars["^"]=we),s};var St=Oe|Ee|Ie|qe|Ne,$t=Oe|Ie|Re|qe|Ne,jt=["colspan","rowspan","cellspacing","cellpadding","scope"],Ct=["tr","th","td","table","tbody","thead","tfoot","caption"];e.DEFAULT_HTML_ELEMENT_WHITELIST=Ct,e.DEFAULT_HTML_ATTR_WHITELIST=jt,e.DEFAULT_BODY_FLAGS=St,e.DEFAULT_WIKI_FLAGS=$t,e.HTML_SKIP_HTML=Oe,e.HTML_SKIP_STYLE=Ae,e.HTML_SKIP_IMAGES=Ee,e.HTML_SKIP_LINKS=Me,e.HTML_EXPAND_TABS=16,e.HTML_SAFELINK=Ie,e.HTML_TOC=Le,e.HTML_HARD_WRAP=De,e.HTML_USE_XHTML=Ne,e.HTML_ESCAPE=qe,e.HTML_ALLOW_ELEMENT_WHITELIST=Re,e.MKDEXT_NO_INTRA_EMPHASIS=Se,e.MKDEXT_TABLES=$e,e.MKDEXT_FENCED_CODE=je,e.MKDEXT_AUTOLINK=8,e.MKDEXT_STRIKETHROUGH=16,e.MKDEXT_SPACE_HEADERS=Ce,e.MKDEXT_SUPERSCRIPT=128,e.MKDEXT_LAX_SPACING=Te,e.MKDEXT_NO_EMAIL_AUTOLINK=512,e.SD_AUTOLINK_SHORT_DOMAINS=ke,e.MKDA_NOT_AUTOLINK=_e,e.MKDA_NORMAL=ye,e.MKDA_EMAIL=xe,"function"==typeof define&&define("snuownd",[],e)}((()=>{const e="undefined"!=typeof window?window:"undefined"!=typeof globalThis?globalThis:{};return e.SnuOwnd||(e.SnuOwnd={}),e.SnuOwnd})());const D=("undefined"!=typeof window?window:"undefined"!=typeof globalThis?globalThis:{}).SnuOwnd.getParser(),N=e=>D.render((e||"").replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<")).replace(/href="\//g,'href="https://www.reddit.com/'),q=chrome.runtime,R=a.Z.div`
  width: 320px;
  padding: ${d.md};
  font-size: 14px;
`,P=a.Z.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${d.sm};
  gap: ${d.sm};
`,U=a.Z.div`
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.01em;
`,z=a.Z.div`
  font-size: 11px;
  color: var(--text-secondary);
  margin: -6px 0 8px;
`,F=(0,a.Z)(_)`
  padding: ${d.xs} ${d.md};
  margin: ${d.sm} 0;
`,Z=a.Z.a`
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
`,W=a.Z.span`
  min-width: 2em;
  text-align: center;
  padding: 2px 8px;
  border-radius: ${c.pill};
  background: var(--bg-surface-hover);
  color: var(--text-secondary);
  font-size: 0.82em;
  font-weight: 600;
`,K=(0,a.Z)(W)`
  background: var(--accent);
  color: var(--text-on-accent);
`,G=a.Z.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
`,V=a.Z.span`
  color: ${e=>e.active?"var(--text-primary)":"var(--text-secondary)"};
  cursor: pointer;
  font-size: 0.92em;
`,X=a.Z.label`
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
`,Y=(0,a.Z)(_)`
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
`,re=a.Z.button`
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
`,ne=a.Z.div`
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
`;function oe({type:e,checked:t,onToggle:r}){return(0,n.jsxs)(G,{children:[(0,n.jsxs)(V,{active:t,onClick:()=>r(!t),children:[t?"subscribed":"subscribe"," to ",e]}),(0,n.jsxs)(X,{children:[(0,n.jsx)("input",{type:"checkbox",checked:t,onChange:e=>r(e.target.checked)}),(0,n.jsx)("span",{className:"slider"})]})]})}function ae({thing:e,isUser:t,unseenCount:r,totalStr:s,url:o}){const a=r>0?K:W;return(0,n.jsxs)(Z,{href:o,target:"_blank",onClick:r=>{r.preventDefault(),chrome.storage.sync.get(void 0,(r=>{(0,x.Sy)(r,e,t),(0,x.lY)(e).catch((()=>{})),(0,x.FB)(r).then((()=>{chrome.tabs.create({url:o}),window.close()}))}))},children:[(0,n.jsx)(B,{children:e}),(0,n.jsx)(a,{children:s??r}),(0,n.jsx)(H,{className:"sub-chev","aria-hidden":"true",children:"›"})]})}function ie({message:e,onDismiss:t}){return(0,n.jsxs)(Y,{children:[(0,n.jsx)("button",{className:"dismiss",onClick:t,"aria-label":"Dismiss",children:"×"}),(0,n.jsx)("h4",{children:e.title}),(0,n.jsx)("div",{className:"md-body",dangerouslySetInnerHTML:{__html:N(e.body_markdown)}})]})}(0,o.createRoot)(document.getElementById("root")).render((0,n.jsx)((function(){const[e,t]=(0,s.useState)(null),[r,o]=(0,s.useState)(null),[a,i]=(0,s.useState)(void 0),[c,u]=(0,s.useState)(!1),[h,f]=(0,s.useState)(null),[g,$]=(0,s.useState)(null),[C,T]=(0,s.useState)(!1),[O,A]=(0,s.useState)(null),[M,I]=(0,s.useState)(!1),[D,N]=(0,s.useState)(null),[Z,B]=(0,s.useState)(null),[H,W]=(0,s.useState)("");(0,s.useEffect)((()=>{const e=()=>{try{chrome.runtime.sendMessage({action:"get-diag-status"},(e=>{chrome.runtime.lastError||!e||e.error||W(((e,t=Date.now())=>{const r=[];return e.lastCheck&&r.push(`last check ${y(1e3*e.lastCheck)}`),e.backoffRemainingMs&&e.backoffRemainingMs>0?r.push(`paused ~${Math.max(1,Math.ceil(e.backoffRemainingMs/6e4))} min (Reddit rate limit)`):e.nextCheck&&e.nextCheck>t&&r.push(`next ~${y(e.nextCheck)}`),r.join(" · ")})(e))}))}catch{}};e();const t=window.setInterval(e,3e4);return()=>window.clearInterval(t)}),[]);const[K,G]=(0,s.useState)(null),[V,X]=(0,s.useState)(null),[le,ce]=(0,s.useState)(0),[de,ue]=(0,s.useState)(null),[he,fe]=(0,s.useState)("dark"),[ge,pe]=(0,s.useState)(!1),me=(0,s.useCallback)((()=>{o(null),i(void 0),f(null),$(null),T(!1),A(null),I(!1),N(null),B(null),chrome.storage.local.get(["error_status"],(e=>{t(e?.error_status||null)})),(0,x.b1)((async(e,t)=>{const r=e.other;delete e.other,o({users:e,otherUnseen:r.unseen,otherTotal:Object.keys(t.other_subscriptions).length}),chrome.tabs.query({url:["*://*.reddit.com/*"]},(e=>{const t=e.filter((e=>{try{const t=new URL(e.url).hostname;return"www.reddit.com"===t||"old.reddit.com"===t}catch{return!1}}));e.length>0&&0===t.length&&chrome.storage.local.get(["subdomain_warning_shown"],(e=>{e.subdomain_warning_shown||(u(!0),chrome.storage.local.set({subdomain_warning_shown:!0}))}))})),chrome.storage.local.get(["last_logged_in_user"],(e=>{i(e?.last_logged_in_user||null)}))})),chrome.storage.sync.get(void 0,(e=>{f(e),chrome.tabs.query({active:!0,currentWindow:!0},(e=>{const t=e[0]?.url;if(t){const[e,r]=(0,l.NS)(t);$({url:t,postID:e,commentID:r})}}))})),(0,x.VU)().then((e=>ce(e))),chrome.storage.local.get(["pending_post_progress"],(e=>{const t=e?.pending_post_progress;ue(t&&"number"==typeof t.total?{processed:t.processed||0,total:t.total}:null)})),(0,L.aL)().finally((()=>{(0,L.FZ)().then((e=>{G(e[0]||null)})),(0,L.fX)().then((e=>{e&&chrome.storage.local.get(["dismissed_update_notice_version"],(t=>{if(t.dismissed_update_notice_version!==e){X(e);try{q.requestUpdateCheck?.((()=>{q.lastError}))}catch{}}}))}))}))}),[]);(0,s.useEffect)((()=>{me()}),[me]),(0,s.useEffect)((()=>{const e=(e,t)=>{if("local"===t&&e.pending_post_lookups){const t=e.pending_post_lookups.newValue||[];ce(t.length),0===t.length&&ue(null)}if("local"===t&&e.pending_post_progress){const t=e.pending_post_progress.newValue;ue(t&&"number"==typeof t.total?{processed:t.processed||0,total:t.total}:null)}};return chrome.storage.onChanged.addListener(e),()=>chrome.storage.onChanged.removeListener(e)}),[]),(0,s.useEffect)((()=>{chrome.storage.local.get([p],(e=>{const t=e[p]||"auto",r="auto"===t?window.matchMedia?.("(prefers-color-scheme: light)").matches?"light":"dark":t;fe(r)}))}),[]),(0,s.useEffect)((()=>{chrome.storage.local.get(["dismissed_release_version"],(e=>{"0.0.5.27"!==e.dismissed_release_version&&pe(!0)}))}),[]);const be=()=>{I(!0),chrome.runtime.sendMessage({action:"try-reconnect"},(e=>{e?.success?(N({success:!0,user:e.user}),setTimeout((()=>me()),1e3)):(I(!1),B(e?.indeterminate?`Reddit isn't answering the login check${e.reason?` (${e.reason})`:""}. If you're already logged in, open www.reddit.com in a tab and try again.`:"Could not detect user. Make sure you are logged in to Reddit."))}))},ve=(e,t,r)=>{(t?x.Pd:x.VQ)(e,(async()=>{chrome.runtime.sendMessage({action:"update-badge"}),t&&await((e,t)=>{const[r,n]=(0,l.NS)(t||"");!e.startsWith("t1_")||!r||n&&n!==e||j().storage.local.get({[S.EW]:{}}).then((t=>j().storage.local.set({[S.EW]:{...t[S.EW],[e]:r.replace(/^t3_/,"")}}))).catch((()=>{}));let s=0;return t.match(/^https:\/\/www.reveddit.com/)&&(s=1),chrome.storage.sync.get(void 0,(function(t){(0,S.v0)().then((r=>E([e],"other",!1,r,t,s,{})))}))})(e,r),me()}))},we=[];h&&g&&(g.commentID&&we.push({id:g.commentID,type:"comment",subscribed:g.commentID in(h.other_subscriptions||{})}),g.postID&&we.push({id:g.postID,type:"post",subscribed:g.postID in(h.other_subscriptions||{})}));const ke=(r?.otherUnseen.length??0)>0||Object.values(r?.users??{}).some((e=>e.unseen.length>0)),_e=chrome.runtime.getURL("src/history.html");let ye=chrome.runtime.getURL("src/other.html");r&&r.otherUnseen.length&&(ye=`https://www.reveddit.com/info?id=${r.otherUnseen.join(",")}&removal_status=all`);let xe=null;if(void 0!==a&&r)if(a){const e=r.users[a],t=e?e.unseen:[];xe=(0,n.jsx)(ae,{thing:a,isUser:!0,unseenCount:t.length,url:_e})}else xe=(0,n.jsx)("div",{children:D?.success?(0,n.jsxs)(w,{variant:"success",children:["✓ Connected as ",D.user,"!"]}):(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(w,{variant:"info",children:Z||"Log in to www.reddit.com or old.reddit.com to get started."}),(0,n.jsx)(v,{onClick:be,disabled:M,children:M?"Connecting...":"Connect"})]})});return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(b,{}),(0,n.jsxs)(R,{children:[(0,n.jsxs)(P,{children:[(0,n.jsx)(U,{children:"reveddit real-time"}),(0,n.jsx)(J,{onClick:()=>{const e="dark"===he?"light":"dark";var t;fe(e),t=e,chrome.storage.local.set({[p]:t}),m(t)},"aria-label":"Toggle theme",children:"dark"===he?"🌙":"☀️"})]}),H&&(0,n.jsx)(z,{children:H}),V&&(0,n.jsxs)(Y,{children:[(0,n.jsx)("button",{className:"dismiss",onClick:()=>{V&&chrome.storage.local.set({dismissed_update_notice_version:V}),X(null)},"aria-label":"Dismiss",children:"×"}),(0,n.jsxs)("h4",{children:["Update available: v",V]}),(0,n.jsxs)("div",{className:"md-body",children:["Your browser hasn't installed it yet. Open chrome://extensions, turn on Developer mode (top right), and press Update."," ",(0,n.jsx)("a",{href:"https://www.reveddit.com/update-help",target:"_blank",rel:"noopener noreferrer",children:"Still stuck?"})]})]}),ge&&{version:"0.0.5.27",description:"removal checks recover on their own when reddit refuses some requests; safer reveddit.com connection"}&&(0,n.jsxs)(Y,{children:[(0,n.jsx)("button",{className:"dismiss",onClick:()=>{pe(!1),chrome.storage.local.set({dismissed_release_version:"0.0.5.27"})},"aria-label":"Dismiss",children:"×"}),(0,n.jsxs)("h4",{children:["v","0.0.5.27"," released"]}),(0,n.jsx)("div",{className:"md-body",children:"removal checks recover on their own when reddit refuses some requests; safer reveddit.com connection"})]}),K&&(0,n.jsx)(ie,{message:K,onDismiss:()=>{if(!K)return;const e=K.id;(0,L.XO)(e).then((()=>(0,L.FZ)())).then((e=>{G(e[0]||null)}))}}),e&&(a||"logged_in_view_unavailable"===e)&&(0,n.jsx)("div",{children:O?(0,n.jsx)(w,{variant:"success",children:"✓ Connected!"}):"rate_limited"===e?(0,n.jsx)(w,{variant:"warning",children:"⚠ Reddit is rate-limiting requests. Monitoring will resume automatically."}):"reddit_blocked"===e?(0,n.jsx)(w,{variant:"warning",children:"⚠ Reddit blocked the extension's last request (HTTP 403). It keeps retrying; opening a www.reddit.com tab usually clears this."}):"profile_publicly_empty"===e?(0,n.jsx)(w,{variant:"warning",children:"⚠ Your profile appears empty to logged-out users — possibly a shadowban. Removal alerts are paused. You can appeal at reddit.com/appeals."}):"public_view_unavailable"===e?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(w,{variant:"warning",children:"⚠ Removal monitoring is paused — Reddit's public view isn't loading. Opening a www.reddit.com tab usually restores it."}),(0,n.jsx)(v,{onClick:()=>chrome.tabs.create({url:"https://www.reddit.com/",active:!0}),children:"Open www.reddit.com"})]}):"absent_verify_unavailable"===e?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(w,{variant:"warning",children:"⚠ Reddit isn't letting the extension confirm whether missing content was removed, so some removals can't be detected. Keeping a www.reddit.com tab open usually restores this. If it keeps up, copy the diagnostic log from options and report it."}),(0,n.jsx)(v,{onClick:()=>chrome.tabs.create({url:"https://www.reddit.com/",active:!0}),children:"Open www.reddit.com"})]}):"profile_pagination_unavailable"===e?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(w,{variant:"warning",children:"⚠ Reddit stopped loading the older pages of your public profile, so removals of your older posts and comments can't be checked right now. Keeping a www.reddit.com tab open usually restores this."}),(0,n.jsx)(v,{onClick:()=>chrome.tabs.create({url:"https://www.reddit.com/",active:!0}),children:"Open www.reddit.com"})]}):"logged_in_view_unavailable"===e?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(w,{variant:"warning",children:"⚠ Reddit isn't answering the extension's login check, so monitoring may be paused. Opening a www.reddit.com tab usually restores it. If this keeps up, copy the diagnostic log from options and report it."}),(0,n.jsx)(v,{onClick:()=>chrome.tabs.create({url:"https://www.reddit.com/",active:!0}),children:"Open www.reddit.com"})]}):(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(w,{variant:"warning",children:!1===O?"⚠ Still disconnected. Try logging into Reddit again.":"⚠ Session may be disconnected."}),(0,n.jsx)(v,{onClick:()=>{T(!0),chrome.runtime.sendMessage({action:"store-reddit-cookies"}),setTimeout((()=>{chrome.runtime.sendMessage({action:"try-reconnect"},(e=>{e?.success?(A(!0),setTimeout((()=>me()),1e3)):(T(!1),A(!1))}))}),500)},disabled:C,children:C?"Checking...":"Reconnect"})]})}),we.length>0&&(0,n.jsx)(_,{style:{padding:`${d.sm} ${d.md}`,margin:`${d.sm} 0`},children:we.map((e=>(0,n.jsx)(oe,{type:e.type,checked:e.subscribed,onToggle:t=>ve(e.id,t,g.url)},e.id)))}),c&&(0,n.jsx)(w,{variant:"warning",children:"⚠ User monitoring requires www.reddit.com or old.reddit.com"}),le>0&&(0,n.jsxs)(w,{variant:"info",children:[(0,n.jsx)(k,{}),de&&de.total>0?`Scanning ${Math.min(de.processed,de.total)} of ${de.total} posts for removals…`:`Scanning ${le} posts for removals…`]}),(0,n.jsxs)(F,{children:[xe,r&&(0,n.jsx)(ae,{thing:"other",isUser:!1,unseenCount:r.otherUnseen.length,totalStr:`${r.otherUnseen.length} / ${r.otherTotal}`,url:ye}),(0,n.jsx)(Q,{children:(0,n.jsx)(ee,{href:"#",$enabled:ke,"aria-disabled":!ke,onClick:e=>{e.preventDefault(),ke&&(0,x.aL)().then((()=>me()))},children:"mark all as seen"})})]}),(0,n.jsxs)(te,{children:[(0,n.jsx)(re,{onClick:()=>{chrome.tabs.create({url:_e}),window.close()},children:"History"}),(0,n.jsx)(re,{onClick:()=>(0,l.Fm)(),children:"Options"})]}),(0,n.jsxs)(ne,{children:[(0,n.jsx)(se,{href:"#",onClick:e=>{e.preventDefault(),(0,l.sc)({notificationId:"test",title:"Reveddit test notification",message:(0,l.Vk)((h||{}).options||{})})},children:"send a test notification"}),(0,n.jsx)(se,{href:"https://github.com/reveddit/real-time-extension/issues",target:"_blank",rel:"noopener noreferrer",children:"feedback"})]})]})]})}),{}))},9217:(e,t,r)=>{r.d(t,{EW:()=>Ve,v0:()=>at,my:()=>se});var n=r(7785),s=r(3150),o=r.n(s),a=r(4007),i=r(7163),l=r(2811),c=r(1005),d=r(9244);const u=/\bthing-id="(t[13]_[a-z0-9]+)"/g,h=/<shreddit-comment-action-row\b([^>]*)>/g,f=/<shreddit-feed-load-more-observer\b[^>]*\bcursor="([^"]+)"/g,g=/([\w-]+)="([^"]*)"/g,p=/have any (posts|comments) yet/i,m=/js_challenge/,b=/<title[^>]*>([^<]*)<\/title>/i,v=/^\s*(?:Reddit\s*-\s*)?Prove your humanity\s*$/i,w=e=>{const t=e.match(b);return Boolean(t&&v.test(t[1]))},k=e=>parseInt(e.split("_")[1],36),_=(e,t,r)=>t.some((t=>Object.prototype.hasOwnProperty.call(e,t)&&e[t]===r)),y=e=>{const t={};for(const r of e.matchAll(g))t[r[1]]=r[2];return t},x={comments:{path:"comments",partialFeed:"profile_comments-more-posts",typePrefix:"t1_"},posts:{path:"submitted",partialFeed:"profile_posts-more-posts",typePrefix:"t3_"}},S=(e,t,r)=>`${l.oG}/svc/shreddit/profiles/${x[t].partialFeed}/new/?sort=new&after=${encodeURIComponent(r)}&name=${encodeURIComponent(e)}&feedLength=8`,$=(e,t)=>{const r=new Set,n=[],s=e=>{e.startsWith(t)&&!r.has(e)&&(r.add(e),n.push(e))};for(const t of e.matchAll(u))s(t[1]);const o=new Map;for(const t of e.matchAll(h)){const e={};for(const r of t[1].matchAll(g))e[r[1]]=r[2];const r=e["comment-id"];r&&(s(r),o.set(r,{...void 0!==e.score&&""!==e.score&&{score:Number(e.score)},...e.permalink&&{permalink:e.permalink}}))}const a=[...e.matchAll(f)].map((e=>e[1]));return{ids:n,rows:o,cursor:a.length?a[a.length-1]:null,emptyState:p.test(e),hasItems:n.length>0}},j=/awaiting moderator approval/i,C=/(removed by (the )?moderators?|removed by reddit|reddit'?s? spam filters?|deleted by (the )?(author|user)|banned from this community|community is private)/i,T=/<shreddit-post(?![\w-])([^>]*)>/g,O=(e,t)=>{const{postIdAttributes:r}=(0,d.KP)(),n=[...e.matchAll(T)].find((e=>_(y(e[1]),r,t)));if(!n)return{status:"unknown"};const s=y(n[1]),o=s["created-timestamp"]?Date.parse(s["created-timestamp"]):NaN,a={...s.author&&{author:s.author},...s["post-title"]&&{title:s["post-title"]},...Number.isFinite(o)&&{created_utc:Math.floor(o/1e3)},...s["subreddit-name"]&&{subreddit:s["subreddit-name"]}},i=n.index||0,l=e.indexOf("</shreddit-post>",i),c=e.slice(i,-1===l?Math.min(e.length,i+1e5):l);return j.test(c)?{status:"held",...a}:C.test(c)?{status:"removed",...a}:{status:"live",...a}},A=/^\/r\/([^/]+)\/comments\/([^/]+)\//,E=/<shreddit-comment(?![\w-])([^>]*)>/g,M=/<shreddit-comment-tree(?![\w-])([^>]*)>/g,I=/<shreddit-comment-tree\b|<shreddit-post\b/,L=(e,t,r="removed")=>{const{commentIdAttributes:n}=(0,d.KP)();for(const r of e.matchAll(E)){const e=y(r[1]);if(_(e,n,t)){const t=e.author;return t?t.startsWith("[")?"removed":"live":"unknown"}}return[...e.matchAll(M)].some((e=>_(y(e[1]),n,t)))?r:"unknown"},D=/[?&]js_challenge=1(&|$)/,N=(e,t)=>{if(!m.test(e))return null;const r=(0,c.kX)(),n=(()=>{try{return e.match(new RegExp(r.solutionRegex))}catch{return null}})();if(!n||void 0===n[1])return null;const s=t=>{const r=e.match(new RegExp(`<input[^>]*\\bname="${t}"[^>]*\\bvalue="([^"]*)"`));return r?r[1]:null};let o=null,a=null;for(const e of r.tokenFields)if(a=s(e),null!==a){o=e;break}if(null===o||null===a)return null;const i=n[1]+n[1],l=t.includes("?")?"&":"?";let d=`${t}${l}solution=${encodeURIComponent(i)}&js_challenge=1&${o}=${encodeURIComponent(a)}`;const u=s("jsc_orig_r");return null!==u&&(d+=`&jsc_orig_r=${encodeURIComponent(u)}`),d},q=e=>{const t=(e.match(/<title[^>]*>([^<]{0,60})/)||[])[1]||"",r=(e.match(/<link\b[^>]*\brel="canonical"[^>]*>/)||[])[0],n=r&&(r.match(/\bhref="(?:https?:\/\/[^/"]+)?([^"]{0,80})"/)||[])[1],s=w(e)?" wall=captcha":"",o=/\bid="shreddit-redirect"/.test(e)?" shell=redirect":"";return`bytes=${e.length} challenge=${m.test(e)?1:0} scaffold=${I.test(e)?1:0} title=${JSON.stringify(t)}`+(void 0!==n?` canonical=${JSON.stringify(n)}`:"")+s+o},R=async(e,t,r,n,s)=>{const{typePrefix:o}=x[t],a=new Map,i=e=>({items:a,valid:!1,emptyState:!1,floor:1/0,error:e}),c=e=>{const t=$(e,o);return t.hasItems||t.emptyState},d=(e=>t=>{const r=$(t,e);return r.hasItems||null===r.cursor&&!/<html\b/i.test(t)&&t.length<4096})(o),u=((e,t)=>`${l.oG}/user/${encodeURIComponent(e)}/${x[t].path}/?sort=new`)(e,t);let h=await r(u,c),f=$(h,o);if(!f.hasItems&&!f.emptyState){const e=N(h,u);if(!e)return i(`${t} page unrecognized: ${q(h)}`);if(h=await r(e,c),f=$(h,o),!f.hasItems&&!f.emptyState)return i(`${t} page unrecognized after challenge solve: ${q(h)}`)}let g=0;const p=t=>{for(const r of t.ids){a.set(r,{name:r,author:e,...t.rows.get(r)});const n=k(r);Number.isFinite(n)&&(g=0===g?n:Math.min(g,n))}};p(f);let m=f.cursor;null!==m&&0===g&&(g=(e=>{try{const t=k(atob(e));return Number.isFinite(t)?t:null}catch{return null}})(m)??1/0);let b,v=0;for(;null!==m&&v<s&&n.some((e=>e<g));){let n;try{n=await r(S(e,t,m),d)}catch(e){if((0,l.l8)(e))throw e;b=`${t} pagination stopped: ${String(e?.message||e).slice(0,160)}`;break}const s=$(n,o);if(!s.hasItems)break;p(s),m=s.cursor,v++}return null===m&&(g=0),{items:a,valid:!0,emptyState:f.emptyState,floor:g,...b&&{stopped:b}}},P=async(e,t,r=[],n=4)=>{const s=e=>r.filter((t=>t.startsWith(e))).map(k).filter(Number.isFinite),o=e=>({items:new Map,valid:!1,emptyProfile:!1,coverage:{t1:1/0,t3:1/0},error:e});try{const[r,a]=await Promise.allSettled([R(e,"comments",t,s("t1_"),n),R(e,"posts",t,s("t3_"),n)]);if("rejected"===r.status||"rejected"===a.status){const e=e=>"rejected"===e.status?String(e.reason?.message||e.reason):"",t=t=>/request failed: 404\b/.test(e(t)),n=e("rejected"===r.status?r:a);return t(r)&&t(a)?o(n):o(n.replace(/request failed: 404\b/g,"answered 404 (the other tab did not)"))}const i=r.value,l=a.value,c=new Map([...i.items,...l.items]),d=i.error||l.error,u=[i.stopped,l.stopped].filter(Boolean).join("; ");return{items:c,valid:i.valid&&l.valid,emptyProfile:i.emptyState&&l.emptyState&&0===c.size,coverage:{t1:i.floor,t3:l.floor},...d&&{error:d},...u&&{paginationStopped:u}}}catch(e){return o(String(e?.message||e))}};var U=r(9947),z=r(5302),F=r(67);const Z="dev_simulate_endpoint_deprecation",B=()=>o().storage.local.get({[Z]:null}).then((async e=>{const t=e[Z],r=await(0,z.Hg)(z.t);return(0,z.Mh)(null===t?null:!!t,r,false)})).catch((()=>false)),H=6048e5,W=async()=>{try{return(await o().storage.local.get({[z._9]:{}}))[z._9]||{}}catch{return{}}},K=async e=>{const t=Number((await W())[e]?.until)-Date.now();return t>0&&t<=H},G=async(e,t)=>{try{const n=await W(),s=Date.now(),i=n[e];if(i&&i.until>s)return;const l=(i?.refusals||0)+1,c=(e=>Math.min(216e5*2**Math.max(0,e-1),H))(l);n[e]={refusals:l,until:s+c,since:i?.since||s},await o().storage.local.set({[z._9]:n}),(0,a.C1)("cycle",`[reveddit] ${e} refused (${t}): resting ${r=c,`${Math.round(r/36e5)} h`}, refusal ${l} in a row since ${new Date(n[e].since).toISOString()}`)}catch{}var r},V=async e=>{try{const t=await W(),r=t[e];if(!r)return;delete t[e],await o().storage.local.set({[z._9]:t}),(0,a.C1)("cycle",`[reveddit] ${e} works again, after ${r.refusals} refusals since ${new Date(r.since).toISOString()}`)}catch{}},X=(e="legacy")=>K(e),Y=async(e="legacy")=>await B()||await X(e),J=async(e,t="legacy")=>{if(await(async e=>{if(await B())throw new Error(`${e} request failed: 403 (legacy endpoints disabled)`)})(e),await X(t))throw new Error(`${e} skipped: resting after reddit refused it`)},Q=(e,t="legacy")=>{const r=String(e?.message||e);return/request failed: 403\b/.test(r)&&!r.includes("legacy endpoints disabled")?G(t,"HTTP 403"):Promise.resolve()},ee=new Set([429]),te=e=>{const t=e.message.match(/request failed: (\d+)/);if(!t)return;const r=Number(t[1]);ee.has(r)?(0,U.jn)("rate_limited"):403!==r||e.message.includes("legacy endpoints disabled")||(0,U.jn)("reddit_blocked"),429===r&&((0,a.Sq)("ratelimit","[reveddit] 429 from Reddit — scheduling monitoring backoff"),(0,n.g7)())},re="https://www.reddit.com/",ne="none",se=(e,t,r=!1,n=!1,s=[],o="",a={})=>{const i={id:e,raw_json:1};n&&(i.quarantined_subreddits=s.join(","));const l="?"+Object.keys(i).map((e=>`${e}=${i[e]}`)).join("&");return Je("api/info",l,t,r,n,e,o,a)},oe={credentials:"omit",headers:{"Accept-Language":"en"}},ae=(e="default")=>"default"===e?oe:{...oe,cache:e};class ie extends Error{constructor(e,t,r=0){super(e),this.failure=t,this.status=r}}const le=2e4,ce=async(e,t)=>{let r;try{return await Promise.race([e,new Promise(((e,n)=>{r=setTimeout((()=>n(new ie(`${t} timed out after 20 s`,"network"))),le)}))])}finally{clearTimeout(r)}},de=e=>{const t=`www.reddit.com request failed: ${e}`;return 403===e?new ie(t,"refused",403):new Error(t)},ue=["profile","profile-partial","partial","page"],he="www_routes_v2",fe=["www_route_state","www_tab_refused_at"],ge=216e5,pe=18e5,me=500,be=(e,t)=>{const r={};for(const n of ue){const s=e?.[n];if(!s||"object"!=typeof s)continue;const o={};for(const[e,r]of Object.entries(s.routes||{})){const n=Number(r?.t);if(!((0,F.Lu)(e)&&n>0))continue;const s=Number(r?.until);o[e]={t:Math.min(n,t),...s>0&&{until:Math.min(s,t+ge)}}}const a=Number(s.served?.t);r[n]={routes:o,...(0,F.Lu)(s.served?.route)&&a>0&&{served:{route:s.served.route,t:Math.min(a,t)}}}}return r},ve=(e,t,r)=>r?.(e)?"served":w(e)?"captcha":null!==N(e,t)?(e=>D.test(e))(t)?"re-challenged":"step":r?"unrecognized":"served",we=e=>String(e.status||"network"),ke=async()=>{let e=[];try{"undefined"!=typeof chrome&&chrome.tabs&&(e=await o().tabs.query({url:["https://www.reddit.com/*"]}))}catch{}const t=e.find((e=>null!=e.id&&!e.discarded&&!e.frozen));let r=!!t,n=!!t;const s=()=>r||n;let i={};try{const e=await o().storage.local.get([he,...fe]);i=be(e[he],Date.now()),fe.some((t=>void 0!==e[t]))&&await o().storage.local.remove(fe)}catch{}const l=(0,F.CK)(await(0,z.CL)().catch((()=>({}))));let c=!1;const d=async()=>{if(c){c=!1;try{const e=(await o().storage.local.get({[he]:null}))[he];((e,t)=>{for(const r of ue){const n=t[r];if(!n)continue;const s=e[r]||(e[r]={routes:{}});for(const[e,t]of Object.entries(n.routes))(!s.routes[e]||s.routes[e].t<t.t)&&(s.routes[e]=t);n.served&&(!s.served||s.served.t<n.served.t)&&(s.served=n.served)}})(i,be(e,Date.now())),await o().storage.local.set({[he]:i})}catch{}}},u=e=>i[e]||(i[e]={routes:{}}),h=async(e,s)=>{if(r){let n;try{n=await ce(o().tabs.sendMessage(t.id,{action:"fetch-www-profile-public",url:e,cache:s}),"content-script fetch")}catch(e){n=void 0,(0,a.Sq)("feed","[reveddit] content-script www fetch failed, trying an injected fetch:",String(e?.message||e))}if(void 0!==n){if(n?.success&&"string"==typeof n.html)return n.html;const e=Number(n?.status);if(e)throw de(e);throw new ie(`www.reddit.com tab request error: ${n?.error||"no answer"}`,"network")}r=!1}if(n)try{return await(async(e,t,r=oe)=>{const n=o().scripting||"undefined"!=typeof chrome&&chrome.scripting;if(!n)throw new ie("scripting API unavailable","unavailable");let s;try{s=await ce(n.executeScript({target:{tabId:e},func:async(e,t)=>{try{const r="undefined"!=typeof content&&content&&"function"==typeof content.fetch?content:null,n=await(r?r.fetch(e,t):fetch(e,t));return{ok:n.ok,status:n.status,text:n.ok?await n.text():""}}catch(e){return{ok:!1,status:0,text:"",err:String(e)}}},args:[t,r]}),"executeScript fetch")}catch(e){throw new ie(String(e?.message||e),"unavailable")}const a=s&&s[0]&&s[0].result;if(!a||"string"!=typeof a.text)throw new ie("executeScript fetch returned no result","unavailable");if(!a.ok){if(!a.status)throw new ie(`www.reddit.com tab request error: ${a.err||"no answer"}`,"network");throw de(a.status)}return a.text})(t.id,e,ae(s))}catch(e){if(!(e instanceof ie)||"unavailable"!==e.failure)throw e;n=!1,(0,a.Sq)("feed","[reveddit] executeScript fetch unavailable, skipping tab routes:",e.message)}throw new ie("www tab fetch unavailable","unavailable")},f=(e,t)=>{const{leg:r,cache:n}=(0,F.Ut)(e);return"tab"===r?h(t,n):(async(e,t)=>{const r=new AbortController,n=setTimeout((()=>r.abort()),le);try{let n;try{n=await fetch(e,{...ae(t),signal:r.signal})}catch(e){throw new ie(`www.reddit.com request error: ${String(e?.message||e)}`,"network")}if(!n.ok)throw de(n.status);try{return await n.text()}catch(e){throw new ie(`www.reddit.com response error: ${String(e?.message||e)}`,"network")}}finally{clearTimeout(n)}})(t,n)},g=(e,t,r)=>{const n=Date.now();u(e).routes[t]={t:n,until:n+(403===r.status?ge:pe)},c=!0},p=(e,t,r)=>{const n=u(e),s=Date.now();n.routes[t]?.until&&(n.routes[t]={t:s},c=!0),n.served?.route!==t&&(n.served={route:t,t:s},c=!0,(0,a.Sq)("feed",`[reveddit] www route for ${e} pages is now ${t}`+(r.length?` (refused: ${r.join(", ")})`:"")))},m=new Set,b={};return{fetchHtml:(e,t)=>{const r=(e=>{const t=e.replace(/^https?:\/\/[^/]+/,"");return t.startsWith("/user/")?"profile":t.startsWith("/svc/shreddit/profiles/")?"profile-partial":t.startsWith("/svc/")?"partial":"page"})(e),n=(b[r]||Promise.resolve()).then((()=>(async(e,t,r)=>{const n=u(e).routes,o=Date.now(),i=e=>n[e]?.until||0,c=l.filter((e=>!e.startsWith("tab:")||s())),h=new Set(c.filter((e=>i(e)>o))),b=[...c.filter((e=>!h.has(e))),...[...h].sort(((e,t)=>i(e)-i(t)))],v=[];let w=null,k=null,_=!1;try{for(const n of b){if(n.startsWith("tab:")&&!s())continue;if(h.has(n)&&_)break;let o;v.length&&me>0&&await new Promise((e=>setTimeout(e,me)));try{o=await f(n,t)}catch(t){if(!(t instanceof ie))throw t;if("unavailable"===t.failure)continue;_||(_=h.has(n)),g(e,n,t),v.push(`${n} ${we(t)}`),(!w||403===t.status&&403!==w.status)&&(w=t);continue}_||(_=h.has(n));const a=ve(o,t,r);if("step"===a)return o;if("served"===a)return p(e,n,v),o;const i=new ie(`www.reddit.com request refused: ${a}`,"refused");g(e,n,i),v.push(`${n} ${a}`),"unrecognized"===a&&(k=o),w||(w=i)}}finally{await d()}if(v.length>1&&!m.has(e)&&(m.add(e),(0,a.Sq)("feed",`[reveddit] every www route tried for ${e} pages failed (${v.join(", ")}); refused routes rest 30 min, or 6 h after a 403`)),null!==k)return k;if(!w)throw new ie("no www fetch route available","unavailable");throw new ie(`${w.message} (refused: ${v.join(", ")})`,w.failure,w.status)})(r,e,t)));return b[r]=n.then((()=>{}),(()=>{})),n},servedRoutes:()=>Object.fromEntries(ue.filter((e=>i[e]?.served)).map((e=>[e,i[e].served.route])))}},_e="profile_publicly_empty";let ye="removed";const xe="www_detect_consecutive_failures",Se=172800,$e="www_post_page_verdicts",je=72e5,Ce=18e5,Te=(e,t,r)=>r-e>=0&&r-e<t,Oe=e=>!!(0,l.l8)(e)&&(te(e instanceof Error?e:new Error(String(e))),!0),Ae="www_absent_item_verdicts",Ee=e=>null!==e&&e<36e5?{maxPerCycle:Math.max(3,Math.floor(10)),delayMs:1e3}:{maxPerCycle:20,delayMs:500},Me="absent_verify_consecutive_failures",Ie=async e=>{try{if(e){const e=await o().storage.local.get({[Me]:0});return void(Number(e[Me]||0)>0&&await o().storage.local.remove(Me))}const t=await o().storage.local.get({[Me]:0}),r=Number(t[Me]||0)+1;await o().storage.local.set({[Me]:r}),(0,a.C1)("verify",`[reveddit] absent verification resolved nothing — consecutive cycles: ${r}`),r>=5&&(0,U.jn)("absent_verify_unavailable")}catch{}},Le="dev_disable_absent_verification",De=async(e,t,r)=>{const n=!e.startsWith("t3_")&&t.permalink?((e,t)=>{const r=e.match(A);return r?`${l.oG}/r/${r[1]}/comments/${r[2]}/comment/${t.replace(/^t1_/,"")}/`:null})(t.permalink,e):null;let s;if(e.startsWith("t3_"))s=t.permalink?.startsWith("/r/")?l.oG+t.permalink:(c=e,`${l.oG}/comments/${c.replace(/^t3_/,"")}/`);else if(n)s=n;else if(t.link_id)o=e,i=t.link_id,s=`${l.oG}/comments/${i.replace(/^t3_/,"")}/comment/${o.replace(/^t1_/,"")}/`;else{if(!t.permalink)return"unknown";s=l.oG+t.permalink}var o,i,c;const d=t=>e.startsWith("t3_")?O(t,e).status:L(t,e,ye),u=t=>"unknown"!==(e.startsWith("t3_")?O(t,e).status:L(t,e,"removed"));if(!e.startsWith("t3_")&&t.permalink){const n=((e,t)=>{const r=e.match(A);return r?`${l.oG}/svc/shreddit/comments/r/${r[1]}/${r[2]}/${t.replace(/^t1_/,"")}?render-mode=partial`:null})(t.permalink,e);if(n)try{const t=await r(n,u),s=L(t,e,ye);if("unknown"!==s)return s;(0,a.Sq)("verify",`[reveddit] ${e} svc partial unreadable, trying full page`,q(t))}catch(t){Oe(t),(0,a.Sq)("verify",`[reveddit] ${e} svc partial fetch failed, trying full page:`,String(t?.message||t))}}let h=await r(s,u),f=d(h);if("unknown"===f){const t=q(h),n=N(h,s);n?(h=await r(n,u),f=d(h),"unknown"===f&&(0,a.Sq)("verify",`[reveddit] ${e} page unreadable after challenge solve`,`${t} → ${q(h)}`)):(0,a.Sq)("verify",`[reveddit] ${e} page unreadable (no solvable challenge)`,t)}return f},Ne={commentsById:i.sT,postByPath:i.Gi},qe=async(e,t,r,s=[])=>{const i=Date.now();let l={};try{l=(await o().storage.local.get({[Ae]:{}}))[Ae]||{}}catch{}const c={},d=[];let u=0;for(const t of e){const e=l[t];if(e){const r="live"===e.v?216e5:"removed"===e.v?72e5:18e5;if(Te(e.t,r,i)){"unknown"===e.v?u++:c[t]=e.v;continue}}d.push(t)}const h=Ee(await(0,n.ax)());d.length&&h.maxPerCycle<20&&(0,a.Sq)("ratelimit",`[reveddit] absent verification budget reduced to ${h.maxPerCycle}/cycle (recent 429)`);let f=0,g=0;for(const e of d){if(f>=h.maxPerCycle)break;f>0&&await new Promise((e=>setTimeout(e,h.delayMs))),f++;try{const n=await De(e,t[e]||{},r);(0,a.Sq)("verify",`[reveddit] absent item verdict ${e}: ${n}`),l[e]={v:n,t:i},"unknown"!==n&&(c[e]=n,g++)}catch(t){if((0,a.Sq)("verify",`[reveddit] absent item verification failed ${e}:`,String(t?.message||t)),l[e]={v:"unknown",t:i},Oe(t))break}}let p=f>0;if(await(async(e,t,r,n,s={})=>{const o=e.filter((e=>!(e in r)));if(!o.length)return;const i=await Y("legacy_info")?[]:o.filter((e=>e.startsWith("t1_"))),l=await Y("legacy")?[]:o.filter((e=>e.startsWith("t3_")));if(i.length)try{const e=[...i,...t],r=await Ne.commentsById(e,null),s={};for(const e of r||[])e?.data?.name&&(s[e.data.name]=e.data);const o=t.some((e=>s[e]));o&&await V("legacy_info"),(0,a.C1)("legacy",`[reveddit] legacy comment tiebreak: ${Object.keys(s).length}/${e.length} rendered, canaryRendered=${o}`);for(const e of i){const t=s[e];t&&t.author?n(e,(0,U.Go)(t)?"removed":"live"):!t&&o&&n(e,"removed")}}catch(e){(0,a.Sq)("legacy","[reveddit] legacy comment tiebreak failed:",String(e?.message||e)),await Q(e,"legacy_info")}let c=0;for(const e of l){if(c>=5)break;c>0&&await new Promise((e=>setTimeout(e,500))),c++;try{const t=s[e]?.permalink,r=t&&t.startsWith("/r/")?t:"/comments/"+e.substring(3)+"/",o=await Ne.postByPath(r);if(o&&!o.error)n(e,o.is_removed?"removed":"live"),await V("legacy");else if((0,a.Sq)("legacy",`[reveddit] legacy post tiebreak ${e}: no page${o?.error?` (${o.error})`:""}`),403===o?.status){await Q(new Error("legacy reddit HTML request failed: 403"));break}}catch(t){(0,a.Sq)("legacy",`[reveddit] legacy post tiebreak failed ${e}:`,String(t?.message||t))}}})(e,s,c,((e,t)=>{c[e]=t,l[e]={v:t,t:i},p=!0,g++}),t),(f>0||u>0)&&(0,a.C1)("verify",`[reveddit] absent verify: ${f} fetched, ${u} paced (recent unknown), ${g} resolved this cycle`),f>0&&await Ie(g>0),p){const e=Object.entries(l).sort(((e,t)=>t[1].t-e[1].t));l=Object.fromEntries(e.slice(0,200));try{await o().storage.local.set({[Ae]:l})}catch{}}return c},Re=async(e,t="")=>{try{if(e)return void await o().storage.local.remove(xe);const r=await o().storage.local.get({[xe]:0}),n=Number(r[xe]||0)+1;await o().storage.local.set({[xe]:n}),(0,a.Sq)("feed",`[reveddit] www public-view lookup failed — consecutive failures: ${n}`+(t?` (${t})`:"")),n>=5&&(0,U.jn)("public_view_unavailable")}catch{}},Pe="public_profile_unavailable",Ue=async e=>{try{e?(await o().storage.local.set({[Pe]:{user:e,t:Date.now()}}),await o().storage.local.remove((0,n.Bl)(e))):await o().storage.local.remove(Pe)}catch{}},ze=async(e,t,r)=>{throw(0,a.Sq)("feed",`[reveddit] public profile for ${e} is ${t} - possible shadowban`),await Ue(r?e:null),(0,U.jn)(_e),new Error(_e)},Fe="reddit",Ze="public_profile_control",Be="profile_pagination_consecutive_shortfalls",He=async(e,t,r={})=>{const s=await ke(),{fetchHtml:i}=s,l=await P(t,i,e);if(!l.valid){const r=l.error||"unrecognized response";if(e.length&&/request failed: 404\b/.test(r)){if(await(async e=>{const t=Date.now();try{const e=(await o().storage.local.get({[Ze]:null}))[Ze],r=t-Number(e?.t||0);if(!0===e?.ok&&r>=0&&r<216e5)return!0}catch{}const r=await P(Fe,e,[],0);if(!r.valid)return(0,a.Sq)("feed",`[reveddit] control profile u/${Fe} did not load: ${r.error||"unrecognized"}`),!1;try{await o().storage.local.set({[Ze]:{ok:!0,t}})}catch{}return!0})(i))return await Re(!0),ze(t,"missing (404)",!0);(0,a.Sq)("feed",`[reveddit] public profile for ${t} is a 404, but so is the control; not a shadowban`)}throw await Re(!1,r),/request failed: 429/.test(r)&&te(new Error(r)),new Error(`www profile lookup invalid: ${r}`)}if(await Re(!0),l.emptyProfile&&e.length){e.some((e=>{const t=r[e];return!t||!(t.quarantine||t.over_18||"private"===t.subreddit_type)}))?await ze(t,"empty",!1):(0,a.Sq)("feed",`[reveddit] public profile for ${t} is empty, but every item is NSFW, quarantined or private; not treated as a shadowban`)}await Ue(null),await(async e=>{try{const t=await o().storage.local.get({[Be]:0}),r=Number(t[Be]||0);if(!e)return void(r>0&&await o().storage.local.remove(Be));const n=r+1;await o().storage.local.set({[Be]:n}),(0,a.C1)("feed",`[reveddit] profile pagination stopped short — consecutive lookups: ${n}`),n>=5&&(0,U.jn)("profile_pagination_unavailable")}catch{}})(l.paginationStopped);const c=await(async(e,t,r,s)=>{const i=Math.floor(Date.now()/1e3),l=Date.now();let c={};try{c=(await o().storage.local.get({[$e]:{}}))[$e]||{}}catch{}const d={},u=[];for(const n of e){if(!n.startsWith("t3_")||!t.has(n))continue;const e=r[n];if(e&&(!1===e.is_robot_indexable||e.removed_by_category))continue;const s=e?.created_utc,o=void 0!==s&&i-s>Se,a=c[n];if(!o||a&&"live"!==a.v&&("unknown"!==a.v||a.adverse)||e?.known_removed){if(a){const e="unknown"===a.v?Ce:je;if(Te(a.t,e,l)){"unknown"!==a.v&&(d[n]=a.v);continue}}u.push(n)}}const h=Ee(await(0,n.ax)()),f=u.slice(0,Math.min(10,h.maxPerCycle)),g=e=>{const t=c[e];return Boolean(t&&(t.adverse||"held"===t.v||"removed"===t.v))};let p=0;for(const e of f){p>0&&await new Promise((e=>setTimeout(e,h.delayMs))),p++;try{const t=await De(e,r[e]||{},s);(0,a.Sq)("verify",`[reveddit] post page verdict ${e}: ${t}`),c[e]={v:t,t:l,..."unknown"===t&&g(e)&&{adverse:!0}},"unknown"!==t&&(d[e]=t)}catch(t){if((0,a.Sq)("verify",`[reveddit] post page fetch failed ${e}:`,String(t?.message||t)),c[e]={v:"unknown",t:l,...g(e)&&{adverse:!0}},Oe(t))break}}if(p){const e=e=>"unknown"===e.v?Ce:je,t=Object.entries(c).filter((([,t])=>t.adverse||"held"===t.v||"removed"===t.v||Te(t.t,e(t),l))).sort(((e,t)=>t[1].t-e[1].t));c=Object.fromEntries(t.slice(0,200));try{await o().storage.local.set({[$e]:c})}catch{}}return d})(e,new Set(l.items.keys()),r,i),d=await o().storage.local.get({[Le]:null}).then((async e=>{const t=e[Le],r=await(0,z.Hg)(z.Yy);return(0,z.Mh)(null===t?null:!!t,r,!1)})).catch((()=>!1)),u=await(async()=>"on"===await(0,z.Hg)(z.Hl).catch((()=>"auto")))();ye=u?"unknown":"removed";const h=e.filter((e=>{if(d)return!1;if(l.items.has(e))return!1;const t=r[e]||{};if(e.startsWith("t3_")&&(!1===t.is_robot_indexable||t.removed_by_category))return!1;if(t.quarantine||t.over_18||"private"===t.subreddit_type)return!1;const n=e.startsWith("t3_")?l.coverage.t3:l.coverage.t1,s=k(e);return Number.isFinite(s)&&s>=n})),f=[...l.items.keys()].filter((e=>e.startsWith("t1_"))).slice(0,3),g=h.length?await qe(h,r,i,f):{};h.length||await Ie(!0);const p=[];for(const n of e){const e=r[n]||{},s={locked:!!e.locked,...void 0!==e.created_utc&&{created_utc:e.created_utc},_public_view:!0},o=n.startsWith("t3_"),a=o&&(!1===e.is_robot_indexable||!!e.removed_by_category),i=l.items.get(n);if(i)if(o)if(a)p.push({data:{...i,is_robot_indexable:!1,...s}});else{const t=c[n];if("held"===t||"removed"===t)p.push({data:{...i,is_robot_indexable:!1,...s}});else if(e.known_removed&&"live"!==t);else{const r=void 0===e.created_utc||Math.floor(Date.now()/1e3)-e.created_utc<=Se;p.push({data:{...i,is_robot_indexable:!0,...s,...r&&"live"!==t&&{_public_view_unverified:!0}}})}}else p.push({data:{...i,...s}});else{const r=o?l.coverage.t3:l.coverage.t1,i=k(n),c=Number.isFinite(i)&&i>=r,h=e.quarantine||e.over_18||"private"===e.subreddit_type,f={data:{name:n,author:"[deleted]",body:"[removed]",is_robot_indexable:!1,...s}};if(a)p.push(f);else if(c&&h)p.push(f);else if(c)if(d)u||p.push(f);else{const e=g[n];"live"===e?p.push({data:{name:n,author:t,is_robot_indexable:!0,...s}}):"removed"!==e&&"held"!==e||p.push(f)}}}const m=e.filter((e=>e.startsWith("t3_")));m.length&&(0,n.B4)(m).catch((()=>{}));const b=p.filter((e=>"[deleted]"===e.data.author||!1===e.data.is_robot_indexable)).length;return(0,a.Sq)("feed",`[reveddit] www lookup ${t}: ${e.length} requested, ${p.length} returned (${b} removed, ${e.length-p.length} omitted/uncovered), coverage t1=${l.coverage.t1} t3=${l.coverage.t3}, verdicts=${JSON.stringify(c)}, absentVerdicts=${JSON.stringify(g)}, routes=${JSON.stringify(s.servedRoutes())}`+(l.paginationStopped?`, ${l.paginationStopped}`:"")),p},We=["no-cache","default"],Ke=async e=>{let t={ok:!1,status:0,blocked:!1};for(const r of We){let n;try{n=await fetch(e,{credentials:"include",cache:r,headers:{"Accept-Language":"en"}})}catch{return{ok:!1,status:0,blocked:!1}}if(403!==n.status||/json/i.test(n.headers.get("content-type")||"")){if(!n.ok)return{ok:!1,status:n.status,blocked:!1};try{return{ok:!0,status:n.status,blocked:!1,json:await n.json()}}catch{return{ok:!1,status:n.status,blocked:!1}}}else t={ok:!1,status:403,blocked:!0}}return t},Ge="followed_checked_at",Ve="followed_post_ids",Xe=700,Ye=async e=>{let t={},r={},s={};try{const e=await o().storage.local.get({[Ge]:{},[Ve]:{}});t=e[Ge]||{},r=e[Ve]||{},s=await(0,n.$6)("other",!1)||{}}catch{}const i=e=>e.startsWith("t3_")?e.slice(3):r[e]||s[e]?.p||void 0,l=e.filter((e=>i(e))),c=e.length-l.length;l.sort(((e,r)=>(t[e]||0)-(t[r]||0)));const d=l.slice(0,5),u=[];let h="";for(const[e,r]of d.entries()){e>0&&Xe>0&&await new Promise((e=>setTimeout(e,Xe)));const n=i(r),s=r.startsWith("t3_"),o=s?`${re}comments/${n}.json?limit=1&raw_json=1`:`${re}comments/${n}/_/${r.slice(3)}.json?limit=1&depth=1&raw_json=1`,a=await Ke(o);if(429===a.status){te(new Error("www.reddit.com request failed: 429")),h=", stopped on a 429";break}t[r]=Date.now();const l=s?a.json?.[0]?.data?.children?.[0]?.data:a.json?.[1]?.data?.children?.[0]?.data;a.ok&&l?.name===r&&u.push({data:l})}const f=new Set(e);for(const e of Object.keys(t))f.has(e)||delete t[e];try{await o().storage.local.set({[Ge]:t})}catch{}return(0,a.C1)("cycle",`[reveddit] followed items through their threads (api/info resting): ${u.length} of ${d.length} read`+h+(c?`, ${c} comments with no known post skipped`:"")),u},Je=(e,t,r,s=!1,o=!1,a="",l="",c={})=>{const d=(Array.isArray(a)?a:String(a).split(",")).filter((e=>e)),u=()=>((e,t,r,s,o,a)=>J("legacy reddit HTML","legacy_info").then((()=>(0,i.sT)(a,n.VO))).then((e=>((0,n.fT)(),V("legacy_info"),e))).catch((a=>{console.log("old.reddit.com HTML fallback failed:",a.message),Q(a,"legacy_info");const i=re+e+".json"+t,l={credentials:"omit"};return J("www.reddit.com JSON","legacy_info").then((()=>fetch(i,l))).then((e=>{if(e.ok)return(0,n.fT)(),e.json();throw new Error(`www.reddit.com request failed: ${e.status}`)})).then((e=>{if(e&&e.data&&e.data.children)return e.data.children;throw new Error("Invalid data format from www.reddit.com")})).catch((n=>{if(console.log("www.reddit.com JSON failed:",n.message),r&&"none"!==r)return console.log("Trying OAuth fallback"),rt(...it(e,t,r,o),s);throw/request failed: 429/.test(String(n?.message))&&te(n),a}))})))(e,t,r,s,o,a);return d.length?l?He(d,l,c).then((e=>((0,n.fT)(),e))).catch((e=>{if(e.message===_e)throw e;return console.log("www.reddit.com public profile lookup failed:",e.message),u().catch((t=>{throw new Error(`${e.message}; legacy fallback: ${String(t?.message||t)}`)}))})):(async(e,t,r)=>{const n=t&&t!==ne;if(!n&&(await lt(),await K("api_info")))return Ye(e);const s=[];for(let o=0;o<e.length;o+=100){const a=`?id=${e.slice(o,o+100).join(",")}&raw_json=1`;let i;if(n)i=await rt(...it("api/info",a,t,!1),r);else{const t=await Ke(`${re}api/info.json${a}`);if(t.blocked)return await G("api_info","block page"),Ye(e);if(!t.ok)throw new Error(`authenticated api/info request failed: ${t.status}`);i=t.json?.data?.children}if(!Array.isArray(i))throw new Error("authenticated api/info returned no children");s.push(...i),o+100<e.length&&await new Promise((e=>setTimeout(e,1e3)))}return n||await V("api_info"),s})(d,r,s).then((e=>((0,n.fT)(),e))).catch((e=>(console.log("authenticated api/info lookup failed:",e.message),/request failed: 429/.test(String(e?.message))&&te(e),u()))):u()},Qe={name:"reddit_session",url:"https://reddit.com"},et=["name","value","domain","path","secure","httpOnly","storeId"],tt=(e,t="https://reddit.com")=>{if(!e)return e;const r=Object.keys(e).filter((e=>et.includes(e))).reduce(((t,r)=>({...t,[r]:e[r]})),{});return r.url=t,r},rt=async(e,t,r=!1)=>{let n;await o().cookies.set({domain:"reddit.com",url:"https://reddit.com",name:"_options",value:"{%22pref_quarantine_optin%22:true}"}),r&&(n=tt(await o().cookies.get(Qe)),n&&await o().cookies.remove(Qe)),t||(t={credentials:"omit"}),t.cache="reload",t.headers||(t.headers={}),"en"!==t.headers["Accept-Language"]&&(t.headers["Accept-Language"]="en");const s=fetch(e,t).then(nt).then(st).catch(console.log);return n&&await o().cookies.set(n),s},nt=e=>{if(!e.ok)throw Error(e.statusText);return e.json()},st=e=>{if(e&&e.user&&e.user.items)return e;if(!e||!e.data||!e.data.children)throw Error("reddit data is not defined");return e.data.children},ot=e=>{if(!e||!e.access_token)throw Error("access token is not defined");return e.access_token},at=(e=!1)=>(0,n.FW)(((t,r,n)=>{let s="SEw1uvRd6kxFEw";if(n.custom_clientid){if(s=n.custom_clientid,"testing"===s)return ne}else if(!e)return ne;const o={headers:{Authorization:`Basic ${btoa(`${s}:`)}`,"Content-Type":"application/x-www-form-urlencoded; charset=utf-8"},method:"POST",body:`grant_type=${encodeURIComponent("https://oauth.reddit.com/grants/installed_client")}&device_id=DO_NOT_TRACK_THIS_DEVICE`};return fetch("https://www.reddit.com/api/v1/access_token",o).then(nt).then(ot).then((e=>({headers:{Authorization:`bearer ${e}`,"Accept-Language":"en"}}))).catch(console.log)})),it=(e,t,r,n)=>{if(r&&r!==ne){let s="https://oauth.reddit.com/",o=e+t;n&&(s="https://cred2.reveddit.com/",o+="&give_it_to_me=1");return[s+o,r]}{let r=(n?"https://wred.reveddit.com/":re)+e;return"api/info"===e&&(r+=".json"),r+=t,[r]}},lt=()=>new Promise((e=>{chrome.storage.local.get(["stored_reddit_cookie_objects"],(t=>{const r=t.stored_reddit_cookie_objects;Array.isArray(r)&&r.length?Promise.all(r.map((e=>o().cookies.set(e).catch((()=>null))))).then((()=>e(!0))).catch((()=>e(!1))):e(!1)}))}))},7785:(e,t,r)=>{r.d(t,{$6:()=>D,B4:()=>F,BG:()=>w,Bl:()=>v,Ci:()=>d,FB:()=>T,FW:()=>R,JQ:()=>i,Nd:()=>M,Pd:()=>O,Sy:()=>C,U$:()=>c,UU:()=>a,VO:()=>U,VQ:()=>A,VU:()=>z,WK:()=>f,YU:()=>h,Yn:()=>l,aL:()=>k,ax:()=>X,b1:()=>E,bE:()=>j,e4:()=>q,fT:()=>Y,g7:()=>V,lY:()=>S,nb:()=>u,oL:()=>x,oX:()=>N,oZ:()=>g,qN:()=>y,tN:()=>b});var n=r(9947),s=r(3150),o=r.n(s);const a=2,i=130,l=100,c=1,d=2,u=3,h=4,f=5,g=6,p={changes:[],removed:{},approved:{},locked:{},unlocked:{}},m=(e,t,r)=>r?e+"_u_"+t:e+"_"+t,b=(e,t=!0)=>{const r={};return Object.keys(p).forEach((n=>{r[n]=m(n,e,t)})),r},v=e=>"public_live_u_"+e,w=(e,t)=>t?"oldest_date_u_"+e:"oldest_date_"+e,k=()=>o().storage.sync.get(null).then((e=>(Object.keys(e.user_subscriptions).forEach((t=>{C(e,t,!0)})),C(e,"other",!1),T(e)))),_="pending_notifications",y=e=>o().storage.local.get({[_]:{}}).then((t=>(t[_]||{})[e]||null)),x=(e,t)=>o().storage.local.get({[_]:{}}).then((r=>{const n=r[_]||{};return n[e]={thing:e,...t},o().storage.local.set({[_]:n})})),S=e=>o().storage.local.get({[_]:{}}).then((t=>{const r=t[_]||{};return delete r[e],o().storage.local.set({[_]:r})})),$="notification_log",j=e=>o().storage.local.get({[$]:[]}).then((t=>{const r=t[$]||[];return r.push(e),r.length>50&&r.splice(0,r.length-50),o().storage.local.set({[$]:r})})),C=(e,t,r)=>{const n=b(t,r);delete n.changes;const s=[];Object.values(n).forEach((e=>{s.push(e)})),s.forEach((t=>{Object.values(e[t]).forEach((e=>{e.u=!1}))}))},T=e=>o().storage.sync.set(e).then((()=>o().runtime.sendMessage({action:"update-badge"}))).catch((()=>{})),O=(e,t=(()=>{}))=>{const r="other_subscriptions";chrome.storage.sync.get(r,(s=>{s[r][e]={t:Math.floor((new Date).getTime()/1e3)};const o=(0,n.N5)(s[r],100,"t");chrome.storage.sync.set({[r]:o},t)}))},A=(e,t=(()=>{}))=>{const r="other_subscriptions",n=b("other",!1);delete n.changes,chrome.storage.sync.get(Object.values(n).concat(r),(s=>{delete s[r][e],Object.values(n).forEach((t=>{e in s[t]&&delete s[t][e]})),chrome.storage.sync.set(s,(()=>{chrome.runtime.sendMessage({action:"update-badge"}).then(t).catch((()=>t()))}))}))},E=e=>{chrome.storage.sync.get(void 0,(t=>{t&&t.user_subscriptions||((t=t||{}).user_subscriptions=t.user_subscriptions||{},t.other_subscriptions=t.other_subscriptions||{},t.options=t.options||{removal_status:{track:!0},lock_status:{track:!0}});const r=Object.keys(t.user_subscriptions),n={};r.forEach((e=>{n[e]=L(e,!0,t)})),n.other=L("other",!1,t),e(n,t)}))},M=e=>{chrome.storage.sync.get(void 0,(t=>{const r=Object.keys(t.user_subscriptions),n={};r.forEach((e=>{n[e]=I(e,!0,t)})),n.other=I("other",!1,t),e(n)}))},I=(e,t,r)=>L(e,t,r).unseen,L=(e,t,r)=>{const n=r.options||{},s=n.removal_status||{},o=n.lock_status||{},a=!1!==s.track,i=!1!==o.track,l={},c={};let d=[];const u=b(e,t);return a&&d.push(u.removed,u.approved),i&&d.push(u.locked,u.unlocked),d.forEach((e=>{const t=r[e]||{};Object.keys(t).forEach((e=>{const r=t[e];r&&r.u?l[e]=!0:c[e]=!0}))})),{unseen:Object.keys(l),seen:Object.keys(c)}},D=(e,t)=>{const r=m("items",e,t);return o().storage.local.get({[r]:{}}).then((e=>e[r]))},N=(e,t,r)=>{const s=m("items",t,r);return chrome.storage.local.get({[s]:{}},(t=>{const r=t[s];Object.keys(e).forEach((t=>{r[t]=e[t]}));let a=r;return Object.keys(r).length>1e3&&(a=(0,n.N5)(r,1e3,"o")),o().storage.local.set({[s]:a})}))},q=e=>{const t=(e||{}).removal_status||{},r=(e||{}).lock_status||{};return{removal:!1!==t.track&&!1!==t.notify,lock:!1!==r.track&&!1!==r.notify}},R=e=>o().storage.sync.get(["user_subscriptions","other_subscriptions","options"]).then((t=>{const r=t||{},n=Object.keys(r.user_subscriptions||{}),s=Object.keys(r.other_subscriptions||{}),o=r.options;return e(n,s,o)})).catch((t=>(console.log(t),e([],[],{})))),P="pending_post_lookups",U=async e=>{const t=await H(),r=e.filter((e=>(t[e]||0)<B));if(0===r.length)return;const n=(await o().storage.local.get({[P]:[]}))[P],s=[...new Set([...n,...r])];await o().storage.local.set({[P]:s})},z=async()=>(await o().storage.local.get({[P]:[]}))[P].length,F=async e=>{const t=(await o().storage.local.get({[P]:[]}))[P],r=new Set(e),n=t.filter((e=>!r.has(e)));await o().storage.local.set({[P]:n})},Z="pending_post_attempts",B=3,H=async()=>(await o().storage.local.get({[Z]:{}}))[Z],W="rate_limit_until",K="rate_limit_level",G="rate_limit_last_hit",V=async()=>{const e=(await o().storage.local.get({[K]:0}))[K]||0,t=Math.min(12e4*Math.pow(2,e),18e5);return await o().storage.local.set({[W]:Date.now()+t,[K]:e+1,[G]:Date.now()}),t},X=async()=>{const e=(await o().storage.local.get({[G]:0}))[G]||0;return e>0?Math.max(0,Date.now()-e):null},Y=async()=>{const e=await o().storage.local.get({[K]:0,[W]:0});(e[K]||e[W])&&await o().storage.local.set({[W]:0,[K]:0})}},67:(e,t,r)=>{r.d(t,{CK:()=>d,Lu:()=>o,Ut:()=>a,sl:()=>c});const n=["background","tab"],s=["default","no-store","no-cache","reload"],o=e=>{if("string"!=typeof e)return!1;const[t,r,...o]=e.split(":");return 0===o.length&&n.includes(t)&&(e=>s.includes(e))(r)},a=e=>{const[t,r]=e.split(":");return{leg:t,cache:r}},i=["background:no-store","background:no-cache","tab:no-cache","tab:reload","background:reload","tab:default"],l=e=>Array.isArray(e)?[...new Set(e.filter(o))]:[],c=e=>{const t={};if(!e||"object"!=typeof e||Array.isArray(e))return t;for(const r of["chrome","firefox"]){const n=e[r],s=Array.isArray(n)?{order:l(n),skip:[]}:{order:l(n?.order),skip:l(n?.skip)};(s.order.length||s.skip.length)&&(t[r]=s)}return t},d=(e={})=>{const{order:t=[],skip:r=[]}=e.chrome||{},n=[...t,...[...i].filter((e=>!t.includes(e)))],s=n.filter((e=>!r.includes(e)));if(!s.some((e=>e.startsWith("background:")))){const e=n.find((e=>e.startsWith("background:")));e&&s.push(e)}return s}}},s={};function o(e){var t=s[e];if(void 0!==t)return t.exports;var r=s[e]={exports:{}};return n[e].call(r.exports,r,r.exports,o),r.exports}o.m=n,e=[],o.O=(t,r,n,s)=>{if(!r){var a=1/0;for(d=0;d<e.length;d++){for(var[r,n,s]=e[d],i=!0,l=0;l<r.length;l++)(!1&s||a>=s)&&Object.keys(o.O).every((e=>o.O[e](r[l])))?r.splice(l--,1):(i=!1,s<a&&(a=s));if(i){e.splice(d--,1);var c=n();void 0!==c&&(t=c)}}return t}s=s||0;for(var d=e.length;d>0&&e[d-1][2]>s;d--)e[d]=e[d-1];e[d]=[r,n,s]},o.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return o.d(t,{a:t}),t},r=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,o.t=function(e,n){if(1&n&&(e=this(e)),8&n)return e;if("object"==typeof e&&e){if(4&n&&e.__esModule)return e;if(16&n&&"function"==typeof e.then)return e}var s=Object.create(null);o.r(s);var a={};t=t||[null,r({}),r([]),r(r)];for(var i=2&n&&e;"object"==typeof i&&!~t.indexOf(i);i=r(i))Object.getOwnPropertyNames(i).forEach((t=>a[t]=()=>e[t]));return a.default=()=>e,o.d(s,a),s},o.d=(e,t)=>{for(var r in t)o.o(t,r)&&!o.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},o.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),o.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},o.j=42,o.p="",(()=>{o.b=document.baseURI||self.location.href;var e={42:0,646:0};o.O.j=t=>0===e[t];var t=(t,r)=>{var n,s,[a,i,l]=r,c=0;if(a.some((t=>0!==e[t]))){for(n in i)o.o(i,n)&&(o.m[n]=i[n]);if(l)var d=l(o)}for(t&&t(r);c<a.length;c++)s=a[c],o.o(e,s)&&e[s]&&e[s][0](),e[s]=0;return o.O(d)},r=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})();var a=o.O(void 0,[736],(()=>o(1195)));a=o.O(a)})();