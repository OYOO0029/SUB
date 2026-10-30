import {activeProject} from './project-options.js';
import {choiceSelect} from './ui-components.js?v=20261030-explicit-schedule-1';
import {createTaskBatch} from './editing.js?v=20261030-compact-lists-3';
import {today} from './model.js?v=20261030-explicit-schedule-1';
export function createTaskComposer({getData,getScope,render,save,esc,icon,notify,getContext=()=>({})}){
 let includeInactive=false;let draft=null,resize=null,contextToken=null,composing=false,compositionEnded=0;const drafts=new Map();
 function view(){if(!draft)return '';const project=getData().projects.find(p=>p.id===draft.projectId);
 return `<form class="task-composer" data-task-composer>${!draft.hideProject?`<div class="batch-project">${choiceSelect(draft.projectId,[['','프로젝트 선택'],...getData().projects.filter(p=>!p.deletedAt&&(includeInactive||activeProject(p)||p.id===draft.projectId)).map(p=>[p.id,p.title])],'data-batch-project','추가 대상 프로젝트')}<label class="project-state-toggle"><input type="checkbox" data-batch-inactive ${includeInactive?'checked':''}> 완료·취소·보류 포함</label></div>`:''}<div class="batch-title"><textarea name="titles" rows="1" ${draft.pending?'readonly':''} aria-label="추가할 할 일" placeholder="할 일 입력 후 Enter" required>${esc(draft.text)}</textarea></div><div class="batch-due"><span class="ux-empty">-</span></div><div class="batch-actions"><button type="submit" class="icon-button batch-submit" aria-label="할 일 저장" title="저장">${icon('check')}</button><button type="button" class="icon-button batch-close" data-batch-close aria-label="연속 추가 닫기" title="닫기">${icon('close')}</button></div><span class="batch-status" role="status">${esc(draft.message||'')}</span><p role="alert" class="form-error">${esc(draft.error||'')}</p></form>`;}
 const draftKey=d=>JSON.stringify([d.owner,d.target,d.projectId||'',d.workId||'']);
 const contextKey=()=>{const c=getContext(),w=getData().works.find(x=>x.id===c.workId);return draftKey({owner:getScope(),target:c.target||'main',projectId:w?.projectId||c.projectId||'',workId:w?.id||''});};
 function stash(){if(!draft)return;const key=draftKey(draft);if(draft.text.trim()||draft.pending)drafts.set(key,draft);else drafts.delete(key);}
 function open(opts={}){
  opts={...getContext(),...Object.fromEntries(Object.entries(opts).filter(([,v])=>v!==undefined))};
  const w=getData().works.find(x=>x.id===opts.workId&&!x.deletedAt);
  const date=null;
  const next={owner:getScope(),projectId:w?.projectId||opts.projectId||'',workId:w?.id||'',target:opts.target||'main',todaySelected:opts.todaySelected??((opts.target||'main')==='main'),defaultDate:date,startDate:date,due:null,text:'',hideProject:!!opts.projectId||!!w};
  contextToken=contextKey();stash();draft=drafts.get(draftKey(next))||next;draft.hideProject=next.hideProject;render();focusInput();
 }
 function close(){if(draft)drafts.delete(draftKey(draft));draft=null;render();}
 document.addEventListener('click',e=>{if(draft&&e.target.closest('[data-batch-close]'))close();});
 window.addEventListener('task-project-context',e=>{if(draft?.target==='main'){stash();draft=null;}const saved=drafts.get(draftKey({owner:getScope(),target:'main',projectId:e.detail||'',workId:''}));if(saved){draft=saved;draft.hideProject=!!e.detail;} });
 document.addEventListener('change',e=>{if(e.target.matches('[data-batch-inactive]')){includeInactive=e.target.checked;render();return;}if(e.target.matches('[data-batch-project]')&&draft&&!draft.pending){draft.projectId=e.target.value;return;}if(e.target.matches('[data-task-scope]')&&draft?.target==='main'&&!draft.pending){draft.defaultDate=getContext().date||today();draft.startDate=draft.defaultDate;}});
 document.addEventListener('input',e=>{if(e.target.matches('[data-task-composer] textarea')&&draft)draft.text=e.target.value;});
 document.addEventListener('submit',e=>{if(!e.target.matches('[data-task-composer]'))return;e.preventDefault();if(!draft||!getScope()||draft.owner!==getScope()||composing||Date.now()-compositionEnded<80)return;try{if(!draft.projectId)throw Error('프로젝트를 선택해 주세요.');if(!draft.text.trim()&&!draft.pending)return;if(draft.projectId&&!getData().projects.some(p=>p.id===draft.projectId&&!p.deletedAt)||draft.workId&&!getData().works.some(w=>w.id===draft.workId&&!w.deletedAt&&(w.projectId||'')===draft.projectId))throw Error('추가할 프로젝트 또는 업무가 변경되었습니다. 입력을 보관하고 다시 열어 주세요.');const count=draft.pending||createTaskBatch(getData(),draft.text,draft).length;draft.pending=count;if(save()===false)throw Error('저장하지 못했습니다. 추가 버튼으로 다시 저장하세요.');draft.pending=null;draft.text='';draft.error='';draft.message=`${count}개 추가됨`;draft.startDate=draft.defaultDate;draft.due=null;window.dispatchEvent(new window.CustomEvent('task-batch-saved',{detail:{target:draft.target}}));render();focusInput();notify('할 일을 추가했습니다.');}catch(err){draft.error=err.message;render();}});
 document.addEventListener('keydown',e=>{if(!e.target.closest('[data-task-composer]'))return;if(e.key==='Enter'&&!e.shiftKey&&e.target.tagName==='TEXTAREA'){e.preventDefault();if(!e.repeat&&!composing&&!e.isComposing&&e.keyCode!==229&&Date.now()-compositionEnded>80)e.target.form.requestSubmit();}else if(e.key==='Escape'&&!draft?.text.trim()){e.preventDefault();close();}});
 document.addEventListener('compositionstart',e=>{if(e.target.closest('[data-task-composer]'))composing=true;});
 document.addEventListener('compositionend',e=>{if(e.target.closest('[data-task-composer]')){composing=false;compositionEnded=Date.now();}});
 function focusInput(){const input=document.querySelector('[data-task-composer] textarea');input?.scrollIntoView?.({block:'nearest',inline:'nearest'});input?.focus({preventScroll:true});}
 function mount(){
  const currentContext=contextKey();if(contextToken!==null&&contextToken!==currentContext){stash();draft=drafts.get(currentContext)||null;}contextToken=currentContext;
  resize?.disconnect();
  document.querySelectorAll('.task-entry-row,.table-add-edge,.task-entry-body').forEach(e=>e.remove());
  const targets=[...document.querySelectorAll('.tt-screen table[data-list-key="today"],.tt-remaining table,.project-task-table')];
  for(const table of targets){
   const target=['remaining','overdue'].includes(table.dataset.listKey)?table.dataset.listKey:table.matches('.wd-table')?'work':table.matches('.project-task-table')?'project':'main';
   const active=draft&&draft.target===target;
   const empty=table.querySelector('td.tt-empty,td.pl-empty');
   if(empty)empty.parentElement.hidden=!!active;
   if(!active&&empty&&!empty.querySelector('button:not([data-batch-edge])')){empty.innerHTML=`<button type="button" class="table-empty-add" data-batch-edge="${target}" aria-label="할 일 추가">${icon('plus')}<span>할 일 추가</span></button>`;continue;}
   if(active){let body=[...table.tBodies].find(b=>draft.workId&&b.dataset.workGroup===draft.workId)||table.tBodies[table.tBodies.length-1]||table.createTBody();
    if(target==='project'&&!draft.workId){body=table.createTBody();body.className='task-entry-body';}
    const row=body.insertRow();row.className='task-entry-row';const cell=row.insertCell();cell.colSpan=table.tHead?.rows[0]?.cells.length||5;cell.innerHTML=view();const form=cell.querySelector('form');form.dataset.entryTarget=target;
    const align=()=>{const cells=[...table.tHead.rows[0].cells];const widths=cells.map(c=>c.getBoundingClientRect().width);if(!widths.every(w=>w>0))return;const value=widths.map(w=>w+'px').join(' ');if(form.style.gridTemplateColumns!==value)form.style.gridTemplateColumns=value;const title=cells.findIndex(c=>c.dataset.column==='title')+1||(target==='main'?(draft.hideProject?2:3):target==='work'?2:1);const projectColumn=cells.findIndex(c=>c.dataset.column==='project')+1;form.style.setProperty('--entry-project',projectColumn||3);const due=cells.findIndex(c=>c.textContent.includes('작업일자'))+1||cells.length-1;form.style.setProperty('--entry-title',title);form.style.setProperty('--entry-due',due);form.style.setProperty('--entry-end',cells.length);};align();if(window.ResizeObserver){resize=new window.ResizeObserver(align);resize.observe(table);[...table.tHead.rows[0].cells].forEach(c=>resize.observe(c));}

   }
   if(active)continue;
   const edge=document.createElement('div');edge.className='table-add-edge';edge.innerHTML=`<button type="button" data-batch-edge="${target}" aria-label="목록 끝에 할 일 추가">${icon('plus')}<span>할 일 추가</span></button>`;table.parentElement.after(edge);
  }
  if(draft&&!document.querySelector('[data-task-composer]')){const host=document.querySelector('.workspace-content');if(host){const row=document.createElement('div');row.className='task-entry-row';row.innerHTML=view();host.append(row);}}
 }
 document.addEventListener('click',e=>{const edge=e.target.closest('[data-batch-edge]');if(edge)open({target:edge.dataset.batchEdge,todaySelected:edge.dataset.batchEdge==='main'});});
 return {view,open,mount,reset(){draft=null;contextToken=null;drafts.clear();resize?.disconnect();}};
}
