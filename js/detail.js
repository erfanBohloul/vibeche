/**
 * vibeche - Book Detail View & Direct Linking Module (Step 5)
 * Sharif University Web Programming - HW1 (Taghche)
 * 
 * Requirements:
 * 1. Find and display book by ID: cover, title, author, category, description, price, rating
 * 2. Working Favorite toggle button
 * 3. Working Simulated Claim (Free) or Purchase (Paid) button
 * 4. Working Sample Reader button (disabled if no sample available)
 * 5. Display at least 3 related books from the same category
 * 6. Direct URL ID linking and reloadability (?book=id)
 * 7. Friendly "کتاب یافت نشد" error for invalid IDs with return link
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  const ICONS = {
    heart: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
    heartFilled: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
    star: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    bookOpen: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>',
    check: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    arrowRight: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>'
  };

  function toPersianDigits(num) {
    if (num === null || num === undefined) return '';
    return num.toLocaleString('fa-IR');
  }

  /**
   * Renders the complete Book Details page
   */
  function renderBookDetail(container, bookId) {
    container.innerHTML = '';

    const book = root.VibecheData ? root.VibecheData.getBookById(bookId) : null;

    // Handle invalid ID
    if (!book) {
      container.appendChild(createNotFoundState(bookId));
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'book-detail-page';

    // 1. Breadcrumbs
    const breadcrumbs = document.createElement('nav');
    breadcrumbs.className = 'detail-breadcrumbs';
    breadcrumbs.setAttribute('aria-label', 'مسیر صفحه');
    breadcrumbs.innerHTML = `
      <a href="?page=home">صفحه اصلی</a>
      <span class="breadcrumb-separator">/</span>
      <a href="?page=catalog">فهرست کتاب‌ها</a>
      <span class="breadcrumb-separator">/</span>
      <a href="?page=catalog&cat=${book.categoryId}">${book.category}</a>
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-current">${book.title}</span>
    `;
    wrapper.appendChild(breadcrumbs);

    // 2. Main Hero Presentation Card
    const heroCard = document.createElement('div');
    heroCard.className = 'detail-hero-card';

    // Right Column: Book Cover Presentation
    const coverCol = document.createElement('div');
    coverCol.className = 'detail-cover-col';

    const coverWrap = document.createElement('div');
    coverWrap.className = 'detail-cover-wrap';

    const coverImg = document.createElement('img');
    coverImg.src = book.cover;
    coverImg.alt = `جلد کتاب ${book.title}`;
    coverImg.className = 'detail-cover-img';
    coverWrap.appendChild(coverImg);

    if (book.price === 0) {
      const freeBadge = document.createElement('span');
      freeBadge.className = 'detail-cover-badge badge-free';
      freeBadge.textContent = 'کتاب رایگان';
      coverWrap.appendChild(freeBadge);
    }

    coverCol.appendChild(coverWrap);
    heroCard.appendChild(coverCol);

    // Left Column: Metadata, Price, and Action Buttons
    const infoCol = document.createElement('div');
    infoCol.className = 'detail-info-col';

    // Title and Subtitle
    const titleEl = document.createElement('h1');
    titleEl.className = 'detail-title';
    titleEl.textContent = book.title;
    infoCol.appendChild(titleEl);

    if (book.titleEn) {
      const enTitle = document.createElement('div');
      enTitle.className = 'detail-subtitle-en';
      enTitle.textContent = book.titleEn;
      infoCol.appendChild(enTitle);
    }

    // Author & Category Pill
    const metaBar = document.createElement('div');
    metaBar.className = 'detail-meta-bar';

    const authorEl = document.createElement('span');
    authorEl.className = 'detail-author';
    authorEl.innerHTML = `نویسنده: <strong>${book.author}</strong>`;
    metaBar.appendChild(authorEl);

    const categoryLink = document.createElement('a');
    categoryLink.href = `?page=catalog&cat=${book.categoryId}`;
    categoryLink.className = 'detail-category-pill';
    categoryLink.textContent = book.category;
    metaBar.appendChild(categoryLink);

    infoCol.appendChild(metaBar);

    // Rating & Review summary
    const ratingRow = document.createElement('div');
    ratingRow.className = 'detail-rating-row';
    ratingRow.innerHTML = `
      <div class="rating-stars">${ICONS.star} <strong>${toPersianDigits(book.rating)}</strong> از ۵</div>
      <span class="rating-count">(${toPersianDigits(book.ratingCount || 1200)} نظر کاربران)</span>
    `;
    infoCol.appendChild(ratingRow);

    // Book Specs (Publisher, Pages, Year)
    const specsGrid = document.createElement('div');
    specsGrid.className = 'detail-specs-grid';
    specsGrid.innerHTML = `
      <div class="spec-item">
        <span class="spec-label">ناشر:</span>
        <span class="spec-val">${book.publisher || 'نشر معتبر'}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">تعداد صفحات:</span>
        <span class="spec-val">${toPersianDigits(book.pages || 250)} صفحه</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">سال انتشار:</span>
        <span class="spec-val">${book.year || '۱۴۰۰'}</span>
      </div>
    `;
    infoCol.appendChild(specsGrid);

    // Price Box
    const priceBox = document.createElement('div');
    priceBox.className = 'detail-price-box';
    if (book.price === 0) {
      priceBox.innerHTML = `
        <span class="price-title">قیمت نسخه دیجیتال:</span>
        <span class="price-value-free">کاملاً رایگان</span>
      `;
    } else {
      priceBox.innerHTML = `
        <span class="price-title">قیمت نسخه دیجیتال:</span>
        <span class="price-value-toman">${toPersianDigits(book.price)} تومان</span>
      `;
    }
    infoCol.appendChild(priceBox);

    // Action Buttons Toolbar
    const actionsToolbar = document.createElement('div');
    actionsToolbar.className = 'detail-actions-toolbar';

    // 1. Primary Action: Claim / Buy / Read
    const btnPurchase = document.createElement('button');
    btnPurchase.type = 'button';
    btnPurchase.id = 'btn-book-purchase';
    btnPurchase.className = 'action-btn btn-detail-primary';

    function updatePurchaseButton() {
      const isOwned = root.VibecheStorage ? root.VibecheStorage.isInLibrary(book.id) : false;
      if (isOwned) {
        btnPurchase.className = 'action-btn btn-detail-owned';
        btnPurchase.innerHTML = `${ICONS.check} <span>موجود در کتابخانه شما (مطالعه)</span>`;
      } else if (book.price === 0) {
        btnPurchase.className = 'action-btn btn-detail-free';
        btnPurchase.innerHTML = `${ICONS.bookOpen} <span>دریافت رایگان کتاب</span>`;
      } else {
        btnPurchase.className = 'action-btn btn-detail-buy';
        btnPurchase.innerHTML = `<span>خرید کتاب (${toPersianDigits(book.price)} تومان)</span>`;
      }
    }
    updatePurchaseButton();

    btnPurchase.addEventListener('click', () => {
      handlePurchaseClick(book, updatePurchaseButton);
    });
    actionsToolbar.appendChild(btnPurchase);

    // 2. Sample Reader Button
    const btnSample = document.createElement('button');
    btnSample.type = 'button';
    btnSample.id = 'btn-book-sample';
    btnSample.className = 'action-btn btn-detail-secondary';

    const hasSample = Array.isArray(book.sampleExcerpt) && book.sampleExcerpt.length > 0;
    if (hasSample) {
      btnSample.innerHTML = `${ICONS.bookOpen} <span>خواندن نمونه</span>`;
      btnSample.addEventListener('click', () => {
        openSampleReader(book);
      });
    } else {
      btnSample.disabled = true;
      btnSample.className += ' btn-disabled';
      btnSample.innerHTML = `<span>نمونه متنی موجود نیست</span>`;
      btnSample.setAttribute('title', 'نمونه متنی برای این کتاب ثبت نشده است.');
    }
    actionsToolbar.appendChild(btnSample);

    // 3. Favorite Toggle Button
    const btnFavorite = document.createElement('button');
    btnFavorite.type = 'button';
    btnFavorite.id = 'btn-book-favorite';
    btnFavorite.className = 'action-btn btn-detail-favorite';

    function updateFavoriteButton() {
      const isFav = root.VibecheStorage ? root.VibecheStorage.isFavorite(book.id) : false;
      if (isFav) {
        btnFavorite.classList.add('is-favorite');
        btnFavorite.innerHTML = `${ICONS.heartFilled} <span>در علاقه‌مندی‌ها</span>`;
      } else {
        btnFavorite.classList.remove('is-favorite');
        btnFavorite.innerHTML = `${ICONS.heart} <span>افزودن به علاقه‌مندی‌ها</span>`;
      }
    }
    updateFavoriteButton();

    btnFavorite.addEventListener('click', () => {
      if (!root.VibecheStorage) return;

      // Strict Auth Gate: Guest cannot favorite books
      if (!root.VibecheStorage.isLoggedIn()) {
        if (root.VibecheComponents) {
          root.VibecheComponents.showToast('برای افزودن به علاقه‌مندی‌ها، لطفاً ابتدا وارد حساب کاربری خود شوید.', 'danger');
        }
        if (root.VibecheApp && root.VibecheApp.openAuthModal) {
          root.VibecheApp.openAuthModal();
        }
        return;
      }

      const res = root.VibecheStorage.toggleFavorite(book.id);
      updateFavoriteButton();
      if (root.VibecheComponents) {
        root.VibecheComponents.showToast(
          res.isFavorite ? `«${book.title}» به علاقه‌مندی‌ها افزوده شد.` : `«${book.title}» از علاقه‌مندی‌ها حذف شد.`,
          res.isFavorite ? 'success' : 'info'
        );
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vibeche:favoriteChange', { detail: { bookId: book.id, isFavorite: res.isFavorite } }));
      }
    });
    actionsToolbar.appendChild(btnFavorite);

    infoCol.appendChild(actionsToolbar);

    // Description Section
    const descSection = document.createElement('div');
    descSection.className = 'detail-description-section';

    const descHeading = document.createElement('h2');
    descHeading.className = 'section-heading';
    descHeading.textContent = 'معرفی و خلاصه کتاب';
    descSection.appendChild(descHeading);

    const descBody = document.createElement('div');
    descBody.className = 'detail-description-text';
    const p = document.createElement('p');
    p.textContent = book.description;
    descBody.appendChild(p);
    descSection.appendChild(descBody);

    infoCol.appendChild(descSection);

    heroCard.appendChild(infoCol);
    wrapper.appendChild(heroCard);

    // 3. Related Books Shelf (At least 3 books from same category)
    const relatedBooks = root.VibecheData.getRelatedBooks(book.id, 4);
    if (relatedBooks.length > 0) {
      const relatedShelf = root.VibecheComponents.createBookShelf({
        id: 'related',
        title: `کتاب‌های مرتبط با «${book.category}»`,
        subtitle: 'علاقه‌مندان به این کتاب، آثار زیر را نیز مطالعه کرده‌اند',
        books: relatedBooks,
        viewAllUrl: `?page=catalog&cat=${book.categoryId}`
      });
      wrapper.appendChild(relatedShelf);
    }

    container.appendChild(wrapper);
  }

  /**
   * Handles Claim (Free) or Purchase (Paid) action
   */
  function handlePurchaseClick(book, onStateChange) {
    if (!root.VibecheStorage) return;

    // Check if already in library
    if (root.VibecheStorage.isInLibrary(book.id)) {
      openSampleReader(book);
      return;
    }

    // Enforce login requirement from spec:
    // "برای دریافت کتاب، کاربر باید وارد شده باشد"
    if (!root.VibecheStorage.isLoggedIn()) {
      if (root.VibecheComponents) {
        root.VibecheComponents.showToast('برای دریافت کتاب، لطفاً ابتدا وارد حساب کاربری خود شوید.', 'danger');
      }
      if (root.VibecheApp && root.VibecheApp.openAuthModal) {
        root.VibecheApp.openAuthModal();
      } else {
        alert('برای دریافت کتاب، لطفاً از دکمه «ورود / ثبت‌نام» در بالای صفحه وارد شوید.');
      }
      return;
    }

    // Free Book: Direct one-click acquisition
    if (book.price === 0) {
      root.VibecheStorage.addToLibrary(book.id);
      onStateChange();
      if (root.VibecheComponents) {
        root.VibecheComponents.showToast(`کتاب «${book.title}» با موفقیت به کتابخانه شما افزوده شد!`, 'success');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vibeche:libraryChange', { detail: { bookId: book.id } }));
      }
      return;
    }

    // Paid Book: Simulated purchase confirmation dialog
    showPurchaseModal(book, () => {
      root.VibecheStorage.addToLibrary(book.id);
      onStateChange();
      if (root.VibecheComponents) {
        root.VibecheComponents.showToast(`خرید کتاب «${book.title}» با موفقیت انجام شد و به کتابخانه شما افزوده شد!`, 'success');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vibeche:libraryChange', { detail: { bookId: book.id } }));
      }
    });
  }

  /**
   * Opens Simulated Purchase Modal
   */
  function showPurchaseModal(book, onConfirm) {
    const existing = document.getElementById('purchase-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'purchase-modal-overlay';
    overlay.className = 'modal-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'purchase-dialog-title');

    dialog.innerHTML = `
      <div class="modal-header">
        <h3 id="purchase-dialog-title" class="modal-title">تایید خرید کتاب</h3>
        <button type="button" class="btn-modal-close" id="btn-close-purchase-modal" aria-label="بستن">✕</button>
      </div>
      <div class="modal-body">
        <div class="purchase-summary-box">
          <img src="${book.cover}" alt="${book.title}" class="purchase-book-thumb">
          <div class="purchase-book-meta">
            <h4 class="purchase-book-title">${book.title}</h4>
            <div class="purchase-book-author">${book.author}</div>
            <div class="purchase-price-tag">${toPersianDigits(book.price)} تومان</div>
          </div>
        </div>
        <div class="purchase-notice">
          <p>★ این یک خرید <strong>شبیه‌سازی‌شده</strong> است و هیچ‌گونه اطلاعات بانکی یا کسر وجه واقعی صورت نمی‌گیرد.</p>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="action-btn btn-auth" id="btn-confirm-purchase">
          ${ICONS.check} تایید و دریافت کتاب
        </button>
        <button type="button" class="action-btn btn-library" id="btn-cancel-purchase">
          انصراف
        </button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    function closeModal() {
      overlay.remove();
      document.removeEventListener('keydown', handleKey);
    }

    function handleKey(e) {
      if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', handleKey);

    dialog.querySelector('#btn-close-purchase-modal').addEventListener('click', closeModal);
    dialog.querySelector('#btn-cancel-purchase').addEventListener('click', closeModal);
    dialog.querySelector('#btn-confirm-purchase').addEventListener('click', () => {
      closeModal();
      onConfirm();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  /**
   * Sample reader trigger (links to reader module or opens modal)
   */
  function openSampleReader(book) {
    if (root.VibecheReader && root.VibecheReader.open) {
      root.VibecheReader.open(book);
    } else {
      // In-page fallback sample modal
      showSampleFallbackModal(book);
    }
  }

  function showSampleFallbackModal(book) {
    const existing = document.getElementById('sample-reader-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'sample-reader-modal';
    overlay.className = 'modal-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog modal-reader-dialog';
    dialog.setAttribute('role', 'dialog');

    const paragraphs = Array.isArray(book.sampleExcerpt)
      ? book.sampleExcerpt.map(p => `<p class="sample-paragraph">${p.replace(/\n/g, '<br>')}</p>`).join('')
      : '<p>نمونه‌ای موجود نیست.</p>';

    dialog.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">نمونه کتاب: ${book.title}</h3>
        <button type="button" class="btn-modal-close" id="btn-close-sample-modal" aria-label="بستن">✕</button>
      </div>
      <div class="modal-body reader-body-text">
        ${paragraphs}
      </div>
      <div class="modal-footer">
        <button type="button" class="action-btn btn-auth" id="btn-finish-sample">بازگشت به جزییات کتاب</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
      document.removeEventListener('keydown', handleKey);
    }
    function handleKey(e) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', handleKey);

    dialog.querySelector('#btn-close-sample-modal').addEventListener('click', close);
    dialog.querySelector('#btn-finish-sample').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  /**
   * Friendly 404 Not Found state
   */
  function createNotFoundState(invalidId) {
    const wrap = document.createElement('div');
    wrap.className = 'detail-not-found-state';

    const icon = document.createElement('div');
    icon.className = 'not-found-icon';
    icon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    `;

    const title = document.createElement('h1');
    title.className = 'not-found-title';
    title.textContent = 'کتاب یافت نشد!';

    const desc = document.createElement('p');
    desc.className = 'not-found-desc';
    desc.textContent = `متاسفانه کتابی با شناسه «${invalidId}» در فروشگاه طاقچه پیدا نشد. ممکن است شناسه نامعتبر باشد یا این اثر از فهرست برداشته شده باشد.`;

    const btnReturn = document.createElement('a');
    btnReturn.href = '?page=catalog';
    btnReturn.className = 'action-btn btn-auth';
    btnReturn.innerHTML = `${ICONS.arrowRight} <span>بازگشت به فهرست همه کتاب‌ها</span>`;

    wrap.appendChild(icon);
    wrap.appendChild(title);
    wrap.appendChild(desc);
    wrap.appendChild(btnReturn);

    return wrap;
  }

  root.VibecheDetail = {
    renderBookDetail,
    createNotFoundState
  };
})();
