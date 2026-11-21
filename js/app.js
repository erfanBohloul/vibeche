/**
 * vibeche - Main Application Logic & View Orchestration
 * Sharif University Web Programming - HW1 (Taghche)
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  const BANNERS_DATA = [
    {
      id: 1,
      image: 'assets/images/banners/banner-1.svg',
      title: 'جشنواره شاهکارهای ادبیات کهن و معاصر ایران',
      link: '?page=catalog'
    },
    {
      id: 2,
      image: 'assets/images/banners/banner-2.svg',
      title: 'کتاب‌های کاملاً رایگان وایبچه برای همه',
      link: '?page=catalog&free=true'
    },
    {
      id: 3,
      image: 'assets/images/banners/banner-3.svg',
      title: 'امکانات مطالعه پیشرفته و حالت شب',
      link: '?page=catalog'
    }
  ];

  const App = {
    currentSlide: 0,
    carouselTimer: null,

    init: function () {
      // Main store contract: permanently light mode, independent from reader page
      if (typeof document !== 'undefined') {
        document.documentElement.removeAttribute('data-theme');
      }
      this.initHeader();
      this.initNavigation();
      this.initFooter();
      this.route();

      // Listen to external favorite and storage change events
      window.addEventListener('vibeche:favoriteChange', () => {
        this.updateHeaderBadges();
      });

      window.addEventListener('vibeche:libraryChange', () => {
        this.updateHeaderBadges();
      });

      window.addEventListener('vibeche:authChange', () => {
        this.updateUserArea();
        this.updateHeaderBadges();
        this.route();
      });

      window.addEventListener('popstate', () => {
        this.route();
      });
    },

    openAuthModal: function (options) {
      if (root.VibecheAuth && root.VibecheAuth.openAuthModal) {
        root.VibecheAuth.openAuthModal(options);
      }
    },

    /**
     * Initializes Header events (search, user session pill, library badge)
     */
    initHeader: function () {
      const searchForm = document.getElementById('search-form');
      const searchInput = document.getElementById('search-input');
      if (searchForm && searchInput) {
        searchForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const q = searchInput.value.trim();
          this.navigate(`?page=catalog&q=${encodeURIComponent(q)}`);
        });
      }

      this.updateUserArea();
      this.updateHeaderBadges();
    },

    updateUserArea: function () {
      const area = document.getElementById('user-account-area');
      if (!area || !root.VibecheStorage) return;

      const user = root.VibecheStorage.getUser();
      if (user && user.isLoggedIn) {
        const currentTheme = root.VibecheStorage.getReaderSettings().theme;
        area.innerHTML = `
          <div class="user-profile-pill" id="user-profile-pill" style="cursor: pointer;" title="مشاهده حساب کاربری">
            <div class="user-avatar">${user.displayName.charAt(0)}</div>
            <span>${user.displayName}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>

          <!-- User Menu Dropdown -->
          <div class="user-profile-menu" id="user-profile-menu" style="display: none;">
            <div class="user-menu-header">
              <div class="user-menu-name">${user.displayName}</div>
              <div class="user-menu-phone">${user.phone}</div>
            </div>
            <a href="?page=library" class="user-menu-item">
              <span>کتابخانه من</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            </a>
            <button type="button" id="btn-logout" class="btn-logout" style="width: 100%; text-align: right; padding: 8px 10px; font-weight: bold;">
              خروج از حساب کاربری
            </button>
          </div>
        `;

        const pill = document.getElementById('user-profile-pill');
        const menu = document.getElementById('user-profile-menu');
        const logoutBtn = document.getElementById('btn-logout');

        if (pill && menu) {
          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
          });
        }

        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => {
            root.VibecheStorage.logout();
            this.updateUserArea();
            if (root.VibecheComponents) {
              root.VibecheComponents.showToast('با موفقیت از حساب کاربری خارج شدید.', 'info');
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('vibeche:authChange', { detail: { user: null } }));
            }
          });
        }
      } else {
        area.innerHTML = `
          <button type="button" id="btn-login-modal" class="action-btn btn-auth">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>ورود / ثبت‌نام</span>
          </button>
        `;
        const loginBtn = document.getElementById('btn-login-modal');
        if (loginBtn) {
          loginBtn.addEventListener('click', () => {
            if (this.openAuthModal) {
              this.openAuthModal();
            } else {
              alert('فرم ورود در بخش شبیه‌سازی حساب (گام ۶) باز خواهد شد.');
            }
          });
        }
      }
    },

    updateHeaderBadges: function () {
      if (!root.VibecheStorage) return;
      const badge = document.getElementById('library-count-badge');
      if (!badge) return;

      // Option 1: Deduplicated unique book count (prevents double-counting books in both shelves)
      const total = typeof root.VibecheStorage.getUniqueBooksCount === 'function'
        ? root.VibecheStorage.getUniqueBooksCount()
        : new Set([...root.VibecheStorage.getLibrary(), ...root.VibecheStorage.getFavorites()]).size;

      if (total > 0) {
        badge.style.display = 'inline-flex';
        badge.textContent = total.toLocaleString('fa-IR');
      } else {
        badge.style.display = 'none';
      }
    },

    initNavigation: function () {
      // Close dropdowns on outside click
      document.addEventListener('click', (e) => {
        const userMenu = document.getElementById('user-profile-menu');
        const userPill = document.getElementById('user-profile-pill');
        if (userMenu && userMenu.style.display !== 'none') {
          if (!userMenu.contains(e.target) && (!userPill || !userPill.contains(e.target))) {
            userMenu.style.display = 'none';
          }
        }

        const anchor = e.target.closest('a');
        if (!anchor) return;
        const href = anchor.getAttribute('href');
        if (href && href.startsWith('?')) {
          e.preventDefault();
          this.navigate(href);
        }
      });
    },

    initFooter: function () {
      const resetBtn = document.getElementById('btn-reset-storage');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (confirm('آیا مطمئن هستید که می‌خواهید تمام داده‌های ذخیره‌شده (حساب‌ها، کتابخانه و تنظیمات) را پاک کنید؟')) {
            if (root.VibecheStorage && root.VibecheStorage.clearAll) {
              root.VibecheStorage.clearAll();
            } else if (typeof localStorage !== 'undefined') {
              localStorage.clear();
            }
            if (root.VibecheComponents) {
              root.VibecheComponents.showToast('داده‌های محلی با موفقیت بازنشانی شدند.', 'info');
            }
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                window.location.href = window.location.pathname;
              }
            }, 500);
          }
        });
      }
    },

    navigate: function (queryString) {
      if (typeof window === 'undefined') return;
      window.history.pushState({}, '', queryString);
      this.route();
    },

    /**
     * Application Router
     */
    route: function () {
      const params = new URLSearchParams(window.location.search);
      const page = params.get('page') || 'home';
      const bookId = params.get('book');

      // Update active nav links
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        const navTarget = link.dataset.nav;
        if (page === 'home' && navTarget === 'home') link.classList.add('active');
        if (page === 'catalog' && !params.get('cat') && !params.get('free') && navTarget === 'catalog') link.classList.add('active');
        if (params.get('free') && navTarget === 'free') link.classList.add('active');
        if (params.get('cat') === 'iranian-novel' && navTarget === 'iranian-novel') link.classList.add('active');
        if (params.get('cat') === 'classic-poetry' && navTarget === 'classic-poetry') link.classList.add('active');
        if (page === 'library' && navTarget === 'library') link.classList.add('active');
      });

      const main = document.getElementById('app-main');
      if (!main) return;
      main.innerHTML = '';

      // Manage reader-mode body class (hides standard store header/footer during reader mode)
      if (typeof document !== 'undefined') {
        if (page === 'reader') {
          document.body.classList.add('in-reader-mode');
        } else {
          document.body.classList.remove('in-reader-mode');
        }
      }

      if (page === 'reader') {
        // Dedicated Reader View (Step 7)
        if (root.VibecheReader && root.VibecheReader.renderReaderPage) {
          root.VibecheReader.renderReaderPage(main, params);
        }
      } else if (bookId) {
        // Book Details View (Step 5)
        if (root.VibecheDetail) {
          root.VibecheDetail.renderBookDetail(main, bookId);
        } else {
          this.renderBookDetailPlaceholder(main, bookId);
        }
      } else if (page === 'catalog') {
        // Catalog View (Step 4)
        if (root.VibecheCatalog) {
          root.VibecheCatalog.renderCatalog(main, params);
        } else {
          this.renderCatalogPlaceholder(main, params);
        }
      } else if (page === 'library') {
        // Library View (Step 6)
        if (root.VibecheLibrary && root.VibecheLibrary.renderLibrary) {
          root.VibecheLibrary.renderLibrary(main, params);
        } else {
          this.renderLibraryPlaceholder(main);
        }
      } else {
        // Default: Homepage (Step 3)
        this.renderHomePage(main);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Renders Step 3 Homepage:
     * - Hero Banner Carousel (with working Next/Prev buttons)
     * - Categories Quick Bar
     * - Shelf 1: Featured Books (>= 4 books)
     * - Shelf 2: Newest Books (>= 4 books)
     * - Shelf 3: Free Books (>= 4 books)
     */
    renderHomePage: function (container) {
      // 1. Hero Carousel Banner
      container.appendChild(this.createCarousel());

      // 2. Categories Quick Filter Pills
      container.appendChild(this.createCategoriesBar());

      // 3. Shelf 1: Featured Books
      const featuredBooks = root.VibecheData.getFeaturedBooks();
      container.appendChild(root.VibecheComponents.createBookShelf({
        id: 'featured',
        title: 'پیشنهادهای ویژه وایبچه',
        subtitle: 'منتخب شاهکارهای ادبیات و پرفروش‌ترین‌ها',
        books: featuredBooks,
        viewAllUrl: '?page=catalog&featured=true'
      }));

      // 4. Shelf 2: Newest Books
      const newestBooks = root.VibecheData.getNewestBooks();
      container.appendChild(root.VibecheComponents.createBookShelf({
        id: 'newest',
        title: 'تازه‌ترین کتاب‌ها',
        subtitle: 'جدیدترین عناوین افزوده شده به ویترین',
        books: newestBooks,
        viewAllUrl: '?page=catalog&newest=true'
      }));

      // 5. Shelf 3: Free Books (100% Free collection)
      const freeBooks = root.VibecheData.getFreeBooks();
      container.appendChild(root.VibecheComponents.createBookShelf({
        id: 'free',
        title: 'کتاب‌های کاملاً رایگان',
        subtitle: 'بدون پرداخت هزینه، همین حالا مطالعه را آغاز کنید',
        books: freeBooks,
        viewAllUrl: '?page=catalog&free=true'
      }));
    },

    /**
     * Creates Hero Carousel Banner DOM node with active controls
     */
    createCarousel: function () {
      const section = document.createElement('section');
      section.className = 'hero-carousel-section';

      const container = document.createElement('div');
      container.className = 'carousel-container';

      const track = document.createElement('div');
      track.className = 'carousel-track';

      BANNERS_DATA.forEach(banner => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        slide.addEventListener('click', () => {
          this.navigate(banner.link);
        });

        const img = document.createElement('img');
        img.src = banner.image;
        img.alt = banner.title;
        slide.appendChild(img);
        track.appendChild(slide);
      });

      // Prev & Next Buttons (In RTL: Prev is on Right, Next is on Left)
      const btnPrev = document.createElement('button');
      btnPrev.type = 'button';
      btnPrev.className = 'carousel-btn btn-prev';
      btnPrev.setAttribute('aria-label', 'بنر قبلی');
      btnPrev.innerHTML = root.VibecheComponents.ICONS.chevronRight;

      const btnNext = document.createElement('button');
      btnNext.type = 'button';
      btnNext.className = 'carousel-btn btn-next';
      btnNext.setAttribute('aria-label', 'بنر بعدی');
      btnNext.innerHTML = root.VibecheComponents.ICONS.chevronLeft;

      // Indicator Dots
      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'carousel-dots';

      BANNERS_DATA.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = `carousel-dot ${idx === 0 ? 'active' : ''}`;
        dot.setAttribute('aria-label', `رفتن به اسلاید ${idx + 1}`);
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          this.goToSlide(idx, track, dotsContainer);
        });
        dotsContainer.appendChild(dot);
      });

      btnPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        this.prevSlide(track, dotsContainer);
      });

      btnNext.addEventListener('click', (e) => {
        e.stopPropagation();
        this.nextSlide(track, dotsContainer);
      });

      container.appendChild(track);
      container.appendChild(btnPrev);
      container.appendChild(btnNext);
      container.appendChild(dotsContainer);
      section.appendChild(container);

      // Setup auto-advance
      this.currentSlide = 0;
      if (this.carouselTimer) clearInterval(this.carouselTimer);
      this.carouselTimer = setInterval(() => {
        this.nextSlide(track, dotsContainer);
      }, 5000);

      container.addEventListener('mouseenter', () => clearInterval(this.carouselTimer));
      container.addEventListener('mouseleave', () => {
        this.carouselTimer = setInterval(() => {
          this.nextSlide(track, dotsContainer);
        }, 5000);
      });

      return section;
    },

    goToSlide: function (index, track, dotsContainer) {
      this.currentSlide = (index + BANNERS_DATA.length) % BANNERS_DATA.length;
      // In RTL, sliding forward moves track positive in X direction
      track.style.transform = `translateX(${this.currentSlide * 100}%)`;

      const dots = dotsContainer.querySelectorAll('.carousel-dot');
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === this.currentSlide);
      });
    },

    nextSlide: function (track, dotsContainer) {
      this.goToSlide(this.currentSlide + 1, track, dotsContainer);
    },

    prevSlide: function (track, dotsContainer) {
      this.goToSlide(this.currentSlide - 1, track, dotsContainer);
    },

    /**
     * Creates Quick Category filter pills
     */
    createCategoriesBar: function () {
      const section = document.createElement('section');
      section.className = 'categories-bar-section';

      const list = document.createElement('div');
      list.className = 'categories-list';

      root.VibecheData.CATEGORIES.forEach(cat => {
        const pill = document.createElement('a');
        pill.className = 'category-pill';
        pill.href = cat.id === 'all' ? '?page=catalog' : `?page=catalog&cat=${cat.id}`;
        pill.textContent = cat.name;
        list.appendChild(pill);
      });

      section.appendChild(list);
      return section;
    },

    // Placeholders for views to be built in subsequent steps
    renderBookDetailPlaceholder: function (container, bookId) {
      const book = root.VibecheData.getBookById(bookId);
      const wrap = document.createElement('div');
      wrap.style.padding = '40px 0';

      if (!book) {
        wrap.innerHTML = `
          <div style="text-align: center; padding: 60px 20px;">
            <h2 style="font-size: 24px; margin-bottom: 12px; color: var(--danger);">کتاب یافت نشد!</h2>
            <p style="color: var(--text-muted); margin-bottom: 24px;">شناسه کتاب وارد شده نامعتبر است یا این کتاب از فهرست حذف شده است.</p>
            <a href="?page=home" class="action-btn btn-auth" style="display: inline-flex;">بازگشت به صفحه اصلی</a>
          </div>
        `;
      } else {
        wrap.innerHTML = `
          <div style="background: var(--surface); padding: 30px; border-radius: var(--radius-xl); border: 1px solid var(--border); margin-bottom: 30px;">
            <h1 style="font-size: 24px; margin-bottom: 8px;">${book.title}</h1>
            <p style="color: var(--text-muted); margin-bottom: 16px;">نویسنده: ${book.author} | دسته: ${book.category}</p>
            <p style="line-height: 1.8;">${book.description}</p>
            <div style="margin-top: 20px;">
              <a href="?page=home" style="color: var(--primary); font-weight: bold;">← بازگشت به صفحه اصلی</a>
            </div>
          </div>
        `;
      }
      container.appendChild(wrap);
    },

    renderCatalogPlaceholder: function (container, params) {
      const q = params.get('q') || '';
      const cat = params.get('cat') || '';
      const isFree = params.get('free') === 'true';

      const wrap = document.createElement('div');
      wrap.style.padding = '40px 0';
      wrap.innerHTML = `
        <div style="background: var(--surface); padding: 30px; border-radius: var(--radius-xl); border: 1px solid var(--border);">
          <h1 style="font-size: 22px; margin-bottom: 10px;">فهرست کتاب‌ها</h1>
          <p style="color: var(--text-muted);">
            ${q ? `جستجو برای: «${q}»` : ''}
            ${cat ? ` | فیلتر دسته: ${cat}` : ''}
            ${isFree ? ' | فقط کتاب‌های رایگان' : ''}
          </p>
          <div style="margin-top: 20px;">
            <a href="?page=home" style="color: var(--primary); font-weight: bold;">← بازگشت به صفحه اصلی</a>
          </div>
        </div>
      `;
      container.appendChild(wrap);
    },

    renderLibraryPlaceholder: function (container) {
      const wrap = document.createElement('div');
      wrap.style.padding = '40px 0';
      wrap.innerHTML = `
        <div style="background: var(--surface); padding: 30px; border-radius: var(--radius-xl); border: 1px solid var(--border);">
          <h1 style="font-size: 22px; margin-bottom: 10px;">کتابخانه من</h1>
          <p style="color: var(--text-muted);">این بخش در گام ششم با دو تب «کتاب‌های دریافت‌شده» و «علاقه‌مندی‌ها» پیاده‌سازی خواهد شد.</p>
          <div style="margin-top: 20px;">
            <a href="?page=home" style="color: var(--primary); font-weight: bold;">← بازگشت به صفحه اصلی</a>
          </div>
        </div>
      `;
      container.appendChild(wrap);
    }
  };

  root.VibecheApp = App;

  // Bootstrapping when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => App.init());
    } else {
      App.init();
    }
  }
})();
