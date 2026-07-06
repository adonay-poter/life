(async () => {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('file:///home/adonaymick/Documents/Life/static-landing/index.html');
  
  // Wait for the gallery items to load
  await page.waitForSelector('.gallery-item');
  
  // Click the first gallery item
  await page.click('.gallery-item');
  
  // Wait a bit for the lightbox to open
  await new Promise(r => setTimeout(r, 1000));
  
  // Check the state of the lightbox and image
  const state = await page.evaluate(() => {
    const lightbox = document.getElementById('galleryLightbox');
    const img = document.getElementById('galleryLightboxImg');
    if (!lightbox || !img) return 'Missing elements';
    
    const lightboxStyles = window.getComputedStyle(lightbox);
    const imgStyles = window.getComputedStyle(img);
    const imgRect = img.getBoundingClientRect();
    
    return {
      lightboxActive: lightbox.classList.contains('is-active'),
      lightboxOpacity: lightboxStyles.opacity,
      lightboxVisibility: lightboxStyles.visibility,
      imgSrc: img.src,
      imgOpacity: imgStyles.opacity,
      imgVisibility: imgStyles.visibility,
      imgWidth: imgRect.width,
      imgHeight: imgRect.height,
      imgDisplay: imgStyles.display,
      imgPosition: imgStyles.position
    };
  });
  
  console.log('Lightbox state after click:', state);
  
  await browser.close();
})();
