import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createTaskComposer} from '../work/task-composer.js';
import {taskList} from '../work/task-list.js';
import {emptyWorkState} from '../work/work-account.mjs';
import {createItem} from '../work/editing.js';

test('group add targets its own work, keeps context across Enter, and retries without duplication',()=>{
 const dom=new JSDOM('<main class="workspace-content"></main>',{url:'https://fixture.invalid'});
 const keys=['window','document','FormData'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const k of keys)Object.defineProperty(globalThis,k,{value:dom.window[k],configurable:true,writable:true});
 try{
  const data=emptyWorkState(),p=createItem(data,'project','P'),a=createItem(data,'work','A',{projectId:p.id}),b=createItem(data,'work','B',{projectId:p.id});let composer,ok=true;
  const render=()=>{document.querySelector('main').innerHTML=[a,b].map(w=>taskList(data,data.tasks.filter(t=>t.workId===w.id),{key:'work-linked',project:p.id,workId:w.id})).join('');composer.mount();};
  composer=createTaskComposer({getData:()=>data,getScope:()=> 'fixture',getContext:()=>({target:'project',projectId:p.id}),render,save:()=>ok,esc:v=>String(v??''),icon:()=>'',notify(){}});render();
  document.querySelector('[data-batch-work="'+b.id+'"]').click();
  const enter=text=>{const el=document.querySelector('[data-task-composer] textarea');el.value=text;el.dispatchEvent(new window.Event('input',{bubbles:true}));el.form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));};
  enter('첫째');enter('둘째');ok=false;enter('저장 재시도');assert.equal(data.tasks.length,3);assert.equal(document.querySelector('textarea').value,'저장 재시도');ok=true;enter('저장 재시도');assert.equal(data.tasks.length,3);
  assert(data.tasks.every(t=>t.workId===b.id&&!t.todaySelected&&!t.due&&!t.startDate));
  assert(document.querySelector('[data-compose-work="'+b.id+'"] [data-task-composer]'));assert(!document.querySelector('[data-compose-work="'+a.id+'"] [data-task-composer]'));
  assert.equal(document.querySelectorAll('input[data-list-title]').length,0);assert.equal(document.querySelectorAll('button.list-title-edit[data-action=detail]').length,3);
 }finally{dom.window.close();for(const k of keys){const d=old.get(k);if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});
