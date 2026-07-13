(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root || !root.document) return;
  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', function () { api.init(root.document); });
  } else {
    api.init(root.document);
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function resolveMatchingProperties(a, b, separate) {
    var first = String(a || '').trim();
    return { a: first, b: separate ? String(b || '').trim() : first };
  }

  function renderText(element, value, placeholder) {
    if (!element) return;
    element.textContent = value || placeholder;
    element.style.opacity = value ? '1' : '0.4';
  }

  function initMatching(document) {
    var rig = document.querySelector('[data-matching-necklaces]');
    if (!rig) return;
    var inputA = rig.querySelector('[data-match-input="a"]');
    var inputB = rig.querySelector('[data-match-input="b"]');
    var previewA = rig.querySelector('[data-match-preview="a"]');
    var previewB = rig.querySelector('[data-match-preview="b"]');
    var separate = rig.querySelector('[data-match-separate]');
    var enhancement = rig.querySelector('[data-match-enhancement]');
    var fieldB = rig.querySelector('[data-match-field-b]');
    if (!inputA || !inputB || !separate) return;

    function sync() {
      var values = resolveMatchingProperties(inputA.value, inputB.value, separate.checked);
      if (!separate.checked) inputB.value = values.b;
      if (fieldB) fieldB.hidden = !separate.checked;
      renderText(previewA, values.a, previewA.dataset.placeholder || 'NECKLACE A');
      renderText(previewB, values.b, previewB.dataset.placeholder || 'NECKLACE B');
    }

    if (enhancement) enhancement.hidden = false;
    inputA.addEventListener('input', sync);
    inputB.addEventListener('input', sync);
    separate.addEventListener('change', sync);
    sync();
  }

  function resolveRingProperties(engraving1, engraving2, ring1, ring2) {
    return {
      engraving1: String(engraving1 || '').trim(),
      engraving2: String(engraving2 || '').trim(),
      ring1: String(ring1 || '').trim(),
      ring2: String(ring2 || '').trim()
    };
  }

  function selectedVariant(root) {
    var idInput = root.querySelector('form[data-product-form] input[name="id"]');
    var json = root.querySelector('[data-product-json]');
    if (!idInput || !json) return null;
    var product = JSON.parse(json.textContent);
    return product.variants.find(function (variant) {
      return String(variant.id) === String(idInput.value);
    }) || null;
  }

  function initCoupleRings(document) {
    var root = document.querySelector('[data-product][data-preview-type="couple-rings"]');
    var rig = root && root.querySelector('[data-couple-rings]');
    if (!rig) return;
    var engraving1 = rig.querySelector('[data-ring-engraving="1"]');
    var engraving2 = rig.querySelector('[data-ring-engraving="2"]');
    var ring1 = rig.querySelector('[data-ring1-style]');
    var ring2 = rig.querySelector('[data-ring2-style]');
    var preview1 = rig.querySelector('[data-ring-preview="1"]');
    var preview2 = rig.querySelector('[data-ring-preview="2"]');

    function sync() {
      var variant = selectedVariant(root);
      if (variant && ring1) ring1.value = variant.title;
      var values = resolveRingProperties(
        engraving1 && engraving1.value,
        engraving2 && engraving2.value,
        ring1 && ring1.value,
        ring2 && ring2.value
      );
      renderText(preview1, values.engraving1, 'RING 1');
      renderText(preview2, values.engraving2, 'RING 2');
    }

    root.addEventListener('change', function () { setTimeout(sync, 0); });
    engraving1.addEventListener('input', sync);
    engraving2.addEventListener('input', sync);
    ring2.addEventListener('change', sync);
    sync();
  }

  function parseCharmCount(value) {
    var match = String(value || '').match(/\b([2-8])\s*names?\b/i);
    return match ? parseInt(match[1], 10) : null;
  }

  function activeNameIndexes(count) {
    if (!Number.isInteger(count) || count < 2 || count > 8) return [];
    return Array.from({ length: count }, function (_, index) { return index + 1; });
  }

  function initCharms(document) {
    var root = document.querySelector('[data-product][data-preview-type="charm-name-necklace"]');
    var rig = root && root.querySelector('[data-charm-names]');
    if (!rig) return;
    var alert = rig.querySelector('[data-contract-error]');

    function countFromSelection() {
      var group = root.querySelector(`[data-option-index="${rig.dataset.namesOption}"]`);
      var checked = group && group.querySelector('input:checked');
      return parseCharmCount(checked && checked.value);
    }

    function sync() {
      var count = countFromSelection();
      var active = activeNameIndexes(count);
      rig.querySelectorAll('[data-charm-field]').forEach(function (field) {
        var index = parseInt(field.dataset.charmField, 10);
        var enabled = active.indexOf(index) !== -1;
        var input = field.querySelector('input');
        field.hidden = !enabled;
        input.disabled = !enabled;
        input.required = enabled;
        var preview = rig.querySelector(`[data-charm-preview="${index}"]`);
        if (preview) preview.closest('[data-charm-preview-wrap]').hidden = !enabled;
      });
      if (alert) alert.hidden = Boolean(count);
      document.querySelectorAll('[data-atc]').forEach(function (button) {
        if (!count) {
          button.dataset.contractBlocked = 'true';
          button.disabled = true;
        } else if (button.dataset.contractBlocked) {
          delete button.dataset.contractBlocked;
          var variant = selectedVariant(root);
          button.disabled = !variant || !variant.available;
        }
      });
    }

    root.addEventListener('change', sync);
    rig.querySelectorAll('[data-charm-field] input').forEach(function (input) {
      input.addEventListener('input', function () {
        renderText(
          rig.querySelector(`[data-charm-preview="${input.dataset.charmInput}"]`),
          input.value.trim(),
          `NAME ${input.dataset.charmInput}`
        );
      });
    });
    sync();
  }

  function init(document) {
    initMatching(document);
    initCoupleRings(document);
    initCharms(document);
  }

  return {
    activeNameIndexes: activeNameIndexes,
    init: init,
    parseCharmCount: parseCharmCount,
    resolveMatchingProperties: resolveMatchingProperties,
    resolveRingProperties: resolveRingProperties
  };
});
