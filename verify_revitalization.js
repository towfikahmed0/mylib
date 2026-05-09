const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Serve the file
  const filePath = 'file://' + path.resolve('index.html');
  await page.goto(filePath);

  // Wait for content
  await page.waitForSelector('main h1');

  // 1. Hero Check (wait for reveal)
  await page.waitForSelector('main.visible', { timeout: 5000 });
  await page.screenshot({ path: '/home/jules/verification/final_hero.png' });
  console.log('Hero screenshot saved');

  // 2. Scroll and check progress bar + features reveal
  await page.evaluate(() => window.scrollTo(0, 1000));
  await page.waitForTimeout(1000);
  await page.waitForSelector('section.visible', { timeout: 5000 });

  const scrollVar = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--scroll'));
  console.log('Scroll Progress Variable:', scrollVar);

  await page.screenshot({ path: '/home/jules/verification/final_scrolled_features.png' });
  console.log('Scrolled features screenshot saved');

  // 3. Footer Check
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  await page.waitForSelector('footer.visible', { timeout: 5000 });
  await page.screenshot({ path: '/home/jules/verification/final_footer.png' });
  console.log('Footer screenshot saved');

  await browser.close();
})();
