import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {projectIndex} from '../work/project-index.js';
import {emptyWorkState} from '../work/work-account.mjs';
import {createItem} from '../work/editing.js';
test('project overview uses explicit work stage and preserves all records while filtering',()=>{
 const data=emptyWorkState(),p=createItem(data,'project','진행 프로젝트'),closed=createItem(data,'project','완료 프로젝트');closed.lifecycle='done';
 const w=createItem(data,'work','진행 업무',{projectId:p.id}),waiting=createItem(data,'work','대기 업무',{projectId:p.id});w.stage='진행';waiting.stage='준비';
 const t=createItem(data,'task','대기 업무의 진행 할 일',{workId:waiting.id});t.status='todo';createItem(data,'task','별도 할 일',{projectId:p.id});
 const before=JSON.stringify(data),dom=new JSDOM(projectIndex(data,{}));
 assert.equal(dom.window.document.querySelectorAll('tbody tr').length,1);assert.equal(dom.window.document.querySelector('.project-index-work'),null);assert(projectIndex(data,{}).includes('프로젝트 추가'));assert.equal(dom.window.document.querySelector('tbody tr td:last-child').textContent,'2');
 assert(projectIndex(data,{projectIndexFilter:'all'}).includes('완료 프로젝트'));assert.equal(JSON.stringify(data),before);dom.window.close();
});
