const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const htmlPath = 'file://' + path.resolve('test_h2c.html');
  await page.goto(htmlPath, { waitUntil: 'networkidle0' });

  // Wait for html2canvas to be available
  await page.waitForFunction('typeof html2canvas !== "undefined"');

  const results = await page.evaluate(async () => {
    const getDOMTextTop = (node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getBoundingClientRect().top;
    };

    const container = document.getElementById('container');
    const containerRect = container.getBoundingClientRect();

    const caseADiv = document.getElementById('case-a-div');
    const caseBSpan = document.getElementById('case-b-span');
    const labelA = document.getElementById('label-a');
    
    const domA_top = getDOMTextTop(caseADiv) - containerRect.top;
    const domB_top = caseBSpan.getBoundingClientRect().top - containerRect.top;
    const domLabelA_top = labelA.getBoundingClientRect().top - containerRect.top;

    // Render Canvas
    const canvas = await html2canvas(container, { scale: 3, logging: false });
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const findTextBoundsY = (rect) => {
      let min_y = null;
      let max_y = null;
      const startY = Math.floor(rect.top - containerRect.top);
      const endY = Math.floor(rect.bottom - containerRect.top);
      const startX = Math.floor(rect.left - containerRect.left + 5); 
      const endX = Math.floor(rect.right - containerRect.left - 5);
      
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
          // Look for any non-white pixel (text is dark, background is white)
          if (a > 0 && (r < 240 || g < 240 || b < 240)) { 
            if (min_y === null) min_y = y;
            max_y = y;
            break; 
          }
        }
      }
      return { min_y, max_y };
    };

    const canvasA = findTextBoundsY(caseADiv.getBoundingClientRect());
    const canvasB = findTextBoundsY(document.getElementById('case-b-div').getBoundingClientRect());
    const canvasLabelA = findTextBoundsY(labelA.getBoundingClientRect());

    const styleA = window.getComputedStyle(caseADiv);

    return {
      DOM: {
        A_text_top: domA_top,
        B_text_top: domB_top,
        Label_top: domLabelA_top
      },
      Canvas: {
        A_text_top: canvasA.min_y,
        B_text_top: canvasB.min_y,
        Label_top: canvasLabelA.min_y
      },
      ComputedA: {
        lineHeight: styleA.lineHeight,
        paddingBottom: styleA.paddingBottom,
        borderBottomWidth: styleA.borderBottomWidth,
        font: styleA.font
      }
    };
  });

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
