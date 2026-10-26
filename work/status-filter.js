export function statusFilter(value,attribute,label,{cancelled=false}={}){
 const options=[['all','전체'],['active','미완료'],['done','완료'],...(cancelled?[['cancelled','취소']]:[])],id=attribute+'-menu';
 return `<div class="ux-status" data-dropdown><select hidden ${attribute} aria-hidden="true" tabindex="-1">${options.map(([v,l])=>`<option value="${v}" ${value===v?'selected':''}>${l}</option>`).join('')}</select><button type="button" class="ux-status-filter" data-menu-toggle aria-label="${label}" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}"><span>${options.find(([v])=>v===value)?.[1]||'전체'}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div id="${id}" class="surface-menu ux-status-menu" data-menu-panel role="menu" hidden>${options.map(([v,l])=>`<button type="button" class="menu-option" data-status-option="${v}" role="menuitemradio" aria-checked="${value===v}"><span>${l}</span><span aria-hidden="true">${value===v?'✓':''}</span></button>`).join('')}</div></div>`;
}
if(typeof document!=='undefined')document.addEventListener('click',e=>{
 const option=e.target.closest('[data-status-option]');if(!option)return;
 const host=option.closest('.ux-status'),select=host.querySelector('select'),attr=select.getAttributeNames().find(n=>n.startsWith('data-'));
 select.value=option.dataset.statusOption;select.dispatchEvent(new Event('change',{bubbles:true}));
 document.querySelector(`.ux-status select[${attr}]`)?.closest('.ux-status').querySelector('[data-menu-toggle]')?.focus();
});
