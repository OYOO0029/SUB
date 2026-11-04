import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {taskTypes,editTaskType,installTaskTypes} from '../work/task-types.js';
import {emptyWorkState,mergeWorkData} from '../work/work-account.mjs';
import {validate} from '../work/repository.js';
import {createTaskBatch} from '../work/editing.js';
test('task types preserve legacy tasks, stable IDs, dates and backup relations',()=>{
 const d=emptyWorkState(),[t]=createTaskBatch(d,'기존 할 일',{}),before=JSON.stringify(t);assert.equal(taskTypes(d).length,10);assert.equal(JSON.stringify(t),before);const id=editTaskType(d,'add',{name:'접수'});t.typeId=id;editTaskType(d,'rename',{id,name:'제출'});assert.equal(t.typeId,id);assert.throws(()=>editTaskType(d,'add',{name:' 제출 '}));editTaskType(d,'move',{id,direction:-1});assert.equal(taskTypes(d).at(-2).id,id);validate(JSON.parse(JSON.stringify(d)));assert.equal(mergeWorkData(emptyWorkState(),d,validate).tasks[0].typeId,id);editTaskType(d,'delete',{id,replacement:'task-type-0'});assert.equal(t.typeId,'task-type-0');editTaskType(d,'delete',{id:'task-type-0'});assert.equal(t.typeId,null);delete t.typeId;assert.equal(JSON.stringify(t),before);validate(d);
});
test('type editor keeps failed input and rolls back mutations before retry',()=>{
 const dom=new JSDOM('<button data-task-type="t">유형</button>',{url:'https://fixture.invalid'});const keys=['window','document','innerWidth','innerHeight'],old=keys.map(k=>Object.getOwnPropertyDescriptor(globalThis,k));for(const k of keys)Object.defineProperty(globalThis,k,{value:k==='innerWidth'?1000:k==='innerHeight'?800:dom.window[k],configurable:true});dom.window.HTMLDialogElement.prototype.show=function(){this.open=true};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false};
 try{const d={tasks:[{id:'t',title:'할 일'}]},before=JSON.stringify(d);let ok=false;installTaskTypes({getData:()=>d,getScope:()=> 'owner',save:()=>ok,refresh:()=>{}});document.querySelector('[data-task-type]').click();document.querySelector('[data-type-pick="task-type-0"]').click();assert.equal(JSON.stringify(d),before);assert.match(document.querySelector('[role=alert]').textContent,/저장하지/);document.querySelector('[data-type-manage]').click();const input=document.querySelector('[name=name]');input.value='접수';document.querySelector('button[type=submit]').click();assert.equal(input.value,'접수');assert.equal(d.taskTypes,undefined);ok=true;document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(taskTypes(d).filter(x=>x.name==='접수').length,1);
 }finally{dom.window.close();keys.forEach((k,i)=>old[i]?Object.defineProperty(globalThis,k,old[i]):delete globalThis[k]);}
});
