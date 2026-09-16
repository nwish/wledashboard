const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const GITHUB_REPO = 'upioneer/WLEDashboard';
const REDDIT_THREAD_URL = 'https://www.reddit.com/r/WLED/comments/1wfcc8u/wledashboard/';
const SETTINGS_FILE_PATH = path.resolve(__dirname, '../../apps/web/src/views/Settings/Settings.jsx');

// Patterns for classifying substantive contributions
const BUG_PATTERNS = [
  /\bbug\b/i,
  /\bissue\b/i,
  /\berror\b/i,
  /\bconflict\b/i,
  /\bfailed\b/i,
  /\bfailing\b/i,
  /\bcrash(ed|es|ing)?\b/i,
  /\bbroke(n)?\b/i,
  /\bproblem\b/i,
  /\bdoesn['’]?t work\b/i,
  /\bdoesnt update\b/i,
  /\bruntime\b/i,
  /\bexception\b/i,
  /\breject(ed|s|ing)?\b/i,
];

const FEATURE_PATTERNS = [
  /\b(add|support|integrate|incorporate)\b/i,
  /\bfeature\s+request\b/i,
  /\bwould\s+(love|like)\s+to\s+see\b/i,
  /\bany\s+chance\b/i,
  /\bcan\s+(we|you)\s+(add|have|get)\b/i,
  /\bplease\s+(add|make)\b/i,
  /\bsuggestion\b/i,
  /\bpropos(e|al)\b/i,
  /\bhelper\s+script\b/i,
  /\btemplate\b/i,
  /\btoggle\b/i,
  /\bplugin\b/i,
  /\bdo\s+you\s+plan\s+to\b/i,
];

const FEEDBACK_PATTERNS = [
  /\bhow\s+(are\s+you|do\s+you)\s+(managing|do|handle)\b/i,
  /\bmdns\b/i,
  /\bmulticast\b/i,
  /\bnetwork(_mode|\s+mode)?\b/i,
  /\bport\s+\d+\b/i,
  /\b(installed|running|tested)\s+with\s+docker\b/i,
  /\b(tested|verified)\s+(it|on|with)\b/i,
  /\bwhere\s+do\s+you\s+find\s+the\b/i,
  /\bhacs\b/i,
];

const PURE_COMPLIMENT_ONLY = [
  /^(nice|awesome|cool|great|iconic|good|love\s+this|amazing|fantastic|well\s+done)\s*(website|site|project|work|software|tool|app|job)?[!\s.,:)]*$/i,
  /\b10\/10\s+marketing\b/i,
  /\bhaven['’]?t tested\b/i,
  /\blooking forward to using\b/i,
  /^(tnx|thanks|thank\s+you)[\s!,.]*$/i,
];

function classifyContribution(text) {
  if (!text || typeof text !== 'string') return null;
  const clean = text.trim();

  // Exclude comments that are strictly praise/compliments without substantive feedback
  if (PURE_COMPLIMENT_ONLY.some(rx => rx.test(clean))) {
    return null;
  }
  if (clean.length < 25 && /^(nice|awesome|cool|great|iconic|good|amazing|love)\b/i.test(clean)) {
    return null;
  }

  for (const rx of BUG_PATTERNS) {
    if (rx.test(clean)) return 'Bug Report';
  }
  for (const rx of FEATURE_PATTERNS) {
    if (rx.test(clean)) return 'Feature Request';
  }
  for (const rx of FEEDBACK_PATTERNS) {
    if (rx.test(clean)) return 'App Feedback';
  }

  return null;
}

async function scrapeGitHub() {
  console.log(`[GitHub] Fetching issues and comments for ${GITHUB_REPO}...`);
  const contributors = new Map();

  try {
    const issuesRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues?state=all&per_page=100`, {
      headers: { 'User-Agent': 'WLEDashboard-Contributor-Sync/1.0' },
    });

    if (issuesRes.ok) {
      const issues = await issuesRes.json();
      if (Array.isArray(issues)) {
        for (const issue of issues) {
          const user = issue.user?.login;
          if (!user || user.toLowerCase() === 'upioneer' || user.includes('[bot]')) continue;

          const text = `${issue.title}\n${issue.body || ''}`;
          const type = classifyContribution(text) || 'Bug Report';
          contributors.set(user.toLowerCase(), {
            name: user,
            platform: 'github',
            type,
            reason: `GitHub Issue #${issue.number}: ${issue.title}`,
          });
        }
      }
    } else {
      console.warn(`[GitHub] Issues API returned status ${issuesRes.status}`);
    }

    const commentsRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/comments?per_page=100`, {
      headers: { 'User-Agent': 'WLEDashboard-Contributor-Sync/1.0' },
    });

    if (commentsRes.ok) {
      const comments = await commentsRes.json();
      if (Array.isArray(comments)) {
        for (const comment of comments) {
          const user = comment.user?.login;
          if (!user || user.toLowerCase() === 'upioneer' || user.includes('[bot]')) continue;
          if (contributors.has(user.toLowerCase())) continue;

          const type = classifyContribution(comment.body);
          if (type) {
            contributors.set(user.toLowerCase(), {
              name: user,
              platform: 'github',
              type,
              reason: `GitHub Issue Comment: ${comment.body.slice(0, 60)}...`,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[GitHub] Error querying GitHub API:', err.message);
  }

  console.log(`[GitHub] Identified ${contributors.size} contributor(s).`);
  return Array.from(contributors.values());
}

async function scrapeReddit() {
  console.log(`[Reddit] Fetching comments from ${REDDIT_THREAD_URL}...`);
  const contributors = new Map();

  let browser = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });

    await page.goto(REDDIT_THREAD_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Scroll down to trigger lazy-loading of older / nested comments
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);

      // Check for any "View more comments" buttons
      const moreButtons = await page.$$('button:has-text("more comments"), button:has-text("View more")');
      for (const btn of moreButtons) {
        try { await btn.click({ timeout: 1000 }); await page.waitForTimeout(1000); } catch (_) {}
      }
    }

    const html = await page.content();

    // Extract comments: <shreddit-comment ...> ... </shreddit-comment>
    // Note: use \s+ after shreddit-comment so we don't accidentally match shreddit-comment-tree-ads
    const commentBlocks = [...html.matchAll(/<shreddit-comment\s+([^>]*?)>([\s\S]*?)<\/shreddit-comment>/g)];

    console.log(`[Reddit] Found ${commentBlocks.length} comment element(s).`);

    for (const match of commentBlocks) {
      const attrs = match[1];
      const inner = match[2];
      const authorMatch = attrs.match(/author="([^"]+)"/);
      const author = authorMatch ? authorMatch[1] : null;

      if (!author || author.toLowerCase() === 'upioneer' || author === '[deleted]' || author.includes('bot')) {
        continue;
      }

      // Extract text content from <div slot="comment"> or <p> tags
      let text = '';
      const slotMatch = inner.match(/<div\s+slot="comment"[^>]*>([\s\S]*?)<\/div>/);
      if (slotMatch) {
        text = slotMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      } else {
        const paragraphs = [...inner.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
        text = paragraphs.join(' ');
      }

      text = text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

      const type = classifyContribution(text);
      if (type) {
        if (!contributors.has(author.toLowerCase())) {
          contributors.set(author.toLowerCase(), {
            name: author,
            platform: 'reddit',
            type,
            reason: `[${type}] ${text.slice(0, 75)}...`,
          });
        }
      } else {
        // Ignored general praise / non-substantive comment
      }
    }
  } catch (err) {
    console.error('[Reddit] Playwright scraping error:', err.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`[Reddit] Identified ${contributors.size} contributor(s) with actionable input.`);
  return Array.from(contributors.values());
}

async function run() {
  const writeChanges = process.argv.includes('--apply') || process.argv.includes('--write');

  console.log('=== WLEDASHBOARD AD-HOC CONTRIBUTORS SYNC ===\n');

  const [ghContributors, redditContributors] = await Promise.all([
    scrapeGitHub(),
    scrapeReddit(),
  ]);

  // Combine and deduplicate
  const mergedMap = new Map();
  for (const c of ghContributors) {
    mergedMap.set(c.name.toLowerCase(), c);
  }
  for (const c of redditContributors) {
    if (!mergedMap.has(c.name.toLowerCase())) {
      mergedMap.set(c.name.toLowerCase(), c);
    }
  }

  // Strict alphabetical order
  const updatedList = Array.from(mergedMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  console.log('\n--- Merged Actionable Contributors ---');
  updatedList.forEach(c => {
    console.log(`- ${c.platform.toUpperCase().padEnd(7)} | ${c.name.padEnd(20)} | ${c.type.padEnd(16)} | ${c.reason}`);
  });

  // Read existing Settings.jsx CONTRIBUTORS
  if (!fs.existsSync(SETTINGS_FILE_PATH)) {
    console.error(`Settings file not found at: ${SETTINGS_FILE_PATH}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf8');
  const existingBlockMatch = fileContent.match(/const CONTRIBUTORS = \[([\s\S]*?)\]\.sort/);

  if (!existingBlockMatch) {
    console.error('Could not find `const CONTRIBUTORS = [...]` block in Settings.jsx');
    process.exit(1);
  }

  const existingEntriesMatch = [...existingBlockMatch[1].matchAll(/name:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  console.log('\n--- Existing in Settings.jsx (' + existingEntriesMatch.length + ') ---');
  console.log(existingEntriesMatch.join(', '));

  console.log('\n--- Scraped from Sources (' + updatedList.length + ') ---');
  console.log(updatedList.map(c => c.name).join(', '));

  // Determine diff
  const existingSet = new Set(existingEntriesMatch.map(s => s.toLowerCase()));
  const newSet = new Set(updatedList.map(c => c.name.toLowerCase()));

  const added = updatedList.filter(c => !existingSet.has(c.name.toLowerCase()));
  const missingInScrape = existingEntriesMatch.filter(name => !newSet.has(name.toLowerCase()));

  console.log('\n--- Sync Status ---');
  if (added.length === 0 && missingInScrape.length === 0) {
    console.log('List is already 100% in sync!');
  } else {
    if (added.length > 0) {
      console.log(`New contributor(s) to add (${added.length}):`, added.map(c => `${c.name} (${c.platform})`).join(', '));
    }
    if (missingInScrape.length > 0) {
      console.log(`Existing contributor(s) not found in latest scrape (${missingInScrape.length}):`, missingInScrape.join(', '));
    }
  }

  // Generate new code snippet (names and platform logos only)
  const codeEntries = updatedList.map(c => `  { name: '${c.name}', platform: '${c.platform}' },`).join('\n');
  const newBlock = `const CONTRIBUTORS = [\n${codeEntries}\n].sort`;

  if (writeChanges) {
    const updatedContent = fileContent.replace(
      /const CONTRIBUTORS = \[([\s\S]*?)\]\.sort/,
      newBlock
    );
    fs.writeFileSync(SETTINGS_FILE_PATH, updatedContent, 'utf8');
    console.log(`\n[PASS] Successfully updated ${SETTINGS_FILE_PATH} with ${updatedList.length} contributors.`);
  } else {
    console.log('\n[DRY RUN] Run with --apply or --write to update Settings.jsx automatically.');
  }
}

run();
