/* Name/initial ordering for the bubble necklace; no engraving UI. */
(function () {
  'use strict';
  function countCharacters(value) {
    return Array.from(String(value || '').trim()).length;
  }
  function validateName(value, range) {
    var count = countCharacters(value);
    if (!count) return 'Enter the name or letters you want on your necklace.';
    if (count > 14) return 'Use up to 14 characters, including spaces and symbols.';
    var match = /^(\d+)-(\d+) Letters$/.exec(range || '');
    if (!match) return 'Choose an available character range.';
    var min = Number(match[1]), max = Number(match[2]);
    if (count < min || count > max) {
      return 'Your text has ' + count + ' character' + (count === 1 ? '' : 's') + '. Choose the matching range or edit your text.';
    }
    return '';
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = { countCharacters: countCharacters, validateName: validateName };
    return;
  }
  function mount() {
    document.querySelectorAll('[data-bubble-necklace]').forEach(function (root) {
      var field = root.querySelector('[data-bubble-name]');
      var form = root.querySelector('[data-product-form]');
      if (!field || !form || field.dataset.initialized) return;
      field.dataset.initialized = 'true';
      var counter = root.querySelector('[data-bubble-count]');
      var feedback = root.querySelector('[data-bubble-feedback]');
      var index = Number(field.dataset.lettersOptionIndex);
      function selectedRange() {
        var checked = root.querySelector('[data-option-index="' + index + '"] input:checked');
        return checked ? checked.value : '';
      }
      function sync() {
        var value = field.value;
        var range = selectedRange();
        var bounds = /^(\d+)-(\d+) Letters$/.exec(range);
        if (bounds) field.pattern = '(?=.*\\S).{' + bounds[1] + ',' + bounds[2] + '}';
        var message = validateName(value, range);
        field.setCustomValidity(message);
        if (!message && !field.validity.valid) {
          message = 'Check your text length and remove any extra spaces.';
          field.setCustomValidity(message);
        }
        if (message) {
          if (form.dataset.expressBlocked !== message) form.dataset.expressBlocked = message;
        } else if (form.dataset.expressBlocked) {
          delete form.dataset.expressBlocked;
        }
        var count = countCharacters(value);
        if (counter) counter.textContent = count + ' / 14 characters';
        field.setAttribute('aria-invalid', count > 0 && !!message ? 'true' : 'false');
        if (feedback) {
          feedback.textContent = count && message ? message : 'Selected: ' + range.replace('Letters', 'characters') + '. Check spelling before adding to cart.';
          feedback.classList.toggle('bubble-name__error', !!(count && message));
        }
        form.dispatchEvent(new CustomEvent('oc:express-recheck', { bubbles: true }));
        return !message;
      }
      function guard(event) {
        field.value = field.value.trim();
        if (sync()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        field.setAttribute('aria-invalid', 'true');
        field.reportValidity();
        field.focus();
      }
      root.addEventListener('input', function (event) { if (event.target === field) sync(); }, true);
      root.addEventListener('change', function (event) { if (event.target.closest('[data-option-index]')) sync(); }, true);
      field.addEventListener('blur', function () { field.value = field.value.trim(); sync(); });
      form.addEventListener('submit', guard, true);
      form.addEventListener('theme:product-form-submit', guard, true);
      form.addEventListener('click', function (event) {
        if (event.target.closest('[data-atc]')) guard(event);
      }, true);
      sync();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
