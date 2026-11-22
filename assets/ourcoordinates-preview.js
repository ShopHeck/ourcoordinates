/**
 * OurCoordinates.com — Realistic Photo & 360° 3D Engraving Preview Engine v7
 * Hooks non-destructively into sections/main-product.liquid & global.js.
 */
(() => {
  const FINISHES = {
    gold: {
      fill: '#3a2608', fillBlend: 'multiply', fillAlpha: 0.80,
      highlight: '#fff7d6', highlightAlpha: 0.40,
      shadow: '#1a0f00', shadowAlpha: 0.28,
      sheenAlpha: 0.24, darkBase: false
    },
    'rose-gold': {
      fill: '#47211a', fillBlend: 'multiply', fillAlpha: 0.78,
      highlight: '#ffe8df', highlightAlpha: 0.36,
      shadow: '#240b06', shadowAlpha: 0.25,
      sheenAlpha: 0.24, darkBase: false
    },
    silver: {
      fill: '#20262e', fillBlend: 'multiply', fillAlpha: 0.76,
      highlight: '#ffffff', highlightAlpha: 0.46,
      shadow: '#090d14', shadowAlpha: 0.24,
      sheenAlpha: 0.28, darkBase: false
    },
    black: {
      fill: '#d9dfe8', fillBlend: 'screen', fillAlpha: 0.74,
      highlight: '#ffffff', highlightAlpha: 0.24,
      shadow: '#000000', shadowAlpha: 0.48,
      sheenAlpha: 0.10, darkBase: true
    },
    'black-matte': {
      fill: '#d9dfe8', fillBlend: 'screen', fillAlpha: 0.74,
      highlight: '#ffffff', highlightAlpha: 0.24,
      shadow: '#000000', shadowAlpha: 0.48,
      sheenAlpha: 0.10, darkBase: true
    },
    leather: {
      fill: '#190f07', fillBlend: 'multiply', fillAlpha: 0.86,
      highlight: '#cba885', highlightAlpha: 0.14,
      shadow: '#000000', shadowAlpha: 0.44,
      sheenAlpha: 0.04, darkBase: true
    }
  };

  const PIECE_TO_3D = {
    necklace: { shape: 'four-sided', label: 'Necklace' },
    bracelet: { shape: 'cuff',       label: 'Bracelet' },
    ring:     { shape: 'ring',       label: 'Ring' },
    keychain: { shape: 'keychain',   label: 'Keychain' }
  };

  class CoordinateEngravingPreview {
    constructor(stageEl, config) {
      this.stage = stageEl;
      this.section = stageEl.closest('[data-product]');
      this.previewType = this.section?.getAttribute('data-preview-type') || '';
      this.config = JSON.parse(JSON.stringify(config));

      this.model3d = stageEl.dataset.oc3dShape || this.config.model3d || '';
      if (this.model3d === 'none') this.model3d = '';

      // Multi-piece Coordinates Set detection
      this.isSet3D = this.model3d === 'set';
      this.setPieces = [];
      this.activePieceIndex = 0;
      if (this.isSet3D) {
        const rawPieces = Array.isArray(this.config.setPieces) && this.config.setPieces.length
          ? this.config.setPieces
          : (stageEl.dataset.ocSetPieces || '').split(',').map((s) => s.trim()).filter(Boolean);
        this.setPieces = rawPieces
          .map((p) => p.toLowerCase())
          .filter((p) => Boolean(PIECE_TO_3D[p]));
        if (!this.setPieces.length) this.setPieces = ['necklace', 'bracelet'];
      }

      this.mainImg = this.section?.querySelector('[data-main-image]');
      this.canvas = stageEl.querySelector('[data-oc-canvas]');
      this.ctx = this.canvas.getContext('2d', { alpha: false });
      this.canvas3d = stageEl.querySelector('[data-oc-3d-canvas]');
      this.dragHint = stageEl.querySelector('[data-oc-3d-hint]');
      this.modeGroup = stageEl.querySelector('[data-oc-mode-group]');
      this.toggleBtn = stageEl.querySelector('[data-oc-toggle]');
      this.calBtn = stageEl.querySelector('[data-oc-cal-btn]');
      this.pieceTabsEl = stageEl.querySelector('[data-oc-piece-tabs]');
      this.sideTabsEl = stageEl.querySelector('[data-oc-side-tabs]');

      this.finishKey = this._detectFinish();
      this.activeSideIndex = 0;
      this.textsBySide = {};
      this.baseImage = null;
      this.currentSrc = '';
      this.supports3D = Boolean(this._current3DShape() && this.canvas3d && window.OCJewelry3D);
      this.mode = this.supports3D ? '3d' : 'photo';
      this.isDesignMode = Boolean((window.Shopify && window.Shopify.designMode) || stageEl.dataset.designMode === 'true');
      this.calibrateMode = new URLSearchParams(window.location.search).has('calibrate');
      this.hudEl = null;
      this._raf = null;
      this._cleanCacheKey = '';
      this._cleanPatchCanvas = document.createElement('canvas');

      this.glyphBuffer = document.createElement('canvas');
      this.tintBuffer = document.createElement('canvas');
      this.sheenBuffer = document.createElement('canvas');

      this.viewer3d = null;
      if (this.supports3D) {
        this.viewer3d = new window.OCJewelry3D(this.canvas3d, {
          shape: this._current3DShape(),
          fontFamily: this.config.fontFamily || "'IBM Plex Mono', 'Inter', sans-serif",
          onInteract: () => {
            if (this.dragHint) this.dragHint.classList.add('is-hidden');
          },
          onActiveViewChange: (viewIdx) => {
            this.sideTabsEl?.querySelectorAll('[data-oc-side]').forEach((btn, i) => {
              btn.classList.toggle('is-active', i === viewIdx);
            });
          }
        });
        this.viewer3d.setFinish(this.finishKey);
      }

      this._bindControls();
      this._observeThemeEvents();
      this._rebuildPiecePills();
      this._rebuildSidePills();
      this._syncInputs(true);
      this.setMode(this.mode);

      if (this.calBtn && (this.isDesignMode || this.calibrateMode)) {
        this.calBtn.hidden = false;
        this.calBtn.addEventListener('click', () => {
          if (this.mode !== 'photo') this.setMode('photo');
          this.calibrateMode = !this.calibrateMode;
          this.calBtn.classList.toggle('is-active', this.calibrateMode);
          if (this.calibrateMode) this._mountCalibrator();
          else this._unmountCalibrator();
          this.requestRender();
        });
      }

      if (this.calibrateMode) {
        this.setMode('photo');
        this.calBtn?.classList.add('is-active');
        this._mountCalibrator();
      }

      const initialUrl = this._resolveBaseImageUrl();
      if (initialUrl) {
        (document.fonts?.ready || Promise.resolve()).then(() => {
          this.loadBaseImage(initialUrl);
          if (this.viewer3d) this.viewer3d.texturesDirty = true;
        });
      }
    }

    _currentPieceKey() {
      if (!this.isSet3D) return '';
      return this.setPieces[this.activePieceIndex] || this.setPieces[0] || 'necklace';
    }

    _current3DShape() {
      if (this.isSet3D) {
        const piece = this._currentPieceKey();
        return PIECE_TO_3D[piece]?.shape || 'four-sided';
      }
      return this.model3d;
    }

    _detectFinish() {
      if (this.config.defaultFinish === 'leather') return 'leather';
      const metalAttr = (this.section?.getAttribute('data-metal') || '').toLowerCase();
      if (metalAttr && FINISHES[metalAttr]) return metalAttr;
      const checked = this.section?.querySelectorAll('input[type="radio"]:checked') || [];
      for (const r of checked) {
        const v = (r.value || '').toLowerCase();
        if (v.includes('rose')) return 'rose-gold';
        if (v.includes('gold') || v.includes('brass')) return 'gold';
        if (v.includes('silver') || v.includes('steel') || v.includes('platinum')) return 'silver';
        if (v.includes('black') || v.includes('onyx') || v.includes('gunmetal')) return 'black';
      }
      return this.config.defaultFinish || 'gold';
    }

    _detectBackEngravingOption() {
      const checked = this.section?.querySelectorAll('input[type="radio"]:checked') || [];
      for (const r of checked) {
        const v = (r.value || '').toLowerCase();
        if (v.includes('with back')) return true;
        if (v.includes('without back')) return false;
      }
      return false;
    }

    _getActiveFourSidesCount() {
      const fourRig = this.section?.querySelector('[data-four-sided-engraving]');
      if (fourRig) {
        const n = parseInt(fourRig.getAttribute('data-active-sides') || '4', 10);
        return Number.isNaN(n) ? 4 : Math.max(1, Math.min(4, n));
      }
      const duoRig = this.section?.querySelector('[data-set-duo]');
      if (duoRig) {
        const n = parseInt(duoRig.getAttribute('data-max-sides') || '4', 10);
        return Number.isNaN(n) ? 4 : Math.max(1, Math.min(4, n));
      }
      // Single-input vertical bar using 4-sided 3D model
      return 1;
    }

    _resolveBaseImageUrl() {
      const blanks = this.config.blankImages || {};
      if (blanks[this.finishKey]) return blanks[this.finishKey];
      const sideIdx = Math.min(this.activeSideIndex, (this.config.sides || []).length - 1);
      const activeSide = this.config.sides?.[sideIdx];
      if (activeSide?.image) return activeSide.image;
      return this.mainImg?.currentSrc || this.mainImg?.getAttribute('src') || '';
    }

    _toCorsUrl(url) {
      if (!url) return '';
      const sep = url.includes('?') ? '&' : '?';
      return url.includes('oc_cors=1') ? url : `${url}${sep}oc_cors=1`;
    }

    loadBaseImage(rawUrl) {
      if (!rawUrl || rawUrl === this.currentSrc) return;
      this.currentSrc = rawUrl;
      this._cleanCacheKey = '';
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.baseImage = img;
        const maxDim = 1400;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        this.canvas.width = Math.round(img.naturalWidth * scale);
        this.canvas.height = Math.round(img.naturalHeight * scale);
        this.sheenBuffer.width = this.canvas.width;
        this.sheenBuffer.height = this.canvas.height;
        this.stage.classList.add('oc-is-ready');
        this.section?.classList.add('oc-has-photo-preview');
        this.requestRender();
      };
      img.onerror = () => {
        if (!this.supports3D) {
          this.stage.classList.remove('oc-is-ready');
          this.section?.classList.remove('oc-has-photo-preview');
        }
      };
      img.src = this._toCorsUrl(rawUrl);
    }

    _getEngravingInputs() {
      const form = this.section?.querySelector('[data-product-form]');
      if (!form) return [];

      if (this.previewType === 'four-sided') {
        const ordered = [];
        for (let i = 1; i <= 4; i++) {
          const el = form.querySelector(`[data-engrave-input-side="${i}"]`);
          if (el) ordered.push(el);
        }
        if (ordered.length) return ordered;
      }

      if (this.previewType === 'coordinates-set') {
        const sel = '[data-duo-shared], [data-duo-side], [data-duo-override], [data-set-sync], [data-set-piece-input]';
        const setInputs = Array.from(form.querySelectorAll(sel)).filter((el) => !el.disabled && el.type !== 'hidden');
        if (setInputs.length) return setInputs;
      }

      if (this.previewType === 'dog-tag') {
        const dt = Array.from(form.querySelectorAll('[data-dt-input]'));
        const backInput = this._findBackEngravingInput(form);
        if (backInput && !dt.includes(backInput)) dt.push(backInput);
        if (dt.length) return dt;
      }

      if (this.previewType === 'leather-bracelet') {
        const lb = Array.from(form.querySelectorAll('[data-leather-input]'));
        if (lb.length) return lb;
      }

      if (this.previewType === 'couple-rings') {
        const cr = Array.from(form.querySelectorAll('[data-ring-engraving]'));
        if (cr.length) return cr;
      }

      const selector = [
        'input[data-engrave-input]',
        'input[type="text"][name^="properties["]:not([name^="properties[_"])',
        'textarea[name^="properties["]:not([name^="properties[_"])'
      ].join(',');
      const seen = new Set();
      return Array.from(form.querySelectorAll(selector)).filter((el) => {
        if (seen.has(el) || el.disabled || el.type === 'hidden') return false;
        seen.add(el);
        return true;
      });
    }

    _findBackEngravingInput(form) {
      const candidates = form.querySelectorAll('input[type="text"], textarea');
      for (const el of candidates) {
        if (el.disabled || el.type === 'hidden') continue;
        const probe = `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
        if (probe.includes('back')) return el;
      }
      return null;
    }

    _syncSet3D(form, usePlaceholderFallback) {
      const piece = this._currentPieceKey();
      const shape = this._current3DShape();
      const duoRig = form?.querySelector('[data-set-duo]');
      const stdRig = form?.querySelector('[data-set-engraving]');

      const sharedEl = duoRig?.querySelector('[data-duo-shared]') || stdRig?.querySelector('[data-set-sync]');
      const sharedVal = sharedEl ? sharedEl.value.trim() : '';
      const sharedPh = sharedEl?.getAttribute('placeholder') || '27.7676° N, 82.6403° W';

      if (shape === 'four-sided') {
        // Mirror exact global.js comma-splitting logic for Necklace in a Set
        const allowed = this._getActiveFourSidesCount();
        const sideEl = (n) => duoRig?.querySelector(`[data-duo-side="${n}"]`);
        const backTyped = sideEl(2) ? sideEl(2).value.trim() : '';
        const comma = sharedVal.indexOf(',');
        const split = comma > -1 && allowed >= 2 && !backTyped;
        const s1 = split ? sharedVal.slice(0, comma).trim() : sharedVal;
        const s2 = split ? sharedVal.slice(comma + 1).trim() : backTyped;
        const s3 = sideEl(3) ? sideEl(3).value.trim() : '';
        const s4 = sideEl(4) ? sideEl(4).value.trim() : '';

        const phParts = sharedPh.includes(',') ? sharedPh.split(',').map((s) => s.trim()) : [sharedPh, '82.6403° W'];
        this.viewer3d?.setActiveSides(allowed);
        this.viewer3d?.setTexts([s1, s2, s3, s4], [phParts[0] || '27.7676° N', phParts[1] || '82.6403° W', '', '']);
      } else {
        // Bracelet / Ring / Keychain inside a Set
        const overrideEl = duoRig?.querySelector(`[data-duo-override="${piece}"]`)
          || stdRig?.querySelector(`[data-set-piece-input="${piece}"]`);
        const overrideVal = overrideEl ? overrideEl.value.trim() : '';
        const text = overrideVal || sharedVal;
        if (shape === 'keychain') {
          this.viewer3d?.setBackEnabled(false);
        }
        this.viewer3d?.setTexts([text, '', '', ''], [sharedPh, '', '', '']);
      }

      if (this.config.sides?.[0]) {
        this.textsBySide[this.config.sides[0].id] = sharedVal || (usePlaceholderFallback ? sharedPh : '');
      }
    }

    _syncInputs(usePlaceholderFallback = false) {
      const form = this.section?.querySelector('[data-product-form]');
      const inputs = this._getEngravingInputs();
      const sides = this.config.sides || [];

      if (this.isSet3D) {
        this._syncSet3D(form, usePlaceholderFallback);
        this.requestRender();
        return;
      }

      const activeShape = this._current3DShape();

      if (activeShape === 'four-sided') {
        const hasFourRig = Boolean(this.section?.querySelector('[data-four-sided-engraving]'));
        if (hasFourRig) {
          const rawVals = [0, 1, 2, 3].map((i) => (inputs[i] && !inputs[i].disabled ? inputs[i].value.trim() : ''));
          const phVals = [0, 1, 2, 3].map((i) => inputs[i]?.getAttribute('placeholder') || '');
          this.viewer3d?.setActiveSides(this._getActiveFourSidesCount());
          this.viewer3d?.setTexts(rawVals, phVals);
          sides.forEach((side, idx) => {
            const val = rawVals[idx] || '';
            const fallback = (usePlaceholderFallback && idx === 0) ? (phVals[0] || '27.7676° N') : '';
            this.textsBySide[side.id] = val || fallback;
          });
        } else {
          // Single-input vertical bar (e.g. Custom Bar Necklace)
          const el = inputs[0];
          const val = el ? el.value.trim() : '';
          const ph = el?.getAttribute('placeholder') || '27.7676° N';
          this.viewer3d?.setActiveSides(1);
          this.viewer3d?.setTexts([val, '', '', ''], [ph, '', '', '']);
          if (sides[0]) this.textsBySide[sides[0].id] = val || (usePlaceholderFallback ? ph : '');
        }
      } else if (activeShape === 'dog-tag') {
        const dtInputs = form ? Array.from(form.querySelectorAll('[data-dt-input]')) : [];
        const frontLines = dtInputs.map((el) => el.value.trim()).filter(Boolean).join('\n');
        const phFront = dtInputs.slice(0, 2).map((el) => el.getAttribute('placeholder') || '').filter(Boolean).join('\n') || '27.7676° N\n82.6403° W';
        const backEl = form ? this._findBackEngravingInput(form) : null;
        const backVal = backEl ? backEl.value.trim() : '';

        this.viewer3d?.setBackEnabled(this._detectBackEngravingOption() || Boolean(backVal));
        this.viewer3d?.setTexts([frontLines, backVal, '', ''], [phFront, '', '', '']);
        if (sides[0]) this.textsBySide[sides[0].id] = frontLines || (usePlaceholderFallback ? phFront : '');
        if (sides[1]) this.textsBySide[sides[1].id] = backVal;
      } else if (activeShape === 'keychain' || activeShape.startsWith('horizontal-bar')) {
        const backEl = form ? this._findBackEngravingInput(form) : null;
        const frontEl = inputs.find((el) => el !== backEl) || inputs[0];
        const frontVal = frontEl ? frontEl.value.trim() : '';
        const phFront = frontEl?.getAttribute('placeholder') || '27.7676° N, 82.6403° W';
        const backVal = backEl ? backEl.value.trim() : '';

        this.viewer3d?.setBackEnabled(this._detectBackEngravingOption() || Boolean(backVal));
        this.viewer3d?.setTexts([frontVal, backVal, '', ''], [phFront, '', '', '']);
        if (sides[0]) this.textsBySide[sides[0].id] = frontVal || (usePlaceholderFallback ? phFront : '');
        if (sides[1]) this.textsBySide[sides[1].id] = backVal;
      } else if (activeShape === 'cuff' || activeShape === 'ring') {
        const activeEl = inputs.includes(document.activeElement) ? document.activeElement : inputs[0];
        const val = activeEl ? activeEl.value.trim() : (inputs[0]?.value.trim() || '');
        const ph = activeEl?.getAttribute('placeholder') || inputs[0]?.getAttribute('placeholder') || '27.7676° N, 82.6403° W';
        this.viewer3d?.setTexts([val, '', '', ''], [ph, '', '', '']);
        if (sides[0]) this.textsBySide[sides[0].id] = val || (usePlaceholderFallback ? ph : '');
      } else if (sides.length <= 1 || this.previewType === 'leather-bracelet') {
        const joined = inputs.map((el) => el.value.trim()).filter(Boolean).join('\n');
        const fallback = usePlaceholderFallback
          ? (inputs[0]?.getAttribute('placeholder') || '27.7676° N, 82.6403° W')
          : '';
        this.textsBySide[sides[0]?.id || 'default'] = joined || fallback;
      } else {
        sides.forEach((side, idx) => {
          const el = inputs[idx];
          const val = el ? el.value.trim() : '';
          const fallback = (usePlaceholderFallback && idx === 0)
            ? (el?.getAttribute('placeholder') || '27.7676° N, 82.6403° W')
            : '';
          this.textsBySide[side.id] = val || fallback;
        });
      }

      this.requestRender();
    }

    _rebuildPiecePills() {
      if (!this.pieceTabsEl) return;
      if (!this.isSet3D || this.setPieces.length < 2) {
        this.pieceTabsEl.hidden = true;
        return;
      }
      this.pieceTabsEl.innerHTML = this.setPieces.map((pieceKey, i) => {
        const meta = PIECE_TO_3D[pieceKey];
        return `
          <button type="button"
                  class="oc-pill oc-pill--piece${i === this.activePieceIndex ? ' is-active' : ''}"
                  data-oc-piece="${i}">
            ${meta ? meta.label : pieceKey}
          </button>
        `;
      }).join('');
      this.pieceTabsEl.hidden = false;
    }

    _rebuildSidePills() {
      if (!this.sideTabsEl) return;
      const activeShape = this._current3DShape();

      if (this.supports3D && this.viewer3d) {
        const views = this.viewer3d.getViews();
        if (activeShape === 'four-sided') {
          const activeCount = this._getActiveFourSidesCount();
          this.sideTabsEl.innerHTML = views.map((v, i) => {
            const enabled = (i + 1) <= activeCount;
            return `
              <button type="button"
                      class="oc-pill${i === this.activeSideIndex ? ' is-active' : ''}${enabled ? '' : ' is-muted'}"
                      data-oc-side="${i}">
                ${v.label}${enabled ? '' : ' · Blank'}
              </button>
            `;
          }).join('');
        } else if (activeShape === 'dog-tag' || activeShape === 'keychain' || activeShape.startsWith('horizontal-bar')) {
          const backEnabled = !this.isSet3D && this._detectBackEngravingOption();
          this.sideTabsEl.innerHTML = views.map((v, i) => {
            const isBlankBack = i === 1 && !backEnabled;
            return `
              <button type="button"
                      class="oc-pill${i === this.activeSideIndex ? ' is-active' : ''}${isBlankBack ? ' is-muted' : ''}"
                      data-oc-side="${i}">
                ${v.label}${isBlankBack ? ' · Blank' : ''}
              </button>
            `;
          }).join('');
        } else {
          this.sideTabsEl.innerHTML = views.map((v, i) => `
            <button type="button"
                    class="oc-pill${i === this.activeSideIndex ? ' is-active' : ''}"
                    data-oc-side="${i}">
              ${v.label}
            </button>
          `).join('');
        }
        this.sideTabsEl.hidden = false;
      } else if (this.config.sides && this.config.sides.length > 1) {
        this.sideTabsEl.innerHTML = this.config.sides.map((s, i) => `
          <button type="button" class="oc-pill${i === this.activeSideIndex ? ' is-active' : ''}" data-oc-side="${i}">
            ${s.label}
          </button>
        `).join('');
        this.sideTabsEl.hidden = false;
      } else {
        this.sideTabsEl.hidden = true;
      }
    }

    setActivePiece(index) {
      if (!this.isSet3D || !this.setPieces.length) return;
      this.activePieceIndex = Math.max(0, Math.min(index, this.setPieces.length - 1));
      this.activeSideIndex = 0;
      const nextShape = this._current3DShape();
      this.viewer3d?.setShape(nextShape);
      this.pieceTabsEl?.querySelectorAll('[data-oc-piece]').forEach((btn, i) => {
        btn.classList.toggle('is-active', i === this.activePieceIndex);
      });
      this._rebuildSidePills();
      this._syncInputs(false);
    }

    _bindControls() {
      const form = this.section?.querySelector('[data-product-form]');
      const gallery = this.section?.querySelector('.pdp__gallery');

      if (form) {
        const onInputActivity = (evt) => {
          const target = evt.target;
          if (!target.matches('input, textarea')) return;

          if (target.type === 'radio') {
            setTimeout(() => {
              this.finishKey = this._detectFinish();
              if (this.viewer3d) {
                this.viewer3d.setFinish(this.finishKey);
                const sh = this._current3DShape();
                if (sh === 'dog-tag' || sh === 'keychain' || sh.startsWith('horizontal-bar')) {
                  this.viewer3d.setBackEnabled(this._detectBackEngravingOption());
                }
              }
              this._rebuildSidePills();
              this._syncInputs(false);
            }, 30);
            return;
          }

          const inputs = this._getEngravingInputs();
          const idx = inputs.indexOf(target);
          if (idx >= 0) {
            if (this.mode === 'raw') this.setMode(this.supports3D ? '3d' : 'photo');
            this._focusInputSide(target, idx);
            this._syncInputs(false);
          }
        };
        form.addEventListener('input', onInputActivity);
        form.addEventListener('change', onInputActivity);

        form.addEventListener('focusin', (evt) => {
          const target = evt.target;
          const inputs = this._getEngravingInputs();
          const idx = inputs.indexOf(target);
          if (idx >= 0) {
            if (this.mode === 'raw') this.setMode(this.supports3D ? '3d' : 'photo');
            this._focusInputSide(target, idx);
            this._syncInputs(false);
            gallery?.classList.add('oc-mobile-sticky');
          }
        });
        form.addEventListener('focusout', () => {
          setTimeout(() => {
            const inputs = this._getEngravingInputs();
            if (!inputs.includes(document.activeElement)) {
              gallery?.classList.remove('oc-mobile-sticky');
            }
          }, 120);
        });
      }

      document.addEventListener('click', (evt) => {
        if (evt.target.closest('[data-locator-use]')) {
          setTimeout(() => {
            if (this.mode === 'raw') this.setMode(this.supports3D ? '3d' : 'photo');
            this._syncInputs(false);
            if (this.viewer3d && this.mode === '3d') this.viewer3d.focusView(0);
          }, 70);
        }
      });

      this.pieceTabsEl?.addEventListener('click', (evt) => {
        const btn = evt.target.closest('[data-oc-piece]');
        if (!btn) return;
        if (this.mode !== '3d') this.setMode('3d');
        this.setActivePiece(Number(btn.dataset.ocPiece));
      });

      this.sideTabsEl?.addEventListener('click', (evt) => {
        const btn = evt.target.closest('[data-oc-side]');
        if (!btn) return;
        this.setActiveSide(Number(btn.dataset.ocSide));
      });

      this.modeGroup?.addEventListener('click', (evt) => {
        const btn = evt.target.closest('[data-oc-mode]');
        if (!btn) return;
        this.setMode(btn.dataset.ocMode);
      });

      this.toggleBtn?.addEventListener('click', () => {
        this.setMode(this.mode === 'raw' ? 'photo' : 'raw');
      });

      const thumbs = this.section?.querySelector('[data-gallery-thumbs]');
      thumbs?.addEventListener('click', (evt) => {
        const thumbBtn = evt.target.closest('[data-thumb]');
        if (!thumbBtn) return;
        const allThumbs = Array.from(thumbs.querySelectorAll('[data-thumb]'));
        const isFirst = allThumbs.indexOf(thumbBtn) === 0;
        if (!isFirst && !this.calibrateMode) {
          this.setMode('raw');
        } else {
          this.setMode(this.supports3D ? '3d' : 'photo');
        }
      });
    }

    _focusInputSide(target, idx) {
      // Multi-piece Set auto-focus: switch 3D piece when typing into a piece-specific input
      if (this.isSet3D) {
        const overridePiece = target.getAttribute('data-duo-override') || target.getAttribute('data-set-piece-input');
        if (overridePiece) {
          const pIdx = this.setPieces.indexOf(overridePiece.toLowerCase());
          if (pIdx >= 0 && pIdx !== this.activePieceIndex) this.setActivePiece(pIdx);
          return;
        }
        const duoSide = target.getAttribute('data-duo-side');
        if (duoSide) {
          const nIdx = this.setPieces.indexOf('necklace');
          if (nIdx >= 0 && nIdx !== this.activePieceIndex) this.setActivePiece(nIdx);
          this.setActiveSide(parseInt(duoSide, 10) - 1);
          return;
        }
        return;
      }

      const activeShape = this._current3DShape();
      if (activeShape === 'four-sided' && idx < 4) {
        this.setActiveSide(idx);
      } else if (activeShape === 'dog-tag' || activeShape === 'keychain' || activeShape.startsWith('horizontal-bar')) {
        const probe = `${target.name || ''} ${target.id || ''} ${target.placeholder || ''}`.toLowerCase();
        this.setActiveSide(probe.includes('back') ? 1 : 0);
      } else if (activeShape === 'cuff' || activeShape === 'ring') {
        this.setActiveSide(0);
      } else if (this.config.sides && this.config.sides.length > 1 && idx < this.config.sides.length) {
        this.setActiveSide(idx);
      }
    }

    _observeThemeEvents() {
      if (this.section) {
        new MutationObserver(() => {
          this.finishKey = this._detectFinish();
          this._cleanCacheKey = '';
          if (this.viewer3d) this.viewer3d.setFinish(this.finishKey);
          const url = this._resolveBaseImageUrl();
          if (url && url !== this.currentSrc) this.loadBaseImage(url);
          else this.requestRender();
        }).observe(this.section, { attributes: true, attributeFilter: ['data-metal'] });
      }

      const fourRig = this.section?.querySelector('[data-four-sided-engraving]');
      if (fourRig) {
        new MutationObserver(() => {
          this._rebuildSidePills();
          this._syncInputs(false);
        }).observe(fourRig, { attributes: true, attributeFilter: ['data-active-sides'] });
      }

      const duoRig = this.section?.querySelector('[data-set-duo]');
      if (duoRig) {
        new MutationObserver(() => {
          this._rebuildSidePills();
          this._syncInputs(false);
        }).observe(duoRig, { attributes: true, attributeFilter: ['data-max-sides'] });
      }

      if (this.mainImg) {
        new MutationObserver(() => {
          if (this.mode === 'raw') return;
          const url = this._resolveBaseImageUrl();
          if (url && url !== this.currentSrc) this.loadBaseImage(url);
        }).observe(this.mainImg, { attributes: true, attributeFilter: ['src'] });
      }
    }

    setMode(nextMode) {
      if (nextMode === '3d' && !this.supports3D) nextMode = 'photo';
      this.mode = nextMode;

      this.stage.dataset.mode = nextMode;
      this.stage.classList.toggle('oc-preview-paused', nextMode === 'raw');
      this.stage.classList.toggle('oc-mode-3d', nextMode === '3d');

      if (nextMode === '3d') {
        this.stage.classList.add('oc-is-ready');
        this.section?.classList.add('oc-has-photo-preview');
        this.viewer3d?.start();
      } else {
        this.viewer3d?.stop();
        if (nextMode === 'photo') {
          const url = this._resolveBaseImageUrl();
          if (url && url !== this.currentSrc) this.loadBaseImage(url);
          else this.requestRender();
        }
      }

      if (this.toggleBtn) {
        this.toggleBtn.textContent = nextMode === 'raw' ? 'Show live engraving' : 'View photo only';
      }
      this.modeGroup?.querySelectorAll('[data-oc-mode]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.ocMode === nextMode);
      });
    }

    setActiveSide(index) {
      const viewCount = this.supports3D && this.viewer3d
        ? this.viewer3d.getViews().length
        : (this.config.sides?.length || 1);
      this.activeSideIndex = Math.max(0, Math.min(index, viewCount - 1));
      this._cleanCacheKey = '';
      this.sideTabsEl?.querySelectorAll('[data-oc-side]').forEach((btn, i) => {
        btn.classList.toggle('is-active', i === this.activeSideIndex);
      });
      if (this.mode === '3d' && this.viewer3d) {
        this.viewer3d.focusView(this.activeSideIndex);
        return;
      }
      if (this.calibrateMode) this._renderCalibratorBody();
      const url = this._resolveBaseImageUrl();
      if (url && url !== this.currentSrc) this.loadBaseImage(url);
      else this.requestRender();
    }

    requestRender() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = requestAnimationFrame(() => this.render());
    }

    _drawCleanedSurface(ctx, side, finish) {
      const W = this.canvas.width;
      const H = this.canvas.height;
      const key = [
        this.currentSrc, this.finishKey, side.id,
        side.x, side.y, side.w, side.h, side.rotationDeg || 0,
        side.wrapAngleDeg || 95, side.arcCurve || 0
      ].join('|');

      const boxW = Math.max(8, Math.round(side.w * W * 1.06));
      const boxH = Math.max(6, Math.round(side.h * H * 1.22));
      const arcPx = (side.arcCurve || 0) * H;
      const patchH = Math.max(boxH + 8, Math.round(boxH + Math.abs(arcPx) * 2.2 + 8));

      if (this._cleanCacheKey !== key) {
        try {
          const srcCanvas = document.createElement('canvas');
          srcCanvas.width = boxW;
          srcCanvas.height = patchH;
          const sctx = srcCanvas.getContext('2d');
          const rotRad = ((side.rotationDeg || 0) * Math.PI) / 180;

          sctx.translate(boxW / 2, patchH / 2);
          sctx.rotate(-rotRad);
          sctx.drawImage(this.baseImage, -side.x * W, -side.y * H, W, H);

          const imgData = sctx.getImageData(0, 0, boxW, patchH);
          const data = imgData.data;

          const outCanvas = this._cleanPatchCanvas;
          outCanvas.width = boxW;
          outCanvas.height = patchH;
          const octx = outCanvas.getContext('2d');
          const outData = octx.createImageData(boxW, patchH);
          const out = outData.data;

          const isCyl = this.config.geometry === 'cylinder';
          const halfWrap = (((side.wrapAngleDeg || 95) * Math.PI) / 180) / 2;
          const sinHalf = Math.sin(halfWrap) || 1;
          const cosDiff = 1 - Math.cos(halfWrap) || 1;

          const colR = new Float32Array(boxW);
          const colG = new Float32Array(boxW);
          const colB = new Float32Array(boxW);
          const colY = new Float32Array(boxW);
          const colH = new Float32Array(boxW);

          for (let x = 0; x < boxW; x++) {
            const nx = (x / (boxW - 1)) * 2 - 1;
            let yCenter = patchH / 2;
            let localH = boxH;
            if (isCyl) {
              const clamped = Math.max(-1, Math.min(1, nx * sinHalf));
              const theta = Math.asin(clamped);
              const curveNorm = (1 - Math.cos(theta)) / cosDiff;
              yCenter = patchH / 2 + curveNorm * arcPx;
              localH = boxH * (1 - (1 - Math.cos(theta)) * 0.08);
            }
            colY[x] = yCenter;
            colH[x] = localH;

            const yStart = Math.max(0, Math.floor(yCenter - localH * 0.58));
            const yEnd = Math.min(patchH - 1, Math.ceil(yCenter + localH * 0.58));
            const samples = [];
            for (let y = yStart; y <= yEnd; y++) {
              const idx = (y * boxW + x) * 4;
              const r = data[idx], g = data[idx + 1], b = data[idx + 2];
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              samples.push({ lum, r, g, b });
            }
            samples.sort((a, b) => a.lum - b.lum);
            const pickPct = finish.darkBase ? 0.22 : 0.78;
            const pick = samples[Math.min(samples.length - 1, Math.floor(samples.length * pickPct))] || { r: 180, g: 160, b: 120 };
            colR[x] = pick.r;
            colG[x] = pick.g;
            colB[x] = pick.b;
          }

          for (let x = 0; x < boxW; x++) {
            let sr = 0, sg = 0, sb = 0, cnt = 0;
            for (let k = -4; k <= 4; k++) {
              const xx = Math.max(0, Math.min(boxW - 1, x + k));
              sr += colR[xx]; sg += colG[xx]; sb += colB[xx]; cnt++;
            }
            const r = sr / cnt, g = sg / cnt, b = sb / cnt;
            const yCenter = colY[x];
            const halfH = colH[x] / 2;
            const edgeFadeX = Math.min(1, x / 10, (boxW - 1 - x) / 10);

            const yStart = Math.max(0, Math.floor(yCenter - halfH));
            const yEnd = Math.min(patchH - 1, Math.ceil(yCenter + halfH));
            for (let y = yStart; y <= yEnd; y++) {
              const dist = Math.abs(y - yCenter) / halfH;
              const fadeY = dist < 0.62 ? 1 : Math.max(0, (1 - dist) / 0.38);
              const alpha = Math.round(255 * fadeY * edgeFadeX);
              const idx = (y * boxW + x) * 4;
              out[idx] = r;
              out[idx + 1] = g;
              out[idx + 2] = b;
              out[idx + 3] = alpha;
            }
          }

          octx.putImageData(outData, 0, 0);
          this._cleanCacheKey = key;
        } catch (err) {
          return;
        }
      }

      ctx.save();
      ctx.translate(side.x * W, side.y * H);
      ctx.rotate(((side.rotationDeg || 0) * Math.PI) / 180);
      ctx.drawImage(this._cleanPatchCanvas, -boxW / 2, -patchH / 2);
      ctx.restore();
    }

    _buildGlyphMask(rawText, boxW, boxH) {
      const ss = 2;
      const bw = Math.max(4, Math.round(boxW * ss));
      const bh = Math.max(4, Math.round(boxH * ss));
      this.glyphBuffer.width = bw;
      this.glyphBuffer.height = bh;

      const gctx = this.glyphBuffer.getContext('2d');
      gctx.clearRect(0, 0, bw, bh);

      const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return false;

      const family = this.config.fontFamily || "'IBM Plex Mono', 'Inter', sans-serif";
      const weight = this.config.fontWeight || '500';
      const tracking = (this.config.letterSpacing || 0) * ss;
      const lineHeightRatio = 1.24;

      let fontSize = (bh * 0.78) / (lines.length === 1 ? 1 : lines.length * lineHeightRatio);
      const maxWidth = bw * 0.92;

      const measureLine = (str, size) => {
        gctx.font = `${weight} ${size}px ${family}`;
        return gctx.measureText(str).width + Math.max(0, str.length - 1) * tracking;
      };

      let widest = Math.max(...lines.map((l) => measureLine(l, fontSize)));
      if (widest > maxWidth) {
        fontSize = Math.max(10, fontSize * (maxWidth / widest));
      }

      gctx.font = `${weight} ${fontSize}px ${family}`;
      gctx.fillStyle = '#ffffff';
      gctx.textBaseline = 'middle';
      gctx.textAlign = 'left';

      const lineStep = fontSize * lineHeightRatio;
      const startY = bh / 2 - ((lines.length - 1) * lineStep) / 2;

      lines.forEach((line, lineIdx) => {
        const totalW = measureLine(line, fontSize);
        let cursorX = (bw - totalW) / 2;
        const y = startY + lineIdx * lineStep;
        for (const ch of line) {
          gctx.fillText(ch, cursorX, y);
          cursorX += gctx.measureText(ch).width + tracking;
        }
      });

      return true;
    }

    _tintGlyphs(color) {
      this.tintBuffer.width = this.glyphBuffer.width;
      this.tintBuffer.height = this.glyphBuffer.height;
      const tctx = this.tintBuffer.getContext('2d');
      tctx.clearRect(0, 0, this.tintBuffer.width, this.tintBuffer.height);
      tctx.drawImage(this.glyphBuffer, 0, 0);
      tctx.globalCompositeOperation = 'source-in';
      tctx.fillStyle = color;
      tctx.fillRect(0, 0, this.tintBuffer.width, this.tintBuffer.height);
      tctx.globalCompositeOperation = 'source-over';
      return this.tintBuffer;
    }

    _drawProjected(targetCtx, srcCanvas, side, offsetX = 0, offsetY = 0) {
      const W = this.canvas.width;
      const H = this.canvas.height;
      const cx = side.x * W + offsetX;
      const cy = side.y * H + offsetY;
      const boxW = side.w * W;
      const boxH = side.h * H;
      const rotRad = ((side.rotationDeg || 0) * Math.PI) / 180;

      targetCtx.save();
      targetCtx.translate(cx, cy);
      targetCtx.rotate(rotRad);

      if (this.config.geometry === 'cylinder') {
        const wrapRad = ((side.wrapAngleDeg || 95) * Math.PI) / 180;
        const halfWrap = wrapRad / 2;
        const sinHalf = Math.sin(halfWrap) || 1;
        const cosDiff = 1 - Math.cos(halfWrap) || 1;
        const arcPx = (side.arcCurve || 0) * H;
        const slices = Math.min(180, Math.max(48, Math.round(boxW / 2.5)));
        const srcSliceW = srcCanvas.width / slices;
        const baseAlpha = targetCtx.globalAlpha;

        for (let i = 0; i < slices; i++) {
          const t1 = (-1 + (2 * i) / slices) * halfWrap;
          const t2 = (-1 + (2 * (i + 1)) / slices) * halfWrap;
          const tMid = (t1 + t2) / 2;

          const x1 = (Math.sin(t1) / sinHalf) * (boxW / 2);
          const x2 = (Math.sin(t2) / sinHalf) * (boxW / 2);
          const dw = Math.max(0.6, x2 - x1 + 0.45);
          const yArc = ((1 - Math.cos(tMid)) / cosDiff) * arcPx;
          const dh = boxH * (1 - (1 - Math.cos(tMid)) * 0.08);

          targetCtx.globalAlpha = baseAlpha * Math.pow(Math.max(0.15, Math.cos(tMid)), 0.75);
          targetCtx.drawImage(
            srcCanvas,
            i * srcSliceW, 0, srcSliceW, srcCanvas.height,
            x1, yArc - dh / 2, dw, dh
          );
        }
      } else {
        const skewX = side.skewX || 0;
        const skewY = side.skewY || 0;
        const taper = side.taper || 0;
        targetCtx.transform(1, skewY, skewX, 1, 0, 0);

        if (Math.abs(taper) > 0.001) {
          const slices = 48;
          const srcSliceW = srcCanvas.width / slices;
          const dstSliceW = boxW / slices;
          for (let i = 0; i < slices; i++) {
            const u = -1 + (2 * i) / slices;
            const dh = boxH * (1 + u * taper);
            targetCtx.drawImage(
              srcCanvas,
              i * srcSliceW, 0, srcSliceW, srcCanvas.height,
              -boxW / 2 + i * dstSliceW, -dh / 2, dstSliceW + 0.5, dh
            );
          }
        } else {
          targetCtx.drawImage(srcCanvas, -boxW / 2, -boxH / 2, boxW, boxH);
        }
      }

      targetCtx.restore();
    }

    render() {
      if (!this.baseImage || this.mode !== 'photo') return;
      const ctx = this.ctx;
      const W = this.canvas.width;
      const H = this.canvas.height;
      const finish = FINISHES[this.finishKey] || FINISHES.gold;

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.drawImage(this.baseImage, 0, 0, W, H);

      const lightRad = ((this.config.lightAngleDeg ?? -45) * Math.PI) / 180;
      const bevelPx = Math.max(1, W / 900);
      const dx = Math.cos(lightRad) * bevelPx;
      const dy = Math.sin(lightRad) * bevelPx;

      const sideIndex = Math.min(this.activeSideIndex, (this.config.sides?.length || 1) - 1);
      const sidesToDraw = this.config.renderAllSides
        ? (this.config.sides || [])
        : [this.config.sides?.[sideIndex]].filter(Boolean);

      for (const side of sidesToDraw) {
        if (this.config.eraseSampleText && !(this.config.blankImages && this.config.blankImages[this.finishKey])) {
          this._drawCleanedSurface(ctx, side, finish);
        }

        const text = this.textsBySide[side.id];
        if (text && this._buildGlyphMask(text, side.w * W, side.h * H)) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = finish.highlightAlpha;
          this._drawProjected(ctx, this._tintGlyphs(finish.highlight), side, -dx, -dy);
          ctx.restore();

          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = finish.shadowAlpha;
          this._drawProjected(ctx, this._tintGlyphs(finish.shadow), side, dx * 0.7, dy * 0.7);
          ctx.restore();

          ctx.save();
          ctx.globalCompositeOperation = finish.fillBlend;
          ctx.globalAlpha = finish.fillAlpha;
          this._drawProjected(ctx, this._tintGlyphs(finish.fill), side, 0, 0);
          ctx.restore();

          if (finish.sheenAlpha > 0) {
            const sctx = this.sheenBuffer.getContext('2d');
            sctx.clearRect(0, 0, W, H);
            sctx.globalCompositeOperation = 'source-over';
            sctx.globalAlpha = 1;
            this._drawProjected(sctx, this.glyphBuffer, side, 0, 0);
            sctx.globalCompositeOperation = 'source-in';
            sctx.drawImage(this.baseImage, 0, 0, W, H);

            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = finish.sheenAlpha;
            ctx.drawImage(this.sheenBuffer, 0, 0);
            ctx.restore();
          }
        }

        if (this.calibrateMode) {
          ctx.save();
          ctx.translate(side.x * W, side.y * H);
          ctx.rotate(((side.rotationDeg || 0) * Math.PI) / 180);
          ctx.strokeStyle = '#00f5d4';
          ctx.lineWidth = Math.max(2, W / 500);
          ctx.setLineDash([8, 6]);
          ctx.strokeRect((-side.w * W) / 2, (-side.h * H) / 2, side.w * W, side.h * H);
          ctx.restore();
        }
      }
    }

    _mountCalibrator() {
      if (this.hudEl) return;
      this.hudEl = document.createElement('div');
      this.hudEl.className = 'oc-cal-hud';

      this.hudEl.addEventListener('input', (evt) => {
        const k = evt.target.dataset.k;
        if (!k) return;
        const sideIdx = Math.min(this.activeSideIndex, (this.config.sides?.length || 1) - 1);
        const s = this.config.sides[sideIdx];
        if (k === 'eraseSampleText') {
          this.config.eraseSampleText = evt.target.checked;
        } else {
          const val = parseFloat(evt.target.value);
          s[k] = val;
          evt.target.previousElementSibling.textContent = k.includes('Deg') ? `${val}°` : val.toFixed(3);
        }
        this._cleanCacheKey = '';
        this.requestRender();
      });

      this.hudEl.addEventListener('click', (evt) => {
        const copyBtn = evt.target.closest('[data-cal-copy]');
        if (copyBtn) {
          const jsonStr = JSON.stringify(this.config, null, 2);
          let box = this.hudEl.querySelector('[data-cal-output]');
          if (!box) {
            box = document.createElement('textarea');
            box.setAttribute('data-cal-output', '');
            box.readOnly = true;
            box.rows = 5;
            box.style.cssText = 'width:100%;margin-top:4px;padding:6px;background:#090a0e;color:#00f5d4;border:1px solid rgba(0,245,212,0.45);border-radius:6px;font:11px/1.3 monospace;resize:vertical;';
            this.hudEl.appendChild(box);
          }
          box.value = jsonStr;
          box.focus();
          box.select();

          let copied = false;
          try { copied = document.execCommand('copy'); } catch (_) {}
          if (!copied && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(jsonStr).catch(() => {});
          }
          copyBtn.textContent = copied ? 'Copied!' : 'Selected — ⌘C';
          setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 2200);
        }
        if (evt.target.closest('[data-cal-close]')) {
          this.calibrateMode = false;
          this.calBtn?.classList.remove('is-active');
          this._unmountCalibrator();
          this.requestRender();
        }
      });

      this._renderCalibratorBody();
      document.body.appendChild(this.hudEl);
    }

    _renderCalibratorBody() {
      if (!this.hudEl) return;
      const sideIdx = Math.min(this.activeSideIndex, (this.config.sides?.length || 1) - 1);
      const s = this.config.sides[sideIdx];
      const isCyl = this.config.geometry === 'cylinder';
      this.hudEl.innerHTML = `
        <div class="oc-cal-head">
          <strong>Calibrate: ${s.label}</strong>
          <div style="display:flex;gap:6px">
            <button type="button" data-cal-copy>Copy JSON</button>
            <button type="button" data-cal-close style="background:#2b2d38;color:#fff">✕</button>
          </div>
        </div>
        <label class="oc-cal-check">
          <input type="checkbox" data-k="eraseSampleText" ${this.config.eraseSampleText ? 'checked' : ''}>
          <span>Hide baked-in sample text</span>
        </label>
        <label>X <span>${s.x.toFixed(3)}</span><input type="range" data-k="x" min="0.05" max="0.95" step="0.002" value="${s.x}"></label>
        <label>Y <span>${s.y.toFixed(3)}</span><input type="range" data-k="y" min="0.05" max="0.95" step="0.002" value="${s.y}"></label>
        <label>Width <span>${s.w.toFixed(3)}</span><input type="range" data-k="w" min="0.05" max="0.90" step="0.002" value="${s.w}"></label>
        <label>Height <span>${s.h.toFixed(3)}</span><input type="range" data-k="h" min="0.015" max="0.30" step="0.001" value="${s.h}"></label>
        <label>Rotate <span>${s.rotationDeg || 0}°</span><input type="range" data-k="rotationDeg" min="-180" max="180" step="0.5" value="${s.rotationDeg || 0}"></label>
        ${isCyl ? `
          <label>Wrap° <span>${s.wrapAngleDeg || 95}°</span><input type="range" data-k="wrapAngleDeg" min="10" max="160" step="1" value="${s.wrapAngleDeg || 95}"></label>
          <label>Curve <span>${(s.arcCurve || 0).toFixed(3)}</span><input type="range" data-k="arcCurve" min="-0.15" max="0.15" step="0.002" value="${s.arcCurve || 0}"></label>
        ` : `
          <label>SkewX <span>${(s.skewX || 0).toFixed(3)}</span><input type="range" data-k="skewX" min="-0.4" max="0.4" step="0.005" value="${s.skewX || 0}"></label>
          <label>Taper <span>${(s.taper || 0).toFixed(3)}</span><input type="range" data-k="taper" min="-0.25" max="0.25" step="0.005" value="${s.taper || 0}"></label>
        `}
      `;
    }

    _unmountCalibrator() {
      this.hudEl?.remove();
      this.hudEl = null;
    }
  }

  const initAll = () => {
    document.querySelectorAll('[data-oc-preview-stage]').forEach((stageEl) => {
      if (stageEl.dataset.ocMounted) return;
      const needs3d = Boolean(stageEl.dataset.oc3dShape);
      if (needs3d && !window.OCJewelry3D) return;
      const jsonEl = stageEl.querySelector('[data-oc-preview-config]');
      if (!jsonEl) return;
      try {
        stageEl.dataset.ocMounted = '1';
        new CoordinateEngravingPreview(stageEl, JSON.parse(jsonEl.textContent));
      } catch (err) {
        console.warn('[OurCoordinates Preview] Invalid preview_config JSON', err);
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
  document.addEventListener('oc:3d-ready', initAll);
  document.addEventListener('shopify:section:load', initAll);
})();
