/* Accurate star-map product preview. Astronomy Engine 2.1.19 + tz-lookup 6.1.25. */
(function (root, factory) {
  var api;
  if (typeof module === 'object' && module.exports) {
    api = factory(
      require('./astronomy-engine.min.js'),
      require('./tz-lookup.min.js'),
      require('./star-map-catalog.js')
    );
    module.exports = api;
    return;
  }

  api = factory(root.Astronomy, root.tzlookup, root.OCStarMapCatalog);
  root.OCStarMap = api;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { api.init(document); }, { once: true });
  } else {
    api.init(document);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Astronomy, tzLookup, catalog) {
  'use strict';

  var CX = 130;
  var CY = 170;
  var RADIUS = 99;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  function parseCoordinates(value) {
    if (!value) return null;
    var match = value.trim().match(
      /^([+-]?\d+(?:\.\d+)?)\s*\u00b0?\s*([NS])?\s*(?:,|;|\s)\s*([+-]?\d+(?:\.\d+)?)\s*\u00b0?\s*([EW])?$/i
    );
    if (!match) return null;

    var lat = parseFloat(match[1]);
    var lng = parseFloat(match[3]);
    if (match[2]) lat = /s/i.test(match[2]) ? -Math.abs(lat) : Math.abs(lat);
    if (match[4]) lng = /w/i.test(match[4]) ? -Math.abs(lng) : Math.abs(lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return null;
    }
    return { lat: lat, lng: lng };
  }

  function wallClockParts(date, timeZone) {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date);
    var values = {};
    parts.forEach(function (part) {
      if (part.type !== 'literal') values[part.type] = parseInt(part.value, 10);
    });
    return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second);
  }

  function zonedLocalTimeToUtc(dateValue, timeValue, timeZone) {
    var dateParts = String(dateValue || '').split('-').map(Number);
    var timeParts = String(timeValue || '00:00').split(':').map(Number);
    if (dateParts.length !== 3 || dateParts.some(Number.isNaN) || timeParts.length < 2 || timeParts.some(Number.isNaN)) {
      throw new RangeError('Invalid local date or time.');
    }

    var wallClock = Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1], 0);
    var candidate = wallClock;
    for (var attempt = 0; attempt < 4; attempt += 1) {
      var difference = wallClockParts(new Date(candidate), timeZone) - wallClock;
      if (difference === 0) return new Date(candidate);
      candidate -= difference;
    }
    if (wallClockParts(new Date(candidate), timeZone) !== wallClock) {
      throw new RangeError('This local time does not exist in the selected time zone.');
    }
    return new Date(candidate);
  }

  function makeProjector(date, lat, lng) {
    if (!Astronomy) throw new Error('Astronomy Engine is unavailable.');
    var time = Astronomy.MakeTime(date);
    var observer = new Astronomy.Observer(lat, lng, 0);
    var rotation = Astronomy.Rotation_EQJ_HOR(time, observer);

    return function (raDegrees, decDegrees) {
      var ra = raDegrees * Math.PI / 180;
      var dec = decDegrees * Math.PI / 180;
      var cosDec = Math.cos(dec);
      var equatorial = new Astronomy.Vector(
        cosDec * Math.cos(ra),
        cosDec * Math.sin(ra),
        Math.sin(dec),
        time
      );
      var horizontal = Astronomy.HorizonFromVector(Astronomy.RotateVector(rotation, equatorial), '');
      var azimuth = ((horizontal.lon % 360) + 360) % 360;
      var altitude = horizontal.lat;
      var distance = RADIUS * (1 - Math.max(0, altitude) / 90);
      var azimuthRadians = azimuth * Math.PI / 180;
      return {
        altitude: altitude,
        azimuth: azimuth,
        x: CX - distance * Math.sin(azimuthRadians),
        y: CY - distance * Math.cos(azimuthRadians)
      };
    };
  }

  function projectSky(date, lat, lng) {
    var project = makeProjector(date, lat, lng);
    return (catalog && catalog.stars ? catalog.stars : []).map(function (star) {
      var point = project(star[1], star[2]);
      return {
        id: star[0],
        magnitude: star[3],
        altitude: point.altitude,
        azimuth: point.azimuth,
        x: point.x,
        y: point.y
      };
    }).filter(function (star) { return star.altitude > 0.5; });
  }

  function createSvgElement(name, attributes) {
    var element = document.createElementNS(SVG_NS, name);
    Object.keys(attributes || {}).forEach(function (key) {
      element.setAttribute(key, attributes[key]);
    });
    return element;
  }

  function drawSky(sky, date, lat, lng) {
    var project = makeProjector(date, lat, lng);
    var fragment = document.createDocumentFragment();

    (catalog.constellations || []).forEach(function (constellation) {
      constellation.lines.forEach(function (line) {
        var path = '';
        line.forEach(function (coordinate) {
          var point = project(coordinate[0], coordinate[1]);
          if (point.altitude <= 0.5) {
            path = path ? path + ' ' : '';
            return;
          }
          path += (path && !/\s$/.test(path) ? ' L' : 'M') + point.x.toFixed(1) + ',' + point.y.toFixed(1);
        });
        if (path.indexOf(' L') !== -1) {
          fragment.appendChild(createSvgElement('path', { d: path, 'class': 'ep__sm-line', fill: 'none' }));
        }
      });
    });

    projectSky(date, lat, lng).forEach(function (star) {
      fragment.appendChild(createSvgElement('circle', {
        cx: star.x.toFixed(1),
        cy: star.y.toFixed(1),
        r: Math.max(0.55, 2.7 - star.magnitude * 0.5).toFixed(2),
        'class': 'ep__sm-star' + (star.magnitude < 1 ? ' ep__sm-star--bright' : '')
      }));
    });

    (catalog.constellations || []).map(function (constellation) {
      var point = project(constellation.label[0], constellation.label[1]);
      return { id: constellation.id, point: point };
    }).filter(function (item) {
      return item.point.altitude > 18 && item.point.y < 202;
    }).sort(function (a, b) {
      return b.point.altitude - a.point.altitude;
    }).slice(0, 5).forEach(function (item) {
      var label = createSvgElement('text', {
        x: item.point.x.toFixed(1),
        y: item.point.y.toFixed(1),
        'class': 'ep__sm-label'
      });
      label.textContent = item.id.toUpperCase();
      fragment.appendChild(label);
    });

    while (sky.firstChild) sky.removeChild(sky.firstChild);
    sky.appendChild(fragment);
    sky.style.opacity = '1';
  }

  function clampFit(element, textLength) {
    var fit = element && element.dataset.fit;
    var characters = element ? parseInt(element.dataset.fitChars || '0', 10) : 0;
    if (!fit || !characters) return;
    if (textLength > characters) element.setAttribute('textLength', fit);
    else element.removeAttribute('textLength');
  }

  function shortTimeZoneName(date, timeZone) {
    var part = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone,
      timeZoneName: 'short'
    }).formatToParts(date).find(function (item) { return item.type === 'timeZoneName'; });
    return part ? part.value : timeZone;
  }

  function formatCoordinates(location) {
    return Math.abs(location.lat).toFixed(4) + '\u00b0 ' + (location.lat >= 0 ? 'N' : 'S') + ', ' +
      Math.abs(location.lng).toFixed(4) + '\u00b0 ' + (location.lng >= 0 ? 'E' : 'W');
  }

  function init(scope) {
    var root = scope.querySelector('[data-product]');
    if (!root || (root.dataset.previewType || '') !== 'star-map') return;
    var rig = root.querySelector('[data-star-map-engraving]');
    if (!rig) return;

    var dateInput = rig.querySelector('[data-sm-input-date]');
    var timeInput = rig.querySelector('[data-sm-input-time]');
    var locationInput = rig.querySelector('[data-sm-input-location]');
    var captionInput = rig.querySelector('[data-sm-input-caption]');
    var exactCoordinates = rig.querySelector('[data-prop-latlng]');
    var searchedPlace = rig.querySelector('[data-prop-place]');
    var verificationMap = rig.querySelector('[data-prop-maplink]');
    var timezoneProperty = rig.querySelector('[data-sm-timezone]');
    var utcProperty = rig.querySelector('[data-sm-utc]');
    var sky = rig.querySelector('[data-sm-sky]');
    var status = rig.querySelector('[data-sm-status]');
    var caption = rig.querySelector('[data-sm-caption]');
    var dateText = rig.querySelector('[data-sm-date]');
    var counter = rig.querySelector('[data-engrave-count]');
    var form = root.querySelector('form[data-product-form]');

    function setStatus(message, state) {
      if (!status) return;
      status.textContent = message;
      status.dataset.state = state;
    }

    function selectedLocation() {
      return parseCoordinates(exactCoordinates && exactCoordinates.value) ||
        parseCoordinates(locationInput && locationInput.value);
    }

    function syncExpressGate() {
      if (!form) return;
      var blocked = !dateInput.value || !selectedLocation() || rig.dataset.skyReady !== 'true' ||
        (captionInput.required && !captionInput.value.trim());
      if (blocked) form.dataset.expressBlocked = 'Express checkout unlocks once your star map is ready.';
      else delete form.dataset.expressBlocked;
      form.dispatchEvent(new CustomEvent('oc:express-recheck', { bubbles: true }));
    }

    function clearPinnedLocation() {
      if (exactCoordinates) exactCoordinates.value = '';
      if (searchedPlace) searchedPlace.value = '';
      if (verificationMap) verificationMap.value = '';
    }

    function updateCaption() {
      if (caption) {
        var value = captionInput ? captionInput.value.trim() : '';
        var placeholder = caption.dataset.placeholder || '';
        caption.textContent = (value || placeholder).toUpperCase();
        caption.style.opacity = value ? '1' : '0.5';
        clampFit(caption, (value || placeholder).length);
      }
      if (counter && captionInput) {
        counter.textContent = captionInput.value.length + ' / ' + captionInput.maxLength;
      }
    }

    function updateDate() {
      if (!dateText || !dateInput || !dateInput.value) return;
      var parts = dateInput.value.split('-').map(Number);
      var label = MONTHS[parts[1] - 1] + ' ' + parts[2] + ', ' + parts[0];
      dateText.textContent = label;
      dateText.style.opacity = '1';
      clampFit(dateText, label.length);
    }

    function clearMomentProperties() {
      if (timezoneProperty) timezoneProperty.value = '';
      if (utcProperty) utcProperty.value = '';
      rig.dataset.skyReady = 'false';
      syncExpressGate();
    }

    function render() {
      updateCaption();
      updateDate();

      if (!Astronomy || typeof tzLookup !== 'function' || !catalog) {
        clearMomentProperties();
        setStatus('Sky preview temporarily unavailable. Please try again.', 'error');
        return;
      }
      if (!dateInput.value) {
        clearMomentProperties();
        setStatus('Choose a date and exact place to chart the sky.', 'waiting');
        return;
      }

      var location = selectedLocation();
      if (!location) {
        clearMomentProperties();
        setStatus('Use Find my coordinates or enter latitude and longitude.', 'waiting');
        return;
      }

      try {
        var timeZone = tzLookup(location.lat, location.lng);
        var utc = zonedLocalTimeToUtc(dateInput.value, timeInput.value || '21:00', timeZone);
        drawSky(sky, utc, location.lat, location.lng);
        if (timezoneProperty) timezoneProperty.value = timeZone;
        if (utcProperty) utcProperty.value = utc.toISOString();
        rig.dataset.skyReady = 'true';
        syncExpressGate();
        setStatus(
          'Sky calculated for ' + formatCoordinates(location) + ' \u00b7 ' + shortTimeZoneName(utc, timeZone),
          'ready'
        );
      } catch (error) {
        clearMomentProperties();
        setStatus(error instanceof RangeError ? error.message : 'Unable to calculate this sky. Check the date and place.', 'error');
      }
    }

    ['input', 'change'].forEach(function (eventName) {
      rig.addEventListener(eventName, function (event) {
        if ([dateInput, timeInput, locationInput, captionInput].indexOf(event.target) === -1) return;
        if (event.target === locationInput && !locationInput.dataset.fromLocator) clearPinnedLocation();
        render();
      });
    });

    if (form) {
      addProductFormSubmitListener(form, function (event) {
        var missing = null;
        var message = '';
        if (!dateInput.value) {
          missing = dateInput;
          message = 'Pick the date of your moment.';
        } else if (!selectedLocation()) {
          missing = locationInput;
          message = 'Use Find my coordinates or enter valid latitude and longitude.';
        } else if (rig.dataset.skyReady !== 'true') {
          missing = timeInput;
          message = 'Choose a valid local time for this place.';
        } else if (captionInput.required && !captionInput.value.trim()) {
          missing = captionInput;
          message = 'Add your engraving caption.';
        }
        if (!missing) return;
        event.preventDefault();
        missing.focus();
        missing.setCustomValidity(message);
        missing.reportValidity();
        missing.addEventListener('input', function () { missing.setCustomValidity(''); }, { once: true });
      });
    }

    render();
  }

  return {
    init: init,
    parseCoordinates: parseCoordinates,
    projectSky: projectSky,
    zonedLocalTimeToUtc: zonedLocalTimeToUtc
  };
});
