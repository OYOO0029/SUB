export function installTableResize(){
 const storageKey='work-table-widths-v1';let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')}catch{}
 const key=t=>t.dataset.resizeKey||t.getAttribute('aria-label'),persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(saved))}catch{}};
 function set(t,widths){const cols=[...t.querySelectorAll('colgroup col')];widths.forEach((w,i)=>{if(cols[i])cols[i].style.width=w+'px'});t.style.width=widths.reduce((a,b)=>a+b,0)+'px';t.style.tableLayout='fixed';}
 function prepare(){document.querySelectorAll('table.tt-table,table.pl-table').forEach(t=>{
  if(t.dataset.resizable)return;t.dataset.resizable='true';const headers=[...t.querySelectorAll('thead tr:first-child th')];if(!headers.length||!key(t))return;
  let cg=t.querySelector('colgroup');if(!cg){cg=document.createElement('colgroup');t.prepend(cg)}while(cg.children.length<headers.length)cg.append(document.createElement('col'));
  t.dataset.originalColumns=JSON.stringify([...cg.children].map(c=>c.style.width));
  if(Array.isArray(saved[key(t)])&&saved[key(t)].length===headers.length&&saved[key(t)].every(w=>Number.isFinite(w)&&w>=36&&w<=1600))set(t,saved[key(t)]);
  headers.forEach((th,i)=>{const handle=document.createElement('span');handle.className='ux-col-resize';handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label',(th.textContent.trim()||th.getAttribute('aria-label')||'열')+' 너비 조절');handle.title='드래그로 너비 조절 · 더블클릭으로 초기화';handle.dataset.column=i;th.append(handle)});
 });}
 const observer=new MutationObserver(prepare);observer.observe(document.body,{childList:true,subtree:true});prepare();
 let drag=null;
 const widths=t=>[...t.querySelectorAll('thead tr:first-child th')].map(h=>h.getBoundingClientRect().width);
 const apply=(t,i,w)=>{const ws=widths(t);ws[i]=Math.max(36,Math.min(1600,w));set(t,ws);saved[key(t)]=ws;};
 document.addEventListener('pointerdown',e=>{const h=e.target.closest('.ux-col-resize');if(!h||e.button!==0)return;e.preventDefault();e.stopPropagation();const t=h.closest('table'),i=Number(h.dataset.column);drag={h,t,i,x:e.clientX,w:widths(t)[i]};h.setPointerCapture(e.pointerId);document.body.classList.add('resizing-table');});
 document.addEventListener('pointermove',e=>{if(drag)apply(drag.t,drag.i,drag.w+e.clientX-drag.x)});
 const finish=()=>{if(!drag)return;drag=null;document.body.classList.remove('resizing-table');persist();};
 document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',finish);
 document.addEventListener('click',e=>{if(e.target.closest('.ux-col-resize')){e.preventDefault();e.stopImmediatePropagation();}},true);
 document.addEventListener('dblclick',e=>{const h=e.target.closest('.ux-col-resize');if(!h)return;const t=h.closest('table');delete saved[key(t)];persist();t.style.width='';t.style.tableLayout='';const original=JSON.parse(t.dataset.originalColumns||'[]');t.querySelectorAll('col').forEach((c,i)=>c.style.width=original[i]||'');});
 document.addEventListener('keydown',e=>{const h=e.target.closest('.ux-col-resize');if(!h||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();const t=h.closest('table'),i=Number(h.dataset.column);apply(t,i,widths(t)[i]+(e.key==='ArrowRight'?10:-10));persist();});
}
