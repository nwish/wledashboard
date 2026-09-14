const { chromium } = require('C:/Users/hgran/OneDrive/Documents/code/Projects/WLEDashboard/node_modules/playwright');
const http = require('http');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(parsed, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING TEST SUITE: SPATIAL VIEW & SETTINGS AUTO-SAVE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error('FAIL: ' + message);
      failed++;
      throw new Error(message);
    } else {
      console.log('PASS: ' + message);
      passed++;
    }
  }

  // --- SECTION 1: API DIRECT VALIDATION ---
  console.log('--- 1. Testing Settings API Direct Endpoints ---');

  // Test PATCH with boolean false (the bug)
  const patchRes1 = await requestJson('http://localhost:3001/api/settings', {
    method: 'PATCH',
    body: { spatial_intro_enabled: false }
  });
  assert(patchRes1.status === 200, 'API accepts raw boolean false on PATCH /settings');

  const getRes1 = await requestJson('http://localhost:3001/api/settings');
  assert(getRes1.data.spatial_intro_enabled === 'false', 'API persists boolean false as string "false"');

  // Test PATCH with boolean true
  const patchRes2 = await requestJson('http://localhost:3001/api/settings', {
    method: 'PATCH',
    body: { spatial_intro_enabled: true }
  });
  assert(patchRes2.status === 200, 'API accepts raw boolean true on PATCH /settings');

  const getRes2 = await requestJson('http://localhost:3001/api/settings');
  assert(getRes2.data.spatial_intro_enabled === 'true', 'API persists boolean true as string "true"');

  // --- SECTION 2: BROWSER AUTOMATION (PLAYWRIGHT) ---
  console.log('\n--- 2. Testing Spatial View UI & Orbital Intro Checkbox ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Intercept toasts and errors
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('    [browser error]', msg.text());
  });

  // Navigate to Spatial View
  console.log('Navigating to http://localhost:5174/spatial...');
  await page.goto('http://localhost:5174/spatial', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Locate the Orbital Intro label and checkbox
  const introCheckbox = page.locator('label:has-text("Orbital Intro") input[type="checkbox"]');
  await introCheckbox.waitFor({ state: 'visible', timeout: 8000 });

  const initialChecked = await introCheckbox.isChecked();
  console.log('Initial Orbital Intro checked state:', initialChecked);

  // Ensure it starts checked
  if (!initialChecked) {
    await introCheckbox.click();
    await page.waitForTimeout(500);
  }

  // UNCHECK Orbital Intro
  console.log('Clicking to uncheck Orbital Intro...');
  await introCheckbox.click();

  // Verify toast message
  await page.waitForTimeout(600);
  const bodyTextUncheck = await page.innerText('body');
  assert(!bodyTextUncheck.includes('Failed to update setting'), 'No "Failed to update setting" error toast appeared');
  assert(bodyTextUncheck.includes('Orbital intro disabled'), 'Toast "Orbital intro disabled" was displayed');

  // Verify API persisted false
  const getAfterUncheck = await requestJson('http://localhost:3001/api/settings');
  assert(getAfterUncheck.data.spatial_intro_enabled === 'false', 'Database reflects spatial_intro_enabled: false after unchecking');

  // RELOAD PAGE to verify persistence in Spatial View
  console.log('Reloading Spatial View to verify state persistence...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const introCheckboxReloaded = page.locator('label:has-text("Orbital Intro") input[type="checkbox"]');
  await introCheckboxReloaded.waitFor({ state: 'visible', timeout: 8000 });
  const reloadedChecked = await introCheckboxReloaded.isChecked();
  assert(reloadedChecked === false, 'Orbital Intro checkbox remains UNCHECKED after page reload');

  // RE-CHECK Orbital Intro
  console.log('Re-checking Orbital Intro...');
  await introCheckboxReloaded.click();
  await page.waitForTimeout(600);
  const bodyTextCheck = await page.innerText('body');
  assert(!bodyTextCheck.includes('Failed to update setting'), 'No error toast on re-check');
  assert(bodyTextCheck.includes('Orbital intro enabled'), 'Toast "Orbital intro enabled" was displayed');

  const getAfterRecheck = await requestJson('http://localhost:3001/api/settings');
  assert(getAfterRecheck.data.spatial_intro_enabled === 'true', 'Database reflects spatial_intro_enabled: true after re-checking');

  // --- SECTION 3: SETTINGS AUTO-SAVE & UI VALIDATION ---
  console.log('\n--- 3. Testing Settings Page Auto-Save & Save Button Absence ---');
  await page.goto('http://localhost:5174/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Assert NO "Save Changes" button exists
  const saveBtnCount = await page.locator('button:has-text("Save Changes")').count();
  assert(saveBtnCount === 0, 'No "Save Changes" button exists in Settings header');

  // 2. Assert saveStatusBadge exists
  const statusBadge = page.locator('header [class*="saveStatusBadge"]');
  assert(await statusBadge.count() > 0, 'Auto-save status badge is present in Settings header');

  // 3. Toggle Unit System to Metric
  console.log('Testing Unit System toggle auto-save (Imperial -> Metric)...');
  const metricBtn = page.locator('button:has-text("Metric (m)")');
  await metricBtn.click();
  await page.waitForTimeout(500);

  const getMetric = await requestJson('http://localhost:3001/api/settings');
  assert(getMetric.data.unit_system === 'metric', 'Unit system auto-saved to Metric in database');

  // Toggle back to Imperial
  console.log('Testing Unit System toggle auto-save (Metric -> Imperial)...');
  const imperialBtn = page.locator('button:has-text("Imperial (ft)")');
  await imperialBtn.click();
  await page.waitForTimeout(500);

  const getImperial = await requestJson('http://localhost:3001/api/settings');
  assert(getImperial.data.unit_system === 'imperial', 'Unit system auto-saved to Imperial in database');

  // 4. Test Polling interval auto-save with debounce + blur
  console.log('Testing Polling interval debounced auto-save...');
  const pollInput = page.locator('#poll_interval_ms');
  await pollInput.fill('4500');
  await pollInput.blur();
  await page.waitForTimeout(600);

  const getPoll = await requestJson('http://localhost:3001/api/settings');
  assert(getPoll.data.poll_interval_ms === '4500', 'Device poll interval auto-saved to 4500ms');

  // Restore Polling interval to 5000
  await pollInput.fill('5000');
  await pollInput.blur();
  await page.waitForTimeout(600);

  const getPollRestore = await requestJson('http://localhost:3001/api/settings');
  assert(getPollRestore.data.poll_interval_ms === '5000', 'Device poll interval restored and auto-saved to 5000ms');

  // Take proof screenshot of Settings page
  const proofDir = 'C:/Users/hgran/OneDrive/Documents/code/Projects/WLEDashboard/project_details/proof';
  await page.screenshot({ path: `${proofDir}/settings_autosave_verified.png` });
  console.log('Screenshot saved to project_details/proof/settings_autosave_verified.png');

  await browser.close();

  console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
