/**
 * vibeche - Unit Tests for State & LocalStorage Manager (Part 2)
 * Tests:
 * 1. Mobile number validation (11 digits, starts with 09)
 * 2. Persian and Latin digit normalization
 * 3. User login and logout workflow
 * 4. Favorites persistence, toggle, and duplicate prevention
 * 5. Library persistence and duplicate prevention
 * 6. Reader settings persistence (font size and theme)
 * 7. Corrupted JSON recovery and safe fallbacks
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  function createTestRunner() {
    const tests = [];
    let passed = 0;
    let failed = 0;

    function test(name, fn) {
      tests.push({ name, fn });
    }

    function assert(condition, message) {
      if (!condition) {
        throw new Error(message || 'Assertion failed');
      }
    }

    function assertEqual(actual, expected, message) {
      if (actual !== expected) {
        throw new Error(`${message || 'Failed'}: Expected [${expected}] but got [${actual}]`);
      }
    }

    function run() {
      const storage = root.VibecheStorage;
      if (!storage) {
        throw new Error('VibecheStorage is not loaded.');
      }

      console.log('\n--- Starting Vibeche Storage & State Tests (Part 2) ---');

      tests.forEach(({ name, fn }) => {
        // Clear state before each test
        storage.clearAll();
        try {
          fn({ assert, assertEqual, storage });
          passed++;
          console.log(`✓ PASS: ${name}`);
        } catch (err) {
          failed++;
          console.log(`✗ FAIL: ${name} -> ${err.message}`);
        }
      });

      console.log(`\nStorage Test Results: ${passed} passed, ${failed} failed, ${tests.length} total.`);
      return { total: tests.length, passed, failed };
    }

    return { test, run };
  }

  const runner = createTestRunner();

  // Test 1: Digit Normalization
  runner.test('Digit Normalization: converts Persian and Arabic digits to Latin', ({ assertEqual, storage }) => {
    assertEqual(storage.normalizeDigits('۰۹۱۲۳۴۵۶۷۸۹'), '09123456789', 'Persian digits should normalize to Latin');
    assertEqual(storage.normalizeDigits('٠٩١٢٣٤٥٦٧٨٩'), '09123456789', 'Arabic digits should normalize to Latin');
    assertEqual(storage.normalizeDigits(' 09123456789 '), '09123456789', 'Whitespace should be trimmed');
  });

  // Test 2: Phone Validation
  runner.test('Phone Validation: accepts valid 11-digit numbers starting with 09', ({ assert, storage }) => {
    assert(storage.validatePhone('09123456789').isValid, 'Latin 09... must be valid');
    assert(storage.validatePhone('۰۹۱۲۳۴۵۶۷۸۹').isValid, 'Persian ۰۹... must be valid');
    
    // Invalid cases
    assert(!storage.validatePhone('02112345678').isValid, 'Numbers starting with 021 must be invalid');
    assert(!storage.validatePhone('0912345678').isValid, '10-digit number must be invalid');
    assert(!storage.validatePhone('091234567890').isValid, '12-digit number must be invalid');
    assert(!storage.validatePhone('0912abc6789').isValid, 'Alpha characters must be invalid');
    assert(!storage.validatePhone('').isValid, 'Empty phone must be invalid');
  });

  // Test 3: Display Name Validation
  runner.test('Display Name Validation: rejects empty or too-short names', ({ assert, storage }) => {
    assert(storage.validateDisplayName('علی').isValid, 'Valid 3-char name should pass');
    assert(!storage.validateDisplayName('').isValid, 'Empty string should fail');
    assert(!storage.validateDisplayName('   ').isValid, 'Whitespace-only should fail');
    assert(!storage.validateDisplayName('ع').isValid, 'Single char should fail');
  });

  // Test 4: Login & Authentication
  runner.test('Authentication: handles login, errors, and session state', ({ assert, assertEqual, storage }) => {
    assertEqual(storage.isLoggedIn(), false, 'Initially user must not be logged in');

    // Failed login (invalid phone)
    const failRes = storage.login('علی رضایی', '02188888888');
    assertEqual(failRes.success, false, 'Login with non-09 phone should fail');
    assert(typeof failRes.errors.phone === 'string', 'Phone error must be returned');

    // Successful login with Persian digits
    const succRes = storage.login('عرفان محمدی', '۰۹۳۵۱۲۳۴۵۶۷');
    assertEqual(succRes.success, true, 'Login with Persian digits should succeed');
    assertEqual(succRes.user.phone, '09351234567', 'Phone should be stored as normalized Latin');
    assertEqual(storage.isLoggedIn(), true, 'isLoggedIn must now return true');

    // User persistence check
    const currentUser = storage.getUser();
    assertEqual(currentUser.displayName, 'عرفان محمدی');

    // Logout
    storage.logout();
    assertEqual(storage.isLoggedIn(), false, 'Logout should clear session');
    assertEqual(storage.getUser(), null, 'getUser should return null after logout');
  });

  // Test 5: Favorites Management & Duplicate Prevention
  runner.test('Favorites: add, remove, toggle, and duplicate prevention', ({ assert, assertEqual, storage }) => {
    assertEqual(storage.getFavorites().length, 0, 'Initially favorites should be empty');

    // Add favorite
    storage.addFavorite(1);
    storage.addFavorite(1); // duplicate attempt
    storage.addFavorite("2"); // string ID coercion
    assertEqual(storage.getFavorites().length, 2, 'Duplicates must not be added');
    assert(storage.isFavorite(1), 'Book 1 should be favorite');
    assert(storage.isFavorite(2), 'Book 2 should be favorite');
    assert(!storage.isFavorite(3), 'Book 3 should not be favorite');

    // Toggle
    const toggleRes = storage.toggleFavorite(1);
    assertEqual(toggleRes.isFavorite, false, 'Toggling existing favorite should remove it');
    assert(!storage.isFavorite(1), 'Book 1 should no longer be favorite');

    storage.toggleFavorite(1);
    assert(storage.isFavorite(1), 'Toggling again should re-add favorite');

    // Remove
    storage.removeFavorite(2);
    assert(!storage.isFavorite(2), 'Book 2 should be removed');
  });

  // Test 6: Library (Acquired Books) Duplicate Prevention
  runner.test('Library: prevents duplicate additions upon repeat acquisition', ({ assert, assertEqual, storage }) => {
    assertEqual(storage.getLibrary().length, 0, 'Initially library should be empty');

    // Add free book (شاهنامه id: 1)
    storage.addToLibrary(1);
    assertEqual(storage.isInLibrary(1), true, 'Book 1 should be in library');

    // Simulate clicking "Buy / Claim" again
    storage.addToLibrary(1);
    storage.addToLibrary("1");
    assertEqual(storage.getLibrary().length, 1, 'Library must contain exactly 1 entry even after repeated adds');

    // Add another book
    storage.addToLibrary(3);
    assertEqual(storage.getLibrary().length, 2, 'Library should now contain 2 distinct books');
  });

  // Test 7: Reader Settings Persistence
  runner.test('Reader Settings: saves and loads font size and theme preferences', ({ assertEqual, storage }) => {
    const defaultSettings = storage.getReaderSettings();
    assertEqual(defaultSettings.fontSize, 'medium', 'Default font size should be medium');
    assertEqual(defaultSettings.theme, 'light', 'Default theme should be light');

    // Update settings
    storage.setReaderSettings({ fontSize: 'large', theme: 'dark' });
    const updated = storage.getReaderSettings();
    assertEqual(updated.fontSize, 'large', 'Font size should be large');
    assertEqual(updated.theme, 'dark', 'Theme should be dark');

    // Invalid value fallback
    storage.setReaderSettings({ fontSize: 'huge-unknown', theme: 'neon' });
    const fallback = storage.getReaderSettings();
    assertEqual(fallback.fontSize, 'large', 'Invalid font size should retain current');
    assertEqual(fallback.theme, 'dark', 'Invalid theme should retain current');
  });

  // Test 8: Resilient Recovery on Corrupted Storage
  runner.test('Corruption Recovery: recovers safely when storage contains invalid JSON', ({ assertEqual, storage }) => {
    // Inject broken JSON directly into storage keys
    storage._storageAdapter.setItem('vibeche_favorites', '{broken-json-not-valid');
    storage._storageAdapter.setItem('vibeche_user', 'undefined');
    storage._storageAdapter.setItem('vibeche_reader_settings', '{"fontSize": broken}');

    // Calling methods should NOT crash and should return safe defaults
    const favs = storage.getFavorites();
    assertEqual(Array.isArray(favs), true, 'Corrupted favorites should safely reset to []');
    assertEqual(favs.length, 0, 'Favorites array should be empty default');

    const user = storage.getUser();
    assertEqual(user, null, 'Corrupted user should safely reset to null');

    const settings = storage.getReaderSettings();
    assertEqual(settings.fontSize, 'medium', 'Corrupted settings should reset to medium');
    assertEqual(settings.theme, 'light', 'Corrupted settings should reset to light');
  });

  root.VibecheStorageTests = { runner };

  // If in CLI environment (JXA), run immediately
  if (typeof window === 'undefined' && typeof document === 'undefined') {
    runner.run();
  }
})();
