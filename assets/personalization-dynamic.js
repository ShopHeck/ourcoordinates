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

  function init(document) {
    initMatching(document);
  }

  return {
    init: init,
    resolveMatchingProperties: resolveMatchingProperties
  };
});
