import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the fuel receipt studio", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Fuel Receipt Studio \| Fuel Bill Generator<\/title>/i);
  assert.match(html, /Turn fill-ups into/);
  assert.match(html, /Five layouts/);
  assert.match(html, /Build your receipt/);
  assert.match(html, /Live Preview/);
  assert.match(html, /Preview Only/);
  assert.match(html, /Template 5/);
  assert.match(html, /Download receipt PDF/);
  assert.match(html, /Print receipt/);
  assert.match(html, /Save bill/);
  assert.match(html, /Saved receipts/);
  assert.match(html, /PUBLIC REACT PROJECT/);
  assert.match(html, /Browse the JavaScript source/);
  assert.match(html, /Fuel Receipt Studio is provided for educational purposes only/);
  assert.match(html, /Do not use it to create fraudulent or misleading documents/);
  assert.match(html, /github\.com\/shantanu1258\/fuel-receipt-studio/);
  assert.match(html, /Loading browser history/);
  assert.match(html, /JSON snapshot/);
  assert.match(html, /Generated fuel receipt preview/);
  assert.match(html, /Fuel station/);
  assert.match(html, /style="margin:4px;text-align:center"/);
  assert.match(html, /Station logo/);
  assert.match(html, /Upload image/);
  assert.match(html, /Paste an image URL/);
  assert.match(html, /image\/png,image\/jpeg,image\/webp/);
  assert.match(html, /Vehicle number/);
  assert.match(html, /Show on receipt/);
  assert.match(html, /Show FCC date/);
  assert.match(html, /Show FCC time/);
  assert.match(html, /Top welcome text/);
  assert.match(html, /Bottom footer text/);
  assert.match(html, /Welcomes You/);
  assert.match(html, /FCC code [/] ID/);
  assert.match(html, /placeholder="e\.g\. 000000000"/);
  assert.match(html, /Tax Type/);
  assert.match(html, /type="radio" name="taxMode"/);
  assert.match(html, /CST TIN Number/);
  assert.match(html, /GST TIN/);
  assert.match(html, /TXN NO/);
  assert.match(html, /FCC ID<\/p><span/);
  assert.match(html, /ATTENDENT ID: Not Available/);
  assert.match(html, /FCC DATE: Not Available/);
  assert.match(html, /FCC TIME: Not Available/);
  assert.match(html, /ATOT:/);
  assert.match(html, /VTOT:/);
  assert.match(html, /placeholder="Enter ATOT value"/);
  assert.match(html, /placeholder="Enter VTOT value"/);
  assert.match(html, /Thank You! Please Visit Again\./);
  assert.doesNotMatch(html, /Watermark will be removed from actual PDF|preview-watermark/);
  assert.match(html, /data-v-6c95757e="" class="background"/);
  assert.doesNotMatch(html, /sidelogo1|sidelogo2|Bank Logo|SAVE FUEL YAANI/);
  assert.match(html, /GREENWAY FUEL STATION/);
  assert.match(html, /MAIN ROAD, BENGALURU 560001/);
  assert.match(html, /FCC ID<\/p><span[^>]*>:<\/span><p[^>]*>000000000/);
  assert.match(html, /VOLUME\(LTR\.\): <!-- -->25\.00<!-- --> lt/);
  assert.match(html, /CST No<!-- -->: <!-- -->DEMO-TAX-NUMBER/);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview|Building your site/);
});

test("removes disposable starter assets and metadata", async () => {
  const [page, layout, packageJson, nextConfig, pagesWorkflow] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
  ]);

  assert.match(page, /^"use client";/);
  assert.match(page, /function printReceipt\(\)/);
  assert.match(page, /window\.print\(\)/);
  assert.match(page, /function downloadReceiptPdf/);
  assert.match(page, /import\("html-to-image"\)/);
  assert.match(page, /import\("jspdf"\)/);
  assert.match(page, /format: \[pageWidth, pageHeight\]/);
  assert.match(page, /Download receipt PDF/);
  assert.match(page, /window\.localStorage\.setItem/);
  assert.match(page, /fuel-receipt-studio:history:v1/);
  assert.match(page, /type ReceiptDatabase/);
  assert.match(page, /function saveCurrentReceipt/);
  assert.match(page, /function cloneSavedBill/);
  assert.match(page, /Clone to editor/);
  assert.match(page, /No saved receipts yet/);
  assert.match(page, /const quantity = rate > 0 && total > 0 \? total \/ rate : 0/);
  assert.match(page, /function TemplateFiveReceipt/);
  assert.match(page, /showCustomerName/);
  assert.match(page, /showFccCode/);
  assert.match(page, /showFccDate/);
  assert.match(page, /showFccTime/);
  assert.match(page, /welcomeText/);
  assert.match(page, /footerText/);
  assert.match(page, /Welcomes You/);
  assert.match(page, /Preset Type/);
  assert.match(page, /formatShortDate/);
  assert.match(layout, /Fuel Receipt Studio \| Fuel Bill Generator/);
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(layout, /next\/headers|headers\(\)/);
  assert.match(nextConfig, /output: "export"/);
  assert.match(nextConfig, /basePath/);
  assert.match(nextConfig, /GITHUB_PAGES_CUSTOM_DOMAIN/);
  assert.match(packageJson, /build:pages/);
  assert.match(packageJson, /"name": "fuel-receipt-studio"/);
  assert.match(pagesWorkflow, /actions\/deploy-pages@v4/);
  assert.doesNotMatch(pagesWorkflow, /GITHUB_PAGES_CUSTOM_DOMAIN/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton|site-creator-vinext-starter/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/legacy-side-logo.png", import.meta.url));
  await access(new URL("../public/press-start-2p-latin.woff2", import.meta.url));
  await access(new URL("../public/vt323-latin.woff2", import.meta.url));
  await access(new URL(".openai/hosting.json", templateRoot));
});
