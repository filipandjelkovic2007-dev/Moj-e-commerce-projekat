// Zajednicki prevodi naziva kategorija i boja na srpski.
(function (global) {
  'use strict';

  const CATEGORY_TRANSLATIONS = {
    phones: 'Telefoni',
    phone: 'Telefon',
    laptops: 'Laptopovi',
    laptop: 'Laptop',
    tablets: 'Tableti',
    tablet: 'Tablet',
    accessories: 'Oprema',
    equipment: 'Oprema'
  };

  const COLOR_TRANSLATIONS = {
    black: 'Crna',
    white: 'Bela',
    silver: 'Srebrna',
    gray: 'Siva',
    grey: 'Siva',
    green: 'Zelena',
    blue: 'Plava',
    red: 'Crvena',
    yellow: 'Žuta',
    gold: 'Zlatna',
    pink: 'Roze',
    purple: 'Ljubičasta',
    orange: 'Narandžasta',
    bronze: 'Bronzana',
    titanium: 'Titanijumska'
  };

  function normalizeKey(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  function translateCategory(value) {
    if (value === null || value === undefined) return '';
    const key = normalizeKey(value);
    return CATEGORY_TRANSLATIONS[key] || String(value);
  }

  function translateColor(value) {
    if (value === null || value === undefined) return '';
    const key = normalizeKey(value);
    return COLOR_TRANSLATIONS[key] || String(value);
  }

  const api = { translateCategory, translateColor };

  global.prevodi = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
