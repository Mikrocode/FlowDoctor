const ranges = document.querySelectorAll('input[type="range"]');
const toggleState = {
  stories: 'yes',
  pressure: 'high'
};

function classify(value, min, max) {
  const ratio = (value - min) / (max - min);
  if (ratio < 0.35) return 'OK';
  if (ratio < 0.7) return 'Bad';
  return 'Critical';
}

function bandClass(text) {
  if (text === 'Critical') return 'band critical';
  if (text === 'Bad') return 'band bad';
  return 'band';
}

for (const input of ranges) {
  const id = input.id;
  const valueNode = document.getElementById(`${id}-value`);
  const bandNode = document.getElementById(`${id}-band`);
  const suffix = input.dataset.suffix ?? '';

  const refresh = () => {
    const val = Number(input.value);
    valueNode.textContent = `${val}${suffix}`;
    const label = classify(val, Number(input.min), Number(input.max));
    bandNode.textContent = label;
    bandNode.className = bandClass(label);
  };

  input.addEventListener('input', refresh);
  refresh();
}

const toggleRows = document.querySelectorAll('.switch-row[data-toggle]');
for (const row of toggleRows) {
  row.addEventListener('click', (event) => {
    const button = event.target.closest('.pill');
    if (!button) return;

    for (const sibling of row.querySelectorAll('.pill')) {
      sibling.classList.remove('active');
    }

    button.classList.add('active');
    toggleState[row.dataset.toggle] = button.dataset.value;
  });
}

function diagnose() {
  const metrics = {
    cycle: Number(document.getElementById('cycle').value),
    wip: Number(document.getElementById('wip').value),
    blocked: Number(document.getElementById('blocked').value),
    bugs: Number(document.getElementById('bugs').value),
    team: Number(document.getElementById('team').value),
    dependencies: document.getElementById('dependencies').value,
    stories: toggleState.stories,
    pressure: toggleState.pressure
  };

  const signals = [
    {
      key: 'parallel',
      score:
        metrics.wip / Math.max(metrics.team, 1) +
        (metrics.pressure === 'high' ? 1.8 : 0) +
        (metrics.stories === 'yes' ? 1.4 : 0),
      severity: () => (metrics.wip >= 16 || metrics.wip / metrics.team > 1.5 ? 'CRITICAL' : 'BAD'),
      problem: 'Too much parallel work',
      sub: 'You’re starting everything. Finishing nothing.',
      root: 'Root cause: WIP exceeds team capacity and drives context switching.',
      actions: [
        'Limit WIP to 2–3 per dev',
        'Create an explicit pull policy',
        'Finish top priority work before starting new items',
        'Cycle time can improve by 35–45% in 2 sprints'
      ]
    },
    {
      key: 'spillover',
      score:
        metrics.cycle / 4 +
        metrics.blocked / 20 +
        (metrics.stories === 'yes' ? 2.2 : 0) +
        (metrics.dependencies === 'High' ? 1.2 : 0),
      severity: () => (metrics.cycle >= 12 || metrics.blocked >= 45 ? 'CRITICAL' : 'BAD'),
      problem: 'Stories are too large and spill over',
      sub: 'Work carries across sprints because slices are too big.',
      root: 'Root cause: oversized stories and frequent blockers from dependencies.',
      actions: [
        'Split stories to 1–2 day slices',
        'Enforce acceptance criteria before sprint start',
        'Track blocker aging daily and escalate after 24h',
        'Spillover can drop from 40% to <15%'
      ]
    },
    {
      key: 'quality',
      score: metrics.bugs / 4 + metrics.blocked / 30 + (metrics.pressure === 'high' ? 1.4 : 0),
      severity: () => (metrics.bugs >= 20 ? 'CRITICAL' : 'BAD'),
      problem: 'Quality debt is flooding delivery',
      sub: 'Defects are consuming capacity every sprint.',
      root: 'Root cause: high rework load and unstable handoffs.',
      actions: [
        'Set a bug budget and stop line when exceeded',
        'Add a lightweight test gate on high-risk changes',
        'Fix top recurring defect patterns first',
        'Bugs can reduce by 30% in 2–3 sprints'
      ]
    },
    {
      key: 'dependency',
      score:
        (metrics.dependencies === 'High' ? 3.5 : metrics.dependencies === 'Medium' ? 2 : 0.8) +
        metrics.blocked / 18 +
        (metrics.pressure === 'high' ? 1.1 : 0),
      severity: () => (metrics.dependencies === 'High' || metrics.blocked >= 50 ? 'CRITICAL' : 'BAD'),
      problem: 'Dependency bottlenecks are stalling flow',
      sub: 'External teams and approvals are throttling throughput.',
      root: 'Root cause: weak dependency ownership and late integration.',
      actions: [
        'Map top 5 recurring dependencies',
        'Assign a single dependency owner per stream',
        'Reserve weekly integration windows',
        'Blocked work can drop by 20–30%'
      ]
    }
  ];

  const top = signals.sort((a, b) => b.score - a.score)[0];
  const severity = top.severity();

  document.getElementById('severity').textContent = severity;
  document.getElementById('main-problem').textContent = top.problem;
  document.getElementById('problem-sub').textContent = top.sub;
  document.getElementById('root-cause').textContent = top.root;

  document.getElementById('action-1a').textContent = top.actions[0];
  document.getElementById('action-1b').textContent = top.actions[1];
  document.getElementById('action-2a').textContent = top.actions[2];
  document.getElementById('action-2b').textContent = 'Run a 15-minute daily triage until stable.';
  document.getElementById('action-3a').textContent = 'Set a weekly improvement experiment and KPI owner.';
  document.getElementById('action-3b').textContent = 'Review outcome every Friday and tighten limits.';

  const targetCycle = Math.max(2, Math.round(metrics.cycle * 0.55));
  document.getElementById('impact-cycle').innerHTML = `<strong>Cycle time:</strong> ${metrics.cycle}d → ~${targetCycle}d`;
  document.getElementById('impact-predictability').innerHTML = `<strong>Predictability:</strong> ${top.actions[3]}`;

  const resultNode = document.getElementById('result-critical');
  resultNode.classList.remove('status-bad', 'status-critical');
  resultNode.classList.add(severity === 'CRITICAL' ? 'status-critical' : 'status-bad');
}

document.getElementById('diagnose').addEventListener('click', diagnose);
