/**
 * vibeche - Reusable DOM Components
 * Implements Step 3 requirements:
 * - Book Card with cover, title, author, rating, price / free badge, and favorite toggle
 * - Safe rendering with textContent
 * - Accessible SVG icons
 * - Horizontal Book Shelves with active Next/Prev controls
 * - Global Toast notifications
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  const ICONS = {
    heart: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
    heartFilled: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
    star: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    chevronRight: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
    chevronLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>'
  };

  /**
   * Formats numbers to Persian string (e.g. 68000 -> "۶۸,۰۰۰")
   */
  function toPersianDigits(num) {
    if (num === null || num === undefined) return '';
    return num.toLocaleString('fa-IR');
  }

  /**
   * Floating Toast Message
   */
  function showToast(message, type = 'info') {
    if (typeof document === 'undefined') return;
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  /**
   * Creates a reusable Book Card DOM element
   */
  function createBookCard(book) {
    const card = document.createElement('article');
    card.className = 'book-card';
    card.dataset.bookId = book.id;

    // 1. Cover container
    const coverWrap = document.createElement('div');
    coverWrap.className = 'card-cover-wrap';

    const img = document.createElement('img');
    img.src = book.cover;
    img.alt = `جلد کتاب ${book.title}`;
    img.loading = 'lazy';
    coverWrap.appendChild(img);

    // Free Badge
    if (book.price === 0) {
      const freeBadge = document.createElement('span');
      freeBadge.className = 'card-badge badge-free';
      freeBadge.textContent = 'رایگان';
      coverWrap.appendChild(freeBadge);
    }

    // Favorite Button
    const favBtn = document.createElement('button');
    favBtn.type = 'button';
    favBtn.className = 'btn-card-favorite';
    favBtn.setAttribute('aria-label', `افزودن ${book.title} به علاقه‌مندی‌ها`);

    const isFav = root.VibecheStorage ? root.VibecheStorage.isFavorite(book.id) : false;
    if (isFav) {
      favBtn.classList.add('is-favorite');
      favBtn.innerHTML = ICONS.heartFilled;
    } else {
      favBtn.innerHTML = ICONS.heart;
    }

    favBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!root.VibecheStorage) return;

      const res = root.VibecheStorage.toggleFavorite(book.id);
      if (res.isFavorite) {
        favBtn.classList.add('is-favorite');
        favBtn.innerHTML = ICONS.heartFilled;
        showToast(`«${book.title}» به علاقه‌مندی‌ها افزوده شد.`, 'success');
      } else {
        favBtn.classList.remove('is-favorite');
        favBtn.innerHTML = ICONS.heart;
        showToast(`«${book.title}» از علاقه‌مندی‌ها حذف شد.`, 'info');
      }

      // Dispatch custom event to notify listeners (e.g. library view or header badge)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vibeche:favoriteChange', { detail: { bookId: book.id, isFavorite: res.isFavorite } }));
      }
    });

    coverWrap.appendChild(favBtn);
    card.appendChild(coverWrap);

    // 2. Card Body
    const body = document.createElement('div');
    body.className = 'card-body';

    const titleEl = document.createElement('h3');
    titleEl.className = 'card-title';
    titleEl.title = book.title;

    const titleLink = document.createElement('a');
    titleLink.href = `?book=${book.id}`;
    titleLink.textContent = book.title;
    titleEl.appendChild(titleLink);
    body.appendChild(titleEl);

    const authorEl = document.createElement('p');
    authorEl.className = 'card-author';
    authorEl.textContent = book.author;
    body.appendChild(authorEl);

    // 3. Card Footer (Rating & Price)
    const footer = document.createElement('div');
    footer.className = 'card-footer';

    const ratingEl = document.createElement('div');
    ratingEl.className = 'card-rating';
    ratingEl.innerHTML = `${ICONS.star} <span>${toPersianDigits(book.rating)}</span>`;
    footer.appendChild(ratingEl);

    const priceEl = document.createElement('div');
    priceEl.className = 'card-price';
    if (book.price === 0) {
      priceEl.className += ' price-free';
      priceEl.textContent = 'رایگان';
    } else {
      priceEl.className += ' price-toman';
      priceEl.textContent = `${toPersianDigits(book.price)} تومان`;
    }
    footer.appendChild(priceEl);

    body.appendChild(footer);
    card.appendChild(body);

    // Card click navigates to details
    card.addEventListener('click', (e) => {
      // Don't duplicate if clicking the anchor or favorite button
      if (e.target.closest('.btn-card-favorite')) return;
      if (typeof window !== 'undefined' && root.VibecheRouter) {
        root.VibecheRouter.navigate(`?book=${book.id}`);
      } else {
        window.location.search = `?book=${book.id}`;
      }
    });

    return card;
  }

  /**
   * Renders a complete horizontal Book Shelf section with Next/Prev scroll controls
   */
  function createBookShelf({ id, title, subtitle, books, viewAllUrl }) {
    const section = document.createElement('section');
    section.className = 'shelf-section';
    section.id = `shelf-${id}`;

    // Header
    const header = document.createElement('div');
    header.className = 'shelf-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'shelf-title-wrap';

    const indicator = document.createElement('span');
    indicator.className = 'shelf-indicator';
    titleWrap.appendChild(indicator);

    const titleEl = document.createElement('h2');
    titleEl.className = 'shelf-title';
    titleEl.textContent = title;
    titleWrap.appendChild(titleEl);

    if (subtitle) {
      const subEl = document.createElement('span');
      subEl.className = 'shelf-subtitle';
      subEl.textContent = subtitle;
      titleWrap.appendChild(subEl);
    }

    header.appendChild(titleWrap);

    if (viewAllUrl) {
      const viewAllLink = document.createElement('a');
      viewAllLink.className = 'shelf-view-all';
      viewAllLink.href = viewAllUrl;
      viewAllLink.innerHTML = `<span>مشاهده همه</span> ${ICONS.chevronLeft}`;
      header.appendChild(viewAllLink);
    }

    section.appendChild(header);

    // Container with track and scroll buttons
    const container = document.createElement('div');
    container.className = 'shelf-container';

    // In RTL:
    // "Prev" (button on the right) scrolls right (backward in Persian reading)
    // "Next" (button on the left) scrolls left (forward in Persian reading)
    const btnPrev = document.createElement('button');
    btnPrev.type = 'button';
    btnPrev.className = 'shelf-nav-btn shelf-btn-prev';
    btnPrev.setAttribute('aria-label', `قبلی ${title}`);
    btnPrev.innerHTML = ICONS.chevronRight;

    const btnNext = document.createElement('button');
    btnNext.type = 'button';
    btnNext.className = 'shelf-nav-btn shelf-btn-next';
    btnNext.setAttribute('aria-label', `بعدی ${title}`);
    btnNext.innerHTML = ICONS.chevronLeft;

    const track = document.createElement('div');
    track.className = 'shelf-track';

    books.forEach(book => {
      track.appendChild(createBookCard(book));
    });

    btnPrev.addEventListener('click', () => {
      // In RTL, positive scrollLeft moves right (backward)
      track.scrollBy({ left: 380, behavior: 'smooth' });
    });

    btnNext.addEventListener('click', () => {
      // In RTL, negative scrollLeft moves left (forward)
      track.scrollBy({ left: -380, behavior: 'smooth' });
    });

    container.appendChild(btnPrev);
    container.appendChild(track);
    container.appendChild(btnNext);
    section.appendChild(container);

    return section;
  }

  root.VibecheComponents = {
    ICONS,
    toPersianDigits,
    showToast,
    createBookCard,
    createBookShelf
  };
})();
