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

    /* recolor every engraving preview to the chosen metal */
    function syncMetal() {
      var metal = '';
      currentOptions().forEach(function (val) {
        if (!val) return;
        var v = val.toLowerCase();
        if (/rose/.test(v)) metal = 'rose-gold';
        else if (!metal && /gold|brass/.test(v)) metal = 'gold';
        else if (!metal && /silver|steel|stainless|platinum/.test(v)) metal = 'silver';
        else if (!metal && /black|gunmetal|graphite|onyx/.test(v)) metal = 'black';
      });
      if (metal) root.dataset.metal = metal;
      else delete root.dataset.metal;
    }

    function updateVariant() {
      var v = matchVariant();
      syncMetal();
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
          if (btn.dataset.fullSrcset) mainImg.srcset = btn.dataset.fullSrcset;
          else mainImg.removeAttribute('srcset');
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

  /* long engravings compress to the bar instead of spilling off it,
     so the preview always shows what physically fits */
  function clampFit(el, textLength) {
    var fit = el.dataset.fit;
    var chars = parseInt(el.dataset.fitChars || '0', 10);
    if (!fit || !chars) return;
    if (textLength > chars) el.setAttribute('textLength', fit);
    else el.removeAttribute('textLength');
  }

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
        clampFit(el, (val || placeholder).length);
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
        clampFit(preview, (val || placeholder).length);
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
      clampFit(preview, (inp.value.trim() || placeholder).length);
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

    /* Side count follows the product variant when one of the variant
       options is a side count ("2 Sides") — the same control that sets
       the price. The rig's own picker only exists for products without
       such an option (data-sides-source="manual"). */
    var variantDriven = rig.dataset.sidesSource === 'variant';
    var sideRadios = rig.querySelectorAll('[data-side-count-picker] input[type="radio"]');
    var counter = rig.querySelector('[data-engrave-count]');
    var tip = rig.querySelector('[data-four-tip]');

    /* Liquid already identified WHICH option is the side count
       (data-sides-option), so accept any value format it can carry:
       "2 Sides", "2", "4-sided" — first digit 1–4 wins. */
    function sidesFromVariant() {
      var group = root.querySelector('[data-option-index="' + rig.dataset.sidesOption + '"]');
      var checked = group && group.querySelector('input:checked');
      if (!checked) return 0;
      var m = checked.value.match(/[1-4]/);
      return m ? parseInt(m[0], 10) : 0;
    }

    function sidesFromPicker() {
      var count = 2;
      sideRadios.forEach(function (r) { if (r.checked) count = parseInt(r.value, 10); });
      return count;
    }

    function getActiveSides() {
      if (variantDriven) {
        return sidesFromVariant() || parseInt(rig.dataset.activeSides || '2', 10);
      }
      return sidesFromPicker();
    }

    function syncSideVisibility() {
      var active = getActiveSides();
      rig.dataset.activeSides = active;
      for (var s = 1; s <= 4; s++) {
        var field = rig.querySelector('[data-side-field="' + s + '"]');
        var face = rig.querySelector('[data-face="' + s + '"]');
        var input = rig.querySelector('[data-engrave-input-side="' + s + '"]');
        if (field) field.style.display = s <= active ? '' : 'none';
        if (face) face.dataset.faceActive = s <= active ? 'true' : 'false';
        /* disabled inputs never submit: a hidden side can't ride along
           into the cart on a variant the shopper didn't pay for */
        if (input) input.disabled = s > active;
      }
      var hint = rig.querySelector('[data-four-hint]');
      if (hint) hint.textContent = 'Live preview — one pendant, engraved on ' + active + (active === 1 ? ' side' : ' sides');
      if (tip && active >= 2) tip.hidden = true;
    }

    if (variantDriven) {
      root.addEventListener('change', function (e) {
        if (e.target.closest('[data-option-index]')) syncSideVisibility();
      });
    }
    sideRadios.forEach(function (r) {
      r.addEventListener('change', syncSideVisibility);
    });
    syncSideVisibility();

    /* per-side live preview + shared counter follows whichever side is edited */
    for (var i = 1; i <= 4; i++) {
      (function (side) {
        var inp = rig.querySelector('[data-engrave-input-side="' + side + '"]');
        var preview = rig.querySelector('[data-four-preview="' + side + '"]');
        if (!inp || !preview) return;
        var ph = preview.dataset.placeholder || (side === 1 ? '' : '· · ·');

        function renderSide() {
          var val = inp.value.trim();
          preview.textContent = val || ph;
          preview.style.opacity = val ? '1' : '0.4';
          clampFit(preview, (val || ph).length);
        }
        inp.addEventListener('input', function () {
          renderSide();
          if (counter) counter.textContent = inp.value.length + ' / ' + inp.maxLength;
        });
        inp.addEventListener('focus', function () {
          if (counter) counter.textContent = inp.value.length + ' / ' + inp.maxLength;
        });
        renderSide();
      })(i);
    }

    /* locator auto-fill: split lat/lng across front + back when the
       shopper's variant includes 2+ sides; otherwise keep the full pair
       on the front and suggest the two-sided option instead of silently
       switching them to a different price */
    var side1Input = rig.querySelector('[data-engrave-input-side="1"]');
    if (side1Input) {
      side1Input.addEventListener('input', function () {
        if (!side1Input.dataset.fromLocator) return;
        var parts = side1Input.value.split(',').map(function (s) { return s.trim(); });
        if (parts.length < 2) return;
        if (getActiveSides() >= 2) {
          side1Input.value = parts[0]; /* latitude on front */
          /* re-dispatch so side 1's preview redraws with just the latitude;
             the second pass finds no comma and returns immediately */
          side1Input.dispatchEvent(new Event('input', { bubbles: true }));
          var side2Input = rig.querySelector('[data-engrave-input-side="2"]');
          if (side2Input) {
            side2Input.value = parts.slice(1).join(', '); /* longitude on back */
            side2Input.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (tip) tip.hidden = true;
        } else if (tip) {
          tip.hidden = false;
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

  function clampFit(el, textLength) {
    var fit = el.dataset.fit;
    var chars = parseInt(el.dataset.fitChars || '0', 10);
    if (!fit || !chars) return;
    if (textLength > chars) el.setAttribute('textLength', fit);
    else el.removeAttribute('textLength');
  }

  function updatePreview(piece, val) {
    allPreviews.forEach(function (el) {
      if (el.dataset.setPreview === piece) {
        el.textContent = val || getPlaceholder(el);
        el.style.opacity = val ? '1' : '0.4';
        clampFit(el, (val || getPlaceholder(el)).length);
      }
    });
  }

  function updateAllPreviews(val) {
    allPreviews.forEach(function (el) {
      el.textContent = val || getPlaceholder(el);
      el.style.opacity = val ? '1' : '0.4';
      clampFit(el, (val || getPlaceholder(el)).length);
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


/* ============================================================
   CART DRAWER
   AJAX add-to-cart + Section Rendering API. Liquid stays the
   source of truth: every mutation re-renders the drawer section
   server-side and this code only swaps the HTML in.
   Registered AFTER the validation IIFEs above, so an invalid
   engraving (e.defaultPrevented) never reaches the network.
   ============================================================ */
(function () {
  'use strict';
  var drawer = document.querySelector('[data-cart-drawer]');
  if (!drawer) return; /* drawer disabled → classic /cart flow */

  var SECTION_ID = 'cart-drawer';
  var urlAdd = (drawer.dataset.urlAdd || '/cart/add') + '.js';
  var urlChange = (drawer.dataset.urlChange || '/cart/change') + '.js';
  var urlUpdate = (drawer.dataset.urlUpdate || '/cart/update') + '.js';
  var urlRoot = drawer.dataset.urlRoot || '/';
  var busy = false;

  /* the gift-wrap add-on only works with this code, so only now reveal it */
  document.querySelectorAll('[data-gift-wrap-addon]').forEach(function (el) {
    el.hidden = false;
  });

  function inner() { return drawer.querySelector('[data-drawer-inner]'); }

  function announce(msg) {
    var live = document.querySelector('[data-cart-live]');
    if (live) live.textContent = msg;
  }

  function syncHeaderCount() {
    var el = inner();
    if (!el) return;
    var count = el.dataset.cartItemCount || '0';
    document.querySelectorAll('[data-cart-count]').forEach(function (badge) {
      badge.textContent = count;
    });
  }

  function swapInner(sectionHtml) {
    var doc = new DOMParser().parseFromString(sectionHtml, 'text/html');
    var fresh = doc.querySelector('[data-drawer-inner]');
    var current = inner();
    if (fresh && current) {
      current.replaceWith(fresh);
      syncHeaderCount();
      if (drawer.open) {
        var closeBtn = drawer.querySelector('[data-drawer-close]');
        if (closeBtn) closeBtn.focus();
      }
    }
  }

  function refresh() {
    return fetch(urlRoot + '?sections=' + SECTION_ID)
      .then(function (r) { return r.json(); })
      .then(function (data) { if (data && data[SECTION_ID]) swapInner(data[SECTION_ID]); })
      .catch(function () {});
  }

  function openDrawer() {
    if (!drawer.open) drawer.showModal();
    var closeBtn = drawer.querySelector('[data-drawer-close]');
    if (closeBtn) closeBtn.focus();
  }

  function setLoading(on) {
    busy = on;
    drawer.classList.toggle('is-loading', on);
    var el = inner();
    if (el) el.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  /* ---- mutations ---- */
  function changeLine(line, quantity) {
    if (busy) return;
    setLoading(true);
    fetch(urlChange, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ line: line, quantity: quantity, sections: SECTION_ID })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.sections && data.sections[SECTION_ID]) swapInner(data.sections[SECTION_ID]);
        else return refresh();
      })
      .then(function () { announce('Cart updated'); })
      .catch(function () { return refresh(); })
      .finally(function () { setLoading(false); });
  }

  function quickAdd(variantId) {
    if (busy) return;
    setLoading(true);
    fetch(urlAdd, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: [{ id: parseInt(variantId, 10), quantity: 1 }], sections: SECTION_ID })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.sections && data.sections[SECTION_ID]) swapInner(data.sections[SECTION_ID]);
        else return refresh();
      })
      .then(function () { announce('Added to cart'); })
      .catch(function () { return refresh(); })
      .finally(function () { setLoading(false); });
  }

  /* ---- add-to-cart from any product form ---- */
  function showFormError(form, message) {
    var err = form.querySelector('[data-atc-error]');
    if (!err) {
      err = document.createElement('p');
      err.setAttribute('data-atc-error', '');
      err.className = 'atc-error';
      err.setAttribute('role', 'alert');
      var atc = form.querySelector('[data-atc]');
      if (atc) atc.insertAdjacentElement('beforebegin', err);
      else form.appendChild(err);
    }
    err.textContent = message;
    err.hidden = false;
    setTimeout(function () { err.hidden = true; }, 6000);
  }

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.matches || !form.matches('form[data-product-form]')) return;
    if (e.defaultPrevented) return; /* engraving validation already blocked it */
    e.preventDefault();

    var atcBtns = document.querySelectorAll('[data-atc]');
    atcBtns.forEach(function (b) { b.disabled = true; });

    var giftWrap = form.querySelector('[data-gift-wrap]:checked');
    var pre = Promise.resolve();
    if (giftWrap) {
      /* add the gift packaging first so one drawer render shows both */
      pre = fetch(urlAdd, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ items: [{ id: parseInt(giftWrap.value, 10), quantity: 1 }] })
      }).catch(function () {});
    }

    var fd = new FormData(form);
    fd.append('sections', SECTION_ID);

    pre
      .then(function () {
        return fetch(urlAdd, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: fd
        });
      })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        if (!res.ok) {
          showFormError(form, res.data.description || res.data.message || 'Could not add to cart — please try again.');
          return refresh();
        }
        if (res.data.sections && res.data.sections[SECTION_ID]) swapInner(res.data.sections[SECTION_ID]);
        announce('Added to cart');
        atcBtns.forEach(function (b) {
          var label = b.querySelector('[data-atc-label]');
          if (label) {
            label.dataset.restore = label.textContent;
            label.textContent = 'Added ✓';
            setTimeout(function () {
              if (label.dataset.restore) { label.textContent = label.dataset.restore; delete label.dataset.restore; }
            }, 2200);
          }
        });
        openDrawer();
      })
      .catch(function () {
        /* network hiccup → fall back to the classic cart page */
        window.location.href = urlRoot.replace(/\/$/, '') + '/cart';
      })
      .finally(function () {
        atcBtns.forEach(function (b) { b.disabled = false; });
      });
  });

  /* ---- delegated clicks ---- */
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-cart-open]');
    if (opener) {
      e.preventDefault();
      openDrawer();
      refresh(); /* re-sync in the background in case the cart changed elsewhere */
      return;
    }
    if (e.target.closest('[data-drawer-close]')) { drawer.close(); return; }

    var add = e.target.closest('[data-drawer-add]');
    if (add) { quickAdd(add.dataset.drawerAdd); return; }

    var qtyBtn = e.target.closest('[data-drawer-qty]');
    if (qtyBtn) {
      var wrap = qtyBtn.closest('[data-line-qty]');
      var current = wrap ? parseInt(wrap.dataset.lineQty, 10) : 1;
      var next = qtyBtn.dataset.drawerQty === 'up' ? current + 1 : current - 1;
      changeLine(parseInt(qtyBtn.dataset.line, 10), Math.max(0, next));
      return;
    }

    var removeBtn = e.target.closest('[data-drawer-remove]');
    if (removeBtn) { changeLine(parseInt(removeBtn.dataset.line, 10), 0); return; }
  });

  /* close on backdrop click, mirroring the locator dialog */
  drawer.addEventListener('click', function (e) {
    if (e.target === drawer) drawer.close();
  });

  /* persist the gift note as soon as the customer leaves the field */
  document.addEventListener('change', function (e) {
    if (!e.target.matches || !e.target.matches('[data-drawer-note]')) return;
    fetch(urlUpdate, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ note: e.target.value })
    }).catch(function () {});
  });

  /* returning from checkout via back button: bfcache serves stale HTML */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) refresh();
  });
})();


/* ============================================================
   RECENTLY VIEWED — localStorage handles, cards fetched from
   /products/{handle}.js. Built with createElement (no innerHTML).
   ============================================================ */
(function () {
  'use strict';
  var section = document.querySelector('[data-recently-viewed]');
  if (!section) return;

  var KEY = 'oc:recently-viewed';
  var current = section.dataset.currentHandle;
  var grid = section.querySelector('[data-rv-grid]');

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (err) { return []; }
  }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (err) { /* private mode */ }
  }

  function money(cents) {
    return '$' + (cents / 100).toFixed(2).replace(/\.00$/, '');
  }

  function sizedImage(src, width) {
    if (!src) return '';
    return src + (src.indexOf('?') === -1 ? '?' : '&') + 'width=' + width;
  }

  function card(p) {
    var a = document.createElement('a');
    a.className = 'product-card';
    a.href = '/products/' + p.handle;

    var media = document.createElement('div');
    media.className = 'product-card__media';
    if (p.featured_image) {
      var img = document.createElement('img');
      img.src = sizedImage(p.featured_image, 600);
      img.alt = p.title;
      img.loading = 'lazy';
      img.width = 600;
      img.height = 600;
      media.appendChild(img);
    }
    var corners = document.createElement('span');
    corners.className = 'product-card__corners';
    corners.setAttribute('aria-hidden', 'true');
    media.appendChild(corners);
    a.appendChild(media);

    var title = document.createElement('p');
    title.className = 'product-card__title';
    title.textContent = p.title;
    a.appendChild(title);

    var price = document.createElement('p');
    price.className = 'product-card__price';
    price.textContent = money(p.price);
    a.appendChild(price);

    return a;
  }

  /* render up to 4 previously seen products (excluding this one) */
  var seen = read().filter(function (h) { return h && h !== current; }).slice(0, 4);
  var pending = seen.length;
  seen.forEach(function (handle) {
    fetch('/products/' + encodeURIComponent(handle) + '.js')
      .then(function (r) { if (!r.ok) throw new Error('gone'); return r.json(); })
      .then(function (p) {
        if (p.available === false) return;
        grid.appendChild(card(p));
        section.hidden = false;
      })
      .catch(function () {})
      .finally(function () {
        pending -= 1;
        /* prune handles that 404ed so they stop taking up slots */
        if (pending === 0 && grid.children.length === 0) section.hidden = true;
      });
  });

  /* record this visit last, so the strip never shows the current product */
  var list = read().filter(function (h) { return h && h !== current; });
  list.unshift(current);
  write(list.slice(0, 8));
})();


/* ============================================================
   DUO SET — necklace (4-sided pendant) + companion pieces.
   One shared coordinates input is laid out per piece exactly as
   engraved: with 2+ necklace sides available, latitude goes on
   the front and longitude on the back, while flat pieces (cuff,
   keychain…) carry the full pair on one line. Hidden per-target
   properties stay disabled while empty so blank engraving lines
   never reach the order.
   ============================================================ */
(function () {
  'use strict';
  var root = document.querySelector('[data-product]');
  if (!root) return;
  if ((root.dataset.previewType || '') !== 'coordinates-set') return;
  var rig = root.querySelector('[data-set-duo]');
  if (!rig) return; /* legacy sets are handled by the block above */

  var shared = rig.querySelector('[data-duo-shared]');
  var counter = rig.querySelector('[data-engrave-count]');
  var splitNote = rig.querySelector('[data-duo-splitnote]');
  if (!shared) return;

  function facePreview(i) { return rig.querySelector('[data-duo-face="' + i + '"]'); }
  function faceWrap(i) { return rig.querySelector('[data-face="' + i + '"]'); }
  function sideInput(i) { return rig.querySelector('[data-duo-side="' + i + '"]'); }
  function sideField(i) { return rig.querySelector('[data-duo-side-field="' + i + '"]'); }
  function sideProp(i) { return rig.querySelector('[data-duo-prop="' + i + '"]'); }

  function clampFit(el, textLength) {
    var fit = el.dataset.fit;
    var chars = parseInt(el.dataset.fitChars || '0', 10);
    if (!fit || !chars) return;
    if (textLength > chars) el.setAttribute('textLength', fit);
    else el.removeAttribute('textLength');
  }

  function setText(el, val) {
    if (!el) return;
    var ph = el.dataset.placeholder || '';
    el.textContent = val || ph;
    el.style.opacity = val ? '1' : '0.4';
    clampFit(el, (val || ph).length);
  }

  /* hidden order properties submit only when they carry text */
  function setProp(el, val) {
    if (!el) return;
    el.value = val;
    el.disabled = !val;
  }

  /* how many necklace sides the current variant allows (4 when the
     set has no sides option) */
  function maxSides() {
    var optIndex = rig.dataset.sidesOption;
    if (optIndex === '-1' || optIndex == null) return 4;
    var group = root.querySelector('[data-option-index="' + optIndex + '"]');
    var checked = group && group.querySelector('input:checked');
    if (!checked) return parseInt(rig.dataset.maxSides || '4', 10);
    var m = checked.value.match(/[1-4]/);
    return m ? parseInt(m[0], 10) : parseInt(rig.dataset.maxSides || '4', 10);
  }

  function render() {
    var v = shared.value.trim();
    var allowed = maxSides();
    rig.dataset.maxSides = allowed;

    /* split "lat, lng" across front/back unless the shopper typed
       their own back line or the variant only includes one side */
    var comma = v.indexOf(',');
    var backTyped = sideInput(2) && sideInput(2).value.trim();
    var split = comma > -1 && allowed >= 2 && !backTyped;
    var front = split ? v.slice(0, comma).trim() : v;
    var texts = {
      1: front,
      2: split ? v.slice(comma + 1).trim() : (backTyped || ''),
      3: sideInput(3) ? sideInput(3).value.trim() : '',
      4: sideInput(4) ? sideInput(4).value.trim() : ''
    };

    for (var i = 1; i <= 4; i++) {
      var inBudget = i <= allowed;
      setText(facePreview(i), inBudget ? texts[i] : '');
      var wrap = faceWrap(i);
      if (wrap) {
        /* front and back read as "yours" by default; 3/4 light up when used */
        var active = inBudget && (i <= 2 || !!texts[i]);
        wrap.dataset.faceActive = active ? 'true' : 'false';
      }
      setProp(sideProp(i), inBudget ? texts[i] : '');
      if (i >= 2) {
        var field = sideField(i);
        var input = sideInput(i);
        /* the back field hides while the split fills it automatically */
        var hideField = !inBudget || (i === 2 && split);
        if (field) field.style.display = hideField ? 'none' : '';
        if (input) input.disabled = !inBudget;
      }
    }

    if (splitNote) splitNote.hidden = !split;

    /* companion pieces mirror the full pair unless overridden */
    rig.querySelectorAll('[data-duo-piece-prop]').forEach(function (prop) {
      var piece = prop.dataset.duoPieceProp;
      var override = rig.querySelector('[data-duo-override="' + piece + '"]');
      var val = (override && override.value.trim()) || v;
      setProp(prop, val);
      rig.querySelectorAll('[data-set-preview="' + piece + '"]').forEach(function (el) {
        setText(el, val);
      });
      if (override && !override.value) override.placeholder = v || override.dataset.origPlaceholder || '';
    });

    if (counter) counter.textContent = shared.value.length + ' / ' + shared.maxLength;
  }

  rig.querySelectorAll('[data-duo-override]').forEach(function (el) {
    el.dataset.origPlaceholder = el.placeholder;
  });

  shared.addEventListener('input', function () {
    render();
    /* manual edits invalidate locator-pinned coordinates */
    if (!shared.dataset.fromLocator) {
      ['[data-prop-latlng]', '[data-prop-place]', '[data-prop-maplink]'].forEach(function (sel) {
        var el = rig.querySelector(sel);
        if (el) el.value = '';
      });
    }
  });

  rig.addEventListener('input', function (e) {
    if (e.target.matches('[data-duo-side], [data-duo-override]')) render();
  });

  /* variant switches can change the allowed side count */
  root.addEventListener('change', function (e) {
    if (e.target.closest('[data-option-index]')) render();
  });

  render();

  /* require the shared coordinates before add to cart */
  var form = root.querySelector('form[data-product-form]');
  if (form && shared.required) {
    form.addEventListener('submit', function (e) {
      if (!shared.value.trim()) {
        e.preventDefault();
        shared.focus();
        shared.setCustomValidity('Add your coordinates so we can engrave the set.');
        shared.reportValidity();
        shared.addEventListener('input', function () { shared.setCustomValidity(''); }, { once: true });
      }
    });
  }
})();


/* ============================================================
   STAR MAP — the real night sky for a date, time and place.
   Positions are computed, not decorative: local sidereal time
   from the date (time zone approximated from longitude), then
   alt/az for ~100 catalog stars, projected zenith-center onto
   the pendant disc. Constellation segments draw only when both
   endpoint stars are above the horizon.
   ============================================================ */
(function () {
  'use strict';
  var root = document.querySelector('[data-product]');
  if (!root) return;
  if ((root.dataset.previewType || '') !== 'star-map') return;
  var rig = root.querySelector('[data-star-map-engraving]');
  if (!rig) return;

  var dateIn = rig.querySelector('[data-sm-input-date]');
  var timeIn = rig.querySelector('[data-sm-input-time]');
  var locIn = rig.querySelector('[data-sm-input-location]');
  var capIn = rig.querySelector('[data-sm-input-caption]');
  var sky = rig.querySelector('[data-sm-sky]');
  var capText = rig.querySelector('[data-sm-caption]');
  var dateText = rig.querySelector('[data-sm-date]');
  var counter = rig.querySelector('[data-engrave-count]');
  if (!sky) return;

  /* [ra hours, dec deg, magnitude] — J2000, the ~100 brightest stars */
  var STARS = [
    [6.752,-16.72,-1.46],[6.399,-52.70,-0.74],[14.660,-60.83,-0.27],[14.261,19.18,-0.05],
    [18.616,38.78,0.03],[5.278,46.00,0.08],[5.242,-8.20,0.13],[7.655,5.22,0.34],
    [1.629,-57.24,0.46],[5.919,7.41,0.50],[14.064,-60.37,0.61],[19.846,8.87,0.77],
    [12.443,-63.10,0.76],[4.599,16.51,0.85],[16.490,-26.43,1.09],[13.420,-11.16,0.97],
    [7.755,28.03,1.14],[22.961,-29.62,1.16],[20.690,45.28,1.25],[12.795,-59.69,1.25],
    [10.139,11.97,1.40],[6.977,-28.97,1.50],[7.577,31.89,1.58],[17.560,-37.10,1.62],
    [12.519,-57.11,1.64],[5.418,6.35,1.64],[5.438,28.61,1.68],[9.220,-69.72,1.68],
    [5.604,-1.20,1.69],[22.137,-46.96,1.74],[12.900,55.96,1.77],[5.679,-1.94,1.77],
    [11.062,61.75,1.79],[3.405,49.86,1.79],[7.140,-26.39,1.83],[18.403,-34.38,1.85],
    [13.792,49.31,1.86],[8.375,-59.51,1.86],[17.622,-43.00,1.87],[5.992,44.95,1.90],
    [16.811,-69.03,1.92],[6.629,16.40,1.92],[20.427,-56.74,1.94],[8.745,-54.71,1.96],
    [2.530,89.26,1.98],[6.378,-17.96,1.98],[9.460,-8.66,1.98],[2.120,23.46,2.00],
    [0.726,-17.99,2.02],[13.399,54.93,2.04],[18.921,-26.30,2.06],[14.111,-36.37,2.06],
    [0.140,29.09,2.06],[14.845,74.16,2.08],[17.582,12.56,2.08],[5.796,-9.67,2.09],
    [3.136,40.96,2.12],[11.818,14.57,2.14],[8.158,-47.34,1.78],[9.133,-43.43,2.21],
    [5.533,-0.30,2.23],[20.371,40.26,2.23],[17.943,51.49,2.23],[0.675,56.54,2.24],
    [8.060,-40.00,2.25],[2.065,42.33,2.26],[0.153,59.15,2.27],[16.006,-22.62,2.29],
    [16.836,-34.29,2.29],[11.031,56.38,2.37],[14.750,27.07,2.37],[21.736,9.88,2.39],
    [0.438,-42.31,2.40],[11.897,53.69,2.44],[17.173,-15.72,2.43],[23.063,28.08,2.42],
    [21.310,62.59,2.46],[0.945,60.72,2.47],[23.079,15.21,2.48],[3.038,4.09,2.54],
    [19.043,-29.88,2.60],[15.283,-9.38,2.61],[15.738,6.43,2.62],[1.430,60.24,2.68],
    [18.350,-29.83,2.72],[19.771,10.61,2.72],[12.252,-58.75,2.79],[13.036,10.96,2.83],
    [0.220,15.18,2.83],[21.784,-16.13,2.85],[19.749,45.13,2.87],[21.526,-5.57,2.90],
    [19.512,27.96,3.05],[12.257,57.03,3.31],[1.162,35.62,2.05],[20.770,33.97,2.46],
    [15.578,26.71,2.23],[1.907,63.67,3.38],[12.263,-17.54,2.59],[17.507,52.30,2.79]
  ];
  /* index chains: Big & Little Dipper, Cassiopeia, Orion, Cygnus, Crux +
     pointers, Scorpius, Canis Major, Pegasus square, Andromeda, and
     two-star hints (Gemini, Aquila, Auriga, Taurus, Perseus, Boötes) */
  var LINES = [
    [36,49,30,93,73,69,32,93],[44,53],[66,63,77,83,97],
    [60,28,31],[9,25],[9,31,55],[25,60,6],
    [18,61,92],[90,61,95],[12,24],[19,86],[2,10],
    [67,14,68,38,23],[45,0,21,34],[52,75,78,88,52],[52,94,65],
    [35,84,50,80],[85,11],[22,16],[5,39],[13,26],[33,56],[3,70]
  ];

  var HOME = { lat: 27.7676, lng: -82.6403 }; /* placeholder sky until a place is picked */
  var R = 99, CX = 130, CY = 170;
  var NS = 'http://www.w3.org/2000/svg';
  var MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  function clampFit(el, textLength) {
    var fit = el.dataset.fit;
    var chars = parseInt(el.dataset.fitChars || '0', 10);
    if (!fit || !chars) return;
    if (textLength > chars) el.setAttribute('textLength', fit);
    else el.removeAttribute('textLength');
  }

  /* accepts "27.7676° N, 82.6403° W", "27.7676 N 82.6403 W", "27.7, -82.6" */
  function parseLatLng(str) {
    if (!str) return null;
    var m = str.match(/(-?\d+(?:\.\d+)?)\s*°?\s*([NSns])?\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EWew])?/);
    if (!m) return null;
    var lat = parseFloat(m[1]), lng = parseFloat(m[3]);
    if (m[2] && /s/i.test(m[2])) lat = -Math.abs(lat);
    if (m[4] && /w/i.test(m[4])) lng = -Math.abs(lng);
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat: lat, lng: lng };
  }

  function skyState() {
    var typed = parseLatLng(locIn && locIn.value);
    var loc = typed || HOME;
    var now = new Date();
    var parts = (dateIn && dateIn.value) ? dateIn.value.split('-') : null;
    var y = parts ? +parts[0] : now.getFullYear();
    var mo = parts ? +parts[1] : now.getMonth() + 1;
    var d = parts ? +parts[2] : now.getDate();
    var tp = ((timeIn && timeIn.value) || '21:00').split(':');
    /* the time means local time where they stood: approximate the zone
       from longitude (15°/hour) — well under a degree of sky at this scale */
    var tz = Math.round(loc.lng / 15);
    return {
      lat: loc.lat, lng: loc.lng,
      ms: Date.UTC(y, mo - 1, d, (+tp[0] || 0) - tz, +tp[1] || 0),
      y: y, mo: mo, d: d,
      real: !!(parts || typed)
    };
  }

  function project(ms, lat, lng) {
    var jd = ms / 86400000 + 2440587.5;
    var D = jd - 2451545.0;
    var gmst = (280.46061837 + 360.98564736629 * D) % 360;
    var lst = gmst + lng; /* east-positive */
    var rad = Math.PI / 180;
    var sinLat = Math.sin(lat * rad), cosLat = Math.cos(lat * rad);
    var pts = [];
    for (var i = 0; i < STARS.length; i++) {
      var dec = STARS[i][1] * rad;
      var H = (lst - STARS[i][0] * 15) * rad;
      var sinAlt = Math.sin(dec) * sinLat + Math.cos(dec) * cosLat * Math.cos(H);
      var alt = Math.asin(sinAlt);
      if (alt <= 0.015) { pts.push(null); continue; } /* below the horizon */
      var az = Math.atan2(
        -Math.cos(dec) * Math.sin(H),
        Math.sin(dec) * cosLat - Math.cos(dec) * sinLat * Math.cos(H)
      );
      /* zenith at the disc center, horizon at the rim; looking up,
         north sits at the top and east to the LEFT (chart convention) */
      var r = R * (1 - alt / (Math.PI / 2));
      pts.push({ x: CX - r * Math.sin(az), y: CY - r * Math.cos(az), mag: STARS[i][2] });
    }
    return pts;
  }

  function draw() {
    var st = skyState();
    var pts = project(st.ms, st.lat, st.lng);
    while (sky.firstChild) sky.removeChild(sky.firstChild);

    for (var l = 0; l < LINES.length; l++) {
      var chain = LINES[l];
      for (var s = 0; s < chain.length - 1; s++) {
        var a = pts[chain[s]], b = pts[chain[s + 1]];
        if (!a || !b) continue;
        var ln = document.createElementNS(NS, 'line');
        ln.setAttribute('x1', a.x.toFixed(1)); ln.setAttribute('y1', a.y.toFixed(1));
        ln.setAttribute('x2', b.x.toFixed(1)); ln.setAttribute('y2', b.y.toFixed(1));
        ln.setAttribute('class', 'ep__sm-line');
        sky.appendChild(ln);
      }
    }
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (!p) continue;
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', p.x.toFixed(1)); c.setAttribute('cy', p.y.toFixed(1));
      c.setAttribute('r', Math.max(0.7, 2.9 - p.mag * 0.52).toFixed(2));
      c.setAttribute('class', 'ep__sm-star' + (p.mag < 1 ? ' ep__sm-star--bright' : ''));
      sky.appendChild(c);
    }
    sky.style.opacity = st.real ? '1' : '0.55';

    if (capText) {
      var cap = capIn ? capIn.value.trim() : '';
      var ph = capText.dataset.placeholder || '';
      capText.textContent = (cap || ph).toUpperCase();
      capText.style.opacity = cap ? '1' : '0.5';
      clampFit(capText, (cap || ph).length);
    }
    if (dateText) {
      var dstr = MONTHS[st.mo - 1] + ' ' + st.d + ', ' + st.y;
      dateText.textContent = dstr;
      dateText.style.opacity = (dateIn && dateIn.value) ? '1' : '0.5';
      clampFit(dateText, dstr.length);
    }
    if (counter && capIn) counter.textContent = capIn.value.length + ' / ' + capIn.maxLength;
  }

  ['input', 'change'].forEach(function (ev) {
    rig.addEventListener(ev, function (e) {
      if (e.target === dateIn || e.target === timeIn || e.target === locIn || e.target === capIn) draw();
    });
  });

  /* typing over a pinned place invalidates the locator's backend data */
  if (locIn) {
    locIn.addEventListener('input', function () {
      if (!locIn.dataset.fromLocator) {
        ['[data-prop-latlng]', '[data-prop-place]', '[data-prop-maplink]'].forEach(function (sel) {
          var el = rig.querySelector(sel);
          if (el) el.value = '';
        });
      }
    });
  }

  draw();

  /* the sky needs a date and a place before it can be engraved */
  var form = root.querySelector('form[data-product-form]');
  if (form) {
    form.addEventListener('submit', function (e) {
      var missing = null, msg = '';
      if (dateIn && dateIn.required && !dateIn.value) {
        missing = dateIn; msg = 'Pick the date of your moment — we chart the sky from it.';
      } else if (locIn && locIn.required && !locIn.value.trim()) {
        missing = locIn; msg = 'Add the place — tap “Find my coordinates” to drop a pin.';
      } else if (capIn && capIn.required && !capIn.value.trim()) {
        missing = capIn; msg = 'Add your caption so we can engrave it.';
      }
      if (missing) {
        e.preventDefault();
        missing.focus();
        missing.setCustomValidity(msg);
        missing.reportValidity();
        missing.addEventListener('input', function () { missing.setCustomValidity(''); }, { once: true });
      }
    });
  }
})();
