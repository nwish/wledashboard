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
  console.log('=== CAPTURING SPECIAL THANKS PREVIEW SCREENSHOT ===\n');
  const PORT = 3888;
  const DATA_DIR = path.join(__dirname, 'temp_test_data_thanks_' + Date.now());
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
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    console.log('Navigating to Settings view...');
    await page.goto(`http://localhost:${PORT}/settings`, { waitUntil: 'networkidle' });
    await sleep(1500);

    // Locate the About / Special Thanks section
    const aboutSection = page.locator('section[aria-labelledby="about-heading"]');
    await aboutSection.waitFor({ timeout: 10000 });
    await aboutSection.scrollIntoViewIfNeeded();
    await sleep(1000);

    const outPath = path.join(__dirname, 'special_thanks_preview.png');
    await aboutSection.screenshot({ path: outPath });
    console.log(`[PASS] Saved screenshot to ${outPath}`);

    // Also copy to brain artifacts directory
    const brainDest = 'C:\\Users\\hgran\\.gemini\\antigravity-cli\\brain\\c99385ab-fa5c-48ee-adcc-892fdbec1f4a\\special_thanks_preview.png';
    fs.copyFileSync(outPath, brainDest);
    console.log(`[PASS] Copied screenshot to brain artifact at ${brainDest}`);

    await browser.close();
    console.log('\n=== PREVIEW CAPTURE COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Test error:', err);
    process.exitCode = 1;
  } finally {
    cleanup();
  }
}

run();
