import { registerToolControl, setSelectedTool } from './ToolMode.js';

export class InfoControl extends ol.control.Control {
  constructor(opt_options) {
    const options = opt_options || {};
    const button = document.createElement('button');
    button.innerHTML = 'ℹ️';
    button.title = 'Info Mode';
    button.classList.add('active');

    const element = document.createElement('div');
    element.className = 'ol-info-control ol-unselectable ol-control';
    element.appendChild(button);

    super({ element, target: options.target });
    registerToolControl('info', this);

    button.addEventListener('click', () => setSelectedTool('info', this));
  }
}
