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
  console.log('=== STARTING UNREACHABLE CARD CONTROLS VERIFICATION ===\n');
  const PORT = 3799;
  const DATA_DIR = path.join(__dirname, 'temp_test_data_unreachable_' + Date.now());
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

    const dev1Res = await fetch(`http://localhost:${PORT}/api/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Online Office Strip',
        ip_address: '192.168.1.101',
        led_count: 144,
        led_density: 60,
      })
    });
    const dev1 = await dev1Res.json();

    const dev2Res = await fetch(`http://localhost:${PORT}/api/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unreachable Balcony',
        ip_address: '192.168.1.250',
        led_count: 300,
        led_density: 30,
      })
    });
    const dev2 = await dev2Res.json();

    const Database = require('better-sqlite3');
    const db = new Database(path.join(DATA_DIR, 'wledashboard.db'));
    db.prepare(`UPDATE devices SET is_online = 1 WHERE id = ?`).run(dev1.id);
    db.prepare(`UPDATE devices SET is_online = 0 WHERE id = ?`).run(dev2.id);
    db.close();

    console.log('[PASS] Seeded database with online and unreachable devices');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForLoadState('networkidle');
    await sleep(800);

    const offlineCard = page.locator('article', { hasText: 'Unreachable Balcony' });
    await offlineCard.waitFor({ state: 'visible', timeout: 5000 });
    console.log('[PASS] Offline card is visible');

    const unreachableBadge = offlineCard.getByText('Unreachable', { exact: true });
    const badgeVisible = await unreachableBadge.isVisible();
    if (!badgeVisible) throw new Error('Unreachable badge not found on offline card');
    console.log('[PASS] Unreachable badge is clearly rendered');

    const offlineSlider = offlineCard.locator('input[type="range"]');
    const isSliderDisabled = await offlineSlider.isDisabled();
    if (!isSliderDisabled) throw new Error('Brightness slider on unreachable card is NOT disabled!');
    console.log('[PASS] Brightness slider is properly disabled on unreachable card');

    const ledCountChip = offlineCard.locator('span:has-text("300 LEDs")');
    const countClass = await ledCountChip.getAttribute('class');
    const countAria = await ledCountChip.getAttribute('aria-disabled');
    if (!countClass.includes('chipDisabled') || countAria !== 'true') {
      throw new Error(`LED count chip missing disabled styling: class="${countClass}", aria="${countAria}"`);
    }
    await ledCountChip.click({ force: true });
    await sleep(200);
    const modalAfterCountClick = await page.locator('h4:has-text("Edit led count")').isVisible();
    if (modalAfterCountClick) throw new Error('LED count modal opened on unreachable card!');
    console.log('[PASS] LED count chip is disabled and does not open modal');

    const effectChip = offlineCard.locator('span:has-text("Solid")');
    const effectClass = await effectChip.getAttribute('class');
    if (!effectClass.includes('chipDisabled')) {
      throw new Error(`Effect chip missing disabled styling: class="${effectClass}"`);
    }
    await effectChip.click({ force: true });
    await sleep(200);
    const modalAfterEffectClick = await page.locator('h4:has-text("Edit effect")').isVisible();
    if (modalAfterEffectClick) throw new Error('Effect modal opened on unreachable card!');
    console.log('[PASS] Effect chip is disabled and does not open modal');

    const syncBtn = offlineCard.locator('button:has-text("Sync")');
    const isSyncDisabled = await syncBtn.isDisabled();
    if (!isSyncDisabled) throw new Error('Sync button on unreachable card is NOT disabled!');
    console.log('[PASS] Sync button is disabled on unreachable card');

    const weatherBtn = offlineCard.locator('button:has-text("Weather")');
    const isWeatherDisabled = await weatherBtn.isDisabled();
    if (!isWeatherDisabled) throw new Error('Weather button on unreachable card is NOT disabled!');
    console.log('[PASS] Weather button is disabled on unreachable card');

    const ipChip = offlineCard.locator('button:has-text("192.168.1.250")');
    const isIpDisabled = await ipChip.isDisabled();
    if (!isIpDisabled) throw new Error('IP chip on unreachable card is NOT disabled!');
    await ipChip.click({ force: true });
    await sleep(200);
    const popoverVisible = await page.locator('role=menu[name="Actions for 192.168.1.250"]').isVisible();
    if (popoverVisible) throw new Error('IP popover opened on unreachable card!');
    console.log('[PASS] IP chip is disabled and does not open popover menu');

    // 7. Verify online card controls remain responsive and enabled
    const onlineCard = page.locator('article', { hasText: 'Online Office Strip' });
    const onlinePowerToggle = onlineCard.locator('input[type="checkbox"]');
    const isOnlineToggleDisabled = await onlinePowerToggle.isDisabled();
    if (isOnlineToggleDisabled) throw new Error('Online card power toggle should NOT be disabled!');

    const onlineIpChip = onlineCard.locator('button:has-text("192.168.1.101")');
    const isOnlineIpDisabled = await onlineIpChip.isDisabled();
    if (isOnlineIpDisabled) throw new Error('Online card IP chip should NOT be disabled!');

    const onlineSyncBtn = onlineCard.locator('button:has-text("Sync")');
    const isOnlineSyncDisabled = await onlineSyncBtn.isDisabled();
    if (isOnlineSyncDisabled) throw new Error('Online card Sync button should NOT be disabled!');

    const onlineCountChip = onlineCard.locator('span:has-text("144 LEDs")');
    const onlineCountClass = await onlineCountChip.getAttribute('class');
    if (onlineCountClass.includes('chipDisabled') || !onlineCountClass.includes('editableChip')) {
      throw new Error(`Online card LED count chip should be editable: class="${onlineCountClass}"`);
    }
    console.log('[PASS] Online card controls and chips remain active and enabled');

    const proofPath = path.join(__dirname, 'unreachable_card_disabled_controls.png');
    await page.screenshot({ path: proofPath, fullPage: true });
    console.log(`[PASS] Saved proof screenshot to ${proofPath}`);

    await browser.close();
    console.log('\n=== ALL UNREACHABLE CARD CHECKS PASSED SUCCESSFULLY ===');
  } finally {
    cleanup();
  }
}

run().catch(err => {
  console.error('\n[FAIL] Verification script encountered an error:');
  console.error(err);
  process.exit(1);
});