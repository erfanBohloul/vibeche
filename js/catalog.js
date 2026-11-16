/**
 * vibeche - Catalog, Search, Multi-Filter & Sorting Module (Step 4)
 * Sharif University Web Programming - HW1 (Taghche)
 * 
 * Features:
 * 1. General book catalog generated from shared data source
 * 2. Search in title and author (ignoring leading/trailing whitespace)
 * 3. Combined filters:
 *    - Category filter
 *    - Free books toggle
 *    - Price range (between minPrice and maxPrice)
 *    - Maximum pages (pages less than or equal to X)
 *    - Minimum rating (rating greater than or equal to X)
 * 4. Sorting: price ascending, price descending, rating descending
 * 5. Display match count and clear filters button
 * 6. Meaningful empty state with return link
 * 7. Category selected from homepage/header reflected automatically
 * 8. Full URL query synchronization
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  /**
   * Pure filtering and sorting engine (testable in CLI)
   */
  function filterAndSortBooks({
    query = '',
    categoryId = 'all',
    freeOnly = false,
    minPrice = '',
    maxPrice = '',
    maxPages = '',
    minRating = '',
    sort = 'default'
  } = {}) {
    if (!root.VibecheData || !Array.isArray(root.VibecheData.BOOKS)) {
      return [];
    }

    const trimmed = typeof query === 'string' ? query.trim().toLowerCase() : '';
    let results = root.VibecheData.BOOKS.slice();

    // 1. Search in title and author
    if (trimmed) {
      results = results.filter(book => {
        const titleMatch = book.title && book.title.toLowerCase().includes(trimmed);
        const authorMatch = book.author && book.author.toLowerCase().includes(trimmed);
        return titleMatch || authorMatch;
      });
    }

    // 2. Category filter
    if (categoryId && categoryId !== 'all') {
      results = results.filter(book => book.categoryId === categoryId);
    }

    // 3. Free only filter
    if (freeOnly === true || freeOnly === 'true') {
      results = results.filter(book => book.price === 0);
    }

    // 4. Price between minPrice and maxPrice
    if (minPrice !== '' && minPrice !== null && minPrice !== undefined) {
      const minP = Number(minPrice);
      if (!isNaN(minP) && minP >= 0) {
        results = results.filter(book => book.price >= minP);
      }
    }

    if (maxPrice !== '' && maxPrice !== null && maxPrice !== undefined) {
      const maxP = Number(maxPrice);
      if (!isNaN(maxP) && maxP >= 0) {
        results = results.filter(book => book.price <= maxP);
      }
    }

    // 5. Number of pages less than or equal to maxPages
    if (maxPages !== '' && maxPages !== null && maxPages !== undefined) {
      const maxPg = Number(maxPages);
      if (!isNaN(maxPg) && maxPg > 0) {
        results = results.filter(book => (book.pages || 0) <= maxPg);
      }
    }

    // 6. Rating greater than or equal to minRating
    if (minRating !== '' && minRating !== null && minRating !== undefined) {
      const minR = Number(minRating);
      if (!isNaN(minR) && minR >= 0) {
        results = results.filter(book => (book.rating || 0) >= minR);
      }
    }

    // 7. Sorting
    if (sort === 'price_asc') {
      results.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      results.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating_desc') {
      results.sort((a, b) => b.rating - a.rating);
    }

    return results;
  }

  /**
   * Renders the complete Catalog view into the given container
   */
  function renderCatalog(container, params = new URLSearchParams()) {
    container.innerHTML = '';

    // Read initial states from URL parameters
    const initialQuery = params.get('q') || '';
    const initialCategory = params.get('cat') || 'all';
    const initialFree = params.get('free') === 'true';
    const initialMinPrice = params.get('minPrice') || '';
    const initialMaxPrice = params.get('maxPrice') || '';
    const initialMaxPages = params.get('maxPages') || '';
    const initialMinRating = params.get('minRating') || '';
    const initialSort = params.get('sort') || 'default';

    const viewWrapper = document.createElement('div');
    viewWrapper.className = 'catalog-view-section';

    // 1. View Header
    const header = document.createElement('div');
    header.className = 'catalog-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'catalog-title-wrap';

    const titleEl = document.createElement('h1');
    titleEl.className = 'catalog-title';
    titleEl.textContent = 'فهرست کتاب‌ها';
    titleWrap.appendChild(titleEl);

    const countBadge = document.createElement('span');
    countBadge.className = 'catalog-count-badge';
    countBadge.id = 'catalog-results-count';
    titleWrap.appendChild(countBadge);

    header.appendChild(titleWrap);
    viewWrapper.appendChild(header);

    // 2. Filter Controls Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'catalog-toolbar';

    // Search Input inside toolbar
    const searchWrap = document.createElement('div');
    searchWrap.className = 'toolbar-search-wrap';
    searchWrap.innerHTML = `
      <div class="toolbar-search-box">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          type="text" 
          id="catalog-search-input" 
          placeholder="جستجو در عنوان یا نام نویسنده..." 
          value=""
          aria-label="جستجو در نتایج کاتالوگ"
        >
        <button type="button" id="catalog-search-clear" class="btn-clear-search" style="display: none;" aria-label="پاک کردن جستجو">✕</button>
      </div>
    `;
    toolbar.appendChild(searchWrap);

    // Primary Filters row: Category, Free Toggle, Sort, Reset
    const filtersRow1 = document.createElement('div');
    filtersRow1.className = 'toolbar-filters-row';

    // Category Select
    const catSelectWrap = document.createElement('div');
    catSelectWrap.className = 'filter-group';
    const catLabel = document.createElement('label');
    catLabel.htmlFor = 'catalog-category-select';
    catLabel.textContent = 'دسته‌بندی:';
    const catSelect = document.createElement('select');
    catSelect.id = 'catalog-category-select';
    catSelect.className = 'filter-select';
    catSelect.setAttribute('aria-label', 'فیلتر دسته‌بندی کتاب');

    root.VibecheData.CATEGORIES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      if (c.id === initialCategory) opt.selected = true;
      catSelect.appendChild(opt);
    });
    catSelectWrap.appendChild(catLabel);
    catSelectWrap.appendChild(catSelect);
    filtersRow1.appendChild(catSelectWrap);

    // Free Books Checkbox
    const freeWrap = document.createElement('div');
    freeWrap.className = 'filter-group filter-checkbox-group';
    const freeCheck = document.createElement('input');
    freeCheck.type = 'checkbox';
    freeCheck.id = 'catalog-free-checkbox';
    freeCheck.className = 'filter-checkbox';
    freeCheck.checked = initialFree;
    const freeLabel = document.createElement('label');
    freeLabel.htmlFor = 'catalog-free-checkbox';
    freeLabel.textContent = 'فقط کتاب‌های رایگان';
    freeWrap.appendChild(freeCheck);
    freeWrap.appendChild(freeLabel);
    filtersRow1.appendChild(freeWrap);

    // Sort Select
    const sortWrap = document.createElement('div');
    sortWrap.className = 'filter-group';
    const sortLabel = document.createElement('label');
    sortLabel.htmlFor = 'catalog-sort-select';
    sortLabel.textContent = 'مرتب‌سازی:';
    const sortSelect = document.createElement('select');
    sortSelect.id = 'catalog-sort-select';
    sortSelect.className = 'filter-select';
    sortSelect.setAttribute('aria-label', 'مرتب‌سازی نتایج');

    const sortOptions = [
      { id: 'default', label: 'پیش‌فرض' },
      { id: 'price_asc', label: 'قیمت: از کم به زیاد (ارزان‌ترین)' },
      { id: 'price_desc', label: 'قیمت: از زیاد به کم (گران‌ترین)' },
      { id: 'rating_desc', label: 'بیشترین امتیاز' }
    ];
    sortOptions.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.label;
      if (s.id === initialSort) opt.selected = true;
      sortSelect.appendChild(opt);
    });
    sortWrap.appendChild(sortLabel);
    sortWrap.appendChild(sortSelect);
    filtersRow1.appendChild(sortWrap);

    // Clear Filters Button
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.id = 'btn-clear-all-filters';
    clearBtn.className = 'btn-reset-filters';
    clearBtn.textContent = 'پاک کردن فیلترها';
    filtersRow1.appendChild(clearBtn);

    toolbar.appendChild(filtersRow1);

    // Secondary / Advanced Filters row: Price Range, Max Pages, Min Rating
    const filtersRow2 = document.createElement('div');
    filtersRow2.className = 'toolbar-filters-row toolbar-advanced-row';

    // Price Range Filter
    const priceRangeWrap = document.createElement('div');
    priceRangeWrap.className = 'filter-group filter-price-range';
    priceRangeWrap.innerHTML = `
      <label>قیمت (تومان):</label>
      <input type="number" id="filter-min-price" class="filter-number-input" placeholder="از" min="0" step="5000" value="${initialMinPrice}" aria-label="حداقل قیمت به تومان">
      <span class="range-separator">تا</span>
      <input type="number" id="filter-max-price" class="filter-number-input" placeholder="تا" min="0" step="5000" value="${initialMaxPrice}" aria-label="حداکثر قیمت به تومان">
    `;
    filtersRow2.appendChild(priceRangeWrap);

    // Max Pages Filter
    const pagesWrap = document.createElement('div');
    pagesWrap.className = 'filter-group';
    const pagesLabel = document.createElement('label');
    pagesLabel.htmlFor = 'filter-max-pages';
    pagesLabel.textContent = 'حداکثر صفحات:';
    const pagesSelect = document.createElement('select');
    pagesSelect.id = 'filter-max-pages';
    pagesSelect.className = 'filter-select';
    pagesSelect.setAttribute('aria-label', 'فیلتر حداکثر تعداد صفحات');

    const pageOptions = [
      { id: '', label: 'همه تعداد صفحات' },
      { id: '100', label: 'کمتر از ۱۰۰ صفحه' },
      { id: '250', label: 'کمتر از ۲۵۰ صفحه' },
      { id: '500', label: 'کمتر از ۵۰۰ صفحه' },
      { id: '1000', label: 'کمتر از ۱,۰۰۰ صفحه' }
    ];
    pageOptions.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label;
      if (p.id === initialMaxPages) opt.selected = true;
      pagesSelect.appendChild(opt);
    });
    pagesWrap.appendChild(pagesLabel);
    pagesWrap.appendChild(pagesSelect);
    filtersRow2.appendChild(pagesWrap);

    // Min Rating Filter
    const ratingWrap = document.createElement('div');
    ratingWrap.className = 'filter-group';
    const ratingLabel = document.createElement('label');
    ratingLabel.htmlFor = 'filter-min-rating';
    ratingLabel.textContent = 'حداقل امتیاز:';
    const ratingSelect = document.createElement('select');
    ratingSelect.id = 'filter-min-rating';
    ratingSelect.className = 'filter-select';
    ratingSelect.setAttribute('aria-label', 'فیلتر حداقل امتیاز');

    const ratingOptions = [
      { id: '', label: 'همه امتیازها' },
      { id: '4.0', label: '★ ۴.۰ و بالاتر' },
      { id: '4.5', label: '★ ۴.۵ و بالاتر' },
      { id: '4.7', label: '★ ۴.۷ و بالاتر' },
      { id: '4.9', label: '★ ۴.۹ و بالاتر' }
    ];
    ratingOptions.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.label;
      if (r.id === initialMinRating) opt.selected = true;
      ratingSelect.appendChild(opt);
    });
    ratingWrap.appendChild(ratingLabel);
    ratingWrap.appendChild(ratingSelect);
    filtersRow2.appendChild(ratingWrap);

    toolbar.appendChild(filtersRow2);
    viewWrapper.appendChild(toolbar);

    // 3. Books Grid Container
    const gridContainer = document.createElement('div');
    gridContainer.id = 'catalog-books-grid';
    gridContainer.className = 'catalog-books-grid';
    viewWrapper.appendChild(gridContainer);

    container.appendChild(viewWrapper);

    // Inputs
    const searchInput = viewWrapper.querySelector('#catalog-search-input');
    const clearSearchBtn = viewWrapper.querySelector('#catalog-search-clear');
    const minPriceInput = viewWrapper.querySelector('#filter-min-price');
    const maxPriceInput = viewWrapper.querySelector('#filter-max-price');

    searchInput.value = initialQuery;
    if (initialQuery) clearSearchBtn.style.display = 'block';

    // State management and re-rendering function
    function applyFiltersAndUpdate(syncURL = true) {
      const q = searchInput.value;
      const cat = catSelect.value;
      const isFree = freeCheck.checked;
      const minP = minPriceInput.value.trim();
      const maxP = maxPriceInput.value.trim();
      const maxPg = pagesSelect.value;
      const minR = ratingSelect.value;
      const sort = sortSelect.value;

      clearSearchBtn.style.display = q ? 'block' : 'none';

      // Execute combined multi-filter
      const filtered = filterAndSortBooks({
        query: q,
        categoryId: cat,
        freeOnly: isFree,
        minPrice: minP,
        maxPrice: maxP,
        maxPages: maxPg,
        minRating: minR,
        sort: sort
      });

      // Update count badge safely
      countBadge.textContent = `${filtered.length.toLocaleString('fa-IR')} کتاب یافت شد`;

      // Render book cards or empty state
      gridContainer.innerHTML = '';
      if (filtered.length === 0) {
        gridContainer.appendChild(createEmptyState(() => {
          resetAllFilters();
        }));
      } else {
        filtered.forEach(book => {
          gridContainer.appendChild(root.VibecheComponents.createBookCard(book));
        });
      }

      // Sync URL if requested (allows reload & bookmarking)
      if (syncURL && typeof window !== 'undefined' && window.history) {
        const newParams = new URLSearchParams();
        newParams.set('page', 'catalog');
        if (q.trim()) newParams.set('q', q.trim());
        if (cat && cat !== 'all') newParams.set('cat', cat);
        if (isFree) newParams.set('free', 'true');
        if (minP) newParams.set('minPrice', minP);
        if (maxP) newParams.set('maxPrice', maxP);
        if (maxPg) newParams.set('maxPages', maxPg);
        if (minR) newParams.set('minRating', minR);
        if (sort && sort !== 'default') newParams.set('sort', sort);

        const newUrl = `?${newParams.toString()}`;
        window.history.replaceState({}, '', newUrl);
      }
    }

    function resetAllFilters() {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      catSelect.value = 'all';
      freeCheck.checked = false;
      minPriceInput.value = '';
      maxPriceInput.value = '';
      pagesSelect.value = '';
      ratingSelect.value = '';
      sortSelect.value = 'default';
      applyFiltersAndUpdate(true);
    }

    // Event listeners
    searchInput.addEventListener('input', () => applyFiltersAndUpdate(true));
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      applyFiltersAndUpdate(true);
      searchInput.focus();
    });
    catSelect.addEventListener('change', () => applyFiltersAndUpdate(true));
    freeCheck.addEventListener('change', () => applyFiltersAndUpdate(true));
    minPriceInput.addEventListener('input', () => applyFiltersAndUpdate(true));
    maxPriceInput.addEventListener('input', () => applyFiltersAndUpdate(true));
    pagesSelect.addEventListener('change', () => applyFiltersAndUpdate(true));
    ratingSelect.addEventListener('change', () => applyFiltersAndUpdate(true));
    sortSelect.addEventListener('change', () => applyFiltersAndUpdate(true));
    clearBtn.addEventListener('click', () => resetAllFilters());

    // Initial render
    applyFiltersAndUpdate(false);
  }

  /**
   * Creates friendly Empty State when 0 books match
   */
  function createEmptyState(onReset) {
    const empty = document.createElement('div');
    empty.className = 'catalog-empty-state';

    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
      </svg>
    `;

    const title = document.createElement('h2');
    title.className = 'empty-title';
    title.textContent = 'کتابی با این مشخصات یافت نشد!';

    const desc = document.createElement('p');
    desc.className = 'empty-desc';
    desc.textContent = 'لطفاً عبارت جستجو را تغییر دهید یا برخی از فیلترهای اعمال‌شده را غیرفعال کنید.';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'action-btn btn-auth';
    resetBtn.textContent = 'حذف فیلترها و مشاهده همه کتاب‌ها';
    resetBtn.addEventListener('click', onReset);

    empty.appendChild(icon);
    empty.appendChild(title);
    empty.appendChild(desc);
    empty.appendChild(resetBtn);

    return empty;
  }

  root.VibecheCatalog = {
    filterAndSortBooks,
    renderCatalog
  };
})();
