import {createTaskBatch} from './editing.js?v=20261027-click-add-1';
export function createTaskComposer({getData,getScope,render,save,esc,icon,notify,getContext=()=>({})}){
 let draft=null,resize=null;const drafts=new Map();
 function view(){if(!draft)return '';const project=getData().projects.find(p=>p.id===draft.projectId);
 return `<form class="task-composer" data-task-composer>${draft.target==='main'&&!draft.hideProject?`<div class="batch-project"><span>${esc(project?.title||'—')}</span></div>`:''}<div class="batch-title"><textarea name="titles" rows="1" ${draft.pending?'readonly':''} aria-label="추가할 할 일" placeholder="할 일 입력 후 Enter" required>${esc(draft.text)}</textarea><button type="submit" class="icon-button batch-submit" aria-label="할 일 저장">${icon('plus')}</button></div><div class="batch-due"><span class="ux-empty">-</span></div><button type="button" class="icon-button batch-close" data-batch-close aria-label="연속 추가 닫기">${icon('close')}</button><span class="batch-status" role="status">${esc(draft.message||'')}</span><p role="alert" class="form-error">${esc(draft.error||'')}</p></form>`;}
 function open(opts={}){opts={...getContext(),...Object.fromEntries(Object.entries(opts).filter(([,v])=>v!==undefined))};if(draft&&(draft.text.trim()||draft.pending||draft.target===(opts.target||'main')&&!opts.workId&&!opts.projectId)){draft.target=opts.target||'main';render();focusInput();return;}const w=getData().works.find(x=>x.id===opts.workId);draft={owner:getScope(),projectId:w?.projectId||opts.projectId||'',workId:w?.id||'',target:opts.target||'main',defaultDate:opts.date||null,startDate:opts.date||null,due:null,text:'',hideProject:!!opts.hideProject};render();focusInput();}
 function close(){if(draft?.target==='main')drafts.delete(draft.projectId||'');draft=null;render();}
 document.addEventListener('click',e=>{if(draft&&e.target.closest('[data-batch-close]'))close();});
 window.addEventListener('task-project-context',e=>{if(draft?.target==='main'){if(draft.text.trim()||draft.pending)drafts.set(draft.projectId||'',draft);else drafts.delete(draft.projectId||'');draft=null;}const saved=drafts.get(e.detail||'');if(saved&&saved.owner===getScope()){draft=saved;draft.hideProject=!!e.detail;} });
 document.addEventListener('change',e=>{if(e.target.matches('[data-task-scope]')&&draft?.target==='main'&&!draft.pending){draft.defaultDate=getContext().date||null;draft.startDate=draft.defaultDate;}});
 document.addEventListener('input',e=>{if(e.target.matches('[data-task-composer] textarea')&&draft)draft.text=e.target.value;});
 document.addEventListener('submit',e=>{if(!e.target.matches('[data-task-composer]'))return;e.preventDefault();if(!draft||!getScope()||draft.owner!==getScope())return;try{const count=draft.pending||createTaskBatch(getData(),draft.text,draft).length;draft.pending=count;if(save()===false)throw Error('저장하지 못했습니다. 추가 버튼으로 다시 저장하세요.');draft.pending=null;draft.text='';draft.error='';draft.message=`${count}개 추가됨`;draft.startDate=draft.defaultDate;draft.due=null;render();focusInput();notify('할 일을 추가했습니다.');}catch(err){draft.error=err.message;render();}});
 document.addEventListener('keydown',e=>{if(!e.target.closest('[data-task-composer]'))return;if(e.key==='Enter'&&!e.shiftKey&&e.target.tagName==='TEXTAREA'){e.preventDefault();if(!e.isComposing&&e.keyCode!==229)e.target.form.requestSubmit();}else if(e.key==='Escape'&&!draft?.text.trim()){e.preventDefault();close();}});
 function focusInput(){const input=document.querySelector('[data-task-composer] textarea');input?.scrollIntoView?.({block:'nearest',inline:'nearest'});input?.focus({preventScroll:true});}
 function mount(){
  resize?.disconnect();
  document.querySelectorAll('.task-entry-row,.table-add-edge,.task-entry-body').forEach(e=>e.remove());
  const targets=[...document.querySelectorAll('.tt-screen > .tt-table-wrap table,.pl-hierarchy,.wd-table')];
  for(const table of targets){
   const target=table.matches('.wd-table')?'work':table.matches('.pl-hierarchy')?'project':'main';
   const active=draft&&draft.target===target;
   const empty=table.querySelector('td.tt-empty,td.pl-empty');
   if(empty)empty.parentElement.hidden=!!active;
   if(!active&&empty&&!empty.querySelector('button:not([data-batch-edge])')){empty.innerHTML=`<button type="button" class="table-empty-add" data-batch-edge="${target}" aria-label="할 일 추가">${icon('plus')}<span>할 일 추가</span></button>`;continue;}
   if(active){let body=[...table.tBodies].find(b=>draft.workId&&b.dataset.workGroup===draft.workId)||table.tBodies[table.tBodies.length-1]||table.createTBody();
    if(target==='project'&&!draft.workId){body=table.createTBody();body.className='task-entry-body';}
    const row=body.insertRow();row.className='task-entry-row';const cell=row.insertCell();cell.colSpan=table.tHead?.rows[0]?.cells.length||5;cell.innerHTML=view();const form=cell.querySelector('form');form.dataset.entryTarget=target;
    const align=()=>{const cells=[...table.tHead.rows[0].cells];const widths=cells.map(c=>c.getBoundingClientRect().width);if(!widths.every(w=>w>0))return;const value=widths.map(w=>w+'px').join(' ');if(form.style.gridTemplateColumns!==value)form.style.gridTemplateColumns=value;const title=cells.findIndex(c=>c.dataset.column==='title')+1||(target==='main'?(draft.hideProject?2:3):target==='work'?2:1);const due=cells.findIndex(c=>c.textContent.includes('마감'))+1||cells.length-1;form.style.setProperty('--entry-title',title);form.style.setProperty('--entry-due',due);form.style.setProperty('--entry-end',cells.length);};align();if(window.ResizeObserver){resize=new window.ResizeObserver(align);resize.observe(table);[...table.tHead.rows[0].cells].forEach(c=>resize.observe(c));}

   }
   if(active)continue;
   const edge=document.createElement('div');edge.className='table-add-edge';edge.innerHTML=`<button type="button" data-batch-edge="${target}" aria-label="목록 끝에 할 일 추가">${icon('plus')}<span>할 일 추가</span></button>`;table.parentElement.after(edge);
  }
  if(draft&&!document.querySelector('[data-task-composer]')){const host=document.querySelector('.workspace-content');if(host){const row=document.createElement('div');row.className='task-entry-row';row.innerHTML=view();host.append(row);}}
 }
 document.addEventListener('click',e=>{const edge=e.target.closest('[data-batch-edge]');if(edge)open({target:edge.dataset.batchEdge});});
 return {view,open,mount,reset(){draft=null;drafts.clear();resize?.disconnect();}};
}
