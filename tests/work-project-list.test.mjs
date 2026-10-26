import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createWorkflowUI} from '../work/workflow-ui.js';
import {createItem} from '../work/editing.js';
import {emptyWorkState} from '../work/work-account.mjs';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const button=(label,action,attrs='',cls='')=>`<button class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
test('project tables keep direct and grouped ownership, count only completed work, and expose cancelled items separately',()=>{
 const data=emptyWorkState(),p=createItem(data,'project','Project'),w=createItem(data,'work','Group',{projectId:p.id});
 const direct=createItem(data,'task','Direct',{projectId:p.id}),grouped=createItem(data,'task','Grouped',{workId:w.id}),done=createItem(data,'task','Done',{workId:w.id}),cancelled=createItem(data,'task','Cancelled',{workId:w.id});done.status='done';cancelled.status='cancelled';
 const before=structuredClone(data),ui={projectPage:p.id},flow=createWorkflowUI({getData:()=>data,ui,esc,icon:()=>'',button,passes:()=>true});
 let dom=new JSDOM(flow.projectPage());
 assert.equal(dom.window.document.querySelectorAll('[data-flow-add]').length,0);
 assert.match(dom.window.document.querySelector('.pl-page-toolbar').textContent,/1\/3/);
 assert.equal(dom.window.document.querySelectorAll(`[data-tt-row="${direct.id}"]`).length,1);
 assert.equal(dom.window.document.querySelectorAll(`[data-tt-row="${grouped.id}"]`).length,1);
 assert.equal(dom.window.document.querySelectorAll(`[data-tt-row="${cancelled.id}"]`).length,0);
 dom.window.close();ui.projectTaskFilter='cancelled';dom=new JSDOM(flow.projectPage());
 assert.equal(dom.window.document.querySelectorAll('[data-tt-row]').length,1);
 assert.equal(dom.window.document.querySelector('[data-tt-row]').dataset.ttRow,cancelled.id);
 assert.deepEqual(data,before);dom.window.close();
 ui.projectAdd=w.id;dom=new JSDOM(flow.projectPage());const form=dom.window.document.querySelector('[data-flow-add]');assert.equal(form.dataset.workId,w.id);assert.equal(form.dataset.projectId,p.id);dom.window.close();
});

test('hierarchy sorting and search retain work/task ownership without mutating records',()=>{
 const data=emptyWorkState(),p=createItem(data,'project','Project'),w=createItem(data,'work','Zulu',{projectId:p.id}),v=createItem(data,'work','Alpha',{projectId:p.id});
 const t=createItem(data,'task','Needle',{workId:w.id});createItem(data,'task','Other',{workId:v.id});w.due='2026-11-20';t.due='2026-10-28';
 const before=structuredClone(data),ui={projectPage:p.id,projectDetailSort:'title'},flow=createWorkflowUI({getData:()=>data,ui,esc,icon:()=>'',button,passes:()=>true});
 let dom=new JSDOM(flow.projectPage()),doc=dom.window.document;
 assert.equal(doc.querySelectorAll('table').length,1);assert.equal(doc.querySelector('[data-work-group]').dataset.workGroup,v.id);
 assert.equal(doc.querySelector(`[data-tt-row="${t.id}"]`).closest('tbody').dataset.workGroup,w.id);
 assert.match(doc.querySelector(`[data-work-group="${w.id}"] .pl-work-row`).textContent,/11\/20/);dom.window.close();
 ui.projectDetailQuery='Needle';dom=new JSDOM(flow.projectPage());assert.equal(dom.window.document.querySelectorAll('[data-work-group]').length,1);assert.equal(dom.window.document.querySelector('[data-work-group]').dataset.workGroup,w.id);assert.deepEqual(data,before);dom.window.close();
});
