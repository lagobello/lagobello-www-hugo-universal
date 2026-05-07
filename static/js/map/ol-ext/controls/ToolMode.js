// Shared tool-mode state for Info / Length / Area controls.
// Controls register themselves and a click handler; setSelectedTool() activates
// one and notifies a single listener (typically the LagoBelloMap interaction handler).

const registered = [];
let currentMode = 'info';
let onChange = null;

export function getToolMode() { return currentMode; }

export function registerToolControl(name, controlInstance) {
  registered.push({ name, instance: controlInstance });
}

export function setOnToolChange(fn) { onChange = fn; }

export function setSelectedTool(name, clickedControlInstance) {
  currentMode = name;
  for (const { instance } of registered) {
    if (!instance || !instance.element) continue;
    const btn = instance.element.firstChild;
    if (!btn) continue;
    if (instance === clickedControlInstance) btn.classList.add('active');
    else btn.classList.remove('active');
  }
  if (onChange) onChange(name);
}
