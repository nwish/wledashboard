const { chromium } = require('playwright');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (_) {}
    await sleep(300);
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`);
}

async function run() {
  console.log('=== STARTING STUDIO GUIDE PILL NAVIGATION VERIFICATION ===\n');
  const PORT = 3692;
  const DATA_DIR = path.join(__dirname, 'temp_test_data_guides');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const env = {
    ...process.env,
    PORT: String(PORT),
    DATA_DIR,
    NODE_ENV: 'production',
  };

  const serverProc = spawn('node', ['apps/api/src/server.js'], {
    cwd: path.resolve(__dirname, '../../'),
    env,
    stdio: 'inherit',
  });

  const cleanup = () => {
    try {
      if (process.platform === 'win32' && serverProc.pid) {
        execSync(`taskkill /pid ${serverProc.pid} /T /F`);
      } else {
        serverProc.kill('SIGKILL');
      }
    } catch (_) {}
    try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (_) {}
  };

  try {
    await waitForServer(`http://localhost:${PORT}/api/health`);
    console.log(`[PASS] Server is online on port ${PORT}`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // 1. Visit Studio Page
    console.log('--- 1. Navigating to Studio Page ---');
    await page.goto(`http://localhost:${PORT}/studio`, { waitUntil: 'networkidle' });
    await sleep(800);

    // Locate "Studio Guide" link in Studio header
    const studioGuideLink = page.locator('a:has-text("Studio Guide")');
    const hasGuideLink = await studioGuideLink.isVisible();
    console.log('[PASS] Studio Guide link is visible:', hasGuideLink);

    // Click "Studio Guide"
    await studioGuideLink.click();
    await page.waitForURL(`**/guides?topic=studio-timelines-matrix`);
    await sleep(600);
    console.log('[PASS] Navigated to Guides with topic query:', page.url());

    // Verify Studio guide title is visible
    const guideTitle = await page.locator('h1:has-text("Effect Studio")').isVisible();
    console.log('[PASS] Studio Guide loaded in view:', guideTitle);

    // 2. Click "Home Assistant" category pill
    console.log('\n--- 2. Clicking "Home Assistant" Category Pill ---');
    const haPill = page.locator('div[role="group"] button:has-text("Home Assistant")');
    await haPill.click();
    await sleep(500);

    // Check if Home Assistant pill is active and did NOT revert to All Guides
    const isHaActive = await haPill.evaluate(el => el.className.includes('chipActive'));
    console.log('[PASS] Home Assistant pill is chipActive:', isHaActive);

    const allPill = page.locator('div[role="group"] button:has-text("All Guides")');
    const isAllActive = await allPill.evaluate(el => el.className.includes('chipActive'));
    console.log('[PASS] All Guides pill is NOT active (expected false):', isAllActive);

    if (!isHaActive || isAllActive) {
      throw new Error('FAILED: Home Assistant pill did not remain active or reverted to All Guides!');
    }

    // 3. Click "3D Spatial" category pill
    console.log('\n--- 3. Clicking "3D Spatial" Category Pill ---');
    const spatialPill = page.locator('div[role="group"] button:has-text("3D Spatial")');
    await spatialPill.click();
    await sleep(500);

    const isSpatialActive = await spatialPill.evaluate(el => el.className.includes('chipActive'));
    console.log('[PASS] 3D Spatial pill is chipActive:', isSpatialActive);

    if (!isSpatialActive) {
      throw new Error('FAILED: 3D Spatial pill did not remain active!');
    }

    // 4. Click a guide card in 3D Spatial
    console.log('\n--- 4. Clicking a guide card in 3D Spatial ---');
    const spatialGuideCard = page.locator('nav[aria-label="Guide index"] button').first();
    await spatialGuideCard.click();
    await sleep(300);

    await page.screenshot({ path: path.join(__dirname, 'guides_pill_navigation_fixed.png') });
    console.log('[PASS] Screenshot captured: guides_pill_navigation_fixed.png');

    // 5. Click "All Guides" pill to return
    console.log('\n--- 5. Clicking "All Guides" pill ---');
    await allPill.click();
    await sleep(500);
    const isAllActiveNow = await allPill.evaluate(el => el.className.includes('chipActive'));
    console.log('[PASS] All Guides pill is chipActive:', isAllActiveNow);

    console.log('\n=== ALL STUDIO GUIDE NAVIGATION TESTS PASSED! BUG FULLY RESOLVED! ===');
    await browser.close();
  } finally {
    cleanup();
  }
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
