import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import CSSOM from 'rrweb-cssom';
import {JSDOM} from 'jsdom';
import {choiceSelect,installSelectControls} from '../work/ui-components.js';
import {installSurfaceInteractions} from '../work/surface-interactions.js';
import {createProjectTabs} from '../work/project-tabs.js';

test('project tabs initialize after cloud data arrives and preserve explicit empty preferences',()=>{
 const dom=new JSDOM('<main></main>',{url:'https://fixture.invalid'}),keys=['window','document'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const k of keys)Object.defineProperty(globalThis,k,{value:dom.window[k],writable:true,configurable:true});
 try{const data={projects:[]},tabs=createProjectTabs({getData:()=>data,getScope:()=> 'async-owner',esc:String,icon:()=>'',render(){},onSelect(){}});assert(!tabs.view().includes('Project A'));data.projects.push({id:'a',title:'Project A',lifecycle:'active'});assert(tabs.view().includes('data-task-project="a"'));window.localStorage.setItem('work-project-tabs-v1:async-owner','[]');tabs.reset();assert(!tabs.view().includes('data-task-project="a"'));}
 finally{dom.window.close();for(const k of keys){const d=old.get(k);if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});
test('shared UX stylesheet has one selector owner per media scope',()=>{
 const css=CSSOM.parse(fs.readFileSync(new URL('../work/common-ux.css',import.meta.url),'utf8'));
 const scopes=new Map();function walk(rules,scope='base'){const seen=scopes.get(scope)||new Set();scopes.set(scope,seen);for(const r of rules){if(r.type===4){walk(r.cssRules,scope+' '+r.media.mediaText);continue;}if(r.type!==1)continue;assert(!seen.has(r.selectorText),`duplicate ${scope}: ${r.selectorText}`);seen.add(r.selectorText);}}
 walk(css.cssRules);assert(css.cssRules[0].selectorText==='html'||css.cssRules[0].selectorText===':root');
});
test('shared selects preserve domain events and keyboard focus through rerender',async()=>{
 const dom=new JSDOM('<main id="app"></main><dialog id="detail"></dialog>',{pretendToBeVisual:true}),keys=['window','document','MutationObserver','innerWidth','innerHeight'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const k of keys)Object.defineProperty(globalThis,k,{value:k==='innerWidth'?1280:k==='innerHeight'?720:dom.window[k],configurable:true,writable:true});
 let controls;try{const app=document.querySelector('#app');const render=v=>app.innerHTML=choiceSelect(v,[['all','전체'],['active','미완료'],['done','완료']],'data-state','상태');render('all');installSurfaceInteractions();controls=installSelectControls();let changes=0;
 document.addEventListener('change',e=>{if(e.target.matches('[data-state]')){changes++;render(e.target.value);}});
 let trigger=app.querySelector('[data-menu-toggle]');trigger.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.equal(document.activeElement.textContent.trim(),'전체');
 document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));assert.equal(document.activeElement.textContent.trim(),'완료');document.activeElement.click();
 assert.equal(changes,1);assert.equal(app.querySelector('select').value,'done');assert.equal(document.activeElement.getAttribute('aria-label'),'상태');assert(app.querySelector('select').hidden);
 trigger=app.querySelector('[data-menu-toggle]');trigger.click();document.querySelector('[data-menu-panel]:not([hidden])').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(trigger.getAttribute('aria-expanded'),'false');assert.equal(document.activeElement,trigger);
 document.querySelector('#detail').innerHTML=choiceSelect('p',[['p','Project'],['q','Other']],'data-project','프로젝트');await new Promise(r=>setTimeout(r,0));assert(document.querySelector('#detail .ux-select'));assert.equal(document.querySelector('#detail select').value,'p');
 }finally{controls?.destroy();dom.window.close();for(const k of keys){const d=old.get(k);if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});
