// Herramientas opcionales, aisladas de las dependencias del sitio:
// npm install --prefix .local/perf --no-save playwright @sparticuz/chromium
// npm run build
// node scripts/medir-scroll.mjs . nombre-de-la-muestra
// Consultar docs/rendimiento-scroll-2026-11-03.md para metodología y límites.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const tools = path.resolve(process.env.ARCONET_PERF_TOOLS || ".local/perf");
const requireTool = createRequire(path.join(tools, "package.json"));
const { chromium: playwright } = requireTool("playwright");
const chromium = requireTool("@sparticuz/chromium").default;
const root = path.resolve(process.argv[2] || ".");
const label = process.argv[3] || "muestra";
if (!/^[a-zA-Z0-9_-]+$/.test(label)) throw new Error("Nombre de muestra inválido");
if (!fs.existsSync(path.join(root, ".next/BUILD_ID"))) throw new Error("Ejecutar npm run build primero");
const output = path.resolve(".local/perf");
fs.mkdirSync(output, { recursive: true });
const server = spawn(process.execPath, [
  path.join(root, "node_modules/next/dist/bin/next"), "start", "--hostname", "0.0.0.0", "--port", "3100",
], { cwd: root, env: { ...process.env, NODE_ENV: "production" } });
let log = "", browser;
server.stdout.on("data", data => { log += data; });
server.stderr.on("data", data => { log += data; });

try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Servidor no listo: ${log}`)), 20000);
    server.stdout.on("data", () => {
      if (log.includes("Ready")) { clearTimeout(timeout); resolve(); }
    });
    server.on("error", error => { clearTimeout(timeout); reject(error); });
    server.on("exit", code => { clearTimeout(timeout); reject(new Error(`Servidor terminado: ${code}`)); });
  });
  browser = await playwright.launch({
    executablePath: await chromium.executablePath(),
    args: chromium.args.filter(arg => arg !== "--single-process"),
    headless: true,
  });
  const results = [];
  for (let repeat = 0; repeat < 3; repeat++) {
    for (const pathname of ["/", "/tienda", "/contacto", "/terminos"]) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.addInitScript(() => {
        window.__rafRequests = 0;
        const request = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = fn => { window.__rafRequests++; return request(fn); };
      });
      await page.goto(`http://localhost:3100${pathname}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(2200);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Performance.enable");
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      const idleBefore = await page.evaluate(() => window.__rafRequests);
      await page.waitForTimeout(500);
      const idleRaf = await page.evaluate(before => window.__rafRequests - before, idleBefore);
      const before = (await cdp.send("Performance.getMetrics")).metrics;
      await page.mouse.move(700, 600);
      for (let i = 0; i < 18; i++) {
        await page.mouse.wheel(0, 180);
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(1200);
      const after = (await cdp.send("Performance.getMetrics")).metrics;
      const metric = name => after.find(m => m.name === name).value - before.find(m => m.name === name).value;
      // Se comprueba la cancelación DESPUÉS de medir: un WheelEvent sintético
      // mueve Lenis, pero no el scroll nativo; introduciría otra distancia.
      const state = await page.evaluate(() => {
        const event = new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true });
        document.body.dispatchEvent(event);
        return { cancelled: event.defaultPrevented, overflow: document.documentElement.scrollWidth - innerWidth, scrollY };
      });
      const row = {
        repeat, path: pathname, idleRaf,
        taskMs: metric("TaskDuration") * 1000,
        scriptMs: metric("ScriptDuration") * 1000,
        layouts: metric("LayoutCount"), ...state,
      };
      results.push(row);
      console.log(row);
      fs.writeFileSync(path.join(output, `${label}-production.json`), JSON.stringify(results, null, 2));
      await page.close();
    }
  }
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
  fs.writeFileSync(path.join(output, `${label}-server.log`), log);
}
