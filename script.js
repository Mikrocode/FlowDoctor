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

function riskBand(score, badAt, criticalAt) {
  if (score >= criticalAt) return 'CRITICAL';
  if (score >= badAt) return 'BAD';
  return 'OK';
}

function severityRank(severity) {
  if (severity === 'CRITICAL') return 2;
  if (severity === 'BAD') return 1;
  return 0;
}

function metricStatus(value, min, max) {
  const ratio = (value - min) / (max - min);
  if (ratio < 0.35) return 'OK';
  if (ratio < 0.7) return 'BAD';
  return 'CRITICAL';
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
      severity: (score) => {
        if (metrics.wip <= metrics.team && metrics.wip / metrics.team <= 0.9 && metrics.stories === 'no') return 'OK';
        return riskBand(score, 2.8, 4.2);
      },
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
      severity: (score) => {
        if (metrics.cycle <= 4 && metrics.blocked <= 12 && metrics.stories === 'no' && metrics.dependencies === 'Low') return 'OK';
        return riskBand(score, 3.2, 5);
      },
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
      severity: (score) => {
        if (metrics.bugs <= 5 && metrics.blocked <= 10 && metrics.pressure === 'low') return 'OK';
        return riskBand(score, 2.9, 4.4);
      },
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
      severity: (score) => {
        if (metrics.dependencies === 'Low' && metrics.blocked <= 10 && metrics.pressure === 'low') return 'OK';
        return riskBand(score, 3, 4.8);
      },
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

  const scored = signals.map((signal) => ({ ...signal, severity: signal.severity(signal.score) }));
  const top = [...scored].sort((a, b) => {
    const severityDelta = severityRank(b.severity) - severityRank(a.severity);
    if (severityDelta !== 0) return severityDelta;
    return b.score - a.score;
  })[0];

  const metricSeverities = [
    metricStatus(metrics.cycle, 1, 20),
    metricStatus(metrics.wip, 1, 30),
    metricStatus(metrics.blocked, 0, 100),
    metricStatus(metrics.bugs, 0, 40),
    metricStatus(metrics.team, 2, 20)
  ];
  const hasAnyBadSignal =
    scored.some((signal) => signal.severity !== 'OK') ||
    metricSeverities.some((severity) => severity !== 'OK');

  const healthyScenario = {
    severity: 'OK',
    problem: 'Delivery flow looks healthy',
    sub: 'Signals are in a stable range. Keep the system balanced.',
    root: 'Root cause: none critical right now. The team is operating within healthy limits.',
    actions: [
      'Keep WIP and blockers visible every day',
      'Protect story slicing and acceptance quality',
      'Run one small weekly improvement experiment',
      'Predictability stays high when these guardrails are maintained'
    ]
  };

  const diagnosis = !hasAnyBadSignal ? healthyScenario : {
    severity: top.severity,
    problem: top.problem,
    sub: top.sub,
    root: top.root,
    actions: top.actions
  };

  document.getElementById('severity').textContent = diagnosis.severity;
  document.getElementById('main-problem').textContent = diagnosis.problem;
  document.getElementById('problem-sub').textContent = diagnosis.sub;
  document.getElementById('root-cause').textContent = diagnosis.root;

  document.getElementById('action-1a').textContent = diagnosis.actions[0];
  document.getElementById('action-1b').textContent = diagnosis.actions[1];
  document.getElementById('action-2a').textContent = diagnosis.actions[2];
  document.getElementById('action-2b').textContent = diagnosis.severity === 'OK'
    ? 'Use daily triage only for exceptions and risks.'
    : 'Run a 15-minute daily triage until stable.';
  document.getElementById('action-3a').textContent = diagnosis.severity === 'OK'
    ? 'Track one leading indicator (cycle time or blocked %).'
    : 'Set a weekly improvement experiment and KPI owner.';
  document.getElementById('action-3b').textContent = diagnosis.severity === 'OK'
    ? 'Review weekly and intervene early when drift appears.'
    : 'Review outcome every Friday and tighten limits.';

  const targetCycle = diagnosis.severity === 'OK'
    ? Math.max(2, Math.round(metrics.cycle * 0.95))
    : Math.max(2, Math.round(metrics.cycle * 0.55));
  document.getElementById('impact-cycle').innerHTML = `<strong>Cycle time:</strong> ${metrics.cycle}d → ~${targetCycle}d`;
  document.getElementById('impact-predictability').innerHTML = `<strong>Predictability:</strong> ${diagnosis.actions[3]}`;

  const resultNode = document.getElementById('result-critical');
  resultNode.classList.remove('status-good', 'status-bad', 'status-critical');
  if (diagnosis.severity === 'CRITICAL') {
    resultNode.classList.add('status-critical');
  } else if (diagnosis.severity === 'BAD') {
    resultNode.classList.add('status-bad');
  } else {
    resultNode.classList.add('status-good');
  }
}

document.getElementById('diagnose').addEventListener('click', diagnose);
