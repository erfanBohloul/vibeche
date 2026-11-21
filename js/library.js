/**
 * vibeche - User Personal Library & Favorites View (Step 6)
 * Sharif University Web Programming - HW1 (Taghche)
 * 
 * Features:
 * 1. Strict Auth Gate: Unauthenticated users see an informative locked state with a 1-click login action.
 * 2. Authenticated Profile Header: User avatar, display name, mobile number, and summary stats.
 * 3. Tab Navigation:
 *    - Tab 1: «کتاب‌های من» (Acquired / Purchased books)
 *    - Tab 2: «علاقه‌مندی‌ها» (Favorited books)
 *    - URL sync (?page=library&tab=books | ?page=library&tab=favorites)
 * 4. Acquired Books Shelf: Cover, title, author, reading action, and link to book details.
 * 5. Favorites Shelf: Cover, title, price, rating, and 1-click removal with instant DOM & storage update.
 * 6. Responsive Empty States: Clean SVG illustrations with direct CTAs to the catalog.
 * 7. Live Profile Update: Authenticated users can modify their display name via VibecheStorage.updateProfile.
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  const ICONS = {
    lock: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    bookOpen: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>',
    heart: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
    heartFilled: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
    star: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    check: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    trash: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
    userEdit: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
    search: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
  };

  function toPersianDigits(num) {
    if (num === null || num === undefined) return '';
    return num.toLocaleString('fa-IR');
  }

  const VibecheLibrary = {
    /**
     * Resolves acquired books for active user
     */
    getLibraryBooks: function () {
      const storage = root.VibecheStorage;
      const data = root.VibecheData;
      if (!storage || !data) return [];
      const ids = storage.getLibrary();
      return ids.map(id => data.getBookById(id)).filter(Boolean);
    },

    /**
     * Resolves favorited books for active user
     */
    getFavoriteBooks: function () {
      const storage = root.VibecheStorage;
      const data = root.VibecheData;
      if (!storage || !data) return [];
      const ids = storage.getFavorites();
      return ids.map(id => data.getBookById(id)).filter(Boolean);
    },

    /**
     * Main Entry: Renders User Library View
     * @param {HTMLElement} container
     * @param {URLSearchParams} params
     */
    renderLibrary: function (container, params = new URLSearchParams()) {
      if (!container) return;
      container.innerHTML = '';

      const wrap = document.createElement('div');
      wrap.className = 'library-page-container';

      // 1. Check Authentication Status
      const storage = root.VibecheStorage;
      const isLoggedIn = storage ? storage.isLoggedIn() : false;

      if (!isLoggedIn) {
        this.renderLockedState(wrap);
        container.appendChild(wrap);
        return;
      }

      // 2. Render Authenticated Library
      const user = storage.getUser();
      this.renderAuthenticatedView(wrap, user, params);
      container.appendChild(wrap);
    },

    /**
     * Renders Locked View when user is not logged in
     */
    renderLockedState: function (wrap) {
      const lockedBox = document.createElement('div');
      lockedBox.className = 'library-locked-card';

      lockedBox.innerHTML = `
        <div class="library-locked-icon-wrap" aria-hidden="true">
          ${ICONS.lock}
        </div>
        <h2 class="library-locked-title">کتابخانه شخصی شما قفل است</h2>
        <p class="library-locked-desc">
          برای مشاهده و مدیریت کتاب‌های دریافت‌شده، نشان‌شده‌ها و دسترسی به امکانات مطالعه، ابتدا وارد حساب کاربری خود شوید.
        </p>
        <div class="library-locked-actions">
          <button type="button" class="action-btn btn-auth btn-library-login" id="btn-library-gate-login">
            ورود یا ثبت‌نام در طاقچه
          </button>
          <a href="?page=catalog" class="action-btn btn-library-browse">
            مرور کاتالوگ کتاب‌ها
          </a>
        </div>
      `;

      const loginBtn = lockedBox.querySelector('#btn-library-gate-login');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          if (root.VibecheAuth && root.VibecheAuth.openAuthModal) {
            root.VibecheAuth.openAuthModal({
              notice: 'برای دسترسی به کتابخانه لطفاً وارد حساب کاربری خود شوید.',
              onSuccess: () => {
                const main = document.getElementById('app-main');
                if (main) {
                  this.renderLibrary(main, new URLSearchParams(window.location.search));
                }
              }
            });
          }
        });
      }

      wrap.appendChild(lockedBox);
    },

    /**
     * Renders Full Authenticated Library
     */
    renderAuthenticatedView: function (wrap, user, params) {
      const storage = root.VibecheStorage;

      // Resolve Acquired Books and Favorites
      const libBooks = this.getLibraryBooks();
      const favBooks = this.getFavoriteBooks();

      // Active tab from URL or default to 'books'
      const requestedTab = params.get('tab');
      let activeTab = requestedTab === 'favorites' ? 'favorites' : 'books';

      // 1. Header Banner / User Profile Card
      const headerCard = document.createElement('section');
      headerCard.className = 'library-profile-header';

      headerCard.innerHTML = `
        <div class="profile-header-info">
          <div class="profile-avatar-large" aria-hidden="true">
            ${user.displayName.charAt(0)}
          </div>
          <div class="profile-meta">
            <div class="profile-name-row">
              <h1 class="profile-display-name">کتابخانه شخصی ${user.displayName}</h1>
              <button type="button" class="btn-profile-edit" id="btn-edit-display-name" title="ویرایش نام نمایشی">
                ${ICONS.userEdit} <span>ویرایش نام</span>
              </button>
            </div>
            <div class="profile-sub-info">
              <span class="profile-phone-tag">شماره حساب: <b dir="ltr">${user.phone}</b></span>
            </div>
          </div>
        </div>
        <div class="profile-stats-bar">
          <div class="profile-stat-box" id="stat-box-books">
            <span class="stat-count">${toPersianDigits(libBooks.length)}</span>
            <span class="stat-label">کتاب در قفسه من</span>
          </div>
          <div class="profile-stat-box" id="stat-box-favs">
            <span class="stat-count">${toPersianDigits(favBooks.length)}</span>
            <span class="stat-label">کتاب در نشان‌شده‌ها</span>
          </div>
        </div>
      `;

      // Profile edit button click handler
      const editBtn = headerCard.querySelector('#btn-edit-display-name');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          this.openEditProfileDialog(user, () => {
            const main = document.getElementById('app-main');
            if (main) this.renderLibrary(main, new URLSearchParams(window.location.search));
          });
        });
      }

      wrap.appendChild(headerCard);

      // 2. Navigation Tabs Bar
      const tabsNav = document.createElement('div');
      tabsNav.className = 'library-tabs-nav';
      tabsNav.setAttribute('role', 'tablist');

      tabsNav.innerHTML = `
        <button 
          type="button" 
          role="tab" 
          id="tab-btn-books" 
          class="library-tab-btn ${activeTab === 'books' ? 'active' : ''}" 
          aria-selected="${activeTab === 'books'}"
          aria-controls="panel-library-books"
        >
          ${ICONS.bookOpen}
          <span>کتاب‌های من</span>
          <span class="tab-badge" id="badge-tab-books">${toPersianDigits(libBooks.length)}</span>
        </button>

        <button 
          type="button" 
          role="tab" 
          id="tab-btn-favorites" 
          class="library-tab-btn ${activeTab === 'favorites' ? 'active' : ''}" 
          aria-selected="${activeTab === 'favorites'}"
          aria-controls="panel-library-favorites"
        >
          ${ICONS.heart}
          <span>علاقه‌مندی‌ها</span>
          <span class="tab-badge" id="badge-tab-favorites">${toPersianDigits(favBooks.length)}</span>
        </button>
      `;

      wrap.appendChild(tabsNav);

      // 3. Tab Panels Container
      const panelsWrap = document.createElement('div');
      panelsWrap.className = 'library-panels-container';

      // Panel 1: Acquired Books
      const panelBooks = document.createElement('div');
      panelBooks.id = 'panel-library-books';
      panelBooks.className = `library-tab-panel ${activeTab === 'books' ? 'active' : ''}`;
      panelBooks.setAttribute('role', 'tabpanel');
      panelBooks.setAttribute('aria-labelledby', 'tab-btn-books');
      this.renderBooksPanel(panelBooks, libBooks);
      panelsWrap.appendChild(panelBooks);

      // Panel 2: Favorites
      const panelFavs = document.createElement('div');
      panelFavs.id = 'panel-library-favorites';
      panelFavs.className = `library-tab-panel ${activeTab === 'favorites' ? 'active' : ''}`;
      panelFavs.setAttribute('role', 'tabpanel');
      panelFavs.setAttribute('aria-labelledby', 'tab-btn-favorites');
      this.renderFavoritesPanel(panelFavs, favBooks, () => {
        // Callback when a favorite is removed: update counts and badges
        const updatedFavIds = storage.getFavorites();
        const updatedFavBooks = updatedFavIds.map(id => data.getBookById(id)).filter(Boolean);
        const badgeFav = tabsNav.querySelector('#badge-tab-favorites');
        const statFav = headerCard.querySelector('#stat-box-favs .stat-count');
        if (badgeFav) badgeFav.textContent = toPersianDigits(updatedFavBooks.length);
        if (statFav) statFav.textContent = toPersianDigits(updatedFavBooks.length);

        if (updatedFavBooks.length === 0) {
          this.renderFavoritesPanel(panelFavs, updatedFavBooks, null);
        }
      });
      panelsWrap.appendChild(panelFavs);

      wrap.appendChild(panelsWrap);

      // Tab Switching Handlers
      const btnTabBooks = tabsNav.querySelector('#tab-btn-books');
      const btnTabFavs = tabsNav.querySelector('#tab-btn-favorites');

      function switchTab(newTab) {
        activeTab = newTab;
        if (typeof window !== 'undefined' && window.history) {
          window.history.replaceState({}, '', `?page=library&tab=${newTab}`);
        }

        if (newTab === 'books') {
          btnTabBooks.classList.add('active');
          btnTabBooks.setAttribute('aria-selected', 'true');
          btnTabFavs.classList.remove('active');
          btnTabFavs.setAttribute('aria-selected', 'false');

          panelBooks.classList.add('active');
          panelFavs.classList.remove('active');
        } else {
          btnTabFavs.classList.add('active');
          btnTabFavs.setAttribute('aria-selected', 'true');
          btnTabBooks.classList.remove('active');
          btnTabBooks.setAttribute('aria-selected', 'false');

          panelFavs.classList.add('active');
          panelBooks.classList.remove('active');
        }
      }

      btnTabBooks.addEventListener('click', () => switchTab('books'));
      btnTabFavs.addEventListener('click', () => switchTab('favorites'));
    },

    /**
     * Renders Acquired Books Panel
     */
    renderBooksPanel: function (container, books) {
      container.innerHTML = '';

      if (!books || books.length === 0) {
        container.innerHTML = `
          <div class="library-empty-box">
            <div class="empty-icon-wrap" aria-hidden="true">${ICONS.bookOpen}</div>
            <h3 class="empty-box-title">هنوز کتابی در قفسه کتاب‌های شما قرار نگرفته است</h3>
            <p class="empty-box-desc">
              شما می‌توانید از بین صدها کتاب رایگان و پرفروش طاقچه، کتاب‌های دلخواهتان را دریافت کرده و در این بخش به آنها دسترسی داشته باشید.
            </p>
            <div class="empty-box-actions">
              <a href="?page=catalog&free=true" class="action-btn btn-auth">
                مشاهده کتاب‌های رایگان طاقچه
              </a>
              <a href="?page=catalog" class="action-btn btn-library-browse">
                مرور کل کاتالوگ
              </a>
            </div>
          </div>
        `;
        return;
      }

      const grid = document.createElement('div');
      grid.className = 'library-items-grid';

      books.forEach(book => {
        const item = document.createElement('article');
        item.className = 'library-item-card';

        const hasSample = Array.isArray(book.sampleExcerpt) && book.sampleExcerpt.length > 0;

        item.innerHTML = `
          <div class="lib-card-cover-wrap">
            <a href="?book=${book.id}" class="lib-card-cover-link">
              <img src="${book.cover}" alt="جلد کتاب ${book.title}" loading="lazy">
            </a>
            <span class="lib-status-badge badge-owned">
              ${ICONS.check} موجود در کتابخانه
            </span>
          </div>
          <div class="lib-card-content">
            <span class="lib-card-category">${book.category}</span>
            <h3 class="lib-card-title">
              <a href="?book=${book.id}">${book.title}</a>
            </h3>
            <p class="lib-card-author">${book.author}</p>
            
            <div class="lib-card-actions">
              <a href="?book=${book.id}" class="action-btn btn-auth btn-lib-read" data-book-id="${book.id}">
                ${ICONS.bookOpen} <span>${hasSample ? 'مطالعه کتاب / نمونه' : 'مشاهده صفحه کتاب'}</span>
              </a>
            </div>
          </div>
        `;

        const readBtn = item.querySelector('.btn-lib-read');
        if (readBtn && hasSample) {
          readBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (root.VibecheReader && root.VibecheReader.open) {
              root.VibecheReader.open(book, readBtn);
            }
          });
        }

        grid.appendChild(item);
      });

      container.appendChild(grid);
    },

    /**
     * Renders Favorites Panel
     */
    renderFavoritesPanel: function (container, books, onRemoveCallback) {
      container.innerHTML = '';

      if (!books || books.length === 0) {
        container.innerHTML = `
          <div class="library-empty-box">
            <div class="empty-icon-wrap icon-heart-empty" aria-hidden="true">${ICONS.heart}</div>
            <h3 class="empty-box-title">فهرست علاقه‌مندی‌های شما خالی است</h3>
            <p class="empty-box-desc">
              در حال گشت‌وگذار در فروشگاه، با زدن علامت قلب روی هر کتاب، آن را به این بخش اضافه کنید تا هر زمان که خواستید سریع پیدایش کنید.
            </p>
            <div class="empty-box-actions">
              <a href="?page=catalog&sort=rating_desc" class="action-btn btn-auth">
                مرور محبوب‌ترین کتاب‌ها
              </a>
            </div>
          </div>
        `;
        return;
      }

      const grid = document.createElement('div');
      grid.className = 'library-items-grid';

      books.forEach(book => {
        const item = document.createElement('article');
        item.className = 'library-item-card favorite-item-card';
        item.id = `fav-card-${book.id}`;

        const isFree = book.price === 0;
        const priceText = isFree ? 'رایگان' : `${toPersianDigits(book.price)} تومان`;

        item.innerHTML = `
          <div class="lib-card-cover-wrap">
            <a href="?book=${book.id}" class="lib-card-cover-link">
              <img src="${book.cover}" alt="جلد کتاب ${book.title}" loading="lazy">
            </a>
            ${isFree ? '<span class="card-badge badge-free">رایگان</span>' : ''}
          </div>
          <div class="lib-card-content">
            <span class="lib-card-category">${book.category}</span>
            <h3 class="lib-card-title">
              <a href="?book=${book.id}">${book.title}</a>
            </h3>
            <p class="lib-card-author">${book.author}</p>
            
            <div class="lib-fav-meta-row">
              <div class="card-rating">
                ${ICONS.star} <span>${toPersianDigits(book.rating)}</span>
              </div>
              <div class="lib-price-tag ${isFree ? 'price-free' : ''}">
                ${priceText}
              </div>
            </div>

            <div class="lib-card-actions">
              <a href="?book=${book.id}" class="action-btn btn-auth btn-lib-view">
                مشاهده و دریافت
              </a>
              <button type="button" class="action-btn btn-lib-remove-fav" data-book-id="${book.id}" title="حذف از نشان‌شده‌ها">
                ${ICONS.trash} <span>حذف</span>
              </button>
            </div>
          </div>
        `;

        // Removal Handler
        const removeBtn = item.querySelector('.btn-lib-remove-fav');
        if (removeBtn) {
          removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const storage = root.VibecheStorage;
            if (!storage) return;

            storage.removeFavorite(book.id);

            // Toast feedback
            if (root.VibecheComponents) {
              root.VibecheComponents.showToast(`«${book.title}» از علاقه‌مندی‌ها حذف شد.`, 'info');
            }

            // Remove card with animation
            item.style.opacity = '0';
            item.style.transform = 'scale(0.95)';
            item.style.transition = 'all 0.25s ease';

            setTimeout(() => {
              item.remove();
              if (typeof onRemoveCallback === 'function') {
                onRemoveCallback();
              }
            }, 250);

            // Dispatch global event
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('vibeche:favoriteChange', {
                detail: { bookId: book.id, isFavorite: false }
              }));
            }
          });
        }

        grid.appendChild(item);
      });

      container.appendChild(grid);
    },

    /**
     * Dialog to edit user's display name
     */
    openEditProfileDialog: function (user, onSaved) {
      if (typeof document === 'undefined') return;

      const existing = document.getElementById('edit-profile-modal-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'edit-profile-modal-overlay';
      overlay.className = 'modal-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'modal-dialog';
      dialog.style.maxWidth = '420px';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      dialog.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">ویرایش نام نمایشی</h3>
          <button type="button" class="btn-modal-close" id="btn-close-edit-modal" aria-label="بستن">✕</button>
        </div>
        <div class="modal-body">
          <form id="edit-profile-form">
            <div class="form-group">
              <label for="input-edit-display-name" class="form-label">نام و نام خانوادگی جدید:</label>
              <input 
                type="text" 
                id="input-edit-display-name" 
                class="form-control" 
                value="${user.displayName}" 
                required
              >
              <span class="inline-error-msg" id="edit-name-error" style="display: none;"></span>
            </div>
            <div style="margin-top: 18px; display: flex; gap: 10px; justify-content: flex-end;">
              <button type="button" class="action-btn btn-library-browse" id="btn-cancel-edit">انصراف</button>
              <button type="submit" class="action-btn btn-auth" id="btn-submit-edit">ذخیره تغییرات</button>
            </div>
          </form>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const nameInput = dialog.querySelector('#input-edit-display-name');
      const nameError = dialog.querySelector('#edit-name-error');
      const form = dialog.querySelector('#edit-profile-form');
      const closeBtn = dialog.querySelector('#btn-close-edit-modal');
      const cancelBtn = dialog.querySelector('#btn-cancel-edit');

      setTimeout(() => nameInput.focus(), 50);

      function close() {
        overlay.remove();
        document.removeEventListener('keydown', handleKey);
      }
      function handleKey(e) {
        if (e.key === 'Escape') close();
      }
      document.addEventListener('keydown', handleKey);

      closeBtn.addEventListener('click', close);
      cancelBtn.addEventListener('click', close);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });

      nameInput.addEventListener('input', () => {
        nameInput.classList.remove('has-error');
        nameError.style.display = 'none';
        nameError.textContent = '';
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newName = nameInput.value;
        const res = root.VibecheStorage.updateProfile({ displayName: newName });
        if (!res.success) {
          nameInput.classList.add('has-error');
          nameError.textContent = (res.errors && res.errors.name) || res.error || 'خطایی رخ داد.';
          nameError.style.display = 'block';
        } else {
          close();
          if (root.VibecheComponents) {
            root.VibecheComponents.showToast('نام نمایشی شما با موفقیت بروزرسانی شد.', 'success');
          }
          if (root.VibecheApp) {
            root.VibecheApp.updateUserArea();
          }
          if (typeof onSaved === 'function') onSaved();
        }
      });
    }
  };

  root.VibecheLibrary = VibecheLibrary;
})();
