// The mode switch animates locally, then follows the existing page route.
(() => {
  let pending;
  document.addEventListener('click', event => {
    const control = event.target.closest('.planner-switch .planner-mode');
    if (!control || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const toggle = control.closest('.planner-switch');
    if (control.classList.contains('active')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const target = control.dataset.value;
    if (!['personal', 'work'].includes(target)) return;
    const url = control.getAttribute('href') || (target === 'personal' ? '../schedule.html' : './work/');
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pending) return;
    toggle.dataset.target = target;
    const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
    pending = setTimeout(() => location.assign(url), delay);
  }, true);
  window.addEventListener('pageshow', () => {
    clearTimeout(pending);
    pending = undefined;
    document.querySelectorAll('.planner-switch[data-target]').forEach(toggle => delete toggle.dataset.target);
  });
})();
