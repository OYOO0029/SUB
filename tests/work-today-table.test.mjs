import {deadlineLabel} from '../work/date-picker.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createTodayTable} from '../work/today-table.js';
import {createFocusTimer} from '../work/focus-timer.js';
import {createItem} from '../work/editing.js';
import {emptyWorkState} from '../work/work-account.mjs';
import {validate} from '../work/repository.js';
import {today,addDays} from '../work/model.js';

test('today table filters, unified detail entry, remaining separation and timer isolation',async()=>{
 const dom=new JSDOM('<main id="app"></main>',{url:'https://fixture.invalid',pretendToBeVisual:true});
 const keys=['window','document','FormData','FileReader','CustomEvent'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const k of keys)Object.defineProperty(globalThis,k,{value:dom.window[k],writable:true,configurable:true});
 try{
  let owner='test',saves=0;const data=emptyWorkState(),date=today(),ui={date},p=createItem(data,'project','검수 프로젝트');
  const a=createItem(data,'task','이미지 붙여넣기',{date,projectId:p.id}),b=createItem(data,'task','단발성 검수',{date});a.due=date;a.notes='원본 메모';a.checks.push({id:'c1',title:'원본 하위 항목',done:false});
  const timer=createFocusTimer({storage:dom.window.localStorage,getScope:()=>owner});let view;const render=()=>document.querySelector('#app').innerHTML=view.screen();
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  view=createTodayTable({images:{async upload(file){return {bucket:'work-images',path:'test/image.png',mime:file.type,size:file.size}},async url(){return 'blob:fixture'}},getData:()=>data,getScope:()=>owner,ui,esc,icon:()=>'',timer,render,save:()=>{validate(data);saves++},notify(){},flow:{row:()=>''}});
  const click=s=>{assert(document.querySelector(s),s);document.querySelector(s).click()},change=(s,v)=>{const el=document.querySelector(s);el.value=v;el.dispatchEvent(new dom.window.Event('change',{bubbles:true}))};
  a.todaySelected=true;b.todaySelected=true;
  render();assert.deepEqual([...document.querySelectorAll('table[aria-label="오늘 할 일"] th')].map(t=>t.textContent.trim()),['','할 일','프로젝트','상태','작업일자','']);
  assert.equal(view.addContext().date,null);assert.equal(view.addContext().todaySelected,true);assert(!document.querySelector('[data-today-status],[data-task-scope]'));
  b.status='done';render();assert.deepEqual(view.items().map(t=>t.id),[a.id]);b.status='todo';render();
  click('[data-list-menu="status"][data-list-key="today"]');change('[data-tt-filter="status"]','waiting');assert.deepEqual(view.items().map(t=>t.id),[a.id]);change('[data-tt-filter="status"]','');click('[data-tt="close-menu"]');
  assert(document.querySelector('[data-action="detail"][data-id="'+a.id+'"]'));
  const original=JSON.stringify(data);click('[data-tt="focus"][data-id="'+a.id+'"]');change('[data-tt-clock]','37');click('[data-tt="start"]');assert(timer.read().running);assert.equal(timer.read().minutes,37);click('[data-tt="focus"][data-id="'+b.id+'"]');click('[data-tt="start"]');assert.equal(timer.read().taskId,a.id);assert(document.querySelector('[data-tt-error]').textContent);assert.equal(JSON.stringify(data),original);
  view.reset();const past=createItem(data,'task','late',{projectId:p.id});past.due=addDays(date,-1);past.todaySelected=true;const undated=createItem(data,'task','undated'),future=createItem(data,'task','future');future.startDate=addDays(date,2);render();
  const ids=label=>[...document.querySelectorAll('table[aria-label="'+label+'"] [data-tt-row]')].map(e=>e.dataset.ttRow);
  assert.deepEqual(ids('기한 지난 일'),[past.id]);assert.deepEqual(ids('남은 할 일'),[undated.id,future.id]);assert.equal(new Set([...ids('오늘 할 일'),...ids('남은 할 일'),...ids('기한 지난 일')]).size,5);
  owner='other';view.reset();render();assert(!document.querySelector('.tt-panel'));assert(!document.querySelector('.tt-mini'));validate(data);
 }finally{dom.window.close();for(const k of keys){const d=old.get(k);if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});

test('deadline labels show weekday, cross-year date and relative calendar days',()=>{
 assert.equal(deadlineLabel('2026-10-26','absolute','2026-10-26'),'10/26(월)');
 assert.equal(deadlineLabel('2027-01-01','absolute','2026-10-26'),'2027/1/1(금)');
 assert.equal(deadlineLabel('2026-10-26','relative','2026-10-26'),'오늘');
 assert.equal(deadlineLabel('2026-10-29','relative','2026-10-26'),'D-3');
 assert.equal(deadlineLabel('2026-10-25','relative','2026-10-26'),'D+1');
});

import {createTaskComposer} from '../work/task-composer.js';
test('project tabs filter work-linked tasks, inherit new tasks and isolate drafts, preferences and records',()=>{
 const dom=new JSDOM('<main id="app" class="workspace-content"></main>',{url:'https://fixture.invalid'}),keys=['window','document','FormData','CustomEvent'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const k of keys)Object.defineProperty(globalThis,k,{value:dom.window[k],writable:true,configurable:true});
 try{let owner='a',table,composer;const data=emptyWorkState(),date=today(),ui={date,view:'list'},a=createItem(data,'project','Alpha'),b=createItem(data,'project','Beta'),emptyProject=createItem(data,'project','Empty'),w=createItem(data,'work','Linked',{projectId:a.id});
 const linked=createItem(data,'task','Linked task',{date,workId:w.id}),other=createItem(data,'task','Other task',{date,projectId:b.id});linked.todaySelected=true;other.todaySelected=true;const original=JSON.stringify(data);
 const render=()=>{document.querySelector('main').innerHTML=table.screen();composer?.mount();},esc=v=>String(v??'');
 table=createTodayTable({getData:()=>data,getScope:()=>owner,ui,esc,icon:()=>'',timer:createFocusTimer({storage:dom.window.localStorage,getScope:()=>owner}),render,save:()=>true,notify(){}});
 composer=createTaskComposer({getContext:()=>({target:'main',...table.addContext()}),getData:()=>data,getScope:()=>owner,render,save:()=>true,esc,icon:()=>'',notify(){}});render();
 const choose=id=>document.querySelector(`[data-task-project="${id}"]`).click(),input=text=>{const e=document.querySelector('textarea');e.value=text;e.dispatchEvent(new window.Event('input',{bubbles:true}));return e;},submit=()=>document.querySelector('form[data-task-composer]').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 choose(emptyProject.id);assert(document.querySelector('.table-empty-add'));assert.equal(document.querySelectorAll('.table-add-edge').length,0);document.querySelector('.table-empty-add').click();assert(document.querySelector('textarea'));assert(document.querySelector('.tt-empty').parentElement.hidden);assert.equal(data.tasks.length,2);document.querySelector('[data-batch-close]').click();assert(!document.querySelector('.tt-empty').parentElement.hidden);
 choose(a.id);assert.deepEqual(table.items().map(t=>t.id),[linked.id]);assert.equal(document.querySelectorAll('th[data-column=project]').length,0);assert.equal(table.addContext().projectId,a.id);assert.equal(JSON.stringify(data),original);
 composer.open();assert.equal(document.querySelectorAll('[data-batch-field],[data-batch-date],.batch-context,.batch-project').length,0);input('A draft');choose(b.id);assert(!document.querySelector('textarea'));composer.open();input('B first\nB second');submit();assert(data.tasks.slice(2).every(t=>t.projectId===b.id&&t.startDate===null&&t.due===null&&t.todaySelected));
 choose(a.id);assert.equal(document.querySelector('textarea').value,'A draft');submit();assert.equal(data.tasks.at(-1).projectId,a.id);assert(!data.tasks.at(-1).workId);
 const row=document.querySelector('[data-tt-row]');assert.equal(row.querySelector('.row-detail').closest('td'),row.lastElementChild);assert(row.querySelector('.row-delete').compareDocumentPosition(row.querySelector('.row-detail'))&window.Node.DOCUMENT_POSITION_FOLLOWING);
 const pin=document.querySelector(`[data-project-pin="${a.id}"]`);pin.checked=false;pin.dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(table.addContext().projectId,'');assert(document.querySelector('th[data-column=project]'));assert(!document.querySelector(`[data-task-project="${a.id}"]`));
 table.reset();composer.reset();render();assert(!document.querySelector(`[data-task-project="${a.id}"]`));owner='b';table.reset();render();assert(document.querySelector(`[data-task-project="${a.id}"]`));assert.equal(data.tasks.find(t=>t.id===other.id).projectId,b.id);validate(data);
 }finally{dom.window.close();for(const k of keys){const d=old.get(k);if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});
