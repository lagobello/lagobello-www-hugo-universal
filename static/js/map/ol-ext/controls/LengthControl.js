import { registerToolControl, setSelectedTool } from './ToolMode.js';

export class LengthControl extends ol.control.Control {
  constructor(opt_options) {
    const options = opt_options || {};
    const button = document.createElement('button');
    button.innerHTML = '📏';
    button.title = 'Length Tool';

    const element = document.createElement('div');
    element.className = 'ol-length-control ol-unselectable ol-control';
    element.appendChild(button);

    super({ element, target: options.target });
    registerToolControl('length', this);

    button.addEventListener('click', () => setSelectedTool('length', this));
  }
}
