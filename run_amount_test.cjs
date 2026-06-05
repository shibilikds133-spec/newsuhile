const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const artifactsDir = 'C:/Users/Others/.gemini/antigravity/brain/2da1fe65-0eb3-472c-b302-dfcfc0d333db';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const htmlPath = 'file://' + path.resolve('amount_test.html');
  await page.goto(htmlPath, { waitUntil: 'networkidle0' });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction('typeof html2canvas !== "undefined"');

  // Take DOM screenshot
  const containerHandle = await page.$('#container');
  await containerHandle.screenshot({ path: path.join(artifactsDir, 'test_dom_preview.png') });

  const results = await page.evaluate(async () => {
    const measureBounds = (id, canvas, containerRect, scale) => {
      const el = document.getElementById(id);
      const rect = el.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      
      let min_y = null;
      let max_y = null;
      const startY = Math.floor((rect.top - containerRect.top) * scale);
      const endY = Math.floor((rect.bottom - containerRect.top) * scale);
      const startX = Math.floor((rect.left - containerRect.left + 5) * scale);
      const endX = Math.floor((rect.right - containerRect.left - 5) * scale);
      
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const i = (y * canvas.width + x) * 4;
          const a = data[i+3], r = data[i], g = data[i+1], b = data[i+2];
          // dark teal text rgb(19, 78, 74) -> r<50, g<100, b<100
          if (a > 100 && r < 50 && g < 100 && b < 100) { 
            if (min_y === null) min_y = y;
            max_y = y;
            break; 
          }
        }
      }
      return { 
        domTop: (rect.top - containerRect.top),
        canvasTop: min_y !== null ? min_y / scale : null
      };
    };

    const container = document.getElementById('container');
    const containerRect = container.getBoundingClientRect();

    const getCanvasData = async (options) => {
      const canvas = await html2canvas(container, options);
      return {
        dataUrl: canvas.toDataURL('image/png'),
        original: measureBounds('text-original', canvas, containerRect, options.scale || 1),
        noflex: measureBounds('text-noflex', canvas, containerRect, options.scale || 1),
        normalfont: measureBounds('text-normalfont', canvas, containerRect, options.scale || 1),
      };
    };

    const resScale1 = await getCanvasData({ scale: 1, logging: false });
    const resScale2 = await getCanvasData({ scale: 2, logging: false });
    const resScale3 = await getCanvasData({ scale: 3, logging: false });

    return { resScale1, resScale2, resScale3 };
  });

  // Save the generated images to artifacts directory
  const saveImage = (dataUrl, filename) => {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(path.join(artifactsDir, filename), base64Data, 'base64');
  };

  saveImage(results.resScale1.dataUrl, 'test_canvas_scale1.png');
  saveImage(results.resScale2.dataUrl, 'test_canvas_scale2.png');
  saveImage(results.resScale3.dataUrl, 'test_canvas_scale3.png');

  // Strip dataUrl from output for console logging
  delete results.resScale1.dataUrl;
  delete results.resScale2.dataUrl;
  delete results.resScale3.dataUrl;

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
