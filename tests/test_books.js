/**
 * vibeche - Unit Tests for Books Data and Query Functions
 * Tests compliance with Sharif Web Programming HW1 Requirements:
 * 1. At least 12 books with unique IDs
 * 2. Persian title, author, category, cover, description, rating, price
 * 3. At least 3 categories and at least 3 free books (price: 0)
 * 4. Multi-paragraph sample text for at least 3 books
 * 5. Query helper functions: getBookById, getFreeBooks, getRelatedBooks, etc.
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  function createTestRunner() {
    const tests = [];
    let passed = 0;
    let failed = 0;
    const results = [];

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

    function assertTrue(condition, message) {
      assert(condition === true, message);
    }

    function run() {
      const data = root.VibecheData;
      if (!data) {
        throw new Error('VibecheData is not loaded or undefined.');
      }

      console.log('--- Starting Vibeche Data Tests ---');

      tests.forEach(({ name, fn }) => {
        try {
          fn({ assert, assertEqual, assertTrue, data });
          passed++;
          results.push({ name, passed: true });
          console.log(`✓ PASS: ${name}`);
        } catch (err) {
          failed++;
          results.push({ name, passed: false, error: err.message });
          console.error(`✗ FAIL: ${name} -> ${err.message}`);
        }
      });

      console.log(`\nResults: ${passed} passed, ${failed} failed, ${tests.length} total.`);
      return { total: tests.length, passed, failed, results };
    }

    return { test, run, results };
  }

  const runner = createTestRunner();

  // Test Suite 1: Dataset Requirements
  runner.test('Requirement 1: Dataset must contain at least 12 books', ({ assert, data }) => {
    assert(Array.isArray(data.BOOKS), 'BOOKS must be an array');
    assert(data.BOOKS.length >= 12, `Expected >= 12 books, found ${data.BOOKS.length}`);
  });

  runner.test('Requirement 2: Every book must have a unique identifier', ({ assert, data }) => {
    const ids = new Set();
    data.BOOKS.forEach(book => {
      assert(book.id !== undefined && book.id !== null, 'Book must have an id');
      assert(!ids.has(book.id), `Duplicate book id detected: ${book.id}`);
      ids.add(book.id);
    });
  });

  runner.test('Requirement 3: Every book must contain required Persian metadata', ({ assert, data }) => {
    data.BOOKS.forEach(book => {
      assert(typeof book.title === 'string' && book.title.trim().length > 0, `Book ${book.id} missing title`);
      assert(typeof book.author === 'string' && book.author.trim().length > 0, `Book ${book.id} missing author`);
      assert(typeof book.category === 'string' && book.category.trim().length > 0, `Book ${book.id} missing category`);
      assert(typeof book.categoryId === 'string' && book.categoryId.trim().length > 0, `Book ${book.id} missing categoryId`);
      assert(typeof book.cover === 'string' && book.cover.startsWith('assets/images/covers/'), `Book ${book.id} invalid cover path`);
      assert(typeof book.description === 'string' && book.description.trim().length > 10, `Book ${book.id} missing description`);
    });
  });

  runner.test('Requirement 4: At least 3 distinct categories must be defined', ({ assert, data }) => {
    assert(Array.isArray(data.CATEGORIES), 'CATEGORIES must be an array');
    const realCategories = data.CATEGORIES.filter(c => c.id !== 'all');
    assert(realCategories.length >= 3, `Expected at least 3 categories, got ${realCategories.length}`);

    // Verify categories are actually used in books
    const usedCategories = new Set(data.BOOKS.map(b => b.categoryId));
    assert(usedCategories.size >= 3, `Expected at least 3 used categories, got ${usedCategories.size}`);
  });

  runner.test('Requirement 5: Prices must be numeric (Toman) and at least 3 free books (price === 0)', ({ assert, data }) => {
    let freeBookCount = 0;
    data.BOOKS.forEach(book => {
      assert(typeof book.price === 'number', `Price of book ${book.id} must be a number`);
      assert(book.price >= 0, `Price of book ${book.id} cannot be negative`);
      if (book.price === 0) {
        freeBookCount++;
      }
    });
    assert(freeBookCount >= 3, `Expected at least 3 free books (price: 0), found ${freeBookCount}`);
  });

  runner.test('Requirement 6: Ratings must be numeric numbers between 0 and 5', ({ assert, data }) => {
    data.BOOKS.forEach(book => {
      assert(typeof book.rating === 'number', `Rating of book ${book.id} must be a number`);
      assert(book.rating >= 0 && book.rating <= 5, `Rating ${book.rating} of book ${book.id} out of bounds [0, 5]`);
    });
  });

  runner.test('Requirement 7: At least 3 books must have multi-paragraph sample reading text', ({ assert, data }) => {
    let multiParagraphCount = 0;
    data.BOOKS.forEach(book => {
      if (Array.isArray(book.sampleExcerpt) && book.sampleExcerpt.length >= 2) {
        // Ensure each paragraph has meaningful text
        const hasValidParagraphs = book.sampleExcerpt.every(p => typeof p === 'string' && p.trim().length > 20);
        if (hasValidParagraphs) {
          multiParagraphCount++;
        }
      }
    });
    assert(multiParagraphCount >= 3, `Expected at least 3 books with multi-paragraph text, found ${multiParagraphCount}`);
  });

  // Test Suite 2: Query Helper Functions
  runner.test('Function getBookById: retrieves book by integer ID', ({ assertEqual, data }) => {
    const book1 = data.getBookById(1);
    assertEqual(book1.id, 1, 'Should find book with id 1');
    assertEqual(book1.title, 'شاهنامه', 'Title of book 1 should be شاهنامه');
  });

  runner.test('Function getBookById: retrieves book by string ID (for URL parameters)', ({ assertEqual, data }) => {
    const book2 = data.getBookById("2");
    assertEqual(book2.id, 2, 'Should parse string "2" to number 2');
    assertEqual(book2.title, 'بوف کور', 'Title should be بوف کور');
  });

  runner.test('Function getBookById: handles missing or invalid IDs safely', ({ assertEqual, data }) => {
    assertEqual(data.getBookById(9999), null, 'Non-existent ID should return null');
    assertEqual(data.getBookById('not-a-number'), null, 'Invalid string should return null');
    assertEqual(data.getBookById(null), null, 'null ID should return null');
    assertEqual(data.getBookById(undefined), null, 'undefined ID should return null');
  });

  runner.test('Function getFreeBooks: returns only books with price === 0', ({ assert, data }) => {
    const freeBooks = data.getFreeBooks();
    assert(Array.isArray(freeBooks), 'Result must be an array');
    assert(freeBooks.length >= 3, `Expected at least 3 free books, got ${freeBooks.length}`);
    freeBooks.forEach(b => {
      assert(b.price === 0, `Book ${b.id} returned in free list but has price ${b.price}`);
    });
  });

  runner.test('Function getFeaturedBooks: returns only featured books', ({ assert, data }) => {
    const featured = data.getFeaturedBooks();
    assert(Array.isArray(featured) && featured.length > 0, 'Featured books should not be empty');
    featured.forEach(b => {
      assert(b.featured === true, `Book ${b.id} should have featured: true`);
    });
  });

  runner.test('Function getNewestBooks: returns only newest books', ({ assert, data }) => {
    const newest = data.getNewestBooks();
    assert(Array.isArray(newest) && newest.length > 0, 'Newest books should not be empty');
    newest.forEach(b => {
      assert(b.newest === true, `Book ${b.id} should have newest: true`);
    });
  });

  runner.test('Function getRelatedBooks: returns related books from same category excluding current book', ({ assert, assertEqual, data }) => {
    const book = data.getBookById(2); // بوف کور (iranian-novel)
    const related = data.getRelatedBooks(2, 3);
    
    assert(Array.isArray(related), 'Related books must be an array');
    assert(related.length > 0 && related.length <= 3, `Expected 1-3 related books, got ${related.length}`);
    related.forEach(rel => {
      assertEqual(rel.categoryId, book.categoryId, 'Related book must share same categoryId');
      assert(rel.id !== book.id, 'Related books must not include the queried book itself');
    });

    // Test with non-existent book
    const emptyRelated = data.getRelatedBooks(9999);
    assertEqual(emptyRelated.length, 0, 'Non-existent book should return empty related array');
  });

  root.VibecheTests = { runner };

  // If in non-browser CLI environment (JXA), run immediately
  if (typeof window === 'undefined' && typeof document === 'undefined') {
    runner.run();
  }
})();
