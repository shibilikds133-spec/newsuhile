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
    if (t.includes('Local:') || t.includes('ready in')) {
      clearTimeout(timer);
      resolve();
    }
  });
  proc.stderr.on('data', () => {});
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
  const all = [];
  try {
    await waitForServer(vite);
    await wait(800);
    const browser = await puppeteer.launch({
      headless: 'new',
      timeout: 60000,
      protocolTimeout: 180000,
      defaultViewport: { width: 1200, height: 900, deviceScaleFactor: 1 },
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', req => /^https:\/\/.*supabase\.co\//.test(req.url()) ? req.abort() : req.continue());
    await page.goto('http://127.0.0.1:5173/#/income', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await page.waitForSelector('input[name="payerName"]', { visible: true, timeout: 25000 });
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
        const label = [...el.querySelectorAll('div')].find(d => d.childNodes.length === 1 && d.textContent.trim() === 'Amount Received');
        const valueRow = label.nextElementSibling;
        const svg = valueRow.querySelector('svg');
        const text = svg.querySelector('text');
        const rupee = svg.querySelectorAll('tspan')[0];
        const number = svg.querySelectorAll('tspan')[1];
        const rect = n => {
          const r = n.getBoundingClientRect();
          const er = el.getBoundingClientRect();
          return { left: +(r.left - er.left).toFixed(3), top: +(r.top - er.top).toFixed(3), right: +(r.right - er.left).toFixed(3), bottom: +(r.bottom - er.top).toFixed(3), width: +r.width.toFixed(3), height: +r.height.toFixed(3) };
        };
        const valueRowRect = rect(valueRow);
        const svgRect = rect(svg);
        const textRect = rect(text);
        const baselineY = +(svgRect.top + Number(text.getAttribute('y'))).toFixed(3);
        const ow = el.style.width, ot = el.style.transform, op = el.style.position;
        el.style.width = '900px';
        el.style.transform = 'none';
        el.style.position = 'relative';
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
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
          fullText: text.textContent.trim(),
          previewDom: {
            textRect,
            valueRowRect,
            svgRect,
            topGapToValueRow: +(textRect.top - valueRowRect.top).toFixed(3),
            bottomGapToValueRow: +(valueRowRect.bottom - textRect.bottom).toFixed(3),
            baselineY,
            baselineFromValueRowTop: +(baselineY - valueRowRect.top).toFixed(3),
            computedAmount: {
              lineHeight: getComputedStyle(text).lineHeight,
              fontSize: number.getAttribute('font-size'),
              fontFamily: number.getAttribute('font-family'),
              fontWeight: text.getAttribute('font-weight'),
              dominantBaseline: text.getAttribute('dominant-baseline'),
            },
            computedRupee: {
              fontSize: rupee.getAttribute('font-size'),
              fontFamily: rupee.getAttribute('font-family'),
              opacity: rupee.getAttribute('opacity'),
            },
          },
          exportPng: { width: exportCanvas.width, height: exportCanvas.height, dataUrl: imgData },
          pdf: { pageWidth: exportCanvas.width / 2, pageHeight: exportCanvas.height / 2, imageX: 0, imageY: 0, imageWidth: exportCanvas.width / 2, imageHeight: exportCanvas.height / 2, bytes: pdfBytes },
        };
      }, amount);

      fs.writeFileSync(exportPath, dom.exportPng.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      fs.writeFileSync(pdfPath, Buffer.from(dom.pdf.bytes));
      delete dom.exportPng.dataUrl;
      delete dom.pdf.bytes;
      const roi = { x0: dom.previewDom.valueRowRect.left, y0: dom.previewDom.valueRowRect.top, x1: dom.previewDom.valueRowRect.right, y1: dom.previewDom.valueRowRect.bottom };
      const preview = await glyphBounds(previewPath, 1, roi);
      const png = await glyphBounds(exportPath, 2, roi);
      dom.pixelGlyphs = {
        preview: { ...preview, topGapToValueRow: +(preview.top - dom.previewDom.valueRowRect.top).toFixed(3), bottomGapToValueRow: +(dom.previewDom.valueRowRect.bottom - preview.bottom).toFixed(3) },
        png: { ...png, topGapToValueRow: +(png.top - dom.previewDom.valueRowRect.top).toFixed(3), bottomGapToValueRow: +(dom.previewDom.valueRowRect.bottom - png.bottom).toFixed(3) },
        diffCss: { top: +(png.top - preview.top).toFixed(3), bottom: +(png.bottom - preview.bottom).toFixed(3), height: +(png.height - preview.height).toFixed(3) },
      };
      dom.pdf.proof = 'PDF embeds the generated PNG as one image at x=0,y=0,width=canvas.width/2,height=canvas.height/2; no PDF text renderer or baseline is used.';
      dom.artifacts = { previewPath, exportPath, pdfPath };
      all.push(dom);
    }
    fs.writeFileSync(path.join(outDir, 'amount-text-measurements-after.json'), JSON.stringify(all, null, 2));
    console.log(JSON.stringify(all.map(r => ({ amount: r.amount, text: r.fullText, dom: { top: r.previewDom.textRect.top, bottom: r.previewDom.textRect.bottom, height: r.previewDom.textRect.height, topGap: r.previewDom.topGapToValueRow, bottomGap: r.previewDom.bottomGapToValueRow, baseline: r.previewDom.baselineFromValueRowTop, fontSize: r.previewDom.computedAmount.fontSize, fontFamily: r.previewDom.computedAmount.fontFamily }, pngGlyphDiff: r.pixelGlyphs.diffCss, pngGaps: { top: r.pixelGlyphs.png.topGapToValueRow, bottom: r.pixelGlyphs.png.bottomGapToValueRow }, pdf: { imageWidth: r.pdf.imageWidth, imageHeight: r.pdf.imageHeight } })), null, 2));
    await browser.close();
  } finally {
    vite.kill();
  }
})().then(() => process.exit(0)).catch(e => {
  console.error('AUDIT_ERR', e && e.stack || e);
  process.exit(1);
});
