# Star-map vendor data and runtime

The star-map product preview loads these assets only on the star-map product template:

- `assets/astronomy-engine.min.js`: Astronomy Engine 2.1.19 by Don Cross, MIT License. Source: <https://github.com/cosinekitty/astronomy>.
- `assets/tz-lookup.min.js`: tz-lookup 6.1.25 by The Dark Sky Company, CC0-1.0. Source: <https://github.com/darkskyapp/tz-lookup>.
- `assets/star-map-catalog.js`: generated from the `stars.6.json`, `constellations.lines.json`, and `constellations.json` data distributed with d3-celestial 0.7.35 by Olaf Frohn, BSD-3-Clause. Source: <https://github.com/ofrohn/d3-celestial>.

The Astronomy Engine minified asset includes its full MIT notice. The catalog keeps stars through apparent magnitude 3.5 and the rank-1 constellation line set, then Astronomy Engine projects those J2000 coordinates for the customer's exact UTC moment and observing location.
