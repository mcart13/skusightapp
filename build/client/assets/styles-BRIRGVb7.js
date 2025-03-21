import{r as i,S as a}from"./index-C_P7ACqV.js";import{i as k,n as f,d as L,M as P,E as b,a as M,P as T,c as x,t as R,e as _,f as w,j as N,T as O,k as I,l as B,I as D,S as F,L as H}from"./context-CISPVU1J.js";import{F as V,S as W}from"./context-Cuq_S-Fv.js";const g="data-lock-scrolling",v="data-lock-scrolling-hidden",E="data-lock-scrolling-wrapper";let d=0;function $(){const{body:r}=document;return r.scrollHeight>r.clientHeight}class K{constructor(){this.scrollLocks=0,this.locked=!1}registerScrollLock(){this.scrollLocks+=1,this.handleScrollLocking()}unregisterScrollLock(){this.scrollLocks-=1,this.handleScrollLocking()}handleScrollLocking(){if(k)return;const{scrollLocks:e}=this,{body:t}=document,n=t.firstElementChild;e===0?(t.removeAttribute(g),t.removeAttribute(v),n&&n.removeAttribute(E),window.scroll(0,d),this.locked=!1):e>0&&!this.locked&&(d=window.pageYOffset,t.setAttribute(g,""),$()||t.setAttribute(v,""),n&&(n.setAttribute(E,""),n.scrollTop=d),this.locked=!0)}resetScrollPosition(){d=0}}const G=/\[(.*?)\]|(\w+)/g;function C(r,e,t){if(r==null)return;const n=Array.isArray(e)?e:U(e);let s=r;for(let o=0;o<n.length;o++){const l=s[n[o]];if(l===void 0)return t;s=l}return s}function U(r){const e=[];let t;for(;t=G.exec(r);){const[,n,s]=t;e.push(n||s)}return e}function z(...r){let e={};for(const t of r)e=A(e,t);return e}function A(r,e){const t=Array.isArray(r)?[...r]:{...r};for(const n in e)if(Object.prototype.hasOwnProperty.call(e,n))S(e[n])&&S(t[n])?t[n]=A(t[n],e[n]):t[n]=e[n];else continue;return t}function S(r){return r!==null&&typeof r=="object"}const Q=/{([^}]*)}/g;class y{constructor(e){this.translation={},this.translation=Array.isArray(e)?z(...e.slice().reverse()):e}translate(e,t){const n=C(this.translation,e,"");return n?t?n.replace(Q,s=>{const o=s.substring(1,s.length-1);if(t[o]===void 0){const l=JSON.stringify(t);throw new Error(`Error in translation for key '${e}'. No replacement found for key '${o}'. The following replacements were passed: '${l}'`)}return t[o]}):n:""}translationKeyExists(e){return!!C(this.translation,e)}}const J=i.createContext(void 0),X=function({children:e}){const[t,n]=i.useState(f().matches),s=i.useCallback(L(()=>{t!==f().matches&&n(!t)},40,{trailing:!0,leading:!0,maxWait:40}),[t]);i.useEffect(()=>{n(f().matches)},[]);const o=i.useMemo(()=>({isNavigationCollapsed:t}),[t]);return a.createElement(P.Provider,{value:o},a.createElement(b,{event:"resize",handler:s}),e)};function Z(r,e){return a.createElement("div",{id:"PolarisPortalsContainer",ref:e})}const Y=i.forwardRef(Z);function q({children:r,container:e}){const t=M(),n=i.useRef(null),s=i.useMemo(()=>e?{container:e}:t?{container:n.current}:{container:null},[e,t]);return a.createElement(T.Provider,{value:s},r,e?null:a.createElement(Y,{ref:n}))}function j({children:r}){const[e,t]=i.useState([]),n=i.useCallback(l=>{t(c=>[...c,l])},[]),s=i.useCallback(l=>{let c=!0;return t(h=>{const u=[...h],p=u.indexOf(l);return p===-1?c=!1:u.splice(p,1),u}),c},[]),o=i.useMemo(()=>({trapFocusList:e,add:n,remove:s}),[n,e,s]);return a.createElement(V.Provider,{value:o},r)}const ee={tooltip:0,hovercard:0};function te({children:r}){const[e,t]=i.useState(ee),n=i.useCallback(l=>{t(c=>({...c,[l]:c[l]+1}))},[]),s=i.useCallback(l=>{t(c=>({...c,[l]:c[l]-1}))},[]),o=i.useMemo(()=>({presenceList:Object.entries(e).reduce((l,c)=>{const[h,u]=c;return{...l,[h]:u>=1}},{}),presenceCounter:e,addPresence:n,removePresence:s}),[n,s,e]);return a.createElement(x.Provider,{value:o},r)}const ne=20,m=30,re=m+10;function se(){var s;const r=document.createElement("div");r.setAttribute("style",`position: absolute; opacity: 0; transform: translate3d(-9999px, -9999px, 0); pointer-events: none; width:${m}px; height:${m}px;`);const e=document.createElement("div");e.setAttribute("style",`width:100%; height: ${re}; overflow:scroll; scrollbar-width: thin;`),r.appendChild(e),document.body.appendChild(r);const t=m-(((s=r.firstElementChild)==null?void 0:s.clientWidth)??0),n=Math.min(t,ne);document.documentElement.style.setProperty("--pc-app-provider-scrollbar-width",`${n}px`),document.body.removeChild(r)}class le extends i.Component{constructor(e){super(e),this.setBodyStyles=()=>{document.body.style.backgroundColor="var(--p-color-bg)",document.body.style.color="var(--p-color-text)"},this.setRootAttributes=()=>{const s=this.getThemeName();R.forEach(o=>{document.documentElement.classList.toggle(_(o),o===s)})},this.getThemeName=()=>this.props.theme??w,this.stickyManager=new N,this.scrollLockManager=new K;const{i18n:t,linkComponent:n}=this.props;this.state={link:n,intl:new y(t)}}componentDidMount(){if(document!=null){this.stickyManager.setContainer(document),this.setBodyStyles(),this.setRootAttributes();const e=navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")&&(navigator.userAgent.includes("Version/16.1")||navigator.userAgent.includes("Version/16.2")||navigator.userAgent.includes("Version/16.3")),t=navigator.userAgent.includes("Shopify Mobile/iOS")&&(navigator.userAgent.includes("OS 16_1")||navigator.userAgent.includes("OS 16_2")||navigator.userAgent.includes("OS 16_3"));(e||t)&&document.documentElement.classList.add("Polaris-Safari-16-Font-Optical-Sizing-Patch")}se()}componentDidUpdate({i18n:e,linkComponent:t}){const{i18n:n,linkComponent:s}=this.props;this.setRootAttributes(),!(n===e&&s===t)&&this.setState({link:s,intl:new y(n)})}render(){const{children:e,features:t}=this.props,n=this.getThemeName(),{intl:s,link:o}=this.state;return a.createElement(O.Provider,{value:n},a.createElement(I.Provider,{value:B(n)},a.createElement(J.Provider,{value:t},a.createElement(D.Provider,{value:s},a.createElement(W.Provider,{value:this.scrollLockManager},a.createElement(F.Provider,{value:this.stickyManager},a.createElement(H.Provider,{value:o},a.createElement(X,null,a.createElement(q,null,a.createElement(j,null,a.createElement(te,null,e)))))))))))}}const ce="/assets/styles-BeiPL2RV.css";export{le as A,ce as p};
