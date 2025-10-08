/* Modal + form demo logic (no server calls) */
(function () {
  const modal = document.querySelector('[data-modal]');
  const dialog = modal?.querySelector('[data-modal-dialog]');
  const openers = document.querySelectorAll('[data-modal-open]');
  const closers = modal?.querySelectorAll('[data-modal-close]') || [];
  const form = modal?.querySelector('#lead-form');
  const success = modal?.querySelector('.modal__success');
  let lastFocused = null;

  const FOCUSABLE = [
    'a[href]','button:not([disabled])','input:not([disabled])','select:not([disabled])','textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ];

  const focusableSelector = FOCUSABLE.join(',');
  const navToggle = document.querySelector('[data-header-toggle]');
  const navMenu = document.querySelector('[data-header-menu]');

  if (navToggle && navMenu) {
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const menuItems = navMenu.querySelectorAll('a, button');
    let outsideClickTimer = null;

    document.body.classList.add('js-nav-ready');

    const setMenuHiddenState = (hidden) => {
      navMenu.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    };

    const handleMenuKeydown = (event) => {
      if (event.key === 'Escape') {
        updateMenu(false, { focusToggle: true });
      }
    };

    const handleOutsideClick = (event) => {
      if (!navMenu.contains(event.target) && !navToggle.contains(event.target)) {
        updateMenu(false);
      }
    };

    const updateMenu = (open, options = {}) => {
      const { focusToggle = false } = options;
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      navMenu.classList.toggle('is-open', open);
      document.body.classList.toggle('is-menu-open', open);
      setMenuHiddenState(!open && !desktopQuery.matches);

      if (open) {
        document.addEventListener('keydown', handleMenuKeydown);
        outsideClickTimer = window.setTimeout(() => {
          document.addEventListener('click', handleOutsideClick);
          outsideClickTimer = null;
        });
      } else {
        document.removeEventListener('keydown', handleMenuKeydown);
        if (outsideClickTimer) {
          window.clearTimeout(outsideClickTimer);
          outsideClickTimer = null;
        }
        document.removeEventListener('click', handleOutsideClick);
        if (focusToggle) {
          navToggle.focus({ preventScroll: true });
        }
      }
    };

    const handleQueryChange = (event) => {
      if (event.matches) {
        updateMenu(false);
        navMenu.classList.remove('is-open');
        setMenuHiddenState(false);
        document.body.classList.remove('is-menu-open');
        if (outsideClickTimer) {
          window.clearTimeout(outsideClickTimer);
          outsideClickTimer = null;
        }
        document.removeEventListener('click', handleOutsideClick);
      } else {
        const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
        setMenuHiddenState(!isExpanded);
      }
    };

    setMenuHiddenState(!desktopQuery.matches);

    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      updateMenu(!isOpen);
    });

    menuItems.forEach((item) => {
      item.addEventListener('click', () => {
        if (!desktopQuery.matches) {
          updateMenu(false);
        }
      });
    });

    if (typeof desktopQuery.addEventListener === 'function') {
      desktopQuery.addEventListener('change', handleQueryChange);
    } else if (typeof desktopQuery.addListener === 'function') {
      desktopQuery.addListener(handleQueryChange);
    }

    handleQueryChange(desktopQuery);
  }

  function trapFocus(e){
    if(!modal.classList.contains('is-open')) return;
    const focusables = dialog.querySelectorAll(focusableSelector);
    if(!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if(e.key === 'Tab'){
      if(e.shiftKey && document.activeElement === first){
        e.preventDefault(); last.focus();
      }else if(!e.shiftKey && document.activeElement === last){
        e.preventDefault(); first.focus();
      }
    }else if(e.key === 'Escape'){
      closeModal();
    }
  }

  function openModal() {
    if(!modal) return;
    lastFocused = document.activeElement;
    modal.classList.add('is-open');
    document.body.classList.add('is-locked');
    modal.removeAttribute('aria-hidden');
    setTimeout(() => {
      const el = dialog.querySelector(focusableSelector);
      el?.focus();
    }, 0);
    document.addEventListener('keydown', trapFocus);
  }

  function closeModal() {
    if(!modal) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    modal.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', trapFocus);
    success?.setAttribute('hidden','');
    form?.removeAttribute('hidden');
    lastFocused?.focus();
  }

  openers.forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); openModal(); }));
  [...closers].forEach(btn => btn.addEventListener('click', () => closeModal()));
  // click on backdrop closes
  modal?.addEventListener('click', (e) => { if(e.target.classList.contains('modal__backdrop')) closeModal(); });

  // Demo form handler: prevent network request, show success block,
  // and print payload to console for local testing.
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      console.log('[lead-form] demo submission:', data);
      form.setAttribute('hidden','');
      success?.removeAttribute('hidden');
    } catch(err){
      console.error('Demo submit failed', err);
    }
  });

  // Expose for debugging in console
  window.DemoModal = { open: openModal, close: closeModal };

  const yearTarget = document.getElementById('y');
  if (yearTarget) {
    yearTarget.textContent = new Date().getFullYear();
  }
})();
