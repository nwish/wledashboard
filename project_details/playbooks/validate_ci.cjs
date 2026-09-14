/**
 * CI Validation Script
 * Monitors GitHub Action workflow runs for the current commit until completion,
 * checking success status, conclusions, and annotations.
 */

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRuns(sha) {
  const res = await fetch(`https://api.github.com/repos/upioneer/WLEDashboard/actions/runs?per_page=10`, {
    headers: { 'User-Agent': 'WLEDashboard-CI-Monitor' }
  });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return (data.workflow_runs || []).filter(r => r.head_sha.startsWith(sha));
}

async function getAnnotations(runId) {
  const res = await fetch(`https://api.github.com/repos/upioneer/WLEDashboard/actions/runs/${runId}/jobs`, {
    headers: { 'User-Agent': 'WLEDashboard-CI-Monitor' }
  });
  if (!res.ok) return [];
  const data = await res.json();
  const annotations = [];
  for (const job of data.jobs || []) {
    const annRes = await fetch(`https://api.github.com/repos/upioneer/WLEDashboard/check-runs/${job.id}/annotations`, {
      headers: { 'User-Agent': 'WLEDashboard-CI-Monitor' }
    });
    if (annRes.ok) {
      const anns = await annRes.json();
      if (Array.isArray(anns)) {
        for (const a of anns) {
          annotations.push({ jobName: job.name, ...a });
        }
      }
    }
  }
  return annotations;
}

async function main() {
  const sha = process.argv[2] || 'fa312da';
  console.log(`Starting CI validation for commit SHA: ${sha}...`);

  const maxAttempts = 60; // 60 * 10s = 10 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    const runs = await getRuns(sha);
    if (runs.length === 0) {
      console.log(`[Attempt ${attempts}] Waiting for workflow runs to register...`);
      await sleep(10000);
      continue;
    }

    const completed = runs.filter(r => r.status === 'completed');
    console.log(`[Attempt ${attempts}] ${completed.length}/${runs.length} workflows completed...`);
    for (const r of runs) {
      console.log(`  - [${r.name}] Event: ${r.event} | Status: ${r.status} | Conclusion: ${r.conclusion || 'pending'} | URL: ${r.html_url}`);
    }

    if (completed.length === runs.length && runs.length > 0) {
      console.log('\nAll workflows finished! Checking detailed results and annotations...\n');
      let allSuccess = true;
      for (const r of runs) {
        console.log(`========================================`);
        console.log(`Workflow: ${r.name}`);
        console.log(`Event: ${r.event}`);
        console.log(`Conclusion: ${r.conclusion}`);
        console.log(`Run URL: ${r.html_url}`);
        
        if (r.conclusion !== 'success') {
          allSuccess = false;
        }

        const annotations = await getAnnotations(r.id);
        if (annotations.length > 0) {
          console.log(`Annotations (${annotations.length}):`);
          for (const a of annotations) {
            console.log(`  [${a.annotation_level ? a.annotation_level.toUpperCase() : 'INFO'}] Job: ${a.jobName} - ${a.message || a.title}`);
          }
        } else {
          console.log(`Annotations: None (clean run)`);
        }
        console.log(`========================================\n`);
      }

      if (!allSuccess) {
        console.error('One or more workflows failed.');
        process.exit(1);
      } else {
        console.log('All workflow runs passed successfully with conclusion: SUCCESS!');
        process.exit(0);
      }
    }

    await sleep(10000);
  }

  console.error('Timed out waiting for workflows to finish.');
  process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
