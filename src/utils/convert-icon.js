import fs from 'fs';
import pngToIco from 'png-to-ico';

pngToIco('public/image/logo.png')
  .then(buf => {
    fs.writeFileSync('public/icon.ico', buf);
    console.log('Icon converted successfully!');
  })
  .catch(err => {
    console.error('Error converting icon:', err);
  });
