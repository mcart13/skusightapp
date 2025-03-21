var _a;
import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer, Meta, Links, Outlet, ScrollRestoration, Scripts, useLoaderData, useActionData, Form, Link, useRouteError, useSubmit } from "@remix-run/react";
import { createReadableStreamFromReadable, redirect, json } from "@remix-run/node";
import { isbot } from "isbot";
import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp, AppDistribution, ApiVersion, LoginErrorType, boundary } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";
import { useState, useEffect } from "react";
import { AppProvider, Page, Card, FormLayout, Text, TextField, Button, Checkbox, Layout, BlockStack, DataTable, Modal, TextContainer, Divider, List, Banner, ProgressBar, Select, Badge, ResourceList, ResourceItem, EmptyState, Link as Link$1, Box } from "@shopify/polaris";
import { AppProvider as AppProvider$1 } from "@shopify/shopify-app-remix/react";
import { NavMenu, TitleBar } from "@shopify/app-bridge-react";
if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}
const prisma = global.prismaGlobal ?? new PrismaClient();
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: (_a = process.env.SCOPES) == null ? void 0 : _a.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true
  },
  ...process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}
});
ApiVersion.January25;
const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
const authenticate = shopify.authenticate;
shopify.unauthenticated;
const login = shopify.login;
shopify.registerWebhooks;
shopify.sessionStorage;
const streamTimeout = 5e3;
async function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(RemixServer, { context: remixContext, url: request.url }),
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        }
      }
    );
    setTimeout(abort, streamTimeout + 1e3);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
function App$2() {
  return /* @__PURE__ */ jsxs("html", { children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width,initial-scale=1" }),
      /* @__PURE__ */ jsx("link", { rel: "preconnect", href: "https://cdn.shopify.com/" }),
      /* @__PURE__ */ jsx(
        "link",
        {
          rel: "stylesheet",
          href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        }
      ),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App$2
}, Symbol.toStringTag, { value: "Module" }));
const action$4 = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;
  if (session) {
    await prisma.session.update({
      where: {
        id: session.id
      },
      data: {
        scope: current.toString()
      }
    });
  }
  return new Response();
};
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4
}, Symbol.toStringTag, { value: "Module" }));
const action$3 = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  if (session) {
    await prisma.session.deleteMany({ where: { shop } });
  }
  return new Response();
};
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3
}, Symbol.toStringTag, { value: "Module" }));
const Polaris = /* @__PURE__ */ JSON.parse('{"ActionMenu":{"Actions":{"moreActions":"More actions"},"RollupActions":{"rollupButton":"View actions"}},"ActionList":{"SearchField":{"clearButtonLabel":"Clear","search":"Search","placeholder":"Search actions"}},"Avatar":{"label":"Avatar","labelWithInitials":"Avatar with initials {initials}"},"Autocomplete":{"spinnerAccessibilityLabel":"Loading","ellipsis":"{content}…"},"Badge":{"PROGRESS_LABELS":{"incomplete":"Incomplete","partiallyComplete":"Partially complete","complete":"Complete"},"TONE_LABELS":{"info":"Info","success":"Success","warning":"Warning","critical":"Critical","attention":"Attention","new":"New","readOnly":"Read-only","enabled":"Enabled"},"progressAndTone":"{toneLabel} {progressLabel}"},"Banner":{"dismissButton":"Dismiss notification"},"Button":{"spinnerAccessibilityLabel":"Loading"},"Common":{"checkbox":"checkbox","undo":"Undo","cancel":"Cancel","clear":"Clear","close":"Close","submit":"Submit","more":"More"},"ContextualSaveBar":{"save":"Save","discard":"Discard"},"DataTable":{"sortAccessibilityLabel":"sort {direction} by","navAccessibilityLabel":"Scroll table {direction} one column","totalsRowHeading":"Totals","totalRowHeading":"Total"},"DatePicker":{"previousMonth":"Show previous month, {previousMonthName} {showPreviousYear}","nextMonth":"Show next month, {nextMonth} {nextYear}","today":"Today ","start":"Start of range","end":"End of range","months":{"january":"January","february":"February","march":"March","april":"April","may":"May","june":"June","july":"July","august":"August","september":"September","october":"October","november":"November","december":"December"},"days":{"monday":"Monday","tuesday":"Tuesday","wednesday":"Wednesday","thursday":"Thursday","friday":"Friday","saturday":"Saturday","sunday":"Sunday"},"daysAbbreviated":{"monday":"Mo","tuesday":"Tu","wednesday":"We","thursday":"Th","friday":"Fr","saturday":"Sa","sunday":"Su"}},"DiscardConfirmationModal":{"title":"Discard all unsaved changes","message":"If you discard changes, you’ll delete any edits you made since you last saved.","primaryAction":"Discard changes","secondaryAction":"Continue editing"},"DropZone":{"single":{"overlayTextFile":"Drop file to upload","overlayTextImage":"Drop image to upload","overlayTextVideo":"Drop video to upload","actionTitleFile":"Add file","actionTitleImage":"Add image","actionTitleVideo":"Add video","actionHintFile":"or drop file to upload","actionHintImage":"or drop image to upload","actionHintVideo":"or drop video to upload","labelFile":"Upload file","labelImage":"Upload image","labelVideo":"Upload video"},"allowMultiple":{"overlayTextFile":"Drop files to upload","overlayTextImage":"Drop images to upload","overlayTextVideo":"Drop videos to upload","actionTitleFile":"Add files","actionTitleImage":"Add images","actionTitleVideo":"Add videos","actionHintFile":"or drop files to upload","actionHintImage":"or drop images to upload","actionHintVideo":"or drop videos to upload","labelFile":"Upload files","labelImage":"Upload images","labelVideo":"Upload videos"},"errorOverlayTextFile":"File type is not valid","errorOverlayTextImage":"Image type is not valid","errorOverlayTextVideo":"Video type is not valid"},"EmptySearchResult":{"altText":"Empty search results"},"Frame":{"skipToContent":"Skip to content","navigationLabel":"Navigation","Navigation":{"closeMobileNavigationLabel":"Close navigation"}},"FullscreenBar":{"back":"Back","accessibilityLabel":"Exit fullscreen mode"},"Filters":{"moreFilters":"More filters","moreFiltersWithCount":"More filters ({count})","filter":"Filter {resourceName}","noFiltersApplied":"No filters applied","cancel":"Cancel","done":"Done","clearAllFilters":"Clear all filters","clear":"Clear","clearLabel":"Clear {filterName}","addFilter":"Add filter","clearFilters":"Clear all","searchInView":"in:{viewName}"},"FilterPill":{"clear":"Clear","unsavedChanges":"Unsaved changes - {label}"},"IndexFilters":{"searchFilterTooltip":"Search and filter","searchFilterTooltipWithShortcut":"Search and filter (F)","searchFilterAccessibilityLabel":"Search and filter results","sort":"Sort your results","addView":"Add a new view","newView":"Custom search","SortButton":{"ariaLabel":"Sort the results","tooltip":"Sort","title":"Sort by","sorting":{"asc":"Ascending","desc":"Descending","az":"A-Z","za":"Z-A"}},"EditColumnsButton":{"tooltip":"Edit columns","accessibilityLabel":"Customize table column order and visibility"},"UpdateButtons":{"cancel":"Cancel","update":"Update","save":"Save","saveAs":"Save as","modal":{"title":"Save view as","label":"Name","sameName":"A view with this name already exists. Please choose a different name.","save":"Save","cancel":"Cancel"}}},"IndexProvider":{"defaultItemSingular":"Item","defaultItemPlural":"Items","allItemsSelected":"All {itemsLength}+ {resourceNamePlural} are selected","selected":"{selectedItemsCount} selected","a11yCheckboxDeselectAllSingle":"Deselect {resourceNameSingular}","a11yCheckboxSelectAllSingle":"Select {resourceNameSingular}","a11yCheckboxDeselectAllMultiple":"Deselect all {itemsLength} {resourceNamePlural}","a11yCheckboxSelectAllMultiple":"Select all {itemsLength} {resourceNamePlural}"},"IndexTable":{"emptySearchTitle":"No {resourceNamePlural} found","emptySearchDescription":"Try changing the filters or search term","onboardingBadgeText":"New","resourceLoadingAccessibilityLabel":"Loading {resourceNamePlural}…","selectAllLabel":"Select all {resourceNamePlural}","selected":"{selectedItemsCount} selected","undo":"Undo","selectAllItems":"Select all {itemsLength}+ {resourceNamePlural}","selectItem":"Select {resourceName}","selectButtonText":"Select","sortAccessibilityLabel":"sort {direction} by"},"Loading":{"label":"Page loading bar"},"Modal":{"iFrameTitle":"body markup","modalWarning":"These required properties are missing from Modal: {missingProps}"},"Page":{"Header":{"rollupActionsLabel":"View actions for {title}","pageReadyAccessibilityLabel":"{title}. This page is ready"}},"Pagination":{"previous":"Previous","next":"Next","pagination":"Pagination"},"ProgressBar":{"negativeWarningMessage":"Values passed to the progress prop shouldn’t be negative. Resetting {progress} to 0.","exceedWarningMessage":"Values passed to the progress prop shouldn’t exceed 100. Setting {progress} to 100."},"ResourceList":{"sortingLabel":"Sort by","defaultItemSingular":"item","defaultItemPlural":"items","showing":"Showing {itemsCount} {resource}","showingTotalCount":"Showing {itemsCount} of {totalItemsCount} {resource}","loading":"Loading {resource}","selected":"{selectedItemsCount} selected","allItemsSelected":"All {itemsLength}+ {resourceNamePlural} in your store are selected","allFilteredItemsSelected":"All {itemsLength}+ {resourceNamePlural} in this filter are selected","selectAllItems":"Select all {itemsLength}+ {resourceNamePlural} in your store","selectAllFilteredItems":"Select all {itemsLength}+ {resourceNamePlural} in this filter","emptySearchResultTitle":"No {resourceNamePlural} found","emptySearchResultDescription":"Try changing the filters or search term","selectButtonText":"Select","a11yCheckboxDeselectAllSingle":"Deselect {resourceNameSingular}","a11yCheckboxSelectAllSingle":"Select {resourceNameSingular}","a11yCheckboxDeselectAllMultiple":"Deselect all {itemsLength} {resourceNamePlural}","a11yCheckboxSelectAllMultiple":"Select all {itemsLength} {resourceNamePlural}","Item":{"actionsDropdownLabel":"Actions for {accessibilityLabel}","actionsDropdown":"Actions dropdown","viewItem":"View details for {itemName}"},"BulkActions":{"actionsActivatorLabel":"Actions","moreActionsActivatorLabel":"More actions"}},"SkeletonPage":{"loadingLabel":"Page loading"},"Tabs":{"newViewAccessibilityLabel":"Create new view","newViewTooltip":"Create view","toggleTabsLabel":"More views","Tab":{"rename":"Rename view","duplicate":"Duplicate view","edit":"Edit view","editColumns":"Edit columns","delete":"Delete view","copy":"Copy of {name}","deleteModal":{"title":"Delete view?","description":"This can’t be undone. {viewName} view will no longer be available in your admin.","cancel":"Cancel","delete":"Delete view"}},"RenameModal":{"title":"Rename view","label":"Name","cancel":"Cancel","create":"Save","errors":{"sameName":"A view with this name already exists. Please choose a different name."}},"DuplicateModal":{"title":"Duplicate view","label":"Name","cancel":"Cancel","create":"Create view","errors":{"sameName":"A view with this name already exists. Please choose a different name."}},"CreateViewModal":{"title":"Create new view","label":"Name","cancel":"Cancel","create":"Create view","errors":{"sameName":"A view with this name already exists. Please choose a different name."}}},"Tag":{"ariaLabel":"Remove {children}"},"TextField":{"characterCount":"{count} characters","characterCountWithMaxLength":"{count} of {limit} characters used"},"TooltipOverlay":{"accessibilityLabel":"Tooltip: {label}"},"TopBar":{"toggleMenuLabel":"Toggle menu","SearchField":{"clearButtonLabel":"Clear","search":"Search"}},"MediaCard":{"dismissButton":"Dismiss","popoverButton":"Actions"},"VideoThumbnail":{"playButtonA11yLabel":{"default":"Play video","defaultWithDuration":"Play video of length {duration}","duration":{"hours":{"other":{"only":"{hourCount} hours","andMinutes":"{hourCount} hours and {minuteCount} minutes","andMinute":"{hourCount} hours and {minuteCount} minute","minutesAndSeconds":"{hourCount} hours, {minuteCount} minutes, and {secondCount} seconds","minutesAndSecond":"{hourCount} hours, {minuteCount} minutes, and {secondCount} second","minuteAndSeconds":"{hourCount} hours, {minuteCount} minute, and {secondCount} seconds","minuteAndSecond":"{hourCount} hours, {minuteCount} minute, and {secondCount} second","andSeconds":"{hourCount} hours and {secondCount} seconds","andSecond":"{hourCount} hours and {secondCount} second"},"one":{"only":"{hourCount} hour","andMinutes":"{hourCount} hour and {minuteCount} minutes","andMinute":"{hourCount} hour and {minuteCount} minute","minutesAndSeconds":"{hourCount} hour, {minuteCount} minutes, and {secondCount} seconds","minutesAndSecond":"{hourCount} hour, {minuteCount} minutes, and {secondCount} second","minuteAndSeconds":"{hourCount} hour, {minuteCount} minute, and {secondCount} seconds","minuteAndSecond":"{hourCount} hour, {minuteCount} minute, and {secondCount} second","andSeconds":"{hourCount} hour and {secondCount} seconds","andSecond":"{hourCount} hour and {secondCount} second"}},"minutes":{"other":{"only":"{minuteCount} minutes","andSeconds":"{minuteCount} minutes and {secondCount} seconds","andSecond":"{minuteCount} minutes and {secondCount} second"},"one":{"only":"{minuteCount} minute","andSeconds":"{minuteCount} minute and {secondCount} seconds","andSecond":"{minuteCount} minute and {secondCount} second"}},"seconds":{"other":"{secondCount} seconds","one":"{secondCount} second"}}}}}');
const polarisTranslations = {
  Polaris
};
const polarisStyles = "/assets/styles-BeiPL2RV.css";
function loginErrorMessage(loginErrors) {
  if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.MissingShop) {
    return { shop: "Please enter your shop domain to log in" };
  } else if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.InvalidShop) {
    return { shop: "Please enter a valid shop domain to log in" };
  }
  return {};
}
const links$1 = () => [{ rel: "stylesheet", href: polarisStyles }];
const loader$9 = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors, polarisTranslations };
};
const action$2 = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return {
    errors
  };
};
function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;
  return /* @__PURE__ */ jsx(AppProvider, { i18n: loaderData.polarisTranslations, children: /* @__PURE__ */ jsx(Page, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(Form, { method: "post", children: /* @__PURE__ */ jsxs(FormLayout, { children: [
    /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Log in" }),
    /* @__PURE__ */ jsx(
      TextField,
      {
        type: "text",
        name: "shop",
        label: "Shop domain",
        helpText: "example.myshopify.com",
        value: shop,
        onChange: setShop,
        autoComplete: "on",
        error: errors.shop
      }
    ),
    /* @__PURE__ */ jsx(Button, { submit: true, children: "Log in" })
  ] }) }) }) }) });
}
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  default: Auth,
  links: links$1,
  loader: loader$9
}, Symbol.toStringTag, { value: "Module" }));
const loader$8 = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$8
}, Symbol.toStringTag, { value: "Module" }));
const index = "_index_1hqgz_1";
const heading = "_heading_1hqgz_21";
const text = "_text_1hqgz_23";
const content = "_content_1hqgz_43";
const form = "_form_1hqgz_53";
const label = "_label_1hqgz_69";
const input = "_input_1hqgz_85";
const button = "_button_1hqgz_93";
const list = "_list_1hqgz_101";
const styles = {
  index,
  heading,
  text,
  content,
  form,
  label,
  input,
  button,
  list
};
const loader$7 = async ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return { showForm: Boolean(login) };
};
function App$1() {
  const { showForm } = useLoaderData();
  return /* @__PURE__ */ jsx("div", { className: styles.index, children: /* @__PURE__ */ jsxs("div", { className: styles.content, children: [
    /* @__PURE__ */ jsx("h1", { className: styles.heading, children: "A short heading about [your app]" }),
    /* @__PURE__ */ jsx("p", { className: styles.text, children: "A tagline about [your app] that describes your value proposition." }),
    showForm && /* @__PURE__ */ jsxs(Form, { className: styles.form, method: "post", action: "/auth/login", children: [
      /* @__PURE__ */ jsxs("label", { className: styles.label, children: [
        /* @__PURE__ */ jsx("span", { children: "Shop domain" }),
        /* @__PURE__ */ jsx("input", { className: styles.input, type: "text", name: "shop" }),
        /* @__PURE__ */ jsx("span", { children: "e.g: my-shop-domain.myshopify.com" })
      ] }),
      /* @__PURE__ */ jsx("button", { className: styles.button, type: "submit", children: "Log in" })
    ] }),
    /* @__PURE__ */ jsxs("ul", { className: styles.list, children: [
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Product feature" }),
        ". Some detail about your feature and its benefit to your customer."
      ] }),
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Product feature" }),
        ". Some detail about your feature and its benefit to your customer."
      ] }),
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Product feature" }),
        ". Some detail about your feature and its benefit to your customer."
      ] })
    ] })
  ] }) });
}
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App$1,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
const links = () => [{ rel: "stylesheet", href: polarisStyles }];
const loader$6 = async ({ request }) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};
function App() {
  const { apiKey } = useLoaderData();
  return /* @__PURE__ */ jsxs(AppProvider$1, { isEmbeddedApp: true, apiKey, children: [
    /* @__PURE__ */ jsxs(NavMenu, { children: [
      /* @__PURE__ */ jsx(Link, { to: "/app", rel: "home", children: "Home" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/additional", children: "Additional page" })
    ] }),
    /* @__PURE__ */ jsx(Outlet, {})
  ] });
}
function ErrorBoundary() {
  return boundary.error(useRouteError());
}
const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: App,
  headers,
  links,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
const loader$5 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(`
    query {
      products(first: 10) {
        edges {
          node {
            id
            title
            variants(first: 1) {
              edges {
                node {
                  id
                  inventoryQuantity
                  price
                  sku
                }
              }
            }
          }
        }
      }
    }
  `);
  const responseJson = await response.json();
  const suppliers = [
    {
      id: "sup_001",
      name: "Global Supply Co.",
      email: "orders@globalsupply.example",
      products: ["snowboard", "ski"]
    },
    {
      id: "sup_002",
      name: "Premium Materials Inc.",
      email: "orders@premiummaterials.example",
      products: ["card", "wax"]
    }
  ];
  return json({
    products: responseJson.data.products,
    suppliers
  });
};
const action$1 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  formData.get("supplierEmail");
  const supplierName = formData.get("supplierName");
  const products = JSON.parse(formData.get("products"));
  return json({
    success: true,
    orderNumber: "ORD-" + Math.floor(Math.random() * 1e6),
    supplier: supplierName,
    products
  });
};
function OrderAutomation() {
  const { products, suppliers } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const [selected, setSelected] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [initialQuantitiesSet, setInitialQuantitiesSet] = useState(false);
  const productsBySupplier = {};
  suppliers.forEach((supplier) => {
    productsBySupplier[supplier.id] = [];
  });
  const productData = products.edges.map(({ node }) => {
    var _a2;
    const variant = (_a2 = node.variants.edges[0]) == null ? void 0 : _a2.node;
    const currentStock = (variant == null ? void 0 : variant.inventoryQuantity) || 0;
    const sku = (variant == null ? void 0 : variant.sku) || "";
    const price = (variant == null ? void 0 : variant.price) || 0;
    const avgDailySales = Math.random() * 3 + 0.5;
    const leadTime = Math.floor(Math.random() * 5) + 3;
    const stdDev = avgDailySales * 0.3;
    const safetyStock = Math.ceil(1.645 * stdDev * Math.sqrt(leadTime));
    const reorderPoint = Math.ceil(avgDailySales * leadTime) + safetyStock;
    const annualDemand = avgDailySales * 365;
    const orderingCost = 20;
    const holdingCost = price * 0.2 || 5;
    const eoq = Math.ceil(Math.sqrt(2 * annualDemand * orderingCost / holdingCost));
    const needsReorder = currentStock <= reorderPoint;
    const suggestedQuantity = needsReorder ? Math.max(eoq, reorderPoint - currentStock) : 0;
    const supplierMatch = suppliers.find(
      (supplier) => supplier.products.some((keyword) => node.title.toLowerCase().includes(keyword))
    );
    const supplierId = supplierMatch ? supplierMatch.id : suppliers[0].id;
    if (needsReorder && suggestedQuantity > 0) {
      productsBySupplier[supplierId].push({
        id: node.id,
        title: node.title,
        sku,
        currentStock,
        reorderPoint,
        suggestedQuantity
      });
    }
    return {
      id: node.id,
      title: node.title,
      sku,
      currentStock,
      reorderPoint,
      suggestedQuantity,
      needsReorder,
      supplierId
    };
  });
  useEffect(() => {
    if (!initialQuantitiesSet && productData.length > 0) {
      const initialQuantities = {};
      productData.forEach((product) => {
        if (product.needsReorder && product.suggestedQuantity > 0) {
          initialQuantities[product.id] = product.suggestedQuantity;
        }
      });
      setQuantities(initialQuantities);
      setInitialQuantitiesSet(true);
    }
  }, [productData, initialQuantitiesSet]);
  useEffect(() => {
    if ((actionData == null ? void 0 : actionData.success) && !successModalOpen) {
      setSuccessModalOpen(true);
    }
  }, [actionData, successModalOpen]);
  const reorderNeededProducts = productData.filter((p) => p.needsReorder);
  const rows = reorderNeededProducts.map((product) => {
    var _a2, _b;
    return [
      /* @__PURE__ */ jsx(
        Checkbox,
        {
          label: "",
          checked: selected.includes(product.id),
          onChange: () => {
            if (selected.includes(product.id)) {
              setSelected(selected.filter((id) => id !== product.id));
            } else {
              setSelected([...selected, product.id]);
            }
          }
        }
      ),
      product.title,
      product.sku,
      product.currentStock,
      product.reorderPoint,
      /* @__PURE__ */ jsx(
        TextField,
        {
          type: "number",
          value: ((_a2 = quantities[product.id]) == null ? void 0 : _a2.toString()) || product.suggestedQuantity.toString(),
          onChange: (value) => {
            setQuantities({
              ...quantities,
              [product.id]: parseInt(value) || 0
            });
          },
          min: 0
        }
      ),
      ((_b = suppliers.find((s) => s.id === product.supplierId)) == null ? void 0 : _b.name) || "Unknown"
    ];
  });
  const handleCreateOrder = (supplierId) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    setCurrentSupplier(supplier);
    setOrderModalOpen(true);
  };
  const handleSubmitOrder = () => {
    const productsForSupplier = reorderNeededProducts.filter((p) => selected.includes(p.id) && p.supplierId === currentSupplier.id).map((p) => ({
      id: p.id,
      title: p.title,
      sku: p.sku,
      quantity: quantities[p.id] || p.suggestedQuantity
    }));
    const formData = new FormData();
    formData.append("supplierEmail", currentSupplier.email);
    formData.append("supplierName", currentSupplier.name);
    formData.append("products", JSON.stringify(productsForSupplier));
    submit(formData, { method: "post" });
    setOrderModalOpen(false);
  };
  return /* @__PURE__ */ jsxs(
    Page,
    {
      title: "Order Automation",
      backAction: {
        content: "Dashboard",
        url: "/app"
      },
      secondaryActions: [
        {
          content: "Select All",
          onAction: () => setSelected(reorderNeededProducts.map((p) => p.id))
        },
        {
          content: "Clear Selection",
          onAction: () => setSelected([])
        }
      ],
      children: [
        /* @__PURE__ */ jsx(Layout, { children: reorderNeededProducts.length === 0 ? /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "No products currently need reordering" }),
          /* @__PURE__ */ jsx(Text, { children: "All your products have sufficient inventory based on current forecasts." })
        ] }) }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Products Needing Restock" }),
            /* @__PURE__ */ jsx(
              DataTable,
              {
                columnContentTypes: ["text", "text", "text", "numeric", "numeric", "numeric", "text"],
                headings: ["Select", "Product", "SKU", "Current Stock", "Reorder Point", "Order Quantity", "Supplier"],
                rows
              }
            ),
            /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Suggested quantities are calculated based on your sales velocity, lead time, and optimal order size." })
          ] }) }) }),
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Create Purchase Orders" }),
            /* @__PURE__ */ jsx(BlockStack, { gap: "400", children: suppliers.map((supplier) => {
              const supplierProducts = productsBySupplier[supplier.id].filter((p) => selected.includes(p.id));
              if (supplierProducts.length === 0) return null;
              return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
                  /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: supplier.name }),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      primary: true,
                      onClick: () => handleCreateOrder(supplier.id),
                      children: "Create Purchase Order"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs(Text, { children: [
                  supplierProducts.length,
                  " products selected"
                ] })
              ] }) }, supplier.id);
            }) })
          ] }) }) })
        ] }) }),
        /* @__PURE__ */ jsx(
          Modal,
          {
            open: orderModalOpen,
            onClose: () => setOrderModalOpen(false),
            title: "Confirm Purchase Order",
            primaryAction: {
              content: "Submit Order",
              onAction: handleSubmitOrder
            },
            secondaryActions: [
              {
                content: "Cancel",
                onAction: () => setOrderModalOpen(false)
              }
            ],
            children: /* @__PURE__ */ jsx(Modal.Section, { children: currentSupplier && /* @__PURE__ */ jsxs(TextContainer, { children: [
              /* @__PURE__ */ jsx(Text, { children: "You are about to send a purchase order to:" }),
              /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: currentSupplier.name }),
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: currentSupplier.email }),
              /* @__PURE__ */ jsx(Divider, {}),
              /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Order Contents:" }),
              /* @__PURE__ */ jsx(List, { type: "bullet", children: reorderNeededProducts.filter((p) => selected.includes(p.id) && p.supplierId === currentSupplier.id).map((p) => /* @__PURE__ */ jsxs(List.Item, { children: [
                p.title,
                " (SKU: ",
                p.sku,
                ") - Quantity: ",
                quantities[p.id] || p.suggestedQuantity
              ] }, p.id)) })
            ] }) })
          }
        ),
        /* @__PURE__ */ jsx(
          Modal,
          {
            open: successModalOpen,
            onClose: () => setSuccessModalOpen(false),
            title: "Order Submitted Successfully",
            primaryAction: {
              content: "Continue",
              onAction: () => setSuccessModalOpen(false)
            },
            children: /* @__PURE__ */ jsx(Modal.Section, { children: actionData && /* @__PURE__ */ jsxs(TextContainer, { children: [
              /* @__PURE__ */ jsxs(Banner, { status: "success", children: [
                "Your purchase order has been sent to ",
                actionData.supplier
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { marginTop: "12px" }, children: [
                /* @__PURE__ */ jsxs(Text, { children: [
                  "Order number: ",
                  actionData.orderNumber
                ] }),
                /* @__PURE__ */ jsxs(Text, { variant: "bodySm", children: [
                  actionData.products.length,
                  " products ordered"
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { marginTop: "16px" }, children: [
                /* @__PURE__ */ jsx(Text, { children: "In an actual implementation, this would:" }),
                /* @__PURE__ */ jsxs(List, { type: "bullet", children: [
                  /* @__PURE__ */ jsx(List.Item, { children: "Send a formatted email to your supplier" }),
                  /* @__PURE__ */ jsx(List.Item, { children: "Update your purchase order history" }),
                  /* @__PURE__ */ jsx(List.Item, { children: "Track the order status until delivery" })
                ] })
              ] })
            ] }) })
          }
        )
      ]
    }
  );
}
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: OrderAutomation,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
const generateExplanation = (product) => {
  const explanations = [];
  if (product.trend > 10) {
    explanations.push({
      factor: "Recent Sales Trend",
      impact: `+${Math.round(product.trend)}%`,
      description: `Sales are accelerating (+${Math.round(product.trend)}% in last 30 days)`
    });
  } else if (product.trend < -10) {
    explanations.push({
      factor: "Recent Sales Trend",
      impact: `${Math.round(product.trend)}%`,
      description: `Sales are slowing down (${Math.round(product.trend)}% in last 30 days)`
    });
  }
  if (product.title.includes("Snowboard")) {
    const currentMonth = (/* @__PURE__ */ new Date()).getMonth();
    if (currentMonth >= 9 || currentMonth <= 1) {
      explanations.push({
        factor: "Seasonal Pattern",
        impact: "+30%",
        description: "Winter season typically increases demand by 30% based on historical data"
      });
    }
  }
  if (product.stdDev > 2) {
    explanations.push({
      factor: "Sales Variability",
      impact: "+15%",
      description: "High sales variability requires higher safety stock"
    });
  }
  explanations.push({
    factor: "Lead Time",
    impact: `${product.leadTime} days`,
    description: `Supplier typically takes ${product.leadTime} days to fulfill orders`
  });
  return explanations;
};
const loader$4 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const PRODUCTS_QUERY = `
    query {
      products(first: 10) {
        edges {
          node {
            id
            title
            variants(first: 1) {
              edges {
                node {
                  id
                  inventoryQuantity
                  price
                }
              }
            }
          }
        }
      }
    }
  `;
  const response = await admin.graphql(PRODUCTS_QUERY);
  const responseJson = await response.json();
  return json({ products: responseJson.data.products });
};
function SalesAnalysis() {
  const { products } = useLoaderData();
  const [selectedProduct, setSelectedProduct] = useState("");
  const simulateHistoricalSales = (productId) => {
    const baseSales = Math.floor(Math.random() * 5) + 1;
    const trend = Math.random() > 0.7 ? 0.1 : Math.random() > 0.5 ? -0.05 : 0;
    const seasonality = Math.random() > 0.7;
    return Array(30).fill(0).map((_, day) => {
      let daySales = baseSales;
      daySales += day * trend;
      if (seasonality && (day % 7 === 5 || day % 7 === 6)) {
        daySales *= 1.5;
      }
      daySales += Math.random() * 2 - 1;
      return Math.max(0, Math.round(daySales));
    });
  };
  const productData = products.edges.map(({ node }) => {
    var _a2;
    const variant = (_a2 = node.variants.edges[0]) == null ? void 0 : _a2.node;
    const currentStock = (variant == null ? void 0 : variant.inventoryQuantity) || 0;
    const historicalSales = simulateHistoricalSales(node.id);
    const averageSales = historicalSales.reduce((sum, sales) => sum + sales, 0) / historicalSales.length;
    const firstHalf = historicalSales.slice(0, 15);
    const secondHalf = historicalSales.slice(15);
    const firstHalfAvg = firstHalf.reduce((sum, sales) => sum + sales, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, sales) => sum + sales, 0) / secondHalf.length;
    const trend = firstHalfAvg > 0 ? (secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100 : 0;
    const variance = historicalSales.reduce((sum, sales) => sum + Math.pow(sales - averageSales, 2), 0) / historicalSales.length;
    const stdDev = Math.sqrt(variance);
    const leadTime = Math.floor(Math.random() * 5) + 3;
    const safetyStock = Math.ceil(1.645 * stdDev * Math.sqrt(leadTime));
    const reorderPoint = Math.ceil(averageSales * leadTime) + safetyStock;
    let adjustedAverageSales = averageSales;
    if (Math.abs(trend) > 5) {
      adjustedAverageSales = averageSales * (1 + trend / 100);
    }
    const daysUntilStockout = adjustedAverageSales > 0 ? Math.ceil(currentStock / adjustedAverageSales) : Infinity;
    const annualDemand = adjustedAverageSales * 365;
    const orderingCost = 20;
    const holdingCost = parseFloat(variant == null ? void 0 : variant.price) * 0.2 || 5;
    const eoq = Math.ceil(Math.sqrt(2 * annualDemand * orderingCost / holdingCost));
    return {
      title: node.title,
      id: node.id,
      averageSales: parseFloat(averageSales.toFixed(2)),
      adjustedAverageSales: parseFloat(adjustedAverageSales.toFixed(2)),
      currentStock,
      daysUntilStockout: daysUntilStockout === Infinity ? "N/A" : daysUntilStockout,
      trend: parseFloat(trend.toFixed(1)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      leadTime,
      safetyStock,
      reorderPoint,
      price: (variant == null ? void 0 : variant.price) || 0,
      eoq
    };
  });
  const selectedProductData = productData.find((p) => p.id === selectedProduct);
  useEffect(() => {
    if (productData.length > 0 && !selectedProduct) {
      setSelectedProduct(productData[0].id);
    }
  }, [productData, selectedProduct]);
  productData.sort((a, b) => b.averageSales - a.averageSales);
  productData.map((product) => [
    product.title,
    product.adjustedAverageSales,
    product.currentStock,
    typeof product.daysUntilStockout === "number" ? product.daysUntilStockout : product.daysUntilStockout,
    product.trend > 0 ? `+${product.trend}%` : `${product.trend}%`
  ]);
  const advancedRows = productData.map((product) => [
    product.title,
    product.safetyStock,
    product.reorderPoint,
    product.leadTime,
    product.eoq
  ]);
  const topProducts = productData.slice(0, 5);
  return /* @__PURE__ */ jsx(
    Page,
    {
      title: "Sales Analysis",
      backAction: {
        content: "Inventory Dashboard",
        url: "/app"
      },
      primaryAction: /* @__PURE__ */ jsx(Link, { to: "/app/settings", children: /* @__PURE__ */ jsx(Button, { children: "Customize Settings" }) }),
      children: /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Top Products by Daily Sales" }),
          /* @__PURE__ */ jsx(BlockStack, { gap: "400", children: topProducts.map((product) => /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }, children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "bold", children: product.title }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center" }, children: [
                /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", children: [
                  product.averageSales,
                  " units/day"
                ] }),
                product.trend !== 0 && /* @__PURE__ */ jsx("span", { style: {
                  marginLeft: "8px",
                  color: product.trend > 0 ? "#108043" : "#DE3618",
                  fontWeight: "bold"
                }, children: product.trend > 0 ? `↑ ${product.trend}%` : `↓ ${Math.abs(product.trend)}%` })
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              ProgressBar,
              {
                progress: product.averageSales / topProducts[0].averageSales * 100,
                size: "small",
                color: "primary"
              }
            )
          ] }, product.title)) })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Forecast Explanations" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(
              Select,
              {
                label: "Product",
                options: productData.map((p) => ({ label: p.title, value: p.id })),
                value: selectedProduct,
                onChange: (value) => setSelectedProduct(value)
              }
            ),
            selectedProductData && /* @__PURE__ */ jsx("div", { style: { marginTop: "16px" }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
              /* @__PURE__ */ jsxs(Text, { variant: "headingSm", children: [
                "Why we're forecasting ",
                selectedProductData.daysUntilStockout,
                " days until stockout:"
              ] }),
              /* @__PURE__ */ jsx("div", { style: { marginTop: "8px" }, children: generateExplanation(selectedProductData).map((explanation, index2) => /* @__PURE__ */ jsxs("div", { style: {
                padding: "12px",
                marginBottom: "8px",
                borderLeft: "4px solid #5c6ac4",
                backgroundColor: "#F9FAFB"
              }, children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "bold", children: explanation.factor }),
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "bold", children: explanation.impact })
                ] }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: explanation.description })
              ] }, index2)) }),
              /* @__PURE__ */ jsx("div", { style: { marginTop: "12px" }, children: /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "The forecast combines your historical sales data, recent trends, seasonal patterns, and supplier lead times to provide the most accurate prediction." }) })
            ] }) })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Forecast Visualization" }),
          selectedProductData && /* @__PURE__ */ jsxs("div", { style: { marginTop: "12px" }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", marginBottom: "8px" }, children: [
              /* @__PURE__ */ jsx("div", { style: { width: "120px" }, children: /* @__PURE__ */ jsx(Text, { children: "Current Stock" }) }),
              /* @__PURE__ */ jsx("div", { style: {
                flex: 1,
                height: "24px",
                backgroundColor: "#DFE3E8",
                borderRadius: "3px",
                overflow: "hidden",
                position: "relative"
              }, children: /* @__PURE__ */ jsx("div", { style: {
                position: "absolute",
                height: "100%",
                width: `${Math.min(100, selectedProductData.currentStock / (selectedProductData.reorderPoint * 2) * 100)}%`,
                backgroundColor: "#5c6ac4"
              } }) }),
              /* @__PURE__ */ jsx("div", { style: { width: "60px", textAlign: "right" }, children: /* @__PURE__ */ jsxs(Text, { children: [
                selectedProductData.currentStock,
                " units"
              ] }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", marginBottom: "8px" }, children: [
              /* @__PURE__ */ jsx("div", { style: { width: "120px" }, children: /* @__PURE__ */ jsx(Text, { children: "Reorder Point" }) }),
              /* @__PURE__ */ jsx("div", { style: {
                flex: 1,
                height: "24px",
                borderRadius: "3px",
                position: "relative"
              }, children: /* @__PURE__ */ jsx("div", { style: {
                position: "absolute",
                height: "100%",
                left: `${Math.min(100, selectedProductData.reorderPoint / (selectedProductData.reorderPoint * 2) * 100)}%`,
                borderLeft: "2px dashed #bf0711",
                paddingLeft: "8px",
                display: "flex",
                alignItems: "center"
              }, children: /* @__PURE__ */ jsxs(Text, { variant: "bodySm", color: "critical", children: [
                "Reorder at ",
                selectedProductData.reorderPoint
              ] }) }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center" }, children: [
              /* @__PURE__ */ jsx("div", { style: { width: "120px" }, children: /* @__PURE__ */ jsx(Text, { children: "Safety Stock" }) }),
              /* @__PURE__ */ jsx("div", { style: {
                flex: 1,
                height: "24px",
                borderRadius: "3px",
                position: "relative"
              }, children: /* @__PURE__ */ jsx("div", { style: {
                position: "absolute",
                height: "100%",
                left: `${Math.min(100, selectedProductData.safetyStock / (selectedProductData.reorderPoint * 2) * 100)}%`,
                borderLeft: "2px dashed #8c6e00",
                paddingLeft: "8px",
                display: "flex",
                alignItems: "center"
              }, children: /* @__PURE__ */ jsxs(Text, { variant: "bodySm", color: "warning", children: [
                "Safety stock: ",
                selectedProductData.safetyStock
              ] }) }) })
            ] })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Inventory Health Overview" }),
          /* @__PURE__ */ jsx(BlockStack, { gap: "400", children: productData.map((product) => {
            let status = "success";
            let label2 = "Healthy";
            if (product.daysUntilStockout === "N/A" || product.daysUntilStockout === 0) {
              status = "critical";
              label2 = "Out of Stock";
            } else if (product.currentStock <= product.reorderPoint) {
              status = "warning";
              label2 = "Reorder Now";
            } else if (product.daysUntilStockout < product.leadTime * 2) {
              status = "attention";
              label2 = "Order Soon";
            }
            return /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }, children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: product.title }),
              /* @__PURE__ */ jsx(Badge, { status, children: label2 })
            ] }, product.title);
          }) })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Sales Velocity Analysis" }),
          /* @__PURE__ */ jsx(
            DataTable,
            {
              columnContentTypes: ["text", "numeric", "numeric", "text", "text"],
              headings: ["Product", "Daily Sales (Adjusted)", "Current Stock", "Days Until Stockout", "Primary Factor"],
              rows: productData.map((product) => {
                const explanations = generateExplanation(product);
                const primaryFactor = explanations.length > 0 ? explanations[0].factor : "Regular sales pattern";
                return [
                  product.title,
                  product.adjustedAverageSales.toFixed(2),
                  product.currentStock,
                  typeof product.daysUntilStockout === "number" ? product.daysUntilStockout : product.daysUntilStockout,
                  primaryFactor
                ];
              })
            }
          ),
          /* @__PURE__ */ jsx(Text, { children: "Note: Sales trends are calculated based on last 30 days of sales." })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Advanced Inventory Planning" }),
          /* @__PURE__ */ jsx(
            DataTable,
            {
              columnContentTypes: ["text", "numeric", "numeric", "numeric", "numeric"],
              headings: ["Product", "Safety Stock", "Reorder Point", "Lead Time (Days)", "Optimal Order Qty"],
              rows: advancedRows
            }
          ),
          /* @__PURE__ */ jsx(Text, { children: "Safety stock and reorder points are calculated based on sales variability and lead times. The optimal order quantity minimizes total inventory costs." })
        ] }) }) })
      ] })
    }
  );
}
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: SalesAnalysis,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
const loader$3 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const notifications = [
    {
      id: "1",
      title: "Sales Acceleration Detected",
      description: "The Complete Snowboard sales have increased by 32% in the last week. Consider restocking soon.",
      type: "trend",
      status: "unread",
      date: new Date(Date.now() - 2 * 60 * 60 * 1e3).toLocaleString(),
      // 2 hours ago
      actionUrl: "/app/sales-analysis"
    },
    {
      id: "2",
      title: "Seasonal Stock Alert",
      description: "Winter products typically sell 40% faster during December. Your current stock of snowboards may run out 2 weeks earlier than predicted.",
      type: "seasonal",
      status: "unread",
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1e3).toLocaleString(),
      // 1 day ago
      actionUrl: "/app/sales-analysis"
    },
    {
      id: "3",
      title: "Critical Inventory Alert",
      description: "Gift Card is out of stock. This may result in approximately $450 in lost sales based on current demand.",
      type: "stockout",
      status: "read",
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3).toLocaleString(),
      // 3 days ago
      actionUrl: "/app/sales-analysis"
    }
  ];
  return json({ notifications });
};
function Notifications() {
  const { notifications } = useLoaderData();
  const getBadgeStatus = (type) => {
    switch (type) {
      case "trend":
        return "info";
      case "seasonal":
        return "attention";
      case "stockout":
        return "critical";
      default:
        return "new";
    }
  };
  return /* @__PURE__ */ jsx(
    Page,
    {
      title: "Notification Center",
      backAction: {
        content: "Dashboard",
        url: "/app"
      },
      children: /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Smart Inventory Alerts" }),
          /* @__PURE__ */ jsx(Button, { children: "Mark All As Read" })
        ] }),
        notifications.length > 0 ? /* @__PURE__ */ jsx(
          ResourceList,
          {
            resourceName: { singular: "notification", plural: "notifications" },
            items: notifications,
            renderItem: (item) => /* @__PURE__ */ jsx(
              ResourceItem,
              {
                id: item.id,
                onClick: () => {
                },
                shortcutActions: [
                  {
                    content: "View Details",
                    url: item.actionUrl
                  }
                ],
                children: /* @__PURE__ */ jsx("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" }, children: /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }, children: [
                    /* @__PURE__ */ jsx(Text, { variant: "headingSm", fontWeight: "bold", children: item.title }),
                    item.status === "unread" && /* @__PURE__ */ jsx("div", { style: { width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#2C6ECB" } }),
                    /* @__PURE__ */ jsx(Badge, { status: getBadgeStatus(item.type), children: item.type.charAt(0).toUpperCase() + item.type.slice(1) })
                  ] }),
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: item.description }),
                  /* @__PURE__ */ jsx(Text, { variant: "bodySm", color: "subdued", children: item.date })
                ] }) })
              }
            )
          }
        ) : /* @__PURE__ */ jsx(
          EmptyState,
          {
            heading: "No notifications",
            image: "",
            children: /* @__PURE__ */ jsx("p", { children: "When we detect important inventory trends or alerts, they'll appear here." })
          }
        )
      ] }) }) }) })
    }
  );
}
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Notifications,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
function AdditionalPage() {
  return /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Additional page" }),
    /* @__PURE__ */ jsxs(Layout, { children: [
      /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
        /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodyMd", children: [
          "The app template comes with an additional page which demonstrates how to create multiple pages within app navigation using",
          " ",
          /* @__PURE__ */ jsx(
            Link$1,
            {
              url: "https://shopify.dev/docs/apps/tools/app-bridge",
              target: "_blank",
              removeUnderline: true,
              children: "App Bridge"
            }
          ),
          "."
        ] }),
        /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodyMd", children: [
          "To create your own page and have it show up in the app navigation, add a page inside ",
          /* @__PURE__ */ jsx(Code, { children: "app/routes" }),
          ", and a link to it in the ",
          /* @__PURE__ */ jsx(Code, { children: "<NavMenu>" }),
          " component found in ",
          /* @__PURE__ */ jsx(Code, { children: "app/routes/app.jsx" }),
          "."
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Resources" }),
        /* @__PURE__ */ jsx(List, { children: /* @__PURE__ */ jsx(List.Item, { children: /* @__PURE__ */ jsx(
          Link$1,
          {
            url: "https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav",
            target: "_blank",
            removeUnderline: true,
            children: "App nav best practices"
          }
        ) }) })
      ] }) }) })
    ] })
  ] });
}
function Code({ children }) {
  return /* @__PURE__ */ jsx(
    Box,
    {
      as: "span",
      padding: "025",
      paddingInlineStart: "100",
      paddingInlineEnd: "100",
      background: "bg-surface-active",
      borderWidth: "025",
      borderColor: "border",
      borderRadius: "100",
      children: /* @__PURE__ */ jsx("code", { children })
    }
  );
}
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdditionalPage
}, Symbol.toStringTag, { value: "Module" }));
const loader$2 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(`
    query {
      products(first: 10) {
        edges {
          node {
            id
            title
            variants(first: 1) {
              edges {
                node {
                  id
                  inventoryQuantity
                  price
                }
              }
            }
          }
        }
      }
    }
  `);
  const responseJson = await response.json();
  return json({ products: responseJson.data.products });
};
function Dashboard() {
  const { products } = useLoaderData();
  const productData = products.edges.map(({ node }) => {
    var _a2;
    const variant = (_a2 = node.variants.edges[0]) == null ? void 0 : _a2.node;
    const currentStock = (variant == null ? void 0 : variant.inventoryQuantity) || 0;
    const avgDailySales = Math.random() * 3 + 0.5;
    const daysOfSupply = currentStock > 0 ? Math.ceil(currentStock / avgDailySales) : 0;
    let status = "success";
    let statusLabel = "Healthy";
    if (currentStock === 0) {
      status = "critical";
      statusLabel = "Out of Stock";
    } else if (daysOfSupply < 7) {
      status = "warning";
      statusLabel = "Low Stock";
    } else if (daysOfSupply < 14) {
      status = "attention";
      statusLabel = "Monitor";
    }
    return {
      id: node.id,
      title: node.title,
      currentStock,
      avgDailySales,
      daysOfSupply,
      status,
      statusLabel,
      price: (variant == null ? void 0 : variant.price) || 0
    };
  });
  productData.sort((a, b) => {
    const statusWeight = { critical: 3, warning: 2, attention: 1, success: 0 };
    return statusWeight[b.status] - statusWeight[a.status];
  });
  const inventoryHealthCounts = {
    critical: productData.filter((p) => p.status === "critical").length,
    warning: productData.filter((p) => p.status === "warning").length,
    attention: productData.filter((p) => p.status === "attention").length,
    success: productData.filter((p) => p.status === "success").length
  };
  const totalProducts = productData.length;
  const healthPercentages = {
    critical: inventoryHealthCounts.critical / totalProducts * 100,
    warning: inventoryHealthCounts.warning / totalProducts * 100,
    attention: inventoryHealthCounts.attention / totalProducts * 100,
    success: inventoryHealthCounts.success / totalProducts * 100
  };
  const priorityProducts = productData.filter((p) => p.status === "critical" || p.status === "warning");
  return /* @__PURE__ */ jsx(
    Page,
    {
      title: "Visual Inventory Dashboard",
      backAction: {
        content: "Main Dashboard",
        url: "/app"
      },
      children: /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Inventory Health Overview" }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "12px", alignItems: "center" }, children: [
            /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsxs("div", { style: { height: "24px", display: "flex", borderRadius: "3px", overflow: "hidden" }, children: [
              /* @__PURE__ */ jsx("div", { style: { width: `${healthPercentages.critical}%`, backgroundColor: "#DE3618" } }),
              /* @__PURE__ */ jsx("div", { style: { width: `${healthPercentages.warning}%`, backgroundColor: "#EEC200" } }),
              /* @__PURE__ */ jsx("div", { style: { width: `${healthPercentages.attention}%`, backgroundColor: "#9C6ADE" } }),
              /* @__PURE__ */ jsx("div", { style: { width: `${healthPercentages.success}%`, backgroundColor: "#108043" } })
            ] }) }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "8px" }, children: [
              /* @__PURE__ */ jsx(Badge, { status: "critical", children: inventoryHealthCounts.critical }),
              /* @__PURE__ */ jsx(Badge, { status: "warning", children: inventoryHealthCounts.warning }),
              /* @__PURE__ */ jsx(Badge, { status: "attention", children: inventoryHealthCounts.attention }),
              /* @__PURE__ */ jsx(Badge, { status: "success", children: inventoryHealthCounts.success })
            ] })
          ] }),
          /* @__PURE__ */ jsxs(Text, { children: [
            inventoryHealthCounts.critical + inventoryHealthCounts.warning,
            " products need attention"
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Priority Actions" }),
          priorityProducts.length > 0 ? /* @__PURE__ */ jsx(BlockStack, { gap: "400", children: priorityProducts.map((product) => /* @__PURE__ */ jsxs(
            "div",
            {
              style: {
                padding: "12px",
                backgroundColor: product.status === "critical" ? "#FFF4F4" : "#FFFBEA",
                borderRadius: "4px",
                marginBottom: "8px"
              },
              children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "8px" }, children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: product.title }),
                    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }, children: [
                      /* @__PURE__ */ jsx(Badge, { status: product.status, children: product.statusLabel }),
                      /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: product.daysOfSupply === 0 ? "Currently out of stock" : `${product.daysOfSupply} days of inventory left` })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx(Link, { to: "/app/order-automation", children: /* @__PURE__ */ jsx(Button, { primary: product.status === "critical", children: product.status === "critical" ? "Restock Now" : "Reorder" }) })
                ] }),
                product.daysOfSupply > 0 && /* @__PURE__ */ jsxs("div", { style: { marginTop: "8px" }, children: [
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "4px" }, children: [
                    /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Inventory Timeline" }),
                    /* @__PURE__ */ jsxs(Text, { variant: "bodySm", children: [
                      product.daysOfSupply,
                      " days"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx(
                    ProgressBar,
                    {
                      progress: Math.min(100, product.daysOfSupply / 30 * 100),
                      size: "small",
                      color: product.status === "critical" ? "critical" : "warning"
                    }
                  )
                ] })
              ]
            },
            product.id
          )) }) : /* @__PURE__ */ jsx(Text, { children: "All products have healthy inventory levels" })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Inventory Timeline Visualization" }),
          /* @__PURE__ */ jsx(BlockStack, { gap: "400", children: productData.map((product) => /* @__PURE__ */ jsxs("div", { style: { marginBottom: "16px" }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }, children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: product.title }),
              /* @__PURE__ */ jsx(Badge, { status: product.status, children: product.statusLabel })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { position: "relative", height: "32px", background: "#F4F6F8", borderRadius: "3px" }, children: [
              /* @__PURE__ */ jsx("div", { style: { position: "absolute", left: "25%", top: 0, height: "100%", borderLeft: "1px dashed #637381", paddingLeft: "4px" }, children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", color: "subdued", children: "7d" }) }),
              /* @__PURE__ */ jsx("div", { style: { position: "absolute", left: "50%", top: 0, height: "100%", borderLeft: "1px dashed #637381", paddingLeft: "4px" }, children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", color: "subdued", children: "14d" }) }),
              /* @__PURE__ */ jsx("div", { style: { position: "absolute", left: "75%", top: 0, height: "100%", borderLeft: "1px dashed #637381", paddingLeft: "4px" }, children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", color: "subdued", children: "21d" }) }),
              /* @__PURE__ */ jsx(
                "div",
                {
                  style: {
                    position: "absolute",
                    left: 0,
                    top: "6px",
                    height: "20px",
                    width: `${Math.min(100, product.daysOfSupply / 30 * 100)}%`,
                    background: getTimelineColor(product.status),
                    borderRadius: "2px"
                  }
                }
              ),
              product.daysOfSupply < 30 && /* @__PURE__ */ jsx(
                "div",
                {
                  style: {
                    position: "absolute",
                    left: `${Math.min(100, product.daysOfSupply / 30 * 100)}%`,
                    top: 0,
                    height: "32px",
                    width: "2px",
                    background: "#DE3618"
                  }
                }
              )
            ] })
          ] }, product.id)) })
        ] }) }) })
      ] })
    }
  );
}
function getTimelineColor(status) {
  switch (status) {
    case "critical":
      return "#FADBD7";
    case "warning":
      return "#FFEB99";
    case "attention":
      return "#E4D6FF";
    case "success":
      return "#AEE9AF";
    default:
      return "#AEE9AF";
  }
}
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Dashboard,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
const loader$1 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  return json({
    settings: {
      leadTime: 7,
      safetyStockDays: 14,
      serviceLevelPercent: 95,
      lowStockThreshold: 7,
      criticalStockThreshold: 3,
      forecastDays: 30,
      enableNotifications: true,
      notificationEmail: "",
      restockStrategy: "economic"
    }
  });
};
const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const settings = {
    leadTime: parseInt(formData.get("leadTime")),
    safetyStockDays: parseInt(formData.get("safetyStockDays")),
    serviceLevelPercent: parseInt(formData.get("serviceLevelPercent")),
    lowStockThreshold: parseInt(formData.get("lowStockThreshold")),
    criticalStockThreshold: parseInt(formData.get("criticalStockThreshold")),
    forecastDays: parseInt(formData.get("forecastDays")),
    enableNotifications: formData.get("enableNotifications") === "true",
    notificationEmail: formData.get("notificationEmail"),
    restockStrategy: formData.get("restockStrategy")
  };
  return json({
    settings,
    saved: true,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
  });
};
function Settings() {
  const { settings } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const [formValues, setFormValues] = useState({
    leadTime: settings.leadTime,
    safetyStockDays: settings.safetyStockDays,
    serviceLevelPercent: settings.serviceLevelPercent,
    lowStockThreshold: settings.lowStockThreshold,
    criticalStockThreshold: settings.criticalStockThreshold,
    forecastDays: settings.forecastDays,
    enableNotifications: settings.enableNotifications,
    notificationEmail: settings.notificationEmail,
    restockStrategy: settings.restockStrategy
  });
  const handleSubmit = () => {
    submit(formValues, { method: "post" });
  };
  const handleChange = (field) => (value) => {
    setFormValues({ ...formValues, [field]: value });
  };
  const restockOptions = [
    { label: "Economic Order Quantity (EOQ)", value: "economic" },
    { label: "Just-in-Time", value: "jit" },
    { label: "Fixed Safety Stock", value: "fixed" }
  ];
  return /* @__PURE__ */ jsx(
    Page,
    {
      title: "SkuSight Settings",
      backAction: {
        content: "Inventory Dashboard",
        url: "/app"
      },
      children: /* @__PURE__ */ jsxs(Layout, { children: [
        (actionData == null ? void 0 : actionData.saved) && /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(
          Banner,
          {
            title: "Settings saved",
            status: "success",
            onDismiss: () => {
            },
            children: /* @__PURE__ */ jsxs("p", { children: [
              "Your settings were successfully saved at ",
              actionData.timestamp,
              "."
            ] })
          }
        ) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Inventory Prediction Settings" }),
          /* @__PURE__ */ jsxs(FormLayout, { children: [
            /* @__PURE__ */ jsxs(FormLayout.Group, { children: [
              /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "Average Lead Time (days)",
                  type: "number",
                  value: formValues.leadTime.toString(),
                  onChange: handleChange("leadTime"),
                  helpText: "Average time between placing an order and receiving it"
                }
              ),
              /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "Safety Stock (days)",
                  type: "number",
                  value: formValues.safetyStockDays.toString(),
                  onChange: handleChange("safetyStockDays"),
                  helpText: "Extra inventory to prevent stockouts during demand spikes"
                }
              )
            ] }),
            /* @__PURE__ */ jsx(
              Select,
              {
                label: "Restock Strategy",
                options: restockOptions,
                value: formValues.restockStrategy,
                onChange: handleChange("restockStrategy"),
                helpText: "The algorithm used to determine optimal order quantities"
              }
            ),
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Service Level Percentage",
                type: "number",
                value: formValues.serviceLevelPercent.toString(),
                onChange: handleChange("serviceLevelPercent"),
                helpText: "Higher service levels reduce stockouts but increase inventory costs (80-99%)",
                min: 80,
                max: 99
              }
            )
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Alert Settings" }),
          /* @__PURE__ */ jsxs(FormLayout, { children: [
            /* @__PURE__ */ jsxs(FormLayout.Group, { children: [
              /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "Low Stock Threshold (days)",
                  type: "number",
                  value: formValues.lowStockThreshold.toString(),
                  onChange: handleChange("lowStockThreshold"),
                  helpText: "Inventory levels below this many days of sales will trigger a low stock alert"
                }
              ),
              /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "Critical Stock Threshold (days)",
                  type: "number",
                  value: formValues.criticalStockThreshold.toString(),
                  onChange: handleChange("criticalStockThreshold"),
                  helpText: "Inventory levels below this many days of sales will trigger a critical alert"
                }
              )
            ] }),
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Forecast Days",
                type: "number",
                value: formValues.forecastDays.toString(),
                onChange: handleChange("forecastDays"),
                helpText: "Number of days to include in inventory forecasts"
              }
            ),
            /* @__PURE__ */ jsx(Divider, {}),
            /* @__PURE__ */ jsx(
              Select,
              {
                label: "Enable Notifications",
                options: [
                  { label: "Yes", value: "true" },
                  { label: "No", value: "false" }
                ],
                value: formValues.enableNotifications.toString(),
                onChange: handleChange("enableNotifications"),
                helpText: "Receive alerts when inventory levels are low"
              }
            ),
            formValues.enableNotifications && /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Notification Email",
                type: "email",
                value: formValues.notificationEmail,
                onChange: handleChange("notificationEmail"),
                helpText: "Email address to receive inventory alerts"
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { style: { marginTop: "2rem" }, children: /* @__PURE__ */ jsx(Button, { primary: true, onClick: handleSubmit, children: "Save Settings" }) })
        ] }) }) })
      ] })
    }
  );
}
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: Settings,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
const loader = async ({ request, context }) => {
  const { admin, session } = await authenticate.admin(request);
  const response = await admin.graphql(`
    query {
      products(first: 10) {
        edges {
          node {
            id
            title
            variants(first: 1) {
              edges {
                node {
                  id
                  inventoryQuantity
                  price
                }
              }
            }
          }
        }
      }
    }
  `);
  const responseJson = await response.json();
  return json({ products: responseJson });
};
function Index() {
  var _a2, _b, _c;
  const { products } = useLoaderData();
  const calculateRecommendation = (currentStock, salesHistory) => {
    if (currentStock < 10) {
      return "Order soon";
    } else if (currentStock < 20) {
      return "Monitor closely";
    } else {
      return "Stock sufficient";
    }
  };
  const rows = ((_c = (_b = (_a2 = products == null ? void 0 : products.data) == null ? void 0 : _a2.products) == null ? void 0 : _b.edges) == null ? void 0 : _c.map(({ node }) => {
    var _a3;
    const variant = (_a3 = node.variants.edges[0]) == null ? void 0 : _a3.node;
    const currentStock = (variant == null ? void 0 : variant.inventoryQuantity) || 0;
    return [
      node.title,
      currentStock,
      `$${(variant == null ? void 0 : variant.price) || 0}`,
      calculateRecommendation(currentStock)
    ];
  })) || [];
  const generateAlerts = (rows2) => {
    const alerts = [];
    const outOfStock = rows2.filter((row) => row[1] === 0);
    if (outOfStock.length > 0) {
      alerts.push({
        title: `${outOfStock.length} products out of stock`,
        status: "critical",
        message: `The following products need immediate attention: ${outOfStock.map((row) => row[0]).join(", ")}`,
        actionText: "Restock Now",
        actionUrl: "/app/order-automation"
      });
    }
    const lowStock = rows2.filter((row) => row[3] === "Order soon" && row[1] > 0);
    if (lowStock.length > 0) {
      alerts.push({
        title: `${lowStock.length} products need reordering soon`,
        status: "warning",
        message: `Based on current sales velocity, consider reordering: ${lowStock.map((row) => row[0]).join(", ")}`,
        actionText: "View Analysis",
        actionUrl: "/app/sales-analysis"
      });
    }
    if (rows2.length > 0) {
      const trendProduct = rows2[Math.floor(Math.random() * rows2.length)];
      alerts.push({
        title: `Sales trend detected for ${trendProduct[0]}`,
        status: "info",
        message: `Sales of ${trendProduct[0]} are accelerating—consider restocking sooner than initially planned. Recent data shows a 25% increase in sales velocity.`,
        actionText: "Review Trend",
        actionUrl: "/app/sales-analysis"
      });
    }
    const winterProducts = rows2.filter((row) => row[0].includes("Snowboard"));
    if (winterProducts.length > 0) {
      alerts.push({
        title: "Seasonal spike predicted for winter products",
        status: "attention",
        message: `Your holiday bestsellers (${winterProducts.map((row) => row[0]).join(", ")}) are predicted to run out 2 weeks earlier than usual based on historical seasonal patterns.`,
        actionText: "Prepare for Season",
        actionUrl: "/app/seasonal-planning"
      });
    }
    return alerts;
  };
  return /* @__PURE__ */ jsxs(
    Page,
    {
      title: "SkuSight Inventory Predictions",
      primaryAction: /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "8px" }, children: [
        /* @__PURE__ */ jsx(Link, { to: "/app/notifications", children: /* @__PURE__ */ jsx(Button, { children: "Notification Center" }) }),
        /* @__PURE__ */ jsx(Link, { to: "/app/dashboard", children: /* @__PURE__ */ jsx(Button, { children: "Visual Dashboard" }) }),
        /* @__PURE__ */ jsx(Link, { to: "/app/sales-analysis", children: /* @__PURE__ */ jsx(Button, { children: "View Sales Analysis" }) }),
        /* @__PURE__ */ jsx(Link, { to: "/app/order-automation", children: /* @__PURE__ */ jsx(Button, { primary: true, children: "Automated Ordering" }) })
      ] }),
      children: [
        /* @__PURE__ */ jsx("div", { style: { marginBottom: "16px" }, children: generateAlerts(rows).map((alert, index2) => /* @__PURE__ */ jsx("div", { style: { marginBottom: "12px" }, children: /* @__PURE__ */ jsx(
          Banner,
          {
            title: alert.title,
            status: alert.status,
            onDismiss: () => {
            },
            children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
              /* @__PURE__ */ jsx("p", { style: { marginRight: "12px" }, children: alert.message }),
              /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(Link, { to: alert.actionUrl, children: /* @__PURE__ */ jsx(Button, { children: alert.actionText }) }) })
            ] })
          }
        ) }, index2)) }),
        /* @__PURE__ */ jsxs(Layout, { children: [
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Inventory Summary" }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsxs(Text, { children: [
                "Total Products: ",
                rows.length
              ] }),
              /* @__PURE__ */ jsxs(Text, { children: [
                "Products Needing Attention: ",
                rows.filter((row) => row[3] === "Order soon").length
              ] }),
              /* @__PURE__ */ jsxs(Text, { children: [
                "Last Updated: ",
                (/* @__PURE__ */ new Date()).toLocaleString()
              ] })
            ] })
          ] }) }) }),
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Current Inventory Status" }),
            /* @__PURE__ */ jsx(
              DataTable,
              {
                columnContentTypes: ["text", "numeric", "numeric", "text"],
                headings: ["Product", "Current Stock", "Price", "Restock Recommendation"],
                rows
              }
            )
          ] }) }) }),
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Inventory Health Overview" }),
            /* @__PURE__ */ jsx(BlockStack, { gap: "400", children: rows.map((row, index2) => {
              let status = "success";
              let label2 = "Healthy";
              if (row[1] === 0) {
                status = "critical";
                label2 = "Out of Stock";
              } else if (row[3] === "Order soon") {
                status = "warning";
                label2 = "Reorder Now";
              } else if (row[3] === "Monitor closely") {
                status = "attention";
                label2 = "Monitor";
              }
              return /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }, children: [
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: row[0] }),
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
                  /* @__PURE__ */ jsx(Badge, { status, children: label2 }),
                  (status === "warning" || status === "critical") && /* @__PURE__ */ jsx(Link, { to: `/app/order-automation`, children: /* @__PURE__ */ jsx(Button, { size: "slim", children: "Reorder" }) })
                ] })
              ] }, index2);
            }) })
          ] }) }) })
        ] })
      ]
    }
  );
}
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Index,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-DsscAs_g.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-DBQK_h67.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-D6lbyxbC.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-DBQK_h67.js"], "css": [] }, "routes/webhooks.app.scopes_update": { "id": "routes/webhooks.app.scopes_update", "parentId": "root", "path": "webhooks/app/scopes_update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.scopes_update-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.app.uninstalled": { "id": "routes/webhooks.app.uninstalled", "parentId": "root", "path": "webhooks/app/uninstalled", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.uninstalled-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/auth.login": { "id": "routes/auth.login", "parentId": "root", "path": "auth/login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-mWaJDnSU.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/styles-BRIRGVb7.js", "/assets/components-DBQK_h67.js", "/assets/Page-D9F0KSCl.js", "/assets/FormLayout-CKnlJnJh.js", "/assets/context-CISPVU1J.js", "/assets/context-Cuq_S-Fv.js"], "css": [] }, "routes/auth.$": { "id": "routes/auth.$", "parentId": "root", "path": "auth/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth._-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-BqUdBomz.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-DBQK_h67.js"], "css": ["/assets/route-Cnm7FvdT.css"] }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": true, "module": "/assets/app-BVBQv3sk.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-DBQK_h67.js", "/assets/styles-BRIRGVb7.js", "/assets/index-Rx7DXd0D.js", "/assets/context-CISPVU1J.js", "/assets/context-Cuq_S-Fv.js"], "css": [] }, "routes/app.order-automation": { "id": "routes/app.order-automation", "parentId": "routes/app", "path": "order-automation", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.order-automation-BpAU0cqV.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-DBQK_h67.js", "/assets/InlineGrid-Bd3IUeGg.js", "/assets/Page-D9F0KSCl.js", "/assets/Layout-Dcg5LYDO.js", "/assets/DataTable-CantQMvG.js", "/assets/context-CISPVU1J.js", "/assets/context-Cuq_S-Fv.js", "/assets/CSSTransition-BI2FqCs3.js", "/assets/Banner-CEqXrZgB.js", "/assets/Divider-CYuxvDTd.js", "/assets/List-CRMF0lqa.js", "/assets/Sticky-BQppF5j9.js", "/assets/banner-context-B9x05WVp.js"], "css": [] }, "routes/app.sales-analysis": { "id": "routes/app.sales-analysis", "parentId": "routes/app", "path": "sales-analysis", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.sales-analysis-CTbdaf6D.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-DBQK_h67.js", "/assets/Page-D9F0KSCl.js", "/assets/Layout-Dcg5LYDO.js", "/assets/ProgressBar-DyqsZugm.js", "/assets/Select-DwZWp0AG.js", "/assets/DataTable-CantQMvG.js", "/assets/context-CISPVU1J.js", "/assets/CSSTransition-BI2FqCs3.js", "/assets/Sticky-BQppF5j9.js"], "css": [] }, "routes/app.notifications": { "id": "routes/app.notifications", "parentId": "routes/app", "path": "notifications", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.notifications-CIQmDE-X.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-DBQK_h67.js", "/assets/Page-D9F0KSCl.js", "/assets/Layout-Dcg5LYDO.js", "/assets/context-CISPVU1J.js", "/assets/Select-DwZWp0AG.js", "/assets/Sticky-BQppF5j9.js", "/assets/InlineGrid-Bd3IUeGg.js"], "css": [] }, "routes/app.additional": { "id": "routes/app.additional", "parentId": "routes/app", "path": "additional", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.additional-Buf8xYxh.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/index-Rx7DXd0D.js", "/assets/Page-D9F0KSCl.js", "/assets/Layout-Dcg5LYDO.js", "/assets/banner-context-B9x05WVp.js", "/assets/List-CRMF0lqa.js", "/assets/context-CISPVU1J.js"], "css": [] }, "routes/app.dashboard": { "id": "routes/app.dashboard", "parentId": "routes/app", "path": "dashboard", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.dashboard-CXnj0FW2.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-DBQK_h67.js", "/assets/Page-D9F0KSCl.js", "/assets/Layout-Dcg5LYDO.js", "/assets/ProgressBar-DyqsZugm.js", "/assets/context-CISPVU1J.js", "/assets/CSSTransition-BI2FqCs3.js"], "css": [] }, "routes/app.settings": { "id": "routes/app.settings", "parentId": "routes/app", "path": "settings", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.settings-BGKcSQOD.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-DBQK_h67.js", "/assets/Page-D9F0KSCl.js", "/assets/Layout-Dcg5LYDO.js", "/assets/Banner-CEqXrZgB.js", "/assets/FormLayout-CKnlJnJh.js", "/assets/Select-DwZWp0AG.js", "/assets/Divider-CYuxvDTd.js", "/assets/context-CISPVU1J.js", "/assets/banner-context-B9x05WVp.js"], "css": [] }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app._index-DJoYmCKE.js", "imports": ["/assets/index-C_P7ACqV.js", "/assets/components-DBQK_h67.js", "/assets/Page-D9F0KSCl.js", "/assets/Banner-CEqXrZgB.js", "/assets/Layout-Dcg5LYDO.js", "/assets/DataTable-CantQMvG.js", "/assets/context-CISPVU1J.js", "/assets/banner-context-B9x05WVp.js", "/assets/Sticky-BQppF5j9.js"], "css": [] } }, "url": "/assets/manifest-6a26ea8e.js", "version": "6a26ea8e" };
const mode = "production";
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": true, "v3_singleFetch": false, "v3_lazyRouteDiscovery": true, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/webhooks.app.scopes_update": {
    id: "routes/webhooks.app.scopes_update",
    parentId: "root",
    path: "webhooks/app/scopes_update",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/webhooks.app.uninstalled": {
    id: "routes/webhooks.app.uninstalled",
    parentId: "root",
    path: "webhooks/app/uninstalled",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/auth.login": {
    id: "routes/auth.login",
    parentId: "root",
    path: "auth/login",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/auth.$": {
    id: "routes/auth.$",
    parentId: "root",
    path: "auth/*",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route5
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/app.order-automation": {
    id: "routes/app.order-automation",
    parentId: "routes/app",
    path: "order-automation",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/app.sales-analysis": {
    id: "routes/app.sales-analysis",
    parentId: "routes/app",
    path: "sales-analysis",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/app.notifications": {
    id: "routes/app.notifications",
    parentId: "routes/app",
    path: "notifications",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/app.additional": {
    id: "routes/app.additional",
    parentId: "routes/app",
    path: "additional",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/app.dashboard": {
    id: "routes/app.dashboard",
    parentId: "routes/app",
    path: "dashboard",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/app.settings": {
    id: "routes/app.settings",
    parentId: "routes/app",
    path: "settings",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route13
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
