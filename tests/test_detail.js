/**
 * vibeche - Unit Tests for Book Detail Logic (Step 5)
 * Tests:
 * 1. Book ID resolution for direct URL opening (?book=id)
 * 2. Resolution for numeric strings and invalid IDs (404 handling)
 * 3. Related books logic (at least 3 books from same category, excludes self)
 * 4. Sample excerpt availability validation
 * 5. Library purchase/claim simulation rules
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
      const data = root.VibecheData;
      const storage = root.VibecheStorage;

      if (!data || !storage) {
        throw new Error('VibecheData or VibecheStorage is not loaded.');
      }

      console.log('\n--- Starting Vibeche Book Detail Tests (Step 5) ---');

      tests.forEach(({ name, fn }) => {
        try {
          fn({ assert, assertEqual, data, storage });
          passed++;
          console.log(`✓ PASS: ${name}`);
        } catch (err) {
          failed++;
          console.log(`✗ FAIL: ${name} -> ${err.message}`);
        }
      });

      console.log(`\nDetail Test Results: ${passed} passed, ${failed} failed, ${tests.length} total.`);
      return { total: tests.length, passed, failed };
    }

    return { test, run };
  }

  const runner = createTestRunner();

  // Test 1: Finding book by valid integer ID
  runner.test('Detail: finds book with complete metadata by integer ID', ({ assert, assertEqual, data }) => {
    const book = data.getBookById(3);
    assert(book !== null, 'Book 3 should exist');
    assertEqual(book.title, 'سووشون');
    assertEqual(book.author, 'سیمین دانشور');
    assertEqual(book.categoryId, 'iranian-novel');
    assert(typeof book.description === 'string' && book.description.length > 20, 'Should have full description');
  });

  // Test 2: Finding book by string ID (URL param simulation)
  runner.test('Detail: coerces string ID from URLSearchParams (?book=3)', ({ assert, assertEqual, data }) => {
    const book = data.getBookById('3');
    assert(book !== null, 'Book should be found by string ID "3"');
    assertEqual(book.id, 3);
    assertEqual(book.title, 'سووشون');
  });

  // Test 3: Invalid ID returns null (triggers 404 state)
  runner.test('Detail: returns null for invalid or non-existent IDs for 404 page', ({ assertEqual, data }) => {
    assertEqual(data.getBookById(99999), null, 'Non-existent ID should return null');
    assertEqual(data.getBookById('invalid-slug'), null, 'Non-numeric string should return null');
    assertEqual(data.getBookById(0), null, 'ID 0 should return null');
    assertEqual(data.getBookById(null), null, 'null ID should return null');
  });

  // Test 4: Related books query (spec: at least 3 related books from same category)
  runner.test('Related Books: returns at least 3 books from same category excluding current', ({ assert, assertEqual, data }) => {
    const bookId = 2; // بوف کور (iranian-novel)
    const related = data.getRelatedBooks(bookId, 3);
    
    assert(Array.isArray(related), 'Related books must be an array');
    assertEqual(related.length, 3, 'Should find 3 related books');
    related.forEach(rel => {
      assertEqual(rel.categoryId, 'iranian-novel', 'Must be in the same category');
      assert(rel.id !== bookId, 'Must not include the current book itself');
    });
  });

  // Test 5: Sample reader excerpt check
  runner.test('Sample Excerpts: books with sample excerpts have multi-paragraph array', ({ assert, data }) => {
    const sampleBook = data.getBookById(2); // بوف کور
    assert(Array.isArray(sampleBook.sampleExcerpt), 'Sample excerpt must be an array');
    assert(sampleBook.sampleExcerpt.length >= 2, 'Must have at least 2 paragraphs');
    sampleBook.sampleExcerpt.forEach(p => {
      assert(typeof p === 'string' && p.trim().length > 0, 'Paragraph must be non-empty string');
    });
  });

  // Test 6: Acquisition logic in storage
  runner.test('Acquisition Simulation: claim or buy adds to library and prevents duplicates', ({ assert, assertEqual, storage }) => {
    storage.clearAll();
    assertEqual(storage.isInLibrary(3), false, 'Initially book 3 should not be in library');

    // Add book
    storage.addToLibrary(3);
    assertEqual(storage.isInLibrary(3), true, 'Book 3 should now be in library');

    // Attempt duplicate addition
    storage.addToLibrary(3);
    storage.addToLibrary('3');
    assertEqual(storage.getLibrary().filter(id => id === 3).length, 1, 'Book 3 must only appear once in library');
  });

  root.VibecheDetailTests = { runner };

  // If in CLI environment (JXA), run immediately
  if (typeof window === 'undefined' && typeof document === 'undefined') {
    runner.run();
  }
})();
