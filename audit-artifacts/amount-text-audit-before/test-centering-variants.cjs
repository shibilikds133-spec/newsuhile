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

async function glyphBounds(imagePath, scale, roiCss) {
  const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const roi = { x0: Math.floor(roiCss.x0 * scale), y0: Math.floor(roiCss.y0 * scale), x1: Math.ceil(roiCss.x1 * scale), y1: Math.ceil(roiCss.y1 * scale) };
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1, count = 0;
  for (let y = Math.max(0, roi.y0); y < Math.min(info.height, roi.y1); y++) {
    for (let x = Math.max(0, roi.x0); x < Math.min(info.width, roi.x1); x++) {
      const i = (y * info.width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a > 140 && r < 80 && g < 120 && b < 120) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        count++;
      }
    }
  }
  return {
    left: +(minX / scale).toFixed(3),
    top: +(minY / scale).toFixed(3),
    right: +((maxX + 1) / scale).toFixed(3),
    bottom: +((maxY + 1) / scale).toFixed(3),
    width: +((maxX - minX + 1) / scale).toFixed(3),
    height: +((maxY - minY + 1) / scale).toFixed(3),
    count,
  };
}

(async () => {
  const base = path.resolve(__dirname, '..', '..');
  const outDir = __dirname;
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
    await page.type('input[name="manualReceiptNo"]', 'AUD-VARIANT');
    await page.type('input[name="amount"]', '25000');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#receipt-element', { visible: true, timeout: 20000 });
    await wait(500);

    const variants = [
      { name: 'baseline-current', css: '' },
      { name: 'value-row-leading-none', css: 'row.style.lineHeight=\"1\";' },
      { name: 'spans-leading-none', css: 'amount.style.lineHeight=\"1\"; rupee.style.lineHeight=\"1\";' },
      { name: 'row-and-spans-leading-none', css: 'row.style.lineHeight=\"1\"; amount.style.lineHeight=\"1\"; rupee.style.lineHeight=\"1\";' },
      { name: 'inline-flex-spans', css: 'amount.style.display=\"inline-flex\"; amount.style.alignItems=\"center\"; rupee.style.display=\"inline-flex\"; rupee.style.alignItems=\"center\";' },
      { name: 'grid-row', css: 'row.style.display=\"grid\"; row.style.gridAutoFlow=\"column\"; row.style.alignItems=\"center\"; row.style.justifyContent=\"center\";' },
      { name: 'table-cell-row', css: 'row.style.display=\"table-cell\"; row.style.width=\"216px\"; row.style.height=\"60px\"; row.style.verticalAlign=\"middle\"; row.style.textAlign=\"center\"; amount.style.display=\"inline\"; rupee.style.display=\"inline\";' },
      { name: 'inline-block-row', css: 'row.style.display=\"block\"; row.style.width=\"216px\"; row.style.height=\"60px\"; row.style.textAlign=\"center\"; row.style.lineHeight=\"60px\"; amount.style.display=\"inline\"; rupee.style.display=\"inline\";' },
      { name: 'absolute-center-row', css: 'row.style.position=\"relative\"; const wrap=document.createElement(\"span\"); wrap.style.cssText=\"position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);white-space:nowrap;display:inline-flex;align-items:center;gap:4px;\"; row.insertBefore(wrap, rupee); wrap.appendChild(rupee); wrap.appendChild(amount);' },
    ];
    const results = [];
    for (const v of variants) {
      await page.evaluate(css => {
        const el = document.getElementById('receipt-element');
        const amount = [...el.querySelectorAll('span')].find(s => s.textContent.trim().endsWith('/-'));
        const rupee = amount.previousElementSibling;
        const row = amount.parentElement;
        row.removeAttribute('style');
        amount.removeAttribute('style');
        rupee.removeAttribute('style');
        Function('row', 'amount', 'rupee', css)(row, amount, rupee);
      }, v.css);
      await wait(100);
      const imgData = await page.evaluate(async () => {
        const el = document.getElementById('receipt-element');
        const ow = el.style.width, ot = el.style.transform, op = el.style.position;
        el.style.width = '900px'; el.style.transform = 'none'; el.style.position = 'relative';
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const c = await window.html2canvas(el, { scale: 2, useCORS: true, windowWidth: 900, scrollX: 0, scrollY: -window.scrollY, backgroundColor: '#ffffff', logging: false });
        el.style.width = ow; el.style.transform = ot; el.style.position = op;
        return c.toDataURL('image/png');
      });
      const file = path.join(outDir, `variant-${v.name}.png`);
      fs.writeFileSync(file, imgData.replace(/^data:image\/png;base64,/, ''), 'base64');
      const dom = await page.evaluate(() => {
        const el = document.getElementById('receipt-element');
        const amount = [...el.querySelectorAll('span')].find(s => s.textContent.trim().endsWith('/-'));
        const rupee = amount.previousElementSibling;
        const row = amount.parentElement;
        const er = el.getBoundingClientRect();
        const rr = row.getBoundingClientRect();
        const ar = amount.getBoundingClientRect();
        const ur = rupee.getBoundingClientRect();
        return { row: { left: rr.left - er.left, top: rr.top - er.top, right: rr.right - er.left, bottom: rr.bottom - er.top }, union: { left: Math.min(ar.left, ur.left) - er.left, top: Math.min(ar.top, ur.top) - er.top, right: Math.max(ar.right, ur.right) - er.left, bottom: Math.max(ar.bottom, ur.bottom) - er.top } };
      });
      const roi = { x0: dom.row.left, y0: dom.row.top, x1: dom.row.right, y1: dom.row.bottom };
      const glyph = await glyphBounds(file, 2, roi);
      results.push({ name: v.name, dom, glyph, glyphTopGap: +(glyph.top - dom.row.top).toFixed(3), glyphBottomGap: +(dom.row.bottom - glyph.bottom).toFixed(3) });
    }
    fs.writeFileSync(path.join(outDir, 'variant-results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results.map(r => ({ name: r.name, topGap: r.glyphTopGap, bottomGap: r.glyphBottomGap, glyph: r.glyph })), null, 2));
    await browser.close();
  } finally {
    vite.kill();
  }
})().then(() => process.exit(0)).catch(e => {
  console.error(e && e.stack || e);
  process.exit(1);
});
