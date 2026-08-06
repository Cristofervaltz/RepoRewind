import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));
  page.on('requestfailed', request => console.log('BROWSER_REQUEST_FAILED:', request.url(), request.failure().errorText));

  await page.setViewport({ width: 1280, height: 720 });
  
  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  console.log('Waiting for 3 seconds for React and ForceGraph to render...');
  await new Promise(r => setTimeout(r, 3000));
  
  await page.screenshot({ path: 'screenshot.png' });
  console.log('Screenshot saved to ui/screenshot.png');
  
  await browser.close();
})();
