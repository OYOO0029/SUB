import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {projectCandidates,rememberProject,recentProjects,createProjectPicker} from '../work/project-picker.js';
test('recent projects isolate accounts, hide closed projects by default and never rewrite records',()=>{
 const dom=new JSDOM('<button id="anchor">선택</button>',{url:'https://fixture.invalid',pretendToBeVisual:true});
 const keys=['window','document','innerWidth','innerHeight'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const k of keys)Object.defineProperty(globalThis,k,{configurable:true,value:k==='innerWidth'?390:k==='innerHeight'?700:dom.window[k]});
 dom.window.HTMLDialogElement.prototype.show=function(){this.open=true};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false};
 try{const projects=[{id:'a',title:'진행',lifecycle:'active'},{id:'b',title:'완료',lifecycle:'done'},{id:'c',title:'보류',lifecycle:'paused'},{id:'d',title:'삭제',deletedAt:'x'}],before=JSON.stringify(projects);
  rememberProject('one','a');rememberProject('one','b');rememberProject('one','a');rememberProject('two','c');
  assert.deepEqual(recentProjects('one'),['a','b']);assert.deepEqual(recentProjects('two'),['c']);
  assert.deepEqual(projectCandidates(projects,{owner:'one'}).map(x=>x.id),['a']);assert.deepEqual(projectCandidates(projects,{owner:'one',include:true}).map(x=>x.id),['a','b']);
  assert.deepEqual(projectCandidates(projects,{owner:'one',query:'완료'}),[]);assert.equal(projectCandidates(projects,{owner:'one',query:'완료',include:true})[0].id,'b');
  let owner='one',picked=[],fail=true;const picker=createProjectPicker({getData:()=>({projects}),getScope:()=>owner,onPick:id=>{if(fail)return false;picked.push(id);}});
  picker.open(document.querySelector('#anchor'),'b');assert(document.querySelector('[data-pick=""]'));assert(!document.querySelector('[data-pick="b"]'));document.querySelector('[data-pick="a"]').click();assert(document.querySelector('dialog').open);assert.equal(picked.length,0);fail=false;document.querySelector('[data-pick="a"]').click();assert(!document.querySelector('dialog').open);assert.deepEqual(picked,['a']);
  picker.open(document.querySelector('#anchor'));assert(!document.querySelector('[data-pick=""]'));owner='two';document.querySelector('[data-pick="a"]').click();assert.equal(picked.length,1);assert.equal(JSON.stringify(projects),before);
 }finally{dom.window.close();for(const k of keys){const d=old.get(k);if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});
