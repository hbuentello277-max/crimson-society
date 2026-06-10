#!/usr/bin/env node
import puppeteer from "puppeteer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(root, "screenshots/meet-ux-audit.html");
const outDir = "/opt/cursor/artifacts/screenshots";
const ids = ["bottom-nav-badge", "navigation-header", "direction-banner", "find-group", "modal-footer"];

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 430, height: 932 });
await page.goto(`file://${fixtures}`);

for (const id of ids) {
  const element = await page.$(`#${id}`);
  if (!element) {
    throw new Error(`Missing fixture #${id}`);
  }
  await element.screenshot({ path: path.join(outDir, `${id}.png`) });
}

await browser.close();
console.log(`Saved ${ids.length} screenshots to ${outDir}`);
