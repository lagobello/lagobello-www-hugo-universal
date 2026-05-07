// Imperial/metric toggle. Holds the current unit system and exposes a
// subscribe() so the map can re-render measurements when it changes.

let currentUnits = 'imperial';
const listeners = [];

export function getUnits() { return currentUnits; }

export function onUnitsChange(fn) {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

function setUnits(units) {
  if (currentUnits === units) return;
  currentUnits = units;
  for (const fn of listeners) fn(units);
}

export class UnitToggleControl extends ol.control.Control {
  constructor(opt_options) {
    const options = opt_options || {};
    const element = document.createElement('div');
    element.className = 'ol-unit-toggle-control ol-unselectable ol-control';

    super({ element, target: options.target });

    this.imperialButton = document.createElement('button');
    this.imperialButton.innerHTML = '👑';
    this.imperialButton.title = 'Use Imperial Units';
    this.imperialButton.addEventListener('click', () => {
      setUnits('imperial');
      this.updateButtonActiveState();
    });
    element.appendChild(this.imperialButton);

    this.metricButton = document.createElement('button');
    this.metricButton.innerHTML = '⚙️';
    this.metricButton.title = 'Use Metric Units';
    this.metricButton.addEventListener('click', () => {
      setUnits('metric');
      this.updateButtonActiveState();
    });
    element.appendChild(this.metricButton);

    this.updateButtonActiveState();
  }

  updateButtonActiveState() {
    if (currentUnits === 'metric') {
      this.metricButton.classList.add('active');
      this.imperialButton.classList.remove('active');
    } else {
      this.imperialButton.classList.add('active');
      this.metricButton.classList.remove('active');
    }
  }
}
