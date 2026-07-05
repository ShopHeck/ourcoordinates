/* Meridian theme JS — no dependencies */
(function () {
  'use strict';

  /* ---------- mobile nav ---------- */
  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-menu-toggle]');
    if (toggle) {
      var nav = document.querySelector('[data-site-nav]');
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  });

  /* ---------- product page ---------- */
  var pdp = document.querySelector('[data-product]');
  if (pdp) initProduct(pdp);

  function initProduct(root) {
    var json = root.querySelector('[data-product-json]');
    var product = json ? JSON.parse(json.textContent) : null;
    var form = root.querySelector('form[data-product-form]');
    var idInput = form ? form.querySelector('input[name="id"]') : null;
    var priceEl = root.querySelector('[data-price]');
    var stickyPrice = document.querySelector('[data-sticky-price]');
    var atcBtns = document.querySelectorAll('[data-atc]');

    /* variant resolution from option radios */
    function currentOptions() {
      var opts = [];
      root.querySelectorAll('[data-option-index]').forEach(function (group) {
        var checked = group.querySelector('input:checked');
        if (checked) opts[parseInt(group.dataset.optionIndex, 10)] = checked.value;
      });
      return opts;
    }

    function matchVariant() {
      if (!product) return null;
      var opts = currentOptions();
      return product.variants.find(function (v) {
        return v.options.every(function (o, i) { return o === opts[i]; });
      });
    }

    function money(cents) {
      return '$' + (cents / 100).toFixed(2).replace(/\.00$/, '');
    }

    function updateVariant() {
      var v = matchVariant();
      if (!v) return;
      if (idInput) idInput.value = v.id;
      if (priceEl) {
        priceEl.innerHTML = money(v.price) +
          (v.compare_at_price > v.price ? ' <s>' + money(v.compare_at_price) + '</s>' : '');
      }
      if (stickyPrice) stickyPrice.textContent = money(v.price);
      atcBtns.forEach(function (btn) {
        btn.disabled = !v.available;
        btn.querySelector('[data-atc-label]').textContent = v.available
          ? btn.dataset.labelAdd : btn.dataset.labelSoldOut;
      });
      var url = new URL(window.location);
      url.searchParams.set('variant', v.id);
      history.replaceState({}, '', url);
    }

    root.addEventListener('change', function (e) {
      if (e.target.closest('[data-option-index]')) updateVariant();
    });
    updateVariant();

    /* engraving live preview */
    var engraveInput = root.querySelector('[data-engrave-input]');
    var engravePreview = root.querySelector('[data-engrave-preview]');
    var engraveCount = root.querySelector('[data-engrave-count]');
    if (engraveInput && engravePreview) {
      var placeholder = engravePreview.dataset.placeholder || '40.7128° N, 74.0060° W';
      var render = function () {
        var val = engraveInput.value.trim();
        engravePreview.textContent = val || placeholder;
        engravePreview.style.opacity = val ? '1' : '0.45';
        if (engraveCount) engraveCount.textContent = engraveInput.value.length + ' / ' + engraveInput.maxLength;
        /* manual edits invalidate locator-pinned backend data */
        if (!engraveInput.dataset.fromLocator) {
          ['[data-prop-latlng]', '[data-prop-place]', '[data-prop-maplink]'].forEach(function (sel) {
            var el = document.querySelector(sel);
            if (el) el.value = '';
          });
        }
      };
      engraveInput.addEventListener('input', render);
      render();
    }

    /* require engraving before add-to-cart when marked required */
    if (form) {
      form.addEventListener('submit', function (e) {
        if (engraveInput && engraveInput.required && !engraveInput.value.trim()) {
          e.preventDefault();
          engraveInput.focus();
          engraveInput.setCustomValidity('Add your coordinates or message so we can engrave it.');
          engraveInput.reportValidity();
          engraveInput.addEventListener('input', function () { engraveInput.setCustomValidity(''); }, { once: true });
        }
      });
    }

    /* gallery */
    var mainImg = root.querySelector('[data-main-image]');
    root.querySelectorAll('[data-thumb]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (mainImg) {
          mainImg.src = btn.dataset.full;
          mainImg.alt = btn.querySelector('img') ? btn.querySelector('img').alt : '';
        }
        root.querySelectorAll('[data-thumb]').forEach(function (b) { b.removeAttribute('aria-current'); });
        btn.setAttribute('aria-current', 'true');
      });
    });

    /* sticky mobile ATC: show once buy box scrolls out of view */
    var sticky = document.querySelector('[data-sticky-atc]');
    var buyBox = root.querySelector('[data-buy-box]');
    if (sticky && buyBox && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        sticky.classList.toggle('is-visible', !entries[0].isIntersecting);
      }, { rootMargin: '-80px 0px 0px 0px' }).observe(buyBox);
      sticky.querySelector('[data-sticky-submit]').addEventListener('click', function () {
        form.requestSubmit ? form.requestSubmit() : form.submit();
      });
    }
  }

  /* ---------- cart quantity ---------- */
  document.querySelectorAll('[data-qty]').forEach(function (qty) {
    var input = qty.querySelector('input');
    qty.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var val = Math.max(0, parseInt(input.value || '0', 10) + (btn.dataset.dir === 'up' ? 1 : -1));
      input.value = val;
      input.form && input.form.submit();
    });
  });
})();

/* ---------- on-page coordinates locator ----------
   Leaflet + OpenStreetMap (free, no API key) loaded LAZILY:
   nothing downloads until the customer opens the locator,
   so PageSpeed is untouched. Geocoding via Nominatim. */
(function () {
  'use strict';
  var dialog = document.querySelector('[data-locator]');
  if (!dialog) return;

  /* the locator fills whichever engraving input was focused last */
  window.__engraveTarget = null;
  document.addEventListener('focusin', function (e) {
    if (e.target.matches('[data-engrave-input], [data-engrave-input-side]')) {
      window.__engraveTarget = e.target;
    }
  });
  function engraveTarget() {
    if (window.__engraveTarget && document.contains(window.__engraveTarget)) return window.__engraveTarget;
    return document.querySelector('[data-engrave-input]') ||
           document.querySelector('[data-engrave-input-side]');
  }

  var map = null, marker = null, picked = null;
  var coordsEl = dialog.querySelector('[data-locator-coords]');
  var useBtn = dialog.querySelector('[data-locator-use]');
  var searchInput = dialog.querySelector('[data-locator-search]');
  var leafletReady = null;

  function loadLeaflet() {
    if (leafletReady) return leafletReady;
    leafletReady = new Promise(function (resolve, reject) {
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      var js = document.createElement('script');
      js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      js.onload = resolve;
      js.onerror = reject;
      document.head.appendChild(js);
    });
    return leafletReady;
  }

  function fmt(lat, lng) {
    var ns = lat >= 0 ? 'N' : 'S';
    var ew = lng >= 0 ? 'E' : 'W';
    return Math.abs(lat).toFixed(4) + '\u00B0 ' + ns + ', ' + Math.abs(lng).toFixed(4) + '\u00B0 ' + ew;
  }

  function setPin(lat, lng, zoomTo) {
    picked = { lat: lat, lng: lng };
    if (marker) { marker.setLatLng([lat, lng]); }
    else { marker = L.marker([lat, lng], { draggable: true }).addTo(map); marker.on('dragend', function () { var p = marker.getLatLng(); setPin(p.lat, p.lng, false); }); }
    if (zoomTo) map.setView([lat, lng], Math.max(map.getZoom(), 14));
    coordsEl.textContent = fmt(lat, lng);
    useBtn.disabled = false;
  }

  function initMap() {
    if (map) return;
    var el = dialog.querySelector('[data-locator-map]');
    el.querySelector('.locator__loading') && el.querySelector('.locator__loading').remove();
    map = L.map(el).setView([39.5, -98.35], 4); /* continental US */
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    map.on('click', function (e) { setPin(e.latlng.lat, e.latlng.lng, false); });
  }

  function geocode(q) {
    if (!q.trim()) return;
    fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (results) {
        if (results && results.length) {
          setPin(parseFloat(results[0].lat), parseFloat(results[0].lon), true);
        } else {
          coordsEl.textContent = 'Place not found — try the map';
        }
      })
      .catch(function () { coordsEl.textContent = 'Search unavailable — tap the map instead'; });
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-locator-open]')) {
      dialog.showModal();
      loadLeaflet().then(function () {
        initMap();
        setTimeout(function () { map.invalidateSize(); }, 60);
      });
    }
    if (e.target.closest('[data-locator-close]')) dialog.close();
    if (e.target.closest('[data-locator-go]')) geocode(searchInput.value);
    if (e.target.closest('[data-locator-use]') && picked) {
      var input = engraveTarget();
      var propLatLng = document.querySelector('[data-prop-latlng]');
      var propPlace = document.querySelector('[data-prop-place]');
      var propMap = document.querySelector('[data-prop-maplink]');
      if (input) {
        input.value = fmt(picked.lat, picked.lng);
        input.dataset.fromLocator = '1';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        delete input.dataset.fromLocator;
      }
      /* backend-only order properties: exact decimals, the search term,
         and a verification map link for the engraving team */
      if (propLatLng) propLatLng.value = picked.lat.toFixed(6) + ', ' + picked.lng.toFixed(6);
      if (propPlace) propPlace.value = searchInput.value.trim();
      if (propMap) propMap.value = 'https://www.openstreetmap.org/?mlat=' + picked.lat.toFixed(6) + '&mlon=' + picked.lng.toFixed(6) + '#map=16/' + picked.lat.toFixed(6) + '/' + picked.lng.toFixed(6);
      dialog.close();
      if (input) input.focus();
    }
  });

  searchInput && searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); geocode(searchInput.value); }
  });

  /* close on backdrop click */
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });
})();

/* ---------- vertical 4-side bar product template ---------- */
(function () {
  'use strict';
  var rig = document.querySelector('[data-vertical-engraving]');
  var root = document.querySelector('[data-product-vertical]');
  if (!rig || !root) return;

  /* per-side live previews */
  for (var i = 1; i <= 4; i++) {
    (function (side) {
      var input = rig.querySelector('[data-engrave-input-side="' + side + '"]');
      var preview = rig.querySelector('[data-vertical-preview="' + side + '"]');
      if (!input || !preview) return;
      var placeholder = side === 1 ? (preview.dataset.placeholder || '') : '· · ·';
      var render = function () {
        var val = input.value.trim();
        preview.textContent = val || placeholder;
        preview.style.opacity = val ? '1' : '0.4';
      };
      input.addEventListener('input', render);
      render();
    })(i);
  }

  /* variant option like "2 sides" controls how many sides are active */
  function syncSides() {
    var sides = 4;
    root.querySelectorAll('[data-option-index] input:checked').forEach(function (radio) {
      var m = radio.value.match(/(\d)\s*side/i);
      if (m) sides = parseInt(m[1], 10);
    });
    rig.dataset.activeSides = sides;
  }
  root.addEventListener('change', function (e) {
    if (e.target.closest('[data-option-index]')) syncSides();
  });
  syncSides();

  /* side 1 must be filled before add to cart */
  var form = root.querySelector('form[data-product-form]');
  var side1 = rig.querySelector('[data-engrave-input-side="1"]');
  if (form && side1) {
    form.addEventListener('submit', function (e) {
      if (!side1.value.trim()) {
        e.preventDefault();
        side1.focus();
        side1.setCustomValidity('Add your engraving for side 1 — coordinates, a name, or a date.');
        side1.reportValidity();
        side1.addEventListener('input', function () { side1.setCustomValidity(''); }, { once: true });
      }
    });
  }
})();


/* ============================================================
   ENGRAVING PREVIEW SYSTEM
   Handles live text updates for all preview types:
   horizontal-bar, vertical-bar, ring, bracelet, four-sided, dog-tag.
   ============================================================ */
(function () {
  'use strict';
  var root = document.querySelector('[data-product]');
  if (!root) return;
  var previewType = root.dataset.previewType || 'horizontal-bar';

  /* ---- STANDARD SINGLE-INPUT PREVIEWS ---- */
  /* Covers: horizontal-bar, vertical-bar, ring, bracelet */
  if (['horizontal-bar', 'vertical-bar', 'ring', 'bracelet'].indexOf(previewType) !== -1) {
    var input = root.querySelector('[data-engrave-input]');
    var previews = root.querySelectorAll('[data-engrave-preview]');
    var counter = root.querySelector('[data-engrave-count]');
    if (!input || !previews.length) return;

    var placeholder = (previews[0].dataset && previews[0].dataset.placeholder) || '27.7676° N, 82.6403° W';

    function renderSingle() {
      var val = input.value.trim();
      previews.forEach(function (el) {
        /* SVG <text> uses textContent, <textPath> also uses textContent */
        el.textContent = val || placeholder;
        el.style.opacity = val ? '1' : '0.4';
      });
      if (counter) counter.textContent = input.value.length + ' / ' + input.maxLength;
      /* manual edits invalidate locator data */
      if (!input.dataset.fromLocator) {
        ['[data-prop-latlng]', '[data-prop-place]', '[data-prop-maplink]'].forEach(function (sel) {
          var el = document.querySelector(sel);
          if (el) el.value = '';
        });
      }
    }
    input.addEventListener('input', renderSingle);
    renderSingle();

    /* require engraving before ATC */
    var form = root.querySelector('form[data-product-form]');
    if (form && input.required) {
      form.addEventListener('submit', function (e) {
        if (!input.value.trim()) {
          e.preventDefault();
          input.focus();
          input.setCustomValidity('Add your coordinates or message so we can engrave it.');
          input.reportValidity();
          input.addEventListener('input', function () { input.setCustomValidity(''); }, { once: true });
        }
      });
    }
  }

  /* ---- DOG TAG (multi-line) ---- */
  if (previewType === 'dog-tag') {
    var dtInputs = root.querySelectorAll('[data-dt-input]');
    var counter = root.querySelector('[data-engrave-count]');

    dtInputs.forEach(function (inp) {
      var lineNum = inp.dataset.dtInput;
      var preview = root.querySelector('[data-dt-line="' + lineNum + '"]');
      if (!inp || !preview) return;
      var placeholder = preview.dataset.placeholder || '';

      inp.addEventListener('input', function () {
        var val = inp.value.trim();
        preview.textContent = val || placeholder || '—';
        preview.style.opacity = val ? '1' : '0.4';
        if (!inp.dataset.fromLocator) {
          ['[data-prop-latlng]', '[data-prop-place]', '[data-prop-maplink]'].forEach(function (sel) {
            var el = document.querySelector(sel);
            if (el) el.value = '';
          });
        }
        /* update counter on line 1 */
        if (lineNum === '1' && counter) counter.textContent = inp.value.length + ' / ' + inp.maxLength;
      });
      /* initial render */
      preview.textContent = inp.value.trim() || placeholder || '—';
      preview.style.opacity = inp.value.trim() ? '1' : '0.4';
    });

    /* locator auto-fills: split lat/lng into line 1 + line 2 */
    var mainInput = root.querySelector('[data-engrave-input]'); /* line 1 has both attrs */
    if (mainInput) {
      var origDispatch = mainInput.dispatchEvent.bind(mainInput);
      /* After locator sets value like "27.7676° N, 82.6403° W", split it */
      mainInput.addEventListener('input', function () {
        if (mainInput.dataset.fromLocator) {
          var parts = mainInput.value.split(',').map(function (s) { return s.trim(); });
          if (parts.length >= 2) {
            var line1 = root.querySelector('[data-dt-input="1"]');
            var line2 = root.querySelector('[data-dt-input="2"]');
            if (line1) { line1.value = parts[0]; line1.dispatchEvent(new Event('input', { bubbles: true })); }
            if (line2) { line2.value = parts.slice(1).join(', '); line2.dispatchEvent(new Event('input', { bubbles: true })); }
          }
        }
      });
    }

    /* require line 1 before ATC */
    var form = root.querySelector('form[data-product-form]');
    var line1 = root.querySelector('[data-dt-input="1"]');
    if (form && line1 && line1.required) {
      form.addEventListener('submit', function (e) {
        if (!line1.value.trim()) {
          e.preventDefault();
          line1.focus();
          line1.setCustomValidity('Add your coordinates for line 1.');
          line1.reportValidity();
          line1.addEventListener('input', function () { line1.setCustomValidity(''); }, { once: true });
        }
      });
    }
  }

  /* ---- FOUR-SIDED BAR ---- */
  if (previewType === 'four-sided') {
    var rig = root.querySelector('[data-four-sided-engraving]');
    if (!rig) return;

    /* side count picker */
    var sideRadios = rig.querySelectorAll('[data-side-count-picker] input[type="radio"]');
    function getActiveSides() {
      var count = 2;
      sideRadios.forEach(function (r) { if (r.checked) count = parseInt(r.value, 10); });
      return count;
    }

    function syncSideVisibility() {
      var active = getActiveSides();
      for (var s = 1; s <= 4; s++) {
        var field = rig.querySelector('[data-side-field="' + s + '"]');
        var face = rig.querySelector('[data-face="' + s + '"]');
        if (field) field.style.display = s <= active ? '' : 'none';
        if (face) face.dataset.faceActive = s <= active ? 'true' : 'false';
      }
    }

    sideRadios.forEach(function (r) {
      r.addEventListener('change', syncSideVisibility);
    });
    syncSideVisibility();

    /* per-side live preview */
    for (var i = 1; i <= 4; i++) {
      (function (side) {
        var inp = rig.querySelector('[data-engrave-input-side="' + side + '"]');
        var preview = rig.querySelector('[data-four-preview="' + side + '"]');
        if (!inp || !preview) return;
        var ph = side === 1 ? (preview.dataset.placeholder || '') : 'Side ' + side;

        function renderSide() {
          var val = inp.value.trim();
          preview.textContent = val || ph;
          preview.style.opacity = val ? '1' : '0.4';
        }
        inp.addEventListener('input', renderSide);
        renderSide();
      })(i);
    }

    /* locator auto-fills: split lat/lng into front (side 1) + back (side 2) */
    var side1Input = rig.querySelector('[data-engrave-input-side="1"]');
    if (side1Input) {
      side1Input.addEventListener('input', function () {
        if (side1Input.dataset.fromLocator) {
          var parts = side1Input.value.split(',').map(function (s) { return s.trim(); });
          if (parts.length >= 2) {
            side1Input.value = parts[0]; /* latitude on front */
            var side2Input = rig.querySelector('[data-engrave-input-side="2"]');
            if (side2Input) {
              side2Input.value = parts.slice(1).join(', '); /* longitude on back */
              side2Input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            /* ensure 2 sides minimum */
            var twoSideRadio = rig.querySelector('[data-side-count-picker] input[value="2"]');
            if (twoSideRadio && getActiveSides() < 2) {
              twoSideRadio.checked = true;
              syncSideVisibility();
            }
          }
        }
      });
    }

    /* require side 1 before ATC */
    var form = root.querySelector('form[data-product-form]');
    if (form && side1Input) {
      form.addEventListener('submit', function (e) {
        if (side1Input.required && !side1Input.value.trim()) {
          e.preventDefault();
          side1Input.focus();
          side1Input.setCustomValidity('Add your engraving for the front side.');
          side1Input.reportValidity();
          side1Input.addEventListener('input', function () { side1Input.setCustomValidity(''); }, { once: true });
        }
      });
    }
  }
})();


/* ============================================================
   COORDINATES SET — multi-piece synchronized engraving preview
   ============================================================ */
(function () {
  'use strict';
  var root = document.querySelector('[data-product]');
  if (!root) return;
  var previewType = root.dataset.previewType || '';
  if (previewType !== 'coordinates-set') return;

  var setRig = root.querySelector('[data-set-engraving]');
  if (!setRig) return;

  var mainInput = setRig.querySelector('[data-set-sync]');
  var unifiedDiv = setRig.querySelector('[data-set-unified]');
  var counter = setRig.querySelector('[data-engrave-count]');
  var customToggle = setRig.querySelector('[data-set-customize]');
  var allPreviews = setRig.querySelectorAll('[data-set-preview]');
  var allPieceProps = setRig.querySelectorAll('[data-set-piece-prop]');
  var allPieceInputs = setRig.querySelectorAll('[data-set-piece-input]');
  var isCustomMode = false;

  /* ---- helpers ---- */
  function getPlaceholder(el) {
    return (el && el.dataset && el.dataset.placeholder) || '27.7676\u00B0 N, 82.6403\u00B0 W';
  }

  function updatePreview(piece, val) {
    allPreviews.forEach(function (el) {
      if (el.dataset.setPreview === piece) {
        el.textContent = val || getPlaceholder(el);
        el.style.opacity = val ? '1' : '0.4';
      }
    });
  }

  function updateAllPreviews(val) {
    allPreviews.forEach(function (el) {
      el.textContent = val || getPlaceholder(el);
      el.style.opacity = val ? '1' : '0.4';
    });
  }

  function syncPieceProps(val) {
    allPieceProps.forEach(function (el) { el.value = val; });
  }

  /* ---- UNIFIED MODE (default) ---- */
  function renderUnified() {
    var val = mainInput.value.trim();
    updateAllPreviews(val);
    syncPieceProps(val);
    if (counter) counter.textContent = mainInput.value.length + ' / ' + mainInput.maxLength;
    /* invalidate locator data on manual edit */
    if (!mainInput.dataset.fromLocator) {
      ['[data-prop-latlng]', '[data-prop-place]', '[data-prop-maplink]'].forEach(function (sel) {
        var el = setRig.querySelector(sel);
        if (el) el.value = '';
      });
    }
  }
  if (mainInput) {
    mainInput.addEventListener('input', function () {
      if (!isCustomMode) renderUnified();
    });
    renderUnified();
  }

  /* ---- PER-PIECE MODE ---- */
  allPieceInputs.forEach(function (inp) {
    var piece = inp.dataset.setPieceInput;
    inp.addEventListener('input', function () {
      if (!isCustomMode) return;
      var val = inp.value.trim();
      updatePreview(piece, val);
      /* sync to corresponding hidden prop */
      var prop = setRig.querySelector('[data-set-piece-prop="' + piece + '"]');
      if (prop) prop.value = val;
    });
  });

  /* ---- TOGGLE between modes ---- */
  if (customToggle) {
    customToggle.addEventListener('toggle', function () {
      isCustomMode = customToggle.open;
      if (isCustomMode) {
        /* switching TO per-piece: pre-fill from main, hide unified */
        var val = mainInput ? mainInput.value : '';
        allPieceInputs.forEach(function (inp) {
          if (!inp.value) inp.value = val;
          var piece = inp.dataset.setPieceInput;
          updatePreview(piece, inp.value.trim());
          var prop = setRig.querySelector('[data-set-piece-prop="' + piece + '"]');
          if (prop) prop.value = inp.value.trim();
        });
        if (unifiedDiv) unifiedDiv.style.display = 'none';
        if (mainInput) {
          mainInput.removeAttribute('required');
          mainInput.removeAttribute('name');
        }
      } else {
        /* switching BACK to unified: sync first piece value, show unified */
        if (unifiedDiv) unifiedDiv.style.display = '';
        var firstInp = allPieceInputs[0];
        if (mainInput && firstInp) {
          mainInput.value = firstInp.value;
          mainInput.setAttribute('name', 'properties[Engraving]');
          if (setRig.closest('[data-product]')) {
            var origRequired = mainInput.dataset.origRequired;
            if (origRequired === 'true') mainInput.required = true;
          }
        }
        renderUnified();
      }
    });
  }

  /* remember original required state */
  if (mainInput && mainInput.required) mainInput.dataset.origRequired = 'true';

  /* ---- FORM VALIDATION ---- */
  var form = root.querySelector('form[data-product-form]');
  if (form) {
    form.addEventListener('submit', function (e) {
      if (isCustomMode) {
        /* require all visible per-piece inputs */
        var missing = false;
        allPieceInputs.forEach(function (inp) {
          if (!inp.value.trim()) {
            e.preventDefault();
            if (!missing) { inp.focus(); inp.setCustomValidity('Add coordinates for this piece.'); inp.reportValidity(); }
            missing = true;
            inp.addEventListener('input', function () { inp.setCustomValidity(''); }, { once: true });
          }
        });
      } else {
        /* unified: require main input */
        if (mainInput && mainInput.dataset.origRequired === 'true' && !mainInput.value.trim()) {
          e.preventDefault();
          mainInput.focus();
          mainInput.setCustomValidity('Add your coordinates so we can engrave the set.');
          mainInput.reportValidity();
          mainInput.addEventListener('input', function () { mainInput.setCustomValidity(''); }, { once: true });
        }
      }
    });
  }
})();
