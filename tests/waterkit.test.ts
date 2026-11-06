import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { waterkitGroups } from "../src/waterkit";

const directory = resolve("public/waterkit");
const files = readdirSync(directory).filter((file) => file.endsWith(".html"));
const catalog = waterkitGroups.flatMap((group) => group.items.map((item) => `${item.file}.html`));

describe("các trang WaterKit", () => {
  it("danh mục bao phủ đúng 18 trang hiện có", () => {
    expect(files).toHaveLength(18);
    expect(new Set(catalog).size).toBe(18);
    expect([...catalog].sort()).toEqual([...files].sort());
    for (const file of catalog) expect(existsSync(resolve(directory, file)), file).toBe(true);
  });

  it.each(files)("kiểm tra ghi công và liên kết của %s", (file) => {
    const html = readFileSync(resolve(directory, file), "utf8");
    expect(html).toContain("Nội dung gốc: WaterKit © Cheng Sun / Dengdeng Technology");
    expect(html).toContain("AGPL-3.0");
    expect(html).toContain("Mã nguồn");
    const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
    for (const tag of markup.match(/<(?:link|meta)\b[^>]*>/gi) ?? []) {
      if (/\b(?:canonical|og:[\w-]+)\b/i.test(tag)) expect(tag).not.toMatch(/waterkit\.cn/i);
    }
    for (const tag of html.match(/<script\b[^>]*>/gi) ?? []) {
      const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
      if (src) expect(src).not.toMatch(/^(?:[a-z][\w+.-]*:|\/\/)/i);
    }
    for (const match of markup.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)) {
      const href = match[1].split(/[?#]/, 1)[0];
      if (/\.html$/i.test(href) && !/^(?:[a-z][\w+.-]*:|\/\/|\/)/i.test(href)) {
        expect(
          existsSync(resolve(dirname(resolve(directory, file)), decodeURIComponent(href))),
          `${file}: ${href}`,
        ).toBe(true);
      }
    }
  });
});
