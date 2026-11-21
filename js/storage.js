/**
 * vibeche - State & LocalStorage Manager (Account-Keyed Architecture)
 * Sharif University Web Programming - HW1 (Taghche)
 * 
 * Capabilities:
 * 1. Account-Keyed Storage: Each user account is strictly keyed by their 11-digit mobile number.
 *    - Logging out NEVER deletes a user's favorites or purchased books.
 *    - Logging in with another account completely isolates user data.
 *    - Logging back in restores all favorites and library books.
 * 2. Strict Auth Gate: Only authenticated users can favorite or acquire books.
 *    - Guest users cannot favorite books (returns empty array and requires login).
 * 3. Persian and Latin digit normalization (۰۱۲۳۴۵۶۷۸۹ -> 0123456789).
 * 4. 11-digit Iranian mobile validation starting with 09.
 * 5. Strict duplicate prevention for acquisitions and favorites.
 * 6. Resilient error recovery: Invalid or corrupted JSON resets safely without crashing.
 * 7. Reader settings persistence (font size and theme).
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  // In-memory fallback if localStorage is unavailable (CLI tests or private browsing)
  const memoryStorage = {};
  const storageAdapter = {
    getItem: function (key) {
      try {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(key);
        }
      } catch (e) {
        // Fall through to memory
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
        // Fall through to memory
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
        // Fall through to memory
      }
      delete memoryStorage[key];
    },
    getAllKeys: function () {
      const keys = [];
      try {
        if (typeof localStorage !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            keys.push(localStorage.key(i));
          }
          return keys;
        }
      } catch (e) {
        // Fall through to memory
      }
      return Object.keys(memoryStorage);
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
    CURRENT_PHONE: 'vibeche_current_phone',
    ACCOUNT_PREFIX: 'vibeche_account_',
    READER_SETTINGS: 'vibeche_reader_settings'
  };

  const DEFAULT_READER_SETTINGS = {
    fontSize: 'medium', // 'small' | 'medium' | 'large'
    theme: 'light'      // 'light' | 'dark'
  };

  // Safe logger for browser and headless JXA environments
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

  /**
   * Internal helpers for account-keyed data management
   */
  function getAccount(phone) {
    if (!phone) return null;
    return safeGet(STORAGE_KEYS.ACCOUNT_PREFIX + phone, null);
  }

  function saveAccount(phone, accountData) {
    if (!phone) return false;
    return safeSet(STORAGE_KEYS.ACCOUNT_PREFIX + phone, accountData);
  }

  function getCurrentPhone() {
    return safeGet(STORAGE_KEYS.CURRENT_PHONE, null);
  }

  const VibecheStorage = {
    // Utilities
    normalizeDigits,
    validatePhone,
    validateDisplayName,

    // --- User / Authentication Management ---
    getUser: function () {
      const phone = getCurrentPhone();
      if (!phone) return null;
      const account = getAccount(phone);
      if (!account) return null;
      return {
        displayName: account.displayName,
        phone: account.phone,
        isLoggedIn: true
      };
    },

    isLoggedIn: function () {
      return Boolean(this.getUser());
    },

    /**
     * Account-keyed login:
     * - Validates name and phone (supporting Persian & Latin digits)
     * - If new user: registers account with the provided name
     * - If existing user: enforces that the entered name matches the registered name
     *   (prevents unauthenticated username tampering via login form)
     * - Sets active user session
     */
    login: function (name, phone) {
      const nameVal = validateDisplayName(name);
      const phoneVal = validatePhone(phone);

      const errors = {};
      if (!nameVal.isValid) errors.name = nameVal.error;
      if (!phoneVal.isValid) errors.phone = phoneVal.error;

      if (Object.keys(errors).length > 0) {
        return { success: false, errors };
      }

      const normalizedPhone = phoneVal.normalized;
      let account = getAccount(normalizedPhone);

      if (!account) {
        // Create new account
        account = {
          displayName: nameVal.trimmed,
          phone: normalizedPhone,
          favorites: [],
          library: [],
          createdAt: new Date().toISOString()
        };
      } else {
        // Existing account: verify display name matches registered name
        if (account.displayName.trim() !== nameVal.trimmed) {
          return {
            success: false,
            errors: {
              name: 'نام نمایشی واردشده با اطلاعات ثبت‌شده برای این شماره موبایل مطابقت ندارد.'
            }
          };
        }
      }

      account.lastLoginAt = new Date().toISOString();

      saveAccount(normalizedPhone, account);
      safeSet(STORAGE_KEYS.CURRENT_PHONE, normalizedPhone);

      return {
        success: true,
        user: {
          displayName: account.displayName,
          phone: account.phone,
          isLoggedIn: true
        }
      };
    },

    /**
     * Checks if an account exists for the given phone number
     */
    hasAccount: function (phone) {
      const phoneVal = validatePhone(phone);
      if (!phoneVal.isValid) return false;
      return Boolean(getAccount(phoneVal.normalized));
    },

    /**
     * Profile Update: Only an already authenticated user can modify their information.
     */
    updateProfile: function (data) {
      const phone = getCurrentPhone();
      if (!phone) {
        return { success: false, error: 'برای تغییر مشخصات کاربری ابتدا باید وارد شوید.' };
      }
      const account = getAccount(phone);
      if (!account) {
        return { success: false, error: 'حساب کاربری یافت نشد.' };
      }

      if (data && typeof data.displayName === 'string') {
        const nameVal = validateDisplayName(data.displayName);
        if (!nameVal.isValid) {
          return { success: false, errors: { name: nameVal.error } };
        }
        account.displayName = nameVal.trimmed;
        account.updatedAt = new Date().toISOString();
        saveAccount(phone, account);
        return {
          success: true,
          user: {
            displayName: account.displayName,
            phone: account.phone,
            isLoggedIn: true
          }
        };
      }
      return { success: false, error: 'اطلاعات معتبری برای ویرایش ارائه نشده است.' };
    },

    /**
     * Logout: Ends the active session, but NEVER throws away the user's data.
     */
    logout: function () {
      storageAdapter.removeItem(STORAGE_KEYS.CURRENT_PHONE);
      return true;
    },

    // --- Favorites Management (Strictly Account-Bound to Logged-in User) ---
    getFavorites: function () {
      const phone = getCurrentPhone();
      if (!phone) return []; // Unauthenticated users have no favorites
      const account = getAccount(phone);
      const favs = account && Array.isArray(account.favorites) ? account.favorites : [];
      return favs.map(Number).filter(n => !isNaN(n));
    },

    isFavorite: function (bookId) {
      const numId = Number(bookId);
      if (isNaN(numId)) return false;
      return this.getFavorites().includes(numId);
    },

    addFavorite: function (bookId) {
      const phone = getCurrentPhone();
      if (!phone) return false; // Strictly requires login
      const numId = Number(bookId);
      if (isNaN(numId)) return false;

      const account = getAccount(phone);
      if (account) {
        if (!Array.isArray(account.favorites)) account.favorites = [];
        if (!account.favorites.includes(numId)) {
          account.favorites.push(numId);
          saveAccount(phone, account);
        }
        return true;
      }
      return false;
    },

    removeFavorite: function (bookId) {
      const phone = getCurrentPhone();
      if (!phone) return false; // Strictly requires login
      const numId = Number(bookId);
      if (isNaN(numId)) return false;

      const account = getAccount(phone);
      if (account && Array.isArray(account.favorites)) {
        account.favorites = account.favorites.filter(id => Number(id) !== numId);
        saveAccount(phone, account);
        return true;
      }
      return false;
    },

    toggleFavorite: function (bookId) {
      const phone = getCurrentPhone();
      if (!phone) {
        return { isFavorite: false, requireLogin: true };
      }
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

    // --- Library Management (Acquired / Purchased Books - Strictly Account-Bound) ---
    getLibrary: function () {
      const phone = getCurrentPhone();
      if (!phone) return [];
      const account = getAccount(phone);
      const lib = account && Array.isArray(account.library) ? account.library : [];
      return lib.map(Number).filter(n => !isNaN(n));
    },

    isInLibrary: function (bookId) {
      const numId = Number(bookId);
      if (isNaN(numId)) return false;
      return this.getLibrary().includes(numId);
    },

    addToLibrary: function (bookId) {
      const phone = getCurrentPhone();
      if (!phone) return false; // Acquisition strictly requires logged-in user

      const numId = Number(bookId);
      if (isNaN(numId)) return false;

      const account = getAccount(phone);
      if (account) {
        if (!Array.isArray(account.library)) account.library = [];
        // Strict duplicate prevention rule from spec
        if (!account.library.includes(numId)) {
          account.library.push(numId);
          saveAccount(phone, account);
        }
        return true;
      }
      return false;
    },

    /**
     * Deduplicated unique book count across both library and favorites.
     * Prevents double-counting a book if it has been both favorited and acquired.
     */
    getUniqueBooksCount: function () {
      const phone = getCurrentPhone();
      if (!phone) return 0;
      const lib = this.getLibrary();
      const favs = this.getFavorites();
      const uniqueIds = new Set([...lib, ...favs]);
      return uniqueIds.size;
    },

    // --- Reader Settings Management ---
    getReaderSettings: function () {
      const settings = safeGet(STORAGE_KEYS.READER_SETTINGS, DEFAULT_READER_SETTINGS);
      return {
        fontSize: ['small', 'medium', 'large'].includes(settings.fontSize) ? settings.fontSize : 'medium',
        theme: ['light', 'sepia', 'dark'].includes(settings.theme) ? settings.theme : 'light'
      };
    },

    setReaderSettings: function (newSettings) {
      const current = this.getReaderSettings();
      const updated = {
        fontSize: ['small', 'medium', 'large'].includes(newSettings.fontSize) ? newSettings.fontSize : current.fontSize,
        theme: ['light', 'sepia', 'dark'].includes(newSettings.theme) ? newSettings.theme : current.theme
      };
      safeSet(STORAGE_KEYS.READER_SETTINGS, updated);
      return updated;
    },

    // --- System / Reset Utility ---
    clearAll: function () {
      const keys = storageAdapter.getAllKeys();
      keys.forEach(k => {
        if (k && k.startsWith('vibeche_')) {
          storageAdapter.removeItem(k);
        }
      });
      storageAdapter.clear();
      return true;
    },

    // Expose internal adapter for testing
    _storageAdapter: storageAdapter
  };

  root.VibecheStorage = VibecheStorage;
})();
