/**
 * vibeche - Unit Tests for Sample Reader & Reading Settings (Step 7)
 * Tests:
 * 1. Book resolution by object or integer/string ID
 * 2. Reader settings retrieval and defaults
 * 3. Reader settings persistence (font size and theme)
 * 4. Multi-paragraph sample excerpt validation (at least 3 books have multi-paragraph text)
 * 5. Reader font size modes (small, medium, large)
 * 6. Reader theme modes (light, dark)
 * 7. Handling books without sample excerpt
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
      const reader = root.VibecheReader;
      const data = root.VibecheData;
      const storage = root.VibecheStorage;

      if (!reader || !data || !storage) {
        throw new Error('VibecheReader, VibecheData, or VibecheStorage is not loaded.');
      }

      console.log('\n--- Starting Vibeche Sample Reader Tests (Step 7) ---');

      tests.forEach(({ name, fn }) => {
        try {
          fn({ assert, assertEqual, reader, data, storage });
          passed++;
          console.log(`✓ PASS: ${name}`);
        } catch (err) {
          failed++;
          console.log(`✗ FAIL: ${name} -> ${err.message}`);
        }
      });

      console.log(`\nReader Test Results: ${passed} passed, ${failed} failed, ${tests.length} total.`);
      return { total: tests.length, passed, failed };
    }

    return { test, run };
  }

  const runner = createTestRunner();

  // Test 1: Book Resolution
  runner.test('Book Resolution: resolves book by ID, string, or book object', ({ assertEqual, reader }) => {
    const b1 = reader.resolveBook(1);
    assertEqual(b1.id, 1);
    assertEqual(b1.title, 'شاهنامه');

    const bString = reader.resolveBook('2');
    assertEqual(bString.id, 2);
    assertEqual(bString.title, 'بوف کور');

    const bDirect = reader.resolveBook({ id: 99, title: 'کتاب آزمایشی' });
    assertEqual(bDirect.id, 99);

    const bInvalid = reader.resolveBook(99999);
    assertEqual(bInvalid, null);
  });

  // Test 2: Reading Settings Defaults
  runner.test('Reading Settings: retrieves default font size and theme', ({ assert, assertEqual, reader, storage }) => {
    storage.clearAll();
    const settings = reader.getSettings();
    assertEqual(settings.fontSize, 'medium', 'Default font size should be medium');
    assertEqual(settings.theme, 'light', 'Default theme should be light');
  });

  // Test 3: Reading Settings Persistence
  runner.test('Reading Settings Persistence: saves and loads updated font size and theme', ({ assertEqual, reader }) => {
    reader.saveSettings({ fontSize: 'large', theme: 'dark' });
    const s1 = reader.getSettings();
    assertEqual(s1.fontSize, 'large', 'Font size should be large');
    assertEqual(s1.theme, 'dark', 'Theme should be dark');

    reader.saveSettings({ fontSize: 'small', theme: 'light' });
    const s2 = reader.getSettings();
    assertEqual(s2.fontSize, 'small', 'Font size should be small');
    assertEqual(s2.theme, 'light', 'Theme should be light');
  });

  // Test 4: Excerpt Availability & Multi-Paragraph Structure
  runner.test('Sample Excerpts: at least 3 books have authentic multi-paragraph reading text', ({ assert, assertEqual, data }) => {
    const books = data.getFeaturedBooks ? data.getFeaturedBooks() : [];
    const allBooks = [1, 2, 4, 8, 10, 11].map(id => data.getBookById(id)).filter(Boolean);

    let booksWithSampleCount = 0;
    allBooks.forEach(book => {
      if (Array.isArray(book.sampleExcerpt) && book.sampleExcerpt.length >= 2) {
        booksWithSampleCount++;
        assert(book.sampleExcerpt[0].length > 20, `${book.title} paragraph 1 should have rich text`);
        assert(book.sampleExcerpt[1].length > 20, `${book.title} paragraph 2 should have rich text`);
      }
    });

    assert(booksWithSampleCount >= 3, `Expected at least 3 books with multi-paragraph text, got ${booksWithSampleCount}`);
  });

  // Test 5: Font Size Options Validity
  runner.test('Font Size Options: supports small, medium, and large sizes safely', ({ assertEqual, reader }) => {
    ['small', 'medium', 'large'].forEach(size => {
      reader.saveSettings({ fontSize: size });
      assertEqual(reader.getSettings().fontSize, size);
    });

    // Invalid size should retain the previous valid setting
    reader.saveSettings({ fontSize: 'extra-gigantic' });
    assertEqual(reader.getSettings().fontSize, 'large', 'Invalid size safely retains previous valid setting');
  });

  // Test 6: Theme Options Validity
  runner.test('Theme Options: supports light, sepia, and dark themes safely', ({ assertEqual, reader }) => {
    reader.saveSettings({ theme: 'dark' });
    assertEqual(reader.getSettings().theme, 'dark');

    reader.saveSettings({ theme: 'sepia' });
    assertEqual(reader.getSettings().theme, 'sepia', 'Sepia / paper reading theme should be supported');

    reader.saveSettings({ theme: 'light' });
    assertEqual(reader.getSettings().theme, 'light');

    // Invalid theme should safely retain previous setting
    reader.saveSettings({ theme: 'neon-purple' });
    assertEqual(reader.getSettings().theme, 'light');
  });

  // Test 7: Handling Books Without Sample Excerpt
  runner.test('Empty Sample Handling: identifies books without sample text safely', ({ assertEqual, reader }) => {
    const bookWithSample = reader.resolveBook(1);
    const hasSampleTrue = Array.isArray(bookWithSample.sampleExcerpt) && bookWithSample.sampleExcerpt.length > 0;
    assertEqual(hasSampleTrue, true, 'Book 1 must have sample text');

    // Synthetic book without sample
    const bookNoSample = { id: 100, title: 'کتاب بدون متن نمونه', sampleExcerpt: [] };
    const hasSampleFalse = Array.isArray(bookNoSample.sampleExcerpt) && bookNoSample.sampleExcerpt.length > 0;
    assertEqual(hasSampleFalse, false, 'Book without sample must be detected as false');
  });

  // Test 8: Full Chapter vs Sample Excerpt for Owned Books
  runner.test('Full Chapter Resolution: acquired books resolve rich full chapter', ({ assert, assertEqual, reader, data, storage }) => {
    storage.login('خواننده', '09120000003');
    storage.addToLibrary(1); // شاهنامه

    const b1 = reader.resolveBook(1);
    assert(Array.isArray(b1.fullChapter), 'Book 1 should have fullChapter defined');
    assert(b1.fullChapter.length >= 5, `Expected at least 5 paragraphs in fullChapter, got ${b1.fullChapter.length}`);
  });

  root.VibecheReaderTests = { runner };

  // If in CLI environment (JXA), run immediately
  if (typeof window === 'undefined' && typeof document === 'undefined') {
    runner.run();
  }
})();
