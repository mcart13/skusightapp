import { Readable } from 'node:stream';
export declare function getHeadersObj(headers: Headers): Record<string, string>;
export declare function defaultHeadersSerializer(headers: Headers, onContentLength?: (value: string) => void): string[];
export { fakePromise } from '@whatwg-node/promise-helpers';
export declare function isArrayBufferView(obj: any): obj is ArrayBufferView;
export declare function isNodeReadable(obj: any): obj is Readable;
export declare function isIterable(value: any): value is Iterable<unknown>;
export declare function shouldRedirect(status?: number): boolean;
