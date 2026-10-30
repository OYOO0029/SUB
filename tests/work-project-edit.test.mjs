import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createDetailUI} from '../work/detail-ui.js';
import {createItem} from '../work/editing.js';
import {emptyWorkState} from '../work/work-account.mjs';

test('unified project properties save to their project and list status changes preserve child tasks',()=>{
 const dom=new JSDOM('<main></main><dialog id="detail"></dialog><dialog id="editor"></dialog><dialog id="property-editor"></dialog>',{url:'https://fixture.invalid'});
 const keys=['window','document','CustomEvent','FormData'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const k of keys)Object.defineProperty(globalThis,k,{value:dom.window[k],configurable:true,writable:true});
 dom.window.HTMLDialogElement.prototype.show=dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false};
 try{
  const data=emptyWorkState(),p=createItem(data,'project','Project'),t=createItem(data,'task','Child',{projectId:p.id}),before=structuredClone(t),ui={projectPage:p.id,detail:null};let saves=0;
  const button=(l,a,attrs='',cls='')=>`<button data-action="${a}" class="${cls}" ${attrs}>${l}</button>`;
  const detail=createDetailUI({getData:()=>data,ui,esc:v=>String(v??''),icon:()=>'',button,property:(l,i,v)=>`<div>${v}</div>`,taskCard:()=>'',workCard:()=>'',save:()=>saves++,notify:()=>{}});
  document.querySelector('main').innerHTML=detail.projectInfo(p);
  const title=document.querySelector('[data-inline-field="title"]');title.focus();title.value='Updated';title.dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(p.title,'Updated');assert.equal(ui.detail.id,p.id);
  detail.changeProjectState(p.id,'paused');assert.equal(p.lifecycle,'active');assert(document.querySelector('#property-editor').open);
  document.querySelector('[data-action="apply-project-state"][data-remove="no"]').click();assert.equal(p.lifecycle,'paused');assert.deepEqual(t,before);assert(saves>=2);
  detail.open('task',t.id);assert.equal(document.querySelector('[data-choice-field="status"]'),null);
  const taskBefore=structuredClone(t);let reminder=document.querySelector('[data-task-reminder]');reminder.checked=true;reminder.dispatchEvent(new window.Event('change',{bubbles:true}));assert(t.remindFrom);
  reminder=document.querySelector('[data-task-reminder]');reminder.checked=false;reminder.dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(t.remindFrom,null);assert.deepEqual({...t,remindFrom:taskBefore.remindFrom},{...taskBefore,remindUntil:null});
  document.querySelector('#detail').close();
  const w=createItem(data,'work','Work',{projectId:p.id});w.stage='기존 단계';t.workId=w.id;const preserved=structuredClone(data);
  detail.open('work',w.id);assert(document.querySelector('[data-field=workPeriod]'));assert(document.querySelector('.detail-extra'));assert(!document.querySelector('.detail-extra').open);assert.equal(document.querySelector('[data-choice-field="stage"]'),null);assert.equal(document.querySelector('[data-action="close-detail"]').getAttribute('aria-label'),'상세 닫기');assert.equal(document.querySelector('.detail-footer'),null);assert.equal(document.querySelector('[data-work-task-status]'),null);assert.equal(document.querySelector('.wd-project,.wd-memo,.detail-eyebrow,[data-save-state]'),null);assert.deepEqual(data,preserved);
  document.querySelector('#detail').close();
  let opened=null;window.addEventListener('work-open-project',e=>opened=e.detail);detail.open('project',p.id);assert.equal(opened,p.id);assert.equal(document.querySelector('#detail').open,false);
 }finally{dom.window.close();for(const k of keys){const d=old.get(k);if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});
