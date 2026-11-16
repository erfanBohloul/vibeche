/**
 * vibeche - Unit Tests for Catalog Search, Multi-Filter & Sort (Step 4)
 * Tests:
 * 1. Search in title and author (trimmed whitespace)
 * 2. Category filtering
 * 3. Free books toggle
 * 4. Combined simultaneous multi-filtering
 * 5. Sorting by price (asc, desc) and rating (desc)
 * 6. Empty search handling
 * 7. Price range filter (between minPrice and maxPrice)
 * 8. Page count filter (pages <= maxPages)
 * 9. Rating filter (rating >= minRating)
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
      const catalog = root.VibecheCatalog;
      if (!catalog) {
        throw new Error('VibecheCatalog is not loaded.');
      }

      console.log('\n--- Starting Vibeche Catalog & Filter Tests (Step 4) ---');

      tests.forEach(({ name, fn }) => {
        try {
          fn({ assert, assertEqual, catalog });
          passed++;
          console.log(`✓ PASS: ${name}`);
        } catch (err) {
          failed++;
          console.log(`✗ FAIL: ${name} -> ${err.message}`);
        }
      });

      console.log(`\nCatalog Test Results: ${passed} passed, ${failed} failed, ${tests.length} total.`);
      return { total: tests.length, passed, failed };
    }

    return { test, run };
  }

  const runner = createTestRunner();

  // Test 1: Search in title with trimmed whitespace
  runner.test('Search: finds books by title and ignores leading/trailing whitespace', ({ assert, assertEqual, catalog }) => {
    const res = catalog.filterAndSortBooks({ query: '   شاهنامه   ' });
    assertEqual(res.length, 1, 'Should match exactly 1 book');
    assertEqual(res[0].id, 1, 'Matched book should be شاهنامه');
  });

  // Test 2: Search in author name
  runner.test('Search: finds books by author name', ({ assert, assertEqual, catalog }) => {
    const res = catalog.filterAndSortBooks({ query: 'سیمین دانشور' });
    assertEqual(res.length, 1, 'Should match Simin Daneshvar');
    assertEqual(res[0].title, 'سووشون', 'Should find سووشون');

    const multi = catalog.filterAndSortBooks({ query: 'صادق' });
    assert(multi.length >= 2, 'Should match both Sadegh Hedayat and Sadeq Chubak');
  });

  // Test 3: Category filter
  runner.test('Category Filter: filters books by categoryId', ({ assert, assertEqual, catalog }) => {
    const poetry = catalog.filterAndSortBooks({ categoryId: 'classic-poetry' });
    assertEqual(poetry.length, 2, 'Should find 2 classical poetry books (شاهنامه, دیوان حافظ)');
    poetry.forEach(b => assertEqual(b.categoryId, 'classic-poetry'));

    const all = catalog.filterAndSortBooks({ categoryId: 'all' });
    assertEqual(all.length, root.VibecheData.BOOKS.length, 'Category "all" should return full catalog');
  });

  // Test 4: Free books filter
  runner.test('Free Books Filter: returns only books with price === 0', ({ assert, catalog }) => {
    const freeBooks = catalog.filterAndSortBooks({ freeOnly: true });
    assert(freeBooks.length >= 3, 'Should return at least 3 free books');
    freeBooks.forEach(b => assert(b.price === 0, `Book ${b.id} should be free`));
  });

  // Test 5: Combined simultaneous filtering (Search + Category + Free)
  runner.test('Combined Filter: applies search, category, and free toggle simultaneously', ({ assertEqual, catalog }) => {
    const combined = catalog.filterAndSortBooks({
      categoryId: 'satire-social',
      freeOnly: true
    });
    assertEqual(combined.length, 1, 'Should find exactly 1 free satire book');
    assertEqual(combined[0].id, 10, 'Free satire book should be مدیر مدرسه');

    const searchCombined = catalog.filterAndSortBooks({
      query: 'مدیر',
      categoryId: 'satire-social',
      freeOnly: true
    });
    assertEqual(searchCombined.length, 1, 'Should still find مدیر مدرسه');

    const unmatched = catalog.filterAndSortBooks({
      query: 'دایی‌جان',
      categoryId: 'satire-social',
      freeOnly: true
    });
    assertEqual(unmatched.length, 0, 'Should return 0 for conflicting filters');
  });

  // Test 6: Sorting by Price Ascending
  runner.test('Sorting: price_asc orders books from lowest to highest price', ({ assert, catalog }) => {
    const sorted = catalog.filterAndSortBooks({ sort: 'price_asc' });
    for (let i = 0; i < sorted.length - 1; i++) {
      assert(sorted[i].price <= sorted[i + 1].price, `Price at index ${i} (${sorted[i].price}) should be <= next (${sorted[i + 1].price})`);
    }
    assert(sorted[0].price === 0, 'First book in price_asc should be free (0 Toman)');
  });

  // Test 7: Sorting by Price Descending
  runner.test('Sorting: price_desc orders books from highest to lowest price', ({ assert, assertEqual, catalog }) => {
    const sorted = catalog.filterAndSortBooks({ sort: 'price_desc' });
    for (let i = 0; i < sorted.length - 1; i++) {
      assert(sorted[i].price >= sorted[i + 1].price, `Price at index ${i} (${sorted[i].price}) should be >= next (${sorted[i + 1].price})`);
    }
    assertEqual(sorted[0].id, 6, 'Highest priced book should be کلیدر (195,000 Toman)');
  });

  // Test 8: Sorting by Rating Descending
  runner.test('Sorting: rating_desc orders books by highest rating first', ({ assert, assertEqual, catalog }) => {
    const sorted = catalog.filterAndSortBooks({ sort: 'rating_desc' });
    for (let i = 0; i < sorted.length - 1; i++) {
      assert(sorted[i].rating >= sorted[i + 1].rating, `Rating at index ${i} (${sorted[i].rating}) should be >= next (${sorted[i + 1].rating})`);
    }
    assertEqual(sorted[0].rating, 5.0, 'Top rated book should have 5.0 rating (دیوان حافظ)');
  });

  // Test 9: Empty result handling
  runner.test('Empty State: returns empty array for non-matching queries without errors', ({ assertEqual, catalog }) => {
    const res = catalog.filterAndSortBooks({ query: 'یک_عبارت_کاملا_ناموجود_در_داده‌ها' });
    assertEqual(Array.isArray(res), true, 'Should return an array');
    assertEqual(res.length, 0, 'Should have length 0');
  });

  // Test 10: Price range filter (between minPrice and maxPrice)
  runner.test('Filter Price Range: filters books with price between minPrice and maxPrice', ({ assert, catalog }) => {
    const res = catalog.filterAndSortBooks({ minPrice: 50000, maxPrice: 70000 });
    assert(res.length > 0, 'Should find books in 50k-70k price range');
    res.forEach(b => {
      assert(b.price >= 50000 && b.price <= 70000, `Book ${b.id} price (${b.price}) outside range [50000, 70000]`);
    });
  });

  // Test 11: Number of pages filter (pages <= maxPages)
  runner.test('Filter Page Count: filters books with page count less than or equal to maxPages', ({ assert, catalog }) => {
    const shortBooks = catalog.filterAndSortBooks({ maxPages: 200 });
    assert(shortBooks.length >= 2, 'Should find at least 2 short books (<= 200 pages)');
    shortBooks.forEach(b => {
      assert(b.pages <= 200, `Book ${b.id} pages (${b.pages}) should be <= 200`);
    });
  });

  // Test 12: Rating filter (rating >= minRating)
  runner.test('Filter Rating: filters books with rating greater than or equal to minRating', ({ assert, catalog }) => {
    const topRated = catalog.filterAndSortBooks({ minRating: 4.8 });
    assert(topRated.length > 0, 'Should find books with rating >= 4.8');
    topRated.forEach(b => {
      assert(b.rating >= 4.8, `Book ${b.id} rating (${b.rating}) should be >= 4.8`);
    });
  });

  root.VibecheCatalogTests = { runner };

  // If in CLI environment (JXA), run immediately
  if (typeof window === 'undefined' && typeof document === 'undefined') {
    runner.run();
  }
})();
