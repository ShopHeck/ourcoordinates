/**
 * OurCoordinates.com — Unified Interactive 360° 3D Jewelry Preview Engine v7
 * Zero external dependencies.
 * Shapes: four-sided, cuff, ring, dog-tag, keychain,
 *         horizontal-bar, horizontal-bar-chain, horizontal-bar-cord.
 */
(() => {
  const METAL_PALETTES = {
    gold: {
      base: [216, 181, 106],
      dark: [104, 76, 26],
      inner: [132, 98, 38],
      bright: [255, 245, 206],
      rim: 'rgba(255, 244, 204, 0.86)',
      chainLight: '#f5df9c',
      chainDark: '#8c6925',
      engraveFill: '#382407',
      engraveBlend: 'multiply',
      engraveAlpha: 0.88,
      engraveHi: '#fff6d1',
      engraveHiAlpha: 0.44,
      glow: 'rgba(218, 178, 92, 0.21)'
    },
    'rose-gold': {
      base: [219, 160, 140],
      dark: [112, 62, 49],
      inner: [142, 84, 68],
      bright: [255, 232, 222],
      rim: 'rgba(255, 230, 220, 0.84)',
      chainLight: '#f6d2c3',
      chainDark: '#945746',
      engraveFill: '#451f18',
      engraveBlend: 'multiply',
      engraveAlpha: 0.86,
      engraveHi: '#ffe9df',
      engraveHiAlpha: 0.40,
      glow: 'rgba(219, 152, 130, 0.21)'
    },
    silver: {
      base: [212, 217, 224],
      dark: [98, 104, 114],
      inner: [132, 138, 148],
      bright: [255, 255, 255],
      rim: 'rgba(255, 255, 255, 0.90)',
      chainLight: '#f4f6f9',
      chainDark: '#7a808c',
      engraveFill: '#1a2028',
      engraveBlend: 'multiply',
      engraveAlpha: 0.84,
      engraveHi: '#ffffff',
      engraveHiAlpha: 0.50,
      glow: 'rgba(210, 220, 235, 0.19)'
    },
    black: {
      base: [46, 48, 56],
      dark: [14, 15, 20],
      inner: [24, 26, 32],
      bright: [134, 140, 154],
      rim: 'rgba(190, 198, 214, 0.52)',
      chainLight: '#6c7280',
      chainDark: '#17181f',
      engraveFill: '#e1e7f0',
      engraveBlend: 'screen',
      engraveAlpha: 0.84,
      engraveHi: '#ffffff',
      engraveHiAlpha: 0.30,
      glow: 'rgba(140, 150, 175, 0.15)'
    }
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function mixRgb(c1, c2, t) {
    return [
      Math.round(lerp(c1[0], c2[0], t)),
      Math.round(lerp(c1[1], c2[1], t)),
      Math.round(lerp(c1[2], c2[2], t))
    ];
  }
  function rgbStr(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }

  function shortestAngleDiff(target, current) {
    let diff = ((target - current + Math.PI) % (Math.PI * 2));
    if (diff < 0) diff += Math.PI * 2;
    return diff - Math.PI;
  }

  function shadeMetalColor(pal, nx, ny, nz, isInner = false) {
    // Multi-softbox studio jewelry reflection (primary front-left key + crisp right rim)
    const d1 = clamp(nx * -0.46 + ny * -0.35 + nz * 0.82, -1, 1);
    const d2 = clamp(nx * 0.72 + ny * 0.10 + nz * 0.68, -1, 1);
    const d3 = clamp(nx * 0.18 + ny * -0.20 + nz * 0.96, -1, 1);
    const baseCol = isInner ? pal.inner : pal.base;
    let t = clamp(0.22 + Math.max(0, d1) * 0.58 + Math.max(0, d2) * 0.24, 0.10, 1.0);
    if (isInner) t *= 0.72;
    const spec1 = Math.pow(clamp(d1, 0, 1), 7) * (isInner ? 0.22 : 0.85);
    const spec2 = Math.pow(clamp(d2, 0, 1), 10) * (isInner ? 0.12 : 0.45);
    const spec3 = Math.pow(clamp(d3, 0, 1), 18) * (isInner ? 0.08 : 0.35);
    const body = mixRgb(pal.dark, baseCol, t);
    return mixRgb(body, pal.bright, clamp(spec1 + spec2 + spec3, 0, 0.95));
  }

  const HBAR_META = {
    defaultYaw: -0.22,
    defaultPitch: 0.07,
    minPitch: -0.26,
    maxPitch: 0.34,
    swayAmp: 0.18,
    views: [
      { label: 'Front', yaw: -0.14, pitch: 0.07 },
      { label: 'Back',  yaw: Math.PI - 0.14, pitch: 0.07 }
    ]
  };

  const SHAPE_META = {
    'four-sided': {
      defaultYaw: -0.38,
      defaultPitch: 0.06,
      minPitch: -0.22,
      maxPitch: 0.26,
      swayAmp: 0.22,
      views: [
        { label: 'Front', yaw: -0.24, pitch: 0.06 },
        { label: 'Back',  yaw: Math.PI - 0.24, pitch: 0.06 },
        { label: 'Left',  yaw: Math.PI / 2 - 0.24, pitch: 0.06 },
        { label: 'Right', yaw: -Math.PI / 2 - 0.24, pitch: 0.06 }
      ]
    },
    cuff: {
      defaultYaw: -0.16,
      defaultPitch: 0.34,
      minPitch: -0.20,
      maxPitch: 0.62,
      swayAmp: 0.18,
      views: [
        { label: 'Front',     yaw: 0, pitch: 0.34 },
        { label: 'Left',      yaw: 0.92, pitch: 0.30 },
        { label: 'Right',     yaw: -0.92, pitch: 0.30 },
        { label: 'Open Back', yaw: Math.PI, pitch: 0.36 }
      ]
    },
    ring: {
      defaultYaw: -0.20,
      defaultPitch: 0.36,
      minPitch: -0.24,
      maxPitch: 0.68,
      swayAmp: 0.22,
      views: [
        { label: 'Front', yaw: 0, pitch: 0.36 },
        { label: 'Left',  yaw: Math.PI / 2, pitch: 0.32 },
        { label: 'Right', yaw: -Math.PI / 2, pitch: 0.32 },
        { label: 'Back',  yaw: Math.PI, pitch: 0.34 }
      ]
    },
    'dog-tag': {
      defaultYaw: -0.22,
      defaultPitch: 0.05,
      minPitch: -0.22,
      maxPitch: 0.26,
      swayAmp: 0.18,
      views: [
        { label: 'Front', yaw: -0.16, pitch: 0.05 },
        { label: 'Back',  yaw: Math.PI - 0.16, pitch: 0.05 }
      ]
    },
    keychain: {
      defaultYaw: -0.24,
      defaultPitch: 0.05,
      minPitch: -0.22,
      maxPitch: 0.26,
      swayAmp: 0.18,
      views: [
        { label: 'Front', yaw: -0.18, pitch: 0.05 },
        { label: 'Back',  yaw: Math.PI - 0.18, pitch: 0.05 }
      ]
    },
    'horizontal-bar': HBAR_META,
    'horizontal-bar-chain': HBAR_META,
    'horizontal-bar-cord': HBAR_META
  };

  class OCJewelry3D {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.shape = SHAPE_META[opts.shape] ? opts.shape : 'four-sided';
      this.meta = SHAPE_META[this.shape];
      this.onInteract = opts.onInteract || null;
      this.onActiveViewChange = opts.onActiveViewChange || null;
      this.fontFamily = opts.fontFamily || "'IBM Plex Mono', 'Inter', sans-serif";

      this.finishKey = 'gold';
      this.activeSides = this.shape === 'four-sided' ? 4 : 1;
      this.hasBackEngraving = false;
      this.texts = ['', '', '', ''];
      this.placeholders = this._defaultPlaceholders();

      this.yaw = this.meta.defaultYaw;
      this.pitch = this.meta.defaultPitch;
      this.velYaw = 0;
      this.targetYaw = null;
      this.targetPitch = null;
      this.isDragging = false;
      this.lastX = 0;
      this.lastY = 0;
      this.hasInteracted = false;
      this.running = false;
      this.rafId = null;
      this.time = 0;
      this.lastReportedView = 0;

      this.textures = {};
      this.texturesDirty = true;

      this._resize();
      this._bindPointer();
    }

    _defaultPlaceholders() {
      if (this.shape === 'four-sided') return ['27.7676° N', '82.6403° W', 'EST. 2021', 'OUR PLACE'];
      if (this.shape === 'dog-tag') return ['27.7676° N\n82.6403° W', ''];
      return ['27.7676° N, 82.6403° W', '', '', ''];
    }

    setShape(nextShape) {
      if (!SHAPE_META[nextShape]) return;
      if (this.shape === nextShape) return;
      this.shape = nextShape;
      this.meta = SHAPE_META[nextShape];
      this.placeholders = this._defaultPlaceholders();
      this.yaw = this.meta.defaultYaw;
      this.pitch = this.meta.defaultPitch;
      this.velYaw = 0;
      this.targetYaw = null;
      this.targetPitch = null;
      this.lastReportedView = -1;
      this.texturesDirty = true;
    }

    getViews() {
      return this.meta.views;
    }

    _resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(520, Math.round((rect.width || 600) * dpr));
      const h = Math.max(520, Math.round((rect.height || rect.width || 600) * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
    }

    setFinish(finishKey) {
      const key = METAL_PALETTES[finishKey] ? finishKey : 'gold';
      if (this.finishKey !== key) {
        this.finishKey = key;
        this.texturesDirty = true;
      }
    }

    setActiveSides(count) {
      const n = clamp(parseInt(count, 10) || 4, 1, 4);
      if (this.activeSides !== n) {
        this.activeSides = n;
        this.texturesDirty = true;
      }
    }

    setBackEnabled(enabled) {
      const flag = Boolean(enabled);
      if (this.hasBackEngraving !== flag) {
        this.hasBackEngraving = flag;
        this.texturesDirty = true;
      }
    }

    setTexts(textsArr, placeholdersArr) {
      let changed = false;
      for (let i = 0; i < 4; i++) {
        const nextVal = (textsArr[i] || '').trim();
        if (this.texts[i] !== nextVal) {
          this.texts[i] = nextVal;
          changed = true;
        }
        if (placeholdersArr && placeholdersArr[i] !== undefined) {
          const nextPh = (placeholdersArr[i] || '').replace(/^e\.g\.\s*/i, '').trim();
          if (this.placeholders[i] !== nextPh) {
            this.placeholders[i] = nextPh;
            changed = true;
          }
        }
      }
      if (changed) this.texturesDirty = true;
    }

    focusView(viewIdx) {
      const v = this.meta.views[viewIdx];
      if (!v) return;
      this.targetYaw = this.yaw + shortestAngleDiff(v.yaw, this.yaw);
      this.targetPitch = v.pitch;
      this.velYaw = 0;
    }

    start() {
      if (this.running) return;
      this.running = true;
      this._resize();
      const tick = (now) => {
        if (!this.running) return;
        this.time = now * 0.001;
        this._updatePhysics();
        this.render();
        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    }

    stop() {
      this.running = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    _bindPointer() {
      const el = this.canvas;
      const onDown = (e) => {
        this.isDragging = true;
        this.targetYaw = null;
        this.targetPitch = null;
        this.velYaw = 0;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        el.setPointerCapture?.(e.pointerId);
        el.style.cursor = 'grabbing';
        if (!this.hasInteracted) {
          this.hasInteracted = true;
          this.onInteract?.();
        }
      };
      const onMove = (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        const deltaYaw = dx * 0.011;
        this.yaw += deltaYaw;
        this.velYaw = deltaYaw;
        this.pitch = clamp(this.pitch + dy * 0.0055, this.meta.minPitch, this.meta.maxPitch);
      };
      const onUp = (e) => {
        if (!this.isDragging) return;
        this.isDragging = false;
        el.releasePointerCapture?.(e.pointerId);
        el.style.cursor = 'grab';
      };

      el.style.cursor = 'grab';
      el.style.touchAction = 'none';
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
      window.addEventListener('resize', () => { if (this.running) this._resize(); });
    }

    _updatePhysics() {
      if (this.isDragging) return;
      if (this.targetYaw !== null) {
        const diff = this.targetYaw - this.yaw;
        if (Math.abs(diff) < 0.003) {
          this.yaw = this.targetYaw;
          this.targetYaw = null;
        } else {
          this.yaw += diff * 0.14;
        }
      } else if (Math.abs(this.velYaw) > 0.0004) {
        this.yaw += this.velYaw;
        this.velYaw *= 0.93;
      } else if (!this.hasInteracted) {
        this.yaw = this.meta.defaultYaw + Math.sin(this.time * 0.65) * this.meta.swayAmp;
      }

      if (this.targetPitch !== null) {
        const pd = this.targetPitch - this.pitch;
        if (Math.abs(pd) < 0.002) {
          this.pitch = this.targetPitch;
          this.targetPitch = null;
        } else {
          this.pitch += pd * 0.14;
        }
      } else if (!this.hasInteracted) {
        this.pitch += (this.meta.defaultPitch - this.pitch) * 0.04;
      }
    }

    // ------------------------------------------------------------------------
    // Texture Builders
    // ------------------------------------------------------------------------
    _ensureTex(key, w, h) {
      if (!this.textures[key] || this.textures[key].width !== w || this.textures[key].height !== h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        this.textures[key] = c;
      }
      return this.textures[key];
    }

    _drawEngravedTextBlock(ctx, text, opts) {
      const {
        w, h, pal, isPlaceholder,
        vertical = false,
        yCenterRatio = 0.5,
        maxLenRatio = 0.84,
        baseFontSize = 54,
        minFontSize = 20,
        tracking = 4
      } = opts;

      const lines = (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return;

      const alphaScale = isPlaceholder ? 0.56 : 1.0;
      const maxSpan = (vertical ? h : w) * maxLenRatio;
      const maxThickness = (vertical ? w : h) * 0.72;
      const lineGapRatio = 1.32;

      let fontSize = Math.min(baseFontSize, maxThickness / (lines.length === 1 ? 1 : lines.length * lineGapRatio));

      const measureLine = (str, size) => {
        ctx.font = `500 ${size}px ${this.fontFamily}`;
        return ctx.measureText(str).width + Math.max(0, str.length - 1) * tracking;
      };

      const widest = Math.max(...lines.map((l) => measureLine(l, fontSize)));
      if (widest > maxSpan) {
        fontSize = Math.max(minFontSize, fontSize * (maxSpan / widest));
      }

      const lineStep = fontSize * lineGapRatio;

      const renderPass = (color, ox, oy, alpha) => {
        ctx.save();
        ctx.translate(w / 2 + ox, h * yCenterRatio + oy);
        if (vertical) ctx.rotate(Math.PI / 2);
        ctx.font = `500 ${fontSize}px ${this.fontFamily}`;
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * alphaScale;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        const startY = -((lines.length - 1) * lineStep) / 2;
        lines.forEach((line, idx) => {
          const totalW = measureLine(line, fontSize);
          let cursorX = -totalW / 2;
          const y = startY + idx * lineStep;
          for (const ch of line) {
            ctx.fillText(ch, cursorX, y);
            cursorX += ctx.measureText(ch).width + tracking;
          }
        });
        ctx.restore();
      };

      renderPass(pal.engraveHi, 2.0, 2.0, pal.engraveHiAlpha);
      renderPass(pal.engraveFill, 0, 0, pal.engraveAlpha);
    }

    _rebuildTextures() {
      const pal = METAL_PALETTES[this.finishKey] || METAL_PALETTES.gold;

      if (this.shape === 'four-sided') {
        const anyTyped = this.texts.some((t) => t.length > 0);
        for (let i = 0; i < 4; i++) {
          const c = this._ensureTex(`face_${i}`, 220, 960);
          const ctx = c.getContext('2d');
          ctx.clearRect(0, 0, c.width, c.height);
          if ((i + 1) > this.activeSides) continue;
          const txt = this.texts[i] || (!anyTyped ? (this.placeholders[i] || '') : '');
          if (!txt) continue;
          this._drawEngravedTextBlock(ctx, txt, {
            w: c.width, h: c.height, pal,
            isPlaceholder: !this.texts[i],
            vertical: true, yCenterRatio: 0.54, maxLenRatio: 0.72,
            baseFontSize: 54, minFontSize: 22, tracking: 5
          });
        }
      } else if (this.shape === 'cuff' || this.shape === 'ring') {
        const c = this._ensureTex('band', 1440, 200);
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
        const raw = this.texts[0] || this.placeholders[0] || '27.7676° N, 82.6403° W';
        this._drawEngravedTextBlock(ctx, raw, {
          w: c.width, h: c.height, pal,
          isPlaceholder: !this.texts[0],
          vertical: false, yCenterRatio: 0.50, maxLenRatio: 0.88,
          baseFontSize: this.shape === 'ring' ? 76 : 72, minFontSize: 28, tracking: 6
        });
      } else if (this.shape === 'dog-tag') {
        const cf = this._ensureTex('front', 540, 920);
        const fctx = cf.getContext('2d');
        fctx.clearRect(0, 0, cf.width, cf.height);
        const frontTxt = this.texts[0] || this.placeholders[0] || '27.7676° N\n82.6403° W';
        this._drawEngravedTextBlock(fctx, frontTxt, {
          w: cf.width, h: cf.height, pal,
          isPlaceholder: !this.texts[0],
          vertical: false, yCenterRatio: 0.53, maxLenRatio: 0.82,
          baseFontSize: 58, minFontSize: 22, tracking: 3.5
        });

        const cb = this._ensureTex('back', 540, 920);
        const bctx = cb.getContext('2d');
        bctx.clearRect(0, 0, cb.width, cb.height);
        const backTxt = this.texts[1] || (this.hasBackEngraving ? 'BACK ENGRAVING' : '');
        if (backTxt) {
          this._drawEngravedTextBlock(bctx, backTxt, {
            w: cb.width, h: cb.height, pal,
            isPlaceholder: !this.texts[1],
            vertical: false, yCenterRatio: 0.53, maxLenRatio: 0.80,
            baseFontSize: 52, minFontSize: 22, tracking: 3.5
          });
        }
      } else if (this.shape === 'keychain') {
        const cf = this._ensureTex('front', 240, 960);
        const fctx = cf.getContext('2d');
        fctx.clearRect(0, 0, cf.width, cf.height);
        const frontTxt = this.texts[0] || this.placeholders[0] || '27.7676° N, 82.6403° W';
        this._drawEngravedTextBlock(fctx, frontTxt, {
          w: cf.width, h: cf.height, pal,
          isPlaceholder: !this.texts[0],
          vertical: true, yCenterRatio: 0.55, maxLenRatio: 0.74,
          baseFontSize: 56, minFontSize: 22, tracking: 4.5
        });

        const cb = this._ensureTex('back', 240, 960);
        const bctx = cb.getContext('2d');
        bctx.clearRect(0, 0, cb.width, cb.height);
        const backTxt = this.texts[1] || (this.hasBackEngraving ? 'BACK ENGRAVING' : '');
        if (backTxt) {
          this._drawEngravedTextBlock(bctx, backTxt, {
            w: cb.width, h: cb.height, pal,
            isPlaceholder: !this.texts[1],
            vertical: true, yCenterRatio: 0.55, maxLenRatio: 0.72,
            baseFontSize: 52, minFontSize: 22, tracking: 4.5
          });
        }
      } else if (this.shape.startsWith('horizontal-bar')) {
        const cf = this._ensureTex('hbar_front', 1200, 220);
        const fctx = cf.getContext('2d');
        fctx.clearRect(0, 0, cf.width, cf.height);
        const frontTxt = this.texts[0] || this.placeholders[0] || '27.7676° N, 82.6403° W';
        this._drawEngravedTextBlock(fctx, frontTxt, {
          w: cf.width, h: cf.height, pal,
          isPlaceholder: !this.texts[0],
          vertical: false, yCenterRatio: 0.50, maxLenRatio: 0.80,
          baseFontSize: 66, minFontSize: 24, tracking: 5
        });

        const cb = this._ensureTex('hbar_back', 1200, 220);
        const bctx = cb.getContext('2d');
        bctx.clearRect(0, 0, cb.width, cb.height);
        const backTxt = this.texts[1] || (this.hasBackEngraving ? 'BACK ENGRAVING' : '');
        if (backTxt) {
          this._drawEngravedTextBlock(bctx, backTxt, {
            w: cb.width, h: cb.height, pal,
            isPlaceholder: !this.texts[1],
            vertical: false, yCenterRatio: 0.50, maxLenRatio: 0.78,
            baseFontSize: 58, minFontSize: 24, tracking: 5
          });
        }
      }

      this.texturesDirty = false;
    }

    // ------------------------------------------------------------------------
    // 3D Math & Shared Studio Rendering Helpers (+Z toward camera)
    // ------------------------------------------------------------------------
    _rotYP(x, y, z) {
      const cosY = Math.cos(this.yaw);
      const sinY = Math.sin(this.yaw);
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;
      const cosP = Math.cos(this.pitch);
      const sinP = Math.sin(this.pitch);
      const y2 = y * cosP + z1 * sinP;
      const z2 = -y * sinP + z1 * cosP;
      return { x: x1, y: y2, z: z2 };
    }

    _project3D(p, cx, cy, focal) {
      const depth = focal - p.z;
      const s = focal / Math.max(100, depth);
      return { x: cx + p.x * s, y: cy + p.y * s, z: p.z, s };
    }

    _drawStudioBackdrop(ctx, W, H, cx, cy, S, pal, shadowOffsetY = 0.34, shadowScaleX = 1.25) {
      const bg = ctx.createRadialGradient(cx, cy * 0.88, S * 0.04, cx, cy, S * 0.80);
      bg.addColorStop(0, '#24262f');
      bg.addColorStop(0.55, '#13141a');
      bg.addColorStop(1, '#08090d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, S * 0.39);
      halo.addColorStop(0, pal.glow);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);

      const shadowY = cy + S * shadowOffsetY;
      const shadow = ctx.createRadialGradient(cx, shadowY, 4, cx, shadowY, S * 0.18);
      shadow.addColorStop(0, 'rgba(0,0,0,0.62)');
      shadow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.translate(cx, shadowY);
      ctx.scale(shadowScaleX, 0.24);
      ctx.beginPath();
      ctx.arc(0, 0, S * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = shadow;
      ctx.fill();
      ctx.restore();
    }

    _drawHeaderStatus(ctx, cx, H, S, label, isHighlight = true) {
      ctx.save();
      ctx.font = `600 ${Math.round(S * 0.019)}px 'Inter', system-ui, sans-serif`;
      ctx.fillStyle = isHighlight ? 'rgba(244, 244, 246, 0.80)' : 'rgba(244, 244, 246, 0.48)';
      ctx.textAlign = 'center';
      ctx.fillText(label, cx, H * 0.072);
      ctx.restore();
    }

    _reportClosestView() {
      let bestIdx = 0;
      let bestDist = Infinity;
      this.meta.views.forEach((v, idx) => {
        const d = Math.abs(shortestAngleDiff(v.yaw, this.yaw));
        if (d < bestDist) {
          bestDist = d;
          bestIdx = idx;
        }
      });
      if (bestIdx !== this.lastReportedView) {
        this.lastReportedView = bestIdx;
        this.onActiveViewChange?.(bestIdx);
      }
      return bestIdx;
    }

    _drawLinkLine(ctx, x1, y1, x2, y2, pal, S, linkScale = 1.0) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 2) return;
      const angle = Math.atan2(dy, dx);
      const linkStep = Math.max(6, S * 0.0165 * linkScale);
      const count = Math.ceil(len / linkStep);

      ctx.save();
      ctx.translate(x1, y1);
      ctx.rotate(angle);
      for (let i = 0; i < count; i++) {
        const lx = i * linkStep;
        const isFlat = i % 2 === 0;
        ctx.beginPath();
        ctx.ellipse(lx, 0, linkStep * 0.64, isFlat ? linkStep * 0.36 : linkStep * 0.16, 0, 0, Math.PI * 2);
        ctx.strokeStyle = isFlat ? pal.chainLight : pal.chainDark;
        ctx.lineWidth = Math.max(1.5, S * 0.0046 * linkScale);
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawBraidedCordLine(ctx, x1, y1, x2, y2, S) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 2) return;
      const angle = Math.atan2(dy, dx);
      const thick = Math.max(7, S * 0.022);
      const segStep = thick * 0.72;
      const count = Math.ceil(len / segStep);

      ctx.save();
      ctx.translate(x1, y1);
      ctx.rotate(angle);

      // Core dark cord silhouette
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len, 0);
      ctx.strokeStyle = '#18191e';
      ctx.lineWidth = thick;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Alternating diagonal woven cord strands
      for (let i = 0; i < count; i++) {
        const lx = i * segStep;
        const sign = i % 2 === 0 ? 1 : -1;
        ctx.beginPath();
        ctx.ellipse(lx, sign * thick * 0.14, segStep * 0.62, thick * 0.24, sign * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? '#2f323b' : '#24262e';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawChainAndBail(ctx, cx, topCenter, pal, S) {
      const bailR = S * 0.044;
      const bailY = topCenter.y - bailR * 0.55;
      this._drawLinkLine(ctx, topCenter.x - bailR * 0.65, bailY - bailR * 0.65, cx - S * 0.26, -10, pal, S, 1.0);
      this._drawLinkLine(ctx, topCenter.x + bailR * 0.65, bailY - bailR * 0.65, cx + S * 0.26, -10, pal, S, 1.0);

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(topCenter.x, bailY, bailR * 0.72, bailR, 0, 0, Math.PI * 2);
      ctx.strokeStyle = pal.chainDark;
      ctx.lineWidth = Math.max(4, S * 0.015);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(topCenter.x, bailY, bailR * 0.72, bailR, 0, 0, Math.PI * 2);
      ctx.strokeStyle = pal.chainLight;
      ctx.lineWidth = Math.max(2, S * 0.0075);
      ctx.stroke();
      ctx.restore();
    }

    _drawSplitKeyring(ctx, topCenter, pal, S) {
      const jumpR = S * 0.024;
      const jumpY = topCenter.y - jumpR * 0.55;
      const ringR = S * 0.088;
      const ringY = jumpY - ringR - jumpR * 0.55;
      const coilRx = ringR * clamp(0.32 + Math.abs(Math.cos(this.yaw)) * 0.68, 0.32, 1.0);

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(topCenter.x + S * 0.005, ringY, coilRx, ringR, 0, 0, Math.PI * 2);
      ctx.strokeStyle = pal.chainDark;
      ctx.lineWidth = Math.max(6, S * 0.022);
      ctx.stroke();

      const ringGrad = ctx.createLinearGradient(topCenter.x - coilRx, ringY - ringR, topCenter.x + coilRx, ringY + ringR);
      ringGrad.addColorStop(0, pal.chainLight);
      ringGrad.addColorStop(0.45, rgbStr(pal.base));
      ringGrad.addColorStop(0.75, pal.chainLight);
      ringGrad.addColorStop(1, pal.chainDark);

      ctx.beginPath();
      ctx.ellipse(topCenter.x, ringY, coilRx, ringR, 0, 0, Math.PI * 2);
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = Math.max(4.5, S * 0.017);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(topCenter.x, ringY, Math.max(4, coilRx - S * 0.004), ringR - S * 0.004, 0, 0.25, Math.PI * 1.85);
      ctx.strokeStyle = 'rgba(0,0,0,0.38)';
      ctx.lineWidth = Math.max(1, S * 0.003);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(topCenter.x, ringY, coilRx, ringR, 0, -Math.PI * 0.85, -Math.PI * 0.2);
      ctx.strokeStyle = pal.rim;
      ctx.lineWidth = Math.max(1.5, S * 0.005);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(topCenter.x, jumpY, jumpR * 0.72, jumpR, 0, 0, Math.PI * 2);
      ctx.strokeStyle = pal.chainDark;
      ctx.lineWidth = Math.max(3.6, S * 0.013);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(topCenter.x, jumpY, jumpR * 0.72, jumpR, 0, 0, Math.PI * 2);
      ctx.strokeStyle = pal.chainLight;
      ctx.lineWidth = Math.max(1.8, S * 0.0065);
      ctx.stroke();
      ctx.restore();
    }

    // ------------------------------------------------------------------------
    // SHAPE 1: 4-Sided Vertical Bar Necklace
    // ------------------------------------------------------------------------
    _renderFourSided(ctx, W, H, cx, cy, S, focal, pal) {
      this._drawStudioBackdrop(ctx, W, H, cx, cy, S, pal, 0.335, 1.2);

      const halfW = S * 0.068;
      const halfH = S * 0.275;
      const topLocal = [
        [-halfW, -halfH,  halfW],
        [ halfW, -halfH,  halfW],
        [ halfW, -halfH, -halfW],
        [-halfW, -halfH, -halfW]
      ];
      const botLocal = topLocal.map(([x, , z]) => [x, halfH, z]);

      const topProj = topLocal.map(([x, y, z]) => this._project3D(this._rotYP(x, y, z), cx, cy, focal));
      const botProj = botLocal.map(([x, y, z]) => this._project3D(this._rotYP(x, y, z), cx, cy, focal));

      const topCenter = this._project3D(this._rotYP(0, -halfH, 0), cx, cy, focal);
      this._drawChainAndBail(ctx, cx, topCenter, pal, S);

      if (this.pitch > -0.02) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(topProj[0].x, topProj[0].y);
        ctx.lineTo(topProj[1].x, topProj[1].y);
        ctx.lineTo(topProj[2].x, topProj[2].y);
        ctx.lineTo(topProj[3].x, topProj[3].y);
        ctx.closePath();
        const topGrad = ctx.createLinearGradient(topProj[3].x, topProj[3].y, topProj[1].x, topProj[1].y);
        topGrad.addColorStop(0, rgbStr(pal.bright));
        topGrad.addColorStop(1, rgbStr(pal.base));
        ctx.fillStyle = topGrad;
        ctx.fill();
        ctx.strokeStyle = pal.rim;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      const FACE_SPECS = [
        { uiIndex: 0, label: 'Front', normalYaw: 0,            corners: [0, 1] },
        { uiIndex: 3, label: 'Right', normalYaw: Math.PI / 2,  corners: [1, 2] },
        { uiIndex: 1, label: 'Back',  normalYaw: Math.PI,      corners: [2, 3] },
        { uiIndex: 2, label: 'Left',  normalYaw: -Math.PI / 2, corners: [3, 0] }
      ];

      let bestUi = 0;
      let bestNz = -2;
      const visible = [];

      for (const spec of FACE_SPECS) {
        const ang = this.yaw + spec.normalYaw;
        const nx = Math.sin(ang);
        const nz = Math.cos(ang);
        if (nz > bestNz) { bestNz = nz; bestUi = spec.uiIndex; }
        if (nz > -0.04) {
          const [i0, i1] = spec.corners;
          visible.push({
            spec, nx, nz,
            tl: topProj[i0], tr: topProj[i1],
            br: botProj[i1], bl: botProj[i0]
          });
        }
      }

      visible.sort((a, b) => a.nz - b.nz);

      for (const f of visible) {
        const tex = (f.spec.uiIndex + 1) <= this.activeSides ? this.textures[`face_${f.spec.uiIndex}`] : null;
        this._drawFlatMetalFacet(ctx, f.tl, f.tr, f.br, f.bl, pal, f.nx, f.nz, tex, W);
      }

      if (visible.length === 2) {
        const sharedTop = visible[0].tr.x === visible[1].tl.x ? visible[0].tr : visible[1].tr;
        const sharedBot = visible[0].tr.x === visible[1].tl.x ? visible[0].br : visible[1].br;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(sharedTop.x, sharedTop.y);
        ctx.lineTo(sharedBot.x, sharedBot.y);
        ctx.strokeStyle = pal.rim;
        ctx.lineWidth = Math.max(1.5, W / 560);
        ctx.globalAlpha = 0.72;
        ctx.stroke();
        ctx.restore();
      }

      if (bestUi !== this.lastReportedView) {
        this.lastReportedView = bestUi;
        this.onActiveViewChange?.(bestUi);
      }
      const activeSpec = FACE_SPECS.find((s) => s.uiIndex === bestUi);
      if (activeSpec) {
        const isEngraved = (bestUi + 1) <= this.activeSides;
        this._drawHeaderStatus(ctx, cx, H, S, `${activeSpec.label.toUpperCase()} FACE · ${isEngraved ? 'ENGRAVED' : 'UNENGRAVED'}`, isEngraved);
      }
    }

    _drawFlatMetalFacet(ctx, tl, tr, br, bl, pal, nx, nz, tex, W) {
      const dot = clamp(nx * -0.58 + nz * 0.81, -1, 1);
      const specSweep = clamp(0.5 + nx * 0.55 + Math.sin(this.yaw * 1.5) * 0.08, 0.08, 0.92);
      const shade = clamp(0.28 + Math.max(0, dot) * 0.72, 0.20, 1.0);

      const cDark = mixRgb(pal.dark, pal.base, shade * 0.65);
      const cMid  = mixRgb(pal.dark, pal.base, shade);
      const cSpec = mixRgb(pal.base, pal.bright, clamp(0.45 + shade * 0.55, 0, 1));

      const grad = ctx.createLinearGradient(tl.x, tl.y, tr.x, tr.y);
      grad.addColorStop(0, rgbStr(cDark));
      grad.addColorStop(clamp(specSweep - 0.22, 0.02, 0.96), rgbStr(cMid));
      grad.addColorStop(specSweep, rgbStr(cSpec));
      grad.addColorStop(clamp(specSweep + 0.24, 0.04, 0.98), rgbStr(cMid));
      grad.addColorStop(1, rgbStr(cDark));

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      const vGrad = ctx.createLinearGradient(tl.x, tl.y, bl.x, bl.y);
      vGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
      vGrad.addColorStop(0.35, 'rgba(255,255,255,0.03)');
      vGrad.addColorStop(0.75, 'rgba(0,0,0,0.04)');
      vGrad.addColorStop(1, 'rgba(0,0,0,0.24)');
      ctx.fillStyle = vGrad;
      ctx.fill();

      if (tex) {
        ctx.clip();
        const strips = 28;
        const sw = tex.width / strips;
        for (let i = 0; i < strips; i++) {
          const u0 = i / strips;
          const u1 = (i + 1) / strips;
          const x0 = lerp(tl.x, tr.x, u0);
          const y0 = lerp(tl.y, tr.y, u0);
          const x1 = lerp(tl.x, tr.x, u1);
          const y1 = lerp(tl.y, tr.y, u1);
          const bx0 = lerp(bl.x, br.x, u0);
          const by0 = lerp(bl.y, br.y, u0);

          ctx.save();
          ctx.globalCompositeOperation = pal.engraveBlend;
          ctx.globalAlpha = clamp(0.45 + nz * 0.55, 0.2, 1);
          ctx.transform((x1 - x0) / sw, (y1 - y0) / sw, (bx0 - x0) / tex.height, (by0 - y0) / tex.height, x0, y0);
          ctx.drawImage(tex, i * sw, 0, sw + 0.6, tex.height, 0, 0, sw + 0.6, tex.height);
          ctx.restore();
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = pal.rim;
      ctx.lineWidth = Math.max(1, W / 700);
      ctx.globalAlpha = clamp(0.18 + nz * 0.35, 0.12, 0.55);
      ctx.stroke();
      ctx.restore();
    }

    // ------------------------------------------------------------------------
    // SHAPE 2 & 3: 3D Open Cuff Bracelet & 3D Flat Band Ring
    // ------------------------------------------------------------------------
    _renderBand3D(ctx, W, H, cx, cy, S, focal, pal, isCuff) {
      this._drawStudioBackdrop(ctx, W, H, cx, cy, S, pal, isCuff ? 0.25 : 0.27, isCuff ? 2.1 : 1.55);

      const Rx = S * (isCuff ? 0.355 : 0.272);
      const Rz = S * (isCuff ? 0.258 : 0.272);
      const bandH = S * (isCuff ? 0.072 : 0.114);
      const thick = S * (isCuff ? 0.019 : 0.034);
      const halfH = bandH / 2;

      const gapHalf = isCuff ? 0.36 : 0;
      const phiStart = -(Math.PI - gapHalf);
      const phiEnd   =  (Math.PI - gapHalf);
      const segs = 72;
      const dPhi = (phiEnd - phiStart) / segs;

      const engraveSpan = isCuff ? 1.12 : 1.28;
      const bandTex = this.textures.band;

      const stations = [];
      for (let i = 0; i <= segs; i++) {
        const phi = phiStart + i * dPhi;
        const sp = Math.sin(phi);
        const cp = Math.cos(phi);

        const ox = sp * Rx;
        const oz = cp * Rz;
        const ix = sp * (Rx - thick);
        const iz = cp * (Rz - thick);

        const ot = this._rotYP(ox, -halfH, oz);
        const ob = this._rotYP(ox,  halfH, oz);
        const it = this._rotYP(ix, -halfH, iz);
        const ib = this._rotYP(ix,  halfH, iz);

        stations.push({
          phi,
          ot, ob, it, ib,
          pot: this._project3D(ot, cx, cy, focal),
          pob: this._project3D(ob, cx, cy, focal),
          pit: this._project3D(it, cx, cy, focal),
          pib: this._project3D(ib, cx, cy, focal)
        });
      }

      const quads = [];
      const addQuad = (pts, zAvg, color, strokeColor, uvInfo = null, isOuter = false, nz = 0) => {
        quads.push({ pts, zAvg, color, strokeColor, uvInfo, isOuter, nz });
      };

      const topNormalRot = this._rotYP(0, -1, 0);
      const botNormalRot = this._rotYP(0,  1, 0);

      for (let i = 0; i < segs; i++) {
        const s0 = stations[i];
        const s1 = stations[i + 1];
        const phiMid = (s0.phi + s1.phi) / 2;

        const lnx = Math.sin(phiMid) / Rx;
        const lnz = Math.cos(phiMid) / Rz;
        const nLen = Math.hypot(lnx, lnz) || 1;
        const outNorm = this._rotYP(lnx / nLen, 0, lnz / nLen);
        const inNorm = { x: -outNorm.x, y: -outNorm.y, z: -outNorm.z };

        if (outNorm.z > -0.18) {
          const zAvg = (s0.ot.z + s1.ot.z + s0.ob.z + s1.ob.z) * 0.25;
          const col = shadeMetalColor(pal, outNorm.x, outNorm.y, outNorm.z, false);
          let uvInfo = null;
          if (bandTex && s1.phi > -engraveSpan && s0.phi < engraveSpan && outNorm.z > 0.05) {
            const u0 = clamp((s0.phi + engraveSpan) / (2 * engraveSpan), 0, 1);
            const u1 = clamp((s1.phi + engraveSpan) / (2 * engraveSpan), 0, 1);
            if (u1 > u0 + 0.0005) {
              uvInfo = { u0, u1, alpha: clamp(Math.pow(outNorm.z, 0.55), 0.15, 1) };
            }
          }
          addQuad([s0.pot, s1.pot, s1.pob, s0.pob], zAvg, rgbStr(col), rgbStr(col), uvInfo, true, outNorm.z);
        }

        if (inNorm.z > -0.18) {
          const zAvg = (s0.it.z + s1.it.z + s0.ib.z + s1.ib.z) * 0.25;
          const col = shadeMetalColor(pal, inNorm.x, inNorm.y, inNorm.z, true);
          addQuad([s0.pit, s1.pit, s1.pib, s0.pib], zAvg, rgbStr(col), rgbStr(col), null, false, inNorm.z);
        }

        if (topNormalRot.z > -0.05) {
          const zAvg = (s0.ot.z + s1.ot.z + s0.it.z + s1.it.z) * 0.25 + 0.5;
          const col = shadeMetalColor(pal, outNorm.x * 0.35 + topNormalRot.x * 0.65, topNormalRot.y, topNormalRot.z + 0.25, false);
          addQuad([s0.pot, s1.pot, s1.pit, s0.pit], zAvg, rgbStr(col), pal.rim, null, false, topNormalRot.z);
        }

        if (botNormalRot.z > -0.05) {
          const zAvg = (s0.ob.z + s1.ob.z + s0.ib.z + s1.ib.z) * 0.25 + 0.5;
          const col = shadeMetalColor(pal, outNorm.x * 0.35 + botNormalRot.x * 0.65, botNormalRot.y, botNormalRot.z + 0.20, true);
          addQuad([s0.pob, s1.pob, s1.pib, s0.pib], zAvg, rgbStr(col), rgbStr(col), null, false, botNormalRot.z);
        }
      }

      if (isCuff) {
        const capEnds = [
          { st: stations[0],    tangentSign: -1 },
          { st: stations[segs], tangentSign:  1 }
        ];
        for (const cap of capEnds) {
          const st = cap.st;
          const tx = Math.cos(st.phi) * cap.tangentSign;
          const tz = -Math.sin(st.phi) * cap.tangentSign;
          const cn = this._rotYP(tx, 0, tz);
          const zAvg = (st.ot.z + st.it.z + st.ob.z + st.ib.z) * 0.25;
          const col = shadeMetalColor(pal, cn.x, cn.y, Math.abs(cn.z) + 0.2, false);
          addQuad([st.pot, st.pit, st.pib, st.pob], zAvg, rgbStr(col), pal.rim, null, false, cn.z);
        }
      }

      quads.sort((a, b) => a.zAvg - b.zAvg);

      for (const q of quads) {
        const [p0, p1, p2, p3] = q.pts;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fillStyle = q.color;
        ctx.fill();

        if (q.isOuter) {
          const vg = ctx.createLinearGradient(p0.x, p0.y, p3.x, p3.y);
          vg.addColorStop(0, 'rgba(255,255,255,0.24)');
          vg.addColorStop(0.28, 'rgba(255,255,255,0.04)');
          vg.addColorStop(0.74, 'rgba(0,0,0,0.04)');
          vg.addColorStop(1, 'rgba(0,0,0,0.26)');
          ctx.fillStyle = vg;
          ctx.fill();
        }

        ctx.strokeStyle = q.color;
        ctx.lineWidth = 0.85;
        ctx.stroke();

        if (q.strokeColor === pal.rim) {
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = pal.rim;
          ctx.globalAlpha = 0.36;
          ctx.lineWidth = Math.max(1, W / 780);
          ctx.stroke();
        }

        if (q.uvInfo && bandTex) {
          ctx.clip();
          const sx = q.uvInfo.u0 * bandTex.width;
          const sw = Math.max(1, (q.uvInfo.u1 - q.uvInfo.u0) * bandTex.width);
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          const vx = p3.x - p0.x;
          const vy = p3.y - p0.y;

          ctx.globalCompositeOperation = pal.engraveBlend;
          ctx.globalAlpha = q.uvInfo.alpha;
          ctx.transform(dx / sw, dy / sw, vx / bandTex.height, vy / bandTex.height, p0.x, p0.y);
          ctx.drawImage(bandTex, sx, 0, sw + 0.8, bandTex.height, 0, 0, sw + 0.8, bandTex.height);
        }
        ctx.restore();
      }

      const viewIdx = this._reportClosestView();
      const label = isCuff
        ? (viewIdx === 3 ? 'OPEN CUFF BACK · ADJUSTABLE FIT' : '360° CUFF BAND · ENGRAVED')
        : (viewIdx === 3 ? 'BACK BAND · POLISHED METAL' : '360° FLAT BAND RING · ENGRAVED');
      this._drawHeaderStatus(ctx, cx, H, S, label, viewIdx !== 3);
    }

    // ------------------------------------------------------------------------
    // SHAPE 4 & 5: Dog Tag Necklace & Vertical Bar Keychain
    // ------------------------------------------------------------------------
    _buildRoundedRectPerimeter(halfW, halfH, cornerR, ptsPerCorner = 10) {
      const r = Math.min(cornerR, halfW * 0.9, halfH * 0.9);
      const corners = [
        { cx:  halfW - r, cy: -halfH + r, a0: -Math.PI / 2, a1: 0 },
        { cx:  halfW - r, cy:  halfH - r, a0: 0,            a1: Math.PI / 2 },
        { cx: -halfW + r, cy:  halfH - r, a0: Math.PI / 2,  a1: Math.PI },
        { cx: -halfW + r, cy: -halfH + r, a0: Math.PI,      a1: Math.PI * 1.5 }
      ];
      const pts = [];
      for (const c of corners) {
        for (let i = 0; i <= ptsPerCorner; i++) {
          const a = lerp(c.a0, c.a1, i / ptsPerCorner);
          pts.push({ x: c.cx + Math.cos(a) * r, y: c.cy + Math.sin(a) * r });
        }
      }
      return pts;
    }

    _drawExtrudedPlate(ctx, W, cx, plateCy, focal, pal, halfW, halfH, halfD, cornerR, frontTex, backTex, opts = {}) {
      const perim = this._buildRoundedRectPerimeter(halfW, halfH, cornerR, 8);
      const front3D = perim.map((p) => this._rotYP(p.x, p.y,  halfD));
      const back3D  = perim.map((p) => this._rotYP(p.x, p.y, -halfD));
      const frontP  = front3D.map((p) => this._project3D(p, cx, plateCy, focal));
      const backP   = back3D.map((p) => this._project3D(p, cx, plateCy, focal));

      const fNorm = this._rotYP(0, 0, 1);
      const frontFacing = fNorm.z >= 0;

      // Extruded metallic side-edge quads
      const edgeQuads = [];
      const nPts = perim.length;
      for (let i = 0; i < nPts; i++) {
        const j = (i + 1) % nPts;
        const dx = perim[j].x - perim[i].x;
        const dy = perim[j].y - perim[i].y;
        const len = Math.hypot(dx, dy) || 1;
        const eNorm = this._rotYP(dy / len, -dx / len, 0);
        if (eNorm.z > -0.15) {
          const zAvg = (front3D[i].z + front3D[j].z + back3D[i].z + back3D[j].z) * 0.25;
          const col = shadeMetalColor(pal, eNorm.x, eNorm.y, eNorm.z, false);
          edgeQuads.push({ pts: [frontP[i], frontP[j], backP[j], backP[i]], zAvg, color: rgbStr(col) });
        }
      }
      edgeQuads.sort((a, b) => a.zAvg - b.zAvg);

      for (const eq of edgeQuads) {
        const [p0, p1, p2, p3] = eq.pts;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fillStyle = eq.color;
        ctx.fill();
        ctx.strokeStyle = eq.color;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }

      // Active face (Front or Back)
      const facePts = frontFacing ? frontP : backP;
      const activeNorm = frontFacing ? fNorm : { x: -fNorm.x, y: -fNorm.y, z: -fNorm.z };
      const faceZ = frontFacing ? halfD : -halfD;

      const tlL = frontFacing ? [-halfW, -halfH, faceZ] : [ halfW, -halfH, faceZ];
      const trL = frontFacing ? [ halfW, -halfH, faceZ] : [-halfW, -halfH, faceZ];
      const brL = frontFacing ? [ halfW,  halfH, faceZ] : [-halfW,  halfH, faceZ];
      const blL = frontFacing ? [-halfW,  halfH, faceZ] : [ halfW,  halfH, faceZ];

      const tl = this._project3D(this._rotYP(...tlL), cx, plateCy, focal);
      const tr = this._project3D(this._rotYP(...trL), cx, plateCy, focal);
      const br = this._project3D(this._rotYP(...brL), cx, plateCy, focal);
      const bl = this._project3D(this._rotYP(...blL), cx, plateCy, focal);

      const dot = clamp(activeNorm.x * -0.55 + activeNorm.z * 0.82, -1, 1);
      const specSweep = clamp(0.48 + activeNorm.x * 0.52 + Math.sin(this.yaw * 1.4) * 0.08, 0.10, 0.90);
      const shade = clamp(0.30 + Math.max(0, dot) * 0.70, 0.22, 1.0);
      const cDark = mixRgb(pal.dark, pal.base, shade * 0.68);
      const cMid  = mixRgb(pal.dark, pal.base, shade);
      const cSpec = mixRgb(pal.base, pal.bright, clamp(0.46 + shade * 0.54, 0, 1));

      ctx.save();
      ctx.beginPath();
      facePts.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();

      const grad = ctx.createLinearGradient(tl.x, tl.y, tr.x, tr.y);
      grad.addColorStop(0, rgbStr(cDark));
      grad.addColorStop(clamp(specSweep - 0.24, 0.02, 0.96), rgbStr(cMid));
      grad.addColorStop(specSweep, rgbStr(cSpec));
      grad.addColorStop(clamp(specSweep + 0.26, 0.04, 0.98), rgbStr(cMid));
      grad.addColorStop(1, rgbStr(cDark));
      ctx.fillStyle = grad;
      ctx.fill();

      const vGrad = ctx.createLinearGradient(tl.x, tl.y, bl.x, bl.y);
      vGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
      vGrad.addColorStop(0.40, 'rgba(255,255,255,0.02)');
      vGrad.addColorStop(0.80, 'rgba(0,0,0,0.05)');
      vGrad.addColorStop(1, 'rgba(0,0,0,0.24)');
      ctx.fillStyle = vGrad;
      ctx.fill();

      ctx.save();
      ctx.clip();
      const tex = frontFacing ? frontTex : backTex;
      if (tex) {
        const strips = 30;
        const sw = tex.width / strips;
        for (let i = 0; i < strips; i++) {
          const u0 = i / strips;
          const u1 = (i + 1) / strips;
          const x0 = lerp(tl.x, tr.x, u0);
          const y0 = lerp(tl.y, tr.y, u0);
          const x1 = lerp(tl.x, tr.x, u1);
          const y1 = lerp(tl.y, tr.y, u1);
          const bx0 = lerp(bl.x, br.x, u0);
          const by0 = lerp(bl.y, br.y, u0);

          ctx.save();
          ctx.globalCompositeOperation = pal.engraveBlend;
          ctx.globalAlpha = clamp(0.42 + activeNorm.z * 0.58, 0.2, 1);
          ctx.transform((x1 - x0) / sw, (y1 - y0) / sw, (bx0 - x0) / tex.height, (by0 - y0) / tex.height, x0, y0);
          ctx.drawImage(tex, i * sw, 0, sw + 0.6, tex.height, 0, 0, sw + 0.6, tex.height);
          ctx.restore();
        }
      }

      // Optional eyelet holes (top center OR left+right ends for horizontal bars)
      const holes = opts.holes || [];
      for (const hSpec of holes) {
        const hp = this._project3D(this._rotYP(hSpec.x, hSpec.y, faceZ), cx, plateCy, focal);
        const hRx = Math.max(1.8, hSpec.r * Math.abs(activeNorm.z));
        ctx.beginPath();
        ctx.ellipse(hp.x, hp.y, hRx, hSpec.r, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#0e0f14';
        ctx.fill();
        ctx.strokeStyle = pal.rim;
        ctx.lineWidth = Math.max(1.1, W / 650);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = pal.rim;
      ctx.lineWidth = Math.max(1.2, W / 640);
      ctx.globalAlpha = clamp(0.22 + activeNorm.z * 0.40, 0.15, 0.65);
      ctx.stroke();
      ctx.restore();

      return frontFacing;
    }

    _renderPlate3D(ctx, W, H, cx, cy, S, focal, pal, isKeychain) {
      this._drawStudioBackdrop(ctx, W, H, cx, cy, S, pal, isKeychain ? 0.365 : 0.345, 1.25);

      const halfW = S * (isKeychain ? 0.088 : 0.148);
      const halfH = S * 0.258;
      const cornerR = S * (isKeychain ? 0.024 : 0.056);
      const halfD = S * (isKeychain ? 0.015 : 0.013);
      const plateCy = isKeychain ? cy + S * 0.055 : cy + S * 0.02;

      const topCenter = this._project3D(this._rotYP(0, -halfH, 0), cx, plateCy, focal);
      if (isKeychain) {
        this._drawSplitKeyring(ctx, topCenter, pal, S);
      } else {
        this._drawChainAndBail(ctx, cx, topCenter, pal, S);
      }

      const backTex = (this.hasBackEngraving || this.texts[1]) ? this.textures.back : null;
      const frontFacing = this._drawExtrudedPlate(
        ctx, W, cx, plateCy, focal, pal,
        halfW, halfH, halfD, cornerR,
        this.textures.front, backTex,
        { holes: [{ x: 0, y: -halfH + S * 0.040, r: S * (isKeychain ? 0.014 : 0.017) }] }
      );

      const viewIdx = frontFacing ? 0 : 1;
      if (viewIdx !== this.lastReportedView) {
        this.lastReportedView = viewIdx;
        this.onActiveViewChange?.(viewIdx);
      }

      const backHasEngraving = Boolean(this.hasBackEngraving || this.texts[1]);
      const statusText = frontFacing
        ? (isKeychain ? 'FRONT · 10×40MM BAR KEYCHAIN' : 'FRONT · 22×39MM DOG TAG')
        : (backHasEngraving ? 'BACK FACE · ENGRAVED' : 'BACK FACE · UNENGRAVED');
      this._drawHeaderStatus(ctx, cx, H, S, statusText, frontFacing || backHasEngraving);
    }

    // ------------------------------------------------------------------------
    // SHAPE 6, 7, 8: Horizontal Bar Necklace / Chain Bracelet / Braided Cord Bracelet
    // ------------------------------------------------------------------------
    _renderHorizontalBar3D(ctx, W, H, cx, cy, S, focal, pal) {
      const mode = this.shape; // 'horizontal-bar' | 'horizontal-bar-chain' | 'horizontal-bar-cord'
      this._drawStudioBackdrop(ctx, W, H, cx, cy, S, pal, 0.24, 2.2);

      const halfW = S * 0.295;
      const halfH = S * 0.054;
      const halfD = S * 0.015;
      const cornerR = S * 0.014;
      const barCy = mode === 'horizontal-bar' ? cy + S * 0.045 : cy;

      // Left and right end attachment points in 3D space
      const leftEnd = this._project3D(this._rotYP(-halfW, 0, 0), cx, barCy, focal);
      const rightEnd = this._project3D(this._rotYP(halfW, 0, 0), cx, barCy, focal);
      // Always route left-most screen endpoint to left edge & right-most to right edge when flipped 180deg
      const screenLeft  = leftEnd.x <= rightEnd.x ? leftEnd : rightEnd;
      const screenRight = leftEnd.x <= rightEnd.x ? rightEnd : leftEnd;

      // Draw chains or braided cord extending from both bar ends
      if (mode === 'horizontal-bar') {
        this._drawLinkLine(ctx, screenLeft.x, screenLeft.y, cx - S * 0.42, -10, pal, S, 0.95);
        this._drawLinkLine(ctx, screenRight.x, screenRight.y, cx + S * 0.42, -10, pal, S, 0.95);
      } else if (mode === 'horizontal-bar-chain') {
        this._drawLinkLine(ctx, screenLeft.x, screenLeft.y, -12, screenLeft.y + S * 0.015, pal, S, 1.18);
        this._drawLinkLine(ctx, screenRight.x, screenRight.y, W + 12, screenRight.y + S * 0.015, pal, S, 1.18);
      } else if (mode === 'horizontal-bar-cord') {
        this._drawBraidedCordLine(ctx, screenLeft.x, screenLeft.y, -12, screenLeft.y + S * 0.015, S);
        this._drawBraidedCordLine(ctx, screenRight.x, screenRight.y, W + 12, screenRight.y + S * 0.015, S);
      }

      // Metallic jump rings at both ends (for necklace & chain bracelet)
      if (mode !== 'horizontal-bar-cord') {
        const jr = S * 0.017;
        for (const pt of [screenLeft, screenRight]) {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y, jr * 0.85, jr, 0, 0, Math.PI * 2);
          ctx.strokeStyle = pal.chainDark;
          ctx.lineWidth = Math.max(3, S * 0.011);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y, jr * 0.85, jr, 0, 0, Math.PI * 2);
          ctx.strokeStyle = pal.chainLight;
          ctx.lineWidth = Math.max(1.5, S * 0.0055);
          ctx.stroke();
          ctx.restore();
        }
      }

      const backTex = (this.hasBackEngraving || this.texts[1]) ? this.textures.hbar_back : null;
      const frontFacing = this._drawExtrudedPlate(
        ctx, W, cx, barCy, focal, pal,
        halfW, halfH, halfD, cornerR,
        this.textures.hbar_front, backTex,
        {
          holes: [
            { x: -halfW + S * 0.026, y: 0, r: S * 0.010 },
            { x:  halfW - S * 0.026, y: 0, r: S * 0.010 }
          ]
        }
      );

      const viewIdx = frontFacing ? 0 : 1;
      if (viewIdx !== this.lastReportedView) {
        this.lastReportedView = viewIdx;
        this.onActiveViewChange?.(viewIdx);
      }

      const backHasEngraving = Boolean(this.hasBackEngraving || this.texts[1]);
      const pieceName = mode === 'horizontal-bar-cord'
        ? 'BRAIDED CORD BAR'
        : (mode === 'horizontal-bar-chain' ? 'CHAIN LINK BAR' : 'HORIZONTAL BAR');
      const statusText = frontFacing
        ? `FRONT · ${pieceName}`
        : (backHasEngraving ? 'BACK FACE · ENGRAVED' : 'BACK FACE · UNENGRAVED');
      this._drawHeaderStatus(ctx, cx, H, S, statusText, frontFacing || backHasEngraving);
    }

    // ------------------------------------------------------------------------
    // Main Frame Dispatch
    // ------------------------------------------------------------------------
    render() {
      if (this.texturesDirty) this._rebuildTextures();

      const ctx = this.ctx;
      const W = this.canvas.width;
      const H = this.canvas.height;
      const pal = METAL_PALETTES[this.finishKey] || METAL_PALETTES.gold;
      const cx = W * 0.5;
      const cy = H * 0.52;
      const S = Math.min(W, H);
      const focal = S * 2.4;

      if (this.shape === 'four-sided') {
        this._renderFourSided(ctx, W, H, cx, cy, S, focal, pal);
      } else if (this.shape === 'cuff') {
        this._renderBand3D(ctx, W, H, cx, cy, S, focal, pal, true);
      } else if (this.shape === 'ring') {
        this._renderBand3D(ctx, W, H, cx, cy, S, focal, pal, false);
      } else if (this.shape === 'dog-tag') {
        this._renderPlate3D(ctx, W, H, cx, cy, S, focal, pal, false);
      } else if (this.shape === 'keychain') {
        this._renderPlate3D(ctx, W, H, cx, cy, S, focal, pal, true);
      } else if (this.shape.startsWith('horizontal-bar')) {
        this._renderHorizontalBar3D(ctx, W, H, cx, cy, S, focal, pal);
      }
    }
  }

  window.OCJewelry3D = OCJewelry3D;
  window.OCFourSidedBar3D = OCJewelry3D;
  document.dispatchEvent(new CustomEvent('oc:3d-ready'));
})();
