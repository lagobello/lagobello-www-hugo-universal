import { registerToolControl, setSelectedTool } from './ToolMode.js';

export class AreaControl extends ol.control.Control {
  constructor(opt_options) {
    const options = opt_options || {};
    const button = document.createElement('button');
    button.innerHTML = '📐';
    button.title = 'Area Tool';

    const element = document.createElement('div');
    element.className = 'ol-area-control ol-unselectable ol-control';
    element.appendChild(button);

    super({ element, target: options.target });
    registerToolControl('area', this);

    button.addEventListener('click', () => setSelectedTool('area', this));
  }
}
