// GPS tracking control. Receives the map and an ol.Geolocation in its options.

export class TrackingControl extends ol.control.Control {
  constructor(opt_options) {
    const options = opt_options || {};

    const button = document.createElement('button');
    button.innerHTML = '🛰️';
    button.title = 'Toggle GPS Tracking';

    const element = document.createElement('div');
    element.className = 'ol-unselectable ol-control tracking-control';
    element.appendChild(button);

    super({ element, target: options.target });

    this.map_ = options.map;
    this.geolocation_ = options.geolocation;

    this.statsElement_ = document.createElement('div');
    this.statsElement_.className = 'tracking-stats';
    this.statsElement_.style.display = 'none';
    element.appendChild(this.statsElement_);

    this.accuracyElement_ = document.createElement('div');
    this.accuracyElement_.innerHTML = 'Accuracy: -';
    this.statsElement_.appendChild(this.accuracyElement_);

    this.altitudeElement_ = document.createElement('div');
    this.altitudeElement_.innerHTML = 'Altitude: -';
    this.statsElement_.appendChild(this.altitudeElement_);

    this.altitudeAccuracyElement_ = document.createElement('div');
    this.altitudeAccuracyElement_.innerHTML = 'Alt. Accuracy: -';
    this.statsElement_.appendChild(this.altitudeAccuracyElement_);

    this.headingElement_ = document.createElement('div');
    this.headingElement_.innerHTML = 'Heading: -';
    this.statsElement_.appendChild(this.headingElement_);

    this.speedElement_ = document.createElement('div');
    this.speedElement_.innerHTML = 'Speed: -';
    this.statsElement_.appendChild(this.speedElement_);

    this.coordinatesElement_ = document.createElement('div');
    this.coordinatesElement_.innerHTML = 'Coords: -';
    this.statsElement_.appendChild(this.coordinatesElement_);

    this.button_ = button;
    this.trackingOn_ = false;
    this.needsCentering_ = false;

    this.button_.addEventListener('click', this.handleTrackToggle_.bind(this), false);
  }

  handleTrackToggle_() {
    this.trackingOn_ = !this.trackingOn_;
    this.geolocation_.setTracking(this.trackingOn_);
    if (this.trackingOn_) {
      this.button_.innerHTML = '📡';
      this.statsElement_.style.display = 'flex';
      this.needsCentering_ = true;
      const currentPosition = this.geolocation_.getPosition();
      if (currentPosition) {
        this.map_.getView().animate({
          center: currentPosition,
          zoom: Math.max(this.map_.getView().getZoom(), 17),
          rotation: 0,
          duration: 500
        });
        this.needsCentering_ = false;
      }
    } else {
      this.button_.innerHTML = '🛰️';
      this.statsElement_.style.display = 'none';
      this.updateStats('-', '-', '-', '-', '-', { lat: '-', lon: '-' });
      this.needsCentering_ = false;
    }
  }

  updateStats(accuracy, altitude, altitudeAccuracy, heading, speed, coordinates) {
    this.accuracyElement_.innerHTML = `Accuracy: ${accuracy} [m]`;
    this.altitudeElement_.innerHTML = `Altitude: ${altitude} [m]`;
    this.altitudeAccuracyElement_.innerHTML = `Alt. Accuracy: ${altitudeAccuracy} [m]`;
    this.headingElement_.innerHTML = `Heading: ${heading} [rad]`;
    this.speedElement_.innerHTML = `Speed: ${speed} [m/s]`;
    if (coordinates && coordinates.lat !== '-' && coordinates.lon !== '-') {
      this.coordinatesElement_.innerHTML = `Coords: ${coordinates.lat.toFixed(4)}, ${coordinates.lon.toFixed(4)}`;
    } else {
      this.coordinatesElement_.innerHTML = 'Coords: -';
    }
  }
}
