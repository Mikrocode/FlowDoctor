const ranges = document.querySelectorAll('input[type="range"]');

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
