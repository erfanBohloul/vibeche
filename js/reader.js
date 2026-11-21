/**
 * vibeche - Dedicated Reader Page & In-Browser Reading Experience (Step 7)
 * Sharif University Web Programming - HW1 (Taghche)
 * 
 * Features:
 * 1. Dedicated Fullscreen Reader Page (?page=reader&book=id) inspired by Taaghche Web Reader.
 * 2. Independent Reader Theme (Light, Sepia/Paper, Dark) that does NOT alter the main store's UI.
 * 3. 3-level Font Size switcher: کوچک (15px), متوسط (18px), بزرگ (22px).
 * 4. Content Differentiation:
 *    - Purchased / Acquired Books: Full Chapter Mode with reading progress and chapter completion badge.
 *    - Unpurchased Books: Sample Preview Mode with buy/claim CTA at the end of the excerpt.
 * 5. Clean Exit Navigation: Returns user to book details (?book=id) or library (?page=library).
 * 6. Accessibility & Keyboard Support: Escape key returns to previous view, ARIA labels, focus outlines.
 * 7. Settings Persistence: Reader font size and theme persist across sessions in localStorage.
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  const FONT_SIZES = {
    small: { id: 'small', label: 'کوچک', size: '15px', lineHeight: '2.0' },
    medium: { id: 'medium', label: 'متوسط', size: '18px', lineHeight: '2.2' },
    large: { id: 'large', label: 'بزرگ', size: '22px', lineHeight: '2.4' }
  };

  const THEMES = {
    light: { id: 'light', label: 'روشن' },
    sepia: { id: 'sepia', label: 'کاغذی' },
    dark: { id: 'dark', label: 'تیره' }
  };

  const ICONS = {
    arrowRight: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',
    sun: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
    moon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
    bookOpen: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>',
    check: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    shoppingBag: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>'
  };

  function toPersianDigits(num) {
    if (num === null || num === undefined) return '';
    return num.toLocaleString('fa-IR');
  }

  const VibecheReader = {
    /**
     * Resolves book object from ID, string, or book object
     */
    resolveBook: function (bookOrId) {
      if (!bookOrId) return null;
      if (typeof bookOrId === 'object' && bookOrId.id) return bookOrId;
      if (root.VibecheData && root.VibecheData.getBookById) {
        return root.VibecheData.getBookById(bookOrId);
      }
      return null;
    },

    /**
     * Retrieves currently persisted reader settings
     */
    getSettings: function () {
      if (root.VibecheStorage && root.VibecheStorage.getReaderSettings) {
        return root.VibecheStorage.getReaderSettings();
      }
      return { fontSize: 'medium', theme: 'light' };
    },

    /**
     * Persists updated reader settings
     */
    saveSettings: function (newSettings) {
      if (root.VibecheStorage && root.VibecheStorage.setReaderSettings) {
        return root.VibecheStorage.setReaderSettings(newSettings);
      }
      return newSettings;
    },

    /**
     * Opens the reader for a book (navigates to reader page)
     */
    open: function (bookOrId) {
      const book = this.resolveBook(bookOrId);
      if (!book) return;

      if (typeof window !== 'undefined' && root.VibecheApp && root.VibecheApp.navigate) {
        root.VibecheApp.navigate(`?page=reader&book=${book.id}`);
      } else if (typeof window !== 'undefined') {
        window.location.href = `?page=reader&book=${book.id}`;
      }
    },

    /**
     * Main Renderer: Renders Dedicated Reader View (?page=reader&book=id)
     * @param {HTMLElement} container
     * @param {URLSearchParams} params
     */
    renderReaderPage: function (container, params = new URLSearchParams()) {
      if (!container) return;
      container.innerHTML = '';

      const bookId = params.get('book');
      const book = this.resolveBook(bookId);

      // Handle 404 / Invalid Book ID
      if (!book) {
        this.renderNotFound(container);
        return;
      }

      const storage = root.VibecheStorage;
      const isOwned = storage ? storage.isInLibrary(book.id) : false;

      // Get saved reader settings (isolated to reader)
      const settings = this.getSettings();
      let currentTheme = ['light', 'sepia', 'dark'].includes(settings.theme) ? settings.theme : 'light';
      let currentFontSize = ['small', 'medium', 'large'].includes(settings.fontSize) ? settings.fontSize : 'medium';

      // Determine paragraphs:
      // If book is owned and has fullChapter, provide extended chapter. Otherwise fallback to sampleExcerpt.
      let paragraphs = [];
      let isFullChapter = false;

      if (isOwned && Array.isArray(book.fullChapter) && book.fullChapter.length > 0) {
        paragraphs = book.fullChapter;
        isFullChapter = true;
      } else if (Array.isArray(book.sampleExcerpt) && book.sampleExcerpt.length > 0) {
        paragraphs = book.sampleExcerpt;
        isFullChapter = false;
      }

      // Root Reader Container
      const pageWrapper = document.createElement('div');
      pageWrapper.className = `reader-page-view reader-theme-${currentTheme}`;
      pageWrapper.id = 'vibeche-reader-page';

      // 1. Top Navigation Bar
      const topBar = document.createElement('header');
      topBar.className = 'reader-top-navbar';

      topBar.innerHTML = `
        <div class="reader-nav-right">
          <button type="button" class="btn-reader-back" id="btn-reader-back" title="بازگشت" aria-label="بازگشت به صفحه قبل">
            ${ICONS.arrowRight}
            <span>بازگشت</span>
          </button>
          <div class="reader-book-info">
            <h1 class="reader-nav-title">${book.title}</h1>
            <span class="reader-nav-author">${book.author}</span>
          </div>
          <span class="reader-mode-badge ${isOwned ? 'badge-owned-mode' : 'badge-preview-mode'}">
            ${isOwned ? `${ICONS.check} نسخه خریداری‌شده` : 'پیش‌نمایش نمونه'}
          </span>
        </div>

        <div class="reader-nav-left">
          <!-- Font Size Switcher -->
          <div class="reader-control-group reader-font-group" role="group" aria-label="تنظیم اندازه قلم">
            <button type="button" class="btn-reader-opt ${currentFontSize === 'small' ? 'active' : ''}" data-size="small" title="قلم کوچک (۱۵ پیکسل)">
              <span>کوچک</span>
            </button>
            <button type="button" class="btn-reader-opt ${currentFontSize === 'medium' ? 'active' : ''}" data-size="medium" title="قلم متوسط (۱۸ پیکسل)">
              <span>متوسط</span>
            </button>
            <button type="button" class="btn-reader-opt ${currentFontSize === 'large' ? 'active' : ''}" data-size="large" title="قلم بزرگ (۲۲ پیکسل)">
              <span>بزرگ</span>
            </button>
          </div>

          <!-- Theme Switcher (Light / Sepia / Dark) -->
          <div class="reader-control-group reader-theme-group" role="group" aria-label="تنظیم تم مطالعه">
            <button type="button" class="btn-reader-theme-opt ${currentTheme === 'light' ? 'active' : ''}" data-theme="light" title="تم روشن (سفید)">
              <span>روز</span>
            </button>
            <button type="button" class="btn-reader-theme-opt ${currentTheme === 'sepia' ? 'active' : ''}" data-theme="sepia" title="تم کاغذی (سپیا)">
              <span>کاغذی</span>
            </button>
            <button type="button" class="btn-reader-theme-opt ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark" title="تم تیره (شب)">
              <span>شب</span>
            </button>
          </div>
        </div>
      `;

      pageWrapper.appendChild(topBar);

      // 2. Reading Canvas
      const canvas = document.createElement('main');
      canvas.className = `reader-reading-canvas reader-size-${currentFontSize}`;
      canvas.id = 'reader-canvas-content';

      const canvasInner = document.createElement('article');
      canvasInner.className = 'reader-canvas-inner';

      // Chapter Heading
      const headingBox = document.createElement('div');
      headingBox.className = 'reader-chapter-heading';
      headingBox.innerHTML = `
        <span class="reader-chapter-eyebrow">${isFullChapter ? 'فصل اول' : 'نمونه متنی کتاب'}</span>
        <h2 class="reader-chapter-title">${book.title}</h2>
        <p class="reader-chapter-subtitle">${book.author} • ${book.category}</p>
      `;
      canvasInner.appendChild(headingBox);

      // Body Paragraphs
      const textContainer = document.createElement('div');
      textContainer.className = 'reader-text-flow';

      if (paragraphs.length > 0) {
        paragraphs.forEach((p, idx) => {
          const para = document.createElement('p');
          para.className = 'reader-book-paragraph';
          para.id = `para-${idx + 1}`;
          para.innerHTML = String(p).replace(/\n/g, '<br>');
          textContainer.appendChild(para);
        });
      } else {
        const emptyNotice = document.createElement('div');
        emptyNotice.className = 'reader-empty-box';
        emptyNotice.innerHTML = `
          <p>متن نمونه‌ای برای این کتاب ثبت نشده است.</p>
        `;
        textContainer.appendChild(emptyNotice);
      }
      canvasInner.appendChild(textContainer);

      // End-of-Reading Section
      const endSection = document.createElement('div');
      endSection.className = 'reader-end-section';

      if (isOwned) {
        // Full Chapter Milestone for Owned Books
        endSection.innerHTML = `
          <div class="reader-milestone-box">
            <div class="milestone-icon">${ICONS.check}</div>
            <h3 class="milestone-title">پایان بخش آغازین کتاب «${book.title}»</h3>
            <p class="milestone-desc">
              این کتاب در کتابخانه شما موجود است. برای مدیریت کتاب‌ها یا مشاهده جزییات بیشتر، از گزینه‌های زیر استفاده کنید.
            </p>
            <div class="milestone-actions">
              <a href="?page=library" class="action-btn btn-auth">
                بازگشت به کتابخانه من
              </a>
              <a href="?book=${book.id}" class="action-btn btn-library-browse">
                مشاهده جزییات کتاب
              </a>
            </div>
          </div>
        `;
      } else {
        // Sample Preview Ending CTA
        const priceText = book.price === 0 ? 'رایگان' : `${toPersianDigits(book.price)} تومان`;
        endSection.innerHTML = `
          <div class="reader-preview-cta-box">
            <h3 class="cta-title">این پایان بخش نمونه بود</h3>
            <p class="cta-desc">
              برای مطالعه ادامه این اثر و افزودن آن به قفسه کتاب‌های خود، نسخه کامل کتاب را دریافت نمایید.
            </p>
            <div class="cta-actions">
              <a href="?book=${book.id}" class="action-btn btn-auth">
                ${ICONS.shoppingBag} دریافت کتاب (${priceText})
              </a>
              <a href="?book=${book.id}" class="action-btn btn-library-browse">
                مشاهده مشخصات و نظرات کتاب
              </a>
            </div>
          </div>
        `;
      }
      canvasInner.appendChild(endSection);

      canvas.appendChild(canvasInner);
      pageWrapper.appendChild(canvas);
      container.appendChild(pageWrapper);

      // --- Interactive Event Listeners ---

      // Back Button Handler
      const backBtn = topBar.querySelector('#btn-reader-back');
      if (backBtn) {
        backBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.exitReader(book.id);
        });
      }

      // Keyboard Escape Handler
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.exitReader(book.id);
        }
      };
      document.addEventListener('keydown', handleEscape);
      pageWrapper._escHandler = handleEscape;

      // Font Size Buttons
      const fontBtns = topBar.querySelectorAll('.btn-reader-opt');
      fontBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const size = btn.dataset.size;
          if (!FONT_SIZES[size]) return;

          fontBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          canvas.classList.remove('reader-size-small', 'reader-size-medium', 'reader-size-large');
          canvas.classList.add(`reader-size-${size}`);

          currentFontSize = size;
          this.saveSettings({ fontSize: size });
        });
      });

      // Theme Selector Buttons (Light, Sepia, Dark)
      const themeBtns = topBar.querySelectorAll('.btn-reader-theme-opt');
      themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const theme = btn.dataset.theme;
          if (!THEMES[theme]) return;

          themeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          // Change ONLY reader's class: never touches the store's global theme!
          pageWrapper.classList.remove('reader-theme-light', 'reader-theme-sepia', 'reader-theme-dark');
          pageWrapper.classList.add(`reader-theme-${theme}`);

          currentTheme = theme;
          this.saveSettings({ theme: theme });
        });
      });

      window.scrollTo({ top: 0, behavior: 'instant' });
    },

    /**
     * Exits reader mode cleanly and returns to previous view
     */
    exitReader: function (bookId) {
      const pageWrapper = document.getElementById('vibeche-reader-page');
      if (pageWrapper && pageWrapper._escHandler) {
        document.removeEventListener('keydown', pageWrapper._escHandler);
      }

      if (root.VibecheApp && root.VibecheApp.navigate) {
        root.VibecheApp.navigate(`?book=${bookId}`);
      } else if (typeof window !== 'undefined') {
        window.location.href = `?book=${bookId}`;
      }
    },

    /**
     * Renders 404 Not Found state for reader
     */
    renderNotFound: function (container) {
      container.innerHTML = `
        <div class="reader-not-found-card">
          <h2>کتاب مورد نظر یافت نشد</h2>
          <p>شناسه کتاب ارائه‌شده نامعتبر است یا از کتابخانه حذف شده است.</p>
          <a href="?page=catalog" class="action-btn btn-auth">بازگشت به کاتالوگ کتاب‌ها</a>
        </div>
      `;
    }
  };

  root.VibecheReader = VibecheReader;
})();
