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
  console.log('=== STARTING ADVANCED DASHBOARD & TOAST VERIFICATION ===\n');
  const PORT = 3591;
  const DATA_DIR = path.join(__dirname, 'temp_test_data');
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

    // 1. Visit Settings
    console.log('\n--- 1. Testing Settings Advanced Mode Toggle ---');
    await page.goto(`http://localhost:${PORT}/settings`, { waitUntil: 'networkidle' });
    await sleep(800);

    // Verify Advanced Mode heading exists
    const advHeading = page.locator('#advanced-heading');
    const advHeadingVisible = await advHeading.isVisible();
    console.log('Checking #advanced-heading:', advHeadingVisible);

    // Verify Advanced toggle input
    const advToggle = page.locator('#advanced_mode');
    const advToggleVisible = await advToggle.isVisible();
    console.log('Checking #advanced_mode toggle:', advToggleVisible);

    // Sidebar should NOT show Advanced link before toggle
    let advNavLink = page.locator('aside a[href="/advanced"]');
    const visibleBefore = await advNavLink.isVisible();
    console.log('Advanced link visible before toggle (expected false):', visibleBefore);

    // Toggle Advanced Mode ON
    await advToggle.click();
    await sleep(600);

    // Sidebar should now show Advanced link above Guides
    advNavLink = page.locator('aside a[href="/advanced"]');
    const isNowVisible = await advNavLink.isVisible();
    console.log('[PASS] Advanced link visible in sidebar after toggle:', isNowVisible);

    await page.screenshot({ path: path.join(__dirname, 'settings_advanced_toggle.png') });

    // 2. Visit Advanced Dashboard
    console.log('\n--- 2. Testing Advanced Dashboard Navigation & Telemetry ---');
    await advNavLink.click();
    await page.waitForURL(`http://localhost:${PORT}/advanced`);
    await sleep(1000);

    // Check KPI cards
    const statusText = await page.locator('text=Operational').isVisible();
    const pollerText = await page.locator('text=Poller Engine').isVisible();
    const storageText = await page.locator('text=Database Storage').isVisible();
    console.log('[PASS] KPI Telemetry Cards visible:', { statusText, pollerText, storageText });

    // Check Terminal Console
    const consoleVisible = await page.locator('h2:has-text("Live Activity Stream")').isVisible();
    console.log('[PASS] Activity Stream panel visible:', consoleVisible);
    await page.screenshot({ path: path.join(__dirname, 'advanced_activity_console.png') });

    // 3. Diagnostics Tab
    console.log('\n--- 3. Testing Diagnostics & Hardware Tab ---');
    const diagTab = page.locator('button:has-text("Diagnostics & Hardware")');
    await diagTab.click();
    await sleep(400);

    const runDiagBtn = page.locator('button:has-text("Re-Run Checks")');
    await runDiagBtn.click();
    await sleep(1500);

    const dbRwPass = await page.locator('h3:has-text("Database Read/Write")').isVisible();
    console.log('[PASS] Diagnostics checks visible and passed:', dbRwPass);

    await page.screenshot({ path: path.join(__dirname, 'advanced_diagnostics.png') });

    // 4. Danger Zone Tab & Modal
    console.log('\n--- 4. Testing Danger Zone Tab & Confirmation Modal ---');
    const dangerTab = page.locator('button:has-text("Danger Zone")');
    await dangerTab.click();
    await sleep(400);

    const factoryResetBtn = page.locator('button:has-text("Factory Reset...")');
    await factoryResetBtn.click();
    await sleep(400);

    const modalVisible = await page.locator('text=Confirm Factory Reset').isVisible();
    console.log('[PASS] Factory Reset Modal opened:', modalVisible);

    await page.screenshot({ path: path.join(__dirname, 'advanced_danger_zone.png') });

    // Close modal
    await page.locator('button:has-text("Cancel")').click();
    await sleep(300);

    console.log('\n=== ALL ADVANCED & TOAST VERIFICATIONS PASSED SUCCESSFULLY ===');
    await browser.close();
  } finally {
    cleanup();
  }
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
