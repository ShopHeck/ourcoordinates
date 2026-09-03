/* Meridian theme JS — no dependencies */
var PRODUCT_FORM_SUBMIT_EVENT = 'theme:product-form-submit';

function addProductFormSubmitListener(form, listener) {
  form.addEventListener('submit', listener);
  form.addEventListener(PRODUCT_FORM_SUBMIT_EVENT, listener);
}

function submitProductForm(form) {
  if (!form) return;
  if (!form.noValidate && !form.reportValidity()) return;

  if (document.querySelector('[data-cart-drawer]')) {
    form.dispatchEvent(new CustomEvent(PRODUCT_FORM_SUBMIT_EVENT, {
      bubbles: true,
      cancelable: true
    }));
    return;
  }

  if (form.requestSubmit) form.requestSubmit();
  else form.submit();
}

(function () {
  'use strict';

  /* ---------- mobile nav ---------- */
  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-menu-toggle]');
    if (toggle) {
      var nav = document.querySelector('[data-site-nav]');
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
  });

  /* ---------- category mega menu ---------- */
  var siteHeader = document.querySelector('.site-header');
  var siteNav = document.querySelector('[data-site-nav]');
  var menuToggle = document.querySelector('[data-menu-toggle]');
  var megaMenus = document.querySelectorAll('[data-mega-menu]');
  var desktopMenu = window.matchMedia('(min-width: 861px)');

  function closeMegaMenus(except) {
    megaMenus.forEach(function (menu) {
      if (menu !== except) menu.removeAttribute('open');
    });
  }

  megaMenus.forEach(function (menu) {
    var trigger = menu.querySelector('summary');
    if (trigger) {
      trigger.addEventListener('click', function (event) {
        if (!desktopMenu.matches) return;
        event.preventDefault();
        closeMegaMenus(menu);
        menu.setAttribute('open', '');
      });
      trigger.addEventListener('keydown', function (event) {
        if (!desktopMenu.matches || event.key !== 'ArrowDown') return;
        event.preventDefault();
        closeMegaMenus(menu);
        menu.setAttribute('open', '');
        var firstLink = menu.querySelector('[data-mega-panel] a');
        if (firstLink) firstLink.focus();
      });
    }
    menu.addEventListener('mouseenter', function () {
      if (desktopMenu.matches) {
        closeMegaMenus(menu);
        menu.setAttribute('open', '');
      }
    });
    menu.addEventListener('mouseleave', function () {
      if (desktopMenu.matches && !menu.contains(document.activeElement)) menu.removeAttribute('open');
    });
    menu.addEventListener('focusin', function () {
      if (desktopMenu.matches) {
        closeMegaMenus(menu);
        menu.setAttribute('open', '');
      }
    });
    menu.addEventListener('focusout', function (event) {
      if (desktopMenu.matches && !menu.contains(event.relatedTarget)) menu.removeAttribute('open');
    });
    menu.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        menu.removeAttribute('open');
        if (trigger) trigger.focus();
      }
    });
  });

  document.addEventListener('click', function (event) {
    if (siteHeader && !siteHeader.contains(event.target)) {
      closeMegaMenus();
      if (siteNav) siteNav.classList.remove('is-open');
      if (menuToggle) {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open menu');
      }
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    closeMegaMenus();
    if (siteNav) siteNav.classList.remove('is-open');
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
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
    var restockForm = root.querySelector('[data-restock-form]');
    var mainImg = root.querySelector('[data-main-image]');
    var galleryThumbs = root.querySelector('[data-gallery-thumbs]');
    var galleryToggle = root.querySelector('[data-gallery-toggle]');

    function setGalleryExpanded(expanded) {
      if (!galleryThumbs || !galleryToggle) return;
      galleryThumbs.classList.toggle('is-expanded', expanded);
      galleryToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      galleryToggle.textContent = expanded
        ? galleryToggle.dataset.showFewerLabel
        : galleryToggle.dataset.viewAllLabel;
    }

    function selectThumb(btn, revealInGallery) {
      if (!btn || !mainImg) return;
      mainImg.src = btn.dataset.full;
      if (btn.dataset.fullSrcset) mainImg.srcset = btn.dataset.fullSrcset;
      else mainImg.removeAttribute('srcset');
      mainImg.alt = btn.querySelector('img') ? btn.querySelector('img').alt : '';
      root.querySelectorAll('[data-thumb]').forEach(function (item) { item.removeAttribute('aria-current'); });
      btn.setAttribute('aria-current', 'true');
      if (revealInGallery && galleryThumbs && Array.prototype.indexOf.call(galleryThumbs.children, btn) >= 5) {
        setGalleryExpanded(true);
      }
    }

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

    function updateVariant(revealInGallery) {
      var v = matchVariant();
      syncMetal();
      if (!v) return;
      if (idInput) idInput.value = v.id;
      if (priceEl) {
        priceEl.innerHTML = money(v.price) +
          (v.compare_at_price > v.price ? ' <s>' + money(v.compare_at_price) + '</s>' : '');
      }
      if (stickyPrice) stickyPrice.textContent = money(v.price);
      /* The PDP wallet buys only this variant and bypasses the existing cart,
         so keep its shipping claim variant-only as the selection changes. */
      var nudge = root.querySelector('[data-ship-nudge]');
      if (nudge) {
        var threshold = parseInt(nudge.dataset.threshold, 10) || 0;
        var remaining = threshold - v.price;
        var slot = nudge.querySelector('[data-ship-nudge-text]') || nudge;
        slot.innerHTML = remaining > 0
          ? '<strong>' + money(remaining) + ' away from free US shipping.</strong> Add to cart to combine items.'
          : '<strong>Ships free in the US.</strong> This item clears the ' + money(threshold).replace(/\.00$/, '') + ' threshold.';
      }
      atcBtns.forEach(function (btn) {
        btn.disabled = !v.available;
        btn.querySelector('[data-atc-label]').textContent = v.available
          ? btn.dataset.labelAdd : btn.dataset.labelSoldOut;
      });
      if (restockForm) restockForm.hidden = v.available;
      if (v.featured_image && v.featured_image.id) {
        selectThumb(root.querySelector('[data-thumb][data-image-id="' + v.featured_image.id + '"]'), revealInGallery);
      }
      var url = new URL(window.location);
      url.searchParams.set('variant', v.id);
      history.replaceState({}, '', url);
    }

    root.addEventListener('change', function (e) {
      if (e.target.closest('[data-option-index]')) updateVariant(true);
    });
    updateVariant(false);

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
      addProductFormSubmitListener(form, function (e) {
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
    root.querySelectorAll('[data-thumb]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectThumb(btn, false);
      });
    });
    if (galleryToggle) {
      galleryToggle.addEventListener('click', function () {
        setGalleryExpanded(galleryToggle.getAttribute('aria-expanded') !== 'true');
      });
    }

    /* sticky mobile ATC: show once buy box scrolls out of view */
    var sticky = document.querySelector('[data-sticky-atc]');
    var buyBox = root.querySelector('[data-buy-box]');
    if (sticky && buyBox && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        sticky.classList.toggle('is-visible', !entries[0].isIntersecting);
      }, { rootMargin: '-80px 0px 0px 0px' }).observe(buyBox);
      sticky.querySelector('[data-sticky-submit]').addEventListener('click', function () {
        submitProductForm(form);
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
   horizontal-bar, vertical-bar, ring, bracelet, leather-bracelet,
   four-sided, dog-tag.
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
      addProductFormSubmitListener(form, function (e) {
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

  /* ---- LEATHER BRACELET (four physical plate placements) ---- */
  if (previewType === 'leather-bracelet') {
    var leatherInputs = root.querySelectorAll('[data-leather-input]');

    function compactCoordinate(part) {
      var hemisphere = (part.match(/[NSEW]/i) || [''])[0].toUpperCase();
      var value = Math.abs(parseFloat(part));
      if (!hemisphere || !isFinite(value)) return part.trim().slice(0, 6);
      var integerLength = String(Math.floor(value)).length;
      var decimalPlaces = Math.max(0, 4 - integerLength);
      return value.toFixed(decimalPlaces) + hemisphere;
    }

    function renderLeatherInput(input) {
      var line = input.dataset.leatherInput;
      var preview = root.querySelector('[data-leather-preview="' + line + '"]');
      var count = root.querySelector('[data-leather-count="' + line + '"]');
      if (!preview) return;
      var value = input.value.trim();
      var placeholder = preview.dataset.placeholder || '';
      preview.textContent = value || placeholder || '—';
      preview.style.opacity = value ? '1' : '0.4';
      if (count) count.textContent = input.value.length + ' / 6' + (line === '1' ? '' : ' · optional');
    }

    leatherInputs.forEach(function (input) {
      input.addEventListener('input', function () {
        if (input.dataset.fromLocator && input.dataset.leatherInput === '1') {
          var coordinateParts = input.value.split(',').map(function (part) { return part.trim(); });
          if (coordinateParts.length >= 2) {
            var squareLine2 = root.querySelector('[data-leather-input="2"]');
            input.value = compactCoordinate(coordinateParts[0]);
            if (squareLine2) {
              squareLine2.value = compactCoordinate(coordinateParts.slice(1).join(', '));
              renderLeatherInput(squareLine2);
            }
          }
        }
        renderLeatherInput(input);
      });
      renderLeatherInput(input);
    });
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
      addProductFormSubmitListener(form, function (e) {
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

  /* ---- PADLOCK (two-line front engraving) ---- */
  if (previewType === 'padlock') {
    var lockInputs = root.querySelectorAll('[data-lock-input]');

    function renderLockLine(inp) {
      var lineNum = inp.dataset.lockInput;
      var preview = root.querySelector('[data-lock-line="' + lineNum + '"]');
      var count = root.querySelector('[data-lock-count="' + lineNum + '"]');
      if (!preview) return;
      var placeholder = preview.dataset.placeholder || '';
      var val = inp.value.trim();
      preview.textContent = val || placeholder;
      preview.style.opacity = val ? '1' : '0.4';
      clampFit(preview, (val || placeholder).length);
      if (count) count.textContent = inp.value.length + ' / ' + inp.maxLength + (lineNum === '2' ? ' · optional' : '');
      if (!inp.dataset.fromLocator) {
        ['[data-prop-latlng]', '[data-prop-place]', '[data-prop-maplink]'].forEach(function (sel) {
          var el = root.querySelector(sel);
          if (el) el.value = '';
        });
      }
    }

    lockInputs.forEach(function (inp) {
      inp.addEventListener('input', function () { renderLockLine(inp); });
      renderLockLine(inp);
    });

    /* The coordinate locator returns one comma-separated pair. Split it
       into the two physical engraving lines without changing hidden proof data. */
    var lockMainInput = root.querySelector('[data-lock-input="1"]');
    if (lockMainInput) {
      lockMainInput.addEventListener('input', function () {
        if (!lockMainInput.dataset.fromLocator) return;
        var parts = lockMainInput.value.split(',').map(function (part) { return part.trim(); });
        if (parts.length < 2) return;
        var lockLine2 = root.querySelector('[data-lock-input="2"]');
        lockMainInput.value = parts[0];
        renderLockLine(lockMainInput);
        if (lockLine2) {
          lockLine2.value = parts.slice(1).join(', ');
          lockLine2.dataset.fromLocator = '1';
          renderLockLine(lockLine2);
          delete lockLine2.dataset.fromLocator;
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
      addProductFormSubmitListener(form, function (e) {
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
      syncExpressGate();
    });
  });

  /* ---- EXPRESS CHECKOUT VETO ----
     The per-piece inputs carry no `required` attribute (the submit listener
     below validates them), so the wallet gate's required-field scan can't
     see them. Publish the custom-mode verdict on the form; the gate reads
     `data-express-blocked` and re-evaluates on `oc:express-recheck`. */
  function syncExpressGate() {
    var gateForm = root.querySelector('form[data-product-form]');
    if (!gateForm) return;
    var blocked = false;
    if (isCustomMode) {
      allPieceInputs.forEach(function (inp) { if (!inp.value.trim()) blocked = true; });
    }
    if (blocked) gateForm.dataset.expressBlocked = 'Express checkout unlocks once every piece has its engraving.';
    else delete gateForm.dataset.expressBlocked;
    gateForm.dispatchEvent(new CustomEvent('oc:express-recheck', { bubbles: true }));
  }

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
      syncExpressGate();
    });
  }

  /* remember original required state */
  if (mainInput && mainInput.required) mainInput.dataset.origRequired = 'true';
  syncExpressGate();

  /* ---- FORM VALIDATION ---- */
  var form = root.querySelector('form[data-product-form]');
  if (form) {
    addProductFormSubmitListener(form, function (e) {
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
  var urlRoot = drawer.dataset.urlRoot || '/';
  var busy = false;
  var lastDrawerTrigger = null;

  /* Shopify's storefront event listener tracks native product-form submits.
     The drawer also adds through fetch(), so allowing both creates two
     product_added_to_cart events for one click. While the drawer is active,
     route the primary button through a theme-only event; the validators above
     listen to both paths and the no-JS/classic-cart submit remains unchanged. */
  document.querySelectorAll('form[data-product-form]').forEach(function (form) {
    form.querySelectorAll('button[data-atc]').forEach(function (button) {
      if (button.type !== 'submit') return;
      button.type = 'button';
      button.addEventListener('click', function () { submitProductForm(form); });
    });
  });

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
    document.querySelectorAll('[data-cart-label]').forEach(function (link) {
      link.setAttribute('aria-label', 'Cart, ' + count + (count === '1' ? ' item' : ' items'));
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
    if (document.activeElement && document.activeElement !== document.body) {
      lastDrawerTrigger = document.activeElement;
    }
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

  document.addEventListener(PRODUCT_FORM_SUBMIT_EVENT, function (e) {
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

  drawer.addEventListener('close', function () {
    if (lastDrawerTrigger && document.contains(lastDrawerTrigger)) lastDrawerTrigger.focus();
    lastDrawerTrigger = null;
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
    addProductFormSubmitListener(form, function (e) {
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
   EXPRESS CHECKOUT GATE — product page (Sept 2026 audit, Codex P1s)
   Shopify's dynamic checkout button takes the form's variant + properties
   straight to checkout: it does not fire the form's submit listeners (the
   engraving-required guards) and never touches the cart (the gift-packaging
   add-on is added by the Add-to-cart handler). The wallet block is rendered
   hidden; this reveals it only while the order it would create is complete.

   Three sources of truth, in priority order:
     1. a checked [data-gift-wrap]            → hide (wallet skips the cart)
     2. form.dataset.expressBlocked           → hide with that message
        (set by validators whose inputs carry no `required`, e.g. the set
        template's per-piece mode; they fire `oc:express-recheck`)
     3. any enabled `required` field empty    → hide
   ============================================================ */
(function () {
  'use strict';
  var forms = document.querySelectorAll('form[data-product-form]');
  if (!forms.length) return;

  function requiredFilled(form) {
    var fields = form.querySelectorAll('input[required], textarea[required], select[required]');
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (f.disabled || f.type === 'hidden') continue;
      if (f.type === 'checkbox' || f.type === 'radio') {
        if (!form.querySelector('input[name="' + f.name + '"]:checked')) return false;
        continue;
      }
      if (!String(f.value || '').trim()) return false;
    }
    return true;
  }

  forms.forEach(function (form) {
    var block = form.querySelector('[data-express-checkout]');
    if (!block) return;
    var note = form.querySelector('[data-express-note]');

    function update() {
      var reason = '';
      if (form.querySelector('[data-gift-wrap]:checked')) {
        reason = 'Gift packaging is added with Add to cart — express checkout is unavailable while it’s selected.';
      } else if (form.dataset.expressBlocked) {
        reason = form.dataset.expressBlocked;
      } else if (!requiredFilled(form)) {
        reason = 'Express checkout unlocks once your engraving is entered.';
      }
      block.hidden = !!reason;
      if (note) {
        note.hidden = !reason;
        note.textContent = reason;
      }
    }

    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('oc:express-recheck', update);
    /* set/4-sided previews toggle `required` and `disabled` programmatically */
    if (window.MutationObserver) {
      new MutationObserver(update).observe(form, {
        subtree: true,
        attributes: true,
        attributeFilter: ['required', 'disabled', 'data-express-blocked']
      });
    }
    update();
  });
})();


/* ============================================================
   GIFT NOTE PERSISTENCE — cart page AND drawer (Sept 2026, Codex P1/P2)
   Accelerated checkout buttons start their wallet flow without submitting
   the surrounding form, so a typed note has to be on the cart before a
   wallet can be activated. This module:
     - delegates on document, so the drawer's re-rendered textarea
       ([data-drawer-note]) and the page textarea ([data-cart-note]) are
       both covered without re-binding;
     - serializes saves through one promise chain and ignores stale
       completions, so an older write can never re-enable the wallets
       while a newer value is still unsaved;
     - holds the wallet block `inert` (+ aria-busy, + a keydown guard for
       browsers without inert) from the first keystroke until the cart
       holds the current value — mouse, touch AND keyboard; and
     - reapplies that lock when Shopify's Section Rendering API replaces the
       drawer's accelerated-checkout markup during a pending save.
   Falls back to the form POST if a save fails.
   ============================================================ */
(function () {
  'use strict';
  var SELECTOR = '[data-cart-note], [data-drawer-note]';
  var queue = Promise.resolve();
  var seq = 0;
  var initialField = document.querySelector(SELECTOR);
  var state = {
    field: null,
    saved: initialField && initialField.dataset.noteSaved !== undefined ? initialField.dataset.noteSaved : null,
    timer: null,
    pending: false
  };
  var walletsLocked = false;

  function walletBlocks() {
    /* The cart page and drawer share one cart note, so both wallet surfaces
       must remain blocked until that single server-side value is current. */
    return Array.prototype.slice.call(document.querySelectorAll('.additional-checkout-buttons'));
  }

  function syncWalletBlocks() {
    walletBlocks().forEach(function (el) {
      if (walletsLocked) {
        el.setAttribute('aria-busy', 'true');
        el.setAttribute('inert', '');
      } else {
        el.removeAttribute('aria-busy');
        el.removeAttribute('inert');
      }
    });
  }

  function setBusy(on) {
    walletsLocked = on;
    syncWalletBlocks();
  }

  function connectedField(source, preserveEdit) {
    if (document.contains(source)) return source;
    var selector = source.matches('[data-drawer-note]') ? '[data-drawer-note]' : '[data-cart-note]';
    var replacement = document.querySelector(selector) || document.querySelector(SELECTOR);
    var replacementIsClean = replacement &&
      (replacement.dataset.noteSaved === undefined || replacement.value === replacement.dataset.noteSaved);
    if (replacement && preserveEdit && replacementIsClean) {
      if (replacement.dataset.noteSaved === undefined) {
        replacement.dataset.noteSaved = source.dataset.noteSaved === undefined
          ? replacement.defaultValue
          : source.dataset.noteSaved;
      }
      replacement.value = source.value;
    }
    return replacement || source;
  }

  function reconcileRenderedFields() {
    if (state.saved === null) return;
    document.querySelectorAll(SELECTOR).forEach(function (field) {
      if (field.dataset.noteSaved === undefined) field.dataset.noteSaved = field.defaultValue;
      var clean = field.value === field.dataset.noteSaved;
      if (clean && field.dataset.noteSaved !== state.saved) {
        field.dataset.noteSaved = state.saved;
        field.value = state.saved;
      }
    });
  }

  if (window.MutationObserver) {
    new MutationObserver(function () {
      if (state.field && !document.contains(state.field)) {
        state.field = connectedField(state.field, walletsLocked);
      }
      reconcileRenderedFields();
      if (walletsLocked) {
        var st = statusEl(state.field);
        if (st && state.pending && st.textContent !== 'Saving note…') st.textContent = 'Saving note…';
        syncWalletBlocks();
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  function statusEl(field) {
    var scope = field.closest('.gift-note, .cart-drawer__note, form') || document;
    return scope.querySelector('[data-cart-note-status]');
  }

  function adopt(field) {
    if (state.field !== field) {
      state.field = field;
      if (field.dataset.noteSaved === undefined) field.dataset.noteSaved = field.defaultValue; /* initial markup = what the cart holds */
      if (state.saved === null) state.saved = field.dataset.noteSaved;
    }
  }

  function syncSavedFields(source, value) {
    state.saved = value;
    source.dataset.noteSaved = value;
    var current = connectedField(source, false);
    document.querySelectorAll(SELECTOR).forEach(function (field) {
      /* Keep another field's in-progress edit, but move its saved baseline
         forward so it remains correctly classified as unsaved. */
      var wasClean = field === source || field.dataset.noteSaved === undefined || field.value === field.dataset.noteSaved;
      field.dataset.noteSaved = value;
      if (field !== source && wasClean) field.value = value;
    });
    state.field = dirtyNoteField() || current;
    return current;
  }

  function dirtyNoteField() {
    var fields = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < fields.length; i++) {
      if (fields[i].value !== fields[i].dataset.noteSaved) return fields[i];
    }
    return null;
  }

  function settle(field) {
    /* The note is shared: release neither checkout surface while any copy is
       dirty or a newer value is still waiting for its debounce. */
    var dirty = dirtyNoteField();
    if (state.timer || dirty) {
      if (dirty) state.field = dirty;
      setBusy(true);
      return;
    }
    if (!state.pending && field.value === field.dataset.noteSaved) setBusy(false);
  }

  function save(field) {
    adopt(field);
    clearTimeout(state.timer);
    state.timer = null;
    var value = field.value;
    if (value === field.dataset.noteSaved && !state.pending) { settle(field); return queue; }
    var my = ++seq;
    state.pending = true;
    setBusy(true);
    var st = statusEl(field);
    if (st) st.textContent = 'Saving note…';
    queue = queue.then(function () {
      if (my !== seq) return; /* superseded before it started — skip */
      return fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ note: value }),
        keepalive: true
      }).then(function (r) {
        if (!r.ok) throw new Error('cart update failed');
        var savedField = syncSavedFields(field, value);
        var savedStatus = statusEl(savedField);
        if (savedStatus && my === seq && savedField.value === savedField.dataset.noteSaved) {
          savedStatus.textContent = value.trim() ? 'Gift note saved' : '';
        }
        return savedField;
      }).catch(function () {
        var failedField = connectedField(field, true);
        state.field = failedField;
        var failedStatus = statusEl(failedField);
        if (failedStatus && my === seq) failedStatus.textContent = 'Couldn’t save the note — it will be sent with Check out.';
        return null;
      });
    }).then(function (savedField) {
      if (my !== seq) return; /* a newer save owns the busy state */
      state.pending = false;
      /* Input/change/blur already queues any newer value. On failure, keep
         wallets inert and let the regular cart form submit the note; do not
         recursively hammer /cart/update.js while the shopper is offline. */
      if (savedField) settle(state.field || savedField);
    });
    return queue;
  }

  document.addEventListener('input', function (e) {
    var field = e.target;
    if (!field.matches || !field.matches(SELECTOR)) return;
    adopt(field);
    setBusy(true);
    var st = statusEl(field);
    if (st) st.textContent = '';
    clearTimeout(state.timer);
    state.timer = setTimeout(function () { save(field); }, 350);
  });
  ['change', 'blur'].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      if (e.target.matches && e.target.matches(SELECTOR)) save(e.target);
    }, true);
  });

  /* reaching for a wallet: flush immediately; block activation until saved */
  ['pointerdown', 'touchstart', 'focusin', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      var block = e.target.closest && e.target.closest('.additional-checkout-buttons');
      if (!block) return;
      var field = state.field || document.querySelector(SELECTOR);
      if (field && (state.timer || field.value !== field.dataset.noteSaved)) save(field);
      if (block.getAttribute('aria-busy') === 'true' && ev === 'keydown' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault(); /* inert fallback */
      }
    }, { capture: true, passive: ev !== 'keydown' });
  });
})();
