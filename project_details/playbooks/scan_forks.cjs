#!/usr/bin/env node

/**
 * Fork Surveillance & License Compliance Scanner
 * 
 * Inspects all GitHub forks of upioneer/WLEDashboard to detect active modifications,
 * commits ahead of upstream master, diverged branches, or tags.
 * Because WLEDashboard is Proprietary (All Rights Reserved) per LICENSE.md,
 * no permission is granted to use, copy, modify, or distribute the software.
 * 
 * Usage:
 *   node project_details/playbooks/scan_forks.cjs [--strict]
 */

const REPO_OWNER = 'upioneer';
const REPO_NAME = 'WLEDashboard';
const UPSTREAM = `${REPO_OWNER}/${REPO_NAME}`;
const UPSTREAM_BRANCH = 'master';

async function fetchGitHub(url) {
  const headers = {
    'User-Agent': 'WLEDashboard-Fork-Scanner',
    'Accept': 'application/vnd.github.v3+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
      const resetTime = new Date(Number(res.headers.get('x-ratelimit-reset')) * 1000).toLocaleTimeString();
      throw new Error(`GitHub API rate limit exceeded. Resets at ${resetTime}. Set GITHUB_TOKEN environment variable to increase limit.`);
    }
    throw new Error(`GitHub API error ${res.status}: ${res.statusText} (${url})`);
  }
  return res.json();
}

async function getAllForks() {
  const forks = [];
  let page = 1;
  while (true) {
    const url = `https://api.github.com/repos/${UPSTREAM}/forks?per_page=100&page=${page}&sort=newest`;
    const batch = await fetchGitHub(url);
    if (!Array.isArray(batch) || batch.length === 0) break;
    forks.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return forks;
}

async function getBranches(forkFullName) {
  try {
    const branches = await fetchGitHub(`https://api.github.com/repos/${forkFullName}/branches?per_page=50`);
    return Array.isArray(branches) ? branches.map(b => b.name) : [];
  } catch (err) {
    console.warn(`  [!] Could not fetch branches for ${forkFullName}: ${err.message}`);
    return [];
  }
}

async function getTags(forkFullName) {
  try {
    const tags = await fetchGitHub(`https://api.github.com/repos/${forkFullName}/tags?per_page=50`);
    return Array.isArray(tags) ? tags.map(t => t.name) : [];
  } catch (_) {
    return [];
  }
}

async function compareWithUpstream(forkOwner, branch) {
  try {
    const compareRef = `${forkOwner}:${branch}`;
    const url = `https://api.github.com/repos/${UPSTREAM}/compare/${UPSTREAM_BRANCH}...${compareRef}`;
    return await fetchGitHub(url);
  } catch (err) {
    return { error: err.message };
  }
}

async function main() {
  const strict = process.argv.includes('--strict');
  console.log('================================================================');
  console.log('  WLEDashboard Fork Surveillance & License Compliance Scanner');
  console.log(`  Upstream Target: ${UPSTREAM}:${UPSTREAM_BRANCH}`);
  console.log('  License: Proprietary / All Rights Reserved (LICENSE.md)');
  console.log('================================================================\n');

  console.log(`Querying GitHub API for forks of ${UPSTREAM}...`);
  let forks = [];
  try {
    forks = await getAllForks();
  } catch (err) {
    console.error(`Failed to retrieve forks: ${err.message}`);
    process.exit(1);
  }

  console.log(`Found ${forks.length} fork(s). Scanning for commits ahead and active modifications...\n`);

  const activeModifications = [];
  const cleanForks = [];

  for (const fork of forks) {
    const forkName = fork.full_name;
    const forkOwner = fork.owner?.login || forkName.split('/')[0];
    const defaultBranch = fork.default_branch || 'master';
    const pushedDate = new Date(fork.pushed_at).toISOString().split('T')[0];

    process.stdout.write(`Scanning ${forkName.padEnd(35)} (last pushed: ${pushedDate})... `);

    const branches = await getBranches(forkName);
    const tags = await getTags(forkName);
    const branchToScan = branches.length > 0 ? branches : [defaultBranch];

    let hasAheadCommits = false;
    const forkViolations = [];

    for (const branch of branchToScan) {
      const cmp = await compareWithUpstream(forkOwner, branch);
      if (cmp.error) {
        continue;
      }

      if (cmp.ahead_by > 0) {
        hasAheadCommits = true;
        const aheadCommits = (cmp.commits || []).map(c => ({
          sha: c.sha.slice(0, 7),
          author: c.commit?.author?.name || c.author?.login || 'Unknown',
          date: c.commit?.author?.date || 'Unknown',
          message: (c.commit?.message || '').split('\n')[0].trim(),
        }));

        forkViolations.push({
          branch,
          ahead_by: cmp.ahead_by,
          behind_by: cmp.behind_by,
          commits: aheadCommits,
          compareUrl: `https://github.com/${UPSTREAM}/compare/${UPSTREAM_BRANCH}...${forkOwner}:${branch}`,
        });
      }
    }

    if (hasAheadCommits) {
      console.log('MODIFICATIONS DETECTED!');
      activeModifications.push({
        name: forkName,
        url: fork.html_url,
        owner: forkOwner,
        pushed_at: fork.pushed_at,
        created_at: fork.created_at,
        tags,
        branches: branchToScan,
        violations: forkViolations,
      });
    } else {
      console.log('Clean (0 commits ahead)');
      cleanForks.push({
        name: forkName,
        url: fork.html_url,
        branches: branchToScan.join(', '),
        pushed_at: pushedDate,
      });
    }
  }

  console.log('\n================================================================');
  console.log('  SCAN RESULTS');
  console.log('================================================================\n');

  if (activeModifications.length === 0) {
    console.log(`All ${cleanForks.length} fork(s) are cleanly synchronized or behind upstream master.`);
    console.log('Zero unauthorized modifications or commits ahead detected.\n');
    process.exit(0);
  }

  console.log(`ACTION REQUIRED: ${activeModifications.length} fork(s) have unauthorized modifications / commits ahead:\n`);

  for (const mod of activeModifications) {
    console.log('----------------------------------------------------------------');
    console.log(`Fork: ${mod.name} (${mod.url})`);
    console.log(`Owner: @${mod.owner}`);
    console.log(`Created: ${mod.created_at} | Last Pushed: ${mod.pushed_at}`);
    if (mod.tags.length > 0) {
      console.log(`Tags: ${mod.tags.join(', ')}`);
    }
    for (const v of mod.violations) {
      console.log(`\n  Branch [${v.branch}]: ${v.ahead_by} commit(s) ahead of upstream master`);
      console.log(`  Diff URL: ${v.compareUrl}`);
      console.log('  Ahead Commits:');
      for (const c of v.commits) {
        console.log(`    * [${c.sha}] ${c.date.slice(0, 10)} - ${c.author}: ${c.message}`);
      }
    }
    console.log('----------------------------------------------------------------\n');
  }

  if (strict) {
    console.error('Exiting with code 1 due to active fork modifications (--strict).');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal scanner error:', err);
  process.exit(1);
});
