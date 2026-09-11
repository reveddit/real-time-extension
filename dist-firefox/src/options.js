(()=>{"use strict";var e,r,t,o={9947:(e,r,t)=>{t.d(r,{yK:()=>a});t(7785);const o="notifyme";function a(e){chrome.alarms.clear(o),chrome.alarms.create(o,{delayInMinutes:1,periodInMinutes:e})}},3338:(e,r,t)=>{var o=t(5893),a=t(7294),n=t(745),i=t(3867),d=t(7785);const s=e=>new Date(e).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});var c=t(9947),l=t(917);const u={sm:"4px",md:"6px",lg:"8px",pill:"999px"},h={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px"},b={body:'-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"},p=l.iv`
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
`,m=l.iv`
    html,
    body {
        margin: 0;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family: ${b.body};
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
        margin: ${h.md} 0;
    }

    h1,
    h2,
    h3,
    h4 {
        color: var(--text-primary);
    }
    h1 {
        font-size: 22px;
        margin: 0 0 ${h.lg} 0;
    }
    h2 {
        font-size: 18px;
        margin: 0 0 ${h.md} 0;
    }
    h3 {
        font-size: 16px;
        margin: 0 0 ${h.sm} 0;
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
`,g=l.iv`
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
        font-family: ${b.mono};
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
`,f="ui_theme";function v(e){const r="auto"===e?window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark":e;document.documentElement.setAttribute("data-theme",r)}function x(){return(0,a.useEffect)((()=>{try{chrome.storage.local.get([f],(e=>{v(e?.[f]||"auto")}))}catch{v("auto")}const e=window.matchMedia?.("(prefers-color-scheme: light)"),r=()=>{try{chrome.storage.local.get([f],(e=>{"auto"===(e?.[f]||"auto")&&v("auto")}))}catch(e){}};e?.addEventListener?.("change",r);const t=(e,r)=>{"local"===r&&e[f]&&v(e[f].newValue||"auto")};return chrome.storage.onChanged.addListener(t),()=>{e?.removeEventListener?.("change",r),chrome.storage.onChanged.removeListener(t)}}),[]),(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(l.xB,{styles:p}),(0,o.jsx)(l.xB,{styles:m}),(0,o.jsx)(l.xB,{styles:g})]})}const y=i.Z.a`
    color: var(--link);
    text-decoration: none;
    &:hover {
        color: var(--link-hover);
        text-decoration: underline;
    }
`,k=(i.Z.a`
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
`,i.Z.button`
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
    ${e=>{switch(e.variant){case"secondary":return l.iv`
                    background: var(--button-bg);
                    color: var(--button-text);
                    border-color: var(--border);
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;case"ghost":return l.iv`
                    background: transparent;
                    color: var(--link);
                    border-color: transparent;
                    &:hover {
                        background: var(--bg-surface-hover);
                    }
                `;default:return l.iv`
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
`),j=i.Z.div`
    padding: 10px 12px;
    margin: 6px 0;
    border-radius: ${u.md};
    font-size: 0.92em;
    ${e=>{switch(e.variant){case"warning":return l.iv`
                    background: var(--locked-bg);
                    border: 1px solid var(--locked-border);
                    color: var(--text-primary);
                `;case"success":return l.iv`
                    background: var(--approved-bg);
                    border: 1px solid var(--approved-border);
                    color: var(--text-primary);
                `;case"news":return l.iv`
                    background: var(--note-bg);
                    border: 1px solid var(--border-light);
                    color: var(--text-primary);
                `;default:return l.iv`
                    background: var(--bg-surface);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                `}}}
`,w=(i.Z.span`
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
    border-radius: ${u.lg};
    padding: ${h.md} ${h.lg};
    margin-bottom: ${h.md};
    transition: border-color 0.15s ease;
    &:hover {
        border-color: var(--border-light);
    }
`,i.Z.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${h.sm};
    margin-bottom: ${h.xs};
`,i.Z.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${h.sm};
    color: var(--text-secondary);
    font-size: 0.85em;
    margin-bottom: ${h.sm};
    & > span + span::before {
        content: '·';
        margin-right: ${h.sm};
        color: var(--text-muted);
    }
`,i.Z.div`
    color: var(--text-primary);
    font-size: 0.95em;
`,i.Z.div`
    display: flex;
    gap: ${h.sm};
    margin-top: ${h.sm};
    padding-top: ${h.sm};
    border-top: 1px solid var(--border);
`,i.Z.span`
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
    ${e=>{switch(e.variant){case"removed":return l.iv`
                    background: var(--removed-bg);
                    border-color: var(--removed-border);
                    color: var(--removed-text);
                `;case"deleted":return l.iv`
                    background: var(--deleted-bg);
                    border-color: var(--deleted-border);
                    color: var(--deleted-text);
                `;case"approved":case"unlocked":return l.iv`
                    background: var(--approved-bg);
                    border-color: var(--approved-border);
                    color: var(--text-primary);
                `;case"locked":return l.iv`
                    background: var(--locked-bg);
                    border-color: var(--locked-border);
                    color: var(--text-primary);
                `;case"edited":return l.iv`
                    background: var(--bg-surface-hover);
                    border-color: var(--border);
                    color: var(--text-primary);
                `;default:return l.iv`
                    background: var(--bg-surface-hover);
                    border-color: var(--border);
                    color: var(--text-secondary);
                `}}}
`,i.Z.h2`
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin: ${h.lg} 0 ${h.sm} 0;
    padding-bottom: ${h.xs};
    border-bottom: 1px solid var(--border);
`),_=(i.Z.label`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${h.md};
    padding: ${h.sm} 0;
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
    margin: ${h.xs} 0 ${h.sm} 0;
    color: var(--text-primary);
`,i.Z.div`
    font-size: 0.95em;
`,i.Z.div`
  width: 380px;
  min-height: 300px;
  padding: ${h.lg};
`),$=i.Z.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${h.md};
  margin-bottom: ${h.md};
`,C=i.Z.h1`
  margin: 0;
  font-size: 18px;
`,S=i.Z.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${h.md};
  padding: ${h.sm} 0;
  border-bottom: 1px solid var(--border);
  &:last-child { border-bottom: 0; }
  & > label {
    color: var(--text-primary);
    flex: 1;
  }
  & > input[type='text'], & > input[type='number'], & > select {
    width: 90px;
    text-align: right;
  }
`,Z=i.Z.div``,z=i.Z.div`
  font-size: 0.8em;
  font-weight: normal;
  color: var(--text-secondary);
  margin-top: 3px;
  max-width: 28em;
`,O=i.Z.select`
  && {
    width: auto;
    min-width: 175px;
    text-align: left;
  }
`,M=i.Z.div`
  font-size: 0.9em;
  margin-top: ${h.xs};
`,R=i.Z.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${h.lg};
  padding-top: ${h.md};
  border-top: 1px solid var(--border);
  gap: ${h.md};
`,E=i.Z.div`
  margin-top: ${h.md};
  font-size: 0.9em;
`,I=i.Z.div`
  display: ${e=>e.visible?"block":"none"};
  margin-top: ${h.sm};
`,B=i.Z.p`
  color: var(--text-secondary);
  font-size: 0.88em;
  margin: ${h.sm} 0;
`,L=i.Z.div`
  display: flex;
  gap: ${h.sm};
  margin-top: ${h.sm};
`,T=chrome.runtime.sendMessage,U=chrome.runtime,P=e=>e.track?e.notify?"notify":"badge":"off",F=[{value:"notify",label:"badge + notifications"},{value:"badge",label:"badge only"},{value:"off",label:"off"}];(0,n.createRoot)(document.getElementById("root")).render((0,o.jsx)((function(){const[e,r]=(0,a.useState)(""),[t,n]=(0,a.useState)(""),[i,l]=(0,a.useState)(""),[u,h]=(0,a.useState)("off"),[b,p]=(0,a.useState)("off"),[m,g]=(0,a.useState)(!1),[q,D]=(0,a.useState)(!1),[A,N]=(0,a.useState)(!1),[H,K]=(0,a.useState)(!0),[W,G]=(0,a.useState)(!0),[V,J]=(0,a.useState)(!0),[Q,X]=(0,a.useState)(!0),[Y,ee]=(0,a.useState)(!1),[re,te]=(0,a.useState)(!1),[oe,ae]=(0,a.useState)("auto"),[ne,ie]=(0,a.useState)(""),[de,se]=(0,a.useState)(!1),[ce,le]=(0,a.useState)(!1),[ue,he]=(0,a.useState)(""),[be,pe]=(0,a.useState)(!1);(0,a.useEffect)((()=>{let e=!1;const t=(e,r)=>{"sync"===r&&e.options&&o()},o=()=>{(0,d.FW)(((o,a,i)=>{if(e||!i||!Object.keys(i).length)return;e=!0,chrome.storage.onChanged.removeListener(t);const s=i,c=s.removal_status||{},u=s.lock_status||{};r(String(s.interval??d.Bz)),n(String(s.seen_count||d.UU)),l(s.custom_clientid||""),h(P(c)),p(P(u)),g(!!s.hide_subscribe),D(!!s.monitor_quarantined),N(!!s.show_scan_on_own_profile),K(!1!==s.show_scan_on_other_profiles),G(!1!==s.show_thread_scan_buttons),J(!1!==s.highlight_own_profile_status),X(!1!==s.auto_filter_removed_threads),se(!0)}))};return chrome.storage.onChanged.addListener(t),o(),chrome.storage.local.get([f],(e=>{ae(e?.[f]||"auto")})),chrome.storage.local.get(["dev_simulate_endpoint_deprecation"],(e=>{te(!!e?.dev_simulate_endpoint_deprecation)})),T({action:"get-diag-status"},(e=>{if(U.lastError||!e||e.error)return;const r=((e,r=Date.now())=>{const t=[];return e.lastCheck&&t.push(`last check ${s(1e3*e.lastCheck)}`),e.backoffRemainingMs&&e.backoffRemainingMs>0?t.push(`paused ~${Math.max(1,Math.ceil(e.backoffRemainingMs/6e4))} min (Reddit rate limit)`):e.nextCheck&&e.nextCheck>r&&t.push(`next ~${s(e.nextCheck)}`),t.join(" · ")})(e);r&&he(r)})),()=>chrome.storage.onChanged.removeListener(t)}),[]);const me=e=>{ae(e),function(e){chrome.storage.local.set({[f]:e}),v(e)}(e)},ge=()=>{const r=Number(e),o=Number(t),a=(i||"").trim();return Number.isInteger(r)&&r>0?Number.isInteger(o)&&o>0?(ie(""),void(0,d.oe)(o,r,a,"off"!==u,"notify"===u,"off"!==b,"notify"===b,m,q,A,H,W,V,Q,(()=>{(0,c.yK)(r),chrome.runtime.sendMessage({action:"update-badge"}),window.close()}))):(ie('"same-status count before alert" must be a positive integer'),void setTimeout((()=>ie("")),2800)):(ie('"minutes between Reddit checks" must be a positive integer'),void setTimeout((()=>ie("")),2800))};return de?(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(x,{}),(0,o.jsxs)(_,{children:[(0,o.jsxs)($,{children:[(0,o.jsx)(C,{children:"Options"}),(0,o.jsx)(k,{variant:"primary",onClick:ge,children:"save"})]}),(0,o.jsx)(w,{children:"Subscriptions"}),(0,o.jsx)(Z,{children:(0,o.jsxs)(S,{children:[(0,o.jsx)("label",{children:"other subscriptions"}),(0,o.jsx)(y,{target:"_blank",href:"/src/other.html",children:"manage ↗"})]})}),(0,o.jsx)(w,{children:"Tracking & notification"}),(0,o.jsxs)(Z,{children:[(0,o.jsxs)(S,{children:[(0,o.jsx)("label",{children:"removed content"}),(0,o.jsx)(O,{value:u,onChange:e=>h(e.target.value),children:F.map((e=>(0,o.jsx)("option",{value:e.value,children:e.label},e.value)))})]}),(0,o.jsxs)(S,{children:[(0,o.jsx)("label",{children:"locked content"}),(0,o.jsx)(O,{value:b,onChange:e=>p(e.target.value),children:F.map((e=>(0,o.jsx)("option",{value:e.value,children:e.label},e.value)))})]})]}),("notify"===u||"notify"===b)&&(0,o.jsx)(M,{children:(0,o.jsx)(y,{href:"#",onClick:e=>{e.preventDefault(),"notify"===u&&h("badge"),"notify"===b&&p("badge")},children:"turn off all notifications"})}),(0,o.jsx)(B,{children:'"badge only" counts changes on the toolbar icon and in history, without showing system notifications.'}),(0,o.jsx)(w,{children:"Polling"}),(0,o.jsxs)(Z,{children:[(0,o.jsxs)(S,{children:[(0,o.jsxs)("label",{children:["minutes between Reddit checks",(0,o.jsx)(z,{children:"How often the extension checks Reddit for removed content. Increase this if Reddit rate-limits you (429 errors)."})]}),(0,o.jsx)("input",{type:"text",value:e,onChange:e=>r(e.target.value)})]}),(0,o.jsxs)(S,{children:[(0,o.jsx)("label",{children:"same-status count before alert"}),(0,o.jsx)("input",{type:"text",value:t,onChange:e=>n(e.target.value)})]}),(0,o.jsxs)(S,{children:[(0,o.jsx)("label",{children:"monitor quarantined content"}),(0,o.jsx)("input",{type:"checkbox",checked:q,onChange:e=>D(e.target.checked)})]}),(0,o.jsxs)(S,{children:[(0,o.jsx)("label",{children:"hide subscribe button"}),(0,o.jsx)("input",{type:"checkbox",checked:m,onChange:e=>g(e.target.checked)})]}),(0,o.jsxs)(S,{children:[(0,o.jsx)("label",{children:"show removed-content scan on other profiles"}),(0,o.jsx)("input",{type:"checkbox",checked:H,onChange:e=>K(e.target.checked)})]}),(0,o.jsxs)(S,{children:[(0,o.jsx)("label",{children:"show removed-content scan on your own profile"}),(0,o.jsx)("input",{type:"checkbox",checked:A,onChange:e=>N(e.target.checked)})]}),(0,o.jsxs)(S,{children:[(0,o.jsx)("label",{children:'show "scan for removed comments" buttons on threads'}),(0,o.jsx)("input",{type:"checkbox",checked:W,onChange:e=>G(e.target.checked)})]}),(0,o.jsxs)(S,{children:[(0,o.jsx)("label",{children:"flag your removed/locked content on your own profile"}),(0,o.jsx)("input",{type:"checkbox",checked:V,onChange:e=>J(e.target.checked)})]}),(0,o.jsxs)(S,{children:[(0,o.jsx)("label",{children:"auto-filter to show only removed comments after thread scan"}),(0,o.jsx)("input",{type:"checkbox",checked:Q,onChange:e=>X(e.target.checked)})]})]}),q&&(0,o.jsx)(B,{children:'Enabling "monitor quarantined content" may appear to cause an occasional logout. Refreshing the page should show you are still logged in. Increase "minutes between Reddit checks" to 5 or more to reduce this occurrence.'}),(0,o.jsx)(w,{children:"Appearance"}),(0,o.jsx)(Z,{children:(0,o.jsxs)(S,{children:[(0,o.jsx)("label",{children:"theme"}),(0,o.jsxs)("select",{value:oe,onChange:e=>me(e.target.value),children:[(0,o.jsx)("option",{value:"auto",children:"auto"}),(0,o.jsx)("option",{value:"dark",children:"dark"}),(0,o.jsx)("option",{value:"light",children:"light"})]})]})}),(0,o.jsx)(w,{children:"Diagnostics"}),(0,o.jsx)(B,{children:"If removal detection seems broken, run a check, then copy the log and include it in a GitHub issue or email. The log stays on this device — nothing is sent automatically. It lists ids of your recent posts and comments; your username is left out unless you include it."}),(0,o.jsx)(Z,{children:(0,o.jsxs)(S,{children:[(0,o.jsx)("label",{children:"include username in copied log"}),(0,o.jsx)("input",{type:"checkbox",checked:ce,onChange:e=>le(e.target.checked)})]})}),(0,o.jsxs)(L,{children:[(0,o.jsx)(k,{onClick:()=>{T({action:"run-check-now"},(e=>{!U.lastError&&e?he(e.throttled?"a manual check already ran in the last minute":"check started — wait about 30 seconds, then copy the log"):he("could not start a check — try reopening this page")}))},children:"check now"}),(0,o.jsx)(k,{onClick:()=>{pe(!0),T({action:"get-diag-log",includeUsername:ce},(e=>{if(pe(!1),U.lastError||!e||e.error||"string"!=typeof e.text)return void he("could not read the log — try reopening this page");const r=e.text;navigator.clipboard.writeText(r).then((()=>he(`copied ${r.split("\n").length} lines to the clipboard`)),(()=>he("copy failed — clipboard unavailable")))}))},disabled:be,children:"copy log"}),(0,o.jsx)(k,{onClick:()=>{T({action:"clear-diag-log"},(()=>{U.lastError||he("log cleared")}))},children:"clear log"})]}),ue&&(0,o.jsx)(B,{children:ue}),(0,o.jsx)(E,{children:!Y&&(0,o.jsx)(y,{href:"#",onClick:e=>{e.preventDefault(),ee(!0)},children:"advanced"})}),(0,o.jsxs)(I,{visible:Y,children:[(0,o.jsx)(w,{children:"Advanced"}),(0,o.jsx)(B,{children:'This option overrides the "installed app" client id from reddit > preferences > apps.'}),(0,o.jsxs)(Z,{children:[(0,o.jsxs)(S,{children:[(0,o.jsx)("label",{children:"custom client id"}),(0,o.jsx)("input",{type:"text",value:i,onChange:e=>l(e.target.value),placeholder:"<default is blank>",autoComplete:"off",autoCorrect:"off",autoCapitalize:"off",spellCheck:!1})]}),!1]})]}),ne&&(0,o.jsx)(j,{variant:"warning",children:ne}),(0,o.jsxs)(R,{children:[(0,o.jsx)(y,{href:"#",onClick:e=>{e.preventDefault(),r(String(d.Bz)),n(String(d.UU)),l("")},children:"reset to defaults"}),(0,o.jsx)(k,{variant:"primary",onClick:ge,children:"save"})]})]})]}):(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(x,{}),(0,o.jsx)(_,{children:"Loading…"})]})}),{}))},7785:(e,r,t)=>{t.d(r,{Bz:()=>n,FW:()=>d,UU:()=>i,oe:()=>s});t(9947);var o=t(3150),a=t.n(o);const n=1,i=2,d=e=>a().storage.sync.get(["user_subscriptions","other_subscriptions","options"]).then((r=>{const t=r||{},o=Object.keys(t.user_subscriptions||{}),a=Object.keys(t.other_subscriptions||{}),n=t.options;return e(o,a,n)})).catch((r=>(console.log(r),e([],[],{})))),s=(e,r,t,o,a,n,i,d,s,c,l,u,h,b,p)=>{chrome.storage.sync.set({options:{seen_count:e,interval:r,custom_clientid:t,removal_status:{track:o,notify:a},lock_status:{track:n,notify:i},hide_subscribe:d,monitor_quarantined:s,show_scan_on_own_profile:c,show_scan_on_other_profiles:l,show_thread_scan_buttons:u,highlight_own_profile_status:h,auto_filter_removed_threads:b}},p)}}},a={};function n(e){var r=a[e];if(void 0!==r)return r.exports;var t=a[e]={exports:{}};return o[e].call(t.exports,t,t.exports,n),t.exports}n.m=o,e=[],n.O=(r,t,o,a)=>{if(!t){var i=1/0;for(l=0;l<e.length;l++){for(var[t,o,a]=e[l],d=!0,s=0;s<t.length;s++)(!1&a||i>=a)&&Object.keys(n.O).every((e=>n.O[e](t[s])))?t.splice(s--,1):(d=!1,a<i&&(i=a));if(d){e.splice(l--,1);var c=o();void 0!==c&&(r=c)}}return r}a=a||0;for(var l=e.length;l>0&&e[l-1][2]>a;l--)e[l]=e[l-1];e[l]=[t,o,a]},n.n=e=>{var r=e&&e.__esModule?()=>e.default:()=>e;return n.d(r,{a:r}),r},t=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,n.t=function(e,o){if(1&o&&(e=this(e)),8&o)return e;if("object"==typeof e&&e){if(4&o&&e.__esModule)return e;if(16&o&&"function"==typeof e.then)return e}var a=Object.create(null);n.r(a);var i={};r=r||[null,t({}),t([]),t(t)];for(var d=2&o&&e;"object"==typeof d&&!~r.indexOf(d);d=t(d))Object.getOwnPropertyNames(d).forEach((r=>i[r]=()=>e[r]));return i.default=()=>e,n.d(a,i),a},n.d=(e,r)=>{for(var t in r)n.o(r,t)&&!n.o(e,t)&&Object.defineProperty(e,t,{enumerable:!0,get:r[t]})},n.o=(e,r)=>Object.prototype.hasOwnProperty.call(e,r),n.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.j=798,n.p="",(()=>{n.b=document.baseURI||self.location.href;var e={798:0};n.O.j=r=>0===e[r];var r=(r,t)=>{var o,a,[i,d,s]=t,c=0;if(i.some((r=>0!==e[r]))){for(o in d)n.o(d,o)&&(n.m[o]=d[o]);if(s)var l=s(n)}for(r&&r(t);c<i.length;c++)a=i[c],n.o(e,a)&&e[a]&&e[a][0](),e[a]=0;return n.O(l)},t=self.webpackChunkreveddit_real_time=self.webpackChunkreveddit_real_time||[];t.forEach(r.bind(null,0)),t.push=r.bind(null,t.push.bind(t))})();var i=n.O(void 0,[736],(()=>n(3338)));i=n.O(i)})();