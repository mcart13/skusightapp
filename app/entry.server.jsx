/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */

import { PassThrough } from "stream";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import * as isbot from "isbot";
import { renderToPipeableStream } from "react-dom/server";

const ABORT_DELAY = 5000;

export default function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext
) {
  // Check if this is a Shopify embedded app request
  const url = new URL(request.url);
  const isEmbedded = url.searchParams.has("embedded");

  // For embedded apps, ensure we have the right security headers
  if (isEmbedded) {
    responseHeaders.set("Content-Type", "text/html");
    responseHeaders.set("Content-Security-Policy", "frame-ancestors https://*.shopify.com https://admin.shopify.com;");
  }

  return isbot.isbot(request.headers.get("user-agent"))
    ? handleBotRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext
      )
    : handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext
      );
}

function handleBotRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext
) {
  return new Promise((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        onAllReady() {
          const body = new PassThrough();

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(createReadableStreamFromReadable(body), {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode,
            })
          );

          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          didError = true;

          console.error(error);
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

function handleBrowserRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext
) {
  return new Promise((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        onShellReady() {
          const body = new PassThrough();

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(createReadableStreamFromReadable(body), {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode,
            })
          );

          pipe(body);
        },
        onShellError(err) {
          reject(err);
        },
        onError(error) {
          didError = true;

          console.error(error);
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
