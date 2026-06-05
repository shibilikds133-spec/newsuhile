const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const sharp = require('sharp');

const values = [500, 5000, 25000, 125000, 1250000];
const wait = ms => new Promise(r => setTimeout(r, ms));
const waitForServer = proc => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Vite did not become ready')), 60000);
  proc.stdout.on('data', b => {
    const t = b.toString();
    process.stdout.write(t);
    if (t.includes('Local:') || t.includes('ready in')) {
      clearTimeout(timer);
      resolve();
    }
  });
  proc.stderr.on('data', d => process.stderr.write(d.toString()));
  proc.on('exit', code => reject(new Error('Vite exited early: ' + code)));
});

async function glyphBounds(imagePath, scale, roiCss) {
  const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const roi = {
    x0: Math.floor(roiCss.x0 * scale),
    y0: Math.floor(roiCss.y0 * scale),
    x1: Math.ceil(roiCss.x1 * scale),
    y1: Math.ceil(roiCss.y1 * scale),
  };
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1, count = 0;
  for (let y = Math.max(0, roi.y0); y < Math.min(info.height, roi.y1); y++) {
    for (let x = Math.max(0, roi.x0); x < Math.min(info.width, roi.x1); x++) {
      const i = (y * info.width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      const match = a > 180 && r < 45 && g >= 60 && g <= 135 && b >= 60 && b <= 135;
      if (match) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        count++;
      }
    }
  }
  if (!count) return null;
  return {
    pixel: { left: minX, top: minY, right: maxX + 1, bottom: maxY + 1, width: maxX - minX + 1, height: maxY - minY + 1, count },
    css: {
      left: +(minX / scale).toFixed(3),
      top: +(minY / scale).toFixed(3),
      right: +((maxX + 1) / scale).toFixed(3),
      bottom: +((maxY + 1) / scale).toFixed(3),
      width: +((maxX - minX + 1) / scale).toFixed(3),
      height: +((maxY - minY + 1) / scale).toFixed(3),
      count,
    },
  };
}

(async () => {
  const base = path.resolve(__dirname, '..', '..');
  const outDir = __dirname;
  const vite = cp.spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], { cwd: base, windowsHide: true });
  const all = [];
  try {
    await waitForServer(vite);
    await wait(800);
    const browser = await puppeteer.launch({
      headless: 'new',
      timeout: 60000,
      defaultViewport: { width: 1200, height: 900, deviceScaleFactor: 1 },
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(25000);
    await page.setRequestInterception(true);
    page.on('request', req => /^https:\/\/.*supabase\.co\//.test(req.url()) ? req.abort() : req.continue());
    await page.goto('http://127.0.0.1:5173/#/income', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(e => console.log('goto ignored:', e.message));
    try {
      await page.waitForSelector('input[name="payerName"]', { visible: true, timeout: 25000 });
    } catch (e) {
      console.log('form wait failed url:', page.url());
      console.log('form wait failed title:', await page.title().catch(() => ''));
      console.log('form wait failed body:', await page.evaluate(() => document.body.innerText.slice(0, 1000)).catch(err => String(err)));
      await page.screenshot({ path: path.join(outDir, 'form-wait-failed.png'), fullPage: true }).catch(() => {});
      throw e;
    }
    await page.addScriptTag({ path: path.join(base, 'node_modules', 'html2canvas', 'dist', 'html2canvas.min.js') });
    await page.addScriptTag({ path: path.join(base, 'node_modules', 'jspdf', 'dist', 'jspdf.umd.min.js') });

    for (const amount of values) {
      await page.evaluate(() => {
        const close = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Close');
        if (close) close.click();
      });
      await wait(200);
      for (const name of ['category', 'payerName', 'address', 'manualReceiptNo', 'amount']) {
        await page.$eval(`input[name="${name}"]`, el => el.value = '');
      }
      await page.type('input[name="category"]', 'DONATION');
      await page.type('input[name="payerName"]', 'Audit Alignment User');
      await page.type('input[name="address"]', 'Alignment Test Address');
      await page.type('input[name="manualReceiptNo"]', `AUD-${amount}`);
      await page.type('input[name="amount"]', String(amount));
      await page.click('button[type="submit"]');
      await page.waitForSelector('#receipt-element', { visible: true, timeout: 20000 });
      await wait(500);

      const safe = String(amount);
      const previewPath = path.join(outDir, `preview-${safe}.png`);
      const exportPath = path.join(outDir, `png-${safe}.png`);
      const pdfPath = path.join(outDir, `pdf-${safe}.pdf`);
      await (await page.$('#receipt-element')).screenshot({ path: previewPath });

      const dom = await page.evaluate(async amount => {
        const el = document.getElementById('receipt-element');
        const amountText = [...el.querySelectorAll('span')].find(s => s.textContent.trim().endsWith('/-') && getComputedStyle(s).fontFamily.includes('monospace')) ||
          [...el.querySelectorAll('span')].find(s => s.textContent.trim().endsWith('/-'));
        const rupeeText = amountText.previousElementSibling;
        const valueRow = amountText.parentElement;
        const rect = n => {
          const r = n.getBoundingClientRect();
          const er = el.getBoundingClientRect();
          return { left: +(r.left - er.left).toFixed(3), top: +(r.top - er.top).toFixed(3), right: +(r.right - er.left).toFixed(3), bottom: +(r.bottom - er.top).toFixed(3), width: +r.width.toFixed(3), height: +r.height.toFixed(3) };
        };
        const union = (a, b) => ({ left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom), width: +(Math.max(a.right, b.right) - Math.min(a.left, b.left)).toFixed(3), height: +(Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top)).toFixed(3) });
        const baselineOf = node => {
          const m = document.createElement('span');
          m.style.cssText = 'display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline;';
          node.appendChild(m);
          const mr = rect(m);
          m.remove();
          return mr.top;
        };
        const amountRect = rect(amountText), rupeeRect = rect(rupeeText), rowRect = rect(valueRow), textUnion = union(rupeeRect, amountRect), baselineY = baselineOf(amountText);
        const cs = getComputedStyle(amountText), rs = getComputedStyle(rupeeText);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const metrics = ctx.measureText(amountText.textContent.trim());
        const ow = el.style.width, ot = el.style.transform, op = el.style.position;
        el.style.width = '900px';
        el.style.transform = 'none';
        el.style.position = 'relative';
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const amountText2 = [...el.querySelectorAll('span')].find(s => s.textContent.trim().endsWith('/-') && getComputedStyle(s).fontFamily.includes('monospace')) ||
          [...el.querySelectorAll('span')].find(s => s.textContent.trim().endsWith('/-'));
        const rupeeText2 = amountText2.previousElementSibling;
        const valueRow2 = amountText2.parentElement;
        const ar2 = rect(amountText2), rr2 = rect(rupeeText2), vr2 = rect(valueRow2), union2 = union(rr2, ar2), baselineY2 = baselineOf(amountText2);
        const exportDomBeforeCanvas = { amountRect: ar2, rupeeRect: rr2, textUnion: union2, valueRowRect: vr2, baselineY: baselineY2, topGapToValueRow: +(union2.top - vr2.top).toFixed(3), bottomGapToValueRow: +(vr2.bottom - union2.bottom).toFixed(3), baselineFromValueRowTop: +(baselineY2 - vr2.top).toFixed(3) };
        const exportCanvas = await window.html2canvas(el, { scale: 2, useCORS: true, windowWidth: 900, scrollX: 0, scrollY: -window.scrollY, backgroundColor: '#ffffff', logging: false });
        const imgData = exportCanvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [exportCanvas.width / 2, exportCanvas.height / 2] });
        pdf.addImage(imgData, 'PNG', 0, 0, exportCanvas.width / 2, exportCanvas.height / 2);
        const pdfBytes = Array.from(new Uint8Array(pdf.output('arraybuffer')));
        el.style.width = ow;
        el.style.transform = ot;
        el.style.position = op;
        return {
          amount,
          fullText: `${rupeeText.textContent.trim()}${amountText.textContent.trim()}`,
          previewDom: {
            amountRect,
            rupeeRect,
            textUnion,
            valueRowRect: rowRect,
            baselineY,
            topGapToValueRow: +(textUnion.top - rowRect.top).toFixed(3),
            bottomGapToValueRow: +(rowRect.bottom - textUnion.bottom).toFixed(3),
            baselineFromValueRowTop: +(baselineY - rowRect.top).toFixed(3),
            computedAmount: { lineHeight: cs.lineHeight, fontSize: cs.fontSize, fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, display: cs.display },
            computedRupee: { lineHeight: rs.lineHeight, fontSize: rs.fontSize, fontFamily: rs.fontFamily, fontWeight: rs.fontWeight, marginTop: rs.marginTop },
            canvasTextMetrics: { actualBoundingBoxAscent: metrics.actualBoundingBoxAscent, actualBoundingBoxDescent: metrics.actualBoundingBoxDescent, fontBoundingBoxAscent: metrics.fontBoundingBoxAscent, fontBoundingBoxDescent: metrics.fontBoundingBoxDescent, width: metrics.width },
          },
          exportDomBeforeCanvas,
          exportPng: { width: exportCanvas.width, height: exportCanvas.height, dataUrl: imgData },
          pdf: { pageWidth: exportCanvas.width / 2, pageHeight: exportCanvas.height / 2, imageX: 0, imageY: 0, imageWidth: exportCanvas.width / 2, imageHeight: exportCanvas.height / 2, bytes: pdfBytes },
        };
      }, amount);

      fs.writeFileSync(exportPath, dom.exportPng.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      fs.writeFileSync(pdfPath, Buffer.from(dom.pdf.bytes));
      delete dom.exportPng.dataUrl;
      delete dom.pdf.bytes;
      const roi = { x0: dom.previewDom.valueRowRect.left, y0: dom.previewDom.valueRowRect.top, x1: dom.previewDom.valueRowRect.right, y1: dom.previewDom.valueRowRect.bottom };
      const previewGlyph = await glyphBounds(previewPath, 1, roi);
      const pngGlyph = await glyphBounds(exportPath, 2, roi);
      const row = dom.previewDom.valueRowRect;
      const gap = g => ({ ...g, css: { ...g.css, topGapToValueRow: +(g.css.top - row.top).toFixed(3), bottomGapToValueRow: +(row.bottom - g.css.bottom).toFixed(3) } });
      const pg = gap(previewGlyph), eg = gap(pngGlyph);
      dom.pixelGlyphs = { preview: pg, png: eg, diffCss: { top: +(eg.css.top - pg.css.top).toFixed(3), bottom: +(eg.css.bottom - pg.css.bottom).toFixed(3), height: +(eg.css.height - pg.css.height).toFixed(3), topGap: +(eg.css.topGapToValueRow - pg.css.topGapToValueRow).toFixed(3), bottomGap: +(eg.css.bottomGapToValueRow - pg.css.bottomGapToValueRow).toFixed(3) } };
      dom.pdf.proof = 'PDF embeds the generated PNG as one image at x=0,y=0,width=canvas.width/2,height=canvas.height/2; no PDF text renderer or baseline is used.';
      dom.artifacts = { previewPath, exportPath, pdfPath };
      all.push(dom);
      await page.evaluate(() => {
        const close = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Close');
        if (close) close.click();
      });
      await wait(250);
    }
    fs.writeFileSync(path.join(outDir, 'amount-text-measurements.json'), JSON.stringify(all, null, 2));
    console.log(JSON.stringify(all.map(r => ({
      amount: r.amount,
      text: r.fullText,
      dom: {
        top: r.previewDom.textUnion.top,
        bottom: r.previewDom.textUnion.bottom,
        height: r.previewDom.textUnion.height,
        topGap: r.previewDom.topGapToValueRow,
        bottomGap: r.previewDom.bottomGapToValueRow,
        baseline: r.previewDom.baselineFromValueRowTop,
        lineHeight: r.previewDom.computedAmount.lineHeight,
        fontSize: r.previewDom.computedAmount.fontSize,
        fontFamily: r.previewDom.computedAmount.fontFamily,
      },
      pngGlyphDiff: r.pixelGlyphs.diffCss,
      pdf: { pageWidth: r.pdf.pageWidth, pageHeight: r.pdf.pageHeight, imageWidth: r.pdf.imageWidth, imageHeight: r.pdf.imageHeight },
    })), null, 2));
    await browser.close().catch(() => {});
  } finally {
    vite.kill();
  }
})().then(() => process.exit(0)).catch(e => {
  console.error('AUDIT_ERR', e && e.stack || e);
  process.exit(1);
});
