/**
 * vibeche - Unit Tests for User Personal Library View (Step 6)
 * Tests:
 * 1. Unauthenticated gate: unauthenticated users cannot access library data
 * 2. Acquired books resolution: maps IDs to full book objects
 * 3. Favorited books resolution: maps IDs to full book objects
 * 4. Removal of favorites: removes book and reflects immediately
 * 5. Corrupt / missing book ID resilience in library list
 * 6. Multi-account isolation: User A library is isolated from User B library
 * 7. Authenticated profile name update verification
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
      const library = root.VibecheLibrary;
      const storage = root.VibecheStorage;
      const data = root.VibecheData;

      if (!library || !storage || !data) {
        throw new Error('VibecheLibrary, VibecheStorage, or VibecheData is not loaded.');
      }

      console.log('\n--- Starting Vibeche User Library Tests (Step 6) ---');

      tests.forEach(({ name, fn }) => {
        storage.clearAll();
        try {
          fn({ assert, assertEqual, library, storage, data });
          passed++;
          console.log(`✓ PASS: ${name}`);
        } catch (err) {
          failed++;
          console.log(`✗ FAIL: ${name} -> ${err.message}`);
        }
      });

      console.log(`\nLibrary Test Results: ${passed} passed, ${failed} failed, ${tests.length} total.`);
      return { total: tests.length, passed, failed };
    }

    return { test, run };
  }

  const runner = createTestRunner();

  // Test 1: Unauthenticated Gate
  runner.test('Library Gate: unauthenticated user has empty library and favorites list', ({ assertEqual, library, storage }) => {
    assertEqual(storage.isLoggedIn(), false);
    assertEqual(library.getLibraryBooks().length, 0, 'Unauthenticated user library must be empty');
    assertEqual(library.getFavoriteBooks().length, 0, 'Unauthenticated user favorites must be empty');
  });

  // Test 2: Acquired Books Resolution
  runner.test('Acquired Books: resolves acquired book IDs to complete book objects', ({ assert, assertEqual, library, storage }) => {
    storage.login('کاربر تستی', '09120000001');
    storage.addToLibrary(1); // شاهنامه
    storage.addToLibrary(2); // بوف کور

    const books = library.getLibraryBooks();
    assertEqual(books.length, 2, 'Should return 2 acquired books');
    assertEqual(books[0].id, 1, 'First book should have ID 1');
    assertEqual(books[0].title, 'شاهنامه');
    assert(typeof books[0].cover === 'string', 'Cover path must be valid string');
    assertEqual(books[1].id, 2, 'Second book should have ID 2');
    assertEqual(books[1].title, 'بوف کور');
  });

  // Test 3: Favorited Books Resolution
  runner.test('Favorites: resolves favorited book IDs to complete book objects with pricing and rating', ({ assert, assertEqual, library, storage }) => {
    storage.login('کاربر تستی', '09120000001');
    storage.addFavorite(12); // دیوان حافظ
    storage.addFavorite(9);  // سمفونی مردگان

    const favs = library.getFavoriteBooks();
    assertEqual(favs.length, 2, 'Should return 2 favorited books');
    assertEqual(favs[0].title, 'دیوان حافظ');
    assertEqual(favs[0].price, 0, 'دیوان حافظ is free');
    assertEqual(favs[1].title, 'سمفونی مردگان');
    assert(favs[1].price > 0, 'سمفونی مردگان has non-zero price');
    assert(favs[1].rating >= 4.0, 'Rating should be at least 4.0');
  });

  // Test 4: Removing Favorites
  runner.test('Remove Favorite: removing a book from favorites immediately updates list', ({ assertEqual, library, storage }) => {
    storage.login('کاربر تستی', '09120000001');
    storage.addFavorite(3);
    storage.addFavorite(5);
    assertEqual(library.getFavoriteBooks().length, 2);

    storage.removeFavorite(3);
    const updated = library.getFavoriteBooks();
    assertEqual(updated.length, 1);
    assertEqual(updated[0].id, 5);
  });

  // Test 5: Resilience on Non-Existent or Corrupt Book IDs
  runner.test('Resilience: safely skips missing or non-existent IDs without throwing errors', ({ assertEqual, library, storage }) => {
    storage.login('کاربر تستی', '09120000001');
    storage.addToLibrary(1);
    storage.addToLibrary(99999); // Non-existent ID
    storage.addFavorite(88888); // Non-existent ID

    const libBooks = library.getLibraryBooks();
    assertEqual(libBooks.length, 1, 'Non-existent ID must be safely filtered out from library');
    assertEqual(libBooks[0].id, 1);

    const favBooks = library.getFavoriteBooks();
    assertEqual(favBooks.length, 0, 'Non-existent ID must be safely filtered out from favorites');
  });

  // Test 6: Multi-Account Isolation in Library
  runner.test('Multi-Account: library books and favorites are strictly isolated per account', ({ assertEqual, library, storage }) => {
    // User 1
    storage.login('کاربر الف', '09121111111');
    storage.addToLibrary(1);
    storage.addFavorite(2);
    assertEqual(library.getLibraryBooks().length, 1);
    assertEqual(library.getFavoriteBooks().length, 1);
    storage.logout();

    // User 2
    storage.login('کاربر ب', '09352222222');
    assertEqual(library.getLibraryBooks().length, 0, 'User 2 starts with empty library');
    assertEqual(library.getFavoriteBooks().length, 0, 'User 2 starts with empty favorites');
    storage.addToLibrary(7);
    assertEqual(library.getLibraryBooks().length, 1);
    assertEqual(library.getLibraryBooks()[0].id, 7);
    storage.logout();

    // Back to User 1
    storage.login('کاربر الف', '09121111111');
    assertEqual(library.getLibraryBooks().length, 1);
    assertEqual(library.getLibraryBooks()[0].id, 1);
    assertEqual(library.getFavoriteBooks().length, 1);
    assertEqual(library.getFavoriteBooks()[0].id, 2);
  });

  // Test 7: Authenticated Profile Display Name Update
  runner.test('Profile Update: authenticated user can update display name', ({ assertEqual, storage }) => {
    storage.login('نام اولیه', '09125555555');
    assertEqual(storage.getUser().displayName, 'نام اولیه');

    const updateRes = storage.updateProfile({ displayName: 'نام جدید تاییدشده' });
    assertEqual(updateRes.success, true);
    assertEqual(storage.getUser().displayName, 'نام جدید تاییدشده');
  });

  root.VibecheLibraryTests = { runner };

  // If in CLI environment (JXA), run immediately
  if (typeof window === 'undefined' && typeof document === 'undefined') {
    runner.run();
  }
})();
