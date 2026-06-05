import sharp from 'sharp';
import fs from 'fs';
import pngToIco from 'png-to-ico';

async function optimizeIcon() {
  try {
    const inputPath = 'public/image/logo.png';
    const trimmedPath = 'public/image/logo-trimmed.png';
    const icoPath = 'public/icon.ico';

    // 1. Trim transparent padding and resize to exactly 256x256
    await sharp(inputPath)
      .trim() // Removes exact transparency around the edges
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background padding if aspect ratio differs
      })
      .toFile(trimmedPath);
      
    console.log('Logo trimmed successfully!');

    // 2. Convert to ICO
    const buf = await pngToIco(trimmedPath);
    fs.writeFileSync(icoPath, buf);
    console.log('Icon resized and converted successfully!');
    
  } catch (err) {
    console.error('Error optimizing icon:', err);
  }
}

optimizeIcon();
