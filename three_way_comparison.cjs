const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const artifactsDir = 'C:/Users/Others/.gemini/antigravity/brain/2da1fe65-0eb3-472c-b302-dfcfc0d333db';

(async () => {
  console.log('Starting three-way comparison...');
  const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1200, height: 900 } });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/#/income', { waitUntil: 'networkidle0' });

  // Wait for the form to render
  await page.waitForSelector('input[name="payerName"]', { visible: true });

  // 1. Enter some data to generate a receipt preview
  await page.type('input[name="payerName"]', 'Experiment User');
  await page.type('input[name="amount"]', '25000');
  
  // Category is required
  await page.type('input[name="category"]', 'General Donation');
  
  // Submit form
  await page.click('button[type="submit"]');

  // Wait for receipt preview modal to appear
  await page.waitForSelector('#receipt-element', { visible: true });

  // Inject libraries into the page so we can run them directly on the exact DOM
  await page.addScriptTag({ url: 'https://html2canvas.hertzen.com/dist/html2canvas.min.js' });
  await page.addScriptTag({ url: 'https://unpkg.com/html-to-image@1.11.11/dist/html-to-image.js' });

  // Wait extra 500ms for fonts to settle
  await new Promise(r => setTimeout(r, 500));

  // Take Browser Preview Screenshot (Ground Truth)
  const receiptHandle = await page.$('#receipt-element');
  await receiptHandle.screenshot({ path: path.join(artifactsDir, 'compare_A_browser_preview.png') });
  
  // Run tests in the browser context
  const results = await page.evaluate(async (el) => {
    // Save original styles
    const originalWidth = el.style.width;
    const originalTransform = el.style.transform;
    const originalPosition = el.style.position;

    // Force desktop width for generation (same as pipeline)
    el.style.width = '900px';
    el.style.transform = 'none';
    el.style.position = 'relative';

    const getMemory = () => performance.memory ? performance.memory.usedJSHeapSize : 0;

    // A. html2canvas test
    const startH2C = performance.now();
    const memH2CStart = getMemory();
    const canvasH2C = await window.html2canvas(el, {
      scale: 2,
      useCORS: true,
      windowWidth: 900,
      scrollX: 0,
      scrollY: -window.scrollY,
    });
    const memH2CEnd = getMemory();
    const timeH2C = performance.now() - startH2C;
    const dataUrlH2C = canvasH2C.toDataURL('image/png');

    // B. html-to-image test
    const startHTI = performance.now();
    const memHTIStart = getMemory();
    const dataUrlHTI = await window.htmlToImage.toPng(el, {
      pixelRatio: 2,
      style: {
        width: '900px',
        transform: 'none',
        position: 'relative'
      }
    });
    const memHTIEnd = getMemory();
    const timeHTI = performance.now() - startHTI;

    // Restore
    el.style.width = originalWidth;
    el.style.transform = originalTransform;
    el.style.position = originalPosition;

    return {
      h2c: {
        timeMs: timeH2C,
        memDiffBytes: memH2CEnd - memH2CStart,
        dataUrl: dataUrlH2C,
        sizeBytes: dataUrlH2C.length
      },
      hti: {
        timeMs: timeHTI,
        memDiffBytes: memHTIEnd - memHTIStart,
        dataUrl: dataUrlHTI,
        sizeBytes: dataUrlHTI.length
      }
    };
  }, receiptHandle);

  const saveImage = (dataUrl, filename) => {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(path.join(artifactsDir, filename), base64Data, 'base64');
  };

  saveImage(results.h2c.dataUrl, 'compare_B_html2canvas.png');
  saveImage(results.hti.dataUrl, 'compare_C_htmltoimage.png');

  console.log('--- PERFORMANCE METRICS ---');
  console.log(`html2canvas  : ${results.h2c.timeMs.toFixed(2)}ms | Mem diff: ${Math.round(results.h2c.memDiffBytes/1024/1024)}MB | Size: ${Math.round(results.h2c.sizeBytes/1024)}KB`);
  console.log(`html-to-image: ${results.hti.timeMs.toFixed(2)}ms | Mem diff: ${Math.round(results.hti.memDiffBytes/1024/1024)}MB | Size: ${Math.round(results.hti.sizeBytes/1024)}KB`);
  
  await browser.close();
  console.log('Done.');
})();
