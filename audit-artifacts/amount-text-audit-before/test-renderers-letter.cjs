const puppeteer = require('puppeteer');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const wait = ms => new Promise(r => setTimeout(r, ms));
const waitForServer = proc => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Vite did not become ready')), 60000);
  proc.stdout.on('data', b => {
    const t = b.toString();
    if (t.includes('Local:') || t.includes('ready in')) {
      clearTimeout(timer);
      resolve();
    }
  });
  proc.stderr.on('data', () => {});
});

async function bounds(file, scale, roiCss) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const roi = { x0: Math.floor(roiCss.x0 * scale), y0: Math.floor(roiCss.y0 * scale), x1: Math.ceil(roiCss.x1 * scale), y1: Math.ceil(roiCss.y1 * scale) };
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1, count = 0;
  for (let y = roi.y0; y < roi.y1; y++) for (let x = roi.x0; x < roi.x1; x++) {
    const i = (y * info.width + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a > 140 && r < 80 && g < 120 && b < 120) {
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); count++;
    }
  }
  return { left: +(minX / scale).toFixed(3), top: +(minY / scale).toFixed(3), right: +((maxX + 1) / scale).toFixed(3), bottom: +((maxY + 1) / scale).toFixed(3), width: +((maxX - minX + 1) / scale).toFixed(3), height: +((maxY - minY + 1) / scale).toFixed(3), count };
}

(async () => {
  const base = path.resolve(__dirname, '..', '..');
  const dir = __dirname;
  const vite = cp.spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], { cwd: base, windowsHide: true });
  try {
    await waitForServer(vite);
    await wait(800);
    const browser = await puppeteer.launch({ headless: 'new', timeout: 60000, protocolTimeout: 180000, defaultViewport: { width: 1200, height: 900, deviceScaleFactor: 1 }, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', req => /^https:\/\/.*supabase\.co\//.test(req.url()) ? req.abort() : req.continue());
    await page.goto('http://127.0.0.1:5173/#/income', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await page.waitForSelector('input[name="payerName"]', { visible: true, timeout: 25000 });
    await page.addScriptTag({ path: path.join(base, 'node_modules', 'html2canvas', 'dist', 'html2canvas.min.js') });
    await page.type('input[name="category"]', 'DONATION');
    await page.type('input[name="payerName"]', 'Audit Alignment User');
    await page.type('input[name="address"]', 'Alignment Test Address');
    await page.type('input[name="manualReceiptNo"]', 'AUD-RENDER');
    await page.type('input[name="amount"]', '25000');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#receipt-element', { visible: true, timeout: 20000 });
    await wait(500);
    const previewPath = path.join(dir, 'renderer-preview.png');
    await (await page.$('#receipt-element')).screenshot({ path: previewPath });
    const meta = await page.evaluate(() => {
      const el = document.getElementById('receipt-element');
      const amount = [...el.querySelectorAll('span')].find(s => s.textContent.trim().endsWith('/-'));
      const rupee = amount.previousElementSibling;
      const row = amount.parentElement;
      const er = el.getBoundingClientRect();
      const rr = row.getBoundingClientRect();
      const ar = amount.getBoundingClientRect();
      const ur = rupee.getBoundingClientRect();
      return {
        row: { left: rr.left - er.left, top: rr.top - er.top, right: rr.right - er.left, bottom: rr.bottom - er.top },
        union: { left: Math.min(ar.left, ur.left) - er.left, top: Math.min(ar.top, ur.top) - er.top, right: Math.max(ar.right, ur.right) - er.left, bottom: Math.max(ar.bottom, ur.bottom) - er.top },
      };
    });
    const roi = { x0: meta.union.left - 4, y0: meta.union.top - 4, x1: meta.union.right + 4, y1: meta.union.bottom + 8 };
    const outputs = await page.evaluate(async () => {
      const el = document.getElementById('receipt-element');
      const ow = el.style.width, ot = el.style.transform, op = el.style.position;
      el.style.width = '900px'; el.style.transform = 'none'; el.style.position = 'relative';
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const baseOpts = { scale: 2, useCORS: true, windowWidth: 900, scrollX: 0, scrollY: -window.scrollY, backgroundColor: '#ffffff', logging: false };
      const normal = (await window.html2canvas(el, baseOpts)).toDataURL('image/png');
      const letter = (await window.html2canvas(el, { ...baseOpts, letterRendering: true })).toDataURL('image/png');
      el.style.width = ow; el.style.transform = ot; el.style.position = op;
      return { normal, letter };
    });
    const files = {};
    for (const [k, v] of Object.entries(outputs)) {
      files[k] = path.join(dir, `renderer-${k}.png`);
      fs.writeFileSync(files[k], v.replace(/^data:image\/png;base64,/, ''), 'base64');
    }
    const preview = await bounds(previewPath, 1, roi);
    const results = { meta, roi, preview };
    for (const [k, f] of Object.entries(files)) {
      const b = await bounds(f, 2, roi);
      results[k] = { bounds: b, diff: { top: +(b.top - preview.top).toFixed(3), bottom: +(b.bottom - preview.bottom).toFixed(3), height: +(b.height - preview.height).toFixed(3) } };
    }
    fs.writeFileSync(path.join(dir, 'renderer-results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    await browser.close();
  } finally {
    vite.kill();
  }
})().then(() => process.exit(0)).catch(e => {
  console.error(e && e.stack || e);
  process.exit(1);
});
