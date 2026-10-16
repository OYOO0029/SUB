// Embedded views retain their own state; the shell controls navigation.
(() => {
 const embedded = new URLSearchParams(location.search).has('embedded');
 const shell = new URL('./schedule.html', document.currentScript.src);
 if (!embedded) {
  shell.searchParams.set('mode', location.pathname.includes('/work/') ? 'work' : 'personal');
  location.replace(shell);
  return;
 }
 document.documentElement.classList.add('planner-embedded');
 window.plannerInactive=window.frameElement?.hidden ?? false;
 document.addEventListener('click', event => {
  const control = event.target.closest('.planner-mode, a[href$="schedule.html"]');
  if (!control || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); event.stopImmediatePropagation();
  parent.postMessage({type:'planner-mode',mode:control.dataset.value || 'personal'}, location.origin);
 },true);
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin || event.source!==parent || event.data?.type!=='planner-active')return;
  window.plannerInactive=!event.data.active;
  document.dispatchEvent(new Event('visibilitychange'));
 });
})();
