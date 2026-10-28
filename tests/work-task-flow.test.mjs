import test from 'node:test';
import assert from 'node:assert/strict';
import {createItem,createTaskBatch,updateItem,updateMemo} from '../work/editing.js';
import {emptyWorkState} from '../work/work-account.mjs';
import {validate} from '../work/repository.js';
import {executionSections} from '../work/workflow.js';
import {isPlanned,planToday,taskStart,today} from '../work/model.js';
import {calendarWeeks,workCalendarDays} from '../work/calendar-layout.js';
test('batch creation is atomic and inherits relationships without assigning today',()=>{
 const d=emptyWorkState(),p=createItem(d,'project','프로젝트'),w=createItem(d,'work','업무',{projectId:p.id});
 const before=JSON.stringify(d);assert.throws(()=>createTaskBatch(d,'정상\n'+'x'.repeat(161),{workId:w.id}));assert.equal(JSON.stringify(d),before);
 const xs=createTaskBatch(d,'첫째\n둘째',{workId:w.id,startDate:'2026-11-04',due:'2026-11-14'});assert.equal(xs.length,2);assert(xs.every(t=>t.workId===w.id&&t.plans.length===0&&t.startDate==='2026-11-04'&&t.due==='2026-11-14'));
 assert.equal(executionSections(d,'2026-11-03').planned.length,0);assert.equal(executionSections(d,'2026-11-04').planned.length,2);assert.equal(executionSections(d,'2026-11-15').planned.length,2);
 const [unplanned]=createTaskBatch(d,'미정',{due:'2026-11-04'});assert(!isPlanned(unplanned,'2026-11-04'));assert(!executionSections(d,'2026-11-04').planned.includes(unplanned));planToday(unplanned,'2026-11-05');assert.equal(unplanned.startDate,'2026-11-05');assert.equal(unplanned.due,'2026-11-04');validate(d);
});
test('start edits preserve legacy plans, blocks, checks, notes, deadline and reload data',()=>{
 const d=emptyWorkState(),t=createItem(d,'task','기존',{date:'2026-10-20'});t.due='2026-11-14';t.blocks.push({id:'block',date:'2026-10-20',start:'10:00',end:'11:00'});t.checks.push({id:'check',title:'하위',done:false});t.notes='보존';
 const original=structuredClone(t);assert.equal(taskStart(t),'2026-10-20');updateItem(d,'task',t.id,{startDate:'2026-11-04'});assert.equal(isPlanned(t,'2026-10-27'),false);for(const k of ['plans','blocks','checks','notes','due'])assert.deepEqual(t[k],original[k]);
 const snapshot=JSON.stringify(d);assert.throws(()=>updateItem(d,'task',t.id,{startDate:'2026-11-15'}));assert.equal(JSON.stringify(d),snapshot);validate(JSON.parse(snapshot));
 const weeks=calendarWeeks([t],workCalendarDays('2026-11-04'));assert(weeks[0].segments.some(s=>s.task.id===t.id));
 updateItem(d,'task',t.id,{startDate:null});assert.equal(taskStart(t),null);assert.equal(t.due,'2026-11-14');assert.equal(t.blocks.length,1);
});
import {JSDOM} from 'jsdom';
import {createTaskComposer} from '../work/task-composer.js';
import {createDetailUI} from '../work/detail-ui.js';
import {setTime} from '../work/model.js';
test('continuous composer retains project, batches lines, preserves failed-save draft and prevents duplicate retry',()=>{
 const dom=new JSDOM('<main id="app"></main>',{url:'https://fixture.invalid'}),keys=['window','document','FormData'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const k of keys)Object.defineProperty(globalThis,k,{value:dom.window[k],configurable:true,writable:true});
 try{const data=emptyWorkState(),p=createItem(data,'project','Project');let composer,ok=true,owner='a';const render=()=>document.querySelector('#app').innerHTML=composer.view();
 composer=createTaskComposer({getData:()=>data,getScope:()=>owner,render,save:()=>ok,esc:v=>String(v??''),icon:()=>'',notify(){}});composer.open({projectId:p.id});
 const submit=text=>{const el=document.querySelector('textarea');el.value=text;el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));el.form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));};
 submit('A\nB');assert.equal(data.tasks.length,2);assert(data.tasks.every(t=>t.projectId===p.id&&t.startDate===today()&&t.plans.length===0));assert.equal(document.querySelector('textarea').value,'');assert.equal(document.querySelector('.batch-project').textContent,'Project');
 ok=false;submit('C');assert.equal(data.tasks.length,3);assert.equal(document.querySelector('textarea').value,'C');assert(document.querySelector('[role=alert]').textContent.includes('저장하지 못'));
 ok=true;submit('C');assert.equal(data.tasks.length,3);assert.equal(document.querySelector('textarea').value,'');owner='b';submit('다른 계정');assert.equal(data.tasks.length,3);
 }finally{dom.window.close();for(const k of keys){const d=old.get(k);if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});
test('single task detail edits text and checks without losing memo attachments or dates',()=>{
 const dom=new JSDOM('<dialog id="detail"></dialog><dialog id="editor"></dialog><dialog id="property-editor"></dialog>',{url:'https://fixture.invalid'}),keys=['window','document','FormData','CustomEvent'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const k of keys)Object.defineProperty(globalThis,k,{value:dom.window[k],configurable:true,writable:true});dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false};
 try{const data=emptyWorkState(),[t]=createTaskBatch(data,'제목',{startDate:'2026-11-04',due:'2026-11-14'});t.notes='old';t.memoParts=[{text:'old'},{image:'data:image/png;base64,iVBORw0KGgo='}];
 const ui={date:'2026-10-27'},button=(l,a,attrs='',cls='')=>`<button data-action="${a}" class="${cls}" ${attrs}>${l}</button>`;
 const view=createDetailUI({getData:()=>data,ui,esc:v=>String(v??''),icon:()=>'',button,property:(l,i,v)=>`<div>${l}${v}</div>`,taskCard:()=>'',workCard:()=>'',save(){},notify(){}});view.open('task',t.id);
 assert(document.querySelector('textarea[data-inline-field=title]'));assert.equal(document.querySelectorAll('[data-action=detail]').length,0);assert(document.querySelector('[data-field=startDate]'));assert(document.querySelector('[data-field=due]'));
 const memo=document.querySelector('[data-inline-field=notes]');memo.value='new text';memo.dispatchEvent(new dom.window.Event('change',{bubbles:true}));assert.equal(t.notes,'new text');assert.equal(t.memoParts[1].image,'data:image/png;base64,iVBORw0KGgo=');assert.equal(t.startDate,'2026-11-04');assert.equal(t.due,'2026-11-14');
 setTime(t,'2026-11-10','09:00','10:00');assert.equal(t.startDate,'2026-11-04');assert.equal(t.due,'2026-11-14');
 }finally{dom.window.close();for(const k of keys){const d=old.get(k);if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});
test('inline composer mounts last without idle space, defaults today, preserves draft and resets dates per context',()=>{
 const dom=new JSDOM('<main class="workspace-content"></main>',{url:'https://fixture.invalid'}),keys=['window','document','FormData'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const k of keys)Object.defineProperty(globalThis,k,{value:dom.window[k],configurable:true,writable:true});
 try{const data=emptyWorkState(),p=createItem(data,'project','Project'),w=createItem(data,'work','Work',{projectId:p.id});let composer;
 const render=()=>{document.querySelector('main').innerHTML='<section class="tt-screen"><div class="tt-table-wrap"><table><thead><tr><th></th><th>project</th><th>title</th><th>due</th><th>focus</th></tr></thead><tbody><tr class="existing"><td colspan="5">existing</td></tr></tbody></table></div></section>';composer.mount();};
 composer=createTaskComposer({getData:()=>data,getScope:()=> 'a',getContext:()=>({date:'2026-10-27',target:'main'}),render,save:()=>true,esc:v=>String(v??''),icon:()=>'',notify(){}});render();assert.equal(document.querySelectorAll('.task-entry-row').length,0);
 document.querySelector('[data-batch-edge]').click();assert(document.querySelector('tbody>tr:last-child [data-task-composer]'));assert.equal(document.querySelectorAll('.table-add-edge').length,0);assert(document.querySelector('.batch-title textarea'));assert.equal(document.querySelectorAll('[data-batch-date],[data-batch-keep],[data-batch-field]').length,0);
 const input=text=>{const el=document.querySelector('textarea');el.value=text;el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));return el;};
 input('draft');document.body.click();render();assert.equal(document.querySelector('textarea').value,'draft');composer.open();assert.equal(document.querySelector('textarea').value,'draft');
 input('Today default').form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(data.tasks[0].startDate,'2026-10-27');
 input('Today').form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(data.tasks[1].startDate,'2026-10-27');assert.equal(data.tasks[1].due,null);
 composer.reset();composer.open({workId:w.id,date:null});input('Project A\nProject B').form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));assert(data.tasks.slice(2).every(t=>t.workId===w.id&&data.works.find(x=>x.id===t.workId).projectId===p.id&&t.startDate===today()));
 const before=data.tasks.length;const el=input('한글');el.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true}));assert.equal(data.tasks.length,before);el.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(document.querySelector('textarea').value,'한글');
 input('').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(document.querySelectorAll('.task-entry-row').length,0);
 }finally{dom.window.close();for(const k of keys){const d=old.get(k);if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});
