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

test('today table filters, real task edits, clipboard sanitizing, account reset and timer isolation',async()=>{
 const dom=new JSDOM('<main id="app"></main>',{url:'https://fixture.invalid',pretendToBeVisual:true});
 const keys=['window','document','FormData','FileReader'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const k of keys)Object.defineProperty(globalThis,k,{value:dom.window[k],writable:true,configurable:true});
 try{
  let owner='test',saves=0;const data=emptyWorkState(),date=today(),ui={date},p=createItem(data,'project','검수 프로젝트');
  const a=createItem(data,'task','이미지 붙여넣기',{date,projectId:p.id}),b=createItem(data,'task','단발성 검수',{date});a.due=date;a.notes='원본 메모';a.checks.push({id:'c1',title:'원본 하위 항목',done:false});
  const timer=createFocusTimer({storage:dom.window.localStorage,getScope:()=>owner});let view;const render=()=>document.querySelector('#app').innerHTML=view.screen();
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  view=createTodayTable({images:{async upload(file){return {bucket:'work-images',path:'test/image.png',mime:file.type,size:file.size}},async url(){return 'blob:fixture'}},getData:()=>data,getScope:()=>owner,ui,esc,icon:()=>'',timer,render,save:()=>{validate(data);saves++},notify(){},flow:{row:()=>''}});
  const click=s=>{assert(document.querySelector(s),s);document.querySelector(s).click()},change=(s,v)=>{const el=document.querySelector(s);el.value=v;el.dispatchEvent(new dom.window.Event('change',{bubbles:true}))};
  render();assert.deepEqual([...document.querySelectorAll('th')].map(t=>t.textContent.trim()),['','프로젝트','할 일','마감','집중']);
  assert.equal(document.querySelector('[data-today-status]').value,'all');b.status='done';render();assert.equal(view.items().length,2);change('[data-today-status]','done');assert.deepEqual(view.items().map(t=>t.id),[b.id]);change('[data-today-status]','active');assert.deepEqual(view.items().map(t=>t.id),[a.id]);view.reset();render();assert.equal(document.querySelector('[data-today-status]').value,'all');assert.equal(view.items().length,2);b.status='todo';render();
  click('[data-key="project"]');change('[data-tt-filter="project"]',p.id);assert.equal(view.items().length,1);assert.equal(view.items()[0].id,a.id);
  click('[data-tt="clear-column"]');assert.equal(view.items().length,2);click('[data-tt="sort"][data-value="project"]');
  click(`[data-tt-row="${a.id}"] td:nth-child(2)`);change('[data-tt-title]','수정된 할 일');assert.equal(a.title,'수정된 할 일');assert(document.querySelector('.tt-panel [data-action="delete-task"]'));click('[data-tt="add-check"]');document.querySelector('[data-tt-add-check] input').value='새 하위 항목';document.querySelector('[data-tt-add-check]').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(a.checks.length,2);
  change('[data-tt-check-title="c1"]','수정된 항목');assert.equal(a.checks[0].title,'수정된 항목');click('[data-tt="delete-check"][data-check="c1"]');assert(a.checks[0].deletedAt);
  const editor=document.querySelector('[data-tt-memo]');editor.focus();const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);window.getSelection().removeAllRanges();window.getSelection().addRange(range);
  const paste=new dom.window.Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(paste,'clipboardData',{value:{items:[],getData:()=>'<script>unsafe</script>'}});editor.dispatchEvent(paste);assert(!editor.querySelector('script'));assert(a.notes.includes('<script>unsafe</script>'));
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=';
  const imagePaste=new dom.window.Event('paste',{bubbles:true,cancelable:true}),file=new dom.window.File([Buffer.from(png,'base64')],'test.png',{type:'image/png'});Object.defineProperty(imagePaste,'clipboardData',{value:{items:[{type:'image/png',getAsFile:()=>file}]}});editor.dispatchEvent(imagePaste);await new Promise(r=>setTimeout(r,35));assert.equal(editor.querySelectorAll('img').length,0);validate(data);
  a.memoParts=[{text:a.notes},{image:'data:image/png;base64,'+png}];a.memoText=a.notes;
  click(`[data-tt-row="${b.id}"] td:nth-child(2)`);click(`[data-tt-row="${a.id}"] td:nth-child(2)`);assert(document.querySelector('.tt-saved-images img'));assert(!document.querySelector('[data-tt-memo] img'));
  const restored=document.querySelector('[data-tt-memo]');restored.textContent='수정된 텍스트';restored.dispatchEvent(new dom.window.Event('input',{bubbles:true}));assert(a.memoParts.some(p=>p.image||p.asset));assert.equal(a.notes,'수정된 텍스트');
  const original=JSON.stringify(data);click(`[data-tt="focus"][data-id="${a.id}"]`);change('[data-tt-clock]','37');click('[data-tt="start"]');assert(timer.read().running);assert.equal(timer.read().minutes,37);click(`[data-tt="focus"][data-id="${b.id}"]`);click('[data-tt="start"]');assert.equal(timer.read().taskId,a.id);assert(document.querySelector('[data-tt-error]').textContent);assert.equal(JSON.stringify(data),original);
  view.reset();const future=addDays(date,2),r1=createItem(data,'task','Zulu remaining',{date:future,projectId:p.id}),r2=createItem(data,'task','Alpha remaining',{date:future});r1.due=future;r2.due=future;render();
  const remainingRows=()=>[...document.querySelectorAll('table[aria-label="남은 할 일"] [data-tt-row]')].map(e=>e.dataset.ttRow);
  click('[data-scope="remaining"][data-key="project"]');change('[data-tt-filter="project"]',p.id);assert.deepEqual(remainingRows(),[r1.id]);assert.equal(view.items().length,2);
  click('[data-tt="clear-column"]');click('[data-scope="remaining"][data-key="sort"]');click('[data-tt="sort"][data-value="title"]');assert.deepEqual(remainingRows(),[r2.id,r1.id]);
  click('[data-scope="remaining"][data-key="due"]');change('[data-tt-filter="due"]','none');assert.equal(remainingRows().length,0);click('[data-tt="clear-remaining"]');assert.equal(remainingRows().length,2);assert.equal(r1.due,future);
  owner='other';view.reset();render();assert(!document.querySelector('.tt-panel'));assert(!document.querySelector('.tt-mini'));assert(saves>=5);
 }finally{dom.window.close();for(const k of keys){const d=old.get(k);if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});

test('deadline labels show weekday, cross-year date and relative calendar days',()=>{
 assert.equal(deadlineLabel('2026-10-26','absolute','2026-10-26'),'10/26(월)');
 assert.equal(deadlineLabel('2027-01-01','absolute','2026-10-26'),'2027/1/1(금)');
 assert.equal(deadlineLabel('2026-10-26','relative','2026-10-26'),'오늘');
 assert.equal(deadlineLabel('2026-10-29','relative','2026-10-26'),'D-3');
 assert.equal(deadlineLabel('2026-10-25','relative','2026-10-26'),'D+1');
});
