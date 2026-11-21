/**
 * vibeche - Mock Login Modal & Form Validation Module (Step 6)
 * Sharif University Web Programming - HW1 (Taghche)
 * 
 * Requirements:
 * 1. Form with Display Name and Mobile Number
 * 2. Non-empty name validation (at least 2 chars)
 * 3. Mobile validation: exactly 11 digits, must start with 09
 * 4. Both Persian (۰-۹) and Latin (0-9) numerals accepted
 * 5. Display error messages directly next to the input (inline errors)
 * 6. Header updates to show user's name and logout option after login
 * 7. Closes with Escape key or close button
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  /**
   * Opens the Mock Login Modal
   * @param {Object} options - { notice?: string, onSuccess?: Function }
   */
  function openAuthModal(options = {}) {
    if (typeof document === 'undefined') return;

    // Remove existing modal if any
    const existing = document.getElementById('vibeche-auth-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'vibeche-auth-modal-overlay';
    overlay.className = 'modal-overlay auth-modal-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog auth-modal-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'auth-modal-title');

    dialog.innerHTML = `
      <div class="modal-header">
        <div class="auth-modal-title-wrap">
          <div class="auth-brand-badge">وایبچـه</div>
          <h3 id="auth-modal-title" class="modal-title">ورود یا ثبت‌نام</h3>
        </div>
        <button type="button" class="btn-modal-close" id="btn-close-auth-modal" aria-label="بستن">✕</button>
      </div>
      <div class="modal-body auth-modal-body">
        ${options.notice ? `<div class="auth-context-notice">${options.notice}</div>` : ''}
        <p class="auth-lead-text">برای دسترسی به کتابخانه، ثبت علاقه‌مندی‌ها و خرید کتاب‌ها، مشخصات خود را وارد کنید.</p>

        <form id="auth-login-form" class="auth-form" novalidate>
          <!-- Display Name Input Group -->
          <div class="form-group" id="group-auth-name">
            <label for="auth-input-name" class="form-label">نام و نام خانوادگی نمایشی:</label>
            <input 
              type="text" 
              id="auth-input-name" 
              class="form-control" 
              placeholder="مثال: علی رضایی" 
              autocomplete="name"
              required
            >
            <span class="inline-error-msg" id="auth-error-name" style="display: none;"></span>
          </div>

          <!-- Mobile Phone Input Group -->
          <div class="form-group" id="group-auth-phone">
            <label for="auth-input-phone" class="form-label">شماره موبایل (۱۱ رقم با ۰۹):</label>
            <input 
              type="tel" 
              id="auth-input-phone" 
              class="form-control" 
              placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹ یا 09123456789" 
              autocomplete="tel"
              dir="ltr"
              required
            >
            <span class="inline-error-msg" id="auth-error-phone" style="display: none;"></span>
            <span class="form-hint">پشتیبانی از اعداد فارسی و انگلیسی</span>
          </div>

          <!-- Submit Button -->
          <button type="submit" class="action-btn btn-auth btn-submit-auth" id="btn-submit-auth">
            ورود به حساب کاربری
          </button>
        </form>
      </div>
      <div class="auth-modal-footer">
        <p class="auth-footer-notice">★ ورود در این برنامه شبیه‌سازی‌شده است و هیچ رمز عبور یا پیامک واقعی نیاز نیست.</p>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const nameInput = dialog.querySelector('#auth-input-name');
    const phoneInput = dialog.querySelector('#auth-input-phone');
    const nameError = dialog.querySelector('#auth-error-name');
    const phoneError = dialog.querySelector('#auth-error-phone');
    const form = dialog.querySelector('#auth-login-form');
    const closeBtn = dialog.querySelector('#btn-close-auth-modal');

    // Auto-focus first input
    setTimeout(() => nameInput.focus(), 50);

    function closeModal() {
      overlay.remove();
      document.removeEventListener('keydown', handleKey);
    }

    function handleKey(e) {
      if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', handleKey);

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Clear inline errors on input
    nameInput.addEventListener('input', () => {
      nameInput.classList.remove('has-error');
      nameError.style.display = 'none';
      nameError.textContent = '';
    });

    phoneInput.addEventListener('input', () => {
      phoneInput.classList.remove('has-error');
      phoneError.style.display = 'none';
      phoneError.textContent = '';
    });

    // Form submission validation
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameVal = nameInput.value;
      const phoneVal = phoneInput.value;

      if (!root.VibecheStorage) return;

      const result = root.VibecheStorage.login(nameVal, phoneVal);

      if (!result.success) {
        // Display inline errors right next to the respective inputs
        if (result.errors.name) {
          nameInput.classList.add('has-error');
          nameError.textContent = result.errors.name;
          nameError.style.display = 'block';
        }
        if (result.errors.phone) {
          phoneInput.classList.add('has-error');
          phoneError.textContent = result.errors.phone;
          phoneError.style.display = 'block';
        }

        // Focus first field with error
        if (result.errors.name) {
          nameInput.focus();
        } else if (result.errors.phone) {
          phoneInput.focus();
        }
      } else {
        // Success
        closeModal();

        // Show welcome toast
        if (root.VibecheComponents) {
          root.VibecheComponents.showToast(`خوش آمدید ${result.user.displayName}! با موفقیت وارد شدید.`, 'success');
        }

        // Refresh Header & App state
        if (root.VibecheApp) {
          root.VibecheApp.updateUserArea();
          root.VibecheApp.updateHeaderBadges();
        }

        // Dispatch global event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vibeche:authChange', { detail: { user: result.user } }));
        }

        // Call optional callback (e.g. resume favoriting or buying)
        if (typeof options.onSuccess === 'function') {
          options.onSuccess(result.user);
        }
      }
    });
  }

  root.VibecheAuth = {
    openAuthModal
  };
})();
