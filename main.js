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

  function trapFocus(e){
    if(!modal.classList.contains('is-open')) return;
    const focusables = dialog.querySelectorAll(FOCUSABLE.join(','));
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
      const el = dialog.querySelector(FOCUSABLE.join(','));
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
})();