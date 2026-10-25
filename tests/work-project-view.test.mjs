import test from 'node:test';
import assert from 'node:assert/strict';
import {projectState,projectList,projectActiveWorks} from '../work/project-view.js';
test('project lifecycle is independent of detailed stage and supports legacy records',()=>{assert.equal(projectState({stage:'제출 완료'}),'active');assert.equal(projectState({stage:'완료'}),'done');assert.equal(projectState({stage:'완료',lifecycle:'paused'}),'paused');assert.equal(projectState({}),'active');});
test('status OR filtering, empty selection, deleted exclusion and stable ordering',()=>{const ps=[{title:'나',stage:'진행'},{title:'가',lifecycle:'paused'},{title:'다',lifecycle:'done'},{title:'라',deletedAt:'x'}];assert.deepEqual(projectList(ps,['active','paused'],'name').map(p=>p.title),['가','나']);assert.equal(projectList(ps,[]).length,0);assert.equal(projectList(ps).length,1);assert.equal(ps[0].title,'나');});
test('missing dates remain last in both sort directions',()=>{const ps=[{title:'없음'},{title:'먼저',start:'2026-01-01'},{title:'나중',start:'2026-02-01'}];assert.deepEqual(projectList(ps,['active'],'start','desc').map(p=>p.title),['나중','먼저','없음']);assert.deepEqual(projectList(ps,['active'],'start').map(p=>p.title),['먼저','나중','없음']);});
test('project cards show each work once only while it contains an in-progress task',()=>{
 const data={works:[{id:'a',projectId:'p',title:'진행 업무'},{id:'b',projectId:'p',title:'대기 업무'},{id:'c',projectId:'p',title:'완료 업무'},{id:'d',projectId:'p',deletedAt:'deleted'},{id:'e',projectId:'other'},{id:'f',projectId:'p',title:'삭제된 할 일만 있는 업무'}],tasks:[{id:'1',workId:'a',status:'todo'},{id:'2',workId:'a',status:'todo'},{workId:'b',status:'waiting'},{workId:'c',status:'done'},{workId:'c',status:'paused'},{workId:'c',status:'cancelled'},{workId:'d',status:'todo'},{workId:'e',status:'todo'},{workId:'f',status:'todo',deletedAt:'deleted'},{projectId:'p',status:'todo'}]};
 const original=structuredClone(data);
 assert.deepEqual(projectActiveWorks(data,'p').map(w=>w.id),['a']);assert.deepEqual(data,original);
 data.tasks[0].status='done';assert.equal(projectActiveWorks(data,'p').length,1);
 data.tasks[1].status='done';assert.deepEqual(projectActiveWorks(data,'p'),[]);
 data.tasks[0].status='todo';assert.deepEqual(projectActiveWorks(data,'p').map(w=>w.id),['a']);
});
