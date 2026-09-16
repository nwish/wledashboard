const RUN_IDS = [35044736603, 35044736623, 35044744478];
const REPO = 'upioneer/WLEDashboard';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRun(runId) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/runs/${runId}`, {
    headers: { 'User-Agent': 'CI-Monitor-Script' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getJobs(runId) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/runs/${runId}/jobs`, {
    headers: { 'User-Agent': 'CI-Monitor-Script' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.jobs || [];
}

async function main() {
  console.log(`=== MONITORING GITHUB ACTIONS FOR RUNS: ${RUN_IDS.join(', ')} ===\n`);

  const results = {};
  const completed = new Set();

  while (completed.size < RUN_IDS.length) {
    for (const id of RUN_IDS) {
      if (completed.has(id)) continue;

      try {
        const run = await getRun(id);
        const name = run.name;
        const branch = run.head_branch;
        const status = run.status;
        const conclusion = run.conclusion;

        console.log(`[${new Date().toISOString()}] Run ${id} (${name} on ${branch}): status=${status}, conclusion=${conclusion || 'pending'}`);

        if (status === 'completed') {
          completed.add(id);
          const jobs = await getJobs(id);
          results[id] = { run, jobs };
        }
      } catch (err) {
        console.warn(`[WARN] Failed to fetch status for run ${id}: ${err.message}`);
      }
    }

    if (completed.size < RUN_IDS.length) {
      await sleep(15000);
    }
  }

  console.log('\n=== ALL WORKFLOW RUNS COMPLETED ===\n');

  let anyFailed = false;

  for (const id of RUN_IDS) {
    const { run, jobs } = results[id];
    console.log(`------------------------------------------------------------`);
    console.log(`Run ${id}: ${run.name} [${run.head_branch}]`);
    console.log(`Status: ${run.status} | Conclusion: ${run.conclusion}`);
    console.log(`URL: ${run.html_url}`);

    if (run.conclusion !== 'success') {
      anyFailed = true;
    }

    for (const job of jobs) {
      console.log(`  Job: ${job.name} - ${job.conclusion || job.status}`);
      if (job.steps) {
        for (const step of job.steps) {
          if (step.conclusion && step.conclusion !== 'success' && step.conclusion !== 'skipped') {
            console.log(`    Step failed: ${step.name} (conclusion: ${step.conclusion})`);
          }
        }
      }
    }
  }

  if (anyFailed) {
    console.error('\n[ERROR] One or more GitHub Action workflows failed!');
    process.exit(1);
  } else {
    console.log('\n[PASS] All GitHub Action workflows succeeded!');
  }
}

main().catch(err => {
  console.error('Monitor fatal error:', err);
  process.exit(1);
});
