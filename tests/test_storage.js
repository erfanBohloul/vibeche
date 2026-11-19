/**
 * vibeche - Unit Tests for State & LocalStorage Manager (Account-Keyed Architecture)
 * Tests:
 * 1. Mobile number validation (11 digits, starts with 09)
 * 2. Persian and Latin digit normalization
 * 3. User login and logout workflow
 * 4. Favorites persistence, toggle, and duplicate prevention
 * 5. Library persistence and duplicate prevention
 * 6. Reader settings persistence (font size and theme)
 * 7. Corrupted JSON recovery and safe fallbacks
 * 8. Multi-account data isolation & persistence (Data never thrown away on logout)
 * 9. Guest favorites migration upon login
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

      console.log('\n--- Starting Vibeche Storage & State Tests (Account-Keyed) ---');

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
    assert(storage.validateDisplayName('علی').isValid, 'Valid name should pass');
    assert(!storage.validateDisplayName('').isValid, 'Empty string should fail');
    assert(!storage.validateDisplayName('   ').isValid, 'Whitespace-only should fail');
    assert(!storage.validateDisplayName('ع').isValid, 'Single char should fail');
  });

  // Test 4: Basic Login & Authentication
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
    assertEqual(storage.isLoggedIn(), false, 'Logout should clear active session');
    assertEqual(storage.getUser(), null, 'getUser should return null after logout');
  });

  // Test 4b: Name Integrity & Authenticated Profile Updates
  runner.test('Account Integrity: prevents altering name on login, allows update only when authenticated', ({ assert, assertEqual, storage }) => {
    // 1. Initial registration
    const regRes = storage.login('سارا احمدی', '09121234567');
    assertEqual(regRes.success, true, 'Initial registration must succeed');
    storage.logout();

    // 2. Attempt login with same phone but DIFFERENT name
    const mismatchRes = storage.login('فرد دیگر', '09121234567');
    assertEqual(mismatchRes.success, false, 'Login with mismatched name should fail');
    assert(typeof mismatchRes.errors.name === 'string', 'Name error must be returned on mismatch');
    assert(!mismatchRes.errors.name.includes('سارا احمدی'), 'Privacy check: error message must NOT disclose the registered owner name');
    assertEqual(storage.isLoggedIn(), false, 'User must not be logged in after failed mismatch');

    // 3. Login with matching name succeeds
    const matchRes = storage.login('سارا احمدی', '09121234567');
    assertEqual(matchRes.success, true, 'Login with correct name must succeed');
    assertEqual(storage.isLoggedIn(), true);

    // 4. Unauthenticated profile update fails
    storage.logout();
    const unauthUpdate = storage.updateProfile({ displayName: 'سارا رضوی' });
    assertEqual(unauthUpdate.success, false, 'Unauthenticated profile update must be rejected');

    // 5. Authenticated profile update succeeds
    storage.login('سارا احمدی', '09121234567');
    const authUpdate = storage.updateProfile({ displayName: 'سارا رضوی' });
    assertEqual(authUpdate.success, true, 'Authenticated profile update must succeed');
    assertEqual(storage.getUser().displayName, 'سارا رضوی');

    // 6. Logging in again now requires the updated name
    storage.logout();
    const oldNameLogin = storage.login('سارا احمدی', '09121234567');
    assertEqual(oldNameLogin.success, false, 'Login with old name must now fail');
    const newNameLogin = storage.login('سارا رضوی', '09121234567');
    assertEqual(newNameLogin.success, true, 'Login with updated name must succeed');
  });

  // Test 5: Favorites Management & Duplicate Prevention
  runner.test('Favorites: add, remove, toggle, and duplicate prevention', ({ assert, assertEqual, storage }) => {
    storage.login('تست', '09120000000');
    assertEqual(storage.getFavorites().length, 0, 'Initially favorites should be empty');

    // Add favorite
    storage.addFavorite(1);
    storage.addFavorite(1); // duplicate attempt
    storage.addFavorite('2'); // string ID coercion
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
    storage.login('تست', '09120000000');
    assertEqual(storage.getLibrary().length, 0, 'Initially library should be empty');

    storage.addToLibrary(1);
    assertEqual(storage.isInLibrary(1), true, 'Book 1 should be in library');

    // Repeated adds
    storage.addToLibrary(1);
    storage.addToLibrary('1');
    assertEqual(storage.getLibrary().length, 1, 'Library must contain exactly 1 entry even after repeated adds');

    storage.addToLibrary(3);
    assertEqual(storage.getLibrary().length, 2, 'Library should now contain 2 distinct books');
  });

  // Test 7: Reader Settings Persistence
  runner.test('Reader Settings: saves and loads font size and theme preferences', ({ assertEqual, storage }) => {
    const defaultSettings = storage.getReaderSettings();
    assertEqual(defaultSettings.fontSize, 'medium', 'Default font size should be medium');
    assertEqual(defaultSettings.theme, 'light', 'Default theme should be light');

    storage.setReaderSettings({ fontSize: 'large', theme: 'dark' });
    const updated = storage.getReaderSettings();
    assertEqual(updated.fontSize, 'large', 'Font size should be large');
    assertEqual(updated.theme, 'dark', 'Theme should be dark');
  });

  // Test 8: Multi-Account Isolation and Zero Data Loss on Logout
  runner.test('Account-Keyed Storage: preserves User A data when User B logs in and restores upon re-login', ({ assert, assertEqual, storage }) => {
    // 1. User A logs in
    storage.login('کاربر اول', '09121111111');
    storage.addFavorite(1);
    storage.addFavorite(2);
    storage.addToLibrary(3);

    assertEqual(storage.getFavorites().length, 2, 'User A should have 2 favorites');
    assertEqual(storage.getLibrary().length, 1, 'User A should have 1 library book');

    // 2. User A logs out
    storage.logout();
    assertEqual(storage.isLoggedIn(), false, 'Session should be logged out');

    // 3. User B logs in with a different phone number
    storage.login('کاربر دوم', '09352222222');
    assertEqual(storage.getFavorites().length, 0, 'User B should have an empty favorites list');
    assertEqual(storage.getLibrary().length, 0, 'User B should have an empty library');

    // User B adds their own books
    storage.addFavorite(8);
    storage.addToLibrary(12);
    assertEqual(storage.isFavorite(8), true);
    assertEqual(storage.isFavorite(1), false, 'User B should NOT see User A favorites');

    // 4. User B logs out
    storage.logout();

    // 5. User A logs back in with their original number
    storage.login('کاربر اول', '09121111111');
    assertEqual(storage.getUser().displayName, 'کاربر اول');
    // Verify ALL of User A's data is 100% restored!
    assertEqual(storage.getFavorites().length, 2, 'User A favorites must be fully restored');
    assert(storage.isFavorite(1), 'Book 1 should still be favorite for User A');
    assert(storage.isFavorite(2), 'Book 2 should still be favorite for User A');
    assert(!storage.isFavorite(8), 'User A should not have User B favorites');
    assertEqual(storage.getLibrary().length, 1, 'User A library must be fully restored');
    assert(storage.isInLibrary(3), 'Book 3 must still be in User A library');
  });

  // Test 9: Strict Auth Gate on Favorites (No Guest Favorites)
  runner.test('Favorites Protection: unauthenticated users cannot favorite books', ({ assert, assertEqual, storage }) => {
    // Unauthenticated guest tries to favorite
    assertEqual(storage.isLoggedIn(), false);
    assertEqual(storage.addFavorite(5), false, 'Guest addFavorite must return false');
    assertEqual(storage.getFavorites().length, 0, 'Guest favorites must be empty');
    assertEqual(storage.isFavorite(5), false, 'Book 5 must not be favorite for guest');

    const toggleRes = storage.toggleFavorite(5);
    assertEqual(toggleRes.requireLogin, true, 'toggleFavorite must report requireLogin: true');
    assertEqual(storage.getFavorites().length, 0);

    // User logs in
    storage.login('کاربر تستی', '09193333333');
    assertEqual(storage.isLoggedIn(), true);

    // Now favoriting works strictly within the account
    assertEqual(storage.addFavorite(5), true);
    assert(storage.isFavorite(5));
    assertEqual(storage.getFavorites().length, 1);

    // Logout
    storage.logout();
    assertEqual(storage.getFavorites().length, 0, 'Logged out view shows empty favorites');

    // Re-login
    storage.login('کاربر تستی', '09193333333');
    assertEqual(storage.getFavorites().length, 1, 'Re-login restores account favorites');
    assert(storage.isFavorite(5));
  });

  // Test 10: Resilient Recovery on Corrupted Account Storage
  runner.test('Corruption Recovery: recovers safely when account storage contains invalid JSON', ({ assertEqual, storage }) => {
    storage._storageAdapter.setItem('vibeche_current_phone', '09129999999');
    storage._storageAdapter.setItem('vibeche_account_09129999999', '{broken-json-syntax-error');

    // Accessing methods should NOT crash and should return safe defaults
    const favs = storage.getFavorites();
    assertEqual(Array.isArray(favs), true, 'Corrupted favorites should safely reset to []');
    assertEqual(favs.length, 0);

    const lib = storage.getLibrary();
    assertEqual(Array.isArray(lib), true, 'Corrupted library should safely reset to []');
    assertEqual(lib.length, 0);
  });

  root.VibecheStorageTests = { runner };

  // If in CLI environment (JXA), run immediately
  if (typeof window === 'undefined' && typeof document === 'undefined') {
    runner.run();
  }
})();
