/**
 * vibeche - State & LocalStorage Manager
 * Sharif University Web Programming - HW1 (Taghche)
 * 
 * Manages:
 * 1. User authentication state (mock login with 11-digit mobile starting with 09)
 * 2. Persian and Latin digit normalization
 * 3. Favorites list (persists across reloads, prevents duplicates)
 * 4. User Library (claimed/purchased books, duplicate prevention)
 * 5. Reader settings (font size: small/medium/large, theme: light/dark)
 * 6. Resilient error recovery for missing or corrupted localStorage
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  // In-memory fallback if localStorage is unavailable (e.g. CLI test environment or private mode restrictions)
  const memoryStorage = {};
  const storageAdapter = {
    getItem: function (key) {
      try {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(key);
        }
      } catch (e) {
        // Fall through to memory storage
      }
      return Object.prototype.hasOwnProperty.call(memoryStorage, key) ? memoryStorage[key] : null;
    },
    setItem: function (key, value) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
          return;
        }
      } catch (e) {
        // Fall through to memory storage
      }
      memoryStorage[key] = String(value);
    },
    removeItem: function (key) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
          return;
        }
      } catch (e) {
        // Fall through to memory storage
      }
      delete memoryStorage[key];
    },
    clear: function () {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
      } catch (e) {
        // ignore
      }
      for (const k in memoryStorage) {
        delete memoryStorage[k];
      }
    }
  };

  const STORAGE_KEYS = {
    USER: 'vibeche_user',
    FAVORITES: 'vibeche_favorites',
    LIBRARY: 'vibeche_library',
    READER_SETTINGS: 'vibeche_reader_settings'
  };

  const DEFAULT_READER_SETTINGS = {
    fontSize: 'medium', // 'small' | 'medium' | 'large'
    theme: 'light'      // 'light' | 'dark'
  };

  // Safe logger that works across browsers and headless JS engines (e.g. JXA where console.warn/error might be missing)
  const logWarn = (typeof console !== 'undefined' && typeof console.warn === 'function') ? console.warn.bind(console) : (typeof console !== 'undefined' && typeof console.log === 'function' ? console.log.bind(console) : function () {});
  const logError = (typeof console !== 'undefined' && typeof console.error === 'function') ? console.error.bind(console) : (typeof console !== 'undefined' && typeof console.log === 'function' ? console.log.bind(console) : function () {});

  /**
   * Safe JSON parse with automatic corruption recovery
   */
  function safeGet(key, defaultValue) {
    try {
      const raw = storageAdapter.getItem(key);
      if (raw === null || raw === undefined) {
        return defaultValue;
      }
      return JSON.parse(raw);
    } catch (err) {
      // Data corrupted: silently recover by returning default and resetting key
      logWarn(`[VibecheStorage] Corrupted data for key "${key}". Resetting to default.`, err);
      safeSet(key, defaultValue);
      return defaultValue;
    }
  }

  /**
   * Safe JSON serialize
   */
  function safeSet(key, value) {
    try {
      storageAdapter.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      logError(`[VibecheStorage] Failed to save key "${key}":`, err);
      return false;
    }
  }

  /**
   * Converts Persian (۰-۹) and Arabic (٠-٩) digits to standard Latin digits (0-9)
   */
  function normalizeDigits(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
      .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632 + 48))
      .trim();
  }

  /**
   * Validates mobile number: exactly 11 digits starting with 09
   */
  function validatePhone(phoneInput) {
    const normalized = normalizeDigits(String(phoneInput || ''));
    const isValid = /^09\d{9}$/.test(normalized);
    return {
      isValid,
      normalized,
      error: isValid ? null : 'شماره موبایل باید ۱۱ رقم باشد و با ۰۹ آغاز شود.'
    };
  }

  /**
   * Validates user display name
   */
  function validateDisplayName(nameInput) {
    const trimmed = typeof nameInput === 'string' ? nameInput.trim() : '';
    const isValid = trimmed.length >= 2;
    return {
      isValid,
      trimmed,
      error: isValid ? null : 'نام نمایشی نمی‌تواند خالی باشد (حداقل ۲ نویسه).'
    };
  }

  const VibecheStorage = {
    // Digit and validation utilities
    normalizeDigits,
    validatePhone,
    validateDisplayName,

    // --- User / Authentication Management ---
    getUser: function () {
      return safeGet(STORAGE_KEYS.USER, null);
    },

    isLoggedIn: function () {
      const user = this.getUser();
      return Boolean(user && user.isLoggedIn);
    },

    login: function (name, phone) {
      const nameVal = validateDisplayName(name);
      const phoneVal = validatePhone(phone);

      const errors = {};
      if (!nameVal.isValid) errors.name = nameVal.error;
      if (!phoneVal.isValid) errors.phone = phoneVal.error;

      if (Object.keys(errors).length > 0) {
        return { success: false, errors };
      }

      const user = {
        displayName: nameVal.trimmed,
        phone: phoneVal.normalized,
        isLoggedIn: true,
        loginDate: new Date().toISOString()
      };

      safeSet(STORAGE_KEYS.USER, user);
      return { success: true, user };
    },

    logout: function () {
      storageAdapter.removeItem(STORAGE_KEYS.USER);
      return true;
    },

    // --- Favorites Management ---
    getFavorites: function () {
      const favs = safeGet(STORAGE_KEYS.FAVORITES, []);
      return Array.isArray(favs) ? favs.map(Number).filter(n => !isNaN(n)) : [];
    },

    isFavorite: function (bookId) {
      const numId = Number(bookId);
      if (isNaN(numId)) return false;
      return this.getFavorites().includes(numId);
    },

    addFavorite: function (bookId) {
      const numId = Number(bookId);
      if (isNaN(numId)) return false;
      const favs = this.getFavorites();
      if (!favs.includes(numId)) {
        favs.push(numId);
        safeSet(STORAGE_KEYS.FAVORITES, favs);
      }
      return true;
    },

    removeFavorite: function (bookId) {
      const numId = Number(bookId);
      if (isNaN(numId)) return false;
      const favs = this.getFavorites().filter(id => id !== numId);
      safeSet(STORAGE_KEYS.FAVORITES, favs);
      return true;
    },

    toggleFavorite: function (bookId) {
      const numId = Number(bookId);
      if (isNaN(numId)) return { isFavorite: false };
      const isFav = this.isFavorite(numId);
      if (isFav) {
        this.removeFavorite(numId);
        return { isFavorite: false };
      } else {
        this.addFavorite(numId);
        return { isFavorite: true };
      }
    },

    // --- Library Management (Acquired / Purchased Books) ---
    getLibrary: function () {
      const lib = safeGet(STORAGE_KEYS.LIBRARY, []);
      return Array.isArray(lib) ? lib.map(Number).filter(n => !isNaN(n)) : [];
    },

    isInLibrary: function (bookId) {
      const numId = Number(bookId);
      if (isNaN(numId)) return false;
      return this.getLibrary().includes(numId);
    },

    addToLibrary: function (bookId) {
      const numId = Number(bookId);
      if (isNaN(numId)) return false;
      const lib = this.getLibrary();
      // Enforce duplicate prevention rule from spec
      if (!lib.includes(numId)) {
        lib.push(numId);
        safeSet(STORAGE_KEYS.LIBRARY, lib);
      }
      return true;
    },

    // --- Reader Settings Management ---
    getReaderSettings: function () {
      const settings = safeGet(STORAGE_KEYS.READER_SETTINGS, DEFAULT_READER_SETTINGS);
      return {
        fontSize: ['small', 'medium', 'large'].includes(settings.fontSize) ? settings.fontSize : 'medium',
        theme: ['light', 'dark'].includes(settings.theme) ? settings.theme : 'light'
      };
    },

    setReaderSettings: function (newSettings) {
      const current = this.getReaderSettings();
      const updated = {
        fontSize: ['small', 'medium', 'large'].includes(newSettings.fontSize) ? newSettings.fontSize : current.fontSize,
        theme: ['light', 'dark'].includes(newSettings.theme) ? newSettings.theme : current.theme
      };
      safeSet(STORAGE_KEYS.READER_SETTINGS, updated);
      return updated;
    },

    // --- System / Reset Utility ---
    clearAll: function () {
      storageAdapter.removeItem(STORAGE_KEYS.USER);
      storageAdapter.removeItem(STORAGE_KEYS.FAVORITES);
      storageAdapter.removeItem(STORAGE_KEYS.LIBRARY);
      storageAdapter.removeItem(STORAGE_KEYS.READER_SETTINGS);
      return true;
    },

    // Expose internal adapter for testing corruption injection
    _storageAdapter: storageAdapter
  };

  root.VibecheStorage = VibecheStorage;
})();
