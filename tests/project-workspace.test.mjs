import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createProjectWorkspace} from '../work/project-workspace.js';
import {emptyWorkState,mergeWorkData} from '../work/work-account.mjs';
import {createItem,createTaskBatch} from '../work/editing.js';
import {validate} from '../work/repository.js';
test('three project views share tasks; group and ungroup do not duplicate; tabs reset selection',()=>{
 const dom=new JSDOM('<main></main>',{url:'https://fixture.invalid'}),keys=['window','document','FormData','CustomEvent'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const k of keys)Object.defineProperty(globalThis,k,{value:dom.window[k],configurable:true,writable:true});
 try{
 const data=emptyWorkState(),p=createItem(data,'project','P'),q=createItem(data,'project','Q'),xs=createTaskBatch(data,'A\nB',{projectId:p.id});const ui={tab:'projects',projectPage:p.id,projectPageTab:'groups'};let view;const errors=[];
 const render=()=>document.querySelector('main').innerHTML=view.view();view=createProjectWorkspace({getData:()=>data,ui,render,save:()=>true,notify:e=>errors.push(e),tabs:()=>'',selectedProject:()=>''});render();assert.equal(document.querySelector('[data-group-assign]'),null);
 for(const t of xs){const c=document.querySelector('[data-group-select="'+t.id+'"]');c.checked=true;c.dispatchEvent(new window.Event('change',{bubbles:true}));}
 const form=document.querySelector('[data-group-assign]');form.elements.title.value='Work';form.dispatchEvent(new window.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:form.querySelector('[name=create]')}));
 assert.equal(errors.length,0);assert.equal(document.querySelector('[data-group-assign]'),null);assert(document.querySelector('.work-linked-tasks'));assert(!document.querySelector('.work-metadata').open);assert(document.querySelector('.work-group-count').textContent.includes('2개'));assert.equal(data.works.length,1);assert.equal(data.tasks.length,2);assert(data.tasks.every(t=>t.workId===data.works[0].id));
 const c=document.querySelector('[data-group-select="'+xs[0].id+'"]');c.checked=true;c.dispatchEvent(new window.Event('change',{bubbles:true}));document.querySelector('[data-unlink-selected]').click();assert.equal(data.tasks[0].workId,null);assert.equal(data.tasks[0].projectId,p.id);
 ui.projectPageTab='wbs';render();assert(document.querySelector('table').textContent.includes('Work'));assert(!document.querySelector('[data-group-select]'));
 ui.projectPageTab='tasks';render();assert.equal(document.querySelectorAll('[data-list-title]').length,2);assert(!document.querySelector('[data-group-select]'));
 window.dispatchEvent(new window.CustomEvent('task-project-context',{detail:q.id}));render();assert.equal(document.querySelectorAll('[data-list-title]').length,0);validate(data);
 }finally{dom.window.close();for(const k of keys){const d=old.get(k);if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});
test('backup import retains today order and refuses conflicting order without mutation',()=>{
 const source=emptyWorkState();source.todayOrder=createTaskBatch(source,'A\nB',{todaySelected:true}).map(t=>t.id);const merged=mergeWorkData(emptyWorkState(),source,validate);assert.deepEqual(merged.todayOrder,source.todayOrder);
 const before=JSON.stringify(merged),incoming=structuredClone(merged);incoming.todayOrder.reverse();assert.throws(()=>mergeWorkData(merged,incoming,validate));assert.equal(JSON.stringify(merged),before);
});
