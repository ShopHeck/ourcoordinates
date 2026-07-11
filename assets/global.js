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

    function sidesFromVariant() {
      var sides = 0;
      root.querySelectorAll('[data-option-index] input:checked').forEach(function (radio) {
        var m = radio.value.match(/([1-4])\s*side/i);
        if (m) sides = parseInt(m[1], 10);
      });
      return sides;
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
