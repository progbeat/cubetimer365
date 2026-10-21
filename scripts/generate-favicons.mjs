import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

// A reproducible static snapshot for browsers without dynamic SVG favicon support.
const fallbackSeed = 20261021;
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
let browser;
try {
  const { generateScramble } = await server.ssrLoadModule("/src/scramble.ts");
  const { createCalendarMark, calendarMarkSvg } = await server.ssrLoadModule(
    "/src/calendarMark.ts",
  );
  const svg = calendarMarkSvg(
    createCalendarMark(generateScramble(fallbackSeed)),
  );
  await writeFile("src/favicon.svg", `${svg}\n`);
  browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 32, height: 32 },
    deviceScaleFactor: 1,
  });
  const images = [];
  for (const size of [16, 32]) {
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    );
    const bytes = await page.screenshot({
      clip: { x: 0, y: 0, width: size, height: size },
      omitBackground: true,
    });
    images.push({ size, bytes });
    if (size === 32) await writeFile("public/favicon-32.png", bytes);
  }
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, bytes }, index) => {
    const at = 6 + index * 16;
    header[at] = size;
    header[at + 1] = size;
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(bytes.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += bytes.length;
  });
  await writeFile(
    "public/favicon.ico",
    Buffer.concat([header, ...images.map(({ bytes }) => bytes)]),
  );
  console.log(
    `Generated SVG, PNG and 16/32px ICO fallbacks from seed ${fallbackSeed}`,
  );
} finally {
  await browser?.close();
  await server.close();
}
