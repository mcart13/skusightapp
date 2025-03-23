import{r as n,j as t}from"./index-C_P7ACqV.js";import{f as m,c as y,g as f,h as x,_ as S,M as w,i as j,O as g,S as k}from"./components-CgIgXmEm.js";/**
 * @remix-run/react v2.16.2
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */let a="positions";function M({getKey:r,...l}){let{isSpaMode:c}=m(),i=y(),h=f();x({getKey:r,storageKey:a});let u=n.useMemo(()=>{if(!r)return null;let e=r(i,h);return e!==i.key?e:null},[]);if(c)return null;let d=((e,p)=>{if(!window.history.state||!window.history.state.key){let s=Math.random().toString(32).slice(2);window.history.replaceState({key:s},"")}try{let o=JSON.parse(sessionStorage.getItem(e)||"{}")[p||window.history.state.key];typeof o=="number"&&window.scrollTo(0,o)}catch(s){console.error(s),sessionStorage.removeItem(e)}}).toString();return n.createElement("script",S({},l,{suppressHydrationWarning:!0,dangerouslySetInnerHTML:{__html:`(${d})(${JSON.stringify(a)}, ${JSON.stringify(u)})`}}))}const R=()=>[{title:"SkuSight"},{name:"viewport",content:"width=device-width,initial-scale=1"}];function _(){return t.jsxs("html",{children:[t.jsxs("head",{children:[t.jsx("meta",{charSet:"utf-8"}),t.jsx("meta",{name:"viewport",content:"width=device-width,initial-scale=1"}),t.jsx("link",{rel:"preconnect",href:"https://cdn.shopify.com/"}),t.jsx("link",{rel:"stylesheet",href:"https://cdn.shopify.com/static/fonts/inter/v4/styles.css"}),t.jsx(w,{}),t.jsx(j,{})]}),t.jsxs("body",{children:[t.jsx(g,{}),t.jsx(M,{}),t.jsx(k,{})]})]})}export{_ as default,R as meta};
