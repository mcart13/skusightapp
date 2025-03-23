import{r as f,j as e}from"./index-C_P7ACqV.js";import{T as t,b as d,B as w,C as N,I as V}from"./ButtonGroup-Bgv38W4W.js";import{T,B,P as F}from"./Page-DvtG3tiZ.js";import{E as M}from"./EmptyState-D5BdA5_5.js";import{D as Q}from"./DataTable-DAB58wxr.js";import{L as v}from"./List-l9Je5zTk.js";import{M as A}from"./Modal-CEg-nmC-.js";import{B as q}from"./Banner-4MJ0AgcI.js";import{T as L,L as I}from"./Layout-DNtBfCJd.js";import{u as H,a as J,e as R,b as z}from"./components-CgIgXmEm.js";import"./Image-04wlLHHA.js";import"./index-CeTaglFb.js";import"./Sticky-q5uRhpIz.js";import"./context-Cuq_S-Fv.js";import"./CSSTransition-BI2FqCs3.js";import"./InlineGrid-B9iUkR0h.js";import"./banner-context-B9x05WVp.js";function G({products:j,selectedProducts:r,onProductSelect:y,onQuickOrder:i}){const[l,u]=f.useState({}),[o,a]=f.useState(""),n=s=>{const c=parseInt(s,10);return!isNaN(c)&&c>0},m=(s,c)=>{u({...l,[s]:c})},x=s=>{var S,g,b;const c=parseInt(l[s.id]||"0",10);n(c)&&(y({id:s.id,title:s.title,sku:((b=(g=(S=s.variants)==null?void 0:S.edges[0])==null?void 0:g.node)==null?void 0:b.sku)||"N/A",quantity:c}),u({...l,[s.id]:""}))},k=j.edges.filter(({node:s})=>{var c,S,g;return s.title.toLowerCase().includes(o.toLowerCase())||(((g=(S=(c=s.variants)==null?void 0:c.edges[0])==null?void 0:S.node)==null?void 0:g.sku)||"").toLowerCase().includes(o.toLowerCase())}).map(({node:s})=>{var g;const c=((g=s.variants.edges[0])==null?void 0:g.node)||{},S=r.some(b=>b.id===s.id);return[e.jsx(t,{children:s.title},`title-${s.id}`),e.jsx(t,{children:c.sku||"N/A"},`sku-${s.id}`),e.jsx(t,{children:c.inventoryQuantity||0},`inventory-${s.id}`),e.jsx(T,{type:"number",value:l[s.id]||"",onChange:b=>m(s.id,b),autoComplete:"off",min:"1"},`quantity-${s.id}`),e.jsxs(d,{children:[e.jsx(w,{onClick:()=>x(s),disabled:!n(l[s.id]),children:"Add to Order"}),e.jsx(w,{plain:!0,onClick:()=>i(s),children:"Quick Order"})]},`actions-${s.id}`),S?e.jsx(B,{tone:"success",children:"Selected"}):null]});return j.edges.length===0?e.jsx(N,{children:e.jsx(M,{heading:"No products found",image:"https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",children:e.jsx("p",{children:"No products are currently available in your store."})})}):e.jsx(N,{children:e.jsxs(d,{gap:"4",children:[e.jsx(T,{label:"Search products",value:o,onChange:a,autoComplete:"off",placeholder:"Search by product name or SKU",clearButton:!0,onClearButtonClick:()=>a("")}),e.jsx(Q,{columnContentTypes:["text","text","numeric","numeric","text","text"],headings:["Product","SKU","Current Stock","Order Quantity","Actions","Status"],rows:k,emptyState:e.jsx(M,{heading:"No matching products",image:"https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",children:e.jsx("p",{children:"Try changing your search terms"})})})]})})}function X({suppliers:j,selectedProducts:r,onCreateOrder:y}){const[i,l]=f.useState(""),u=j.filter(a=>a.name.toLowerCase().includes(i.toLowerCase())||a.email.toLowerCase().includes(i.toLowerCase())),o=a=>{if(r.length===0)return{compatible:!1,message:"No products selected"};const n=a.products||[],m=r.filter(x=>n.some(p=>x.title.toLowerCase().includes(p.toLowerCase())));return m.length===r.length?{compatible:!0,message:"All selected products available"}:m.length>0?{compatible:!0,message:`${m.length}/${r.length} products available`}:{compatible:!1,message:"No matching products"}};return e.jsx(N,{children:e.jsxs(d,{gap:"4",children:[e.jsx(t,{fontWeight:"bold",as:"h3",children:"Select Supplier"}),e.jsx(T,{label:"Search suppliers",value:i,onChange:l,autoComplete:"off",placeholder:"Search by supplier name or email",clearButton:!0,onClearButtonClick:()=>l("")}),e.jsx(d,{gap:"4",children:u.length>0?u.map(a=>{const{compatible:n,message:m}=o(a);return e.jsx(N,{children:e.jsxs(d,{gap:"4",children:[e.jsx(t,{fontWeight:"bold",variant:"headingMd",children:a.name}),e.jsxs(t,{variant:"bodyMd",children:["Email: ",a.email]}),r.length>0&&e.jsxs(d,{gap:"2",children:[e.jsx(t,{variant:"bodyMd",fontWeight:"semibold",children:"Selected Products:"}),e.jsx(v,{type:"bullet",children:r.map(x=>e.jsxs(v.Item,{children:[x.title," (Qty: ",x.quantity,")"]},x.id))})]}),e.jsxs(V,{align:"start",children:[e.jsxs(t,{variant:"bodyMd",children:["Compatibility: ",m]}),e.jsx(w,{onClick:()=>y(a),disabled:r.length===0||!n,children:"Create Order"})]})]})},a.id)}):e.jsx(t,{children:"No suppliers found matching your search."})})]})})}function Y({orderHistory:j}){const[r,y]=f.useState(null),[i,l]=f.useState(!1),u=n=>{y(n),l(!0)},o=()=>{l(!1)},a=j.map(n=>[e.jsx(t,{fontWeight:"bold",children:n.id},`id-${n.id}`),e.jsx(t,{children:n.date},`date-${n.id}`),e.jsx(t,{children:n.supplier},`supplier-${n.id}`),e.jsxs(t,{children:[n.products.length," products"]},`products-${n.id}`),e.jsx(w,{onClick:()=>u(n),children:"View Details"},`action-${n.id}`)]);return e.jsxs(e.Fragment,{children:[e.jsx(N,{children:e.jsxs(d,{gap:"4",children:[e.jsx(t,{variant:"headingMd",fontWeight:"bold",children:"Order History"}),a.length>0?e.jsx(Q,{columnContentTypes:["text","text","text","numeric","text"],headings:["Order ID","Date","Supplier","Products","Actions"],rows:a}):e.jsx(t,{children:"No order history available."})]})}),r&&e.jsx(A,{open:i,onClose:o,title:`Order Details: ${r.id}`,primaryAction:{content:"Close",onAction:o},children:e.jsx(A.Section,{children:e.jsxs(d,{gap:"4",children:[e.jsxs(d,{gap:"2",children:[e.jsx(t,{fontWeight:"bold",children:"Date:"}),e.jsx(t,{children:r.date})]}),e.jsxs(d,{gap:"2",children:[e.jsx(t,{fontWeight:"bold",children:"Supplier:"}),e.jsx(t,{children:r.supplier})]}),e.jsxs(d,{gap:"2",children:[e.jsx(t,{fontWeight:"bold",children:"Email:"}),e.jsx(t,{children:r.supplierEmail})]}),e.jsxs(d,{gap:"2",children:[e.jsx(t,{fontWeight:"bold",children:"Products:"}),e.jsx(v,{type:"bullet",children:r.products.map(n=>e.jsxs(v.Item,{children:[n.title," - SKU: ",n.sku,", Quantity: ",n.quantity]},n.id))})]}),e.jsxs(d,{gap:"2",children:[e.jsx(t,{fontWeight:"bold",children:"Status:"}),e.jsx(B,{tone:"success",children:"Completed"})]})]})})})]})}function Z({isOpen:j,onClose:r,onSubmit:y,supplier:i,selectedProducts:l,isSubmitting:u=!1,orderSuccess:o=null}){const[a,n]=f.useState(""),m=()=>{y({supplier:i,products:l,notes:a})},x=l.reduce((p,k)=>p+k.quantity,0);return o?e.jsx(A,{open:j,onClose:r,title:"Order Submitted Successfully",children:e.jsx(A.Section,{children:e.jsxs(d,{gap:"4",children:[e.jsxs(q,{tone:"success",children:["Order has been sent to ",i.name,"!"]}),e.jsxs(L,{children:[e.jsxs(t,{children:["Order ID: ",o.id]}),e.jsxs(t,{children:["Date: ",o.date]}),e.jsxs(t,{children:[l.length," products, ",x," total units"]})]}),e.jsx(w,{onClick:r,children:"Close"})]})})}):e.jsx(A,{open:j,onClose:r,title:`Create Order: ${(i==null?void 0:i.name)||""}`,primaryAction:{content:"Submit Order",onAction:m,loading:u,disabled:u||l.length===0},secondaryActions:[{content:"Cancel",onAction:r,disabled:u}],children:e.jsx(A.Section,{children:e.jsxs(d,{gap:"4",children:[e.jsxs(L,{children:[e.jsx(t,{fontWeight:"bold",children:"Supplier:"}),e.jsx(t,{children:i==null?void 0:i.name}),e.jsx(t,{children:i==null?void 0:i.email})]}),e.jsxs(L,{children:[e.jsx(t,{fontWeight:"bold",children:"Products:"}),e.jsx(v,{type:"bullet",children:l.map(p=>e.jsxs(v.Item,{children:[p.title," (SKU: ",p.sku,") - Quantity: ",p.quantity]},p.id))})]}),e.jsxs(L,{children:[e.jsx(t,{fontWeight:"bold",children:"Order Summary:"}),e.jsxs(t,{children:[l.length," products, ",x," total units"]})]}),e.jsx(T,{label:"Additional Notes",value:a,onChange:n,multiline:4,placeholder:"Add any specific instructions or notes for this order..."})]})})})}function je(){const{products:j,suppliers:r,orderHistory:y}=H(),i=J(),l=R(),u=z(),[o,a]=f.useState([]),[n,m]=f.useState(!1),[x,p]=f.useState(null),[k,s]=f.useState(!1),[c,S]=f.useState(null),g=h=>{const C=o.findIndex(O=>O.id===h.id);if(C>=0){const O=[...o];O[C]={...O[C],quantity:h.quantity},a(O)}else a([...o,h])},b=h=>{var D;const C=((D=h.variants.edges[0])==null?void 0:D.node)||{},O={id:h.id,title:h.title,sku:C.sku||"N/A",quantity:1};g(O);const W=r.find(K=>K.products.some(U=>h.title.toLowerCase().includes(U.toLowerCase())));W&&$(W)},$=h=>{p(h),m(!0)},E=h=>{s(!0);const C={supplierName:h.supplier.name,supplierEmail:h.supplier.email,products:JSON.stringify(h.products),notes:h.notes||""};l(C,{method:"post"})};i&&!c&&(i.success&&S(i.order),s(!1));const P=()=>{m(!1),p(null),S(null),c&&a([])};return e.jsx(F,{title:"Order Automation",backAction:{content:"Dashboard",onAction:()=>u("/app")},primaryAction:{content:"View Sales Analysis",onAction:()=>u("/app/sales-analysis")},children:e.jsxs(d,{gap:"5",children:[i&&!i.success&&e.jsx(q,{tone:"critical",children:i.message||"There was an error creating your order."}),e.jsxs(I,{children:[e.jsx(I.Section,{children:e.jsx(G,{products:j,selectedProducts:o,onProductSelect:g,onQuickOrder:b})}),e.jsx(I.Section,{secondary:!0,children:e.jsxs(d,{gap:"5",children:[e.jsx(X,{suppliers:r,selectedProducts:o,onCreateOrder:$}),e.jsx(Y,{orderHistory:y})]})})]}),e.jsx(Z,{isOpen:n,onClose:P,onSubmit:E,supplier:x,selectedProducts:o,isSubmitting:k,orderSuccess:c})]})})}export{je as default};
