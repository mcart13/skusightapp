"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fakePromise = void 0;
exports.getHeadersObj = getHeadersObj;
exports.defaultHeadersSerializer = defaultHeadersSerializer;
exports.isArrayBufferView = isArrayBufferView;
exports.isNodeReadable = isNodeReadable;
exports.isIterable = isIterable;
exports.shouldRedirect = shouldRedirect;
function isHeadersInstance(obj) {
    return obj?.forEach != null;
}
function getHeadersObj(headers) {
    if (headers == null || !isHeadersInstance(headers)) {
        return headers;
    }
    return Object.fromEntries(headers.entries());
}
function defaultHeadersSerializer(headers, onContentLength) {
    const headerArray = [];
    headers.forEach((value, key) => {
        if (onContentLength && key === 'content-length') {
            onContentLength(value);
        }
        headerArray.push(`${key}: ${value}`);
    });
    return headerArray;
}
var promise_helpers_1 = require("@whatwg-node/promise-helpers");
Object.defineProperty(exports, "fakePromise", { enumerable: true, get: function () { return promise_helpers_1.fakePromise; } });
function isArrayBufferView(obj) {
    return obj != null && obj.buffer != null && obj.byteLength != null && obj.byteOffset != null;
}
function isNodeReadable(obj) {
    return obj != null && obj.pipe != null;
}
function isIterable(value) {
    return value?.[Symbol.iterator] != null;
}
function shouldRedirect(status) {
    return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}
