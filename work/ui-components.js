// Shared visual primitives. Domain updates remain in their existing change handlers.
export const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={check:'m5 12 4 4L19 6',plus:'M12 5v14M5 12h14',chevron:'m9 5 7 7-7 7',left:'m15 5-7 7 7 7',close:'m6 6 12 12M6 18 18 6',clock:'M12 8v4l3 2',search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',folder:'M3 7V5h6l2 2h10v13H3Z',briefcase:'M8 6V3h8v3M3 7h18v13H3ZM3 12h18M10 12v3h4v-3',home:'m3 10 9-7 9 7v11h-6v-7H9v7H3Z',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',list:'M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1',calendar:'M4 5h16v16H4ZM4 10h16M8 2v6M16 2v6',bell:'M18 8a6 6 0 0 0-12 0v6l-2 3h16l-2-3ZM10 21h4',arrow:'M4 12h16m-6-6 6 6-6 6',edit:'m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z',tag:'M3 3h8l10 10-8 8L3 11ZM7 7h.01',note:'M5 3h14v13l-5 5H5ZM14 21v-6h5M8 7h8M8 11h6',users:'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21v-3a6 6 0 0 1 12 0v3M16 4a4 4 0 0 1 0 7M17 14a5 5 0 0 1 5 5v2',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1',moon:'M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11',leaf:'M20 3C8 1 2 8 5 15c5 8 16 1 15-12ZM5 20 16 8',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',undo:'M8 4 3 9l5 5M3 9h11a6 6 0 0 1 0 12',info:'M12 11v6M12 7h.01'};
paths.sort='M8 4v16m-4-4 4 4 4-4M14 6h7M14 11h5M14 16h3';paths.down='m6 9 6 6 6-6';paths.up='m6 15 6-6 6 6';paths.play='m8 5 11 7-11 7Z';
paths.week='M4 5h16v14H4ZM9 5v14M15 5v14';paths.more='M5 12h.01M12 12h.01M19 12h.01';
paths.filter='M3 6h7m4 0h7M3 18h11m4 0h3M10 3v6M14 15v6M3 12h3m4 0h11M6 9v6';paths.grip='M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01';
export function icon(name,cls=''){return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${['clock','info'].includes(name)?'<circle cx="12" cy="12" r="9"/>':''}<path d="${paths[name]||paths.note}"/></svg>`;}
export const button=(label,action,attrs='',cls='button')=>`<button class="${cls}" data-action="${action}" ${attrs} ${!attrs.includes('title=')&&attrs.match(/aria-label="([^"]+)"/) ? 'title="'+attrs.match(/aria-label="([^"]+)"/)[1]+'"' : ''}>${label}</button>`;
export function taskRowActions(task){
 const id=escapeHTML(task.id),name=escapeHTML(task.title);
 return `<div class="tt-row-actions">${button(icon('trash'),'delete-task',`data-id="${id}" aria-label="${name} 삭제" title="삭제"`,'icon-button row-delete')}${button(icon('note'),'detail',`data-type="task" data-id="${id}" aria-label="${name} 상세 보기" title="상세 보기"`,'icon-button row-detail')}</div>`;
}

export function choiceSelect(value,options,attribute,label){
 return `<select ${attribute} aria-label="${escapeHTML(label)}">${options.map(([v,l])=>`<option value="${escapeHTML(v)}" ${value===v?'selected':''}>${escapeHTML(l)}</option>`).join('')}</select>`;
}
export function selectSurface(select,id){
 const label=select.getAttribute('aria-label')||select.name||'선택',options=[...select.options],value=select.value;
 return `<button type="button" class="ux-status-filter" data-menu-toggle aria-label="${escapeHTML(label)}" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}" ${select.disabled?'disabled':''}><span>${escapeHTML(options.find(o=>o.value===value)?.textContent||'선택')}</span>${icon('down')}</button><div id="${id}" class="surface-menu ux-status-menu" data-menu-panel role="menu" hidden>${options.map(o=>`<button type="button" class="menu-option" data-select-option="${escapeHTML(o.value)}" role="menuitemradio" aria-checked="${value===o.value}" ${o.disabled?'disabled':''}><span>${escapeHTML(o.textContent)}</span></button>`).join('')}</div>`;
}
export function installSelectControls(){
 let serial=0;
 const roots='#app select:not([hidden]),#detail select:not([hidden]),#editor select:not([hidden]),#property-editor select:not([hidden]),.notion-date-picker select:not([hidden])';
 function prepare(){document.querySelectorAll(roots).forEach(select=>{
  if(select.multiple||select.size>1||select.closest('.ux-select')||select.matches('[data-native-select]'))return;
  const host=document.createElement('div');host.className='ux-status ux-select';host.setAttribute('data-dropdown','');
  if(select.matches('[data-project-status],[data-project-lifecycle]')){host.classList.add('ux-project-state');host.dataset.state=select.value;}
  const id='ux-select-'+(++serial);select.before(host);host.append(select);select.hidden=true;select.setAttribute('aria-hidden','true');select.tabIndex=-1;host.insertAdjacentHTML('beforeend',selectSurface(select,id));
 });}
 document.addEventListener('click',e=>{
  const option=e.target.closest('[data-select-option]');if(!option)return;
  const host=option.closest('.ux-select'),select=host?.querySelector('select');if(!select)return;
  e.preventDefault();const attrs=[...select.attributes].filter(a=>a.name.startsWith('data-')),label=select.getAttribute('aria-label');
  select.value=option.dataset.selectOption;select.dispatchEvent(new window.Event('change',{bubbles:true}));
  if(host.isConnected){host.querySelectorAll(':scope > :not(select)').forEach(e=>e.remove());host.dataset.state=select.value;host.insertAdjacentHTML('beforeend',selectSurface(select,'ux-select-'+(++serial)));}
  prepare();
  const restored=[...document.querySelectorAll('.ux-select select')].find(el=>el.getAttribute('aria-label')===label&&attrs.every(a=>el.getAttribute(a.name)===a.value));
  restored?.parentElement.querySelector('[data-menu-toggle]')?.focus();
 });
 const observer=new MutationObserver(prepare);observer.observe(document.body,{childList:true,subtree:true});prepare();
 return {prepare,destroy:()=>observer.disconnect()};
}
